# Sprint 8: Content Search with Hybrid Scoring

**Endpoint Name**: `search_content`
**Status**: Planning Complete - Ready for Implementation
**Duration**: 4-5 hours
**Priority**: High - Core search functionality for LLM agents
**Type**: New endpoint for chunk-level semantic search

---

## 🎯 Sprint Goal

Implement an intelligent semantic search endpoint that enables LLMs to efficiently locate specific content within indexed folders. This endpoint focuses on **content retrieval** (not document discovery) by searching chunk-level embeddings and returning full chunk text with relevance scores.

---

## Core Problem Statement

LLMs need to find specific information in indexed documents to answer user questions. Requirements:
1. Search across all document chunks using semantic similarity
2. Handle technical terms that may have poor embedding quality
3. Return full chunk text immediately (no second call needed)
4. Explain relevance through scoring transparency
5. Support pagination for large result sets

**Key Design Principle**: `search_content` is for **retrieval** (finding specific passages), while `find_documents` is for **discovery** (finding relevant files). These endpoints are complementary, not overlapping.

---

## Architectural Approach

### LLM-Driven Parameter Extraction

The LLM client extracts structured search parameters from user queries:

**semantic_concepts**: Array of terms for embedding-based similarity
- Example: `["authentication", "state management", "React hooks"]`
- Used for: Conceptual matching via vector similarity
- **Optional**: Can search with exact_terms only

**exact_terms**: Array of terms that must match exactly
- Example: `["useState", "WebSocket", "v4"]`
- Used for: Technical identifiers, version numbers, code terms
- Solves: Poor embedding quality for domain-specific vocabulary
- **Optional**: Can search with semantic_concepts only

**Validation**: At least ONE of `semantic_concepts` or `exact_terms` must be provided.

**Rationale**: The LLM understands context and intent better than server-side NLP. This is cleaner and more accurate than natural language query parsing.

---

## Hybrid Scoring Algorithm

### Two-Signal Approach

**1. Semantic Similarity (Embeddings)**
- Generate query embedding from semantic_concepts array (if provided)
- Compare against chunk embeddings via vec0 MATCH operator (cosine similarity)
- Provides: Conceptual matching, handles natural language

**2. Exact Text Matching (Technical Terms)**
- Search for exact_terms in chunk text (if provided)
- Case-sensitive for code patterns (camelCase, snake_case, PascalCase)
- Case-insensitive for natural language and acronyms
- Provides: Precision for technical terms with poor embeddings

### Scoring Formula

```
semantic_score = cosine_similarity(query_embedding, chunk_embedding)  // If semantic_concepts provided
                 OR 0.0 if only exact_terms provided

exact_term_boost = 1.0
for each exact_term match in chunk:
    exact_term_boost *= 1.5

final_score = semantic_score × exact_term_boost
```

**Design Rationale**:
- Semantic search provides conceptual matching
- Exact matching adds precision for technical terms
- Multiplicative formula ensures poor semantic matches aren't rescued by exact terms
- Example: semantic_score=0.3, boost=1.5 → final=0.45 (filtered by min_score=0.5)

**Removed Features**:
- ❌ No filename matching boost (use `find_documents` for document filtering)
- ❌ No file type boost (not needed for chunk-level search)

---

## Response Design Philosophy

### Content-First Design

**Always include chunk content** in search results:
- **95% of searches need content**: LLMs cannot judge relevance from metadata alone
- **Single round trip**: Eliminates latency of lazy loading pattern
- **Better UX**: Immediate answers vs multi-step fetching
- **Token cost acceptable**: 5-10K tokens = 2.5-5% of 200K context budget

**Why not lazy loading?**
- Metadata (chunk_id, relevance_score, file_path) doesn't enable informed decisions
- LLMs fetch content 95% of the time anyway
- The "should I fetch?" decision step has no information to decide with

### Flat Ranking Across Documents

Return a flat list of chunks ranked by relevance across ALL documents:
- The LLM needs THE most relevant content immediately
- A perfect chunk in document #15 shouldn't be hidden behind pagination
- Each result includes `document_id`, so LLM can see source file
- If 5 chunks from same file appear in top 10, LLM naturally infers that file is important

---

## Request Parameters

