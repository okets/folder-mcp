# Phase 7: Configuration System Overhaul Implementation Plan

**Status**: 📋 PLANNED  
**Start Date**: 2025-07-07  
**Target Completion**: ~2-3 weeks  

## 🎯 **Phase Overview**

**Goal**: Replace the complex 6-source configuration system with a simple, schema-driven system focused on user configurations

### **User Stories**
- **As a user, I want simple configuration**: Just two YAML files with clear purpose
- **As a user, I want schema validation**: Know immediately if my config is wrong
- **As a user, I want dynamic UI**: Configuration options that adapt based on my choices
- **As a developer, I want clear separation**: System config vs user config with no overlap

### **Success Criteria**
- Simple 2-file configuration system operational
- Schema drives both CLI and TUI interfaces
- All user configs in config.yaml with defaults
- System configs isolated in system-configuration.json
- Clean, maintainable configuration architecture
- Old 6-source system completely removed
- No regression in existing functionality

## 🏗️ **Implementation Strategy**

### **Core Philosophy**
This phase is a major architectural overhaul that simplifies the configuration system while adding powerful schema-driven capabilities. The philosophy is to dramatically reduce complexity while increasing functionality.

- **Simplification First**: Remove complexity before adding new features
- **Schema-Driven Design**: Let schemas define structure, validation, and UI
- **Clear Boundaries**: Separate user-facing from internal configurations
- **Test Continuously**: Ensure no regression as we overhaul the system

### **Implementation Approach**
- **Incremental Migration**: Move from complex to simple without breaking functionality
- **Test Coverage Maintenance**: Keep tests passing throughout the overhaul
- **Schema-First Design**: Define complete structure before implementation
- **Clean Slate Testing**: Remove old tests, write new ones for the new system
- **Reuse Existing Components**: Leverage existing TUI components and patterns

### **Why This Order?**
The tasks have been carefully ordered to minimize risk while maximizing progress:

1. **Remove Old Tests First**: Clean slate prevents confusion between old and new patterns. We must remove the old test assumptions before building new ones.
2. **Simplify to JSON**: Creates stable foundation while we build new system. This gives us a working state to fall back to if needed.
3. **Implement New System**: Build schema-driven system with single test case. Proves the concept with minimal complexity.
4. **Update TUI**: Connect UI to real configuration system. Validates that schema-driven UI generation works.
5. **Expand Coverage**: Add all user configurations systematically. Only after proving the pattern works do we scale it up.
6. **Update Roadmap**: Ensure future phases use new system. Documentation prevents future confusion.

This order ensures:
- We maintain a working system throughout the overhaul
- Each step validates the previous one
- We can rollback at any point if issues arise
- Complex changes come after simple ones are proven

## 📚 **MUST READ - Essential Project Context**

### Project Goal
folder-mcp is a Model Context Protocol (MCP) server that provides LLMs with semantic file system access. This phase establishes the configuration foundation that will drive all future features, replacing a complex 6-source system with a simple 2-file approach.

### Architecture Overview
The configuration system is central to folder-mcp's architecture:
- **Configuration Manager**: Loads and provides configuration to all components
- **Schema System**: Defines structure, validation, and UI generation
- **DI Container**: All services access configuration through dependency injection

### Key Concepts & Terminology
- **User Configuration**: Settings exposed to users via schema-driven UI (config.yaml)
- **System Configuration**: Internal application settings (system-configuration.json)
- **Configuration Schema**: Defines structure, validation rules, and UI hints
- **SimpleConfigManager**: Minimal manager that loads and merges YAML files
- **ConfigurationItemFactory**: Converts schemas to TUI components

### Development Philosophy
- **Configuration-First**: Every feature must be configurable
- **Progressive Disclosure**: Simple defaults with deep customization available
- **Zero Config**: Works perfectly without any configuration file
- **Schema-Driven UI**: Configuration options automatically generate UI

### Success Metrics
This phase directly impacts:
- **Ease of Use**: 90% of users succeed with default settings
- **Flexibility**: Power users can customize all aspects
- **Maintainability**: Clear separation reduces complexity

## 📍 **Current System State**

### What We Have (Foundation)
- ✅ Complex 6-source configuration system (defaults → system → user → environment → profiles → runtime)
- ✅ Environment variable expansion and complex merging
- ✅ Configuration profiles for different setups
- ✅ Comprehensive test coverage for old system
- ✅ Working CLI and TUI that use current configuration

### What This Phase Adds
- ❌ Simple 2-file configuration system (config-defaults.yaml → config.yaml)
- ❌ Schema-driven configuration with automatic UI generation
- ❌ Clear separation between user and system configurations
- ❌ External data sources for dynamic content (JSON files)
- ❌ Simplified testing and validation

