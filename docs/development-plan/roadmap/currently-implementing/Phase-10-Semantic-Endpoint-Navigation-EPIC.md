# EPIC: Phase 10 - Semantic Endpoint Navigation

**Epic Type**: Core Feature Enhancement
**Phase**: 10 - Semantic Endpoint Navigation
**Priority**: Critical - Makes the system usable for LLM agents
**Total Duration**: 9 Sprints (~26-32 hours)
**Pre-production**: YES - No backwards compatibility needed
**Principle**: FAIL FAST - No silent failures or empty fallbacks

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

## 🎯 Navigation Paths

### Exploration Path (General Understanding)
When an LLM needs to understand what's available and explore a knowledge base:
```
get_server_info() → list_folders() → explore() → list_documents() → get_document_metadata() → get_chunks() → get_document_text()
```

### Search Path (Specific Information)
When an LLM needs to find specific information quickly:
```
get_server_info() → search() → get_document_metadata() → get_chunks() or get_document_text()
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
9. **Semantic Search**: `search` uses embeddings with intelligent ranking
10. **Performance**: All endpoints respond in <200ms using pre-computed data

### Validation Methodology (A2E Testing)
- **Agent-to-Endpoint**: Use MCP tools directly, no scripts or curl commands
- **Ground Truth Validation**: Read known files, then test endpoints return expected content
- **🚨 Critical**: If MCP disconnects, STOP and ask user to reconnect - no workarounds

## Sprint Breakdown

### Sprint 0: Perfect `get_server_info` Endpoint (3-4 hours)
**Goal**: Provide LLMs with server capabilities and endpoint discovery.
**Replaces**: Existing `get_server_info` - Already implemented, needs enhancement with endpoint discovery information

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
    "file_types_supported": ["pdf", "docx", "txt", "md", "json", "yaml"],
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
        "returns": "Clean text string from PDF/DOCX/etc",
        "use_when": "Reading document content for analysis"
      },
      {
        "name": "get_document_raw",
        "purpose": "Get original file content",
        "returns": "Base64 for binary, UTF-8 for text files",
        "use_when": "Need original file, images, or exact formatting"
      }
    ],
    "search": [
      {
        "name": "search",
        "purpose": "Semantic search across all documents",
        "returns": "Relevant chunks with explanations",
        "use_when": "Finding specific information quickly"
      }
    ]
  },
  "usage_hints": {
    "exploration_flow": "get_server_info → list_folders → explore → list_documents → get_document_text",
    "search_flow": "get_server_info → search → get_document_text",
    "tip": "Use exploration for understanding structure, search for specific queries"
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
      "folder_id": "folder-mcp",
      "name": "folder-mcp",
      "path": "/Users/hanan/Projects/folder-mcp",
      "document_count": 156,
      "last_modified": "2025-01-22T10:30:00Z",
      "semantic_preview": {
        "top_key_phrases": [
          {"text": "Model Context Protocol server", "score": 0.92},
          {"text": "semantic file system access", "score": 0.89},
          {"text": "multi-folder indexing", "score": 0.87}
        ],
        "document_themes": [
          "MCP implementation",
          "semantic search",
          "document processing"
        ],
        "complexity_indicator": "technical",
        "avg_readability": 45.2
      },
      "indexing_status": {
        "is_indexed": true,
        "documents_indexed": 156,
        "key_phrases_extracted": 156
      }
    }
  ],
  "total_folders": 1,
  "navigation_hint": "Use explore endpoint to navigate within a folder"
}
```

#### A2E Test Validation
```typescript
// Step 1: Call list_folders
mcp__folder-mcp__list_folders()

// Step 2: Verify all configured folders appear
// Step 3: Check semantic previews match folder content
```

---

### Sprint 2: Perfect `explore` Endpoint (3-4 hours)
**Goal**: Hierarchical navigation with optional pagination for folders with many subdirectories.
**Replaces**: NEW endpoint - No existing equivalent, adds hierarchical folder exploration capability

