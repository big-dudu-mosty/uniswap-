# 🚀 DEX 项目启动指南

> 完整的一站式启动指南，5个终端窗口快速启动整个 DEX 系统

---

## 📋 前置要求

确保已安装以下软件：

- ✅ **Docker** - 用于运行 PostgreSQL 和 Redis
- ✅ **Node.js** >= 18
- ✅ **pnpm** >= 8
- ✅ **MetaMask** 浏览器插件
- ✅ **所有依赖已安装** (pnpm install)

---

## 🎬 启动步骤

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

## 🦊 配置 MetaMask

### 1. 添加 Hardhat Local 网络

在 MetaMask 中添加自定义网络：

```
网络名称：  Hardhat Local
RPC URL：  http://127.0.0.1:8545
Chain ID： 31337
货币符号：  ETH
```

### 2. 导入测试账户

使用以下私钥导入账户：

```
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

导入后会看到：
- 地址：`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- 余额：10000 ETH

### 3. 添加测试代币（可选）

在 MetaMask 中手动添加代币：

**USDT:**
```
0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

**DAI:**
```
0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
```

**USDC:**
```
0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
```

---

## ✅ 验证系统

### 1. 访问前端

浏览器打开：http://localhost:3000

### 2. 连接钱包

点击右上角「连接钱包」→ 选择 MetaMask → 连接

### 3. 查看 Pool 页面

访问：http://localhost:3000/pool

应该看到 3 个交易对：
- USDT/DAI
- USDT/USDC
- DAI/WETH

### 4. 测试 Swap

访问：http://localhost:3000/swap

1. 选择代币对（如 USDT → DAI）
2. 输入金额（如 100）
3. 看到预期输出
4. 点击「授权」→ MetaMask 签名
5. 点击「Swap」→ MetaMask 签名
6. 等待交易确认

---

## 📊 服务端口总览

| 服务 | 端口 | 访问地址 | 状态 |
|------|------|---------|------|
| **Hardhat 节点** | 8545 | http://localhost:8545 | 🟢 必须运行 |
| **后端 API** | 3002 | http://localhost:3002 | 🟢 必须运行 |
| **API 文档** | 3002 | http://localhost:3002/api/docs | 📚 可访问 |
| **前端应用** | 3000 | http://localhost:3000 | 🟢 必须运行 |
| **PostgreSQL** | 5432 | - | 🟢 Docker |
| **Redis** | 6379 | - | 🟢 Docker |

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

### Q2: Pool 页面没有数据？

**A:** 运行同步脚本：

```bash
cd /home/su/dome/school/full-stack-DEX
bash scripts/sync-all-pools.sh
```

---

### Q3: 前端看不到代币余额？

**A:** 检查以下配置：

1. **确认 .env 文件存在：**
   ```bash
   cat /home/su/dome/school/full-stack-DEX/frontend/web-app/.env
   ```

2. **确认合约地址正确**

3. **重启前端服务：**
   ```bash
   # Terminal 6: Ctrl + C 停止
   pnpm run dev  # 重新启动
   ```

---

### Q4: 后端报错 "connect EADDRNOTAVAIL"？

**A:** 检查 Vite 代理配置：

确认 `frontend/web-app/vite.config.ts` 中：
```typescript
proxy: {
  '/api/v1': {
    target: 'http://localhost:3002',  // 应该是 3002 不是 3001
    changeOrigin: true,
  },
}
```

---

### Q5: MetaMask 交易失败 "nonce too low"？

**A:** 重置 MetaMask 账户：

MetaMask → 设置 → 高级 → 重置账户

---

### Q6: "Insufficient liquidity" 错误？

**A:** 该交易对还没有流动性。解决方法：

1. **添加流动性：**
   ```bash
   cd contracts
   npx hardhat run scripts/add-liquidity.ts --network localhost
   ```

2. **或者选择已有流动性的交易对进行测试**

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

## 💡 开发建议

### 1. 使用多终端管理工具

推荐使用 `tmux` 或 `screen` 管理多个终端窗口。

### 2. 保存 Hardhat 账户信息

将测试账户的私钥保存好，方便每次导入 MetaMask。

### 3. 检查日志

- **后端日志：** Terminal 4
- **前端日志：** Terminal 6
- **合约日志：** Terminal 2

### 4. 定期清理

Hardhat 节点数据存在内存中，重启后会清空，无需手动清理。

---

## 📚 相关文档

- [ARCHITECTURE.md](./ARCHITECTURE.md) - 架构说明
- [README.md](./README.md) - 项目概览
- [contracts/.env.deployed](./contracts/.env.deployed) - 合约地址
- [API 文档](http://localhost:3002/api/docs) - 后端 API 文档

---

## 🎉 完成！

现在你的 DEX 项目已经完全运行起来了！

**快速测试清单：**
- [ ] Docker 容器运行中
- [ ] Hardhat 节点运行中
- [ ] 后端服务运行中（端口 3002）
- [ ] 前端服务运行中（端口 3000）
- [ ] MetaMask 已配置并连接
- [ ] Pool 页面能看到 3 个交易对
- [ ] Swap 页面能看到代币余额
- [ ] 能成功执行一笔 Swap 交易

---

**最后更新：** 2026-01-15
**维护者：** DEX Team

---

**有问题？**
1. 查看本文档的「常见问题」部分
2. 检查终端日志输出
3. 确认所有服务正常运行
