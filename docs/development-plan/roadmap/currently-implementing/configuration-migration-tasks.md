# Configuration Migration - Affected Tasks

## Overview

This document identifies all tasks in Phases 8-11 that need updates due to the Phase 7 configuration system overhaul. Each task must migrate from the old 6-source hierarchical system to the new 2-file schema-driven system.

## Phase 8: Enhanced UX & Core Features

### Task 1: Progress & Status System
**Current References**: "configuration-driven feedback", "log levels from configuration"
**Migration Required**:
- Define schema for progress and logging settings
- Add to `configurable-parameters.md`:
  ```yaml
  progress:
    enabled: boolean
    updateInterval: number (100-5000)
    verbosity: select (quiet|normal|verbose)
    showETA: boolean
  
  logging:
    level: select (error|warn|info|debug)
    destinations: multiselect (stderr|file)
    file: path (optional)
  ```

### Task 2: Intelligent Embedding & Search System
**Current References**: "configuration drives all behavior"
**Migration Required**:
- Define schema for embedding backends and settings
- Move from environment variables to config.yaml
- External data source for available models
- Add to schema:
  ```yaml
  embedding:
    backend: select (ollama|direct|auto)
    model: select (from data/embedding-models.json)
    batchSize: number (1-256)
    chunkSize: number (100-5000)
    overlap: number (0-1000)
  ```

### Task 3: Version Control & Update System
**Current References**: "configuration-aware updates"
**Migration Required**:
- Define update preferences schema
- Remove complex update channels
- Simplify to:
  ```yaml
  updates:
    checkForUpdates: boolean
    channel: select (stable|beta|dev)
    notifyOnUpdate: boolean
    autoDownload: boolean
  ```

### Task 4: Auto-Config Placement & Client Support
**Current References**: "configuration-driven client setup"
**Migration Required**:
- Define client configuration schema
- Support multiple clients via array
- Schema pattern:
  ```yaml
  clients:
    autoConfig: boolean
    clients: array of
      - name: string
        enabled: boolean
        path: path
  ```

## Phase 9: Remote Access & Production Features

### Task 1: Simple SSE Remote Access
**Migration Required**:
- Remove references to complex transport configuration
- Simple schema:
  ```yaml
  daemon:
    port: number (1024-65535)
    bindAddress: string (default: "127.0.0.1")
  ```

### Task 2: Simple Security Configuration
**Migration Required**:
- Define security schema
- Remove complex auth systems
- Schema:
  ```yaml
  security:
    apiKeyRequired: boolean
    rateLimit:
      enabled: boolean
      requestsPerMinute: number
    cors:
      enabled: boolean
      origins: array
  ```

### Task 3: VSCode 1.101 MCP Integration
**Migration Required**:
- VSCode-specific settings in user config
- Feature flags via schema:
  ```yaml
  features:
    vscodeMcp: boolean
    developmentMode: boolean
    hotReload: boolean
  ```

### Task 4: Production Readiness Configuration
**Migration Required**:
- Production settings via schema
- Remove platform-specific config files
- Schema:
  ```yaml
  daemon:
    autoStart: boolean
    restartOnFailure: boolean
    maxRestarts: number
  ```

## Phase 10: Advanced Features & Polish

### All Tasks (1-5)
**Common Migration Pattern**:
1. Define configuration schema for the feature
2. Add to `configurable-parameters.md`
3. Remove environment variable references
4. Use `config.yaml` for all settings
5. Generate UI from schema

### Specific Examples:

**Task 1: Advanced Search**
```yaml
search:
  algorithm: select (bm25|semantic|hybrid)
  maxResults: number (10-1000)
  includeMetadata: boolean
```

**Task 2: File Format Support**
```yaml
formats:
  pdf: 
    enabled: boolean
    parser: select (pdfjs|mupdf)
  docx:
    enabled: boolean
    extractComments: boolean
```

**Task 3: Code Intelligence**
```yaml
codeIntelligence:
  enabled: boolean
  languages: multiselect (from data/languages.json)
  astParsing: boolean
```

## Phase 11: Release & Documentation

### Task 1-3: Documentation Updates
**Migration Required**:
- Update all documentation to reference new system
- Remove mentions of:
  - 6-source hierarchy
  - System config at `/etc/folder-mcp/`
  - Configuration profiles
  - Complex environment variable expansion
- Add documentation for:
  - Schema-driven configuration
  - Two-file system
  - External data sources

## Key Migration Principles

1. **Flat Structure**: All configs in flat YAML, no deep nesting
2. **Schema First**: Define schema before implementing feature
3. **External Data**: Dynamic lists from JSON files, not hardcoded
4. **Simple Overrides**: Just defaults → user config
5. **UI Generation**: TUI automatically shows all schema items

## Implementation Order

1. Phase 7 completes the infrastructure
2. Phase 8 tasks add their configs to schema incrementally
3. Phase 9 uses established patterns
4. Phase 10 extends with advanced configs
5. Phase 11 documents the final system

## Testing Strategy

Each migrated task must:
1. Remove old configuration tests
2. Add schema validation tests
3. Test override behavior (defaults → user)
4. Verify UI generation from schema
5. Test CLI commands work with new config