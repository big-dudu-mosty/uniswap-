import { useState } from 'react'
import { useWalletClient, usePublicClient } from 'wagmi'
import { parseAbi, Address } from 'viem'
import { CONTRACT_ADDRESSES } from '../config/contracts'
import { message } from 'antd'
import { apiService } from '../services/api'

/**
 * Liquidity Hook - 直接调用合约管理流动性
 * 
 * 这是真正的 DEX 工作方式：
 * 1. 前端直接调用Router合约
 * 2. 用户通过 MetaMask 签名
 * 3. 流动性操作由用户账户执行
 */
export const useLiquidity = () => {
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const [loading, setLoading] = useState(false)

  const routerAbi = parseAbi([
    'function addLiquidity(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) external returns (uint256 amountA, uint256 amountB, uint256 liquidity)',
    'function addLiquidityETH(address token, uint256 amountTokenDesired, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity)',
    'function removeLiquidity(address tokenA, address tokenB, uint256 liquidity, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) external returns (uint256 amountA, uint256 amountB)',
    'function removeLiquidityETH(address token, uint256 liquidity, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline) external returns (uint256 amountToken, uint256 amountETH)',
  ])

  const erc20Abi = parseAbi([
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function allowance(address owner, address spender) external view returns (uint256)',
  ])

  /**
   * 检查并授权代币
   */
  const checkAndApprove = async (
    tokenAddress: string,
    amount: bigint
  ): Promise<boolean> => {
    if (!walletClient) {
      message.error('请先连接钱包')
      return false
    }

    try {
      const routerAddress = CONTRACT_ADDRESSES.ROUTER as Address
      
      // 检查当前授权额度
      const allowance = await publicClient?.readContract({
        address: tokenAddress as Address,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [walletClient.account.address, routerAddress],
      })

      // 如果授权额度足够，无需重新授权
      if (allowance && allowance >= amount) {
        return true
      }

      // 请求授权
      message.info(`正在请求代币授权...`)
      
      const hash = await walletClient.writeContract({
        address: tokenAddress as Address,
        abi: erc20Abi,
        functionName: 'approve',
        args: [routerAddress, amount],
        gas: 100000n, // 显式设置 gas limit
      })

      message.loading({ content: '授权交易已提交，等待确认...', key: 'approve', duration: 0 })
      
      // 等待交易确认（本地网络快速确认）
      // 设置超时时间为 30 秒
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Transaction timeout')), 30000)
      )
      
      const receiptPromise = publicClient?.waitForTransactionReceipt({ 
        hash,
        confirmations: 1, // 本地网络只需要 1 个确认
      })
      
      await Promise.race([receiptPromise, timeoutPromise])
      
      message.success({ content: '✅ 授权成功！', key: 'approve' })
      return true
    } catch (error: any) {
      console.error('Approval failed:', error)
      
      // 销毁 loading 消息
      message.destroy('approve')
      
      // 判断错误类型并提供详细错误信息
      if (error.message?.includes('User rejected') || error.message?.includes('rejected')) {
        message.warning('您取消了授权')
      } else if (error.message?.includes('timeout')) {
        message.error('授权交易超时，请检查网络连接后重试')
      } else if (error.message?.includes('aborted')) {
        message.error('授权请求被中止，可能的原因：\n1. Gas limit 不足\n2. 网络连接问题\n3. 节点响应超时\n\n请刷新页面后重试')
      } else if (error.message?.includes('insufficient funds')) {
        message.error('账户余额不足以支付 Gas 费用')
      } else if (error.shortMessage) {
        message.error(`授权失败: ${error.shortMessage}`)
      } else {
        message.error(`授权失败: ${error.message || '未知错误'}\n\n建议：\n1. 刷新页面重试\n2. 检查 MetaMask 连接\n3. 确认账户有足够 ETH 支付 Gas`)
      }
      return false
    }
  }

  /**
   * 检查地址是否为 WETH（代表 ETH）
   */
  const isWETH = (address: string): boolean => {
    return address.toLowerCase() === CONTRACT_ADDRESSES.WETH.toLowerCase()
  }

  /**
   * 添加流动性
   */
  const addLiquidity = async (params: {
    tokenA: string
    tokenB: string
    amountADesired: bigint
    amountBDesired: bigint
    amountAMin: bigint
    amountBMin: bigint
    deadline: number
  }) => {
    if (!walletClient) {
      message.error('请先连接钱包')
      return null
    }

    const { tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin, deadline } = params

    // 检查是否涉及 ETH
    const isTokenAETH = isWETH(tokenA)
    const isTokenBETH = isWETH(tokenB)

    setLoading(true)
    try {
      const routerAddress = CONTRACT_ADDRESSES.ROUTER as Address

      // 情况1: ETH + ERC20
      if (isTokenAETH || isTokenBETH) {
        const token = isTokenAETH ? tokenB : tokenA
        const amountTokenDesired = isTokenAETH ? amountBDesired : amountADesired
        const amountETHDesired = isTokenAETH ? amountADesired : amountBDesired
        const amountTokenMin = isTokenAETH ? amountBMin : amountAMin
        const amountETHMin = isTokenAETH ? amountAMin : amountBMin

        // 1. 只需要授权 ERC20 代币（ETH 不需要授权）
        message.info('授权代币...')
        const approved = await checkAndApprove(token, amountTokenDesired)
        if (!approved) {
          setLoading(false)
          return null
        }

        // 2. 调用 addLiquidityETH
        message.info('正在添加流动性 (ETH + ERC20)...')
        
        const hash = await walletClient.writeContract({
          address: routerAddress,
          abi: routerAbi,
          functionName: 'addLiquidityETH',
          args: [
            token as Address,
            amountTokenDesired,
            amountTokenMin,
            amountETHMin,
            walletClient.account.address,
            BigInt(deadline),
          ],
          value: amountETHDesired, // 发送 ETH
          gas: 250000n, // 显式设置 gas limit
        })

        message.loading({ content: '添加流动性交易已提交...', key: 'addLiq', duration: 0 })
        
        // 设置超时时间为 30 秒
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Transaction timeout')), 30000)
        )
        
        const receiptPromise = publicClient?.waitForTransactionReceipt({ 
          hash,
          confirmations: 1,
        })
        
        const receipt = await Promise.race([receiptPromise, timeoutPromise])
        
        if (receipt?.status === 'success') {
          message.destroy('addLiq')
          message.success('🎉 添加流动性成功！')
          
          // 刷新 Pool 数据（使用 WETH 地址）
          apiService.refreshPoolByTokens(tokenA, tokenB).catch(err => {
            console.warn('Pool refresh failed (non-critical):', err)
          })
          
          return hash
        } else {
          message.destroy('addLiq')
          message.error('添加流动性失败')
          return null
        }
      }
      
      // 情况2: ERC20 + ERC20
      else {
        // 1. 授权 TokenA
        message.info('授权代币 A...')
        const approvedA = await checkAndApprove(tokenA, amountADesired)
        if (!approvedA) {
          setLoading(false)
          return null
        }

        // 2. 授权 TokenB
        message.info('授权代币 B...')
        const approvedB = await checkAndApprove(tokenB, amountBDesired)
        if (!approvedB) {
          setLoading(false)
          return null
        }

        // 3. 添加流动性
        message.info('正在添加流动性 (ERC20 + ERC20)...')
        
        const hash = await walletClient.writeContract({
          address: routerAddress,
          abi: routerAbi,
          functionName: 'addLiquidity',
          args: [
            tokenA as Address,
            tokenB as Address,
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin,
            walletClient.account.address,
            BigInt(deadline),
          ],
          gas: 250000n, // 显式设置 gas limit
        })

        message.loading({ content: '添加流动性交易已提交...', key: 'addLiq', duration: 0 })
        
        // 4. 等待交易确认（本地网络快速确认）
        // 设置超时时间为 30 秒
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Transaction timeout')), 30000)
        )
        
        const receiptPromise = publicClient?.waitForTransactionReceipt({ 
          hash,
          confirmations: 1,
        })
        
        const receipt = await Promise.race([receiptPromise, timeoutPromise])
        
        if (receipt?.status === 'success') {
          message.destroy('addLiq')
          message.success('🎉 添加流动性成功！')
          
          // 5. 自动刷新 Pool 数据
          apiService.refreshPoolByTokens(tokenA, tokenB).catch(err => {
            console.warn('Pool refresh failed (non-critical):', err)
          })
          
          return hash
        } else {
          message.destroy('addLiq')
          message.error('添加流动性失败')
          return null
        }
      }
    } catch (error: any) {
      console.error('Add liquidity failed:', error)
      
      // 销毁 loading 消息
      message.destroy('addLiq')
      
      // 判断错误类型
      if (error.message?.includes('User rejected') || error.message?.includes('rejected')) {
        message.warning('您取消了操作')
      } else if (error.message?.includes('aborted')) {
        message.warning('操作被中止，请重试')
      } else if (error.message?.includes('insufficient')) {
        message.error('余额不足')
      } else if (error.shortMessage) {
        message.error(`添加流动性失败: ${error.shortMessage}`)
      } else {
        message.error(`添加流动性失败: ${error.message || '未知错误'}`)
      }
      
      return null
    } finally {
      setLoading(false)
    }
  }

  /**
   * 移除流动性
   */
  const removeLiquidity = async (params: {
    tokenA: string
    tokenB: string
    liquidity: bigint
    amountAMin: bigint
    amountBMin: bigint
    deadline: number
    pairAddress: string
  }) => {
    if (!walletClient) {
      message.error('请先连接钱包')
      return null
    }

    const { tokenA, tokenB, liquidity, amountAMin, amountBMin, deadline, pairAddress } = params

    // 检查是否涉及 ETH (WETH)
    const isTokenAETH = isWETH(tokenA)
    const isTokenBETH = isWETH(tokenB)

    setLoading(true)
    try {
      // 1. 授权 LP Token
      message.info('授权 LP 代币...')
      const approved = await checkAndApprove(pairAddress, liquidity)
      if (!approved) {
        setLoading(false)
        return null
      }

      const routerAddress = CONTRACT_ADDRESSES.ROUTER as Address
      let hash: `0x${string}`

      // 情况1: ETH + ERC20 - 使用 removeLiquidityETH
      if (isTokenAETH || isTokenBETH) {
        const token = isTokenAETH ? tokenB : tokenA
        const amountTokenMin = isTokenAETH ? amountBMin : amountAMin
        const amountETHMin = isTokenAETH ? amountAMin : amountBMin

        message.info('正在移除流动性 (ETH + ERC20)...')

        hash = await walletClient.writeContract({
          address: routerAddress,
          abi: routerAbi,
          functionName: 'removeLiquidityETH',
          args: [
            token as Address,
            liquidity,
            amountTokenMin,
            amountETHMin,
            walletClient.account.address,
            BigInt(deadline),
          ],
          gas: 250000n,
        })
      }
      // 情况2: ERC20 + ERC20 - 使用 removeLiquidity
      else {
        message.info('正在移除流动性 (ERC20 + ERC20)...')

        hash = await walletClient.writeContract({
          address: routerAddress,
          abi: routerAbi,
          functionName: 'removeLiquidity',
          args: [
            tokenA as Address,
            tokenB as Address,
            liquidity,
            amountAMin,
            amountBMin,
            walletClient.account.address,
            BigInt(deadline),
          ],
          gas: 250000n,
        })
      }

      message.loading({ content: '移除流动性交易已提交...', key: 'removeLiq', duration: 0 })

      // 设置超时时间为 30 秒
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Transaction timeout')), 30000)
      )

      const receiptPromise = publicClient?.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      })

      const receipt = await Promise.race([receiptPromise, timeoutPromise])

      if (receipt?.status === 'success') {
        message.destroy('removeLiq')
        message.success('🎉 移除流动性成功！')

        // 自动刷新 Pool 数据
        apiService.refreshPoolByTokens(tokenA, tokenB).catch(err => {
          console.warn('Pool refresh failed (non-critical):', err)
        })

        return hash
      } else {
        message.destroy('removeLiq')
        message.error('移除流动性失败')
        return null
      }
    } catch (error: any) {
      console.error('Remove liquidity failed:', error)

      // 销毁 loading 消息
      message.destroy('removeLiq')

      if (error.message?.includes('User rejected') || error.message?.includes('rejected')) {
        message.warning('您取消了操作')
      } else if (error.message?.includes('timeout')) {
        message.error('移除流动性交易超时，请检查网络连接后重试')
      } else if (error.message?.includes('aborted')) {
        message.warning('操作被中止，请重试')
      } else if (error.message?.includes('insufficient')) {
        message.error('LP 代币余额不足')
      } else if (error.shortMessage) {
        message.error('移除流动性失败: ' + error.shortMessage)
      } else {
        message.error('移除流动性失败: ' + (error.message || '未知错误'))
      }

      return null
    } finally {
      setLoading(false)
    }
  }

  return {
    addLiquidity,
    removeLiquidity,
    loading,
  }
}

