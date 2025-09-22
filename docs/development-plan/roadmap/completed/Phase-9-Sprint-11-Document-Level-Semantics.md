# Sprint 11: Document-Level Embeddings & Keywords

**Status**: In Progress
**Priority**: High
**Dependencies**: Sprint 10 (Semantic Extraction) completed

## Executive Summary

Implement document-level embeddings and keyword extraction that efficiently processes documents with 100+ chunks without memory explosion. The system will reuse chunk-level keyword embeddings for maximum efficiency while providing high-quality document-level semantic data.

## Problem Statement

Currently, our system only stores chunk-level embeddings and keywords, missing the document-level perspective that's crucial for:
- Document-wide semantic search
- Document summarization
- Better relevance ranking
- Document clustering and categorization

### Key Challenges
1. **Memory Efficiency**: Documents can have 100+ chunks - loading all embeddings causes memory explosion
2. **Keyword Quality**: Need to select best keywords from thousands of candidates
3. **Embedding Reuse**: Avoid regenerating embeddings we already computed at chunk level
4. **Database Evolution**: Add document-level fields without breaking existing functionality

## Research Findings

### Critical Discoveries
1. **We're already doing MORE work at chunk level**:
   - Testing 7,850 keyword candidates (50 per chunk × 157 chunks)
   - Document level only needs 150-200 candidates
   - This is a 52x reduction in computation!

2. **Keyword embeddings already exist**:
   - Generated during chunk processing
   - Stored in LRU cache
   - Can be reused for document-level scoring

3. **Limited deduplication benefit**:
   - Only 16.8% reduction (1,570 → 1,307 unique)
   - Most keywords are already unique
   - Quality matters more than quantity

4. **Incremental averaging solves memory problem**:
   - Welford's algorithm: O(1) memory complexity
   - Process chunks sequentially
   - Numerically stable averaging

## Technical Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                 Indexing Orchestrator                │
│  ┌─────────────────────────────────────────────┐   │
│  │         Chunk Processing Loop               │   │
│  │  ┌──────────────────────────────────┐      │   │
│  │  │  1. Process chunk                 │      │   │
│  │  │  2. Extract keywords              │      │   │
│  │  │  3. Generate embeddings           │      │   │
│  │  │  4. Update document averager      │◄─────┼───┼── Incremental
│  │  │  5. Collect keyword candidates    │      │   │    Averaging
│  │  └──────────────────────────────────┘      │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │      Document-Level Processing              │   │
│  │  ┌──────────────────────────────────┐      │   │
│  │  │  1. Finalize document embedding  │      │   │
│  │  │  2. Score collected keywords     │◄─────┼───┼── Reuse cached
│  │  │  3. Select top 20-30            │      │   │    embeddings
│  │  │  4. Store in database           │      │   │
│  │  └──────────────────────────────────┘      │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Welford's Incremental Averaging Algorithm

```typescript
/**
 * Incrementally compute document embedding as average of chunk embeddings
 * using Welford's numerically stable online algorithm.
 * Memory complexity: O(dimension) regardless of chunk count
 */
class IncrementalEmbeddingAverager {
  private n = 0;                    // Number of chunks processed
  private mean: Float32Array;       // Running mean

  add(embedding: Float32Array): void {
    this.n++;
    if (this.n === 1) {
      this.mean = new Float32Array(embedding);
    } else {
      // Welford's update: new_mean = old_mean + (value - old_mean) / n
      for (let i = 0; i < embedding.length; i++) {
        this.mean[i] += (embedding[i] - this.mean[i]) / this.n;
      }
    }
  }

  getAverage(): Float32Array {
    return this.mean;
  }
}
```

### Keyword Collection & Scoring Strategy

```typescript
interface DocumentKeywordCandidate {
  text: string;                    // Keyword text
  embedding?: Float32Array;        // Reused from chunk processing cache
  chunkFrequency: number;          // How many chunks contain this keyword
  chunkScores: number[];           // Scores from each chunk
  avgChunkScore: number;           // Average score across chunks
  documentScore?: number;          // Cosine similarity to document embedding
  finalScore?: number;             // Combined score for ranking
}

// Scoring formula:
// finalScore = 0.7 * documentScore + 0.2 * avgChunkScore + 0.1 * log(chunkFrequency)
```

