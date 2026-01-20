import { useState, useEffect } from 'react'
import {
  Typography,
  Button,
  Avatar,
  Spin,
  Tag,
} from 'antd'
import {
  ReloadOutlined,
  SwapOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import { useAccount, useBalance, useReadContracts } from 'wagmi'
import { formatUnits } from 'viem'
import { apiService } from '../../services/api'
import { formatNumber, formatTimestamp } from '../../utils/format'
import { DEFAULT_TOKENS } from '../../config/tokens'
import ERC20ABI from '../../contracts/ERC20.json'
import './index.css'

const { Title, Text } = Typography

interface Asset {
  token: {
    symbol: string
    name: string
    logoURI?: string
    decimals: number
  }
  balance: string
}

interface Transaction {
  hash: string
  from: string
  to: string
  tokenIn: string
  tokenOut: string
  amountIn: string
  amountOut: string
  timestamp: string
  status: number
  type: string
  pool?: {
    token0Address: string
    token1Address: string
    token0Symbol: string
    token1Symbol: string
    token0Decimals: number
    token1Decimals: number
  }
}

const PortfolioPage: React.FC = () => {
  const { address, isConnected } = useAccount()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [txLoading, setTxLoading] = useState(false)

  // 获取 ETH 余额
  const { data: ethBalance, refetch: refetchEth } = useBalance({
    address: address,
  })

  // 准备代币合约调用
  const tokenContracts = DEFAULT_TOKENS.slice(1).map((token) => ({
    address: token.address as `0x${string}`,
    abi: ERC20ABI.abi,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
  }))

  // 批量读取代币余额
  const { data: tokenBalances, refetch: refetchTokens, isLoading: tokensLoading } = useReadContracts({
    contracts: tokenContracts,
    query: {
      enabled: !!address && tokenContracts.length > 0,
    },
  })

  // 构建资产列表
  const assets: Asset[] = [
    {
      token: {
        symbol: 'ETH',
        name: 'Ethereum',
        logoURI: 'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png',
        decimals: 18,
      },
      balance: ethBalance?.formatted || '0',
    },
    ...DEFAULT_TOKENS.slice(1).map((token, index) => {
      const balanceData = tokenBalances?.[index]
      let balance = '0'
      if (balanceData && balanceData.status === 'success' && balanceData.result) {
        balance = formatUnits(balanceData.result as bigint, token.decimals)
      }
      return {
        token: {
          symbol: token.symbol,
          name: token.name,
          logoURI: token.logoURI,
          decimals: token.decimals,
        },
        balance,
      }
    }),
  ]

  /**
   * 获取交易历史
   */
  const fetchTransactions = async () => {
    if (!address) return

    setTxLoading(true)
    try {
      const response = await apiService.getUserRecentActivity(address, 10)
      // API 直接返回数组
      if (response && Array.isArray(response)) {
        const txList = response.map((activity: any) => ({
          hash: activity.transactionHash || '',
          from: activity.userAddress || '',
          to: activity.toAddress || '',
          tokenIn: activity.tokenIn,
          tokenOut: activity.tokenOut,
          amountIn: activity.amountIn || '0',
          amountOut: activity.amountOut || '0',
          timestamp: activity.createdAt || new Date().toISOString(),
          status: 1,
          type: activity.type || 'swap',
          pool: activity.pool,
        }))
        setTransactions(txList)
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
      setTransactions([])
    } finally {
      setTxLoading(false)
    }
  }

  useEffect(() => {
    if (isConnected && address) {
      fetchTransactions()
    }
  }, [isConnected, address])

  /**
   * 刷新所有数据
   */
  const handleRefresh = () => {
    refetchEth()
    refetchTokens()
    fetchTransactions()
  }

  if (!isConnected) {
    return (
      <div className="portfolio-page">
        <div className="assets-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Title level={4} style={{ color: 'rgba(255,255,255,0.85)' }}>请先连接钱包</Title>
          <Text style={{ color: 'rgba(255,255,255,0.65)' }}>连接钱包后即可查看您的资产</Text>
        </div>
      </div>
    )
  }

  return (
    <div className="portfolio-page">
      {/* 页面头部 */}
      <div className="portfolio-header">
        <div>
          <Title level={2} style={{ margin: 0 }}>我的资产</Title>
          <Text style={{ color: 'rgba(255,255,255,0.65)' }}>查看您的余额和交易历史</Text>
        </div>
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          onClick={handleRefresh}
          loading={tokensLoading || txLoading}
        >
          刷新
        </Button>
      </div>

      {/* 资产卡片 */}
      <div className="assets-card">
        <div className="assets-card-header">
          <h3><WalletOutlined /> 资产列表</h3>
        </div>

        <div className="assets-list">
          {tokensLoading ? (
            <div className="loading-container">
              <Spin size="large" />
            </div>
          ) : (
            assets.map((asset, index) => (
              <div key={index} className="asset-item">
                <div className="asset-item-left">
                  <div className="asset-item-avatar">
                    <Avatar src={asset.token.logoURI} size={40}>
                      {asset.token.symbol[0]}
                    </Avatar>
                  </div>
                  <div className="asset-item-info">
                    <h4>{asset.token.symbol}</h4>
                    <p>{asset.token.name}</p>
                  </div>
                </div>
                <div className="asset-item-right">
                  <div className="asset-balance">{formatNumber(asset.balance, 6)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 交易历史卡片 */}
      <div className="transactions-card">
        <div className="transactions-card-header">
          <h3><SwapOutlined /> 最近活动</h3>
        </div>

        <div className="transactions-list">
          {txLoading ? (
            <div className="loading-container">
              <Spin size="large" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📜</div>
              <div className="empty-state-text">暂无交易记录</div>
            </div>
          ) : (
            transactions.map((tx, index) => {
              // 根据 tokenIn/tokenOut 地址匹配代币符号
              let tokenInSymbol = '?'
              let tokenOutSymbol = '?'
              let tokenInDecimals = 18
              let tokenOutDecimals = 18

              if (tx.pool) {
                // 判断 tokenIn 是 token0 还是 token1
                if (tx.tokenIn.toLowerCase() === tx.pool.token0Address?.toLowerCase()) {
                  tokenInSymbol = tx.pool.token0Symbol
                  tokenInDecimals = tx.pool.token0Decimals
                  tokenOutSymbol = tx.pool.token1Symbol
                  tokenOutDecimals = tx.pool.token1Decimals
                } else {
                  tokenInSymbol = tx.pool.token1Symbol
                  tokenInDecimals = tx.pool.token1Decimals
                  tokenOutSymbol = tx.pool.token0Symbol
                  tokenOutDecimals = tx.pool.token0Decimals
                }
              }

              // 格式化金额
              const amountInFormatted = formatNumber(
                parseFloat(tx.amountIn) / Math.pow(10, tokenInDecimals),
                4
              )
              const amountOutFormatted = formatNumber(
                parseFloat(tx.amountOut) / Math.pow(10, tokenOutDecimals),
                4
              )

              return (
                <div key={tx.hash || index} className="transaction-item">
                  <div className="transaction-item-left">
                    <div className="transaction-icon receive">
                      <SwapOutlined />
                    </div>
                    <div className="transaction-info">
                      <h4>Swap {tokenInSymbol} → {tokenOutSymbol}</h4>
                      <p>{formatTimestamp(tx.timestamp)}</p>
                    </div>
                  </div>
                  <div className="transaction-item-right">
                    <div className="transaction-value" style={{ color: 'rgba(255,255,255,0.85)' }}>
                      {amountInFormatted} → {amountOutFormatted}
                    </div>
                    <Tag className="status-success">
                      成功
                    </Tag>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export default PortfolioPage
