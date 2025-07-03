# folder-mcp Implementation Plan

## Phase 0: Current State & Required Changes Overview

### **What We Have Now (Foundation)**
✅ **Comprehensive MCP Server**: Advanced v2.0 endpoint system (redesigned December 2024)  
✅ **9 Production MCP Endpoints**: Complete document intelligence API  
✅ **Claude Desktop Integration**: Fully working with 277 tests passing  
✅ **Dual-Protocol Architecture**: MCP (stdio) + gRPC (Unix sockets) both operational  
✅ **Real Integration Testing**: Comprehensive test suite with actual business documents  
✅ **File Processing Pipeline**: PDF, DOCX, XLSX, PPTX, TXT, MD with embeddings  
✅ **FAISS Vector Search**: Semantic search with Ollama GPU acceleration  
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

### **What We Need to Build**
❌ **Daemon Process**: Background service managing single multi-folder MCP server  
❌ **Multi-Folder MCP Server**: Extend current server to handle multiple folders  
❌ **Admin TUI**: Full-featured management interface  
❌ **CLI/TUI Parity**: Identical functionality in both interfaces  
❌ **Auto-Start**: Daemon starts on user login, persists across reboots  
❌ **Cloudflare Tunnel**: Remote access without port forwarding  

### **Architecture Transformation**
```bash
# FROM: Manual single-folder (current)
node dist/mcp-server.js ~/Documents
# → 9 MCP endpoints serve one folder

# TO: Daemon-managed multi-folder (target)
folder-mcp                    # Opens TUI or manages daemon
Daemon → Single MCP Server → Multiple folders
                           ├── ~/Documents/.folder-mcp/
                           ├── ~/Projects/.folder-mcp/  
                           └── ~/Photos/.folder-mcp/
# → Same 9 MCP endpoints serve multiple folders
```

### **Current Strengths to Preserve**
✅ **Proven MCP Endpoints**: Already handle code files excellently via `search` endpoint  
✅ **Rich Metadata System**: Location info, content snippets, structured responses  
✅ **Token Management**: Proper pagination and response sizing for LLMs  
✅ **Error Handling**: Robust error recovery and validation  
✅ **Performance**: Optimized for large documents and complex queries  
✅ **Real-World Tested**: 36+ business documents in test suite validate functionality

## Component Definitions & Terminology

This section establishes the common terminology used throughout this document.

### Core Components

**Daemon**  
A background process that runs continuously and manages the lifecycle of a single multi-folder MCP server. It handles process spawning, auto-start, configuration persistence, and provides both CLI and TUI interfaces. The daemon is the single source of truth for what folders are shared and their status.

**MCP Server**  
A single process that serves multiple folders via the Model Context Protocol. The MCP server handles indexing, embedding generation, and query responses for all assigned folders. It loads multiple `.folder-mcp/` caches and routes queries appropriately.

**CLI (Command Line Interface)**  
The command-line tool that users invoke via `folder-mcp`. It provides identical functionality to the TUI but in headless mode. The CLI always communicates with the daemon and can perform all operations that the TUI can perform.

**TUI (Terminal User Interface)**  
The interactive, full-screen terminal interface built with existing Ink framework. The TUI provides:
- Rich UI components (inputs, lists, progress bars, file browsers)
- Global keyboard handling and navigation
- Responsive boxed containers that adapt to terminal size
- Smooth animations and transitions
- Status bar for displaying app state and keyboard shortcuts
- Tab-based panel switching
- Real-time updates without flicker

**CLI/TUI Parity**: Both interfaces provide identical functionality - every operation possible in TUI is available via CLI commands.

**Admin Screen (Management Console)**  
The main TUI screen that displays all shared folders in a table format with their status, model, and port information. From here, users can add/remove folders, view logs, and manage the system. This is the "home" screen for managing multiple folders.

**Configuration Wizard**  
The initial TUI flow that guides users through sharing their first folder. It includes hardware detection, model selection, and folder selection steps. Designed for non-technical users.

### Operational Terms

