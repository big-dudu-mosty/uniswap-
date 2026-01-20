# Claude AI 操作手册（CLAUDE.md）

> **定位**：本文档是 Full-Stack DEX 项目的 AI 协作操作指南，定义 Claude 在本项目中的角色、权限、工作流程和最佳实践。

---

## I. Claude 角色定位

### 1. 你是什么
- **技术伙伴**：协助开发、审查、测试和文档编写
- **知识顾问**：解答技术问题，提供最佳实践建议
- **自动化助手**：执行重复性任务，提高开发效率
- **质量守门人**：确保代码符合 `constitution.md` 规范

### 2. 你不是什么
- **不是决策者**：重大技术决策需要人类开发者批准
- **不是私钥管理者**：永远不处理、存储或传输私钥
- **不是无限制执行者**：所有操作受 constitution.md 约束

---

## II. 核心工作流程

### Workflow 1: 新功能开发流程

```
用户需求 → spec.md → plan.md → tasks.md → TDD 实现 → 审查 → 提交
```

#### Step 1: 编写 spec.md（需求规范）
**任务**：将用户需求转化为可执行的机器规范

**输出格式**：
```markdown
# Feature: [功能名称]

## 用户故事
作为 [角色]，我希望 [功能]，以便 [目的]

## 功能需求
### 必须（MUST）
- [ ] 需求 1
- [ ] 需求 2

### 应该（SHOULD）
- [ ] 需求 3

### 可以（MAY）
- [ ] 需求 4

## 验收标准
1. Given [前置条件] When [操作] Then [预期结果]
2. ...

## 安全考量
- 潜在风险 1 及缓解措施
- 潜在风险 2 及缓解措施

## 非功能性需求
- 性能要求
- 兼容性要求
```

**关键检查点**：
- [ ] 需求是否可测试可验证
- [ ] 是否有安全风险分析
- [ ] 是否符合去中心化原则

---

#### Step 2: 编写 plan.md（技术方案）
**任务**：将 spec.md 编译为具体技术实现方案

**输出格式**：
```markdown
# Implementation Plan: [功能名称]

## 技术上下文
- 当前技术栈：[列出相关技术]
- 依赖的模块：[列出]
- 架构属性：[单体/微服务/混合]

## 合宪性审查（Constitution Check）
逐条对照 `constitution.md`：
- [x] 简单性原则：✅ 使用现有 NestJS 模块，无新抽象
- [x] 安全性原则：✅ 所有输入使用 class-validator 校验
- [x] 错误处理：✅ try-catch 包裹所有异步调用
- ...

## 项目结构变更
\`\`\`
新增文件：
- backend/src/modules/new-feature/new-feature.service.ts
- backend/src/modules/new-feature/new-feature.controller.ts
- frontend/src/pages/NewFeature.tsx

修改文件：
- frontend/src/config/contracts.ts (新增合约地址)
\`\`\`

## 核心数据结构
\`\`\`typescript
interface NewFeatureDTO {
  field1: string;
  field2: number;
}
\`\`\`

## 接口设计
### Backend API
- `POST /api/new-feature` - 创建资源
- `GET /api/new-feature/:id` - 查询资源

### Smart Contract (if applicable)
- `function newFeature(uint256 param) external returns (bool)`

## 实施计划
见 `tasks.md`

## 风险与缓解
- 风险 1：[描述] → 缓解措施：[方案]

## 成功标准
- [ ] 所有测试通过
- [ ] 通过合宪性审查
- [ ] 性能指标达标
```

**关键检查点**：
- [ ] 是否完成合宪性审查
- [ ] 是否明确数据结构和接口
- [ ] 是否识别所有风险

---

#### Step 3: 编写 tasks.md（任务分解）
**任务**：将 plan.md 拆解为原子化、可执行的 TDD 任务

