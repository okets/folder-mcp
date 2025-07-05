# Task 6.1: Configuration System Foundation

**Phase**: 6 - Configuration Foundation & CLI/TUI Parity  
**Status**: 🚧 IN PROGRESS  
**Created**: 2025-07-05  
**Complexity**: High  
**Approach**: Extend existing configuration system with comprehensive hierarchy, validation, profiles, and hot-reload capabilities

## 🎯 **Task Objective**

Create comprehensive configuration system that drives all functionality

## 🔍 **Pre-Implementation Checklist**

- [ ] Review existing code in: `src/config/`, `src/di/`
- [ ] Identify reusable components: ConfigFactory, validation schemas, resolver logic
- [ ] Check for similar patterns in: existing loaders, validators, managers
- [ ] Consider platform differences: Windows (`%ProgramData%`), Unix (`/etc`), path handling
- [ ] Review related tests: `tests/unit/config/`, `tests/integration/config/`

## 📋 **Scope**

- [ ] Configuration schema definition (YAML with JSON Schema validation)
- [ ] Configuration loader with hierarchy support
- [ ] Environment variable expansion
- [ ] Configuration validation with helpful errors
- [ ] Default configuration generation
- [ ] Configuration profiles support

## 📚 **Essential Project Context**

### From Completed Work
- Phase 1-5: MCP endpoints, file processing, TUI framework established
- Current capabilities: 9 MCP endpoints, FAISS search, Ollama embeddings
- Existing config system: TypeScript types, validation, factory pattern, multi-layer (global → local → CLI)
- Current limitations: Limited env var support (2 vars), no hot-reload, no profiles

### Critical Files to Understand
- `src/config/interfaces.ts` - Current configuration interfaces
- `src/config/manager.ts` - Existing configuration manager (if exists)
- `src/config/schema.ts` - Current schema definitions
- `src/config/resolver.ts` - Configuration resolution logic
- `src/config/defaults/smart.ts` - Smart defaults implementation
- `src/config/validator.ts` - Validation logic
- `src/config/factory.ts` - Factory pattern implementation
- `src/config/system.ts` - System configuration handling
- `src/config/loaders/system.ts` - System loader implementation

## 🔗 **Dependencies & Related Work**

### Prerequisite Tasks
- None (first task in Phase 6)

### Task Sequence
- **Previous**: Phase 5 completion - TUI framework established
- **Current**: Configuration System Foundation - establishes configuration as core architecture
- **Next**: Task 2: Basic Daemon Architecture - will use configuration system

## 📍 **Context from Roadmap**

### Related User Stories
- **As a user, I want sensible defaults**: System works without any configuration
- **As a user, I want to customize behavior**: Easy configuration for common needs
- **As a power user, I want full control**: Every aspect configurable
- **As a user, I want to check configuration**: `folder-mcp config get`

### Configuration System Design
- **Config Schema**: Hierarchical YAML with main sections (general, daemon, embeddings, search, transport, authentication, folders, performance, ui, features)
- **Default Values**: Smart defaults that work out-of-box for 90% of users
- **Validation Rules**: Comprehensive validation with helpful error messages
- **Code Updates**: All components must be updated to use configuration manager

### Implementation Details
Configuration hierarchy from roadmap:
1. **Defaults**: Smart defaults embedded in code
2. **System Config**: `/etc/folder-mcp/config.yaml` (optional)
3. **User Config**: `~/.folder-mcp/config.yaml`  
4. **Environment**: `FOLDER_MCP_*` environment variables
5. **Runtime**: CLI flags and TUI settings override everything

Core principles:
- Progressive Disclosure
- Strategy Pattern
- Feature Flags
- Performance Tuning
- Zero Config
- Config Validation
- Live Reload
- Smart Defaults

## 🔧 **Implementation Assignments**

### Assignment 1: Review and Plan Configuration Extension
**Goal**: Understand existing system and plan comprehensive extension
**Estimated Time**: 3 hours

#### Sub-tasks:
1. [ ] **1.1 Analyze existing configuration system**
   - Review all files in `src/config/`
   - Document current capabilities and limitations
   - Identify extension points and reusable components
   
2. [ ] **1.2 Design configuration hierarchy architecture**
   ```typescript
   // In src/config/hierarchy/types.ts
   export enum ConfigSource {
     DEFAULT = 0,
     SYSTEM = 1,
     USER = 2,
     ENVIRONMENT = 3,
     RUNTIME = 4
   }
   
   export interface ConfigurationSource {
     source: ConfigSource;
     priority: number;
     data: Partial<Configuration>;
     metadata?: {
       path?: string;
       timestamp?: Date;
     };
   }
   ```
   
3. [ ] **1.3 Create comprehensive schema definition**
   ```typescript
   // In src/config/schema/v1.ts
   export const ConfigurationSchemaV1 = {
     $schema: 'http://json-schema.org/draft-07/schema#',
     version: '1.0',
     type: 'object',
     properties: {
       general: {
         type: 'object',
         properties: {
           autoStart: { type: 'boolean', default: false },
           logLevel: { enum: ['debug', 'info', 'warn', 'error'], default: 'info' },
           telemetry: { type: 'boolean', default: false }
         }
       },
       daemon: {
         type: 'object',
         properties: {
           port: { type: 'number', minimum: 1024, maximum: 65535 },
           pidFile: { type: 'string', default: '~/.folder-mcp/daemon.pid' },
           healthCheck: {
             type: 'object',
             properties: {
               interval: { type: 'number', minimum: 1000, default: 30000 },
               timeout: { type: 'number', minimum: 100, default: 5000 }
             }
           },
           autoRestart: { type: 'boolean', default: true }
         }
       },
       // Continue for all sections...
     }
   };
   ```

**Validation**:
```bash
npm run build
# Expected: Build succeeds with new types and schema

# Verify schema is valid JSON Schema
npx ajv compile -s src/config/schema/v1.ts
```

**Implementation Notes**:
- Consider backward compatibility with existing config
- Plan for future schema versions and migrations
- Ensure Windows/Unix path differences are handled

**Completion Criteria**:
- [ ] All sub-tasks complete
- [ ] Documentation of findings created
- [ ] Schema covers all configuration sections
- [ ] No TypeScript errors

---

