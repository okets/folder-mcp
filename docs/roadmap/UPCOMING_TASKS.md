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

**Current Status**: Step 31/57 - Phase 8 Protocol Buffer Schema Design Completed, gRPC Transport Implementation Ready 🚀

### Overall Timeline
- **✅ Phases 1-7**: Foundation through Production Ready (Steps 1-28) - **COMPLETED**
- **✅ Step 29**: Transport Layer Foundation - **COMPLETED**
- **✅ Step 30**: Protocol Buffer Schema Design - **COMPLETED**
- **🔄 Phase 8**: Transport Foundation & Core Endpoints (Steps 31-34) - **IN PROGRESS** 
- **📋 Phase 9**: Advanced Endpoints & HTTP Gateway (Steps 35-42) - **PLANNED**
- **📋 Phase 10**: Release Preparation (Steps 43-48) - **PLANNED**
- **📋 Phase 11**: UX Refinements (Steps 49-52) - **PLANNED**
- **📋 Phase 12**: Chat Interface Integration (Steps 53-57) - **FUTURE**

---

## Phase 8: Transport Foundation & Core Endpoints (Current)

**Status**: ⬅️ Current - **PRIORITIZED FOR IMMEDIATE DEVELOPMENT** 🚀

**Focus**: Implement dual-protocol transport layer (MCP + gRPC) and core document intelligence endpoints with local communication for maximum compatibility and high-performance document access.

**Immediate Implementation Path**:
- **MCP Protocol First**: Maintain Claude Desktop integration with stdio transport
- **Local gRPC Second**: Unix domain socket transport for maximum performance
- **Core Endpoints & Tools**: Complete gRPC endpoints and corresponding MCP tools
- **Foundation First**: Dual-protocol support, then full endpoint/tool implementation
- **Security Ready**: API key system foundation (used later for remote access)

### ✅ Step 29: Transport Layer Foundation - COMPLETED
**Task**: Prepare for gRPC transport system architecture with security foundation  
**Status**: ✅ **COMPLETED** - June 13, 2025

**Success Criteria**: ✅ All Completed
- ✅ Install gRPC dependencies (@grpc/grpc-js, @grpc/proto-loader)
- ✅ Design Protocol Buffer schema for all endpoints
- ✅ Create transport layer interface definitions
- ✅ Implement transport factory pattern
- ✅ Add transport configuration to runtime config
- ✅ Create transport selection logic (local/remote/http)
- ✅ Update MCP server to "hello world" baseline
- ✅ Add security CLI commands foundation

**Security CLI Commands**: ✅ All Implemented
- ✅ `folder-mcp serve <folder>` - Auto-generate API key on first run
- ✅ `folder-mcp generate-key <folder>` - Generate new API key
- ✅ `folder-mcp rotate-key <folder>` - Rotate existing API key
- ✅ `folder-mcp show-key <folder>` - Display current API key
- ✅ `folder-mcp revoke-key <folder>` - Revoke API key access

**Implementation Files**:
- `src/transport/` - Complete transport layer (7 files)
- `proto/folder-mcp.proto` - Protocol buffer schema
- `src/interfaces/cli/commands/` - Security CLI commands (5 files)
- `src/generated/` - Generated TypeScript types
- Updated configuration and DI modules

### ✅ Step 30: Protocol Buffer Schema Design - COMPLETED
**Task**: Define comprehensive .proto files for all endpoints  
**Status**: ✅ **COMPLETED** - June 13, 2025  
**Claude Desktop Integration**: ✅ **CONFIRMED WORKING**

**Success Criteria**: ✅ All Completed
- ✅ Create folder-mcp.proto with all 13 service endpoints
- ✅ Define message types for all request/response pairs
- ✅ Include proper field validation and documentation
- ✅ Generate TypeScript types from proto files
- ✅ Validate schema against endpoint specification
- ✅ Add token limit annotations in proto comments
- ✅ All tests pass with new proto definitions
- ✅ TypeScript compiles without ANY errors
- ✅ Proto schema validates against gRPC standards
- ✅ Claude Desktop runs the MCP server without issues

