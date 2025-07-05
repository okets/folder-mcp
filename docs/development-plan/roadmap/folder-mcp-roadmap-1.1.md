# folder-mcp Implementation Plan

## Phase 0: Current State & Required Changes Overview

### **What We Have Now (Foundation)**
✅ **Comprehensive MCP Server**: Advanced v2.0 endpoint system (redesigned December 2024)  
✅ **9 Production MCP Endpoints**: Complete document intelligence API  
✅ **Claude Desktop Integration**: Fully working with 277 tests passing  
✅ **Simple Transport Architecture**: MCP via stdio (local)  
✅ **Real Integration Testing**: Comprehensive test suite with actual business documents  
✅ **File Processing Pipeline**: PDF, DOCX, XLSX, PPTX, TXT, MD with embeddings  
✅ **FAISS Vector Search**: Semantic search with Ollama GPU acceleration  
✅ **Document Chunking**: Smart chunking with overlap for context preservation  
✅ **Rich Metadata System**: Location info, content snippets, structured responses  
✅ **Advanced TUI Framework**: Ink-based components (BorderedBox, NavigationBar, etc.)  

### **Current MCP Endpoints (Core Product)**
✅ **`search`** - Semantic & regex search with rich metadata and location info  
✅ **`get_document_outline`** - Extract document structure (chapters, sections, slides)  
✅ **`get_document_data`** - Flexible content retrieval with metadata  
✅ **`list_folders` / `list_documents`** - Directory navigation with filtering  
✅ **`get_sheet_data`** - Excel/CSV data extraction with sheet selection  
✅ **`get_slides`** - PowerPoint content extraction with slide numbers  
✅ **`get_pages`** - PDF page-level access with precise targeting  
✅ **`get_embedding`** - Vector embedding access for advanced integrations  
✅ **`get_status`** - System health monitoring and capabilities reporting  
❌ **LLM-Optimized Documentation** - Each endpoint needs usage documentation and better error messages

### **Final MCP Endpoints (After LLM Optimization) - 13 Total**
1. **`search`** - Enhanced with answer/locate/explore modes for LLM Q&A
2. **`explore_topics`** - NEW: Topic discovery and clustering for codebase understanding  
3. **`get_context`** - NEW: Intelligent context assembly within token limits
4. **`find_code_examples`** - NEW: Practical code usage discovery
5. **`get_related`** - NEW: Document relationship navigation
6. **`get_document_outline`** - Structure navigation with summaries
7. **`get_document_data`** - Enhanced with section/page/slide parameters (absorbs get_pages/get_slides)
8. **`list_folders`** - Folder browsing with metadata
9. **`list_documents`** - Enhanced with document type detection
10. **`get_sheet_data`** - Structured Excel/CSV data as JSON
11. **`get_status`** - System health and capabilities
12. **`help`** - NEW: LLM-optimized endpoint documentation
13. **~~get_embedding~~** - REMOVED: No LLM use case
14. **~~get_pages~~** - MERGED into get_document_data
15. **~~get_slides~~** - MERGED into get_document_data  

### **What We Need to Build**
❌ **Configuration System**: Comprehensive configuration architecture driving all features  
❌ **Intelligent Embedding System**: Flexible backends with hardware optimization  
❌ **Enhanced Search**: Add answer/locate/explore modes to search endpoint for LLM Q&A  
❌ **Topic Discovery**: New `explore_topics` endpoint with semantic clustering  
❌ **Context Assembly**: New `get_context` endpoint for intelligent content aggregation  
❌ **Code Examples**: New `find_code_examples` endpoint for practical usage discovery  
❌ **Relationship Mapping**: New `get_related` endpoint for document navigation  
❌ **Help System**: New `help` endpoint with LLM-optimized documentation  
❌ **Enhanced Document Data**: Add `section` parameter to `get_document_data`, merge in pages/slides functionality  
❌ **Endpoint Consolidation**: Remove `get_embedding`, merge `get_pages`/`get_slides` into `get_document_data`  
❌ **LLM-Optimized Documentation**: Usage documentation and error messages for all endpoints  
❌ **Daemon Process**: Configuration-aware background service managing single multi-folder MCP server  
❌ **Multi-Folder MCP Server**: Extend current server to handle multiple folders via configuration  
❌ **Admin TUI**: Configuration-driven management interface  
❌ **CLI/TUI Parity**: Identical functionality with configuration at the core  
❌ **Auto-Start**: Configurable daemon startup behavior  
❌ **SSE Remote Access**: Express server with /mcp/sse endpoint for remote connections  
❌ **Cloudflare Tunnel**: Simple remote access without port forwarding  

### **Architecture Transformation**
```bash
# FROM: Manual single-folder with fixed backend
node dist/mcp-server.js ~/Documents
# → 9 MCP endpoints serve one folder with Ollama-only embeddings

# TO: Configuration-driven multi-folder with intelligent backends
folder-mcp                    # Reads ~/.folder-mcp/config.yaml
Daemon → Single MCP Server → Multiple folders (from config)
                           ├── ~/Documents/.folder-mcp/
                           ├── ~/Projects/.folder-mcp/  
                           └── ~/Photos/.folder-mcp/
# → 13 MCP endpoints serve configured folders (enhanced + new)
# → Intelligent backend selection (Ollama, direct, auto)
# → Pre-computed clustering for topic discovery
# → Simple transports: stdio (local) or SSE (remote)
```

### **Current Strengths to Build Upon**
✅ **Working MCP Endpoints**: 9 endpoints handle documents and code effectively (will enhance and expand to 13)  
✅ **Embedding Pipeline**: Ollama integration with GPU acceleration  
✅ **Document Chunking**: Smart chunking with overlap for context  
✅ **Rich Metadata System**: Location info, content snippets, structured responses  
✅ **Token Management**: Proper pagination and response sizing for LLMs  
✅ **Error Handling**: Robust error recovery and validation  
✅ **Performance**: Optimized for large documents and complex queries  
✅ **Real-World Tested**: 36+ business documents in test suite validate functionality

## Configuration Architecture

**Core Philosophy**: Configuration drives flexibility throughout the system. Every aspect of folder-mcp is configurable, with smart defaults that work out-of-the-box while enabling deep customization for power users.

### Configuration Hierarchy

1. **Defaults**: Smart defaults embedded in code that work for 90% of users
2. **System Config**: `/etc/folder-mcp/config.yaml` for system-wide settings (optional)
3. **User Config**: `~/.folder-mcp/config.yaml` for user preferences  
4. **Environment**: Override any setting via `FOLDER_MCP_*` environment variables
5. **Runtime**: CLI flags and TUI settings override everything

### Configuration Principles

- **Progressive Disclosure**: Simple users see simple options, advanced users can access everything
- **Strategy Pattern**: All major components pluggable via configuration
- **Feature Flags**: Enable/disable features without code changes
- **Performance Tuning**: Every performance parameter exposed in config
- **Zero Config**: Works perfectly with no configuration file
- **Config Validation**: Comprehensive validation with helpful error messages
- **Live Reload**: Changes apply without restart where possible
- **Smart Defaults**: Sensible defaults that maximize functionality
- **Simple Transport**: Following Crawl4AI, only stdio and SSE transports supported

