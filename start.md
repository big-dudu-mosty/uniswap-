# DEX 项目启动指南

> 完整的一站式启动指南，支持本地 Hardhat 开发和 Sepolia 测试网部署

---

## 前置要求

- Docker（运行 PostgreSQL 和 Redis）
- Node.js >= 18
- pnpm >= 8
- MetaMask 浏览器插件
- 各子项目依赖已安装（`pnpm install`）

---

## 服务端口总览

| 服务 | 端口 | 说明 |
|------|------|------|
| Hardhat 节点 | 8545 | 本地区块链（仅本地模式） |
| 前端应用 | 3000 | React 应用 |
| Analytics Service | 3002 | 后端 API + WebSocket |
| Wallet Service | 3001 | 钱包服务（可选） |
| PostgreSQL | 5432 | 数据库（Docker） |
| Redis | 6379 | 缓存（Docker） |

---

# 方式一：本地 Hardhat 开发

### Terminal 1: 启动 Docker 容器

```bash
cd backend
docker-compose up -d
```

验证：
```bash
docker-compose ps
# 应该看到 dex-postgres 和 dex-redis 都在运行
```

---

### Terminal 2: 启动 Hardhat 本地节点

```bash
cd contracts
npx hardhat node
```

预期输出：
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

> 保持此终端运行，不要关闭。

---

### Terminal 3: 部署智能合约

```bash
cd contracts

# 1. 部署核心合约（Factory、Router、测试代币、交易对）
npx hardhat run scripts/deploy.ts --network localhost

# 2. 部署 Farming 合约（可选，非 Uniswap V2 核心功能）
npx hardhat run scripts/deploy-farming.ts --network localhost

# 3. 部署 Price Oracle
npx hardhat run scripts/deploy-oracle.ts --network localhost

# 4. 铸造测试代币（USDT、DAI、USDC）
npx hardhat run scripts/mint-tokens.js --network localhost

# 5. 添加初始流动性
npx hardhat run scripts/add-liquidity.ts --network localhost
```

预期结果：
- 看到 "所有合约部署完成！"
- `contracts/.env.deployed` 文件已更新
- `frontend/web-app/.env` 和 `backend/services/analytics-service/.env` 自动更新合约地址

---

### Terminal 4: 启动后端服务

```bash
cd backend/services/analytics-service
pnpm run start:dev
```

预期输出：
```
Trading Service is running on: http://localhost:3002
[BlockchainListenerService] Event listener started
[EventsGateway] WebSocket Gateway initialized
```

> 保持此终端运行，不要关闭。

---

### Terminal 5: 同步池子数据

```bash
bash scripts/sync-all-pools.sh
```

预期结果：
```
同步完成！
成功: 6
失败: 0
```

---

### Terminal 6: 启动前端应用

```bash
cd frontend/web-app
pnpm run dev
```

预期输出：
```
VITE ready
  Local: http://localhost:3000/
```

> 保持此终端运行，不要关闭。

---

### 配置 MetaMask（本地）

#### 1. 添加 Hardhat Local 网络

在 MetaMask 中添加自定义网络：

| 配置项 | 值 |
|--------|-----|
| 网络名称 | Hardhat Local |
| RPC URL | http://127.0.0.1:8545 |
| Chain ID | 31337 |
| 货币符号 | ETH |

#### 2. 导入测试账户

使用 Hardhat 默认账户 #0 的私钥：

```
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

导入后：
- 地址：`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- 余额：约 10000 ETH

---

# 方式二：Sepolia 测试网部署

### 前置准备

1. **获取 Sepolia ETH** - 访问水龙头领取测试 ETH：
   - https://sepoliafaucet.com/
   - https://faucets.chain.link/sepolia

