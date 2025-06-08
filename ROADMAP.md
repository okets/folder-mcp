# folder-mcp Development Roadmap

**Universal Folder-to-MCP-Server Tool**

## Project Description

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
- Smart caching system - embeddings stored in .folder-mcp-cache
- Incremental updates - only processes changed files

## Tech Stack

### Core Technologies
- **Language**: TypeScript
- **Runtime**: Node.js
- **Build Tool**: TSC (TypeScript Compiler)
- **Package Manager**: npm

### Core Dependencies

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

## Project Structure

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

## Development Progress

**Current Status**: Step 14/30 - Smart Text Chunking ⚡

### Phase 1: Foundation (Steps 1-8) ✅ COMPLETED
- ✅ **Step 1**: Initialize TypeScript Project
- ✅ **Step 2**: Create CLI Executable
- ✅ **Step 3**: Implement Commander.js CLI
- ✅ **Step 4**: Recursive File Listing
- ✅ **Step 5**: File Type Filtering
- ✅ **Step 6**: Cache Directory Setup
- ✅ **Step 7**: File Fingerprinting System
- ✅ **Step 8**: Cache Status Detection

### Phase 2: File Parsing (Steps 9-13) ✅ COMPLETED
- ✅ **Step 9**: Text File Parser
- ✅ **Step 10**: PDF Parser Integration
- ✅ **Step 11**: Word Document Parser
- ✅ **Step 12**: Excel Parser
- ✅ **Step 13**: PowerPoint Parser

### Phase 3: Text Processing & Embeddings (Steps 14-16) 🚧 IN PROGRESS
- ⚡ **Step 14**: Smart Text Chunking (CURRENT)
- 🔄 **Step 15**: Embedding Model Setup
- 🔄 **Step 16**: Batch Embedding Generation

### Phase 4: Vector Search (Steps 17-19) 📋 PLANNED
- 📋 **Step 17**: FAISS Vector Index
- 📋 **Step 18**: Similarity Search Function
- 📋 **Step 19**: Search CLI Command

### Phase 5: MCP Integration (Steps 20-22) 📋 PLANNED
- 📋 **Step 20**: MCP Server Scaffold
- 📋 **Step 21**: Search Tool Implementation
- 📋 **Step 22**: Context Enhancement

### Phase 6: Real-time & Configuration (Steps 23-24) 📋 PLANNED
- 📋 **Step 23**: File Watcher Integration
- 📋 **Step 24**: Configuration System

### Phase 7: Production Ready (Steps 25-27) 📋 PLANNED
- 📋 **Step 25**: Error Recovery
- 📋 **Step 26**: Performance Optimization
- 📋 **Step 27**: Test Suite

### Phase 8: Release (Steps 28-30) 📋 PLANNED
- 📋 **Step 28**: Documentation
- 📋 **Step 29**: NPM Package Preparation
- 📋 **Step 30**: Release

---

## Detailed Task Breakdown

### ⚡ CURRENT: Step 14 - Smart Text Chunking
**Task**: Split documents into semantic chunks  
**Success Criteria**:
- ✓ Splits on paragraph boundaries
- ✓ Chunks between 200-500 tokens (using simple tokenizer)
- ✓ 10% overlap between consecutive chunks
- ✓ Never splits mid-sentence
- ✓ Preserves metadata (source, position, type)

### 🔄 NEXT: Step 15 - Embedding Model Setup
**Task**: Initialize Nomic Embed model  
**Success Criteria**:
- Downloads model on first run
- Shows download progress
- Caches model in user directory
- Generates 768-dim embedding for test string
- Handles offline mode gracefully

### Phase 3 Remaining Tasks

#### Step 16: Batch Embedding Generation
**Task**: Generate embeddings for all chunks  
**Success Criteria**:
- Processes chunks in batches of 32
- Shows progress bar with ETA
- Saves embeddings to .folder-mcp-cache/embeddings/[hash].json
- Only processes new/modified files
- Handles interruption gracefully (resume capable)

### Phase 4: Vector Search

#### Step 17: FAISS Vector Index
**Task**: Create searchable vector index  
**Success Criteria**:
- Initializes FAISS index with correct dimensions (768)
- Adds all embeddings with numeric IDs
- Saves index to .folder-mcp-cache/vectors/index.faiss
- Saves ID mappings to mappings.json
- Can load and search existing index

#### Step 18: Similarity Search Function
**Task**: Implement vector similarity search  
**Success Criteria**:
- Embeds query string
- Returns top-K most similar chunks
- Includes similarity scores (0-1 range)
- Retrieves full chunk metadata
- Handles empty index gracefully

