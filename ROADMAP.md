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

**Current Status**: Step 16/30 - Batch Embedding Generation ⚡

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
- ✅ **Step 14**: Smart Text Chunking
- ✅ **Step 15**: Embedding Model Setup
- ⚡ **Step 16**: Batch Embedding Generation (CURRENT)

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

### ✅ COMPLETED: Step 1 - Initialize TypeScript Project
**Task**: Create project structure with TypeScript configuration  
**Success Criteria**:
- ✅ package.json with name "folder-mcp"
- ✅ tsconfig.json configured for Node.js
- ✅ src/index.ts with console.log("Hello World")
- ✅ npm run build compiles successfully
- ✅ npm start prints "Hello World"

### ✅ COMPLETED: Step 2 - Create CLI Executable
**Task**: Make globally installable CLI tool  
**Success Criteria**:
- ✅ bin field in package.json points to CLI entry
- ✅ Shebang line in CLI file: #!/usr/bin/env node
- ✅ npm link makes folder-mcp available globally
- ✅ Running folder-mcp prints "Hello World"

### ✅ COMPLETED: Step 3 - Implement Commander.js CLI
**Task**: Add command structure with Commander  
**Success Criteria**:
- ✅ folder-mcp --version shows version
- ✅ folder-mcp --help shows available commands
- ✅ folder-mcp index <folder> command exists
- ✅ Shows error for missing folder argument

### ✅ COMPLETED: Step 4 - Recursive File Listing
**Task**: List all files in target folder using glob  
**Success Criteria**:
- ✅ folder-mcp index ./test-folder lists all files
- ✅ Shows relative paths from target folder
- ✅ Displays total file count
- ✅ Handles non-existent folders gracefully

### ✅ COMPLETED: Step 5 - File Type Filtering
**Task**: Filter by supported extensions  
**Success Criteria**:
- ✅ Only shows: .txt, .md, .pdf, .docx, .xlsx, .pptx
- ✅ Case-insensitive extension matching
- ✅ Shows count by file type (e.g., "PDFs: 5, Word: 3")
- ✅ Ignores hidden files and folders

### ✅ COMPLETED: Step 6 - Cache Directory Setup
**Task**: Create and validate cache structure  
**Success Criteria**:
- ✅ Creates .folder-mcp-cache in target folder
- ✅ Creates subdirectories: embeddings/, metadata/, vectors/
- ✅ Creates version.json with tool version and timestamp
- ✅ Handles permission errors with clear message

### ✅ COMPLETED: Step 7 - File Fingerprinting System
**Task**: Generate unique identifiers for files  
**Success Criteria**:
- ✅ Generates SHA-256 hash for each file's content
- ✅ Creates fingerprint object: {hash, path, size, modified}
- ✅ Saves fingerprints to .folder-mcp-cache/index.json
- ✅ Pretty-prints JSON for debugging

### ✅ COMPLETED: Step 8 - Cache Status Detection
**Task**: Identify what needs processing  
**Success Criteria**:
- ✅ Loads previous index.json if exists
- ✅ Detects new files (not in cache)
- ✅ Detects modified files (hash changed)
- ✅ Detects deleted files (in cache but not on disk)
- ✅ Shows summary: "5 new, 2 modified, 1 deleted"

### ✅ COMPLETED: Step 9 - Text File Parser
**Task**: Extract content from .txt and .md files  
**Success Criteria**:
- ✅ Reads files with UTF-8 encoding
- ✅ Handles different line endings (CRLF/LF)
- ✅ Stores in .folder-mcp-cache/metadata/[hash].json
- ✅ Metadata includes: content, type, originalPath
- ✅ Processes 10MB file without memory issues

### ✅ COMPLETED: Step 10 - PDF Parser Integration
**Task**: Extract text from PDFs using pdf-parse  
**Success Criteria**:
- ✅ Extracts all text content from PDFs
- ✅ Preserves page numbers in metadata
- ✅ Handles encrypted PDFs gracefully (skip with warning)
- ✅ Caches extracted content with page structure
- ✅ Shows progress for large PDFs

### ✅ COMPLETED: Step 11 - Word Document Parser
**Task**: Extract content from .docx using mammoth  
**Success Criteria**:
- ✅ Extracts paragraphs with style information
- ✅ Identifies headers vs body text
- ✅ Preserves list structure
- ✅ Extracts table data as structured JSON
- ✅ Handles corrupted files without crashing

### ✅ COMPLETED: Step 12 - Excel Parser
**Task**: Extract data from .xlsx using xlsx library  
**Success Criteria**:
- ✅ Extracts all sheets with names
- ✅ Preserves cell formulas as metadata
- ✅ Converts tables to JSON arrays
- ✅ Handles merged cells appropriately
- ✅ Includes sheet names in chunk metadata