### Core Configuration Structure

```yaml
# ~/.folder-mcp/config.yaml
version: 1.0

# General settings
general:
  autoStart: true
  logLevel: "info"  # debug, info, warn, error
  telemetry: false

# Daemon configuration
daemon:
  port: 50051
  pidFile: "~/.folder-mcp/daemon.pid"
  healthCheckInterval: 30
  autoRestart: true
  maxRestarts: 3

# Embedding configuration
embeddings:
  backend: "auto"  # Automatically selects best available option
  batchSize: "auto"
  maxMemoryUsage: "80%"
  preloadModel: true
  
  backends:
    ollama:
      enabled: true
      apiUrl: "http://127.0.0.1:11434"
      models: ["nomic-embed-text", "mxbai-embed-large"]
      timeout: 30
      
    direct:
      enabled: true
      defaultModel: "sentence-transformers/all-MiniLM-L6-v2"
      cachePath: "~/.cache/folder-mcp/models"
      device: "auto"  # auto, cuda, cpu
      dtype: "auto"   # auto, float16, float32

# Search configuration with clustering enabled
search:
  # Core search settings
  minScore: 0.7
  maxResults: 50
  enableRegex: true
  
  # Clustering for topic discovery
  clustering:
    enabled: true  # Pre-compute clusters for better search
    strategy: "pre-computed"
    updateExisting: true
    
    algorithms:
      semantic:
        method: "hierarchical"
        linkage: "ward"
        threshold: 0.5
      folder:
        method: "path-based"
        depth: 3

# Simple transport endpoints
transport:
  local: "stdio"  # Direct process communication
  remote: "sse"   # Server-Sent Events only
  
  # Deliberately NO WebSockets - SSE is optimal for LLM consumption
  # No gRPC - adds complexity without benefit
  # No custom protocols - HTTP/SSE works everywhere
  
  server:
    port: 3000
    endpoints:
      health: "/health"
      info: "/"
      mcp: "/mcp/sse"

# Authentication (simple API keys)
authentication:
  type: "api-key"
  prefix: "fmcp_"
  storage: "~/.folder-mcp/api-keys.json"

# Folder configuration
folders:
  defaults:
    watch: true
    recursive: true
    excludePatterns: ["node_modules", ".git", "*.tmp"]
    includeHidden: false
    maxFileSize: "100MB"
    # Chunking settings (existing behavior)
    chunkSize: 1000
    chunkOverlap: 200
    
  # Per-folder overrides
  overrides:
    "~/Documents":
      backend: "ollama"  # Can override backend per folder
      model: "mxbai-embed-large"
      languages: ["en", "es"]
    "~/Code":
      backend: "direct"  # Use faster backend for code
      model: "codebert-base"
      excludePatterns: ["node_modules", ".git", "dist", "build"]

# Performance configuration
performance:
  indexing:
    maxConcurrency: "auto"  # auto or number
    chunkSize: 1000  # Preserve existing chunking
    overlapSize: 200
    
  memory:
    maxUsage: "80%"
    gcInterval: 300
    cacheSize: "1GB"
    
  monitoring:
    enabled: true
    metricsPort: 9090
    exportFormat: "prometheus"

# UI configuration
ui:
  theme: "auto"  # auto, dark, light
  animations: true
  updateInterval: 100
  
  tui:
    boxStyle: "rounded"  # rounded, sharp, double
    colorScheme: "default"  # default, high-contrast, minimal
    
  cli:
    output: "pretty"  # pretty, json, quiet
    colors: true
    progressBar: true

# Feature flags
features:
  experimentalCodeIntelligence: true
  advancedClustering: true
  topicDiscovery: true  # explore_topics endpoint
  contextAssembly: true  # get_context endpoint
  codeExamples: true  # find_code_examples endpoint
  relationshipMapping: true  # get_related endpoint
  enhancedSearch: true  # answer/locate/explore modes
  remoteAccess: true
  chatInterface: false  # Still experimental
  imageOCR: false  # Pending research
```

### Configuration Usage Examples

```bash
# Override via environment variables
FOLDER_MCP_EMBEDDINGS_BACKEND=direct folder-mcp add ~/Documents

# Override via CLI flags
folder-mcp --config ~/.folder-mcp/prod.yaml add ~/Documents
folder-mcp --embeddings-backend ollama --log-level debug

# Query current configuration
folder-mcp config get embeddings.backend
folder-mcp config set search.clustering.enabled true
folder-mcp config validate

# Enable new features
folder-mcp config set features.topicDiscovery true

# Remote access setup
folder-mcp auth create "My Claude Desktop"  # Creates API key
folder-mcp tunnel setup                      # Interactive Cloudflare setup
```

## Component Definitions & Terminology

This section establishes the common terminology used throughout this document, with emphasis on configuration-driven components.

### Core Components

**Configuration Manager**  
The central component that loads, validates, merges, and provides configuration to all other components. It handles the configuration hierarchy, environment variable expansion, live reloading, and validation. The Configuration Manager is the first component initialized and drives the behavior of all other components.

**Daemon**  
A configuration-aware background process that runs continuously and manages the lifecycle of a single multi-folder MCP server. The daemon's behavior is entirely driven by configuration, including auto-start behavior, health check intervals, and restart policies.

**MCP Server**  
A single process that serves multiple folders via the Model Context Protocol. The MCP server's capabilities, performance characteristics, and behavior are determined by configuration. It dynamically loads folder-specific configurations and adjusts its behavior accordingly. The server provides 13 endpoints for comprehensive document intelligence, including enhanced search with answer modes, topic discovery, context assembly, and relationship navigation.

**Express Server**  
A lightweight HTTP server built with Express.js (a minimal web framework for Node.js) that provides remote access to the MCP server via Server-Sent Events (SSE). Following Crawl4AI's proven pattern, it exposes three endpoints: `/health` for monitoring, `/` for basic info, and `/mcp/sse` for the MCP protocol. Uses simple Bearer token authentication. Express is chosen for its simplicity, widespread adoption, and excellent SSE support.

**Embedding System**  
The modular system responsible for generating vector embeddings from text. It supports multiple backends (Ollama, direct sentence-transformers, auto-selection) chosen via configuration. The system adapts to available hardware and memory constraints for optimal performance.

**Search System**  
A FAISS-based vector search system with pre-computed clustering for topic discovery. The search system provides both specific search capabilities and topic exploration through two distinct endpoints, with behavior driven by configuration.

