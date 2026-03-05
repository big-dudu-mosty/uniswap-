import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Row,
  Col,
  Typography,
  Statistic,
  Button,
  Input,
  Tabs,
  Alert,
  Spin,
  message,
  Modal,
} from 'antd'
import {
  ArrowLeftOutlined,
  FireOutlined,
  DollarOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useAccount, useWriteContract, useReadContract } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { apiService } from '../../services/api'
import MasterChefABI from '../../contracts/MasterChef.json'
import ERC20ABI from '../../contracts/ERC20.json'

const { Title, Text } = Typography

const MASTER_CHEF_ADDRESS = import.meta.env.VITE_MASTER_CHEF_ADDRESS as `0x${string}`

const FarmDetail: React.FC = () => {
  const { poolId } = useParams<{ poolId: string }>()
  const navigate = useNavigate()
  const { address } = useAccount()

  const [loading, setLoading] = useState(true)
  const [farmData, setFarmData] = useState<any>(null)
  const [_userData, setUserData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [txLoading, setTxLoading] = useState(false)

  const safePoolId = poolId ? parseInt(poolId, 10) : -1
  const isValidPoolId = safePoolId >= 0

  const { writeContractAsync } = useWriteContract()

  // 读取用户 LP 余额
  const { data: lpBalance } = useReadContract({
    address: farmData?.lpToken?.address as `0x${string}`,
    abi: ERC20ABI.abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!farmData?.lpToken?.address,
    },
  })

  // 读取授权额度
  const { data: allowance } = useReadContract({
    address: farmData?.lpToken?.address as `0x${string}`,
    abi: ERC20ABI.abi,
    functionName: 'allowance',
    args: address && MASTER_CHEF_ADDRESS ? [address, MASTER_CHEF_ADDRESS] : undefined,
    query: {
      enabled: !!address && !!farmData?.lpToken?.address && !!MASTER_CHEF_ADDRESS,
    },
  })

  // 读取用户质押信息
  const { data: userInfo, refetch: refetchUserInfo } = useReadContract({
    address: MASTER_CHEF_ADDRESS,
    abi: MasterChefABI.abi,
    functionName: 'userInfo',
    args: address ? [BigInt(safePoolId), address] : undefined,
    query: {
      enabled: !!address && isValidPoolId && !!MASTER_CHEF_ADDRESS,
    },
  })

  // 读取待领取奖励
  const { data: pendingReward, refetch: refetchPending } = useReadContract({
    address: MASTER_CHEF_ADDRESS,
    abi: MasterChefABI.abi,
    functionName: 'pendingReward',
    args: address ? [BigInt(safePoolId), address] : undefined,
    query: {
      enabled: !!address && isValidPoolId && !!MASTER_CHEF_ADDRESS,
    },
  })

  const loadFarmData = useCallback(async () => {
    if (!isValidPoolId) {
      setLoading(false)
      setError('无效的池子ID')
      return
    }
    try {
      setLoading(true)
      setError(null)
      const response = await apiService.getFarm(safePoolId)
      if (response.success) {
        setFarmData(response.data)
      } else {
        setError('加载挖矿池失败')
      }
    } catch (err) {
      console.error('Failed to load farm:', err)
      setError('加载挖矿池失败，请检查网络连接')
    } finally {
      setLoading(false)
    }
  }, [safePoolId, isValidPoolId])

  const loadUserData = useCallback(async () => {
    if (!address || !isValidPoolId) return
    try {
      const response = await apiService.getUserFarms(address)
      if (response.success) {
        const userFarm = response.data.farms?.find((f: any) => f.poolId === safePoolId)
        setUserData(userFarm || null)
      }
    } catch (err) {
      console.error('Failed to load user data:', err)
    }
  }, [address, safePoolId, isValidPoolId])

  useEffect(() => {
    loadFarmData()
  }, [loadFarmData])

  useEffect(() => {
    if (address) {
      loadUserData()
    }
  }, [address, loadUserData])

  // 授权
  const handleApprove = async () => {
    if (!farmData?.lpToken?.address || !MASTER_CHEF_ADDRESS) return
    try {
      setTxLoading(true)
      message.loading({ content: '授权中...', key: 'approve' })
      await writeContractAsync({
        address: farmData.lpToken.address as `0x${string}`,
        abi: ERC20ABI.abi,
        functionName: 'approve',
        args: [MASTER_CHEF_ADDRESS, BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')],
      })
      message.success({ content: '授权成功！', key: 'approve' })
    } catch (err: any) {
      message.error({ content: err.message || '授权失败', key: 'approve' })
    } finally {
      setTxLoading(false)
    }
  }

  // 质押
  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      message.warning('请输入质押数量')
      return
    }
    try {
      setTxLoading(true)
      const amount = parseUnits(depositAmount, 18)

      // 检查授权
      if (!allowance || (allowance as bigint) < amount) {
        await handleApprove()
        await new Promise(r => setTimeout(r, 2000))
      }

      message.loading({ content: '质押中...', key: 'deposit' })
      await writeContractAsync({
        address: MASTER_CHEF_ADDRESS,
        abi: MasterChefABI.abi,
        functionName: 'deposit',
        args: [BigInt(safePoolId), amount],
      })
      message.success({ content: '质押成功！', key: 'deposit' })
      setDepositAmount('')
      refetchUserInfo()
      refetchPending()
      loadUserData()
    } catch (err: any) {
      message.error({ content: err.message || '质押失败', key: 'deposit' })
    } finally {
      setTxLoading(false)
    }
  }

  // 提取
  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      message.warning('请输入提取数量')
      return
    }
    try {
      setTxLoading(true)
      message.loading({ content: '提取中...', key: 'withdraw' })
      await writeContractAsync({
        address: MASTER_CHEF_ADDRESS,
        abi: MasterChefABI.abi,
        functionName: 'withdraw',
        args: [BigInt(safePoolId), parseUnits(withdrawAmount, 18)],
      })
      message.success({ content: '提取成功！奖励已自动领取', key: 'withdraw' })
      setWithdrawAmount('')
      refetchUserInfo()
      refetchPending()
      loadUserData()
    } catch (err: any) {
      message.error({ content: err.message || '提取失败', key: 'withdraw' })
    } finally {
      setTxLoading(false)
    }
  }

  // 紧急提取
  const handleEmergencyWithdraw = () => {
    Modal.confirm({
      title: '紧急提取',
      content: '紧急提取将放弃所有待领取奖励，确定继续？',
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          setTxLoading(true)
          await writeContractAsync({
            address: MASTER_CHEF_ADDRESS,
            abi: MasterChefABI.abi,
            functionName: 'emergencyWithdraw',
            args: [BigInt(safePoolId)],
          })
          message.warning('紧急提取成功！奖励已放弃')
          refetchUserInfo()
          loadUserData()
        } catch (err: any) {
          message.error(err.message || '紧急提取失败')
        } finally {
          setTxLoading(false)
        }
      },
    })
  }

  const userStakedAmount = userInfo ? (userInfo as any)[0] : 0n
  const userStakedFormatted = formatUnits(userStakedAmount || 0n, 18)
  const lpBalanceFormatted = formatUnits((lpBalance as bigint) || 0n, 18)
  const pendingFormatted = formatUnits((pendingReward as bigint) || 0n, 18)

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" />
        <span style={{ marginLeft: 16, color: 'white' }}>加载中...</span>
      </div>
    )
  }

  if (error || !farmData) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <Alert message="加载失败" description={error || '该挖矿池不存在'} type="error" showIcon />
        <Button onClick={() => navigate('/farms')} style={{ marginTop: 16 }}>返回挖矿列表</Button>
      </div>
    )
  }

  const { lpToken, apr, tvl, totalStaked, dailyReward, weight } = farmData

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/farms')} style={{ marginBottom: 24 }}>
        返回挖矿列表
      </Button>

      {/* 头部 */}
      <Card style={{ marginBottom: 24 }}>
        <Row align="middle" gutter={24}>
          <Col>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 24, fontWeight: 'bold' }}>
                {lpToken.token0.symbol[0]}
              </div>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, #f093fb, #f5576c)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 24, fontWeight: 'bold', marginLeft: -20 }}>
                {lpToken.token1.symbol[0]}
              </div>
            </div>
          </Col>
          <Col flex="auto">
            <Title level={2} style={{ margin: 0, color: 'white' }}>{lpToken.token0.symbol}-{lpToken.token1.symbol}</Title>
            <Text style={{ color: 'rgba(255,255,255,0.65)' }}>流动性挖矿池 #{poolId}</Text>
          </Col>
          <Col>
            <Statistic title={<span style={{ color: 'rgba(255,255,255,0.65)' }}>APR</span>} value={parseFloat(apr).toFixed(2)} suffix="%" valueStyle={{ fontSize: '32px', color: '#52c41a' }} />
          </Col>
        </Row>
      </Card>

      <Row gutter={[24, 24]}>
        {/* 池子信息 */}
        <Col xs={24} lg={12}>
          <Card title={<span style={{ color: 'white' }}><FireOutlined /> 池子信息</span>}>
            <Row gutter={[16, 24]}>
              <Col span={12}>
                <Statistic title={<span style={{ color: 'rgba(255,255,255,0.65)' }}>TVL</span>} value={parseFloat(tvl).toFixed(2)} prefix={<DollarOutlined />} suffix="USD" valueStyle={{ color: 'white' }} />
              </Col>
              <Col span={12}>
                <Statistic title={<span style={{ color: 'rgba(255,255,255,0.65)' }}>每日奖励</span>} value={parseFloat(dailyReward).toFixed(2)} suffix="DEX" valueStyle={{ color: 'white' }} />
              </Col>
              <Col span={12}>
                <Statistic title={<span style={{ color: 'rgba(255,255,255,0.65)' }}>总质押量</span>} value={parseFloat(totalStaked).toFixed(2)} suffix="LP" valueStyle={{ color: 'white' }} />
              </Col>
              <Col span={12}>
                <Statistic title={<span style={{ color: 'rgba(255,255,255,0.65)' }}>权重占比</span>} value={(weight * 100).toFixed(2)} suffix="%" valueStyle={{ color: 'white' }} />
              </Col>
            </Row>
          </Card>

          {/* 我的信息 */}
          {address && (
            <Card title={<span style={{ color: 'white' }}>我的信息</span>} style={{ marginTop: 24 }}>
              <Row gutter={[16, 24]}>
                <Col span={12}>
                  <Statistic title={<span style={{ color: 'rgba(255,255,255,0.65)' }}>已质押</span>} value={parseFloat(userStakedFormatted).toFixed(4)} suffix="LP" valueStyle={{ color: 'white' }} />
                </Col>
                <Col span={12}>
                  <Statistic title={<span style={{ color: 'rgba(255,255,255,0.65)' }}>待领取奖励</span>} value={parseFloat(pendingFormatted).toFixed(4)} suffix="DEX" valueStyle={{ color: '#52c41a' }} />
                </Col>
                <Col span={24}>
                  <Text style={{ color: 'rgba(255,255,255,0.65)' }}>LP Token 余额: </Text>
                  <Text style={{ color: '#1890ff' }}>{parseFloat(lpBalanceFormatted).toFixed(4)} LP</Text>
                </Col>
              </Row>
            </Card>
          )}
        </Col>

        {/* 操作面板 */}
        <Col xs={24} lg={12}>
          <Card title={<span style={{ color: 'white' }}>操作</span>}>
            {!address ? (
              <Alert message="请先连接钱包" description="连接钱包后即可开始质押挖矿" type="info" showIcon />
            ) : (
              <Tabs defaultActiveKey="deposit" items={[
                {
                  key: 'deposit',
                  label: '质押',
                  children: (
                    <div>
                      <div style={{ marginBottom: 16 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.85)' }}>质押数量</Text>
                        <Input
                          size="large"
                          placeholder="0.0"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          style={{ marginTop: 8 }}
                          suffix={<Button type="link" size="small" onClick={() => setDepositAmount(lpBalanceFormatted)}>最大</Button>}
                        />
                        <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>余额: {parseFloat(lpBalanceFormatted).toFixed(4)} LP</Text>
                      </div>
                      <Button type="primary" size="large" block onClick={handleDeposit} loading={txLoading} disabled={!depositAmount}>
                        质押
                      </Button>
                    </div>
                  ),
                },
                {
                  key: 'withdraw',
                  label: '提取',
                  children: (
                    <div>
                      <div style={{ marginBottom: 16 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.85)' }}>提取数量</Text>
                        <Input
                          size="large"
                          placeholder="0.0"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          style={{ marginTop: 8 }}
                          suffix={<Button type="link" size="small" onClick={() => setWithdrawAmount(userStakedFormatted)}>最大</Button>}
                        />
                        <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>已质押: {parseFloat(userStakedFormatted).toFixed(4)} LP</Text>
                      </div>
                      <Button type="primary" size="large" block onClick={handleWithdraw} loading={txLoading} disabled={!withdrawAmount}>
                        提取并领取奖励
                      </Button>
                      {parseFloat(userStakedFormatted) > 0 && (
                        <Button danger block onClick={handleEmergencyWithdraw} style={{ marginTop: 16 }} icon={<WarningOutlined />}>
                          紧急提取（放弃奖励）
                        </Button>
                      )}
                    </div>
                  ),
                },
              ]} />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default FarmDetail
