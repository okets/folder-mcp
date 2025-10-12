# EPIC: Phase 10 - Semantic Endpoint Navigation

**Epic Type**: Core Feature Enhancement
**Phase**: 10 - Semantic Endpoint Navigation
**Priority**: Critical - Makes the system usable for LLM agents
**Total Duration**: 10.5 Sprints (~35-44 hours)
**Pre-production**: YES - No backwards compatibility needed
**Principle**: FAIL FAST - No silent failures or empty fallbacks

**Note**: Sprint 7.5 added as ad-hoc infrastructure enhancement to prepare vec0 storage for native vector search in Sprint 8

## 🎯 Epic Vision: LLM-Native Navigation

Transform folder-mcp from a basic file server into an intelligent knowledge navigator that LLMs can explore semantically. Every endpoint returns rich semantic metadata enabling agents to make informed decisions without wasting context. Building on Phase 9's robust key phrase extraction and document-level aggregation.

## Current State (Post Phase 9 Completion)

### ✅ Phase 9: Multi-Folder Indexing with Quality Key Phrases
- **Robust indexing flow**: Multi-folder support with quality semantic extraction
- **Key phrase extraction COMPLETE**: Both chunk-level and document-level extraction
- **Quality transformation achieved**:
  - Key phrases: >80% multiword phrases (vs previous 11% single words)
  - Topics: Domain-specific extraction from actual content
  - Readability: Realistic 40-60 scores for technical documentation
- **Database schema ready**:
  - `documents` table: `document_keywords` field with extracted key phrases
  - `chunks` table: `key_phrases` field with chunk-level extraction
  - Both `keywords_extracted` and `embedding_generated` flags tracked
- **Multi-model support**: ONNX and Python GPU models both working
- **Performance maintained**: Fast indexing with quality extraction

## 📦 Context-Efficient Response Design

All endpoints follow these principles to minimize LLM context usage:
1. **No redundant fields** - Derivable information (name from path, level from position) is omitted
2. **Echo request parameters** - Use same terminology as request (base_folder_path, relative_sub_path)
3. **Flat where possible** - Avoid nested objects when top-level fields work
4. **Semantic over structural** - Focus on meaning, not hierarchy

## 🎯 Navigation Paths

### Exploration Path (General Understanding)
When an LLM needs to understand what's available and explore a knowledge base:
```
get_server_info() → list_folders() → explore() → get_document_text()
                                         ↓
                                   (sees both dirs & files)
                                         ↓
                              (can navigate or read directly)
```

### Search Path (Specific Information)
When an LLM needs to find specific information quickly:
```
get_server_info() → search_content() → get_document_metadata() → get_chunks() or get_document_text()
                        ↓
                  (finds relevant chunks)
```

### Document Discovery Path (Topic-Based)
When an LLM needs to find which documents cover a topic:
```
get_server_info() → find_documents() → get_document_text() or explore()
                        ↓
                  (finds relevant documents)
```

## Success Criteria

### Navigation Enhancement Goals
1. **Server Discovery**: `get_server_info` provides capabilities and available endpoints
2. **Folder Overview**: `list_folders` shows all configured folders with aggregated key phrases
3. **Structure Navigation**: `explore` provides hierarchical navigation with breadcrumbs
4. **Document Listing**: `list_documents` surfaces documents in current path (not overwhelming)
5. **Document Metadata**: `get_document_metadata` provides chunk-level key phrases for section discovery
6. **Chunk Retrieval**: `get_chunks` enables targeted content extraction after metadata exploration
7. **Text Extraction**: `get_document_text` returns clean extracted text without semantic overlay
8. **Raw File Access**: `get_document_raw` fetches raw file content (binary or text)
9. **Content Search**: `search_content` finds specific chunks using embeddings with intelligent ranking
10. **Document Discovery**: `find_documents` identifies relevant documents for a topic
11. **Performance**: All endpoints respond in <200ms using pre-computed data

### Validation Methodology (A2E Testing)
- **Agent-to-Endpoint**: Use MCP tools directly, no scripts or curl commands
- **Ground Truth Validation**: Read known files, then test endpoints return expected content
- **🚨 Critical**: If MCP disconnects, STOP and ask user to reconnect - no workarounds

## Sprint Breakdown