#### Example Request
```typescript
// MCP Tool Call - Default limit of 50 subdirectories
mcp__folder-mcp__explore({
  folder_path: "/Users/hanan/Projects/folder-mcp",
  current_path: "src"  // Relative to folder_path
  // limit: 50 is the default for subdirectories
})
```

#### Example Response with Optional Pagination
```json
{
  "current_location": {
    "path": "/Users/hanan/Projects/folder-mcp/src",
    "relative_path": "src",
    "name": "src",
    "level": 1,
    "document_count": 3,  // Direct children only
    "total_nested_documents": 142,  // Including subdirectories
    "semantic_context": {
      "primary_themes": [
        "TypeScript implementation",
        "clean architecture",
        "MCP protocol"
      ],
      "key_phrases": [
        {"text": "domain driven design", "score": 0.93},
        {"text": "dependency injection", "score": 0.90},
        {"text": "infrastructure layer", "score": 0.87}
      ]
    }
  },
  "breadcrumbs": [
    {
      "name": "folder-mcp",
      "path": "/",
      "level": 0,
      "semantic_hint": "MCP server root"
    },
    {
      "name": "src",
      "path": "src",
      "level": 1,
      "semantic_hint": "source code",
      "is_current": true
    }
  ],
  "subdirectories": [
    {
      "name": "domain",
      "path": "src/domain",
      "document_count": 28,
      "semantic_preview": ["business logic", "entities", "value objects"]
    },
    {
      "name": "infrastructure",
      "path": "src/infrastructure",
      "document_count": 35,
      "semantic_preview": ["providers", "adapters", "external services"]
    },
    {
      "name": "interfaces",
      "path": "src/interfaces",
      "document_count": 42,
      "semantic_preview": ["MCP server", "CLI", "TUI components"]
    },
    {
      "name": "application",
      "path": "src/application",
      "document_count": 18,
      "semantic_preview": ["use cases", "orchestration", "workflows"]
    }
  ],
  "pagination": {
    "subdirectories_returned": 4,
    "subdirectories_total": 8,
    "limit": 50,
    "has_more": false  // All subdirectories fit within limit
  },
  "navigation_hints": {
    "next_actions": [
      "Use list_documents to see files in current location",
      "Use explore with subdirectory path to go deeper",
      "Most folders have <50 subdirs, pagination rarely needed"
    ]
  }
}
```

#### A2E Test Validation
```typescript
// Step 1: Explore root
mcp__folder-mcp__explore({
  folder_path: "/Users/hanan/Projects/folder-mcp",
  current_path: "/"
})

// Step 2: Navigate to subdirectory
mcp__folder-mcp__explore({
  folder_path: "/Users/hanan/Projects/folder-mcp",
  current_path: "docs"
})

// Step 3: Verify breadcrumbs and subdirectories
```

---

### Sprint 3: Perfect `list_documents` Endpoint (3-4 hours)
**Goal**: List documents in current location with pagination to preserve LLM context.
**Replaces**: Enhances existing `list_documents` - Adds current_path and recursive parameters for path-aware listing

#### Example Request (Initial)
```typescript
// MCP Tool Call - Uses smart default limit of 20
mcp__folder-mcp__list_documents({
  folder_path: "/Users/hanan/Projects/folder-mcp",
  current_path: "docs/testing",  // Relative path
  recursive: false  // Just this directory
  // limit: 20 is the default
})
```

