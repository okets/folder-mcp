# Task 7.2: Simplify Current Configuration System

**Phase**: 7 - Configuration System Overhaul  
**Status**: 🚧 IN PROGRESS  
**Created**: 2025-07-07  
**Complexity**: Medium  
**Approach**: Create transitional single JSON file system as stepping stone to new architecture

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

Move all current configurations to a single system-configuration.json file

## 🔍 **Pre-Implementation Checklist**

- [ ] Review existing code in: `src/config/`, `src/application/config/`, `src/infrastructure/config/`
- [ ] Identify reusable components: Current ConfigurationManager, validation logic
- [ ] Check for similar patterns in: Other JSON loading services
- [ ] Consider platform differences: File paths on Windows/Unix
- [ ] Review related tests: `tests/integration/cli/config-commands.test.ts`

## 📋 **Scope**

- [ ] Create system-configuration.json with ALL current configs
- [ ] Include both system and user-related configurations temporarily
- [ ] Simple JSON loader that reads this file on startup
- [ ] No hierarchy, no merging, no environment variables
- [ ] Write tests for simple JSON loading mechanism

## 📚 **Essential Project Context**

### From Completed Work
- Phase 1-5: MCP endpoints, file processing, TUI framework  
- Phase 6: Built complex 6-source configuration system (now simplifying)
- Phase 7 Task 1: Removed all old configuration tests
- Current capabilities: 9 MCP endpoints, FAISS search, Ollama embeddings

### Critical Files to Understand
- `src/config/` - Current configuration system implementation
- `src/di/tokens.ts` - DI tokens for configuration services
- `src/interfaces/cli/commands/config.ts` - CLI config commands
- `src/application/services/FolderManager.ts` - Uses configuration

## 🔗 **Dependencies & Related Work**

### Prerequisite Tasks
- Phase 7 Task 1: Remove Old Configuration System Tests (✅ COMPLETED)

### Task Sequence
- **Previous**: Task 7.1 - Remove Old Configuration System Tests (removed test constraints)
- **Current**: Simplify Current Configuration System - Create transitional JSON system
- **Next**: Task 7.3 - Implement New User Configuration System - Build schema-driven system

## 📍 **Context from Roadmap**

### Related User Stories
- **As a user, I want simple configuration**: Just two YAML files with clear purpose
- **As a developer, I want clear separation**: System config vs user config with no overlap

### Configuration Requirements

#### User Configuration (config.yaml)
Not applicable for this task - this is transitional system only.

#### System Configuration (system-configuration.json)
- **Purpose**: Temporarily hold ALL configurations in one place
- **Location**: Project root or `~/.folder-mcp/`
- **Loading**: Simple JSON.parse() with no processing
- **No Schema**: This is transitional - schema comes in Task 7.3

#### Integration
- Replace complex ConfigurationManager with SimpleJsonConfigLoader
- All services continue to use configuration through DI
- No changes to service interfaces - only implementation

### Implementation Details
**Configuration Items to Move**:
- Model settings (modelName, batchSize, etc.)
- File processing settings (extensions, ignore patterns)
- Performance settings
- Development flags
- All other current configurations

## 🔧 **Implementation Assignments**

### Assignment 1: Analyze Current Configuration Usage ✅ COMPLETED
**Goal**: Map all configuration values currently in use
**Estimated Time**: 1 hour
**Actual Time**: 0.3 hours
**Completion Date**: 2025-07-07

#### **🚨 MANDATORY DI PATTERN FOR THIS ASSIGNMENT**:
Analysis only - no new services created.

#### Sub-tasks:
1. [x] **1.1 Find all configuration access points**
   ```bash
   # Search for configuration usage
   grep -r "config\." src/ --include="*.ts" | grep -v "test"
   # Found: 34 files using config.* pattern
   
   grep -r "getConfig\|configuration" src/ --include="*.ts"
   # Found: 17 files using configuration manager
   
   # Find DI token usage
   grep -r "CONFIG_TOKENS" src/ --include="*.ts"
   # Found usage in DI setup and services
   ```
   
