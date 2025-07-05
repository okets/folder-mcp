# execute-prp

Execute a PRP (Problem-Resolution Plan) with proper DI enforcement, validation, and progress tracking.

## Usage

```
/execute-prp <plan-file>
```

Example:
```
/execute-prp docs/development-plan/roadmap/Phase-6-Task-1-Configuration-System.md
```

## What this command does

1. **Loads the PRP** from the specified file
2. **Enforces architectural requirements** (DI, module boundaries)
3. **Validates after each step** (TypeScript, tests, DI patterns)
4. **Tracks progress** and updates the plan
5. **Summarizes for human verification** (never marks complete)

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

1. **Load PRP**
   ```javascript
   const prp = await readFile($ARGUMENTS.planFile);
   const assignments = extractAssignments(prp);
   ```

2. **Execute Each Assignment**
   - Check prerequisites
   - Implement following DI patterns
   - Run validation suite
   - Update progress

3. **Never Auto-Complete**
   - Summarize what was done
   - Provide verification commands
   - Wait for human confirmation

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

## Example Execution

```bash
/execute-prp docs/development-plan/roadmap/Phase-6-Task-1-Configuration-System.md

# Output:
Executing Phase 6 Task 1: Configuration System Foundation
Assignment 1/5: Review and Extend Existing Configuration
  ✓ TypeScript build clean
  ✓ DI pattern check passed
  ✓ Tests passing
  Progress: 20% complete

Assignment 2/5: Implement Configuration Manager
  ✓ Interface created: IConfigurationManager
  ✓ Implementation uses DI
  ✓ Registered in container
  ✓ Tests added: 5 passing
  Progress: 40% complete

[... continues for all assignments ...]

EXECUTION COMPLETE - AWAITING HUMAN VERIFICATION
See summary above for review checklist.
```