2. **准备 RPC URL** - 从 [Infura](https://infura.io/) 或 [Alchemy](https://alchemy.com/) 获取

3. **配置环境变量**

   `contracts/.env`：
   ```env
   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_API_KEY
   PRIVATE_KEY=your_wallet_private_key
   ```

   `frontend/web-app/.env`：
   ```env
   VITE_CHAIN_ID=11155111
   VITE_RPC_URL=https://sepolia.infura.io/v3/YOUR_API_KEY
   ```

   `backend/services/analytics-service/.env`：
   ```env
   BLOCKCHAIN_RPC_URL=https://sepolia.infura.io/v3/YOUR_API_KEY
   BLOCKCHAIN_RPC_WS_URL=wss://sepolia.infura.io/ws/v3/YOUR_API_KEY
   BLOCKCHAIN_CHAIN_ID=11155111
   ```

### 部署步骤

```bash
# 1. 启动 Docker
cd backend && docker-compose up -d

# 2. 部署合约到 Sepolia（较慢，每个合约需等待区块确认）
cd contracts
npx hardhat run scripts/deploy.ts --network sepolia
npx hardhat run scripts/deploy-farming.ts --network sepolia    # 可选
npx hardhat run scripts/deploy-oracle.ts --network sepolia     # 可选

# 3. 启动后端
cd backend/services/analytics-service && pnpm run start:dev

# 4. 同步池子
bash scripts/sync-all-pools.sh

# 5. 启动前端
cd frontend/web-app && pnpm run dev
```

### 配置 MetaMask（Sepolia）

- MetaMask 默认支持 Sepolia，直接在网络列表中切换即可
- 部署完成后，查看 `contracts/.env.deployed` 获取代币地址，在 MetaMask 中导入代币

---

## 环境切换

### 本地 → Sepolia

1. 修改 `frontend/web-app/.env`：`VITE_CHAIN_ID=11155111`
2. 修改 `backend/services/analytics-service/.env`：`BLOCKCHAIN_CHAIN_ID=11155111`
3. 重启前端和后端服务
4. MetaMask 切换到 Sepolia 网络

### Sepolia → 本地

1. 修改 `frontend/web-app/.env`：`VITE_CHAIN_ID=31337`
2. 修改 `backend/services/analytics-service/.env`：`BLOCKCHAIN_CHAIN_ID=31337`
3. 启动 Hardhat 节点并重新部署合约
4. MetaMask 切换到 Hardhat Local 网络

---

## 常见问题

### Q: Hardhat 节点重启后怎么办？

所有合约和链上数据都会丢失，需要重新部署：

```bash
cd contracts
npx hardhat run scripts/deploy.ts --network localhost
npx hardhat run scripts/deploy-farming.ts --network localhost
npx hardhat run scripts/deploy-oracle.ts --network localhost
npx hardhat run scripts/mint-tokens.js --network localhost
npx hardhat run scripts/add-liquidity.ts --network localhost

# 重启后端服务（或等待自动重连）
# 重新同步池子
bash scripts/sync-all-pools.sh

# MetaMask: 设置 → 高级 → 重置账户（清除 nonce 缓存）
```

### Q: Pool 页面没有数据？

运行同步脚本：`bash scripts/sync-all-pools.sh`

### Q: MetaMask 交易失败 "nonce too low"？

MetaMask → 设置 → 高级 → 重置账户

### Q: "Insufficient liquidity" 错误？

该交易对还没有流动性。本地环境执行：
```bash
cd contracts
npx hardhat run scripts/add-liquidity.ts --network localhost
```

---

## 停止所有服务

- 每个终端按 `Ctrl + C` 停止对应服务
- 停止 Docker：`cd backend && docker-compose down`

---

## 快速测试清单

- [ ] Docker 容器运行中（PostgreSQL + Redis）
- [ ] Hardhat 节点运行中（仅本地模式）
- [ ] 后端服务运行中（端口 3002）
- [ ] 前端服务运行中（端口 3000）
- [ ] MetaMask 已连接正确网络
- [ ] Pool 页面能看到交易对
- [ ] 能成功执行一笔 Swap 交易

---

**最后更新：** 2026-03-06