## 🚨 **Safety Framework**

### **Backup Strategy**
```bash
# Create backup branch before starting Phase 7
git checkout -b backup/pre-phase-7
git add -A
git commit -m "Backup before Phase 7: Configuration System Overhaul"

# Create phase branch  
git checkout -b phase-7-implementation
```

### **Rollback Plan**
```bash
# If major issues arise, return to backup
git checkout backup/pre-phase-7
git checkout -b phase-7-retry
```

## 🔍 **Pre-Implementation Review**

### **What to Review**
- Current configuration system implementation in `src/config/`
- All configuration-related tests in `tests/unit/config/`
- Environment variable usage throughout codebase
- Current CLI commands that interact with configuration
- TUI components that display configuration

### **Expected Findings**
- Heavy use of environment variables throughout code
- Complex hierarchy merging logic
- Profile system that can be removed
- Tests that will become obsolete
- Opportunities to simplify significantly

## 📋 **Phase Tasks Overview**

Total Tasks: 6
Estimated Duration: ~14 days

| Task # | Task Name | Complexity | Status | Command |
|--------|-----------|------------|--------|---------|
| 1 | Remove Old Configuration System Tests | Low | ⏳ | `/create-task-plan 7 1` |
| 2 | Simplify Current Configuration System | Medium | ⏳ | `/create-task-plan 7 2` |
| 3 | Implement New User Configuration System | High | ⏳ | `/create-task-plan 7 3` |
| 4 | Create Schema-Driven TUI | High | ⏳ | `/create-task-plan 7 4` |
| 5 | Define All User Configurations | Medium | ⏳ | `/create-task-plan 7 5` |
| 6 | Update Roadmap for New Architecture | Low | ⏳ | `/create-task-plan 7 6` |

### **Task Order Rationale**
1. **Task 1**: Clean up tests first to avoid confusion between old and new patterns
2. **Task 2**: Create stable JSON-based system as transitional step
3. **Task 3**: Build new schema-driven system with minimal test case
4. **Task 4**: Connect TUI to new system, proving the concept works
5. **Task 5**: Systematically add all user configurations
6. **Task 6**: Update documentation to prevent future confusion

## 🔗 **Dependencies & Related Work**

### Prerequisite Phases
- **Phase 1-5**: Core MCP implementation complete
- **Phase 6**: Configuration foundation established (though being replaced)
- **Completed Components**: Working MCP server, TUI framework, CLI structure

### Inter-Task Dependencies
- Task 1 → Task 2: Must remove old tests before simplifying
- Task 2 → Task 3: Need stable system before building new one
- Task 3 → Task 4: Schema system must exist before TUI integration
- Task 4 → Task 5: Prove concept with one config before adding all
- Task 5 → Task 6: Need final system before updating documentation

### Future Dependencies
- **Phase 8+**: All future phases will use the new configuration system
- **Feature Development**: Every new feature adds to configuration schema
- **TUI Evolution**: UI automatically grows with configuration additions

### External Dependencies
- **js-yaml**: For YAML file parsing
- **lodash**: For object manipulation (get/set operations)
- **Existing TUI components**: SelectionListItem, ConfigurationListItem

## 🎯 **Implementation Order**

### Sequential Execution Plan:
1. **Remove Old Tests**: Clean slate for new implementation
2. **JSON Simplification**: Stable intermediate state
3. **Schema System**: Core of new architecture
4. **TUI Integration**: Prove schema-driven UI works
5. **Full Migration**: Move all configurations systematically
6. **Documentation**: Update for future development

### Task Dependencies:
- Task order is critical - no parallel execution possible
- Each task assumes all previous tasks are complete
- Clear handoff points between tasks
- Measurable progress: X/6 tasks = Y% complete

## 📚 **Key Implementation Details from Roadmap**

### Task 3: Implement New User Configuration System
- **Reference Documents**:
  - `configuration-system-design.md` - Complete architecture
  - `configurable-parameters.md` - Schema examples
- **Test Configuration** (User Config):
  ```yaml
  # config-defaults.yaml
  modelName: "nomic-embed-text"
  
  # Schema includes detailsSource pointing to data/embedding-models.json
  ```

### Task 4: Create Schema-Driven TUI
- **TUI Changes**:
  - MainPanel: Real configuration items from schema
  - SecondaryPanel: Test items for reference
  - Model selection with detailed comparison view
  - Real-time validation from schema

### Task 5: Define All User Configurations
- **User Configuration Categories**:
  - Embedding settings (models, batch sizes)
  - File processing (extensions, patterns, limits)
  - UI preferences (themes, display options)  
  - Performance tuning (cache, concurrency)
  - Feature flags (development mode, etc.)

