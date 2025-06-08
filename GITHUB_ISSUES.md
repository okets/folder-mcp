# GitHub Issues for folder-mcp Project

Copy and paste each issue below into GitHub Issues. Mark issues 1-13 as completed when creating them.

---

## Issue #1: Initialize TypeScript Project ✅ COMPLETED
**Labels:** enhancement, foundation
**Milestone:** Phase 1 - Foundation

### Description
Create project structure with TypeScript configuration for the folder-mcp universal tool.

### Success Criteria
- [x] package.json with name "folder-mcp"
- [x] tsconfig.json configured for Node.js
- [x] src/index.ts with console.log("Hello World")
- [x] npm run build compiles successfully
- [x] npm start prints "Hello World"

### Status
✅ **COMPLETED** - Basic TypeScript project structure is in place with proper build configuration.

---

## Issue #2: Create CLI Executable ✅ COMPLETED
**Labels:** enhancement, cli
**Milestone:** Phase 1 - Foundation

### Description
Make globally installable CLI tool with proper executable configuration.

### Success Criteria
- [x] bin field in package.json points to CLI entry
- [x] Shebang line in CLI file: #!/usr/bin/env node
- [x] npm link makes folder-mcp available globally
- [x] Running folder-mcp prints "Hello World"

### Status
✅ **COMPLETED** - CLI interface is implemented with proper executable configuration.

---

## Issue #3: Implement Commander.js CLI ✅ COMPLETED
**Labels:** enhancement, cli
**Milestone:** Phase 1 - Foundation

### Description
Add command structure with Commander for better CLI experience.

### Success Criteria
- [x] folder-mcp --version shows version
- [x] folder-mcp --help shows available commands
- [x] folder-mcp index <folder> command exists
- [x] Shows error for missing folder argument

### Status
✅ **COMPLETED** - Commander.js CLI framework is integrated with basic command structure.

---

## Issue #4: Recursive File Listing ✅ COMPLETED
**Labels:** enhancement, filesystem
**Milestone:** Phase 1 - Foundation

### Description
List all files in target folder using glob for comprehensive file discovery.

### Success Criteria
- [x] folder-mcp index ./test-folder lists all files
- [x] Shows relative paths from target folder
- [x] Displays total file count
- [x] Handles non-existent folders gracefully

### Status
✅ **COMPLETED** - Glob-based file listing with recursive traversal is implemented.

---

## Issue #5: File Type Filtering ✅ COMPLETED
**Labels:** enhancement, parsing
**Milestone:** Phase 1 - Foundation

### Description
Filter by supported extensions for intelligent document processing.

### Success Criteria
- [x] Only shows: .txt, .md, .pdf, .docx, .xlsx, .pptx
- [x] Case-insensitive extension matching
- [x] Shows count by file type (e.g., "PDFs: 5, Word: 3")
- [x] Ignores hidden files and folders

### Status
✅ **COMPLETED** - File type filtering with support for major document formats.

---

## Issue #6: Cache Directory Setup ✅ COMPLETED
**Labels:** enhancement, caching
**Milestone:** Phase 1 - Foundation

### Description
Create and validate cache structure for efficient processing.

### Success Criteria
- [x] Creates .folder-mcp-cache in target folder
- [x] Creates subdirectories: embeddings/, metadata/, vectors/
- [x] Creates version.json with tool version and timestamp
- [x] Handles permission errors with clear message

### Status
✅ **COMPLETED** - Cache directory structure with proper error handling.

---

## Issue #7: File Fingerprinting System ✅ COMPLETED
**Labels:** enhancement, caching
**Milestone:** Phase 1 - Foundation

### Description
Generate unique identifiers for files to track changes efficiently.

### Success Criteria
- [x] Generates SHA-256 hash for each file's content
- [x] Creates fingerprint object: {hash, path, size, modified}
- [x] Saves fingerprints to .folder-mcp-cache/index.json
- [x] Pretty-prints JSON for debugging

### Status
✅ **COMPLETED** - SHA-256 based fingerprinting system for change detection.

---

## Issue #8: Cache Status Detection ✅ COMPLETED
**Labels:** enhancement, caching
**Milestone:** Phase 1 - Foundation

