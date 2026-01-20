# Tasks Template

> **用途**：本文档是任务分解模板，用于将技术方案拆解为可执行的原子任务
> **使用说明**：遵循 TDD 原则（Red-Green-Refactor），测试任务与实现任务成对出现
> **模板版本**：v1.0

---

# Tasks for: [功能名称]

> **关联 Plan**：`plan.md` 或 `plan-template.md`
> **开始日期**：YYYY-MM-DD
> **目标完成日期**：YYYY-MM-DD
> **当前状态**：[X/Y 任务已完成]

---

## 📋 任务总览

| 阶段 | 任务数 | 已完成 | 进度 |
|------|--------|--------|------|
| Phase 1: Foundation | 5 | 0 | 0% |
| Phase 2: Backend Core | 8 | 0 | 0% |
| Phase 3: API Layer | 6 | 0 | 0% |
| Phase 4: Frontend | 7 | 0 | 0% |
| Phase 5: Testing & Polish | 5 | 0 | 0% |
| **总计** | **31** | **0** | **0%** |

---

## 🔑 任务标记说明

- **T001** - 任务编号
- **(TEST)** - 测试任务（写测试代码）
- **(IMPL)** - 实现任务（写功能代码）
- **(REFACTOR)** - 重构任务（优化代码）
- **[no deps]** - 无依赖，可独立执行
- **[depends: T001]** - 依赖 T001 完成
- **[parallel: T002, T003]** - 可与 T002, T003 并行执行

---

## Phase 1: Foundation（基础设施）

> **目标**：创建项目骨架和基础配置

### T001 - 创建模块目录结构
- **类型**：基础设施
- **依赖**：[no deps]
- **并行**：可与其他 Phase 1 任务并行
- **描述**：
  - 创建 `backend/src/modules/feature-name/` 目录
  - 创建子目录：`dto/`, `entities/`, `__tests__/`
  - 创建占位文件：`feature.module.ts`, `feature.service.ts`, `feature.controller.ts`
- **验收**：
  - [ ] 目录结构创建完成
  - [ ] 占位文件可被 TypeScript 识别（无编译错误）

---

### T002 (TEST) - 定义 DTO 和验证规则
- **类型**：测试（RED）
- **依赖**：[depends: T001]
- **并行**：无
- **描述**：
  - 创建 `dto/create-feature.dto.ts`
  - 定义请求参数接口
  - 添加 `class-validator` 装饰器（`@IsString()`, `@IsNumber()`, `@Min()`, `@Max()` 等）
  - 编写 DTO 验证测试 `__tests__/dto.spec.ts`
- **验收**：
  - [ ] 测试覆盖所有验证规则
  - [ ] 测试失败（因为还未实现验证逻辑）

**示例代码**：
```typescript
// dto/create-feature.dto.ts
import { IsString, IsNumber, Min, Max } from 'class-validator';

export class CreateFeatureDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  value: number;
}

// __tests__/dto.spec.ts
describe('CreateFeatureDto', () => {
  it('should fail validation when value < 0', () => {
    const dto = new CreateFeatureDto();
    dto.value = -1;
    // 断言验证失败
  });
});
```

---

### T003 (IMPL) - 实现 DTO 验证逻辑
- **类型**：实现（GREEN）
- **依赖**：[depends: T002]
- **并行**：无
- **描述**：
  - 确保 DTO 类正确导出
  - 运行测试，确保通过
- **验收**：
  - [ ] T002 中的所有测试通过

---

### T004 - 创建 Entity（如需数据库持久化）
- **类型**：实现
- **依赖**：[depends: T001]
- **并行**：可与 T002 并行
- **描述**：
  - 创建 `entities/feature.entity.ts`
  - 定义 TypeORM 实体类
  - 添加字段装饰器（`@Column`, `@PrimaryGeneratedColumn`, `@CreateDateColumn` 等）
  - 在 `feature.module.ts` 中注册实体
