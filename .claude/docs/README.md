# AI Development Workflow Documentation

本目录包含 Full-Stack DEX 项目的 AI 原生开发工作流文档体系。

---

## 📚 文档结构

### 核心文档（根目录）

#### 1. constitution.md - 项目宪法 🏛️
**定位**：不可协商的开发原则与质量铁律

**何时使用**：
- 编写任何新代码前必读
- Code Review 时作为评审标准
- 技术方案设计时进行"合宪性审查"

**核心内容**：
- 去中心化第一原则
- 代码质量铁律（9 条）
- 技术栈约束
- 禁止清单（AI 常犯错误）

---

#### 2. CLAUDE.md - AI 操作手册 🤖
**定位**：Claude 在本项目中的操作指南和工作流程

**何时使用**：
- Claude 协作前必读（让 Claude 理解项目规范）
- 不确定工作流程时查阅
- 需要了解标准操作流程时

**核心内容**：
- 3 大工作流（新功能开发、Bug 修复、Code Review）
- TDD 循环详解
- 项目特定知识（技术栈、目录结构、常用命令）
- 最佳实践与技巧

---

#### 3. spec.md - 项目规范 📋
**定位**：项目总体功能规范和需求文档

**何时使用**：
- 了解项目全貌和功能范围
- 新成员入职了解项目
- 编写新功能 spec 时作为参考

**核心内容**：
- 功能需求（Swap、Liquidity、Farming 等）
- 非功能性需求（性能、安全、兼容性）
- 架构约束
- 数据模型规范
- API 接口规范

---

#### 4. plan-template.md - 技术方案模板 📝
**定位**：新功能技术实现方案的模板

**何时使用**：
- 开始新功能开发前
- 需要制定技术方案时
- 复制模板并填写具体内容

**核心内容**：
- 合宪性审查清单
- 项目结构变更
- 核心数据结构设计
- 接口设计
- 算法与逻辑
- 风险与缓解措施

---

#### 5. tasks-template.md - 任务分解模板 ✅
**定位**：将技术方案拆解为可执行的原子任务

**何时使用**：
- plan.md 完成后
- 需要细化执行步骤时
- 跟踪任务进度时

**核心内容**：
- Phase-based 任务分解
- TDD 循环（Red-Green-Refactor）
- 依赖关系标注
- 并行任务标记
- 进度跟踪表

---

### .claude/ 目录（AI 扩展能力）

#### .claude/commands/ - Slash Commands 目录 ⚡
**定位**：快捷触发固定流程的命令

**已有命令**：
- `review-code.md` - 代码审查命令
- `create-feature.md` - 创建新功能脚手架命令

**使用方式**：
```bash
/review-code backend/src/modules/pool/
/create-feature multi-hop-routing
```

---

#### .claude/skills/ - Agent Skills 目录 🎯
**定位**：AI 自动发现并处理特定领域问题

**已有技能**：
- `code-quality-reviewer/` - 自动代码质量审查技能

**触发方式**：
- 自动触发（当用户问"代码质量怎么样"时）
- 关键词触发（review, quality, check 等）

---

#### .claude/hooks/ - 自动化 Hooks 🪝
**定位**：在特定事件点自动执行脚本

**已有 Hooks**：
- `post-tool-use-format.sh` - 代码编辑后自动格式化
- `pre-tool-use-protect-branch.sh` - 保护主分支防误操作

**激活方式**：
需要在 `.claude/settings.json` 中配置（见下方配置示例）

---

## 🚀 快速开始

### 新成员入职流程

1. **阅读核心文档**（建议顺序）：
   ```bash
   1. constitution.md  # 了解开发原则
   2. CLAUDE.md        # 了解工作流程
   3. spec.md          # 了解项目范围
   ```

2. **熟悉项目结构**：
   ```bash
   # 查看项目架构
   cat ARCHITECTURE.md

   # 查看快速参考
   cat QUICK_REFERENCE.md
   ```

3. **配置 Claude Code**（如果使用 AI 辅助开发）：
   ```bash
   # 让 Claude 读取关键文档
   # 在 Claude Code 中执行：
   # "请读取 constitution.md, CLAUDE.md 和 spec.md"
   ```

---

### 开发新功能完整流程

#### 阶段 1: 规范定义（Specification）
```bash
# 使用 create-feature 命令快速开始（推荐）
/create-feature your-feature-name

# 或手动创建
cp spec.md spec-your-feature.md
# 编辑 spec-your-feature.md，定义需求
```

**输出**：`spec-your-feature.md`

---

#### 阶段 2: 技术方案（Plan）
```bash
# 复制模板
cp plan-template.md plan-your-feature.md

# 编辑 plan-your-feature.md，填写：
# 1. 技术上下文
# 2. 合宪性审查（逐条检查 constitution.md）
# 3. 数据结构设计
# 4. 接口设计
# 5. 风险评估

# 获取 AI 帮助审查方案
# "请审查 plan-your-feature.md 的合宪性"
```

**输出**：`plan-your-feature.md`

---

#### 阶段 3: 任务分解（Tasks）
```bash
# 复制模板
cp tasks-template.md tasks-your-feature.md

# 编辑 tasks-your-feature.md，将 plan 拆解为原子任务
# 按 Phase 组织，标记依赖关系和并行机会

# 任务结构示例：
# Phase 1: Foundation
#   - T001 - 创建模块目录
#   - T002 (TEST) - 定义 DTO
#   - T003 (IMPL) - 实现验证逻辑
```

**输出**：`tasks-your-feature.md`

---

