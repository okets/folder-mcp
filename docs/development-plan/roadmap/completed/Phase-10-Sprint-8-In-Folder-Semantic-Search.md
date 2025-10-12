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
                 OR 1.0 if only exact_terms provided

exact_term_boost = 1.0
for each exact_term match in chunk:
    exact_term_boost *= 1.5

final_score = semantic_score × exact_term_boost
```

**Design Rationale**:
- **Semantic-only queries**: semantic_score ∈ [0,1], boost=1.0 → final_score = semantic_score
- **Exact-only queries**: semantic_score=1.0, boost=1.5^n → final_score = 1.5^n (where n = number of matches)
- **Hybrid queries**: semantic_score ∈ [0,1], boost=1.5^n → final_score = semantic_score × 1.5^n
- Multiplicative formula ensures poor semantic matches aren't rescued by exact terms
- Example (hybrid): semantic_score=0.3, boost=1.5 → final=0.45 (still in results, ranked by score)
- Example (exact-only): 1 match → 1.5, 2 matches → 2.25, 3 matches → 3.375
- **No threshold filtering**: Results always ordered by relevance_score DESC, controlled by `limit` only
- **Model-independent**: Works consistently across all embedding models (MiniLM 384d, E5-Large 1024d, etc.)


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
- Each result includes `file_path`, so LLM can see source file
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

  // Pagination
  limit?: number;                 // Optional: max results per page (default: 10, max: 50)
  continuation_token?: string;    // Optional: base64url-encoded pagination state
}
```

**Design Decisions - Parameters Not Included**:
- **No `file_hints`**: Document filtering is `find_documents`' responsibility
- **No `include_content`**: Content is always included (content-first design)
- **No `max_tokens`**: Use `limit` parameter to control result count
- **No `min_score`**: Results ordered by relevance, controlled by `limit` (model-independent behavior)

---

## Response Structure

### SearchContentResponse

```typescript
interface SearchContentResponse {
  data: {
    results: SearchChunkResult[];
    statistics: {
      total_results: number;           // Total matching chunks
      files_covered: string[];         // Unique file_paths in results
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
  file_path: string;                 // Relative path (e.g., "src/auth/Auth.ts") - reusable in other endpoints
  content: string;                     // The actual chunk text ⭐ ALWAYS INCLUDED
  relevance_score: number;             // Match quality [0.0, 1.0]
  chunk_index: number;                 // Position within document (0-based, from chunks.chunk_index)
  document_keywords?: string[];        // Top 5-7 key phrases from parent document (optional)
}
```

**Field Alignment with Database Schema**:
- ✅ `chunk_id` → `chunks.id`
- ✅ `file_path` → `documents.file_path` (relative path, reusable across endpoints)
- ✅ `content` → `chunks.content`
- ✅ `chunk_index` → `chunks.chunk_index`
- ✅ `document_keywords` → `documents.document_keywords` (JSON parsed)
- ✅ `relevance_score` → computed from vec0 + boosts

**Token Efficiency**: ~550-650 tokens per chunk (90% is actual content, 10% is metadata)

---

## file_path Reusability

The `file_path` field contains the relative file path and can be used directly with other endpoints:

```typescript
// Step 1: Search for content
const searchResults = await search_content({
  semantic_concepts: ["JWT validation"]
})
// Result: { chunk_id: "123", file_path: "src/auth/Auth.ts", content: "...", ... }

// Step 2: Get full document using same file_path
const fullDoc = await get_document_data({
  folder_id: "project",
  file_path: "src/auth/Auth.ts"  // ✅ Same value, no transformation
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
- **Stateless**: Token contains folder_id, semantic_concepts, exact_terms, offset
- **Resumable**: Can continue from any point
- **Consistent**: Matches existing endpoints (list_documents, explore, etc.)

### Token Format

```typescript
{
  folder_id: string,
  semantic_concepts?: string[],  // At least one of these two must be present
  exact_terms?: string[],        // in the original request
  offset: number,                // Where to resume
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
        "file_path": "src/auth/LoginForm.tsx",
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
      "Read full document: get_document_data(file_path='src/auth/LoginForm.tsx')",
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
  limit: 10
})
```

**Response:** Results about YAML config, env vars, settings ordered by semantic relevance

### Example 3: Exact Terms Only (No Semantic)

**Request:**
```typescript
mcp__folder-mcp__search_content({
  folder_id: "codebase",
  exact_terms: ["vec0", "SQLite", "embeddings"],
  limit: 10
})
```

**Response:** Grep-like search for technical terms, ranked by number of exact term matches

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

**Note**: Implementation must use different SQL queries based on search type:

**1. Semantic-only or Hybrid Search** (when semantic_concepts provided):
```sql
-- Uses vec0 MATCH for vector similarity
SELECT
  c.id as chunk_id,
  d.file_path as file_path,
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
ORDER BY relevance_score DESC
LIMIT :limit OFFSET :offset;
```

**2. Exact-only Search** (when NO semantic_concepts provided):
```sql
-- No vec0 MATCH - direct query against chunks
SELECT
  c.id as chunk_id,
  d.file_path as file_path,
  c.content,
  c.chunk_index,
  d.document_keywords