- **验收**：
  - [ ] Entity 定义完整
  - [ ] 可通过 `npm run typeorm migration:generate` 生成迁移文件

**示例代码**：
```typescript
// entities/feature.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('features')
export class Feature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('decimal', { precision: 10, scale: 2 })
  value: number;

  @CreateDateColumn()
  createdAt: Date;
}
```

---

### T005 - 配置模块依赖注入
- **类型**：配置
- **依赖**：[depends: T003, T004]
- **并行**：无
- **描述**：
  - 在 `feature.module.ts` 中配置 `TypeOrmModule.forFeature([Feature])`
  - 声明 `providers: [FeatureService]`
  - 声明 `controllers: [FeatureController]`
  - 在 `app.module.ts` 中导入 `FeatureModule`
- **验收**：
  - [ ] 应用启动无错误
  - [ ] 依赖注入工作正常

---

## Phase 2: Backend Core（后端核心逻辑）

> **目标**：实现核心业务逻辑，遵循 TDD

### T006 (TEST) - 编写 Service 单元测试骨架（RED）
- **类型**：测试（RED）
- **依赖**：[depends: T005]
- **并行**：无
- **描述**：
  - 创建 `__tests__/feature.service.spec.ts`
  - 定义测试套件结构
  - 编写关键方法的测试用例（至少 3 个）
  - Mock 外部依赖（Repository, 第三方服务）
- **验收**：
  - [ ] 所有测试编写完成
  - [ ] 运行测试，全部失败（因为方法未实现）

**示例代码**：
```typescript
// __tests__/feature.service.spec.ts
describe('FeatureService', () => {
  let service: FeatureService;
  let repository: Repository<Feature>;

  beforeEach(() => {
    // 设置 Mock
  });

  describe('create', () => {
    it('should create a new feature', async () => {
      const dto = { name: 'Test', value: 50 };
      const result = await service.create(dto);
      expect(result).toHaveProperty('id');
    });

    it('should throw error when value is invalid', async () => {
      const dto = { name: 'Test', value: -1 };
      await expect(service.create(dto)).rejects.toThrow();
    });
  });

  describe('findAll', () => {
    it('should return an array of features', async () => {
      const result = await service.findAll();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return a single feature by id', async () => {
      const result = await service.findOne('uuid');
      expect(result).toHaveProperty('id');
    });

    it('should throw NotFoundException when not found', async () => {
      await expect(service.findOne('invalid')).rejects.toThrow(NotFoundException);
    });
  });
});
```

---

### T007 (IMPL) - 实现 Service 核心方法（GREEN）
- **类型**：实现（GREEN）
- **依赖**：[depends: T006]
- **并行**：无
- **描述**：
  - 实现 `FeatureService` 的所有方法
  - 确保业务逻辑正确
  - 处理所有错误情况（抛出合适的异常）
- **验收**：
  - [ ] T006 中的所有测试通过
  - [ ] 代码符合 `constitution.md` 规范

**示例代码**：
```typescript
// feature.service.ts
@Injectable()
export class FeatureService {
  constructor(
    @InjectRepository(Feature)
    private readonly featureRepository: Repository<Feature>,
  ) {}

  async create(dto: CreateFeatureDto): Promise<Feature> {
    try {
      const feature = this.featureRepository.create(dto);
      return await this.featureRepository.save(feature);
    } catch (error) {
      this.logger.error('Failed to create feature', error);
      throw new BadRequestException('Failed to create feature');
    }
  }

  async findAll(): Promise<Feature[]> {
    return await this.featureRepository.find();
  }

  async findOne(id: string): Promise<Feature> {
    const feature = await this.featureRepository.findOne({ where: { id } });
    if (!feature) {
      throw new NotFoundException(`Feature with ID ${id} not found`);
    }
    return feature;
  }

  async update(id: string, dto: UpdateFeatureDto): Promise<Feature> {
    const feature = await this.findOne(id);
    Object.assign(feature, dto);
    return await this.featureRepository.save(feature);
  }

  async remove(id: string): Promise<void> {
    const feature = await this.findOne(id);
    await this.featureRepository.remove(feature);
  }
}
```