**Transport System**  
Simple, proven transport mechanisms optimized for LLM consumption: stdio for local connections and Server-Sent Events (SSE) for remote access. Following Crawl4AI's pattern, the system deliberately avoids WebSockets and other complex abstractions in favor of battle-tested simplicity. Remote access uses Express.js with specific endpoints (/health, /mcp/sse) and Bearer token authentication. The transport choice is based on extensive analysis of how LLMs actually consume MCP services - prioritizing reliability, simplicity, and streaming capabilities over bidirectional communication that LLMs don't need.

**CLI (Command Line Interface)**  
The command-line tool that users invoke via `folder-mcp`. The CLI respects all configuration sources and provides flags to override any configuration option. It includes commands to inspect and modify configuration.

**TUI (Terminal User Interface)**  
The interactive, full-screen terminal interface built with existing Ink framework. The TUI's appearance, behavior, and capabilities are configuration-driven, including theme, animation settings, and update intervals.

**Admin Screen (Management Console)**  
The main TUI screen that displays all shared folders in a table format with their status, model, and port information. The layout and information displayed are configurable.

**Configuration Wizard**  
The initial TUI flow that guides users through creating their first configuration file. It uses progressive disclosure to show only relevant options based on user choices.

### Operational Terms

**Configuration Profile**  
A named set of configuration values that can be activated for different scenarios (development, production, resource-constrained, etc.).

**Configuration Override**  
A configuration value specified at runtime that takes precedence over file-based configuration.

**Feature Flag**  
A configuration setting that enables or disables specific functionality without code changes. Features can be toggled based on readiness, user preference, or system capabilities.

**Strategy Selection**  
Configuration-driven selection of implementation strategies (e.g., embedding backend, clustering algorithm, transport protocol).

**Embedding Backend**  
The implementation used to generate embeddings. Options include "ollama" (existing), "direct" (new sentence-transformers), or "auto" (automatic selection).

**Cluster ID**  
Pre-computed identifiers assigned during indexing that group similar content. Two types: semantic (by meaning) and folder (by location). These enable fast topic discovery without runtime clustering overhead.

## Project Goal

Create a configuration-driven daemon-based system that manages multiple MCP servers for shared folders, with TUI/CLI interfaces, intelligent model selection, and 13 LLM-optimized endpoints including enhanced search with answer modes, topic discovery, context assembly, code examples, relationship navigation, and comprehensive help - all designed for optimal LLM consumption patterns.

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   User Interfaces                        │
├───────────────────────────┬─────────────────────────────┤
│           CLI             │            TUI              │
│      (headless)           │       (interactive)         │
│                           │                             │
│   folder-mcp add ~/docs   │    ┌─┐ Management Console  │
│   folder-mcp config set   │    │ │ - Add/remove folders │
│   folder-mcp status       │    │ │ - View status        │
│   folder-mcp tunnel       │    │ │ - Configure settings │
│                           │    └─┘ - Real-time updates  │
└───────────────────────────┴─────────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │ Configuration  │
                    │    Manager     │
                    └───────┬────────┘
                            │
                       ┌────▼────┐
                       │ Daemon  │ ← Driven by Config
                       │ Process │    (~/.folder-mcp/)
                       └────┬────┘
                            │ Manages
                            ▼
                    ┌───────────────┐
                    │   MCP Server  │ ← Multi-folder
                    └───────┬───────┘    stdio (local)
                            │            
                            ├─────────────────┐
                            │                 │
                       Local │            Remote │
                      (stdio)│              (SSE)│
                            │                 │
                            ▼                 ▼
                    ┌───────────────┐ ┌───────────────┐
                    │ Claude Desktop│ │ Express Server│
                    │   VS Code     │ │  :3000/mcp/sse│
                    │   Cursor      │ │   → Cloudflare│
                    └───────────────┘ └───────────────┘
                            │
                ┌───────────┴────────────┐
                │    13 MCP Endpoints    │
                │  ┌─────────────────┐   │
                │  │ - search        │   │
                │  │ - explore_topics│   │
                │  │ - get_context   │   │
                │  │ - find_code_ex. │   │
                │  │ - get_related   │   │
                │  │ - get_doc_*     │   │
                │  │ - list_*        │   │
                │  │ - get_sheet_*   │   │
                │  │ - get_status    │   │
                │  │ - help          │   │
                │  └─────────────────┘   │
                └───────────┬────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
    [~/Documents]       [~/Projects]        [~/Photos]
    .folder-mcp/        .folder-mcp/        .folder-mcp/
    ├── vectors/        ├── vectors/        ├── vectors/
    ├── embeddings/     ├── embeddings/     ├── embeddings/
    └── metadata/       └── metadata/       └── metadata/
```

### Component Responsibilities

**Configuration Manager**
- Load and merge configuration from all sources
- Validate configuration against schema
- Provide configuration to all components
- Handle live configuration updates
- Manage configuration profiles

**Daemon Process**
- Configuration-driven lifecycle management
- Auto-start based on configuration  
- Health monitoring with configurable intervals
- Process recovery with configurable policies
- Performance monitoring per configuration

**CLI Interface**
- Parse command arguments and configuration overrides
- Display configuration-aware help
- Provide configuration management commands
- Support all operations with config overrides

**TUI Interface**
- Render UI based on configuration (theme, style)
- Provide configuration editing interface
- Display configuration-driven status information
- Enable real-time configuration updates

**MCP Server**
- Serve all 13 endpoints (search, explore_topics, get_context, find_code_examples, get_related, get_document_*, list_*, get_sheet_data, get_status, help)
- Enhanced search with answer/locate/explore modes
- Support multiple embedding backends
- Apply folder-specific configurations
- Honor performance settings
- Communicate via stdio (local) or SSE (remote)

**Express Server** (for remote access)
- Serve MCP protocol over SSE at `/mcp/sse`
- Provide health check at `/health`
- Handle API key authentication
- Support CORS for web clients
- Integrate with Cloudflare tunnel

**Embedding System**
- Provide modular backends (Ollama, direct sentence-transformers, auto)
- Automatic hardware detection and optimization
- Memory-adaptive batch processing
- Configuration-driven backend selection

**Search System**
- FAISS-based vector search with pre-computed clustering
- Two search endpoints: specific (search) and discovery (explore_topics)
- Smart result ranking and filtering
- Configuration-driven behavior

## UX-Led Development Philosophy

**Core Principle**: Every feature is designed from the user experience first, then implemented to support that experience, with configuration enabling different user preferences.

### **Development Approach**
1. **Configuration First**: Design configuration schema before implementation
2. **Best Defaults**: Choose defaults that enable maximum functionality
3. **CLI/TUI Parity**: Both interfaces expose same configuration options
4. **Progressive Disclosure**: Simple config for simple needs, advanced for power users
5. **User Story Driven**: Each feature starts with user configuration needs
6. **Adaptive Planning**: Configuration schema evolves with learnings

### **Configuration-Driven UX**
- **Profiles**: Pre-configured profiles for common use cases
- **Wizards**: Interactive configuration for complex settings
- **Validation**: Helpful error messages for configuration issues
- **Defaults**: Smart defaults that work without configuration
- **Migration**: Automatic configuration migration between versions

## Phase 6: Configuration Foundation & CLI/TUI Parity

**Goal**: Establish configuration system as the foundation for all features, then achieve identical functionality between CLI and TUI interfaces

### **User Stories**
- **As a user, I want sensible defaults**: System works without any configuration
- **As a user, I want to customize behavior**: Easy configuration for common needs
- **As a power user, I want full control**: Every aspect configurable
- **As a user, I want to add a folder to be shared**: `folder-mcp add ~/Documents`
- **As a user, I want to see all shared folders**: `folder-mcp list`
- **As a user, I want to check configuration**: `folder-mcp config get`

### Task 1: Configuration System Foundation

**Goal**: Create comprehensive configuration system that drives all functionality

**Scope**:
- Configuration schema definition (YAML with JSON Schema validation)
- Configuration loader with hierarchy support
- Environment variable expansion
- Configuration validation with helpful errors
- Default configuration generation
- Configuration profiles support

**Implementation Details**:
```typescript
// Core configuration manager
class ConfigurationManager {
  // Load from all sources in priority order
  async load(): Promise<Config> {
    const defaults = this.getDefaults();
    const system = await this.loadSystemConfig();
    const user = await this.loadUserConfig();
    const env = this.loadEnvOverrides();
    const runtime = this.loadRuntimeOverrides();
    
    return this.merge(defaults, system, user, env, runtime);
  }
  
