# Task 7.3: Implement New User Configuration System

**Phase**: 7 - Configuration System Overhaul  
**Status**: 🚧 IN PROGRESS  
**Created**: 2025-07-07  
**Complexity**: High  
**Approach**: Build schema-driven configuration system with YAML files and external data sources

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

Build schema-driven configuration system as designed in configuration-system-design.md

## 🔍 **Pre-Implementation Checklist**

- [ ] Review existing code in: `src/config/`, `src/application/config/`, `tests/fixtures/test-knowledge-base/`
- [ ] Identify reusable components: SystemJsonConfigLoader can be extended
- [ ] Check for similar patterns in: Current YAML loading in config system
- [ ] Consider platform differences: File paths, YAML parsing
- [ ] Review related tests: Will create new tests to replace old ones from Task 1

## 📋 **Scope**

- [ ] Implement ConfigManager (loads config-defaults.yaml and config.yaml)
- [ ] Create configuration schema with single test item (embedding models)
- [ ] Move embedding model list from system-configuration.json to new system
- [ ] Implement CLI config commands (get/set/show)
- [ ] Add tests for merging and override behavior
- [ ] Follow the architecture defined in `configuration-system-design.md`
- [ ] Use schema patterns from `configurable-parameters.md`

## 📚 **Essential Project Context**

### From Completed Work
- Phase 1-5: MCP endpoints, file processing, TUI framework  
- Phase 6: Built complex 6-source configuration system (now simplifying)
- Phase 7 Task 1: Removed all old configuration tests (11 files)
- Phase 7 Task 2: Created system-configuration.json and SystemJsonConfigLoader
- Current capabilities: 9 MCP endpoints, FAISS search, Ollama embeddings

### Critical Files to Understand
- `docs/development-plan/roadmap/currently-implementing/configuration-system-design.md` - Architecture
- `docs/development-plan/roadmap/currently-implementing/configurable-parameters.md` - Schema examples
- `src/application/config/SystemJsonConfigLoader.ts` - Can extend pattern
- `src/domain/config/ISystemConfigLoader.ts` - Interface pattern to follow
- `tests/unit/application/config/SystemJsonConfigLoader.test.ts` - Test patterns

## 🔗 **Dependencies & Related Work**

### Prerequisite Tasks
- Phase 7 Task 1: Remove Old Configuration System Tests (✅ COMPLETED - removed test constraints)
- Phase 7 Task 2: Simplify Current Configuration System (✅ IN PROGRESS - created transitional system)

### Task Sequence
- **Previous**: Task 7.2 - Simplify Current Configuration System (created SystemJsonConfigLoader)
- **Current**: Implement New User Configuration System - Build schema-driven YAML system
- **Next**: Task 7.4 - Create Schema-Driven TUI - Generate UI from configuration schema

## 📍 **Context from Roadmap**

### Related User Stories
- **As a user, I want simple configuration**: Just two YAML files with clear purpose
- **As a user, I want schema validation**: Know immediately if my config is wrong
- **As a user, I want dynamic UI**: Configuration options that adapt based on my choices
- **As a developer, I want clear separation**: System config vs user config with no overlap

### Configuration Requirements

#### User Configuration (config.yaml)
- **Schema Definition**: Embedding model selection with external data
- **Default Values**: modelName: "nomic-embed-text" in config-defaults.yaml
- **Validation Rules**: Must be valid model from data/embedding-models.json
- **UI Components**: Detailed-select with provider, speed, cost columns

#### System Configuration (system-configuration.json)
- **Internal Settings**: Already handled by Task 2
- **No Schema Required**: Direct JSON access via SystemJsonConfigLoader
- **Direct JSON Access**: Simple key-value pairs

#### Integration
- **Code Updates**: ConfigManager for user config, SystemJsonConfigLoader for system
- **User Config**: Via ConfigManager and schema validation
- **System Config**: Direct JSON loading at startup

### Implementation Details
**Test Configuration Item**:
```yaml
# config-defaults.yaml
modelName: "nomic-embed-text"

# Schema includes detailsSource pointing to data/embedding-models.json
```

## 🔧 **Implementation Assignments**

### Assignment 1: Define Configuration Interfaces and Schema Structure
**Goal**: Create domain interfaces and schema types for the configuration system
**Estimated Time**: 2 hours

#### **🚨 MANDATORY DI PATTERN FOR THIS ASSIGNMENT**:
1. **Interface First**: Define all interfaces in domain layer
2. **No Implementation Logic**: Interfaces must be pure contracts
3. **Proper Abstractions**: Use domain types, not infrastructure