```typescript
interface SearchContentRequest {
  folder_id: string;              // Required: which folder to search

  // Search signals - AT LEAST ONE REQUIRED
  semantic_concepts?: string[];   // Optional: ["authentication", "state management"]
  exact_terms?: string[];         // Optional: ["useState", "WebSocket", "Q4"]
  // Validation: At least one of semantic_concepts or exact_terms must be non-empty

  // Pagination & filtering
  min_score?: number;             // Optional: relevance threshold (default: 0.5)
  limit?: number;                 // Optional: max results per page (default: 10, max: 50)
  continuation_token?: string;    // Optional: base64url-encoded pagination state
}
```

**Design Decisions - Parameters Not Included**:
- **No `file_hints`**: Document filtering is `find_documents`' responsibility
- **No `include_content`**: Content is always included (content-first design)
- **No `max_tokens`**: Use `limit` parameter to control result count

---

## Response Structure

### SearchContentResponse

```typescript
interface SearchContentResponse {
  data: {
    results: SearchChunkResult[];
    statistics: {
      total_results: number;           // Total matching chunks
      files_covered: string[];         // Unique document_ids in results
      avg_relevance: number;           // Average relevance score
      search_interpretation: string;   // What we understood from query
    };
  };
  status: {
    success: boolean;
    code: number;
    message: string;
  };
  continuation: {
    has_more: boolean;
    next_token?: string;                // Base64url-encoded pagination state
  };
  navigation_hints: {
    next_actions: string[];              // Suggested follow-up actions
    related_queries: string[];           // Query refinement suggestions
  };
}
```

### SearchChunkResult (6 Fields - Aligned with Database Schema)

```typescript
interface SearchChunkResult {
  chunk_id: string;                    // Database chunks.id (e.g., "12345")
  document_id: string;                 // Relative path (e.g., "src/auth/Auth.ts") - reusable in other endpoints
  content: string;                     // The actual chunk text ⭐ ALWAYS INCLUDED
  relevance_score: number;             // Match quality [0.0, 1.0]
  chunk_index: number;                 // Position within document (0-based, from chunks.chunk_index)
  document_keywords?: string[];        // Top 5-7 key phrases from parent document (optional)
}
```

**Field Alignment with Database Schema**:
- ✅ `chunk_id` → `chunks.id`
- ✅ `document_id` → `documents.file_path` (relative path, reusable across endpoints)
- ✅ `content` → `chunks.content`
- ✅ `chunk_index` → `chunks.chunk_index`
- ✅ `document_keywords` → `documents.document_keywords` (JSON parsed)
- ✅ `relevance_score` → computed from vec0 + boosts

**Token Efficiency**: ~550-650 tokens per chunk (90% is actual content, 10% is metadata)

---

## document_id Reusability

The `document_id` field contains the relative file path and can be used directly with other endpoints:

```typescript
// Step 1: Search for content
const searchResults = await search_content({
  semantic_concepts: ["JWT validation"]
})
// Result: { chunk_id: "123", document_id: "src/auth/Auth.ts", content: "...", ... }

// Step 2: Get full document using same document_id
const fullDoc = await get_document_data({
  folder_id: "project",
  document_id: "src/auth/Auth.ts"  // ✅ Same value, no transformation
})

// Step 3: Get document text
const text = await get_document_text({
  base_folder_path: "/path/to/project",
  file_path: "src/auth/Auth.ts"  // ✅ Same value
})
```

**No field name confusion, consistent across all Phase 10 endpoints.**

---

## Pagination with Continuation Tokens

### Token-Based Pagination

All search state encoded in opaque base64url token:
- **Stateless**: Token contains folder_id, semantic_concepts, exact_terms, offset, min_score
- **Resumable**: Can continue from any point
- **Consistent**: Matches existing endpoints (list_documents, explore, etc.)

### Token Format

```typescript
{
  folder_id: string,
  semantic_concepts?: string[],  // At least one of these two must be present
  exact_terms?: string[],        // in the original request
  offset: number,                // Where to resume
  min_score: number,
  type: 'search_content_pagination'
}
// Encoded: Buffer.from(JSON.stringify(data)).toString('base64url')
```

---

## Example Requests & Responses

### Example 1: Hybrid Search (Semantic + Exact)

**Request:**
```typescript
mcp__folder-mcp__search_content({
  folder_id: "my-project",
  semantic_concepts: ["authentication", "state management"],
  exact_terms: ["useState", "useEffect"],
  min_score: 0.5,
  limit: 10
})
```