  // Validate against schema
  validate(config: Config): ValidationResult {
    return ajv.validate(configSchema, config);
  }
  
  // Support dot notation access
  get(path: string): any {
    // "embeddings.backend" → config.embeddings.backend
  }
  
  // Live configuration updates
  set(path: string, value: any): void {
    // Update and notify watchers
  }
}
```

**Completion Criteria**:
- [ ] Configuration schema defined and documented
- [ ] Loader handles all configuration sources
- [ ] Validation provides helpful error messages
- [ ] Configuration profiles working
- [ ] Hot reload for applicable settings
- [ ] Configuration CLI commands working

**Testing**:
- **Automated**: Configuration loading, merging, validation
- **Manual E2E**: User creates custom config, system respects it

### Task 2: Basic Daemon Architecture

**Goal**: Create configuration-driven daemon that manages single multi-folder MCP server

**Scope**:
- Daemon reads configuration on startup
- Configuration drives all daemon behavior
- Support configuration reload via signals
- Health checks and restart policies from config
- Performance monitoring per configuration

**Configuration Integration**:
```typescript
class Daemon {
  constructor(private config: ConfigurationManager) {}
  
  async start() {
    const daemonConfig = this.config.get('daemon');
    
    // Start with configured settings
    this.healthCheckInterval = daemonConfig.healthCheckInterval;
    this.autoRestart = daemonConfig.autoRestart;
    this.maxRestarts = daemonConfig.maxRestarts;
    
    // Watch for configuration changes
    this.config.watch('daemon', this.handleConfigChange);
  }
}
```

**Completion Criteria**:
- [ ] Daemon respects all configuration settings
- [ ] Configuration reload without restart
- [ ] Health monitoring uses configured intervals
- [ ] Auto-restart follows configuration
- [ ] Performance metrics per configuration

**Testing**:
- **Automated**: Configuration-driven behavior, hot reload
- **Manual E2E**: Change config, observe daemon behavior change

### Task 3: Extend MCP Server for Multiple Folders

**Goal**: Modify existing MCP server to handle multiple folders with per-folder configuration

**Scope**:
- Read folder list from configuration
- Apply folder-specific settings (model, excludes, etc.)
- Support folder configuration overrides
- Dynamic folder addition/removal
- Performance settings per folder
- Preserve existing endpoint functionality

**Configuration Usage**:
```yaml
folders:
  defaults:
    backend: "auto"  # Smart backend selection
    model: "nomic-embed-text"
    watch: true
    chunkSize: 1000
    chunkOverlap: 200
    
  overrides:
    "~/Documents":
      model: "mxbai-embed-large"  # Better model for important docs
    "~/Code":
      backend: "direct"  # Faster backend for code
      excludePatterns: ["node_modules", "dist"]
      model: "codebert-base"  # Code-specific model
```

**Completion Criteria**:
- [ ] MCP server reads folder configuration
- [ ] Per-folder settings applied correctly
- [ ] Configuration changes trigger re-indexing
- [ ] Folder-specific models working
- [ ] Performance tuning per folder

**Testing**:
- **Automated**: Multi-folder configuration, per-folder settings
- **Manual E2E**: Different folders use different models

### Task 4: Configuration-Aware CLI Commands

**Goal**: Implement CLI commands that respect and expose configuration

**Scope**:
- `folder-mcp config get/set/list` - Configuration management
- `folder-mcp add --backend <backend>` - Override configuration
- `folder-mcp profile <name>` - Switch configuration profiles
- All commands accept config overrides
- Help shows configuration options

**Implementation**:
```bash
# Configuration management
folder-mcp config get embeddings.backend
folder-mcp config set search.clustering.enabled true
folder-mcp config validate

# Profile management
folder-mcp profile use production
folder-mcp profile list

# API key management (for remote access)
folder-mcp auth create "Claude Desktop"
folder-mcp auth list
folder-mcp auth revoke fmcp_abc123...

# Override configuration
folder-mcp add ~/Documents --embeddings-backend direct
folder-mcp daemon start --log-level debug