**Implementation Files**:
- `proto/folder-mcp.proto` - Complete protocol buffer schema with all 13 endpoints
- `src/generated/` - Generated TypeScript types and validation utilities
  - `folder-mcp.d.ts` - Complete TypeScript interface definitions
  - `folder-mcp.js` - JavaScript implementation
  - `message-builders.ts` - Type-safe message construction helpers
  - `type-guards.ts` - Runtime type validation functions
  - `validation-utils.ts` - Field validation utilities
- `src/transport/typed-service.ts` - Type-safe service wrapper
- `src/transport/typed-transport.ts` - DI-compliant typed transport with factory functions
- `src/config/schema.ts` - Enhanced configuration with proto enum integration
- `scripts/generate-proto-types.js` - Enhanced type generation script
- `STEP_30_IMPLEMENTATION_PLAN.md` - Complete implementation documentation
- `STEP_30_COMPLETION_SUMMARY.md` - Final completion summary
- `CLAUDE_DESKTOP_INTEGRATION_CONFIRMED.md` - Claude Desktop test results

**Architectural Achievements**:
- ✅ 250+ tests passing (100% success rate)
- ✅ Clean TypeScript compilation with full type safety
- ✅ DI compliance maintained across all new components
- ✅ Performance benchmarks met
- ✅ Proto-enum integration in configuration system
- ✅ Type-safe transport layer with factory pattern
- ✅ Claude Desktop MCP server integration confirmed working

### Step 31: Local Dual-Protocol Transport Implementation  
**Task**: Implement local transport layer supporting both MCP (RPC) and gRPC protocols for maximum compatibility and performance  
**Status**: 🚀 **IN PROGRESS** - Core infrastructure completed, endpoint and tool implementation ongoing  
**Implementation Plan**: `STEP_31_IMPLEMENTATION_PLAN.md` - Complete implementation guide

**Success Criteria**:
- ✅ MCP transport: JSON-RPC over stdio for Claude Desktop integration (WORKING)
- ✅ Local gRPC transport: Unix Domain Socket (Windows named pipe) with filesystem permissions
- ✅ Basic gRPC service endpoints: SearchDocs and SearchChunks with validation and error handling
- ✅ gRPC service implementation using generated proto types
- ✅ Integration with existing DI container and configuration system
- ✅ Local transport health checks and graceful shutdown
- 📋 Complete all 13 gRPC service endpoints (11 remaining)
- 📋 Implement corresponding MCP tools for Claude Desktop compatibility (10 tools)
- 📋 Shared domain service integration for both protocols
- 📋 All tests pass with dual transport implementation
- 📋 TypeScript compiles without ANY errors
- 📋 Claude Desktop integration maintains compatibility (MCP protocol)
- 📋 Enhanced CLI commands for dual transport management

**Implementation Focus**: **Dual-Protocol Local Access**
- **MCP Protocol**: JSON-RPC over stdio for Claude Desktop integration
- **gRPC Protocol**: Unix Domain Socket (Windows named pipes) for high-performance local applications
- **Shared Domain Services**: Both protocols use the same underlying document intelligence services
- **No Authentication Required**: Filesystem permissions provide security for both protocols
- **Protocol Optimization**: MCP for interactive chat, gRPC for bulk operations
- **Performance Optimized**: Direct memory access for gRPC, chat-optimized responses for MCP

**Key Deliverables**:
- ✅ Working MCP server with Claude Desktop integration
- Complete local gRPC server with all 13 endpoints implemented
- Complete MCP tool set with equivalent functionality to gRPC endpoints
- Unix Domain Socket transport with optimal performance
- Type-safe service implementations using generated proto types
- Dual transport health monitoring and graceful shutdown
- Enhanced CLI commands for dual transport management

**Completed Infrastructure**:
- ✅ MCP server with Claude Desktop integration (stdio transport)
- ✅ gRPC server with proto loading and DI integration
- ✅ Unix Domain Socket transport (Windows named pipe)
- ✅ Basic SearchDocs and SearchChunks gRPC endpoints
- ✅ hello_world MCP tool (working with Claude Desktop)
- ✅ Error mapping and validation utilities
- ✅ Transport manager with graceful shutdown
- ✅ API key system (foundation for future remote access)
- ✅ Authentication middleware (inactive for local transport)

