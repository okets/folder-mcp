# Sprint: Remove Content Field from Chunks Table (v2)

**Sprint Type**: Database Optimization  
**Priority**: High - Reduces database size by 50-70%  
**Estimated Duration**: 1-2 days  
**Breaking Changes**: Yes - Search snippets temporarily broken  
**Prerequisite**: Python embeddings must be working (previous sprint)  
**Starting Context**: Code has been rolled back to clean state, content field still exists

## Problem Statement

The chunks table stores both full text content AND extraction coordinates, creating redundancy. Since extraction coordinates can perfectly reconstruct the text, the content field is unnecessary and inflates database size by 50-70%.

## Lessons Learned from Previous Attempt

### What Worked ✅
1. **Database schema changes were correct** - Removing content field is architecturally sound
2. **Extraction coordinate system is well-designed** - The bidirectional mapping approach is solid
3. **Size reduction is significant** - 50-70% reduction in database size achieved
4. **Content is available where needed** - During indexing pipeline for embeddings/metadata

### What We Need to Fix 🔧
1. **Coordinate system validation** - Must verify extraction params work before removing content
2. **Search snippet handling** - Need graceful degradation when content unavailable
3. **Error handling** - Better error messages when extraction fails

### Key Files from Previous Implementation
- **Schema Changes**: Already implemented in `src/infrastructure/embeddings/sqlite-vec/schema.ts`
- **Documentation**: Existing plan at `docs/development-plan/sprints/ad-hoc-sprint-remove-content-field.md`
- **Extraction Methods**: Document service methods already exist

## Sprint Goals

1. **Validate extraction coordinates work** - Before removing content field
2. **Remove content field safely** - With proper error handling
3. **Implement search snippet fallback** - Graceful degradation
4. **Achieve 50-70% database size reduction** - Primary optimization goal
5. **Maintain all functionality except search snippets** - Everything else works

## Technical Approach

### Phase 1: Pre-Removal Validation
Before removing the content field, validate that extraction coordinates work for all file types:

```javascript
// For each file type in database:
1. Select sample chunk with extraction_params
2. Extract text using coordinates from source file
3. Verify extracted text matches stored content
4. Only proceed if 100% of samples pass validation
```

### Phase 2: Database Schema Update
Starting from rolled-back state, apply these schema changes:

```sql
-- BEFORE (rolled-back state):
CREATE TABLE IF NOT EXISTS chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,  -- THIS FIELD TO BE REMOVED
    start_offset INTEGER NOT NULL,
    end_offset INTEGER NOT NULL,
    token_count INTEGER,
    UNIQUE(document_id, chunk_index)
);

-- AFTER (target state):
CREATE TABLE IF NOT EXISTS chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    start_offset INTEGER NOT NULL,
    end_offset INTEGER NOT NULL,
    extraction_params TEXT NOT NULL,   -- NEW FIELD ADDED
    token_count INTEGER,
    -- Semantic metadata columns (may already exist from Sprint 10)
    key_phrases TEXT,
    topics TEXT,
    readability_score REAL,
    semantic_processed INTEGER DEFAULT 0,
    semantic_timestamp INTEGER,
    UNIQUE(document_id, chunk_index)
);
```

### Phase 3: Search Snippet Handling
Implement graceful degradation for search results:

```typescript
interface SearchResult {
  chunk_id: number;
  document_id: number;
  file_path: string;
  extraction_params: string;
  relevance_score: number;
  snippet?: string; // Optional - extracted on-demand if needed
}

// For high-priority search results, extract snippet on-demand
// For bulk results, omit snippet to maintain performance
```

### Phase 4: Performance Optimization
Since we're removing content, optimize other operations:

```typescript
// Cache frequently extracted segments
// Batch extraction requests
// Use extraction params for direct navigation
```

## Database Changes Required

### Files to Modify

1. **`src/infrastructure/embeddings/sqlite-vec/schema.ts`**
   - **Remove**: `content TEXT NOT NULL,` from CHUNKS_TABLE (line ~56 in rolled-back state)
   - **Add**: `extraction_params TEXT NOT NULL,` to CHUNKS_TABLE  
   - **Update**: Schema version to 3 in VERSION.json
   - **Remove**: Any content-related indexes from INDEXES array

2. **`src/infrastructure/embeddings/sqlite-vec/sqlite-vec-storage.ts`**
   - Remove content parameter from INSERT execution
   - Keep content usage for token count calculation during storage
   - Update similarity search to not select content

3. **`src/daemon/rest/server.ts`**
   - Update search endpoint to handle missing content
   - Add on-demand snippet extraction for priority results
   - Implement fallback response format

4. **`src/daemon/services/document-service.ts`**
   - ✅ Extraction methods already implemented
   - Verify all file types work correctly
   - Add validation and error handling

## Testing Strategy