# Remote access setup
folder-mcp tunnel setup  # Interactive Cloudflare tunnel setup
folder-mcp tunnel status
```

**Completion Criteria**:
- [ ] Configuration commands working
- [ ] All commands accept config overrides
- [ ] Profile switching works
- [ ] Help includes configuration options
- [ ] JSON output for automation

**Testing**:
- **Automated**: All CLI configuration operations
- **Manual E2E**: User manages configuration via CLI

### Task 5: Configuration-Driven TUI

**Goal**: Create TUI interface that exposes configuration management

**Scope**:
- Configuration editor in TUI
- Visual configuration validation
- Profile management UI
- Live configuration preview
- Theme and style from configuration

**TUI Features**:
- Settings panel with configuration tree
- Real-time validation feedback
- Configuration diff viewer
- Profile selector
- Theme follows configuration

**Completion Criteria**:
- [ ] TUI renders based on configuration
- [ ] Configuration editor working
- [ ] Live validation and feedback
- [ ] Profile management in TUI
- [ ] Theme/style from configuration

**Testing**:
- **Automated**: TUI configuration operations
- **Manual E2E**: User edits configuration via TUI

### Task 6: CLI/TUI Parity Validation

**Goal**: Ensure both interfaces provide identical configuration capabilities

**Scope**:
- Every configuration option available in both
- Same validation and error messages
- Consistent configuration effects
- Performance parity

**Completion Criteria**:
- [ ] Configuration parity checklist complete
- [ ] Same operations available in both
- [ ] Identical configuration effects
- [ ] Consistent user experience
- [ ] Documentation covers both

**Testing**:
- **Automated**: Parity test suite for configuration operations
- **Manual E2E**: Same configuration tasks in CLI and TUI

**Phase 6 Success Criteria**:
- Configuration system drives all functionality
- Users can manage entire system via configuration
- CLI and TUI provide identical capabilities
- Smart defaults with deep customization
- Transport strategy locked in: stdio + SSE only
- Foundation ready for feature development

**Phase 6 Completion Review**:
After completing all Phase 6 tasks, conduct mandatory review:
- **Configuration Completeness**: Does configuration cover all aspects?
- **User Experience**: Is configuration approachable for new users?
- **Power User Features**: Do advanced users have enough control?
- **Performance Impact**: Does configuration system add overhead?
- **Document Updates**: Update future phases based on configuration architecture

## Phase 7: Enhanced UX & Core Features

**Goal**: Build upon configuration foundation to add advanced features

### **User Stories**
- **As a user, I want powerful search capabilities**: Answer mode for Q&A, locate for specific items, explore for discovery
- **As a user, I want to explore my documents**: Topic discovery and clustering
- **As a user, I want context within limits**: Intelligent content assembly respecting token limits
- **As a user, I want to find examples**: Code examples and practical usage patterns
- **As a user, I want to navigate relationships**: Find related documents, tests, implementations
- **As a user, I want flexibility in embedding generation**: Choice of backends
- **As a user, I want to see indexing progress**: Real-time progress bars
- **As a user, I want to monitor system health**: Configurable monitoring
- **As an LLM, I want clear endpoint documentation**: Know exactly when and how to use each endpoint
- **As an LLM, I want helpful error messages**: Understand what went wrong and what to try next

### Task 7: Progress & Status System

**Goal**: Configuration-driven feedback on all operations

**Scope**:
- Progress display configuration (update intervals, verbosity)
- Configurable status information
- Performance metrics based on configuration
- Log levels and destinations from configuration

**Configuration**:
```yaml
ui:
  progressBar:
    style: "emoji"  # emoji, simple, detailed
    updateInterval: 100
    showETA: true
    
logging:
  level: "info"
  destinations:
    - type: "file"
      path: "~/.folder-mcp/logs/daemon.log"
    - type: "console"
      format: "pretty"  # pretty, json
```

**Completion Criteria**:
- [ ] Progress display respects configuration
- [ ] Configurable verbosity levels
- [ ] Performance metrics follow configuration
- [ ] Logging configuration working
- [ ] Status display customizable

**Testing**:
- **Automated**: Configuration-driven progress and logging
- **Manual E2E**: User configures progress display preferences

### Task 8: Intelligent Embedding & Search System with Enhanced Endpoints

**Goal**: Build a comprehensive embedding and search system with new LLM-optimized endpoints

**Scope**:

1. **Modular Embedding System**
   - Implement IEmbeddingBackend interface
   - Support multiple backends: Ollama, direct sentence-transformers, auto-selection
   - Hardware detection for GPU/CPU/Apple Metal optimization
   - Memory-adaptive batch processing
   - Smart chunking strategy with configurable overlap

2. **Pre-clustering Pipeline**  
   - Compute cluster assignments during indexing
   - Dual clustering approach:
     ```typescript
     {
       content: "...",
       embedding: [...],
       location: { file: "...", line: 10 },
       semanticClusterId: 5,    // "Budget Planning"  
       folderClusterId: 12      // "Finance/2024/Q1"
     }
     ```

3. **Enhanced Search Endpoint**
   - Enhance existing `search` endpoint with modes:
     ```typescript
     interface SearchRequest {
       query: string;
       mode?: "locate" | "answer" | "explore";  // NEW - Default: "locate"
       limit?: number;
       folder?: string;
       fileTypes?: string[];
     }
     ```
   - Answer mode: Query expansion, semantic boundaries, complete sections
   - Locate mode: Current behavior for specific items
   - Explore mode: Broader results for discovery

4. **New LLM-Optimized Endpoints**
   - `explore_topics`: Topic discovery using pre-computed clusters
   - `get_context`: Intelligent context assembly within token limits
   - `find_code_examples`: Practical code usage discovery
   - `get_related`: Document relationship navigation
   - `help`: LLM-optimized endpoint documentation

5. **Enhanced Existing Endpoints**
   - `get_document_data`: Add section parameter, absorb get_pages/get_slides functionality
   - `list_documents`: Add document type detection (guide|reference|example|config|test)
   - `get_sheet_data`: Return structured JSON objects instead of arrays

6. **Endpoint Consolidation**
   - Remove `get_embedding` (no LLM use case)
   - Merge `get_pages` → `get_document_data` with pageNumbers parameter
   - Merge `get_slides` → `get_document_data` with slideNumbers parameter

**Configuration**:
```yaml
embeddings:
  backend: "auto"  # Intelligently selects best available
  
search:
  modes:
    answer:
      queryExpansion: true
      semanticBoundaries: true
      completeSection: true
    locate:
      exactMatch: true
    explore:
      broaderResults: true
      
  clustering:
    enabled: true
    updateInterval: "on-change"

endpoints:
  enhanced:
    documentData:
      supportSections: true
      supportPageRanges: true
      supportSlideRanges: true
    listDocuments:
      detectTypes: ["guide", "reference", "example", "config", "test"]
```

**Implementation Strategy**:
1. Build modular embedding backend system
2. Implement pre-clustering during indexing
3. Enhance search with three modes
4. Add new endpoints progressively
5. Optimize for performance with caching

**Completion Criteria**:
- [ ] Modular embedding backends working (ollama/direct/auto)
- [ ] Hardware auto-detection and optimization
- [ ] Memory-adaptive processing prevents OOM
- [ ] Pre-clustering adds <5% to indexing time
- [ ] Search modes (answer/locate/explore) working
- [ ] All 5 new endpoints implemented
- [ ] Existing endpoints enhanced as specified
- [ ] Old endpoints properly deprecated/merged
- [ ] Configuration drives all behavior

**Testing**:
- **Automated**: Backend selection, clustering, all endpoints
- **Manual E2E**: User explores topics, gets context, finds examples

### Task 9: Version Control & Update System

**Goal**: Configuration-aware updates and migrations

**Scope**:
- Version checking respects configuration
- Update behavior configurable
- Configuration migration between versions
- Update notifications configurable
- MCP endpoint for version checking

**Configuration**:
```yaml
updates:
  checkForUpdates: true
  checkInterval: "daily"  # startup, hourly, daily, weekly
  autoUpdate: false
  channel: "stable"  # stable, beta, nightly
  
  notifications:
    desktop: true
    cli: true
    tui: true
    mcp: true  # Notify via MCP endpoint