**Shared Folder**  
A directory on the filesystem that has been indexed and is being served by an MCP server. Each shared folder has its own port, model choice, and MCP server process.

**Model**  
The sentence transformer model used to generate embeddings. We use user-friendly names (fast/balanced/accurate) that map to actual model names (all-MiniLM-L6-v2, nomic-embed-text, mxbai-embed-large).

**Embedding**  
A numerical vector representation of text that enables semantic search. Generated by the model for each chunk of text in the shared folders.

**Client**  
An AI application that connects to MCP servers (Claude Desktop, VS Code, Cursor, etc.). Clients use the MCP protocol to query shared folders and retrieve context.

The framework handles the complexity of terminal rendering, allowing focus on application logic.

## Project Goal

Create a daemon-based system that manages multiple MCP servers for shared folders, with TUI/CLI interfaces, smart model selection, and support for various AI clients (Claude Desktop, VS Code, etc.).

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   User Interfaces                        │
├───────────────────────────┬─────────────────────────────┤
│           CLI             │            TUI              │
│      (headless)           │       (interactive)         │
│                           │                             │
│   folder-mcp add ~/docs   │    ┌─┐ Management Console  │
│   folder-mcp list         │    │ │ - Add/remove folders │
│   folder-mcp status       │    │ │ - View status        │
│   folder-mcp tunnel       │    │ │ - Configure tunnel   │
│                           │    └─┘ - Real-time updates  │
└───────────────────────────┴─────────────────────────────┘
                            │
                       ┌────▼────┐
                       │ Daemon  │ ← Config & State
                       │ Process │    (~/.folder-mcp/)
                       └────┬────┘
                            │ Manages Single
                            ▼
                    ┌───────────────┐
                    │   MCP Server  │ ← Handles Multiple Folders
                    │   (One Only)  │
                    └───────┬───────┘
                            │ Serves
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
    [~/Documents]       [~/Projects]        [~/Photos]
    .folder-mcp/        .folder-mcp/        .folder-mcp/
    ├── vectors/        ├── vectors/        ├── vectors/
    ├── embeddings/     ├── embeddings/     ├── embeddings/
    └── metadata/       └── metadata/       └── metadata/