2. [x] **1.2 Document current configuration structure**
   ```markdown
   ## Current Configuration Values:
   ### Model Settings (ProcessingConfig)
   - modelName: string (default: "all-minilm" or smart: "nomic-embed-text")
   - batchSize: number (default: 32, smart: 16-64 based on memory)
   - chunkSize: number (default: 1000, smart: 500-2000 based on tier)
   - overlap: number (default: 10% of chunk size)
   - maxWorkers: number
   - timeoutMs: number
   - maxConcurrentOperations: number (default: 14, smart: 4-20 based on CPU)
   
   ### File Processing (FileConfig)
   - extensions: string[] (default: ['.txt', '.md', '.pdf', '.docx', etc.])
   - ignorePatterns: string[] (default: ['node_modules/**', '.git/**', etc.])
   - maxFileSize: number
   - encoding: string
   
   ### Server Settings (ServerConfig)
   - port: number
   - transport: 'stdio' | 'http'
   - autoStart: boolean
   - host: string
   
   ### Daemon Configuration (DaemonConfig)
   - enabled: boolean (default: false)
   - port?: number
   - pidFile?: string
   - healthCheck: { enabled, interval: 30s, timeout: 5s, retries: 3 }
   - autoRestart: { enabled, maxRetries: 5, delay: 1s, exponentialBackoff }
   - performance: { monitoring, metricsInterval: 60s, logLevel, tracking }
   - shutdownTimeout: 10s
   - shutdownSignal: 'SIGTERM'
   - reloadSignal: 'SIGHUP'
   
   ### UI/UX Settings (UIConfig)
   - fullScreen: boolean
   - verboseLogging: boolean
   - showProgress: boolean
   - theme: 'light' | 'dark' | 'auto'
   - logLevel: 'quiet' | 'normal' | 'verbose'
   
   ### Transport Configuration (TransportConfig)
   - enabled: boolean
   - activeTransports: array
   - selection strategy
   - local/remote/http settings
   - security settings
   
   ### Cache Configuration (CacheConfig)
   - enabled: boolean
   - maxSize: number
   - cleanupInterval: number
   - compressionEnabled: boolean
   
   ### Development Settings
   - enableDebugOutput: boolean (default: false)
   - mockOllamaApi: boolean (default: false)
   - skipGpuDetection: boolean (default: false)
   - developmentMode: boolean (from env: ENABLE_ENHANCED_MCP_FEATURES)
   
   ### Folders Configuration
   - defaults: { exclude, embeddings, performance }
   - list: Array of folder configs with path, name, enabled, settings
   ```
   
3. [x] **1.3 Identify configuration dependencies**
   ```typescript
   // Services that depend on configuration:
   // - OllamaEmbeddingService: uses model settings (modelName, batchSize)
   // - FolderManager: uses file patterns (extensions, ignorePatterns)
   // - DaemonService: uses daemon config (all daemon settings)
   // - ConfigurationManager: orchestrates all config sources
   // - SmartDefaultsGenerator: generates defaults based on system capabilities
   // - CacheStorage: uses cache settings
   // - Logger: uses logLevel settings
   // - MCP Server: uses server config
   // - CLI Commands: use various configs for display/behavior
   ```

#### **✅ VALIDATION CHECKLIST**:
```bash
# Verify we found all config usage
grep -r "ConfigurationManager" src/ | wc -l
# Result: 17 files use ConfigurationManager

# Check for environment variable usage
grep -r "process\.env\.FOLDER_MCP" src/
# Result: Found env var expansion in config system
# Also found: ENABLE_ENHANCED_MCP_FEATURES for dev mode
```

#### **Implementation Notes**:
- Configuration system is highly complex with 6 sources
- Smart defaults system adapts to system capabilities
- Multiple config interfaces for different layers
- Heavy use of DI for configuration distribution
- Daemon config is comprehensive with health/restart/perf

#### **Completion Criteria**:
- [x] All configuration values documented
- [x] All consuming services identified
- [x] Default values captured
- [x] No configuration usage missed

**📝 Key Discoveries**:
- **Configuration Complexity**: The system has grown to include 8+ major config sections
- **Smart Defaults**: Sophisticated system that detects CPU, memory, GPU to set optimal values
- **Three-tier Performance**: Low/Medium/High tiers adjust batch sizes, concurrency, chunk sizes
- **Comprehensive Daemon Config**: Full process management with health checks, auto-restart, monitoring
- **Transport Flexibility**: Multiple transport options (stdio, local socket, remote, HTTP)
- **Development Flags**: Both config-based and env var-based development modes

---

### Assignment 2: Create system-configuration.json ✅ COMPLETED
**Goal**: Create single JSON file with all current configurations
**Estimated Time**: 1.5 hours
**Actual Time**: 0.2 hours
**Completion Date**: 2025-07-07

