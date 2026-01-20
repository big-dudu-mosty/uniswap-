# Full-Stack DEX Project Specification

> **文档类型**：项目总体规范（Project Specification）
> **版本**：v1.0
> **最后更新**：2026-01-15

---

## I. 项目概述

### 1.1 项目定位
构建一个**生产级、去中心化的交易所（DEX）**，基于 Uniswap V2 自动化做市商（AMM）模型，实现无需中心化托管的代币交易、流动性提供和收益耕作（Yield Farming）功能。

### 1.2 核心价值主张
- **真正的去中心化**：用户完全掌控私钥和资产，无需信任第三方
- **自动化做市**：通过恒定乘积公式（x × y = k）实现自动定价
- **公平透明**：所有交易逻辑在链上公开可验证
- **流动性激励**：通过流动性挖矿奖励流动性提供者

### 1.3 目标用户
- **交易者**：需要去中心化交易 ERC20 代币的用户
- **流动性提供者（LP）**：希望通过提供流动性赚取手续费的用户
- **收益农民**：追求额外挖矿奖励的 LP 用户
- **开发者**：需要集成 DEX 功能的 DApp 开发者

---

## II. 功能需求规范

### 2.1 核心功能

#### F1: 代币兑换（Swap）
**优先级**：P0（必须）

**用户故事**：
作为交易者，我希望能够将一种 ERC20 代币兑换为另一种，以便完成去中心化交易。

**功能需求**：
- **MUST**：
  - [ ] 支持任意 ERC20 代币对的兑换
  - [ ] 自动计算预期输出量（基于 AMM 公式）
  - [ ] 支持滑点保护（用户可设置最大滑点）
  - [ ] 支持"精确输入"和"精确输出"两种模式
  - [ ] 显示价格影响和流动性提供者手续费（0.3%）
  - [ ] 支持截止时间设置（防止交易长时间挂起）

- **SHOULD**：
  - [ ] 支持多跳路由（A → B → C）
  - [ ] 显示价格趋势图表

- **MAY**：
  - [ ] 支持限价单
  - [ ] 支持 Gas 费估算

**验收标准**：
1. Given 用户连接钱包且选择 TokenA → TokenB，When 输入 100 TokenA，Then 显示预期输出量（基于当前储备量计算）
2. Given 用户设置滑点 0.5%，When 实际价格超过滑点，Then 交易应回滚并提示用户
3. Given 用户授权后点击"兑换"，When 交易提交，Then MetaMask 弹出签名请求
4. Given 交易成功，When 确认后，Then 用户余额更新且显示交易哈希

**安全考量**：
- 前端必须检查授权额度，不足时请求授权
- 必须验证滑点参数合法性（0-100%）
- 必须设置合理的截止时间（建议 20 分钟）
- 防止重入攻击（智能合约层面）

---

#### F2: 流动性管理（Liquidity）
**优先级**：P0（必须）

**用户故事**：
作为流动性提供者，我希望能够添加/移除流动性，以便赚取交易手续费。

**功能需求**：
- **MUST**：
  - [ ] 支持添加流动性（存入等值的两种代币）
  - [ ] 支持移除流动性（赎回 LP 代币获得底层资产）
  - [ ] 显示当前池子的储备量和 LP 代币总量
  - [ ] 显示用户在池子中的份额占比
  - [ ] 显示预期获得的 LP 代币数量
  - [ ] 支持部分移除流动性

- **SHOULD**：
  - [ ] 显示历史收益率（APR/APY）
  - [ ] 显示无常损失估算

- **MAY**：
  - [ ] 支持单边添加流动性（Zap）

**验收标准**：
1. Given 用户选择 TokenA/TokenB 池子，When 输入 TokenA 数量，Then 自动计算需要的 TokenB 数量（保持当前价格比例）
2. Given 用户添加流动性，When 交易成功，Then 用户收到 LP 代币且显示在余额中
3. Given 用户持有 LP 代币，When 选择移除 50%，Then 按比例赎回两种代币