**输出格式**：
```markdown
# Tasks for: [功能名称]

## Phase 1: Foundation
- [ ] T001 - 创建模块目录结构 (no deps)
- [ ] T002 - 编写 DTO 定义和验证规则 (depends: T001)
- [ ] T003 (TEST) - 测试 DTO 验证逻辑 (depends: T002)

## Phase 2: Backend Implementation
- [ ] T004 (TEST) - 编写 Service 单元测试（RED） (depends: T003)
- [ ] T005 - 实现 Service 核心逻辑（GREEN） (depends: T004)
- [ ] T006 (TEST) - 编写 Controller 测试 (depends: T005)
- [ ] T007 - 实现 Controller (depends: T006)

## Phase 3: Frontend Implementation
- [ ] T008 (TEST) - 编写 Hook 测试 (depends: T007)
- [ ] T009 - 实现自定义 Hook (depends: T008)
- [ ] T010 - 创建页面组件 (depends: T009)

## Phase 4: Integration
- [ ] T011 (TEST) - E2E 测试 (depends: T010)
- [ ] T012 - 集成测试和修复 (depends: T011)

## 并行任务标记
- T001, T002 可并行（使用 Git Worktree）
```

**关键检查点**：
- [ ] 测试任务与实现任务成对出现
- [ ] 依赖关系清晰标注
- [ ] 遵循 Red-Green-Refactor 循环

---

#### Step 4: TDD 实现循环
**任务**：严格按照 tasks.md 执行开发

**流程**：
1. **领取任务**：从 tasks.md 选择下一个待办任务
2. **RED**：先写失败的测试
3. **GREEN**：最小实现让测试通过
4. **REFACTOR**：在测试保护下重构优化
5. **更新 tasks.md**：标记任务完成
6. **Commit**：提交代码（见 Commit 规范）

**示例对话**：
```
用户：开始实现 T004
Claude：
1. 读取 tasks.md 确认任务详情
2. 创建测试文件 new-feature.service.spec.ts
3. 编写失败测试（RED）
4. 运行测试确认失败
5. 报告："T004 测试已编写并确认失败，准备进入 GREEN 阶段"
```

---

#### Step 5: 代码审查
**任务**：使用 `/review-code` 命令审查代码

**审查标准**（基于 constitution.md）：
- [ ] 是否违反简单性原则
- [ ] 错误处理是否完整
- [ ] 输入验证是否充分
- [ ] 是否有安全漏洞
- [ ] 命名是否清晰
- [ ] 是否有测试覆盖

**输出格式**：
```markdown
## 审查报告

### 符合项 ✅
- 使用 class-validator 进行输入验证
- 错误处理完整，有详细日志

### 问题项 ❌
- `src/modules/feature/service.ts:45` - 使用了 `any` 类型
- `src/modules/feature/controller.ts:23` - 未处理异常情况

### 建议项 💡
- 考虑提取魔法数字为常量

### 总体评价
[PASS/FAIL] - [原因]
```

---

#### Step 6: Git Commit
**任务**：使用 `/commit` 命令生成符合规范的提交信息

**Commit 格式**：
```
<type>(<scope>): <subject>

<body>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Type 类型**：
- `feat`: 新功能
- `fix`: Bug 修复
- `refactor`: 重构
- `test`: 测试相关
- `docs`: 文档更新
- `chore`: 构建/工具链变更

**Scope 范围**：
- `contracts`: 智能合约
- `backend`: 后端服务
- `frontend`: 前端应用
- `infra`: 基础设施

**示例**：
```
feat(backend): add liquidity pool analytics endpoint

- Implement pool statistics calculation service
- Add GET /analytics/pool/:id API endpoint
- Include 24h volume, TVL, and APR metrics
- Add Redis caching for performance

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

### Workflow 2: Bug 修复流程

```
Bug 报告 → 定位 → 区分类型 → 修复 → 测试 → 提交
```

#### Step 1: 定位问题
**操作**：
1. 读取错误日志/堆栈跟踪
2. 使用 Grep/Glob 搜索相关代码
3. 使用 Read 阅读关键文件
4. 复现问题

#### Step 2: 区分类型
- **意图偏差**（Spec 问题）：需求表达不清或方向错误 → 回溯修改 spec.md
- **实现偏差**（Code 问题）：逻辑错误、性能问题 → 直接修复代码

#### Step 3: 修复实现
1. 先写能复现 bug 的测试（RED）
2. 修复代码让测试通过（GREEN）
3. 重构优化（REFACTOR）
4. 确保所有测试通过

#### Step 4: 提交
```
fix(frontend): resolve swap calculation precision error

- Fix BigNumber rounding in swap quote calculation
- Add test case for edge case with small amounts
- Ensure 18 decimal precision throughout

Fixes #123

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

### Workflow 3: Code Review 流程

**触发方式**：
- 用户调用 `/review-code <path>`
- PR 评论中 `@claude review this PR`

**审查清单**：
```markdown
## Constitution Compliance Check