### Assignment 2: Implement Configuration Manager Core
**Goal**: Create central configuration manager with hierarchy support
**Estimated Time**: 4 hours

#### Sub-tasks:
1. [ ] **2.1 Create IConfigurationManager interface**
   ```typescript
   // In src/domain/config/IConfigurationManager.ts
   export interface IConfigurationManager {
     load(): Promise<Configuration>;
     reload(): Promise<Configuration>;
     get<T>(path: string): T | undefined;
     set(path: string, value: any): void;
     validate(): ValidationResult;
     getSource(path: string): ConfigSource;
     onChange(callback: (config: Configuration) => void): void;
   }
   ```

2. [ ] **2.2 Implement ConfigurationManager**
   ```typescript
   // In src/application/config/ConfigurationManager.ts
   export class ConfigurationManager implements IConfigurationManager {
     private sources: Map<ConfigSource, ConfigurationSource>;
     private merged: Configuration;
     private watchers: Set<ConfigWatcher>;
     
     constructor(
       private readonly defaultLoader: IConfigurationLoader,
       private readonly systemLoader: IConfigurationLoader,
       private readonly userLoader: IConfigurationLoader,
       private readonly envLoader: IConfigurationLoader,
       private readonly runtimeLoader: IConfigurationLoader,
       private readonly validator: IConfigurationValidator,
       private readonly merger: IConfigurationMerger
     ) {}
     
     async load(): Promise<Configuration> {
       // Load from all sources in hierarchy order
       const defaults = await this.defaultLoader.load();
       const system = await this.systemLoader.load();
       const user = await this.userLoader.load();
       const env = await this.envLoader.load();
       const runtime = await this.runtimeLoader.load();
       
       // Merge with proper precedence
       this.merged = this.merger.merge(defaults, system, user, env, runtime);
       
       // Validate final configuration
       const validation = this.validator.validate(this.merged);
       if (!validation.valid) {
         throw new ConfigurationError(validation.errors);
       }
       
       return this.merged;
     }
   }
   ```

3. [ ] **2.3 Register in DI container**
   ```typescript
   // In src/di/container.ts
   container.register<IConfigurationManager>('IConfigurationManager', {
     useClass: ConfigurationManager,
     lifecycle: Lifecycle.Singleton
   });
   ```

4. [ ] **2.4 Create unit tests**
   ```typescript
   // In tests/unit/config/manager.test.ts
   describe('ConfigurationManager', () => {
     test('should load configuration from all sources', async () => {
       // Test hierarchy loading
     });
     
     test('should merge with correct precedence', async () => {
       // Runtime > Env > User > System > Defaults
     });
     
     test('should validate merged configuration', async () => {
       // Test validation integration
     });
   });
   ```

**Validation**:
```bash
npm test -- tests/unit/config/manager.test.ts
# Expected: All manager tests pass

npm run build
# Expected: No TypeScript errors
```

**Implementation Notes**:
- Ensure proper error handling for missing config files
- Consider async loading performance
- Plan for partial configuration updates

**Completion Criteria**:
- [ ] All sub-tasks complete
- [ ] Tests pass on all platforms
- [ ] No TypeScript errors
- [ ] DI registration working

---

### Assignment 3: Implement Configuration Loaders
**Goal**: Create loaders for each configuration source in the hierarchy
**Estimated Time**: 5 hours

#### Sub-tasks:
1. [ ] **3.1 Create base loader interface**
   ```typescript
   // In src/domain/config/IConfigurationLoader.ts
   export interface IConfigurationLoader {
     load(): Promise<Partial<Configuration>>;
     exists(): Promise<boolean>;
     watch(callback: () => void): void;
     stopWatching(): void;
   }
   ```

2. [ ] **3.2 Implement system configuration loader**
   ```typescript
   // In src/infrastructure/config/loaders/SystemConfigLoader.ts
   export class SystemConfigLoader implements IConfigurationLoader {
     private readonly paths: string[];
     
     constructor(private readonly fileSystem: IFileSystem) {
       this.paths = this.getSystemPaths();
     }
     
     private getSystemPaths(): string[] {
       if (process.platform === 'win32') {
         return [
           path.join(process.env.ProgramData || 'C:\\ProgramData', 'folder-mcp', 'config.yaml'),
           path.join(process.env.ALLUSERSPROFILE || 'C:\\ProgramData', 'folder-mcp', 'config.yaml')
         ];
       } else {
         return [
           '/etc/folder-mcp/config.yaml',
           '/usr/local/etc/folder-mcp/config.yaml'
         ];
       }
     }
     
     async load(): Promise<Partial<Configuration>> {
       for (const configPath of this.paths) {
         try {
           if (await this.fileSystem.exists(configPath)) {
             const content = await this.fileSystem.readFile(configPath, 'utf-8');
             return yaml.parse(content);
           }
         } catch (error) {
           // Log but don't fail - system config is optional
           logger.debug(`System config not found at ${configPath}`);
         }
       }
       return {};
     }
   }
   ```

3. [ ] **3.3 Implement environment variable loader**
   ```typescript
   // In src/infrastructure/config/loaders/EnvironmentLoader.ts
   export class EnvironmentConfigLoader implements IConfigurationLoader {
     private readonly prefix = 'FOLDER_MCP_';
     
     async load(): Promise<Partial<Configuration>> {
       const config: any = {};
       
       for (const [key, value] of Object.entries(process.env)) {
         if (key.startsWith(this.prefix)) {
           const configPath = this.envKeyToConfigPath(key);
           this.setNestedValue(config, configPath, this.parseValue(value!));
         }
       }
       
       return config;
     }
     
     private envKeyToConfigPath(envKey: string): string {
       // FOLDER_MCP_EMBEDDINGS_BACKEND -> embeddings.backend
       return envKey
         .substring(this.prefix.length)
         .toLowerCase()
         .replace(/_/g, '.');
     }
     
     private parseValue(value: string): any {
       // Try to parse as JSON first (for arrays/objects)
       try {
         return JSON.parse(value);
       } catch {
         // Parse booleans
         if (value === 'true') return true;
         if (value === 'false') return false;
         
         // Parse numbers
         const num = Number(value);
         if (!isNaN(num)) return num;
         
         // Return as string
         return value;
       }
     }
   }
   ```

