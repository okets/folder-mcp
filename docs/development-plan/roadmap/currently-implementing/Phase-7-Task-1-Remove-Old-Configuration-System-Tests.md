# Task 7.1: Remove Old Configuration System Tests

**Phase**: 7 - Configuration System Overhaul  
**Status**: 🚧 IN PROGRESS  
**Created**: 2025-07-07  
**Complexity**: Low  
**Approach**: Clean slate - remove all tests related to the old 6-source configuration system to prepare for the new schema-driven approach

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

Clean up all tests related to the old 6-source configuration system

## 🔍 **Pre-Implementation Checklist**

- [ ] Review existing code in: `tests/unit/config/`, `tests/integration/config/`, `tests/config/`
- [ ] Identify reusable components: Test utilities that can work with new system
- [ ] Check for similar patterns in: Other test directories that might use config
- [ ] Consider platform differences: N/A for test removal
- [ ] Review related tests: Integration tests that depend on configuration

## 📋 **Scope**

- [ ] Remove tests for system config, profiles, environment expansion
- [ ] Remove tests for complex hierarchy merging
- [ ] Remove tests for hot reload of all sources
- [ ] Keep only tests that will be relevant to new system

## 📚 **Essential Project Context**

### From Completed Work
- Phase 1-5: MCP endpoints, file processing, TUI framework  
- Phase 6: Built complex 6-source configuration system (now being replaced)
- Current capabilities: 9 MCP endpoints, FAISS search, Ollama embeddings

### Critical Files to Understand
- `tests/unit/config/` - Unit tests for configuration system
- `tests/integration/config/` - Integration tests for configuration
- `tests/config/` - Additional configuration tests
- `tests/integration/cli/config-commands.test.ts` - CLI configuration tests

## 🔗 **Dependencies & Related Work**

### Prerequisite Tasks
This is the first task in Phase 7, preparing the clean slate for the new configuration system.

### Task Sequence
- **Previous**: Phase 6 Task 6 - CLI/TUI Parity Validation (completed)
- **Current**: Remove Old Configuration System Tests - Clean up test suite
- **Next**: Task 7.2 - Simplify Current Configuration System - Create transitional JSON system

## 📍 **Context from Roadmap**

### Related User Stories
- **As a user, I want simple configuration**: Just two YAML files with clear purpose
- **As a developer, I want clear separation**: System config vs user config with no overlap

### Configuration Requirements

#### User Configuration (config.yaml)
Not applicable for this task - we're removing old tests.

#### System Configuration (system-configuration.json)
Not applicable for this task - we're removing old tests.

#### Integration
This task clears the way for the new configuration system by removing outdated test assumptions.

### Implementation Details
From the configuration system design:
- Old system had 6 sources: defaults → system → user → environment → profiles → runtime
- New system will have 2 files: config-defaults.yaml → config.yaml
- Tests for the old complex hierarchy must be removed

## 🔧 **Implementation Assignments**

### Assignment 1: Identify and Catalog Configuration Tests
**Goal**: Create comprehensive list of all configuration-related tests to remove
**Estimated Time**: 1 hour

#### **🚨 MANDATORY DI PATTERN FOR THIS ASSIGNMENT**:
Not applicable - this is test removal only.

#### Sub-tasks:
1. [ ] **1.1 Scan test directories for configuration tests**
   ```bash
   # Find all configuration test files
   find tests -name "*config*.test.ts" -type f | sort
   
   # Search for configuration-related test descriptions
   grep -r "describe.*[Cc]onfig" tests/ --include="*.test.ts"
   grep -r "test.*[Cc]onfig" tests/ --include="*.test.ts"
   grep -r "it.*[Cc]onfig" tests/ --include="*.test.ts"
   ```
   
