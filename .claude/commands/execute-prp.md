# execute-prp

Execute a PRP (Problem-Resolution Plan) with proper DI enforcement, validation, and progress tracking. Intelligently handles both fresh starts and partial task continuation.

## Usage

```
/execute-prp <plan-file>
```

Example:
```
/execute-prp docs/development-plan/roadmap/Phase-6-Task-1-Configuration-System.md
```

## What this command does

1. **Analyzes current task state** (fresh, partial, or complete)
2. **Loads the PRP** from the specified file
3. **Determines resume point** based on completed assignments
4. **Enforces architectural requirements** (DI, module boundaries)
5. **Validates after each step** (TypeScript, tests, DI patterns)
6. **Tracks progress** and updates the plan
7. **Summarizes for human verification** (never marks complete)

## State Detection and Resume Logic

### Task State Analysis

When loading a PRP, the command performs intelligent state detection:

1. **Parse Assignment Status**
   ```markdown
   - [x] Assignment 1: ✅ COMPLETED (Old Method)
   - [x] Assignment 2: ✅ COMPLETED (Old Method)  
   - [ ] Assignment 3: ⚠️ PARTIAL (Env loader incomplete)
   - [ ] Assignment 4: Not Started
   ```

2. **Check Git Status**
   ```bash
   git status --porcelain
   # Detect uncommitted changes that might indicate work in progress
   ```

3. **Correlate File Changes**
   ```bash
   git diff --name-only
   # Match changed files against current assignment's expected file paths
   ```

### Resume Strategies

#### **Fresh Start** (All assignments unchecked)
```
🚀 Starting fresh implementation of [Task Name]

📋 Assignments to complete:
- Assignment 1: [Description]
- Assignment 2: [Description]
- ...

Beginning with Assignment 1...
```

#### **Partial Completion** (Some assignments checked)
```
📊 Task Analysis: [Task Name]

✅ COMPLETED:
- Assignment 1: [Description]
- Assignment 2: [Description]

⚠️ PARTIAL:
- Assignment 3: [Description] (Sub-task 3.2 incomplete)

🔄 REMAINING:
- Assignment 4: [Description]
- Assignment 5: [Description]

🎯 RESUME POINT: Assignment 3.2 - [Sub-task Description]

Continue with Assignment 3.2? (y/n)
```

#### **Work In Progress** (Uncommitted changes detected)
```
🔄 Resuming interrupted work on [Task Name]

📁 Uncommitted Changes Detected:
src/application/config/EnhancedValidator.ts
src/application/config/ErrorFormatter.ts
tests/unit/config/validation/enhanced-validator.test.ts

🔨 Build Status:
ERROR in src/application/config/ErrorFormatter.ts:45:3
';' expected.

📍 Current Assignment: Assignment 4 - Configuration Validation
📍 Current Sub-task: 4.2 Create error formatter

⏭️ Next Steps:
1. [ ] Fix syntax error at ErrorFormatter.ts:45
2. [ ] Complete sub-task 4.2: Create error formatter
3. [ ] Run tests: npm test -- tests/unit/config/validation
4. [ ] Mark assignment complete with ✅
5. [ ] Commit: git commit -m "Task [X].[Y]: Assignment 4 validation system completed"

Continue fixing the syntax error? (y/n)
```

#### **Task Complete** (All assignments checked)
```
✅ Task [Name] appears to be COMPLETE

All assignments marked as completed:
- Assignment 1: ✅ COMPLETED
- Assignment 2: ✅ COMPLETED
- ...

🔍 Verification Check:
- Build status: [Run npm run build]
- Test status: [Run npm test]
- Git status: [Check for uncommitted work]

Run final verification? (y/n)
```

## Execution Guidelines

### 🏗️ **Architectural Enforcement**

**EVERY service/manager/repository created MUST:**

1. **Define Interface First**
   ```typescript
   // domain/[feature]/I[Service].ts
   export interface IService {
     method(): Promise<Result>;
   }
   ```

2. **Use Constructor Injection**
   ```typescript
   // application/[feature]/[Service].ts
   export class Service implements IService {
     constructor(
       private readonly dep1: IDep1,
       private readonly dep2: IDep2
     ) {}
   }
   ```

3. **Register in DI Container**
   ```typescript
   // di/container.ts
   container.register<IService>('IService', {
     useClass: Service,
     lifecycle: Lifecycle.Singleton
   });
   ```

**Module Structure:**
```
src/
├── domain/        # Interfaces only
├── application/   # Business logic with DI
├── infrastructure/# External dependencies
└── di/           # All registrations
```

### ✅ **Validation After Each Assignment**

Run these checks after EVERY assignment:

```bash
# 1. TypeScript MUST compile
npm run build
# Expected: "Found 0 errors"

# 2. Tests MUST pass
npm test -- tests/unit/[feature]
# Expected: All tests pass

# 3. DI Pattern Check
grep "constructor(" [new-service-file]
# Expected: Shows dependency parameters

# 4. No Direct Instantiation
grep -r "new [ServiceName]" src/ --exclude-dir=di
# Expected: Only in DI container or tests

# 5. Container Registration
grep "[ServiceName]" src/di/container.ts
# Expected: Shows registration
```