4. [ ] **3.4 Create tests for all loaders**
   ```typescript
   // In tests/unit/config/loaders/
   describe('SystemConfigLoader', () => {
     test('should load from platform-specific paths', async () => {
       // Test Windows paths
       // Test Unix paths
     });
   });
   
   describe('EnvironmentLoader', () => {
     test('should parse environment variables correctly', async () => {
       process.env.FOLDER_MCP_EMBEDDINGS_BACKEND = 'direct';
       process.env.FOLDER_MCP_DAEMON_PORT = '3456';
       process.env.FOLDER_MCP_GENERAL_AUTO_START = 'true';
       
       const config = await loader.load();
       expect(config.embeddings?.backend).toBe('direct');
       expect(config.daemon?.port).toBe(3456);
       expect(config.general?.autoStart).toBe(true);
     });
   });
   ```

**Validation**:
```bash
npm test -- tests/unit/config/loaders
# Expected: All loader tests pass

# Platform-specific testing
# Windows: Test %ProgramData% path resolution
# Unix: Test /etc path permissions
```

**Implementation Notes**:
- Handle missing files gracefully (system/user configs are optional)
- Consider security implications of environment variables
- Ensure proper type conversion for env values

**Completion Criteria**:
- [ ] All loaders implemented
- [ ] Platform-specific paths working
- [ ] Environment parsing handles all types
- [ ] Tests pass on Windows and Unix

---

### Assignment 4: Implement Configuration Validation
**Goal**: Create comprehensive validation with helpful error messages
**Estimated Time**: 3 hours

#### Sub-tasks:
1. [ ] **4.1 Create enhanced validator**
   ```typescript
   // In src/application/config/validation/EnhancedValidator.ts
   import Ajv, { ErrorObject } from 'ajv';
   
   export class EnhancedConfigurationValidator implements IConfigurationValidator {
     private ajv: Ajv;
     private compiledSchema: any;
     
     constructor(schema: any) {
       this.ajv = new Ajv({ 
         allErrors: true,
         verbose: true,
         coerceTypes: true,
         useDefaults: true
       });
       
       // Add custom formats
       this.ajv.addFormat('path', /^[^<>:"|?*]+$/);
       this.ajv.addFormat('port', /^[0-9]+$/);
       
       this.compiledSchema = this.ajv.compile(schema);
     }
     
     validate(config: any): ValidationResult {
       const valid = this.compiledSchema(config);
       
       if (!valid) {
         return {
           valid: false,
           errors: this.formatErrors(this.compiledSchema.errors!)
         };
       }
       
       // Additional semantic validation
       const semanticErrors = this.validateSemantics(config);
       if (semanticErrors.length > 0) {
         return {
           valid: false,
           errors: semanticErrors
         };
       }
       
       return { valid: true, errors: [] };
     }
     
     private formatErrors(errors: ErrorObject[]): ConfigurationError[] {
       return errors.map(error => ({
         path: error.instancePath || 'root',
         message: this.getHelpfulMessage(error),
         suggestion: this.getSuggestion(error),
         severity: this.getSeverity(error)
       }));
     }
     
     private getHelpfulMessage(error: ErrorObject): string {
       switch (error.keyword) {
         case 'enum':
           return `Invalid value "${error.data}". Must be one of: ${error.params.allowedValues.join(', ')}`;
         case 'type':
           return `Expected ${error.params.type} but got ${typeof error.data}`;
         case 'minimum':
           return `Value ${error.data} is below minimum of ${error.params.limit}`;
         default:
           return error.message || 'Invalid configuration';
       }
     }
   }
   ```

2. [ ] **4.2 Create error formatter**
   ```typescript
   // In src/application/config/validation/ErrorFormatter.ts
   export class ConfigurationErrorFormatter {
     format(errors: ConfigurationError[]): string {
       const output: string[] = [
         '❌ Configuration validation failed:',
         ''
       ];
       
       // Group errors by severity
       const criticalErrors = errors.filter(e => e.severity === 'error');
       const warnings = errors.filter(e => e.severity === 'warning');
       
       if (criticalErrors.length > 0) {
         output.push('ERRORS (must fix):');
         criticalErrors.forEach(error => {
           output.push(`  ❌ ${error.path}: ${error.message}`);
           if (error.suggestion) {
             output.push(`     💡 ${error.suggestion}`);
           }
         });
         output.push('');
       }
       
       if (warnings.length > 0) {
         output.push('WARNINGS (recommended fixes):');
         warnings.forEach(warning => {
           output.push(`  ⚠️  ${warning.path}: ${warning.message}`);
           if (warning.suggestion) {
             output.push(`     💡 ${warning.suggestion}`);
           }
         });
       }
       
       output.push('');
       output.push('Example valid configuration:');
       output.push(this.getRelevantExample(errors));
       
       return output.join('\n');
     }
   }
   ```

3. [ ] **4.3 Add validation tests**
   ```typescript
   // In tests/unit/config/validation/enhanced-validator.test.ts
   describe('EnhancedConfigurationValidator', () => {
     test('should provide helpful enum error messages', () => {
       const config = { embeddings: { backend: 'invalid' } };
       const result = validator.validate(config);
       
       expect(result.valid).toBe(false);
       expect(result.errors[0].message).toContain('Must be one of: ollama, direct, auto');
     });
     
     test('should validate cross-field dependencies', () => {
       const config = {
         transport: { remote: { enabled: true } },
         // Missing required auth when remote enabled
       };
       
       const result = validator.validate(config);
       expect(result.errors[0].message).toContain('Authentication required when remote transport enabled');
     });
   });
   ```

**Validation**:
```bash
npm test -- tests/unit/config/validation
# Expected: All validation tests pass

# Test with invalid config
echo "embeddings:\n  backend: invalid" > test-config.yaml
folder-mcp config validate --config test-config.yaml
# Expected: Clear error message with suggestions
```

**Implementation Notes**:
- Include suggestions for common mistakes
- Support warning-level validation (non-blocking)
- Consider i18n for error messages in future

**Completion Criteria**:
- [ ] Enhanced validator with helpful messages
- [ ] Error formatter provides clear output
- [ ] Cross-field validation working
- [ ] Tests demonstrate error quality

---

### Assignment 5: Implement Configuration Profiles
**Goal**: Enable profile-based configuration management
**Estimated Time**: 3 hours

