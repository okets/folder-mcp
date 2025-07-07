# create-task-plan

Create a detailed, context-aware implementation plan for a specific task.

## Usage

```
/create-task-plan <phase-number> <task-number>
```

## 🚨 **PRE-PRODUCTION PROJECT NOTICE**

**CRITICAL**: This is a PRE-PRODUCTION project. No backwards compatibility or migration support is required.

- **No Legacy Support**: Delete old files, configurations, or data structures freely
- **Breaking Changes OK**: Interface changes don't need migration paths  
- **Clean Slate Approach**: Replace rather than extend existing implementations
- **No Production Users**: No need to maintain existing workflows
- **Delete and Recreate**: When restructuring, remove old embeddings/config and recreate fresh

### What to Do Instead of Migration
- **Delete test data**: Remove old embeddings, config files, and test folders completely
- **Simplify interfaces**: Remove optional parameters and fallback logic
- **Clean implementation**: Build the simplest, most direct solution for the new requirements
- **No dual-mode support**: Implement only the new approach, remove old approach entirely
- **Fresh start testing**: Clear test fixtures and create new ones that match the new design

## 🧪 **MANDATORY TESTING APPROACH**

**CRITICAL**: All tests MUST use real test data from `tests/fixtures/test-knowledge-base/`, not mocks!

### Testing Requirements
- **Use Real Test Data**: Tests must use files from `tests/fixtures/test-knowledge-base/`
- **No Mocks for Internal Logic**: Only mock external dependencies (APIs, databases, file system operations)
- **Expand Test Fixtures**: If your feature needs specific test scenarios, add real files to the test folder
- **Real File Operations**: Test actual file parsing, processing, and indexing with real documents
- **Authentic Test Scenarios**: Use realistic business documents that match actual use cases

### When to Mock vs Use Real Data
```typescript
// ✅ CORRECT: Use real test data
const testKnowledgeBase = '/tests/fixtures/test-knowledge-base/Finance'
const response = await endpoint.listDocuments({ folder: 'Finance' })

// ✅ CORRECT: Mock external dependencies only
const mockOllamaAPI = { generateEmbedding: () => mockVector }

// ❌ WRONG: Don't mock internal business logic
const mockFolderManager = { getFolders: () => mockFolders }
```

### Test Data Expansion
If your task needs specific test scenarios:
1. **Add real files** to `tests/fixtures/test-knowledge-base/`
2. **Create authentic documents** that match the feature requirements  
3. **Use proper file formats** (real PDFs, Excel files, etc.)
4. **Document the test data** in the task plan

## 🏗️ **MANDATORY ARCHITECTURAL PATTERNS**

Every task plan will include these MANDATORY patterns that MUST be followed:

### **🔧 DI ENFORCEMENT (In Every Assignment)**
```markdown
**🚨 MANDATORY DI PATTERN**:
1. **Interface First**: `domain/[feature]/I[Service].ts` - Pure interface, no implementation
2. **Constructor Injection**: `application/[feature]/[Service].ts` - All dependencies injected
3. **DI Registration**: `di/setup.ts` - Register interface → implementation mapping
4. **Zero Direct Instantiation**: NEVER use `new` outside DI container or tests

**VALIDATION AFTER EACH ASSIGNMENT**:
- [ ] `npm run build` → MUST show 0 TypeScript errors
- [ ] `grep "new [A-Z]" src/ --exclude-dir=di` → Should only show factories/DI
- [ ] Interface in domain/, implementation in application/
- [ ] Service registered in DI container
```

### **📐 Module Boundary Checks (After Every Assignment)**
```markdown
**✅ MODULE BOUNDARY VALIDATION**:
- [ ] **Domain Layer**: Only interfaces, no implementations
- [ ] **Application Layer**: Business logic with injected dependencies  
- [ ] **Infrastructure Layer**: External dependencies, no business logic
- [ ] **Interface Layer**: Thin controllers/commands, delegates to application
- [ ] **No Cross-Layer Violations**: Application never imports infrastructure
```

### **📝 Living Document Requirements (Built-in)**
```markdown
**📋 PROGRESS TRACKING** (Update after each assignment):
1. **Update Status**: `[x] Assignment N: ✅ COMPLETED (Date: YYYY-MM-DD)`
2. **Document Discoveries**: Add to "Implementation Discoveries" section
3. **Time Tracking**: Record actual vs estimated time
4. **Commit Progress**: `git commit -m "Assignment N: [description]"`
```

## EXACT Implementation Instructions

When this command is executed, you MUST:

### 0. **Pre-Check: Verify Previous Task Completion** (if task-number > 1)

For any task number greater than 1, FIRST check if the previous task was marked complete IN THE PHASE PLAN:

```bash
# Find the phase plan
PHASE_PLAN=$(find docs/development-plan/roadmap/currently-implementing -name "Phase-${phase-number}-*-plan.md" -type f | head -1)

if [ -n "$PHASE_PLAN" ] && [ $task-number -gt 1 ]; then
  # Check if previous task is marked complete in the Phase Completion Log
  PREV_TASK_NUM=$((task-number - 1))
  
  # Look in the Phase Completion Log table for the previous task's status
  PREV_TASK_STATUS=$(grep -E "Task ${PREV_TASK_NUM}:|Task ${PREV_TASK_NUM} " "$PHASE_PLAN" | grep -c "✅")
  
  if [ "$PREV_TASK_STATUS" -eq 0 ]; then
    # Previous task not marked complete in phase plan
    echo "⚠️ Task ${PREV_TASK_NUM} is not marked as complete in the Phase Plan Completion Log."
    echo ""
    echo "The Phase Plan must be updated before creating a new task plan."
    echo ""
    echo "Options:"
    echo "1. Update phase plan to mark Task ${PREV_TASK_NUM} as complete, then continue"
    echo "2. Continue without updating (NOT RECOMMENDED - phase plan will be out of sync)"
    echo "3. Abort - go back and properly complete Task ${PREV_TASK_NUM} first"
    echo ""
    echo "What would you like to do? (1/2/3)"
  fi
fi
```

**If option 1 is chosen**: 
- First, update the Phase Plan Completion Log to mark Task {prev} as ✅ COMPLETE
- Update the Phase Tasks Overview table to show ✅ status
- Add completion date and key findings to the completion log
- Then continue with creating the new task plan

**If option 2 is chosen**:
- Log a WARNING that phase plan is out of sync
- Continue creating the new task plan
- Note: This will create inconsistency between actual progress and reported progress

**If option 3 is chosen**:
- Stop the current command
- Provide guidance to properly complete the previous task
- Suggest using `/next-please` to resume where they left off

1. **Read the roadmap file**:
   - File: `docs/development-plan/roadmap/folder-mcp-roadmap-1.1.md`
   - Find `## Phase <phase-number>:`
   - Within that phase, find `### Task <task-number>:`
   - Extract ALL content for that specific task

2. **Extract these EXACT elements from the task**:
   - Task name from the heading
   - **Goal** statement
   - **Scope** items (all bullet points)
   - **Implementation Details** (if present)
   - **Configuration** examples (if present)
   - **Completion Criteria** (all checkboxes)
   - **Testing** requirements

3. **Gather context from**:
   - Phase-level user stories that relate to this task
   - Configuration principles from the phase
   - Any code examples in the task section
   - Dependencies mentioned in scope

4. **Generate the output file**:
   - Location: `docs/development-plan/roadmap/currently-implementing/Phase-{phase}-Task-{number}-{name-kebab}.md`
   - Break scope into logical assignments (3-5 assignments per task)
   - Each assignment MUST include mandatory DI patterns and validation
   - Each assignment should be independently implementable

## Assignment Generation Rules with DI Enforcement

### For Configuration Tasks:
1. **Assignment 1**: Schema/Interface definition (domain layer)
   - **DI Pattern**: Define `IConfigurationSchema` interface
   - **Validation**: Interface in domain/, no implementation logic
2. **Assignment 2**: Implementation with validation (application layer)
   - **DI Pattern**: Implement with constructor injection of dependencies
   - **Validation**: All dependencies injected, no direct instantiation
3. **Assignment 3**: DI Registration and Integration
   - **DI Pattern**: Register in DI container, integrate with existing systems
   - **Validation**: Service properly registered, injection working
4. **Assignment 4**: Testing and documentation
   - **DI Pattern**: Unit tests with mocked dependencies
   - **Validation**: Tests use DI container or proper mocks

### For Service/Manager Tasks:
1. **Assignment 1**: Interface definition (domain layer)
   - **DI Pattern**: Pure interface in `domain/[feature]/I[Service].ts`
   - **Validation**: No implementation logic in interface
2. **Assignment 2**: Implementation with DI (application layer)
   - **DI Pattern**: Constructor injection, all dependencies abstracted
   - **Validation**: Zero direct instantiation, proper abstractions
3. **Assignment 3**: DI container registration
   - **DI Pattern**: Register service with proper lifetime management
   - **Validation**: Service resolves correctly from container
4. **Assignment 4**: Unit tests with mocks
   - **DI Pattern**: Test with mocked dependencies, verify DI patterns
   - **Validation**: Tests don't violate DI principles
5. **Assignment 5**: Integration tests
   - **DI Pattern**: Full DI integration testing
   - **Validation**: End-to-end DI workflow working

### For CLI/TUI Tasks:
1. **Assignment 1**: Command structure setup (interface layer)
   - **DI Pattern**: Commands use BaseCommand with DI access
   - **Validation**: No business logic in commands, delegates to application
2. **Assignment 2**: Core functionality implementation (application layer)
   - **DI Pattern**: Application services handle business logic
   - **Validation**: Proper separation between interface and application
3. **Assignment 3**: DI Integration
   - **DI Pattern**: Commands resolve services through DI
   - **Validation**: No direct service construction in commands
4. **Assignment 4**: Configuration integration
   - **DI Pattern**: Configuration injected through DI
   - **Validation**: Configuration properly abstracted
5. **Assignment 5**: Testing with DI patterns
   - **DI Pattern**: Test commands and services independently
   - **Validation**: Tests respect DI boundaries

## Required Output Format

