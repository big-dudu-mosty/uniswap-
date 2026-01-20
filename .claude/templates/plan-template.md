# Implementation Plan Template

> **用途**：本文档是技术实现方案模板，用于规划新功能开发
> **使用说明**：复制此模板，填写具体内容，确保通过合宪性审查
> **模板版本**：v1.0

---

# Implementation Plan: [功能名称]

> **关联 Spec**：`spec.md` 的对应章节或独立的 `feature-spec.md`
> **负责人**：[开发者名称]
> **预计开始日期**：YYYY-MM-DD
> **状态**：[草稿 / 审查中 / 已批准 / 实施中 / 已完成]

---

## I. 执行摘要

### 问题陈述
简要描述要解决的问题或要实现的功能（2-3 句话）

**示例**：
> 当前 DEX 仅支持单跳交易（A → B），导致某些交易对无法直接兑换或价格不优。本方案旨在实现多跳路由功能（A → B → C），自动寻找最优交易路径，降低滑点并提升用户体验。

### 目标与成功标准
- **目标 1**：[具体、可衡量的目标]
- **目标 2**：[具体、可衡量的目标]

**成功标准**：
- [ ] 所有单元测试通过（覆盖率 > 80%）
- [ ] 通过合宪性审查（constitution.md）
- [ ] 性能指标达标（响应时间 < Xms）
- [ ] 安全审查通过（无高危漏洞）

---

## II. 技术上下文

### 当前系统状态
描述相关的现有系统架构、组件、数据流等

**技术栈**：
- **智能合约**：Solidity 0.8.20, Hardhat 2.22.0, OpenZeppelin 5.0.0
- **后端**：NestJS 10.3.0, TypeORM 0.3.19, PostgreSQL 14+, Redis 4.6.12
- **前端**：React 18, Vite 5.0.8, Wagmi 2.0.0, Zustand 4.4.0

**依赖的现有模块**：
- 模块 A：[功能描述]
- 模块 B：[功能描述]

**架构属性**：
- 部署模式：[单体 / 微服务 / 混合]
- 数据持久化：PostgreSQL + Redis 缓存
- 区块链交互：Viem (只读查询)
- 用户认证：MetaMask 钱包连接

### 已知约束与限制
- **技术约束**：必须使用现有技术栈，不引入新框架
- **性能约束**：API 响应时间 < 500ms
- **安全约束**：遵循去中心化原则，前端不存储私钥
- **兼容性约束**：需兼容现有智能合约版本

---

## III. 合宪性审查（Constitution Check）

> **关键**：逐条对照 `constitution.md`，确保方案符合所有原则

### ✅ 核心设计哲学
- [x] **去中心化第一原则**：
  - 私钥管理：前端不存储私钥 ✅
  - 后端定位：仅提供只读查询 ✅
  - 用户自主权：用户完全控制资产 ✅

- [x] **简单性优先原则**：
  - 无不必要抽象：使用现有 Router 模式扩展 ✅
  - 优先标准库：使用 OpenZeppelin, NestJS 标准模块 ✅
  - 避免过度设计：不引入复杂的路由算法库 ✅

- [x] **安全性不可妥协原则**：
  - 输入验证：所有参数使用 class-validator 校验 ✅
  - 错误处理：所有异步调用包裹 try-catch ✅
  - 密钥管理：环境变量管理敏感信息 ✅

### ✅ 代码质量铁律
- [x] **禁止全局可变状态**：使用 NestJS 依赖注入 ✅
- [x] **错误处理强制规范**：所有 error 在当前作用域处理 ✅
- [x] **输入验证强制要求**：API 入口使用 DTO 校验 ✅
- [x] **重构行为等价原则**：本次为新功能，不涉及重构 ✅
- [x] **变更范围控制原则**：计划修改 < 3 个文件（见下方） ✅
- [x] **可读性优先原则**：函数命名清晰，复杂逻辑有注释 ✅
- [x] **测试覆盖强制要求**：每个函数配套单元测试 ✅
- [x] **命名规范严格遵守**：遵循 TypeScript/Solidity 规范 ✅

### ✅ 技术栈约束
- [x] 智能合约：Solidity 0.8.20+, OpenZeppelin ✅
- [x] 后端：NestJS, TypeORM, PostgreSQL, Redis ✅
- [x] 前端：React 18+, TypeScript, Wagmi, Viem ✅

### ⚠️ 例外情况（如有）
如需违反某条款，在此说明原因并获得批准：
- 无例外情况

---

## IV. 详细设计

### 4.1 项目结构变更