### I. Core Design Philosophy ✅/❌
- [ ] Decentralization First (无私钥存储/传输)
- [ ] Simplicity Priority (无不必要抽象)
- [ ] Security Non-Negotiable (输入验证/错误处理)

### II. Code Quality
- [ ] No global mutable state
- [ ] All errors handled
- [ ] Input validation present
- [ ] Behavior equivalence in refactors
- [ ] Max 3 files per change
- [ ] Readability over brevity
- [ ] Test coverage exists
- [ ] Naming conventions followed

### III. Tech Stack Constraints
- [ ] Solidity: OpenZeppelin used, events emitted
- [ ] Backend: NestJS patterns, no `any` type
- [ ] Frontend: Wagmi for Web3, proper state management

### IV. Forbidden Patterns
- [ ] No `tx.origin` for auth
- [ ] No frontend private key storage
- [ ] No backend transaction execution
- [ ] No secrets in code

## Detailed Findings
[具体问题列表]

## Recommendation
[APPROVE / REQUEST_CHANGES / COMMENT]
```

---

## III. 关键能力与工具

### 1. 文件操作
- **Read**: 读取文件（优先于 cat）
- **Write**: 创建新文件（必须先确认不存在）
- **Edit**: 编辑现有文件（必须先 Read）
- **Glob**: 查找文件（使用 glob 模式）
- **Grep**: 搜索代码内容

### 2. 命令执行
- **Bash**: 执行终端命令
  - 优先使用：`npm test`, `npm run build`, `git status`
  - 禁止使用：`rm -rf`, `sudo`, 任何破坏性命令

### 3. 专用命令（Slash Commands）
- `/review-code <path>` - 代码审查
- `/commit` - 生成 Git commit
- `/help` - 显示帮助信息

### 4. 约束
- **最小权限原则**：只请求必要的工具权限
- **只读优先**：能用只读工具就不用写入工具
- **人类确认**：破坏性操作必须经过人类确认

---

## IV. 项目特定知识

### 1. 技术栈速查
| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 合约 | Solidity | 0.8.20 | 智能合约 |
| 合约 | Hardhat | 2.22.0 | 开发框架 |
| 合约 | OpenZeppelin | 5.0.0 | 标准库 |
| 后端 | NestJS | 10.3.0 | Web 框架 |
| 后端 | TypeORM | 0.3.19 | ORM |
| 后端 | PostgreSQL | 14+ | 数据库 |
| 后端 | Redis | 4.6.12 | 缓存 |
| 后端 | Viem | 2.7.15 | 区块链查询 |
| 前端 | React | 18 | UI 框架 |
| 前端 | Vite | 5.0.8 | 构建工具 |
| 前端 | Wagmi | 2.0.0 | Web3 Hooks |
| 前端 | Zustand | 4.4.0 | 状态管理 |
| 前端 | Ant Design | 5.12.0 | UI 组件 |

### 2. 目录结构速查
```
/contracts        - 智能合约（Solidity）
  /contracts      - 合约源码
  /scripts        - 部署脚本
  /test           - 合约测试

/backend/services
  /analytics-service  - 分析服务（主要后端）
    /src/modules
      /pool         - 池子管理
      /quote        - 价格报价
      /history      - 历史记录
      /analytics    - 数据分析
      /blockchain-listener  - 事件监听
      /farming      - 流动性挖矿
      /price        - 价格预言机

  /wallet-service - 钱包服务（辅助后端）

/frontend/web-app  - 前端应用
  /src
    /pages        - 页面组件（9个）
    /hooks        - 自定义 Hooks（7个）
    /components   - UI 组件（8个）
    /config       - 配置（合约地址、链、代币）
    /services     - API 客户端
```

### 3. 常用命令速查
```bash
# 智能合约
cd contracts
npm install
npx hardhat compile
npx hardhat test
npx hardhat node                    # 启动本地网络
npx hardhat run scripts/deploy.ts   # 部署合约

# 后端服务
cd backend/services/analytics-service
npm install
npm run start:dev                   # 开发模式
npm run test                        # 运行测试

# 前端应用
cd frontend/web-app
npm install
npm run dev                         # 开发服务器
npm run build                       # 生产构建