### 📊 **Progress Tracking**

After completing each assignment:
1. Update the checkbox in the PRP: `[x]`
2. Update progress percentage
3. Commit with descriptive message:
   ```bash
   git add -A
   git commit -m "Task [X].[Y]: [Assignment description] completed"
   ```

### 📝 **Living Document Updates**

**After EACH assignment completion:**

1. **Update Assignment Status**:
   ```markdown
   ### Assignment 1: [Name] ✅ COMPLETED
   **Completion Date**: [DATE]
   **Actual Time**: [X hours]
   ```

2. **Document Discoveries**:
   ```markdown
   ### Implementation Discoveries
   - **Key Findings**: 
     - Found existing ValidationService can be extended
     - Windows paths require special handling for %ProgramData%
   - **Decisions Made**:
     - Chose to extend rather than replace existing config system
     - Used chokidar for file watching due to cross-platform support
   - **Changes from Plan**:
     - Added sub-task 1.4 for platform-specific path resolution
   ```

3. **Add Code Snippets** (if helpful):
   ```typescript
   // Actual implementation that worked well
   export class ConfigurationManager {
     // Show key implementation details
   }
   ```

### 👤 **Human Verification Process**

**After ALL assignments complete:**

1. **AI Summary** (what was implemented):
   ```markdown
   ## Implementation Summary
   
   **Created Services:**
   - ConfigurationManager (src/application/config/)
   - FileLoader (src/infrastructure/config/)
   
   **DI Registrations:**
   - IConfigurationManager → ConfigurationManager
   - IFileLoader → FileLoader
   
   **Tests Added:**
   - tests/unit/config/manager.test.ts (5 tests)
   - tests/unit/config/loader.test.ts (3 tests)
   
   **Key Decisions:**
   - Used singleton lifecycle for ConfigurationManager
   - Implemented async loading pattern
   
   **Platform-Specific Handling:**
   - Windows: Added %ProgramData% path resolution
   - Unix: Added /etc path permission checking
   ```

2. **Human Verification Checklist:**
   ```bash
   # Full Build Check
   npm run build
   # MUST show: "Found 0 errors"
   
   # Full Test Suite
   npm test
   # All tests must pass
   
   # Architecture Tests (if available)
   npm run test:architectural
   # Validates DI patterns and boundaries
   
   # Manual DI Pattern Check
   grep -r "new [A-Z]" src/ --exclude-dir=di --exclude-dir=tests
   # Should only show instances in DI container or factories
   
   # Manual Review
   - [ ] Check src/di/container.ts for all registrations
   - [ ] Verify interfaces in domain/ layer
   - [ ] Confirm no business logic in infrastructure/
   - [ ] Review module boundaries
   ```

3. **Human Sign-off Required:**
   ```
   Task Status: PENDING HUMAN VERIFICATION
   
   Human Reviewer: _________________
   Date: _________________
   Status: [ ] Approved [ ] Needs Changes
   Notes: _________________
   ```

## Implementation Workflow

1. **Analyze and Load PRP**
   ```javascript
   const prp = await readFile($ARGUMENTS.planFile);
   const taskState = analyzeTaskState(prp);
   const resumePoint = determineResumePoint(taskState);
   ```

2. **Smart Resume Logic**
   - **Fresh Start**: Begin with Assignment 1
   - **Partial Completion**: Resume from first incomplete assignment
   - **Work In Progress**: Continue current assignment from interruption point
   - **Already Complete**: Run verification checks

3. **Execute Remaining Assignments**
   - Check prerequisites
   - Implement following DI patterns
   - Run validation suite after each sub-task
   - Update progress in real-time

4. **Never Auto-Complete**
   - Summarize what was done
   - Provide verification commands
   - Wait for human confirmation

## State Detection Implementation

### Assignment Status Parsing
```javascript
function parseAssignmentStatus(prp) {
  const assignments = [];
  const lines = prp.split('\n');
  
  for (const line of lines) {
    if (line.match(/^- \[(x| )\] Assignment \d+:/)) {
      const isComplete = line.includes('[x]');
      const assignmentNumber = line.match(/Assignment (\d+):/)[1];
      const description = line.split(': ')[1];
      
      assignments.push({
        number: parseInt(assignmentNumber),
        description,
        completed: isComplete,
        partial: line.includes('⚠️ PARTIAL')
      });
    }
  }
  
  return assignments;
}
```

### Git State Analysis
```javascript
function analyzeGitState() {
  const status = execSync('git status --porcelain').toString();
  const uncommittedFiles = status.split('\n').filter(Boolean);
  
  const lastCommit = execSync('git log -1 --pretty=format:"%s"').toString();
  const taskPattern = /Task \d+\.\d+: Assignment \d+ .* completed/;
  
  return {
    hasUncommittedChanges: uncommittedFiles.length > 0,
    uncommittedFiles,
    lastCommitWasTaskCompletion: taskPattern.test(lastCommit)
  };
}
```

