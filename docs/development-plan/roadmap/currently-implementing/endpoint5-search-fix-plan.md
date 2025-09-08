# Search Endpoint: Fix Plan

## Current Status
**BROKEN** - The search endpoint is not returning results despite having 7,280 embeddings in the database.

## Problem Analysis

### Symptoms
1. Search endpoint returns empty results or errors
2. Database has semantic data (7,275 chunks with semantic metadata)
3. Other endpoints (1-4) are now working correctly with semantic data

### Root Cause (Suspected)
- Search functionality may not be properly connected to the semantic/embedding infrastructure
- Could be using old mock data or disconnected search service
- May have path/configuration issues with the embedding database

## Required Fixes

### 1. Verify Database Connection
- Check if search service is connecting to the correct database
- Path should be: `/Users/hanan/Projects/folder-mcp/.folder-mcp/embeddings.db`
- Verify the search service is using the same database as other endpoints

### 2. Check Search Service Implementation
**File to examine**: `src/infrastructure/storage/multi-folder-vector-search.ts`
- Verify it's using real embeddings, not mock data
- Check if it's properly querying the chunks table
- Ensure similarity search is implemented correctly

### 3. REST Endpoint Handler
**File to examine**: `src/daemon/rest/server.ts` - `handleSearch` method
- Verify it's calling the search service correctly
- Check request/response mapping
- Ensure proper error handling

### 4. Search Request Structure
**Expected structure**:
```typescript
{
  query: string;
  limit?: number;
  threshold?: number;
  includeContent?: boolean;
}
```

### 5. Expected Response Structure
**Should return**:
```typescript
{
  folderContext: { ... },
  results: [
    {
      documentId: string,
      documentPath: string,
      similarity: number,
      snippet: string,
      metadata: { ... }
    }
  ],
  totalResults: number,
  searchMetadata: { ... }
}
```

## Test Plan

### Test 1: Basic Search
```bash
curl -X POST http://localhost:3002/api/v1/folders/%2FUsers%2Fhanan%2FProjects%2Ffolder-mcp/search \
  -H "Content-Type: application/json" \
  -d '{"query": "semantic enhancement", "limit": 5}'
```

**Expected**: Should return documents mentioning "semantic enhancement"

### Test 2: Search with Known Content
1. Read a known document that's indexed
2. Search for exact phrases from that document
3. Verify the document appears in results with high similarity

### Test 3: Threshold Testing
```bash
# High threshold - fewer, more relevant results
curl -X POST ... -d '{"query": "test", "threshold": 0.8}'

# Low threshold - more results, less relevant
curl -X POST ... -d '{"query": "test", "threshold": 0.3}'
```

## Implementation Approach

### Step 1: Debug Current State
1. Add logging to see what's happening in search pipeline
2. Check if embeddings are being generated for the query
3. Verify database queries are executing correctly

### Step 2: Fix Connection Issues
1. Ensure search service has correct database path
2. Verify embedding service is available for query embedding
3. Check if similarity calculation is working

### Step 3: Implement Proper Search
If current implementation is mock/broken:
1. Query embedding generation for search text
2. Vector similarity search against chunks table
3. Aggregate results by document
4. Return ranked results with snippets

### Step 4: Add Semantic Enrichment
Like other endpoints, search results should include:
- Topics from matching chunks
- Key phrases from relevant sections
- Document-level semantic metadata

## Code Areas to Investigate

### Primary Files
1. `src/daemon/rest/server.ts` - handleSearch method (line ~867)
2. `src/infrastructure/storage/multi-folder-vector-search.ts`
3. `src/interfaces/mcp/daemon-mcp-endpoints.ts` - search endpoint
4. `src/daemon/services/document-service.ts` - if it handles search

### Supporting Files
1. `src/infrastructure/embeddings/sqlite-vec/sqlite-vec-storage.ts`
2. `src/application/search/semantic-search-service.ts` (if exists)
3. `src/types/search.ts` - search type definitions

## Success Criteria

1. **Returns Results**: Search returns actual documents from the indexed folder
2. **Relevance**: Results are ranked by similarity score
3. **Performance**: Search completes in < 1 second for typical queries
4. **Accuracy**: Known content appears when searched for
5. **Consistency**: Uses same semantic data as other endpoints

## Current Database State
```sql
-- Verify search-ready data exists
SELECT COUNT(*) as chunks_with_embeddings 
FROM chunks c
JOIN documents d ON c.document_id = d.id
WHERE d.folder_path = '/Users/hanan/Projects/folder-mcp';
-- Result: 7,280 chunks ready for search
```

## Testing Commands

### Quick Diagnostic
```javascript
// Test script: test-search-endpoint.cjs
const http = require('http');

const searchData = JSON.stringify({
  query: "Phase 9 Implementation",
  limit: 5,
  threshold: 0.3
});

const options = {
  hostname: 'localhost',
  port: 3002,
  path: `/api/v1/folders/${encodeURIComponent('/Users/hanan/Projects/folder-mcp')}/search`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': searchData.length
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const response = JSON.parse(data);
    console.log('Search results:', response.results?.length || 0);
    if (response.error) {
      console.log('Error:', response.error, response.message);
    } else if (response.results?.length > 0) {
      console.log('First result:', response.results[0]);
    }
  });
});

req.write(searchData);
req.end();
```

## Next Steps

1. **Run diagnostic test** to see current endpoint behavior
2. **Trace through code** to find disconnection point
3. **Fix the connection** between search endpoint and embedding database
4. **Verify with A2E testing** using MCP tools directly
5. **Document the fix** for future reference

## Notes

- All other endpoints (1-4) are working correctly now
- Database has proper semantic data (verified in previous work)
- This is likely a connection/configuration issue rather than missing data
- Solution should be relatively straightforward once the disconnection point is found