#### Sub-tasks:
1. [ ] **5.1 Create profile manager interface**
   ```typescript
   // In src/domain/config/IProfileManager.ts
   export interface IProfileManager {
     listProfiles(): Promise<string[]>;
     loadProfile(name: string): Promise<Configuration>;
     saveProfile(name: string, config: Configuration): Promise<void>;
     deleteProfile(name: string): Promise<void>;
     getCurrentProfile(): string | null;
     setCurrentProfile(name: string): Promise<void>;
     createFromCurrent(name: string): Promise<void>;
   }
   ```

2. [ ] **5.2 Implement profile manager**
   ```typescript
   // In src/application/config/profiles/ProfileManager.ts
   export class ConfigurationProfileManager implements IProfileManager {
     private currentProfile: string | null = null;
     
     constructor(
       private readonly fileSystem: IFileSystem,
       private readonly configPath: string = '~/.folder-mcp'
     ) {}
     
     async listProfiles(): Promise<string[]> {
       const profilesDir = path.join(this.configPath, 'profiles');
       
       try {
         const files = await this.fileSystem.readdir(profilesDir);
         return files
           .filter(f => f.endsWith('.yaml'))
           .map(f => path.basename(f, '.yaml'));
       } catch {
         return [];
       }
     }
     
     async loadProfile(name: string): Promise<Configuration> {
       const profilePath = this.getProfilePath(name);
       
       if (!await this.fileSystem.exists(profilePath)) {
         throw new Error(`Profile '${name}' not found`);
       }
       
       const content = await this.fileSystem.readFile(profilePath, 'utf-8');
       return yaml.parse(content);
     }
     
     async createFromCurrent(name: string): Promise<void> {
       // Create profile from current configuration
       const currentConfig = await this.configManager.load();
       await this.saveProfile(name, currentConfig);
     }
     
     private getProfilePath(name: string): string {
       return path.join(this.configPath, 'profiles', `${name}.yaml`);
     }
   }
   ```

3. [ ] **5.3 Add profile support to configuration manager**
   ```typescript
   // Update ConfigurationManager to support profiles
   async loadWithProfile(profileName?: string): Promise<Configuration> {
     let profileConfig = {};
     
     if (profileName) {
       profileConfig = await this.profileManager.loadProfile(profileName);
     }
     
     // Profile comes between user and environment in hierarchy
     const defaults = await this.defaultLoader.load();
     const system = await this.systemLoader.load();
     const user = await this.userLoader.load();
     const profile = profileConfig;
     const env = await this.envLoader.load();
     const runtime = await this.runtimeLoader.load();
     
     return this.merger.merge(defaults, system, user, profile, env, runtime);
   }
   ```

4. [ ] **5.4 Create profile tests**
   ```typescript
   // In tests/unit/config/profiles/profile-manager.test.ts
   describe('ProfileManager', () => {
     test('should create and load profiles', async () => {
       const config = { embeddings: { backend: 'direct' } };
       await manager.saveProfile('development', config);
       
       const loaded = await manager.loadProfile('development');
       expect(loaded.embeddings.backend).toBe('direct');
     });
     
     test('should list available profiles', async () => {
       await manager.saveProfile('dev', {});
       await manager.saveProfile('prod', {});
       
       const profiles = await manager.listProfiles();
       expect(profiles).toContain('dev');
       expect(profiles).toContain('prod');
     });
   });
   ```

**Validation**:
```bash
npm test -- tests/unit/config/profiles
# Expected: Profile tests pass

# Manual test
folder-mcp config profile create development
folder-mcp config profile list
folder-mcp --profile development status
```

**Implementation Notes**:
- Consider profile inheritance (base profiles)
- Handle profile conflicts gracefully
- Support exporting/importing profiles

**Completion Criteria**:
- [ ] Profile manager implemented
- [ ] Integration with config manager
- [ ] Profile CRUD operations working
- [ ] Tests passing

---

### Assignment 6: Implement Hot Reload System
**Goal**: Support live configuration updates where applicable
**Estimated Time**: 4 hours

#### Sub-tasks:
1. [ ] **6.1 Create configuration watcher**
   ```typescript
   // In src/infrastructure/config/watcher/ConfigurationWatcher.ts
   import { FSWatcher } from 'chokidar';
   
   export class ConfigurationWatcher implements IConfigurationWatcher {
     private watchers: Map<string, FSWatcher> = new Map();
     private callbacks: Set<(config: Configuration) => void> = new Set();
     private reloadDebounce: NodeJS.Timeout | null = null;
     
     constructor(
       private readonly configPaths: string[],
       private readonly configManager: IConfigurationManager,
       private readonly debounceMs: number = 500
     ) {}
     
     start(): void {
       for (const configPath of this.configPaths) {
         const watcher = chokidar.watch(configPath, {
           persistent: true,
           ignoreInitial: true
         });
         
         watcher.on('change', () => this.handleChange(configPath));
         this.watchers.set(configPath, watcher);
       }
     }
     
     private handleChange(path: string): void {
       logger.info(`Configuration change detected: ${path}`);
       
       // Debounce rapid changes
       if (this.reloadDebounce) {
         clearTimeout(this.reloadDebounce);
       }
       
       this.reloadDebounce = setTimeout(() => {
         this.reloadConfiguration();
       }, this.debounceMs);
     }
     
     private async reloadConfiguration(): Promise<void> {
       try {
         const newConfig = await this.configManager.reload();
         
         // Notify all listeners
         for (const callback of this.callbacks) {
           callback(newConfig);
         }
       } catch (error) {
         logger.error('Failed to reload configuration:', error);
       }
     }
   }
   ```