#### Sub-tasks:
1. [ ] **1.1 Create IConfigManager interface**
   ```typescript
   // In domain/config/IConfigManager.ts
   export interface IConfigManager {
     load(): Promise<void>;
     get(path: string): any;
     set(path: string, value: any): Promise<void>;
     getAll(): any;
     validate(path: string, value: any): ValidationResult;
     getSchema(): ConfigSchema;
   }
   ```
   
2. [ ] **1.2 Define schema types and interfaces**
   ```typescript
   // In domain/config/IConfigSchema.ts
   export interface ConfigSchema {
     [groupName: string]: ConfigGroup;
   }
   
   export interface ConfigGroup {
     label: string;
     description: string;
     icon?: string;
     order: number;
     items: { [key: string]: ConfigItem };
   }
   
   export interface ConfigItem {
     type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'path' | 'array';
     label: string;
     description: string;
     required?: boolean;
     validation?: ValidationRules;
     ui?: UIHints;
     conditions?: Conditions;
     detailsSource?: string;
     detailsColumns?: string[];
     valueColumn?: string;
   }
   ```
   
3. [ ] **1.3 Create ISchemaValidator interface**
   ```typescript
   // In domain/config/ISchemaValidator.ts
   export interface ISchemaValidator {
     validateValue(value: any, schema: ConfigItem): ValidationResult;
     validateConfig(config: any, schema: ConfigSchema): ValidationResult;
   }
   
   export interface ValidationResult {
     valid: boolean;
     errors?: ValidationError[];
   }
   ```

4. [ ] **1.4 Write initial interface tests**
   ```typescript
   // In tests/unit/domain/config/interfaces.test.ts
   describe('Configuration Interfaces', () => {
     it('should define proper method signatures', () => {
       // Type checking tests
     });
   });
   ```

#### **✅ VALIDATION CHECKLIST**:
```bash
npm run build
# Expected: 0 TypeScript errors

# Check interfaces are in domain layer
ls src/domain/config/I*.ts
# Expected: IConfigManager.ts, IConfigSchema.ts, ISchemaValidator.ts

# Verify no implementation logic in interfaces
grep -E "(class|function|=)" src/domain/config/I*.ts
# Expected: No matches (only interface definitions)
```

#### **Implementation Notes**:
- Focus on clean, minimal interfaces
- Schema types should support all features from design doc
- Consider extensibility for future config types

#### **Completion Criteria**:
- [ ] All interfaces defined in domain layer
- [ ] Schema types support full feature set
- [ ] No TypeScript errors
- [ ] Interfaces follow DI patterns

**📝 UPDATE AFTER COMPLETION**:
```markdown
### Assignment 1: Define Configuration Interfaces and Schema Structure ✅ COMPLETED
**Completion Date**: [YYYY-MM-DD]
**Actual Time**: [X hours]
**Key Discoveries**: [What was learned during implementation]
```

---

### Assignment 2: Implement ConfigManager with YAML Loading
**Goal**: Create the core configuration manager that loads and merges YAML files
**Estimated Time**: 3 hours

#### **🚨 MANDATORY DI PATTERN FOR THIS ASSIGNMENT**:
1. **Constructor Injection**: All dependencies injected via constructor
2. **Application Layer**: Implementation goes in `application/config/`
3. **Interface Implementation**: Implements the interface from Assignment 1
4. **Zero Direct Instantiation**: No `new` calls except factories

#### Sub-tasks:
1. [ ] **2.1 Implement ConfigManager class**
   ```typescript
   // In application/config/ConfigManager.ts
   import { IConfigManager } from '../../domain/config/IConfigManager.js';
   import { IFileSystem } from '../../domain/files/interfaces.js';
   import { ISchemaValidator } from '../../domain/config/ISchemaValidator.js';
   import { IYamlParser } from '../../domain/config/IYamlParser.js';
   
   export class ConfigManager implements IConfigManager {
     private defaultConfig: any = {};
     private userConfig: any = {};
     private mergedConfig: any = {};
     private schema: ConfigSchema;
     
     constructor(
       private readonly fileSystem: IFileSystem,
       private readonly yamlParser: IYamlParser,
       private readonly validator: ISchemaValidator,
       private readonly defaultsPath: string,
       private readonly userConfigPath: string
     ) {}
     
     async load(): Promise<void> {
       // Load defaults
       const defaultsContent = await this.fileSystem.readFile(this.defaultsPath);
       this.defaultConfig = await this.yamlParser.parse(defaultsContent);
       
       // Load user config if exists
       try {
         const userContent = await this.fileSystem.readFile(this.userConfigPath);
         this.userConfig = await this.yamlParser.parse(userContent);
       } catch {
         this.userConfig = {};
       }
       
       // Merge (user wins)
       this.mergedConfig = this.merge(this.defaultConfig, this.userConfig);
     }
     
     private merge(defaults: any, user: any): any {
       // Deep merge implementation
     }
   }
   ```