---

### T008 (REFACTOR) - 优化 Service 代码
- **类型**：重构（REFACTOR）
- **依赖**：[depends: T007]
- **并行**：无
- **描述**：
  - 提取重复代码为私有方法
  - 优化错误处理逻辑
  - 添加必要的日志记录
  - 改善命名和注释
- **验收**：
  - [ ] 所有测试仍然通过
  - [ ] 代码可读性提升
  - [ ] 无重复代码

---

### T009 (TEST) - 编写 Controller 单元测试（RED）
- **类型**：测试（RED）
- **依赖**：[depends: T008]
- **并行**：可与 T010 并行（如果团队成员不同）
- **描述**：
  - 创建 `__tests__/feature.controller.spec.ts`
  - 测试所有 HTTP 端点（GET, POST, PUT, DELETE）
  - Mock FeatureService
  - 测试错误处理（400, 404, 500）
- **验收**：
  - [ ] 所有 Controller 测试编写完成
  - [ ] 运行测试，全部失败

---

### T010 (IMPL) - 实现 Controller（GREEN）
- **类型**：实现（GREEN）
- **依赖**：[depends: T009]
- **并行**：无
- **描述**：
  - 实现 `FeatureController` 的所有端点
  - 添加验证管道（`@UsePipes(new ValidationPipe())`）
  - 添加 Swagger 装饰器（`@ApiOperation`, `@ApiResponse`）
  - 实现错误处理
- **验收**：
  - [ ] T009 中的所有测试通过
  - [ ] API 文档自动生成

**示例代码**：
```typescript
// feature.controller.ts
@Controller('api/feature')
@ApiTags('feature')
export class FeatureController {
  constructor(private readonly featureService: FeatureService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new feature' })
  @ApiResponse({ status: 201, description: 'Feature created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(@Body() dto: CreateFeatureDto): Promise<Feature> {
    return await this.featureService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all features' })
  async findAll(): Promise<Feature[]> {
    return await this.featureService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get feature by ID' })
  @ApiResponse({ status: 404, description: 'Feature not found' })
  async findOne(@Param('id') id: string): Promise<Feature> {
    return await this.featureService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFeatureDto): Promise<Feature> {
    return await this.featureService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string): Promise<void> {
    return await this.featureService.remove(id);
  }
}
```

---

### T011 - 添加缓存逻辑（可选）
- **类型**：实现
- **依赖**：[depends: T010]
- **并行**：可与 T012 并行
- **描述**：
  - 在 Service 中注入 CacheService
  - 在 `findAll()` 和 `findOne()` 中添加缓存读取
  - 在 `create()`, `update()`, `remove()` 中清除缓存
  - 设置合理的 TTL（如 60 秒）
- **验收**：
  - [ ] 缓存命中率 > 50%（运行性能测试）
  - [ ] 所有测试通过

---

### T012 - 集成 WebSocket 实时推送（可选）
- **类型**：实现
- **依赖**：[depends: T010]
- **并行**：可与 T011 并行
- **描述**：
  - 创建 `feature.gateway.ts`
  - 在 Service 的 CRUD 操作后触发 WebSocket 事件
  - 前端监听事件并更新 UI
- **验收**：
  - [ ] WebSocket 连接正常
  - [ ] 事件推送实时性 < 2 秒

---

### T013 - 数据库迁移
- **类型**：配置
- **依赖**：[depends: T004]
- **并行**：可在 Phase 2 早期执行
- **描述**：
  - 运行 `npm run typeorm migration:generate -- -n CreateFeatureTable`
  - 检查生成的迁移文件
  - 运行 `npm run typeorm migration:run`
  - 验证数据库表创建成功
- **验收**：
  - [ ] 迁移文件正确
  - [ ] 数据库表结构符合预期

---

## Phase 3: API Layer（API 层集成）