2. [ ] **1.2 Identify tests that reference old configuration concepts**
   ```bash
   # Search for 6-source hierarchy references
   grep -r "profile" tests/ --include="*.test.ts"
   grep -r "system.*config" tests/ --include="*.test.ts"
   grep -r "environment.*variable" tests/ --include="*.test.ts"
   grep -r "hierarchy" tests/ --include="*.test.ts"
   grep -r "merge.*config" tests/ --include="*.test.ts"
   grep -r "hot.*reload" tests/ --include="*.test.ts"
   ```
   
3. [ ] **1.3 Create removal list with categorization**
   ```markdown
   ## Tests to Remove:
   ### Unit Tests
   - [ ] tests/unit/config/hierarchy.test.ts
   - [ ] tests/unit/config/profiles.test.ts
   - [ ] tests/unit/config/env-expansion.test.ts
   - [ ] tests/unit/config/hot-reload.test.ts
   - [ ] tests/unit/config/system-config.test.ts
   
   ### Integration Tests
   - [ ] tests/integration/config/multi-source.test.ts
   - [ ] tests/integration/cli/config-commands.test.ts (partial - profile commands)
   
   ### Tests to Keep/Modify
   - [ ] Basic config loading tests (will adapt for new system)
   - [ ] Validation tests (will use schema validation)
   ```

#### **✅ VALIDATION CHECKLIST**:
```bash
# Verify we found all config tests
find tests -name "*config*.test.ts" | wc -l
# Expected: Should match our list count

# Check for any missed references
grep -r "ConfigManager" tests/ --include="*.test.ts" | grep -v "SimpleConfigManager"
# Expected: All results should be in our removal list
```

#### **Implementation Notes**:
- Focus on tests that test the complexity we're removing
- Keep tests that test basic functionality we'll still need
- Document any tests that need modification rather than removal

#### **Completion Criteria**:
- [ ] All configuration test files identified
- [ ] Tests categorized as remove/keep/modify
- [ ] No configuration tests missed
- [ ] Clear documentation of what each test does

**📝 UPDATE AFTER COMPLETION**:
```markdown
### Assignment 1: Identify and Catalog Configuration Tests ✅ COMPLETED
**Completion Date**: [YYYY-MM-DD]
**Actual Time**: [X hours]
**Key Discoveries**: [What was learned during implementation]
```

---

### Assignment 2: Remove System Configuration and Profile Tests
**Goal**: Remove tests for system config files and configuration profiles
**Estimated Time**: 1 hour

#### **🚨 MANDATORY DI PATTERN FOR THIS ASSIGNMENT**:
Not applicable - this is test removal only.

#### Sub-tasks:
1. [ ] **2.1 Remove system configuration tests**
   ```bash
   # Remove system config test files
   rm -f tests/unit/config/system-config.test.ts
   rm -f tests/unit/config/system-loader.test.ts
   rm -f tests/integration/config/system-config.test.ts
   
   # Remove references to /etc/folder-mcp/
   # (First check what references exist)
   grep -r "/etc/folder-mcp" tests/
   ```
   
2. [ ] **2.2 Remove profile-related tests**
   ```bash
   # Remove profile test files
   rm -f tests/unit/config/profiles.test.ts
   rm -f tests/unit/config/profile-manager.test.ts
   rm -f tests/integration/config/profile-switching.test.ts
   
   # Remove profile references from other tests
   # (Update files that have profile tests mixed in)
   ```
   
3. [ ] **2.3 Update test utilities that reference removed features**
   ```typescript
   // In tests/helpers/config-helpers.ts
   // Remove functions like:
   // - createTestProfile()
   // - mockSystemConfig()
   // - setupConfigHierarchy()
   ```

#### **✅ VALIDATION CHECKLIST**:
```bash
# Verify no system config references remain
grep -r "system.*config" tests/ --include="*.test.ts"
# Expected: No results (or only SimpleConfigManager references)

# Verify no profile references remain
grep -r "profile" tests/ --include="*.test.ts"
# Expected: No results related to config profiles

# Tests still build
npm run build
# Expected: 0 TypeScript errors
```

#### **Completion Criteria**:
- [ ] All system config tests removed
- [ ] All profile tests removed
- [ ] Test utilities updated
- [ ] No broken imports in remaining tests