```

**Completion Criteria**:
- [ ] Update checking follows configuration
- [ ] Configurable update channels
- [ ] Configuration migration working
- [ ] Notification preferences respected
- [ ] MCP version endpoint available
- [ ] Manual update trigger available

**Testing**:
- **Automated**: Update configuration, migration
- **Manual E2E**: User configures update preferences

### Task 10: Auto-Config Placement & Client Support

**Goal**: Configuration-driven client setup

**Scope**:
- Client configurations generated from main config
- Configurable client preferences
- Auto-placement based on configuration
- Multiple client support via configuration

**Configuration**:
```yaml
clients:
  claude:
    enabled: true
    autoConfig: true
    configPath: "~/Library/Application Support/Claude/config.json"
    
  vscode:
    enabled: true
    autoConfig: true
    configPath: "~/.config/Code/User/globalStorage/mcp-vscode"
      
  cursor:
    enabled: true
    autoConfig: true

# Auto-generated client configs will include:
# - Local: stdio transport with direct command
# - Remote: SSE transport with URL and API key
```

**Completion Criteria**:
- [ ] Client list from configuration
- [ ] Auto-config respects settings
- [ ] Per-client configuration options
- [ ] Placement paths configurable
- [ ] Client-specific settings working
- [ ] All 13 endpoints included in client configs
- [ ] New endpoints included when enabled

**Testing**:
- **Automated**: Client configuration generation
- **Manual E2E**: User enables clients via configuration

**Phase 7 Completion Review**:
After completing all Phase 7 tasks, conduct mandatory review:
- **Feature Adoption**: Are users embracing the new features?
- **Performance Impact**: How do enhancements affect overall performance?
- **Configuration Coverage**: Are all new features configuration-driven?
- **User Experience**: Is the system intuitive with smart defaults?
- **LLM Experience**: Can LLMs effectively use endpoints with the new documentation?
- **Error Recovery**: Do LLMs successfully recover from errors using the suggestions?
- **Document Updates**: Update remaining phases based on learnings

## Phase 8: Remote Access & Production Features

**Goal**: Enable simple remote access using proven patterns and production-ready features

### **User Stories**
- **As a user, I want simple remote access**: One command to enable remote
- **As a user, I want secure remote connections**: API keys that just work
- **As a user, I want production reliability**: Set it and forget it

### **Design Decision: Why SSE over WebSockets**

Since LLMs (like Claude) are the primary consumers of MCP servers, we chose our transport based on what LLMs actually need:

**What LLMs DON'T Need:**
- Real-time bidirectional communication (requests are request/response)
- Persistent connections (each query is independent)
- Complex state management (LLMs are stateless between calls)

**What LLMs DO Need:**
- **Reliability**: Connections should work every time
- **Simplicity**: Fewer failure points mean better reliability
- **Clear errors**: When things fail, clear error messages for debugging
- **Streaming**: For large responses (where SSE excels)

**Why SSE is Perfect for LLM Consumption:**
1. **One-way streaming**: MCP servers stream responses to LLMs, no back-channel needed
2. **HTTP-based**: Works through firewalls, proxies, and Cloudflare without issues
3. **Simple debugging**: It's just HTTP GET with special headers
4. **Auto-reconnect**: Built into the protocol
5. **Connection pooling**: HTTP keep-alive provides efficiency for sequential requests

**Our Transport Strategy:**
- **Local**: `stdio` - Zero network overhead, direct process communication
- **Remote**: `SSE` - HTTP-based, streaming support, simple authentication

This choice optimizes for LLM consumption patterns while maintaining maximum simplicity.

### Task 12: Simple SSE Remote Access

**Goal**: Implement Crawl4AI's proven SSE pattern for remote access

**Scope**:
- Express server with exact endpoint structure from Crawl4AI
- SSE transport implementation (no WebSockets, no gRPC)
- Simple Bearer token authentication
- Health check and status endpoints
- Cloudflare tunnel integration wizard

**Implementation (Following Crawl4AI Exactly)**:
```typescript
import express from 'express';
import { SSEHandler } from './sse-handler';

const app = express();

// Enable connection keep-alive for LLM sequential requests
app.use((req, res, next) => {
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Keep-Alive', 'timeout=30');
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'folder-mcp',
    version: config.version,
    uptime: process.uptime()
  });
});

// Basic info endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'folder-mcp',
    endpoints: ['/health', '/mcp/sse'],
    docs: 'https://github.com/user/folder-mcp'
  });
});

// MCP SSE endpoint - exactly like Crawl4AI
app.get('/mcp/sse', async (req, res) => {
  // Simple API key validation
  const apiKey = req.headers.authorization?.replace('Bearer ', '');
  if (!validateApiKey(apiKey)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // For nginx
  
  // Handle MCP protocol over SSE
  const handler = new SSEHandler(mpcServer);
  handler.handle(req, res);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`folder-mcp SSE server listening on port ${PORT}`);
});
```

**Configuration**:
```yaml
transport:
  remote:
    type: "sse"  # Only SSE, no other options
    port: 3000
    endpoints:
      health: "/health"
      info: "/"
      mcp: "/mcp/sse"
    
authentication:
  type: "api-key"
  storage: "~/.folder-mcp/api-keys.json"
  
cloudflare:
  tunnel:
    enabled: false
    name: "folder-mcp-tunnel"
    url: "http://localhost:3000"
```

**Client Connection Pattern**:
```typescript
// Local connection (unchanged)
{
  "mcpServers": {
    "folder-mcp": {
      "command": "node",
      "args": ["dist/mcp-server.js"]
    }
  }
}

// Remote connection (Crawl4AI style)
{
  "mcpServers": {
    "folder-mcp-remote": {
      "command": "npx",
      "args": ["@modelcontextprotocol/client-stdio"],
      "env": {
        "MCP_SERVER_URL": "https://folder-mcp.yourdomain.com/mcp/sse",
        "API_KEY": "your-api-key"
      }
    }
  }
}
```

**Completion Criteria**:
- [ ] Express server with exact Crawl4AI endpoints
- [ ] SSE transport working (no WebSockets)
- [ ] Bearer token authentication
- [ ] Health and info endpoints
- [ ] Connection keep-alive for LLM sequential requests
- [ ] Cloudflare tunnel setup wizard
- [ ] Client configuration examples

**Testing**:
- **Automated**: SSE connection, authentication, health checks
- **Manual E2E**: User connects remotely via Cloudflare tunnel

### Task 12: Simple Security Configuration

**Goal**: Simple, effective security following Crawl4AI patterns

**Scope**:
- API key generation and management
- Rate limiting via Express middleware
- Basic audit logging
- CORS configuration for web clients

**Implementation**:
```typescript
// API Key Management (simple JSON file like Crawl4AI)
{
  "keys": [
    {
      "key": "fmcp_abc123...",
      "name": "Claude Desktop",
      "created": "2024-01-15",
      "lastUsed": "2024-01-20"
    }
  ]
}

// Express middleware for security
app.use(rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100 // 100 requests per hour
}));