> **目标**：完成 API 集成和错误处理

### T014 - 注册模块到 AppModule
- **类型**：配置
- **依赖**：[depends: T010]
- **并行**：无
- **描述**：
  - 在 `app.module.ts` 的 `imports` 中添加 `FeatureModule`
  - 确保应用启动无错误
- **验收**：
  - [ ] 应用启动成功
  - [ ] `/api/feature` 端点可访问

---

### T015 (TEST) - 编写 E2E 测试
- **类型**：测试
- **依赖**：[depends: T014]
- **并行**：无
- **描述**：
  - 创建 `test/feature.e2e-spec.ts`
  - 测试完整的 HTTP 请求流程
  - 使用真实数据库（测试数据库）
  - 测试错误响应格式
- **验收**：
  - [ ] E2E 测试覆盖所有端点
  - [ ] 所有测试通过

---

### T016 - 添加全局错误过滤器（如果还没有）
- **类型**：实现
- **依赖**：[no deps]
- **并行**：可与其他任务并行
- **描述**：
  - 创建 `common/filters/http-exception.filter.ts`
  - 统一错误响应格式
  - 在 `main.ts` 中注册过滤器
- **验收**：
  - [ ] 所有 API 错误响应格式统一

---

### T017 - 添加请求日志中间件
- **类型**：实现
- **依赖**：[no deps]
- **并行**：可与其他任务并行
- **描述**：
  - 创建 `common/middleware/logger.middleware.ts`
  - 记录请求方法、路径、响应时间
  - 在 `main.ts` 中注册中间件
- **验收**：
  - [ ] 所有 API 请求有日志记录

---

### T018 - 添加速率限制（可选）
- **类型**：实现
- **依赖**：[no deps]
- **并行**：可与其他任务并行
- **描述**：
  - 安装 `@nestjs/throttler`
  - 配置全局速率限制（如 100 req/min）
  - 对敏感端点单独配置
- **验收**：
  - [ ] 超过限制时返回 429 错误

---

### T019 - 更新 Swagger 文档
- **类型**：文档
- **依赖**：[depends: T010]
- **并行**：可与其他任务并行
- **描述**：
  - 确保所有端点有 `@ApiOperation` 装饰器
  - 添加请求/响应示例
  - 添加错误响应文档
- **验收**：
  - [ ] Swagger UI 显示完整 API 文档
  - [ ] 所有端点可在 Swagger 中测试

---

## Phase 4: Frontend（前端集成）

> **目标**：实现前端页面和组件

### T020 - 创建 API 服务方法
- **类型**：实现
- **依赖**：[depends: T014]
- **并行**：无
- **描述**：
  - 在 `frontend/src/services/apiService.ts` 中添加方法
  - 使用 Axios 或 Fetch 调用后端 API
  - 添加错误处理
- **验收**：
  - [ ] API 方法定义完整
  - [ ] 返回类型正确（TypeScript）

**示例代码**：
```typescript
// services/apiService.ts
export const featureService = {
  async getAll(): Promise<Feature[]> {
    const response = await axios.get('/api/feature');
    return response.data;
  },

  async getById(id: string): Promise<Feature> {
    const response = await axios.get(`/api/feature/${id}`);
    return response.data;
  },

  async create(dto: CreateFeatureDto): Promise<Feature> {
    const response = await axios.post('/api/feature', dto);
    return response.data;
  },
};
```

---

### T021 (TEST) - 编写自定义 Hook 测试
- **类型**：测试（RED）
- **依赖**：[depends: T020]
- **并行**：无
- **描述**：
  - 创建 `hooks/__tests__/useFeature.spec.ts`
  - 使用 `@testing-library/react-hooks` 测试 Hook
  - Mock API 服务
- **验收**：
  - [ ] Hook 测试编写完成
  - [ ] 运行测试，全部失败

---