**安全考量**：
- 必须检查两种代币的授权
- 防止添加流动性时的抢跑攻击（设置最小 LP 代币数量）
- 移除流动性时必须设置最小赎回量（防止三明治攻击）

---

#### F3: 流动性挖矿（Farming）
**优先级**：P1（重要）

**用户故事**：
作为流动性提供者，我希望通过质押 LP 代币赚取额外的代币奖励。

**功能需求**：
- **MUST**：
  - [ ] 支持质押 LP 代币到指定矿池
  - [ ] 实时显示待领取的奖励
  - [ ] 支持领取奖励（Harvest）
  - [ ] 支持取消质押（Withdraw）
  - [ ] 显示矿池的年化收益率（APR）
  - [ ] 显示总锁仓价值（TVL）

- **SHOULD**：
  - [ ] 支持自动复投（Auto-compound）
  - [ ] 显示用户历史收益

**验收标准**：
1. Given 用户持有 LP 代币，When 点击质押，Then LP 代币转入 MasterChef 合约
2. Given 用户已质押，When 时间流逝，Then 待领取奖励数量实时增加
3. Given 用户点击 Harvest，When 交易成功，Then 奖励代币转入用户钱包

**安全考量**：
- 防止奖励计算溢出
- 防止紧急提款时奖励丢失
- 检查矿池是否激活

---

#### F4: 价格预言机（Price Oracle）
**优先级**：P1（重要）

**用户故事**：
作为 DApp 开发者或用户，我希望能够获取可信的代币价格信息，用于计算资产价值。

**功能需求**：
- **MUST**：
  - [ ] 支持获取代币对的当前价格
  - [ ] 支持时间加权平均价格（TWAP）
  - [ ] 集成 Chainlink 喂价（主流代币）
  - [ ] 回退到 DEX 内部价格（长尾代币）

- **SHOULD**：
  - [ ] 支持历史价格查询
  - [ ] 支持价格趋势分析

**验收标准**：
1. Given 请求 ETH/USDT 价格，When 调用 Price Oracle，Then 返回准确的价格（误差 < 1%）
2. Given Chainlink 喂价可用，When 查询主流代币，Then 优先使用 Chainlink 数据

**安全考量**：
- 防止价格操纵攻击（使用 TWAP）
- 检查 Chainlink 数据新鲜度
- 设置合理的价格偏差阈值

---

### 2.2 辅助功能

#### F5: 交易历史（History）
**优先级**：P2（一般）

**功能需求**：
- [ ] 显示用户的兑换历史
- [ ] 显示用户的流动性操作历史
- [ ] 支持按时间筛选
- [ ] 支持导出 CSV

**验收标准**：
1. Given 用户完成兑换，When 打开历史页面，Then 显示该笔交易记录

---

#### F6: 用户资产组合（Portfolio）
**优先级**：P2（一般）

**功能需求**：
- [ ] 显示用户的代币余额
- [ ] 显示用户的 LP 代币持仓
- [ ] 显示用户在各矿池的质押情况
- [ ] 显示总资产价值（USD）

**验收标准**：
1. Given 用户连接钱包，When 打开资产页面，Then 显示所有持仓信息

---

#### F7: 池子分析（Pool Analytics）
**优先级**：P2（一般）

**功能需求**：
- [ ] 显示所有交易对列表
- [ ] 显示每个池子的 TVL、24h 交易量、手续费收入
- [ ] 支持按 TVL/交易量排序
- [ ] 显示池子详细信息（储备量、价格走势）

**验收标准**：
1. Given 打开池子列表，When 页面加载，Then 显示所有活跃池子及其关键指标

---

## III. 非功能性需求

### 3.1 性能要求
- **页面加载时间**：首次加载 < 3 秒，后续导航 < 1 秒
- **交易确认时间**：取决于区块链网络（本地测试网 ~1 秒）
- **API 响应时间**：95% 请求 < 500ms
- **实时数据延迟**：WebSocket 推送延迟 < 2 秒