### Pre-Migration Validation
```javascript
// Test extraction for each file type
const testFiles = [
  { type: 'pdf', file: 'test.pdf' },
  { type: 'docx', file: 'test.docx' },
  { type: 'xlsx', file: 'test.xlsx' },
  { type: 'pptx', file: 'test.pptx' },
  { type: 'txt', file: 'test.txt' },
  { type: 'md', file: 'test.md' }
];

for (const testFile of testFiles) {
  // 1. Get chunks from database
  // 2. Extract using coordinates
  // 3. Verify extraction matches original content
  // 4. Assert 100% success rate
}
```

### Post-Migration Validation
```sql
-- Verify schema changes
PRAGMA table_info(chunks);
-- Should NOT show content column

-- Verify extraction_params coverage
SELECT COUNT(*) as total_chunks,
       COUNT(extraction_params) as chunks_with_params
FROM chunks;
-- Should be equal

-- Measure database size reduction
SELECT page_count * page_size / 1024 / 1024 as size_mb 
FROM pragma_page_count(), pragma_page_size();
-- Should show significant reduction
```

### Functional Testing
- Search returns results (without snippets initially)
- Document outline endpoints work
- All MCP tools function properly
- Performance is maintained or improved

## Implementation Plan

### Step 1: Validation Phase
```bash
# 1. Build current code
npm run build

# 2. Run pre-migration validation script
node dist/validation/extract-content-validation.js

# 3. Only proceed if 100% validation success
```

### Step 2: Migration Phase
```bash
# 1. Apply code changes (remove content usage)
# 2. Delete database to force clean migration
rm -rf ~/.folder-mcp/
# 3. Restart daemon with new schema
node dist/src/daemon/index.js --restart
# 4. Monitor re-indexing completion
```

### Step 3: Validation Phase
```bash
# 1. Run post-migration tests
npm test -- --grep "content-field-removal"
# 2. Verify database size reduction
# 3. Test search functionality
# 4. Validate all MCP endpoints
```

## Success Criteria

### Must Have ✅
- Database size reduced by 50-70%
- No content field exists in chunks table
- All chunks have extraction_params populated
- Search returns document results (snippets optional)
- All file types can extract content using coordinates
- MCP endpoints function properly

### Should Have ✅
- Search performance maintained or improved
- Memory usage during operations stable
- Error handling for extraction failures
- Graceful degradation when files unavailable

### Nice to Have
- On-demand snippet extraction for high-priority results
- Extraction performance under 100ms per chunk
- Caching layer for frequently accessed extractions

## Risk Mitigation

### Risk: Extraction Coordinates Don't Work
**Mitigation**: Extensive pre-migration validation, rollback plan ready

### Risk: Search Quality Degradation
**Mitigation**: Implement on-demand snippet extraction for critical results

### Risk: Performance Impact
**Mitigation**: Benchmark before/after, optimize extraction operations

### Risk: File Unavailability
**Mitigation**: Graceful error handling, clear user feedback

## Breaking Changes

### Search Snippets (Temporary)
- **Impact**: Search results won't include text previews initially
- **User Experience**: Document matches without snippet preview
- **Fix Timeline**: Can be implemented immediately after migration
- **Workaround**: Use document outline endpoint for content preview

### Database Incompatibility
- **Impact**: Existing databases cannot be used
- **Migration**: Full re-indexing required
- **Timeline**: 5-10 minutes for current test corpus
- **No backwards compatibility** (pre-production system)

## Rollback Plan

If post-migration validation fails:

### Immediate Rollback
```bash
# 1. Revert code changes
git checkout HEAD~1 -- src/infrastructure/embeddings/
# 2. Delete new database
rm -rf ~/.folder-mcp/
# 3. Restart with old schema
node dist/src/daemon/index.js --restart
```

### Debug Path
1. Identify failing file type from validation logs
2. Debug specific extraction method
3. Fix coordinate generation in chunking services
4. Re-attempt migration with fixes

## Dependencies

**Requires**: Python embeddings working (previous sprint)
**Blocks**: Enhanced search functionality, MCP endpoint improvements
**Enables**: Sprint 12 objectives (segment retrieval, improved search)

## Post-Sprint Tasks

After successful migration:

1. **Implement on-demand snippets** - Extract content for search results when needed
2. **Add extraction caching** - Cache frequently accessed chunks
3. **Optimize extraction performance** - Batch operations, async processing
4. **Monitor database performance** - Ensure size reduction doesn't impact speed

## Files to Reference

- **Original Plan**: `/docs/development-plan/sprints/ad-hoc-sprint-remove-content-field.md`
- **Schema Changes**: `/src/infrastructure/embeddings/sqlite-vec/schema.ts` (already updated)
- **Document Service**: `/src/daemon/services/document-service.ts` (extraction methods exist)

## Migration Notes

- **Clean slate approach** - Delete database and re-index everything
- **Schema version bump** - Increment to version 3
- **Full validation required** - Test every file type before deployment
- **Monitor re-indexing** - Ensure all documents process successfully

This sprint builds on the successful learnings from the previous attempt while addressing the validation and error handling gaps that were discovered.