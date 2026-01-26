import { createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { defaultChain, supportedChains } from './chains'

/**
 * Wagmi 配置
 * 用于管理钱包连接和区块链交互
 *
 * 根据 VITE_CHAIN_ID 环境变量自动选择链:
 * - 31337: Hardhat 本地测试链
 * - 11155111: Sepolia 测试网
 */
export const wagmiConfig = createConfig({
  chains: supportedChains as any,
  connectors: [
    injected({
      // 不指定 target，自动检测
      shimDisconnect: true,
    }),
  ],
  transports: {
    [defaultChain.id]: http(import.meta.env.VITE_RPC_URL || defaultChain.rpcUrls.default.http[0]),
  },
})
