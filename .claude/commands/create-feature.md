#!/usr/bin/env markdown

# Create Feature Command

## Metadata
- **Name**: create-feature
- **Description**: Scaffold a new feature following SDD workflow (spec → plan → tasks)
- **Model**: sonnet
- **Allowed Tools**: Read, Write, Grep, Glob

---

## Instructions

You are a feature architect for the Full-Stack DEX project. Your task is to help create a new feature by following the Spec-Driven Development (SDD) workflow.

### Workflow Steps

#### Step 1: Create spec-[feature-name].md

Ask the user these questions to gather requirements:

1. **Feature Name**: What is the feature called?
2. **User Story**: Who needs this feature and why?
3. **Core Requirements**: What are the must-have functionalities?
4. **Non-Functional Requirements**: Performance, security, compatibility needs?
5. **Acceptance Criteria**: How will we know it's done?

Then create `spec-[feature-name].md` with this structure:

```markdown
# Feature Specification: [Feature Name]

## User Story
As a [role], I want [feature] so that [benefit].

## Functional Requirements

### Must Have (P0)
- [ ] Requirement 1
- [ ] Requirement 2

### Should Have (P1)
- [ ] Requirement 3

### Nice to Have (P2)
- [ ] Requirement 4

## Acceptance Criteria
1. Given [context] When [action] Then [expected result]
2. ...

## Security Considerations
- Risk 1 and mitigation
- Risk 2 and mitigation

## Non-Functional Requirements
- Performance: [target]
- Compatibility: [requirements]
- Scalability: [expectations]
```

#### Step 2: Create plan-[feature-name].md

Based on the spec, create a technical implementation plan:

1. **Read Similar Code**: Use Grep to find similar features in the codebase
2. **Identify Patterns**: Determine the appropriate architecture
3. **Design Data Structures**: Define entities, DTOs, interfaces
4. **Plan API Endpoints**: Define RESTful routes
5. **Constitution Check**: Verify compliance with .claude/docs/constitution.md

Create `plan-[feature-name].md` using the template at `.claude/templates/plan-template.md`.

#### Step 3: Create tasks-[feature-name].md

Break down the plan into atomic, testable tasks:

1. **Identify Phases**: Foundation, Backend, Frontend, Testing
2. **Create Task List**: Each task should be < 3 hours of work
3. **Mark Dependencies**: Note which tasks depend on others
4. **TDD Structure**: Ensure test tasks come before implementation tasks
5. **Parallel Opportunities**: Mark tasks that can run in parallel

Create `tasks-[feature-name].md` using the template at `.claude/templates/tasks-template.md`.

#### Step 4: Summary and Next Steps

Provide a summary:

```markdown
## Feature Scaffolding Complete ✅

### Files Created
- ✅ spec-[feature-name].md
- ✅ plan-[feature-name].md
- ✅ tasks-[feature-name].md

### Constitution Check
- [x] Complies with decentralization principles
- [x] Follows simplicity-first approach
- [x] Includes security considerations
- [x] All changes scoped to < 3 files per task

### Next Steps
1. Review spec-[feature-name].md and confirm requirements
2. Get approval on plan-[feature-name].md
3. Start executing tasks-[feature-name].md in TDD mode
4. Use `/review-code` after each phase

### Estimated Timeline
- Backend: [X] tasks
- Frontend: [Y] tasks
- Testing: [Z] tasks
- Total: [X+Y+Z] tasks (not providing time estimates, focus on scope)
```

---

## Important Rules

- **Ask Questions**: Don't assume requirements. Ask the user for clarification.
- **Reference Templates**: Always use existing templates for consistency.
- **Constitution First**: Every plan must pass constitution check before proceeding.
- **TDD Mindset**: Structure tasks in Red-Green-Refactor cycles.
- **Keep It Simple**: Follow the simplicity principle from .claude/docs/constitution.md.

---

## Example Usage

```bash
# Start scaffolding a new feature
/create-feature multi-hop-routing

# Claude will guide you through the process:
# 1. Ask clarifying questions
# 2. Create spec file
# 3. Generate plan
# 4. Break down into tasks
# 5. Provide next steps
```

---

## Output Format

Generate three markdown files in the project root:
- `spec-[feature-name].md`
- `plan-[feature-name].md`
- `tasks-[feature-name].md`

Then provide a summary as shown above.
