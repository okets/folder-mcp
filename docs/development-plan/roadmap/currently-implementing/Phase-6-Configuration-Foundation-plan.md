# Phase 6: Configuration Foundation & CLI/TUI Parity Implementation Plan

**Status**: 📋 PLANNED  
**Start Date**: 2025-07-05  
**Target Completion**: ~2-3 weeks  

## 🎯 **Phase Overview**

**Goal**: Establish configuration system as the foundation for all features, then achieve identical functionality between CLI and TUI interfaces

### **User Stories**
- **As a user, I want sensible defaults**: System works without any configuration
- **As a user, I want to customize behavior**: Easy configuration for common needs
- **As a power user, I want full control**: Every aspect configurable
- **As a user, I want to add a folder to be shared**: `folder-mcp add ~/Documents`
- **As a user, I want to see all shared folders**: `folder-mcp list`
- **As a user, I want to check configuration**: `folder-mcp config get`

### **Success Criteria**
- Configuration system drives all functionality
- Users can manage entire system via configuration
- CLI and TUI provide identical capabilities
- Smart defaults with deep customization
- Transport strategy locked in: stdio + SSE only
- Foundation ready for feature development

## 🏗️ **Implementation Strategy**

### **Core Philosophy**
Configuration drives flexibility throughout the system. Every aspect of folder-mcp is configurable, with smart defaults that work out-of-the-box while enabling deep customization for power users.

### **Implementation Approach**
- **Incremental Approach**: Build core configuration system first, then layer on features
- **Testing Early**: Build testing framework alongside implementation, not after
- **Schema-First Design**: Define complete configuration schema upfront to avoid breaking changes
- **Reuse Existing**: Review and extend existing configuration code at `src/config/`
- **Platform Awareness**: Consider Windows/Unix differences from the start

### **Why This Order?**
The tasks have been carefully ordered to optimize development flow:

1. **Configuration System Foundation** must come first as it's the architectural foundation everything else depends on
2. **Basic Daemon Architecture** builds on configuration to manage the server lifecycle
3. **Extend MCP Server** leverages configuration for multi-folder support
4. **CLI Commands** expose configuration management to users
5. **TUI Interface** mirrors CLI functionality for consistency
6. **Parity Validation** ensures both interfaces deliver identical capabilities

This order ensures:
- We build on existing code rather than starting from scratch
- Core functionality is tested as we build
- User-facing features have a solid foundation
- Complex features come after basics are proven

## 📚 **MUST READ - Essential Project Context**

### Project Goal
Create a configuration-driven daemon-based system that manages multiple MCP servers for shared folders, with TUI/CLI interfaces, intelligent model selection, and 13 LLM-optimized endpoints including enhanced search with answer modes, topic discovery, context assembly, code examples, relationship navigation, and comprehensive help - all designed for optimal LLM consumption patterns.

### Architecture Overview
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
```

### Key Concepts & Terminology

**Configuration Manager**  
The central component that loads, validates, merges, and provides configuration to all other components. It handles the configuration hierarchy, environment variable expansion, live reloading, and validation. The Configuration Manager is the first component initialized and drives the behavior of all other components.

**Daemon**  
A configuration-aware background process that runs continuously and manages the lifecycle of a single multi-folder MCP server. The daemon's behavior is entirely driven by configuration, including auto-start behavior, health check intervals, and restart policies.

**MCP Server**  
A single process that serves multiple folders via the Model Context Protocol. The MCP server's capabilities, performance characteristics, and behavior are determined by configuration. It dynamically loads folder-specific configurations and adjusts its behavior accordingly.

### Development Philosophy

**Core Principle**: Every feature is designed from the user experience first, then implemented to support that experience, with configuration enabling different user preferences.

### Success Metrics
1. **Configuration Coverage**: 100% of features configurable
2. **Zero-Config Success**: 90% of users succeed with defaults
3. **Performance Impact**: <5% overhead from configuration system
4. **Power User Satisfaction**: Advanced users have needed control

## 📍 **Current System State**

### What We Have (Foundation)
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
✅ **Existing Configuration**: Basic config system with TypeScript types, validation, factory pattern

### What This Phase Adds
❌ **Configuration System**: Comprehensive configuration architecture driving all features  
❌ **Daemon Process**: Configuration-aware background service managing single multi-folder MCP server  
❌ **Multi-Folder MCP Server**: Extend current server to handle multiple folders via configuration  
❌ **Admin TUI**: Configuration-driven management interface  
❌ **CLI/TUI Parity**: Identical functionality with configuration at the core

## 🚨 **Safety Framework**

### **Backup Strategy**
```bash
# Create backup branch before starting Phase 6
git checkout -b backup/pre-phase-6
git add -A
git commit -m "Backup before Phase 6: Configuration Foundation & CLI/TUI Parity"

