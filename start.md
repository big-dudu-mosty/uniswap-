# 🚀 DEX 项目启动指南

> 完整的一站式启动指南，支持本地开发和 Sepolia 测试网部署

---

## 📋 前置要求

确保已安装以下软件：

- ✅ **Docker** - 用于运行 PostgreSQL 和 Redis
- ✅ **Node.js** >= 18
- ✅ **pnpm** >= 8
- ✅ **MetaMask** 浏览器插件
- ✅ **所有依赖已安装** (pnpm install)

---

## 🔀 选择部署环境

| 环境 | 说明 | 适用场景 |
|------|------|----------|
| **本地 Hardhat** | 本地区块链节点，交易即时确认 | 开发调试 |
| **Sepolia 测试网** | 以太坊测试网，真实网络环境 | 测试、演示 |

---

# 🏠 方式一：本地 Hardhat 开发

### **Terminal 1: 启动 Docker 容器**

```bash
cd /home/su/dome/school/full-stack-DEX/backend
docker-compose up -d
```

**验证：**
```bash
docker-compose ps
# 应该看到 dex-postgres 和 dex-redis 都在运行
```

---

### **Terminal 2: 启动 Hardhat 本地节点**

```bash
cd /home/su/dome/school/full-stack-DEX/contracts
npx hardhat node
```

**预期输出：**
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
...
```

**⚠️ 保持这个终端运行！不要关闭！**

---

### **Terminal 3: 部署智能合约**

```bash
cd /home/su/dome/school/full-stack-DEX/contracts

# 1. 部署核心合约
npx hardhat run scripts/deploy.ts --network localhost

# 2. 部署 Farming 合约
npx hardhat run scripts/deploy-farming.ts --network localhost

# 3. 部署 Price Oracle
npx hardhat run scripts/deploy-oracle.ts --network localhost

# 4. Mint 测试代币
npx hardhat run scripts/mint-tokens.js --network localhost

# 5. 添加流动性（可选，如果想测试有流动性的池子）
npx hardhat run scripts/add-liquidity.ts --network localhost
```

**预期结果：**
- ✅ 看到 "🎉 所有合约部署完成！"
- ✅ `contracts/.env.deployed` 文件已更新
- ✅ 前端和后端配置自动更新

---

### **Terminal 4: 启动后端服务**

```bash
cd /home/su/dome/school/full-stack-DEX/backend/services/analytics-service
pnpm run start:dev
```

**预期输出：**
```
🚀 Trading Service is running on: http://localhost:3002
📚 API Documentation: http://localhost:3002/api/docs
[BlockchainListenerService] ✅ Event listener started
[EventsGateway] 🔌 WebSocket Gateway initialized
```

**⚠️ 保持这个终端运行！不要关闭！**

---

### **Terminal 5: 同步池子数据**

```bash
cd /home/su/dome/school/full-stack-DEX
bash scripts/sync-all-pools.sh
```

**预期结果：**
```
✅ 成功: 3
❌ 失败: 3
```
（3个成功就足够了，失败的交易对是因为链上不存在）

---

### **Terminal 6: 启动前端应用**

```bash
cd /home/su/dome/school/full-stack-DEX/frontend/web-app
pnpm run dev
```

**预期输出：**
```
VITE v5.0.8  ready in XXX ms
➜  Local:   http://localhost:3000/
```

**⚠️ 保持这个终端运行！不要关闭！**

---

### **配置 MetaMask (本地)**

#### 1. 添加 Hardhat Local 网络

在 MetaMask 中添加自定义网络：

```
网络名称：  Hardhat Local
RPC URL：  http://127.0.0.1:8545
Chain ID： 31337
货币符号：  ETH
```

#### 2. 导入测试账户

使用以下私钥导入账户：

```
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

导入后会看到：
- 地址：`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- 余额：10000 ETH

---

# 🌐 方式二：Sepolia 测试网部署

### **前置准备**

1. **获取 Sepolia ETH**
   - 访问水龙头: https://sepoliafaucet.com/ 或 https://faucets.chain.link/sepolia
   - 领取测试 ETH (用于支付 Gas)

2. **准备 RPC URL**
   - Infura: https://infura.io/
   - Alchemy: https://alchemy.com/

3. **配置环境变量**

   编辑 `contracts/.env`:
   ```env
   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_API_KEY
   PRIVATE_KEY=your_wallet_private_key
   ```

   编辑 `frontend/web-app/.env`:
   ```env
   VITE_CHAIN_ID=11155111
   VITE_RPC_URL=https://sepolia.infura.io/v3/YOUR_API_KEY
   ```

   编辑 `backend/services/analytics-service/.env`:
   ```env
   BLOCKCHAIN_RPC_URL=https://sepolia.infura.io/v3/YOUR_API_KEY
   BLOCKCHAIN_RPC_WS_URL=wss://sepolia.infura.io/ws/v3/YOUR_API_KEY
   BLOCKCHAIN_CHAIN_ID=11155111
   ```

---

### **Terminal 1: 启动 Docker 容器**

```bash
cd /home/su/dome/school/full-stack-DEX/backend
docker-compose up -d
```

---

### **Terminal 2: 部署合约到 Sepolia**

```bash
cd /home/su/dome/school/full-stack-DEX/contracts

# 部署核心合约 (会自动更新前端和后端配置)
npx hardhat run scripts/deploy.ts --network sepolia

# 部署 Farming 合约 (可选)
npx hardhat run scripts/deploy-farming.ts --network sepolia