2. [ ] **6.2 Implement reload strategies**
   ```typescript
   // In src/application/config/reload/ReloadStrategy.ts
   export interface IReloadStrategy {
     canReload(path: string): boolean;
     reload(oldValue: any, newValue: any): Promise<void>;
   }
   
   export class LogLevelReloadStrategy implements IReloadStrategy {
     canReload(path: string): boolean {
       return path === 'general.logLevel';
     }
     
     async reload(oldValue: string, newValue: string): Promise<void> {
       logger.setLevel(newValue);
       logger.info(`Log level changed from ${oldValue} to ${newValue}`);
     }
   }
   
   export class ReloadStrategyRegistry {
     private strategies: Map<string, IReloadStrategy> = new Map();
     
     register(path: string, strategy: IReloadStrategy): void {
       this.strategies.set(path, strategy);
     }
     
     async handleConfigChange(oldConfig: Configuration, newConfig: Configuration): Promise<void> {
       const changes = this.findChanges(oldConfig, newConfig);
       
       for (const change of changes) {
         const strategy = this.strategies.get(change.path);
         
         if (strategy && strategy.canReload(change.path)) {
           await strategy.reload(change.oldValue, change.newValue);
         } else {
           logger.warn(`Configuration change at ${change.path} requires restart`);
         }
       }
     }
   }
   ```

3. [ ] **6.3 Add hot reload notifications**
   ```typescript
   // In src/application/config/notifications/ReloadNotifier.ts
   export class ConfigurationReloadNotifier {
     constructor(
       private readonly notificationService: INotificationService
     ) {}
     
     notifyReloadSuccess(changes: ConfigChange[]): void {
       const reloadable = changes.filter(c => c.reloadable);
       const requireRestart = changes.filter(c => !c.reloadable);
       
       if (reloadable.length > 0) {
         this.notificationService.info(
           `Configuration reloaded: ${reloadable.map(c => c.path).join(', ')}`
         );
       }
       
       if (requireRestart.length > 0) {
         this.notificationService.warning(
           `Restart required for: ${requireRestart.map(c => c.path).join(', ')}`
         );
       }
     }
   }
   ```

4. [ ] **6.4 Create hot reload tests**
   ```typescript
   // In tests/integration/config/hot-reload.test.ts
   describe('Configuration Hot Reload', () => {
     test('should reload log level without restart', async () => {
       const configPath = path.join(testDir, 'config.yaml');
       await fs.writeFile(configPath, 'general:\n  logLevel: info');
       
       const watcher = new ConfigurationWatcher([configPath], configManager);
       watcher.start();
       
       // Change log level
       await fs.writeFile(configPath, 'general:\n  logLevel: debug');
       
       // Wait for reload
       await new Promise(resolve => setTimeout(resolve, 1000));
       
       expect(logger.level).toBe('debug');
     });
     
     test('should notify when restart required', async () => {
       // Test changing daemon port notifies restart needed
     });
   });
   ```

**Validation**:
```bash
npm test -- tests/integration/config/hot-reload.test.ts
# Expected: Hot reload tests pass

# Manual test
folder-mcp serve --watch-config
# In another terminal, edit ~/.folder-mcp/config.yaml
# Should see reload notifications
```

**Implementation Notes**:
- Not all settings can be reloaded (e.g., daemon port)
- Debounce rapid changes to avoid thrashing
- Consider transaction-like reload (all or nothing)

**Completion Criteria**:
- [ ] Configuration watcher implemented
- [ ] Reload strategies for common settings
- [ ] Notifications for reload status
- [ ] Tests demonstrate hot reload

---

### Assignment 7: Implement Smart Defaults System
**Goal**: Create intelligent defaults based on system capabilities
**Estimated Time**: 2 hours

#### Sub-tasks:
1. [ ] **7.1 Create system capability detector**
   ```typescript
   // In src/infrastructure/config/defaults/SystemCapabilityDetector.ts
   export class SystemCapabilityDetector {
     async detect(): Promise<SystemCapabilities> {
       const capabilities: SystemCapabilities = {
         platform: process.platform,
         arch: process.arch,
         cpuCount: os.cpus().length,
         totalMemory: os.totalmem(),
         availableMemory: os.freemem(),
         gpuAvailable: await this.detectGPU(),
         ollamaAvailable: await this.detectOllama(),
         networkSpeed: await this.estimateNetworkSpeed()
       };
       
       return capabilities;
     }
     
     private async detectGPU(): Promise<boolean> {
       // Platform-specific GPU detection
       if (process.platform === 'darwin') {
         // Check for Metal support
         try {
           const result = await exec('system_profiler SPDisplaysDataType');
           return result.stdout.includes('Metal');
         } catch {
           return false;
         }
       } else if (process.platform === 'win32') {
         // Check for NVIDIA/AMD
         try {
           const result = await exec('wmic path win32_VideoController get name');
           return /NVIDIA|AMD|Radeon/i.test(result.stdout);
         } catch {
           return false;
         }
       } else {
         // Linux: Check for nvidia-smi
         try {
           await exec('nvidia-smi');
           return true;
         } catch {
           return false;
         }
       }
     }
   }
   ```

2. [ ] **7.2 Implement smart defaults generator**
   ```typescript
   // In src/application/config/defaults/SmartDefaultsGenerator.ts
   export class SmartDefaultsGenerator {
     constructor(
       private readonly capabilityDetector: SystemCapabilityDetector
     ) {}
     
     async generate(): Promise<Configuration> {
       const capabilities = await this.capabilityDetector.detect();
       
       return {
         general: {
           autoStart: false,
           logLevel: 'info',
           telemetry: false
         },
         
         daemon: {
           port: 3000,
           pidFile: this.getPidFilePath(),
           healthCheck: {
             interval: 30000,
             timeout: 5000
           },
           autoRestart: true
         },
         
         embeddings: {
           backend: this.selectEmbeddingBackend(capabilities),
           model: 'nomic-embed-text',
           batchSize: this.calculateBatchSize(capabilities),
           hardware: {
             preferGPU: capabilities.gpuAvailable,
             maxMemory: Math.floor(capabilities.totalMemory * 0.25 / (1024 * 1024 * 1024)) // 25% of RAM in GB
           }
         },
         
         performance: {
           caching: {
             enabled: true,
             directory: this.getCacheDirectory(),
             maxSize: this.calculateCacheSize(capabilities),
             ttl: '7d'
           },
           processing: {
             maxConcurrent: Math.max(2, Math.floor(capabilities.cpuCount / 2)),
             queueSize: 1000
           }
         },
         
         // ... other sections
       };
     }
     
     private selectEmbeddingBackend(capabilities: SystemCapabilities): string {
       if (capabilities.ollamaAvailable && capabilities.gpuAvailable) {
         return 'ollama';
       } else if (capabilities.availableMemory > 4 * 1024 * 1024 * 1024) { // 4GB
         return 'direct';
       } else {
         return 'auto';
       }
     }
     
     private calculateBatchSize(capabilities: SystemCapabilities): number {
       if (capabilities.gpuAvailable) {
         return 64;
       } else if (capabilities.availableMemory > 8 * 1024 * 1024 * 1024) {
         return 32;
       } else {
         return 16;
       }
     }
   }
   ```