#### 新增文件
```
backend/src/modules/routing/
├── routing.module.ts           # 路由模块定义
├── routing.service.ts          # 路由计算服务
├── routing.controller.ts       # REST API 控制器
├── dto/
│   ├── find-route.dto.ts       # 查找路由请求 DTO
│   └── route-response.dto.ts   # 路由响应 DTO
└── __tests__/
    ├── routing.service.spec.ts # 服务单元测试
    └── routing.controller.spec.ts # 控制器测试

frontend/src/hooks/
└── useRouting.ts               # 路由查询 Hook
```

#### 修改文件
```
backend/src/app.module.ts       # 注册新模块
frontend/src/pages/Swap.tsx     # 集成路由查询
frontend/src/services/apiService.ts  # 添加路由 API 方法
```

**修改文件数量**：3 个 ✅（符合 constitution 要求）

---

### 4.2 核心数据结构

#### 后端数据结构
```typescript
// dto/find-route.dto.ts
import { IsAddress, IsNumberString, Min } from 'class-validator';

export class FindRouteDto {
  @IsAddress()
  tokenIn: string;

  @IsAddress()
  tokenOut: string;

  @IsNumberString()
  @Min(0)
  amountIn: string;

  @Min(0)
  @Max(10)
  maxHops?: number = 3;  // 最大跳数，默认 3
}

// dto/route-response.dto.ts
export interface RouteStep {
  pairAddress: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
}

export interface RouteResponse {
  path: string[];           // [TokenA, TokenB, TokenC]
  steps: RouteStep[];       // 每一跳的详细信息
  amountIn: string;         // 输入总量
  amountOut: string;        // 输出总量
  priceImpact: number;      // 价格影响（百分比）
  estimatedGas: string;     // 估算 Gas
}
```

#### 前端数据结构
```typescript
// types/routing.ts
interface Route {
  path: string[];
  steps: RouteStep[];
  amountIn: string;
  amountOut: string;
  priceImpact: number;
  estimatedGas: string;
}

interface UseRoutingResult {
  findRoute: (params: FindRouteParams) => Promise<Route | null>;
  isLoading: boolean;
  error: Error | null;
}
```

---

### 4.3 接口设计

#### Backend API
```typescript
// routing.controller.ts
@Controller('api/routing')
export class RoutingController {
  /**
   * 查找最优路由
   * @param dto 查找路由请求参数
   * @returns 最优路由信息
   */
  @Post('find-route')
  @UsePipes(new ValidationPipe({ transform: true }))
  async findRoute(@Body() dto: FindRouteDto): Promise<RouteResponse> {
    try {
      const route = await this.routingService.findOptimalRoute(dto);
      if (!route) {
        throw new NotFoundException('No valid route found');
      }
      return route;
    } catch (error) {
      this.logger.error('Failed to find route', error);
      throw error;
    }
  }
}
```

#### Smart Contract (如需修改)
```solidity
// 如果需要扩展 DEXRouter 支持多跳
function swapExactTokensForTokens(
    uint amountIn,
    uint amountOutMin,
    address[] calldata path,  // 支持多跳：[A, B, C]
    address to,
    uint deadline
) external returns (uint[] memory amounts);
```

**注**：当前 DEXRouter 已支持 `path` 数组，无需修改合约 ✅

---

### 4.4 算法与逻辑

#### 路由查找算法
```typescript
// routing.service.ts
async findOptimalRoute(dto: FindRouteDto): Promise<RouteResponse | null> {
  const { tokenIn, tokenOut, amountIn, maxHops } = dto;

  // 1. 获取所有可用交易对
  const allPairs = await this.poolService.getAllPairs();

  // 2. 构建图结构（代币为节点，交易对为边）
  const graph = this.buildGraph(allPairs);

  // 3. 使用广度优先搜索（BFS）查找所有可能路径
  const allPaths = this.findAllPaths(graph, tokenIn, tokenOut, maxHops);

  // 4. 计算每条路径的输出量
  const routesWithOutputs = await Promise.all(
    allPaths.map(path => this.calculateRouteOutput(path, amountIn))
  );

  // 5. 选择输出量最大的路径
  const optimalRoute = this.selectOptimalRoute(routesWithOutputs);

  return optimalRoute;
}

private buildGraph(pairs: Pair[]): Graph {
  // 构建邻接表
  const graph = new Map<string, Set<string>>();
  for (const pair of pairs) {
    this.addEdge(graph, pair.token0, pair.token1, pair.pairAddress);
    this.addEdge(graph, pair.token1, pair.token0, pair.pairAddress);
  }
  return graph;
}

private findAllPaths(
  graph: Graph,
  start: string,
  end: string,
  maxHops: number
): string[][] {
  // BFS 查找所有路径（限制最大跳数）
  // 实现略...
}

private async calculateRouteOutput(
  path: string[],
  amountIn: string
): Promise<RouteWithOutput> {
  // 逐跳计算输出量，考虑滑点和手续费
  // 实现略...
}
```