#### Example Response with Pagination
```json
{
  "location": {
    "folder_path": "/Users/hanan/Projects/folder-mcp",
    "current_path": "docs/testing",
    "full_path": "/Users/hanan/Projects/folder-mcp/docs/testing"
  },
  "documents": [
    {
      "file_path": "docs/testing/THE_MOTHER_OF_ALL_TESTS.md",
      "name": "THE_MOTHER_OF_ALL_TESTS.md",
      "relative_path": "docs/testing/THE_MOTHER_OF_ALL_TESTS.md",
      "size": 24567,
      "mime_type": "text/markdown",
      "last_modified": "2025-01-20T10:00:00Z",
      "semantic_summary": {
        "primary_purpose": "Comprehensive testing methodology",
        "key_phrases": [
          {"text": "TMOAT agent testing", "score": 0.95},
          {"text": "end-to-end validation", "score": 0.92},
          {"text": "systematic test approach", "score": 0.89}
        ],
        "topics": ["testing", "validation", "methodology"],
        "readability": {
          "score": 48.3,
          "level": "technical"
        }
      }
    },
    {
      "file_path": "docs/testing/a2e-testing.md",
      "name": "a2e-testing.md",
      "relative_path": "docs/testing/a2e-testing.md",
      "size": 8934,
      "mime_type": "text/markdown",
      "semantic_summary": {
        "primary_purpose": "Agent-to-endpoint testing guide",
        "key_phrases": [
          {"text": "MCP tool validation", "score": 0.93},
          {"text": "direct endpoint testing", "score": 0.90}
        ],
        "topics": ["A2E", "MCP testing", "validation"]
      }
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
  folder_path: "/Users/hanan/Projects/folder-mcp",
  current_path: "docs/testing",
  recursive: false
})
// Returns first 20 docs + continuation token

// Step 2: Get more if needed
mcp__folder-mcp__list_documents({
  continuation_token: "..."
})

// Step 3: Request with explicit large limit if you know you need all
mcp__folder-mcp__list_documents({
  folder_path: "/Users/hanan/Projects/folder-mcp",
  current_path: "docs",
  recursive: true,
  limit: 200  // Override default if you know you need everything
})
```

#### Why Pagination Helps
- **Default limit 20**: Saves ~80% context for typical exploration
- **Progressive discovery**: Get more only if initial results insufficient
- **Context preservation**: 20 docs ≈ 4KB vs 100 docs ≈ 20KB of context

---

### Sprint 4: Perfect `get_document_metadata` Endpoint (3-4 hours)
**Goal**: Provide document metadata and chunk-level semantic navigation with optional pagination for large documents.
**Replaces**: Existing `get_document_outline` - Renamed for clarity, provides document metadata and structure

#### Example Request
```typescript
// MCP Tool Call - Default limit of 50 chunks
mcp__folder-mcp__get_document_metadata({
  folder_path: "/Users/hanan/Projects/folder-mcp",
  file_path: "CLAUDE.md"
  // limit: 50 is the default for chunks
})
```

#### Example Response with Optional Pagination
```json
{
  "document": {
    "file_path": "CLAUDE.md",
    "name": "CLAUDE.md",
    "path": "/Users/hanan/Projects/folder-mcp/CLAUDE.md",
    "total_chunks": 87
  },
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
        "semantics": {
          "main_points": [
            "Claude Code guidance",
            "Development workflow"
          ],
          "key_phrases": [
            {"text": "Edit files freely", "score": 0.89},
            {"text": "No permission needed", "score": 0.87}
          ],
          "readability_score": 51.2,
          "has_code_examples": false
        }
      },
      {
        "chunk_id": "chunk_1",
        "chunk_index": 1,
        "heading": "Testing Requirements",
        "semantics": {
          "main_points": [
            "TMOAT agent testing",
            "Verifiable tests"
          ],
          "key_phrases": [
            {"text": "TMOAT scripts", "score": 0.92},
            {"text": "websocket endpoints", "score": 0.88}
          ],
          "has_code_examples": true
        }
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
    "sections_with_code": [1, 15, 22, 28, 35],  // In first 50 chunks
    "continue_outline": "Use continuation_token for chunks 51-87",
    "use_get_document_text": "To read full content",
    "typical_documents": "Most documents have <50 chunks"
  }
}
```

---

