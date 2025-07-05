# create-task-plan

Create a detailed, context-aware implementation plan for a specific task.

## Usage

```
/create-task-plan <phase-number> <task-number>
```

Example:
```
/create-task-plan 6 1
/create-task-plan 6 2
/create-task-plan 7 8
```

## What this command does

1. **Extracts specific task** from the phase in roadmap
2. **Gathers all context** including dependencies and related info
3. **Creates actionable plan** with implementation assignments
4. **Includes validation** specific to the task

## Implementation

When executed, this command will:

### 1. Extract Task Context
```javascript
const roadmap = await readFile('docs/development-plan/roadmap/folder-mcp-roadmap-1.1.md');
const phase = extractPhase(roadmap, $ARGUMENTS.phaseNumber);
const task = phase.tasks[$ARGUMENTS.taskNumber - 1];
const taskName = task.name;
const taskScope = task.scope;
const completionCriteria = task.completionCriteria;
```

### 2. Generate Task Plan

Create file in: `docs/development-plan/roadmap/Phase-{phase}-Task-{number}-{name}.md`

```markdown
# Task [Phase].[Number]: [Task Name]

**Phase**: [X] - [Phase Name]  
**Status**: 🚧 IN PROGRESS  
**Created**: [Current Date]  
**Complexity**: [Auto-determined from scope]  

## 🎯 **Task Objective**

[Goal from roadmap task]

## 📋 **Scope**

[All scope items from roadmap task, formatted as checklist]
- [ ] [Scope item 1]
- [ ] [Scope item 2]
- [ ] [Scope item 3]

## 📚 **MUST READ - Essential Project Context**

### From Roadmap Phase 0 - Current State
[Extract relevant "What We Have Now" items that this task builds upon]
- **[Relevant System]**: [Current capability this extends]
- **[Related Feature]**: [How it works now]

### Core Project Documentation
- **Project Goal**: [From roadmap - how this task contributes]
- **Architecture**: [Relevant architecture section from roadmap]
- **Success Metrics**: [Related metrics this impacts]

### Critical Files to Understand
1. `src/[existing-file].ts` - **why**: [Current implementation to extend/modify]
2. `src/[another-file].ts` - **why**: [Integration point or pattern to follow]
3. `tests/[test-file].test.ts` - **why**: [Testing patterns in use]
4. `[completed-phase-doc].md` - **why**: [Lessons learned or patterns established]

## 🔗 **Dependencies & Related Work**

### Prerequisite Tasks
- **Phase [X] Task [Y]**: [What was implemented] - See `Phase-X-Task-Y-[name].md`
  - Key outcome: [What this provided that we need]
  - Integration point: [How this task connects]

### Current System Dependencies
- **[Component/System]**: Located at `src/[path]`
  - Current responsibility: [What it does]
  - How this task affects it: [Changes needed]

### Task Sequence
- **Previous Task**: [What was just completed] - [What it provided]
- **This Task**: [Current focus] - [What it adds]
- **Next Task**: [What comes after] - [What this enables for it]

### Future Dependencies
- **Enables Phase [X]**: [What future work this unblocks]
- **Required by**: [Future features that depend on this]

## 📍 **Context from Roadmap**

### User Stories (Related)
[User stories that this task addresses]

### Configuration Integration (if applicable)
```yaml
# Relevant configuration section this task affects
[Configuration snippet from roadmap]
```

### Technical Constraints
- [Any constraints mentioned in roadmap]
- [Performance requirements]
- [Compatibility needs]

## 🚨 **Safety Framework**

### **Task Backup**
```powershell
# Create task-specific branch
git checkout -b task/phase-[X]-[task-number]-[task-name-kebab]
git add -A && git commit -m "Starting Task [X].[N]: [Task Name]"
```

### **Validation Commands**
```powershell
# Run after each assignment
npm run build && npm test
git add -A && git commit -m "Task [X].[N]: [Current step] completed"
```

## 🔧 **Implementation Assignments**

### Assignment 1: [First Logical Step]
**Goal**: [What this assignment accomplishes]

**Steps**:
1. [ ] [Specific action with file path]
   ```typescript
   // In src/[specific-file].ts
   [Code structure to implement]
   ```

2. [ ] [Next specific action]
   - File: `src/[path]/[file].ts`
   - Action: [What to do]
   - Note: [Any special consideration]

3. [ ] [Validation step]
   ```bash
   npm test -- tests/unit/[specific-test]
   # Expected: [What should happen]
   ```

**Completion Criteria**:
- [ ] Code compiles without errors
- [ ] Specific test passes
- [ ] [Other criteria]

---

### Assignment 2: [Next Logical Step]
**Goal**: [What this accomplishes]

[Continue pattern...]

---

### Assignment 3: [Integration/Polish Step]
**Goal**: [Final integration and validation]

[Final steps...]

## ✅ **Task Completion Criteria**

From roadmap:
[All completion criteria as checkboxes]
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

Additional requirements:
- [ ] All assignments completed
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] Proper DI patterns used
- [ ] Documentation updated (if needed)

## 🧪 **Testing Requirements**

### New Tests to Add
```typescript
// tests/unit/[feature]/[test-name].test.ts
describe('[Feature]', () => {
  test('[specific behavior]', () => {
    // Test implementation
  });
});
```

### Existing Tests to Update
- [ ] [Test file] - [What to update]

### Manual Testing
1. [Manual test scenario 1]
2. [Manual test scenario 2]

## 📊 **Progress Tracking**

### Assignment Status
- [ ] Assignment 1: [Name] - Not Started
- [ ] Assignment 2: [Name] - Not Started  
- [ ] Assignment 3: [Name] - Not Started

### Time Tracking
| Assignment | Estimated | Actual | Notes |
|------------|-----------|--------|-------|
| Setup | 30m | - | - |
| Assignment 1 | 2h | - | - |
| Assignment 2 | 3h | - | - |
| Assignment 3 | 1h | - | - |
| **Total** | **6.5h** | **-** | **-** |

## 🔍 **Quick Reference**

### Key Files
- Main implementation: `src/[primary-file].ts`
- Tests: `tests/unit/[test-file].test.ts`
- Config (if applicable): `src/config/[config-file].ts`

### Key Commands
```bash
# Build
npm run build

# Test specific feature
npm test -- tests/unit/[feature]

# Run in dev mode
npm run dev

# Check everything
npm run build && npm test
```

### Common Issues
- **TypeScript errors**: Check `tsconfig.json` settings
- **Test failures**: Ensure following project patterns
- **Build issues**: Clear `dist/` and rebuild

## 📝 **Notes Section**

[Space for implementation notes as you work]

---

## 📝 **Notes Section**

[Space for implementation notes as you work]

---

**To execute this plan with proper validation and DI enforcement:**
```
/execute-prp docs/development-plan/roadmap/Phase-X-Task-Y-[name].md
```
```

### 3. Intelligent Assignment Generation

The command will:
- Break down scope items into logical implementation steps
- **ENFORCE DI PATTERN** in every service creation
- Order assignments by dependency
- Include interface definition before implementation
- Ensure each assignment is independently testable
- Include specific file paths following module structure
- Add DI container registration for every service
- Include DI validation commands in each assignment

**Every assignment creating a service will include:**
1. Interface definition (domain layer)
2. Implementation with constructor DI (application/infrastructure)
3. DI container registration
4. Unit tests using mocked dependencies
5. Validation commands to verify DI pattern

### 4. Output Summary

After generation, display:
- Task name and number
- Number of assignments generated
- Estimated time (based on scope)
- First assignment to start with