**Response:**
```json
{
  "data": {
    "results": [
      {
        "chunk_id": "12345",
        "document_id": "src/auth/LoginForm.tsx",
        "content": "function LoginForm() {\n  const [user, setUser] = useState(null);\n  const [loading, setLoading] = useState(false);\n  \n  useEffect(() => {\n    // Authentication state management\n    if (user) {\n      validateSession(user);\n    }\n  }, [user]);\n  ...",
        "relevance_score": 0.94,
        "chunk_index": 5,
        "document_keywords": ["useState hook", "authentication state", "form validation", "session management"]
      }
    ],
    "statistics": {
      "total_results": 47,
      "files_covered": ["src/auth/LoginForm.tsx", "src/auth/AuthContext.tsx", "src/hooks/useAuth.ts"],
      "avg_relevance": 0.78,
      "search_interpretation": "Authentication and state management using React hooks"
    }
  },
  "status": {
    "success": true,
    "code": 200,
    "message": "Found 47 results"
  },
  "continuation": {
    "has_more": true,
    "next_token": "eyJmb2xkZXJfaWQiOiJteS1wcm9qZWN0Iiwib2Zmc2V0IjoxMH0..."
  },
  "navigation_hints": {
    "next_actions": [
      "Read full document: get_document_data(document_id='src/auth/LoginForm.tsx')",
      "Get formatted text: get_document_text(file_path='src/auth/LoginForm.tsx')",
      "Continue pagination: use continuation_token for more results"
    ],
    "related_queries": [
      "JWT token refresh flow",
      "Authentication error handling",
      "Session persistence"
    ]
  }
}
```

### Example 2: Semantic Only (No Exact Terms)

**Request:**
```typescript
mcp__folder-mcp__search_content({
  folder_id: "docs",
  semantic_concepts: ["configuration management", "environment variables"],
  min_score: 0.6,  // Higher threshold for pure semantic
  limit: 10
})
```

**Response:** Results about YAML config, env vars, settings with semantic scores >= 0.6

### Example 3: Exact Terms Only (No Semantic)

**Request:**
```typescript
mcp__folder-mcp__search_content({
  folder_id: "codebase",
  exact_terms: ["vec0", "SQLite", "embeddings"],
  min_score: 0.3,  // Lower threshold - relying on exact matches
  limit: 10
})
```

**Response:** Grep-like search for technical terms, boosted by number of matches

---

## Navigation Hints

Context-aware suggestions based on result characteristics:

```typescript
// Few high-relevance results → suggest reading documents
navigation_hints: {
  next_actions: [
    "Read Auth.ts for complete implementation",
    "Use find_documents to discover related files"
  ],
  related_queries: ["JWT token refresh", "authentication middleware"]
}

// Many medium-relevance results → suggest narrowing
navigation_hints: {
  next_actions: [
    "Add exact_terms to narrow results",
    "Use continuation_token for more results",
    "Try find_documents first to identify relevant files"
  ],
  related_queries: ["specific function names", "file-level patterns"]
}
```

---

## Implementation Approach

### Query Processing Pipeline

1. **Validate request** - Ensure semantic_concepts OR exact_terms is provided
2. **Extract parameters** from request (or decode continuation_token)
3. **Generate query embedding** from semantic_concepts (if provided)
4. **Vec0 vector search** against chunk_embeddings (if semantic_concepts provided)
5. **Apply exact term boost** to results (if exact_terms provided)
6. **Rank by final_score** across all documents
7. **Paginate** based on limit and offset
8. **Fetch chunk content** for results
9. **Fetch document keywords** for context
10. **Generate continuation token** if has_more
11. **Return results** with navigation hints

### SQL Query Structure

```sql
-- Hybrid search with vec0 MATCH
SELECT
  c.id as chunk_id,
  d.file_path as document_id,
  c.content,
  c.chunk_index,
  d.document_keywords,
  (1 - ce.distance) as semantic_score,
  -- exact_term_boost calculated in application code
  ((1 - ce.distance) * :exact_term_boost) as relevance_score
FROM chunk_embeddings ce
JOIN chunks c ON ce.chunk_id = c.id
JOIN documents d ON c.document_id = d.id
WHERE ce.embedding MATCH :query_embedding
  AND ce.k = :limit_with_buffer
  AND ((1 - ce.distance) * :exact_term_boost) >= :min_score
ORDER BY relevance_score DESC
LIMIT :limit OFFSET :offset;
```