#### **🚨 MANDATORY DI PATTERN FOR THIS ASSIGNMENT**:
Not applicable - creating data file only.

#### Sub-tasks:
1. [x] **2.1 Create comprehensive JSON structure**
   ```json
   // system-configuration.json created with all sections:
   {
     "model": { /* Processing configuration */ },
     "fileProcessing": { /* File handling settings */ },
     "server": { /* Server configuration */ },
     "daemon": { /* Complete daemon config with health/restart/perf */ },
     "ui": { /* UI/UX preferences */ },
     "transport": { /* Transport layer config */ },
     "cache": { /* Cache settings */ },
     "development": { /* Dev flags */ },
     "folders": { /* Folder defaults and list */ },
     "systemCapabilities": { /* System detection */ },
     "profiles": { /* Profile system (disabled) */ },
     "metadata": { /* File metadata */ }
   }
   ```
   
2. [x] **2.2 Include ALL configuration values**
   ```bash
   # Included all 12 major configuration sections
   # Added sensible defaults based on existing code
   # Preserved smart defaults logic (will be removed later)
   # Added metadata section for versioning
   ```
   
3. [x] **2.3 Place file in correct location**
   ```bash
   # Created in both locations:
   # 1. Project root: /Users/hanan/Projects/folder-mcp/system-configuration.json
   # 2. User directory: ~/.folder-mcp/system-configuration.json
   # SimpleJsonConfigLoader will use ~/.folder-mcp/ location
   ```

#### **✅ VALIDATION CHECKLIST**:
```bash
# Validate JSON syntax
npx jsonlint system-configuration.json
# Result: Valid JSON (fixed octal notation issue)

# Check all required fields present
node -e "const c = require('./system-configuration.json'); console.log(Object.keys(c))"
# Result: Shows all 12 top-level keys
```

#### **Completion Criteria**:
- [x] JSON file created with all configurations
- [x] Valid JSON syntax
- [x] All values from analysis included
- [x] Sensible defaults for all values

**📝 Key Discoveries**:
- **Comprehensive Config**: Created 12 major sections covering all discovered configs
- **Octal Notation**: JSON doesn't support octal (0o600), had to use decimal (384)
- **Flat Structure**: Kept relatively flat structure for easy JSON.parse()
- **Metadata Section**: Added for versioning and tracking
- **Both Locations**: Placed in project root and ~/.folder-mcp/ for flexibility

---

### Assignment 3: Implement System JSON Config Loader ✅ COMPLETED
**Goal**: Create minimal configuration loader that reads JSON file
**Estimated Time**: 2 hours
**Actual Time**: 0.3 hours
**Completion Date**: 2025-07-07

#### **🚨 MANDATORY DI PATTERN FOR THIS ASSIGNMENT**:
1. **Interface First**: Define `ISystemConfigLoader` in domain layer
2. **No Implementation Logic**: Interface must be pure contract
3. **Constructor Injection**: All dependencies injected
4. **Zero Direct Instantiation**: No `new` calls except in DI container

#### Sub-tasks:
1. [x] **3.1 Define interface in domain layer**
   ```typescript
   // domain/config/ISystemConfigLoader.ts
   export interface ISystemConfigLoader {
     load(): Promise<any>;
     get(path: string): any;
     getAll(): any;
     isLoaded(): boolean;
     reload(): Promise<any>;
   }
   ```
   
2. [x] **3.2 Implement in application layer**
   ```typescript
   // application/config/SystemJsonConfigLoader.ts
   import { ISystemConfigLoader } from '../../domain/config/ISystemConfigLoader';
   import { IFileSystem } from '../../domain/infrastructure/IFileSystem';
   
   export class SystemJsonConfigLoader implements ISystemConfigLoader {
     private config: any = null;
     private loaded: boolean = false;
     
     constructor(
       private readonly fileSystem: IFileSystem,
       private readonly configPath: string
     ) {}
     
     async load(): Promise<any> {
       const content = await this.fileSystem.readFile(this.configPath);
       this.config = JSON.parse(content);
       this.loaded = true;
       return this.config;
     }
     
     get(path: string): any {
       if (!this.loaded) {
         throw new Error('Configuration not loaded');
       }
       return this.getByPath(this.config, path);
     }
     
     getAll(): any {
       if (!this.loaded) {
         throw new Error('Configuration not loaded');
       }
       return JSON.parse(JSON.stringify(this.config)); // Deep copy
     }
     
     isLoaded(): boolean {
       return this.loaded;
     }
     
     async reload(): Promise<any> {
       this.loaded = false;
       this.config = null;
       return this.load();
     }
     
     private getByPath(obj: any, path: string): any {
       // Supports dot notation and array[index] syntax
       const keys = path.split('.');
       let current = obj;
       
       for (const key of keys) {
         const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/);
         if (arrayMatch) {
           const [, prop, index] = arrayMatch;
           current = current?.[prop]?.[parseInt(index, 10)];
         } else {
           current = current?.[key];
         }
       }
       
       return current;
     }
   }
   ```
   
