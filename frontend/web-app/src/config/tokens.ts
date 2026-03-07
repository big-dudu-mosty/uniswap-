import { Token } from '../types'
import { CONTRACT_ADDRESSES } from './contracts'

/**
 * 代币列表配置
 * 
 * 注意：地址需要与部署的合约地址匹配
 */
export const TOKENS: Record<string, Token> = {
  ETH: {
    address: CONTRACT_ADDRESSES.WETH, // 使用 WETH 地址（添加流动性时 Router 会自动处理 ETH ↔ WETH 转换）
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    logoURI: 'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png',
  },
  USDT: {
    address: CONTRACT_ADDRESSES.USDT,
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    logoURI: 'https://tokens.1inch.io/0xdac17f958d2ee523a2206206994597c13d831ec7.png',
  },
  DAI: {
    address: CONTRACT_ADDRESSES.DAI,
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    logoURI: 'https://tokens.1inch.io/0x6b175474e89094c44da98b954eedeac495271d0f.png',
  },
  USDC: {
    address: CONTRACT_ADDRESSES.USDC,
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoURI: 'https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
  },
  WETH: {
    address: CONTRACT_ADDRESSES.WETH,
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    logoURI: 'https://tokens.1inch.io/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.png',
  },
}

/**
 * 默认代币列表（用于显示）
 */
export const DEFAULT_TOKENS = [
  TOKENS.ETH,
  TOKENS.USDT,
  TOKENS.DAI,
  TOKENS.USDC,
  // TOKENS.WETH, // ETH 已经使用 WETH 地址，不需要单独显示
].filter(token => token.address) // 过滤掉未配置的代币

// ========== 自定义代币管理（localStorage 持久化）==========

const CUSTOM_TOKENS_KEY = 'dex_custom_tokens'
const DEPLOYMENT_VERSION_KEY = 'dex_deployment_version'

// 用 Factory 地址作为部署版本标识，地址变了说明重新部署了
const currentDeploymentVersion = CONTRACT_ADDRESSES.FACTORY || ''

// 自动清理：如果部署版本变了，清除旧的自定义代币
if (currentDeploymentVersion) {
  const savedVersion = localStorage.getItem(DEPLOYMENT_VERSION_KEY)
  if (savedVersion && savedVersion !== currentDeploymentVersion) {
    localStorage.removeItem(CUSTOM_TOKENS_KEY)
    console.log('🔄 检测到合约重新部署，已清除旧的自定义代币缓存')
  }
  localStorage.setItem(DEPLOYMENT_VERSION_KEY, currentDeploymentVersion)
}

/**
 * 获取用户自定义代币列表
 * 自动过滤掉不属于当前网络的代币（通过验证合约是否存在）
 */
export const getCustomTokens = (): Token[] => {
  try {
    const stored = localStorage.getItem(CUSTOM_TOKENS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

/**
 * 清除所有自定义代币（用于重新部署后清理旧数据）
 */
export const clearCustomTokens = (): void => {
  localStorage.removeItem(CUSTOM_TOKENS_KEY)
}

/**
 * 添加自定义代币
 */
export const addCustomToken = (token: Token): void => {
  const customs = getCustomTokens()
  // 不重复添加
  if (customs.some(t => t.address.toLowerCase() === token.address.toLowerCase())) {
    return
  }
  // 不添加已存在于默认列表中的代币
  if (DEFAULT_TOKENS.some(t => t.address.toLowerCase() === token.address.toLowerCase())) {
    return
  }
  customs.push(token)
  localStorage.setItem(CUSTOM_TOKENS_KEY, JSON.stringify(customs))
}

/**
 * 移除自定义代币
 */
export const removeCustomToken = (address: string): void => {
  const customs = getCustomTokens().filter(
    t => t.address.toLowerCase() !== address.toLowerCase()
  )
  localStorage.setItem(CUSTOM_TOKENS_KEY, JSON.stringify(customs))
}

/**
 * 获取所有代币（默认 + 自定义）
 */
export const getAllTokens = (): Token[] => {
  return [...DEFAULT_TOKENS, ...getCustomTokens()]
}

/**
 * 根据地址获取代币信息（包含自定义代币）
 */
export const getTokenByAddress = (address: string): Token | undefined => {
  return getAllTokens().find(
    (token) => token.address.toLowerCase() === address.toLowerCase()
  )
}

/**
 * 根据符号获取代币信息
 */
export const getTokenBySymbol = (symbol: string): Token | undefined => {
  return getAllTokens().find(
    (token) => token.symbol.toUpperCase() === symbol.toUpperCase()
  )
}