### Resume Point Determination
```javascript
function determineResumePoint(assignments, gitState) {
  const completedCount = assignments.filter(a => a.completed).length;
  const partialAssignment = assignments.find(a => a.partial);
  const firstIncomplete = assignments.find(a => !a.completed);
  
  if (completedCount === assignments.length) {
    return { type: 'COMPLETE', message: 'All assignments marked complete' };
  }
  
  if (gitState.hasUncommittedChanges) {
    return { 
      type: 'IN_PROGRESS', 
      assignment: partialAssignment || firstIncomplete,
      uncommittedFiles: gitState.uncommittedFiles
    };
  }
  
  if (partialAssignment) {
    return {
      type: 'PARTIAL',
      assignment: partialAssignment,
      resumeMessage: `Resume from incomplete sub-tasks in Assignment ${partialAssignment.number}`
    };
  }
  
  if (firstIncomplete) {
    return {
      type: 'CONTINUE',
      assignment: firstIncomplete,
      resumeMessage: `Continue with Assignment ${firstIncomplete.number}`
    };
  }
  
  return { type: 'FRESH_START', assignment: assignments[0] };
}
```

## Error Handling

If validation fails at any step:
1. **Stop execution** - don't continue with errors
2. **Report specific failure** - which check failed
3. **Suggest fixes** - common solutions
4. **Update PRP** - mark assignment as blocked

## Success Criteria

The command succeeds when:
- ✅ All assignments implemented
- ✅ All validations pass
- ✅ No TypeScript errors
- ✅ DI patterns followed
- ✅ Human verification complete

## Example Executions

### Fresh Start Example
```bash
/execute-prp docs/development-plan/roadmap/Phase-6-Task-1-Configuration-System.md

# Output:
🚀 Starting fresh implementation of Configuration System Foundation

📋 Assignments to complete:
- Assignment 1: Review and Plan Configuration Extension
- Assignment 2: Implement Configuration Manager Core
- Assignment 3: Implement Configuration Loaders
- Assignment 4: Implement Configuration Validation
- Assignment 5: Implement Configuration Profiles

Beginning with Assignment 1...
```

### Partial Completion Example (Current Scenario)
```bash
/execute-prp docs/development-plan/roadmap/currently-implementing/Phase-6-Task-1-Configuration-System-Foundation.md

# Output:
📊 Task Analysis: Configuration System Foundation

✅ COMPLETED (Old Method):
- Assignment 1: Review and Plan Configuration Extension
- Assignment 2: Implement Configuration Manager Core
- Assignment 4: Implement Configuration Validation
- Assignment 5: Implement Configuration Profiles
- Assignment 6: Implement Hot Reload System
- Assignment 7: Implement Smart Defaults System

⚠️ PARTIAL:
- Assignment 3: Implement Configuration Loaders (Environment loader incomplete)

🔄 REMAINING:
- Assignment 8: Create Configuration CLI Commands
- Assignment 9: Integration Testing and Documentation

🎯 RESUME POINT: Assignment 3.3 - Implement environment variable loader

Continue with Assignment 3.3? (y/n)
```

### Work In Progress Example
```bash
/execute-prp docs/development-plan/roadmap/Phase-6-Task-1-Configuration-System.md

# Output:
🔄 Resuming interrupted work on Configuration System Foundation

📁 Uncommitted Changes Detected:
src/application/config/EnhancedValidator.ts
src/application/config/ErrorFormatter.ts
tests/unit/config/validation/enhanced-validator.test.ts

🔨 Build Status:
ERROR in src/application/config/ErrorFormatter.ts:45:3
';' expected.

📍 Current Assignment: Assignment 4 - Configuration Validation
📍 Current Sub-task: 4.2 Create error formatter

⏭️ Next Steps:
1. [ ] Fix syntax error at ErrorFormatter.ts:45
2. [ ] Complete sub-task 4.2: Create error formatter
3. [ ] Run tests: npm test -- tests/unit/config/validation
4. [ ] Mark assignment complete with ✅
5. [ ] Commit: git commit -m "Task 6.1: Assignment 4 validation system completed"

Continue fixing the syntax error? (y/n)
```

### Already Complete Example
```bash
/execute-prp docs/development-plan/roadmap/Phase-6-Task-1-Configuration-System.md

# Output:
✅ Task Configuration System Foundation appears to be COMPLETE

All assignments marked as completed:
- Assignment 1: ✅ COMPLETED
- Assignment 2: ✅ COMPLETED
- Assignment 3: ✅ COMPLETED
- Assignment 4: ✅ COMPLETED
- Assignment 5: ✅ COMPLETED

🔍 Verification Check:
- Build status: [Running npm run build...]
- Test status: [Running npm test...]
- Git status: Clean working directory

Task appears complete. Run final verification? (y/n)
```