2. [ ] **2.2 Create YAML parser wrapper**
   ```typescript
   // In infrastructure/parsers/YamlParser.ts
   import { load, dump } from 'js-yaml';
   import { IYamlParser } from '../../domain/config/IYamlParser.js';
   
   export class YamlParser implements IYamlParser {
     async parse(content: string): Promise<any> {
       return load(content);
     }
     
     async stringify(data: any): Promise<string> {
       return dump(data, { lineWidth: -1 });
     }
   }
   ```

3. [ ] **2.3 Write comprehensive tests**
   ```typescript
   // In tests/unit/application/config/ConfigManager.test.ts
   describe('ConfigManager', () => {
     it('should load and merge configurations', async () => {
       const mockFs = createMockFileSystem({
         'config-defaults.yaml': 'modelName: default-model\nbatchSize: 32',
         'config.yaml': 'modelName: user-model'
       });
       
       const manager = new ConfigManager(mockFs, ...);
       await manager.load();
       
       expect(manager.get('modelName')).toBe('user-model');
       expect(manager.get('batchSize')).toBe(32);
     });
   });
   ```

#### **✅ VALIDATION CHECKLIST**:
```bash
npm run build
# Expected: 0 TypeScript errors

# Check constructor injection pattern
grep "constructor(" src/application/config/ConfigManager.ts
# Expected: Shows injected dependencies

# Run tests
npm test -- tests/unit/application/config/ConfigManager.test.ts
# Expected: All tests pass
```

#### **Completion Criteria**:
- [ ] ConfigManager implemented with DI
- [ ] YAML loading and merging working
- [ ] User config overrides defaults
- [ ] Comprehensive tests pass

**📝 UPDATE AFTER COMPLETION**:
```markdown
### Assignment 2: Implement ConfigManager with YAML Loading ✅ COMPLETED
**Completion Date**: [YYYY-MM-DD]
**Actual Time**: [X hours]
**Key Discoveries**: [What was learned during implementation]
```

---

### Assignment 3: Implement Schema System and Validation
**Goal**: Create the schema definition and validation system
**Estimated Time**: 3 hours

#### **🚨 MANDATORY DI PATTERN FOR THIS ASSIGNMENT**:
1. **Schema as Configuration**: Schema loaded from file, not hardcoded
2. **Validator with DI**: SchemaValidator uses injected dependencies
3. **External Data Loading**: Support for detailsSource JSON files

#### Sub-tasks:
1. [ ] **3.1 Create embedding model schema definition**
   ```typescript
   // In data/config-schema.yaml
   embeddings:
     label: "Embedding Settings"
     description: "Configure AI model for semantic search"
     order: 1
     items:
       modelName:
         type: select
         label: Embedding Model
         description: AI model used for semantic search
         required: true
         detailsSource: data/embedding-models.json
         detailsColumns: [provider, speed, cost, quality]
         valueColumn: id
         ui:
           component: detailed-select
           destructive:
             level: critical
             message: Changing models will trigger a full reindex
   ```

2. [ ] **3.2 Create embedding models data file**
   ```json
   // In data/embedding-models.json
   {
     "models": [
       {
         "id": "nomic-embed-text",
         "name": "Nomic Embed Text",
         "provider": "Nomic AI",
         "speed": "Fast",
         "cost": "Free",
         "quality": "Good",
         "description": "Balanced model for general use"
       },
       {
         "id": "all-minilm",
         "name": "All MiniLM",
         "provider": "Sentence Transformers",
         "speed": "Very Fast",
         "cost": "Free",
         "quality": "Standard",
         "description": "Lightweight model for quick processing"
       }
     ]
   }
   ```

3. [ ] **3.3 Implement SchemaValidator**
   ```typescript
   // In application/config/SchemaValidator.ts
   export class SchemaValidator implements ISchemaValidator {
     constructor(
       private readonly fileSystem: IFileSystem,
       private readonly jsonParser: IJsonParser
     ) {}
     
     async validateValue(value: any, schema: ConfigItem): Promise<ValidationResult> {
       // Load external data if needed
       if (schema.detailsSource) {
         const data = await this.loadExternalData(schema.detailsSource);
         const validIds = data.models.map(m => m[schema.valueColumn || 'id']);
         
         if (!validIds.includes(value)) {
           return {
             valid: false,
             errors: [{ path: '', message: `Invalid selection: ${value}` }]
           };
         }
       }
       
       return { valid: true };
     }
   }
   ```

