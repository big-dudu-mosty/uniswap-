import { useState, useEffect } from 'react'
import { Modal, List, Input, Avatar, Typography, Space, Button, Spin, message } from 'antd'
import { SearchOutlined, CloseCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { usePublicClient } from 'wagmi'
import { isAddress, getAddress } from 'viem'
import { Token } from '../../types'
import { DEFAULT_TOKENS, getCustomTokens, addCustomToken, getAllTokens } from '../../config/tokens'
import { apiService } from '../../services/api'
import ERC20ABI from '../../contracts/ERC20.json'
import './index.css'

const { Text } = Typography

interface TokenSelectProps {
  visible: boolean
  onClose: () => void
  onSelect: (token: Token) => void
  selectedToken?: Token
  excludeToken?: Token // 排除的代币（比如已选择的另一个代币）
}

const TokenSelect: React.FC<TokenSelectProps> = ({
  visible,
  onClose,
  onSelect,
  selectedToken,
  excludeToken,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [importedToken, setImportedToken] = useState<Token | null>(null)
  const [importing, setImporting] = useState(false)
  const [customTokens, setCustomTokens] = useState<Token[]>(getCustomTokens())
  const publicClient = usePublicClient()

  // 刷新自定义代币列表
  useEffect(() => {
    if (visible) {
      setCustomTokens(getCustomTokens())
      setImportedToken(null)
    }
  }, [visible])

  // 检测输入是否为合约地址，自动查询代币信息
  useEffect(() => {
    const query = searchQuery.trim()
    if (!isAddress(query)) {
      setImportedToken(null)
      return
    }

    // 已经在默认/自定义列表中的，不需要导入
    const allTokens = getAllTokens()
    if (allTokens.some(t => t.address.toLowerCase() === query.toLowerCase())) {
      setImportedToken(null)
      return
    }

    // 查询链上代币信息
    const fetchToken = async () => {
      setImporting(true)
      try {
        const checksumAddress = getAddress(query) as `0x${string}`

        const [nameResult, symbolResult, decimalsResult] = await Promise.all([
          publicClient?.readContract({
            address: checksumAddress,
            abi: ERC20ABI.abi,
            functionName: 'name',
          }).catch(() => null),
          publicClient?.readContract({
            address: checksumAddress,
            abi: ERC20ABI.abi,
            functionName: 'symbol',
          }).catch(() => null),
          publicClient?.readContract({
            address: checksumAddress,
            abi: ERC20ABI.abi,
            functionName: 'decimals',
          }).catch(() => null),
        ])

        if (symbolResult && decimalsResult !== null && decimalsResult !== undefined) {
          setImportedToken({
            address: checksumAddress,
            symbol: symbolResult as string,
            name: (nameResult as string) || (symbolResult as string),
            decimals: Number(decimalsResult),
          })
        } else {
          setImportedToken(null)
        }
      } catch {
        setImportedToken(null)
      } finally {
        setImporting(false)
      }
    }

    fetchToken()
  }, [searchQuery, publicClient])

  // 合并所有可显示的代币
  const allDisplayTokens = [...DEFAULT_TOKENS, ...customTokens]

  // 过滤代币列表
  const filteredTokens = allDisplayTokens.filter((token) => {
    // 排除已选择的代币
    if (excludeToken && token.address.toLowerCase() === excludeToken.address.toLowerCase()) {
      return false
    }

    // 搜索过滤
    if (searchQuery && !isAddress(searchQuery.trim())) {
      const query = searchQuery.toLowerCase()
      return (
        token.symbol.toLowerCase().includes(query) ||
        token.name.toLowerCase().includes(query) ||
        token.address.toLowerCase().includes(query)
      )
    }

    return true
  })

  const handleSelect = (token: Token) => {
    if (selectedToken?.address === token.address) {
      onSelect(null as any)
    } else {
      onSelect(token)
    }
    onClose()
    setSearchQuery('')
  }

  const handleImport = (token: Token) => {
    addCustomToken(token)
    setCustomTokens(getCustomTokens())
    setImportedToken(null)
    message.success(`已导入 ${token.symbol}`)
    // 自动注册到后端数据库（价格追踪）
    apiService.trackToken(token.address, token.symbol)
    // 导入后直接选中
    onSelect(token)
    onClose()
    setSearchQuery('')
  }

  const handleClear = () => {
    onSelect(null as any)
    onClose()
    setSearchQuery('')
  }

  const isCustomToken = (address: string) => {
    return customTokens.some(t => t.address.toLowerCase() === address.toLowerCase())
  }

  return (
    <Modal
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>选择代币</span>
          {selectedToken && (
            <Button
              type="text"
              size="small"
              icon={<CloseCircleOutlined />}
              onClick={handleClear}
              style={{ color: 'rgba(255, 255, 255, 0.65)' }}
            >
              清除选择
            </Button>
          )}
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={420}
      className="token-select-modal"
    >
      <div className="token-select-content">
        {/* 搜索框 */}
        <Input
          size="large"
          placeholder="搜索代币名称或粘贴合约地址"
          prefix={<SearchOutlined />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="token-search-input"
        />

        {/* 导入提示：当检测到链上代币时显示 */}
        {importing && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <Spin size="small" />
            <Text style={{ marginLeft: 8, color: 'rgba(255,255,255,0.65)' }}>
              正在查询代币信息...
            </Text>
          </div>
        )}

        {importedToken && (
          <div style={{
            padding: '12px 16px',
            margin: '8px 0',
            background: 'rgba(24, 144, 255, 0.1)',
            borderRadius: 8,
            border: '1px solid rgba(24, 144, 255, 0.3)',
          }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Space size={12}>
                <Avatar size={36} style={{ backgroundColor: '#1890ff' }}>
                  {importedToken.symbol[0]}
                </Avatar>
                <div>
                  <Text strong style={{ display: 'block' }}>
                    {importedToken.symbol}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {importedToken.name} · {importedToken.decimals} decimals
                  </Text>
                </div>
              </Space>
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => handleImport(importedToken)}
              >
                导入
              </Button>
            </Space>
          </div>
        )}

        {/* 代币列表 */}
        <List
          className="token-list"
          dataSource={filteredTokens}
          renderItem={(token) => {
            const isSelected = selectedToken?.address === token.address
            const isCustom = isCustomToken(token.address)
            return (
              <List.Item
                className={`token-list-item ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelect(token)}
              >
                <Space size={12} style={{ flex: 1 }}>
                  <Avatar
                    src={token.logoURI}
                    size={36}
                    style={{ backgroundColor: '#1890ff' }}
                  >
                    {token.symbol[0]}
                  </Avatar>
                  <div style={{ flex: 1 }}>
                    <Text strong style={{ display: 'block' }}>
                      {token.symbol}
                      {isCustom && (
                        <Text type="secondary" style={{ fontSize: 10, marginLeft: 6 }}>
                          (已导入)
                        </Text>
                      )}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {token.name}
                    </Text>
                  </div>
                  {isSelected && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      已选中 · 点击取消
                    </Text>
                  )}
                </Space>
              </List.Item>
            )
          }}
          locale={{ emptyText: searchQuery && isAddress(searchQuery.trim()) ? '未找到该代币，请检查地址是否正确' : '未找到代币' }}
        />
      </div>
    </Modal>
  )
}

export default TokenSelect