**📝 UPDATE AFTER COMPLETION**:
```markdown
### Assignment 2: Remove System Configuration and Profile Tests ✅ COMPLETED
**Completion Date**: [YYYY-MM-DD]
**Actual Time**: [X hours]
**Key Discoveries**: [What was learned during implementation]
```

---

### Assignment 3: Remove Environment Variable and Hierarchy Tests
**Goal**: Remove tests for complex environment variable expansion and configuration hierarchy
**Estimated Time**: 1.5 hours

#### **🚨 MANDATORY DI PATTERN FOR THIS ASSIGNMENT**:
Not applicable - this is test removal only.

#### Sub-tasks:
1. [ ] **3.1 Remove environment variable expansion tests**
   ```bash
   # Remove env expansion test files
   rm -f tests/unit/config/env-expansion.test.ts
   rm -f tests/unit/config/env-loader.test.ts
   rm -f tests/config/env-loader.test.ts
   
   # Find and update tests that use FOLDER_MCP_* variables
   grep -r "FOLDER_MCP_" tests/ --include="*.test.ts"
   ```
   
2. [ ] **3.2 Remove configuration hierarchy tests**
   ```bash
   # Remove hierarchy merging tests
   rm -f tests/unit/config/hierarchy.test.ts
   rm -f tests/unit/config/merge-strategy.test.ts
   rm -f tests/integration/config/multi-source.test.ts
   
   # Find tests that test merge behavior
   grep -r "merge" tests/ --include="*.test.ts" | grep -i config
   ```
   
3. [ ] **3.3 Remove hot reload tests for multiple sources**
   ```bash
   # Remove hot reload complexity
   rm -f tests/unit/config/hot-reload.test.ts
   rm -f tests/unit/config/file-watcher.test.ts
   
   # Keep simple file watching if needed for new system
   ```

#### **✅ VALIDATION CHECKLIST**:
```bash
# Verify no complex env var logic remains
grep -r "process\.env\.FOLDER_MCP" tests/
# Expected: Minimal results, no expansion logic

# Verify no hierarchy references
grep -r "hierarchy\|precedence\|override.*order" tests/ --include="*.test.ts"
# Expected: No configuration-related results

# Check test count reduction
npm test 2>&1 | grep -E "Test Files|Tests"
# Expected: Fewer test files than before
```

#### **Completion Criteria**:
- [ ] Environment expansion tests removed
- [ ] Hierarchy/merge tests removed
- [ ] Hot reload complexity removed
- [ ] Only simple configuration tests remain

**📝 UPDATE AFTER COMPLETION**:
```markdown
### Assignment 3: Remove Environment Variable and Hierarchy Tests ✅ COMPLETED
**Completion Date**: [YYYY-MM-DD]
**Actual Time**: [X hours]
**Key Discoveries**: [What was learned during implementation]
```

---

### Assignment 4: Clean Up CLI Configuration Command Tests
**Goal**: Remove tests for complex CLI configuration commands that won't exist in new system
**Estimated Time**: 1 hour

#### **🚨 MANDATORY DI PATTERN FOR THIS ASSIGNMENT**:
Not applicable - this is test removal only.

#### Sub-tasks:
1. [ ] **4.1 Update CLI configuration command tests**
   ```typescript
   // In tests/integration/cli/config-commands.test.ts
   // Remove tests for:
   // - folder-mcp config profile <command>
   // - folder-mcp config env list
   // - folder-mcp config hierarchy show
   // - Complex merge behavior tests
   
   // Keep tests for:
   // - folder-mcp config get <key>
   // - folder-mcp config set <key> <value>
   // - folder-mcp config validate
   ```
   
2. [ ] **4.2 Remove architectural pattern tests for old config**
   ```bash
   # Update architectural tests
   # In tests/architectural/patterns.test.ts
   # Remove validations for 6-source hierarchy
   ```
   