3. [x] **3.3 Write comprehensive tests**
   ```typescript
   // tests/unit/application/config/SystemJsonConfigLoader.test.ts
   // Comprehensive test suite with 20 tests covering:
   // - Load functionality (success, errors, invalid JSON)
   // - Get operations (simple, nested, arrays, non-existent)
   // - GetAll with deep copy protection
   // - isLoaded state tracking
   // - Reload functionality
   // - Edge cases (empty config, null values, special characters)
   ```

#### **✅ VALIDATION CHECKLIST**:
```bash
# Check interface in domain layer
ls domain/config/ISystemConfigLoader.ts
# Result: File exists ✓

# Check implementation uses DI
grep "constructor(" application/config/SystemJsonConfigLoader.ts
# Result: Shows injected dependencies ✓

# Run tests
npm test -- tests/unit/application/config/SystemJsonConfigLoader.test.ts
# Result: All 20 tests pass ✓
```

#### **Completion Criteria**:
- [x] Interface defined in domain layer
- [x] Implementation in application layer
- [x] All dependencies injected
- [x] Comprehensive tests pass
- [x] No direct file system access

**📝 Key Discoveries**:
- **Naming**: Changed from "Simple" to "System" for clarity
- **Deep Copy**: Used JSON.parse(JSON.stringify()) for deep copy
- **Array Support**: Added support for array[index] notation
- **State Tracking**: Added isLoaded() and reload() methods
- **Edge Cases**: Handled null values, special characters in keys

---

### Assignment 4: Register in DI Container and Replace Old System
**Goal**: Wire up new loader in DI and replace complex ConfigurationManager
**Estimated Time**: 2 hours

#### **🚨 MANDATORY DI PATTERN FOR THIS ASSIGNMENT**:
1. **Container Registration**: Add to `di/setup.ts`
2. **Token Reuse**: Use existing CONFIG_TOKENS if possible
3. **Backward Compatibility**: Maintain same interface for consumers
4. **Lifecycle Management**: Singleton pattern for config

#### Sub-tasks:
1. [ ] **4.1 Register SystemJsonConfigLoader in DI**
   ```typescript
   // di/setup.ts
   import { SystemJsonConfigLoader } from '../application/config/SystemJsonConfigLoader';
   
   // Replace old ConfigurationManager registration
   container.registerSingleton(CONFIG_TOKENS.CONFIG_MANAGER, () => {
     const fileSystem = container.resolve<IFileSystem>(INFRASTRUCTURE_TOKENS.FILE_SYSTEM);
     const configPath = path.join(process.env.HOME || '', '.folder-mcp', 'system-configuration.json');
     
     const loader = new SystemJsonConfigLoader(fileSystem, configPath);
     // Load synchronously during DI setup
     loader.load().catch(err => {
       console.error('Failed to load configuration:', err);
       process.exit(1);
     });
     
     return loader;
   });
   ```
   
2. [ ] **4.2 Update configuration factory if needed**
   ```typescript
   // di/factories/configurationFactory.ts
   // Update to use SystemJsonConfigLoader interface
   // Ensure backward compatibility
   ```
   
3. [ ] **4.3 Remove old configuration system files**
   ```bash
   # Remove old complex configuration files
   rm -f src/config/ConfigurationManager.ts
   rm -f src/config/ConfigurationHierarchy.ts
   rm -f src/config/ProfileManager.ts
   rm -f src/config/EnvironmentLoader.ts
   # Keep only what's needed for new system
   ```

#### **✅ VALIDATION CHECKLIST**:
```bash
# Verify DI registration
grep "SystemJsonConfigLoader" di/setup.ts
# Expected: Shows registration

# Check old files removed
ls src/config/ConfigurationManager.ts 2>/dev/null
# Expected: No such file

# Run application
npm run build && npm start
# Expected: Application starts with new config system
```