3. [ ] **7.3 Create defaults tests**
   ```typescript
   // In tests/unit/config/defaults/smart-defaults.test.ts
   describe('SmartDefaultsGenerator', () => {
     test('should select ollama backend when GPU available', async () => {
       mockCapabilities.gpuAvailable = true;
       mockCapabilities.ollamaAvailable = true;
       
       const defaults = await generator.generate();
       expect(defaults.embeddings.backend).toBe('ollama');
     });
     
     test('should adjust batch size based on memory', async () => {
       mockCapabilities.availableMemory = 2 * 1024 * 1024 * 1024; // 2GB
       
       const defaults = await generator.generate();
       expect(defaults.embeddings.batchSize).toBe(16);
     });
   });
   ```

**Validation**:
```bash
npm test -- tests/unit/config/defaults
# Expected: Smart defaults tests pass

# Test on different systems
# High-end machine: Should select optimal performance settings
# Low-end machine: Should select conservative settings
```

**Implementation Notes**:
- Consider user preferences over system capabilities
- Document why each default was chosen
- Allow overriding smart defaults

**Completion Criteria**:
- [ ] System capability detection working
- [ ] Smart defaults adjust to hardware
- [ ] Platform-specific optimizations
- [ ] Tests cover various scenarios

---

### Assignment 8: Create Configuration CLI Commands
**Goal**: Implement CLI commands for configuration management
**Estimated Time**: 3 hours

#### Sub-tasks:
1. [ ] **8.1 Create config command structure**
   ```typescript
   // In src/interfaces/cli/commands/config.ts
   export class ConfigCommand extends BaseCommand {
     constructor(
       private readonly configManager: IConfigurationManager,
       private readonly profileManager: IProfileManager,
       private readonly validator: IConfigurationValidator
     ) {
       super();
     }
     
     register(program: Command): void {
       const config = program
         .command('config')
         .description('Manage folder-mcp configuration');
       
       // Subcommands
       this.registerGet(config);
       this.registerSet(config);
       this.registerValidate(config);
       this.registerProfile(config);
     }
     
     private registerGet(config: Command): void {
       config
         .command('get [path]')
         .description('Get configuration value')
         .option('--json', 'Output as JSON')
         .option('--source', 'Show configuration source')
         .action(async (path, options) => {
           const value = path 
             ? this.configManager.get(path)
             : await this.configManager.load();
           
           if (options.source && path) {
             const source = this.configManager.getSource(path);
             console.log(`Source: ${ConfigSource[source]}`);
           }
           
           if (options.json) {
             console.log(JSON.stringify(value, null, 2));
           } else {
             console.log(yaml.stringify(value));
           }
         });
     }
   }
   ```

2. [ ] **8.2 Implement configuration validation command**
   ```typescript
   private registerValidate(config: Command): void {
     config
       .command('validate [file]')
       .description('Validate configuration file')
       .option('--fix', 'Attempt to fix errors')
       .action(async (file, options) => {
         const configPath = file || await this.findConfigFile();
         
         try {
           const content = await fs.readFile(configPath, 'utf-8');
           const parsed = yaml.parse(content);
           
           const result = this.validator.validate(parsed);
           
           if (result.valid) {
             console.log('✅ Configuration is valid');
           } else {
             const formatter = new ConfigurationErrorFormatter();
             console.error(formatter.format(result.errors));
             
             if (options.fix) {
               // Attempt auto-fix for certain errors
               const fixed = await this.autoFix(parsed, result.errors);
               await fs.writeFile(configPath, yaml.stringify(fixed));
               console.log('🔧 Applied automatic fixes');
             }
             
             process.exit(1);
           }
         } catch (error) {
           console.error(`Failed to validate: ${error.message}`);
           process.exit(1);
         }
       });
   }
   ```

3. [ ] **8.3 Add profile management commands**
   ```typescript
   private registerProfile(config: Command): void {
     const profile = config
       .command('profile')
       .description('Manage configuration profiles');
     
     profile
       .command('list')
       .description('List available profiles')
       .action(async () => {
         const profiles = await this.profileManager.listProfiles();
         const current = this.profileManager.getCurrentProfile();
         
         profiles.forEach(p => {
           console.log(p === current ? `* ${p}` : `  ${p}`);
         });
       });
     
     profile
       .command('create <name>')
       .description('Create new profile from current configuration')
       .action(async (name) => {
         await this.profileManager.createFromCurrent(name);
         console.log(`✅ Profile '${name}' created`);
       });
   }
   ```

4. [ ] **8.4 Create CLI configuration tests**
   ```typescript
   // In tests/integration/cli/config-commands.test.ts
   describe('Configuration CLI Commands', () => {
     test('config get should return value', async () => {
       const result = await runCLI(['config', 'get', 'embeddings.backend']);
       expect(result.stdout).toContain('ollama');
     });
     
     test('config validate should check syntax', async () => {
       await fs.writeFile('invalid.yaml', 'invalid: [yaml syntax');
       const result = await runCLI(['config', 'validate', 'invalid.yaml']);
       expect(result.code).toBe(1);
       expect(result.stderr).toContain('validation failed');
     });
   });
   ```

**Validation**:
```bash
npm test -- tests/integration/cli/config-commands.test.ts
# Expected: CLI command tests pass

# Manual test
folder-mcp config get
folder-mcp config get embeddings.backend --source
folder-mcp config validate
folder-mcp config profile list
```

**Implementation Notes**:
- Support both YAML and JSON output formats
- Provide shell completion for config paths
- Consider interactive mode for complex edits

**Completion Criteria**:
- [ ] All config subcommands implemented
- [ ] Validation with helpful errors
- [ ] Profile management working
- [ ] Tests cover all commands

---

### Assignment 9: Integration Testing and Documentation
**Goal**: Ensure all components work together and document the system
**Estimated Time**: 2 hours