FROM chunks c
JOIN documents d ON c.document_id = d.id
WHERE d.folder_id = :folder_id
  -- exact_terms matching done in application code
  -- chunks filtered by exact term presence
  -- relevance_score = 1.0 * exact_term_boost (calculated in app)
ORDER BY relevance_score DESC
LIMIT :limit OFFSET :offset;
```

**Implementation Note**: For exact-only searches:
- semantic_score baseline = 1.0 (not from database)
- exact_term_boost calculated by scanning chunk.content for exact_terms
- final_score = 1.0 × exact_term_boost
- Results ordered by relevance_score DESC, controlled by LIMIT only

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
✅ **file_path reusable** - Same value works with other endpoints
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

**Test Folder**: `/Users/hanan/Projects/folder-mcp/docs` (indexed with `minilm-l12` model)
**Test Strategy**: Use known content from our own documentation for validation

### Test Scenario 1: Hybrid Search (Semantic + Exact)

```typescript
// Known content: Sprint 8 doc contains "vec0 MATCH" technical terms
// Step 1: Read known content to establish ground truth
mcp__desktop-commander__read_file("/Users/hanan/Projects/folder-mcp/docs/development-plan/roadmap/currently-implementing/Phase-10-Sprint-8-In-Folder-Semantic-Search.md")
// Verify: Contains "vec0 MATCH" and "hybrid scoring"

// Step 2: Hybrid search
mcp__folder-mcp__search_content({
  folder_id: "/Users/hanan/Projects/folder-mcp/docs",
  semantic_concepts: ["vector similarity", "semantic search"],
  exact_terms: ["vec0", "MATCH"],
  limit: 10
})

// Step 3: Validate
// Expected: Phase-10-Sprint-8 doc chunks in results (top-ranked by relevance)
// Expected: file_path: "development-plan/roadmap/currently-implementing/Phase-10-Sprint-8-In-Folder-Semantic-Search.md"
// Expected: content includes "vec0 MATCH" operator references
// Expected: relevance_score boosted by exact matches (higher than semantic alone)
// Expected: Results ordered by descending relevance_score
```

### Test Scenario 2: Semantic Only

```typescript
// Known content: Multiple docs discuss endpoints and navigation
mcp__folder-mcp__search_content({
  folder_id: "/Users/hanan/Projects/folder-mcp/docs",
  semantic_concepts: ["endpoint navigation", "semantic metadata", "exploration flow"],
  limit: 10
})

// Validate:
// Expected: Phase 10 EPIC doc (discusses endpoint navigation) - top-ranked
// Expected: Sprint 0, Sprint 2 docs (explore endpoint, navigation)
// Expected: Results ordered by descending relevance_score
// Expected: content field contains relevant text about endpoints
// Expected: No errors (semantic_concepts alone is valid)
```

### Test Scenario 3: Exact Terms Only

```typescript
// Known content: Sprint 7.5 and Sprint 8 docs contain vec0/SQLite/embeddings
mcp__folder-mcp__search_content({
  folder_id: "/Users/hanan/Projects/folder-mcp/docs",
  exact_terms: ["vec0", "SQLite", "embeddings"],
  limit: 10
})

// Validate:
// Expected: Sprint 7.5 doc (vec0 infrastructure migration) - high rank
// Expected: Sprint 8 doc (vec0 MATCH operator usage) - high rank
// Expected: All results contain at least one exact_term
// Expected: Grep-like behavior (no semantic similarity needed)
// Expected: Chunks with multiple exact_terms rank higher (boost = 1.5^n)
// Expected: Results ordered by descending relevance_score (number of matches)
// Expected: No errors (exact_terms alone is valid)
```

### Test Scenario 4: Pagination

```typescript
// Step 1: Initial search with small limit to force pagination
const page1 = await mcp__folder-mcp__search_content({
  folder_id: "/Users/hanan/Projects/folder-mcp/docs",
  semantic_concepts: ["endpoint", "API", "navigation"],
  limit: 3  // Small limit to force pagination
})

