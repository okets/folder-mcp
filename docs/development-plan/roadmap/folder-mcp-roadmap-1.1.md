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

### Configuration System (After Phase 7)

1. **Defaults**: `config-defaults.yaml` with sensible defaults
2. **User Config**: `~/.folder-mcp/config.yaml` for user overrides
3. **CLI Arguments**: Command-line flags for temporary overrides

**Schema-Driven**: Configuration structure defined by schemas that drive both validation and UI generation

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

The configuration system uses a flat YAML structure with these main sections:
- **general**: Basic settings (autoStart, logLevel, telemetry)
- **daemon**: Process management (port, pidFile, healthCheck, autoRestart)
- **embeddings**: Backend selection (ollama, direct, auto) with hardware optimization
- **search**: Core search and clustering configuration
- **transport**: Simple transports only (stdio for local, SSE for remote)
- **authentication**: API key-based authentication
- **folders**: Default settings and per-folder overrides
- **performance**: Resource limits and monitoring
- **ui**: Theme and display preferences for CLI/TUI
- **features**: Feature flags for new capabilities

Configuration follows simple override: config-defaults.yaml → config.yaml → CLI Arguments

**Note**: Phase 7 replaces the original 6-source hierarchical system with this simplified approach

### Configuration Usage Examples

```bash
# Override via CLI arguments
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
The central component that loads, validates, merges, and provides configuration to all other components. It handles the simple two-file system (defaults and user config), validation via schemas, and live reloading. The Configuration Manager is the first component initialized and drives the behavior of all other components.

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
│                   User Interfaces                       │
├───────────────────────────┬─────────────────────────────┤
│           CLI             │            TUI              │
│      (headless)           │       (interactive)         │
│                           │                             │
│   folder-mcp add ~/docs   │    ┌─┐ Management Console   │
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
                      Local │          Remote │
                     (stdio)│            (SSE)│
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
- Manage configuration settings

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
- **Templates**: Example configurations for common use cases
- **Wizards**: Interactive configuration for complex settings
- **Validation**: Helpful error messages for configuration issues
- **Defaults**: Smart defaults that work without configuration
- **Validation**: Schema-based validation for all settings

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
- Configuration loader with schema validation
- Environment variable expansion
- Configuration validation with helpful errors
- Default configuration generation
- Configuration schema definitions

**Completion Criteria**:
- [ ] Configuration schema defined and documented
- [ ] Loader handles all configuration sources
- [ ] Validation provides helpful error messages
- [ ] Configuration schema validation working
- [ ] Hot reload for applicable settings
- [ ] Configuration CLI commands working


### Task 2: Basic Daemon Architecture

**Goal**: Create configuration-driven daemon that manages single multi-folder MCP server

**Scope**:
- Daemon reads configuration on startup
- Configuration drives all daemon behavior
- Support configuration reload via signals
- Health checks and restart policies from config
- Performance monitoring per configuration

**Completion Criteria**:
- [ ] Daemon respects all configuration settings
- [ ] Configuration reload without restart
- [ ] Health monitoring uses configured intervals
- [ ] Auto-restart follows configuration
- [ ] Performance metrics per configuration


### Task 3: Extend MCP Server for Multiple Folders

**Goal**: Modify existing MCP server to handle multiple folders with per-folder configuration

**Scope**:
- Read folder list from configuration
- Apply folder-specific settings (model, excludes, etc.)
- Support folder configuration overrides
- Dynamic folder addition/removal
- Performance settings per folder
- Preserve existing endpoint functionality

**Completion Criteria**:
- [ ] MCP server reads folder configuration
- [ ] Per-folder settings applied correctly
- [ ] Configuration changes trigger re-indexing
- [ ] Folder-specific models working
- [ ] Performance tuning per folder


### Task 4: Configuration-Aware CLI Commands

**Goal**: Implement CLI commands that respect and expose configuration

**Scope**:
- `folder-mcp config get/set/list` - Configuration management
- `folder-mcp add --backend <backend>` - Override configuration
- `folder-mcp config show` - Display current configuration
- All commands accept config overrides
- Help shows configuration options

**Completion Criteria**:
- [ ] Configuration commands working
- [ ] All commands accept config overrides
- [ ] Profile switching works
- [ ] Help includes configuration options
- [ ] JSON output for automation


**Phase 6 Success Criteria**:
- ✅ Configuration system foundation established
- ✅ Basic daemon architecture implemented
- ✅ MCP server extended for multiple folders
- ✅ Configuration-aware CLI commands working
- Configuration system ready for overhaul in Phase 7

## Phase 7: Configuration System Overhaul

**Goal**: Replace the complex 6-source configuration system with a simple, schema-driven system focused on user configurations

**Reference Documents**:
- `docs/development-plan/roadmap/currently-implementing/configuration-system-design.md` - Complete design specification
- `docs/development-plan/roadmap/currently-implementing/configurable-parameters.md` - Schema examples and parameter documentation

### **User Stories**
- **As a user, I want simple configuration**: Just two YAML files with clear purpose
- **As a user, I want schema validation**: Know immediately if my config is wrong
- **As a user, I want dynamic UI**: Configuration options that adapt based on my choices
- **As a developer, I want clear separation**: System config vs user config with no overlap

### Task 1: Remove Old Configuration System Tests

**Goal**: Clean up all tests related to the old 6-source configuration system

**Scope**:
- Remove tests for system config, profiles, environment expansion
- Remove tests for complex hierarchy merging
- Remove tests for hot reload of all sources
- Keep only tests that will be relevant to new system

**Completion Criteria**:
- [x] Old configuration tests removed
- [x] Test suite passes without old config tests
- [x] No references to old config system in tests

### Task 2: Simplify Current Configuration System

**Goal**: Move all current configurations to a single system-configuration.json file

**Scope**:
- Create system-configuration.json with ALL current configs
- Include both system and user-related configurations temporarily
- Simple JSON loader that reads this file on startup
- No hierarchy, no merging, no environment variables
- Write tests for simple JSON loading mechanism

**Configuration Items to Move**:
- Model settings (modelName, batchSize, etc.)
- File processing settings (extensions, ignore patterns)
- Performance settings
- Development flags
- All other current configurations

**Completion Criteria**:
- [x] system-configuration.json contains all current configs
- [x] Simple loader reads JSON on startup
- [x] Application works with single config file
- [x] Tests verify JSON loading mechanism
- [ ] No regression in functionality

### Task 3: Implement New User Configuration System ✅ COMPLETED (2025-07-08)

**Goal**: Build schema-driven configuration system with DEAD SIMPLE architecture

**Configuration Architecture (DEAD SIMPLE)**:
- **system-configuration.json** = Constants (file extensions, model names, never user-configurable)
- **config-defaults.yaml** = Default values for user preferences  
- **config.yaml** = User overrides (ONLY selected items, added one by one as TUI grows)

**Scope**:
- Implement ConfigManager (loads config-defaults.yaml and config.yaml) 
- Create configuration schema with single test item (theme selection)
- Implement CLI config commands (get/set/show) for user preferences
- Add tests for merging and override behavior
- Keep system constants in JSON, user preferences in YAML

**Test Configuration Item**:
```yaml
# config-defaults.yaml
theme: "auto"  # Options: light, dark, auto