### 3.2 安全要求
- **私钥管理**：前端永远不存储、传输私钥，所有交易通过 MetaMask 签名
- **智能合约安全**：
  - 防止重入攻击（使用 ReentrancyGuard）
  - 防止整数溢出（Solidity 0.8+ 内置检查）
  - 防止授权漏洞（检查 allowance）
  - 防止价格操纵（使用 TWAP）
- **后端安全**：
  - 所有 API 输入使用 class-validator 校验
  - 使用参数化查询防止 SQL 注入
  - 敏感信息通过环境变量管理
  - 实施速率限制防止 DDoS

### 3.3 兼容性要求
- **浏览器**：Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **钱包**：MetaMask（优先支持），WalletConnect（可选）
- **区块链**：兼容 EVM 的任何链（Ethereum, BSC, Polygon, Hardhat 本地网络）
- **屏幕尺寸**：支持桌面端（1920x1080）和移动端（375x667）响应式设计

### 3.4 可用性要求
- **用户体验**：
  - 交易流程不超过 3 步（连接钱包 → 授权 → 确认）
  - 所有操作提供实时反馈（加载状态、进度提示）
  - 错误信息清晰易懂（避免技术术语）
- **国际化**：优先支持英文，预留中文支持接口

### 3.5 可扩展性要求
- **后端架构**：支持水平扩展（无状态设计）
- **数据库**：支持读写分离和分片
- **缓存策略**：使用 Redis 缓存热点数据，TTL < 60 秒

### 3.6 可维护性要求
- **代码质量**：遵循 `constitution.md` 规范
- **测试覆盖率**：核心业务逻辑 > 80%
- **文档完整性**：所有公开 API 必须有 Swagger 文档
- **日志规范**：关键操作必须记录详细日志（时间、用户、操作、结果）

---

## IV. 架构约束

### 4.1 技术栈限制
| 层级 | 必须使用 | 禁止使用 |
|------|---------|---------|
| 智能合约 | Solidity 0.8.20+, OpenZeppelin | Solidity < 0.6, 自定义 SafeMath |
| 后端 | NestJS, TypeORM, PostgreSQL, Redis | Express 裸框架, MongoDB |
| 前端 | React 18+, TypeScript, Wagmi, Viem | JavaScript, Web3.js, Ethers.js v5 |
| 构建工具 | Hardhat, Vite | Truffle, Webpack |

### 4.2 架构模式
- **智能合约**：遵循 Uniswap V2 核心模式（Factory-Pair-Router）
- **后端**：模块化架构（NestJS Modules），每个功能独立模块
- **前端**：组件化设计（React），Hooks 封装业务逻辑
- **数据流**：
  - 写操作：前端 → MetaMask → 区块链
  - 读操作：前端 → 后端 API → 缓存/数据库 → 区块链（如缓存未命中）

### 4.3 去中心化约束
- **私钥管理**：前端永远不存储私钥
- **交易执行**：后端不执行任何链上交易
- **数据来源**：后端数据仅用于展示和分析，不作为交易依据（交易依据来自智能合约状态）

---

## V. 数据模型规范

### 5.1 核心实体

#### DEXPair（交易对）
```solidity
struct Pair {
  address token0;          // 代币0地址
  address token1;          // 代币1地址
  uint112 reserve0;        // 代币0储备量
  uint112 reserve1;        // 代币1储备量
  uint32  blockTimestampLast;  // 上次更新时间
  uint256 price0CumulativeLast; // 价格累计（用于 TWAP）
  uint256 price1CumulativeLast;
  uint256 kLast;           // 上次 k 值（用于协议费）
  uint256 totalSupply;     // LP 代币总供应量
}
```