### Description
Identify what needs processing based on cache comparison.

### Success Criteria
- [x] Loads previous index.json if exists
- [x] Detects new files (not in cache)
- [x] Detects modified files (hash changed)
- [x] Detects deleted files (in cache but not on disk)
- [x] Shows summary: "5 new, 2 modified, 1 deleted"

### Status
✅ **COMPLETED** - Intelligent cache status detection with change summary.

---

## Issue #9: Text File Parser ✅ COMPLETED
**Labels:** enhancement, parsing
**Milestone:** Phase 2 - Parsing

### Description
Extract content from .txt and .md files with proper encoding support.

### Success Criteria
- [x] Reads files with UTF-8 encoding
- [x] Handles different line endings (CRLF/LF)
- [x] Stores in .folder-mcp-cache/metadata/[hash].json
- [x] Metadata includes: content, type, originalPath
- [x] Processes 10MB file without memory issues

### Status
✅ **COMPLETED** - Text file parsing with UTF-8 support and metadata extraction.

---

## Issue #10: PDF Parser Integration ✅ COMPLETED
**Labels:** enhancement, parsing
**Milestone:** Phase 2 - Parsing

### Description
Extract text from PDFs using pdf-parse with proper structure preservation.

### Success Criteria
- [x] Extracts all text content from PDFs
- [x] Preserves page numbers in metadata
- [x] Handles encrypted PDFs gracefully (skip with warning)
- [x] Caches extracted content with page structure
- [x] Shows progress for large PDFs

### Status
✅ **COMPLETED** - PDF parsing with page structure and encryption handling.

---

## Issue #11: Word Document Parser ✅ COMPLETED
**Labels:** enhancement, parsing
**Milestone:** Phase 2 - Parsing

### Description
Extract content from .docx using mammoth with structure preservation.

### Success Criteria
- [x] Extracts paragraphs with style information
- [x] Identifies headers vs body text
- [x] Preserves list structure
- [x] Extracts table data as structured JSON
- [x] Handles corrupted files without crashing

### Status
✅ **COMPLETED** - Word document parsing with rich structure extraction.

---

## Issue #12: Excel Parser ✅ COMPLETED
**Labels:** enhancement, parsing
**Milestone:** Phase 2 - Parsing

### Description
Extract data from .xlsx using xlsx library with comprehensive sheet support.

### Success Criteria
- [x] Extracts all sheets with names
- [x] Preserves cell formulas as metadata
- [x] Converts tables to JSON arrays
- [x] Handles merged cells appropriately
- [x] Includes sheet names in chunk metadata

### Status
✅ **COMPLETED** - Excel parsing with multi-sheet support and formula preservation.

---

## Issue #13: PowerPoint Parser ✅ COMPLETED
**Labels:** enhancement, parsing
**Milestone:** Phase 2 - Parsing

### Description
Extract content from .pptx files with slide structure preservation.

### Success Criteria
- [x] Extracts text from all slides
- [x] Preserves slide numbers and titles
- [x] Includes speaker notes
- [x] Extracts text from shapes and text boxes
- [x] Orders content logically per slide

### Status
✅ **COMPLETED** - PowerPoint parsing with comprehensive slide content extraction.

---

## Issue #14: Smart Text Chunking
**Labels:** enhancement, processing
**Milestone:** Phase 3 - Processing

### Description
Split documents into semantic chunks for optimal embedding generation.

### Success Criteria
- [ ] Splits on paragraph boundaries
- [ ] Chunks between 200-500 tokens (using simple tokenizer)
- [ ] 10% overlap between consecutive chunks
- [ ] Never splits mid-sentence
- [ ] Preserves metadata (source, position, type)

### Status
🔄 **TODO** - Implement intelligent text chunking algorithm.

---

## Issue #15: Embedding Model Setup
**Labels:** enhancement, embeddings
**Milestone:** Phase 3 - Processing

### Description
Initialize Nomic Embed model for semantic embeddings.

### Success Criteria
- [ ] Downloads model on first run
- [ ] Shows download progress
- [ ] Caches model in user directory
- [ ] Generates 768-dim embedding for test string
- [ ] Handles offline mode gracefully

