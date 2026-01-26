import { defineChain } from 'viem'
import { sepolia } from 'viem/chains'

/**
 * Hardhat 本地测试链配置
 * 保留用于本地开发调试
 */
export const hardhatLocal = defineChain({
  id: 31337,
  name: 'Hardhat Local',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8545'],
    },
    public: {
      http: ['http://127.0.0.1:8545'],
    },
  },
  blockExplorers: {
    default: { name: 'Local Explorer', url: '' },
  },
  testnet: true,
})

/**
 * Sepolia 测试网配置
 * 使用环境变量中的 RPC URL
 */
export const sepoliaChain = defineChain({
  ...sepolia,
  rpcUrls: {
    default: {
      http: [import.meta.env.VITE_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo'],
    },
    public: {
      http: [import.meta.env.VITE_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo'],
    },
  },
})

/**
 * 根据环境变量选择链
 * VITE_CHAIN_ID=31337 -> 本地 Hardhat
 * VITE_CHAIN_ID=11155111 -> Sepolia 测试网
 */
const chainId = Number(import.meta.env.VITE_CHAIN_ID || 11155111)

/**
 * 支持的链列表
 */
export const supportedChains = chainId === 31337 ? [hardhatLocal] : [sepoliaChain]

/**
 * 默认链
 */
export const defaultChain = chainId === 31337 ? hardhatLocal : sepoliaChain
