# next-please

Intelligently determine and prepare the next action in the development workflow by analyzing task state, codebase changes, and progress.

## Usage

```
/next-please
```

## Workflow Context

This command works within the simplified 2-command linear workflow:
1. `/create-phase-plan [phase]` → Creates `Phase-{number}-{name-kebab-case}-plan.md` (auto-archives previous phase)
2. `/create-task-plan [phase] [task]` → Creates `Phase-{phase}-Task-{number}-{name-kebab}.md` with embedded execution guidance

**Key Change**: No separate execution command needed. Task plans contain all execution guidance embedded within assignments.

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

### 2. **Analyze Task Plan Progress (Living Document)**

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

### Implementation Discoveries & Decision Log
- 🎯 Key Decisions Made & Rationale - Recent implementation decisions
- 🐰 Rabbit Holes & Problem-Solving - Current challenges being worked on
- 🏗️ Architecture & DI Insights - Technical discoveries
- 📚 Unexpected Discoveries - Things learned during implementation

Check if populated - indicates active work has been done
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

#### **State A: Mid-Assignment Work in Progress**

Indicators:
- Uncommitted changes matching current assignment files
- Assignment not marked with ✅ COMPLETED
- Sub-tasks partially checked
- Implementation Discoveries & Decision Log shows recent work

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
Based on Implementation Discoveries & Decision Log:
- **Last completed**: [Sub-task X.Y from ✅ markers]
- **Currently working on**: [Sub-task X.Z from uncommitted files]
- **Recent decisions**: [From Key Decisions Made & Rationale]
- **Current challenges**: [From Rabbit Holes & Problem-Solving]

### ⏭️ Next Steps:
1. [ ] [Specific next step based on current sub-task from task plan]
2. [ ] [Address any build errors if present]
3. [ ] [Run relevant tests based on task type]
4. [ ] Update Implementation Discoveries & Decision Log with progress
5. [ ] Mark assignment complete with ✅ when done
6. [ ] Continue to next assignment or commit when task complete

**Ready to continue with Assignment [X]?**
```

#### **State B: Ready for Next Assignment**

Indicators:
- Last assignment marked ✅ COMPLETED
- Clean git status OR only documentation changes uncommitted  
- More assignments remain in task plan

```markdown
## ✅ Assignment [X] Complete → Start Assignment [X+1]

**Task**: Phase [P] Task [T] - [Task Name]
**Progress**: [X]/[Total] assignments complete

### 📋 Assignment [X+1]: [Assignment Name]
**Goal**: [Goal from task plan]
**Estimated Time**: [X hours]

#### 🚨 MANDATORY DI PATTERN FOR THIS ASSIGNMENT:
[Copy DI pattern requirements from task plan]

#### Sub-tasks:
[Copy full assignment details from task plan including validation checklist]

### ✓ Pre-flight Check:
- Build passing: ✅
- Previous assignment marked ✅ COMPLETED: ✅
- Implementation ready to continue: ✅

### ⏭️ Start Assignment [X+1]:
Follow the assignment guidance above directly from your task plan. All DI patterns, validation steps, and completion criteria are embedded in the assignment.

**Ready to start Assignment [X+1]?**
```

#### **State C: Task Complete, Need Next Task**

Indicators:
- All assignments marked ✅ COMPLETED
- Time Tracking shows all "Complete"
- Implementation Discoveries & Decision Log populated with learnings
- More tasks exist in phase plan

```markdown
## 🎯 Task [T] Complete → Create Task [T+1] Plan

**Completed**: Phase [P] Task [T] - [Task Name]
**Next**: Phase [P] Task [T+1] - [Next Task Name]

### ✓ Task Completion Verification:
- All [X] assignments: ✅ COMPLETED
- Build passing: ✅
- Implementation Discoveries updated: ✅
- Key decisions documented: ✅

### 📋 Management-Style Task Summary:
**What Was Accomplished**: [From Implementation Discoveries]
**Key Decisions Made**: [From Decision Log]
**Architecture Insights**: [From DI Insights section]
**Lessons Learned**: [From Unexpected Discoveries]

### 🚀 Next Task from Phase Plan:
**Task [T+1]: [Name]**
Goal: [Goal from phase plan]
Scope: [Number] items

**Command to create next task plan:**
```
/create-task-plan [P] [T+1]
```

**Ready to create plan for Task [T+1]?**
```

#### **State D: Phase Complete, Ready for Next Phase**

Indicators:
- All tasks in Phase Completion Log show ✅
- No more tasks in phase plan
- Phase Success Criteria met
- All task Implementation Discoveries populated

```markdown
## 🎉 Phase [P] Complete → Start Phase [P+1]

**Completed Phase**: Phase [P] - [Phase Name]
**All [N] Tasks**: ✅ COMPLETE

### 📋 Phase Completion Summary:
**Major Accomplishments**: [From completed task summaries]
**Architecture Decisions**: [Key DI patterns and boundaries established]
**Lessons Learned**: [Critical insights for future phases]
**Technical Debt**: [Items to address in future phases]

### 🚀 Start Next Phase:
**Phase [P+1]: [Name from roadmap]**

**Command to create next phase plan (will auto-archive Phase [P]):**
```
/create-phase-plan [P+1]
```

**Note**: The create-phase-plan command will automatically:
1. Validate Phase [P] is 100% complete
2. Archive Phase [P] documents to completed/phase-[P]/
3. Create clean Phase [P+1] plan in currently-implementing/

**Ready to start Phase [P+1]?**
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