# Create phase branch  
git checkout -b phase-6-implementation
```

### **Rollback Plan**
```bash
# If major issues arise, return to backup
git checkout backup/pre-phase-6
git checkout -b phase-6-retry
```

## 🔍 **Pre-Implementation Review**

### **What to Review**
- Existing configuration code at `src/config/` - understand current capabilities
- Configuration interfaces and types - identify extension points
- Current validation and schema systems - plan enhancements
- Factory pattern implementation - determine reusability
- Environment variable handling - assess limitations
- Test coverage for configuration - identify gaps

### **Expected Findings**
Based on the codebase structure:
- Strong existing foundation with TypeScript types and validation
- Multi-layered config system (global → local → CLI) to extend
- Limited environment variable support (only 2 vars currently)
- No hot-reload or profile support yet
- Good schema validation that can be enhanced
- Factory pattern that can be leveraged

## 📋 **Phase Tasks Overview**

Total Tasks: 6
Estimated Duration: ~2-3 weeks

| Task # | Task Name | Complexity | Status | Command |
|--------|-----------|------------|--------|---------|
| 1 | Configuration System Foundation | High | ✅ | `/create-task-plan 6 1` |
| 2 | Basic Daemon Architecture | Medium | ✅ | `/create-task-plan 6 2` |
| 3 | Extend MCP Server for Multiple Folders | Medium | ⏳ | `/create-task-plan 6 3` |
| 4 | Configuration-Aware CLI Commands | Medium | ⏳ | `/create-task-plan 6 4` |
| 5 | Configuration-Driven TUI | Medium | ⏳ | `/create-task-plan 6 5` |
| 6 | CLI/TUI Parity Validation | Low | ⏳ | `/create-task-plan 6 6` |

### **Task Order Rationale**
1. **Task 1 (Configuration System)**: Foundation that everything else builds upon - must establish configuration hierarchy, validation, and loading before any other component can use it
2. **Task 2 (Daemon Architecture)**: Uses configuration system from Task 1 to drive all daemon behavior - can't be configuration-driven without Task 1
3. **Task 3 (Multi-Folder MCP)**: Extends existing server using configuration for folder management - needs daemon from Task 2 to manage its lifecycle
4. **Task 4 (CLI Commands)**: Exposes configuration management to users - needs working configuration system and daemon to interact with
5. **Task 5 (TUI Interface)**: Mirrors CLI functionality for consistency - builds on CLI commands to ensure parity
6. **Task 6 (Parity Validation)**: Final validation that both interfaces work identically - can only validate after both are complete

## 🔗 **Dependencies & Related Work**

### Prerequisite Phases
- **Phase 1-5**: Foundation with 9 working MCP endpoints, file processing, embeddings, and Claude Desktop integration
- **Completed Components**: MCP server, file processing pipeline, FAISS search, TUI framework
- **Existing Configuration**: Basic config system to review and extend

### Inter-Task Dependencies
- **Task 1**: Creates configuration system that all other tasks depend on
- **Task 2**: Uses configuration system to manage daemon lifecycle
- **Task 3**: Extends MCP server using configuration for multi-folder support
- **Task 4**: CLI commands use configuration manager from Task 1
- **Task 5**: TUI uses configuration system and depends on CLI commands for parity
- **Task 6**: Validates that Tasks 4 and 5 achieved functional parity

### Future Dependencies
- **Phase 7**: Enhanced features will build on configuration foundation
- **Phase 8**: Remote access will use configuration for authentication and transport
- **Phase 9**: Advanced features will be configuration-driven
- **All future development**: Every new feature must be configuration-aware

### External Dependencies
- **Ollama**: For embeddings (existing)
- **FAISS**: For vector search (existing)
- **Express.js**: For SSE server (Phase 8)
- **Cloudflare**: For tunnels (Phase 8)

## 🎯 **Implementation Order**

### Sequential Execution Plan:
1. **Configuration System Foundation**: Create the core configuration infrastructure with hierarchy, validation, profiles, and hot-reload
2. **Basic Daemon Architecture**: Build daemon that reads and respects configuration for all behavior
3. **Extend MCP Server for Multiple Folders**: Modify existing server to be multi-folder aware using configuration
4. **Configuration-Aware CLI Commands**: Add configuration management commands to CLI
5. **Configuration-Driven TUI**: Create TUI that mirrors CLI functionality
6. **CLI/TUI Parity Validation**: Verify both interfaces provide identical capabilities

### Task Dependencies:
- Task order defines dependencies (Task 2 depends on Task 1, etc.)
- Each task assumes all previous tasks are complete
- No parallel execution - pure linear progress
- Clear handoff points between tasks
- Measurable progress: X/6 tasks = Y% complete

## 📚 **Key Implementation Details from Roadmap**

### Configuration Architecture

**Configuration Hierarchy**:
1. **Defaults**: Smart defaults embedded in code that work for 90% of users
2. **System Config**: `/etc/folder-mcp/config.yaml` for system-wide settings (optional)
3. **User Config**: `~/.folder-mcp/config.yaml` for user preferences  
4. **Environment**: Override any setting via `FOLDER_MCP_*` environment variables
5. **Runtime**: CLI flags and TUI settings override everything

**Configuration Principles**:
- **Progressive Disclosure**: Simple users see simple options, advanced users can access everything
- **Strategy Pattern**: All major components pluggable via configuration
- **Feature Flags**: Enable/disable features without code changes
- **Performance Tuning**: Every performance parameter exposed in config
- **Zero Config**: Works perfectly with no configuration file
- **Config Validation**: Comprehensive validation with helpful error messages
- **Live Reload**: Changes apply without restart where possible
- **Smart Defaults**: Sensible defaults that maximize functionality
- **Simple Transport**: Following Crawl4AI, only stdio and SSE transports supported

**Core Configuration Structure**:
The configuration system uses a hierarchical YAML structure with these main sections:
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

## 📊 **Phase Progress Tracking**

### **Overall Status**
- [ ] Phase backup created
- [ ] Phase documentation reviewed
- [x] All task plans generated
- [x] Task 1: Configuration System Foundation
- [x] Task 2: Basic Daemon Architecture
- [ ] Task 3: Extend MCP Server for Multiple Folders
- [ ] Task 4: Configuration-Aware CLI Commands
- [ ] Task 5: Configuration-Driven TUI
- [ ] Task 6: CLI/TUI Parity Validation

### **Phase Metrics**
| Metric | Target | Current | Status | Progress |
|--------|--------|---------|--------|----------|
| Tasks Completed | 6 | 2 | 🟡 | 33% |
| Test Coverage | 80%+ | - | ⏳ | - |
| Documentation | Complete | - | ⏳ | - |
| Time Elapsed | 14-21 days | 0 | ⏳ | 0% |

### **Linear Progress Bar**
```
■■□□□□ 2/6 Tasks (33%)
```

### **Phase Completion Log**
| Task | Status | Completion Date | Key Decisions/Findings |
|------|--------|-----------------|------------------------|
| Pre-Implementation Review | ✅ | 2025-07-05 | Reviewed existing config system, found strong foundation |
| Task 1: Configuration System Foundation | ✅ | 2025-07-05 | Comprehensive configuration system with hierarchy, validation, hot-reload |
| Task 2: Basic Daemon Architecture | ✅ | 2025-07-05 | Event-driven daemon with 127 tests, full process management |
| Task 3: Extend MCP Server for Multiple Folders | ⏳ | - | - |
| Task 4: Configuration-Aware CLI Commands | ⏳ | - | - |
| Task 5: Configuration-Driven TUI | ⏳ | - | - |
| Task 6: CLI/TUI Parity Validation | ⏳ | - | - |

### **Milestone Tracking**
| Milestone | Date | Notes |
|-----------|------|-------|
| Phase Started | 2025-07-05 | Configuration Foundation phase initiated |
| First Task Complete | 2025-07-05 | Configuration System Foundation completed |
| 50% Complete | - | - |
| All Tasks Complete | - | - |
| Phase Review | - | - |

## 🔍 **Phase-Specific Context**

### Key Architecture Concepts

The Configuration Manager is the heart of Phase 6, driving all other components:

1. **Configuration Loading Pipeline**:
   - Read defaults from code
   - Load system config from `/etc/folder-mcp/config.yaml`
   - Load user config from `~/.folder-mcp/config.yaml`
   - Apply environment variable overrides
   - Apply runtime flags

2. **Configuration Schema**:
   - Uses JSON Schema for validation
   - Provides helpful error messages
   - Supports nested configuration
   - Allows partial updates

3. **Live Configuration Updates**:
   - Some settings can be changed without restart
   - Others require daemon restart
   - Configuration manager handles both cases

### Configuration Examples

Example minimal configuration:
```yaml
# ~/.folder-mcp/config.yaml
folders:
  - path: ~/Documents
    name: "My Documents"
  - path: ~/Projects
    name: "Code Projects"
    embeddings:
      backend: direct  # Override for this folder
