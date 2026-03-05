/**
 * 新用户测试脚本：
 * 1. 用部署者部署新代币 (MyToken / MTK)
 * 2. 给指定外部用户 mint 新代币 + 现有代币
 * 3. 转 ETH 给用户（Gas 费）
 * 4. 用户自己去前端创建池子
 */
import { ethers } from 'hardhat'
import * as fs from 'fs'
import * as path from 'path'

async function main() {
  const userAddress = '0x1d4F0DB612b4b376F3fC988b61cb23aeD699aB2C'
  const [deployer] = await ethers.getSigners()

  console.log('='.repeat(60))
  console.log('🧪 新用户测试：部署代币 + 分发资产')
  console.log('='.repeat(60))
  console.log(`\n👤 目标用户: ${userAddress}`)
  console.log(`🔧 部署者: ${deployer.address}\n`)

  // ========== 1. 转 ETH 给用户（Gas 费）==========
  console.log('📝 步骤 1: 转 100 ETH 给用户（Gas 费）...')
  const tx = await deployer.sendTransaction({
    to: userAddress,
    value: ethers.parseEther('100'),
  })
  await tx.wait()
  const ethBalance = await ethers.provider.getBalance(userAddress)
  console.log(`✅ ETH 余额: ${ethers.formatEther(ethBalance)} ETH\n`)

  // ========== 2. 部署新代币 ==========
  console.log('📝 步骤 2: 部署自定义代币 MyToken (MTK)...')
  const MockERC20 = await ethers.getContractFactory('MockERC20')
  const initialSupply = ethers.parseUnits('100000', 18)
  const myToken = await MockERC20.deploy('MyToken', 'MTK', 18, initialSupply)
  await myToken.waitForDeployment()
  const myTokenAddress = await myToken.getAddress()
  console.log(`✅ MyToken 部署成功: ${myTokenAddress}`)

  // 把代币转给用户
  await myToken.transfer(userAddress, initialSupply)
  console.log(`✅ 转 100,000 MTK 给用户\n`)

  // ========== 3. 给用户 mint 现有代币 ==========
  console.log('📝 步骤 3: Mint 现有代币给用户...')

  const envPath = path.join(__dirname, '../.env.deployed')
  const envContent = fs.readFileSync(envPath, 'utf8')
  const addresses: Record<string, string> = {}
  envContent.split('\n').forEach((line) => {
    if (line && !line.startsWith('#') && line.includes('=')) {
      const [key, value] = line.split('=')
      addresses[key.trim()] = value.trim()
    }
  })

  const existingTokens = [
    { name: 'USDT', address: addresses.USDT_ADDRESS, decimals: 6, amount: '10000' },
    { name: 'DAI', address: addresses.DAI_ADDRESS, decimals: 18, amount: '10000' },
    { name: 'USDC', address: addresses.USDC_ADDRESS, decimals: 6, amount: '10000' },
  ]

  for (const token of existingTokens) {
    const contract = await ethers.getContractAt('MockERC20', token.address)
    await contract.connect(deployer).mint(userAddress, ethers.parseUnits(token.amount, token.decimals))
    const balance = await contract.balanceOf(userAddress)
    console.log(`✅ ${token.name}: ${ethers.formatUnits(balance, token.decimals)}`)
  }

  // ========== 4. 输出总结 ==========
  console.log('\n' + '='.repeat(60))
  console.log('🎉 准备完成！')
  console.log('='.repeat(60))
  console.log(`\n📋 新代币信息：`)
  console.log(`   名称: MyToken (MTK)`)
  console.log(`   地址: ${myTokenAddress}`)
  console.log(`   精度: 18`)
  console.log(`   余额: 100,000 MTK`)
  console.log(`\n📋 用户资产：`)
  console.log(`   ETH:  ${ethers.formatEther(ethBalance)}`)
  console.log(`   USDT: 10,000`)
  console.log(`   DAI:  10,000`)
  console.log(`   USDC: 10,000`)
  console.log(`   MTK:  100,000`)
  console.log(`\n📋 在 MetaMask 中 Import Token 使用这些地址：`)
  console.log(`   MTK:  ${myTokenAddress}`)
  console.log(`   USDT: ${addresses.USDT_ADDRESS}`)
  console.log(`   DAI:  ${addresses.DAI_ADDRESS}`)
  console.log(`   USDC: ${addresses.USDC_ADDRESS}`)
  console.log(`\n🚀 去前端 Liquidity 页面创建池子吧！`)
  console.log('')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
