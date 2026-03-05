import React from 'react'
import { Card, Row, Col, Typography, Tag, Button, Space, Statistic } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useAccount, useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import ERC20ABI from '../../contracts/ERC20.json'
import './index.css'

const { Text, Title } = Typography

interface Token {
  symbol: string
  address: string
}

interface LPToken {
  address: string
  symbol: string
  token0: Token
  token1: Token
}

interface FarmCardProps {
  poolId: number
  lpToken: LPToken
  apr: string
  tvl: string
  dailyReward: string
  weight: number
  active: boolean
  userStaked?: string
  userPendingReward?: string
}

/**
 * FarmCard 组件
 *
 * 显示单个挖矿池的卡片信息
 */
const FarmCard: React.FC<FarmCardProps> = ({
  poolId,
  lpToken,
  apr,
  tvl,
  dailyReward,
  weight,
  active,
  userStaked,
  userPendingReward,
}) => {
  const navigate = useNavigate()
  const { address } = useAccount()

  // 查询用户的 LP Token 余额
  const { data: lpBalance } = useReadContract({
    address: lpToken.address as `0x${string}`,
    abi: ERC20ABI.abi as any,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    query: {
      enabled: !!address && !!lpToken.address,
    },
  })

  const handleCardClick = () => {
    navigate(`/farms/${poolId}`)
  }

  // APR 颜色
  const getAPRColor = (aprValue: number) => {
    if (aprValue >= 100) return '#52c41a' // 绿色
    if (aprValue >= 50) return '#1890ff' // 蓝色
    return '#faad14' // 黄色
  }

  const aprValue = parseFloat(apr)
  const lpBalanceFormatted = lpBalance ? formatUnits(lpBalance as bigint, 18) : '0'
  const hasLpBalance = lpBalance ? (lpBalance as bigint) > 0n : false

  return (
    <Card
      className="farm-card"
      hoverable
      onClick={handleCardClick}
      extra={
        <Space>
          {!active && <Tag color="default">未激活</Tag>}
          <Tag color="blue">权重 {(weight * 100).toFixed(1)}%</Tag>
        </Space>
      }
    >
      {/* 头部：LP Token 信息 */}
      <div className="farm-card-header">
        <div className="token-icons">
          <div className="token-icon">{lpToken.token0.symbol[0]}</div>
          <div className="token-icon token-icon-overlap">{lpToken.token1.symbol[0]}</div>
        </div>
        <div className="token-info">
          <Title level={4} style={{ margin: 0 }}>
            {lpToken.token0.symbol}-{lpToken.token1.symbol}
          </Title>
          <Text type="secondary">LP Token</Text>
        </div>
      </div>

      {/* APR 显示 */}
      <div className="farm-card-apr">
        <Text type="secondary">APR</Text>
        <Title 
          level={2} 
          style={{ 
            margin: 0, 
            color: getAPRColor(aprValue) 
          }}
        >
          {aprValue.toFixed(2)}%
        </Title>
      </div>

      {/* 统计信息 */}
      <Row gutter={[16, 16]} className="farm-card-stats">
        <Col span={12}>
          <Statistic
            title="TVL"
            value={parseFloat(tvl).toFixed(2)}
            prefix="$"
            valueStyle={{ fontSize: '18px' }}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="每日奖励"
            value={parseFloat(dailyReward).toFixed(2)}
            suffix="DEX"
            valueStyle={{ fontSize: '18px' }}
          />
        </Col>
      </Row>

      {/* 用户信息（如果有质押） */}
      {userStaked && parseFloat(userStaked) > 0 && (
        <div className="farm-card-user">
          <Row gutter={[16, 8]}>
            <Col span={12}>
              <Text style={{ color: 'rgba(255,255,255,0.65)' }}>已质押</Text>
              <br />
              <Text strong style={{ color: 'rgba(255,255,255,0.85)' }}>{parseFloat(userStaked).toFixed(4)} LP</Text>
            </Col>
            <Col span={12}>
              <Text style={{ color: 'rgba(255,255,255,0.65)' }}>待领取</Text>
              <br />
              <Text strong style={{ color: '#52c41a' }}>
                {userPendingReward ? parseFloat(userPendingReward).toFixed(4) : '0.0000'} DEX
              </Text>
            </Col>
          </Row>
        </div>
      )}

      {/* 用户可用 LP 余额 */}
      {address && hasLpBalance && (
        <div className="farm-card-lp-balance">
          <Text type="secondary">可质押 LP:</Text>
          <Text strong style={{ color: '#1890ff', marginLeft: 8 }}>
            {parseFloat(lpBalanceFormatted).toFixed(4)} LP
          </Text>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="farm-card-actions">
        <Button
          type="primary"
          block
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/farms/${poolId}`)
          }}
        >
          {userStaked && parseFloat(userStaked) > 0 ? '管理' : '开始挖矿'}
        </Button>
      </div>
    </Card>
  )
}

export default FarmCard