4. [ ] **3.4 Write schema validation tests**
   ```typescript
   // In tests/unit/application/config/SchemaValidator.test.ts
   describe('SchemaValidator', () => {
     it('should validate against external data source', async () => {
       const validator = new SchemaValidator(...);
       const result = await validator.validateValue('nomic-embed-text', {
         type: 'select',
         detailsSource: 'data/embedding-models.json',
         valueColumn: 'id'
       });
       
       expect(result.valid).toBe(true);
     });
   });
   ```

#### **✅ VALIDATION CHECKLIST**:
```bash
# Check schema file exists
ls data/config-schema.yaml
# Expected: File exists

# Check embedding models data
cat data/embedding-models.json | jq .
# Expected: Valid JSON with model data

# Run validation tests
npm test -- tests/unit/application/config/SchemaValidator.test.ts
# Expected: All tests pass
```

#### **Completion Criteria**:
- [ ] Schema definition created
- [ ] External data file created
- [ ] Validation working with external data
- [ ] Tests verify schema validation

**📝 UPDATE AFTER COMPLETION**:
```markdown
### Assignment 3: Implement Schema System and Validation ✅ COMPLETED
**Completion Date**: [YYYY-MM-DD]
**Actual Time**: [X hours]
**Key Discoveries**: [What was learned during implementation]
```

---

### Assignment 4: Implement CLI Config Commands
**Goal**: Update CLI commands to work with new configuration system
**Estimated Time**: 2.5 hours

#### **🚨 MANDATORY DI PATTERN FOR THIS ASSIGNMENT**:
1. **Commands use BaseCommand**: Inherit from BaseCommand with DI access
2. **Delegate to Services**: Commands are thin, delegate to application layer
3. **No Business Logic**: Commands only handle CLI interaction

#### Sub-tasks:
1. [ ] **4.1 Update config get command**
   ```typescript
   // In interfaces/cli/commands/config.ts
   export class ConfigGetCommand extends BaseCommand {
     async execute(key: string): Promise<void> {
       const configManager = this.container.resolve<IConfigManager>(CONFIG_TOKENS.USER_CONFIG);
       await configManager.load();
       
       const value = configManager.get(key);
       if (value === undefined) {
         this.logger.error(`Configuration key not found: ${key}`);
         process.exit(1);
       }
       
       console.log(JSON.stringify(value, null, 2));
     }
   }
   ```

2. [ ] **4.2 Update config set command**
   ```typescript
   // In interfaces/cli/commands/config.ts
   export class ConfigSetCommand extends BaseCommand {
     async execute(key: string, value: string): Promise<void> {
       const configManager = this.container.resolve<IConfigManager>(CONFIG_TOKENS.USER_CONFIG);
       await configManager.load();
       
       // Validate against schema
       const result = configManager.validate(key, value);
       if (!result.valid) {
         this.logger.error('Invalid configuration value:', result.errors);
         process.exit(1);
       }
       
       await configManager.set(key, value);
       this.logger.info(`Configuration updated: ${key} = ${value}`);
     }
   }
   ```

3. [ ] **4.3 Create config show command**
   ```typescript
   // In interfaces/cli/commands/config.ts
   export class ConfigShowCommand extends BaseCommand {
     async execute(): Promise<void> {
       const configManager = this.container.resolve<IConfigManager>(CONFIG_TOKENS.USER_CONFIG);
       await configManager.load();
       
       const config = configManager.getAll();
       const schema = configManager.getSchema();
       
       // Format output with schema information
       this.displayConfiguration(config, schema);
     }
   }
   ```

4. [ ] **4.4 Write CLI command tests**
   ```typescript
   // In tests/integration/cli/user-config-commands.test.ts
   describe('User Config CLI Commands', () => {
     it('should get configuration value', async () => {
       const result = await runCommand(['config', 'get', 'modelName']);
       expect(result.stdout).toContain('nomic-embed-text');
     });
     
     it('should set valid configuration value', async () => {
       const result = await runCommand(['config', 'set', 'modelName', 'all-minilm']);
       expect(result.exitCode).toBe(0);
     });
   });
   ```

#### **✅ VALIDATION CHECKLIST**:
```bash
# Test config get command
npx folder-mcp config get modelName
# Expected: Shows current model name

# Test config set command
npx folder-mcp config set modelName all-minilm
# Expected: Updates configuration

# Test config show command
npx folder-mcp config show
# Expected: Displays full configuration with descriptions
```

