# Sprint: Semantic Extraction Quality Fix

**Sprint ID**: SEM-QUAL-2025-01
**Duration**: 1-2 weeks
**Priority**: Critical (Core Quality Issue)
**Status**: Awaiting MiniLM Normalization Fix
**Dependencies**: [MINI-SPRINT-Fix-MiniLM-Normalization.md](MINI-SPRINT-Fix-MiniLM-Normalization.md)

## Executive Summary

Replace the fundamentally broken semantic extraction in `ContentProcessingService` with a proper embedding-based extraction service that leverages our industry-leading models (BGE-M3, E5-Large, MiniLM) to produce quality semantic data instead of meaningless generic results.

## Problem Statement

### Current Broken State (Verified)
```sql
-- From BGE-M3 database
SELECT topics, key_phrases, readability_score FROM chunks LIMIT 1;
-- Result: ["general"]|["document","search","semantic"]|11.0
```

**What's Wrong**:
- **Topics**: Generic categories like `["general"]`, `["education"]` instead of domain-specific
- **Key Phrases**: Single words like `["document","search"]` instead of meaningful phrases
- **Readability**: Absurd scores like `3.0-11.0` instead of realistic `30-50` for technical docs

### Expected Quality Results
For our ML/semantic search test documents:
- **Topics**: `["machine learning", "semantic search", "document embedding", "natural language processing"]`
- **Key Phrases**: `["semantic search implementation", "machine learning models", "vector representations", "GPU acceleration"]`
- **Readability**: `30-50` (technical but readable documents)

## Architecture Design

### Current (Broken) Pipeline
```
Document → Chunks → ContentProcessingService.enhanceContent() → Broken semantic data
                           ↓
                     Word frequency + hardcoded dictionary
```

### New (Quality) Pipeline
```
Document → Chunks → Generate embeddings → SemanticExtractionService → Quality semantic data
                                    ↓
                            Embedding-based extraction
```

## Implementation Plan

### Phase 1: Core Semantic Extraction Service

#### 1.1 Create New Domain Service
**File**: `src/domain/semantic/extraction-service.ts`

```typescript
export interface ISemanticExtractionService {
  extractFromEmbeddings(
    text: string,
    embeddings: Float32Array
  ): Promise<SemanticData>;
}

export class EmbeddingBasedExtractor implements ISemanticExtractionService {
  constructor(private embeddingService: IEmbeddingService) {}

  async extractFromEmbeddings(text: string, embeddings: Float32Array): Promise<SemanticData> {
    // Use embeddings for extraction, not broken word frequency
    const keyPhrases = await this.extractQualityKeyPhrases(text, embeddings);
    const topics = await this.extractQualityTopics(text, embeddings);
    const readability = this.calculateProperReadability(text);

    return { topics, keyPhrases, readability };
  }
}
```

#### 1.2 Algorithm Modules
**Directory**: `src/domain/semantic/algorithms/`

**Key Phrase Extraction** (`ngram-keyphrase-extractor.ts`):
```typescript
export class NgramKeyphraseExtractor {
  async extractQualityKeyPhrases(text: string, documentEmbedding: Float32Array): Promise<string[]> {
    // 1. Generate n-grams (2-4 words)
    const ngrams = this.generateNGrams(text, [2, 3, 4]);

    // 2. Get embeddings for each n-gram
    const ngramEmbeddings = await this.embeddingService.embedBatch(ngrams);

    // 3. Score by similarity to document embedding
    const scoredPhrases = ngrams.map((ngram, i) => ({
      phrase: ngram,
      score: this.cosineSimilarity(ngramEmbeddings[i], documentEmbedding)
    }));

    // 4. Return top multiword phrases
    return scoredPhrases
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(p => p.phrase);
  }
}
```

**Topic Extraction** (`sentence-clustering-extractor.ts`):
```typescript
export class SentenceClusteringExtractor {
  async extractQualityTopics(text: string): Promise<string[]> {
    // 1. Split into sentences
    const sentences = this.splitIntoSentences(text);

    // 2. Get embeddings for each sentence
    const sentenceEmbeddings = await this.embeddingService.embedBatch(sentences);

    // 3. Cluster embeddings (HDBSCAN-style)
    const clusters = this.clusterEmbeddings(sentenceEmbeddings);

    // 4. Extract topic labels from cluster centroids
    return this.extractTopicLabelsFromClusters(clusters, sentences);
  }
}
```

**Readability Calculator** (`proper-readability-calculator.ts`):
```typescript
export class ProperReadabilityCalculator {
  calculateFleschKincaid(text: string): number {
    // FIX the broken syllable counting and sentence detection
    const sentences = this.properSentenceDetection(text);
    const words = this.properWordTokenization(text);
    const syllables = words.reduce((total, word) =>
      total + this.accurateSyllableCounting(word), 0
    );

    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;

    // Correct Flesch Reading Ease formula
    const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    return Math.max(0, Math.min(100, Math.round(score)));
  }
}
```

### Phase 2: Pipeline Integration

#### 2.1 Integration Point
**File**: `src/application/indexing/orchestrator.ts`

```typescript
// OLD (broken):
const enhanced = contentProcessor.enhanceContent(parsedContent);

// NEW (quality):
const chunkEmbedding = await embeddingService.embed(chunk.content);
const semanticData = await semanticExtractor.extractFromEmbeddings(
  chunk.content,
  chunkEmbedding
);
```

#### 2.2 Dependency Injection
**File**: `src/di/setup.ts`

```typescript
// Register new semantic extraction service
container.register(TOKENS.SemanticExtractionService, {
  useFactory: (container) => new EmbeddingBasedExtractor(
    container.resolve(TOKENS.EmbeddingService)
  )
});
```

## Validation Strategy (TMOAT Approach)