## 🚨 **MANDATORY ARCHITECTURAL REQUIREMENTS**

### **🏗️ DI ENFORCEMENT THROUGHOUT**
Every service/manager created in this phase MUST follow:

1. **Interface First** (Domain Layer):
   ```typescript
   // domain/config/IConfigManager.ts
   export interface IConfigManager {
     get(key: string): any;
     set(key: string, value: any): Promise<void>;
   }
   ```

2. **Constructor Injection** (Application Layer):
   ```typescript
   // application/config/SimpleConfigManager.ts
   export class SimpleConfigManager implements IConfigManager {
     constructor(
       private readonly fileLoader: IFileLoader,
       private readonly validator: ISchemaValidator
     ) {}
   }
   ```

3. **DI Registration** (DI Layer):
   ```typescript
   // di/setup.ts
   container.register<IConfigManager>(CONFIG_TOKENS.CONFIG_MANAGER, {
     useClass: SimpleConfigManager,
     lifecycle: Lifecycle.Singleton
   });
   ```

### **📐 Module Boundary Rules**
- Domain: Interfaces ONLY (IConfigManager, ISchemaValidator)
- Application: Business logic with DI (SimpleConfigManager, ConfigurationItemFactory)
- Infrastructure: File operations, YAML parsing
- Interface: CLI commands and TUI components

### **✅ VALIDATION AFTER EACH TASK**
```bash
npm run build  # MUST show 0 TypeScript errors
npm test       # All tests MUST pass
```

## 📊 **Phase Progress Tracking**

### **Overall Status**
- [ ] Phase backup created
- [ ] Phase documentation reviewed
- [ ] All task plans generated
- [ ] Task 1: Remove Old Configuration System Tests
- [ ] Task 2: Simplify Current Configuration System
- [ ] Task 3: Implement New User Configuration System
- [ ] Task 4: Create Schema-Driven TUI
- [ ] Task 5: Define All User Configurations
- [ ] Task 6: Update Roadmap for New Architecture

### **Phase Metrics**
| Metric | Target | Current | Status | Progress |
|--------|--------|---------|--------|----------|
| Tasks Completed | 6 | 0 | 🔴 | 0% |
| Test Coverage | 80%+ | - | ⏳ | - |
| Documentation | Complete | - | ⏳ | - |
| Time Elapsed | 14-21 days | 0 | ⏳ | 0% |

### **Linear Progress Bar**
```
□□□□□□ 0/6 Tasks (0%)
```

### **Phase Completion Log**
| Task | Status | Completion Date | Key Decisions/Findings |
|------|--------|-----------------|------------------------|
| Pre-Implementation Review | ⏳ | - | - |
| Task 1: Remove Old Configuration System Tests | ⏳ | - | - |
| Task 2: Simplify Current Configuration System | ⏳ | - | - |
| Task 3: Implement New User Configuration System | ⏳ | - | - |
| Task 4: Create Schema-Driven TUI | ⏳ | - | - |
| Task 5: Define All User Configurations | ⏳ | - | - |
| Task 6: Update Roadmap for New Architecture | ⏳ | - | - |

### **Milestone Tracking**
| Milestone | Date | Notes |
|-----------|------|-------|
| Phase Started | - | - |
| First Task Complete | - | - |
| 50% Complete | - | - |
| All Tasks Complete | - | - |
| Phase Review | - | - |

## 🔍 **Phase-Specific Context**

### Key Architecture Concepts
**Configuration System (After Phase 7)**:
1. **Defaults**: `config-defaults.yaml` with sensible defaults
2. **User Config**: `~/.folder-mcp/config.yaml` for user overrides  
3. **CLI Arguments**: Command-line flags for temporary overrides

**Schema-Driven**: Configuration structure defined by schemas that drive both validation and UI generation

### Configuration Examples

**User Configuration Schema** (from configuration-system-design.md):
```typescript
interface ConfigItem {
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'path' | 'array';
  label: string;
  description: string;
  required?: boolean;
  
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: string[];
  };
  
  ui?: {
    component?: 'text' | 'password' | 'select' | 'checkbox' | 'radio' | 'file' | 'folder' | 'detailed-select';
    placeholder?: string;
    helpText?: string;
    columns?: string[];
  };
  
  detailsSource?: string;      // Path to JSON file with option details
  detailsColumns?: string[];   // Columns to display from the data
  valueColumn?: string;        // Which column contains the option value
}
```

**Example Configuration Files After Phase 7**:

```yaml
# config-defaults.yaml (read-only, shipped with application)
modelName: "nomic-embed-text"
batchSize: 32
maxFileSize: 10485760  # 10MB
enableDevelopmentMode: false
logLevel: "info"

# config.yaml (user modifications only)
modelName: "mxbai-embed-large"
batchSize: 64
enableDevelopmentMode: true
```

