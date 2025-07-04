# Configuration Foundation & CLI/TUI Parity Implementation Plan

## 🎯 **Project Overview**

**Project**: Configuration Foundation & CLI/TUI Parity  
**Phase**: 6  
**Status**: 📋 **PLANNED**  
**Goal**: Establish configuration as the core architectural principle driving all folder-mcp functionality, with complete feature parity between CLI and TUI interfaces.

**Core Philosophy**: Configuration drives flexibility throughout the system. Every aspect of folder-mcp is configurable, with smart defaults that work out-of-the-box while enabling deep customization for power users.

**Implementation Strategy**: 
- **Incremental Approach**: Build core configuration system first, then layer on features
- **Testing Early**: Build testing framework alongside implementation, not after
- **Schema-First Design**: Define complete configuration schema upfront to avoid breaking changes
- **Reuse Existing**: Review and extend existing configuration code at `src/config/`

---

## 📋 **Implementation Order Rationale**

The tasks have been reordered from the original plan to optimize development flow:

1. **Pre-Implementation Review**: Understand existing configuration code to avoid reinventing the wheel
2. **Core System (Task 1)**: Foundation that everything else builds upon
3. **Schema (Task 2)**: Define the complete configuration structure upfront
4. **Testing Foundation (Task 3)**: Enable test-driven development for remaining tasks
5. **Environment Variables (Task 4)**: Fundamental integration needed early
6. **CLI/TUI (Tasks 5-6)**: User interfaces built on solid foundation
7. **Transport (Task 7)**: Configuration-driven transport selection
8. **Validation & Polish (Tasks 8-11)**: Ensure quality and completeness

This order ensures:
- We build on existing code rather than starting from scratch
- Core functionality is tested as we build
- User-facing features have a solid foundation
- Complex features come after basics are proven

---

## 🔧 **Safety Framework**

### **Pre-Implementation Backup**
```powershell
# Create a safety backup before starting Phase 6
git checkout -b phase6-config-foundation-backup
git add -A && git commit -m "Backup: Phase 6 Configuration Foundation starting point"
git push origin phase6-config-foundation-backup

# Create working branch
git checkout -b phase6-config-foundation
```

### **Rollback Plan**
```powershell
# If critical issues arise, rollback to backup
git checkout main
git reset --hard phase6-config-foundation-backup
```

---

## 🎯 **Implementation Tasks**

### **Pre-Implementation: Review Existing Configuration**

**[✅ COMPLETED]**

- [x] Review existing configuration code at `src/config/`
- [x] Document current configuration capabilities
- [x] Identify reusable components
- [x] Plan integration with new comprehensive system

**Key Findings:**
- Strong existing foundation with TypeScript types, validation, and factory pattern
- Multi-layered config system (global → local → CLI)
- Excellent schema validation and error messages
- Limited environment variable support (only 2 vars)
- No hot-reload, profiles, or systematic env mapping

### **Task 1: Core Configuration System Architecture**

**[✅ COMPLETED - Implementation Breakdown]**

#### **1.1 Extend Configuration Manager** ✅
- [x] Create `src/config/manager.ts` as the central configuration orchestrator
- [x] Extend existing `ConfigFactory` to support new configuration sources
- [x] Add configuration source priority enum: `DEFAULT < SYSTEM < USER < ENV < RUNTIME`
- [x] Implement configuration source tracking for debugging

**Implementation:**
```typescript
// src/config/manager.ts
export class ConfigurationManager {
  private sources: Map<ConfigSource, Partial<Config>>;
  private merged: ResolvedConfig;
  private watchers: Set<ConfigWatcher>;
  
  async load(): Promise<ResolvedConfig> {
    // Load from all sources in priority order
    const defaults = await this.loadDefaults();
    const system = await this.loadSystemConfig();
    const user = await this.loadUserConfig();
    const env = await this.loadEnvConfig();
    const runtime = await this.loadRuntimeConfig();
    
    // Merge using existing ConfigFactory
    return this.factory.merge(defaults, system, user, env, runtime);
  }
}
```

#### **1.2 Add System Configuration Support** ✅
- [x] Create system config loader in `src/config/loaders/system.ts`
- [x] Check `/etc/folder-mcp/config.yaml` on Unix systems
- [x] Check `%ProgramData%\folder-mcp\config.yaml` on Windows
- [x] Add permission handling for system directories
- [x] Gracefully handle missing system config

#### **1.3 Implement Configuration Profiles** ✅
- [x] Create `src/config/profiles.ts` for profile management
- [x] Add profile selection logic (development, staging, production)
- [x] Support `--profile` CLI argument
- [x] Allow `FOLDER_MCP_PROFILE` environment variable
- [x] Merge profile-specific overrides