```

### Component Responsibilities

**Daemon Process**
- Lifecycle management of single MCP server
- Auto-start on user login  
- Configuration persistence
- Process health monitoring
- CLI and TUI interface provision

**CLI Interface**
- Parse command arguments
- Communicate with daemon
- Provide all TUI functionality in headless mode
- Support automation and scripting

**TUI Interface**
- Interactive management console
- Real-time status display
- Progress visualization
- Folder management workflow

**MCP Server (Single Instance)**
- Load multiple `.folder-mcp/` indexes
- Route queries to appropriate folders
- Aggregate results across folders  
- Handle file watching for all folders
- Serve MCP protocol to clients

## UX-Led Development Philosophy

**Core Principle**: Every feature is designed from the user experience first, then implemented to support that experience.

### **Development Approach**
1. **CLI/TUI Parity First**: Get both interfaces working identically
2. **Instant Feedback**: Always have working UX to test features
3. **User Story Driven**: Each feature starts with "As a user, I want..."
4. **Incremental UX**: Build features in small, testable UX increments
5. **Adaptive Planning**: Embrace change as a way of life in development

### **Adaptive Planning Methodology**

**Reality**: Long tasks change frequently during execution as we learn and discover better approaches.

**Approach**: After each task completion, we review implications and update future phases to reflect:
- **New learnings** from implementation
- **Better approaches** discovered during development  
- **Changed requirements** based on UX testing
- **Technical discoveries** that impact future tasks

**Process**:
```bash
1. Complete Task N
2. Test & validate with real users  
3. REVIEW: How does this change Tasks N+1, N+2, etc.?
4. UPDATE: Modify future tasks based on learnings
5. COMMIT: This document remains our source of truth
```

**Benefits**:
- Plan stays current and actionable
- Prevents building on obsolete assumptions
- Incorporates learning from each development cycle
- Ensures document remains useful throughout project

### **Testing Strategy**
- **Automated Tests**: Every component and integration tested
- **Manual E2E Tests**: User story validation for each feature
- **UX Validation**: Real user workflows tested at each phase
- **Impact Review**: Assessment of changes on future phases

## Phase 1: CLI/TUI Parity Foundation

**Goal**: Achieve identical functionality between CLI and TUI interfaces with basic daemon management

### **User Stories**
- **As a user, I want to add a folder to be shared**: `folder-mcp add ~/Documents`
- **As a user, I want to see all shared folders**: `folder-mcp list`
- **As a user, I want to remove a folder**: `folder-mcp remove ~/Documents`
- **As a user, I want to see daemon status**: `folder-mcp status`
- **As a user, I want the same operations in TUI**: `folder-mcp` opens admin screen

### Task 1: Basic Daemon Architecture

**Goal**: Create daemon that manages single multi-folder MCP server

**Scope**:
- Background daemon process
- Single MCP server management (not multiple)
- Process lifecycle (start/stop/restart)
- State persistence in ~/.folder-mcp/daemon-state.json

**Completion Criteria**:
- [ ] Daemon starts and runs in background
- [ ] Can spawn single MCP server with multiple folders
- [ ] Tracks MCP server PID and status
- [ ] Graceful shutdown on SIGTERM
- [ ] Auto-restart MCP server if it crashes

**Testing**:
- **Automated**: Daemon startup, MCP server spawning, process monitoring
- **Manual E2E**: Start daemon, verify MCP server responds, stop daemon cleanly

### Task 2: Extend MCP Server for Multiple Folders

**Goal**: Modify existing MCP server to handle multiple folders instead of one

**Scope**:
- Extend current MCP server to accept folder array
- Load multiple `.folder-mcp/` indexes
- Route queries to appropriate folders
- Aggregate search results across folders

**Completion Criteria**:
- [ ] MCP server accepts multiple folder paths
- [ ] Loads all folder indexes on startup
- [ ] Search queries return results from all folders
- [ ] File watching works for all folders
- [ ] Maintains existing MCP protocol compatibility

**Testing**:
- **Automated**: Multi-folder indexing, cross-folder search, file watching
- **Manual E2E**: Add multiple folders, search across them, verify results

### Task 3: Basic CLI Commands

**Goal**: Implement core CLI commands for daemon management

**Scope**:
- `folder-mcp add <folder>` - Add folder to daemon
- `folder-mcp remove <folder>` - Remove folder from daemon  
- `folder-mcp list` - List all shared folders
- `folder-mcp status` - Show daemon and MCP server status
- `folder-mcp start/stop/restart` - Daemon lifecycle

**Completion Criteria**:
- [ ] All commands work headlessly
- [ ] Proper error handling and user feedback
- [ ] Structured output for scripting
- [ ] Help system for all commands
- [ ] Exit codes for automation

**Testing**:
- **Automated**: All CLI commands with various scenarios
- **Manual E2E**: Full user workflow via CLI only

### Task 4: Basic TUI Admin Screen

**Goal**: Create TUI interface with identical functionality to CLI

**Scope**:
- Management console showing shared folders
- Add/remove folder operations
- Status display with real-time updates
- Progress indicators
- Keyboard navigation

**Completion Criteria**:
- [ ] TUI provides all CLI functionality
- [ ] Real-time status updates
- [ ] Add/remove folders via TUI
- [ ] Visual progress indicators
- [ ] Responsive layout

**Testing**:
- **Automated**: TUI component testing
- **Manual E2E**: Same user workflows as CLI but via TUI

### Task 5: CLI/TUI Parity Validation

**Goal**: Ensure both interfaces are functionally identical

**Scope**:
- Cross-validation of all operations
- Identical user workflows
- Consistent error handling
- Performance parity

**Completion Criteria**:
- [ ] Every CLI operation available in TUI
- [ ] Every TUI operation available in CLI
- [ ] Same error messages and handling
- [ ] Same performance characteristics
- [ ] Documentation parity

**Testing**:
- **Automated**: Parity test suite comparing CLI and TUI outputs
- **Manual E2E**: User story validation in both interfaces

**Phase 1 Success Criteria**:
- User can manage folders identically via CLI or TUI
- Daemon persists across reboots
- All operations work seamlessly
- Solid foundation for feature development

**Phase 1 Completion Review**:
After completing all Phase 1 tasks, conduct mandatory review:
- **User Experience**: Does CLI/TUI parity work as expected in practice?
- **Technical Learnings**: What did we discover about daemon architecture?
- **Performance**: Are there bottlenecks that affect future phases?
- **Scope Changes**: Do any Phase 2+ tasks need modification based on learnings?
- **Document Updates**: Revise future phases based on implementation reality

## Phase 2: Enhanced UX & Core Features

**Goal**: Build upon CLI/TUI parity to add advanced features

### **User Stories**
- **As a user, I want to see indexing progress**: Real-time progress bars
- **As a user, I want to configure embedding models**: Model selection and management
- **As a user, I want to monitor system health**: CPU, memory, disk usage
- **As a user, I want to handle errors gracefully**: Clear error messages and recovery

### Task 6: Progress & Status System

**Goal**: Real-time feedback on all operations

**Scope**:
- Progress bars for indexing, embedding generation
- Real-time status updates
- System resource monitoring
- Operation history and logs

**Completion Criteria**:
- [ ] Progress bars for all long operations
- [ ] Real-time status in both CLI and TUI
- [ ] System health monitoring
- [ ] Error state visualization
- [ ] Operation history

**Testing**:
- **Automated**: Progress tracking, status updates
- **Manual E2E**: User observes progress for large folder operations

### Task 7: Intelligent Model Management

**Goal**: Device-specific model recommendations with language optimization

**Language Strategy**:
- **Default**: Always select strongest multilingual model that can run on user's machine
- **Optional Enhancement**: Folder setup wizard asks about content languages
- **Specialized Models**: Offer more powerful language-specific models (e.g., English-only for better performance)
- **HuggingFace Integration**: Fetch model metadata, capabilities, and language support from HuggingFace

**Scope**:
- Device capability detection (CPU, GPU, memory)
- HuggingFace API integration for model metadata
- Multilingual model prioritization by default
- Optional folder-specific language configuration
- Specialized model recommendations for known languages
- BitNet fallback for very weak machines
- Model switching with impact warnings

**Completion Criteria**:
- [ ] Device capability detection (GPU presence, memory, CPU cores)
- [ ] HuggingFace integration for model metadata and language support
- [ ] Default multilingual model selection based on hardware
- [ ] Optional folder setup wizard with language selection
- [ ] English-only and other language-specific model recommendations
- [ ] BitNet integration for low-end devices
- [ ] Model switching workflow with re-indexing warnings
- [ ] Performance validation for each model tier

**Implementation Notes**:
- **Safe Default**: Multilingual models work for any content without user configuration
- **Power User Option**: Advanced users can optimize for specific languages
- **Future-Proof**: HuggingFace integration provides access to latest models
- **Performance Trade-off**: Specialized models vs. universal compatibility

**Testing**:
- **Automated**: Device detection, HuggingFace API, model selection logic, BitNet fallback
- **Manual E2E**: User on different hardware gets appropriate recommendations, language-specific optimization works

### Task 8: Version Control & Update System

**Goal**: Easy version management and seamless user updates

**User Story**: *"From developer releases version → user updates easily"*

**Scope**:
- Version display in TUI and CLI (current vs latest)
- Update notification system (check for new releases)
- TUI "upgrade" button and CLI `--update` command
- **Innovative MCP Update Path**: Endpoints notify agents about outdated versions
- LLM-mediated updates: Claude asks "Would you like me to update folder-mcp?"
- Update MCP endpoint for agent-triggered updates
- Re-embedding trigger for breaking changes (no backwards compatibility)

**Completion Criteria**:
- [ ] Version display shows current vs latest in TUI/CLI
- [ ] Update checking works reliably
- [ ] TUI upgrade button and CLI `--update` command functional
- [ ] MCP endpoints include version metadata for agent notifications
- [ ] Update MCP endpoint allows agent-triggered updates
- [ ] Breaking changes trigger automatic re-embedding
- [ ] Smooth update experience across all interfaces

**Testing**:
- **Automated**: Update checking, version comparison, re-embedding triggers
- **Manual E2E**: User updates via TUI, CLI, and Claude-mediated MCP update

### Task 9: Auto-Config Placement & Client Support

**Goal**: Automatic MCP client configuration management

**Scope**:
- Auto-generate and place Claude Desktop config JSON
- Auto-generate and place VSCode MCP config
- Support for other MCP clients
- Automatic config file placement (no manual copy/paste)
- Config validation and error handling

**Completion Criteria**:
- [ ] Claude Desktop config automatically placed in correct location
- [ ] VSCode MCP config automatically generated and placed
- [ ] Support for multiple MCP client types
- [ ] Config file validation and error reporting
- [ ] Easy config regeneration when settings change

**Testing**:
- **Automated**: Config generation, file placement, validation
- **Manual E2E**: User connects Claude Desktop and VSCode without manual config

### Task 10: Configuration Management

**Goal**: Comprehensive configuration system

**Scope**:
- Configuration wizard for new users
- Advanced configuration options
- Configuration validation
- Settings import/export

**Completion Criteria**:
- [ ] First-run configuration wizard
- [ ] Advanced settings panel
- [ ] Configuration validation
- [ ] Settings backup/restore
- [ ] Migration handling

**Testing**:
- **Automated**: Configuration operations, validation
- **Manual E2E**: New user setup, configuration changes

**Phase 2 Completion Review**:
After completing all Phase 2 tasks, conduct mandatory review:
- **UX Quality**: Do users find the enhanced features intuitive?
- **Performance Impact**: How do new features affect system performance?
- **Integration Points**: Do enhanced features work well with Phase 1 foundation?
- **Remote Access Readiness**: Are we properly prepared for Phase 3 complexity?
- **Document Updates**: Revise Phases 3+ based on Phase 2 learnings

## Phase 3: Remote Access & Production Features

**Goal**: Enable remote access and production-ready features

### **User Stories**
- **As a user, I want to access my folders remotely**: Cloudflare tunnel setup
- **As a user, I want secure remote access**: Authentication and security
- **As a user, I want reliable operation**: Auto-recovery and monitoring

### Task 9: Cloudflare Tunnel Integration

**Goal**: Seamless remote access setup

**Scope**:
- Cloudflare tunnel client integration
- Domain management
- SSL/TLS configuration
- Connection monitoring

**Completion Criteria**:
- [ ] Tunnel setup wizard
- [ ] Domain configuration
- [ ] SSL certificate management
- [ ] Connection health monitoring
- [ ] Automatic reconnection

**Testing**:
- **Automated**: Tunnel operations, connection handling
- **Manual E2E**: User sets up remote access, tests from different device

### Task 10: Security & Authentication

**Goal**: Secure remote access

**Scope**:
- API key generation and management
- Access control and rate limiting
- Audit logging
- Security configuration

**Completion Criteria**:
- [ ] API key management UI
- [ ] Access control configuration
- [ ] Rate limiting setup
- [ ] Audit log viewing
- [ ] Security validation

**Testing**:
- **Automated**: Security operations, authentication
- **Manual E2E**: User configures security, tests access control

### Task 12: VSCode 1.101 MCP Integration

**Goal**: Optimize folder-mcp for VSCode 1.101 advanced MCP features

**Scope**:
- Tool organization with icon sets and grouping
- Development mode with hot reload (no more restarts)
- Resource save/drag functionality for search results
- Enhanced context integration (current file awareness)
- VSCode-specific prompt templates and slash commands
- Agent mode integration for seamless workflow

**Completion Criteria**:
- [ ] Tool sets working with icons and descriptions
- [ ] Development mode enables hot reload
- [ ] Search results can be saved/dragged to editor
- [ ] Context integration works with active files
- [ ] VSCode-specific MCP optimizations functional
- [ ] Smooth development workflow in VSCode

**Testing**:
- **Automated**: VSCode integration features, tool organization
- **Manual E2E**: Developer uses folder-mcp seamlessly within VSCode workflow

### Task 13: Production Readiness

**Goal**: Reliable production operation

**Scope**:
- Auto-start configuration
- Error recovery and monitoring
- Performance optimization
- Backup and restore

**Completion Criteria**:
- [ ] Cross-platform auto-start
- [ ] Comprehensive error recovery
- [ ] Performance monitoring
- [ ] Backup automation
- [ ] Health checks

**Testing**:
- **Automated**: Production scenarios, error recovery
- **Manual E2E**: User tests full production workflow

**Phase 3 Completion Review**:
After completing all Phase 3 tasks, conduct mandatory review:
- **Production Readiness**: Is the system truly production-ready?
- **Security Posture**: Are remote access security measures sufficient?
- **User Adoption**: How easily can users set up remote access?
- **Performance Under Load**: How does the system perform with real remote usage?
- **Document Updates**: Revise Phases 4+ based on production experience

## Phase 4: Advanced Features & Polish

**Goal**: Advanced features and final polish

### **User Stories**
- **As a user, I want advanced search features**: Filters, sorting, export
- **As a user, I want file format support**: More document types
- **As a user, I want performance optimization**: Large folder handling

### Task 12: Advanced Search Features

**Goal**: Powerful search capabilities

**Scope**:
- Advanced search filters
- Search result export
- Search history and saved searches
- Search performance optimization

**Completion Criteria**:
- [ ] Advanced filtering options
- [ ] Search result export
- [ ] Search history management
- [ ] Performance optimization
- [ ] Search analytics

**Testing**:
- **Automated**: Search operations, filtering
- **Manual E2E**: User performs complex searches

### Task 13: Extended File Format Support

**Goal**: Support for more document types

**Scope**:
- Legacy Office formats (.doc, .xls, .ppt)
- eBook formats (.epub, .mobi)
- Rich text formats (.rtf, .odt)
- Source code files
- Image OCR capability

**Completion Criteria**:
- [ ] Support for all planned formats
- [ ] Graceful handling of corrupted files
- [ ] Format-specific metadata extraction
- [ ] Performance optimization
- [ ] Error reporting for unsupported formats

**Testing**:
- **Automated**: File format processing
- **Manual E2E**: User indexes folders with various file types

### Task 14: Code Intelligence Enhancement

**Goal**: Enhance existing MCP endpoints with code-specific intelligence

**User Story**: *"Look at my backend, what's the path for my add customer endpoint?"*

**Current Foundation**: 
- ✅ **`search` endpoint already works for code** - semantic and regex search across all files
- ✅ **Rich metadata system** - location info, content snippets, file paths
- ✅ **`get_document_data` endpoint** - can extract content with metadata
- ✅ **Real-world tested** - current system handles various file types including code

**Enhancement Areas**:
- **Enhanced File Parsing**: Add AST parsing to existing file processing pipeline
- **Code-Specific Metadata**: Extract routes, functions, classes in metadata field
- **Structured Code Responses**: Enhance existing search results with code structure
- **Framework Detection**: Identify Express.js, FastAPI, Spring Boot patterns
- **API Endpoint Mapping**: Parse route definitions into searchable metadata

**Implementation Approach**:
```typescript
// Enhance existing file parsing service
fileParsingService.parse(codeFile) → {
  content: "app.post('/customers', addCustomerHandler)", // Already working
  metadata: {
    type: "code",
    language: "javascript",
    routes: [{ method: "POST", path: "/customers", handler: "addCustomerHandler" }], // NEW
    functions: ["addCustomerHandler", "validateCustomer"], // NEW
    // This enhanced metadata flows into existing search system
  }
}

