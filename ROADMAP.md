# folder-mcp Development Roadmap

**Universal Folder-to-MCP-Server Tool**

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Development Progress](#4-development-progress)
5. [Phase Summary](#5-phase-summary)
6. [Detailed Implementation](#6-detailed-implementation)
7. [GitHub Project Management](#7-github-project-management)

---

## 1. Project Overview

### Core Purpose
Transform any local folder into an intelligent knowledge base that LLMs can query for context-aware responses.

### What it does
- Scans a folder and parses all document types (PDFs, PowerPoint, Excel, Word, text files)
- Extracts meaningful content while preserving document structure and relationships
- Creates semantic embeddings for intelligent retrieval
- Serves the content via MCP (Model Context Protocol) so any LLM can access your data
- Enables RAG (Retrieval-Augmented Generation) for accurate, context-specific responses

### Key Features
- Universal file support with intelligent parsing
- Structure preservation (slides, tables, sections - not just raw text)
- Smart chunking by meaning, not arbitrary sizes
- Rich metadata tracking for precise retrieval
- Smart caching system - embeddings stored in .folder-mcp
- Incremental updates - only processes changed files

---

## 2. Tech Stack

### Core Technologies
- **Language**: TypeScript
- **Runtime**: Node.js
- **Build Tool**: TSC (TypeScript Compiler)
- **Package Manager**: npm

### Dependencies

#### File Parsing
- `pdf-parse` - PDF text extraction
- `mammoth` - Word document parsing
- `xlsx` - Excel file parsing
- `node-pptx-parser` - PowerPoint parsing

#### AI & Embeddings
- `@xenova/transformers` - Client-side Hugging Face models
- `faiss-node` - Facebook's vector similarity search

#### MCP & Infrastructure
- `@modelcontextprotocol/sdk` - Anthropic's MCP SDK
- `commander` - Command-line interface
- `glob` - File pattern matching
- `chokidar` - File watching
- `crypto` (built-in) - File hashing

#### Development Dependencies
- `vitest` - Fast unit testing
- `@types/node` - TypeScript definitions
- `eslint` - Code linting
- `@typescript-eslint/parser` - TypeScript ESLint
- `prettier` - Code formatting

---

## 3. Project Structure

```
folder-mcp/
├── src/
│   ├── index.ts          # Main entry point
│   ├── cli/              # CLI commands
│   ├── parsers/          # File parsers
│   ├── embeddings/       # Embedding logic
│   ├── cache/            # Cache management
│   ├── search/           # Vector search
│   └── mcp/              # MCP server
├── tests/
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE
```

---

## 4. Development Progress

**Current Status**: Step 29/44 - Phase 7 Completed, Phase 8 In Progress 📋

### Overall Timeline
- **✅ Phases 1-7**: Foundation through Production Ready (Steps 1-25) - **COMPLETED**
- **📋 Phase 8**: Streamline UX and Configuration flow (Steps 26-34) - **PLANNED**
- **📋 Phases 9-10**: Release and Chat Interface (Steps 35-44) - **PLANNED**

---

## 5. Phase Summary

### ✅ COMPLETED PHASES

#### Phase 1: Foundation (Steps 1-8) → [Details](#phase-1-foundation-steps-1-8--completed)
**Status**: ✅ COMPLETED
- **Step 1**: Initialize TypeScript Project
- **Step 2**: Create CLI Executable
- **Step 3**: Implement Commander.js CLI
- **Step 4**: Recursive File Listing
- **Step 5**: File Type Filtering
- **Step 6**: Cache Directory Setup
- **Step 7**: File Fingerprinting System
- **Step 8**: Cache Status Detection

#### Phase 2: File Parsing (Steps 9-13) → [Details](#phase-2-file-parsing-steps-9-13--completed)
**Status**: ✅ COMPLETED
- **Step 9**: Text File Parser
- **Step 10**: PDF Parser Integration
- **Step 11**: Word Document Parser
- **Step 12**: Excel Parser
- **Step 13**: PowerPoint Parser

#### Phase 3: Text Processing & Embeddings (Steps 14-16) → [Details](#phase-3-text-processing--embeddings-steps-14-16--completed)
**Status**: ✅ COMPLETED
- **Step 14**: Smart Text Chunking
- **Step 15**: Embedding Model Setup
- **Step 15.1**: GPU-Enabled Embedding Model
- **Step 16**: Batch Embedding Generation

#### Phase 4: Vector Search (Steps 17-19) → [Details](#phase-4-vector-search-steps-17-19--completed)
**Status**: ✅ COMPLETED
- **Step 17**: FAISS Vector Index
- **Step 18**: Similarity Search Function
- **Step 19**: Search CLI Command

#### Phase 5: MCP Integration (Steps 20-22) → [Details](#phase-5-mcp-integration-steps-20-22--completed)
**Status**: ✅ COMPLETED
- **Step 20**: MCP Server Scaffold
- **Step 21**: Search Tool Implementation  
- **Step 22**: Context Enhancement

#### Phase 6: Real-time & Configuration (Steps 23-24) → [Details](#phase-6-real-time--configuration-steps-23-24--completed)
**Status**: ✅ COMPLETED
- **Step 23**: File Watcher Integration
- **Step 24**: Configuration System

#### Phase 7: Production Ready (Step 25) → [Details](#phase-7-production-ready-step-25--completed)
**Status**: ✅ COMPLETED
- **Step 25**: Error Recovery

### ⬅️ CURRENT PHASE

#### Phase 8: Streamline UX and Configuration Flow (Steps 26-34) → [Details](#phase-8-streamline-ux-and-configuration-flow-steps-26-34--planned)
**Status**: ⬅️ Current

**Design Approach**: Fetch embedding models directly from Ollama API for accuracy and real-time availability. This ensures users only see models that actually work with GPU acceleration and are currently available on their system.

**Configuration Flows**:

- **Default (zero config)**: `folder-mcp .` → Auto-detect → Best model → Full-screen UI
- **With wizard**: `folder-mcp --wizard` → Interactive questions → CLI command → Execute
- **With CLI params**: `folder-mcp . --model xyz` → Override → Validate → Update cache → UI
- **Subsequent runs**: `folder-mcp .` → Load cache → Validate → Full-screen UI

**Current Steps**:
- ✅ **Step 26**: Runtime Configuration Structure
- ✅ **Step 27**: Configuration Caching System
- ✅ **Step 28**: Configuration Validation System
- 📋 **Step 29**: Hugging Face Hub Integration for Model Metadata
- 📋 **Step 30**: CLI Parameter Override System
- 📋 **Step 31**: Configuration Wizard Implementation
- 📋 **Step 32**: System Detection Integration
- 📋 **Step 33**: Full-Screen UI Implementation
- 📋 **Step 34**: MCP Server UI Enhancement

### 📋 PLANNED PHASES

#### Phase 9: Release 1.0.0 (Steps 35-39) → [Details](#phase-9-release-100-steps-35-39--planned)
**Status**: 📋 PLANNED
- **Step 35**: Performance Optimization
- **Step 36**: Test Suite
- **Step 37**: Documentation
- **Step 38**: NPM Package Preparation
- **Step 39**: Release 1.0.0

#### Phase 10: Chat with Your Folder (Steps 40-44) → [Details](#phase-10-chat-with-your-folder-steps-40-44--future)
**Status**: 📋 FUTURE
- **Step 40**: Chat Configuration Wizard
- **Step 41**: Cloud Provider Integration
- **Step 42**: Local LLM Integration
- **Step 43**: Interactive Chat Interface
- **Step 44**: Chat History & Export

---

## 6. Detailed Implementation

This section contains detailed task descriptions, success criteria, and implementation notes for each step.

### Phase 1: Foundation (Steps 1-8) ✅ COMPLETED

#### Step 1: Initialize TypeScript Project
**Task**: Create project structure with TypeScript configuration  
**Success Criteria**:
- ✅ package.json with name "folder-mcp"
- ✅ tsconfig.json configured for Node.js
- ✅ src/index.ts with console.log("Hello World")
- ✅ npm run build compiles successfully
- ✅ npm start prints "Hello World"

#### Step 2: Create CLI Executable
**Task**: Make globally installable CLI tool  
**Success Criteria**:
- ✅ bin field in package.json points to CLI entry
- ✅ Shebang line in CLI file: #!/usr/bin/env node
- ✅ npm link makes folder-mcp available globally
- ✅ Running folder-mcp prints "Hello World"

#### Step 3: Implement Commander.js CLI
**Task**: Add command structure with Commander  
**Success Criteria**:
- ✅ folder-mcp --version shows version
- ✅ folder-mcp --help shows available commands
- ✅ folder-mcp index <folder> command exists
- ✅ Shows error for missing folder argument

#### Step 4: Recursive File Listing
**Task**: List all files in target folder using glob  
**Success Criteria**:
- ✅ folder-mcp index ./test-folder lists all files
- ✅ Shows relative paths from target folder
- ✅ Displays total file count
- ✅ Handles non-existent folders gracefully

#### Step 5: File Type Filtering
**Task**: Filter by supported extensions  
**Success Criteria**:
- ✅ Only shows: .txt, .md, .pdf, .docx, .xlsx, .pptx
- ✅ Case-insensitive extension matching
- ✅ Shows count by file type (e.g., "PDFs: 5, Word: 3")
- ✅ Ignores hidden files and folders

#### Step 6: Cache Directory Setup
**Task**: Create and validate cache structure  
**Success Criteria**:
- ✅ Creates .folder-mcp in target folder
- ✅ Creates subdirectories: embeddings/, metadata/, vectors/
- ✅ Creates version.json with tool version and timestamp
- ✅ Handles permission errors with clear message

#### Step 7: File Fingerprinting System
**Task**: Generate unique identifiers for files  
**Success Criteria**:
- ✅ Generates SHA-256 hash for each file's content
- ✅ Creates fingerprint object: {hash, path, size, modified}
- ✅ Saves fingerprints to .folder-mcp/index.json
- ✅ Pretty-prints JSON for debugging

#### Step 8: Cache Status Detection
**Task**: Identify what needs processing  
**Success Criteria**:
- ✅ Loads previous index.json if exists
- ✅ Detects new files (not in cache)
- ✅ Detects modified files (hash changed)
- ✅ Detects deleted files (in cache but not on disk)
- ✅ Shows summary: "5 new, 2 modified, 1 deleted"

### Phase 2: File Parsing (Steps 9-13) ✅ COMPLETED

#### Step 9: Text File Parser
**Task**: Extract content from .txt and .md files  
**Success Criteria**:
- ✅ Reads files with UTF-8 encoding
- ✅ Handles different line endings (CRLF/LF)
- ✅ Stores in .folder-mcp/metadata/[hash].json
- ✅ Metadata includes: content, type, originalPath
- ✅ Processes 10MB file without memory issues

#### Step 10: PDF Parser Integration
**Task**: Extract text from PDFs using pdf-parse  
**Success Criteria**:
- ✅ Extracts all text content from PDFs
- ✅ Preserves page numbers in metadata
- ✅ Handles encrypted PDFs gracefully (skip with warning)
- ✅ Caches extracted content with page structure
- ✅ Shows progress for large PDFs

#### Step 11: Word Document Parser
**Task**: Extract content from .docx using mammoth  
**Success Criteria**:
- ✅ Extracts paragraphs with style information
- ✅ Identifies headers vs body text
- ✅ Preserves list structure
- ✅ Extracts table data as structured JSON
- ✅ Handles corrupted files without crashing

#### Step 12: Excel Parser
**Task**: Extract data from .xlsx using xlsx library  
**Success Criteria**:
- ✅ Extracts all sheets with names
- ✅ Preserves cell formulas as metadata
- ✅ Converts tables to JSON arrays
- ✅ Handles merged cells appropriately
- ✅ Includes sheet names in chunk metadata

#### Step 13: PowerPoint Parser
**Task**: Extract content from .pptx files  
**Success Criteria**:
- ✅ Extracts text from all slides
- ✅ Preserves slide numbers and titles
- ✅ Includes speaker notes
- ✅ Extracts text from shapes and text boxes
- ✅ Orders content logically per slide

### Phase 3: Text Processing & Embeddings (Steps 14-16) ✅ COMPLETED

#### Step 14: Smart Text Chunking
**Task**: Split documents into semantic chunks  
**Success Criteria**:
- ✅ Splits on paragraph boundaries
- ✅ Chunks between 200-500 tokens (using simple tokenizer)
- ✅ 10% overlap between consecutive chunks
- ✅ Never splits mid-sentence
- ✅ Preserves metadata (source, position, type)

#### Step 15: Embedding Model Setup
**Task**: Initialize Nomic Embed model  
**Success Criteria**:
- ✅ Downloads model on first run
- ✅ Shows download progress
- ✅ Caches model in user directory
- ✅ Generates 768-dim embedding for test string
- ✅ Handles offline mode gracefully

**Implementation**: `src/embeddings/index.ts`
- EmbeddingModel class with lazy initialization
- Progress tracking for model downloads
- User cache directory: `~/.cache/folder-mcp-models`
- Full ES module conversion completed
- Comprehensive test system with batch embedding support

#### Step 15.1: GPU-Enabled Embedding Model
**Task**: Replace Nomic Embed with GPU-accelerated Ollama embeddings  
**Success Criteria**:
- ✅ Detects if Ollama CLI is installed and running
- ✅ Provides clear installation instructions if not available
- ✅ Uses Ollama with `nomic-embed-text` model for GPU acceleration
- ✅ Falls back to original Nomic Embed v1.5 if Ollama unavailable
- ✅ Maintains same API interface for backward compatibility
- ✅ Shows GPU/CPU usage status during embedding generation
- ✅ Handles Ollama service startup and model downloading

**Implementation**: `src/embeddings/index.ts`
- GPU-accelerated Ollama integration with automatic detection
- Graceful fallback to CPU-based transformers when Ollama unavailable
- Performance monitoring and GPU status reporting
- Comprehensive testing utilities (`test-cli.ts`, `test-switching.ts`)
- Configuration system supporting multiple embedding models

#### Step 16: Batch Embedding Generation
**Task**: Generate embeddings for all chunks  
**Success Criteria**:
- ✅ Processes chunks in batches of 32
- ✅ Shows progress bar with ETA
- ✅ Saves embeddings to .folder-mcp/embeddings/[hash].json
- ✅ Only processes new/modified files
- ✅ Handles interruption gracefully (resume capable)

**Implementation**: `src/processing/indexing.ts`
- Batch processing with configurable batch size (default 32)
- Progress tracking with ETA calculation and visual progress bar
- Incremental processing - only generates embeddings for new/modified chunks
- Graceful error handling with batch-level recovery
- Resume capability through existing embedding detection
- Performance statistics and timing reports

### Phase 4: Vector Search (Steps 17-19) ✅ COMPLETED

#### Step 17: FAISS Vector Index
**Task**: Create searchable vector index  
**Success Criteria**:
- ✅ Initializes FAISS index with correct dimensions (768)
- ✅ Adds all embeddings with numeric IDs
- ✅ Saves index to .folder-mcp/vectors/index.faiss (binary format)
- ✅ Saves ID mappings to mappings.json
- ✅ Can load and search existing index with faiss.IndexFlatIP.read()

**Implementation**: `src/search/index.ts`
- VectorIndex class with FAISS IndexFlatIP backend
- Binary index persistence with `.faiss` format for fast loading
- ID mapping system linking vector indices to chunk metadata
- Automatic vector dimension detection and validation
- Graceful fallback from binary to JSON vectors when needed

#### Step 18: Similarity Search Function
**Task**: Implement vector similarity search  
**Success Criteria**:
- ✅ Embeds query string with GPU-accelerated model
- ✅ Returns top-K most similar chunks
- ✅ Includes similarity scores (0-1 range with normalization)
- ✅ Retrieves full chunk metadata
- ✅ Handles empty index gracefully

**Implementation**: `src/search/index.ts`
- Inner product similarity search with FAISS IndexFlatIP
- Query embedding generation using GPU-accelerated Ollama/CPU fallback
- Score normalization from raw FAISS scores to 0-1 range
- Automatic k adjustment when k > available vectors
- Full chunk metadata retrieval with source file and line information

#### Step 19: Search CLI Command
**Task**: Add local search command  
**Success Criteria**:
- ✅ `folder-mcp search <folder> <query>` works
- ✅ Shows configurable results with -k parameter
- ✅ Displays source file and location with line ranges
- ✅ Shows content snippets with similarity scores
- ✅ Works without starting server

**Implementation**: `src/search/cli.ts`, `src/cli/commands.ts`
- Interactive search command with progress feedback
- Automatic index building when not present
- Configurable result count with `-k` parameter
- Rich result display showing scores, file paths, and content previews
- Error handling for unindexed folders with helpful guidance

### Phase 5: MCP Integration (Steps 20-22) ✅ COMPLETED

#### Step 20: MCP Server Scaffold
**Task**: Create basic MCP server  
**Success Criteria**:
- ✅ Server starts with `folder-mcp serve <folder>`
- ✅ Listens on default port 3000 (configurable)
- ✅ Implements MCP handshake protocol
- ✅ Logs client connections
- ✅ Graceful shutdown on Ctrl+C

**Implementation**: `src/mcp/server.ts`, `src/cli/commands.ts`
- MCP server class with stdio transport support
- Basic file operations (read_file, search_files, list_files, get_folder_info)
- Command-line interface with configurable port and transport options
- Security features preventing access outside served folder
- Graceful shutdown handling with SIGINT/SIGTERM

#### Step 21: Search Tool Implementation
**Task**: Add search_knowledge tool to MCP  
**Success Criteria**:
- ✅ Tool appears in MCP capability list
- ✅ Accepts parameters: query, top_k, threshold
- ✅ Returns structured results with content and metadata
- ✅ Handles concurrent requests
- ✅ Includes source attribution

**Implementation**: `src/mcp/server.ts`
- Added search_knowledge tool to MCP server tools list
- Implemented handleSearchKnowledge() method with parameter validation
- Integrated with existing EmbeddingModel and VectorIndex infrastructure
- MCP-compliant response format with structured content and metadata
- Lazy initialization for performance with proper error handling
- GPU-accelerated search via Ollama embeddings

#### Step 22: Context Enhancement
**Task**: Improve search results with context  
**Success Criteria**:
- ✅ Includes previous/next chunk for context
- ✅ Expands to full paragraph boundaries
- ✅ Adds document outline (for structured docs)
- ✅ Groups results by source document
- ✅ Deduplicates overlapping results

**Implementation**: `src/search/enhanced.ts` with `search_knowledge_enhanced` MCP tool
- EnhancedVectorSearch class with contextual search functionality
- getContextualChunks() method for previous/next chunk context retrieval
- Paragraph boundary expansion with expandedContent logic
- Document structure extraction for PowerPoint, Word, Excel, and text files
- Result grouping by document in groupAndDeduplicateResults() method
- Overlap deduplication using areChunksOverlapping() and deduplicateResults()
- Full integration with MCP server including enhanced search tool
- Comprehensive test coverage with 15/15 tests passing

### Phase 6: Real-time & Configuration (Steps 23-24) ✅ COMPLETED

#### Step 23: File Watcher Integration
**Task**: Auto-update on file changes  
**Success Criteria**:
- ✅ Detects new files in watched folder
- ✅ Detects modifications to existing files
- ✅ Updates index incrementally
- ✅ Logs update events
- ✅ Debounces rapid changes (1-second delay)

**Implementation**: `src/watch/index.ts`, `src/cli/commands.ts`
- FolderWatcher class with chokidar integration for file system monitoring
- File event handling for add, change, and unlink operations
- Configurable debouncing with 1000ms default delay to handle rapid changes
- Incremental processing that only updates changed files, preserving existing cache
- Full file parsing pipeline integration (text, PDF, Word, Excel, PowerPoint)
- Automatic embedding generation for modified files with GPU/CPU acceleration
- Vector index rebuilding after changes to maintain search functionality
- CLI command `folder-mcp watch <folder>` with customizable options:
  - `--debounce` for delay configuration (default: 1000ms)
  - `--batch-size` for embedding batch processing (default: 32)
  - `--verbose` and `--quiet` for logging control
- Graceful shutdown handling with SIGINT/SIGTERM support and cleanup
- Cross-platform compatibility with Windows-specific readline handling
- Comprehensive error handling and logging at multiple verbosity levels

#### Step 24: Configuration System
**Task**: Add configuration file support  
**Success Criteria**:
- ✅ Loads .folder-mcp.yaml from .folder-mcp folder
- ✅ Configurable: chunk_size, overlap, model_name
- ✅ Configurable: file_extensions, ignore_patterns
- ✅ CLI args override config file
- ✅ Validates configuration schema

**Implementation**: `src/config/resolver.ts`, `src/config/local.ts`, `src/config/cli.ts`
- Configuration priority system: CLI args > local config > global config
- YAML-based local configuration files in `.folder-mcp/.folder-mcp.yaml`
- Comprehensive configuration commands (`config init`, `config show`, `config set`, etc.)
- Schema validation with detailed error messages
- CLI options for all configurable parameters (`--chunk-size`, `--model`, `--show-config`, etc.)
- Source tracking to show where each setting comes from (cli/local/global)
- Global configuration defaults in `config.yaml` with multiple embedding models
- Local configuration initialization and management system

### Phase 7: Production Ready (Step 25) ✅ COMPLETED

#### Step 25: Error Recovery
**Task**: Comprehensive error handling  
**Success Criteria**:
- ✅ Continues indexing after single file failure
- ✅ Logs errors to .folder-mcp/errors.log
- ✅ Retries failed embeddings (3 attempts)
- ✅ Shows clear error summaries
- ✅ Never leaves cache in corrupted state

**Implementation Files**:
- `src/utils/errorRecovery.ts` - Core error recovery system with ErrorRecoveryManager, AtomicFileOperations, and ResumableProgress
- `src/processing/indexing.ts` - Integration of error recovery into file processing pipeline
- `src/watch/index.ts` - Error recovery integration for real-time file watching
- `src/mcp/server.ts` - Error recovery for MCP server operations
- `tests/test-phase7-production.js` - Comprehensive test suite (11/11 tests passing)

**Features Implemented**:
- JSON-formatted error logging with detailed metadata (timestamp, operation, error type, stack trace, retry count)
- Exponential backoff retry logic (3 retries with 1s/2s/4s delays for production, optimized 100ms delays for tests)
- Atomic file operations to prevent cache corruption during concurrent access
- Resumable progress tracking for interrupted operations (saves progress every file)
- Integration across all major operations (file parsing, embedding generation, cache operations)
- Intelligent test environment detection for 35x faster test execution
- Comprehensive error summaries and statistics reporting
- Never leaves cache in corrupted state - all operations are atomic or resumable

### Phase 8: Streamline UX and Configuration Flow (Steps 26-34) ⬅️ Current

#### Step 26: Runtime Configuration Structure ✅ COMPLETED
**Task**: Create runtime configuration JSON with smart defaults  
**Success Criteria**:
- ✅ Define runtime config schema (model, port, languages, etc.)
- ✅ Generate default runtime.json with multilingual model
- ✅ Set sensible defaults (chunk_size: 400, workers: CPU count)
- ✅ Include all configurable parameters in structure
- ✅ Create TypeScript interfaces for type safety
- ✅ Document each configuration parameter purpose

**Implementation**: `src/config/runtime.ts`, `src/config/system.ts`, `tests/test-phase8-ux.js`
- Complete RuntimeConfig interface with all required sections: system, processing, server, ui, files, cache, metadata
- Smart defaults with CPU count-based worker optimization and memory-based batch size optimization
- System capabilities detection including CPU, memory, GPU, and software availability
- Runtime configuration generation with hash-based change detection for re-indexing triggers
- Comprehensive TypeScript interfaces with full type safety
- Configuration optimization based on detected system performance tier (low/medium/high)
- Cache-enabled runtime configuration with TTL and system profile caching
- Full validation system with detailed error messages
- Comprehensive test suite with 7 specific tests covering all aspects

#### Step 27: Configuration Caching System ✅ COMPLETED
**Task**: Implement configuration persistence and caching with Ollama integration  
**Success Criteria**:
- ✅ Save runtime config to ~/.folder-mcp/last-runtime.json
- ✅ Load previous runtime on startup if exists
- ✅ Cache system profile in ~/.folder-mcp/system-profile.json
- ✅ Store Ollama embedding model list with 24-hour expiry
- ✅ Fetch embedding models directly from Ollama API
- ✅ Implement cache invalidation mechanism
- ✅ Handle corrupted cache files gracefully

**Implementation**:
- `src/config/runtime.ts`
- `src/config/system.ts`
- `src/config/ollama.ts`
- `src/config/cache.ts`
- `src/config/resolver.ts`
- `tests/test-phase8-ux.js`

All success criteria are fully implemented and tested. See `tests/test-phase8-ux.js` for comprehensive test coverage.

#### Step 28: Configuration Validation System ✅ COMPLETED
- ✅ Implement comprehensive configuration validation
- ✅ Add path validation for folders and files
- ✅ Add numeric validation for parameters
- ✅ Add network validation for ports and hosts
- ✅ Add model validation for embedding models
- ✅ Implement validation summary generation
- ✅ Add validation error handling
- ✅ Add validation caching
- ✅ Add validation tests
- ✅ Add validation documentation

**Implementation Files:**
- `src/config/validation/index.ts` - Main validation system
- `src/config/validation/path.ts` - Path validation
- `src/config/validation/numeric.ts` - Numeric validation
- `src/config/validation/network.ts` - Network validation
- `src/config/validation/model.ts` - Model validation
- `src/config/validation/summary.ts` - Validation summary
- `src/config/validation/cache.ts` - Validation caching
- `src/config/validation/errors.ts` - Validation errors
- `src/config/validation/types.ts` - Validation types
- `src/config/validation/utils.ts` - Validation utilities
- `src/config/validation/constants.ts` - Validation constants
- `src/config/validation/index.test.ts` - Validation tests
- `src/config/validation/README.md` - Validation documentation

#### Step 29: Hugging Face Hub Integration for Model Metadata ⬅️ Current
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

#### Step 30: CLI Parameter Override System
**Task**: Allow CLI parameters to override runtime defaults  
**Success Criteria**:
- 📋 Parse all CLI parameters into runtime config
- 📋 Override only specified parameters
- 📋 Detect changes in embedding config (model, chunk_size, overlap)
- 📋 Trigger re-indexing if embedding params changed
- 📋 Show warning: "Config changed, re-indexing required"
- 📋 Update cached runtime with successful execution
- 📋 update --help for the tool

#### Step 31: Configuration Wizard Implementation
**Task**: Create --wizard interactive configuration generator  
**Success Criteria**:
- 📋 Launch with folder-mcp --wizard
- 📋 Load current runtime config as defaults
- 📋 Ask questions with current values pre-filled
- 📋 Generate CLI command string from answers
- 📋 Display command and ask: "Run this command? Y/n"
- 📋 Execute command or copy to clipboard

#### Step 32: System Detection Integration
**Task**: Auto-detect system capabilities for smart defaults  
**Success Criteria**:
- 📋 Detect CPU, RAM, GPU on first run
- 📋 Update runtime config with optimal settings
- 📋 Select best model based on system tier
- �� Integrate with Ollama for model availability
- 📋 Run only when cache missing or --detect flag
- 📋 Show detected specs in --show-config output

#### Step 33: Full-Screen UI Implementation
**Task**: Create main operation interface  
**Success Criteria**:
- 📋 Launch after configuration is validated
- 📋 Display real-time indexing progress
- 📋 Show file processing statistics
- 📋 Monitor memory and performance
- 📋 Include error log panel
- 📋 Add keyboard navigation

#### Step 34: MCP Server UI Enhancement
**Task**: Improve server display and connection info  
**Success Criteria**:
- 📋 Show connection details prominently
- 📋 Display Claude configuration JSON
- 📋 Add copy instructions for setup
- 📋 Include server status monitoring
- 📋 Show "Chat with folder" placeholder
- 📋 Integrate with full-screen UI

### Phase 9: Release 1.0.0 (Steps 35-39) 📋 PLANNED

#### Step 35: Performance Optimization
**Task**: Optimize for large folders  
**Success Criteria**:
- Parallel file processing (worker pool)
- Streaming for large files (>50MB)
- Memory usage stays under 2GB
- Indexes 1000 documents in <5 minutes
- Progress saves allow resume

#### Step 36: Test Suite
**Task**: Comprehensive test coverage  
**Success Criteria**:
- generate a test folder with all supported file types, varying sizes, and structures and challenging content. multiple languages in the same folder.
- Unit tests for each parser
- Integration test for full pipeline
- Mock file system for tests
- Tests for error conditions
- Write tests that emulate real usage of the tool, not just generic functionality testing
- >80% code coverage

#### Step 37: Documentation
**Task**: Complete user documentation  
**Success Criteria**:
- README with quick start guide
- Examples for each command
- Configuration reference
- Troubleshooting guide
- Architecture diagram

#### Step 38: NPM Package Preparation
**Task**: Prepare for publishing  
**Success Criteria**:
- Clean npm pack output
- No dev dependencies in bundle
- Binary properly configured
- Version 1.0.0 tagged
- LICENSE file included

#### Step 39: Release 1.0.0
**Task**: Publish to npm registry  
**Success Criteria**:
- `npm install -g folder-mcp` works
- All commands function globally
- GitHub repository public
- CI/CD pipeline configured
- First user successfully indexes folder

### Phase 10: Chat with Your Folder (Steps 40-44) 📋 FUTURE
#### Step 40: Chat Configuration Wizard
**Task**: Create interactive wizard for chat setup  
**Success Criteria**:
- Launch with `folder-mcp chat --setup`
- Cloud vs Local GPU selection interface
- Provider selection with clear descriptions
- API key validation with test calls
- Ollama model detection and recommendation
- Save chat configuration to `.folder-mcp/chat-config.json`
- Integration with existing configuration system

**Chat Configuration Flow:**
```
folder-mcp chat <folder> (first time)
→ Chat Setup Wizard
   ├── Choose: Cloud or Local GPU?
   │
   ├─ Cloud Path:
   │  ├── Select Provider:
   │  │   ├── OpenAI (GPT-4, GPT-3.5-turbo)
   │  │   ├── Anthropic (Claude 3.5 Sonnet, Claude 3 Haiku)
   │  │   ├── Google (Gemini Pro, Gemini Flash)
   │  │   └── Azure OpenAI
   │  ├── Enter API Key → Validate → Test call
   │  ├── Auto-select best model for provider
   │  └── Save config → Launch chat
   │
   └─ Local GPU Path:
      ├── Check Ollama installation
      ├── Scan available models
      ├── Show model list:
      │   ├── ✅ llama3.1:8b (installed, 4.7GB)
      │   ├── ❌ llama3.1:70b (not installed, 40GB)
      │   ├── ✅ mistral:7b (installed, 4.1GB)
      │   └── 💡 Recommended: llama3.1:8b (best for your system)
      ├── Auto-recommend based on system specs
      ├── Download model if needed (with progress)
      └── Save config → Launch chat
```

#### Step 41: Cloud Provider Integration
**Task**: Implement cloud LLM provider APIs  
**Success Criteria**:
- OpenAI API integration with streaming responses
- Anthropic Claude API with proper formatting
- Google Gemini API integration
- Azure OpenAI support
- API key validation and error handling
- Rate limiting and quota management
- Cost estimation display

#### Step 42: Local LLM Integration
**Task**: Implement Ollama local LLM integration  
**Success Criteria**:
- Ollama service detection and health checks
- Model listing with installation status
- Automatic model downloading with progress
- System resource monitoring during chat
- Model recommendation based on RAM/VRAM
- Fallback to smaller models if needed
- Performance optimization for local inference

#### Step 43: Interactive Chat Interface
**Task**: Create the main chat experience  
**Success Criteria**:
- CLI-based chat interface with rich formatting
- Context-aware responses using vector search
- Show source documents for each response
- Real-time typing indicators
- Message history in session
- Commands: `/help`, `/sources`, `/clear`, `/export`
- Graceful error handling and retries
- Integration with existing full-screen UI

**Chat Interface Flow:**
```
folder-mcp chat <folder>
→ Load chat config → Initialize LLM → Start chat session

Chat Interface:
┌─ Chat with Documents in: ./my-folder ─────────────────────┐
│ 📁 Sources: 47 documents indexed                          │
│ 🤖 Model: Claude 3.5 Sonnet (Cloud) / llama3.1:8b (Local)│
├────────────────────────────────────────────────────────────┤
│ You: What are the main topics in my research papers?      │
│                                                            │
│ 🤖 Assistant: Based on your documents, I found 3 main    │
│ research topics:                                           │
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

#### Step 44: Chat History & Export
**Task**: Implement chat session management  
**Success Criteria**:
- Save chat sessions to `.folder-mcp/chat-history/`
- Session naming and organization
- Resume previous chat sessions
- Export options: Markdown, JSON, TXT
- Search chat history
- Delete old sessions
- Session sharing capabilities
- Privacy controls for sensitive conversations

---

## 7. GitHub Project Management

This section provides guidance for setting up GitHub Issues to track development progress.

### Quick Setup Instructions

1. **Go to your GitHub repository**: https://github.com/okets/folder-mcp
2. **Click "Issues" tab** → **"New Issue"**
3. **Create issues for each step** using the templates below
4. **Set labels and milestones** as indicated
5. **Close completed issues** (Steps 1-27) immediately after creating

### GitHub Milestones

Create these milestones in GitHub (Issues → Milestones → New milestone):

1. **Phase 1 - Foundation** (Due: Completed) 
2. **Phase 2 - Parsing** (Due: Completed)
3. **Phase 3 - Processing** (Due: Completed)
4. **Phase 4 - Search** (Due: Completed) 
5. **Phase 5 - MCP Integration** (Due: Completed)
6. **Phase 6 - Real-time & Configuration** (Due: Completed)
7. **Phase 7 - Production Ready** (Due: Completed)
8. **Phase 8 - Streamline UX** (Due: Current)
9. **Phase 9 - Release Preparation** (Due: TBD)
10. **Phase 10 - Chat Interface** (Due: TBD)

### GitHub Labels

Create these labels for categorization:

- `enhancement` (blue), `foundation` (gray), `cli` (green)
- `filesystem` (yellow), `parsing` (orange), `caching` (purple)
- `processing` (pink), `embeddings` (red), `search` (light blue)
- `mcp` (dark blue), `realtime` (brown), `config` (lime)
- `reliability` (olive), `performance` (maroon), `testing` (navy)
- `documentation` (silver), `packaging` (teal), `release` (gold)

### Issue Template

For each step in the roadmap, create a GitHub issue with:

**Title**: `[Step X] Brief Description` (e.g., "[Step 28] Configuration Validation System")

**Labels**: `enhancement` + relevant category (e.g., `config`)

**Milestone**: Appropriate phase (e.g., "Phase 8 - Streamline UX")

**Description**:
```
### Description
[Copy the task description from the roadmap]

### Success Criteria
[Copy the success criteria checklist from the roadmap]

### Status
- ✅ **COMPLETED** (for steps 1-27)
- 🔄 **TODO** (for steps 28-43)
```


### Benefits

- **Clear progress tracking**: See exactly what's done vs. what's planned
- **Contributor onboarding**: New developers can see the roadmap and pick tasks
- **User expectations**: Users understand current capabilities vs. future features  
- **Development focus**: Prioritized task list for systematic development
- **Community engagement**: Users can vote on features and contribute to specific areas

---

**This roadmap provides a clear, linear path from the current state to a fully functional universal folder-to-MCP tool. Each step has concrete success criteria that must be met before moving to the next step.**