```markdown
# Task [PHASE].[NUMBER]: [EXACT TASK NAME FROM ROADMAP]

**Phase**: [PHASE NUMBER] - [PHASE NAME]  
**Status**: 🚧 IN PROGRESS  
**Created**: [TODAY'S DATE]  
**Complexity**: [High/Medium/Low based on scope size]  
**Approach**: [Brief strategy for this task]

## 🚨 **MANDATORY ARCHITECTURAL REQUIREMENTS**

**⚠️ CRITICAL**: This task plan contains MANDATORY architectural patterns that MUST be followed throughout implementation. These patterns are embedded in every assignment to ensure consistency during long implementation sessions.

### **🏗️ DI ENFORCEMENT THROUGHOUT**
Every service/manager/repository created MUST follow this pattern:

1. **Interface First** (Domain Layer):
   ```typescript
   // domain/[feature]/I[Service].ts
   export interface IService {
     method(): Promise<Result>;
   }
   ```

2. **Constructor Injection** (Application Layer):
   ```typescript
   // application/[feature]/[Service].ts
   export class Service implements IService {
     constructor(
       private readonly dep1: IDep1,
       private readonly dep2: IDep2
     ) {}
   }
   ```

3. **DI Registration** (DI Layer):
   ```typescript
   // di/setup.ts
   container.register<IService>('IService', {
     useClass: Service,
     lifecycle: Lifecycle.Singleton
   });
   ```

### **📐 Module Boundary Rules**
```
src/
├── domain/        # Interfaces ONLY - no implementations
├── application/   # Business logic with DI - no external dependencies
├── infrastructure/# External dependencies - no business logic
└── di/           # All service registrations - imports from all layers
```

### **✅ VALIDATION REQUIREMENTS (After EVERY Assignment)**
```bash
# 1. TypeScript MUST compile (ZERO errors)
npm run build
# Expected: "Found 0 errors"

# 2. Tests MUST pass
npm test -- tests/unit/[feature]
# Expected: All tests pass

# 3. DI Pattern Check
grep "constructor(" [new-service-file]
# Expected: Shows dependency parameters

# 4. No Direct Instantiation
grep -r "new [A-Z]" src/ --exclude-dir=di --exclude-dir=tests
# Expected: Only factories or DI container usage

# 5. Module Boundary Check
# Domain: Only interfaces
# Application: Business logic with DI
# Infrastructure: External deps only
# Interface: Thin layer, delegates to application
```

## 🎯 **Task Objective**

[EXACT GOAL FROM ROADMAP TASK]

## 🔍 **Pre-Implementation Checklist**

- [ ] Review existing code in: [LIST RELEVANT DIRECTORIES]
- [ ] Identify reusable components: [LIST EXPECTED COMPONENTS]
- [ ] Check for similar patterns in: [LIST REFERENCE FILES]
- [ ] Consider platform differences: [Windows/Unix/Cross-platform]
- [ ] Review related tests: [LIST TEST DIRECTORIES]

## 📋 **Scope**

[CONVERT ALL SCOPE BULLETS TO CHECKBOXES]
- [ ] [Scope item 1 from roadmap]
- [ ] [Scope item 2 from roadmap]
- [ ] [Continue for all scope items]

## 📚 **Essential Project Context**

### From Completed Work
[REFERENCE RELEVANT COMPLETED PHASES/TASKS]
- Phase 1-5: MCP endpoints, file processing, TUI framework  
- Current capabilities: 9 MCP endpoints, FAISS search, Ollama embeddings

### Critical Files to Understand
[LIST RELEVANT FILES BASED ON TASK SCOPE]

## 🔗 **Dependencies & Related Work**

### Prerequisite Tasks
[LIST PREVIOUS TASKS IN THIS PHASE IF TASK NUMBER > 1]

### Task Sequence
- **Previous**: [Task X-1 name] - [What it provided]
- **Current**: [This task name] - [What it adds]
- **Next**: [Task X+1 name] - [What it will need]

## 📍 **Context from Roadmap**

### Related User Stories
[COPY RELEVANT USER STORIES FROM PHASE]

### Configuration Requirements
[REQUIRED FOR ALL TASKS - Distinguish between user and system configurations]

#### User Configuration (config.yaml)
- **Schema Definition**: What user-facing options will this feature expose?
- **Default Values**: What defaults go in config-defaults.yaml?
- **Validation Rules**: What schema validation is needed?
- **UI Components**: How will these appear in the TUI?

#### System Configuration (system-configuration.json)
- **Internal Settings**: What non-user-facing settings are needed?
- **No Schema Required**: These are internal, not UI-generated
- **Direct JSON Access**: Simple key-value pairs

#### Integration
- **Code Updates**: How will the feature access configuration?
- **User Config**: Via ConfigManager and schema validation
- **System Config**: Direct JSON loading at startup

### Implementation Details
[COPY ANY CODE EXAMPLES OR IMPLEMENTATION NOTES FROM TASK]

## 🔧 **Implementation Assignments**

[GENERATE 5-10 ASSIGNMENTS BASED ON SCOPE - MORE GRANULAR THAN BEFORE]

### Assignment 1: [FIRST LOGICAL STEP BASED ON SCOPE]
**Goal**: [What this accomplishes from scope]
**Estimated Time**: [X hours]

#### **🚨 MANDATORY DI PATTERN FOR THIS ASSIGNMENT**:
1. **Interface First**: Define `I[Service]` in `domain/[feature]/`
2. **No Implementation Logic**: Interface must be pure contract
3. **Proper Abstractions**: Use domain types, not infrastructure

#### Sub-tasks:
1. [ ] **1.1 [First sub-task]**
   ```typescript
   // In domain/[path]/I[interface].ts
   export interface I[Service] {
     method(): Promise<Result>;
   }
   ```
   
2. [ ] **1.2 [Second sub-task]**
   - Platform considerations: [Windows/Unix specifics if any]
   - Related files: [List files that need updates]
   
3. [ ] **1.3 [Test creation]**
   ```typescript
   // In tests/unit/[module]/[test].test.ts
   describe('[Feature]', () => {
     test('should [behavior]', () => {
       // Test implementation
     });
   });
   ```

#### **✅ VALIDATION CHECKLIST**:
```bash
npm run build
# Expected: 0 TypeScript errors

