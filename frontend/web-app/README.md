# DEX Web Application

基于 React + TypeScript + Vite 构建的去中心化交易所前端应用。

---

## 快速开始

### 前置条件

- Node.js >= 18
- pnpm >= 8
- MetaMask 浏览器插件

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

应用将在 http://localhost:3000 启动。

---

## 功能页面

| 页面 | 路径 | 说明 |
|------|------|------|
| Swap | `/swap` | 代币兑换，支持滑点保护 |
| Pool | `/pool` | 查看所有流动性池列表 |
| Pool Detail | `/pool/:id` | 池子详情（储备量、交易量、历史记录） |
| Liquidity | `/liquidity` | 添加/移除流动性 |
| History | `/history` | Swap 和流动性操作历史 |
| Portfolio | `/portfolio` | 用户资产和 LP 持仓 |
| Farms | `/farms` | 流动性挖矿列表（扩展功能） |
| Farm Detail | `/farms/:id` | 矿池详情和质押操作 |

---

## 项目结构

```
src/
├── components/          # 可复用组件
│   ├── Layout/         # 页面布局（导航栏、侧边栏）
│   └── ConnectWallet/  # 钱包连接按钮
├── pages/              # 页面组件
│   ├── Swap/          # 代币兑换
│   ├── Pool/          # 流动性池列表
│   ├── PoolDetail/    # 池子详情
│   ├── Liquidity/     # 添加/移除流动性
│   ├── History/       # 交易历史
│   ├── Portfolio/     # 资产管理
│   ├── Farms/         # 挖矿列表
│   ├── FarmDetail/    # 矿池详情
│   └── MyFarms/       # 我的挖矿
├── hooks/              # 自定义 Hooks（useSwap, useLiquidity, useFarming 等）
├── services/           # API 服务（与后端通信）
├── utils/              # 工具函数
├── types/              # TypeScript 类型定义
└── config/             # 配置文件（合约地址、链配置）
```

---

## 技术栈

| 类别 | 技术 |
|------|------|
| UI 框架 | React 18 |
| 类型安全 | TypeScript |
| 构建工具 | Vite |
| UI 组件库 | Ant Design |
| 状态管理 | Zustand |
| 数据请求 | @tanstack/react-query |
| 区块链交互 | Wagmi + Viem |
| HTTP 客户端 | Axios |
| 实时通信 | Socket.IO Client |
| 路由 | React Router v6 |

---

## 环境变量

`.env` 文件由合约部署脚本自动生成和更新。如需手动创建：

```env
VITE_TRADING_SERVICE_URL=http://localhost:3002/api/v1
VITE_WALLET_SERVICE_URL=http://localhost:3001/api/v1
VITE_CHAIN_ID=31337
VITE_RPC_URL=http://127.0.0.1:8545

# 合约地址（部署脚本自动填充）
VITE_FACTORY_ADDRESS=0x...
VITE_ROUTER_ADDRESS=0x...
VITE_WETH_ADDRESS=0x...
VITE_USDT_ADDRESS=0x...
VITE_DAI_ADDRESS=0x...
VITE_USDC_ADDRESS=0x...
```

---

## 开发命令

```bash
# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 预览生产版本
pnpm preview
```

---

## 常见问题

### Q: 钱包连接失败？
确保已安装 MetaMask 并切换到正确网络（本地开发：Hardhat Local, Chain ID 31337）。

### Q: 页面无数据？
确保后端 Analytics Service 已启动（端口 3002），并已运行 `bash scripts/sync-all-pools.sh` 同步池子数据。

### Q: 交易失败 "nonce too low"？
Hardhat 节点重启后需要在 MetaMask 中重置账户：设置 → 高级 → 重置账户。

---

**最后更新：** 2026-03-06