### Status
🔄 **TODO** - Set up embedding model with caching.

---

## Issue #16: Batch Embedding Generation
**Labels:** enhancement, embeddings
**Milestone:** Phase 3 - Processing

### Description
Generate embeddings for all chunks with progress tracking.

### Success Criteria
- [ ] Processes chunks in batches of 32
- [ ] Shows progress bar with ETA
- [ ] Saves embeddings to .folder-mcp-cache/embeddings/[hash].json
- [ ] Only processes new/modified files
- [ ] Handles interruption gracefully (resume capable)

### Status
🔄 **TODO** - Implement batch embedding generation.

---

## Issue #17: FAISS Vector Index
**Labels:** enhancement, search
**Milestone:** Phase 4 - Search

### Description
Create searchable vector index using FAISS.

### Success Criteria
- [ ] Initializes FAISS index with correct dimensions (768)
- [ ] Adds all embeddings with numeric IDs
- [ ] Saves index to .folder-mcp-cache/vectors/index.faiss
- [ ] Saves ID mappings to mappings.json
- [ ] Can load and search existing index

### Status
🔄 **TODO** - Implement FAISS vector database.

---

## Issue #18: Similarity Search Function
**Labels:** enhancement, search
**Milestone:** Phase 4 - Search

### Description
Implement vector similarity search functionality.

### Success Criteria
- [ ] Embeds query string
- [ ] Returns top-K most similar chunks
- [ ] Includes similarity scores (0-1 range)
- [ ] Retrieves full chunk metadata
- [ ] Handles empty index gracefully

### Status
🔄 **TODO** - Build similarity search engine.

---

## Issue #19: Search CLI Command
**Labels:** enhancement, cli, search
**Milestone:** Phase 4 - Search

### Description
Add local search command for testing search functionality.

### Success Criteria
- [ ] folder-mcp search <folder> <query> works
- [ ] Shows top 5 results with snippets
- [ ] Displays source file and location
- [ ] Highlights why each result matched
- [ ] Works without starting server

### Status
🔄 **TODO** - Implement search CLI command.

---

## Issue #20: MCP Server Scaffold
**Labels:** enhancement, mcp
**Milestone:** Phase 5 - MCP Integration

### Description
Create basic MCP server foundation.

### Success Criteria
- [ ] Server starts with folder-mcp serve <folder>
- [ ] Listens on default port 3000 (configurable)
- [ ] Implements MCP handshake protocol
- [ ] Logs client connections
- [ ] Graceful shutdown on Ctrl+C

### Status
🔄 **TODO** - Build MCP server foundation.

---

## Issue #21: Search Tool Implementation
**Labels:** enhancement, mcp
**Milestone:** Phase 5 - MCP Integration

### Description
Add search_knowledge tool to MCP server.

### Success Criteria
- [ ] Tool appears in MCP capability list
- [ ] Accepts parameters: query, top_k, threshold
- [ ] Returns structured results with content and metadata
- [ ] Handles concurrent requests
- [ ] Includes source attribution

### Status
🔄 **TODO** - Implement MCP search tool.

---

## Issue #22: Context Enhancement
**Labels:** enhancement, search
**Milestone:** Phase 5 - MCP Integration

### Description
Improve search results with additional context.

### Success Criteria
- [ ] Includes previous/next chunk for context
- [ ] Expands to full paragraph boundaries
- [ ] Adds document outline (for structured docs)
- [ ] Groups results by source document
- [ ] Deduplicates overlapping results

### Status
🔄 **TODO** - Enhance search result context.

---

## Issue #23: File Watcher Integration
**Labels:** enhancement, realtime
**Milestone:** Phase 6 - Advanced Features

### Description
Auto-update on file changes for real-time indexing.

### Success Criteria
- [ ] Detects new files in watched folder
- [ ] Detects modifications to existing files
- [ ] Updates index incrementally
- [ ] Logs update events
- [ ] Debounces rapid changes (1-second delay)

### Status
🔄 **TODO** - Implement real-time file watching.

---

## Issue #24: Configuration System
**Labels:** enhancement, config
**Milestone:** Phase 6 - Advanced Features