#### **Completion Criteria**:
- [ ] Config get command working
- [ ] Config set command validates against schema
- [ ] Config show command displays with metadata
- [ ] Integration tests pass

**📝 UPDATE AFTER COMPLETION**:
```markdown
### Assignment 4: Implement CLI Config Commands ✅ COMPLETED
**Completion Date**: [YYYY-MM-DD]
**Actual Time**: [X hours]
**Key Discoveries**: [What was learned during implementation]
```

---

### Assignment 5: DI Registration and Integration
**Goal**: Register all services in DI container and integrate with existing system
**Estimated Time**: 2 hours

#### **🚨 MANDATORY DI PATTERN FOR THIS ASSIGNMENT**:
1. **Container Registration**: Add to `di/setup.ts`
2. **Token Definition**: Create new tokens for user config
3. **Dual System**: Keep SystemJsonConfigLoader for system config
4. **Factory Pattern**: Use factories for complex construction

#### Sub-tasks:
1. [ ] **5.1 Define new configuration tokens**
   ```typescript
   // In di/tokens.ts
   export const CONFIG_TOKENS = {
     // Existing
     SYSTEM_CONFIG: 'ISystemConfigLoader',
     
     // New for user config
     USER_CONFIG: 'IConfigManager',
     SCHEMA_VALIDATOR: 'ISchemaValidator',
     YAML_PARSER: 'IYamlParser',
     CONFIG_SCHEMA: 'ConfigSchema'
   };
   ```

2. [ ] **5.2 Register services in DI container**
   ```typescript
   // In di/setup.ts
   // User configuration system
   container.registerSingleton(CONFIG_TOKENS.YAML_PARSER, () => {
     return new YamlParser();
   });
   
   container.registerSingleton(CONFIG_TOKENS.SCHEMA_VALIDATOR, () => {
     const fileSystem = container.resolve<IFileSystem>(INFRASTRUCTURE_TOKENS.FILE_SYSTEM);
     const jsonParser = container.resolve<IJsonParser>(INFRASTRUCTURE_TOKENS.JSON_PARSER);
     return new SchemaValidator(fileSystem, jsonParser);
   });
   
   container.registerSingleton(CONFIG_TOKENS.USER_CONFIG, () => {
     const fileSystem = container.resolve<IFileSystem>(INFRASTRUCTURE_TOKENS.FILE_SYSTEM);
     const yamlParser = container.resolve<IYamlParser>(CONFIG_TOKENS.YAML_PARSER);
     const validator = container.resolve<ISchemaValidator>(CONFIG_TOKENS.SCHEMA_VALIDATOR);
     
     const defaultsPath = path.join(process.cwd(), 'config-defaults.yaml');
     const userPath = path.join(process.env.HOME || '', '.folder-mcp', 'config.yaml');
     
     return new ConfigManager(fileSystem, yamlParser, validator, defaultsPath, userPath);
   });
   ```

3. [ ] **5.3 Create configuration factory**
   ```typescript
   // In di/factories/configurationFactory.ts
   export class ConfigurationFactory {
     static async createUserConfig(container: IDIContainer): Promise<IConfigManager> {
       const manager = container.resolve<IConfigManager>(CONFIG_TOKENS.USER_CONFIG);
       await manager.load();
       return manager;
     }
     
     static async createSystemConfig(container: IDIContainer): Promise<ISystemConfigLoader> {
       const loader = container.resolve<ISystemConfigLoader>(CONFIG_TOKENS.SYSTEM_CONFIG);
       await loader.load();
       return loader;
     }
   }
   ```

4. [ ] **5.4 Write DI integration tests**
   ```typescript
   // In tests/integration/di/configuration.test.ts
   describe('Configuration DI Integration', () => {
     it('should resolve user config manager', async () => {
       const userConfig = await ConfigurationFactory.createUserConfig(container);
       expect(userConfig).toBeInstanceOf(ConfigManager);
       expect(userConfig.get('modelName')).toBeDefined();
     });
     
     it('should keep system config separate', async () => {
       const systemConfig = await ConfigurationFactory.createSystemConfig(container);
       expect(systemConfig).toBeInstanceOf(SystemJsonConfigLoader);
     });
   });
   ```

#### **✅ VALIDATION CHECKLIST**:
```bash
# Check service registration
grep "USER_CONFIG\|SCHEMA_VALIDATOR" src/di/setup.ts
# Expected: Shows registrations

# Test DI resolution
npm test -- tests/integration/di/configuration.test.ts
# Expected: Services resolve correctly

# Run full build
npm run build
# Expected: 0 TypeScript errors
```