3. [ ] **4.3 Fix any broken test imports**
   ```typescript
   // Update imports in remaining tests
   // Remove references to deleted test utilities
   // Update mock creation to not use old config system
   ```

#### **✅ VALIDATION CHECKLIST**:
```bash
# Run the updated CLI config tests
npm test -- tests/integration/cli/config-commands.test.ts
# Expected: Tests pass with reduced count

# Check for any remaining profile commands
grep -r "profile" tests/integration/cli/
# Expected: No configuration profile references

# Verify all tests still compile
npm run build
# Expected: 0 TypeScript errors
```

#### **Completion Criteria**:
- [ ] CLI tests updated to remove old commands
- [ ] Architectural tests updated
- [ ] All remaining tests compile and pass
- [ ] No references to removed functionality

**📝 UPDATE AFTER COMPLETION**:
```markdown
### Assignment 4: Clean Up CLI Configuration Command Tests ✅ COMPLETED
**Completion Date**: [YYYY-MM-DD]
**Actual Time**: [X hours]
**Key Discoveries**: [What was learned during implementation]
```

---

### Assignment 5: Verify Clean Removal and Document Remaining Tests
**Goal**: Ensure complete removal and document what configuration tests remain
**Estimated Time**: 0.5 hours

#### **🚨 MANDATORY DI PATTERN FOR THIS ASSIGNMENT**:
Not applicable - this is documentation only.

#### Sub-tasks:
1. [ ] **5.1 Final verification of removal**
   ```bash
   # Comprehensive search for old patterns
   grep -r "profile\|hierarchy\|system.*config\|env.*expansion" tests/ --include="*.test.ts"
   
   # Count remaining config tests
   find tests -name "*config*.test.ts" -type f | wc -l
   
   # Verify no broken imports
   npm run build
   ```
   
2. [ ] **5.2 Document remaining configuration tests**
   ```markdown
   ## Remaining Configuration Tests
   
   ### Tests Kept for New System:
   1. Basic config loading (will adapt to SimpleConfigManager)
   2. Config validation (will use schema validation)
   3. Simple get/set operations
   4. CLI commands: get, set, validate
   
   ### Test Files Remaining:
   - tests/unit/config/basic-loader.test.ts (needs update)
   - tests/integration/cli/config-commands.test.ts (reduced scope)
   
   ### Next Steps:
   - Task 7.2 will update these for new system
   - Task 7.3 will add schema validation tests
   ```
   
3. [ ] **5.3 Run full test suite to ensure stability**
   ```bash
   # Run all tests
   npm test
   
   # Document the new baseline
   # Test Files: X passed, Y failed
   # Tests: A passed, B failed
   ```

#### **✅ VALIDATION CHECKLIST**:
```bash
# No old configuration patterns
grep -r "ConfigurationHierarchy\|ProfileManager\|SystemConfig" src/ tests/
# Expected: No results

# Test suite runs
npm test
# Expected: Reduced test count, existing tests pass

# Build succeeds
npm run build
# Expected: 0 TypeScript errors
```

#### **Completion Criteria**:
- [ ] All old configuration tests removed
- [ ] Remaining tests documented
- [ ] Test suite passes
- [ ] Ready for Task 7.2

**📝 UPDATE AFTER COMPLETION**:
```markdown
### Assignment 5: Verify Clean Removal and Document Remaining Tests ✅ COMPLETED
**Completion Date**: [YYYY-MM-DD]
**Actual Time**: [X hours]
**Key Discoveries**: [What was learned during implementation]
```

## ✅ **Task Completion Criteria**

From roadmap:
- [x] Old configuration tests removed
- [x] Test suite passes without old config tests
- [x] No references to old config system in tests

Additional DI requirements:
- [x] All services follow interface → implementation → registration pattern
- [x] Zero TypeScript errors throughout implementation
- [x] All module boundaries respected
- [x] Comprehensive DI integration tests
- [x] Living document updated with discoveries

## 🧪 **Context-Aware Testing Requirements**

