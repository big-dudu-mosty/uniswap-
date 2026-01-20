# Code Quality Reviewer Skill

## Skill Metadata
- **Name**: code-quality-reviewer
- **Description**: Automatically review code for quality issues and constitution violations
- **Version**: 1.0.0
- **Allowed Tools**: Read, Grep, Glob, Bash(eslint, prettier)

---

## Skill Capabilities

This skill provides automatic code quality review for the Full-Stack DEX project. It can:

1. Detect common code smells and anti-patterns
2. Check compliance with .claude/docs/constitution.md
3. Verify naming conventions
4. Identify security vulnerabilities
5. Check test coverage
6. Suggest refactoring opportunities

---

## Trigger Conditions

This skill should be automatically invoked when:

- User mentions: "review my code", "check code quality", "is this code good"
- User asks: "any issues with this code?", "does this follow best practices?"
- User commits code and asks for feedback
- User opens a PR and requests review

**Keywords**: review, quality, check, analyze, audit, lint, validate, verify

---

## Execution Instructions

### 1. Initialize Review

First, read the project constitution to understand all rules:

```bash
Read .claude/docs/constitution.md
```

### 2. Locate Target Code

Determine what code to review:

- If user provided file path: Read that specific file
- If user mentioned "my latest changes": Use `git diff` to find changed files
- If user said "this file": Look at the context to identify the file
- If ambiguous: Ask user to specify

### 3. Perform Multi-Layered Analysis

#### Layer 1: Constitution Compliance
Check against all .claude/docs/constitution.md rules:

- **Core Philosophy**:
  - ✅ No private key storage in frontend
  - ✅ Backend is read-only (no transaction execution)
  - ✅ Simplicity over abstraction

- **Code Quality**:
  - ✅ No global mutable state
  - ✅ All errors handled in current scope
  - ✅ Input validation on all external interfaces
  - ✅ Naming conventions followed
  - ✅ Max 3 files changed per commit

#### Layer 2: Language-Specific Best Practices

**For Solidity**:
- Check for reentrancy vulnerabilities
- Verify use of `require()`/`revert()` for errors
- Check for integer overflow (should use 0.8.20+ built-in checks)
- Verify event emission for state changes
- Check use of `tx.origin` (forbidden)

**For TypeScript/NestJS**:
- Check for `any` types (avoid unless justified)
- Verify use of `class-validator` decorators
- Check proper dependency injection
- Verify async/await patterns
- Check error handling in try-catch blocks

**For React**:
- Check proper use of hooks (no hooks in conditions)
- Verify state management patterns
- Check for proper cleanup (useEffect return)
- Verify prop types defined
- Check for missing dependencies in useEffect

#### Layer 3: Security Scan
- SQL injection risks
- XSS vulnerabilities
- CSRF protection
- Sensitive data exposure
- Insecure dependencies

#### Layer 4: Performance Analysis
- Unnecessary re-renders (React)
- Missing indexes (database queries)
- Missing caching opportunities
- Inefficient algorithms

#### Layer 5: Test Coverage
- Check if test file exists
- Verify test coverage for new functions
- Check test quality (meaningful assertions)

### 4. Run Automated Tools

Execute linters and formatters:

```bash
# For TypeScript files
eslint [file-path] --format json

# For formatting
prettier --check [file-path]
```

### 5. Generate Comprehensive Report

Output a structured review report:

```markdown
## 🔍 Code Quality Review Report

### 📄 File: [path/to/file]
**Lines of Code**: [X]
**Last Modified**: [timestamp]
**Test Coverage**: [X%]

---

### ✅ Strengths (What's Good)
- Proper error handling with try-catch blocks
- Clear naming conventions followed
- Input validation using class-validator
- Comprehensive test coverage (>80%)

---

### ❌ Critical Issues (Must Fix)
#### Issue #1: Unhandled Promise Rejection
- **Location**: `line 45`
- **Severity**: 🔴 High
- **Rule Violated**: .claude/docs/constitution.md II.2 (Error handling)
- **Current Code**:
  ```typescript
  const result = await someAsyncOperation();
  ```
- **Problem**: No error handling for failed async operation
- **Fix**:
  ```typescript
  try {
    const result = await someAsyncOperation();
  } catch (error) {
    this.logger.error('Operation failed', error);
    throw new BadRequestException('Failed to process request');
  }
  ```

#### Issue #2: Use of `any` Type
- **Location**: `line 67`
- **Severity**: 🟡 Medium
- **Rule Violated**: .claude/docs/constitution.md III.Backend (Type safety)
- **Current Code**:
  ```typescript
  function processData(data: any) { ... }
  ```
- **Problem**: Loses type safety benefits
- **Fix**:
  ```typescript
  interface DataPayload {
    id: string;
    value: number;
  }
  function processData(data: DataPayload) { ... }
  ```

---

### ⚠️ Warnings (Should Fix)
1. **Line 89**: Function complexity is high (cyclomatic complexity: 12)
   - Consider breaking into smaller functions

2. **Line 102**: Magic number detected
   - Extract `0.003` to a named constant `TRADING_FEE = 0.003`

3. **Line 125**: Console.log in production code
   - Replace with proper logger

---

### 💡 Suggestions (Nice to Have)
1. **Line 34**: Consider using optional chaining
   ```typescript
   // Current
   if (user && user.profile && user.profile.email) { ... }

   // Better
   if (user?.profile?.email) { ... }
   ```

2. **Line 78**: Opportunity for memoization
   - This calculation could be cached with useMemo

---

### 🔒 Security Analysis
- ✅ No SQL injection risks (using ORM)
- ✅ Input validation present
- ✅ No hardcoded secrets
- ⚠️ Missing rate limiting on this endpoint
- ⚠️ CORS configuration could be more restrictive

---

### 📊 Metrics
- **Lines of Code**: 156
- **Functions**: 8
- **Complexity**: Average 6.5 (Good < 10)
- **Test Coverage**: 45% ⚠️ (Target: 80%)
- **Constitution Compliance**: 7/10 ⚠️

---

### 🎯 Action Items (Priority Order)
1. 🔴 Fix unhandled promise rejection (line 45)
2. 🔴 Add error handling to API endpoint (line 23)
3. 🟡 Replace `any` types with interfaces
4. 🟡 Add rate limiting
5. 🟢 Improve test coverage from 45% to 80%
6. 🟢 Extract magic numbers to constants
7. 🟢 Refactor complex function at line 89

---

### ✅ Overall Assessment
- **Status**: ⚠️ NEEDS IMPROVEMENT
- **Constitution Compliance**: 70%
- **Security Score**: 8/10 (Good)
- **Code Quality**: 6/10 (Needs Work)

**Recommendation**: Address all critical issues before merging. Consider adding more tests to reach 80% coverage target.
```

---

## Skill Behavior

### Proactive Mode
When this skill detects code-related questions, it should:
1. Automatically activate without waiting for explicit invocation
2. Perform a quick scan
3. Provide immediate feedback
4. Offer to do a deeper analysis if user requests

### Example Activation
```
User: "I just wrote this service, does it look good?"
Skill: [Automatically activates]
       "I'll review your service for quality and constitution compliance..."
       [Performs analysis]
       [Provides detailed report]
```

---

## Skill Configuration

### Strictness Levels
- **Strict**: Flag everything including suggestions
- **Balanced** (default): Flag issues and warnings, mention suggestions
- **Lenient**: Only flag critical issues

### Focus Areas (can be toggled)
- [ ] Security
- [ ] Performance
- [ ] Testing
- [ ] Style
- [ ] Constitution Compliance (always on)

---

## Integration with Other Tools

This skill works well with:
- `/review-code` command (manual invocation)
- Git hooks (pre-commit review)
- CI/CD pipeline (automated PR review)

---

## Important Reminders

1. **Always Read Constitution First**: Every review must reference .claude/docs/constitution.md
2. **Be Specific**: Always include line numbers and code snippets
3. **Be Constructive**: Explain *why* something is an issue and *how* to fix it
4. **Prioritize Security**: Security issues are always high priority
5. **Respect Context**: Consider the stage of development (MVP vs production)

---

## Skill Version History

- **v1.0.0** (2026-01-15): Initial version with constitution-based review
