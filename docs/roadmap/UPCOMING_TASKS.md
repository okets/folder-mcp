# folder-mcp Upcoming Tasks

This document tracks current and future development phases with detailed specifications.

## 📋 Table of Contents

- [Current Development Status](#current-development-status)
- [Phase 8: Transport Foundation & Core Endpoints (Current)](#phase-8-transport-foundation--core-endpoints-current)
- [Phase 9: Advanced Endpoints & HTTP Gateway (Planned)](#phase-9-advanced-endpoints--http-gateway-planned)
- [Phase 10: Release Preparation (Planned)](#phase-10-release-preparation-planned)
- [Phase 11: UX Refinements (Planned)](#phase-11-ux-refinements-planned)
- [Phase 12: Chat Interface Integration (Future)](#phase-12-chat-interface-integration-future)
- [GitHub Project Management](#github-project-management)

---

## Current Development Status

**Current Status**: Step 33/55 - Ready for End-to-End Testing 🧪

**✅ Recently Completed**:
- **Steps 29-32**: Transport Foundation & Complete Endpoints Implementation
  - Dual-protocol transport system (MCP + gRPC)
  - All 13 gRPC endpoints with corresponding MCP tools
  - Local Unix Domain Socket transport working
  - 277 tests passing

**⬅️ NEXT: Step 33 - End-to-End Testing**
Comprehensive testing of the complete system before adding remote access.

### Overall Timeline
- **✅ Phases 1-7**: Foundation through Production Ready (Steps 1-28) - **COMPLETED**
- **✅ Phase 8**: Transport Foundation & Core Endpoints (Steps 29-32) - **COMPLETED**
- **🔄 Phase 9**: System Testing & Remote Access (Steps 33-41) - **IN PROGRESS**
- **📋 Phase 10**: Release Preparation (Steps 42-47) - **PLANNED**
- **📋 Phase 11**: UX Refinements (Steps 48-51) - **PLANNED**
- **📋 Phase 12**: Chat Interface Integration (Steps 52-56) - **FUTURE**

---

## Phase 9: System Testing & Remote Access (Current)

**Status**: ⬅️ Current - **READY FOR TESTING** 🧪

**Focus**: Comprehensive end-to-end testing followed by secure remote access implementation.

### Step 33: End-to-End System Testing
**Task**: Comprehensive testing of the complete dual-protocol system before adding remote capabilities  
**Status**: ⬅️ **CURRENT** - Ready for implementation  
**Focus**: Validate all components work together correctly in real-world scenarios using `C:\ThinkingHomes\test-folder`

**Success Criteria**:
- 📋 **Clean Server Startup**: MCP server starts without TypeScript errors, all tests pass, server listens on expected port
- 📋 **File System Integration**: File changes trigger embedding updates within 30 seconds via filesystem watcher
- 📋 **Claude Desktop Integration**: Complete MCP tool functionality test using structured JSON response format
- 📋 **Real-World Document Testing**: Create/update test files (CIARA_REL_TEST.md) with realistic version release notes
- 📋 **Cross-Protocol Validation**: Verify MCP tools can retrieve updated document information after filesystem changes
- 📋 **Error-Free Operation**: Complete test flow executes without blocking errors (enhancement opportunities acceptable)
- 📋 **Process Management**: Proper cleanup of running instances, port conflicts, and cache directories
- 📋 **Log Analysis**: Claude Desktop logs show successful MCP function calls and data retrieval

**Implementation Plan**:
1. **Pre-Test Cleanup** (Steps 1-6): Kill MCP processes, clear port conflicts, delete cache, fresh terminal session
2. **Server Validation** (Step 7): Build verification, test suite execution, clean server startup
3. **Document Creation** (Step 8): Generate realistic test content with version increments and release notes
4. **Filesystem Integration** (Step 9): Verify file watcher triggers and embedding updates within 30 seconds
5. **Claude Desktop Testing** (Step 10): Structured JSON prompt for comprehensive MCP functionality validation
6. **Results Analysis** (Steps 11-12): Parse Claude responses, identify issues, plan improvements

**Test Environment**: Uses dedicated test folder with mock version files and realistic document scenarios to validate end-to-end functionality.

### Step 34: Remote Access & Cloud LLM Integration  
**Task**: Implement secure remote access for cloud LLM integration with multiple transport options  
**Status**: 📋 **PLANNED** - Depends on Step 33 completion  
**Focus**: Enable cloud LLM access to local folder-mcp instances with multiple connectivity options

**Success Criteria**:
- 📋 **TCP Transport**: Remote gRPC server with configurable port (50051)
- 📋 **API Key Authentication**: Bearer token validation for remote gRPC connections
- 📋 **TLS/mTLS Support**: Auto-generated self-signed certificates for development
- 📋 **Cloudflare Tunnel Integration**: Zero-config remote access without port forwarding
- 📋 **Project Subdomain Service**: Users get `username.folder-mcp.com` subdomains
- 📋 **Let's Encrypt Integration**: Automated certificate management for custom domains
- 📋 **Rate Limiting**: Per-key request throttling and abuse prevention
- 📋 **Audit Logging**: Security event tracking and monitoring
- 📋 **Certificate Management**: Auto-renewal and expiration monitoring
- 📋 **Rate Limiting**: Per-key request throttling and abuse prevention
- 📋 **Audit Logging**: Security event tracking and monitoring
- 📋 **Certificate Management**: Auto-renewal and expiration monitoring

**Note**: MCP protocol will remain local-only (stdio) as Claude Desktop requires direct process communication. Remote access applies to gRPC protocol only.

**Implementation Architecture**:
- **Cloudflare Tunnel**: Primary remote access method (no port forwarding required)
  - Wildcard domain: `*.folder-mcp.com` → automatic user subdomains
  - Reverse tunneling through Cloudflare's global network
  - Built-in DDoS protection and SSL certificate management
  - Comprehensive analytics dashboard for usage monitoring
- **Alternative Methods**: ngrok integration for users preferring different providers
- **Hybrid Security**: Local connections bypass auth, remote connections require API keys
- **Zero-Config UX**: `folder-mcp serve /docs --tunnel --subdomain alice` → instant cloud access

**Key Technical Components**:
- **TCP Transport Layer**: Extend existing gRPC server with TCP binding
- **Certificate Strategy**: 
  - Self-signed certificates for local development and testing
  - CA-signed certificates (Let's Encrypt/Cloudflare) for production tunneling
  - Automatic certificate provisioning and renewal
- **Tunneling Integration**:
  - Cloudflare Tunnel SDK integration with automatic authentication
  - Dynamic subdomain allocation and DNS record management
  - Tunnel health monitoring and automatic reconnection
  - Fallback to alternative providers (ngrok, localtunnel)
- **Authentication System**: 
  - API key validation for all remote connections
  - Rate limiting and abuse prevention per key
  - Audit logging for security events and access patterns
  - Key lifecycle management (generation, rotation, revocation)

**Cloud LLM Integration Benefits**:
- **Zero Network Configuration**: No router setup, firewall rules, or port forwarding
- **Enterprise-Grade Security**: Cloudflare's DDoS protection and WAF
- **Global Performance**: Cloudflare's edge network optimizes connection speed
- **User-Friendly URLs**: `https://alice.folder-mcp.com` instead of `https://random-ngrok-id.ngrok.io`
- **SSL/TLS Automatic**: Cloudflare provides and manages SSL certificates
- **Analytics & Monitoring**: Built-in request analytics and performance monitoring

**Key Deliverables**:
- TCP transport with configurable binding and port settings
- Cloudflare Tunnel integration with automatic subdomain allocation
- TLS/mTLS certificate management with automatic renewal
- Remote authentication system with comprehensive security features
- Subdomain service for user-friendly cloud access
- Documentation for cloud LLM integration workflows
- CLI commands for tunnel management and remote access setup

---

## Phase 9: Advanced Endpoints & HTTP Gateway (Planned)

### Step 35: HTTP Gateway Implementation
**Task**: Implement REST/JSON gateway for gRPC services with comprehensive authentication  
**Success Criteria**:
- 📋 HTTP server on configurable port (default 8080)
- 📋 REST endpoints with /v1 prefix matching specification
- 📋 JSON request/response translation to/from gRPC (not MCP - remains stdio only)
- 📋 Proper HTTP status codes and error handling
- 📋 CORS support for web clients
- 📋 Request validation and sanitization

### Step 36: Summarization Endpoints & Tools
**Task**: Implement advanced summarization features for both gRPC and HTTP protocols  
**Success Criteria**:
- 📋 Enhanced GetDocSummary with multiple modes (brief/detailed/technical)
- 📋 BatchDocSummary with intelligent batching and progress tracking
- 📋 Summary caching and incremental updates
- 📋 Custom summarization templates and styles
- 📋 Multi-language summarization support
- 📋 Integration with HTTP gateway

### Step 37: Specialized Query Enhancements
**Task**: Enhance table querying and system monitoring capabilities  
**Success Criteria**:
- 📋 Advanced TableQuery with SQL-like syntax support
- 📋 Cross-document table analysis and joining
- 📋 Enhanced IngestStatus with real-time progress tracking
- 📋 Batch refresh operations with dependency resolution
- 📋 Performance analytics and optimization suggestions
- 📋 Integration with HTTP gateway

### Step 38: Advanced Search Features
**Task**: Enhance search capabilities with advanced filtering and ranking  
**Success Criteria**:
- 📋 Complex metadata filtering (AND/OR operations)
- 📋 Date range queries with RFC3339 timestamp support
- 📋 Author and document type filtering
- 📋 Search result ranking and relevance scoring
- 📋 Search history and saved queries
- 📋 Query performance optimization

### Step 39: Batch Operations & Streaming
**Task**: Implement efficient batch processing and streaming  
**Success Criteria**:
- 📋 Streaming responses for large result sets
- 📋 Batch embedding generation for multiple documents
- 📋 Progress tracking for long-running operations
- 📋 Cancellation support for batch operations
- 📋 Memory-efficient processing for large files
- 📋 Rate limiting and throttling

### Step 40: Security & Authentication Enhancement
**Task**: Implement comprehensive security features for remote access  
**Success Criteria**:
- 📋 TLS/mTLS certificate generation and management for remote connections
- 📋 Enhanced API key lifecycle management (generate, rotate, revoke)
- 📋 Security audit logging with authentication events
- 📋 Rate limiting and DDoS protection per API key
- 📋 Access control and permission system
- 📋 Secure key storage and retrieval

### Step 41: Integration Testing & Validation
**Task**: Comprehensive testing of transport and endpoint system  
**Success Criteria**:
- 📋 gRPC client/server integration tests
- 📋 HTTP gateway API testing
- 📋 Multi-transport connection testing
- 📋 Load testing for all endpoints
- 📋 Error handling and recovery testing
- 📋 Performance benchmarking and optimization

---

## Phase 10: Release Preparation (Planned)
### Step 42: Hugging Face Hub Integration for Model Metadata
**Task**: Enhance Ollama model information with Hugging Face Hub metadata  
**Success Criteria**:
- 📋 Fetch model metadata from Hugging Face Hub API
- 📋 Extract language support information from model cards
- 📋 Augment Ollama model list with HF metadata
- 📋 Implement intelligent language-based model filtering
- 📋 Cache HF metadata with 24-hour expiry
- 📋 Handle API rate limits and offline scenarios gracefully
- 📋 Provide rich model selection with language capabilities

**Implementation Approach**:
1. **Model ID Mapping**: Map Ollama model names to Hugging Face model IDs
2. **Batch API Requests**: Fetch multiple model metadata in parallel with rate limiting
3. **Language Detection**: Parse model cards and tags for language information
4. **Confidence Scoring**: Rate quality of language support data
5. **Caching Strategy**: Store combined Ollama + HF data in unified cache
6. **Fallback Logic**: Graceful degradation when HF API unavailable

**API Integration Details**:
```
GET https://huggingface.co/api/models/{model_id}
→ Returns: model card, tags, pipeline info, language data

Example Response:
{
  "id": "sentence-transformers/all-MiniLM-L6-v2",
  "pipeline_tag": "sentence-similarity", 
  "tags": ["sentence-transformers", "pytorch", "safetensors"],
  "languages": ["en"],
  "license": "apache-2.0",
  "downloads": 50000000,
  "lastModified": "2023-11-20T10:30:00.000Z"
}
```

**Enhanced User Experience**:
- Show language support when listing models: `mxbai-embed-large (100+ languages)`
- Filter models by language: `--language zh,en` 
- Smart defaults: Auto-select best multilingual model for diverse document sets
- Confidence indicators: High/Medium/Low confidence for language support data

### Step 43: Performance Optimization
**Task**: Optimize for production deployment  
**Success Criteria**:
- 📋 Connection pooling and resource management
- 📋 Caching strategies for frequently accessed data
- 📋 Memory optimization for large document sets
- 📋 Database indexing and query optimization
- 📋 Concurrent request handling optimization
- 📋 Network protocol optimization

### Step 44: Test Suite Integration
**Task**: Extend existing test suite for new transport system  
**Success Criteria**:
- 📋 Add gRPC transport testing to existing test infrastructure
- 📋 HTTP gateway endpoint testing
- 📋 Multi-protocol integration testing
- 📋 Performance benchmarking for all endpoints
- 📋 Security and authentication testing
- 📋 Load testing and stress testing

**Note**: Leverages existing comprehensive test system (238 tests, 99.6% pass rate) by extending with transport-specific tests while maintaining current test infrastructure and patterns.

### Step 45: Documentation & API Reference
**Task**: Complete comprehensive documentation  
**Success Criteria**:
- 📋 API documentation with OpenAPI/Swagger spec
- 📋 gRPC service documentation
- 📋 Transport configuration guide
- 📋 Deployment and scaling guide
- 📋 Security configuration documentation
- 📋 Troubleshooting and debugging guide

### Step 46: Containerization & Deployment
**Task**: Prepare for containerized deployment  
**Success Criteria**:
- 📋 Docker containerization with multi-stage builds
- 📋 Docker Compose for local development
- 📋 Kubernetes deployment manifests
- 📋 Health checks and readiness probes
- 📋 Environment variable configuration
- 📋 Horizontal scaling support

### Step 47: Release 1.0.0
**Task**: Publish production-ready release  
**Success Criteria**:
- 📋 Publish to npm registry with all transport options
- 📋 GitHub release with binary distributions
- 📋 Docker Hub container publication
- 📋 Documentation website deployment
- 📋 Community announcement and promotion
- 📋 User feedback collection system

---

## Phase 11: UX Refinements (Planned)

**NOTE**: These remaining UX steps were moved from the original Phase 8 to allow immediate focus on transport and endpoints implementation.

### Step 48: CLI Parameter Override System
**Task**: Allow CLI parameters to override runtime defaults  
**Success Criteria**:
- 📋 Parse all CLI parameters into runtime config
- 📋 Override only specified parameters
- 📋 Detect changes in embedding config (model, chunk_size, overlap)
- 📋 Trigger re-indexing if embedding params changed
- 📋 Show warning: "Config changed, re-indexing required"
- 📋 Update cached runtime with successful execution
- 📋 Update --help for the tool

### Step 49: Configuration Wizard Implementation
**Task**: Create --wizard interactive configuration generator  
**Success Criteria**:
- 📋 Launch with folder-mcp --wizard
- 📋 Load current runtime config as defaults
- 📋 Ask questions with current values pre-filled
- 📋 Generate CLI command string from answers
- 📋 Display command and ask: "Run this command? Y/n"
- 📋 Execute command or copy to clipboard

### Step 50: System Detection Integration
**Task**: Auto-detect system capabilities for smart defaults  
**Success Criteria**:
- 📋 Detect CPU, RAM, GPU on first run
- 📋 Update runtime config with optimal settings
- 📋 Select best model based on system tier
- 📋 Integrate with Ollama for model availability
- 📋 Run only when cache missing or --detect flag
- 📋 Show detected specs in --show-config output

### Step 51: Full-Screen UI Implementation
**Task**: Create main operation interface  
**Success Criteria**:
- 📋 Launch after configuration is validated
- 📋 Display real-time indexing progress
- 📋 Show file processing statistics
- 📋 Monitor memory and performance
- 📋 Include error log panel
- 📋 Add keyboard navigation

---

## Phase 12: Chat Interface Integration (Future)

### Step 52: Chat Configuration Wizard
**Task**: Create interactive wizard for chat setup using new transport layer  
**Success Criteria**:
- 📋 Launch with `folder-mcp chat --setup`
- 📋 Auto-detect available transport options (local gRPC, remote gRPC, HTTP)
- 📋 Cloud vs Local GPU selection interface
- 📋 Provider selection with clear descriptions
- 📋 API key validation with test calls
- 📋 Ollama model detection and recommendation
- 📋 Transport selection and configuration
- 📋 Save chat configuration leveraging new config system

**Chat Configuration Flow leveraging gRPC Transport**:
```
folder-mcp chat <folder> (first time)
→ Chat Setup Wizard
   ├── Transport Selection:
   │   ├── Local gRPC (unix socket) - Best performance
   │   ├── Remote gRPC (TCP) - Distributed setup
   │   └── HTTP Gateway - Web compatibility
   │
   ├── Choose: Cloud or Local GPU?
   │
   ├─ Cloud Path:
   │  ├── Select Provider:
   │  │   ├── OpenAI (GPT-4, GPT-3.5-turbo)
   │  │   ├── Anthropic (Claude 3.5 Sonnet, Claude 3 Haiku)
   │  │   ├── Google (Gemini Pro, Gemini Flash)
   │  │   └── Azure OpenAI
   │  ├── Enter API Key → Validate → Test call via transport
   │  ├── Auto-select best model for provider
   │  └── Save config → Launch chat
   │
   └─ Local GPU Path:
      ├── Check Ollama installation
      ├── Scan available models via transport
      ├── Show model list with embedding compatibility
      ├── Auto-recommend based on system specs
      ├── Download model if needed (with progress)
      └── Save config → Launch chat
```

### Step 53: Cloud Provider Integration
**Task**: Implement cloud LLM provider APIs with transport layer  
**Success Criteria**:
- 📋 OpenAI API integration with streaming responses
- 📋 Anthropic Claude API with proper formatting
- 📋 Google Gemini API integration
- 📋 Azure OpenAI support
- 📋 Transport-agnostic LLM client interface
- 📋 API routing through gRPC or HTTP transport
- 📋 Rate limiting and quota management via transport

### Step 54: Local LLM Integration
**Task**: Implement Ollama local LLM integration via transport  
**Success Criteria**:
- 📋 Ollama service detection and health checks
- 📋 Model listing with installation status via transport
- 📋 Automatic model downloading with progress
- 📋 System resource monitoring during chat
- 📋 Model recommendation based on RAM/VRAM
- 📋 Transport-optimized local inference
- 📋 Performance optimization for gRPC streaming

### Step 55: Interactive Chat Interface
**Task**: Create the main chat experience using transport endpoints  
**Success Criteria**:
- 📋 CLI-based chat interface with rich formatting
- 📋 Context-aware responses using SearchDocs/SearchChunks endpoints
- 📋 Real-time document retrieval via transport
- 📋 Source document attribution using GetDocMetadata
- 📋 Streaming responses via gRPC or HTTP
- 📋 Commands: `/help`, `/sources`, `/clear`, `/export`
- 📋 Integration with BatchDocSummary for context preparation
- 📋 Transport performance monitoring during chat

**Chat Interface Flow leveraging Transport Endpoints**:
```
folder-mcp chat <folder>
→ Load chat config → Connect to transport → Start chat session

Chat Interface using gRPC/HTTP endpoints:
┌─ Chat with Documents in: ./my-folder ─────────────────────┐
│ 📁 Sources: 47 documents indexed (via IngestStatus)       │
│ 🤖 Model: Claude 3.5 Sonnet (Cloud) / llama3.1:8b (Local)│
│ 🔗 Transport: gRPC/Unix Socket (high performance)         │
├────────────────────────────────────────────────────────────┤
│ You: What are the main topics in my research papers?      │
│                                                            │
│ 🤖 Assistant: Based on your documents, I found 3 main    │
│ research topics: (via SearchDocs + BatchDocSummary)       │
│                                                            │
│ 1. **Machine Learning Applications** (12 papers)          │
│    Sources: ml-survey.pdf, neural-networks.docx           │
│                                                            │
│ 2. **Data Analysis Methods** (8 papers)                   │
│    Sources: statistics-overview.pdf, data-mining.docx     │
│                                                            │
│ 3. **Software Engineering** (5 papers)                    │
│    Sources: agile-methods.pdf, testing-strategies.docx    │
│                                                            │
├────────────────────────────────────────────────────────────┤
│ Type your message... (/help for commands)                 │
└────────────────────────────────────────────────────────────┘
```

### Step 56: Chat History & Export
**Task**: Implement chat session management with transport integration  
**Success Criteria**:
- 📋 Save chat sessions with document references
- 📋 Session naming and organization
- 📋 Resume previous chat sessions with transport reconnection
- 📋 Export options: Markdown, JSON, TXT with source links
- 📋 Search chat history using existing search infrastructure
- 📋 Delete old sessions with cleanup
- 📋 Session sharing with transport endpoint references
- 📋 Privacy controls for sensitive conversations

---

## GitHub Project Management

This section provides guidance for setting up GitHub Issues to track development progress.

### Quick Setup Instructions

1. **Go to your GitHub repository**: https://github.com/okets/folder-mcp
2. **Click "Issues" tab** → **"New Issue"**
3. **Create issues for each step** using the templates below
4. **Set labels and milestones** as indicated

### GitHub Milestones

Create these milestones in GitHub (Issues → Milestones → New milestone):

1. **Phase 8 - Transport & Core Endpoints** (Due: Current - PRIORITIZED) 🚀
2. **Phase 9 - Advanced Endpoints & HTTP Gateway** (Due: TBD)
3. **Phase 10 - Release Preparation** (Due: TBD)
4. **Phase 11 - UX Refinements** (Due: TBD)
5. **Phase 12 - Chat Interface Integration** (Due: TBD)

### GitHub Labels

Create these labels for categorization:

- `enhancement` (blue), `grpc` (steel blue), `transport` (coral), `http-gateway` (lavender)
- `endpoints` (mint), `security` (crimson), `monitoring` (forest green)
- `config` (lime), `cli` (green), `performance` (maroon), `testing` (navy)
- `documentation` (silver), `packaging` (teal), `release` (gold)

### Issue Template

For each step in the roadmap, create a GitHub issue with:

**Title**: `[Step X] Brief Description` (e.g., "[Step 34] Transport Layer Foundation")

**Labels**: `enhancement` + relevant category (e.g., `transport`)

**Milestone**: Appropriate phase (e.g., "Phase 8 - Transport & Core Endpoints")

**Description**:
```
### Description
[Copy the task description from the roadmap]

### Success Criteria
[Copy the success criteria checklist from the roadmap]

### Status
- 🔄 **IN PROGRESS** / **TODO**
```

### Benefits

- **Clear progress tracking**: See exactly what's done vs. what's planned
- **Contributor onboarding**: New developers can see the roadmap and pick tasks
- **User expectations**: Users understand current capabilities vs. future features  
- **Development focus**: Prioritized task list for systematic development
- **Community engagement**: Users can vote on features and contribute to specific areas
