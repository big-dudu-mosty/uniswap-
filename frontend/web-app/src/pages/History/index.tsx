import React, { useState, useEffect } from 'react'
import { Card, Tabs, Table, Tag, Button, Empty, Spin, Typography, message, Tooltip } from 'antd'
import { SwapOutlined, PlusOutlined, MinusOutlined, LinkOutlined } from '@ant-design/icons'
import { useWallet } from '../../hooks/useWallet'
import { apiService } from '../../services/api'
import { formatUnits } from 'viem'
import { formatBeijingTime, formatRelativeTime } from '../../utils/time'
import './index.css'

const { Title, Text } = Typography
const { TabPane } = Tabs

interface SwapHistoryItem {
  id: number
  poolId: number
  pool?: {
    pairAddress: string
    token0Symbol: string
    token1Symbol: string
    token0Address: string
    token1Address: string
    token0Decimals: number
    token1Decimals: number
  }
  userAddress: string
  tokenIn: string
  tokenOut: string
  amountIn: string
  amountOut: string
  transactionHash: string
  blockTimestamp: number
  createdAt: string
}

interface LiquidityHistoryItem {
  id: number
  poolId: number
  pool?: {
    pairAddress: string
    token0Symbol: string
    token1Symbol: string
    token0Address: string
    token1Address: string
    token0Decimals: number
    token1Decimals: number
  }
  actionType: 'add' | 'remove'
  userAddress: string
  amount0: string
  amount1: string
  liquidity: string
  transactionHash: string
  blockTimestamp: number
  createdAt: string
}