#### **Completion Criteria**:
- [ ] All services registered in DI
- [ ] User and system configs separate
- [ ] Factory pattern implemented
- [ ] Integration tests pass

**📝 UPDATE AFTER COMPLETION**:
```markdown
### Assignment 5: DI Registration and Integration ✅ COMPLETED
**Completion Date**: [YYYY-MM-DD]
**Actual Time**: [X hours]
**Key Discoveries**: [What was learned during implementation]
```

---

### Assignment 6: Create Initial Configuration Files
**Goal**: Set up the default configuration files and test the complete system
**Estimated Time**: 1.5 hours

#### **🚨 MANDATORY DI PATTERN FOR THIS ASSIGNMENT**:
Not directly applicable - creating configuration files

#### Sub-tasks:
1. [ ] **6.1 Create config-defaults.yaml**
   ```yaml
   # In config-defaults.yaml
   # Default configuration values for folder-mcp
   # These can be overridden in ~/.folder-mcp/config.yaml
   
   # Embedding model configuration
   modelName: nomic-embed-text
   
   # File processing settings
   fileExtensions:
     - .txt
     - .md
     - .pdf
     - .docx
   
   ignorePatterns:
     - node_modules/**
     - .git/**
     - "*.tmp"
   
   # UI preferences
   theme: auto
   showProgress: true
   ```

2. [ ] **6.2 Create example user config**
   ```yaml
   # In ~/.folder-mcp/config.yaml.example
   # User configuration overrides
   # Copy this to config.yaml and modify as needed
   
   # Override the default model
   modelName: all-minilm
   
   # Add more file types
   fileExtensions:
     - .txt
     - .md
     - .pdf
     - .docx
     - .py
     - .js
   ```

3. [ ] **6.3 Update .gitignore**
   ```gitignore
   # User configuration (don't commit)
   ~/.folder-mcp/config.yaml
   
   # Keep defaults and examples
   !config-defaults.yaml
   !~/.folder-mcp/config.yaml.example
   ```

4. [ ] **6.4 Write end-to-end tests**
   ```typescript
   // In tests/e2e/configuration-system.test.ts
   describe('Configuration System E2E', () => {
     it('should load defaults and user overrides', async () => {
       // Test the complete flow
       const userConfig = await ConfigurationFactory.createUserConfig(container);
       
       // Verify defaults loaded
       expect(userConfig.get('showProgress')).toBe(true);
       
       // Verify schema validation
       const result = userConfig.validate('modelName', 'invalid-model');
       expect(result.valid).toBe(false);
     });
   });
   ```

#### **✅ VALIDATION CHECKLIST**:
```bash
# Check configuration files
ls config-defaults.yaml
ls data/config-schema.yaml
ls data/embedding-models.json
# Expected: All files exist

# Test complete system
npx folder-mcp config show
# Expected: Shows configuration with schema metadata

# Verify override behavior
echo "modelName: all-minilm" > ~/.folder-mcp/config.yaml
npx folder-mcp config get modelName
# Expected: Shows "all-minilm" (override works)
```

#### **Completion Criteria**:
- [ ] Default configuration file created
- [ ] Example user config provided
- [ ] Complete system working end-to-end
- [ ] Tests verify full functionality

**📝 UPDATE AFTER COMPLETION**:
```markdown
### Assignment 6: Create Initial Configuration Files ✅ COMPLETED
**Completion Date**: [YYYY-MM-DD]
**Actual Time**: [X hours]
**Key Discoveries**: [What was learned during implementation]
```

## ✅ **Task Completion Criteria**

From roadmap:
- [ ] ConfigManager implemented and tested
- [ ] Schema system working with embedding model config
- [ ] CLI can get/set model configuration
- [ ] config.yaml overrides config-defaults.yaml
- [ ] External data loaded from JSON file
- [ ] Tests verify override hierarchy

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
- [x] **User Configuration**: Schema-driven config.yaml settings, validation, UI generation
- [ ] **System Configuration**: Internal system-configuration.json settings  
- [x] **CLI/Commands**: Command-line interfaces, argument parsing, help text
- [ ] **TUI/Visual**: Terminal UI components, layouts, visual elements, user interaction
- [ ] **Infrastructure**: File system, external APIs, platform integration, process management
- [x] **Testing**: Test infrastructure, mocks, fixtures, test utilities

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