#### 阶段 4: TDD 实现（Implementation）
```bash
# 从 tasks.md 按顺序执行任务

# 每个任务遵循 Red-Green-Refactor：
# 1. RED: 写失败的测试
npm run test -- your-feature.spec.ts  # 确认失败

# 2. GREEN: 最小实现让测试通过
# 编写代码...
npm run test -- your-feature.spec.ts  # 确认通过

# 3. REFACTOR: 优化代码
# 重构...
npm run test -- your-feature.spec.ts  # 确认仍通过

# 4. 提交
git add .
git commit -m "feat(scope): implement feature X

详细描述...

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

#### 阶段 5: 代码审查（Review）
```bash
# 使用 review-code 命令
/review-code path/to/your/code

# 或请 AI 审查
# "请根据 constitution.md 审查我的代码"

# 修复所有高优先级问题后提交 PR
gh pr create --title "feat: Add your feature" --body "..."
```

---

### Bug 修复流程

```bash
# 1. 定位问题
# "帮我定位 Bug：[描述症状]"

# 2. 区分类型
# - 意图偏差：回溯修改 spec.md
# - 实现偏差：直接修复代码

# 3. TDD 修复
# 3.1 写能复现 bug 的测试（RED）
# 3.2 修复代码让测试通过（GREEN）
# 3.3 重构优化（REFACTOR）

# 4. 提交
git commit -m "fix(scope): resolve issue X

- Root cause: [分析]
- Fix: [方案]

Fixes #123"
```

---

## 🛠️ 配置示例

### .claude/settings.json（项目级共享配置）

```json
{
  "model": "sonnet",
  "hooks": {
    "postToolUse": {
      "enabled": true,
      "script": ".claude/hooks/post-tool-use-format.sh"
    },
    "preToolUse": {
      "enabled": true,
      "script": ".claude/hooks/pre-tool-use-protect-branch.sh"
    }
  },
  "commands": {
    "directories": [".claude/commands"]
  },
  "skills": {
    "directories": [".claude/skills"]
  }
}
```

---

## 📖 使用建议

### 何时使用模板

| 场景 | 使用文档 | 方式 |
|------|---------|------|
| 新功能开发 | spec → plan → tasks | 复制模板，填写内容 |
| Bug 修复 | constitution.md | 直接参考，快速修复 |
| 代码审查 | constitution.md + `/review-code` | 运行命令或 AI 审查 |
| 重构 | plan-template.md | 编写重构方案，审查通过后执行 |
| 了解项目 | spec.md + ARCHITECTURE.md | 阅读了解 |

---

### 文档优先级

1. **constitution.md** - 最高优先级，所有决策必须遵守
2. **CLAUDE.md** - 工作流程指南，确保流程正确
3. **spec.md** - 功能范围参考，确保不偏离需求
4. **plan/tasks templates** - 执行工具，按需使用

---

### 团队协作建议

#### 代码提交规范
```bash
# 提交信息格式
<type>(<scope>): <subject>

<body>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

# type: feat, fix, refactor, test, docs, chore
# scope: contracts, backend, frontend, infra
```

#### Code Review 检查清单
```markdown
- [ ] 是否通过合宪性审查（constitution.md）
- [ ] 是否有测试覆盖
- [ ] 是否有安全漏洞
- [ ] 命名是否清晰
- [ ] 是否有必要的注释
- [ ] 是否修改超过 3 个文件（需拆分）
```

---

## 🔧 故障排查

### 常见问题

#### Q1: Claude 不遵守 constitution.md 怎么办？
**A**: 在对话开始时明确提醒：
```
"请先阅读 constitution.md，所有代码必须遵守其中的规范"
```

#### Q2: 如何让 Hooks 生效？
**A**:
```bash
# 1. 确保脚本可执行
chmod +x .claude/hooks/*.sh

# 2. 配置 .claude/settings.json
# 参考上方配置示例

# 3. 验证配置
cat .claude/settings.json
```

#### Q3: Slash Commands 不工作？
**A**:
```bash
# 1. 检查文件路径
ls .claude/commands/

# 2. 检查文件格式（必须是 markdown）
file .claude/commands/*.md

# 3. 重启 Claude Code
```

---

## 📝 维护指南

### 更新文档流程

1. **修改文档内容**
2. **更新文档版本号**
3. **记录变更到 CHANGELOG**
4. **通知团队成员**

### 文档版本管理

所有核心文档应包含版本信息：
```markdown
**版本**：v1.0
**最后更新**：YYYY-MM-DD
**维护者**：[姓名]
```

---

## 🎓 学习资源

### 推荐阅读顺序

**第 1 天**：
1. constitution.md（30 分钟）
2. CLAUDE.md 的前半部分（30 分钟）
3. spec.md 浏览（20 分钟）

**第 2 天**：
1. CLAUDE.md 的后半部分（30 分钟）
2. 实践：跟着 tasks-template.md 创建一个简单任务（1 小时）

**第 3 天**：
1. 阅读 plan-template.md（20 分钟）
2. 实践：尝试使用 `/create-feature` 创建一个小功能（1.5 小时）

---

## 🤝 贡献指南

### 改进建议

如果你发现文档有改进空间：

1. 创建 Issue 描述问题
2. 提交 PR 附上改进方案
3. 等待 Code Review 和合并

### 新增 Command/Skill

1. 在对应目录创建文件
2. 遵循现有格式
3. 添加详细注释
4. 更新本 README

---

**文档版本**：v1.0
**创建日期**：2026-01-15
**维护者**：DEX Project Team
**反馈渠道**：GitHub Issues