**时间复杂度**：O(V + E) 其中 V 是代币数量，E 是交易对数量
**空间复杂度**：O(V^2) 最坏情况下存储所有路径

---

### 4.5 前端集成

#### 自定义 Hook
```typescript
// hooks/useRouting.ts
export function useRouting(): UseRoutingResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const findRoute = useCallback(async (params: FindRouteParams) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.post('/api/routing/find-route', params);
      return response.data;
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { findRoute, isLoading, error };
}
```

#### 页面集成
```typescript
// pages/Swap.tsx
function SwapPage() {
  const { findRoute, isLoading } = useRouting();
  const [route, setRoute] = useState<Route | null>(null);

  const handleInputChange = async (tokenIn, tokenOut, amountIn) => {
    if (!tokenIn || !tokenOut || !amountIn) return;

    const route = await findRoute({ tokenIn, tokenOut, amountIn });
    setRoute(route);
  };

  return (
    <div>
      {/* 显示路由信息 */}
      {route && (
        <div>
          <p>路径: {route.path.join(' → ')}</p>
          <p>预期输出: {route.amountOut}</p>
          <p>价格影响: {route.priceImpact}%</p>
        </div>
      )}
    </div>
  );
}
```

---

### 4.6 数据库变更（如需要）

#### 新增表（如有）
```sql
-- 无需新增表，使用现有 Pool 表
```

#### 修改表（如有）
```sql
-- 无需修改表
```

---

### 4.7 缓存策略

#### Redis 缓存设计
```typescript
// 缓存键设计
const CACHE_KEY = `route:${tokenIn}:${tokenOut}:${amountIn}`;

// 缓存逻辑
async findOptimalRoute(dto: FindRouteDto): Promise<RouteResponse | null> {
  // 1. 尝试从缓存读取
  const cached = await this.cacheService.get(CACHE_KEY);
  if (cached) return JSON.parse(cached);

  // 2. 计算路由
  const route = await this.calculateRoute(dto);

  // 3. 写入缓存（TTL 30秒）
  await this.cacheService.set(CACHE_KEY, JSON.stringify(route), 30);

  return route;
}
```

**缓存 TTL**：30 秒（平衡实时性与性能）

---

## V. 实施计划（对应 tasks.md）

### Phase 1: 基础设施（Foundation）
- [ ] **T001** - 创建 routing 模块目录结构
- [ ] **T002** - 定义 DTO 和验证规则
- [ ] **T003 (TEST)** - 测试 DTO 验证逻辑

### Phase 2: 后端核心逻辑（Backend Core）
- [ ] **T004 (TEST)** - 编写 RoutingService 单元测试（RED）
- [ ] **T005** - 实现图构建算法（GREEN）
- [ ] **T006** - 实现路径查找算法（BFS）
- [ ] **T007** - 实现输出量计算逻辑
- [ ] **T008** - 实现最优路径选择逻辑
- [ ] **T009 (TEST)** - 验证所有测试通过（GREEN → REFACTOR）

### Phase 3: API 层（API Layer）
- [ ] **T010 (TEST)** - 编写 RoutingController 测试
- [ ] **T011** - 实现 Controller 和错误处理
- [ ] **T012** - 集成缓存逻辑
- [ ] **T013** - 注册模块到 AppModule

### Phase 4: 前端集成（Frontend）
- [ ] **T014 (TEST)** - 编写 useRouting Hook 测试
- [ ] **T015** - 实现 useRouting Hook
- [ ] **T016** - 在 Swap 页面集成路由查询
- [ ] **T017** - 添加路由信息展示 UI

### Phase 5: 测试与优化（Testing & Optimization）
- [ ] **T018 (TEST)** - E2E 测试（完整查询流程）
- [ ] **T019** - 性能测试（响应时间 < 500ms）
- [ ] **T020** - 代码审查（constitution check）
- [ ] **T021** - 文档更新（API 文档、用户指南）

---

## VI. 测试策略