**Profile Structure:**
```yaml
# ~/.folder-mcp/profiles/development.yaml
profile: development
embeddings:
  backend: "direct"  # Faster for development
  batchSize: 8      # Smaller batches for debugging
logging:
  level: "debug"
  verbose: true
```

#### **1.4 Create Configuration Watcher** ✅
- [x] Implement `src/config/watcher.ts` using chokidar
- [x] Watch configuration files for changes
- [x] Debounce rapid changes (500ms)
- [x] Emit configuration change events
- [x] Support selective reload (only changed sections)
- [x] Add `--watch-config` flag for development

#### **1.5 Enhance Configuration Validation** ✅
- [x] Extend existing validation in `src/config/schema.ts`
- [x] Add cross-field validation support
- [x] Implement warning-level validations (non-breaking)
- [x] Create validation context with helpful suggestions
- [x] Add async validation for external resources

#### **1.6 Implement Smart Defaults** ✅
- [x] Create `src/config/defaults.ts` with intelligent defaults
- [x] Detect system capabilities and adjust defaults
- [x] Use performance tier to set optimal values
- [x] Provide different defaults per profile
- [x] Document why each default was chosen

**Smart Default Examples:**
```typescript
// Adjust based on system capabilities
if (systemCapabilities.gpuAvailable) {
  defaults.embeddings.backend = 'ollama';
  defaults.processing.batchSize = 64;
} else {
  defaults.embeddings.backend = 'direct';
  defaults.processing.batchSize = 16;
}
```

#### **1.7 Create Configuration Registry** ✅
- [x] Build `src/config/registry.ts` for configuration metadata
- [x] Track all configurable options with descriptions
- [x] Support configuration discovery for CLI/TUI
- [x] Generate configuration documentation
- [x] Enable configuration search and filtering

#### **1.8 Add Development Hot-Reload** ✅
- [x] Integrate configuration watcher with application
- [x] Implement reload strategies per component
- [x] Add reload hooks for services
- [x] Create reload event system
- [x] Show reload notifications in CLI/TUI
- [x] Prevent reload of critical settings

**Hot-Reload Strategy:**
```typescript
// Some configs can reload immediately
onConfigChange('logging.level', (newLevel) => {
  logger.setLevel(newLevel);
});

// Others need service restart
onConfigChange('server.port', async (newPort) => {
  await server.stop();
  await server.start(newPort);
});
```

**Configuration Hierarchy**:
1. **Defaults**: Smart defaults embedded in code
2. **System Config**: `/etc/folder-mcp/config.yaml` (optional)
3. **User Config**: `~/.folder-mcp/config.yaml`
4. **Environment**: `FOLDER_MCP_*` environment variables
5. **Runtime**: Command-line arguments and API parameters

**Testing Strategy for Task 1:**
- Unit tests for each sub-component (manager, loaders, watcher)
- Integration tests for configuration merging
- Performance tests for configuration loading
- Hot-reload tests in development mode

**Completion Criteria:**
- [x] All 8 sub-tasks implemented and tested
- [x] Configuration loads from all 5 sources correctly
- [x] Hot-reload working in development mode
- [x] Profiles system functioning
- [x] No regression in existing configuration functionality
- [x] Documentation updated for new features

**Validation After Completion**:
```powershell
# Run configuration-specific tests
npm run test:config

# Test hot-reload manually
npm run dev -- --watch-config

# Verify all sources work
FOLDER_MCP_PROFILE=development npm run dev

# Full test suite
npm run build && npm test
git add -A && git commit -m "Task 1: Core configuration system architecture completed"
```

### **Task 2: Configuration Schema & YAML Structure**

**[BEFORE STARTING: Break down this task into smaller assignments focusing on HOW to implement, not just WHAT to do. Update this task description when implementation begins.]**

- [ ] Define complete YAML configuration schema
- [ ] Document every configuration option with examples
- [ ] Create configuration migration system for version updates
- [ ] Implement schema validation with helpful error messages
- [ ] Add configuration templates for common use cases
- [ ] Create configuration generation wizard for new users