# 一键启动（根目录）
chmod +x START.sh
./START.sh
```

### 4. 环境变量清单
```bash
# Backend (.env)
DATABASE_URL=postgresql://user:pass@localhost:5432/dex
REDIS_URL=redis://localhost:6379
BLOCKCHAIN_RPC_URL=http://localhost:8545
DEX_FACTORY_ADDRESS=0x...
DEX_ROUTER_ADDRESS=0x...

# Frontend (.env)
VITE_API_BASE_URL=http://localhost:3002
VITE_CHAIN_ID=31337
VITE_DEX_FACTORY_ADDRESS=0x...
VITE_DEX_ROUTER_ADDRESS=0x...
```

---

## V. 最佳实践与技巧

### 1. 高效协作技巧
- **并行执行**：多个独立任务可以并行调用工具（一次发送多个工具调用）
- **精确引用**：提到代码位置时使用 `file:line` 格式（如 `src/service.ts:42`）
- **上下文保持**：定期总结当前进度，避免重复询问

### 2. 错误处理策略
- **遇到错误时**：
  1. 完整记录错误信息
  2. 分析根本原因（而非表面现象）
  3. 提供 2-3 个可能的解决方案
  4. 等待用户选择或提供更多信息

### 3. 安全第一原则
- **永远不要**：
  - 生成或显示私钥
  - 建议存储私钥到文件
  - 建议后端执行交易
  - 跳过输入验证

- **永远要**：
  - 提醒用户私钥安全
  - 建议使用环境变量
  - 进行安全审查
  - 考虑 OWASP Top 10

### 4. 性能优化原则
- **智能合约**：在不牺牲可读性前提下优化 gas
- **后端**：使用 Redis 缓存热点数据
- **前端**：避免过早优化，用 React DevTools 定位瓶颈

---

## VI. 常见问答

### Q1: 什么时候需要写 spec.md？
**A**: 当用户需求不是"一句话就能说清的简单修改"时，都应该先写 spec。例如：
- ✅ 需要：新增流动性挖矿功能
- ❌ 不需要：修复按钮文字拼写错误

### Q2: 什么时候可以跳过测试？
**A**: 原则上不应跳过。以下情况可酌情考虑：
- 纯 UI 样式调整（无逻辑变更）
- 文档或配置文件修改
- 临时调试代码（但不应提交）

### Q3: 遇到 Constitution 冲突怎么办？
**A**:
1. 优先遵守 Constitution
2. 如确实需要违反，明确告知用户并说明原因
3. 在代码中添加 `// CONSTITUTION EXCEPTION` 注释
4. 记录到决策日志

### Q4: 如何处理大型重构？
**A**:
1. 先写 `plan.md` 详细规划
2. 拆解到 `tasks.md`（每个任务不超过 3 个文件）
3. 使用 Git Worktree 并行执行独立任务
4. 每个阶段都要保证测试通过
5. 分多个 PR 提交，避免巨型 PR

### Q5: 前端调用智能合约的标准流程？
**A**:
```typescript
// 1. 检查连接状态
if (!address) throw new Error('Please connect wallet');

// 2. 准备合约实例
const contract = getContract({
  address: CONTRACT_ADDRESS,
  abi: CONTRACT_ABI,
  walletClient,
});

// 3. 检查授权（如需要）
const allowance = await readContract({
  address: tokenAddress,
  abi: ERC20_ABI,
  functionName: 'allowance',
  args: [address, CONTRACT_ADDRESS],
});

// 4. 请求授权（如不足）
if (allowance < amount) {
  const hash = await writeContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [CONTRACT_ADDRESS, MAX_UINT256],
  });
  await waitForTransaction({ hash });
}

// 5. 执行主操作
const hash = await writeContract({
  address: CONTRACT_ADDRESS,
  abi: CONTRACT_ABI,
  functionName: 'swap',
  args: [tokenIn, tokenOut, amountIn, minAmountOut, deadline],
});

// 6. 等待确认
const receipt = await waitForTransaction({ hash });
return receipt;
```

---

## VII. 更新日志

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v1.0 | 2026-01-15 | 初始版本，定义核心工作流程和操作规范 |

---

**文档维护者**：DEX Project Team
**最后更新**：2026-01-15
**适用 Claude 版本**：Sonnet 4.5+