## Implementation Plan

### Phase 1: Database Schema Evolution

**File**: `src/infrastructure/embeddings/sqlite-vec/schema.ts`

```sql
-- Add columns to documents table
ALTER TABLE documents ADD COLUMN document_embedding TEXT;
ALTER TABLE documents ADD COLUMN document_keywords TEXT;  -- JSON array
ALTER TABLE documents ADD COLUMN keywords_extracted INTEGER DEFAULT 0;
ALTER TABLE documents ADD COLUMN embedding_generated INTEGER DEFAULT 0;
ALTER TABLE documents ADD COLUMN document_processing_ms INTEGER;

-- Add indexes for new fields
CREATE INDEX idx_documents_keywords_extracted ON documents(keywords_extracted);
CREATE INDEX idx_documents_embedding_generated ON documents(embedding_generated);
```

**Schema Version**: Increment from 2 to 3 to trigger rebuild

### Phase 2: Document Embedding Service

**New File**: `src/domain/semantic/document-embedding-service.ts`

Core responsibilities:
- Implement Welford's algorithm for incremental averaging
- Handle both ONNX and Python model outputs
- Provide streaming interface for chunk-by-chunk processing
- Calculate embedding statistics (magnitude, sparsity)

### Phase 3: Document Keyword Scorer

**New File**: `src/domain/semantic/document-keyword-scorer.ts`

Core responsibilities:
- Collect unique keywords from all chunks
- Retrieve cached embeddings (no regeneration!)
- Calculate cosine similarity to document embedding
- Apply combined scoring formula
- Optional MMR for diversity
- Return top 20-30 keywords with scores

### Phase 4: Orchestrator Integration

**Modify**: `src/application/indexing/orchestrator.ts`

Integration points:
```typescript
// During chunk processing loop (lines 700-900)
- Initialize document averager before loop
- After each chunk: averager.add(chunkEmbedding)
- Collect keyword candidates with embeddings

// After all chunks processed (line 944)
- Finalize document embedding
- Score all collected keywords
- Select top 20-30
- Store in database with single transaction
```

### Phase 5: Database Queries

**Update**: `src/infrastructure/embeddings/sqlite-vec/schema.ts`

New queries:
```typescript
export const QUERIES = {
  // ... existing queries ...

  updateDocumentEmbedding: `
    UPDATE documents
    SET document_embedding = ?,
        embedding_generated = 1,
        document_processing_ms = ?
    WHERE id = ?
  `,

  updateDocumentKeywords: `
    UPDATE documents
    SET document_keywords = ?,
        keywords_extracted = 1
    WHERE id = ?
  `,

  getDocumentSemantics: `
    SELECT document_embedding, document_keywords
    FROM documents
    WHERE id = ?
  `,

  getDocumentsNeedingSemantics: `
    SELECT id, file_path
    FROM documents
    WHERE keywords_extracted = 0 OR embedding_generated = 0
  `
};
```

## Testing Strategy

### Smoke Test Procedure

Using the 5 indexed test folders:
- `tmp/test-cpu-xenova-multilingual-e5-large`
- `tmp/test-cpu-xenova-gte-multilingual-base`
- `tmp/test-onnx-minilm-l6`
- `tmp/test-gpu-bge-m3`
- `tmp/test-gpu-e5-large`

**Test Steps**:
1. Remove all `.folder-mcp` directories to force re-indexing
2. Run `npm run daemon:restart` to start fresh daemon
3. Monitor daemon logs for indexing completion
4. Verify database contents:
   ```sql
   -- Check document-level data
   SELECT
     file_path,
     keywords_extracted,
     embedding_generated,
     LENGTH(document_embedding) as embedding_size,
     JSON_ARRAY_LENGTH(document_keywords) as keyword_count
   FROM documents
   WHERE keywords_extracted = 1;

   -- Verify keyword quality
   SELECT
     file_path,
     JSON_EXTRACT(document_keywords, '$[0].text') as top_keyword,
     JSON_EXTRACT(document_keywords, '$[0].score') as top_score
   FROM documents
   WHERE document_keywords IS NOT NULL;
   ```