**Core Configuration Structure**:
```yaml
# ~/.folder-mcp/config.yaml
version: "1.0"

# Folder Configuration
folders:
  defaults:
    watch: false
    embeddings: true
    cache: true
  
  monitored:
    - path: "~/Documents"
      name: "docs"
      watch: true
      embeddings:
        enabled: true
        model: "nomic-embed-text"
        chunkSize: 1000
        overlap: 200

# Transport Configuration  
transports:
  local:
    type: "stdio"
    enabled: true
  
  remote:
    type: "sse"
    enabled: false
    port: 8080
    auth:
      type: "bearer"
      token: "${FOLDER_MCP_API_KEY}"

# MCP Endpoints Configuration
endpoints:
  search:
    modes: ["answer", "locate", "explore"]
    defaultMode: "answer"
    maxResults: 10
  
  explore_topics:
    clustering:
      enabled: true
      minClusterSize: 5
  
  get_context:
    defaultTokenLimit: 4000
    includeMetadata: true

# Embedding Configuration
embeddings:
  backend: "auto"  # ollama, direct, auto
  models:
    ollama:
      url: "http://localhost:11434"
      timeout: 30000
    direct:
      modelPath: "./models"
  
  processing:
    batchSize: 32
    maxConcurrent: 10

# Performance Configuration
performance:
  caching:
    enabled: true
    directory: "~/.cache/folder-mcp"
    maxSize: "10GB"
    ttl: "7d"
  
  memory:
    maxHeap: "4GB"
    adaptiveMode: true
```

**Validation After Completion**:
```powershell
npm run build && npm test
git add -A && git commit -m "Task 2: Configuration schema and YAML structure completed"
```

### **Task 3: Configuration Testing Framework (Foundation)**

**[BEFORE STARTING: This is a partial implementation of Task 10, moved earlier to enable test-driven development]**

- [ ] Create basic configuration unit test structure
- [ ] Implement configuration schema validation tests
- [ ] Add configuration loading and merging tests
- [ ] Create test fixtures for various configuration scenarios
- [ ] Implement configuration error case tests
- [ ] Add performance benchmarks for configuration operations

**Testing Philosophy**:
- Test as we build, not after
- Every configuration feature gets tests immediately
- Use test-driven development where practical
- Maintain high test coverage from the start

**Validation After Completion**:
```powershell
npm run build && npm test:config
git add -A && git commit -m "Task 3: Configuration testing framework foundation completed"
```

### **Task 4: Environment Variable Integration**

**[BEFORE STARTING: Break down this task into smaller assignments focusing on HOW to implement, not just WHAT to do. Update this task description when implementation begins.]**

- [ ] Define environment variable naming convention
- [ ] Implement automatic environment variable mapping
- [ ] Add environment variable validation
- [ ] Create environment variable documentation generator
- [ ] Implement secure credential handling via environment
- [ ] Add environment variable debugging tools
- [ ] Write comprehensive tests for environment integration

**Environment Variable Mapping**:
```bash
# Pattern: FOLDER_MCP_<SECTION>_<KEY>
FOLDER_MCP_FOLDERS_WATCH=true
FOLDER_MCP_EMBEDDINGS_BACKEND=ollama
FOLDER_MCP_TRANSPORTS_REMOTE_PORT=8080
FOLDER_MCP_TRANSPORTS_REMOTE_AUTH_TOKEN=secret
```

**Validation After Completion**:
```powershell
npm run build && npm test
git add -A && git commit -m "Task 4: Environment variable integration completed"
```

### **Task 5: CLI Configuration Interface**

**[BEFORE STARTING: Break down this task into smaller assignments focusing on HOW to implement, not just WHAT to do. Update this task description when implementation begins.]**

- [ ] Implement CLI commands for configuration management
- [ ] Add `folder-mcp config` command with subcommands (show, set, get, validate)
- [ ] Create interactive configuration wizard (`folder-mcp config --wizard`)
- [ ] Add configuration profiles support (`folder-mcp --profile development`)
- [ ] Implement configuration export/import functionality
- [ ] Add configuration diff and merge tools
- [ ] Create configuration debugging commands

**CLI Configuration Commands**:
```bash
# View current configuration
folder-mcp config show [--effective] [--source]

# Set configuration values
folder-mcp config set folders.monitored[0].path ~/Projects

# Get specific configuration
folder-mcp config get embeddings.backend

# Validate configuration
folder-mcp config validate [--fix]

# Configuration wizard
folder-mcp config --wizard

# Profile management
folder-mcp --profile production serve
```

**Validation After Completion**:
```powershell
npm run build && npm test
git add -A && git commit -m "Task 5: CLI configuration interface completed"
```

### **Task 6: TUI Configuration Manager**

**[BEFORE STARTING: Break down this task into smaller assignments focusing on HOW to implement, not just WHAT to do. Update this task description when implementation begins.]**