#### Pool（池子信息 - 后端）
```typescript
interface Pool {
  id: string;                   // 池子唯一ID
  pairAddress: string;          // 合约地址
  token0: Token;                // 代币0信息
  token1: Token;                // 代币1信息
  reserve0: string;             // 储备量0 (BigNumber 字符串)
  reserve1: string;             // 储备量1
  totalSupply: string;          // LP 代币总量
  tvl: number;                  // 总锁仓价值（USD）
  volume24h: number;            // 24小时交易量（USD）
  fee24h: number;               // 24小时手续费（USD）
  apr: number;                  // 年化收益率
  createdAt: Date;              // 创建时间
  updatedAt: Date;              // 更新时间
}
```

#### SwapHistory（兑换历史）
```typescript
interface SwapHistory {
  id: string;
  transactionHash: string;
  userAddress: string;
  pairAddress: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  timestamp: Date;
}
```

#### Farm（矿池）
```typescript
interface Farm {
  poolId: number;               // 矿池ID
  lpToken: string;              // LP 代币地址
  allocPoint: number;           // 分配点数
  lastRewardBlock: number;      // 上次奖励区块
  accRewardPerShare: string;    // 累计每股奖励
  totalStaked: string;          // 总质押量
  apr: number;                  // 年化收益率
}
```

---

## VI. API 接口规范

### 6.1 后端 REST API

#### Pool APIs
```
GET    /api/pool                    # 获取所有池子
GET    /api/pool/:id                # 获取单个池子详情
POST   /api/pool/:id/refresh        # 强制刷新池子数据
```

#### Quote APIs
```
POST   /api/quote                   # 获取价格报价（精确输入）
POST   /api/quote/exact-out         # 获取价格报价（精确输出）
```

#### History APIs
```
GET    /api/history/swaps           # 获取兑换历史（可按用户过滤）
GET    /api/history/liquidity       # 获取流动性操作历史
GET    /api/history/user/:address/recent  # 获取用户最近活动
```

#### Analytics APIs
```
GET    /api/analytics/overview      # 获取全局统计数据
GET    /api/analytics/pool/:id      # 获取池子分析数据
GET    /api/analytics/user/:address # 获取用户统计数据
```

#### Farming APIs
```
GET    /api/farming/farms           # 获取所有矿池
GET    /api/farming/user/:address   # 获取用户质押信息
```

#### Price APIs
```
GET    /api/price/:token            # 获取代币价格（USD）
GET    /api/price/pair/:token0/:token1  # 获取交易对价格
```

### 6.2 智能合约接口

#### DEXRouter
```solidity
function swapExactTokensForTokens(
  uint amountIn,
  uint amountOutMin,
  address[] calldata path,
  address to,
  uint deadline
) external returns (uint[] memory amounts);

function addLiquidity(
  address tokenA,
  address tokenB,
  uint amountADesired,
  uint amountBDesired,
  uint amountAMin,
  uint amountBMin,
  address to,
  uint deadline
) external returns (uint amountA, uint amountB, uint liquidity);

function removeLiquidity(
  address tokenA,
  address tokenB,
  uint liquidity,
  uint amountAMin,
  uint amountBMin,
  address to,
  uint deadline
) external returns (uint amountA, uint amountB);
```

#### MasterChef
```solidity
function deposit(uint256 poolId, uint256 amount) external;
function withdraw(uint256 poolId, uint256 amount) external;
function harvest(uint256 poolId) external;
function pendingReward(uint256 poolId, address user) external view returns (uint256);
```

---

## VII. 测试规范

### 7.1 测试覆盖要求
- **智能合约**：核心函数必须有单元测试，覆盖率 > 90%
- **后端服务**：业务逻辑层必须有单元测试，覆盖率 > 80%
- **前端组件**：关键用户流程必须有 E2E 测试

### 7.2 测试场景清单

#### 智能合约测试
- [ ] Swap: 正常兑换、滑点保护、截止时间检查、余额更新
- [ ] Liquidity: 添加流动性、移除流动性、首次添加、最小流动性锁定
- [ ] Farming: 质押、取款、收获、奖励计算准确性
- [ ] Security: 重入攻击、整数溢出、未授权访问