### ✅ COMPLETED: Step 13 - PowerPoint Parser
**Task**: Extract content from .pptx files  
**Success Criteria**:
- ✅ Extracts text from all slides
- ✅ Preserves slide numbers and titles
- ✅ Includes speaker notes
- ✅ Extracts text from shapes and text boxes
- ✅ Orders content logically per slide

### ✅ COMPLETED: Step 14 - Smart Text Chunking
**Task**: Split documents into semantic chunks  
**Success Criteria**:
- ✅ Splits on paragraph boundaries
- ✅ Chunks between 200-500 tokens (using simple tokenizer)
- ✅ 10% overlap between consecutive chunks
- ✅ Never splits mid-sentence
- ✅ Preserves metadata (source, position, type)

### ✅ COMPLETED: Step 15 - Embedding Model Setup
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

### ⚡ CURRENT: Step 16 - Batch Embedding Generation

### ⚡ CURRENT: Step 16 - Batch Embedding Generation
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

**This roadmap provides a clear, linear path from the current state (Step 14) to a fully functional universal folder-to-MCP tool. Each step has concrete success criteria that must be met before moving to the next step.**

---

## GitHub Project Management Setup

### Quick Setup Instructions

To set up GitHub Issues for project tracking:

1. **Go to your GitHub repository**: https://github.com/okets/folder-mcp
2. **Click "Issues" tab** → **"New Issue"**
3. **Create issues for each step** using the templates below
4. **Set labels and milestones** as indicated
5. **Close issues 1-14** immediately after creating (mark as completed)

### GitHub Milestones to Create

Create these milestones in GitHub (Issues → Milestones → New milestone):

1. **Phase 1 - Foundation** (Due: Completed) 
2. **Phase 2 - Parsing** (Due: Completed)
3. **Phase 3 - Processing** (Due: TBD)
4. **Phase 4 - Search** (Due: TBD) 
5. **Phase 5 - MCP Integration** (Due: TBD)
6. **Phase 6 - Advanced Features** (Due: TBD)
7. **Phase 7 - Optimization** (Due: TBD)
8. **Phase 8 - Release Preparation** (Due: TBD)

### GitHub Labels to Create

- `enhancement` (blue)
- `foundation` (gray) 
- `cli` (green)
- `filesystem` (yellow)
- `parsing` (orange)
- `caching` (purple)
- `processing` (pink)
- `embeddings` (red)
- `search` (light blue)
- `mcp` (dark blue)
- `realtime` (brown)
- `config` (lime)
- `reliability` (olive)
- `performance` (maroon)
- `testing` (navy)
- `documentation` (silver)
- `packaging` (teal)
- `release` (gold)

### GitHub Issue Templates

For each step in the roadmap above, create a GitHub issue with this format:

**Title**: `[Step X] Brief Description` (e.g., "Smart Text Chunking")

**Labels**: `enhancement` + relevant category (e.g., `processing`)

**Milestone**: Appropriate phase (e.g., "Phase 3 - Processing")

**Description Template**:
```
### Description
[Copy the task description from the roadmap]

### Success Criteria
[Copy the success criteria checklist from the roadmap]

### Status
- ✅ **COMPLETED** (for steps 1-14)
- 🔄 **TODO** (for steps 15-30)
```

### Issue Creation Workflow

1. **Create new issue**
2. **Copy title** from roadmap step
3. **Copy description and success criteria**
4. **Add appropriate labels** 
5. **Set milestone**
6. **For steps 1-14**: Immediately close with comment "✅ COMPLETED - Already implemented"
7. **For steps 15-30**: Leave open as TODO

### Automated Alternative

If you have GitHub CLI installed (`gh`), you can automate issue creation:

```bash
# Install GitHub CLI first: https://cli.github.com/
# Then run from project directory:

gh issue create --title "[Step 14] Smart Text Chunking" --body "See ROADMAP.md Step 14" --label "enhancement,processing" --milestone "Phase 3 - Processing"
# Repeat for each step...
```

### Project Status After Setup

After creating all issues:
- ✅ **14 Closed Issues** (Completed tasks)
- 🔄 **16 Open Issues** (TODO tasks)  
- 📊 **8 Milestones** (Development phases)
- 🏷️ **18 Labels** (Task categorization)

### Benefits

- **Clear progress tracking**: See exactly what's done vs. what's planned
- **Contributor onboarding**: New developers can see the roadmap and pick tasks
- **User expectations**: Users understand current capabilities vs. future features  
- **Development focus**: Prioritized task list for systematic development
- **Community engagement**: Users can vote on features and contribute to specific areas

The repository now has comprehensive documentation showing both the current basic implementation and the ambitious roadmap ahead!