app.use(cors({
  origin: config.security.cors.origins,
  credentials: true
}));
```

**Configuration**:
```yaml
security:
  authentication:
    type: "api-key"  # Only option
    prefix: "fmcp_"  # Key prefix
    
  rateLimiting:
    enabled: true
    requests: 100
    window: "1h"
    
  audit:
    enabled: true
    logPath: "~/.folder-mcp/audit.log"
    
  cors:
    enabled: true
    origins: ["https://claude.ai", "https://cursor.sh"]
```

**Completion Criteria**:
- [ ] Simple API key management
- [ ] Rate limiting via middleware
- [ ] Audit logging to file
- [ ] CORS properly configured
- [ ] No complex auth systems

**Testing**:
- **Automated**: API key validation, rate limiting
- **Manual E2E**: User manages API keys

### Task 13: VSCode 1.101 MCP Integration

**Goal**: Configuration-based VSCode optimization

**Scope**:
- VSCode-specific configuration section
- Tool organization via configuration
- Development mode configuration
- Feature flags for VSCode features

**Configuration**:
```yaml
clients:
  vscode:
    toolSets:
      development:
        icon: "code"
        tools: ["search", "get_document_data", "explore_topics"]
        
    features:
      hotReload: true
      resourceDrag: true
      contextIntegration: true
      
    development:
      watchMode: true
      debugPort: 9229
```

**Completion Criteria**:
- [ ] VSCode features configuration-driven
- [ ] Tool organization via config
- [ ] Development mode configurable
- [ ] Feature flags working
- [ ] Hot reload configurable

**Testing**:
- **Automated**: VSCode configuration generation
- **Manual E2E**: Developer configures VSCode features

### Task 14: Production Readiness Configuration

**Goal**: Production behavior through configuration

**Scope**:
- Auto-start configuration
- Resilience configuration  
- Monitoring configuration
- Backup configuration
- Cloudflare tunnel deployment

**Configuration**:
```yaml
production:
  autoStart:
    enabled: true
    method: "systemd"  # systemd, launchd, init
    
  resilience:
    autoRestart: true
    maxRestarts: 3
    restartDelay: 5
    
  monitoring:
    healthCheck:
      enabled: true
      interval: 30
      timeout: 5
      
  backup:
    enabled: true
    schedule: "daily"
    retention: 7
    location: "~/.folder-mcp/backups"
    
  # Cloudflare deployment
  deployment:
    tunnel:
      persistent: true  # Keep tunnel running
      autoreconnect: true
      metrics: true  # Enable tunnel metrics
```

**Cloudflare Deployment Pattern**:
```bash
# Production deployment following Crawl4AI
# 1. Install cloudflared
# 2. Create tunnel
cloudflared tunnel create folder-mcp

# 3. Configure tunnel (auto-generated)
# ~/.cloudflared/config.yml
tunnel: <TUNNEL_ID>
credentials-file: /home/user/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: folder-mcp.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404

# 4. Run tunnel as service
cloudflared service install
systemctl start cloudflared
```

**Completion Criteria**:
- [ ] Production features configuration-driven
- [ ] Auto-start configurable by platform
- [ ] Resilience fully configurable
- [ ] Monitoring configuration complete
- [ ] Backup system configurable
- [ ] Cloudflare tunnel auto-deployment

**Testing**:
- **Automated**: Production configuration scenarios
- **Manual E2E**: User deploys to production with tunnel

**Phase 8 Completion Review**:
After completing all Phase 8 tasks, conduct mandatory review:
- **Remote Access Simplicity**: Is SSE transport working reliably?
- **Security Effectiveness**: Are API keys sufficient for access control?
- **Production Readiness**: Does the simple approach scale?
- **Platform Coverage**: Does configuration work across platforms?
- **Document Updates**: Update Phase 9 based on production experience

## Phase 9: Advanced Features & Polish

**Goal**: Configuration-driven advanced features building on stable foundation

### **User Stories**
- **As a user, I want search behavior customized**: Search configuration
- **As a user, I want format support configured**: Enable/disable formats
- **As a user, I want performance tuned**: Configuration-based optimization

### Task 15: Advanced Search Configuration

**Goal**: Search behavior entirely configuration-driven

**Scope**:
- Search algorithms configurable
- Ranking configuration
- Filter configuration
- Export configuration
- Integration with topic discovery

**Configuration**:
```yaml
search:
  algorithms:
    semantic:
      enabled: true
      weight: 0.7
      
    keyword:
      enabled: true
      weight: 0.3
      
  ranking:
    factors:
      - relevance: 0.4
      - recency: 0.3
      - location: 0.3
      
  filters:
    fileTypes:
      enabled: true
      groups:
        documents: [".pdf", ".docx", ".txt"]
        code: [".js", ".py", ".ts"]
        
  export:
    formats: ["json", "csv", "markdown"]
    maxResults: 1000
```

**Completion Criteria**:
- [ ] Search algorithms configurable
- [ ] Ranking fully customizable
- [ ] Filters configuration-driven
- [ ] Export options configurable
- [ ] Performance tuning exposed

**Testing**:
- **Automated**: Search configuration scenarios
- **Manual E2E**: User customizes search behavior

### Task 16: File Format Support Configuration

**Goal**: Format support through configuration

**Scope**:
- Enable/disable format support
- Format-specific configuration
- Parser selection via configuration
- Performance settings per format

**Configuration**:
```yaml
formats:
  pdf:
    enabled: true
    parser: "pdfjs"  # pdfjs, pypdf
    extractImages: false
    maxPages: 1000
    
  office:
    legacy:
      enabled: true
      formats: [".doc", ".xls", ".ppt"]
      
  code:
    enabled: true
    languages:
      javascript:
        extensions: [".js", ".jsx", ".ts", ".tsx"]
        parser: "typescript"
        extractAST: true
        
  images:
    enabled: false  # Pending research
    ocr:
      engine: "tesseract"
      languages: ["en", "es"]
```

**Completion Criteria**:
- [ ] Format support configurable
- [ ] Parser selection working
- [ ] Format-specific options
- [ ] Performance settings apply
- [ ] Feature flags for formats

**Testing**:
- **Automated**: Format configuration validation
- **Manual E2E**: User enables/configures formats

### Task 17: Code Intelligence Configuration

**Goal**: Code features through configuration

**Scope**:
- AST parsing configuration
- Framework detection configuration
- Code-specific search configuration
- Language-specific settings
- Integration with existing search

**Configuration**:
```yaml
codeIntelligence:
  enabled: true
  
  ast:
    enabled: true
    languages: ["javascript", "typescript", "python"]
    extractFunctions: true
    extractClasses: true
    extractImports: true
    
  frameworks:
    detect: true
    supported:
      - name: "express"
        patterns: ["app.get", "app.post", "router."]
      - name: "fastapi"
        patterns: ["@app.get", "@app.post", "FastAPI()"]
        
  search:
    includeComments: false
    includeDocstrings: true
    semanticCodeSearch: true