#### Step 19: Search CLI Command
**Task**: Add local search command  
**Success Criteria**:
- `folder-mcp search <folder> <query>` works
- Shows top 5 results with snippets
- Displays source file and location
- Highlights why each result matched
- Works without starting server

### Phase 5: MCP Integration

#### Step 20: MCP Server Scaffold
**Task**: Create basic MCP server  
**Success Criteria**:
- Server starts with `folder-mcp serve <folder>`
- Listens on default port 3000 (configurable)
- Implements MCP handshake protocol
- Logs client connections
- Graceful shutdown on Ctrl+C

#### Step 21: Search Tool Implementation
**Task**: Add search_knowledge tool to MCP  
**Success Criteria**:
- Tool appears in MCP capability list
- Accepts parameters: query, top_k, threshold
- Returns structured results with content and metadata
- Handles concurrent requests
- Includes source attribution

#### Step 22: Context Enhancement
**Task**: Improve search results with context  
**Success Criteria**:
- Includes previous/next chunk for context
- Expands to full paragraph boundaries
- Adds document outline (for structured docs)
- Groups results by source document
- Deduplicates overlapping results

### Phase 6: Real-time & Configuration

#### Step 23: File Watcher Integration
**Task**: Auto-update on file changes  
**Success Criteria**:
- Detects new files in watched folder
- Detects modifications to existing files
- Updates index incrementally
- Logs update events
- Debounces rapid changes (1-second delay)

#### Step 24: Configuration System
**Task**: Add configuration file support  
**Success Criteria**:
- Loads .folder-mcp.json from folder
- Configurable: chunk_size, overlap, model_name
- Configurable: file_extensions, ignore_patterns
- CLI args override config file
- Validates configuration schema

### Phase 7: Production Ready

#### Step 25: Error Recovery
**Task**: Comprehensive error handling  
**Success Criteria**:
- Continues indexing after single file failure
- Logs errors to .folder-mcp-cache/errors.log
- Retries failed embeddings (3 attempts)
- Shows clear error summaries
- Never leaves cache in corrupted state

#### Step 26: Performance Optimization
**Task**: Optimize for large folders  
**Success Criteria**:
- Parallel file processing (worker pool)
- Streaming for large files (>50MB)
- Memory usage stays under 2GB
- Indexes 1000 documents in <5 minutes
- Progress saves allow resume

#### Step 27: Test Suite
**Task**: Comprehensive test coverage  
**Success Criteria**:
- Unit tests for each parser
- Integration test for full pipeline
- Mock file system for tests
- Tests for error conditions
- >80% code coverage

### Phase 8: Release

#### Step 28: Documentation
**Task**: Complete user documentation  
**Success Criteria**:
- README with quick start guide
- Examples for each command
- Configuration reference
- Troubleshooting guide
- Architecture diagram

#### Step 29: NPM Package Preparation
**Task**: Prepare for publishing  
**Success Criteria**:
- Clean npm pack output
- No dev dependencies in bundle
- Binary properly configured
- Version 1.0.0 tagged
- LICENSE file included

#### Step 30: Release
**Task**: Publish to npm registry  
**Success Criteria**:
- `npm install -g folder-mcp` works
- All commands function globally
- GitHub repository public
- CI/CD pipeline configured
- First user successfully indexes folder

---

## Architecture Overview

### Data Flow
```
📁 Local Folder → 🔍 File Scanner → 📄 Content Parsers → ✂️ Smart Chunker → 🧠 Embeddings → 🔍 Vector Index → 📡 MCP Server
```

### File Processing Pipeline
```
1. File Discovery → 2. Type Detection → 3. Content Extraction → 4. Chunking → 5. Embedding → 6. Indexing → 7. Serving
```

### Cache Structure
```
.folder-mcp-cache/
├── index.json          # File fingerprints and status
├── version.json        # Tool version and metadata
├── metadata/           # Extracted content per file
│   └── [hash].json
├── embeddings/         # Vector embeddings per chunk
│   └── [hash].json
├── vectors/            # FAISS search index
│   ├── index.faiss
│   └── mappings.json
└── errors.log          # Processing errors
```

## Success Metrics

### Performance Targets
- **Indexing Speed**: 1000 documents in <5 minutes
- **Memory Usage**: <2GB for large folders
- **Search Latency**: <100ms for similarity search
- **Accuracy**: >90% relevant results in top 5

### Quality Metrics
- **Code Coverage**: >80% test coverage
- **Error Recovery**: Graceful handling of all file types
- **User Experience**: Clear progress and error messages
- **Compatibility**: Works with all major MCP clients

---

**This roadmap provides a clear, linear path from the current state (Step 14) to a fully functional universal folder-to-MCP tool. Each step has concrete success criteria that must be met before moving to the next step.**