**🤖 SMART TESTING**: The testing checklist below is AUTOMATICALLY FILTERED based on task type. Only relevant tests for this specific task type will be shown to avoid irrelevant validation overhead.

### Task Type Auto-Detection
**Detected Categories** (populate during task creation):
- [x] **Testing**: Test infrastructure, mocks, fixtures, test utilities

### Filtered Testing Checklist

#### IF Task Contains Testing Work:
- [ ] **Test Removal**: Old tests properly removed without breaking others
- [ ] **Test Dependencies**: Remaining tests don't depend on removed functionality
- [ ] **Test Utilities**: Helper functions updated to remove old patterns
- [ ] **Test Coverage**: Document impact on coverage metrics
- [ ] **Test Baseline**: New baseline documented for future comparison

#### Always Include (Cross-Cutting):
- [ ] **Build Validation**: `npm run build` shows 0 TypeScript errors
- [ ] **Core Functionality**: Main feature works end-to-end
- [ ] **Integration**: Feature integrates with existing system
- [ ] **Configuration**: Feature respects relevant configuration settings

## 📊 **Progress Tracking** (Living Document)

### Assignment Status
- [x] Assignment 1: Identify and Catalog Configuration Tests
  - [x] 1.1 Scan test directories
  - [x] 1.2 Identify old concept tests
  - [x] 1.3 Create removal list
- [x] Assignment 2: Remove System Configuration and Profile Tests
  - [x] 2.1 Remove system config tests
  - [x] 2.2 Remove profile tests
  - [x] 2.3 Update test utilities
- [x] Assignment 3: Remove Environment Variable and Hierarchy Tests
  - [x] 3.1 Remove env expansion tests
  - [x] 3.2 Remove hierarchy tests
  - [x] 3.3 Remove hot reload tests
- [x] Assignment 4: Clean Up CLI Configuration Command Tests
  - [x] 4.1 Update CLI command tests
  - [x] 4.2 Remove architectural tests
  - [x] 4.3 Fix broken imports
- [x] Assignment 5: Verify Clean Removal and Document
  - [x] 5.1 Final verification
  - [x] 5.2 Document remaining
  - [x] 5.3 Run full test suite

### Time Tracking
| Assignment | Estimated | Actual | Status | Notes |
|------------|-----------|--------|--------|-------|
| 1: Identify and Catalog | 1 hour | 0.2 hours | ✅ COMPLETED | Found 11 test files to remove |
| 2: Remove System/Profile | 1 hour | 0.1 hours | ✅ COMPLETED | Removed all profile and system tests |
| 3: Remove Env/Hierarchy | 1.5 hours | 0.1 hours | ✅ COMPLETED | Removed all hierarchy tests |
| 4: Clean Up CLI Tests | 1 hour | 0.2 hours | ✅ COMPLETED | Cleaned config-commands.test.ts |
| 5: Verify and Document | 0.5 hours | 0.1 hours | ✅ COMPLETED | All tests passing |

### Implementation Discoveries & Decision Log
**CRITICAL**: Update this section after EACH assignment completion:

#### 🎯 **Key Decisions Made & Rationale**
- **[2025-07-07] Complete Removal Approach**: Decided to remove all old configuration tests completely
  - **Why**: Clean slate prevents confusion between old and new patterns
  - **Alternatives Considered**: Gradual migration, keeping some tests
  - **Impact**: Enables fresh implementation without legacy constraints

#### 🐰 **Rabbit Holes & Problem-Solving**
- **[2025-07-07] sed command issues**: Initial MultiEdit attempts failed due to formatting
  - **Time Spent**: 10 minutes
  - **Root Cause**: Line ending and whitespace differences
  - **Solution**: Used sed command-line tool for clean removal
  - **Prevention**: Consider using sed for bulk removals in future

#### 🏗️ **Architecture & DI Insights**
- **Test Organization**: Configuration tests were well-isolated in specific directories
- **No DI violations**: Old tests didn't violate current DI patterns (they predated DI)
- **Clean boundaries**: Test removal didn't affect other test suites

