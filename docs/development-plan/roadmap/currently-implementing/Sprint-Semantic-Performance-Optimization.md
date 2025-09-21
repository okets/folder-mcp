# Sprint: Semantic Extraction Performance Optimization

## Sprint Overview
**Goal**: Optimize semantic extraction to reduce indexing time by 80-90% while maintaining quality
**Priority**: CRITICAL - System is currently unusable with 20-260x performance regression
**Duration**: 1-2 days
**Success Metric**: Indexing 5 files in under 2 seconds (from current 5-26 seconds)

## Problem Statement
After implementing semantic extraction in Sprint 0, indexing performance degraded catastrophically:
- **Before**: ~100ms for 5 files
- **After (ONNX)**: 2-5 seconds for 5 files (20-50x slower)
- **After (PyTorch)**: 10-26 seconds for 5 files (100-260x slower)

### Root Causes Identified
1. **Individual Embedding Calls**: Generating embeddings for each n-gram candidate individually
2. **No Batching**: Missing batch processing at multiple levels
3. **No Caching**: Re-computing embeddings for common phrases
4. **Excessive Candidates**: Processing 50-200 n-grams per chunk before filtering
5. **Double Processing**: Chunks embedded twice (semantic extraction + storage)

## Implementation Tasks

### Task 1: Batch N-gram Embeddings (ONNX Models)
**Priority**: HIGH
**Impact**: 70-80% performance improvement
**File**: `src/domain/semantic/algorithms/ngram-cosine-extractor.ts`

**Changes**:
- Replace individual `generateEmbedding()` calls with batched `generateEmbeddings()`
- Modify `generateCandidateEmbeddings()` method (lines 165-189)
- Send all candidates in a single batch instead of using `Promise.all()` on individual calls

**Implementation**:
```typescript
// OLD: Individual calls
const batchEmbeddings = await Promise.all(
  batch.map(candidate => this.embeddingModel!.generateEmbedding(candidate))
);

// NEW: Batched call
const batchEmbeddings = await this.embeddingModel!.generateEmbeddings(batch);
```

### Task 2: Batch KeyBERT Processing (PyTorch Models)
**Priority**: HIGH
**Impact**: 70-80% performance improvement
**Files**:
- `src/domain/semantic/extraction-service.ts`
- `src/application/indexing/orchestrator.ts`

**Changes**:
- Process multiple chunks in a single Python service call
- Batch KeyBERT extraction at document level
- Reduce IPC overhead

### Task 3: Implement Embedding Cache
**Priority**: MEDIUM
**Impact**: 20-30% improvement for similar content
**File**: `src/domain/semantic/algorithms/ngram-cosine-extractor.ts`

**Implementation**:
```typescript
class NGramCosineExtractor {
  private embeddingCache: Map<string, Float32Array> = new Map();
  private readonly MAX_CACHE_SIZE = 1000;

  private async getCachedOrGenerate(text: string): Promise<Float32Array> {
    if (this.embeddingCache.has(text)) {
      return this.embeddingCache.get(text)!;
    }
    const embedding = await this.embeddingModel!.generateEmbedding(text);
    // LRU eviction if cache is full
    if (this.embeddingCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.embeddingCache.keys().next().value;
      this.embeddingCache.delete(firstKey);
    }
    this.embeddingCache.set(text, embedding);
    return embedding;
  }
}
```

### Task 4: Reduce N-gram Candidates
**Priority**: MEDIUM
**Impact**: 30-50% fewer embeddings needed
**File**: `src/domain/semantic/algorithms/ngram-utils.ts`

**Changes**:
- Limit candidates to top 30-50 by frequency
- Apply TF-IDF pre-filtering
- Stricter quality filters before embedding generation

### Task 5: Eliminate Double Embedding (ONNX)
**Priority**: LOW
**Impact**: 50% reduction in embedding calls for ONNX
**File**: `src/application/indexing/orchestrator.ts`

**Changes**:
- Reuse embeddings from semantic extraction for vector storage
- Pass embeddings through the pipeline instead of regenerating

### Task 6: Add Performance Metrics
**Priority**: LOW
**Impact**: Better monitoring and debugging
**Files**: Various

**Changes**:
- Add timing measurements for each stage
- Log batch sizes and cache hit rates
- Track embeddings per minute (EPM)

## Testing Strategy

### Performance Benchmarks
1. **Baseline**: Record current timings with test folders
2. **After Each Task**: Measure improvement
3. **Target Metrics**:
   - ONNX: < 1 second for 5 files
   - PyTorch: < 2 seconds for 5 files
   - Cache hit rate: > 30% for similar content

### Test Folders
- `/tmp/test-gpu-multilingual-e5-large` (PyTorch)
- `/tmp/test-gpu-bge-m3` (PyTorch)
- `/tmp/test-gpu-xenova-multilingual-e5-small` (ONNX)
- `/tmp/test-gpu-xenova-multilingual-e5-large` (ONNX)

### Validation
- Verify semantic extraction quality remains consistent
- Check multiword phrase ratio stays > 60%
- Ensure no regression in search quality

## Rollback Plan
If optimizations cause issues:
1. **Quick disable**: Add environment variable to skip semantic extraction
2. **Gradual rollback**: Revert individual optimizations
3. **Emergency**: Full revert to commit before Sprint 0

## Success Criteria
- [ ] Indexing time reduced by 80% or more
- [ ] No degradation in semantic extraction quality
- [ ] All existing tests pass
- [ ] Performance metrics logged for monitoring
- [ ] Cache implementation tested with memory limits

## Code Quality Requirements
- Clean, readable code with clear comments
- Proper error handling for batch operations
- Memory management for caches
- Backward compatibility maintained

## Implementation Order
1. **Immediate Fix**: Task 1 (Batch n-grams) - Biggest impact
2. **Quick Win**: Task 4 (Reduce candidates) - Easy to implement
3. **Major Fix**: Task 2 (Batch KeyBERT) - High impact for PyTorch
4. **Enhancement**: Task 3 (Caching) - Good for repeated content
5. **Optimization**: Task 5 (Eliminate double embedding)
6. **Monitoring**: Task 6 (Metrics)

## Risk Mitigation
- **Risk**: Batching might exceed memory limits
  - **Mitigation**: Implement adaptive batch sizing
- **Risk**: Cache might grow too large
  - **Mitigation**: LRU eviction with configurable size
- **Risk**: Quality degradation from fewer candidates
  - **Mitigation**: Monitor multiword ratio and adjust thresholds

## Notes
- Priority is to make the system usable again
- Semantic extraction should be optimized, not removed
- Focus on batching as primary optimization
- Cache is secondary but helpful for similar content
- Monitor performance continuously during implementation