#### 后端测试
- [ ] Pool Service: 数据同步、缓存命中、错误处理
- [ ] Quote Service: 价格计算准确性、路径优化
- [ ] Blockchain Listener: 事件捕获、数据库更新、WebSocket 推送

#### 前端测试
- [ ] E2E: 完整兑换流程（连接钱包 → 授权 → 兑换 → 确认）
- [ ] E2E: 添加流动性流程
- [ ] E2E: 质押挖矿流程

---

## VIII. 部署与运维规范

### 8.1 部署流程
1. **智能合约部署**：
   ```bash
   npx hardhat compile
   npx hardhat run scripts/deploy.ts --network <network>
   npx hardhat verify --network <network> <contract-address>
   ```

2. **后端部署**：
   - 配置环境变量（DATABASE_URL, REDIS_URL, RPC_URL, 合约地址）
   - 运行数据库迁移：`npm run typeorm migration:run`
   - 启动服务：`npm run start:prod`

3. **前端部署**：
   - 配置环境变量（VITE_API_BASE_URL, 合约地址）
   - 构建生产版本：`npm run build`
   - 部署到静态托管（Vercel, Netlify, IPFS）

### 8.2 监控要求
- **智能合约**：监控关键事件（Swap, Mint, Burn）
- **后端**：监控 API 响应时间、错误率、数据库连接池
- **前端**：监控页面加载时间、交易成功率、错误日志

### 8.3 备份策略
- **数据库**：每日全量备份 + 实时增量备份
- **Redis**：持久化配置（AOF + RDB）
- **智能合约**：多重签名管理关键操作

---

## IX. 验收标准总清单

### 9.1 功能验收
- [ ] 所有 P0 功能完整实现并通过测试
- [ ] 所有 P1 功能完整实现并通过测试
- [ ] 关键用户流程通过 E2E 测试

### 9.2 性能验收
- [ ] 页面加载时间达标
- [ ] API 响应时间达标
- [ ] 支持 100 并发用户无明显性能下降

### 9.3 安全验收
- [ ] 通过智能合约安全审计（内部审计）
- [ ] 通过后端安全扫描（OWASP Top 10）
- [ ] 通过前端安全审计（XSS, CSRF）

### 9.4 质量验收
- [ ] 代码通过合宪性审查（constitution.md）
- [ ] 测试覆盖率达标
- [ ] 文档完整（API 文档、用户指南）

---

## X. 风险与缓解措施

### 10.1 技术风险
| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 智能合约漏洞 | 高 | 中 | 代码审计、单元测试、使用 OpenZeppelin |
| 价格操纵攻击 | 高 | 中 | 使用 TWAP、集成 Chainlink |
| 前端安全漏洞 | 中 | 中 | 输入验证、CSP 策略、定期更新依赖 |
| 后端性能瓶颈 | 中 | 低 | 缓存策略、数据库优化、水平扩展 |

### 10.2 业务风险
| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 流动性不足 | 高 | 高 | 流动性挖矿激励、市场推广 |
| 用户体验差 | 中 | 中 | 用户测试、持续优化 UI/UX |
| Gas 费过高 | 中 | 低 | 合约优化、支持 Layer 2 |

---

## XI. 未来扩展规划（Roadmap）

### Phase 1: MVP（当前阶段）✅
- [x] 基础 Swap 功能
- [x] 流动性管理
- [x] 流动性挖矿
- [x] 价格预言机
- [x] 后端数据分析
- [x] 实时数据同步

### Phase 2: 增强功能（计划中）
- [ ] 多跳路由优化
- [ ] 限价单支持
- [ ] 移动端优化
- [ ] 多链支持（BSC, Polygon）

### Phase 3: 高级功能（未来）
- [ ] 聚合交易（整合其他 DEX）
- [ ] 杠杆交易
- [ ] NFT 交易支持
- [ ] 治理代币与 DAO

---

**文档所有者**：DEX Project Team
**审批者**：Technical Lead
**最后更新**：2026-01-15
**状态**：✅ Approved
