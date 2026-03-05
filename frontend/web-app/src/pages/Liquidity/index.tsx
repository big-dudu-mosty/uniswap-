import { useState, useEffect } from 'react'
import {
  Card,
  Typography,
  Tabs,
  Input,
  Button,
  Space,
  Avatar,
  message,
  Divider,
  Alert,
  Spin,
  Slider,
  Select,
  Empty,
} from 'antd'
import { PlusOutlined, DownOutlined, MinusOutlined, InfoCircleOutlined, WalletOutlined } from '@ant-design/icons'
import { useAccount, useReadContracts } from 'wagmi'
import { formatUnits } from 'viem'
import { useWallet } from '../../hooks/useWallet'
import { useLiquidity } from '../../hooks/useLiquidity'
import TokenSelect from '../../components/TokenSelect'
import { Token } from '../../types'
import { DEFAULT_TOKENS } from '../../config/tokens'
import { formatNumber, isValidNumber, parseTokenAmount } from '../../utils/format'
import { apiService } from '../../services/api'
import ERC20ABI from '../../contracts/ERC20.json'
import './index.css'

const { Title, Text } = Typography

interface UserLPPosition {
  poolId: number
  pairAddress: string
  token0Symbol: string
  token1Symbol: string
  token0Address: string
  token1Address: string
  token0Decimals: number
  token1Decimals: number
  lpBalance: string
  reserve0: string
  reserve1: string
  totalSupply: string
}