# Check interface is in domain layer
ls domain/[feature]/I[Service].ts
# Expected: File exists

# Verify no implementation logic in interface
grep -E "(class|function|=)" domain/[feature]/I[Service].ts
# Expected: No matches (only interface definitions)
```

#### **Implementation Notes**:
- [Key decisions to make during implementation]
- [Potential gotchas or edge cases]
- [Performance considerations]

#### **Completion Criteria**:
- [ ] All sub-tasks complete
- [ ] Interface defined in domain layer
- [ ] No TypeScript errors
- [ ] [Other specific criteria from scope]

**📝 UPDATE AFTER COMPLETION**:
```markdown
### Assignment 1: [Name] ✅ COMPLETED
**Completion Date**: [YYYY-MM-DD]
**Actual Time**: [X hours]
**Key Discoveries**: [What was learned during implementation]
```

---

### Assignment 2: [SECOND LOGICAL STEP]
**Goal**: [What this accomplishes from scope]
**Estimated Time**: [X hours]

#### **🚨 MANDATORY DI PATTERN FOR THIS ASSIGNMENT**:
1. **Constructor Injection**: All dependencies injected via constructor
2. **Application Layer**: Implementation goes in `application/[feature]/`
3. **Interface Implementation**: Implements the interface from Assignment 1
4. **Zero Direct Instantiation**: No `new` calls except factories

#### Sub-tasks:
1. [ ] **2.1 [Implementation sub-task]**
   ```typescript
   // In application/[path]/[Service].ts
   export class [Service] implements I[Service] {
     constructor(
       private readonly dependency1: IDependency1,
       private readonly dependency2: IDependency2
     ) {}
     
     async method(): Promise<Result> {
       // Implementation using injected dependencies
     }
   }
   ```

#### **✅ VALIDATION CHECKLIST**:
```bash
npm run build
# Expected: 0 TypeScript errors

# Check constructor injection pattern
grep "constructor(" application/[feature]/[Service].ts
# Expected: Shows injected dependencies

# Verify no direct instantiation
grep -r "new [A-Z]" application/[feature]/[Service].ts
# Expected: No matches (only dependency injection)

# Check interface implementation
grep "implements I[Service]" application/[feature]/[Service].ts
# Expected: Shows interface implementation
```

#### **Completion Criteria**:
- [ ] Implementation complete in application layer
- [ ] All dependencies injected via constructor
- [ ] Implements interface from Assignment 1
- [ ] No direct instantiation of external services

**📝 UPDATE AFTER COMPLETION**:
```markdown
### Assignment 2: [Name] ✅ COMPLETED
**Completion Date**: [YYYY-MM-DD]
**Actual Time**: [X hours]
**Key Discoveries**: [What was learned during implementation]
```

---

[CONTINUE WITH MORE ASSIGNMENTS FOLLOWING SAME PATTERN]

### Assignment N: DI Registration and Integration
**Goal**: Register service in DI container and integrate with existing systems
**Estimated Time**: [X hours]

#### **🚨 MANDATORY DI PATTERN FOR THIS ASSIGNMENT**:
1. **Container Registration**: Add to `di/setup.ts`
2. **Lifetime Management**: Choose appropriate lifecycle (Singleton/Transient)
3. **Dependency Resolution**: Ensure all dependencies are registered
4. **Integration Testing**: Verify end-to-end DI resolution

#### Sub-tasks:
1. [ ] **N.1 Register in DI Container**
   ```typescript
   // In di/setup.ts
   container.registerSingleton(SERVICE_TOKENS.[SERVICE], () => {
     return serviceFactory.create[Service](container);
   });
   ```

2. [ ] **N.2 Integration with Existing Systems**
   - Update existing services to use new service
   - Ensure proper dependency chains

#### **✅ VALIDATION CHECKLIST**:
```bash
npm run build
# Expected: 0 TypeScript errors

# Check service registration
grep "[Service]" di/setup.ts
# Expected: Shows registration

# Test DI resolution
npm test -- tests/unit/di/
# Expected: Service resolves correctly