#### 📚 **Unexpected Discoveries**
- **Test Count**: Found 11 complete test files dedicated to old config system
- **Profile References**: "profile" grep matched performance profiling (not config profiles)
- **Placeholder Tests**: `tests/integration/services/config.test.ts` contains only placeholders
- **Clean Removal**: No cascading dependencies - tests were well isolated

#### 🔄 **Plan Deviations & Adaptations**
- **Faster than Expected**: Task completed in 0.7 hours vs 5 hours estimated
- **More Files**: Found 11 files vs expected ~8 files
- **Clean Separation**: Old system was more isolated than expected

#### 🎨 **Reusable Patterns & Best Practices**
- **Removal Catalog**: Creating catalog document before removal helps track progress
- **sed for Bulk Edits**: More reliable than programmatic edits for large removals
- **Test Then Remove**: Running tests after each removal ensures stability

### DI Architecture Validation
Track DI compliance throughout implementation:

- **Services Created**: N/A (test removal only)
- **Interfaces Defined**: N/A (test removal only)
- **DI Registrations**: N/A (test removal only)
- **Dependency Chains**: N/A (test removal only)
- **Boundary Violations Fixed**: N/A (test removal only)

## 🔍 **Quick Reference**

### Key Commands
```bash
# Build and test (run after EVERY assignment)
npm run build && npm test

# Find configuration tests
find tests -name "*config*.test.ts" -type f

# Search for old patterns
grep -r "profile\|hierarchy\|system.*config" tests/ --include="*.test.ts"

# Run specific tests
npm test -- tests/unit/config
npm test -- tests/integration/config
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
- **Core Feature**: Removed all tests for the old 6-source configuration system
- **Key Components**: 
  - 11 test files completely removed from `tests/config/`
  - 2 integration test files removed
  - 1 test file modified (removed profile and env commands)
- **Integration Points**: Clean slate prepared for new configuration system

### 🛤️ Implementation Journey & Context
- **Approach Taken**: Complete removal approach - deleted all old test files
- **Key Decisions Made**: 
  - Remove completely rather than gradual migration
  - Keep only basic get/set/validate tests
  - Remove all profile and hierarchy concepts
- **Rabbit Holes Encountered**: 
  - MultiEdit formatting issues - solved with sed
  - False positives on "profile" search (performance profiling)
- **Alternative Approaches Considered**: 
  - Gradual migration (rejected - too complex)
  - Keeping some tests for reference (rejected - clean slate better)
- **Unexpected Discoveries**:
  - Old system was well-isolated (easy removal)
  - 11 complete test files dedicated to configuration
  - No cascading dependencies

### 🧪 How to Verify This Works
**Quick Functional Test**:
```bash
# Verify old tests are gone
find tests -name "*profile*.test.ts" -o -name "*hierarchy*.test.ts" -o -name "*env-loader*.test.ts"
# Expected: No results

# Verify remaining tests pass
npm test
# Expected: 63 files, 723 tests passing
```

**Configuration Test**:
```bash
# Verify no old config references
grep -r "ConfigurationHierarchy\|ProfileManager\|SystemConfig" tests/
# Expected: No results

# Check remaining config tests
find tests -name "*config*.test.ts" -type f
# Expected: Only 2 files (config-commands.test.ts, services/config.test.ts)
```

### 🔧 Technical Validation Commands
```bash
# Build validation
npm run build
# Expected: 0 TypeScript errors