const LiquidityPage: React.FC = () => {
  const { address, isConnected } = useWallet()
  const { address: accountAddress } = useAccount()
  const { addLiquidity: addLiquidityContract, removeLiquidity: removeLiquidityContract, loading } = useLiquidity()

  // 添加流动性状态
  const [tokenA, setTokenA] = useState<Token | null>(DEFAULT_TOKENS[1] || null)
  const [tokenB, setTokenB] = useState<Token | null>(DEFAULT_TOKENS[2] || null)
  const [amountA, setAmountA] = useState<string>('')
  const [amountB, setAmountB] = useState<string>('')

  // 移除流动性状态
  const [userPositions, setUserPositions] = useState<UserLPPosition[]>([])
  const [selectedPosition, setSelectedPosition] = useState<UserLPPosition | null>(null)
  const [removePercent, setRemovePercent] = useState<number>(50)

  // UI 状态
  const [activeTab, setActiveTab] = useState('add')
  const [showTokenASelect, setShowTokenASelect] = useState(false)
  const [showTokenBSelect, setShowTokenBSelect] = useState(false)

  // 流动性信息
  const [lpTokens, setLpTokens] = useState<string>('0')
  const [shareOfPool, setShareOfPool] = useState<string>('0')

  // 读取 tokenA / tokenB 余额
  const balanceContracts = [tokenA, tokenB]
    .filter((t): t is Token => !!t)
    .map((token) => ({
      address: token.address as `0x${string}`,
      abi: ERC20ABI.abi as any,
      functionName: 'balanceOf',
      args: [accountAddress as `0x${string}`],
    }))

  const { data: selectedTokenBalances } = useReadContracts({
    contracts: balanceContracts,
    query: {
      enabled: !!accountAddress && balanceContracts.length > 0,
    },
  })

  const getTokenBalance = (index: number, token: Token | null): string => {
    if (!token || !selectedTokenBalances) return '--'
    // index needs to account for which tokens are present
    const actualIndex = tokenA ? index : index - 1
    const data = selectedTokenBalances[actualIndex]
    if (data && data.status === 'success' && data.result) {
      return formatNumber(formatUnits(data.result as bigint, token.decimals), 6)
    }
    return '0'
  }

  // 池子信息
  const [poolInfo, setPoolInfo] = useState<any>(null)
  const [loadingPool, setLoadingPool] = useState(false)
  const [poolPrice, setPoolPrice] = useState<string>('')
  const [isNewPool, setIsNewPool] = useState(false)

  // 获取所有池子用于读取 LP 余额
  const [allPools, setAllPools] = useState<any[]>([])

  useEffect(() => {
    const fetchPools = async () => {
      try {
        const response = await apiService.getPools()
        setAllPools(response.pools || [])
      } catch (error) {
        console.error('Failed to fetch pools:', error)
      }
    }
    fetchPools()
  }, [])

  // 准备 LP Token 余额查询
  const lpBalanceContracts = allPools.map((pool) => ({
    address: pool.pairAddress as `0x${string}`,
    abi: ERC20ABI.abi as any,
    functionName: 'balanceOf',
    args: [accountAddress as `0x${string}`],
  }))

  // 批量读取 LP 余额
  const { data: lpBalances, refetch: refetchLPBalances } = useReadContracts({
    contracts: lpBalanceContracts,
    query: {
      enabled: !!accountAddress && lpBalanceContracts.length > 0,
    },
  })

  // 构建用户仓位列表
  useEffect(() => {
    if (!lpBalances || !allPools.length) return

    const positions: UserLPPosition[] = []

    allPools.forEach((pool, index) => {
      const balanceData = lpBalances[index]
      if (balanceData && balanceData.status === 'success' && balanceData.result) {
        const balance = balanceData.result as bigint
        if (balance > 0n) {
          positions.push({
            poolId: pool.id,
            pairAddress: pool.pairAddress,
            token0Symbol: pool.token0Symbol,
            token1Symbol: pool.token1Symbol,
            token0Address: pool.token0Address,
            token1Address: pool.token1Address,
            token0Decimals: pool.token0Decimals,
            token1Decimals: pool.token1Decimals,
            lpBalance: formatUnits(balance, 18),
            reserve0: pool.reserve0,
            reserve1: pool.reserve1,
            totalSupply: pool.totalSupply,
          })
        }
      }
    })

    setUserPositions(positions)

    // 如果有仓位且没有选中的，选中第一个
    if (positions.length > 0 && !selectedPosition) {
      setSelectedPosition(positions[0])
    }
  }, [lpBalances, allPools])

  /**
   * 计算移除流动性后可获得的代币数量
   */
  const calculateRemoveAmounts = () => {
    if (!selectedPosition || removePercent <= 0) {
      return { amount0: '0', amount1: '0', lpToRemove: '0' }
    }

    const lpBalance = parseFloat(selectedPosition.lpBalance)
    const lpToRemove = (lpBalance * removePercent) / 100

    const reserve0 = parseFloat(selectedPosition.reserve0) / Math.pow(10, selectedPosition.token0Decimals)
    const reserve1 = parseFloat(selectedPosition.reserve1) / Math.pow(10, selectedPosition.token1Decimals)
    const totalSupply = parseFloat(selectedPosition.totalSupply) / Math.pow(10, 18)

    if (totalSupply <= 0) {
      return { amount0: '0', amount1: '0', lpToRemove: '0' }
    }

    const share = lpToRemove / totalSupply
    const amount0 = reserve0 * share
    const amount1 = reserve1 * share

    return {
      amount0: amount0.toFixed(6),
      amount1: amount1.toFixed(6),
      lpToRemove: lpToRemove.toFixed(6),
    }
  }

  const removeAmounts = calculateRemoveAmounts()

  /**
   * 获取池子信息
   */
  useEffect(() => {
    const fetchPoolInfo = async () => {
      if (!tokenA || !tokenB) {
        setPoolInfo(null)
        setPoolPrice('')
        setIsNewPool(false)
        return
      }

      setLoadingPool(true)
      try {
        const response = await apiService.getPoolByTokens(
          tokenA.address,
          tokenB.address
        )

        if (response && response.pairAddress) {
          setPoolInfo(response)
          setIsNewPool(false)

          // 计算价格（TokenA 以 TokenB 计价）
          const reserve0 = parseFloat(response.reserve0) / Math.pow(10, response.token0Decimals || 18)
          const reserve1 = parseFloat(response.reserve1) / Math.pow(10, response.token1Decimals || 18)

          if (reserve0 > 0 && reserve1 > 0) {
            // 判断 tokenA 是 token0 还是 token1
            const isToken0 = response.token0Address.toLowerCase() === tokenA.address.toLowerCase()
            const price = isToken0 ? (reserve1 / reserve0) : (reserve0 / reserve1)
            setPoolPrice(price.toFixed(6))
          }
        } else {
          setPoolInfo(null)
          setPoolPrice('')
          setIsNewPool(true)
        }
      } catch (error) {
        console.log('Pool does not exist yet:', error)
        setPoolInfo(null)
        setPoolPrice('')
        setIsNewPool(true)
      } finally {
        setLoadingPool(false)
      }
    }

    fetchPoolInfo()
  }, [tokenA, tokenB])

  /**
   * 计算LP代币和池子份额
   */
  useEffect(() => {
    const calculateLPInfo = () => {
      if (!amountA || !amountB || parseFloat(amountA) <= 0 || parseFloat(amountB) <= 0) {
        setLpTokens('0')
        setShareOfPool('0')
        return
      }

      const amtA = parseFloat(amountA)
      const amtB = parseFloat(amountB)

      if (isNewPool || !poolInfo || !poolInfo.totalSupply || poolInfo.totalSupply === '0') {
        // 新池子：LP = sqrt(amountA * amountB)
        const lpAmount = Math.sqrt(amtA * amtB)
        setLpTokens(lpAmount.toFixed(6))
        setShareOfPool('100') // 新池子，100%份额
      } else {
        // 已存在的池子：LP = min(amountA / reserve0, amountB / reserve1) * totalSupply
        const reserve0 = parseFloat(poolInfo.reserve0) / Math.pow(10, poolInfo.token0Decimals || 18)
        const reserve1 = parseFloat(poolInfo.reserve1) / Math.pow(10, poolInfo.token1Decimals || 18)
        const totalSupply = parseFloat(poolInfo.totalSupply) / Math.pow(10, 18)

        if (reserve0 > 0 && reserve1 > 0 && totalSupply > 0) {
          // 判断 tokenA 是 token0 还是 token1
          const isToken0 = poolInfo.token0Address.toLowerCase() === tokenA?.address.toLowerCase()

          const ratio0 = isToken0 ? (amtA / reserve0) : (amtB / reserve0)
          const ratio1 = isToken0 ? (amtB / reserve1) : (amtA / reserve1)

          const lpAmount = Math.min(ratio0, ratio1) * totalSupply
          setLpTokens(lpAmount.toFixed(6))

          // 池子份额 = lpAmount / (totalSupply + lpAmount) * 100
          const share = (lpAmount / (totalSupply + lpAmount)) * 100
          setShareOfPool(share.toFixed(4))
        } else {
          setLpTokens('0')
          setShareOfPool('0')
        }
      }
    }

    calculateLPInfo()
  }, [amountA, amountB, poolInfo, isNewPool, tokenA])

  /**
   * 自动计算另一个代币数量（根据池子比例）
   */
  const handleAmountAChange = (value: string) => {
    setAmountA(value)

    if (!value || parseFloat(value) <= 0 || !poolInfo || !poolPrice) {
      return
    }

    // 根据池子价格自动计算 amountB
    const calculatedB = (parseFloat(value) * parseFloat(poolPrice)).toFixed(6)
    setAmountB(calculatedB)
  }

  const handleAmountBChange = (value: string) => {
    setAmountB(value)

    if (!value || parseFloat(value) <= 0 || !poolInfo || !poolPrice) {
      return
    }

    // 根据池子价格自动计算 amountA
    const calculatedA = (parseFloat(value) / parseFloat(poolPrice)).toFixed(6)
    setAmountA(calculatedA)
  }

  /**
   * 添加流动性（直接调用合约，用户 MetaMask 签名）
   */
  const handleAddLiquidity = async () => {
    if (!isConnected || !address) {
      message.warning('请先连接钱包')
      return
    }

    if (!tokenA || !tokenB) {
      message.warning('请选择代币')
      return
    }

    if (!amountA || !amountB || parseFloat(amountA) <= 0 || parseFloat(amountB) <= 0) {
      message.warning('请输入有效金额')
      return
    }

    try {
      const amountADesired = BigInt(parseTokenAmount(amountA, tokenA.decimals))
      const amountBDesired = BigInt(parseTokenAmount(amountB, tokenB.decimals))
      const amountAMin = BigInt(parseTokenAmount(
        (parseFloat(amountA) * 0.995).toString(),
        tokenA.decimals
      ))
      const amountBMin = BigInt(parseTokenAmount(
        (parseFloat(amountB) * 0.995).toString(),
        tokenB.decimals
      ))
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20

      const hash = await addLiquidityContract({
        tokenA: tokenA.address,
        tokenB: tokenB.address,
        amountADesired,
        amountBDesired,
        amountAMin,
        amountBMin,
        deadline,
        tokenASymbol: tokenA.symbol,
        tokenBSymbol: tokenB.symbol,
      })

      if (hash) {
        setAmountA('')
        setAmountB('')
        setLpTokens('0')
        setShareOfPool('0')
        // 刷新 LP 余额
        refetchLPBalances()
      }
    } catch (error: any) {
      console.error('Add liquidity failed:', error)
      // 错误已在 hook 中处理
    }
  }

  /**
   * 移除流动性
   */
  const handleRemoveLiquidity = async () => {
    if (!isConnected || !address) {
      message.warning('请先连接钱包')
      return
    }

    if (!selectedPosition) {
      message.warning('请选择要移除的流动性仓位')
      return
    }

    if (removePercent <= 0) {
      message.warning('请选择移除比例')
      return
    }

    try {
      const lpBalance = parseFloat(selectedPosition.lpBalance)
      const lpToRemove = (lpBalance * removePercent) / 100

      // 转换为 BigInt (18 decimals for LP token)
      const liquidity = BigInt(parseTokenAmount(lpToRemove.toString(), 18))

      // 计算最小获得数量 (0.5% 滑点保护)
      const amount0Min = BigInt(parseTokenAmount(
        (parseFloat(removeAmounts.amount0) * 0.995).toString(),
        selectedPosition.token0Decimals
      ))
      const amount1Min = BigInt(parseTokenAmount(
        (parseFloat(removeAmounts.amount1) * 0.995).toString(),
        selectedPosition.token1Decimals
      ))

      const deadline = Math.floor(Date.now() / 1000) + 60 * 20

      const hash = await removeLiquidityContract({
        tokenA: selectedPosition.token0Address,
        tokenB: selectedPosition.token1Address,
        liquidity,
        amountAMin: amount0Min,
        amountBMin: amount1Min,
        deadline,
        pairAddress: selectedPosition.pairAddress,
      })

      if (hash) {
        setRemovePercent(50)
        // 刷新 LP 余额
        refetchLPBalances()
      }
    } catch (error: any) {
      console.error('Remove liquidity failed:', error)
      // 错误已在 hook 中处理
    }
  }

  /**
   * 添加流动性表单
   */
  const renderAddLiquidity = () => (
    <div className="liquidity-form">
      {/* 池子信息提示 */}
      {loadingPool && (
        <Alert
          message="正在加载池子信息..."
          icon={<Spin size="small" />}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {isNewPool && tokenA && tokenB && (
        <Alert
          message="创建新池子"
          description={`${tokenA.symbol}/${tokenB.symbol} 交易对尚不存在，您将创建第一个流动性池！您可以自由设置初始价格比例。`}
          type="warning"
          showIcon
          icon={<InfoCircleOutlined />}
          style={{ marginBottom: 16 }}
        />
      )}

      {poolInfo && poolPrice && (
        <Alert
          message={`当前价格: 1 ${tokenA?.symbol} = ${formatNumber(poolPrice, 6)} ${tokenB?.symbol}`}
          description="输入一个代币数量后，系统会自动根据当前池子比例计算另一个代币的推荐数量。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Token A 输入 */}
      <div className="token-input-section">
        <div className="panel-header">
          <Text type="secondary">代币 A</Text>
          {isConnected && tokenA && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              余额: {getTokenBalance(0, tokenA)}
            </Text>
          )}
        </div>
        <div className="panel-content">
          <Input
            size="large"
            placeholder="0.0"
            value={amountA}
            onChange={(e) => {
              if (isValidNumber(e.target.value)) {
                handleAmountAChange(e.target.value)
              }
            }}
            bordered={false}
            className="amount-input"
          />
          <Button
            type="text"
            onClick={() => setShowTokenASelect(true)}
            className="token-select-button"
          >
            {tokenA ? (
              <Space>
                <Avatar src={tokenA.logoURI} size={24}>
                  {tokenA.symbol[0]}
                </Avatar>
                <Text strong>{tokenA.symbol}</Text>
                <DownOutlined style={{ fontSize: 12 }} />
              </Space>
            ) : (
              <Space>
                <Text>选择代币</Text>
                <DownOutlined style={{ fontSize: 12 }} />
              </Space>
            )}
          </Button>
        </div>
      </div>

      {/* Plus Icon */}
      <div className="plus-icon-wrapper">
        <PlusOutlined style={{ fontSize: 20, color: '#00b96b' }} />
      </div>

      {/* Token B 输入 */}
      <div className="token-input-section">
        <div className="panel-header">
          <Text type="secondary">代币 B</Text>
          {isConnected && tokenB && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              余额: {getTokenBalance(1, tokenB)}
            </Text>
          )}
        </div>
        <div className="panel-content">
          <Input
            size="large"
            placeholder="0.0"
            value={amountB}
            onChange={(e) => {
              if (isValidNumber(e.target.value)) {
                handleAmountBChange(e.target.value)
              }
            }}
            bordered={false}
            className="amount-input"
          />
          <Button
            type="text"
            onClick={() => setShowTokenBSelect(true)}
            className="token-select-button"
          >
            {tokenB ? (
              <Space>
                <Avatar src={tokenB.logoURI} size={24}>
                  {tokenB.symbol[0]}
                </Avatar>
                <Text strong>{tokenB.symbol}</Text>
                <DownOutlined style={{ fontSize: 12 }} />
              </Space>
            ) : (
              <Space>
                <Text>选择代币</Text>
                <DownOutlined style={{ fontSize: 12 }} />
              </Space>
            )}
          </Button>
        </div>
      </div>

      {/* 流动性信息 */}
      {amountA && amountB && (
        <div className="liquidity-info">
          <div className="info-item">
            <Text type="secondary">LP 代币</Text>
            <Text strong>{formatNumber(lpTokens, 6)}</Text>
          </div>
          <div className="info-item">
            <Text type="secondary">池子份额</Text>
            <Text strong>{formatNumber(shareOfPool, 4)}%</Text>
          </div>
          <Divider style={{ margin: '12px 0' }} />
          <div className="info-item">
            <Text type="secondary">{tokenA?.symbol} 数量</Text>
            <Text>{formatNumber(amountA)}</Text>
          </div>
          <div className="info-item">
            <Text type="secondary">{tokenB?.symbol} 数量</Text>
            <Text>{formatNumber(amountB)}</Text>
          </div>
        </div>
      )}

      {/* 添加按钮 */}
      {!isConnected ? (
        <Button
          type="primary"
          size="large"
          block
          disabled
          style={{ marginTop: 16 }}
        >
          请先连接钱包
        </Button>
      ) : (
        <Button
          type="primary"
          size="large"
          block
          onClick={handleAddLiquidity}
          loading={loading}
          disabled={
            !tokenA ||
            !tokenB ||
            !amountA ||
            !amountB ||
            parseFloat(amountA) <= 0 ||
            parseFloat(amountB) <= 0
          }
          style={{ marginTop: 16 }}
        >
          {loading ? '添加中...' : '添加流动性'}
        </Button>
      )}
    </div>
  )

  /**
   * 移除流动性表单
   */
  const renderRemoveLiquidity = () => (
    <div className="liquidity-form">
      {!isConnected ? (
        <Card style={{ textAlign: 'center', padding: '40px 20px' }}>
          <WalletOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
          <Title level={4}>请先连接钱包</Title>
          <Text type="secondary">连接钱包后查看您的流动性仓位</Text>
        </Card>
      ) : userPositions.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Empty
            description={
              <span style={{ color: 'rgba(255,255,255,0.65)' }}>
                暂无流动性仓位
              </span>
            }
          />
          <Button
            type="primary"
            onClick={() => setActiveTab('add')}
            style={{ marginTop: 16 }}
          >
            添加流动性
          </Button>
        </Card>
      ) : (
        <>
          {/* 选择仓位 */}
          <div className="token-input-section">
            <div className="panel-header">
              <Text type="secondary">选择流动性仓位</Text>
            </div>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              size="large"
              value={selectedPosition?.pairAddress}
              onChange={(value) => {
                const position = userPositions.find(p => p.pairAddress === value)
                setSelectedPosition(position || null)
              }}
              placeholder="选择要移除的流动性池"
            >
              {userPositions.map((position) => (
                <Select.Option key={position.pairAddress} value={position.pairAddress}>
                  <Space>
                    <Text strong>{position.token0Symbol}/{position.token1Symbol}</Text>
                    <Text type="secondary">
                      LP: {formatNumber(position.lpBalance, 6)}
                    </Text>
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </div>

          {selectedPosition && (
            <>
              {/* LP 余额显示 */}
              <Alert
                message={
                  <Space>
                    <Text>您的 LP 余额:</Text>
                    <Text strong>{formatNumber(selectedPosition.lpBalance, 6)} LP</Text>
                  </Space>
                }
                type="info"
                style={{ marginTop: 16 }}
              />

              {/* 移除比例滑块 */}
              <div className="remove-amount-section" style={{ marginTop: 24 }}>
                <div className="panel-header">
                  <Text type="secondary">移除比例</Text>
                  <Text strong style={{ fontSize: 24 }}>{removePercent}%</Text>
                </div>
                <Slider
                  min={0}
                  max={100}
                  value={removePercent}
                  onChange={setRemovePercent}
                  marks={{
                    0: '0%',
                    25: '25%',
                    50: '50%',
                    75: '75%',
                    100: '100%',
                  }}
                  style={{ marginTop: 16 }}
                />
                <Space style={{ marginTop: 16 }}>
                  <Button size="small" onClick={() => setRemovePercent(25)}>25%</Button>
                  <Button size="small" onClick={() => setRemovePercent(50)}>50%</Button>
                  <Button size="small" onClick={() => setRemovePercent(75)}>75%</Button>
                  <Button size="small" onClick={() => setRemovePercent(100)}>MAX</Button>
                </Space>
              </div>

              {/* 预计获得 */}
              <div className="liquidity-info" style={{ marginTop: 24 }}>
                <div className="panel-header">
                  <Text type="secondary">预计获得</Text>
                </div>
                <Divider style={{ margin: '12px 0' }} />
                <div className="info-item">
                  <Text type="secondary">{selectedPosition.token0Symbol}</Text>
                  <Text strong>{formatNumber(removeAmounts.amount0, 6)}</Text>
                </div>
                <div className="info-item">
                  <Text type="secondary">{selectedPosition.token1Symbol}</Text>
                  <Text strong>{formatNumber(removeAmounts.amount1, 6)}</Text>
                </div>
                <Divider style={{ margin: '12px 0' }} />
                <div className="info-item">
                  <Text type="secondary">LP 代币销毁</Text>
                  <Text>{formatNumber(removeAmounts.lpToRemove, 6)}</Text>
                </div>
              </div>

              {/* 移除按钮 */}
              <Button
                type="primary"
                danger
                size="large"
                block
                onClick={handleRemoveLiquidity}
                loading={loading}
                disabled={removePercent <= 0}
                style={{ marginTop: 24 }}
                icon={<MinusOutlined />}
              >
                {loading ? '移除中...' : '移除流动性'}
              </Button>
            </>
          )}
        </>
      )}
    </div>
  )

  const tabItems = [
    {
      key: 'add',
      label: '添加流动性',
      children: renderAddLiquidity(),
    },
    {
      key: 'remove',
      label: '移除流动性',
      children: renderRemoveLiquidity(),
    },
  ]

  return (
    <div className="liquidity-page">
      <Card className="liquidity-card">
        <Title level={3}>流动性管理</Title>
        <Text type="secondary">添加流动性以赚取交易手续费</Text>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          className="liquidity-tabs"
          style={{ marginTop: 24 }}
        />
      </Card>

      {/* 代币选择弹窗 */}
      <TokenSelect
        visible={showTokenASelect}
        onClose={() => setShowTokenASelect(false)}
        onSelect={setTokenA}
        selectedToken={tokenA || undefined}
        excludeToken={tokenB || undefined}
      />
      <TokenSelect
        visible={showTokenBSelect}
        onClose={() => setShowTokenBSelect(false)}
        onSelect={setTokenB}
        selectedToken={tokenB || undefined}
        excludeToken={tokenA || undefined}
      />
    </div>
  )
}

export default LiquidityPage