#### **Completion Criteria**:
- [ ] New loader registered in DI
- [ ] Old system files removed
- [ ] Application starts successfully
- [ ] All services get configuration

**📝 UPDATE AFTER COMPLETION**:
```markdown
### Assignment 4: Register in DI Container and Replace Old System ✅ COMPLETED
**Completion Date**: [YYYY-MM-DD]
**Actual Time**: [X hours]
**Key Discoveries**: [What was learned during implementation]
```

---

### Assignment 5: Update CLI Commands and Verify System
**Goal**: Ensure CLI config commands work with new simple system
**Estimated Time**: 1.5 hours

#### **🚨 MANDATORY DI PATTERN FOR THIS ASSIGNMENT**:
CLI commands should resolve services through DI, not create directly.

#### Sub-tasks:
1. [ ] **5.1 Update config get command**
   ```typescript
   // interfaces/cli/commands/config.ts
   // Ensure it uses DI to get config loader
   // Should work with dot notation paths
   ```
   
2. [ ] **5.2 Temporarily disable config set command**
   ```typescript
   // Since we're using read-only JSON for now
   // Add helpful message: "Configuration is read-only in this version"
   // Will be re-enabled in Task 7.3
   ```
   
3. [ ] **5.3 Run integration tests**
   ```bash
   # Run remaining config command tests
   npm test -- tests/integration/cli/config-commands.test.ts
   
   # Test manually
   npx folder-mcp config get model.name
   npx folder-mcp config get fileProcessing.extensions
   npx folder-mcp config show
   ```

#### **✅ VALIDATION CHECKLIST**:
```bash
# Test config get command
npx folder-mcp config get model.name
# Expected: Shows value from system-configuration.json

# Test config show command
npx folder-mcp config show
# Expected: Displays entire configuration

# Run integration tests
npm test -- tests/integration/cli/config-commands.test.ts
# Expected: Get/show tests pass (set tests may need updates)
```

#### **Completion Criteria**:
- [ ] Config get command works
- [ ] Config show command works
- [ ] Integration tests updated
- [ ] No regression in functionality

**📝 UPDATE AFTER COMPLETION**:
```markdown
### Assignment 5: Update CLI Commands and Verify System ✅ COMPLETED
**Completion Date**: [YYYY-MM-DD]
**Actual Time**: [X hours]
**Key Discoveries**: [What was learned during implementation]
```

## ✅ **Task Completion Criteria**

From roadmap:
- [ ] system-configuration.json contains all current configs
- [ ] Simple loader reads JSON on startup
- [ ] Application works with single config file
- [ ] Tests verify JSON loading mechanism
- [ ] No regression in functionality

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
- [x] **DI/Architecture**: Services, managers, repositories, DI container setup
- [x] **System Configuration**: Internal system-configuration.json settings  
- [x] **CLI/Commands**: Command-line interfaces, argument parsing, help text
- [x] **Infrastructure**: File system, external APIs, platform integration, process management

### Filtered Testing Checklist

#### IF Task Contains DI/Architecture Work:
- [ ] **Interface Contracts**: Test behavior contracts, not implementation details
- [ ] **Dependency Injection**: All dependencies injected via constructor, no direct instantiation
- [ ] **DI Container**: Services resolve correctly from container
- [ ] **Module Boundaries**: Domain/Application/Infrastructure separation maintained
- [ ] **Service Registration**: All services properly registered in DI container

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
- [x] Assignment 1: Analyze Current Configuration Usage
  - [x] 1.1 Find all configuration access points
  - [x] 1.2 Document current configuration structure
  - [x] 1.3 Identify configuration dependencies
- [x] Assignment 2: Create system-configuration.json
  - [x] 2.1 Create comprehensive JSON structure
  - [x] 2.2 Include ALL configuration values
  - [x] 2.3 Place file in correct location
- [x] Assignment 3: Implement System JSON Config Loader
  - [ ] 3.1 Define interface in domain layer
  - [ ] 3.2 Implement in application layer
  - [ ] 3.3 Write comprehensive tests
- [ ] Assignment 4: Register in DI Container
  - [ ] 4.1 Register SimpleJsonConfigLoader
  - [ ] 4.2 Update configuration factory
  - [ ] 4.3 Remove old configuration files
