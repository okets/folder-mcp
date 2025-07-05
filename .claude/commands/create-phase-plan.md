# create-phase-plan

Create a high-level phase implementation plan from the folder-mcp roadmap.

## Usage

```
/create-phase-plan <phase-number>
```

Example:
```
/create-phase-plan 6
/create-phase-plan 7
```

## What this command does

1. **Extracts entire phase** from `folder-mcp-roadmap-1.1.md`
2. **Creates phase overview** with all tasks listed
3. **Applies safety framework** from IMPLEMENTATION-METHODOLOGY
4. **Generates trackable structure** for phase execution

## Implementation

When executed, this command will:

### 1. Extract Phase Information
```javascript
const roadmap = await readFile('docs/development-plan/roadmap/folder-mcp-roadmap-1.1.md');
const phase = extractPhase(roadmap, $ARGUMENTS.phaseNumber);
const phaseName = phase.name; // e.g., "Configuration Foundation & CLI/TUI Parity"
const tasks = phase.tasks; // All tasks in the phase
const userStories = phase.userStories;
const successCriteria = phase.successCriteria;
```

### 2. Generate Phase Plan

Create file in: `docs/development-plan/roadmap/Phase-{number}-{name}-plan.md`

```markdown
# Phase [X]: [Phase Name] Implementation Plan

**Status**: 📋 PLANNED  
**Start Date**: [Current Date]  
**Target Completion**: [Estimated based on task count]  

## 🎯 **Phase Overview**

[Phase description from roadmap]

### **User Stories**
[All user stories for this phase]

### **Success Criteria**
[Phase-level success criteria from roadmap]

## 📍 **Current System State**

### What We Have (Foundation)
[Relevant items from Phase 0 current state]

### What This Phase Adds
[All new capabilities from roadmap]

## 🚨 **Safety Framework**

### **Backup Strategy**
```powershell
# Create backup branch before starting Phase [X]
git checkout -b backup/pre-phase-[X]
git add -A
git commit -m "Backup before Phase [X]: [Phase Name]"

# Create phase branch  
git checkout -b phase-[X]-implementation
```

### **Rollback Plan**
```powershell
# If major issues arise, return to backup
git checkout backup/pre-phase-[X]
git checkout -b phase-[X]-retry
```

## 📋 **Phase Tasks Overview**

Total Tasks: [X]
Estimated Duration: [Y weeks/days]

| Task # | Task Name | Complexity | Status | Command |
|--------|-----------|------------|--------|---------|
| 1 | [Task 1 Name] | [Low/Medium/High] | ⏳ Pending | `/create-task-plan [phase] 1` |
| 2 | [Task 2 Name] | [Low/Medium/High] | ⏳ Pending | `/create-task-plan [phase] 2` |
| ... | ... | ... | ... | ... |

## 🎯 **Implementation Order**

### Sequential Execution Plan:
1. **[Task X]** - Foundation task, creates base for others
2. **[Task Y]** - Builds on Task X, adds [capability]
3. **[Task Z]** - Requires Y complete, extends with [feature]
[... continue for all tasks ...]

### Task Dependencies:
- Task order defines dependencies (Task 2 depends on Task 1, etc.)
- Each task assumes all previous tasks are complete
- No parallel execution - pure linear progress
- Clear handoff points between tasks
- Measurable progress: X/Y tasks = Z% complete

## 📊 **Phase Progress Tracking**

### **Overall Status**
- [ ] Phase backup created
- [ ] Phase documentation reviewed
- [ ] All task plans generated
- [ ] Task 1: [Name] - Not Started
- [ ] Task 2: [Name] - Not Started
- [ ] Task 3: [Name] - Not Started
[... all tasks ...]

### **Phase Metrics**
| Metric | Target | Current | Status | Progress |
|--------|--------|---------|--------|----------|
| Tasks Completed | [X] | 0 | 🔴 | 0% |
| Test Coverage | 80%+ | - | ⏳ | - |
| Documentation | Complete | - | ⏳ | - |
| Time Elapsed | [Y] days | 0 | ⏳ | 0% |

### **Linear Progress Bar**
```
[□□□□□□□□□□□□□□□□□□□□] 0/[X] Tasks (0%)
```

### **Phase Completion Log**
| Milestone | Date | Notes |
|-----------|------|-------|
| Phase Started | - | - |
| First Task Complete | - | - |
| 50% Complete | - | - |
| All Tasks Complete | - | - |
| Phase Review | - | - |

## 🔍 **Phase-Specific Context**

### Phase-Wide Requirements
- **All code must use Dependency Injection** - no exceptions
- **No TypeScript errors** - every task must build cleanly
- **Human verification required** - for every task completion

### Configuration Principles (if applicable)
[Any phase-wide principles from roadmap]

### Technical Constraints
[Phase-level constraints or requirements]

### Integration Points
[How this phase connects to the rest of the system]

## ✅ **Phase Validation**

### Build Validation
```bash
npm run build
# Expected: 0 errors after phase completion
```

### Test Suite Validation
```bash
npm test
# Expected: All existing tests pass + new tests added
```

### Feature Validation
[Phase-specific validation commands]

## 📝 **Phase Completion Checklist**

Before marking this phase complete:
- [ ] All tasks completed and validated
- [ ] No regression in existing functionality  
- [ ] Documentation updated
- [ ] Tests added for new features
- [ ] Phase review conducted
- [ ] Next phase dependencies satisfied

## 🚀 **Next Steps**

After completing this phase:
1. Run `/create-phase-plan [X+1]` for next phase
2. Conduct phase retrospective
3. Update roadmap with actual timings

---

**To implement individual tasks, use:**
```
/create-task-plan [phase-number] [task-number]
```
```

### 3. Output Summary

After generation, display:
- Phase name and number
- Total tasks identified
- Estimated complexity
- Suggested first task to implement