# Integration test
npm test -- tests/integration/[feature]/
# Expected: End-to-end functionality works
```

#### **Completion Criteria**:
- [ ] Service registered in DI container
- [ ] Integration with existing systems complete
- [ ] All DI chains resolve correctly
- [ ] Integration tests pass

**📝 UPDATE AFTER COMPLETION**:
```markdown
### Assignment N: [Name] ✅ COMPLETED
**Completion Date**: [YYYY-MM-DD]
**Actual Time**: [X hours]
**Key Discoveries**: [What was learned during implementation]
```

## ✅ **Task Completion Criteria**

From roadmap:
[COPY ALL COMPLETION CRITERIA AS CHECKBOXES]

Additional DI requirements:
- [ ] All services follow interface → implementation → registration pattern
- [ ] Zero TypeScript errors throughout implementation
- [ ] All module boundaries respected
- [ ] Comprehensive DI integration tests
- [ ] Living document updated with discoveries

## 🧪 **Context-Aware Testing Requirements**

**🤖 SMART TESTING**: The testing checklist below is AUTOMATICALLY FILTERED based on task type. Only relevant tests for this specific task type will be shown to avoid irrelevant validation overhead.

### Task Type Auto-Detection
**Detected Categories** (populate during task creation):
- [ ] **DI/Architecture**: Services, managers, repositories, DI container setup
- [ ] **User Configuration**: Schema-driven config.yaml settings, validation, UI generation
- [ ] **System Configuration**: Internal system-configuration.json settings  
- [ ] **CLI/Commands**: Command-line interfaces, argument parsing, help text
- [ ] **TUI/Visual**: Terminal UI components, layouts, visual elements, user interaction
- [ ] **Infrastructure**: File system, external APIs, platform integration, process management
- [ ] **Testing**: Test infrastructure, mocks, fixtures, test utilities

### Filtered Testing Checklist

#### IF Task Contains DI/Architecture Work:
- [ ] **Interface Contracts**: Test behavior contracts, not implementation details
- [ ] **Dependency Injection**: All dependencies injected via constructor, no direct instantiation
- [ ] **DI Container**: Services resolve correctly from container
- [ ] **Module Boundaries**: Domain/Application/Infrastructure separation maintained
- [ ] **Service Registration**: All services properly registered in DI container

#### IF Task Contains User Configuration Work:
- [ ] **Schema Definition**: User config schema properly defined
- [ ] **Schema Validation**: Config accepts valid inputs per schema
- [ ] **Override Testing**: config-defaults.yaml < config.yaml < CLI args
- [ ] **Config Commands**: `folder-mcp config get/set` work correctly
- [ ] **UI Generation**: TUI shows configuration options from schema
- [ ] **External Data**: JSON files load correctly for dynamic options

#### IF Task Contains System Configuration Work:
- [ ] **JSON Structure**: system-configuration.json properly formatted
- [ ] **No User Access**: Settings not exposed via CLI/TUI
- [ ] **Startup Loading**: System config loads at application start
- [ ] **No Schema**: Internal settings don't need validation schema

#### IF Task Contains CLI/Commands Work:
- [ ] **Argument Parsing**: Command accepts expected flags and arguments
- [ ] **Help Output**: `--help` shows clear usage information
- [ ] **Error Handling**: Invalid arguments show helpful error messages
- [ ] **Exit Codes**: Success (0) and error (1) codes work correctly
- [ ] **Integration**: Command integrates properly with core services

#### IF Task Contains TUI/Visual Work:
- [ ] **Layout Rendering**: Components display in correct positions
- [ ] **Keyboard Navigation**: Arrow keys, Enter, Escape work as expected
- [ ] **Visual Output**: Terminal output matches expected format
- [ ] **Error Display**: Error messages appear clearly to user
- [ ] **Responsive**: Works with different terminal sizes

#### IF Task Contains Infrastructure Work:
- [ ] **Platform Support**: Works on Windows, macOS, Linux as required
- [ ] **External Dependencies**: Graceful handling when services unavailable
- [ ] **File Operations**: Proper file handling, permissions, cleanup
- [ ] **Process Management**: Processes start/stop/restart correctly
- [ ] **Error Recovery**: System recovers gracefully from failures

#### Always Include (Cross-Cutting):
- [ ] **Build Validation**: `npm run build` shows 0 TypeScript errors
- [ ] **Core Functionality**: Main feature works end-to-end
- [ ] **Integration**: Feature integrates with existing system
- [ ] **Configuration**: Feature respects relevant configuration settings

## 📊 **Progress Tracking** (Living Document)

### Assignment Status
[LIST ALL ASSIGNMENTS WITH SUB-TASKS AS NESTED CHECKBOXES]
- [ ] Assignment 1: [Name]
  - [ ] 1.1 [Sub-task]
  - [ ] 1.2 [Sub-task]
- [ ] Assignment 2: [Name]
  - [ ] 2.1 [Sub-task]
  - [ ] 2.2 [Sub-task]

### Time Tracking
| Assignment | Estimated | Actual | Status | Notes |
|------------|-----------|--------|--------|-------|
| 1: [Name]  | X hours   |        | Not Started | |
| 2: [Name]  | X hours   |        | Not Started | |

### Implementation Discoveries & Decision Log
**CRITICAL**: Update this section after EACH assignment completion:

#### 🎯 **Key Decisions Made & Rationale**
- **[Date] Assignment X**: [Decision description]
  - **Why**: [Rationale for this approach]
  - **Alternatives Considered**: [Other options evaluated]
  - **Impact**: [How this affects future work]

#### 🐰 **Rabbit Holes & Problem-Solving**
- **[Date] Issue**: [Problem encountered]
  - **Time Spent**: [How long to resolve]
  - **Root Cause**: [What actually caused the issue]
  - **Solution**: [How it was solved]
  - **Prevention**: [How to avoid this in future]

#### 🏗️ **Architecture & DI Insights**
- **DI Patterns That Worked**: [Document successful DI implementations]
- **Module Boundary Decisions**: [Boundary choices made and reasoning]
- **Service Design Choices**: [Interface vs implementation decisions]
- **Integration Approaches**: [How services connect together]

#### 📚 **Unexpected Discoveries**
- **Code Insights**: [Things learned about existing codebase]
- **Platform Differences**: [OS/environment specific findings]
- **Performance Observations**: [Speed/memory insights]
- **Configuration Behavior**: [How config system actually works]

#### 🔄 **Plan Deviations & Adaptations**
- **Changes from Original Plan**: [What was modified and why]
- **Scope Adjustments**: [Features added/removed during implementation]
- **Timeline Impacts**: [How changes affected estimates]
- **Future Implications**: [How deviations affect upcoming work]

#### 🎨 **Reusable Patterns & Best Practices**
- **Code Patterns**: [Patterns that could be used elsewhere]
- **Testing Approaches**: [Test strategies that worked well]
- **Configuration Patterns**: [Config approaches worth reusing]
- **DI Patterns**: [Dependency injection patterns for future reference]

### DI Architecture Validation
Track DI compliance throughout implementation:

- **Services Created**: [List with their DI patterns]
- **Interfaces Defined**: [List domain interfaces created]
- **DI Registrations**: [List container registrations added]
- **Dependency Chains**: [Document complex dependency relationships]
- **Boundary Violations Fixed**: [Any violations found and corrected]

## 🔍 **Quick Reference**

### Key Commands
```bash
# Build and test (run after EVERY assignment)
npm run build && npm test