// Existing search endpoint automatically returns enhanced results
search(query: "add customer endpoint") → {
  results: [{
    content: "app.post('/customers', addCustomerHandler)",
    metadata: { routes: [...], functions: [...] }, // Enhanced
    location: { file: "routes.js", line: 23 } // Already working
  }]
}
```

**Research Questions**:
- Which AST parsing libraries integrate best with current file processing pipeline?
- How to reliably detect API frameworks in the metadata extraction phase?
- What code metadata provides most value in search results?
- How to handle different project structures without breaking existing functionality?

**Completion Criteria**:
- [ ] Enhanced file parsing integrates with existing pipeline
- [ ] Code metadata extraction working for major languages (JS/TS, Python, Go)
- [ ] API endpoint detection enhances existing search results
- [ ] Current MCP endpoints (`search`, `get_document_data`) return richer code information
- [ ] Performance remains optimal with existing large codebase handling

**Testing**:
- **Automated**: Enhanced parsing integrates with existing 277-test suite
- **Manual E2E**: Developer asks "find add customer endpoint" via existing Claude Desktop integration, gets enhanced results

### Task 15: Legacy Format Support & Advanced File Processing

**Goal**: Comprehensive support for all document types users might have

**Scope**:
- **Legacy Office Formats**: .doc, .xls, .ppt, .rtf, .odt, .ods, .odp
- **eBook Formats**: .epub, .mobi, .azw, .fb2
- **Archive Support**: .zip, .rar (extract and index contents)
- **Code Files**: .py, .js, .ts, .java, .cpp, .cs, .php, .go, .rs, .rb
- **Data Formats**: .csv, .tsv, .json, .xml, .yaml
- **Web Formats**: .html, .htm, .xml
- **Performance optimization** for large format variety

**Completion Criteria**:
- [ ] All legacy formats extract text correctly
- [ ] Archive extraction and recursive indexing
- [ ] Enhanced code file handling with syntax awareness
- [ ] Data format parsing and structure preservation
- [ ] Graceful handling of corrupted files
- [ ] Performance maintained across all formats

**Testing**:
- **Automated**: Format processing, extraction accuracy, performance
- **Manual E2E**: User indexes folders with diverse file types

### Task 16: Image Processing Research & Implementation

**Goal**: Research and implement local image processing capabilities

**Research Scope**:
- **Local OCR Solutions**: Tesseract OCR, PaddleOCR integration
- **Vision Models**: LLaVA, CLIP via Ollama for local processing
- **Document Analysis**: Layout detection, table extraction from scanned docs
- **Performance Assessment**: Speed vs accuracy trade-offs for local processing
- **Integration Strategy**: How to incorporate into existing file processing pipeline

**Implementation Scope**:
- OCR integration for scanned documents
- Basic image content extraction
- Document layout understanding
- Image metadata extraction

**Completion Criteria**:
- [ ] Research findings documented with recommendations
- [ ] Local OCR working for common image formats
- [ ] Vision model integration assessed
- [ ] Image content indexed and searchable
- [ ] Performance acceptable for typical use cases

**Testing**:
- **Automated**: Image processing accuracy, performance benchmarks
- **Manual E2E**: User searches for content in scanned documents and images

### Task 17: Performance & Scalability

**Goal**: Handle large folders efficiently

**Scope**:
- Parallel processing optimization
- Memory usage optimization
- Large folder handling
- Performance monitoring

**Completion Criteria**:
- [ ] Efficient large folder processing
- [ ] Memory usage optimization
- [ ] Performance monitoring
- [ ] Resource usage reporting
- [ ] Scalability testing

**Testing**:
- **Automated**: Performance benchmarks, scalability tests
- **Manual E2E**: User processes very large folders

### Task 18: Chat with Your Data

**Goal**: LangChain-powered chat interface for conversational data interaction

**User Stories**:
- **As a user, I want to chat with my documents**: "Summarize last quarter's performance from all reports"
- **As a user, I want both cloud and local AI**: Choose between OpenAI/Anthropic or local Ollama models
- **As a user, I want context-aware conversations**: Chat remembers previous questions and folder context
- **As a user, I want to export chat sessions**: Save important conversations and insights

**Scope**:
- LangChain integration with MCP server as data source
- Cloud provider support (OpenAI, Anthropic, etc.)
- Local LLM integration (Ollama for privacy-focused users)
- Chat session management and history
- Context-aware conversation with folder data
- Chat export functionality

**Completion Criteria**:
- [ ] LangChain integration with folder-mcp MCP endpoints
- [ ] Cloud AI provider integration (OpenAI, Anthropic)
- [ ] Local Ollama chat model integration
- [ ] Chat interface in both CLI and TUI
- [ ] Session history and export functionality
- [ ] Context management across conversations

**Testing**:
- **Automated**: Chat integration, provider switching, session management
- **Manual E2E**: User has meaningful conversations with their data

**Phase 4 Completion Review**:
After completing all Phase 4 tasks, conduct mandatory review:
- **Feature Completeness**: Do advanced features deliver expected value?
- **Performance Optimization**: Are large folder operations truly optimized?
- **Chat Integration**: How well does the chat feature work with real data?
- **Code Intelligence**: Does code support provide genuine developer value?
- **Legacy Format Support**: How well do diverse file types integrate?
- **Document Updates**: Revise Phase 5 based on advanced feature learnings

## Phase 5: Release & Documentation

**Goal**: Production release preparation

### Task 19: Testing & Quality Assurance

**Goal**: Comprehensive testing and quality assurance

**Scope**:
- End-to-end test suite
- Performance benchmarking
- Cross-platform testing
- Security testing

**Completion Criteria**:
- [ ] Complete test coverage
- [ ] Performance benchmarks
- [ ] Cross-platform validation
- [ ] Security audit
- [ ] Load testing

### Task 20: Documentation & Release

**Goal**: Complete documentation and release preparation

**Scope**:
- User documentation
- API documentation
- Installation guides
- Release automation

**Completion Criteria**:
- [ ] Complete user documentation
- [ ] API reference
- [ ] Installation guides
- [ ] Release automation
- [ ] Community setup

### Task 21: Help MCP Endpoint

**Goal**: Self-documenting system through MCP protocol

**User Story**: *"As a user, I want to ask Claude 'How do I use folder-mcp?' and get comprehensive help"*

**Scope**:
- Expose help system as MCP endpoint
- Comprehensive markdown documentation accessible via MCP
- All commands, features, and usage examples
- Searchable help content
- Version-specific help information
- Examples and troubleshooting guides

**Completion Criteria**:
- [ ] Help MCP endpoint appears in Claude Desktop tools
- [ ] Content comprehensive and up-to-date
- [ ] Search functionality works within help
- [ ] Examples are runnable and accurate
- [ ] Help updates automatically with new versions

**Testing**:
- **Automated**: Help endpoint functionality, content accuracy
- **Manual E2E**: User gets complete help through Claude Desktop interaction

**Phase 5 Completion Review**:
After completing all Phase 5 tasks, conduct final project review:
- **Product Market Fit**: Does the final product meet original vision?
- **User Feedback**: What do early adopters say about the complete system?
- **Technical Debt**: What technical debt should be addressed post-release?
- **Future Roadmap**: What features should be prioritized for v2.0?
- **Documentation Quality**: Is documentation sufficient for community adoption?

## Success Metrics

1. **UX Quality**: Users can accomplish all tasks through either CLI or TUI
2. **Reliability**: 99.9% uptime for daemon process
3. **Performance**: Handle 10GB+ folders efficiently
4. **Simplicity**: Non-technical users can install and use successfully
5. **Feature Completeness**: All planned features working seamlessly

---

*This plan follows UX-led development principles with CLI/TUI parity as the foundation for all feature development. The plan is designed to evolve - after each phase completion, we review learnings and update future phases to ensure this document remains our single source of truth throughout the project.*