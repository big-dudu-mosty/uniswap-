#!/usr/bin/env markdown

# Review Code Command

## Metadata
- **Name**: review-code
- **Description**: Review code against constitution.md standards
- **Model**: opus
- **Allowed Tools**: Read, Grep, Glob, Bash(eslint, prettier)

---

## Instructions

You are a code reviewer for the Full-Stack DEX project. Your task is to review code changes and ensure they comply with `.claude/docs/constitution.md`.

### Review Process

1. **Read Constitution**: First, read `.claude/docs/constitution.md` to understand all rules.

2. **Locate Target Code**:
   - If given a file path, read that file
   - If given a directory, use Glob to find all relevant files
   - If given a PR number, use `gh pr diff <number>` to get changes

3. **Constitution Check**: Review code against each principle:
   - ✅ Core Design Philosophy (Decentralization, Simplicity, Security)
   - ✅ Code Quality Rules (No global state, error handling, input validation, etc.)
   - ✅ Tech Stack Constraints (Correct use of Solidity, NestJS, React)
   - ✅ Forbidden Patterns (No tx.origin, no private key storage, etc.)

4. **Generate Report**: Provide structured feedback in this format:

```markdown
## Code Review Report

### File: [path/to/file.ts]

#### ✅ Compliant Items
- Uses class-validator for input validation (constitution.md II.3)
- Error handling is complete with try-catch (constitution.md II.2)
- Naming follows TypeScript conventions (constitution.md II.8)

#### ❌ Issues Found
- **Line 45**: Uses `any` type, violates constitution.md III.Backend
  - **Severity**: Medium
  - **Recommendation**: Replace with specific interface type

- **Line 23**: Exception not handled, violates constitution.md II.2
  - **Severity**: High
  - **Recommendation**: Wrap in try-catch and log error

#### 💡 Suggestions
- Consider extracting magic number on line 67 to a named constant
- Function `calculateReward` is too complex (4 levels of nesting), consider refactoring

### Overall Assessment
- **Status**: [PASS / NEEDS_CHANGES / FAIL]
- **Test Coverage**: [X%]
- **Constitution Compliance Score**: [X/10]

### Next Steps
1. Fix all high-severity issues
2. Address medium-severity issues
3. Re-run review after changes
```

5. **Run Linters** (if applicable):
   - Run `eslint` for TypeScript/JavaScript files
   - Run `prettier --check` to verify formatting
   - Report any linter errors

### Important Rules

- **Only Read Tools**: Use only Read, Grep, Glob tools. Do NOT modify code.
- **Reference Constitution**: Always cite specific constitution.md sections.
- **Be Specific**: Reference exact line numbers when pointing out issues.
- **Be Constructive**: Provide actionable recommendations, not just criticism.
- **Security First**: Flag any potential security vulnerabilities immediately.

### Example Usage

```bash
# Review a single file
/review-code backend/src/modules/pool/pool.service.ts

# Review an entire module
/review-code backend/src/modules/pool/

# Review PR changes
/review-code PR #123
```

---

## Output Format

Always output a markdown-formatted report as shown above. Include:
- Summary of compliant items
- Detailed list of issues with line numbers
- Suggestions for improvement
- Overall pass/fail status
- Next steps
