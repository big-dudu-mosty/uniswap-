// 给指定账户 mint 测试代币
// 用法: npx hardhat run scripts/mint-tokens.js --network localhost [address]

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // 从 .env.deployed 读取合约地址
  const envDeployedPath = path.join(__dirname, "../.env.deployed");
  let envVars = {};

  if (fs.existsSync(envDeployedPath)) {
    const content = fs.readFileSync(envDeployedPath, "utf8");
    content.split('\n').forEach(line => {
      const match = line.match(/^(\w+)=(\S+)/);
      if (match) envVars[match[1]] = match[2];
    });
    console.log('📂 从 .env.deployed 读取合约地址');
  } else {
    console.log('⚠️  .env.deployed 不存在，使用环境变量或默认值');
  }

  const USDT_ADDRESS = envVars.USDT_ADDRESS || process.env.USDT_ADDRESS;
  const DAI_ADDRESS = envVars.DAI_ADDRESS || process.env.DAI_ADDRESS;
  const USDC_ADDRESS = envVars.USDC_ADDRESS || process.env.USDC_ADDRESS;

  if (!USDT_ADDRESS || !DAI_ADDRESS || !USDC_ADDRESS) {
    console.error('❌ 缺少代币地址！请先运行 deploy.ts 部署合约');
    process.exit(1);
  }
  
  // 目标地址（从命令行参数获取，或使用默认账户）
  const [deployer] = await hre.ethers.getSigners();
  const targetAddress = process.argv[2] || deployer.address;
  
  console.log('\n🪙 开始 mint 测试代币...\n');
  console.log('📋 信息:');
  console.log('  目标地址:', targetAddress);
  console.log('  USDT:', USDT_ADDRESS);
  console.log('  DAI: ', DAI_ADDRESS);
  console.log('  USDC:', USDC_ADDRESS);
  console.log('');
  
  // 获取合约实例
  const USDT = await hre.ethers.getContractAt('MockERC20', USDT_ADDRESS);
  const DAI = await hre.ethers.getContractAt('MockERC20', DAI_ADDRESS);
  const USDC = await hre.ethers.getContractAt('MockERC20', USDC_ADDRESS);
  
  // Mint 数量
  const mintAmount18 = hre.ethers.parseUnits('1000', 18); // 18 decimals
  const mintAmount6 = hre.ethers.parseUnits('1000', 6);   // 6 decimals
  
  console.log('💰 Mint 数量: 1000 tokens per type\n');
  console.log('🔄 开始 mint...\n');
  
  // Mint USDT
  console.log('📝 Mint USDT...');
  let tx = await USDT.mint(targetAddress, mintAmount6);
  await tx.wait();
  console.log('✅ USDT minted\n');
  
  // Mint DAI
  console.log('📝 Mint DAI...');
  tx = await DAI.mint(targetAddress, mintAmount18);
  await tx.wait();
  console.log('✅ DAI minted\n');
  
  // Mint USDC
  console.log('📝 Mint USDC...');
  tx = await USDC.mint(targetAddress, mintAmount6);
  await tx.wait();
  console.log('✅ USDC minted\n');
  
  // 查询余额
  console.log('📊 余额检查:');
  const usdtBalance = await USDT.balanceOf(targetAddress);
  const daiBalance = await DAI.balanceOf(targetAddress);
  const usdcBalance = await USDC.balanceOf(targetAddress);
  
  console.log('  USDT:', hre.ethers.formatUnits(usdtBalance, 6));
  console.log('  DAI: ', hre.ethers.formatUnits(daiBalance, 18));
  console.log('  USDC:', hre.ethers.formatUnits(usdcBalance, 6));
  console.log('');
  
  console.log('🎉 完成！你的账户现在有:');
  console.log('  ✅ 1000 USDT');
  console.log('  ✅ 1000 DAI');
  console.log('  ✅ 1000 USDC');
  console.log('');
  console.log('现在你可以:');
  console.log('  1️⃣  在 Swap 页面测试 DAI ↔ USDT 交易');
  console.log('  2️⃣  在 Liquidity 页面创建 ETH/USDT 流动性池');
  console.log('  3️⃣  创建其他交易对并测试');
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

