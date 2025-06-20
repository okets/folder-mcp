[Work in Progress]
####  ☁️ Cloudflare Tunnel plan prompt
Give me full implementation plan for implementing cloudflare Tunnel. with all required steps, including registering the domain mcp-folder.link (or folder-mcp.app, haven't decided yet) with the  service.
my goal is to have the user run my CLI app locally, have it process the data -> serve it using MCP server
the user should have a connection address with this format fdsl3442356lkl.folder-mcp.link
also, check what are the implications if the user shuts off his computer for the night.
will it still work after starting it again?
```

#### Features I Need to Add to Task Lists
-------------------------------------------------
## Tests I Need to Run
1. Choosing Ollama model, then deleting it from Ollama.
-------------------------------------------------
## Features I Need to Support
### 1. Support BitNet for Very Weak Machines
- Reference: https://www.geektime.co.il/pc-with-pentium-ii-128mb-ram-and-windows-98-ran-llm/

### 2. *** CLI should notify the user when the server is ready (consider the async design nature of the server)
### 3. Support Legacy Doc, Xls, Ppt Formats


## Phase 3: Text Processing & Embeddings
- [x] Smart text chunking: paragraph boundaries, 200-500 tokens, 10% overlap, no mid-sentence splits, preserves metadata
- [x] Embedding model setup: Nomic Embed, download/caching, progress, 768-dim, offline mode, ES module, batch support
- [x] GPU-enabled embedding model: Ollama CLI detection, fallback to CPU, same API, GPU/CPU status, service startup, model download
- [x] Batch embedding generation: batches of 32, progress bar, saves to embeddings, incremental, resume capability

## Phase 4: Vector Search
- [x] FAISS vector index: 768-dim, binary format, ID mappings, load/search, fallback to JSON
- [x] Similarity search: query embedding, top-K, similarity scores (0-1), chunk metadata, empty index handling
- [x] Search CLI command: `folder-mcp search <folder> <query>`, -k param, source/line info, content snippets, works offline

## Phase 8: Transport Foundation & Core Endpoints
- [x] Transport layer: gRPC dependencies, proto schema, transport interfaces/factory, config, selection logic, security CLI commands (API key management)
- [x] Protocol buffer schema: 13 endpoints, message types, validation, TypeScript types, token limit annotations, tests, Claude Desktop integration
- [x] Local dual-protocol transport: MCP (JSON-RPC over stdio), gRPC (Unix socket), all 13 endpoints, validation/error handling, DI integration, health checks, CLI commands, Claude Desktop compatibility, security foundation
- [x] All endpoints/tools: SearchDocs, SearchChunks, ListFolders, ListDocumentsInFolder, GetDocMetadata, DownloadDoc, GetChunks, GetDocSummary, BatchDocSummary, TableQuery, IngestStatus, RefreshDoc, GetEmbedding (with both gRPC and MCP tools)
- [x] Shared domain services, streaming, error handling, sorting/filtering, performance optimization


## Features To Implement

- VSCode-native MCP integration and optimization
- Enhanced MCP server with:
  - Advanced prompts and tool descriptions (context-aware, usage examples, parameter validation, error handling, usage patterns)
  - Sophisticated pagination (cursor-based, configurable sizes, stateless tokens, deep pagination, performance optimization)
  - Advanced search (complex metadata filtering, AND/OR, date range, author/type, ranking, semantic similarity, performance)
  - Rich metadata system (author, timestamps, type, language detection, custom fields, indexing/search)
  - Batch operations (batch processing, streaming, progress tracking, cancellation, memory efficiency, rate limiting)
  - Enhanced summarization (multiple modes, batch, caching, templates, multi-language, quality scoring)
  - Table query enhancements (SQL-like queries, cross-doc analysis, joins, export, schema detection, performance)
  - Real-time status & monitoring (indexing progress, analytics dashboard, memory, error reporting, health checks, resource usage)
  - Advanced configuration management (hierarchical loading, env vars, validation, runtime updates, templates, migration)
  - Robust error handling & recovery (classification, user-friendly messages, retries, degradation, logging, recovery docs)
  - Comprehensive documentation (API docs, integration guides, troubleshooting, performance, best practices, usage examples)
  - Security enhancements (permissions, path traversal, input validation, resource limits, audit logging, config options)
  - Extensibility framework (plugin system, custom tool registration, hooks, plugin config, loading/validation, docs)
  - Multi-language support (Unicode, tokenization, multilingual embeddings, detection/tagging, localized errors, RTL)
  - Performance optimization (memory, CPU, disk I/O, caching, DB queries, concurrency)
  - Integration testing & validation (end-to-end, performance, integration, stress, error, user acceptance)
- CLI interface:
  - Parameter override system
  - Interactive configuration wizard
  - System detection & auto-configuration
  - Keyboard navigation interface
  - Full-screen TUI
  - Advanced help system
  - User interaction framework (progress bars, dialogs, validation, workflows, undo/redo, notifications)
  - CLI testing & validation
- Remote connections:
  - Remote access foundation (gRPC TCP, API key, TLS/mTLS, hybrid security, config)
  - HTTP gateway (REST/JSON, OpenAPI, CORS, validation)
  - Cloudflare tunnel integration (dynamic subdomains, zero-config, SSL, analytics)
  - Certificate management (Let's Encrypt, self-signed, provisioning, monitoring, validation)
  - Authentication & security (API key lifecycle, rate limiting, audit logging, access control, secure storage)
  - Alternative tunneling providers (ngrok, localtunnel, provider selection, fallback, health monitoring)
  - Remote configuration management (profiles, env vars, secure storage, validation, dynamic updates, templates)
  - Performance optimization for remote (connection pooling, compression, caching, load balancing, monitoring, bandwidth)
  - Monitoring & analytics (usage, performance, security, health, alerting, reporting)
  - Remote access testing & validation
- Internal CLI chat:
  - Chat configuration wizard (transport selection, provider, API key validation, Ollama detection, model recommendation)
  - Cloud provider integration (OpenAI, Anthropic, Google, Azure, streaming, rate limiting, error handling)
  - Local LLM integration (Ollama, model management, auto-download, resource monitoring, recommendations, streaming)
  - Interactive chat interface (context-aware, retrieval, source attribution, streaming, chat commands, batch integration)
  - Advanced chat features (history, multi-turn, filtering, export, templates, shortcuts)
  - Chat session management (persistence, naming, search, sharing, privacy, analytics)
  - Chat testing & validation
- Release preparation:
  - Hugging Face Hub integration for model metadata
  - Production performance optimization & tuning
  - Comprehensive test suite integration
  - Documentation & API reference
  - Release preparation & distribution (containerization, CI/CD, npm, binaries, Docker, docs site, release management, community support)
