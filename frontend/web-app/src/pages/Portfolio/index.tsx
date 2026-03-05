import React, { useState, useEffect, useMemo, Component } from 'react'
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
import { DEFAULT_TOKENS, getCustomTokens } from '../../config/tokens'
import './index.css'

const { Title, Text } = Typography

// ========== Error Boundary ==========
class PortfolioErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="portfolio-page">
          <div className="assets-card" style={{ padding: '40px 20px', textAlign: 'center' }}>
            <Title level={4} style={{ color: '#ff4d4f' }}>页面加载出错</Title>
            <Text style={{ color: 'rgba(255,255,255,0.65)', display: 'block', marginBottom: 16 }}>
              {this.state.error?.message}
            </Text>
            <Button type="primary" onClick={() => this.setState({ hasError: false, error: null })}>
              重试
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ========== Types ==========
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
  actionType?: string
  pool?: {
    token0Address: string
    token1Address: string
    token0Symbol: string
    token1Symbol: string
    token0Decimals: number
    token1Decimals: number
  }
}

// ========== ERC20 ABI (inline, avoid import type issues) ==========
const balanceOfAbi = [
  {
    type: 'function' as const,
    name: 'balanceOf' as const,
    inputs: [{ name: 'account', type: 'address' as const }] as const,
    outputs: [{ name: '', type: 'uint256' as const }] as const,
    stateMutability: 'view' as const,
  },
] as const

// ========== Main Component ==========
const PortfolioContent: React.FC = () => {
  const { address, isConnected } = useAccount()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [txLoading, setTxLoading] = useState(false)

  // 获取 ETH 余额
  const { data: ethBalance, refetch: refetchEth } = useBalance({
    address: address,
  })

  // 合并默认代币 + 自定义导入代币（只在挂载时读一次）
  const erc20Tokens = useMemo(() => {
    try {
      const customs = getCustomTokens()
      const allErc20 = [...DEFAULT_TOKENS.slice(1), ...customs]
      // 过滤掉无效地址
      return allErc20.filter(t => t && t.address && t.symbol)
    } catch {
      return DEFAULT_TOKENS.slice(1)
    }
  }, [])

  // 准备代币合约调用（仅在 address 存在时）
  const tokenContracts = useMemo(() => {
    if (!address) return []
    return erc20Tokens.map((token) => ({
      address: token.address as `0x${string}`,
      abi: balanceOfAbi,
      functionName: 'balanceOf' as const,
      args: [address] as const,
    }))
  }, [erc20Tokens, address])

  // 批量读取代币余额
  const { data: tokenBalances, refetch: refetchTokens, isLoading: tokensLoading } = useReadContracts({
    contracts: tokenContracts,
    query: {
      enabled: !!address && tokenContracts.length > 0,
    },
  })

  // 构建资产列表
  const assets: Asset[] = useMemo(() => {
    const list: Asset[] = [
      {
        token: {
          symbol: 'ETH',
          name: 'Ethereum',
          logoURI: 'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png',
          decimals: 18,
        },
        balance: ethBalance?.formatted || '0',
      },
    ]

    for (let i = 0; i < erc20Tokens.length; i++) {
      const token = erc20Tokens[i]
      let balance = '0'
      try {
        const balanceData = tokenBalances?.[i]
        if (balanceData && balanceData.status === 'success' && balanceData.result) {
          balance = formatUnits(balanceData.result as bigint, token.decimals)
        }
      } catch {
        balance = '0'
      }
      list.push({
        token: {
          symbol: token.symbol,
          name: token.name,
          logoURI: token.logoURI,
          decimals: token.decimals,
        },
        balance,
      })
    }

    return list.filter(a => parseFloat(a.balance) > 0)
  }, [erc20Tokens, tokenBalances, ethBalance])

  /**
   * 获取交易历史
   */
  const fetchTransactions = async () => {
    if (!address) return

    setTxLoading(true)
    try {
      const response = await apiService.getUserRecentActivity(address, 10)
      if (response && Array.isArray(response)) {
        const txList = response.map((activity: any) => ({
          hash: activity.transactionHash || '',
          from: activity.userAddress || '',
          to: activity.toAddress || '',
          tokenIn: activity.tokenIn || activity.pool?.token0Address || '',
          tokenOut: activity.tokenOut || activity.pool?.token1Address || '',
          amountIn: activity.amountIn || activity.amount0 || '0',
          amountOut: activity.amountOut || activity.amount1 || '0',
          timestamp: activity.createdAt || new Date().toISOString(),
          status: 1,
          type: activity.type || 'swap',
          actionType: activity.actionType,
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
                      {asset.token.symbol?.[0] || '?'}
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
              const isLiquidity = tx.type === 'liquidity'
              const isAdd = tx.actionType === 'add'
              let token0Symbol = '?'
              let token1Symbol = '?'
              let token0Decimals = 18
              let token1Decimals = 18

              if (tx.pool) {
                token0Symbol = tx.pool.token0Symbol
                token0Decimals = tx.pool.token0Decimals
                token1Symbol = tx.pool.token1Symbol
                token1Decimals = tx.pool.token1Decimals
              }

              let amount0Formatted: string
              let amount1Formatted: string

              if (isLiquidity) {
                // 流动性操作：amount0 对应 token0, amount1 对应 token1
                amount0Formatted = formatNumber(
                  parseFloat(tx.amountIn) / Math.pow(10, token0Decimals),
                  4
                )
                amount1Formatted = formatNumber(
                  parseFloat(tx.amountOut) / Math.pow(10, token1Decimals),
                  4
                )
              } else {
                // Swap 操作：根据 tokenIn 判断方向
                let tokenInDecimals = token0Decimals
                let tokenOutDecimals = token1Decimals

                if (tx.tokenIn?.toLowerCase() !== tx.pool?.token0Address?.toLowerCase()) {
                  tokenInDecimals = token1Decimals
                  tokenOutDecimals = token0Decimals
                  // swap symbol display
                  token0Symbol = tx.pool?.token1Symbol || '?'
                  token1Symbol = tx.pool?.token0Symbol || '?'
                }

                amount0Formatted = formatNumber(
                  parseFloat(tx.amountIn) / Math.pow(10, tokenInDecimals),
                  4
                )
                amount1Formatted = formatNumber(
                  parseFloat(tx.amountOut) / Math.pow(10, tokenOutDecimals),
                  4
                )
              }

              // 活动标题
              const title = isLiquidity
                ? `${isAdd ? '添加' : '移除'}流动性 ${token0Symbol}/${token1Symbol}`
                : `Swap ${token0Symbol} → ${token1Symbol}`

              // 金额显示
              const amountDisplay = isLiquidity
                ? `${amount0Formatted} + ${amount1Formatted}`
                : `${amount0Formatted} → ${amount1Formatted}`

              return (
                <div key={tx.hash || index} className="transaction-item">
                  <div className="transaction-item-left">
                    <div className={`transaction-icon ${isLiquidity ? 'send' : 'receive'}`}>
                      <SwapOutlined />
                    </div>
                    <div className="transaction-info">
                      <h4>{title}</h4>
                      <p>{formatTimestamp(tx.timestamp)}</p>
                    </div>
                  </div>
                  <div className="transaction-item-right">
                    <div className="transaction-value" style={{ color: 'rgba(255,255,255,0.85)' }}>
                      {amountDisplay}
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

// ========== Export with Error Boundary ==========
const PortfolioPage: React.FC = () => (
  <PortfolioErrorBoundary>
    <PortfolioContent />
  </PortfolioErrorBoundary>
)

export default PortfolioPage