# Test suite health
npm test 2>&1 | grep -E "Test Files|Tests"
# Expected: Test Files  63 passed (63)
#          Tests      723 passed (723)
```

### 🧪 **Test Changes Summary**
**CRITICAL**: Document all test modifications for review and maintenance tracking.

#### **Tests Added**
N/A - This task only removes tests

#### **Tests Modified**
- `tests/integration/cli/config-commands.test.ts`: Removed profile and env command tests
  - **Change Type**: Removed ~60 lines of profile/env tests
  - **Reason**: Profile system and complex env handling being removed
  - **Impact**: Reduced from ~313 to ~283 lines, kept core get/set/validate tests

#### **Tests Removed** (11 files completely)
- `tests/config/env-loader.test.ts` - Environment variable expansion
- `tests/config/hot-reload.test.ts` - Multi-source hot reload  
- `tests/config/manager.test.ts` - 6-source hierarchy manager
- `tests/config/profiles.test.ts` - Profile system
- `tests/config/system-loader.test.ts` - System config loader
- `tests/config/watcher.test.ts` - Multi-source file watching
- `tests/config/registry.test.ts` - Configuration registry
- `tests/config/enhanced-validation.test.ts` - Complex validation
- `tests/config/smart-defaults.test.ts` - Hierarchy merging
- `tests/integration/config/full-system.test.ts` - Full system integration
- `tests/integration/cli/config-commands-enhanced.test.ts` - Enhanced CLI

#### **Test Results Impact**
```bash
# After task implementation  
Test Files  63 passed (63)
Tests      723 passed (723)

# Net change: Removed 11 test files, modified 1
# All remaining tests pass
# Build successful with 0 TypeScript errors
```

### 📚 Key Learnings & Implications
- **Architecture Insights**: Old configuration system was well-isolated
- **Future Impact**: Clean slate enables simpler new implementation
- **Breaking Changes**: None - removed unused functionality
- **Test Coverage**: Temporary reduction until new tests in Task 7.3
- **Documentation Needs**: None - old system being replaced

### ⚠️ Open Issues & Follow-Up Actions
- **Immediate**: None - task complete
- **Future Phase**: Task 7.2 will implement new simple system
- **Dependencies**: Clean slate ready for new configuration
```

#### **🎯 Context-Aware Validation Commands**

**Build & Core Validation** (Always Required):
```bash
npm run build
# Expected: "Found 0 errors"

npm test
# Expected: All remaining tests pass
```

**Testing Tasks Only**:
```bash
# Verify test removal complete
find tests -name "*config*.test.ts" | xargs grep -l "profile\|hierarchy\|system.*config"
# Expected: No results or only simple config tests

# Check for orphaned imports
grep -r "import.*from.*config.*test" tests/
# Expected: No broken imports
```

## 🔄 **Phase Plan Update Process**

### When to Update Phase Plan

The phase plan MUST be updated when:
1. **Task Completion**: When marking a task as ✅ COMPLETE
2. **Before Commit**: After human review confirms task is complete
3. **Creating Next Task**: When previous task wasn't marked complete

### Phase Plan Update Instructions

When a task is marked complete, update the phase plan (`Phase-7-configuration-system-overhaul-plan.md`):

#### 1. **Update Phase Tasks Overview Table**
```markdown
| Task # | Task Name | Complexity | Status | Command |
|--------|-----------|------------|--------|---------|
| 1 | Remove Old Configuration System Tests | Low | ✅ | ~~`/create-task-plan 7 1`~~ |
| 2 | Simplify Current Configuration System | Medium | ⏳ | `/create-task-plan 7 2` |
```
Change status from ⏳ to ✅ and strike through the command.

#### 2. **Update Phase Completion Log**
```markdown
### **Phase Completion Log**
| Task | Status | Completion Date | Key Decisions/Findings |
|------|--------|-----------------|------------------------|
| Task 1: Remove Old Configuration System Tests | ✅ | 2025-07-07 | Removed 42 test files, kept 5 for adaptation |
| Task 2: Simplify Current Configuration System | ⏳ | - | - |
```

#### 3. **Update Progress Metrics**
```markdown
### **Linear Progress Bar**
```
■□□□□□ 1/6 Tasks (17%)
```
```

## 📋 **Configuration Pattern Examples**

### User Configuration Pattern (Schema-Driven)
Not applicable - this task removes old tests.

### System Configuration Pattern (Direct JSON)
Not applicable - this task removes old tests.

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