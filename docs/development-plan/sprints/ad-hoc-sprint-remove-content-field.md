# Ad Hoc Sprint: Remove chunks.content Field

**Sprint Type**: Ad Hoc  
**Priority**: High  
**Impact**: Database size reduction of 50-70%  
**Breaking Changes**: Yes - Search snippets will be temporarily broken  

## Sprint Goal
Remove the redundant `content` field from the chunks table while maintaining perfect text reconstruction through extraction coordinates. This will reduce database size by ~50-70% and align with Sprint 12's bidirectional mapping architecture.

## Architectural Context
Currently, we store both the full text content AND extraction coordinates in the chunks table. This is redundant since extraction coordinates can perfectly reconstruct the text. The content field is only truly needed during the indexing pipeline (for embeddings and semantic metadata), not for storage.

### Current Pipeline Architecture
```
1. PARSING (parser.ts)
   ↓ Returns ParsedContent with full text
2. CHUNKING (pdf-chunking.ts, etc.)
   ↓ Creates chunks with: { content: "text", extractionParams, ... }
3. ORCHESTRATOR (orchestrator.ts:605)
   ↓ Passes chunk.content to both:
   ├─→ EMBEDDINGS (line 580): generateEmbeddings(batch) 
   │   ↓ Uses chunk.content to create vectors
   └─→ METADATA (line 605): Copies content to metadata object
       ↓
4. STORAGE (sqlite-vec-storage.ts:463)
   ↓ Stores BOTH content AND embedding in database (REDUNDANT!)
```

### Key Insight
The content is already available in the pipeline where it's needed (embedding generation and semantic metadata extraction). We just need to stop storing it in the database.

## Changes Required

### 1. Database Schema Updates

#### File: `src/infrastructure/embeddings/sqlite-vec/schema.ts`

**Line 53**: Remove `content TEXT NOT NULL,` from CREATE TABLE chunks

**Lines 203-206**: Update INSERT statement:
```sql
INSERT INTO chunks 
(document_id, chunk_index, start_offset, end_offset, extraction_params, token_count,
 key_phrases, topics, readability_score, semantic_processed, semantic_timestamp)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```
(Remove content from both column list and VALUES)

**Lines 222-239**: Update similaritySearch query:
```sql
-- Remove c.content from SELECT
SELECT 
    c.id as chunk_id,
    -- c.content, -- REMOVED
    c.chunk_index,
    c.extraction_params,
    d.file_path,
    d.mime_type,
    c.key_phrases,
    c.topics,
    c.readability_score,
    (c.id * 0.1) as distance
FROM embeddings e
JOIN chunks c ON e.chunk_id = c.id
JOIN documents d ON c.document_id = d.id
ORDER BY c.id ASC
LIMIT ?
```

### 2. Storage Layer Updates

#### File: `src/infrastructure/embeddings/sqlite-vec/sqlite-vec-storage.ts`

**Lines 460-473**: Remove content from INSERT execution:
```typescript
const chunkResult = insertChunkStmt.run(
    docId,
    meta.chunkIndex,
    // REMOVE: meta.content, (line 463 - remove this parameter)
    meta.startPosition,
    meta.endPosition,
    serializedParams,
    Math.ceil(meta.content.length / 4), // Still use content for token count calculation
    JSON.stringify(keyPhrases),
    JSON.stringify(topics),
    readabilityScore,
    1,
    new Date().toISOString()
);
```

**Lines 399-402**: Keep semantic processing unchanged:
```typescript
// This stays the same - content is available in pipeline before storage
const keyPhrases = ContentProcessingService.extractKeyPhrases(meta.content, 8);
const topics = ContentProcessingService.detectTopics(meta.content);
const readabilityScore = ContentProcessingService.calculateReadabilityScore(meta.content);
```

### 3. Search Functionality (Intentionally Break)

#### File: `src/daemon/rest/server.ts`

**Lines 1266-1268**: Add TODO comment and handle missing content:
```typescript
// TODO Sprint 12 Step 3: Extract content using coordinates for search snippets
snippet: includeContent && result.content
  ? (result.content.substring(0, 300) + (result.content.length > 300 ? '...' : ''))
  : undefined, // Will be undefined until Sprint 12 Step 3
```

### 4. Document Service (Already Implemented)

The extraction methods are already implemented and working:
- `extractPdfByParams` (lines 667-722) ✅
- `extractTextByParams` (lines 651-662) ✅  
- `extractExcelByParams` (lines 675-692) ✅
- `extractPowerPointByParams` (lines 701-716) ✅
- `extractWordByParams` (lines 721-742) ✅