# DI-specific validation
grep -r "new [A-Z]" src/ --exclude-dir=di --exclude-dir=tests
# Should only show factories or test fixtures

# Module boundary check
ls domain/[feature]/        # Should only contain interfaces
ls application/[feature]/   # Should contain implementations with DI
ls infrastructure/[feature]/ # Should contain external dependency wrappers

# Run specific tests
npm test -- tests/unit/[feature]
npm test -- tests/integration/[feature]
```

### Common DI Issues and Solutions
- **Build errors**: Check interface imports and DI registrations
- **Test failures**: Verify mocks match interface contracts
- **Circular dependencies**: Review module organization
- **Missing registrations**: Check DI container setup

---

## 📝 **Living Document Requirements**

**CRITICAL**: This task plan is a LIVING DOCUMENT that MUST be updated throughout implementation:

### After EACH Assignment:
1. **Update Status**: Change `[ ]` to `[x]` and add completion date
2. **Record Time**: Update "Actual" time in tracking table
3. **Document Discoveries**: Add findings to "Implementation Discoveries"
4. **Update DI Validation**: Record DI patterns used
5. **Commit Progress**: `git commit -m "Assignment N: [description]"`

### Completion Format:
```markdown
### Assignment N: [Name] ✅ COMPLETED
**Completion Date**: YYYY-MM-DD
**Actual Time**: X hours (estimated Y hours)
**DI Patterns Used**: [List patterns implemented]
**Key Discoveries**: [What was learned]
**Code Locations**: [Files created/modified]
```

### 🔍 **Human Review Process** (Management-Style)

When this task is complete, provide the following information for human review:

#### **📋 Implementation Summary for Review**
```markdown
## Task Implementation Summary

### 🎯 What Was Accomplished
- **Core Feature**: [Brief description of main functionality implemented]
- **Key Components**: [List major components/services/files created]
- **Integration Points**: [How this integrates with existing system]