#### IF Task Contains CLI/Commands Work:
- [ ] **Argument Parsing**: Command accepts expected flags and arguments
- [ ] **Help Output**: `--help` shows clear usage information
- [ ] **Error Handling**: Invalid arguments show helpful error messages
- [ ] **Exit Codes**: Success (0) and error (1) codes work correctly
- [ ] **Integration**: Command integrates properly with core services

#### IF Task Contains Testing Work:
- [ ] **Test Coverage**: New tests replace removed ones from Task 1
- [ ] **Real Test Data**: Use files from test-knowledge-base where applicable
- [ ] **Mock External Only**: Only mock file system and external services
- [ ] **Integration Tests**: Test full flow with real components
- [ ] **Test Documentation**: Clear test names and descriptions

#### Always Include (Cross-Cutting):
- [ ] **Build Validation**: `npm run build` shows 0 TypeScript errors
- [ ] **Core Functionality**: Main feature works end-to-end
- [ ] **Integration**: Feature integrates with existing system
- [ ] **Configuration**: Feature respects relevant configuration settings

## 📊 **Progress Tracking** (Living Document)

### Assignment Status
- [ ] Assignment 1: Define Configuration Interfaces and Schema Structure
  - [ ] 1.1 Create IConfigManager interface
  - [ ] 1.2 Define schema types and interfaces
  - [ ] 1.3 Create ISchemaValidator interface
  - [ ] 1.4 Write initial interface tests
- [ ] Assignment 2: Implement ConfigManager with YAML Loading
  - [ ] 2.1 Implement ConfigManager class
  - [ ] 2.2 Create YAML parser wrapper
  - [ ] 2.3 Write comprehensive tests
- [ ] Assignment 3: Implement Schema System and Validation
  - [ ] 3.1 Create embedding model schema definition
  - [ ] 3.2 Create embedding models data file
  - [ ] 3.3 Implement SchemaValidator
  - [ ] 3.4 Write schema validation tests
- [ ] Assignment 4: Implement CLI Config Commands
  - [ ] 4.1 Update config get command
  - [ ] 4.2 Update config set command
  - [ ] 4.3 Create config show command
  - [ ] 4.4 Write CLI command tests
- [ ] Assignment 5: DI Registration and Integration
  - [ ] 5.1 Define new configuration tokens
  - [ ] 5.2 Register services in DI container
  - [ ] 5.3 Create configuration factory
  - [ ] 5.4 Write DI integration tests
- [ ] Assignment 6: Create Initial Configuration Files
  - [ ] 6.1 Create config-defaults.yaml
  - [ ] 6.2 Create example user config
  - [ ] 6.3 Update .gitignore
  - [ ] 6.4 Write end-to-end tests

### Time Tracking
| Assignment | Estimated | Actual | Status | Notes |
|------------|-----------|--------|--------|-------|
| 1: Define Interfaces | 2 hours | | Not Started | |
| 2: Implement Manager | 3 hours | | Not Started | |
| 3: Schema & Validation | 3 hours | | Not Started | |
| 4: CLI Commands | 2.5 hours | | Not Started | |
| 5: DI Integration | 2 hours | | Not Started | |
| 6: Config Files | 1.5 hours | | Not Started | |

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
ls src/domain/config/        # Should only contain interfaces
ls src/application/config/   # Should contain implementations with DI
ls src/infrastructure/       # Should contain external dependency wrappers

# Run specific tests
npm test -- tests/unit/application/config
npm test -- tests/integration/cli/user-config-commands.test.ts

# Test configuration commands
npx folder-mcp config get modelName
npx folder-mcp config set modelName all-minilm
npx folder-mcp config show
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
```bash
# Show current configuration
npx folder-mcp config show

# Test override behavior
echo "modelName: all-minilm" > ~/.folder-mcp/config.yaml
npx folder-mcp config get modelName
# Expected: all-minilm (not the default)

# Test validation
npx folder-mcp config set modelName invalid-model
# Expected: Error with valid options listed
```

**Configuration Test**:
```bash
# Verify schema-driven behavior
npx folder-mcp config get modelName
# Expected: Shows current model

# List available models
cat data/embedding-models.json | jq .models[].id
# Expected: Shows valid model IDs
```

**Error Scenarios**:
```bash
# Invalid configuration value
npx folder-mcp config set modelName bad-model
# Expected: Validation error

# Missing configuration key
npx folder-mcp config get nonexistent.key
# Expected: Key not found error
```

