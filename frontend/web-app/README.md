# DEX Web Application

基于 Uniswap V2 的去中心化交易所前端应用，部署在 Sepolia 测试网。

---

## 快速开始

### 前置条件

- Node.js >= 18
- pnpm >= 8
- MetaMask 浏览器插件（需切换到 Sepolia 测试网）

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
| Swap | `/swap` | 代币兑换，支持滑点设置和价格影响分析 |
| Pool | `/pool` | 查看所有流动性池列表（WebSocket 实时更新） |
| Pool Detail | `/pool/:id` | 池子详情（储备量、交易量、Swap/流动性历史） |
| Liquidity | `/liquidity` | 添加/移除流动性 |
| History | `/history` | Swap 和流动性操作历史记录 |
| Leaderboard | `/leaderboard` | 交易排行榜（按 Swap/流动性次数排名） |
| Portfolio | `/portfolio` | 用户资产总览、交易频率趋势图、交易对分布图 |
| Portfolio (他人) | `/portfolio/:address` | 查看其他用户的交易统计 |

---

## 项目结构

```
src/
├── components/          # 可复用组件
│   ├── Layout/         # 页面布局（导航栏）
│   ├── ConnectWallet/  # 钱包连接按钮
│   ├── ConfirmSwapModal/ # Swap 确认弹窗
│   ├── TokenSelect/    # 代币选择器
│   ├── SlippageSettings/ # 滑点设置
│   ├── PriceDisplay/   # 价格展示
│   └── PoolAnalyticsCard/ # 池子分析卡片
├── pages/              # 页面组件
│   ├── Swap/          # 代币兑换
│   ├── Pool/          # 流动性池列表
│   ├── PoolDetail/    # 池子详情
│   ├── Liquidity/     # 添加/移除流动性
│   ├── History/       # 交易历史
│   ├── Leaderboard/   # 交易排行榜
│   └── Portfolio/     # 资产管理 + 交易统计图表
├── hooks/              # 自定义 Hooks
│   ├── useSwap.ts     # Swap 交易逻辑
│   ├── useLiquidity.ts # 流动性操作逻辑
│   ├── useWallet.ts   # 钱包连接管理
│   ├── useWebSocket.ts # WebSocket 实时数据
│   └── usePriceOracle.ts # 代币价格查询
├── services/           # API 服务（与后端 Analytics Service 通信）
├── contracts/          # 合约 ABI（DEXRouter, ERC20）
├── config/             # 配置文件（合约地址、链配置、代币列表）
├── store/              # Zustand 全局状态
├── utils/              # 工具函数（格式化、时间处理）
└── types/              # TypeScript 类型定义
```

---

## 技术栈

| 类别 | 技术 |
|------|------|
| UI 框架 | React 18 |
| 类型安全 | TypeScript |
| 构建工具 | Vite |
| UI 组件库 | Ant Design |
| 图表 | Recharts |
| 状态管理 | Zustand |
| 数据请求 | @tanstack/react-query |
| 区块链交互 | Wagmi + Viem |
| HTTP 客户端 | Axios |
| 实时通信 | Socket.IO Client |
| 路由 | React Router v6 |

---

## 环境变量

`.env` 文件配置（合约地址由部署脚本自动生成）：

```env
# 网络配置
VITE_CHAIN_ID=11155111
VITE_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<YOUR_KEY>

# 后端 API
VITE_TRADING_SERVICE_URL=http://localhost:3002/api/v1

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
确保已安装 MetaMask 并切换到 Sepolia 测试网（Chain ID: 11155111）。

### Q: 页面无数据？
确保后端 Analytics Service 已启动（端口 3002）。后端通过区块链事件监听器自动同步链上数据。

### Q: 交易失败？
检查 Sepolia 测试网 ETH 余额是否充足，可通过水龙头获取测试 ETH。

---

**最后更新：** 2026-03-07