#### Sub-tasks:
1. [ ] **9.1 Create comprehensive integration tests**
   ```typescript
   // In tests/integration/config/full-system.test.ts
   describe('Configuration System Integration', () => {
     test('should load configuration from all sources in correct order', async () => {
       // Set up test environment
       await fs.writeFile('/etc/folder-mcp/config.yaml', 'daemon:\n  port: 3001');
       await fs.writeFile('~/.folder-mcp/config.yaml', 'daemon:\n  port: 3002');
       process.env.FOLDER_MCP_DAEMON_PORT = '3003';
       
       const config = await configManager.load();
       expect(config.daemon.port).toBe(3003); // Env overrides all
     });
     
     test('should support profile-based configuration', async () => {
       await profileManager.saveProfile('test', { embeddings: { backend: 'direct' } });
       const config = await configManager.loadWithProfile('test');
       expect(config.embeddings.backend).toBe('direct');
     });
     
     test('should hot reload applicable settings', async () => {
       // Test hot reload integration
     });
   });
   ```

2. [ ] **9.2 Create configuration documentation**
   ```markdown
   # In docs/configuration/README.md
   # Configuration System
   
   ## Overview
   The folder-mcp configuration system provides flexible, hierarchical configuration management...
   
   ## Configuration Hierarchy
   1. **Defaults** - Smart defaults based on system capabilities
   2. **System** - `/etc/folder-mcp/config.yaml` (optional)
   3. **User** - `~/.folder-mcp/config.yaml`
   4. **Profile** - `~/.folder-mcp/profiles/<name>.yaml`
   5. **Environment** - `FOLDER_MCP_*` variables
   6. **Runtime** - CLI flags
   
   ## Configuration Schema
   [Document all sections with examples]
   
   ## Environment Variables
   All configuration options can be overridden via environment variables...
   ```

3. [ ] **9.3 Update CLAUDE.md with configuration info**
   ```markdown
   # Add to CLAUDE.md
   ## Configuration System
   
   The project uses a comprehensive configuration system with:
   - 5-level hierarchy (defaults → system → user → environment → runtime)
   - Smart defaults based on system capabilities
   - Hot reload for applicable settings
   - Profile support for different scenarios
   - Environment variable overrides (FOLDER_MCP_*)
   
   Key configuration files:
   - `src/config/schema/v1.ts` - Configuration schema
   - `src/application/config/ConfigurationManager.ts` - Main manager
   - `~/.folder-mcp/config.yaml` - User configuration
   ```

**Validation**:
```bash
# Run full test suite
npm test

# Build and verify
npm run build

# Test configuration in real scenario
folder-mcp config validate
folder-mcp --profile development serve
```

**Implementation Notes**:
- Include configuration examples for common scenarios
- Document migration from old to new config system
- Create troubleshooting guide

**Completion Criteria**:
- [ ] Integration tests passing
- [ ] Configuration documentation complete
- [ ] CLAUDE.md updated
- [ ] Examples for common use cases

## ✅ **Task Completion Criteria**

From roadmap:
- [ ] Configuration schema defined and documented
- [ ] Loader handles all configuration sources
- [ ] Validation provides helpful error messages
- [ ] Configuration profiles working
- [ ] Hot reload for applicable settings
- [ ] Configuration CLI commands working

Additional requirements:
- [ ] All assignments completed
- [ ] All tests passing
- [ ] Documentation updated
- [ ] DI patterns followed throughout
- [ ] Platform-specific handling working

## 🧪 **Testing Requirements**

### Unit Tests
- `tests/unit/config/schema.test.ts` - Schema validation tests
- `tests/unit/config/manager.test.ts` - Configuration manager tests
- `tests/unit/config/loaders/*.test.ts` - All loader tests
- `tests/unit/config/validation/*.test.ts` - Validation tests
- `tests/unit/config/profiles/*.test.ts` - Profile management tests
- `tests/unit/config/defaults/*.test.ts` - Smart defaults tests
- `tests/unit/config/watcher.test.ts` - File watcher tests

### Integration Tests
- `tests/integration/config/full-system.test.ts` - Complete hierarchy testing
- `tests/integration/config/hot-reload.test.ts` - Live reload testing
- `tests/integration/config/env-override.test.ts` - Environment variable tests
- `tests/integration/cli/config-commands.test.ts` - CLI command tests

### Manual E2E Testing
1. **Zero Config Test**:
   ```bash
   # Delete all config files
   rm -rf ~/.folder-mcp/config.yaml /etc/folder-mcp/config.yaml
   folder-mcp status
   # Should work with smart defaults
   ```

2. **Hierarchy Test**:
   ```bash
   # Create configs at different levels
   sudo mkdir -p /etc/folder-mcp
   echo "daemon:\n  port: 3001" | sudo tee /etc/folder-mcp/config.yaml
   echo "daemon:\n  port: 3002" > ~/.folder-mcp/config.yaml
   FOLDER_MCP_DAEMON_PORT=3003 folder-mcp config get daemon.port
   # Should show 3003 (env overrides)
   ```

3. **Profile Test**:
   ```bash
   folder-mcp config profile create development
   folder-mcp config profile create production
   folder-mcp --profile development status
   folder-mcp --profile production status
   ```

4. **Hot Reload Test**:
   ```bash
   folder-mcp serve --watch-config &
   echo "general:\n  logLevel: debug" >> ~/.folder-mcp/config.yaml
   # Should see log level change without restart
   ```

### Configuration Test Cases
- **Default Config**: Feature works with zero configuration
- **Custom Config**: Feature respects all configuration options
- **Invalid Config**: Proper error messages for invalid values
- **Profile Switching**: Profiles load and apply correctly
- **Environment Override**: Environment variables override file config
- **Platform Differences**: Windows paths work correctly

## 📊 **Progress Tracking**

### Assignment Status
- [x] Assignment 1: Review and Plan Configuration Extension ✅ COMPLETED (Old Method)
  - [x] 1.1 Analyze existing configuration system
  - [x] 1.2 Design configuration hierarchy architecture
  - [x] 1.3 Create comprehensive schema definition
- [x] Assignment 2: Implement Configuration Manager Core ✅ COMPLETED (Old Method)
  - [x] 2.1 Create IConfigurationManager interface
  - [x] 2.2 Implement ConfigurationManager (`src/config/manager-refactored.ts`)
  - [x] 2.3 Register in DI container (`src/config/di-setup.ts`)
  - [x] 2.4 Create unit tests