### 🔧 Technical Validation Commands
```bash
# Build validation
npm run build
# Expected: 0 TypeScript errors

# DI validation
grep "ConfigManager" src/di/setup.ts
# Expected: Service registered

# Test user config system
npm test -- tests/unit/application/config/ConfigManager.test.ts
# Expected: All tests pass

# Integration test
npm test -- tests/integration/cli/user-config-commands.test.ts
# Expected: CLI commands work
```

### 🧪 **Test Changes Summary**
**CRITICAL**: Document all test modifications for review and maintenance tracking.

#### **Tests Added**
- `tests/unit/domain/config/interfaces.test.ts`: Interface contract tests
  - **Purpose**: Ensure interfaces follow proper patterns
  - **Test Data Used**: Mock data only
  - **Key Scenarios**: Type checking, method signatures

- `tests/unit/application/config/ConfigManager.test.ts`: Core manager tests
  - **Purpose**: Test YAML loading, merging, validation
  - **Test Data Used**: Mock YAML content
  - **Key Scenarios**: Override behavior, get/set operations

- `tests/unit/application/config/SchemaValidator.test.ts`: Validation tests
  - **Purpose**: Test schema-based validation
  - **Test Data Used**: data/embedding-models.json
  - **Key Scenarios**: External data validation, type checking

- `tests/integration/cli/user-config-commands.test.ts`: CLI integration
  - **Purpose**: Test config commands end-to-end
  - **Test Data Used**: Real config files
  - **Key Scenarios**: get/set/show commands

#### **Tests Modified**
None - this creates new test infrastructure

#### **Tests Removed**
None in this task (removed in Task 1)

#### **Test Data Changes**
- **Added to project**: 
  - `data/config-schema.yaml` - Configuration schema definition
  - `data/embedding-models.json` - Available models data
  - `config-defaults.yaml` - Default configuration values
- **Purpose**: Enable schema-driven configuration with external data

#### **Test Infrastructure Changes**
- **New pattern**: Schema-based validation testing
- **Mock strategy**: Mock file system, use real parsers
- **Integration approach**: Test with real YAML/JSON files

#### **Test Results Impact**
```bash
# After task implementation  
Test Files  X failed | Y+4 passed | Z skipped (Total)
Tests       A failed | B+25 passed | C skipped (Total)

# Net change: Added comprehensive test coverage for new config system
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

**DI/Architecture Tasks**:
```bash
# Verify dependency injection patterns
grep -r "new [A-Z]" src/ --exclude-dir=di --exclude-dir=tests
# Expected: Only factories, builders, or test fixtures

# Check service registration
grep "ConfigManager" src/di/setup.ts
# Expected: Service properly registered in DI container
```

**User Configuration Tasks**:
```bash
# Test configuration commands
npx folder-mcp config get modelName
# Expected: Shows correct value

# Test configuration validation
npx folder-mcp config set modelName nomic-embed-text
# Expected: Updates successfully

# Show full configuration
npx folder-mcp config show
# Expected: Displays configuration with schema metadata
```

**CLI/Commands Tasks**:
```bash
# Test help output
npx folder-mcp config --help
# Expected: Shows usage for config commands

# Test command functionality
npx folder-mcp config get modelName
# Expected: Returns configuration value
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
| 3 | Implement New User Configuration System | High | ✅ | ~~`/create-task-plan 7 3`~~ |
| 4 | Create Schema-Driven TUI | High | ⏳ | `/create-task-plan 7 4` |
```

#### 2. **Update Phase Completion Log**
```markdown
### **Phase Completion Log**
| Task | Status | Completion Date | Key Decisions/Findings |
|------|--------|-----------------|------------------------|
| Task 1: Remove Old Configuration System Tests | ✅ | 2025-07-07 | Removed 11 test files |
| Task 2: Simplify Current Configuration System | ✅ | 2025-07-07 | Single JSON file approach |
| Task 3: Implement New User Configuration System | ✅ | 2025-07-XX | Schema-driven YAML config |
```

#### 3. **Update Progress Metrics**
```markdown
### **Linear Progress Bar**
```
■■■□□□ 3/6 Tasks (50%)
```
```

## 📋 **Configuration Pattern Examples**

### User Configuration Pattern (Schema-Driven)
```typescript
// In config-schema.yaml
modelName:
  type: select
  label: Embedding Model
  detailsSource: data/embedding-models.json
  detailsColumns: [provider, speed, cost]
  valueColumn: id
```
Result: Appears in TUI, validates input, saves to config.yaml

### System Configuration Pattern (Direct JSON)
```json
// In system-configuration.json (from Task 2)
{
  "model": {
    "batchSize": 32,
    "timeoutMs": 30000
  }
}
```
Result: Internal only, no UI, loaded at startup

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