# Phase 10 - Sprint 9: Document Discovery with `find_documents` Endpoint

**Status**: 📋 Planned  
**Duration**: 3-4 hours  
**Dependencies**: Sprint 8 (search_content endpoint)

## Executive Summary

Sprint 9 delivers **document-level topic discovery** through the `find_documents` MCP endpoint. While Sprint 8's `search_content` finds specific passages within chunks, `find_documents` answers "Which documents cover this topic?" by searching averaged document embeddings.

**Key Distinction**:
- **search_content** (Sprint 8): Chunk-level precision → "Where is the JWT validation code?"
- **find_documents** (Sprint 9): Document-level discovery → "Which docs discuss authentication?"

**Core Value**: Enables LLMs to efficiently discover relevant documents before drilling into specific content, reducing context usage and improving navigation.

---

## 🎓 Lessons from Sprint 8: Avoiding Implementation Pitfalls

**Context**: Sprint 8 (search_content) required significant cleanup work after initial implementation. This section documents those pitfalls and how Sprint 9 will avoid them from the start.

### Pitfall #1: Redundant folder_id in Request Body ❌
**What Happened in Sprint 8**:
- `search_content` had `folder_id` as both URL path parameter AND request body field
- This violated REST API design principles (path parameters shouldn't duplicate body)
- Required cleanup task to remove redundant field and update all validation layers

**Sprint 9 Solution** ✅:
- `folder_id` is **ONLY** a URL path parameter: `/api/v1/folders/:folderPath/find-documents`
- Request body will **NEVER** include `folder_id` field
- Validation happens at MCP layer using the path parameter only
- Code review will explicitly verify no body redundancy

### Pitfall #2: Missing Early Validation at MCP Layer ❌
**What Happened in Sprint 8**:
- Initial implementation only validated parameters at daemon/REST layer
- MCP layer passed invalid requests through, causing late failures
- Required adding fail-fast validation to catch errors before HTTP calls

**Sprint 9 Solution** ✅:
- **Phase 1 of implementation** includes MCP validation logic (not Phase 4)
- Validate `folder_id` exists and is non-empty string before daemon call
- Validate `query` is non-empty before processing
- Follow fail-fast principle: catch errors at earliest possible layer

### Pitfall #3: TypeScript Anti-patterns in Initial Code ❌
**What Happened in Sprint 8**:
- Used conditional mutation for building response objects:
  ```typescript
  const continuation = { has_more: hasMore };
  if (nextToken !== undefined) {
    continuation.next_token = nextToken;
  }
  ```
- Violated TypeScript best practices and clean code principles

**Sprint 9 Solution** ✅:
- Use typed construction with spread operators from the start:
  ```typescript
  const continuation = {
    has_more: hasMore,
    ...(nextToken !== undefined && { next_token: nextToken })
  };
  ```
- No conditional mutation - all object construction uses immutable patterns
- Code review will explicitly check for proper TypeScript patterns

### Pitfall #4: A2E Testing as Afterthought ❌
**What Happened in Sprint 8**:
- Built entire implementation first, then ran A2E tests
- Discovered validation issues only after code complete
- Testing felt disconnected from implementation

**Sprint 9 Solution** ✅:
- **Test-driven approach**: Write A2E test scenarios BEFORE implementation
- Run tests iteratively as each phase completes:
  - Phase 1 complete → Test basic query execution
  - Phase 2 complete → Test MCP validation
  - Phase 3 complete → Test response formatting
- Each A2E test scenario maps to specific implementation phase
- No "testing phase" at end - testing is continuous validation

### Pitfall #5: Unclear Type Boundaries ❌
**What Happened in Sprint 8**:
- Request/response types spread across multiple files
- Unclear which layer owned which interfaces
- Made refactoring more difficult

**Sprint 9 Solution** ✅:
- Clear type ownership from the start:
  - `src/daemon/rest/types.ts`: REST API types (FindDocumentsRequest body only)
  - `src/interfaces/mcp/types.ts`: MCP tool types (includes folder_id path param)
  - `src/domain/knowledge/types.ts`: Domain service types (if needed)
- Document why each interface exists in each location
- No "floating" types without clear ownership

### Implementation Checklist Updates

Based on these lessons, the implementation phases have been reordered:

**BEFORE (Sprint 8 approach)**: SQL → Domain → MCP → Testing (sequential)
**AFTER (Sprint 9 approach)**: MCP Validation → SQL + Tests → Domain + Tests → Integration (iterative)

---

## Problem Statement

### Current Challenge

After Sprint 8, LLMs can search chunk-level content with `search_content`, but they lack an efficient way to:
1. **Discover relevant documents** without reading all chunk results
2. **Understand document topics** at a high level before diving deep
3. **Navigate large folders** (100+ documents) efficiently
4. **Identify multiple documents** covering related topics

**Example scenario**:
- User asks: "What documents cover authentication in this project?"
- Current approach: `search_content` returns 50+ chunks from 12 documents
- Desired approach: `find_documents` returns 12 documents with relevance scores and topic summaries

### Why Document Embeddings Matter

The `document_embeddings` vec0 table stores **averaged embeddings** computed from all chunks in each document. This provides:


1. **Topic-level representation**: Captures what the document is "about" overall
2. **Fast retrieval**: Query one embedding per document instead of dozens of chunks
3. **Complementary to chunks**: find_documents → broad discovery, search_content → specific passages

**Infrastructure readiness**: Document embeddings infrastructure completed in Sprint 7.5 (vec0 migration):
- `document_embeddings` vec0 virtual table exists
- `documents.document_keywords` field stores extracted key phrases
- Embedding generation pipeline already produces document-level vectors

---

## Core Design

### Endpoint Specification

**Endpoint Name**: `find_documents`  
**HTTP Route**: `POST /api/v1/folders/:folderPath/find-documents`  
**MCP Tool**: `mcp__folder-mcp__find_documents`

**Purpose**: Search document-level embeddings to discover which files cover a topic, returning document summaries with relevance scores.

### Request Parameters

```typescript
// MCP Tool Interface (src/interfaces/mcp/types.ts)
interface FindDocumentsMCPRequest {
  folder_id: string;              // Required: from MCP tool arguments, passed as URL path param
  query: string;                  // Required: natural language topic query
  limit?: number;                 // Optional: max results per page (default: 20, max: 50)
  continuation_token?: string;    // Optional: pagination token
}

// REST API Request Body (src/daemon/rest/types.ts)
// NOTE: folder_id comes from URL path (:folderPath), NOT request body
interface FindDocumentsRequest {
  query: string;                  // Required: natural language topic query
  limit?: number;                 // Optional: max results per page (default: 20, max: 50)
  continuation_token?: string;    // Optional: pagination token
}
```

**Parameter Design Rationale**:


1. **Simpler than search_content**: No `semantic_concepts`, `exact_terms`, or `file_hints` needed
   - Document embeddings capture overall topic, natural language query is sufficient
   - No hybrid scoring needed - cosine similarity alone works well for topic discovery

2. **No min_score threshold**: Model-independent design like search_content
   - Results always ordered by relevance_score DESC
   - Use `limit` parameter for predictable result count control
   - Works consistently across all embedding models

3. **Larger default limit (20 vs 10)**: Documents are coarser-grained than chunks
   - Users typically want to see multiple relevant documents
   - Less context overhead per result (no chunk text, just summaries)

### Response Structure

```typescript
interface FindDocumentsResponse {
  data: {
    results: FindDocumentResult[];
    statistics: {
      total_results: number;           // Total matching documents (before pagination)
      avg_relevance: number;           // Average relevance_score across results
      query_understanding: string;     // Brief description of query interpretation
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

interface FindDocumentResult {
  file_path: string;                   // documents.file_path
  relevance_score: number;               // (1 - vec0_distance), range [0.0, 1.0]
  document_summary: {
    top_key_phrases: SemanticScore[];    // From documents.document_keywords (top 5)
    readability_score: number;           // Averaged from chunks
    chunk_count: number;                 // Total chunks in document
    size: string;                        // Human-readable file size
    modified: string;                    // ISO 8601 timestamp
  };
  download_url: string;                  // For retrieving full document content
}

interface SemanticScore {
  text: string;                          // Key phrase text
  score: number;                         // Relevance score [0.0, 1.0]
}
```

**Response Design Rationale**:


1. **Lazy content loading**: Results return `download_url` instead of full text
   - Reduces response size (critical for LLM context efficiency)
   - LLM can decide which documents to retrieve full content for
   - Follows established pattern from `list_documents` endpoint

2. **Rich document summaries**: Each result includes contextual metadata
   - `top_key_phrases`: Shows what the document covers (from `document_keywords`)
   - `readability_score`: Helps LLM assess content complexity
   - `chunk_count`: Indicates document length/granularity

3. **Query understanding feedback**: `statistics.query_understanding` explains interpretation
   - Helps LLM verify search matches intent
   - Enables query refinement if needed
   - Example: "Authentication security patterns" → "Found docs covering: auth, security, JWT"

4. **Navigation hints**: Guides LLM to next logical actions
   - `next_actions`: ["Use search_content for JWT code examples", "Read Remote_Work_Policy.md"]
   - `related_queries`: ["security best practices", "user authentication flow"]

---

## Vec0 SQL Implementation

### Core Query Structure

```sql
-- find_documents: Document-level semantic search using vec0
WITH ranked_documents AS (
  SELECT
    d.id,
    d.file_path,
    d.document_keywords,
    d.size,
    d.last_modified,
    d.last_indexed,
    (1 - de.distance) as relevance_score,  -- Convert vec0 distance to similarity
    ROW_NUMBER() OVER (ORDER BY (1 - de.distance) DESC) as rank
  FROM document_embeddings de
  JOIN documents d ON de.document_id = d.id
  WHERE de.embedding MATCH :query_embedding
    AND de.k = :limit
),
document_stats AS (
  SELECT
    rd.id,
    rd.file_path,
    rd.document_keywords,
    rd.relevance_score,
    rd.rank,                    -- CRITICAL: Pass rank through for pagination
    rd.size,
    rd.last_modified,
    COUNT(c.id) as chunk_count,
    AVG(c.readability_score) as avg_readability
  FROM ranked_documents rd
  LEFT JOIN chunks c ON c.document_id = rd.id
  WHERE c.is_deleted = 0
  GROUP BY rd.id
)
SELECT
  ds.file_path as file_path,
  ds.relevance_score,
  ds.document_keywords,
  ds.avg_readability,
  ds.chunk_count,
  ds.size,
  ds.last_modified
FROM document_stats ds
WHERE ds.rank > :offset AND ds.rank <= (:offset + :limit)
ORDER BY ds.relevance_score DESC;
```

**Query Design Notes**:


1. **Vec0 MATCH operator**: Primary search mechanism
   - `de.embedding MATCH :query_embedding` uses SIMD-accelerated cosine similarity
   - `k` parameter controls top-k results to fetch
   - Returns `distance` in range [0.0, 2.0], converted to similarity via `(1 - distance)`

2. **Two-stage filtering**: CTE structure separates ranking from aggregation
   - `ranked_documents`: Vec0 search results ordered by relevance
   - `document_stats`: Aggregate chunk statistics per document
   - Final SELECT: Apply pagination window

3. **Chunk aggregation**: LEFT JOIN with chunks table
   - Computes avg_readability across all chunks in document
   - Counts total chunks (excluding deleted chunks)
   - Single JOIN, not N+1 queries

### Embedding Generation

**Query embedding generation** (identical to search_content):
```typescript
// Use folder's configured embedding provider
const queryEmbedding = await embeddingProvider.generateEmbedding(query);
const embeddingBuffer = Buffer.from(new Float32Array(queryEmbedding).buffer);
const embeddingBase64 = embeddingBuffer.toString('base64');
```

**Note**: Document embeddings already exist in database (generated during indexing), no runtime generation needed for documents.

---

## Implementation Approach

**🎯 Test-Driven Iterative Approach** (Lesson from Sprint 8):
- Each phase includes implementation + immediate A2E validation
- No separate "testing phase" - tests validate each layer as built
- MCP validation happens in Phase 1, not at the end

---

### Phase 1: MCP Interface with Early Validation (1 hour)

**🎓 Sprint 8 Lesson Applied**: Start with MCP layer and validation first, not SQL first.

**Files to modify**:
- `src/interfaces/mcp/daemon-mcp-endpoints.ts` - Add `find_documents` tool with validation
- `src/interfaces/mcp/types.ts` - Add `FindDocumentsMCPRequest/Response` types

**Implementation order**:
1. **Define types** in `types.ts`:
   - `FindDocumentsMCPRequest` (includes folder_id for MCP tool)
   - `FindDocumentsResponse` (full response structure)

2. **Add MCP validation** in `daemon-mcp-endpoints.ts`:
```typescript
async findDocuments(args: FindDocumentsMCPRequest): Promise<MCPToolResponse> {
  // FAIL-FAST VALIDATION (Sprint 8 lesson)
  if (!args.folder_id || typeof args.folder_id !== 'string' || args.folder_id.trim() === '') {
    return {
      content: [{
        type: 'text' as const,
        text: 'Error: folder_id is required and must be a non-empty string'
      }]
    };
  }

  if (!args.query || typeof args.query !== 'string' || args.query.trim() === '') {
    return {
      content: [{
        type: 'text' as const,
        text: 'Error: query is required and must be a non-empty string'
      }]
    };
  }

  // Build request body (folder_id goes to URL path, NOT body)
  const requestBody = {
    query: args.query,
    limit: args.limit,
    continuation_token: args.continuation_token
  };

  // Call daemon REST endpoint
  const response = await this.daemonClient.findDocuments(
    args.folder_id,  // Path parameter
    requestBody      // Body (no folder_id)
  );

  return { content: [{ type: 'text', text: JSON.stringify(response) }] };
}
```

**✅ A2E Test After Phase 1**:
- Test validation errors (empty folder_id, empty query)
- Verify error messages are clear and actionable
- Endpoint should fail gracefully, not crash

---

### Phase 2: SQL Query and Pagination (1 hour)

**Files to modify**:
- `src/infrastructure/embeddings/sqlite-vec/sqlite-vec-storage.ts`
- `src/daemon/rest/types.ts` - Add `FindDocumentsRequest` (body only, no folder_id)

**New method**:
```typescript
async searchDocumentEmbeddings(
  queryEmbedding: number[],
  options: {
    limit: number;
    offset: number;
  }
): Promise<DocumentSearchResult[]> {
  // Implement vec0 query with CTE structure
  // Return document results with aggregated stats
}
```

**Pagination strategy**:
- Use ROW_NUMBER() window function for stable ordering
- Continuation token: base64url({ offset: number })
- Same pattern as search_content endpoint

**Object construction** (Sprint 8 lesson):
```typescript
// Use typed construction with spread operator
const continuation = {
  has_more: hasMore,
  ...(nextToken !== undefined && { next_token: nextToken })
};
// NOT: conditional mutation pattern
```

**✅ A2E Test After Phase 2**:
- Test basic query execution (Test Scenario 1)
- Verify documents returned in descending relevance order
- Check results ordered by relevance_score DESC

---

### Phase 3: Domain Service and Response Formatting (1 hour)

**Files to modify**:
- `src/domain/knowledge/service.ts` - Add `findDocuments()` orchestration method

**Endpoint structure**:
```typescript
async findDocuments(
  folderPath: string,  // From URL path, NOT request body
  request: FindDocumentsRequest
): Promise<StandardResponse<FindDocumentsResponseData>> {
  // 1. Validate folder exists (domain-level check)
  // 2. Generate query embedding
  // 3. Call searchDocumentEmbeddings() with pagination
  // 4. Parse document_keywords JSON for each result
  // 5. Build navigation_hints
  // 6. Return StandardResponse
}
```

**Navigation hints logic**:

1. **next_actions**: Context-aware suggestions
   - If few results: "Try broader query: 'security'"
   - If many results: "Narrow with search_content for specific code"
   - If high relevance: "Read [file_path] for details"

2. **related_queries**: Extracted from top_key_phrases
   - Take top 3 key phrases across all results
   - Format as natural language queries
   - Example: ["authentication flow", "JWT tokens", "user sessions"]

3. **query_understanding**: Summarize search interpretation
   - Parse query into semantic concepts
   - List matched key phrases from results
   - Example: "Authentication security → Found: JWT, OAuth, passwords, sessions"

**✅ A2E Test After Phase 3**:
- Test response formatting (Test Scenario 4)
- Verify navigation hints are contextually appropriate
- Check document summaries include all required metadata

---

### Phase 4: Integration and Full A2E Validation (1 hour)

**A2E Testing Philosophy**: Use MCP tools directly against indexed folder-mcp project to validate document discovery with known content.

**Test fixtures**: Use `tests/fixtures/test-knowledge-base/` with known documents covering specific topics.

**Complete all 6 A2E scenarios**:
1. Basic document discovery
2. Pagination and continuation tokens
3. Min score threshold filtering
4. Document summary quality (already tested in Phase 3)
5. Empty results and edge cases
6. Navigation hints accuracy

---

## Agent-to-Endpoint (A2E) Testing Scenarios

### Test Scenario 1: Basic Document Discovery

**Objective**: Verify find_documents discovers correct documents for a clear topic query.

**Known Content Setup**:
```typescript
// Known test fixture: tests/fixtures/test-knowledge-base/Policies/
// - Remote_Work_Policy.md: Covers remote work, three days per week, core hours
// - Data_Retention_Policy.md: Covers data storage, retention periods, compliance
// - Code_of_Conduct.md: Covers behavior, harassment, professional conduct
```

**A2E Test Steps**:
```typescript
// Step 1: Read known content to establish ground truth
mcp__desktop-commander__read_file({
  path: "/Users/hanan/Projects/folder-mcp/tests/fixtures/test-knowledge-base/Policies/Remote_Work_Policy.md"
})
// Verify: Contains "three days per week", "core business hours 9am-5pm", HR Department

// Step 2: Search for documents covering remote work topic
mcp__folder-mcp__find_documents({
  folder_id: "test-knowledge-base",
  query: "remote work policy and flexible schedules",
  limit: 10
})

// Step 3: Validate results
// Expected: results[0].file_path === "Policies/Remote_Work_Policy.md" (top-ranked)
// Expected: results[0].relevance_score high (document well-matched to query)
// Expected: results[0].document_summary.top_key_phrases includes:
//   - {text: "remote work", score: > 0.7}
//   - {text: "flexible schedule", score: > 0.6}
//   - {text: "three days per week", score: > 0.5}
// Expected: Data_Retention_Policy.md and Code_of_Conduct.md NOT in top 3 results

// Step 4: Verify statistics
// Expected: statistics.total_results >= 1
// Expected: statistics.avg_relevance > 0 (reflects document relevance)
// Expected: statistics.query_understanding mentions "remote work" or "flexible schedules"
```

**Success Criteria**:
- ✅ Remote_Work_Policy.md is first result
- ✅ Relevance score reflects strong topic match
- ✅ Key phrases extracted match document topics
- ✅ Unrelated documents filtered out

---

### Test Scenario 2: Pagination and Continuation Tokens

**Objective**: Verify pagination works correctly across multiple pages of document results.

**A2E Test Steps**:
```typescript
// Step 1: First page request with small limit
const page1 = await mcp__folder-mcp__find_documents({
  folder_id: "folder-mcp",
  query: "configuration settings",
  limit: 5
})

// Step 2: Validate first page structure
// Expected: page1.data.results.length === 5
// Expected: page1.continuation.has_more === true
// Expected: page1.continuation.next_token exists (base64url string)

// Step 3: Fetch second page using continuation token
const page2 = await mcp__folder-mcp__find_documents({
  folder_id: "folder-mcp",
  query: "configuration settings",
  limit: 5,
  continuation_token: page1.continuation.next_token
})

// Step 4: Validate pagination behavior
// Expected: page2.data.results.length > 0
// Expected: page2.data.results[0].file_path !== page1.data.results[0].file_path (no duplicates)
// Expected: page2.data.results[0].relevance_score <= page1.data.results[4].relevance_score (descending order)
// Expected: page2.continuation.has_more boolean indicates more results

// Step 5: Verify total count consistency
// Expected: page1.data.statistics.total_results === page2.data.statistics.total_results
```

**Success Criteria**:
- ✅ No duplicate documents across pages
- ✅ Results maintain descending relevance order
- ✅ Continuation tokens work correctly
- ✅ has_more flag accurate

---


### Test Scenario 3: Relevance Ordering and Limit Control

**Objective**: Verify limit parameter controls result count and results are ordered by relevance.

**A2E Test Steps**:
```typescript
// Step 1: Search with small limit to get top results
const topResults = await mcp__folder-mcp__find_documents({
  folder_id: "folder-mcp",
  query: "configuration and settings",
  limit: 5  // Get top 5 most relevant
})

// Step 2: Validate top results
// Expected: topResults.data.results.length === 5 (or less if fewer matches)
// Expected: All results sorted by descending relevance_score
// Expected: Most relevant config-related docs appear first

// Step 3: Search with larger limit
const moreResults = await mcp__folder-mcp__find_documents({
  folder_id: "folder-mcp",
  query: "configuration and settings",
  limit: 15  // Get top 15 results
})

// Step 4: Validate ordering consistency
// Expected: moreResults.data.results.length === 15 (or less if fewer matches)
// Expected: First 5 results of moreResults match topResults exactly (same order, same docs)
// Expected: All results sorted by descending relevance_score
// Expected: moreResults[4].relevance_score >= moreResults[5].relevance_score

// Step 5: Verify model-independent behavior
// Expected: Predictable result count based on limit parameter
// Expected: Same queries return consistent ordering across runs
```

**Success Criteria**:
- ✅ Limit parameter correctly controls result count
- ✅ Results maintain strict descending relevance order
- ✅ Top N results consistent regardless of limit value

---

### Test Scenario 4: Document Summary Quality

**Objective**: Verify document summaries provide useful topic information through key phrases.

**Known Content Setup**:
```typescript
// Known: tests/fixtures/test-knowledge-base/Policies/Remote_Work_Policy.md
// Contains specific terms: "three days per week", "core business hours", "HR Department"
// Should have document_keywords with relevant key phrases
```

**A2E Test Steps**:
```typescript
// Step 1: Read document to verify content
mcp__desktop-commander__read_file({
  path: "/Users/hanan/Projects/folder-mcp/tests/fixtures/test-knowledge-base/Policies/Remote_Work_Policy.md"
})
// Note specific terms and topics in the document

// Step 2: Find the document
const results = await mcp__folder-mcp__find_documents({
  folder_id: "test-knowledge-base",
  query: "work from home policies",
  limit: 5
})

// Step 3: Validate document summary structure
const remotePolicyResult = results.data.results.find(r => 
  r.file_path.includes("Remote_Work_Policy")
)

// Expected: remotePolicyResult.document_summary.top_key_phrases.length === 5
// Expected: Each phrase has structure {text: string, score: number}
// Expected: Scores are in descending order (highest first)
// Expected: Top phrases relate to document content:
//   - "remote work", "flexible schedule", "three days", "core hours", etc.

// Step 4: Verify metadata accuracy
// Expected: remotePolicyResult.document_summary.chunk_count > 0
// Expected: remotePolicyResult.document_summary.readability_score in range [0, 100]
// Expected: remotePolicyResult.document_summary.size matches file size (human-readable)
// Expected: remotePolicyResult.document_summary.modified is valid ISO 8601 timestamp

// Step 5: Verify download_url format
// Expected: remotePolicyResult.download_url format: "/api/v1/folders/{id}/documents/{filePath}"
```

**Success Criteria**:
- ✅ Key phrases accurately represent document topics
- ✅ Phrases sorted by relevance score
- ✅ Metadata (size, modified, chunk_count) is accurate
- ✅ Download URL correctly formatted

---

### Test Scenario 5: Empty Results and Edge Cases

**Objective**: Verify graceful handling when no documents match query.

**A2E Test Steps**:
```typescript
// Step 1: Search for non-existent topic
const noResults = await mcp__folder-mcp__find_documents({
  folder_id: "test-knowledge-base",
  query: "quantum physics and nuclear fusion reactor design",
  limit: 10
})

// Step 2: Validate empty results structure
// Expected: noResults.data.results.length === 0 (or very low relevance docs)
// Expected: noResults.data.statistics.total_results === 0
// Expected: noResults.data.statistics.avg_relevance === 0
// Expected: noResults.continuation.has_more === false
// Expected: noResults.status.success === true (not an error)

// Step 3: Verify helpful navigation hints
// Expected: noResults.navigation_hints.next_actions includes:
//   - "Try broader query" or similar suggestion
//   - "Check spelling" or query refinement tip
// Expected: noResults.navigation_hints.related_queries.length === 0

// Step 4: Test with very broad query
const broadResults = await mcp__folder-mcp__find_documents({
  folder_id: "test-knowledge-base",
  query: "document",  // Extremely broad
  limit: 20
})

// Expected: broadResults.data.results.length > 0 (many low-relevance matches)
// Expected: Results ordered by relevance even if scores are low
```

**Success Criteria**:
- ✅ Empty results return valid structure (not error)
- ✅ Navigation hints provide actionable suggestions
- ✅ Statistics reflect zero results correctly

---

### Test Scenario 6: Navigation Hints Accuracy

**Objective**: Verify navigation hints guide LLM to appropriate next actions.

**A2E Test Steps**:
```typescript
// Scenario A: Few high-relevance results
const fewResults = await mcp__folder-mcp__find_documents({
  folder_id: "test-knowledge-base",
  query: "remote work policy three days per week",
  limit: 20
})

// Expected: fewResults.data.results.length <= 3 (specific query)
// Expected: fewResults.navigation_hints.next_actions includes:
//   - "Read [specific document] for details"
//   - "Use search_content for specific sections"
// Expected: fewResults.navigation_hints.related_queries derived from key_phrases

// Scenario B: Many medium-relevance results
const manyResults = await mcp__folder-mcp__find_documents({
  folder_id: "folder-mcp",
  query: "configuration",
  limit: 20
})

// Expected: manyResults.data.results.length >= 10 (broad query)
// Expected: manyResults.navigation_hints.next_actions includes:
//   - "Narrow query with specific terms"
//   - "Filter by category or file type"
// Expected: manyResults.navigation_hints.related_queries suggests refinements

// Scenario C: Query understanding validation
// Expected: statistics.query_understanding summarizes matched concepts
// Example: "Configuration → Found: settings, config files, YAML, environment"
// Expected: Should NOT be generic "Searching for: configuration"
```

**Success Criteria**:
- ✅ next_actions appropriate for result set size
- ✅ related_queries help refine broad searches
- ✅ query_understanding reflects actual matched topics

---

## find_documents vs search_content: When to Use Each

### Comparison Table

| Aspect | find_documents (Sprint 9) | search_content (Sprint 8) |
|--------|---------------------------|---------------------------|
| **Granularity** | Document-level | Chunk-level |
| **Embeddings** | `document_embeddings` (averaged) | `chunk_embeddings` (individual) |
| **Query Type** | Natural language topic | Structured (semantic_concepts + exact_terms) |
| **Use Case** | "Which docs cover X?" | "Where is specific code/info?" |
| **Results** | Document summaries | Chunks with full content |
| **Scoring** | Cosine similarity only | Hybrid (semantic + exact term boost) |
| **Limit Default** | 20 documents | 10 chunks |
| **Response Size** | Small (no content) | Larger (chunk text always included) |
| **Content Strategy** | Lazy (summaries + download_url) | Eager (content always included) |
| **Navigation** | Discover → Read/search_content | Direct content retrieval |

### Decision Matrix for LLMs


**Use `find_documents` when**:
- ✅ User asks "what documents discuss...?"
- ✅ Broad topic exploration ("show me auth-related docs")
- ✅ Need to discover multiple relevant files
- ✅ Want to minimize context usage (summaries only)
- ✅ Starting point for navigation (find → read → search)

**Use `search_content` when**:
- ✅ User needs specific code examples or passages
- ✅ Searching for exact technical terms (function names, APIs)
- ✅ Need context around a specific concept
- ✅ Already know which document(s) to search
- ✅ Want to see actual content snippets

**Workflow Example**:
```typescript
// 1. Discover documents covering authentication
const docs = await find_documents({
  folder_id: "project",
  query: "authentication and security"
})

// 2. Review document summaries to identify most relevant
// docs.results[0].file_path: "src/auth/Auth.md"
// docs.results[0].document_summary.top_key_phrases: ["JWT", "OAuth", "sessions"]

// 3. Deep dive into specific content across all files
// (search_content searches all files - Auth.md chunks will rank higher due to relevance)
const content = await search_content({
  folder_id: "project",
  semantic_concepts: ["JWT validation"],
  exact_terms: ["verifyToken"]
})

// Alternative: If you already know the file, read it directly
const fullDoc = await get_document_text({
  base_folder_path: "/path/to/project",
  file_path: docs.results[0].file_path
})
```

---

## Success Criteria

### Functional Requirements

**Must Have** (Sprint 9 completion blocked without these):
- ✅ find_documents endpoint returns document list with relevance scores
- ✅ Vec0 MATCH operator correctly searches document_embeddings table
- ✅ Document summaries include top_key_phrases from document_keywords
- ✅ Pagination works with continuation tokens (base64url encoded)
- ✅ Results ordered by descending relevance_score
- ✅ Navigation hints provide context-appropriate suggestions
- ✅ All 6 A2E test scenarios pass with real fixtures

**Should Have** (Important but can be improved post-Sprint 9):
- ✅ query_understanding provides meaningful interpretation
- ✅ related_queries help refine broad searches
- ✅ Response time < 200ms for 100+ documents
- ✅ Graceful handling of edge cases (empty results, invalid folder_id)

**Nice to Have** (Future enhancements, not Sprint 9):
- ⏳ File type filtering (e.g., only .md or .pdf documents)
- ⏳ Date range filtering (modified_since, modified_before)
- ⏳ Sort options (by relevance, date, name)
- ⏳ Aggregation of documents by directory/category

### Performance Targets

- **Embedding generation**: < 50ms (single query embedding)
- **Vec0 search**: < 100ms (search 100+ document embeddings)
- **Aggregation queries**: < 50ms (chunk counts, readability averages)
- **Total response time**: < 200ms (end-to-end)

### Quality Metrics

- **Relevance accuracy**: Top result matches expected document in 90% of test cases
- **Pagination consistency**: Zero duplicate documents across pages
- **Ordering reliability**: Results always sorted by descending relevance_score
- **Navigation hints**: Actionable suggestions in 100% of responses

---

## Implementation Checklist

**🎓 Sprint 8 Lessons Applied**:
- Reordered phases: MCP validation first, then SQL, then domain
- Each phase includes immediate A2E validation
- Type ownership clearly documented
- No conditional mutation - only typed construction with spread operators

---

### Phase 0: Pre-Implementation (Already Complete) ✅
- ✅ `document_embeddings` vec0 virtual table exists (Sprint 7.5)
- ✅ `documents.document_keywords` field populated during indexing
- ✅ Document embedding generation pipeline working

---

### Phase 1: MCP Interface with Early Validation (1 hour)

**🎯 Goal**: Establish type contracts and fail-fast validation before writing any SQL

**File**: `src/interfaces/mcp/types.ts`

- [ ] Add FindDocumentsMCPRequest interface
  - [ ] Include folder_id (will be passed as URL path param)
  - [ ] Include query, limit, continuation_token
  - [ ] Document that folder_id is for MCP tool, not REST body

- [ ] Add FindDocumentsResponse interface
  - [ ] data: { results, statistics }
  - [ ] status: { success, code, message }
  - [ ] continuation: { has_more, next_token? }
  - [ ] navigation_hints: { next_actions, related_queries }

- [ ] Add FindDocumentResult interface
- [ ] Add DocumentSummary interface
- [ ] Export all new types

**File**: `src/interfaces/mcp/daemon-mcp-endpoints.ts`

- [ ] Add `find_documents` tool definition
  - [ ] **CRITICAL**: Add folder_id validation (fail-fast)
  - [ ] **CRITICAL**: Add query validation (fail-fast)
  - [ ] Build request body WITHOUT folder_id
  - [ ] Pass folder_id as URL path parameter only
  - [ ] Call daemonClient.findDocuments(folder_id, requestBody)
  - [ ] Add tool description for LLM guidance

**✅ A2E Test After Phase 1**:
- [ ] Test empty folder_id → expect clear error message
- [ ] Test empty query → expect clear error message
- [ ] Test valid inputs → expect endpoint call attempt (may fail, that's OK)
- [ ] Verify error messages are actionable for users

---

### Phase 2: SQL Query and Pagination (1 hour)

**🎯 Goal**: Implement vec0 query with proper type safety and pagination

**File**: `src/daemon/rest/types.ts`

- [ ] Add FindDocumentsRequest interface (REST body only)
  - [ ] **CRITICAL**: No folder_id field in body
  - [ ] Add comment: "folder_id comes from URL path :folderPath"
  - [ ] Include: query, limit, continuation_token

- [ ] Add FindDocumentsResponseData interface
- [ ] Export all new REST types

**File**: `src/infrastructure/embeddings/sqlite-vec/sqlite-vec-storage.ts`

- [ ] Add `searchDocumentEmbeddings()` method
  - [ ] Implement CTE structure (ranked_documents → document_stats)
  - [ ] Vec0 MATCH with k parameter (no min_score filtering)
  - [ ] LEFT JOIN chunks for aggregation
  - [ ] ROW_NUMBER() for pagination window
  - [ ] Return DocumentSearchResult[] interface

- [ ] Add pagination helper
  - [ ] Parse continuation token (base64url → {offset})
  - [ ] Generate next continuation token
  - [ ] Calculate has_more flag

- [ ] Add result formatting
  - [ ] Parse document_keywords JSON
  - [ ] Format file sizes (bytes → "1.2 MB")
  - [ ] Convert timestamps to ISO 8601
  - [ ] Extract top 5 key phrases per document

**✅ A2E Test After Phase 2**:
- [ ] Test Scenario 1: Basic document discovery
  - [ ] Read Remote_Work_Policy.md fixture
  - [ ] Search for "remote work policy"
  - [ ] Validate correct document returned as top result
  - [ ] Check results ordered by descending relevance_score
- [ ] Test Scenario 3: Limit control (basic check)
  - [ ] Verify limit parameter controls result count

---

### Phase 3: Domain Service and Response Formatting (1 hour)

**🎯 Goal**: Orchestrate layers and build navigation hints

**File**: `src/domain/knowledge/service.ts`

- [ ] Add `findDocuments()` method
  - [ ] Accept folderPath as separate parameter (from URL)
  - [ ] Accept FindDocumentsRequest for body params
  - [ ] Validate folder exists (domain-level check)
  - [ ] Generate query embedding via embeddingProvider
  - [ ] Call storage.searchDocumentEmbeddings()
  - [ ] Build navigation_hints logic
  - [ ] Compute statistics (avg_relevance, query_understanding)
  - [ ] **CRITICAL**: Use typed construction for continuation object:
    ```typescript
    const continuation = {
      has_more: hasMore,
      ...(nextToken !== undefined && { next_token: nextToken })
    };
    ```
  - [ ] Return StandardResponse structure

**File**: `src/daemon/rest/server.ts`

- [ ] Add POST route: `/api/v1/folders/:folderPath/find-documents`
  - [ ] Extract folderPath from URL params
  - [ ] Parse request body as FindDocumentsRequest
  - [ ] Call domainService.findDocuments(folderPath, requestBody)
  - [ ] Return StandardResponse

**✅ A2E Test After Phase 3**:
- [ ] Test Scenario 4: Document summary quality
  - [ ] Verify top_key_phrases accuracy
  - [ ] Check metadata completeness
  - [ ] Validate download_url format
- [ ] Test Scenario 6: Navigation hints (basic check)
  - [ ] Verify next_actions exist and are contextual
  - [ ] Check related_queries format

---

### Phase 4: Full A2E Validation and Integration (1 hour)

**🎯 Goal**: Complete all remaining test scenarios and integration checks

**Complete remaining A2E scenarios**:

- [ ] Test Scenario 2: Pagination
  - [ ] Fetch first page (limit=5)
  - [ ] Use continuation token for page 2
  - [ ] Verify no duplicates, descending order

- [ ] Test Scenario 3: Relevance ordering and limit control (thorough)
  - [ ] Test with limit=5 (small)
  - [ ] Test with limit=15 (larger)
  - [ ] Compare result ordering consistency
  - [ ] Verify model-independent behavior

- [ ] Test Scenario 5: Empty results
  - [ ] Query for non-existent topic
  - [ ] Verify graceful handling
  - [ ] Check navigation hints appropriateness

- [ ] Test Scenario 6: Navigation hints (thorough)
  - [ ] Test few-results scenario
  - [ ] Test many-results scenario
  - [ ] Validate query_understanding quality

**Integration verification**:
- [ ] Test find_documents → search_content workflow
  - [ ] Use find_documents to discover relevant docs
  - [ ] Use search_content on discovered docs for specific content
  - [ ] Verify workflow is seamless

- [ ] Verify download_url links work
  - [ ] Construct URLs match actual endpoints
  - [ ] URLs can be used to fetch full document content

- [ ] Test with Claude Desktop MCP client (if available)
  - [ ] Register find_documents tool
  - [ ] Test natural language queries
  - [ ] Verify responses render correctly

**Documentation updates**:
- [ ] Update Epic document (mark Sprint 9 complete)
- [ ] Update API documentation (add find_documents spec)
- [ ] Document when to use find_documents vs search_content

---

## Risk Assessment and Mitigation

### Risk 1: Document embeddings quality varies by document length
**Impact**: Short documents may have low-quality averaged embeddings
**Mitigation**:
- Results ordered by relevance score (LLM can assess quality)
- Key phrases provide additional context beyond embeddings
- chunk_count in summary helps LLM assess document granularity

### Risk 2: Query understanding may be too simplistic
**Impact**: Generated query_understanding text might not be helpful
**Mitigation**:
- Start with simple approach (extract matched key phrases)
- Monitor user feedback in A2E testing
- Can enhance in future sprint if needed (not blocking)

### Risk 3: Navigation hints require heuristics
**Impact**: next_actions logic may not always be appropriate
**Mitigation**:
- Define clear rules (few results → read, many results → narrow)
- Test extensively in A2E scenarios
- LLMs can ignore hints if not useful (non-critical)

### Risk 4: Pagination with large result sets
**Impact**: Very broad queries might match 100+ documents
**Mitigation**:
- Default limit=20 handles most cases
- Continuation tokens support unlimited pagination
- Results ordered by relevance (top results most useful)

---

## Timeline and Dependencies

**Total Estimated Time**: 3-4 hours

**Breakdown**:
1. SQL Query Implementation: 1 hour
2. Domain Service Orchestration: 0.5 hour
3. MCP Interface Layer: 1 hour
4. A2E Testing: 1 hour
5. Documentation: 0.5 hour
6. Buffer for debugging: 0.5-1 hour

**Dependencies**:
- ✅ Sprint 8 (search_content) completed - provides patterns and infrastructure
- ✅ Sprint 7.5 (vec0 migration) completed - document_embeddings table exists
- ✅ Indexing pipeline - document keywords already extracted

**Blockers**:
- None identified - all infrastructure is in place

---

## Definition of Done

Sprint 9 is considered **COMPLETE** when:

1. ✅ **Code Complete**:
   - find_documents endpoint implemented and registered
   - SQL query with vec0 MATCH working correctly
   - Pagination with continuation tokens functional
   - Navigation hints logic implemented

2. ✅ **Testing Complete**:
   - All 6 A2E test scenarios pass
   - Edge cases handled gracefully (empty results, invalid folder)
   - Performance targets met (< 200ms response time)

3. ✅ **Integration Verified**:
   - find_documents → search_content workflow tested
   - Works with Claude Desktop MCP client
   - download_url links correctly formatted

4. ✅ **Documentation Updated**:
   - Epic document marked Sprint 9 complete
   - API documentation includes find_documents spec
   - When-to-use guidance clear for LLMs

5. ✅ **Quality Validated**:
   - No regressions in existing endpoints
   - Code follows clean architecture patterns
   - Type safety maintained across interfaces

---

## Future Enhancements (Post-Sprint 9)

These are **NOT** part of Sprint 9 scope but good candidates for future work:

1. **Advanced Filtering**:
   - File type filtering (only .md, only .pdf, etc.)
   - Date range filtering (modified_since, modified_before)
   - File size filtering (documents > 10KB)

2. **Sorting Options**:
   - Sort by relevance (default)
   - Sort by modified date (newest first)
   - Sort by name (alphabetical)

3. **Aggregations**:
   - Group documents by directory
   - Aggregate by file type distribution
   - Show topic clusters

4. **Enhanced Query Understanding**:
   - Use LLM to expand query into concepts
   - Semantic query rewriting for better matches
   - Multi-step query refinement

5. **Document Relationships**:
   - "Documents similar to X"
   - "Documents that reference X"
   - Citation/link graph analysis

---

## Conclusion

Sprint 9 delivers **document-level discovery** as the complementary counterpart to Sprint 8's chunk-level search. Together, these endpoints provide a complete semantic navigation experience:

- **find_documents**: Broad discovery → "What docs cover this topic?"
- **search_content**: Precise retrieval → "Where is this specific information?"

The implementation leverages existing vec0 infrastructure from Sprint 7.5, making it a straightforward 3-4 hour sprint with clear A2E validation and well-defined success criteria.

**Navigation Flow**:
```
User Query
    ↓
find_documents (discover relevant docs)
    ↓
Review summaries (top_key_phrases, metadata)
    ↓
Read selected documents (download_url)
    ↓
search_content (find specific passages)
    ↓
Deep context retrieval
```

This completes the Phase 10 semantic navigation foundation, enabling LLMs to efficiently explore large knowledge bases with precision and context awareness.
