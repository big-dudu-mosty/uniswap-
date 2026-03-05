import { ethers, network } from "hardhat";

/**
 * 部署 DEX 合约脚本
 * 部署顺序：MockERC20 → WETH9 → DEXFactory → DEXRouter
 *
 * 使用方法:
 * - 本地部署: npx hardhat run scripts/deploy.ts --network localhost
 * - Sepolia: npx hardhat run scripts/deploy.ts --network sepolia
 */
async function main() {
  const networkName = network.name;
  const chainId = network.config.chainId;

  console.log("🚀 开始部署 DEX 合约...\n");
  console.log(`📍 网络: ${networkName} (chainId: ${chainId})`);

  const [deployer] = await ethers.getSigners();
  console.log("部署账户:", deployer.address);
  console.log("账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // ==================== 1. 部署测试代币 ====================
  console.log("📝 步骤 1: 部署测试代币...");

  // 部署 WETH9
  const WETH9 = await ethers.getContractFactory("WETH9");
  const weth = await WETH9.deploy();
  await weth.waitForDeployment();
  const wethAddress = await weth.getAddress();
  console.log("✅ WETH9 部署成功:", wethAddress);

  // 部署 Token A (USDT)
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const tokenA = await MockERC20.deploy(
    "Mock USDT",
    "USDT",
    6,
    ethers.parseUnits("1000000", 6) // 100万 USDT
  );
  await tokenA.waitForDeployment();
  const tokenAAddress = await tokenA.getAddress();
  console.log("✅ Token A (USDT) 部署成功:", tokenAAddress);

  // 部署 Token B (DAI)
  const tokenB = await MockERC20.deploy(
    "Mock DAI",
    "DAI",
    18,
    ethers.parseUnits("1000000", 18) // 100万 DAI
  );
  await tokenB.waitForDeployment();
  const tokenBAddress = await tokenB.getAddress();
  console.log("✅ Token B (DAI) 部署成功:", tokenBAddress);

  // 部署 Token C (USDC)
  const tokenC = await MockERC20.deploy(
    "Mock USDC",
    "USDC",
    6,
    ethers.parseUnits("1000000", 6) // 100万 USDC
  );
  await tokenC.waitForDeployment();
  const tokenCAddress = await tokenC.getAddress();
  console.log("✅ Token C (USDC) 部署成功:", tokenCAddress);

  console.log("");

  // ==================== 2. 部署 DEX Factory ====================
  console.log("📝 步骤 2: 部署 DEX Factory...");

  const DEXFactory = await ethers.getContractFactory("DEXFactory");
  const factory = await DEXFactory.deploy(deployer.address);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("✅ DEX Factory 部署成功:", factoryAddress);
  console.log("");

  // ==================== 3. 部署 DEX Router ====================
  console.log("📝 步骤 3: 部署 DEX Router...");

  const DEXRouter = await ethers.getContractFactory("DEXRouter");
  const router = await DEXRouter.deploy(factoryAddress, wethAddress);
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log("✅ DEX Router 部署成功:", routerAddress);
  console.log("");

  // ==================== 4. 创建交易对 ====================
  console.log("📝 步骤 4: 创建交易对...");

  // 创建 USDT/DAI 交易对
  const tx1 = await factory.createPair(tokenAAddress, tokenBAddress);
  await tx1.wait();
  const pairAB = await factory.getPair(tokenAAddress, tokenBAddress);
  console.log("✅ USDT/DAI 交易对创建成功:", pairAB);

  // 创建 USDT/USDC 交易对
  const tx2 = await factory.createPair(tokenAAddress, tokenCAddress);
  await tx2.wait();
  const pairAC = await factory.getPair(tokenAAddress, tokenCAddress);
  console.log("✅ USDT/USDC 交易对创建成功:", pairAC);

  // 创建 DAI/WETH 交易对
  const tx3 = await factory.createPair(tokenBAddress, wethAddress);
  await tx3.wait();
  const pairBW = await factory.getPair(tokenBAddress, wethAddress);
  console.log("✅ DAI/WETH 交易对创建成功:", pairBW);

  console.log("");

  // ==================== 5. 输出部署信息 ====================
  console.log("🎉 所有合约部署完成！\n");
  console.log("==================== 部署地址汇总 ====================");
  console.log(`网络: ${networkName} (chainId: ${chainId})`);
  console.log("Deployer:", deployer.address);
  console.log("");
  console.log("Core Contracts:");
  console.log("  Factory:", factoryAddress);
  console.log("  Router:", routerAddress);
  console.log("");
  console.log("Tokens:");
  console.log("  WETH:", wethAddress);
  console.log("  USDT:", tokenAAddress);
  console.log("  DAI:", tokenBAddress);
  console.log("  USDC:", tokenCAddress);
  console.log("");
  console.log("Pairs:");
  console.log("  USDT/DAI:", pairAB);
  console.log("  USDT/USDC:", pairAC);
  console.log("  DAI/WETH:", pairBW);
  console.log("====================================================\n");

  // 生成环境变量文件
  const envContent = `# DEX 合约地址 - 由 deploy.ts 自动生成
# 部署时间: ${new Date().toISOString()}
# 网络: ${networkName} (chainId: ${chainId})

# 核心合约
FACTORY_ADDRESS=${factoryAddress}
ROUTER_ADDRESS=${routerAddress}

# 代币合约
WETH_ADDRESS=${wethAddress}
USDT_ADDRESS=${tokenAAddress}
DAI_ADDRESS=${tokenBAddress}
USDC_ADDRESS=${tokenCAddress}

# 交易对合约
PAIR_USDT_DAI=${pairAB}
PAIR_USDT_USDC=${pairAC}
PAIR_DAI_WETH=${pairBW}

# 部署账户
DEPLOYER_ADDRESS=${deployer.address}
`;

  const fs = require("fs");
  const path = require("path");

  fs.writeFileSync(
    path.join(__dirname, "../.env.deployed"),
    envContent
  );
  console.log("✅ 合约地址已保存到 .env.deployed");

  // 同步更新配置文件
  console.log("\n📝 正在更新配置文件...");

  // 更新配置的辅助函数
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
        // 替换已存在的配置
        content = content.replace(regex, `${key}=${value}`);
        updated = true;
      } else {
        // 配置不存在，追加到文件末尾
        if (!content.endsWith('\n')) {
          content += '\n';
        }
        content += `${key}=${value}\n`;
        updated = true;
      }
    }

    if (updated) {
      fs.writeFileSync(filePath, content);
      return true;
    }
    return false;
  }

  // 更新前端配置
  const frontendEnvPath = path.join(__dirname, "../../frontend/web-app/.env");
  if (updateEnvFile(frontendEnvPath, {
    'VITE_FACTORY_ADDRESS': factoryAddress,
    'VITE_ROUTER_ADDRESS': routerAddress,
    'VITE_WETH_ADDRESS': wethAddress,
    'VITE_USDT_ADDRESS': tokenAAddress,
    'VITE_DAI_ADDRESS': tokenBAddress,
    'VITE_USDC_ADDRESS': tokenCAddress,
  })) {
    console.log("✅ 前端配置已更新 (frontend/web-app/.env)");
  }

  // 更新 Analytics Service 配置
  const analyticsEnvPath = path.join(__dirname, "../../backend/services/analytics-service/.env");
  if (updateEnvFile(analyticsEnvPath, {
    'DEX_FACTORY_ADDRESS': factoryAddress,
    'DEX_ROUTER_ADDRESS': routerAddress,
    'WETH_ADDRESS': wethAddress,
    'TRADING_PRIVATE_KEY': '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  })) {
    console.log("✅ Analytics Service 配置已更新");
  }

  // 更新 Wallet Service 配置 (如果存在)
  const walletEnvPath = path.join(__dirname, "../../backend/services/wallet-service/.env");
  if (fs.existsSync(walletEnvPath)) {
    if (updateEnvFile(walletEnvPath, {
      'WETH_ADDRESS': wethAddress,
    })) {
      console.log("✅ Wallet Service 配置已更新");
    }
  }

  console.log("\n🎊 部署完成！");

  if (networkName === 'sepolia') {
    console.log("\n📋 Sepolia 部署后续步骤:");
    console.log("1. 确保 MetaMask 已切换到 Sepolia 网络");
    console.log("2. 启动后端服务: cd backend && pnpm dev");
    console.log("3. 启动前端服务: cd frontend/web-app && pnpm dev");
    console.log("4. 从水龙头获取测试代币进行测试");
  } else {
    console.log("\n现在可以开始测试了。");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