### Description
Add configuration file support for customization.

### Success Criteria
- [ ] Loads .folder-mcp.json from folder
- [ ] Configurable: chunk_size, overlap, model_name
- [ ] Configurable: file_extensions, ignore_patterns
- [ ] CLI args override config file
- [ ] Validates configuration schema

### Status
🔄 **TODO** - Build configuration system.

---

## Issue #25: Error Recovery
**Labels:** enhancement, reliability
**Milestone:** Phase 6 - Advanced Features

### Description
Comprehensive error handling for robustness.

### Success Criteria
- [ ] Continues indexing after single file failure
- [ ] Logs errors to .folder-mcp-cache/errors.log
- [ ] Retries failed embeddings (3 attempts)
- [ ] Shows clear error summaries
- [ ] Never leaves cache in corrupted state

### Status
🔄 **TODO** - Implement robust error handling.

---

## Issue #26: Performance Optimization
**Labels:** enhancement, performance
**Milestone:** Phase 7 - Optimization

### Description
Optimize for large folders and performance.

### Success Criteria
- [ ] Parallel file processing (worker pool)
- [ ] Streaming for large files (>50MB)
- [ ] Memory usage stays under 2GB
- [ ] Indexes 1000 documents in <5 minutes
- [ ] Progress saves allow resume

### Status
🔄 **TODO** - Optimize performance for scale.

---

## Issue #27: Test Suite
**Labels:** testing, quality
**Milestone:** Phase 7 - Optimization

### Description
Comprehensive test coverage for reliability.

### Success Criteria
- [ ] Unit tests for each parser
- [ ] Integration test for full pipeline
- [ ] Mock file system for tests
- [ ] Tests for error conditions
- [ ] >80% code coverage

### Status
🔄 **TODO** - Build comprehensive test suite.

---

## Issue #28: Documentation
**Labels:** documentation
**Milestone:** Phase 8 - Release Preparation

### Description
Complete user documentation for release.

### Success Criteria
- [ ] README with quick start guide
- [ ] Examples for each command
- [ ] Configuration reference
- [ ] Troubleshooting guide
- [ ] Architecture diagram

### Status
🔄 **TODO** - Complete documentation.

---

## Issue #29: NPM Package Preparation
**Labels:** packaging, release
**Milestone:** Phase 8 - Release Preparation

### Description
Prepare for publishing to npm registry.

### Success Criteria
- [ ] Clean npm pack output
- [ ] No dev dependencies in bundle
- [ ] Binary properly configured
- [ ] Version 1.0.0 tagged
- [ ] LICENSE file included

### Status
🔄 **TODO** - Prepare npm package.

---

## Issue #30: Release
**Labels:** release
**Milestone:** Phase 8 - Release Preparation

### Description
Publish to npm registry and announce release.

### Success Criteria
- [ ] npm install -g folder-mcp works
- [ ] All commands function globally
- [ ] GitHub repository public
- [ ] CI/CD pipeline configured
- [ ] First user successfully indexes folder

### Status
🔄 **TODO** - Publish final release.

---

## Milestones

1. **Phase 1 - Foundation** (Issues 1-8): ✅ COMPLETED
2. **Phase 2 - Parsing** (Issues 9-13): ✅ COMPLETED  
3. **Phase 3 - Processing** (Issues 14-16): 🔄 TODO
4. **Phase 4 - Search** (Issues 17-19): 🔄 TODO
5. **Phase 5 - MCP Integration** (Issues 20-22): 🔄 TODO
6. **Phase 6 - Advanced Features** (Issues 23-25): 🔄 TODO
7. **Phase 7 - Optimization** (Issues 26-27): 🔄 TODO
8. **Phase 8 - Release Preparation** (Issues 28-30): 🔄 TODO

## Progress Summary

- ✅ **Completed:** 13/30 tasks (43%)
- 🔄 **Remaining:** 17/30 tasks (57%)
- 🎯 **Current Phase:** Phase 3 - Processing (Smart Text Chunking)

The foundation and parsing phases are complete. Ready to begin the processing phase with smart text chunking and embedding generation.