### Performance Considerations

- **Vec0 MATCH operator**: SIMD-accelerated cosine similarity (fast)
- **Single JOIN**: Fetch chunks and document keywords in one query
- **Content included**: No second query needed (eager loading)
- **Target latency**: <200ms for typical queries (10-20 results)

---

## Success Criteria

### Functional Requirements

✅ **Semantic search works** - Vector similarity via vec0 MATCH
✅ **Exact term boost works** - Technical terms matched precisely
✅ **Content always included** - No lazy loading needed
✅ **Pagination preserves state** - Continuation tokens work
✅ **document_id reusable** - Same value works with other endpoints
✅ **Validation enforced** - At least one search parameter required

### Performance Requirements

- Search latency: <200ms for typical queries (10-20 results)
- First page: 10 results with content fit in reasonable token budget
- Pagination overhead: <50ms for continuation token requests

### Quality Requirements

- Relevant results: >85% precision for top 10 results
- Exact term matching: 100% recall for exact_terms in content
- Score accuracy: relevance_score correctly reflects hybrid formula

---

## A2E Test Validation

### Test Scenario 1: Hybrid Search (Semantic + Exact)

```typescript
// Known content: CLAUDE.md contains "useState" and "TMOAT agent"
// Step 1: Read known content
mcp__desktop-commander__read_file("/Users/hanan/Projects/folder-mcp/CLAUDE.md")
// Verify: Contains "useState" and "TMOAT agent testing"

// Step 2: Hybrid search
mcp__folder-mcp__search_content({
  folder_id: "folder-mcp",
  semantic_concepts: ["React hooks", "testing"],
  exact_terms: ["useState", "TMOAT"],
  min_score: 0.5
})

// Step 3: Validate
// Expected: CLAUDE.md chunks in results
// Expected: document_id is "CLAUDE.md" or path relative to folder
// Expected: content includes "useState" and/or "TMOAT"
// Expected: relevance_score >= 0.5
// Expected: relevance_score boosted by exact matches (higher than semantic alone)
```

### Test Scenario 2: Semantic Only

```typescript
mcp__folder-mcp__search_content({
  folder_id: "folder-mcp",
  semantic_concepts: ["configuration management", "YAML settings"],
  min_score: 0.6
})

// Validate:
// Expected: Results about config files, settings, YAML
// Expected: All results have relevance_score >= 0.6
// Expected: content field contains relevant text
// Expected: No errors (semantic_concepts alone is valid)
```

### Test Scenario 3: Exact Terms Only

```typescript
mcp__folder-mcp__search_content({
  folder_id: "folder-mcp",
  exact_terms: ["vec0", "SQLite", "embeddings"],
  min_score: 0.3
})

// Validate:
// Expected: All results contain at least one exact_term
// Expected: Grep-like behavior (no semantic similarity needed)
// Expected: Chunks with multiple exact_terms rank higher
// Expected: No errors (exact_terms alone is valid)
```

### Test Scenario 4: Pagination

```typescript
// Step 1: Initial search
const page1 = await mcp__folder-mcp__search_content({
  folder_id: "folder-mcp",
  semantic_concepts: ["documentation"],
  limit: 5
})

// Step 2: Verify pagination
// Expected: page1.data.results.length === 5
// Expected: page1.continuation.has_more === true
// Expected: page1.continuation.next_token exists

// Step 3: Get next page
const page2 = await mcp__folder-mcp__search_content({
  folder_id: "folder-mcp",
  continuation_token: page1.continuation.next_token
})

// Step 4: Validate
// Expected: page2.data.results.length > 0
// Expected: No duplicate chunk_ids between pages
// Expected: Results still sorted by descending relevance_score
// Expected: page2.data.statistics.total_results === page1.data.statistics.total_results
```

### Test Scenario 5: Min Score Filtering