- [ ] Create TUI configuration editor component
- [ ] Implement tree-view configuration browser
- [ ] Add live configuration validation with visual feedback
- [ ] Create configuration presets/templates UI
- [ ] Implement configuration comparison view
- [ ] Add configuration search and filtering
- [ ] Create visual configuration impact preview

**TUI Configuration Features**:
- **Visual Editor**: Form-based editing with validation
- **Tree Browser**: Navigate configuration hierarchy
- **Live Preview**: See effects of configuration changes
- **Profile Switcher**: Quick profile changes
- **Template Gallery**: Common configuration patterns
- **Validation Panel**: Real-time error detection

**Validation After Completion**:
```powershell
npm run build && npm test
git add -A && git commit -m "Task 6: TUI configuration manager completed"
```

### **Task 7: Configuration-Driven Transport System**

**[BEFORE STARTING: Break down this task into smaller assignments focusing on HOW to implement, not just WHAT to do. Update this task description when implementation begins.]**

- [ ] Implement transport factory based on configuration
- [ ] Create stdio transport with configuration options
- [ ] Implement SSE transport with full configuration
- [ ] Add transport health monitoring and metrics
- [ ] Create transport switching without restart
- [ ] Implement transport-specific configuration validation

**Transport Configuration**:
```yaml
transports:
  # Local transport (stdio) - Zero network overhead
  local:
    type: "stdio"
    enabled: true
    logging:
      level: "error"  # Only errors to stderr
      
  # Remote transport (SSE) - HTTP-based streaming
  remote:
    type: "sse"
    enabled: false
    host: "0.0.0.0"
    port: 8080
    cors:
      enabled: true
      origins: ["*"]
    auth:
      type: "bearer"
      token: "${FOLDER_MCP_API_KEY}"
    keepAlive:
      enabled: true
      interval: 30
    cloudflare:
      tunnel: false
      tunnelId: ""
```

**Validation After Completion**:
```powershell
npm run build && npm test
git add -A && git commit -m "Task 7: Configuration-driven transport system completed"
```

### **Task 8: CLI/TUI Feature Parity Validation**

**[BEFORE STARTING: Break down this task into smaller assignments focusing on HOW to implement, not just WHAT to do. Update this task description when implementation begins.]**

- [ ] Create comprehensive parity checklist
- [ ] Implement automated parity testing
- [ ] Ensure identical configuration capabilities
- [ ] Validate same error messages and help text
- [ ] Test performance equivalence
- [ ] Document any intentional differences
- [ ] Create parity maintenance guidelines

**Parity Checklist**:
- [ ] Configuration viewing (show all, show specific)
- [ ] Configuration editing (set, unset, append)
- [ ] Configuration validation (syntax, semantic)
- [ ] Profile management (create, switch, delete)
- [ ] Template operations (list, apply, export)
- [ ] Environment integration (view, override)
- [ ] Help and documentation (context-aware)

**Validation After Completion**:
```powershell
npm run build && npm test
git add -A && git commit -m "Task 8: CLI/TUI feature parity validation completed"
```

### **Task 9: Configuration Migration System**

**[BEFORE STARTING: Break down this task into smaller assignments focusing on HOW to implement, not just WHAT to do. Update this task description when implementation begins.]**

- [ ] Design configuration version tracking
- [ ] Implement automatic migration on version change
- [ ] Create migration rollback capability
- [ ] Add migration testing framework
- [ ] Implement configuration backup before migration
- [ ] Create migration documentation generator

**Migration Features**:
```yaml
# Configuration version tracking
version: "1.0"
migrated_from: "0.9"
migration_date: "2025-01-15T10:30:00Z"

# Automatic migrations
migrations:
  "0.9-to-1.0":
    - rename: "folders.watch_enabled" -> "folders.watch"
    - default: "embeddings.backend" = "auto"
    - remove: "deprecated.old_setting"
```

**Validation After Completion**:
```powershell
npm run build && npm test
git add -A && git commit -m "Task 9: Configuration migration system completed"
```

### **Task 10: Performance & Memory Configuration**

**[BEFORE STARTING: Break down this task into smaller assignments focusing on HOW to implement, not just WHAT to do. Update this task description when implementation begins.]**

- [ ] Implement memory limit configuration
- [ ] Add adaptive memory management based on config
- [ ] Create cache size and TTL configuration
- [ ] Implement concurrent operation limits
- [ ] Add performance profiling configuration
- [ ] Create resource usage monitoring

**Performance Configuration**:
```yaml
performance:
  memory:
    maxHeap: "4GB"
    adaptiveMode: true
    gcStrategy: "balanced"
    
  processing:
    maxConcurrent: 10
    queueSize: 1000
    timeout: 30000
    
  caching:
    strategy: "lru"
    maxEntries: 10000
    maxSize: "10GB"
    compression: true
```

