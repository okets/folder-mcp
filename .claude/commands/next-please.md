# next-please

Intelligently determine and prepare the next action in the development workflow by analyzing task state, codebase changes, and progress.

## Usage

```
/next-please
```

## Workflow Context

This command works within the 3-command linear workflow:
1. `/create-phase-plan [phase]` → Creates `Phase-{number}-{name-kebab-case}-plan.md`
2. `/create-task-plan [phase] [task]` → Creates `Phase-{phase}-Task-{number}-{name-kebab}.md`
3. `/execute-prp [task-plan-file]` → Executes assignments with validation

## EXACT Implementation Instructions

When this command is executed, you MUST:

### 1. **Identify Current State**

```bash
# Find all documents in currently-implementing
PHASE_PLANS=$(find docs/development-plan/roadmap/currently-implementing -name "Phase-*-plan.md" -type f | sort -V)
TASK_PLANS=$(find docs/development-plan/roadmap/currently-implementing -name "Phase-*-Task-*-*.md" -type f | grep -v "plan.md" | sort -V)

# Determine current phase from latest phase plan
CURRENT_PHASE=$(echo "$PHASE_PLANS" | tail -1 | grep -oP 'Phase-\K[0-9]+')

# Find active task plan (most recent)
ACTIVE_TASK=$(echo "$TASK_PLANS" | tail -1)
```

### 2. **Analyze Task Plan Progress**

If task plan exists, analyze these specific sections:

```markdown
## 📊 **Progress Tracking**

### Assignment Status
Look for patterns:
- [ ] Assignment 1: [Name] - Not started
- [x] Assignment 2: [Name] ✅ COMPLETED - Assignment complete
- [ ] Assignment 3: [Name] - In progress (may have sub-tasks checked)

### Time Tracking
| Assignment | Estimated | Actual | Status | Notes |
Check the Status column: Not Started/In Progress/Complete/Blocked

### Implementation Discoveries
Check if populated - indicates work has been done

### Platform-Specific Notes
Check for any platform issues encountered
```

### 3. **Analyze Git State**

```bash
# Check for uncommitted changes
git status --porcelain

# Check if current branch matches phase
git branch --show-current
# Expected: phase-{X}-implementation or similar

# Check last commit message for context
git log -1 --pretty=format:"%s"
# Look for pattern: "Task [X].[Y]: [Assignment description] completed"

# If uncommitted changes exist
git diff --name-only | head -10
# Match changed files against current assignment's file paths
```

### 4. **Determine Exact State and Next Action**

#### **State A: Mid-Assignment Work Interrupted**

Indicators:
- Uncommitted changes matching current assignment files
- Assignment not marked with ✅ COMPLETED
- Sub-tasks partially checked

```markdown
## 🔄 Resuming Assignment [X]: [Assignment Name]

**Task**: Phase [P] Task [T] - [Task Name]
**Status**: Assignment [X] of [Total] (Sub-task [Y] of [Z])

### 📁 Uncommitted Changes:
```bash
[Show git diff --name-only output]
```

### 🔨 Build Status:
```bash
npm run build
# [Show any TypeScript errors]
```

### 📍 Where You Left Off:
Based on Implementation Discoveries and changes:
- Last completed: [Sub-task X.Y]
- Currently working on: [Sub-task X.Z]
- Code changes in: [specific files]

### ⏭️ Next Steps:
1. [ ] Fix build errors in [file:line]
2. [ ] Complete sub-task [X.Z]: [description]
3. [ ] Run tests: `npm test -- tests/unit/[module]`
4. [ ] Update Implementation Discoveries section
5. [ ] Mark assignment complete with ✅
6. [ ] Commit: `git commit -m "Task [P].[T]: Assignment [X] [name] completed"`

**Ready to continue with Assignment [X]?**
```

#### **State B: Assignment Just Completed**

Indicators:
- Clean git status OR uncommitted changes are test/docs
- Last assignment marked ✅ COMPLETED
- More assignments remain

```markdown
## ✅ Assignment [X] Complete → Start Assignment [X+1]

**Task**: Phase [P] Task [T] - [Task Name]
**Progress**: [X]/[Total] assignments complete

### 📋 Assignment [X+1]: [Assignment Name]
**Goal**: [Goal from task plan]
**Estimated Time**: [X hours]

#### Sub-tasks:
[Copy full assignment details from task plan]

### ✓ Pre-flight Check:
- Build passing: ✅
- Tests passing: ✅ 
- Previous work committed: ✅
- Ready to start: ✅

**Command to continue:**
```
/execute-prp docs/development-plan/roadmap/currently-implementing/Phase-[P]-Task-[T]-[name].md
```

**Confirm: Start Assignment [X+1]?**
```

#### **State C: Task Complete, Need Next Task**

Indicators:
- All assignments marked ✅ COMPLETED
- Time Tracking shows all "Complete"
- More tasks exist in phase plan

```markdown
## 🎯 Task [T] Complete → Create Task [T+1] Plan

**Completed**: Phase [P] Task [T] - [Task Name]
**Next**: Phase [P] Task [T+1] - [Next Task Name]

### ✓ Task Completion Verification:
- All [X] assignments: ✅
- Build passing: ✅
- Tests passing: ✅
- Documentation updated: [Check]
- Task committed: [Check last commit]

### 📋 Next Task from Phase Plan:
**Task [T+1]: [Name]**
Goal: [Goal from phase plan]
Scope: [Number] items

**Command to create next task plan:**
```
/create-task-plan [P] [T+1]
```

**Confirm: Create plan for Task [T+1]?**
```