### T022 (IMPL) - 实现自定义 Hook
- **类型**：实现（GREEN）
- **依赖**：[depends: T021]
- **并行**：无
- **描述**：
  - 创建 `hooks/useFeature.ts`
  - 使用 React Query 或 useState 管理状态
  - 实现 CRUD 操作方法
- **验收**：
  - [ ] T021 中的所有测试通过

**示例代码**：
```typescript
// hooks/useFeature.ts
export function useFeature() {
  const { data, isLoading, error, refetch } = useQuery(
    ['features'],
    () => featureService.getAll()
  );

  const createFeature = useMutation(
    (dto: CreateFeatureDto) => featureService.create(dto),
    {
      onSuccess: () => refetch(),
    }
  );

  return {
    features: data ?? [],
    isLoading,
    error,
    createFeature: createFeature.mutate,
  };
}
```

---

### T023 - 创建页面组件
- **类型**：实现
- **依赖**：[depends: T022]
- **并行**：可与 T024 并行
- **描述**：
  - 创建 `pages/FeaturePage.tsx`
  - 使用自定义 Hook 获取数据
  - 实现列表展示、创建、编辑、删除功能
- **验收**：
  - [ ] 页面正常渲染
  - [ ] 所有功能正常工作

---

### T024 - 创建表单组件
- **类型**：实现
- **依赖**：[depends: T022]
- **并行**：可与 T023 并行
- **描述**：
  - 创建 `components/FeatureForm.tsx`
  - 使用 Ant Design 表单组件
  - 添加客户端验证
  - 处理提交和错误状态
- **验收**：
  - [ ] 表单验证正常工作
  - [ ] 提交成功后刷新数据

---

### T025 - 添加路由配置
- **类型**：配置
- **依赖**：[depends: T023]
- **并行**：无
- **描述**：
  - 在 `App.tsx` 或路由配置文件中添加新路由
  - 配置路径和组件映射
  - 添加导航链接（如果需要）
- **验收**：
  - [ ] 可通过 URL 访问新页面
  - [ ] 导航链接正常工作

---

### T026 - 样式和响应式设计
- **类型**：实现
- **依赖**：[depends: T023, T024]
- **并行**：可与 T027 并行
- **描述**：
  - 使用 CSS/SCSS 或 styled-components 编写样式
  - 适配桌面端和移动端
  - 确保 UI 与设计稿一致
- **验收**：
  - [ ] 桌面端显示正常
  - [ ] 移动端（375px 宽度）显示正常

---

## Phase 5: Testing & Polish（测试与优化）

> **目标**：全面测试、性能优化、文档完善

### T027 (TEST) - 完整用户流程 E2E 测试
- **类型**：测试
- **依赖**：[depends: T025]
- **并行**：无
- **描述**：
  - 使用 Playwright 或 Cypress 编写 E2E 测试
  - 测试完整用户流程：访问页面 → 查看列表 → 创建 → 编辑 → 删除
  - 测试错误情况（网络错误、验证失败）
- **验收**：
  - [ ] E2E 测试覆盖主要用户流程
  - [ ] 所有测试通过

---

### T028 - 性能测试与优化
- **类型**：测试 + 优化
- **依赖**：[depends: T027]
- **并行**：无
- **描述**：
  - 使用 Apache Bench 或 k6 进行负载测试
  - 测试 API 响应时间和并发性能
  - 根据结果优化（添加索引、调整缓存策略）
- **验收**：
  - [ ] API P95 响应时间 < 500ms
  - [ ] 支持 100 并发用户

---

### T029 - Code Review & Constitution Check
- **类型**：审查
- **依赖**：[depends: T027]
- **并行**：可与 T030 并行
- **描述**：
  - 逐文件检查代码是否符合 `constitution.md`
  - 运行 ESLint 和 Prettier
  - 检查命名规范、错误处理、测试覆盖率
  - 使用 `/review-code` 命令（如果有）
- **验收**：
  - [ ] 通过所有 Constitution 检查点
  - [ ] 无 ESLint 错误
  - [ ] 测试覆盖率 > 80%