**Validation After Completion**:
```powershell
npm run build && npm test
git add -A && git commit -m "Task 10: Performance and memory configuration completed"
```

### **Task 11: Complete Configuration Testing Framework**

**[BEFORE STARTING: This completes the testing framework started in Task 3]**

- [ ] Extend configuration integration tests
- [ ] Complete configuration validation test suite
- [ ] Finalize configuration performance benchmarks
- [ ] Implement configuration security tests
- [ ] Add configuration regression tests
- [ ] Create end-to-end configuration scenarios

**Testing Coverage Extension**:
- **Integration Tests**: Full configuration loading, hot-reload, migration
- **E2E Tests**: Complete user workflows with configuration
- **Performance Tests**: Configuration at scale, memory usage patterns
- **Security Tests**: Credential handling, path traversal prevention
- **Regression Tests**: Ensure backward compatibility

**Validation After Completion**:
```powershell
npm run build && npm test
git add -A && git commit -m "Task 11: Complete configuration testing framework completed"
```

---

## 📊 **Progress Tracking**

### **Current Status**
- [x] Pre-Implementation: Review existing configuration - ✅ Completed
- [x] Safety framework set up (backup branch created) - ✅ Completed
- [x] Task 1: Core Configuration System Architecture - ✅ Completed
- [ ] Task 2: Configuration Schema & YAML Structure - Not Started
- [ ] Task 3: Configuration Testing Framework (Foundation) - Not Started
- [ ] Task 4: Environment Variable Integration - Not Started
- [ ] Task 5: CLI Configuration Interface - Not Started
- [ ] Task 6: TUI Configuration Manager - Not Started
- [ ] Task 7: Configuration-Driven Transport System - Not Started
- [ ] Task 8: CLI/TUI Feature Parity Validation - Not Started
- [ ] Task 9: Configuration Migration System - Not Started
- [ ] Task 10: Performance & Memory Configuration - Not Started
- [ ] Task 11: Complete Configuration Testing Framework - Not Started

### **Completion Log**
| Task | Status | Completion Date | Commit Hash |
|------|--------|----------------|-------------|
| Pre-Implementation Review | ✅ Complete | 2025-01-04 | - |
| Safety Setup | ✅ Complete | 2025-01-04 | 197d76c |
| Core Config System | ✅ Complete | 2025-01-05 | - |
| Config Schema | ⏳ Pending | - | - |
| Testing Framework (Foundation) | ⏳ Pending | - | - |
| Environment Vars | ⏳ Pending | - | - |
| CLI Config | ⏳ Pending | - | - |
| TUI Config | ⏳ Pending | - | - |
| Transport Config | ⏳ Pending | - | - |
| Parity Validation | ⏳ Pending | - | - |
| Migration System | ⏳ Pending | - | - |
| Performance Config | ⏳ Pending | - | - |
| Complete Testing Framework | ⏳ Pending | - | - |

### **Success Criteria**
- ✅ Configuration system drives all functionality
- ✅ Users can manage entire system via configuration
- ✅ CLI and TUI provide identical capabilities
- ✅ Smart defaults with deep customization
- ✅ Transport strategy locked in: stdio + SSE only
- ✅ Foundation ready for feature development

### **Phase 6 Completion Checklist**
- [ ] Pre-implementation review completed
- [ ] All 11 tasks completed with validation
- [ ] Configuration covers 100% of features
- [ ] CLI/TUI parity tests passing
- [ ] Performance benchmarks within targets
- [ ] Documentation complete and helpful
- [ ] Migration system tested with examples
- [ ] No regression in existing functionality
- [ ] Test coverage maintained throughout development

### **Quick Health Check**
```powershell
# Run this anytime to verify system health
npm run build && npm test && git status

# Specific configuration validation
npm run test:config
npm run test:parity
```

---

## 🚀 **Next Phase Preview**

After Phase 6 completion, Phase 7 will focus on:
- **Transport Implementation**: SSE remote access with Cloudflare tunnel support
- **LLM Endpoint Optimization**: Implementing the 13 enhanced endpoints
- **Embedding Backend System**: Modular backends (Ollama/direct/auto)
- **Configuration-Driven Features**: All new features built on config foundation

---

**IMPLEMENTATION NOTE**: This plan follows the Simple Task Implementation Methodology. Each task should be completed in order, with validation after each step. The configuration system is the foundation for all future features, so quality and completeness are critical. Tasks will be broken down into specific implementation steps as work begins, following the "HOW to implement" principle.