// Step 2: Verify pagination
// Expected: page1.data.results.length === 3
// Expected: page1.continuation.has_more === true
// Expected: page1.continuation.next_token exists

// Step 3: Get next page
const page2 = await mcp__folder-mcp__search_content({
  folder_id: "/Users/hanan/Projects/folder-mcp/docs",
  continuation_token: page1.continuation.next_token
})

// Step 4: Validate
// Expected: page2.data.results.length > 0
// Expected: No duplicate chunk_ids between pages
// Expected: Results still sorted by descending relevance_score
// Expected: page2.data.statistics.total_results === page1.data.statistics.total_results
// Expected: Continuation token preserved search parameters (semantic_concepts, exact_terms)
```

### Test Scenario 5: Relevance Ordering and Limit Control

```typescript
// Known content: Multiple docs contain "endpoint" keyword
// Test with small limit to verify top results
const topResults = await mcp__folder-mcp__search_content({
  folder_id: "/Users/hanan/Projects/folder-mcp/docs",
  semantic_concepts: ["endpoint API design", "navigation flow"],
  limit: 5  // Get top 5 most relevant
})

// Test with larger limit to get more results
const moreResults = await mcp__folder-mcp__search_content({
  folder_id: "/Users/hanan/Projects/folder-mcp/docs",
  semantic_concepts: ["endpoint API design", "navigation flow"],
  limit: 20  // Get top 20 results
})

// Validate:
// Expected: topResults.data.results.length === 5
// Expected: moreResults.data.results.length === 20 (or less if fewer matches)
// Expected: First 5 results of moreResults match topResults exactly (same order, same chunks)
// Expected: All results sorted by descending relevance_score
// Expected: Most relevant documents appear first (Phase 10 EPIC, Sprint docs)
// Expected: Model-independent behavior - predictable result counts
```

### Test Scenario 6: file_path Reusability

```typescript
// Known content: Phase 10 EPIC doc discusses endpoint navigation
// Step 1: Search for content
const searchResults = await mcp__folder-mcp__search_content({
  folder_id: "/Users/hanan/Projects/folder-mcp/docs",
  semantic_concepts: ["endpoint navigation", "exploration flow"]
})

const topResult = searchResults.data.results[0]
// Expected: file_path: "development-plan/roadmap/currently-implementing/Phase-10-Semantic-Endpoint-Navigation-EPIC.md"

// Step 2: Use file_path with other endpoints
const docData = await mcp__folder-mcp__get_document_data({
  folder_id: "/Users/hanan/Projects/folder-mcp/docs",
  file_path: topResult.file_path  // ✅ Direct reuse - no transformation
})

const docText = await mcp__folder-mcp__get_document_text({
  base_folder_path: "/Users/hanan/Projects/folder-mcp/docs",
  file_path: topResult.file_path  // ✅ Direct reuse - same value
})

// Validate:
// Expected: All three endpoints accept same file_path value
// Expected: docData returns document metadata and chunks
// Expected: docText returns extracted text content
// Expected: No path transformation or manipulation needed
// Expected: Consistent field naming (file_path) across all endpoints
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
- **Consistent naming**: `file_path` reusable across all endpoints
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

1. ✅ **Implementation**: Build `search_content` endpoint with hybrid scoring - COMPLETED
2. ✅ **Integration**: Connect to existing vec0 infrastructure - COMPLETED
3. ✅ **Testing**: A2E validation with real project data - COMPLETED (all 4 combinations validated)
4. ✅ **Tuning**: Adjust exact_term_boost multiplier (1.5) based on quality metrics - COMPLETED
5. ✅ **Documentation**: Update API docs with workflow examples - COMPLETED
6. ✅ **Cleanup**: Sprint 7 legacy code removed - COMPLETED (~330 lines deleted including `SearchRequest`/`SearchResponse` types)

---

**This sprint delivers chunk-level semantic search with content-first design, enabling LLMs to efficiently find and use specific information without multi-step lazy loading patterns.**
