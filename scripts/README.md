# 运维脚本

本目录包含项目运维和测试用的脚本。

---

## 脚本列表

### 核心脚本（常用）

| 脚本 | 说明 | 前置条件 |
|------|------|----------|
| `sync-all-pools.sh` | 从链上 Factory 读取所有交易对，同步到数据库 | Hardhat 节点 + 后端服务运行 |
| `test-analytics-api.sh` | 测试 Analytics 和 History API | 后端服务运行 |

### 代币管理

| 脚本 | 说明 | 前置条件 |
|------|------|----------|
| `mint-tokens-simple.sh` | 给默认账户 Mint USDT/DAI/USDC | Hardhat 节点运行 |
| `mint-test-tokens.sh` | Mint 测试代币 | Hardhat 节点运行 |
| `mint-usdc.sh` | 单独 Mint USDC | Hardhat 节点运行 |

### 池子管理

| 脚本 | 说明 | 前置条件 |
|------|------|----------|
| `sync-all-pools.js` | 同步池子（Node.js 版本） | 后端服务运行 |
| `sync-pools.sh` | 同步池子（旧版） | 后端服务运行 |
| `create-missing-pools.sh` | 创建缺失的池子 | Hardhat 节点 + 后端服务运行 |
| `create-eth-usdt-pair.sh` | 创建 ETH/USDT 交易对 | Hardhat 节点运行 |

### 测试脚本

| 脚本 | 说明 | 前置条件 |
|------|------|----------|
| `test-analytics-api.sh` | 测试 Analytics API | 后端服务运行 |
| `test-phase4-api.sh` | Phase 4 API 测试 | 后端服务运行 |
| `test-phase5-farming-api.sh` | Farming API 测试 | 后端服务运行 |
| `test-phase6-integration.sh` | 集成测试 | 全部服务运行 |

---

## 常用操作

### 部署后同步数据

```bash
# 确保后端服务已启动，然后执行：
bash scripts/sync-all-pools.sh
```

`sync-all-pools.sh` 会自动：
1. 检查 Analytics Service 和 Hardhat 节点是否运行
2. 从 Factory 合约读取所有交易对地址
3. 逐个调用后端 API 创建 Pool 记录
4. 刷新每个 Pool 的链上数据

### 测试 API

```bash
bash scripts/test-analytics-api.sh
```

---

## 注意事项

- 所有脚本默认连接 `localhost` 网络
- 运行前确保 Hardhat 节点和后端服务已启动
- 合约地址从 `contracts/.env.deployed` 自动读取
- Hardhat 节点重启后需要重新部署合约并重新同步

---

**最后更新：** 2026-03-06