### Memory Testing

Monitor memory usage during processing of large documents:
```bash
# Start monitoring before indexing
while true; do
  ps aux | grep "node.*daemon" | grep -v grep | awk '{print $6}'
  sleep 1
done > memory_usage.log

# Process should show constant memory even for 100+ chunk documents
```

### Quality Metrics

Expected outcomes:
- Multi-word phrase ratio: >80% (vs current 11%)
- Average keywords per document: 20-30
- Keyword score range: 0.5-1.0
- Processing time: <100ms per document (after chunks)
- Memory usage: Constant regardless of chunk count

## Performance Optimizations

### Optimization Strategies

1. **Embedding Cache Reuse**
   - Never regenerate embeddings already in LRU cache
   - Cache hit rate should be >90% for keywords

2. **Incremental Processing**
   - O(1) memory complexity for document embedding
   - No array concatenation or bulk operations

3. **Batch Database Operations**
   - Single transaction for all document-level updates
   - Prepared statements for efficiency

4. **Lazy Loading**
   - Only load embeddings when needed for scoring
   - Stream chunks instead of loading all at once

## Success Criteria

### Functional Requirements
- ✅ Document embeddings generated for all indexed documents
- ✅ 20-30 high-quality keywords per document
- ✅ Keywords have semantic scores (0.0-1.0)
- ✅ Multi-word phrase ratio >80%
- ✅ Database schema properly evolved

### Performance Requirements
- ✅ Memory usage constant regardless of document size
- ✅ Processing time <100ms per document (post-chunks)
- ✅ No regeneration of existing embeddings
- ✅ Cache hit rate >90% for keyword embeddings

### Quality Requirements
- ✅ Keywords represent document themes accurately
- ✅ Diversity in selected keywords (via MMR if needed)
- ✅ Scores correlate with human relevance judgment

## Rollback Plan

If issues arise:
1. Schema version can be reverted to 2
2. New columns are nullable - won't break existing code
3. Document-level processing is independent of chunk processing
4. Can disable document-level extraction via config flag

## Future Enhancements (Sprint 12+)

1. **Document Clustering**
   - Use document embeddings for similarity clustering
   - Auto-categorization of documents

2. **Smart Summarization**
   - Use top keywords to generate summaries
   - Extract key sentences near top keywords

3. **Cross-Document Linking**
   - Find related documents via embedding similarity
   - Build knowledge graphs from keyword relationships

4. **Query Expansion**
   - Use document keywords for query enhancement
   - Improve search recall with synonym matching

## Notes & Observations

### Why This Approach is Efficient

The key insight is that we're already doing the hard work at chunk level:
- Generating embeddings for 50 candidates per chunk
- Testing 7,850 total candidates for a 157-chunk document
- Document level only needs to test the "winners" from chunks

This is like a tournament structure:
- **Chunk Level**: Regional qualifiers (very thorough)
- **Document Level**: National finals (only the best compete)

### Avoiding Common Pitfalls

1. **Don't load all embeddings at once** - Use incremental averaging
2. **Don't regenerate embeddings** - Reuse from cache
3. **Don't over-optimize keywords** - Quality > Quantity
4. **Don't break existing functionality** - Add columns, don't modify

## Implementation Checklist

- [ ] Update database schema with new columns
- [ ] Increment schema version to trigger rebuild
- [ ] Implement IncrementalEmbeddingAverager
- [ ] Create DocumentKeywordScorer service
- [ ] Integrate into indexing orchestrator
- [ ] Add database queries for document semantics
- [ ] Run smoke test on all 5 test folders
- [ ] Verify memory usage stays constant
- [ ] Check keyword quality metrics
- [ ] Document any edge cases found

## References

- Welford's Online Algorithm: https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance#Welford's_online_algorithm
- KeyBERT Paper: https://arxiv.org/abs/2003.07278
- MMR (Maximal Marginal Relevance): Carbonell & Goldstein, 1998
- Cosine Similarity: https://en.wikipedia.org/wiki/Cosine_similarity