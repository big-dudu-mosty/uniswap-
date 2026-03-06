# 测试脚本

本目录包含所有测试脚本和测试资源。

---

## 📁 目录结构

```
tests/
├── e2e/                    # 端到端测试
│   ├── test-e2e-full.sh   # 完整端到端测试脚本
│   └── test-websocket.html # WebSocket 测试页面
│
└── unit/                   # 单元/模块测试
    ├── test-api.sh         # Trading Service API 测试
    ├── test-swap.sh        # Swap Module 测试
    ├── test-liquidity.sh   # Liquidity Module 基础测试
    ├── test-liquidity-full.sh  # Liquidity Module 完整测试
    └── test-scanner.sh     # Block Scanner 测试
```

---

## 🚀 快速开始

### 端到端测试

完整的 DEX 交易流程测试：

```bash
cd tests/e2e
./test-e2e-full.sh
```

**测试内容**:
- 环境检查（Hardhat 节点、后端服务）
- Wallet Service 全功能测试
- Trading Service 全功能测试
- 完整交易流程：授权 → 添加流动性 → Swap → 移除流动性
- Block Scanner 数据同步
- 历史记录查询

**测试时间**: 约 3-5 分钟  
**前置条件**:
- Hardhat 节点运行中
- Wallet Service 运行中 (端口 3001)
- Trading Service 运行中 (端口 3002)

---

### 单元测试

#### 1. Trading Service API 测试

```bash
cd tests/unit
./test-api.sh
```

测试 Pool 和 Quote 模块的基础 API。

---

#### 2. Swap Module 测试

```bash
cd tests/unit
./test-swap.sh
```

**测试内容**:
- 代币授权检查和执行
- 精确输入交换 (Exact In)
- 精确输出交换 (Exact Out)
- 交易状态查询
- 交易历史查询

**测试用例**: 10 个

---

#### 3. Liquidity Module 基础测试

```bash
cd tests/unit
./test-liquidity.sh
```

快速测试流动性添加和移除功能。

---

#### 4. Liquidity Module 完整测试

```bash
cd tests/unit
./test-liquidity-full.sh
```

**测试内容**:
- 代币授权
- 添加流动性
- 查询用户头寸
- 移除流动性（50%）
- 验证流动性变化
- 流动性操作历史

**测试用例**: 15+ 个

---

#### 5. Block Scanner 测试

```bash
cd tests/unit
./test-scanner.sh
```

**测试内容**:
- 扫描器启动/停止
- 监控地址管理
- 交易自动导入
- 地址过滤功能
- 历史交易查询

---

### WebSocket 实时推送测试

```bash
# 在浏览器中打开
open tests/e2e/test-websocket.html
```

**测试内容**:
- WebSocket 连接
- 地址订阅/取消订阅
- 新交易实时通知
- 新区块实时通知
- 余额变化通知

---

## 📋 测试前准备

### 1. 启动 Hardhat 本地节点

```bash
cd contracts
npx hardhat node
```

保持此终端运行。

### 2. 启动 Wallet Service

```bash
cd backend/services/wallet-service
pnpm run start:dev
```

保持此终端运行。

### 3. 启动 Analytics Service

```bash
cd backend/services/analytics-service
pnpm run start:dev
```

保持此终端运行。

### 4. 部署合约（如果需要）

```bash
cd contracts
npx hardhat run scripts/deploy.ts --network localhost
```

---

## 🐛 故障排查

### 问题 1: 脚本没有执行权限

```bash
chmod +x tests/e2e/*.sh
chmod +x tests/unit/*.sh
```

### 问题 2: 服务未启动

检查服务状态：

```bash
# 检查端口占用
lsof -i :8545  # Hardhat
lsof -i :3001  # Wallet Service
lsof -i :3002  # Analytics Service
```

### 问题 3: 测试失败 - 合约未部署

重新部署合约：

```bash
cd contracts
rm .env.deployed
npx hardhat run scripts/deploy.ts --network localhost
```

### 问题 4: 数据库连接失败

检查 PostgreSQL 和 Redis：

```bash
# 检查 PostgreSQL
psql -U postgres -c "\l"

# 启动 PostgreSQL (如果需要)
brew services start postgresql@14

# 检查 Redis
redis-cli ping
```

---

## 📊 测试覆盖范围

### 智能合约
- ✅ Factory 合约（交易对创建）
- ✅ Pair 合约（AMM 核心逻辑）
- ✅ Router 合约（用户交互）
- ✅ ERC20 代币（USDT, DAI, USDC, WETH）

### Analytics Service
- Pool Module（交易对管理）
- Quote Module（价格查询）
- History Module（交易历史）
- Blockchain Listener（链上事件同步）

### Wallet Service
- ✅ Balance Module（余额查询）
- ✅ Token Module（代币管理）
- ✅ Address Module（地址管理）
- ✅ Transaction Module（交易记录）
- ✅ Block Scanner（区块扫描）
- ✅ WebSocket Push（实时推送）

### 集成测试
- ✅ 合约 ↔ Analytics Service
- ✅ Analytics Service ↔ Wallet Service
- ✅ Block Scanner ↔ WebSocket
- ✅ 端到端交易流程

---

**测试时间**: 约 10-15 分钟（全部测试）
**最后更新**: 2026-03-06

