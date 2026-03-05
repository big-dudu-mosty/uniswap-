/**
 * 流动性挖矿合约部署脚本
 *
 * 部署顺序：
 * 1. 部署 DEXToken（治理代币）
 * 2. 部署 MasterChef（挖矿主合约）
 * 3. 将 MasterChef 设置为 DEXToken 的 owner（授权铸币权）
 * 4. 从链上 Factory 自动读取所有已有 pair，添加到挖矿池
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("\n🌾 开始部署流动性挖矿合约...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📍 部署账户:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 账户余额:", ethers.formatEther(balance), "ETH\n");

  // ============================================
  // Step 1: 部署 DEXToken
  // ============================================

  console.log("1️⃣  部署 DEX Token (治理代币)...");

  const initialSupply = ethers.parseEther("0");

  const DEXToken = await ethers.getContractFactory("DEXToken");
  const dexToken = await DEXToken.deploy(initialSupply);
  await dexToken.waitForDeployment();

  const dexTokenAddress = await dexToken.getAddress();
  console.log("✅ DEXToken 部署成功:", dexTokenAddress);
  console.log("   - 名称: DEX Token");
  console.log("   - 符号: DEX");
  console.log("   - 最大供应:", ethers.formatEther(await dexToken.MAX_SUPPLY()));
  console.log();

  // ============================================
  // Step 2: 部署 MasterChef
  // ============================================

  console.log("2️⃣  部署 MasterChef (挖矿主合约)...");

  const rewardPerBlock = ethers.parseEther("10");
  const startBlock = await ethers.provider.getBlockNumber() + 10;

  const MasterChef = await ethers.getContractFactory("MasterChef");
  const masterChef = await MasterChef.deploy(
    dexTokenAddress,
    rewardPerBlock,
    startBlock
  );
  await masterChef.waitForDeployment();

  const masterChefAddress = await masterChef.getAddress();
  console.log("✅ MasterChef 部署成功:", masterChefAddress);
  console.log("   - 每区块奖励:", ethers.formatEther(rewardPerBlock), "DEX");
  console.log("   - 开始区块:", startBlock);
  console.log();

  // ============================================
  // Step 3: 转移 DEXToken 所有权给 MasterChef
  // ============================================

  console.log("3️⃣  转移 DEXToken 铸币权给 MasterChef...");

  const transferTx = await dexToken.transferOwnership(masterChefAddress);
  await transferTx.wait();

  console.log("✅ 铸币权转移成功");
  console.log();

  // ============================================
  // Step 4: 从链上 Factory 读取所有已有 pair
  // ============================================

  console.log("4️⃣  从链上 Factory 读取所有交易对...");

  // 读取 Factory 地址（从 .env.deployed）
  const envPath = path.join(__dirname, "../.env.deployed");
  let factoryAddress = '';

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    const match = envContent.match(/FACTORY_ADDRESS=(\S+)/);
    if (match) factoryAddress = match[1];
  }

  if (!factoryAddress) {
    console.log("⚠️  未找到 Factory 地址，跳过添加挖矿池");
    console.log("   提示：请先运行 deploy.ts 部署 DEX 核心合约");
  }

  let addedPools = 0;

  if (factoryAddress) {
    const factory = await ethers.getContractAt(
      ["function allPairsLength() view returns (uint256)", "function allPairs(uint256) view returns (address)"],
      factoryAddress
    );

    const pairsLength = await factory.allPairsLength();
    console.log(`   找到 ${pairsLength} 个交易对\n`);

    // ============================================
    // Step 5: 添加所有 pair 到挖矿池
    // ============================================

    console.log("5️⃣  添加挖矿池...");

    for (let i = 0; i < pairsLength; i++) {
      const pairAddress = await factory.allPairs(i);

      // 获取 pair 的代币信息
      const pair = await ethers.getContractAt(
        ["function token0() view returns (address)", "function token1() view returns (address)"],
        pairAddress
      );
      const token0Addr = await pair.token0();
      const token1Addr = await pair.token1();

      // 获取代币 symbol
      let symbol0 = '?', symbol1 = '?';
      try {
        const t0 = await ethers.getContractAt(["function symbol() view returns (string)"], token0Addr);
        const t1 = await ethers.getContractAt(["function symbol() view returns (string)"], token1Addr);
        symbol0 = await t0.symbol();
        symbol1 = await t1.symbol();
      } catch {}

      const allocPoint = 100; // 默认权重

      try {
        const addTx = await masterChef.add(allocPoint, pairAddress, false);
        await addTx.wait();
        console.log(`   ✅ [${i}] ${symbol0}-${symbol1} (${pairAddress}) 权重: ${allocPoint}`);
        addedPools++;
      } catch (error: any) {
        console.log(`   ⚠️  [${i}] ${symbol0}-${symbol1} 添加失败:`, error.message?.slice(0, 80));
      }
    }
  }

  console.log(`\n✅ 成功添加 ${addedPools} 个挖矿池`);
  console.log();

  // ============================================
  // Step 6: 保存部署地址
  // ============================================

  console.log("6️⃣  保存部署地址...");

  const addressesPath = path.join(__dirname, "../deployed-addresses.json");
  let addresses: any = {};

  if (fs.existsSync(addressesPath)) {
    addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
  }

  addresses.farming = {
    dexToken: dexTokenAddress,
    masterChef: masterChefAddress,
    rewardPerBlock: rewardPerBlock.toString(),
    startBlock: startBlock,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  console.log("✅ 地址已保存到:", addressesPath);

  // 辅助函数：更新 .env 文件中的键值对
  function updateEnvFile(filePath: string, updates: Record<string, string>): boolean {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  配置文件不存在: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, "utf8");
    let updated = false;

    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(content)) {
        content = content.replace(regex, `${key}=${value}`);
        updated = true;
      } else {
        if (!content.endsWith('\n')) content += '\n';
        content += `${key}=${value}\n`;
        updated = true;
      }
    }

    if (updated) {
      fs.writeFileSync(filePath, content);
    }
    return updated;
  }

  // 同步更新后端 .env 文件
  const backendEnvPaths = [
    path.join(__dirname, "../../backend/services/analytics-service/.env"),
    path.join(__dirname, "../../backend/services/wallet-service/.env"),
  ];

  for (const beEnvPath of backendEnvPaths) {
    if (updateEnvFile(beEnvPath, {
      'MASTER_CHEF_ADDRESS': masterChefAddress,
      'DEX_TOKEN_ADDRESS': dexTokenAddress,
    })) {
      console.log(`✅ 已更新: ${beEnvPath}`);
    }
  }

  // 同步更新前端 .env 文件
  const frontendEnvPath = path.join(__dirname, "../../frontend/web-app/.env");
  if (updateEnvFile(frontendEnvPath, {
    'VITE_MASTER_CHEF_ADDRESS': masterChefAddress,
    'VITE_DEX_TOKEN_ADDRESS': dexTokenAddress,
  })) {
    console.log(`✅ 已更新前端配置: ${frontendEnvPath}`);
  }

  // 同步更新 .env.deployed
  const deployedEnvPath = path.join(__dirname, "../.env.deployed");
  if (updateEnvFile(deployedEnvPath, {
    'MASTER_CHEF_ADDRESS': masterChefAddress,
    'DEX_TOKEN_ADDRESS': dexTokenAddress,
  })) {
    console.log(`✅ 已更新: ${deployedEnvPath}`);
  }
  console.log();

  // ============================================
  // 部署总结
  // ============================================

  console.log("═══════════════════════════════════════");
  console.log("🎉 流动性挖矿部署完成！");
  console.log("═══════════════════════════════════════");
  console.log("\n📋 部署信息：");
  console.log("   DEXToken:   ", dexTokenAddress);
  console.log("   MasterChef: ", masterChefAddress);
  console.log("\n⚙️  配置信息：");
  console.log("   每区块奖励:", ethers.formatEther(rewardPerBlock), "DEX");
  console.log("   开始区块:  ", startBlock);
  console.log("   挖矿池数量:", addedPools);
  console.log("\n✨ 挖矿将在区块", startBlock, "开始！");
  console.log("═══════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ 部署失败:", error);
    process.exit(1);
  });
