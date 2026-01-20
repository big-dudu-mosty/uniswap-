import { ethers } from 'hardhat'

async function main() {
  console.log('📊 开始添加挖矿池...\n')

  // 当前部署的 MasterChef 地址（来自 deployed-addresses.json）
  const masterChefAddress = '0x610178dA211FEF7D417bC0e6FeD39F05609AD788'

  // 从 .env.deployed 读取的交易对地址
  const pairs = [
    { name: 'USDT-DAI', address: '0xF95e0E147a4417733e2a9D49c425b9c647Fe0652', allocPoint: 100 },
    { name: 'USDT-USDC', address: '0xC840037B4D9EA73E3F92C659276032e605Ef7eDb', allocPoint: 80 },
    { name: 'DAI-WETH', address: '0xE1aE47557aF9DF4533bdc87e0Ba4abbd8D40Ae26', allocPoint: 120 },
  ]

  const masterChef = await ethers.getContractAt('MasterChef', masterChefAddress)

  for (const pair of pairs) {
    try {
      console.log(`➕ 添加池子: ${pair.name}`)
      console.log(`   地址: ${pair.address}`)
      console.log(`   权重: ${pair.allocPoint}`)
      
      const tx = await masterChef.add(pair.allocPoint, pair.address, true)
      await tx.wait()
      
      console.log(`✅ ${pair.name} 池子添加成功\n`)
    } catch (error: any) {
      console.log(`⚠️  ${pair.name} 添加失败: ${error.message}\n`)
    }
  }

  // 查询池子总数
  const poolLength = await masterChef.poolLength()
  console.log(`\n📊 当前挖矿池总数: ${poolLength}`)

  // 查询总权重
  const totalAllocPoint = await masterChef.totalAllocPoint()
  console.log(`⚖️  总权重: ${totalAllocPoint}`)

  // 查询每区块奖励
  const rewardPerBlock = await masterChef.rewardPerBlock()
  console.log(`💰 每区块奖励: ${ethers.formatEther(rewardPerBlock)} DEX\n`)

  console.log('✨ 挖矿池添加完成！')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