### Test Setup
Use existing 5 test folders with known content:
- `/tmp/test-gpu-bge-m3/` (3 ML/semantic search docs)
- `/tmp/test-gpu-multilingual-e5-large/` (same docs)
- etc.

### Validation Tests

#### Test 1: Before/After Database Comparison
```bash
# 1. Capture current broken state
sqlite3 /tmp/test-gpu-multilingual-e5-large/.folder-mcp/embeddings.db \
"SELECT topics, key_phrases, readability_score FROM chunks" > /tmp/before.txt

# 2. Implement semantic extraction service

# 3. Re-index with new extraction
rm -rf /tmp/test-gpu-multilingual-e5-large/.folder-mcp/
npm run daemon:restart  # Background process

# 4. Compare results
sqlite3 /tmp/test-gpu-multilingual-e5-large/.folder-mcp/embeddings.db \
"SELECT topics, key_phrases, readability_score FROM chunks" > /tmp/after.txt

diff /tmp/before.txt /tmp/after.txt
```

#### Test 2: Quality Metrics Validation
```javascript
// Create quality scoring script
const qualityTests = [
  {
    metric: 'multiword_phrase_ratio',
    current: 0.1,  // 10% multiword (broken)
    target: 0.8,   // 80% multiword (quality)
    test: phrases => phrases.filter(p => p.split(' ').length > 1).length / phrases.length
  },
  {
    metric: 'topic_specificity',
    current: ['general', 'education'],  // Generic
    target: ['machine learning', 'semantic search'],  // Domain-specific
    test: topics => !topics.includes('general') && !topics.includes('technology')
  },
  {
    metric: 'readability_realism',
    current: 8.5,   // Absurdly low
    target: 45.0,   // Realistic for technical docs
    test: score => score >= 30 && score <= 60
  }
];
```

#### Test 3: Cross-Model Consistency
```bash
# Test all 5 models produce quality semantic data
for folder in /tmp/test-*; do
  echo "Testing $folder..."
  # Re-index and validate
done
```

#### Test 4: MCP Endpoint Verification
```bash
# Test MCP server with improved semantic data
folder-mcp mcp server /tmp/test-gpu-multilingual-e5-large

# Should return quality topics and phrases via search
```

### Expected Results

#### Before Fix (Current):
```json
{
  "topics": ["general"],
  "key_phrases": ["document", "search", "semantic"],
  "readability_score": 8.5
}
```

#### After Fix (Target):
```json
{
  "topics": ["machine learning", "semantic search", "document embedding"],
  "key_phrases": ["semantic search implementation", "machine learning models", "vector representations"],
  "readability_score": 42.3
}
```

## Success Criteria

### Quantitative Metrics
- [ ] **Multiword Phrase Ratio**: ≥80% (currently ~10%)
- [ ] **Topic Specificity**: Zero generic topics ("general", "technology")
- [ ] **Readability Accuracy**: 30-60 range for technical docs (currently 3-15)
- [ ] **Cross-Model Consistency**: All 5 models pass quality tests

### Qualitative Assessment
- [ ] Topics reflect actual document domains (ML, NLP, search)
- [ ] Key phrases are meaningful business concepts
- [ ] Readability scores match human intuition
- [ ] Search relevance improves significantly

## Risk Management

### Technical Risks
1. **Embedding Quality Dependency**: Relies on good embeddings
   - *Mitigation*: Validation shows 4/5 models have excellent embeddings
   - *Status*: MiniLM normalization fix addresses remaining model

2. **Performance Impact**: Multiple embedding calls during extraction
   - *Mitigation*: Batch processing, leverage existing embeddings where possible
   - *Monitoring*: Track indexing time before/after

3. **Algorithm Complexity**: HDBSCAN clustering may be complex
   - *Mitigation*: Start with simpler k-means, upgrade if needed
   - *Fallback*: TF-IDF based clustering if embedding approach fails

### Integration Risks
1. **Pipeline Disruption**: Changes to core indexing flow
   - *Mitigation*: Feature flag for old vs new extraction
   - *Rollback*: Keep old ContentProcessingService as backup

2. **Database Schema Changes**: May need new columns
   - *Mitigation*: Work within existing schema initially
   - *Future*: Schema migrations if enhanced data needed

## Timeline

### Week 1: Implementation
- **Days 1-2**: Core semantic extraction service
- **Days 3-4**: Algorithm modules (phrases, topics, readability)
- **Day 5**: Integration with indexing pipeline

### Week 2: Testing & Validation
- **Days 1-2**: TMOAT validation with test folders
- **Days 3-4**: Cross-model testing and optimization
- **Day 5**: Performance testing and edge cases

## Deliverables

### Code Artifacts
- [ ] `SemanticExtractionService` implementation
- [ ] Algorithm modules for phrases, topics, readability
- [ ] Integration with indexing orchestrator
- [ ] Updated dependency injection configuration

### Validation Artifacts
- [ ] Before/after quality comparison reports
- [ ] Cross-model validation results
- [ ] Performance benchmarks
- [ ] TMOAT test scripts and results

### Documentation
- [ ] Architecture decision record
- [ ] API documentation for new service
- [ ] Migration guide for transition
- [ ] Quality benchmarking methodology

## Definition of Done

- [ ] All 5 models produce quality semantic extraction
- [ ] Quantitative success criteria met (≥80% multiword phrases, etc.)
- [ ] TMOAT validation passes across all test folders
- [ ] MCP endpoints return improved semantic data
- [ ] No performance regression in indexing pipeline
- [ ] Documentation complete and accurate

---

**Prerequisites**: MiniLM normalization fixed
**Blocks**: Future semantic search improvements
**Owner**: TBD
**Quality Reviewer**: TMOAT validation + manual verification
**Technical Reviewer**: Architecture compliance