**Remaining Work**:
- 📋 11 additional gRPC service endpoints (ListFolders, GetDocMetadata, etc.)
- 📋 10 corresponding MCP tools for Claude Desktop access
- 📋 Integration with existing domain services (search, files, embeddings) for both protocols
- 📋 Cross-protocol consistency testing and validation
- 📋 Comprehensive test coverage for dual transport scenarios
- 📋 CLI enhancements for dual transport management

### Step 32: Core Search Endpoints & Tools
**Task**: Complete SearchDocs and SearchChunks implementation for both gRPC and MCP protocols  
**Success Criteria**:
- 📋 gRPC SearchDocs: Semantic document discovery with metadata filters
- 📋 gRPC SearchChunks: Chunk-level search with text previews
- 📋 MCP search_documents tool: Claude Desktop compatible document search
- 📋 MCP search_chunks tool: Claude Desktop compatible chunk search
- 📋 Implement proper token limiting (≤1,000 tokens response) for both protocols
- 📋 Add similarity score normalization for both protocols
- 📋 Support top_k parameter with validation (max 50) for both protocols
- 📋 Implement metadata filtering (type, dates, author) for both protocols
- 📋 Cross-protocol response consistency validation

### Step 33: Navigation Endpoints & Tools
**Task**: Implement folder and document listing for both gRPC and MCP protocols  
**Success Criteria**:
- 📋 gRPC ListFolders: Top-level folder tree structure
- 📋 gRPC ListDocumentsInFolder: Paginated document listing
- 📋 MCP list_folders tool: Claude Desktop compatible folder navigation
- 📋 MCP list_documents tool: Claude Desktop compatible document listing
- 📋 Implement pagination with configurable per_page (max 200) for both protocols
- 📋 Add filtering by document type and modification date for both protocols
- 📋 Include proper metadata in responses for both protocols
- 📋 Handle path traversal security for both protocols
- 📋 Cross-protocol navigation consistency

### Step 34: Document Content Endpoints & Tools
**Task**: Implement document access and metadata for both gRPC and MCP protocols  
**Success Criteria**:
- 📋 gRPC GetDocMetadata: Structural metadata (sheets, slides, authors)
- 📋 gRPC DownloadDoc: Binary document streaming
- 📋 gRPC GetChunks: Full chunk text retrieval with metadata
- 📋 MCP get_document_metadata tool: Claude Desktop compatible metadata access
- 📋 MCP get_document_content tool: Claude Desktop compatible content access
- 📋 Implement proper binary streaming for large files (gRPC only)
- 📋 Add content-type detection and headers for both protocols
- 📋 Token limiting for text responses (≤1,000 per chunk) for both protocols
- 📋 Cross-protocol content consistency validation

### Step 35: Remote Access & Cloud LLM Integration
**Task**: Implement secure remote access for cloud LLM integration with Cloudflare tunneling  
**Status**: 📋 **PLANNED** - Depends on Step 31 completion  
**Focus**: Enable cloud LLM access to local folder-mcp instances with zero-config tunneling

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

### Step 36: Summarization Endpoints & Tools
**Task**: Implement document summarization services for both gRPC and MCP protocols  
**Success Criteria**:
- 📋 gRPC GetDocSummary: Single document summarization
- 📋 gRPC BatchDocSummary: Multi-document batch processing
- 📋 MCP summarize_document tool: Claude Desktop compatible summarization
- 📋 MCP batch_summarize tool: Claude Desktop compatible batch processing
- 📋 Support brief/detailed mode selection for both protocols
- 📋 Implement token limiting (≤500 per summary) for both protocols
- 📋 Add source range references in responses for both protocols
- 📋 Batch processing with total token cap (≤2,000) for both protocols