```

Example advanced configuration:
```yaml
# ~/.folder-mcp/config.yaml
general:
  autoStart: true
  logLevel: info
  
daemon:
  port: 3456
  healthCheck:
    interval: 30
    timeout: 5
    
embeddings:
  backend: auto
  hardware:
    preferGPU: true
    maxMemory: 4096
    
folders:
  defaults:
    exclude:
      - "node_modules"
      - ".git"
      - "*.tmp"
  list:
    - path: ~/Documents
      name: "My Documents"
    - path: ~/Projects
      name: "Code Projects"
      embeddings:
        backend: ollama
        model: "nomic-embed-text"
        
ui:
  theme: dark
  animations: true
  
features:
  topicDiscovery: false  # Not yet implemented
  remoteAccess: false    # Phase 8
```

### Related Roadmap Sections

This phase establishes the foundation that all future phases will build upon. The configuration system is not just a feature - it's the architectural principle that enables:

- **Phase 7**: Enhanced features controlled by configuration
- **Phase 8**: Remote access configuration, security settings
- **Phase 9**: Advanced feature flags and performance tuning
- **Phase 10**: Configuration migration and documentation

## ✅ **Phase Validation**

### Build Validation
```bash
npm run build
# Expected: 0 errors after phase completion
```

### Test Suite Validation
```bash
npm test
# Expected: All existing tests pass + new tests added
```

### Feature Validation
```bash
# Test configuration loading
folder-mcp config validate