```

**Completion Criteria**:
- [ ] Code features configuration-driven
- [ ] AST options configurable
- [ ] Framework detection configurable
- [ ] Search behavior customizable
- [ ] Language settings working
- [ ] Integrates with existing search endpoint

**Testing**:
- **Automated**: Code intelligence configuration
- **Manual E2E**: User configures code features

### Task 18: Performance & Scalability Configuration

**Goal**: Performance entirely configuration-driven

**Scope**:
- All performance parameters exposed
- Scaling configuration
- Resource limits configuration
- Cache configuration

**Configuration**:
```yaml
performance:
  scaling:
    mode: "auto"  # auto, manual
    maxWorkers: "auto"  # auto = CPU cores
    
  limits:
    maxMemory: "4GB"
    maxCPU: "80%"
    maxDisk: "10GB"
    
  cache:
    embedding:
      size: "1GB"
      ttl: "7d"
      
    search:
      size: "100MB"
      ttl: "1h"
      
  optimization:
    lazyLoading: true
    incrementalIndexing: true
    compressionLevel: 6
```

**Completion Criteria**:
- [ ] All performance configurable
- [ ] Resource limits enforced
- [ ] Cache behavior configurable
- [ ] Optimization flags working
- [ ] Scaling configuration applied

**Testing**:
- **Automated**: Performance configuration scenarios
- **Manual E2E**: User tunes performance via configuration

### Task 19: Chat Interface Configuration

**Goal**: Chat features through configuration

**Scope**:
- LLM provider configuration
- Chat behavior configuration
- Session management configuration
- Export configuration

**Configuration**:
```yaml
chat:
  enabled: false
  
  providers:
    openai:
      enabled: true
      apiKey: "${OPENAI_API_KEY}"
      model: "gpt-4"
      
    ollama:
      enabled: true
      model: "llama2"
      
  behavior:
    systemPrompt: "You are a helpful assistant..."
    maxTokens: 4000
    temperature: 0.7
    
  sessions:
    autoSave: true
    maxHistory: 100
    exportFormats: ["markdown", "json"]
```

**Completion Criteria**:
- [ ] Chat fully configuration-driven
- [ ] Provider selection via config
- [ ] Behavior customizable
- [ ] Session management configurable
- [ ] Export options working

**Testing**:
- **Automated**: Chat configuration validation
- **Manual E2E**: User configures chat features

**Phase 9 Completion Review**:
After completing all Phase 9 tasks, conduct mandatory review:
- **Feature Configuration**: Are all features configuration-driven?
- **Complexity Balance**: Is configuration approachable?
- **Performance Impact**: Does configuration affect performance?
- **User Feedback**: What configuration do users actually use?
- **Document Updates**: Prepare final phase based on learnings

## Phase 10: Release & Documentation

**Goal**: Production release with configuration-focused documentation

### Task 20: Configuration Testing & Validation

**Goal**: Comprehensive configuration testing

**Scope**:
- Configuration validation test suite
- Migration testing
- Performance impact testing
- Cross-platform configuration testing

**Completion Criteria**:
- [ ] Full configuration test coverage
- [ ] Migration scenarios tested
- [ ] Performance benchmarks with various configs
- [ ] Platform-specific configs tested
- [ ] Edge cases handled

### Task 21: Configuration Documentation

**Goal**: Complete configuration reference

**Scope**:
- Configuration reference documentation
- Configuration cookbook
- Migration guides
- Best practices guide

**Deliverables**:
- Complete YAML schema documentation
- Environment variable reference
- Configuration examples for common scenarios
- Performance tuning guide
- Security configuration guide

**Completion Criteria**:
- [ ] All configuration options documented
- [ ] Examples for every feature
- [ ] Migration guides complete
- [ ] Best practices documented
- [ ] Troubleshooting guide ready

### Task 21: Configuration Documentation & Testing

**Goal**: Complete configuration reference and testing

**Scope**:
- Configuration reference documentation
- Configuration cookbook
- Migration guides
- Best practices guide
- Integration with help endpoint

**Note**: The `help` endpoint itself is implemented as part of the 13 core endpoints in Task 8/11, providing LLM-optimized documentation for all endpoints and configuration options.

**Deliverables**:
- Complete YAML schema documentation
- Environment variable reference
- Configuration examples for common scenarios
- Performance tuning guide
- Security configuration guide
- Help endpoint integration examples

**Completion Criteria**:
- [ ] All configuration options documented
- [ ] Examples for every feature
- [ ] Migration guides complete
- [ ] Best practices documented
- [ ] Troubleshooting guide ready
- [ ] Help endpoint serves all documentation

**Testing**:
- **Automated**: Configuration validation tests
- **Manual E2E**: User configures system successfully

### Task 22: Release Automation

**Goal**: Configuration-aware release process

**Scope**:
- Configuration migration in releases
- Default configuration updates
- Release notes for configuration changes
- Configuration compatibility checking

**Completion Criteria**:
- [ ] Migration automation working
- [ ] Configuration changelog generated
- [ ] Compatibility checking automated
- [ ] Default updates documented
- [ ] Release process documented

**Phase 10 Completion Review**:
After completing all Phase 10 tasks, conduct final project review:
- **Configuration Success**: Is everything truly configuration-driven?
- **User Adoption**: Do users embrace the configuration model?
- **Complexity Assessment**: Is configuration approachable enough?
- **Performance Review**: What's the configuration overhead?
- **Feature Completeness**: Are all features working seamlessly?
- **Future Planning**: What configuration features for v2.0?

## Success Metrics

1. **Configuration Coverage**: 100% of features configurable
2. **Zero-Config Success**: 90% of users succeed with defaults
3. **Feature Completeness**: All 13 endpoints working seamlessly
4. **Search Effectiveness**: Answer mode provides complete, actionable information
5. **Context Efficiency**: get_context respects token limits while maximizing relevance
6. **Discovery Speed**: explore_topics helps understand new codebases in <5 queries
7. **Power User Satisfaction**: Advanced users have needed control
8. **Performance Impact**: <5% overhead from configuration system
9. **LLM Optimization**: Transport layer optimized for LLM consumption patterns
10. **LLM Usability**: LLMs can use endpoints effectively without exploration
11. **Error Recovery Rate**: LLMs successfully recover from 90%+ of errors
12. **Documentation Quality**: Users and LLMs find documentation helpful

---

*This plan begins at Phase 6, as Phases 1-5 represent the substantial work already completed to build the current working system with 9 MCP endpoints, file processing, embeddings, and Claude Desktop integration. This plan follows configuration-driven development principles where every feature is designed to be configurable from the start. The configuration system is not an afterthought but the core architectural principle that enables flexibility, customization, and future extensibility. The endpoint design is optimized for LLM consumption with 13 carefully designed endpoints (consolidated from the original 9, with 5 new additions and 3 merged/removed). Smart defaults ensure the system works excellently out-of-the-box while providing deep customization for power users. The plan is designed to evolve - after each phase completion, we review learnings and update future phases to ensure this document remains our single source of truth throughout the project.*