- [ ] Assignment 5: Update CLI Commands
  - [ ] 5.1 Update config get command
  - [ ] 5.2 Disable config set command
  - [ ] 5.3 Run integration tests

### Time Tracking
| Assignment | Estimated | Actual | Status | Notes |
|------------|-----------|--------|--------|-------|
| 1: Analyze Configuration | 1 hour | 0.3 hours | ✅ COMPLETED | Found 8+ config sections, smart defaults |
| 2: Create JSON File | 1.5 hours | 0.2 hours | ✅ COMPLETED | Created comprehensive 12-section JSON |
| 3: Implement Loader | 2 hours | 0.3 hours | ✅ COMPLETED | Renamed to System, added features |
| 4: Register in DI | 2 hours | | 🔜 READY | Will remove all old config files |
| 5: Update CLI | 1.5 hours | | Not Started | |

### Implementation Discoveries & Decision Log
**CRITICAL**: Update this section after EACH assignment completion:

#### 🎯 **Key Decisions Made & Rationale**
- **[2025-07-07] Assignment 1**: Document all configuration values before creating JSON
  - **Why**: Need complete picture of what to include in system-configuration.json
  - **Alternatives Considered**: Start with minimal config and add as needed
  - **Impact**: Ensures no configuration is missed in the transitional system

- **[2025-07-07] Assignment 3**: Use "System" instead of "Simple" naming
  - **Why**: "Simple" is relative; "System" is descriptive and clear
  - **Alternatives Considered**: Keep "Simple", use "Transitional", use "Basic"
  - **Impact**: Better clarity in code and documentation

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
- **Configuration Complexity**: System has 12 major config sections, not the 5-6 expected
- **Smart Defaults**: Sophisticated performance tier system (Low/Medium/High) based on hardware
- **Comprehensive Daemon**: Full process management with health checks, auto-restart, monitoring
- **JSON Limitations**: No octal notation support (0o600 → 384), special key handling quirks
- **Test Coverage**: Old config system had 11 dedicated test files

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
ls domain/config/        # Should only contain interfaces
ls application/config/   # Should contain implementations with DI
ls infrastructure/       # Should contain external dependency wrappers

# Run specific tests
npm test -- tests/unit/application/config
npm test -- tests/integration/cli/config-commands.test.ts
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

**Configuration Test**:
[Show how to test different configuration scenarios]

**Error Scenarios**:
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
grep "SystemJsonConfigLoader" src/di/setup.ts
# Expected: Service properly registered in DI container
```

**System Configuration Tasks Only**:
```bash
# Test configuration loading
cat ~/.folder-mcp/system-configuration.json | jq .
# Expected: Valid JSON with all config values

# Verify app uses new config
npx folder-mcp config get model.name
# Expected: Shows value from JSON file
```

**CLI/Commands Tasks Only**:
```bash
# Test configuration commands
npx folder-mcp config get model.name
# Expected: Shows correct value

# Test config show
npx folder-mcp config show
# Expected: Displays full configuration
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
| 2 | Simplify Current Configuration System | Medium | ✅ | ~~`/create-task-plan 7 2`~~ |
| 3 | Implement New User Configuration System | High | ⏳ | `/create-task-plan 7 3` |
```

#### 2. **Update Phase Completion Log**
```markdown
### **Phase Completion Log**
| Task | Status | Completion Date | Key Decisions/Findings |
|------|--------|-----------------|------------------------|
| Task 1: Remove Old Configuration System Tests | ✅ | 2025-07-07 | Removed 11 test files |
| Task 2: Simplify Current Configuration System | ✅ | 2025-07-XX | Single JSON file approach |
```

#### 3. **Update Progress Metrics**
```markdown
### **Linear Progress Bar**
```
■■□□□□ 2/6 Tasks (33%)
```
```

## 📋 **Configuration Pattern Examples**

### System Configuration Pattern (Direct JSON)
```json
// system-configuration.json
{
  "model": {
    "name": "all-minilm-l6-v2",
    "batchSize": 32
  },
  "fileProcessing": {
    "extensions": [".txt", ".md", ".pdf"],
    "maxFileSize": 10485760
  }
}
```
Result: Internal only, no UI, loaded at startup

### Simple JSON Loader Pattern
```typescript
// No schema validation
// No type safety (yet)
// Just JSON.parse() and go
const config = await loader.load();
const modelName = config.model.name;
```

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