# User can override in config.yaml
theme: "dark"  # User prefers dark mode
```

**Completion Criteria**:
- [x] ConfigManager implemented and tested
- [x] Schema system working with theme configuration
- [x] CLI can get/set theme configuration  
- [x] config.yaml overrides config-defaults.yaml
- [x] Theme changes reflected in TUI
- [x] Tests verify override hierarchy
- [x] CLI --theme flag overrides config files (Assignment 4)
- [x] DI integration complete (Assignment 8)

### Task 4: Create Schema-Driven TUI

**Goal**: Build real TUI that generates UI from configuration schema for user preferences

**Scope**:
- Move all test items from MainPanel to SecondaryPanel
- Implement ConfigurationItemFactory for user preferences
- Generate theme selection UI from schema  
- Connect UI to real config.yaml file
- Save changes persist to config.yaml

**TUI Changes**:
- MainPanel: Real user configuration (theme selection initially)
- SecondaryPanel: Test items for reference
- Theme selection with instant visual feedback
- Real-time validation from schema

**Completion Criteria**:
- [ ] TUI generates theme selection from schema
- [ ] Theme selection saved to config.yaml
- [ ] UI updates when config.yaml changes
- [ ] Theme changes immediately visible in TUI
- [ ] Validation prevents invalid selections
- [ ] Test items moved to SecondaryPanel

### Task 5: Define All User Configurations

**Goal**: Gradually migrate selected items from JSON constants to user-configurable YAML

**Scope (PROGRESSIVE MIGRATION)**:
- Start with theme (completed in Task 3-4)
- Add development settings (enabled, hotReload, debugOutput) 
- Add performance tuning (batchSize, maxConcurrentOperations) when TUI needs it
- Create schema definitions for each new item
- Move items from system-configuration.json to user config ONE BY ONE

**Progressive Addition Strategy**:
- **Phase 1**: Theme (light/dark/auto) ← DONE
- **Phase 2**: Development flags (enabled, hotReload) 
- **Phase 3**: Performance tuning (when users request it)
- **Phase 4**: UI preferences (when TUI expands)

**Completion Criteria**:
- [ ] Theme configuration working end-to-end
- [ ] Development configuration added to schema
- [ ] Performance settings available when needed
- [ ] CLI commands work for all migrated configs
- [ ] TUI shows all migrated configuration options
- [ ] system-configuration.json keeps only true constants

### Task 6: Update Roadmap for New Architecture

**Goal**: Update all future phases to use new configuration system

**Scope**:
- Remove references to old configuration system
- Add user configuration items for each feature
- Update task descriptions to use new schema
- Ensure gradual config growth pattern

**Completion Criteria**:
- [ ] All phases updated for new config system
- [ ] Each phase adds its config items to schema
- [ ] No references to old 6-source system
- [ ] Clear pattern for adding new configs

**Phase 7 Success Criteria**:
- Simple 2-file configuration system operational ✅ (Task 3 complete)
- Schema drives both CLI and TUI interfaces ✅ (Theme working)
- All user configs in config.yaml with defaults ⏳ (Theme done, more to come)
- System configs isolated in system-configuration.json ✅ (Task 2 complete)
- Clean, maintainable configuration architecture ✅ (DI integrated)

## Phase 8: Multi-Folder Multi-Model Indexing System ✅ COMPLETED

**Goal**: Complete transformation to multi-folder, multi-model indexing system with unified TUI interface

**Scope Achieved**: During Phase 8, the project underwent a major architectural transformation that completely rebuilt the application from the ground up. What started as "Enhanced UX & Core Features" became a comprehensive system rewrite.

### **Major Achievements**
- **✅ Unified TUI Application**: Complete terminal interface with wizard, folder management, and real-time status
- **✅ Multi-Folder Support**: Add, configure, and manage multiple folders with different embedding models
- **✅ WebSocket Daemon Architecture**: Persistent background daemon with TUI client communication
- **✅ Python Embeddings System**: GPU-accelerated embeddings with 8 supported models and hardware detection
- **✅ SQLite-vec Vector Storage**: Production-ready vector database with persistent storage and fast search
- **✅ Dynamic Model Selection**: Hardware-aware model defaults with sequential processing and model switching
- **✅ Comprehensive Configuration System**: Unified configuration with validation, CLI commands, and hot reload
- **✅ Real-time Progress Reporting**: Live status updates during indexing with detailed progress tracking

### **Core Infrastructure Built**
- **Configuration Architecture**: Single source of truth with ValidationRegistry and ConfigurationComponent
- **Daemon-Centric Design**: Background service managing all folders with persistent state
- **TUI Framework**: React Ink-based interface with reusable components and responsive design
- **Embeddings Pipeline**: Complete Python subprocess with JSON-RPC communication and GPU optimization
- **Vector Storage**: SQLite-vec databases per folder with incremental updates and metadata storage
- **Process Management**: Keep-alive systems, graceful shutdown, and error recovery

### **Technical Components Delivered**
- **WebSocket Communication**: Daemon ↔ TUI real-time communication with message correlation
- **Folder Validation Service**: Comprehensive validation with duplicate, sub-folder, and ancestor detection
- **Model Registry**: 8 supported embedding models with automatic downloads and device optimization
- **Progress Tracking**: Complete indexing flow with status transitions (pending → scanning → parsing → embedding → indexing → ready)
- **Error Handling**: Graceful degradation, error reporting, and recovery mechanisms

### **User Experience Transformation**
- **First-Run Wizard**: Intelligent folder selection with smart defaults and model auto-detection
- **Add Folder Wizard**: Reusable component with validation and confirmation flows
- **Real-time Status**: Live folder status with progress bars and error reporting
- **Multi-Model Support**: Per-folder model selection with hardware-aware defaults
- **CLI Integration**: Complete CLI with folder management and configuration commands

### **Testing & Quality**
- **905+ Tests Passing**: Comprehensive test coverage including real document processing
- **E2E Integration**: Full workflow testing with business documents (Marketing, Finance, Engineering, Legal)
- **Performance Optimization**: GPU acceleration, model caching, and memory management
- **Cross-platform Support**: Windows, macOS, and Linux compatibility with terminal-specific optimizations

**Phase 8 Success Metrics**:
- ✅ Complete architectural transformation to multi-folder system
- ✅ Production-ready embeddings with GPU acceleration
- ✅ Real-time TUI interface with comprehensive folder management
- ✅ Zero test failures across entire codebase (905/905 passing)
- ✅ Hardware-adaptive model selection and performance optimization
- ✅ Persistent vector storage with SQLite-vec database per folder

## Phase 9: MCP Endpoints Multi-Folder Support

**Goal**: Enable MCP endpoints to work with multiple folders and models

**Why**: Phase 8 built multi-folder indexing infrastructure. Phase 9 connects the MCP endpoints to use this system instead of single-folder access.

**What**: Transform existing MCP endpoints to be folder-aware while maintaining the same excellent interface for LLMs.

**Success Criteria**: LLMs can discover, search, and retrieve documents across multiple folders with automatic model switching.

**Reference Document**: [Phase-9-MCP-Endpoints-Multi-Folder-Support.md](currently-implementing/Phase-9-MCP-Endpoints-Multi-Folder-Support.md)

## Phase 10: TUI Rebuild & Navigation

**Goal**: Rebuild TUI with proper screens, navigation menu, and professional interface

**Why**: Current TUI is functional but needs proper screen architecture, navigation system, and polished user experience for production use.

**What**:
- Complete TUI architecture rebuild with proper screen management
- Navigation menu system for different application areas
- Multiple screens (folder management, agent connections, settings, monitoring)
- Professional interface design and user experience improvements
- Centralized focus management and keyboard navigation system

**Success Criteria**: Professional TUI interface with intuitive navigation and multiple functional screens.

## Phase 11: Remote Access

**Goal**: Enable secure remote access to knowledge base

**Why**: Users want to access their knowledge base from anywhere, not just locally.

**What**:
- Remote access via Server-Sent Events (SSE) with authentication
- Cloudflare tunnel support for easy setup
- Security configuration (API keys, rate limiting, audit logging)
- VSCode MCP integration optimization

**Success Criteria**: Users can securely access their knowledge base remotely with proper authentication.

## Phase 12: Release 1.0 - Production System & Advanced Features

**Goal**: Deliver complete production-ready system with advanced capabilities

**Why**: Combine production system management with advanced features for comprehensive 1.0 release.

**What**:
- **Production System Management**: Enhanced daemon process management, multi-agent connection support, OS integration (auto-start on boot)
- **Advanced LLM Features**: New endpoints (`explore_topics`, `get_context`, `find_code_examples`, `get_related`, `help`)
- **Extended Capabilities**: Broader file format support, code intelligence features, performance optimizations
- **Versioning & Installation**: Semantic versioning, npm registry publishing, update notifications
- **CI/CD Pipeline**: Automated testing, building, and deployment pipeline for reliable releases
- **Release Readiness**: Complete testing, documentation, and release automation

**Success Criteria**: Complete production system with advanced features and automated CI/CD pipeline ready for 1.0 release.

## Phase 13: Public Release

**Goal**: Deliver polished public release with comprehensive documentation

**Why**: Make the system publicly available with professional documentation and support materials.

**What**:
- Comprehensive user documentation and guides
- API reference and developer documentation  
- Cross-platform compatibility verification
- Public release preparation and distribution

**Success Criteria**: Polished system ready for public use with complete documentation.

## Success Metrics

1. **Feature Completeness**: All 13 MCP endpoints fully functional
2. **Ease of Use**: 90% of users succeed with default settings
3. **Search Effectiveness**: Enhanced search modes deliver relevant results
4. **LLM Integration**: Endpoints optimized for AI consumption
5. **Performance**: Fast indexing and search across large repositories
6. **Reliability**: Production-ready with monitoring and resilience
7. **Flexibility**: Power users can customize all aspects
8. **Performance Impact**: <5% overhead from configuration system
9. **LLM Optimization**: Transport layer optimized for LLM consumption patterns
10. **LLM Usability**: LLMs can use endpoints effectively without exploration
11. **Error Recovery Rate**: LLMs successfully recover from 90%+ of errors
12. **Documentation Quality**: Users and LLMs find documentation helpful

---

*This plan begins at Phase 6, as Phases 1-5 represent the substantial work already completed to build the current working system with 9 MCP endpoints, file processing, embeddings, and Claude Desktop integration. This plan follows configuration-driven development principles where every feature is designed to be configurable from the start. The configuration system is not an afterthought but the core architectural principle that enables flexibility, customization, and future extensibility. The endpoint design is optimized for LLM consumption with 13 carefully designed endpoints (consolidated from the original 9, with 5 new additions and 3 merged/removed). Smart defaults ensure the system works excellently out-of-the-box while providing deep customization for power users. The plan is designed to evolve - after each phase completion, we review learnings and update future phases to ensure this document remains our single source of truth throughout the project.*