# folder-mcp Feature Checklist

This document provides a checklist for each feature described as implemented in the completed tasks. Use this to compare against your codebase and track missing or regressed features.

---

## Phase 1: Foundation
- [v] TypeScript project structure and configuration
- [v] CLI executable with global install and shebang
- [v] Commander.js CLI with version/help/index command and error handling
- [v] Recursive file listing with glob, relative paths, total count, and error handling
- [v] File type filtering for .txt, .md, .pdf, .docx, .xlsx, .pptx (case-insensitive), count by type, ignores hidden files/folders
- [v] Cache directory setup: `.folder-mcp` with subdirs, version.json, permission error handling
- [v] File fingerprinting: SHA-256 hash, fingerprint object, index.json, pretty-printed JSON
- [v] Cache status detection: detects new/modified/deleted files, summary output

## Phase 2: File Parsing
- [v] Text file parser for .txt/.md (UTF-8, line endings, metadata, large file support)
- [v] PDF parser with pdf-parse: text extraction, page numbers, encrypted file handling, page structure, progress
- [v] Word (.docx) parser with mammoth: paragraphs, headers, lists, tables, error handling
- [v] Excel (.xlsx) parser: all sheets, formulas, tables as JSON, merged cells, sheet names in metadata
- [v] PowerPoint (.pptx) parser: text from slides, slide numbers/titles, speaker notes, shapes/text boxes, logical order

## Phase 3: Text Processing & Embeddings
- [x] Smart text chunking: paragraph boundaries, 200-500 tokens, 10% overlap, no mid-sentence splits, preserves metadata
- [x] Embedding model setup: Nomic Embed, download/caching, progress, 768-dim, offline mode, ES module, batch support
- [x] GPU-enabled embedding model: Ollama CLI detection, fallback to CPU, same API, GPU/CPU status, service startup, model download
- [x] Batch embedding generation: batches of 32, progress bar, saves to embeddings, incremental, resume capability

## Phase 4: Vector Search
- [x] FAISS vector index: 768-dim, binary format, ID mappings, load/search, fallback to JSON
- [x] Similarity search: query embedding, top-K, similarity scores (0-1), chunk metadata, empty index handling
- [x] Search CLI command: `folder-mcp search <folder> <query>`, -k param, source/line info, content snippets, works offline

## Phase 5: MCP Integration
- [v] MCP server scaffold: `folder-mcp serve <folder>`, port config, handshake, logs, graceful shutdown
- [v] Search tool in MCP: search_knowledge tool, params (query, top_k, threshold), structured results, concurrency, source attribution
- [x] Context enhancement: previous/next chunk, paragraph expansion, document outline, group by source, deduplication

## Phase 6: Real-time & Configuration
- [v] File watcher: detects new/modified files, incremental index update, logs, debounce, CLI options, graceful shutdown, error handling
- [v] Configuration system: loads `.folder-mcp.yaml`, chunk size/overlap/model/file extensions/ignore patterns, CLI overrides, schema validation, config priority, YAML support, source tracking

## Phase 7: Production Ready & Configuration Systems
- [v] Error recovery: continues after file failure, logs to errors.log, retries, error summaries, atomic cache, resumable progress, exponential backoff, test environment detection, error stats
- [v] Runtime configuration: JSON schema, smart defaults, TypeScript interfaces, documentation, system capability detection, hash-based change detection, validation, optimization by system tier
- [v] Configuration caching: saves/loads runtime config, system profile cache, Ollama model list with expiry, cache invalidation, corrupted cache handling
- [v] Configuration validation: path/numeric/network/model validation, summary, error handling, caching, tests, documentation

## Phase 8: Transport Foundation & Core Endpoints
- [x] Transport layer: gRPC dependencies, proto schema, transport interfaces/factory, config, selection logic, security CLI commands (API key management)
- [x] Protocol buffer schema: 13 endpoints, message types, validation, TypeScript types, token limit annotations, tests, Claude Desktop integration
- [x] Local dual-protocol transport: MCP (JSON-RPC over stdio), gRPC (Unix socket), all 13 endpoints, validation/error handling, DI integration, health checks, CLI commands, Claude Desktop compatibility, security foundation
- [x] All endpoints/tools: SearchDocs, SearchChunks, ListFolders, ListDocumentsInFolder, GetDocMetadata, DownloadDoc, GetChunks, GetDocSummary, BatchDocSummary, TableQuery, IngestStatus, RefreshDoc, GetEmbedding (with both gRPC and MCP tools)
- [x] Shared domain services, streaming, error handling, sorting/filtering, performance optimization

---

Check each box as you confirm the feature is present in your current codebase.