#### **State D: Phase Complete, Archive and Continue**

Indicators:
- All tasks in Phase Completion Log show ✅
- No more tasks in phase plan
- Phase Success Criteria met

```markdown
## 🎉 Phase [P] Complete → Archive & Start Phase [P+1]

**Completed Phase**: Phase [P] - [Phase Name]
**All [N] Tasks**: ✅ COMPLETE

### 📦 Archive Actions:
1. Move completed documents:
```bash
mkdir -p docs/development-plan/roadmap/completed/phase-[P]
mv docs/development-plan/roadmap/currently-implementing/Phase-[P]-*.md \
   docs/development-plan/roadmap/completed/phase-[P]/
```

2. Update Phase Completion Log with final notes

3. Commit phase completion:
```bash
git add -A
git commit -m "Phase [P]: [Name] completed - all [N] tasks done"
```

### 🚀 Start Next Phase:
**Phase [P+1]: [Name from roadmap]**

**Command to create phase plan:**
```
/create-phase-plan [P+1]
```

**Confirm: Archive Phase [P] and create Phase [P+1] plan?**
```

### 5. **Handle Edge Cases**

#### **State E: No Task Plan but Phase Plan Exists**

```markdown
## 📋 No Active Task - Start First Task

**Current Phase**: Phase [P] - [Phase Name]
**Phase Status**: No tasks started

### Available Tasks:
[List all tasks from phase plan with their status]

**Recommended: Start with Task 1**
```
/create-task-plan [P] 1
```
```

#### **State F: Conflicting/Unclear State**

```markdown
## ⚠️ Ambiguous State Detected

### Issues Found:
- [ ] Git changes don't match current assignment paths
- [ ] Assignment marked complete but has uncommitted changes
- [ ] Build errors in unrelated modules

### 🔍 Manual Review Needed:
1. Current assignment claims: [Assignment X]
2. Git changes suggest: [Different work]
3. Last commit was: [commit message]

### Recommended Actions:
1. [ ] Stash unrelated changes: `git stash save "unrelated work"`
2. [ ] Fix build errors
3. [ ] Manually verify assignment status
4. [ ] Update task plan to reflect reality
```

### 6. **Final Confirmation Format**

Always end with a clear confirmation request:

```markdown
---
## 🤔 Confirmation Required

**Detected State**: [State name]
**Recommended Action**: [Specific action]
**Command to Run**: `[exact command]`

**Is this analysis correct? (yes/no)**
If no, please describe what's incorrect.
```

## Implementation Details

### File Naming Patterns
- Phase plans: `Phase-{number}-{name-kebab-case}-plan.md`
- Task plans: `Phase-{phase}-Task-{number}-{name-kebab}.md`
- Pattern example: `Phase-6-Task-1-Configuration-System-Foundation.md`

### Progress Indicators to Check
1. **Assignment checkboxes**: `- [x]` means complete
2. **Status column**: "Complete" vs "In Progress"
3. **✅ COMPLETED** marker on assignments
4. **Implementation Discoveries**: Populated = work done
5. **Git commit patterns**: `Task [X].[Y]: Assignment [Z] completed`

### Key Sections in Documents

**Phase Plan Sections**:
- `## 📋 **Phase Tasks Overview**` - List of all tasks
- `### **Phase Completion Log**` - Task completion tracking
- `| Task | Status | Completion Date | Key Decisions/Findings |`

**Task Plan Sections**:
- `## 🔧 **Implementation Assignments**` - All assignments
- `## 📊 **Progress Tracking**` - Current status
- `### Assignment Status` - Checkbox list
- `### Time Tracking` - Table with Status column
- `### Implementation Discoveries` - Updated during work

## Success Criteria

The command succeeds when:
- ✅ Correctly identifies if in phase plan or task plan state
- ✅ Accurately counts completed vs remaining assignments
- ✅ Correlates git changes with current assignment
- ✅ Provides exact command for next action
- ✅ Handles all edge cases gracefully
- ✅ Always requests human confirmation

## Example Outputs

### Example: Mid-Assignment
```
/next-please

🔄 Resuming Assignment 4: Implement Configuration Validation

Task: Phase 6 Task 1 - Configuration System Foundation
Status: Assignment 4 of 9 (Sub-task 2 of 3)

📁 Uncommitted Changes:
src/application/config/validation/EnhancedValidator.ts
src/application/config/validation/ErrorFormatter.ts
tests/unit/config/validation/enhanced-validator.test.ts

🔨 Build Status:
ERROR in src/application/config/validation/ErrorFormatter.ts:45:3
';' expected.

📍 Where You Left Off:
Based on Implementation Discoveries and changes:
- Last completed: 4.1 Create enhanced validator ✓
- Currently working on: 4.2 Create error formatter
- Code changes in: ErrorFormatter.ts (has syntax error)

⏭️ Next Steps:
1. [ ] Fix syntax error at line 45
2. [ ] Complete sub-task 4.2: Create error formatter
3. [ ] Run tests: `npm test -- tests/unit/config/validation`
4. [ ] Complete sub-task 4.3: Add validation tests
5. [ ] Mark assignment complete with ✅
6. [ ] Commit: `git commit -m "Task 6.1: Assignment 4 validation system completed"`

Ready to continue with Assignment 4? (yes/no)
```