- [x] Assignment 3: Implement Configuration Loaders ✅ COMPLETED 
  - [x] 3.1 Create base loader interface
  - [x] 3.2 Implement system configuration loader (`src/config/loaders/system.ts`)
  - [x] 3.3 Implement environment variable loader (Full FOLDER_MCP_* support)
  - [x] 3.4 Create tests for all loaders
- [x] Assignment 4: Implement Configuration Validation ✅ COMPLETED (Old Method)
  - [x] 4.1 Create enhanced validator (`src/config/validation/enhanced.ts`)
  - [x] 4.2 Create error formatter
  - [x] 4.3 Add validation tests
- [x] Assignment 5: Implement Configuration Profiles ✅ COMPLETED (Old Method)
  - [x] 5.1 Create profile manager interface
  - [x] 5.2 Implement profile manager (`src/config/profiles.ts`)
  - [x] 5.3 Add profile support to configuration manager
  - [x] 5.4 Create profile tests
- [x] Assignment 6: Implement Hot Reload System ✅ COMPLETED (Old Method)
  - [x] 6.1 Create configuration watcher (`src/config/watcher.ts`)
  - [x] 6.2 Implement reload strategies (`src/config/hot-reload.ts`)
  - [x] 6.3 Add hot reload notifications
  - [x] 6.4 Create hot reload tests
- [x] Assignment 7: Implement Smart Defaults System ✅ COMPLETED (Old Method)
  - [x] 7.1 Create system capability detector (`src/config/defaults/smart.ts`)
  - [x] 7.2 Implement smart defaults generator
  - [x] 7.3 Create defaults tests
- [x] Assignment 8: Create Configuration CLI Commands ✅ COMPLETED
  - [x] 8.1 Create config command structure
  - [x] 8.2 Implement configuration validation command
  - [x] 8.3 Add profile management commands
  - [x] 8.4 Create CLI configuration tests
- [ ] Assignment 9: Integration Testing and Documentation
  - [ ] 9.1 Create comprehensive integration tests
  - [ ] 9.2 Create configuration documentation
  - [ ] 9.3 Update CLAUDE.md with configuration info

### Time Tracking
| Assignment | Estimated | Actual | Status | Notes |
|------------|-----------|--------|--------|-------|
| Assignment 1 | 3 hours | ~3 hours | Complete | Completed via old method |
| Assignment 2 | 4 hours | ~4 hours | Complete | ConfigurationManager in manager-refactored.ts |
| Assignment 3 | 5 hours | ~5 hours | Complete | Full environment variable loader with FOLDER_MCP_* support |
| Assignment 4 | 3 hours | ~3 hours | Complete | Enhanced validation implemented |
| Assignment 5 | 3 hours | ~3 hours | Complete | Profile system fully working |
| Assignment 6 | 4 hours | ~4 hours | Complete | Hot reload with strategies |
| Assignment 7 | 2 hours | ~2 hours | Complete | Smart defaults with capability detection |
| Assignment 8 | 3 hours | ~3 hours | Complete | Comprehensive CLI commands with subcommands |
| Assignment 9 | 2 hours | - | Not Started | Integration tests and docs needed |

### Implementation Discoveries
**Note**: Assignments 1-7 were completed using the old implementation method before the new task plan structure was adopted.

- **Key Findings**: 
  - Existing configuration system at `src/config/` provided strong foundation
  - TypeScript-first approach with proper interfaces works well
  - DI container integration crucial for clean architecture
  - Token-based DI (symbols) preferred over string-based
  
- **Decisions Made**: 
  - Used dependency injection throughout for testability
  - Created separate manager-refactored.ts to preserve original
  - Implemented registry pattern for configuration metadata
  - Used event-driven architecture for configuration changes
  
- **Changes from Plan**: 
  - Implementation preceded detailed task planning (old method)
  - More comprehensive than originally scoped
  - Added configuration registry not in original plan
  - Enhanced validation includes warnings and info levels
  
- **Reusable Patterns**: 
  - Token-based DI pattern can be used throughout codebase
  - Configuration registry pattern useful for other extensible systems
  - Hot reload strategy pattern applicable to other services
  - Smart defaults generator pattern for other auto-configuration needs

### Platform-Specific Notes
- **Windows**: 
  - System config path uses `%PROGRAMDATA%\folder-mcp\config.yaml`
  - File watcher uses polling mode for better compatibility
  - Path separators handled automatically by path.join()
  
- **macOS**: 
  - System config at `/etc/folder-mcp/config.yaml` requires sudo for creation
  - Native file watching works well without polling
  
- **Linux**: 
  - Similar to macOS for system paths
  - Some distros may need explicit fs.watch permissions

## 🔍 **Quick Reference**

### Key Commands
```bash
# Build and test
npm run build && npm test

# Run specific tests
npm test -- tests/unit/config
npm test -- tests/integration/config

# Test configuration
folder-mcp config validate
folder-mcp config get
folder-mcp config set embeddings.backend direct

# Test profiles
folder-mcp config profile list
folder-mcp config profile create development
folder-mcp --profile development status
```

### Common Issues
- **Build errors**: Check imports and interface implementations
- **Test failures**: Verify mock setup and DI registration
- **Config not loading**: Check file permissions and YAML syntax
- **Hot reload not working**: Verify file watcher permissions
- **Platform paths**: Ensure proper path handling for Windows/Unix

## 📝 **Living Document Note**

**IMPORTANT**: This task plan is a LIVING DOCUMENT that should be updated throughout implementation:
- Update assignment status as work progresses (Not Started → In Progress → Complete)
- Document discoveries and decisions in the Implementation Discoveries section
- Add platform-specific notes as issues are encountered
- Update time tracking with actual hours spent
- If assignments need to be broken down further, add sub-tasks as needed
- Mark completed items with ✅ and include completion date

When marking an assignment complete, consider adding:
- What was actually implemented (if different from plan)
- Key code snippets showing the solution
- Any patterns that emerged
- Links to relevant commits

---

**To execute this plan:**
```
/execute-prp docs/development-plan/roadmap/currently-implementing/Phase-6-Task-1-Configuration-System-Foundation-NEW.md
```