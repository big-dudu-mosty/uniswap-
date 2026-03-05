/**
 * 为 B 账户部署一个全新代币 (GoldCoin / GLD)
 */
import { ethers } from 'hardhat'

async function main() {
  const userAddress = '0x1d4F0DB612b4b376F3fC988b61cb23aeD699aB2C'
  const [deployer] = await ethers.getSigners()

  console.log('='.repeat(60))
  console.log('部署新代币 GoldCoin (GLD) 给 B 账户')
  console.log('='.repeat(60))
  console.log(`目标用户: ${userAddress}`)
  console.log(`部署者: ${deployer.address}\n`)

  // 部署新代币
  const MockERC20 = await ethers.getContractFactory('MockERC20')
  const initialSupply = ethers.parseUnits('500000', 18)
  const token = await MockERC20.deploy('GoldCoin', 'GLD', 18, initialSupply)
  await token.waitForDeployment()
  const tokenAddress = await token.getAddress()
  console.log(`GLD 部署成功: ${tokenAddress}`)

  // 转给用户
  await token.transfer(userAddress, initialSupply)
  console.log(`已转 500,000 GLD 给用户`)

  // 输出总结
  console.log('\n' + '='.repeat(60))
  console.log('完成！')
  console.log('='.repeat(60))
  console.log(`\n代币信息：`)
  console.log(`  名称: GoldCoin (GLD)`)
  console.log(`  地址: ${tokenAddress}`)
  console.log(`  精度: 18`)
  console.log(`  余额: 500,000 GLD`)
  console.log(`\n在前端 TokenSelect 中粘贴此地址导入: ${tokenAddress}`)
  console.log(`然后去 Liquidity 页面创建池子！\n`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