---

### T030 - 安全审查
- **类型**：审查
- **依赖**：[depends: T027]
- **并行**：可与 T029 并行
- **描述**：
  - 检查 OWASP Top 10 漏洞（SQL 注入、XSS、CSRF 等）
  - 运行 `npm audit` 检查依赖漏洞
  - 检查敏感信息是否暴露
  - 验证输入验证和授权逻辑
- **验收**：
  - [ ] 无高危安全漏洞
  - [ ] 所有依赖版本安全

---

### T031 - 文档更新
- **类型**：文档
- **依赖**：[depends: T029]
- **并行**：无
- **描述**：
  - 更新 API 文档（Swagger）
  - 更新用户指南（如有新功能）
  - 更新开发者文档（架构图、数据流图）
  - 更新 CHANGELOG.md
  - 编写 PR 描述
- **验收**：
  - [ ] 所有文档更新完成
  - [ ] 文档与实际功能一致

---

## 🔄 TDD 循环检查清单

每个测试-实现任务对必须完成以下循环：

### RED（红灯）- 写失败的测试
- [ ] 测试清晰描述预期行为
- [ ] 测试断言具体明确
- [ ] 运行测试，确认失败（因为功能未实现）
- [ ] 失败原因符合预期

### GREEN（绿灯）- 最小实现
- [ ] 实现功能，使测试通过
- [ ] 不过度设计，只关注让测试通过
- [ ] 运行测试，确认全部通过
- [ ] 提交代码（可选）

### REFACTOR（重构）- 优化代码
- [ ] 提取重复代码
- [ ] 改善命名和结构
- [ ] 优化性能（如有必要）
- [ ] 运行测试，确认仍然通过
- [ ] 提交代码

---

## 📊 进度跟踪

### 当前正在进行的任务
- **T000** - [任务描述]
  - 状态：进行中
  - 开始时间：YYYY-MM-DD HH:MM
  - 阻塞问题：无

### 已完成任务（按完成顺序）
- [x] **T001** - 创建模块目录结构（完成于 YYYY-MM-DD）
- [x] **T002** - 定义 DTO 和验证规则（完成于 YYYY-MM-DD）

### 阻塞任务
- **T010** - 等待 T009 完成
- **T015** - 等待后端部署到测试环境

---

## 🎯 里程碑

| 里程碑 | 目标日期 | 状态 | 包含任务 |
|--------|---------|------|----------|
| Phase 1 完成 | YYYY-MM-DD | ⏳ 进行中 | T001-T005 |
| Phase 2 完成 | YYYY-MM-DD | ⬜ 未开始 | T006-T013 |
| Backend 联调完成 | YYYY-MM-DD | ⬜ 未开始 | T014-T019 |
| Frontend 完成 | YYYY-MM-DD | ⬜ 未开始 | T020-T026 |
| 全面测试完成 | YYYY-MM-DD | ⬜ 未开始 | T027-T031 |

---

## 📝 注意事项

### 任务执行规范
1. **按顺序执行**：严格遵守依赖关系，不跳过前置任务
2. **测试先行**：所有实现任务必须先有对应的测试任务
3. **及时更新**：完成任务后立即更新状态和进度
4. **记录问题**：遇到阻塞问题及时记录到"阻塞任务"部分

### 并行执行建议
可使用 Git Worktree 并行执行以下任务组：
- Phase 1: T001, T002, T004 可并行
- Phase 2: T011, T012 可并行
- Phase 3: T016, T017, T018 可并行
- Phase 4: T023, T024 可并行

### 质量门禁
在以下阶段必须进行质量检查：
- **Phase 2 结束**：后端单元测试覆盖率 > 80%
- **Phase 3 结束**：E2E 测试通过
- **Phase 5 结束**：通过 Constitution Check 和安全审查

---

**文档版本**：v1.0
**创建日期**：YYYY-MM-DD
**最后更新**：YYYY-MM-DD
**维护者**：[开发者名称]