```typescript
// Test with strict threshold
const strictResults = await mcp__folder-mcp__search_content({
  folder_id: "folder-mcp",
  semantic_concepts: ["authentication"],
  min_score: 0.8  // Very strict
})

// Test with default threshold
const defaultResults = await mcp__folder-mcp__search_content({
  folder_id: "folder-mcp",
  semantic_concepts: ["authentication"],
  min_score: 0.5  // Default
})

// Validate:
// Expected: strictResults.data.results.length < defaultResults.data.results.length
// Expected: All strictResults scores >= 0.8
// Expected: All defaultResults scores >= 0.5
// Expected: Every strict result also appears in default results
```

### Test Scenario 6: document_id Reusability

```typescript
// Step 1: Search for content
const searchResults = await mcp__folder-mcp__search_content({
  folder_id: "folder-mcp",
  semantic_concepts: ["authentication"]
})

const topResult = searchResults.data.results[0]

// Step 2: Use document_id with other endpoints
const docData = await mcp__folder-mcp__get_document_data({
  folder_id: "folder-mcp",
  document_id: topResult.document_id  // ✅ Direct reuse
})

const docText = await mcp__folder-mcp__get_document_text({
  base_folder_path: "/Users/hanan/Projects/folder-mcp",
  file_path: topResult.document_id  // ✅ Direct reuse
})

// Validate:
// Expected: docData and docText requests succeed
// Expected: No path transformation needed
// Expected: Consistent field naming across endpoints
```

---

## Integration with find_documents

### Clear Separation of Concerns

| Endpoint | Purpose | Granularity | Content Strategy |
|----------|---------|-------------|------------------|
| `find_documents` | **Document discovery** | Document-level | Summaries (lazy) |
| `search_content` | **Content retrieval** | Chunk-level | Full text (eager) |

### Recommended Workflow Pattern

**Pattern 1: Discovery then Search**
```typescript
// Step 1: Find relevant documents
const docs = await find_documents({
  folder_id: "project",
  query: "authentication security"
})
// Returns: Document summaries with key phrases

// Step 2: Review summaries, identify Auth.ts as most relevant

// Step 3: Search for specific content (let relevance scoring surface auth docs naturally)
const chunks = await search_content({
  folder_id: "project",
  semantic_concepts: ["JWT validation"],
  exact_terms: ["verifyToken"]
})
// Searches all files, but Auth.ts chunks will rank higher due to relevance
```

**Pattern 2: Direct Content Search**
```typescript
// If you know what content you need, search directly
const chunks = await search_content({
  folder_id: "project",
  semantic_concepts: ["JWT token refresh"],
  exact_terms: ["refreshToken", "validateJWT"]
})
// No document discovery needed
```

**Pattern 3: Known File + Content Search**
```typescript
// If you already know the file
const content = await get_document_text({
  file_path: "src/auth/Auth.ts"
})
// No search needed
```

---

## What We're NOT Doing

❌ **No file_hints parameter** - Use `find_documents` for document filtering
❌ **No lazy content loading** - Content always included by default
❌ **No filename/filetype boosts** - Removed to simplify architecture
❌ **No line_range tracking** - Not stored in database schema
❌ **No automatic query expansion** - LLM handles synonyms if needed
❌ **No grouping by document** - Flat ranking shows best chunks regardless of source

---

## Expected Outcomes

### For LLM Agents

- **Immediate content access**: No second call needed to get chunk text
- **Flexible search**: Semantic-only, exact-only, or hybrid approaches
- **Consistent naming**: `document_id` reusable across all endpoints
- **Clear purpose**: `search_content` for retrieval, `find_documents` for discovery
- **Explainable results**: relevance_score shows match quality
- **Document context**: `document_keywords` shows what else is in the file

### For Users

- **Fast results**: Sub-200ms search latency
- **Relevant content**: Hybrid scoring combines semantic + exact matching
- **Progressive disclosure**: Pagination for large result sets
- **Clear explanations**: LLM can explain why specific chunks matched

---

## Next Steps

1. **Implementation**: Build `search_content` endpoint with hybrid scoring
2. **Integration**: Connect to existing vec0 infrastructure
3. **Testing**: A2E validation with real project data
4. **Tuning**: Adjust exact_term_boost multiplier (1.5) based on quality metrics
5. **Documentation**: Update API docs with workflow examples
6. **Cleanup**: Verify if Sprint 7 `SearchRequest`/`SearchResponse` types still needed

---

**This sprint delivers chunk-level semantic search with content-first design, enabling LLMs to efficiently find and use specific information without multi-step lazy loading patterns.**