### 6.1 单元测试
```typescript
// routing.service.spec.ts
describe('RoutingService', () => {
  describe('findOptimalRoute', () => {
    it('should find direct route for direct pair', async () => {
      const result = await service.findOptimalRoute({
        tokenIn: 'TokenA',
        tokenOut: 'TokenB',
        amountIn: '1000',
      });
      expect(result.path).toEqual(['TokenA', 'TokenB']);
    });

    it('should find multi-hop route when no direct pair', async () => {
      const result = await service.findOptimalRoute({
        tokenIn: 'TokenA',
        tokenOut: 'TokenC',
        amountIn: '1000',
      });
      expect(result.path).toEqual(['TokenA', 'TokenB', 'TokenC']);
    });

    it('should throw error when no route available', async () => {
      await expect(
        service.findOptimalRoute({
          tokenIn: 'TokenA',
          tokenOut: 'NonExistentToken',
          amountIn: '1000',
        })
      ).rejects.toThrow(NotFoundException);
    });
  });
});
```

### 6.2 集成测试
```typescript
// routing.controller.spec.ts (E2E)
describe('RoutingController (e2e)', () => {
  it('POST /api/routing/find-route', async () => {
    return request(app.getHttpServer())
      .post('/api/routing/find-route')
      .send({
        tokenIn: '0x...',
        tokenOut: '0x...',
        amountIn: '1000000000000000000',
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('path');
        expect(res.body).toHaveProperty('amountOut');
      });
  });
});
```

### 6.3 性能测试
```typescript
describe('Performance', () => {
  it('should respond within 500ms', async () => {
    const start = Date.now();
    await service.findOptimalRoute(testDto);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });
});
```

---

## VII. 风险与缓解措施

### 7.1 技术风险
| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 路径查找性能差（代币数量多时） | 高 | 中 | 限制最大跳数为 3，使用缓存 |
| 缓存数据过期导致价格不准 | 中 | 中 | 设置短 TTL (30秒)，前端显示刷新时间 |
| 多跳交易 Gas 费过高 | 中 | 低 | 提供 Gas 估算，让用户决策 |
| BFS 算法内存占用高 | 低 | 低 | 限制最大路径数，使用生成器模式 |

### 7.2 业务风险
| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 用户不理解多跳路由 | 低 | 中 | UI 清晰展示路径，提供说明文案 |
| 多跳路由失败率高（某个池子流动性不足） | 中 | 中 | 实时检查每一跳的流动性，提前警告 |

---

## VIII. 监控与日志

### 8.1 关键指标
- **路由查询成功率**：目标 > 95%
- **路由查询响应时间**：P95 < 500ms
- **缓存命中率**：目标 > 60%
- **多跳路由使用率**：监控占比

### 8.2 日志规范
```typescript
// 关键操作日志
this.logger.log(`Finding route: ${tokenIn} -> ${tokenOut}, amount: ${amountIn}`);
this.logger.log(`Route found: ${path.join(' -> ')}, output: ${amountOut}`);
this.logger.error(`Route calculation failed: ${error.message}`, error.stack);
```

---

## IX. 回滚计划

### 如果上线后发现严重问题
1. **前端回滚**：移除路由查询调用，恢复直接查询单一交易对
2. **后端回滚**：禁用 `/api/routing/find-route` 端点
3. **数据回滚**：无需回滚（无数据库变更）

### 回滚触发条件
- 路由查询成功率 < 80%
- 响应时间 P95 > 2 秒
- 发现严重安全漏洞

---

## X. 文档更新清单

- [ ] API 文档（Swagger）添加新端点
- [ ] 用户指南添加多跳路由说明
- [ ] 开发者文档更新架构图
- [ ] Changelog 记录本次更新

---

## XI. 审批记录

| 审批人 | 角色 | 审批结果 | 日期 | 备注 |
|--------|------|---------|------|------|
| [姓名] | Tech Lead | [批准/拒绝/待定] | YYYY-MM-DD | [意见] |
| [姓名] | Security Reviewer | [批准/拒绝/待定] | YYYY-MM-DD | [意见] |
| [姓名] | Product Owner | [批准/拒绝/待定] | YYYY-MM-DD | [意见] |

---

## XII. 参考资料

- [Uniswap V2 Routing 算法](https://docs.uniswap.org/contracts/v2/concepts/protocol-overview/smart-contract-integration)
- [BFS 图算法](https://en.wikipedia.org/wiki/Breadth-first_search)
- [NestJS 模块化最佳实践](https://docs.nestjs.com/modules)

---

**文档版本**：v1.0
**创建日期**：YYYY-MM-DD
**最后更新**：YYYY-MM-DD
**状态**：[草稿 / 审查中 / 已批准]