### Sprint 5: Perfect `get_chunks` Endpoint (2-3 hours)
**Goal**: Retrieve specific chunks identified from metadata exploration for targeted content access.
**Replaces**: NEW endpoint - No existing equivalent, enables surgical chunk extraction

#### Example Request
```typescript
// MCP Tool Call - After identifying interesting chunks from metadata
mcp__folder-mcp__get_chunks({
  folder_path: "/Users/hanan/Projects/folder-mcp",
  file_path: "CLAUDE.md",
  chunk_ids: ["chunk_1", "chunk_15", "chunk_28"]
})
```

#### Example Response
```json
{
  "file_path": "CLAUDE.md",
  "chunks_requested": 3,
  "chunks_returned": 3,
  "chunks": [
    {
      "chunk_id": "chunk_1",
      "chunk_index": 1,
      "content": "Testing Requirements - BE A GOOD TMOAT AGENT:\n\nAgent-Led Testing Approach: Think like a human engineer. Break assignments into verifiable tests to validate assumptions rather than blindly changing files and hoping for magical fixes. IT NEVER WORKS!\n\nTOOLS A GOOD TMOAT AGENT WILL USE:\n1. Query database files using sqlite3 - verify data persistence and state\n2. Monitor runtime files using file system - track changes and additions\n3. Use TMOAT scripts to connect to websocket endpoints...",
      "metadata": {
        "heading": "Testing Requirements",
        "key_phrases": [
          {"text": "TMOAT agent testing", "score": 0.92},
          {"text": "websocket endpoints", "score": 0.88},
          {"text": "database queries", "score": 0.85}
        ],
        "has_code_examples": true,
        "readability_score": 48.3,
        "start_offset": 1024,
        "end_offset": 2048
      }
    },
    {
      "chunk_id": "chunk_15",
      "chunk_index": 15,
      "content": "// Example TMOAT test script for WebSocket validation\nconst ws = new WebSocket('ws://localhost:3000');\nws.on('open', () => {\n  ws.send(JSON.stringify({type: 'subscribe', topics: ['indexing']}))\n});\nws.on('message', (data) => {\n  console.log('Received:', JSON.parse(data));\n});",
      "metadata": {
        "heading": "WebSocket Testing Examples",
        "key_phrases": [
          {"text": "WebSocket validation", "score": 0.89},
          {"text": "real-time events", "score": 0.87}
        ],
        "has_code_examples": true,
        "is_code_block": true
      }
    },
    {
      "chunk_id": "chunk_28",
      "chunk_index": 28,
      "content": "## A2E Testing Methodology\n\nAgent-to-Endpoint testing requires using MCP tools directly...",
      "metadata": {
        "heading": "A2E Testing",
        "key_phrases": [
          {"text": "Agent-to-Endpoint testing", "score": 0.94},
          {"text": "MCP tool validation", "score": 0.91}
        ],
        "has_code_examples": false
      }
    }
  ],
  "navigation_hints": {
    "total_chunks_in_document": 87,
    "use_get_document_text": "To read the full document",
    "use_get_document_metadata": "To discover more chunks"
  }
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
  folder_path: "/Users/hanan/Projects/folder-mcp",
  file_path: "CLAUDE.md"
})

// Step 2: Identify interesting chunks (e.g., chunks with code examples)
// From metadata: chunk_1, chunk_15, chunk_28 have code examples

// Step 3: Fetch just those chunks
mcp__folder-mcp__get_chunks({
  folder_path: "/Users/hanan/Projects/folder-mcp",
  file_path: "CLAUDE.md",
  chunk_ids: ["chunk_1", "chunk_15", "chunk_28"]
})

// Step 4: Verify returned content matches expected chunks
```

---

### Sprint 6: Perfect `get_document_text` Endpoint (2-3 hours)
**Goal**: Retrieve clean extracted text from documents without semantic overlay, with pagination for large documents.
**Replaces**: NEW endpoint - Provides clean text extraction separate from raw file access