### Step 37: Specialized Query Endpoints & Tools
**Task**: Implement table querying and system status for both gRPC and MCP protocols  
**Success Criteria**:
- 📋 gRPC TableQuery: Semantic queries over spreadsheet data
- 📋 gRPC IngestStatus: Document processing status monitoring
- 📋 gRPC RefreshDoc: Trigger document re-processing
- 📋 gRPC GetEmbedding: Raw vector access for debugging
- 📋 MCP query_table tool: Claude Desktop compatible table queries
- 📋 MCP get_status tool: Claude Desktop compatible status monitoring
- 📋 MCP refresh_document tool: Claude Desktop compatible re-processing
- 📋 Handle sheet selection and cell range responses for both protocols
- 📋 Implement job tracking for refresh operations for both protocols

### Step 38: HTTP Gateway Implementation
**Task**: Implement REST/JSON gateway for gRPC services with comprehensive authentication  
**Success Criteria**:
- 📋 HTTP server on configurable port (default 8080)
- 📋 REST endpoints with /v1 prefix matching specification
- 📋 JSON request/response translation to/from gRPC (not MCP - remains stdio only)
- 📋 Proper HTTP status codes and error handling
- 📋 CORS support for web clients
- 📋 Request validation and sanitization

**Security Implementation**:
- **Authentication Middleware**:
  - Check `Authorization: Bearer <KEY>` header for remote connections
  - Accept `x-api-key: <KEY>` header as alternative
  - Allow localhost/loopback connections without API key
  - Return 401 Unauthorized for invalid/missing keys on remote connections
- **Request Security**:
  - Input validation and sanitization for all endpoints
  - Rate limiting per API key
  - Request size limits and timeout handling

### Step 39: Advanced Search Features
**Task**: Enhance search capabilities with advanced filtering  
**Success Criteria**:
- 📋 Complex metadata filtering (AND/OR operations)
- 📋 Date range queries with RFC3339 timestamp support
- 📋 Author and document type filtering
- 📋 Search result ranking and relevance scoring
- 📋 Search history and saved queries
- 📋 Query performance optimization

### Step 40: Batch Operations & Streaming
**Task**: Implement efficient batch processing and streaming  
**Success Criteria**:
- 📋 Streaming responses for large result sets
- 📋 Batch embedding generation for multiple documents
- 📋 Progress tracking for long-running operations
- 📋 Cancellation support for batch operations
- 📋 Memory-efficient processing for large files
- 📋 Rate limiting and throttling

### Step 40: Security & Authentication
**Task**: Implement comprehensive security features with API key management  
**Success Criteria**:
- 📋 mTLS certificate generation and management for remote connections
- 📋 API key lifecycle management (generate, rotate, revoke)
- 📋 Security audit logging with authentication events
- 📋 Rate limiting and DDoS protection per API key
- 📋 Access control and permission system
- 📋 Secure key storage and retrieval

**Detailed Security Implementation**:
- **API Key System**:
  - Strong random key generation (32-byte Base64 encoding)
  - Secure storage in `~/.folder-mcp/api-keys.json` with folder mapping
  - CLI commands: `generate-key`, `rotate-key`, `revoke-key`, `list-keys`
  - Key expiration and automatic rotation policies
- **Transport Security**:
  - Unix Domain Socket: Filesystem permissions only (no API key)
  - Remote gRPC: Mandatory API key in `authorization: Bearer <KEY>` metadata
  - HTTP Gateway: API key in `Authorization: Bearer <KEY>` or `x-api-key: <KEY>`
  - Localhost exemption: No API key required for 127.0.0.1/::1 connections
- **Security Monitoring**:
  - Failed authentication attempt logging
  - Suspicious activity detection (rate limiting violations)
  - Security event alerts and notifications

### Step 41: Monitoring & Observability
**Task**: Add comprehensive monitoring and logging  
**Success Criteria**:
- 📋 Metrics collection (request counts, latency, errors)
- 📋 Health check endpoints for all services
- 📋 Structured logging with configurable levels
- 📋 Performance monitoring and alerting
- 📋 Resource usage tracking (memory, CPU, disk)
- 📋 Service discovery and load balancing support

### Step 42: Integration Testing & Validation
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
### Step 43: Hugging Face Hub Integration for Model Metadata
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