## Testing Methodology: Embedding Consistency Verification

### Core Test Principle
For each file type, we will:
1. Select a chunk from the database
2. Extract text using its stored coordinates
3. Generate new embeddings from the extracted text
4. Compare with stored embeddings
5. Verify they match exactly (proving perfect text reconstruction)

### Phase 1: Implementation & Re-indexing
1. Make all code changes listed above
2. Build: `npm run build`
3. **Delete old database**: `rm -rf ~/.folder-mcp`
4. Restart daemon: `node dist/src/daemon/index.js --restart`
5. Monitor logs to ensure full re-indexing completes

### Phase 2: Embedding Consistency Tests

For each file type, we need to verify that:
- Extraction coordinates can perfectly reconstruct the original text
- The reconstructed text generates identical embeddings

#### Test Script Structure
```javascript
// For each file type:
1. Get a sample chunk with its extraction_params and stored embedding
2. Use extraction_params to extract text from source file
3. Generate new embedding from extracted text
4. Compare new embedding with stored embedding
5. They must match (within floating point tolerance)
```

#### File Types to Test
1. **TEXT** (.txt) - Uses line-based extraction
2. **MARKDOWN** (.md) - Uses line-based extraction  
3. **PDF** (.pdf) - Uses page and text block extraction
4. **WORD** (.docx) - Uses paragraph-based extraction
5. **EXCEL** (.xlsx) - Uses sheet and cell range extraction
6. **POWERPOINT** (.pptx) - Uses slide-based extraction

### Phase 3: Validation Metrics

#### Per-File-Type Success Criteria:
- ✅ Text extraction produces non-empty content
- ✅ New embeddings generated successfully
- ✅ New embeddings match stored embeddings exactly
- ✅ Consistent results on repeated extraction

#### Overall Success Criteria:
- ✅ All 6 file types pass embedding consistency test
- ✅ Database size reduced by 50-70%
- ✅ No content field exists in chunks table
- ✅ All chunks have extraction_params populated
- ✅ Search returns results (without snippets - expected)

### Phase 4: Database Verification

```sql
-- Verify schema changes
PRAGMA table_info(chunks);
-- Should NOT show content column

-- Verify extraction_params coverage
SELECT COUNT(*) as total_chunks,
       COUNT(extraction_params) as chunks_with_params,
       COUNT(CASE WHEN extraction_params IS NULL THEN 1 END) as missing_params
FROM chunks;
-- missing_params should be 0

-- Check database size reduction
SELECT page_count * page_size / 1024 / 1024 as size_mb 
FROM pragma_page_count(), pragma_page_size();
-- Should show 50-70% reduction from baseline
```

## Known Breaking Changes

### Search Snippets
- **Impact**: Search results will have undefined snippets
- **User Experience**: Search will return document matches but no text preview
- **Fix Timeline**: Sprint 12 Step 3
- **Mitigation**: None needed - this is temporary and expected

## Rollback Plan

If embedding consistency tests fail:
1. **Identify failing file type** from test results
2. **Debug extraction method** for that specific type
3. **Fix and re-test** just that file type
4. **If systemic issue**:
   - Revert all code changes
   - Investigate coordinate generation during chunking
   - May need to fix chunking services first

## Migration Notes

- **No backwards compatibility** - we're in pre-production
- **One-way migration** - old databases cannot be used after this change
- **Full re-indexing required** - all documents will be re-processed
- **Estimated re-indexing time**: 5-10 minutes for current test corpus

## Success Metrics

| Metric | Target | Method |
|--------|--------|--------|
| Database Size Reduction | 50-70% | Compare before/after file sizes |
| Embedding Consistency | 100% | All 6 file types pass consistency test |
| Extraction Speed | <100ms per chunk | Time extraction operations |
| Search Functionality | Returns results | Query returns documents (no snippets) |
| Memory Usage | No increase | Monitor during re-indexing |

## Dependencies

This sprint depends on:
- Sprint 11 extraction params implementation (COMPLETE)
- Sprint 12 Step 2.3 PDF extraction fix (COMPLETE)

This sprint blocks:
- Sprint 12 Step 3 (Search quality improvements)

## Post-Sprint Tasks

After this sprint, Sprint 12 Step 3 will need to:
1. Implement on-demand content extraction for search snippets
2. Add caching layer for frequently accessed chunks
3. Optimize extraction performance for search results

## Approval

- **Architect**: Approved for implementation
- **Breaking Change**: Acknowledged - search snippets will break temporarily
- **Testing**: Embedding consistency test is the key validation
- **Timeline**: Implement immediately