const History: React.FC = () => {
  const { address, isConnected } = useWallet()
  const [activeTab, setActiveTab] = useState<'swaps' | 'liquidity'>('swaps')
  
  // Swap 历史
  const [swapHistory, setSwapHistory] = useState<SwapHistoryItem[]>([])
  const [swapLoading, setSwapLoading] = useState(false)
  const [swapPage, setSwapPage] = useState(1)
  const [swapTotal, setSwapTotal] = useState(0)
  
  // Liquidity 历史
  const [liquidityHistory, setLiquidityHistory] = useState<LiquidityHistoryItem[]>([])
  const [liquidityLoading, setLiquidityLoading] = useState(false)
  const [liquidityPage, setLiquidityPage] = useState(1)
  const [liquidityTotal, setLiquidityTotal] = useState(0)

  const pageSize = 10

  // 加载 Swap 历史
  const loadSwapHistory = async () => {
    if (!address) return
    
    setSwapLoading(true)
    try {
      const response = await apiService.getSwapHistory({
        userAddress: address,
        page: swapPage,
        limit: pageSize,
      })
      
      setSwapHistory(response.data || [])
      setSwapTotal(response.total || 0)
    } catch (error: any) {
      console.error('Failed to load swap history:', error)
      message.error('加载 Swap 历史失败')
    } finally {
      setSwapLoading(false)
    }
  }

  // 加载 Liquidity 历史
  const loadLiquidityHistory = async () => {
    if (!address) return
    
    setLiquidityLoading(true)
    try {
      const response = await apiService.getLiquidityHistory({
        userAddress: address,
        page: liquidityPage,
        limit: pageSize,
      })
      
      setLiquidityHistory(response.data || [])
      setLiquidityTotal(response.total || 0)
    } catch (error: any) {
      console.error('Failed to load liquidity history:', error)
      message.error('加载流动性历史失败')
    } finally {
      setLiquidityLoading(false)
    }
  }

  useEffect(() => {
    if (isConnected && address) {
      if (activeTab === 'swaps') {
        loadSwapHistory()
      } else {
        loadLiquidityHistory()
      }
    }
  }, [address, isConnected, activeTab, swapPage, liquidityPage])

  // Swap 历史表格列
  const swapColumns = [
    {
      title: '交易对',
      key: 'pair',
      render: (record: SwapHistoryItem) => (
        <Text strong>
          {record.pool?.token0Symbol || 'Token'} / {record.pool?.token1Symbol || 'Token'}
        </Text>
      ),
    },
    {
      title: '类型',
      key: 'type',
      render: () => (
        <Tag icon={<SwapOutlined />} color="blue">
          Swap
        </Tag>
      ),
    },
    {
      title: '输入',
      key: 'input',
      render: (record: SwapHistoryItem) => {
        try {
          // 根据 tokenIn 地址判断使用哪个 decimals
          const isToken0In = record.tokenIn.toLowerCase() === record.pool?.token0Address?.toLowerCase()
          const decimalsIn = isToken0In
            ? (record.pool?.token0Decimals || 18)
            : (record.pool?.token1Decimals || 18)
          const amount = formatUnits(BigInt(record.amountIn), decimalsIn)
          return <Text>{parseFloat(amount).toFixed(4)}</Text>
        } catch {
          return <Text>-</Text>
        }
      },
    },
    {
      title: '输出',
      key: 'output',
      render: (record: SwapHistoryItem) => {
        try {
          // 根据 tokenOut 地址判断使用哪个 decimals
          const isToken0Out = record.tokenOut.toLowerCase() === record.pool?.token0Address?.toLowerCase()
          const decimalsOut = isToken0Out
            ? (record.pool?.token0Decimals || 18)
            : (record.pool?.token1Decimals || 18)
          const amount = formatUnits(BigInt(record.amountOut), decimalsOut)
          return <Text>{parseFloat(amount).toFixed(4)}</Text>
        } catch {
          return <Text>-</Text>
        }
      },
    },
    {
      title: '时间',
      key: 'time',
      render: (record: SwapHistoryItem) => (
        <Tooltip title={formatBeijingTime(record.createdAt)}>
          <Text type="secondary">{formatRelativeTime(record.createdAt)}</Text>
        </Tooltip>
      ),
    },
    {
      title: '交易哈希',
      key: 'hash',
      render: (record: SwapHistoryItem) => (
        <Button
          type="link"
          icon={<LinkOutlined />}
          href={`https://etherscan.io/tx/${record.transactionHash}`}
          target="_blank"
          size="small"
        >
          {record.transactionHash.slice(0, 10)}...
        </Button>
      ),
    },
  ]

  // Liquidity 历史表格列
  const liquidityColumns = [
    {
      title: '交易对',
      key: 'pair',
      render: (record: LiquidityHistoryItem) => (
        <Text strong>
          {record.pool?.token0Symbol || 'Token'} / {record.pool?.token1Symbol || 'Token'}
        </Text>
      ),
    },
    {
      title: '类型',
      key: 'type',
      render: (record: LiquidityHistoryItem) => (
        <Tag
          icon={record.actionType === 'add' ? <PlusOutlined /> : <MinusOutlined />}
          color={record.actionType === 'add' ? 'green' : 'orange'}
        >
          {record.actionType === 'add' ? '添加流动性' : '移除流动性'}
        </Tag>
      ),
    },
    {
      title: 'Token0 数量',
      key: 'amount0',
      render: (record: LiquidityHistoryItem) => {
        try {
          const decimals0 = record.pool?.token0Decimals || 18
          const amount = formatUnits(BigInt(record.amount0), decimals0)
          return <Text>{parseFloat(amount).toFixed(4)}</Text>
        } catch {
          return <Text>-</Text>
        }
      },
    },
    {
      title: 'Token1 数量',
      key: 'amount1',
      render: (record: LiquidityHistoryItem) => {
        try {
          const decimals1 = record.pool?.token1Decimals || 18
          const amount = formatUnits(BigInt(record.amount1), decimals1)
          return <Text>{parseFloat(amount).toFixed(4)}</Text>
        } catch {
          return <Text>-</Text>
        }
      },
    },
    {
      title: '时间',
      key: 'time',
      render: (record: LiquidityHistoryItem) => (
        <Tooltip title={formatBeijingTime(record.createdAt)}>
          <Text type="secondary">{formatRelativeTime(record.createdAt)}</Text>
        </Tooltip>
      ),
    },
    {
      title: '交易哈希',
      key: 'hash',
      render: (record: LiquidityHistoryItem) => (
        <Button
          type="link"
          icon={<LinkOutlined />}
          href={`https://etherscan.io/tx/${record.transactionHash}`}
          target="_blank"
          size="small"
        >
          {record.transactionHash.slice(0, 10)}...
        </Button>
      ),
    },
  ]

  if (!isConnected) {
    return (
      <div className="history-container">
        <Card>
          <Empty description="请先连接钱包查看交易历史" />
        </Card>
      </div>
    )
  }

  return (
    <div className="history-container">
      <Card>
        <Title level={2}>📜 交易历史</Title>
        <Text type="secondary">查看您的所有 Swap 和流动性操作记录</Text>

        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key as 'swaps' | 'liquidity')
            setSwapPage(1)
            setLiquidityPage(1)
          }}
          style={{ marginTop: 24 }}
        >
          <TabPane tab={`💱 Swap 历史 (${swapTotal})`} key="swaps">
            <Spin spinning={swapLoading}>
              <Table
                columns={swapColumns}
                dataSource={swapHistory}
                rowKey="id"
                pagination={{
                  current: swapPage,
                  pageSize,
                  total: swapTotal,
                  onChange: setSwapPage,
                  showSizeChanger: false,
                  showTotal: (total) => `共 ${total} 条记录`,
                }}
                locale={{
                  emptyText: <Empty description="暂无 Swap 记录" />,
                }}
              />
            </Spin>
          </TabPane>

          <TabPane tab={`💧 流动性历史 (${liquidityTotal})`} key="liquidity">
            <Spin spinning={liquidityLoading}>
              <Table
                columns={liquidityColumns}
                dataSource={liquidityHistory}
                rowKey="id"
                pagination={{
                  current: liquidityPage,
                  pageSize,
                  total: liquidityTotal,
                  onChange: setLiquidityPage,
                  showSizeChanger: false,
                  showTotal: (total) => `共 ${total} 条记录`,
                }}
                locale={{
                  emptyText: <Empty description="暂无流动性操作记录" />,
                }}
              />
            </Spin>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  )
}

export default History