#### Example Request (Initial)
```typescript
// MCP Tool Call - Default limit of 5000 characters
mcp__folder-mcp__get_document_text({
  folder_path: "/Users/hanan/Projects/folder-mcp",
  file_path: "README.md"
  // limit: 5000 is the default (in characters, not lines)
})
```

#### Example Response with Pagination
```json
{
  "document": {
    "file_path": "README.md",
    "name": "README.md",
    "path": "/Users/hanan/Projects/folder-mcp/README.md",
    "mime_type": "text/markdown",
    "size": 15234,
    "last_modified": "2025-01-22T08:30:00Z"
  },
  "extracted_text": "# folder-mcp\n\nModel Context Protocol server for folder operations...\n\n## Installation\n\nnpm install -g folder-mcp\n\n## Usage\n\nfolder-mcp\n\n...",
  "metadata": {
    "extraction_method": "markdown_parser",
    "total_characters": 15234,
    "characters_returned": 5000,
    "total_chunks": 12,
    "language": "en"
  },
  "pagination": {
    "limit": 5000,
    "offset": 0,
    "total": 15234,
    "returned": 5000,
    "has_more": true,
    "continuation_token": "eyJkb2NfaWQiOiJSRUFETUUubWQiLCJvZmZzZXQiOjUwMDB9"
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

#### Why Text Pagination Helps
- **Default limit 5000 chars**: Prevents overwhelming responses for large documents
- **Character-based**: More predictable than line-based for text consumption
- **Progressive reading**: Get more content only if needed
- **Context savings**: 5KB chunks vs potentially 100KB+ full documents

---

### Sprint 7: Perfect `get_document_raw` Endpoint (2 hours)
**Goal**: Enable direct file fetching for binary files or raw content access.
**Replaces**: Existing `get_document_data` - Renamed for clarity, fetches raw file content

#### Example Request
```typescript
// MCP Tool Call
mcp__folder-mcp__get_document_raw({
  folder_path: "/Users/hanan/Projects/folder-mcp",
  file_path: "assets/logo.png"
})
```

#### Example Response (Target)
```json
{
  "document": {
    "file_path": "assets/logo.png",
    "name": "logo.png",
    "path": "/Users/hanan/Projects/folder-mcp/assets/logo.png",
    "mime_type": "image/png",
    "size": 45678,
    "last_modified": "2025-01-20T10:00:00Z"
  },
  "content": {
    "encoding": "base64",
    "data": "iVBORw0KGgoAAAANSUhEUgAAAAUA..."
  },
  "metadata": {
    "is_binary": true,
    "is_indexed": false,
    "file_type": "image"
  }
}
```

---

### Sprint 8: Perfect `search` Endpoint (4-5 hours)
**Goal**: Semantic search with pagination for context-efficient result exploration.
**Replaces**: Enhances existing `search` - Adds better key_phrases support and improved pagination

#### Example Request (Initial)
```typescript
// MCP Tool Call - Default limit of 10 for quality over quantity
mcp__folder-mcp__search({
  folder_path: "/Users/hanan/Projects/folder-mcp",
  query: "How to implement TMOAT agent testing with websocket endpoints",
  threshold: 0.3
  // limit: 10 is the default
})
```

#### Example Response with Pagination
```json
{
  "query": "How to implement TMOAT agent testing with websocket endpoints",
  "results": [
    {
      "file_path": "CLAUDE.md",
      "chunk_id": "chunk_1",
      "relevance_score": 0.92,
      "file_path": "/Users/hanan/Projects/folder-mcp/CLAUDE.md",
      "content_snippet": "...TMOAT AGENT WILL USE: 1. Query database files...",
      "semantic_explanation": {
        "why_relevant": "Direct match for TMOAT agent testing and websocket",
        "matched_key_phrases": [
          "TMOAT agent testing",
          "websocket endpoints",
          "database queries"
        ],
        "confidence": "high",
        "match_type": "exact_topic"
      }
    },
    {
      "file_path": "docs/testing/websocket-guide.md",
      "chunk_id": "chunk_5",
      "relevance_score": 0.87,
      "file_path": "/Users/hanan/Projects/folder-mcp/docs/testing/websocket-guide.md",
      "content_snippet": "...WebSocket connections in TMOAT framework...",
      "semantic_explanation": {
        "why_relevant": "WebSocket implementation details for TMOAT",
        "matched_key_phrases": ["websocket", "TMOAT", "testing framework"],
        "confidence": "high",
        "match_type": "related_topic"
      }
    }
  ],
  "search_metadata": {
    "total_matches": 47,
    "returned": 10,
    "search_strategy": "semantic_embedding",
    "model_used": "multilingual-e5-large",
    "search_time_ms": 47,
    "average_relevance": 0.78
  },
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 47,
    "returned": 10,
    "has_more": true,
    "continuation_token": "eyJxdWVyeSI6IkhvdyB0byBpbXBsZW1lbnQgVE1PQVQiLCJvZmZzZXQiOjEwfQ=="
  },
  "navigation_hints": {
    "continue_search": "Use continuation_token for more results (sorted by relevance)",
    "use_get_document_text": "To read full documents",
    "refine_search": "Add more specific terms to narrow results"
  }
}
```

#### Example Continuation Request
```typescript
// Get more search results if initial 10 weren't sufficient
mcp__folder-mcp__search({
  continuation_token: "eyJxdWVyeSI6IkhvdyB0byBpbXBsZW1lbnQgVE1PQVQiLCJvZmZzZXQiOjEwfQ=="
})
// Returns results 11-20, still sorted by relevance
```

#### Why Search Pagination Helps
- **Default limit 10**: Shows best matches first without overwhelming
- **Quality over quantity**: Top 10 usually sufficient for most queries
- **Progressive exploration**: Get more results only if needed
- **Context savings**: 10 results ≈ 2KB vs 50 results ≈ 10KB

---

### Sprint 8: Integration Testing & Validation (3-4 hours)
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
  folder_path: "/Users/hanan/Projects/folder-mcp",
  current_path: "/"
})

// 4. Navigate to interesting subdirectory
mcp__folder-mcp__explore({
  folder_path: "/Users/hanan/Projects/folder-mcp",
  current_path: "docs/testing"
})

// 5. List documents in that location
mcp__folder-mcp__list_documents({
  folder_path: "/Users/hanan/Projects/folder-mcp",
  current_path: "docs/testing",
  recursive: false
})

// 6. Get document metadata
mcp__folder-mcp__get_document_metadata({
  folder_path: "/Users/hanan/Projects/folder-mcp",
  file_path: "docs/testing/THE_MOTHER_OF_ALL_TESTS.md"
})

// 7. Read document text
mcp__folder-mcp__get_document_text({
  folder_path: "/Users/hanan/Projects/folder-mcp",
  file_path: "docs/testing/THE_MOTHER_OF_ALL_TESTS.md"
})
```

#### Test Flow 2: Search Path
```typescript
// 1. Understand capabilities
mcp__folder-mcp__get_server_info()

// 2. Direct search
mcp__folder-mcp__search({
  folder_path: "/Users/hanan/Projects/folder-mcp",
  query: "TUI component development with React Ink",
  limit: 10
})

// 3. Get document metadata for understanding structure
mcp__folder-mcp__get_document_metadata({
  folder_path: "/Users/hanan/Projects/folder-mcp",
  file_path: "found_document.md"
})

// 4. Either get specific chunks or full text
mcp__folder-mcp__get_chunks({
  folder_path: "/Users/hanan/Projects/folder-mcp",
  file_path: "found_document.md",
  chunk_ids: ["chunk_2", "chunk_5"]
})
// OR
mcp__folder-mcp__get_document_text({
  folder_path: "/Users/hanan/Projects/folder-mcp",
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