# Test daemon with configuration
folder-mcp daemon start
folder-mcp daemon status

# Test multi-folder support
folder-mcp add ~/Documents
folder-mcp add ~/Projects
folder-mcp list

# Test CLI configuration commands
folder-mcp config get
folder-mcp config set embeddings.backend direct

# Test TUI
folder-mcp tui
# Navigate to settings panel and verify configuration
```

## 📝 **Phase Completion Checklist**

Before marking this phase complete:
- [ ] All tasks completed and validated
- [ ] No regression in existing functionality  
- [ ] Documentation updated
- [ ] Tests added for new features
- [ ] Phase review conducted
- [ ] Next phase dependencies satisfied

**Phase 6 Completion Review**:
After completing all Phase 6 tasks, conduct mandatory review:
- **Configuration Completeness**: Does configuration cover all aspects?
- **User Experience**: Is configuration approachable for new users?
- **Power User Features**: Do advanced users have enough control?
- **Performance Impact**: Does configuration system add overhead?
- **Document Updates**: Update future phases based on configuration architecture

## 🚀 **Next Steps**

After completing this phase:
1. Run `/create-phase-plan 7` for Phase 7: Enhanced UX & Core Features
2. Conduct phase retrospective
3. Update roadmap with actual timings

---

**To implement individual tasks, use:**
```
/create-task-plan 6 1  # Start with first task
```