### Step 44: Performance Optimization
**Task**: Optimize for production deployment  
**Success Criteria**:
- 📋 Connection pooling and resource management
- 📋 Caching strategies for frequently accessed data
- 📋 Memory optimization for large document sets
- 📋 Database indexing and query optimization
- 📋 Concurrent request handling optimization
- 📋 Network protocol optimization

### Step 45: Test Suite Integration
**Task**: Extend existing test suite for new transport system  
**Success Criteria**:
- 📋 Add gRPC transport testing to existing test infrastructure
- 📋 HTTP gateway endpoint testing
- 📋 Multi-protocol integration testing
- 📋 Performance benchmarking for all endpoints
- 📋 Security and authentication testing
- 📋 Load testing and stress testing

**Note**: Leverages existing comprehensive test system (238 tests, 99.6% pass rate) by extending with transport-specific tests while maintaining current test infrastructure and patterns.

### Step 46: Documentation & API Reference
**Task**: Complete comprehensive documentation  
**Success Criteria**:
- 📋 API documentation with OpenAPI/Swagger spec
- 📋 gRPC service documentation
- 📋 Transport configuration guide
- 📋 Deployment and scaling guide
- 📋 Security configuration documentation
- 📋 Troubleshooting and debugging guide

### Step 47: Containerization & Deployment
**Task**: Prepare for containerized deployment  
**Success Criteria**:
- 📋 Docker containerization with multi-stage builds
- 📋 Docker Compose for local development
- 📋 Kubernetes deployment manifests
- 📋 Health checks and readiness probes
- 📋 Environment variable configuration
- 📋 Horizontal scaling support

### Step 48: Release 1.0.0
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

### Step 49: CLI Parameter Override System
**Task**: Allow CLI parameters to override runtime defaults  
**Success Criteria**:
- 📋 Parse all CLI parameters into runtime config
- 📋 Override only specified parameters
- 📋 Detect changes in embedding config (model, chunk_size, overlap)
- 📋 Trigger re-indexing if embedding params changed
- 📋 Show warning: "Config changed, re-indexing required"
- 📋 Update cached runtime with successful execution
- 📋 Update --help for the tool

### Step 50: Configuration Wizard Implementation
**Task**: Create --wizard interactive configuration generator  
**Success Criteria**:
- 📋 Launch with folder-mcp --wizard
- 📋 Load current runtime config as defaults
- 📋 Ask questions with current values pre-filled
- 📋 Generate CLI command string from answers
- 📋 Display command and ask: "Run this command? Y/n"
- 📋 Execute command or copy to clipboard

### Step 51: System Detection Integration
**Task**: Auto-detect system capabilities for smart defaults  
**Success Criteria**:
- 📋 Detect CPU, RAM, GPU on first run
- 📋 Update runtime config with optimal settings
- 📋 Select best model based on system tier
- 📋 Integrate with Ollama for model availability
- 📋 Run only when cache missing or --detect flag
- 📋 Show detected specs in --show-config output

### Step 52: Full-Screen UI Implementation
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

### Step 53: Chat Configuration Wizard
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

### Step 54: Cloud Provider Integration
**Task**: Implement cloud LLM provider APIs with transport layer  
**Success Criteria**:
- 📋 OpenAI API integration with streaming responses
- 📋 Anthropic Claude API with proper formatting
- 📋 Google Gemini API integration
- 📋 Azure OpenAI support
- 📋 Transport-agnostic LLM client interface
- 📋 API routing through gRPC or HTTP transport
- 📋 Rate limiting and quota management via transport

### Step 55: Local LLM Integration
**Task**: Implement Ollama local LLM integration via transport  
**Success Criteria**:
- 📋 Ollama service detection and health checks
- 📋 Model listing with installation status via transport
- 📋 Automatic model downloading with progress
- 📋 System resource monitoring during chat
- 📋 Model recommendation based on RAM/VRAM
- 📋 Transport-optimized local inference
- 📋 Performance optimization for gRPC streaming

### Step 56: Interactive Chat Interface
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

### Step 57: Chat History & Export
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