# 部署 Price Oracle (可选)
npx hardhat run scripts/deploy-oracle.ts --network sepolia
```

**⚠️ Sepolia 部署较慢，每个合约需要等待区块确认（约 12-24 秒）**

**预期结果：**
- ✅ 看到 "🎉 所有合约部署完成！"
- ✅ 显示所有合约地址
- ✅ 前端和后端配置自动更新

---

### **Terminal 3: 启动后端服务**

```bash
cd /home/su/dome/school/full-stack-DEX/backend/services/analytics-service
pnpm run start:dev
```

---

### **Terminal 4: 同步池子数据**

```bash
cd /home/su/dome/school/full-stack-DEX
bash scripts/sync-all-pools.sh
```

---

### **Terminal 5: 启动前端应用**

```bash
cd /home/su/dome/school/full-stack-DEX/frontend/web-app
pnpm run dev
```

---

### **配置 MetaMask (Sepolia)**

#### 1. 切换到 Sepolia 网络

MetaMask 默认支持 Sepolia，直接切换即可：
- 点击网络下拉菜单
- 选择 "Sepolia 测试网络"

#### 2. 添加测试代币

部署完成后，在 MetaMask 中导入代币：
- 查看 `contracts/.env.deployed` 获取代币地址
- MetaMask → 导入代币 → 输入合约地址

---

## 📊 服务端口总览

| 服务 | 端口 | 访问地址 | 状态 |
|------|------|---------|------|
| **Hardhat 节点** | 8545 | http://localhost:8545 | 🟢 仅本地模式 |
| **后端 API** | 3002 | http://localhost:3002 | 🟢 必须运行 |
| **API 文档** | 3002 | http://localhost:3002/api/docs | 📚 可访问 |
| **前端应用** | 3000 | http://localhost:3000 | 🟢 必须运行 |
| **PostgreSQL** | 5432 | - | 🟢 Docker |
| **Redis** | 6379 | - | 🟢 Docker |

---

## 🔄 环境切换

### 从本地切换到 Sepolia

1. 修改 `frontend/web-app/.env`:
   ```env
   VITE_CHAIN_ID=11155111
   ```

2. 修改 `backend/services/analytics-service/.env`:
   ```env
   BLOCKCHAIN_CHAIN_ID=11155111
   ```

3. 重启前端和后端服务

4. MetaMask 切换到 Sepolia 网络

### 从 Sepolia 切换到本地

1. 修改 `frontend/web-app/.env`:
   ```env
   VITE_CHAIN_ID=31337
   ```

2. 修改 `backend/services/analytics-service/.env`:
   ```env
   BLOCKCHAIN_CHAIN_ID=31337
   ```

3. 启动 Hardhat 节点并重新部署

4. MetaMask 切换到 Hardhat Local 网络

---

## 🔧 常见问题

### Q1: Hardhat 节点重启后怎么办？

**A:** 所有合约和数据都会丢失，需要重新部署：

```bash
# Terminal 3: 重新执行部署步骤
cd /home/su/dome/school/full-stack-DEX/contracts
npx hardhat run scripts/deploy.ts --network localhost
npx hardhat run scripts/deploy-farming.ts --network localhost
npx hardhat run scripts/deploy-oracle.ts --network localhost
npx hardhat run scripts/mint-tokens.js --network localhost

# Terminal 5: 重新同步数据
cd /home/su/dome/school/full-stack-DEX
bash scripts/sync-all-pools.sh

# MetaMask: 重置账户
# 设置 → 高级 → 重置账户（清除 nonce）
```

---

### Q2: Sepolia 部署失败 "insufficient funds"？

**A:** 钱包没有足够的 Sepolia ETH：
1. 访问水龙头获取测试 ETH
2. 确认钱包地址正确
3. 等待 ETH 到账后重试

---

### Q3: Sepolia 交易一直 pending？

**A:** Sepolia 网络拥堵或 Gas 设置过低：
1. 等待几分钟
2. 在 MetaMask 中加速交易
3. 或取消后重试

---

### Q4: Pool 页面没有数据？

**A:** 运行同步脚本：

```bash
cd /home/su/dome/school/full-stack-DEX
bash scripts/sync-all-pools.sh
```

---

### Q5: MetaMask 交易失败 "nonce too low"？

**A:** 重置 MetaMask 账户：

MetaMask → 设置 → 高级 → 重置账户

---

### Q6: "Insufficient liquidity" 错误？

**A:** 该交易对还没有流动性。解决方法：

1. **本地环境：**
   ```bash
   cd contracts
   npx hardhat run scripts/add-liquidity.ts --network localhost
   ```

2. **Sepolia 环境：** 手动在前端添加流动性

---

## 🛑 停止所有服务

### 方法 1: 逐个停止

在每个终端按 `Ctrl + C`

### 方法 2: 停止 Docker

```bash
cd /home/su/dome/school/full-stack-DEX/backend
docker-compose down
```

---

## 📚 相关文档

- [contracts/.env.deployed](./contracts/.env.deployed) - 合约地址
- [API 文档](http://localhost:3002/api/docs) - 后端 API 文档

---

## 🎉 完成！

**快速测试清单：**
- [ ] Docker 容器运行中
- [ ] 后端服务运行中（端口 3002）
- [ ] 前端服务运行中（端口 3000）
- [ ] MetaMask 已配置并连接正确网络
- [ ] Pool 页面能看到交易对
- [ ] Swap 页面能看到代币余额
- [ ] 能成功执行一笔 Swap 交易

---

**最后更新：** 2026-01-22
**维护者：** DEX Team