### ✅ Sprint 7.5: Vec0 Infrastructure Migration (6-8 hours) - COMPLETED
**Goal**: Migrate embedding storage from TEXT to SQLite vec0 virtual tables, preparing infrastructure for native vector search.
**Type**: Ad-hoc infrastructure enhancement
**Focus**: Write path stability - ensuring embeddings stored correctly in vec0 format
**Out of Scope**: Search endpoint implementation (that's Sprint 8)

**Key Changes**:
- Replace TEXT `embeddings` table with `chunk_embeddings` vec0 virtual table
- Add `document_embeddings` vec0 virtual table for document-level vectors
- Dynamic dimension support based on model (384d or 1024d)
- Manual CASCADE delete for vec0 virtual tables (don't support foreign keys)
- Model consistency checks with helpful rebuild instructions

**Why Now**: Vec0 infrastructure must be ready before implementing search endpoint. Each database uses one model with fixed dimension, making migration straightforward.

**See**: [Phase-10-Sprint-7.5-Vec0-Infrastructure-Migration.md](Phase-10-Sprint-7.5-Vec0-Infrastructure-Migration.md) for full implementation plan

---

### ✅ Sprint 0: Perfect `get_server_info` Endpoint (3-4 hours) - COMPLETED
**Goal**: Provide LLMs with server capabilities, endpoint discovery, and cross-platform path handling information.
**Replaces**: Existing `get_server_info` - Already implemented, needs enhancement with endpoint discovery information
**Status**: ✅ **COMPLETED** - Enhanced endpoint returns comprehensive JSON structure with endpoint discovery and path handling guidance

#### Example Request
```typescript
// MCP Tool Call - NO PARAMETERS
mcp__folder-mcp__get_server_info()
```

#### Example Response (Target)
```json
{
  "server_info": {
    "name": "folder-mcp",
    "version": "1.0.0",
    "description": "Semantic file system access with multi-folder support"
  },
  "capabilities": {
    "total_folders": 3,
    "total_documents": 487,
    "total_chunks": 5234,
    "semantic_search": true,
    "key_phrase_extraction": true,
    "file_types_indexed": ["pdf", "docx", "xlsx", "pptx", "txt", "md"],
    "binary_file_support": true,
    "max_file_size_mb": 50,
    "embedding_models": ["multilingual-e5-large", "ONNX-e5-small"]
  },
  "available_endpoints": {
    "exploration": [
      {
        "name": "list_folders",
        "purpose": "List all indexed folders with semantic previews",
        "returns": "Array of folders with aggregated key phrases",
        "use_when": "Starting exploration or choosing a knowledge base"
      },
      {
        "name": "explore",
        "purpose": "Navigate folder hierarchy with breadcrumbs",
        "returns": "Current location, subdirectories, and semantic context",
        "use_when": "Understanding folder structure"
      },
      {
        "name": "list_documents",
        "purpose": "List documents in a specific location",
        "returns": "Documents with key phrases in current path",
        "use_when": "Browsing documents after narrowing location"
      },
      {
        "name": "get_document_metadata",
        "purpose": "Get document metadata and structure with chunk navigation",
        "returns": "Document metadata and chunks with semantic information",
        "use_when": "Understanding document structure before reading"
      },
      {
        "name": "get_chunks",
        "purpose": "Retrieve specific chunks identified from metadata",
        "returns": "Content of requested chunks with their metadata",
        "use_when": "Reading specific sections after exploring metadata"
      }
    ],
    "content_retrieval": [
      {
        "name": "get_document_text",
        "purpose": "Get extracted plain text from any document type",
        "returns": "Clean text string from PDF/DOCX/etc with character-based pagination",
        "use_when": "Reading document content for analysis",
        "parameters": {
          "base_folder_path": "Root folder path",
          "file_path": "Document path relative to base folder",
          "max_chars": "Maximum characters to return (default: 5000). Use continuation_token for next batch"
        }
      },
      {
        "name": "download_file",
        "purpose": "Download any file (binary or text)",
        "returns": "Base64 for binary, UTF-8 for text files",
        "use_when": "Need images, configs, or any non-indexed file"
      }
    ],
    "search": [
      {
        "name": "search_content",
        "purpose": "Find specific content chunks across documents using semantic search",
        "returns": "Ranked chunks with context and explanations",
        "use_when": "Looking for specific information, code examples, or exact passages",
        "example_queries": ["Find useState examples", "Show error handling code", "Where is WebSocket configuration?"]
      },
      {
        "name": "find_documents",
        "purpose": "Discover which documents cover a topic using document-level embeddings",
        "returns": "Ranked documents with relevance scores and summaries",
        "use_when": "Exploring a subject area or finding files to read",
        "example_queries": ["Which docs discuss authentication?", "All files about testing", "Documents related to configuration"]
      }
    ]
  },
  "usage_hints": {
    "exploration_flow": "get_server_info → list_folders → explore → list_documents → get_document_text",
    "content_search_flow": "get_server_info → search_content → get_chunks or get_document_text",
    "document_discovery_flow": "get_server_info → find_documents → get_document_text",
    "tip": "Use exploration for structure, search_content for specific info, find_documents for topic discovery",
    "path_handling": {
      "cross_platform": true,
      "accepts_formats": ["Unix (/path/to/folder)", "Windows (C:\\path\\to\\folder)", "Mixed (C:/path/to/folder)"],
      "auto_normalization": "All path formats work on all platforms - paths are automatically normalized",
      "root_folder_values": ["\"\" (empty string)", "\".\" (dot)", "\"/\" (forward slash)"],
      "note": "You don't need to detect the platform or convert paths - use whatever format is natural"
    }
  }
}
```

#### A2E Test Validation
```typescript
// Step 1: Call get_server_info
mcp__folder-mcp__get_server_info()

// Step 2: Verify capabilities
// Expected: See all endpoints grouped by purpose
// Expected: Usage hints for exploration vs search
```

#### ✅ Sprint 0 Completion Summary
**Completed**: 2025-09-23
**Implementation**:
- Enhanced `daemon/rest/types.ts` with `EnhancedServerInfoResponse` interface
- Updated `daemon/rest/server.ts` to return comprehensive endpoint discovery
- Modified `interfaces/mcp/daemon-mcp-endpoints.ts` to return JSON instead of formatted text
- Added semantic metadata and capability flags

**A2E Validation Results**:
- ✅ **MCP Tool Integration**: `mcp__folder-mcp__get_server_info` returns complete enhanced JSON
- ✅ **Endpoint Discovery**: All 9 endpoints categorized (exploration: 5, content_retrieval: 4, search: 1)
- ✅ **Live Data**: Real server statistics (2 folders, 15 documents, 3559 chunks)
- ✅ **Model Information**: 5 embedding models listed (3 GPU, 2 CPU)
- ✅ **Navigation Guidance**: Clear exploration vs search flow recommendations
- ✅ **Performance**: Response time < 50ms achieved

**Key Outcomes**:
- LLMs can now discover all available endpoints without prior knowledge
- Clear purpose and usage guidance for each endpoint
- **Cross-platform path handling**: LLMs learn they can use any path format (Unix/Windows/Mixed) on any platform
- **Root folder flexibility**: LLMs understand that `""`, `"."`, and `"/"` all work for exploring root
- Foundation for autonomous endpoint selection in Phase 10 Sprint 1

---

### Sprint 1: Perfect `list_folders` Endpoint (4-5 hours)
**Goal**: List ALL configured folders with rich semantic previews aggregated from document key phrases.
**Replaces**: Existing `list_folders` - Already implemented, needs enhancement with semantic previews

#### Example Request
```typescript
// MCP Tool Call - NO PARAMETERS
mcp__folder-mcp__list_folders()
```

#### Example Response (Target)
```json
{
  "folders": [
    {
      "base_folder_path": "/Users/hanan/Projects/folder-mcp",
      "document_count": 156,
      "semantic_preview": {
        "top_key_phrases": [
          {"text": "Model Context Protocol server", "score": 0.92},
          {"text": "semantic file system access", "score": 0.89},
          {"text": "multi-folder indexing", "score": 0.87},
          {"text": "TMOAT agent testing", "score": 0.85},
          {"text": "websocket endpoints", "score": 0.82},
          {"text": "clean architecture", "score": 0.80},
          {"text": "dependency injection", "score": 0.78},
          {"text": "React Ink TUI", "score": 0.76},
          {"text": "embeddings pipeline", "score": 0.74},
          {"text": "daemon REST API", "score": 0.72},
          {"text": "Python GPU acceleration", "score": 0.70},
          {"text": "configuration management", "score": 0.68},
          {"text": "SQLite vector storage", "score": 0.66},
          {"text": "document chunking", "score": 0.64},
          {"text": "A2E validation", "score": 0.62}
        ],
        "complexity_indicator": "technical",
        "avg_readability": 45.2
      },
      "recently_changed_files": [
        {
          "path": "CLAUDE.md",
          "modified": "2025-01-22T10:30:00Z",
          "download_url": "http://localhost:3001/api/v1/download?token=eyJmb2xkZXIiOiIvVXNlcnMvaGF..."
        },
        {
          "path": "docs/development-plan/roadmap/currently-implementing/Phase-10-Semantic-Endpoint-Navigation-EPIC.md",
          "modified": "2025-01-22T09:15:00Z",
          "download_url": "http://localhost:3001/api/v1/download?token=eyJmb2xkZXIiOiIvVXNlcnMvaGF..."
        },
        {
          "path": "src/interfaces/mcp/daemon-mcp-endpoints.ts",
          "modified": "2025-01-21T16:45:00Z",
          "download_url": "http://localhost:3001/api/v1/download?token=eyJmb2xkZXIiOiIvVXNlcnMvaGF..."
        },
        {
          "path": "src/infrastructure/embeddings/sqlite-vec/schema.ts",
          "modified": "2025-01-21T14:20:00Z",
          "download_url": "http://localhost:3001/api/v1/download?token=eyJmb2xkZXIiOiIvVXNlcnMvaGF..."
        },
        {
          "path": "docs/testing/THE_MOTHER_OF_ALL_TESTS.md",
          "modified": "2025-01-20T10:00:00Z",
          "download_url": "http://localhost:3001/api/v1/download?token=eyJmb2xkZXIiOiIvVXNlcnMvaGF..."
        }
      ],
      "indexing_status": {
        "is_indexed": true,
        "documents_indexed": 156
      }
    }
  ],
  "total_folders": 1,
  "navigation_hint": "Use explore endpoint to navigate within a folder"
}
```

#### Key Phrase Selection Algorithm
The endpoint uses a "Diverse Top-K Selection" algorithm to provide representative key phrases:
1. **Aggregate** all key phrases from all documents in folder
2. **Score** by combining: max relevance score × (1 + log(frequency) × 0.2)
3. **Diversify** by skipping phrases with overlapping significant words
4. **Select** 10-15 phrases that best represent the folder's content variety

#### A2E Test Validation
```typescript
// Step 1: Call list_folders
mcp__folder-mcp__list_folders()

// Step 2: Verify response structure
// Expected: 10-15 diverse key phrases per folder
// Expected: 5 recently changed files with modification dates
// Expected: No "document_themes" or "key_phrases_extracted" fields

// Step 3: Validate semantic data matches database
// - Key phrases from document_keywords field
// - Readability from chunks table average
// - File list from documents table ORDER BY last_modified DESC
```

---

### Sprint 2: Perfect `explore` Endpoint (3-4 hours) ✅ COMPLETE
**Goal**: True `ls`-like hierarchical navigation showing both subdirectories AND documents.
**Replaces**: NEW endpoint - No existing equivalent, adds hierarchical folder exploration capability
**Semantic Data**: Key phrases aggregated from ALL nested indexed documents under each subdirectory path
**Status**: ✅ COMPLETE - Fully implemented with semantic key phrase aggregation and tested via A2E methodology

#### Important Notes
- Many folders contain NO indexed documents (e.g., source code folders)
- **Counting Strategy**:
  - `statistics` section: Direct children only (files in current folder)
  - `subdirectories` array: ALL nested documents under each path
- Both `indexed_document_count` and `top_key_phrases` in subdirs use ALL nested docs
- Empty `top_key_phrases` array when no indexed documents exist

#### Why This Design Is Superior
**Before (2 API calls)**: `explore()` → only dirs → `list_documents()` → finally see files
**After (1 API call)**: `explore()` → see BOTH dirs and files immediately (like `ls`)
**Context Savings**: ~50% fewer API calls for navigation

#### Example Request
```typescript
// MCP Tool Call - Like 'ls' command, shows files and folders
mcp__folder-mcp__explore({
  base_folder_path: "/Users/hanan/Projects/folder-mcp",
  relative_sub_path: "src"  // Relative to base_folder_path
  // Default limits: 50 subdirectories, 20 documents
})

// Note: For exploring the root folder, relative_sub_path accepts:
// - "" (empty string) - most logical, means "nothing relative"
// - "." (dot) - conventional Unix "current directory"
// - "/" (forward slash) - for convenience
// All three values will explore the base_folder_path root

// Cross-platform path support:
// - base_folder_path accepts both Unix (/path/to/folder) and Windows (C:\path\to\folder) styles
// - relative_sub_path accepts both forward slashes (src/domain) and backslashes (src\domain)
// - Paths are automatically normalized to the appropriate platform format
// - Mixed separators are handled correctly (e.g., "src/domain\files" works)
```

#### Example Response (Like `ls` Output)
```json
{
  "base_folder_path": "/Users/hanan/Projects/folder-mcp",
  "relative_sub_path": "src",
  "subdirectories": [
    {
      "name": "domain",
      "indexed_document_count": 0,  // ALL nested: zero .md/.pdf/.docx anywhere
      "top_key_phrases": []
    },
    {
      "name": "infrastructure",
      "indexed_document_count": 0,  // ALL nested: only source code
      "top_key_phrases": []
    },
    {
      "name": "interfaces",
      "indexed_document_count": 0,  // ALL nested: TypeScript only
      "top_key_phrases": []
    },
    {
      "name": "application",
      "indexed_document_count": 0,  // ALL nested: no indexed docs
      "top_key_phrases": []
    },
    {
      "name": "config",
      "indexed_document_count": 0,
      "top_key_phrases": []
    },
    {
      "name": "utils",
      "indexed_document_count": 1,  // ALL nested: found one README.md somewhere deep
      "top_key_phrases": [  // From that one README.md
        {"text": "utility functions", "score": 0.85},
        {"text": "helper methods", "score": 0.82}
      ]
    },
    {
      "name": "di",
      "indexed_document_count": 0,
      "top_key_phrases": []
    },
    {
      "name": "daemon",
      "indexed_document_count": 0,
      "top_key_phrases": []
    }
  ],
  "files": [
    "index.ts",
    "mcp-server.ts",
    "cli.ts",
    "README.md",
    "logo.png",
    ".gitignore",
    "package-lock.json"
  ],
  "statistics": {
    "subdirectory_count": 8,
    "file_count": 7,  // ALL files in current directory
    "indexed_document_count": 1,  // Only README.md is indexed
    "total_nested_documents": 142  // Indexed docs including subdirectories
  },
  "semantic_context": {
    "key_phrases": [
      {"text": "MCP server implementation", "score": 0.93},
      {"text": "dependency injection", "score": 0.90},
      {"text": "clean architecture", "score": 0.87}
    ]
  },
  "pagination": {
    "subdirectories": {
      "returned": 8,
      "total": 8,
      "limit": 50,
      "has_more": false
    },
    "documents": {
      "returned": 3,
      "total": 3,
      "limit": 20,
      "has_more": false
    }
  },
  "navigation_hints": {
    "next_actions": [
      "Use get_document_text for indexed docs (.md, .pdf, .docx, .txt)",
      "Use download_file for ANY file (.ts, .png, .json, etc.)",
      "Use explore with subdirectory path to navigate deeper"
    ],
    "tip": "Like 'ls' - shows ALL files. Only .md/.pdf/.docx/.xlsx/.pptx/.txt are indexed"
  }
}
```

#### Example with Pagination (Large Folder)
```typescript
// Request with explicit limits
mcp__folder-mcp__explore({
  base_folder_path: "/Users/hanan/Projects/folder-mcp",
  relative_sub_path: "node_modules/@types",
  subdirectory_limit: 10,  // Override default
  file_limit: 10           // Override default
})
```

```json
// Response showing pagination in action
{
  "base_folder_path": "/Users/hanan/Projects/folder-mcp",
  "relative_sub_path": "node_modules/@types",
  "subdirectories": [
    {"name": "node", "indexed_document_count": 0, "top_key_phrases": []},
    {"name": "react", "indexed_document_count": 0, "top_key_phrases": []},
    {"name": "jest", "indexed_document_count": 0, "top_key_phrases": []},
    {"name": "eslint", "indexed_document_count": 0, "top_key_phrases": []},
    {"name": "typescript", "indexed_document_count": 0, "top_key_phrases": []},
    {"name": "express", "indexed_document_count": 0, "top_key_phrases": []},
    {"name": "lodash", "indexed_document_count": 0, "top_key_phrases": []},
    {"name": "webpack", "indexed_document_count": 0, "top_key_phrases": []},
    {"name": "babel", "indexed_document_count": 0, "top_key_phrases": []},
    {"name": "prettier", "indexed_document_count": 0, "top_key_phrases": []}
  ],
  "files": [
    "index.d.ts", "globals.d.ts", "tsconfig.json", "README.md",
    "LICENSE", "package.json", "types.d.ts", "utils.d.ts",
    "helpers.d.ts", "constants.d.ts"
  ],
  "pagination": {
    "subdirectories": {
      "returned": 10,
      "total": 47,
      "limit": 10,
      "has_more": true,
      "continuation_token": "eyJzdWJkaXJfb2Zmc2V0IjoxMCwiZG9jX29mZnNldCI6MTB9"
    },
    "files": {
      "returned": 10,
      "total": 128,
      "limit": 10,
      "has_more": true
    }
  },
  "navigation_hints": {
    "next_actions": [
      "Use continuation_token to see more items",
      "Increase limits if you need everything at once",
      "Navigate to specific subdirectory to narrow scope"
    ],
    "warning": "Large folder with 47 subdirs and 128 files - pagination active"
  }
}
```

#### Example: Direct vs Nested Counting
```
docs/                           (current location)
├── README.md                   ✅ indexed (direct)
├── ARCHITECTURE.md             ✅ indexed (direct)
├── API.md                      ✅ indexed (direct)
├── diagram.png                 ❌ not indexed
└── testing/
    ├── test-guide.md           ✅ indexed (nested under testing/)
    ├── unit/
    │   └── unit-tests.md       ✅ indexed (nested under testing/)
    └── integration/
        └── e2e-tests.md        ✅ indexed (nested under testing/)
```

```typescript
mcp__folder-mcp__explore({
  base_folder_path: "/Users/hanan/Projects/folder-mcp",
  relative_sub_path: "docs"
})
```

```json
{
  "base_folder_path": "/Users/hanan/Projects/folder-mcp",
  "relative_sub_path": "docs",
  "subdirectories": [
    {
      "name": "testing",
      "indexed_document_count": 3,  // ALL nested: test-guide + unit-tests + e2e-tests
      "top_key_phrases": [  // Aggregated from those same 3 files
        {"text": "TMOAT testing", "score": 0.95},
        {"text": "unit testing", "score": 0.92}
      ]
    },
    {
      "name": "development-plan",
      "indexed_document_count": 12,  // ALL .md files under docs/development-plan/**
      "top_key_phrases": [  // Aggregated from those same 12 files
        {"text": "Phase 10 semantic navigation", "score": 0.91},
        {"text": "sprint planning", "score": 0.88}
      ]
    },
    {
      "name": "design",
      "indexed_document_count": 4,
      "top_key_phrases": [
        {"text": "architecture patterns", "score": 0.89},
        {"text": "system design", "score": 0.86}
      ]
    },
    {
      "name": "configuration",
      "indexed_document_count": 2,
      "top_key_phrases": [
        {"text": "YAML configuration", "score": 0.85},
        {"text": "environment variables", "score": 0.82}
      ]
    }
  ],
  "files": [
    "README.md",
    "ARCHITECTURE.md",
    "API.md",
    "diagram.png"
  ],
  "statistics": {
    "file_count": 4,
    "indexed_document_count": 3  // DIRECT only: README, ARCHITECTURE, API
  }
}
```

#### A2E Test Validation
```typescript
// Step 1: Explore source code folder
mcp__folder-mcp__explore({
  base_folder_path: "/Users/hanan/Projects/folder-mcp",
  relative_sub_path: "src"
})
// Expect: Many files, but indexed_document_count = 0 or very low
// Most subdirectories will have empty top_key_phrases

// Step 2: Explore documentation folder
mcp__folder-mcp__explore({
  base_folder_path: "/Users/hanan/Projects/folder-mcp",
  relative_sub_path: "docs"
})
// Expect: Higher indexed_document_count
// Subdirectories likely to have rich top_key_phrases

// Step 3: Verify aggregation
// Subdirectory key phrases should come from ALL nested documents
// Not just direct children
```

---

### Sprint 3: Perfect `list_documents` Endpoint (3-4 hours) - COMPLETED ✅
**Goal**: List documents in current location with pagination to preserve LLM context.
**Replaces**: Enhances existing `list_documents` - Adds relative_sub_path and recursive parameters for path-aware listing

#### Design Decisions
- **No mime_type**: LLMs can infer file type from extension (.md, .pdf, .docx)
- **top_key_phrases**: Renamed from `key_phrases` for consistency and clarity about diversity
- **last_modified**: Always included for all documents (consistency)

#### Example Request (Initial)
```typescript
// MCP Tool Call - Uses smart default limit of 20
mcp__folder-mcp__list_documents({
  base_folder_path: "/Users/hanan/Projects/folder-mcp",
  relative_sub_path: "docs/testing",  // Relative path
  recursive: false  // Just this directory
  // limit: 20 is the default
})
```

#### Example Response with Pagination
```json
{
  "base_folder_path": "/Users/hanan/Projects/folder-mcp",
  "relative_sub_path": "docs/testing",
  "documents": [
    {
      "file_path": "docs/testing/THE_MOTHER_OF_ALL_TESTS.md",
      "size": 24567,
      "last_modified": "2025-01-20T10:00:00Z",
      "top_key_phrases": [
        {"text": "TMOAT agent testing", "score": 0.95},
        {"text": "end-to-end validation", "score": 0.92},
        {"text": "systematic test approach", "score": 0.89}
      ],
      "readability_score": 48.3
    },
    {
      "file_path": "docs/testing/a2e-testing.md",
      "size": 8934,
      "last_modified": "2025-01-20T10:00:00Z",
      "top_key_phrases": [
        {"text": "MCP tool validation", "score": 0.93},
        {"text": "direct endpoint testing", "score": 0.90},
        {"text": "A2E testing", "score": 0.88}
      ],
      "readability_score": 52.1
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 156,
    "returned": 2,
    "has_more": true,
    "continuation_token": "eyJvZmZzZXQiOjIwLCJwYXRoIjoiZG9jcy90ZXN0aW5nIiwicmVjdXJzaXZlIjpmYWxzZX0="
  },
  "navigation_hints": {
    "continue_listing": "Use continuation_token to get more documents",
    "set_recursive_true": "To include documents from subdirectories",
    "use_explore": "To see subdirectory structure first"
  }
}
```

#### Example Continuation Request
```typescript
// Continue from where we left off
mcp__folder-mcp__list_documents({
  continuation_token: "eyJvZmZzZXQiOjIwLCJwYXRoIjoiZG9jcy90ZXN0aW5nIiwicmVjdXJzaXZlIjpmYWxzZX0="
})
// No other parameters needed - token contains all state
```

#### A2E Test Validation
```typescript
// Step 1: Initial request with default pagination
mcp__folder-mcp__list_documents({
  base_folder_path: "/Users/hanan/Projects/folder-mcp",
  relative_sub_path: "docs/testing",
  recursive: false
})
// Returns first 20 docs + continuation token

// Step 2: Get more if needed
mcp__folder-mcp__list_documents({
  continuation_token: "..."
})

// Step 3: Request with explicit large limit if you know you need all
mcp__folder-mcp__list_documents({
  base_folder_path: "/Users/hanan/Projects/folder-mcp",
  relative_sub_path: "docs",
  recursive: true,
  limit: 200  // Override default if you know you need everything
})
```

#### Why Pagination Helps
- **Default limit 20**: Saves ~80% context for typical exploration
- **Progressive discovery**: Get more only if initial results insufficient
- **Context preservation**: 20 docs ≈ 4KB vs 100 docs ≈ 20KB of context

#### Implementation Completed (2025-09-25)
✅ **Features Implemented:**
- Enhanced document metadata with `top_key_phrases` and `readability_score`
- Continuation token pagination with Base64-encoded state
- Consistent `last_modified` timestamps for all documents
- Removed unnecessary `mime_type` field

✅ **Critical Fixes:**
- SQL query now properly filters by base folder path (prevents cross-folder leakage)
- Continuation token parameters correctly extracted and override query params
- Token-only requests properly decode folder path from token

✅ **Tested & Verified:**
- Pagination correctly maintains offset across requests (0→3→6→9)
- Recursive mode and folder context preserved in continuation tokens
- Semantic metadata successfully extracted from database

---

### Sprint 4: Perfect `get_document_metadata` Endpoint (3-4 hours) ✅ COMPLETED
**Goal**: Provide document metadata and chunk-level semantic navigation with optional pagination for large documents.
**Replaces**: Existing `get_document_outline` - Renamed for clarity, provides document metadata and structure
**Status**: Implemented and tested successfully (2025-09-25)

#### Implementation Additions
- **Preview field**: Added 100-character preview for each chunk (not in original spec)
- **Continuation tokens**: Base64-encoded JSON `{"doc_id": "filename", "offset": number}`
- **Consistent pagination**: Matches Sprint 1-3 approach with `has_more` flag
- **Tested with large documents**: Successfully handles 2700+ chunks with proper pagination

#### Example Request
```typescript
// MCP Tool Call - Default limit of 50 chunks
mcp__folder-mcp__get_document_metadata({
  base_folder_path: "/Users/hanan/Projects/folder-mcp",
  file_path: "CLAUDE.md"
  // limit: 50 is the default for chunks
})
```

#### Example Response with Optional Pagination
```json
{
  "base_folder_path": "/Users/hanan/Projects/folder-mcp",
  "file_path": "CLAUDE.md",
  "download_url": "http://localhost:3001/api/v1/download?token=eyJmb2xkZXIiOiIvVXNlcnMvaGF...",
  "total_chunks": 87,
  "outline": {
    "chunks_shown": 50,
    "total_chunks": 87,
    "structure": [
      {
        "chunk_id": "chunk_0",
        "chunk_index": 0,
        "heading": "Introduction",
        "start_offset": 0,
        "end_offset": 1024,
        "key_phrases": [
          {"text": "Edit files freely", "score": 0.89},
          {"text": "No permission needed", "score": 0.87},
          {"text": "Claude Code guidance", "score": 0.85}
        ],
        "readability_score": 51.2,
        "has_code_examples": false,
        "preview": "This file provides guidance to Claude Code (claude.ai/code) when working with code in this repositor..."
      },
      {
        "chunk_id": "chunk_1",
        "chunk_index": 1,
        "heading": "Testing Requirements",
        "key_phrases": [
          {"text": "TMOAT scripts", "score": 0.92},
          {"text": "websocket endpoints", "score": 0.88},
          {"text": "TMOAT agent testing", "score": 0.86}
        ],
        "has_code_examples": true
      }
    ]
  },
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 87,
    "returned": 50,
    "has_more": true,
    "continuation_token": "eyJkb2NfaWQiOiJDTEFVREUubWQiLCJvZmZzZXQiOjUwfQ=="
  },
  "navigation_hints": {
    "chunks_with_code": [1, 15, 22, 28, 35],  // In first 50 chunks with code examples
    "continue_outline": "Use continuation_token for chunks 51-87",
    "use_get_document_text": "To read full content",
    "use_get_chunks": "To retrieve specific chunks by ID",
    "typical_documents": "Most documents have <50 chunks"
  }
}
```

---

### Sprint 5: Perfect `get_chunks` Endpoint (2-3 hours)
**Goal**: Retrieve specific chunks identified from metadata exploration for targeted content access.
**Replaces**: NEW endpoint - No existing equivalent, enables surgical chunk extraction
**Status**: ✅ Completed - Lean implementation with only essential fields

#### Design Philosophy
- **Lean response**: No redundant metadata that was already provided in `get_document_metadata`
- **Content-focused**: The LLM already has semantic metadata; it just needs the actual text
- **No counting fields**: The LLM knows what it requested and can count the returned array
- **No redundant navigation**: LLMs can request adjacent chunks if needed

#### Example Request
```typescript
// MCP Tool Call - After identifying interesting chunks from metadata
mcp__folder-mcp__get_chunks({
  base_folder_path: "/Users/hanan/Projects/folder-mcp",
  file_path: "CLAUDE.md",
  chunk_ids: ["chunk_1", "chunk_15", "chunk_28"]
})
```

#### Example Response
```json
{
  "file_path": "CLAUDE.md",
  "download_url": "http://localhost:3001/api/v1/download?token=eyJmb2xkZXIiOiIvVXNlcnMvaGF...",
  "chunks": [
    {
      "chunk_id": "chunk_1",
      "chunk_index": 1,
      "content": "Testing Requirements - BE A GOOD TMOAT AGENT:\n\nAgent-Led Testing Approach: Think like a human engineer. Break assignments into verifiable tests to validate assumptions rather than blindly changing files and hoping for magical fixes. IT NEVER WORKS!\n\nTOOLS A GOOD TMOAT AGENT WILL USE:\n1. Query database files using sqlite3 - verify data persistence and state\n2. Monitor runtime files using file system - track changes and additions\n3. Use TMOAT scripts to connect to websocket endpoints...",
      "start_offset": 1024,
      "end_offset": 2048
    },
    {
      "chunk_id": "chunk_15",
      "chunk_index": 15,
      "content": "// Example TMOAT test script for WebSocket validation\nconst ws = new WebSocket('ws://localhost:3000');\nws.on('open', () => {\n  ws.send(JSON.stringify({type: 'subscribe', topics: ['indexing']}))\n});\nws.on('message', (data) => {\n  console.log('Received:', JSON.parse(data));\n});",
      "start_offset": 14567,
      "end_offset": 14892
    },
    {
      "chunk_id": "chunk_28",
      "chunk_index": 28,
      "content": "## A2E Testing Methodology\n\nAgent-to-Endpoint testing requires using MCP tools directly...",
      "start_offset": 28943,
      "end_offset": 29567
    }
  ]
}
```

#### Use Cases
1. **Targeted Reading**: Get 2-3 most relevant chunks after outline exploration
2. **Code Extraction**: Fetch only chunks with `has_code_examples: true`
3. **Summary Building**: Get introduction + conclusion chunks
4. **Deep Dive**: Get all chunks for a specific section

#### A2E Test Validation
```typescript
// Step 1: Get metadata first
mcp__folder-mcp__get_document_metadata({
  base_folder_path: "/Users/hanan/Projects/folder-mcp",
  file_path: "CLAUDE.md"
})

// Step 2: Identify interesting chunks (e.g., chunks with code examples)
// From metadata: chunk_1, chunk_15, chunk_28 have code examples

// Step 3: Fetch just those chunks
mcp__folder-mcp__get_chunks({
  base_folder_path: "/Users/hanan/Projects/folder-mcp",
  file_path: "CLAUDE.md",
  chunk_ids: ["chunk_1", "chunk_15", "chunk_28"]
})

// Step 4: Verify returned content matches expected chunks
```

---

### ✅ Sprint 6: Perfect `get_document_text` Endpoint (2-3 hours) - COMPLETED
**Goal**: Retrieve clean extracted text from documents without semantic overlay, with pagination for large documents.
**Replaces**: NEW endpoint - Provides clean text extraction separate from raw file access
**Status**: ✅ **COMPLETED** - Implemented with overlap-aware text reconstruction from chunks, character-based pagination

#### Example Request (Initial)
```typescript
// MCP Tool Call - Default limit of 5000 characters
mcp__folder-mcp__get_document_text({
  base_folder_path: "/Users/hanan/Projects/folder-mcp",
  file_path: "README.md"
  // max_chars: 5000 is the default (in characters, not lines)
})
```

#### Example Response with Pagination (Markdown - No Formatting Loss)
```json
{
  "base_folder_path": "/Users/hanan/Projects/folder-mcp",
  "file_path": "README.md",
  "download_url": "http://localhost:3001/api/v1/download?token=eyJmb2xkZXIiOiIvVXNlcnMvaGF...",
  "mime_type": "text/markdown",
  "size": 15234,
  "last_modified": "2025-01-22T08:30:00Z",
  "extracted_text": "# folder-mcp\n\nModel Context Protocol server for folder operations...\n\n## Installation\n\nnpm install -g folder-mcp\n\n## Usage\n\nfolder-mcp\n\n...",
  "metadata": {
    "total_characters": 15234,
    "characters_returned": 5000,
    "total_chunks": 12,
    "language": "en"
    // No formatting loss fields - implies perfect extraction
  },
  "pagination": {
    "max_chars": 5000,
    "offset": 0,
    "total": 15234,
    "returned": 5000,
    "has_more": true,
    "continuation_token": "eyJkb2NfaWQiOiJSRUFETUUubWQiLCJvZmZzZXQiOjUwMDB9"
  },
  "navigation_hints": {
    "continue_reading": "Use continuation_token to get next 5000 characters",
    "remaining_content": "10234 characters remaining (3 more requests needed)",
    "tip": "Increase max_chars up to 50000 if you need more content at once"
  }
}
```

#### Example Response with Formatting Loss (PDF)
```json
{
  "base_folder_path": "/Users/hanan/Projects/folder-mcp",
  "file_path": "reports/annual-report.pdf",
  "download_url": "http://localhost:3001/api/v1/download?token=eyJmb2xkZXIiOiIvVXNlcnMvaGF...",
  "mime_type": "application/pdf",
  "size": 458923,
  "last_modified": "2025-01-20T14:30:00Z",
  "extracted_text": "Annual Report 2024\n\nExecutive Summary\n\nThis year marked significant growth...",
  "metadata": {
    "total_characters": 45678,
    "characters_returned": 5000,
    "total_chunks": 38,
    "language": "en",
    "has_formatting_loss": true,
    "extraction_warnings": [
      "Tables converted to text format",
      "Images and diagrams omitted",
      "Multi-column layout linearized"
    ]
  },
  "pagination": {
    "max_chars": 5000,
    "offset": 0,
    "total": 45678,
    "returned": 5000,
    "has_more": true,
    "continuation_token": "eyJkb2NfaWQiOiJhbm51YWwtcmVwb3J0LnBkZiIsIm9mZnNldCI6NTAwMH0="
  },
  "navigation_hints": {
    "continue_reading": "Use continuation_token to get next 5000 characters",
    "remaining_content": "40678 characters remaining (9 more requests needed)",
    "formatting_alternative": "Download URL provided above preserves original formatting, tables, and images",
    "visual_content": "Images and diagrams are available via the download_url",
    "tip": "Use the download_url for full fidelity when extracted text has formatting loss"
  }
}
```

#### Example Response with Excel File (Always Has Formatting Loss)
```json
{
  "base_folder_path": "/Users/hanan/Projects/folder-mcp",
  "file_path": "data/sales-q4.xlsx",
  "download_url": "http://localhost:3001/api/v1/download?token=eyJmb2xkZXIiOiIvVXNlcnMvaGF...",
  "mime_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "size": 89234,
  "last_modified": "2025-01-21T09:15:00Z",
  "extracted_text": "Sheet1: Q4 Sales Data\n\nRegion\tOctober\tNovember\tDecember\nNorth\t45000\t52000\t61000\nSouth\t38000\t41000\t47000...",
  "metadata": {
    "total_characters": 12456,
    "characters_returned": 5000,
    "total_chunks": 8,
    "language": "en",
    "has_formatting_loss": true,
    "extraction_warnings": [
      "Spreadsheet converted to text sections",
      "Formulas shown as calculated values",
      "Multiple sheets concatenated"
    ]
  },
  "pagination": {
    "max_chars": 5000,
    "offset": 0,
    "total": 12456,
    "returned": 5000,
    "has_more": true,
    "continuation_token": "eyJkb2NfaWQiOiJzYWxlcy1xNC54bHN4Iiwib2Zmc2V0Ijo1MDAwfQ=="
  },
  "navigation_hints": {
    "continue_reading": "Use continuation_token to get next 5000 characters",
    "remaining_content": "7456 characters remaining (2 more requests needed)",
    "formatting_alternative": "Download URL provided above preserves original Excel formatting and formulas",
    "table_data": "For precise table structure, use the download_url to get the original spreadsheet",
    "tip": "Use the download_url for full fidelity when working with spreadsheet data"
  }
}
```

#### Example Continuation Request
```typescript
// Continue reading from character 5001
mcp__folder-mcp__get_document_text({
  continuation_token: "eyJkb2NfaWQiOiJSRUFETUUubWQiLCJvZmZzZXQiOjUwMDB9"
})
// Returns next 5000 characters (5001-10000)
```

#### Extraction Quality Metadata

The endpoint provides extraction quality indicators to help LLMs make informed decisions:

**`has_formatting_loss`** (boolean):
- `true` for formats that lose structure during text extraction (PDF, Excel, PowerPoint)
- Omitted or `false` for formats with perfect extraction (Markdown, plain text)

**`extraction_warnings`** (array):
- Specific information about what was lost or transformed during extraction
- Only included when there are actual warnings

**Common extraction warnings by file type:**

| File Type | Typical Warnings |
|-----------|-----------------|
| PDF | "Tables converted to text format", "Images and diagrams omitted", "Multi-column layout linearized" |
| Excel | "Spreadsheet converted to text sections", "Formulas shown as calculated values", "Multiple sheets concatenated" |
| PowerPoint | "Slides converted to sequential text", "Speaker notes included inline", "Animations and transitions omitted" |
| Word | "Comments and track changes omitted", "Footnotes moved inline" |

#### Implementation Notes (Sprint 6 Completion)

**Key Technical Decisions:**
1. **Chunk-based reconstruction**: Uses pre-indexed chunks from database instead of re-parsing files
   - Performance: Database query (milliseconds) vs file parsing (seconds for PDFs/Word/Excel)
   - Consistency: Returns exact text that was indexed and embedded
   - Resource efficient: No need to load heavy parser libraries

2. **Overlap handling**: Automatically removes ~10% overlap between chunks
   - Algorithm uses start_offset/end_offset to skip duplicate content
   - Results in seamless text reconstruction without duplication
   - Tested with 2,727-chunk file: perfect reconstruction

3. **No language detection**: Removed placeholder field per architectural principle (no fallback logic)

4. **Standardized database access**: Shared helper for consistent error handling across endpoints

#### Dynamic Navigation Hints

Navigation hints adapt based on context:

**When text is complete:**
- Simple success message

**When text is truncated (no formatting loss):**
- How to continue reading with continuation token
- Suggestion to increase `max_chars` for efficiency

**When text has formatting loss:**
- All pagination hints (if applicable)
- Explicit mention of `download_file` as alternative
- Specific guidance based on what was lost (tables, images, etc.)

#### Why Text Pagination Helps
- **Default limit 5000 chars**: Prevents overwhelming responses for large documents
- **Character-based**: More predictable than line-based for text consumption
- **Progressive reading**: Get more content only if needed
- **Context savings**: 5KB chunks vs potentially 100KB+ full documents
- **Informed decisions**: Extraction warnings help LLMs choose between text extraction and file download

---

### Sprint 7: File Downloads via Pre-Generated Tokens (3 hours)
**Goal**: Enable secure file downloads by embedding download URLs in ALL file-referencing endpoints.
**Approach**: Remove the `download_file` MCP endpoint entirely - provide download URLs directly in all responses that reference files
**Security**: Time-limited signed tokens (5-10 minute expiry) generated during any file reference
**Simplification**: Single HTTP download endpoint using token-based authentication

#### Revolutionary Change

Instead of a separate `download_file` endpoint, we embed download URLs directly in ALL endpoints that reference files:
- **No extra MCP calls** - Files come with download URLs from the start
- **Natural workflow** - Any file reference includes its download link immediately
- **Consistent interface** - Every file reference gets a URL, no confusion
- **Enhanced security** - Tokens generated fresh during each response, short-lived

#### Implementation Approach

**1. Token-Based Download Endpoint (HTTP)**:
```
GET /api/v1/download?token=<encrypted-token>
```
- Token contains: folder path, file path, expiration, HMAC signature
- No complex path parsing needed - just validate token and serve file
- Supports streaming for large files
- Returns appropriate Content-Type based on MIME type

**2. ALL Affected Endpoints (7 Total)**:

| Endpoint | Where Download URLs Appear | Sprint |
|----------|---------------------------|---------|
| `list_folders` | Each file in `recently_changed_files` array | Sprint 1 |
| `explore` | Each entry in `files` array | Sprint 2 |
| `list_documents` | Each document in `documents` array | Sprint 3 |
| `get_document_metadata` | Root level `download_url` for the document | Sprint 4 |
| `get_chunks` | Root level `download_url` for source document | Sprint 5 |
| `get_document_text` | Root level `download_url` (critical for formatting loss!) | Sprint 6 |
| `search` | Each result in `results` array | Sprint 8 |

**3. Token Generation Strategy**:
- Generate HMAC-SHA256 signed tokens with 5-10 minute expiry
- Include all necessary info in token (no database lookups)
- Tokens are encrypted and URL-safe (base64url encoding)
- Generated on-demand whenever file references are returned

#### Example: Enhanced `explore` Response
```json
{
  "base_folder_path": "/Users/hanan/Projects/folder-mcp",
  "relative_path": "src/utils",
  "files": [
    {
      "name": "config.json",
      "type": "file",
      "size": 2048,
      "mime_type": "application/json",
      "download_url": "http://localhost:3001/api/v1/download?token=eyJmb2xkZXIiOiIvVXNlcnMvaGF..."
    },
    {
      "name": "logo.png",
      "type": "file",
      "size": 45678,
      "mime_type": "image/png",
      "download_url": "http://localhost:3001/api/v1/download?token=eyJmb2xkZXIiOiIvVXNlcnMvaGF..."
    }
  ]
}
```

#### Example: Enhanced `list_documents` Response
```json
{
  "documents": [
    {
      "id": "README.md",
      "name": "README.md",
      "size": 15234,
      "mime_type": "text/markdown",
      "download_url": "http://localhost:3001/api/v1/download?token=eyJmb2xkZXIiOiIvVXNlcnMvaGF..."
    },
    {
      "id": "Technical_Spec.pdf",
      "name": "Technical_Spec.pdf",
      "size": 2456789,
      "mime_type": "application/pdf",
      "download_url": "http://localhost:3001/api/v1/download?token=eyJmb2xkZXIiOiIvVXNlcnMvaGF..."
    }
  ]
}
```

#### Benefits Over Previous Approach

1. **Simpler Architecture**:
   - No `download_file` MCP endpoint needed
   - Single HTTP download endpoint with token auth
   - No Express routing complexity with nested paths

2. **Better UX for LLMs**:
   - One-step process: explore → download
   - No confusion about when to use download_file
   - Consistent: all files have URLs, no size thresholds

3. **Enhanced Security**:
   - Short-lived tokens (5-10 minutes)
   - No permanent file URLs
   - Token contains all auth info (no DB lookups)

4. **Performance**:
   - Pre-generated tokens during exploration
   - No extra round trips for download URLs
   - Efficient token validation

#### A2E Test Validation
```typescript
// Step 1: Explore and get files with download URLs
const exploreResult = await mcp__folder-mcp__explore({
  base_folder_path: "/Users/hanan/Projects/folder-mcp",
  relative_path: "src"
});

// Step 2: File already has download URL - just fetch it
const fileWithUrl = exploreResult.files.find(f => f.name === "index.ts");
console.log(fileWithUrl.download_url); // Ready to use!

// Step 3: Fetch via HTTP (outside MCP)
const response = await fetch(fileWithUrl.download_url);
const content = await response.text();
```

---

### Sprint 8: Enhanced Search with Download URLs (2 hours)
{
  "error": "File too large for STDIO interface",
  "file_path": "backups/database-dump.sql",
  "size": 157829120,
  "max_size": 52428800,
  "suggestion": "Use HTTP interface for files larger than 50MB, or use get_document_text for indexed documents"
}
```

#### HTTP Response Headers Example
```http
HTTP/1.1 200 OK
Content-Type: image/png
Content-Length: 45678
Content-Disposition: attachment; filename="logo.png"
Cache-Control: no-cache

[Binary data stream...]
```

#### Technical Considerations

**Performance:**
- Stream files in HTTP to avoid memory issues
- STDIO limited to 50MB default (configurable) due to base64 overhead
- Consider chunked responses for very large files (future enhancement)

**Security:**
- Path traversal prevention (already implemented)
- Optional whitelist/blacklist for executable files (.exe, .sh, .bat)
- Validate file exists and is readable before processing

**Edge Cases:**
- Zero-byte files: Return empty content with appropriate metadata
- Symbolic links: Follow by default, option to error
- Permission errors: Return clear error message
- Files modified during read: Best-effort, no guarantees

#### File Type Categories
Based on MIME type, categorize files for metadata:
- `document`: PDF, Word, Excel, PowerPoint (application/pdf, application/vnd.*)
- `text`: Plain text, Markdown, configs (text/*)
- `source_code`: Programming languages (text/x-*, application/javascript)
- `image`: PNG, JPEG, GIF, WebP (image/*)
- `video`: MP4, AVI, MOV (video/*)
- `audio`: MP3, WAV, OGG (audio/*)
- `archive`: ZIP, TAR, GZ (application/zip, application/x-tar)
- `binary`: Everything else (application/octet-stream)

#### Explore Endpoint Verification (Sprint 2)
The `explore` endpoint already lists ALL files regardless of type:
- Source files: .ts, .js, .py, .java
- Config files: .json, .yaml, .toml, .env
- Documents: .md, .pdf, .docx, .txt
- Media: .png, .jpg, .mp4, .svg
- Data: .csv, .xml, .sql
- Any other file type found in the filesystem

The `files` array in explore response includes everything, with only indexed documents (.md, .pdf, .docx, .xlsx, .pptx, .txt) being semantically searchable.

---

### ✅ Sprint 8: In-Folder Semantic Search with Hybrid Scoring (4-5 hours) - COMPLETED
**Goal**: Implement intelligent semantic search designed for LLM clients to efficiently locate content in familiar folders through hybrid approach combining semantic similarity and exact term matching.
**Type**: New search endpoint optimized for LLM-driven parameter extraction
**Status**: ✅ **COMPLETED** (2025-01-23) - Includes full cleanup and A2E validation
**Full Documentation**: See [Phase-10-Sprint-8-In-Folder-Semantic-Search.md](Phase-10-Sprint-8-In-Folder-Semantic-Search.md)
**Endpoint Name**: search_content

**✅ Completion Summary**:
- **Implementation**: search_content endpoint with hybrid semantic + exact term scoring
- **Code Review Cleanup**: 11 cleanup tasks completed (~330 lines of Sprint 7 legacy code removed)
  - Removed redundant folder_id from request body
  - Added fail-fast MCP validation
  - Refactored continuation object to typed construction
  - Cleaned unused Sprint 7 search types and methods
- **A2E Validation**: All 4 test combinations passed successfully
  1. Pure semantic search → 3 results (scores: 0.29, 0.19, 0.18)
  2. Pure exact term search → 3 results (all score 1.0)
  3. Both empty (validation) → Correct error response
  4. Hybrid search → 3 results (scores: 0.17, 0.16, 0.15)
- **Architecture**: Clean separation - folder_id only in URL path, not request body
- **TypeScript Best Practices**: Typed construction with spread operators throughout

#### Core Design Philosophy

**LLM-Driven Parameter Extraction**: The LLM client extracts structured search parameters from user queries:
- **semantic_concepts**: Array of terms for embedding-based similarity (`["authentication", "state management"]`) - OPTIONAL
- **exact_terms**: Terms that must match exactly (`["useState", "WebSocket", "v4"]`) - OPTIONAL
- **Validation**: At least ONE of semantic_concepts or exact_terms must be provided
- **No file filtering**: Document filtering is find_documents' responsibility (clear separation of concerns)

**Hybrid Scoring Algorithm**: Combines two signals for optimal precision:
1. **Semantic similarity**: Vector similarity via vec0 MATCH operator
2. **Exact text matching**: Boost for technical terms found exactly in chunks

**Flat Chunk Results**: Returns flat list of chunks ranked by relevance across ALL documents (not grouped), because:
- LLM needs THE most relevant content immediately
- Perfect chunk in document #15 shouldn't be hidden
- Each result includes file_path, so LLM knows source
- Natural discovery: 5 chunks from same file in top 10 = that file is important

#### Example Request
```typescript
// LLM extracts structured parameters from user query
mcp__folder-mcp__search_content({
  folder_id: "my-project",
  semantic_concepts: ["authentication", "state management", "React hooks"],
  exact_terms: ["useState", "useEffect"],
  limit: 10  // Max results per page (default: 10, max: 50)
})
```

#### Example Response (StandardResponse Pattern)
```json
{
  "data": {
    "results": [
      {
        "chunk_id": "12345",
        "file_path": "src/auth/LoginForm.tsx",
        "content": "import React, { useState, useEffect } from 'react';\n\nfunction LoginForm() {\n  const [authState, setAuthState] = useState({ authenticated: false, user: null });\n  \n  useEffect(() => {\n    // Authentication state management\n    validateSession();\n  }, []);\n  \n  // Form validation and state handling...",
        "relevance_score": 0.94,
        "chunk_index": 5,
        "document_keywords": ["useState hook", "authentication state", "form validation", "React component", "session management"]
      },
      {
        "chunk_id": "67890",
        "file_path": "src/hooks/useAuth.ts",
        "content": "// Custom authentication hook using React hooks\nexport function useAuth() {\n  const [state, setState] = useState<AuthState>(initialState);\n  \n  useEffect(() => {\n    // Listen to auth state changes\n    const unsubscribe = authService.onStateChange(newState => {\n      setState(newState);\n    });\n    return unsubscribe;\n  }, []);",
        "relevance_score": 0.89,
        "chunk_index": 2,
        "document_keywords": ["custom hooks", "authentication", "React hooks", "state management"]
      }
    ],
    "total_results": 47
  },
  "status": {
    "code": "success",
    "message": "Found 47 matching chunks"
  },
  "pagination": {
    "limit": 10,
    "offset": 0,
    "has_more": true,
    "continuation_token": "eyJmb2xkZXJfaWQiOiJteS1wcm9qZWN0Iiwib2Zmc2V0IjoxMH0..."
  },
  "navigation_hints": {
    "next_steps": [
      "Content is included - read directly from results",
      "Use continuation_token to see more results (sorted by relevance)",
      "Use get_document_text to read entire documents",
      "Use get_document_metadata to understand document structure"
    ],
    "refine_search": [
      "Add more exact_terms to catch specific technical terms",
      "Use find_documents to filter by document-level topics first",
      "Increase limit to see more results if needed"
    ],
    "tip": "Content is always included - no need for additional fetch"
  }
}
```

#### Key Features

**Content-First Design**: Search returns full chunk content immediately
- Single round trip: No need for follow-up fetch
- Efficient for LLMs: 95% of searches need content anyway
- Token cost acceptable: 5-10K tokens = 2.5-5% of 200K context budget
- Immediate utility: LLMs can read and answer from results directly

**Continuation Token Pagination**: All search state in opaque token
- Stateless: Token contains folder_id, semantic_concepts, exact_terms, offset
- Consistent: Matches existing endpoints pattern
- Standard pagination: limit parameter controls results per page

**Schema-Aligned Response**: All fields map directly to database columns
- chunk_id → chunks.id
- file_path → documents.file_path (relative path, reusable)
- content → chunks.content
- chunk_index → chunks.chunk_index
- document_keywords → documents.document_keywords (JSON parsed)
- relevance_score → computed from vec0 + boosts

#### Why Hybrid Approach Works

**Problem with Pure Semantic Search**:
- Technical terms (useState, WebSocket) poorly represented in embeddings
- Subword tokenization means they GET embeddings, but quality is poor
- useState vs useEffect look similar semantically but are different

**Solution - Two-Signal Hybrid**:
- Semantic: Handles conceptual matching and natural language
- Exact matching: Precision for technical terms

**Final Score**: `semantic_score × exact_term_boost`

**Simplified from 4 signals to 2**:
- Removed file_hints: Document filtering belongs in find_documents
- Removed filename/filetype boosts: Unclear value, added complexity
- Focus on content relevance, not file metadata

#### Integration with Existing System

**Uses existing infrastructure**:
- `chunk_embeddings` vec0 table for vector similarity
- `chunks` table for key_phrases, readability_score
- `documents` table for metadata
- Vec0 MATCH operator for SIMD-accelerated search

**Complements existing endpoints**:
- get_document_text: Read entire document from start to finish
- get_document_metadata: Understand document structure and chunk layout
- get_chunks: Retrieve specific non-search chunks by ID
- explore/list_documents: Navigate when search too broad
- find_documents: Document-level topic discovery before chunk search

#### Performance Targets

- Search latency: <200ms for typical queries
- Token efficiency: First page fits in 4000 tokens
- Quality: >85% precision for top 10 results
- Technical term matching: 100% recall for exact_terms

#### A2E Test Validation

```typescript
// Known: CLAUDE.md contains "useState" and "TMOAT agent"
// Step 1: Read the file to establish ground truth
mcp__folder-mcp__get_document_text({
  base_folder_path: "/Users/hanan/Projects/folder-mcp",
  file_path: "CLAUDE.md"
})
// Confirms: Contains "useState" in testing section and "TMOAT agent" terminology

// Step 2: Search with exact terms and semantic concepts
mcp__folder-mcp__search_content({
  folder_id: "folder-mcp",
  semantic_concepts: ["React hooks", "testing methodology"],
  exact_terms: ["useState", "TMOAT"],
  limit: 10
})

// Step 3: Validate results
// Expected: CLAUDE.md chunks in results with content included
// Expected: Higher relevance_score for chunks containing both exact terms
// Expected: Content field populated with actual text (not empty)
// Expected: document_keywords include relevant phrases like "testing", "agent"
```

---

### Sprint 9: Document Discovery with `find_documents` Endpoint (3-4 hours)
**Goal**: Enable LLMs to discover which documents cover a topic using document-level embeddings for broad topic exploration.
**Type**: New search endpoint optimized for document-level discovery (not chunk-level precision)
**Status**: Planned - Pending Sprint 8 Completion
**Endpoint Name**: find_documents

#### Core Design Philosophy

**Document-Level Discovery**: Uses averaged document embeddings to find files covering a topic
- **Different from search_content**: Returns DOCUMENTS (not chunks)
- **Use case**: "Which docs discuss authentication?" → files, not specific passages
- **Coarser granularity**: Good for exploration, not precision
- **Complements search_content**: find_documents → broad discovery, search_content → specific content

**Simple Semantic Query**: LLM provides natural language query
- **No structured parameters**: Just a query string (not semantic_concepts/exact_terms)
- **Topic-based**: "authentication setup", "testing strategies", "configuration management"
- **Returns documents**: Ranked list of files that cover the topic

**Leverages Existing Infrastructure**: Uses document_embeddings vec0 table
- **Already computed**: Document embeddings stored during indexing
- **Fast matching**: Vec0 MATCH operator for document-level similarity
- **Metadata-rich**: Returns document metadata + relevance score

#### Example Request
```typescript
// LLM provides natural language query for topic discovery
mcp__folder-mcp__find_documents({
  folder_id: "my-project",
  query: "authentication and authorization setup",
  limit: 20  // Max documents to return (default: 20)
})
```

#### Example Response (StandardResponse Pattern)
```json
{
  "data": {
    "results": [
      {
        "file_path": "docs/auth/setup-guide.md",
        "relevance_score": 0.89,
        "document_summary": {
          "top_key_phrases": [
            {"text": "OAuth2 configuration", "score": 0.92},
            {"text": "JWT token validation", "score": 0.88},
            {"text": "role-based access control", "score": 0.85}
          ],
          "readability_score": 48.3,
          "chunk_count": 12,
          "size": "15.2 KB",
          "modified": "2025-01-20T14:30:00Z"
        },
        "download_url": "http://localhost:3001/api/v1/download?token=eyJmb2xkZXIiOiIvVXNlcnMvaGF..."
      },
      {
        "file_path": "src/auth/middleware.ts",
        "relevance_score": 0.82,
        "document_summary": {
          "top_key_phrases": [
            {"text": "authentication middleware", "score": 0.90},
            {"text": "token verification", "score": 0.87},
            {"text": "session management", "score": 0.84}
          ],
          "readability_score": 42.1,
          "chunk_count": 8,
          "size": "8.4 KB",
          "modified": "2025-01-18T09:15:00Z"
        },
        "download_url": "http://localhost:3001/api/v1/download?token=eyJmb2xkZXIiOiIvVXNlcnMvaGF..."
      },
      {
        "file_path": "README.md",
        "relevance_score": 0.75,
        "document_summary": {
          "top_key_phrases": [
            {"text": "getting started", "score": 0.85},
            {"text": "authentication setup", "score": 0.82},
            {"text": "configuration guide", "score": 0.79}
          ],
          "readability_score": 55.8,
          "chunk_count": 18,
          "size": "22.1 KB",
          "modified": "2025-01-22T10:30:00Z"
        },
        "download_url": "http://localhost:3001/api/v1/download?token=eyJmb2xkZXIiOiIvVXNlcnMvaGF..."
      }
    ],
    "statistics": {
      "total_results": 3,
      "avg_relevance": 0.82
    }
  },
  "status": {
    "code": "success",
    "message": "Found 3 documents covering the topic"
  },
  "continuation": {
    "has_more": false
  },
  "navigation_hints": {
    "next_steps": [
      "Use get_document_text to read entire documents",
      "Use search_content for specific passages within these documents",
      "Use download_url for source code or binary files"
    ],
    "refine_search": [
      "Increase limit to find more documents",
      "Use search_content for chunk-level precision instead",
      "Use explore/list_documents if results are too broad"
    ],
    "tip": "find_documents is best for topic exploration - use search_content for specific content"
  }
}
```

#### Key Differences from search_content

| Aspect | find_documents | search_content |
|--------|---------------|----------------|
| **Granularity** | Document-level | Chunk-level |
| **Query Type** | Natural language topic | Structured (semantic_concepts/exact_terms) |
| **Results** | Ranked documents | Ranked chunks across documents |
| **Use Case** | "Which docs cover X?" | "Find specific passage about X" |
| **Embedding Source** | document_embeddings | chunk_embeddings |
| **Precision** | Coarse (topic-level) | Fine (passage-level) |
| **Navigation** | Leads to reading full documents | Leads to specific chunks |

#### Implementation Approach

**Vec0 Document Search**:
```sql
-- Query document embeddings using vec0 MATCH operator
SELECT
  d.file_path,
  d.document_keywords,
  d.avg_readability_score,
  d.size,
  d.last_modified,
  COUNT(c.id) as chunk_count,
  de.distance as relevance_score
FROM document_embeddings de
JOIN documents d ON de.document_id = d.id
LEFT JOIN chunks c ON c.document_id = d.id
WHERE de.embedding MATCH :query_embedding
  AND de.k = :limit
GROUP BY d.id
ORDER BY de.distance DESC
```

**Performance Optimization**:
- Uses pre-computed document_embeddings (no aggregation at query time)
- Vec0 MATCH operator with SIMD acceleration
- Target latency: <150ms for typical queries
- Minimal post-processing (already aggregated during indexing)

**Response Construction**:
1. Generate query embedding from natural language query
2. Search document_embeddings vec0 table
3. Join with documents table for metadata
4. Parse document_keywords JSON for top_key_phrases
5. Generate time-limited download tokens
6. Return ranked document list

#### Integration with Existing System

**Uses existing infrastructure**:
- `document_embeddings` vec0 table for document-level vectors
- `documents` table for metadata (keywords, readability, size, modified)
- Vec0 MATCH operator for SIMD-accelerated search
- Existing token generation for download URLs

**Complements existing endpoints**:
- **Exploration flow**: list_folders → explore → find_documents → get_document_text
- **Precision flow**: find_documents → search_content (narrow to specific passages)
- **Reading flow**: find_documents → get_document_metadata → get_chunks

**Clear use case separation**:
- **find_documents**: "Which docs should I read about authentication?"
- **search_content**: "Where in the codebase is JWT validation implemented?"
- **explore**: "What files exist in the auth folder?"

#### A2E Test Validation

```typescript
// Known: CLAUDE.md discusses TMOAT testing extensively
// Step 1: Find documents about testing
mcp__folder-mcp__find_documents({
  folder_id: "folder-mcp",
  query: "agent testing methodology",
  limit: 10
})

// Step 2: Validate
// Expected: CLAUDE.md in results with high relevance_score
// Expected: THE_MOTHER_OF_ALL_TESTS.md also likely in results
// Expected: Key phrases include "TMOAT", "agent testing", "validation"

// Step 3: Compare with search_content
mcp__folder-mcp__search_content({
  folder_id: "folder-mcp",
  semantic_concepts: ["agent testing"],
  exact_terms: ["TMOAT"],
  limit: 10
})
// Expected: search_content returns CHUNKS from same documents with content included
// Expected: More precise, chunk-level results vs document-level
```

#### Performance Targets

- Search latency: <150ms for typical queries
- Quality: >80% precision for top 5 documents
- Complementarity: 90%+ of find_documents results should contain relevant content when searched with search_content
- Coverage: Should surface documents that explore/list_documents would miss

#### When to Use find_documents vs search_content

**Use find_documents when:**
- Exploring a new topic area ("What docs discuss configuration?")
- Need to identify which files to read fully
- Topic-level understanding is sufficient
- Broader coverage preferred over precision

**Use search_content when:**
- Looking for specific information ("Where is WebSocket configuration?")
- Need exact passages or code examples
- Technical term matching required
- Precision more important than coverage

**Use both sequentially:**
1. find_documents to identify relevant files
2. search_content within those files for specific passages
3. get_chunks to read the exact content needed

---

### Sprint 10: Integration Testing & Validation (3-4 hours)
**Goal**: Ensure all endpoints work together seamlessly for both exploration and search paths.
**Note**: Final sprint for validation and A2E testing of the complete navigation system

#### Test Flow 1: Exploration Path
```typescript
// 1. Understand capabilities
mcp__folder-mcp__get_server_info()

// 2. List all folders
mcp__folder-mcp__list_folders()

// 3. Explore folder structure
mcp__folder-mcp__explore({
  base_folder_path: "/Users/hanan/Projects/folder-mcp",
  relative_sub_path: "/"
})

// 4. Navigate to interesting subdirectory
mcp__folder-mcp__explore({
  base_folder_path: "/Users/hanan/Projects/folder-mcp",
  relative_sub_path: "docs/testing"
})

// 5. List documents in that location
mcp__folder-mcp__list_documents({
  base_folder_path: "/Users/hanan/Projects/folder-mcp",
  relative_sub_path: "docs/testing",
  recursive: false
})

// 6. Get document metadata
mcp__folder-mcp__get_document_metadata({
  base_folder_path: "/Users/hanan/Projects/folder-mcp",
  file_path: "docs/testing/THE_MOTHER_OF_ALL_TESTS.md"
})

// 7. Read document text
mcp__folder-mcp__get_document_text({
  base_folder_path: "/Users/hanan/Projects/folder-mcp",
  file_path: "docs/testing/THE_MOTHER_OF_ALL_TESTS.md"
})
```

#### Test Flow 2: Search Path
```typescript
// 1. Understand capabilities
mcp__folder-mcp__get_server_info()

// 2. Direct search
mcp__folder-mcp__search({
  base_folder_path: "/Users/hanan/Projects/folder-mcp",
  query: "TUI component development with React Ink",
  limit: 10
})

// 3. Get document metadata for understanding structure
mcp__folder-mcp__get_document_metadata({
  base_folder_path: "/Users/hanan/Projects/folder-mcp",
  file_path: "found_document.md"
})

// 4. Either get specific chunks or full text
mcp__folder-mcp__get_chunks({
  base_folder_path: "/Users/hanan/Projects/folder-mcp",
  file_path: "found_document.md",
  chunk_ids: ["chunk_2", "chunk_5"]
})
// OR
mcp__folder-mcp__get_document_text({
  base_folder_path: "/Users/hanan/Projects/folder-mcp",
  file_path: "found_document.md"
})
```

#### Critical A2E Requirements
**🚨 CRITICAL**: When MCP endpoints fail:
1. **STOP IMMEDIATELY** - Do not try workarounds
2. **TELL THE USER** - "The MCP server has disconnected. Please reconnect it."
3. **WAIT FOR RECONNECTION** - Do not proceed with alternatives

---

## Success Metrics

1. **Response Times**:
   - get_server_info: < 50ms
   - list_folders: < 100ms
   - explore: < 150ms
   - list_documents: < 50ms (non-recursive)
   - get_document_metadata: < 100ms
   - get_chunks: < 100ms
   - get_document_text: < 100ms
   - get_document_raw: < 200ms (depends on file size)
   - search: < 200ms

2. **Semantic Quality**:
   - Key phrases match actual content (>90% precision)
   - Search results are genuinely relevant (>85% accuracy)
   - Navigation hints are helpful and actionable

3. **A2E Testing Coverage**:
   - Every endpoint testable via MCP tools
   - Ground truth validation for all responses
   - Both exploration and search paths validated

## Expected Outcomes

### For LLM Agents
- **Natural discovery flow** through progressive exploration
- **No overwhelming responses** with path-aware document listing
- **75% reduction** in unnecessary content retrieval
- **Clear navigation paths** for exploration vs search
- **Intelligent decision-making** with semantic previews

### For Users
- **Production-quality** knowledge base navigation
- **Fast discovery** through logical exploration flow
- **Accurate search** with semantic understanding
- **Clear organization** with hierarchical navigation
- **Consistent experience** across all endpoints

## Next Sprint Start

**Sprint 0: Perfect get_server_info Endpoint**

Build the entry point for LLM discovery, providing clear capabilities and endpoint descriptions that enable intelligent navigation decisions.

---

*This epic represents the transformation from basic file access to intelligent semantic navigation, following natural LLM discovery patterns with clear exploration and search paths.*