### 🛤️ Implementation Journey & Context
- **Approach Taken**: [High-level strategy used and why]
- **Key Decisions Made**: [Important implementation decisions with rationale]
- **Rabbit Holes Encountered**: [Problems that took time to solve, dead ends explored]
- **Alternative Approaches Considered**: [Other options evaluated and why they were rejected]
- **Unexpected Discoveries**: [Things learned that weren't obvious from the task description]

### 🧪 How to Verify This Works
**Quick Functional Test**:
[Provide 2-3 simple commands/steps the manager can run to verify core functionality]

**Configuration Test** (if applicable):
[Show how to test different configuration scenarios]

**Error Scenarios** (if applicable):
[How to test error handling works correctly]

### 🔧 Technical Validation Commands
[Only include commands relevant to this task type - auto-filtered based on categories above]

### 🧪 **Test Changes Summary**
**CRITICAL**: Document all test modifications for review and maintenance tracking.

#### **Tests Added**
- `[test-file-path]`: [Brief description of what this test covers]
  - **Purpose**: [Why this test was needed]
  - **Test Data Used**: [Real files from test-knowledge-base or external mocks]
  - **Key Scenarios**: [Main test cases covered]

#### **Tests Modified**
- `[test-file-path]`: [What was changed and why]
  - **Change Type**: [Updated expectations/Fixed assertions/Added scenarios/Refactored structure]
  - **Reason**: [Why the modification was necessary]
  - **Impact**: [How this affects existing test coverage]

#### **Tests Removed**
- `[test-file-path]`: [What was removed and justification]
  - **Reason**: [Why removal was appropriate - unimplemented feature/obsolete functionality/duplicate coverage]
  - **Coverage Impact**: [What test coverage was lost, if any]
  - **Mitigation**: [How the lost coverage is handled elsewhere, if applicable]

#### **Test Data Changes**
- **Added to test-knowledge-base**: [New files added to fixtures]
  - **Location**: `tests/fixtures/test-knowledge-base/[path]`
  - **Purpose**: [What scenarios these files enable testing]
- **Modified fixtures**: [Changes to existing test data]
- **External mocks updated**: [Changes to API/service mocks]

#### **Test Infrastructure Changes**
- **Test utilities**: [New helper functions or test utilities created]
- **Mock improvements**: [Better mocks for external dependencies]
- **Test setup changes**: [Modifications to test environment/configuration]

#### **Test Results Impact**
```bash
# Before task implementation
Test Files  X failed | Y passed | Z skipped (Total)
Tests       A failed | B passed | C skipped (Total)

# After task implementation  
Test Files  X failed | Y passed | Z skipped (Total)
Tests       A failed | B passed | C skipped (Total)

# Net change: [Summary of test health improvement]
```

### 📚 Key Learnings & Implications
- **Architecture Insights**: [Important findings about system architecture]
- **Future Impact**: [How this affects future development]
- **Breaking Changes**: [Any compatibility issues introduced]
- **Test Coverage**: [How test coverage changed and what gaps remain]
- **Documentation Needs**: [What documentation should be updated]

### ⚠️ Open Issues & Follow-Up Actions
- **Immediate**: [Issues that should be resolved before continuing]
- **Future Phase**: [Items to address in later phases]
- **Dependencies**: [What this task enables for future work]
```

#### **🎯 Context-Aware Validation Commands**

**Build & Core Validation** (Always Required):
```bash
npm run build
# Expected: "Found 0 errors"

npm test
# Expected: All tests pass
```

**DI/Architecture Tasks Only**:
```bash
# Verify dependency injection patterns
grep -r "new [A-Z]" src/ --exclude-dir=di --exclude-dir=tests
# Expected: Only factories, builders, or test fixtures

# Check service registration
grep "[ServiceName]" src/di/setup.ts
# Expected: Service properly registered in DI container
```

**Configuration Tasks Only**:
```bash
# Test configuration commands
npx folder-mcp config get [newConfigKey]
# Expected: Shows correct value

# Test environment variable
FOLDER_MCP_[NEW_SETTING]=test npx folder-mcp config get [newConfigKey]
# Expected: Environment variable takes precedence
```

**CLI/Commands Tasks Only**:
```bash
# Test new command
npx folder-mcp [new-command] --help
# Expected: Shows clear help information

# Test command functionality
npx folder-mcp [new-command] [test-args]
# Expected: Command works as designed
```

**TUI/Visual Tasks Only**:
```bash
# Test visual interface
npx folder-mcp [tui-command]
# Expected: Interface displays correctly, navigation works
```

**Infrastructure Tasks Only**:
```bash
# Test platform-specific functionality
[platform-specific-test-command]
# Expected: Feature works on target platform

# Test error recovery
[command-that-might-fail]
# Expected: Graceful error handling
```

## CRITICAL EXTRACTION RULES

1. **Exact Task Content**: Extract the COMPLETE task section from roadmap
2. **Scope Preservation**: Keep ALL scope items, don't summarize
3. **DI Pattern Integration**: Embed DI requirements in EVERY assignment
4. **Validation Enforcement**: Include validation steps after every assignment
5. **Living Document**: Build in progress tracking and discovery documentation
6. **Module Boundaries**: Ensure proper layer separation in every assignment
7. **Configuration First**: ALWAYS plan how the feature will be configuration-driven

## Example Enhanced Assignment Structure

Every assignment follows this enhanced structure:

```markdown
### Assignment X: [Name]
**Goal**: [What this accomplishes]
**Estimated Time**: [X hours]

#### **🚨 MANDATORY DI PATTERN FOR THIS ASSIGNMENT**:
[Specific DI requirements for this assignment]

#### Sub-tasks:
[Detailed implementation steps with code examples]

#### **✅ VALIDATION CHECKLIST**:
[Specific validation commands and expected results]

#### **Completion Criteria**:
[Assignment-specific completion requirements]

**📝 UPDATE AFTER COMPLETION**:
[Template for living document updates]
```

This ensures that every assignment has embedded DI requirements, validation steps, and living document maintenance, preventing architectural drift during long implementation sessions.

## 🔄 **Actionable Input Integration Workflow**

When human feedback is received during task review, follow this workflow:

### 1. **Categorize Feedback**
```markdown
## Human Feedback Received: [Date]

### Immediate Action Items (Address Before Continuing)
- [ ] [Feedback item that must be fixed now]
- [ ] [Another immediate issue]

### Future Phase Items (Address Later)  
- [ ] [Feedback for future consideration]
- [ ] [Enhancement suggestion for later phase]

### Clarification Needed
- [ ] [Question that needs human clarification]
```

### 2. **Update Plans Before Resuming**
**For Immediate Items**: Update this task plan with new assignments
**For Future Items**: Add to Phase plan or roadmap
**For Clarifications**: Document questions and wait for answers

### 3. **Implementation Strategy**
```markdown
## Feedback Integration Plan

### How Immediate Items Will Be Addressed:
1. [Describe approach for first immediate item]
2. [Describe approach for second immediate item]

### Timeline Impact:
- Original estimate: X hours
- Additional work: Y hours  
- New total: Z hours

### Dependencies Created:
- [What this feedback creates as dependencies for future work]
```

### 4. **Resume Coding Only After Planning**
- ✅ All immediate feedback categorized
- ✅ Implementation approach planned
- ✅ Timeline updated
- ✅ Dependencies documented
- ✅ Human confirmation received (if needed)

**CRITICAL**: Never resume implementation until the feedback has been properly planned and the human has confirmed the approach.

## 📋 **Configuration Pattern Examples**

### User Configuration Pattern (Schema-Driven)
```typescript
// In config-schema.ts
embedding: {
  model: {
    type: 'select',
    label: 'Embedding Model',
    detailsSource: 'data/embedding-models.json',
    detailsColumns: ['provider', 'speed', 'cost']
  }
}
```
Result: Appears in TUI, validates input, saves to config.yaml

### System Configuration Pattern (Direct JSON)
```json
// In system-configuration.json
{
  "internalBufferSize": 1024,
  "maxRetries": 3,
  "debugMode": false
}
```
Result: Internal only, no UI, loaded at startup

## 🔄 **Phase Plan Update Process**

### When to Update Phase Plan

The phase plan MUST be updated when:
1. **Task Completion**: When marking a task as ✅ COMPLETE
2. **Before Commit**: After human review confirms task is complete
3. **Creating Next Task**: When previous task wasn't marked complete

### Phase Plan Update Instructions

When a task is marked complete, update the phase plan (`Phase-{number}-{name}-plan.md`):

#### 1. **Update Phase Tasks Overview Table**
```markdown
| Task # | Task Name | Complexity | Status | Command |
|--------|-----------|------------|--------|---------|
| 1 | Configuration System Foundation | High | ✅ | ~~`/create-task-plan 6 1`~~ |
| 2 | Basic Daemon Architecture | Medium | ⏳ | `/create-task-plan 6 2` |
```
Change status from ⏳ to ✅ and strike through the command.

#### 2. **Update Phase Completion Log**
```markdown
### **Phase Completion Log**
| Task | Status | Completion Date | Key Decisions/Findings |
|------|--------|-----------------|------------------------|
| Task 1: Configuration System Foundation | ✅ | 2025-07-05 | Implemented comprehensive config hierarchy with DI |
| Task 2: Basic Daemon Architecture | ⏳ | - | - |
```
Add completion date and key findings from task implementation.

#### 3. **Update Progress Metrics** (if present)
```markdown
### **Phase Progress**
- Tasks Complete: 2/6 (33%)
- Estimated Remaining: ~10 days
- On Track: ✅ Yes
```

#### 4. **Update Success Criteria Tracking**
Check off any phase-level success criteria that the completed task satisfies.

### Automated Phase Plan Update Template

When marking a task complete, use this template:

```markdown
## 📋 Phase Plan Update Required

**Task Completed**: Phase {X} Task {Y} - {Task Name}
**Completion Date**: {Today's Date}

### Updates to Make:
1. **Phase Tasks Overview**: 
   - Change Task {Y} status from ⏳ to ✅
   - Strike through the create command
   
2. **Phase Completion Log**:
   - Mark Task {Y} as ✅
   - Add completion date: {Today's Date}
   - Add key findings: {Brief summary from Implementation Discoveries}
   
3. **Progress Metrics**:
   - Update tasks complete: {Y}/{Total} ({Percentage}%)
   - Update time estimates if needed
   
4. **Success Criteria**:
   - Check off: {List any phase success criteria this task satisfied}

**Command to edit phase plan:**
```
Edit docs/development-plan/roadmap/currently-implementing/Phase-{X}-{name}-plan.md
```
```

### Integration with Task Workflow

The complete workflow now becomes:

1. **Start Task**: `/create-task-plan X Y` (checks previous task completion)
2. **Implement**: Follow embedded execution guidance
3. **Complete Assignments**: Update task plan as living document
4. **Human Review**: Get confirmation that task works correctly
5. **Update Phase Plan**: Mark task complete in phase plan
6. **Commit**: Include both task completion and phase plan update
7. **Next Task**: `/create-task-plan X Y+1` or `/next-please`

This ensures the phase plan always reflects the true state of progress.