import React, { useState, useEffect } from 'react'
import { Typography, Table, Tabs, Button, Spin, Empty } from 'antd'
import { TrophyOutlined, SwapOutlined, DropboxOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { apiService } from '../../services/api'
import './index.css'

const { Title, Text } = Typography

interface LeaderboardItem {
  rank: number
  userAddress: string
  count: number
}

const shortenAddress = (addr: string) => {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

const periodOptions = [
  { label: '24h', value: '24h' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: 'All', value: 'all' },
]

const LeaderboardPage: React.FC = () => {
  const navigate = useNavigate()
  const [type, setType] = useState<string>('swap')
  const [period, setPeriod] = useState<string>('all')
  const [data, setData] = useState<LeaderboardItem[]>([])
  const [loading, setLoading] = useState(false)

  const fetchLeaderboard = async () => {
    setLoading(true)
    try {
      const response = await apiService.getLeaderboard(type, period)
      setData(response?.data || [])
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaderboard()
  }, [type, period])

  const columns = [
    {
      title: 'Rank',
      dataIndex: 'rank',
      key: 'rank',
      width: 80,
      render: (rank: number) => {
        if (rank === 1) return <span className="rank-badge rank-gold">1</span>
        if (rank === 2) return <span className="rank-badge rank-silver">2</span>
        if (rank === 3) return <span className="rank-badge rank-bronze">3</span>
        return <span className="rank-number">{rank}</span>
      },
    },
    {
      title: 'Address',
      dataIndex: 'userAddress',
      key: 'userAddress',
      render: (addr: string) => (
        <Button
          type="link"
          className="address-link"
          onClick={() => navigate(`/portfolio/${addr}`)}
        >
          {shortenAddress(addr)}
        </Button>
      ),
    },
    {
      title: type === 'swap' ? 'Swaps' : 'Operations',
      dataIndex: 'count',
      key: 'count',
      width: 120,
      render: (count: number) => (
        <span className="count-value">{count}</span>
      ),
    },
  ]

  return (
    <div className="leaderboard-page">
      {/* Header */}
      <div className="leaderboard-header">
        <div>
          <Title level={2} style={{ margin: 0 }}>
            <TrophyOutlined style={{ marginRight: 12 }} />
            Ranking
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.65)' }}>
            Top traders and liquidity providers
          </Text>
        </div>
      </div>

      {/* Main card */}
      <div className="leaderboard-card">
        {/* Period filter */}
        <div className="period-filter">
          {periodOptions.map((opt) => (
            <Button
              key={opt.value}
              type={period === opt.value ? 'primary' : 'default'}
              className={period === opt.value ? 'period-btn active' : 'period-btn'}
              onClick={() => setPeriod(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        {/* Tabs */}
        <Tabs
          activeKey={type}
          onChange={(key) => setType(key)}
          items={[
            {
              key: 'swap',
              label: (
                <span>
                  <SwapOutlined /> Swap Ranking
                </span>
              ),
            },
            {
              key: 'liquidity',
              label: (
                <span>
                  <DropboxOutlined /> Liquidity Ranking
                </span>
              ),
            },
          ]}
        />

        {/* Table */}
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={data}
            rowKey="rank"
            pagination={false}
            locale={{
              emptyText: <Empty description="No data yet" />,
            }}
          />
        </Spin>
      </div>
    </div>
  )
}

export default LeaderboardPage