**Example Schema Definition**:
```typescript
// schemas/embedding-config.schema.ts
export const embeddingConfigSchema: ConfigSchema = {
  modelName: {
    type: 'select',
    label: 'Embedding Model',
    description: 'Select the model for generating embeddings',
    ui: { component: 'detailed-select' },
    detailsSource: 'data/embedding-models.json',
    detailsColumns: ['provider', 'dimensions', 'speed', 'quality'],
    valueColumn: 'id'
  },
  batchSize: {
    type: 'number',
    label: 'Batch Size',
    description: 'Number of documents to process in parallel',
    validation: { min: 1, max: 256 }
  }
}
```

### Related Roadmap Sections
- **Configuration Architecture**: Defines the philosophy and structure
- **Reference Documents**:
  - `configuration-system-design.md` - Complete design specification
  - `configurable-parameters.md` - Schema examples and parameter documentation

### Configuration Guidance for This Phase
- **User Configurations**: Settings that users control via config.yaml with schema
- **System Configurations**: Internal settings in system-configuration.json
- **Migration Note**: Phase 7 introduces the new 2-file configuration system
- **Key Principle**: User-facing = schema-driven, Internal = direct JSON

## ✅ **Phase Validation**

### Build Validation
```bash
npm run build
# Expected: 0 errors after phase completion
```

### Test Suite Validation
```bash
npm test
# Expected: All existing tests pass + new configuration tests
```

### Feature Validation
```bash
# Test new configuration system
npx folder-mcp config get modelName
# Expected: Shows current model configuration

# Test TUI configuration
npx folder-mcp tui
# Expected: MainPanel shows real configuration options

# Test schema validation
npx folder-mcp config set modelName "invalid-model"
# Expected: Validation error with helpful message

# Test configuration merging
echo "modelName: 'test-model'" > ~/.folder-mcp/config.yaml
npx folder-mcp config get modelName
# Expected: Shows 'test-model' (user override)

# Test external data loading
npx folder-mcp config show --schema modelName
# Expected: Shows options loaded from data/embedding-models.json
```

## 🚨 **Critical Configuration System Changes**

### What Gets Removed
Based on the current 6-source system, Phase 7 will remove:

1. **Configuration Profiles** (`~/.folder-mcp/profiles/`)
   - No more profile switching
   - No more profile-specific configs
   
2. **Complex Environment Variable System**
   - Only keep essential environment variables
   - Remove complex expansion and nesting
   
3. **Runtime Configuration Layer**
   - CLI flags will directly modify config.yaml
   - No temporary in-memory overrides
   
4. **System Config** (`/etc/folder-mcp/config.yaml`)
   - Move any needed values to defaults
   - Single user config location

### What Gets Added
1. **Schema-Driven System**
   - Schemas define structure and validation
   - Automatic UI generation from schemas
   
2. **External Data Sources**
   - JSON files for dynamic lists (models, etc.)
   - Decoupled from schema definitions
   
3. **Simple Two-File System**
   - `config-defaults.yaml` - Read-only defaults
   - `config.yaml` - User modifications only

### Migration Impact
- **Breaking Change**: Old configuration files won't work
- **No Migration Path**: Users must recreate configs
- **Clean Installation**: Remove `~/.folder-mcp` before Phase 7

## 📝 **Phase Completion Checklist**

Before marking this phase complete:
- [ ] All tasks completed and validated
- [ ] No regression in existing functionality  
- [ ] Configuration documentation updated
- [ ] Tests cover new configuration system
- [ ] Phase review conducted
- [ ] All future phases can use new system
- [ ] Old 6-source system completely removed
- [ ] Schema system fully operational
- [ ] TUI generates from schemas automatically

**Phase 7 Completion Review**:
After completing all Phase 7 tasks, conduct mandatory review:
- **Configuration Simplicity**: Is the 2-file system truly simpler?
- **Schema Effectiveness**: Do schemas successfully drive UI generation?
- **Separation of Concerns**: Are user and system configs clearly separated?
- **Developer Experience**: Is adding new configs straightforward?
- **User Experience**: Can users easily understand and modify configs?
- **Performance Impact**: Does the new system add any overhead?
- **Test Coverage**: Are all configuration scenarios tested?
- **Documentation Quality**: Is the new system well documented?

## 🚀 **Next Steps**

After completing this phase:
1. Run `/create-phase-plan 8` for Phase 8: Enhanced UX & Core Features
2. Conduct phase retrospective on configuration overhaul
3. Update roadmap with actual timings

---

**To implement individual tasks, use:**
```
/create-task-plan 7 1  # Start with first task
```