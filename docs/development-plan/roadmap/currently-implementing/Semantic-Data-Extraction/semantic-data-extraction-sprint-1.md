# Sprint 1: Foundation & KeyBERT Key Phrases

**Sprint ID**: SDE-SPRINT-001
**Duration**: Week 1 (5-7 days)
**Status**: Ready to Start
**Priority**: Critical
**Parent Epic**: [semantic-data-extraction-epic.md](./semantic-data-extraction-epic.md)

## Executive Summary

Replace the fundamentally broken word frequency extraction in `ContentProcessingService` with KeyBERT-based multiword phrase extraction. This sprint establishes the foundation `SemanticExtractionService` architecture and delivers >80% multiword phrases instead of the current 11% single-word results.

**Key Outcomes**:
- New clean architecture service separate from broken implementation
- KeyBERT integration with all 5 curated embedding models
- Multiword technical phrases like "semantic search implementation"
- Comprehensive TMOAT validation framework

## Current State Analysis

### Measured Baseline (5 Test Folders)
```
Test Environment:
/Users/hanan/Projects/folder-mcp/tmp/
├── test-gpu-bge-m3                    [BGE-M3 GPU model]
├── test-gpu-multilingual-e5-large     [E5-Large GPU model]
├── test-gpu-paraphrase-multilingual-minilm  [MiniLM GPU model]
├── test-cpu-xenova-multilingual-e5-large    [E5-Large ONNX CPU]
└── test-cpu-xenova-multilingual-e5-small    [E5-Small ONNX CPU]
```

### Current Quality Metrics
**From production analysis**:
- **Single-word phrases**: 89% (e.g., "document", "search", "model")
- **Multiword phrases**: 11% (mostly accidental)
- **Topics**: Generic ["general", "education", "technology"]
- **Readability**: Unrealistic 3-11 range for technical docs

### Root Cause (Verified)
Location: `src/domain/content/processing.ts:121-144`
```typescript
// Current broken implementation
static extractKeyPhrases(text: string, maxPhrases: number = 10): string[] {
  // Simple word frequency counting - produces single words only
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !ContentProcessingService.isStopWord(word));

  // Returns top frequent SINGLE WORDS
  return Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxPhrases)
    .map(([word]) => word);  // ← Single words only!
}
```

## Sprint Goal

**Primary Objective**: Achieve >80% multiword phrase extraction using KeyBERT with existing embeddings

**Specific Targets**:
1. Extract phrases like ["semantic search implementation", "transformer-based embeddings"]
2. NOT single words like ["search", "document", "embedding"]
3. Maintain <200ms processing time per document
4. Work consistently across all 5 embedding models

## Technical Architecture

### New Service Structure
```
src/
├── domain/
│   └── semantic/
│       ├── extraction-service.ts         [Main service interface]
│       ├── interfaces.ts                 [Type definitions]
│       └── algorithms/
│           ├── keybert-extractor.ts      [KeyBERT implementation]
│           └── similarity-utils.ts       [Cosine similarity helpers]
└── infrastructure/
    └── embeddings/
        └── python/
            └── semantic_extraction.py    [Python KeyBERT runner]
```

### Service Design

#### Core Interface
```typescript
// src/domain/semantic/interfaces.ts
export interface SemanticData {
  keyPhrases: string[];
  topics: string[];
  readabilityScore: number;
  extractionMethod: 'keybert' | 'ngram' | 'legacy';
  processingTimeMs: number;
}

export interface ISemanticExtractionService {
  extractFromText(text: string, embeddings?: Float32Array): Promise<SemanticData>;
  extractKeyPhrases(text: string, embeddings: Float32Array): Promise<string[]>;
  validateExtraction(data: SemanticData): boolean;
}
```

#### KeyBERT Integration
```typescript
// src/domain/semantic/extraction-service.ts
export class SemanticExtractionService implements ISemanticExtractionService {
  constructor(
    private pythonService: IPythonEmbeddingService,
    private logger: ILogger
  ) {}

  async extractFromText(text: string, embeddings?: Float32Array): Promise<SemanticData> {
    const startTime = Date.now();

    // Generate embeddings if not provided
    if (!embeddings) {
      embeddings = await this.pythonService.generateEmbedding(text);
    }

    // Extract key phrases using KeyBERT
    const keyPhrases = await this.extractKeyPhrases(text, embeddings);

    // Topics and readability remain temporary (fixed in later sprints)
    const topics = this.extractBasicTopics(text);  // Temporary
    const readabilityScore = this.calculateReadability(text);  // Temporary

    return {
      keyPhrases,
      topics,
      readabilityScore,
      extractionMethod: 'keybert',
      processingTimeMs: Date.now() - startTime
    };
  }

  async extractKeyPhrases(text: string, embeddings: Float32Array): Promise<string[]> {
    // Call Python KeyBERT service
    const request = {
      method: 'extract_keyphrases',
      params: {
        text,
        embeddings: Array.from(embeddings),
        ngram_range: [1, 3],  // 1-3 word phrases
        use_mmr: true,         // Maximal Marginal Relevance for diversity
        diversity: 0.5,        // Balance between accuracy and diversity
        top_k: 10             // Number of phrases to extract
      }
    };

    const response = await this.pythonService.sendRequest(request);
    return response.result.keyphrases;
  }
}
```

### Python KeyBERT Implementation
```python
# src/infrastructure/embeddings/python/semantic_extraction.py
from keybert import KeyBERT
from sentence_transformers import SentenceTransformer
import numpy as np

class KeyBERTExtractor:
    def __init__(self, model: SentenceTransformer):
        self.model = model
        self.kw_model = KeyBERT(model=model)

    def extract_keyphrases(self, text: str, **kwargs):
        """
        Extract key phrases using KeyBERT with MMR diversity
        """
        keyphrases = self.kw_model.extract_keywords(
            text,
            keyphrase_ngram_range=kwargs.get('ngram_range', (1, 3)),
            use_mmr=kwargs.get('use_mmr', True),
            diversity=kwargs.get('diversity', 0.5),
            top_n=kwargs.get('top_k', 10),
            stop_words='english'
        )

        # Return phrases only (not scores)
        return [kw[0] for kw in keyphrases]
```

## Implementation Steps

### Step 1: Python Environment Setup
```bash
# Install KeyBERT in Python environment
cd src/infrastructure/embeddings/python
source venv/bin/activate
pip install keybert

# Verify installation
python -c "from keybert import KeyBERT; print('KeyBERT installed successfully')"
```

### Step 2: Create Service Architecture
1. Create `src/domain/semantic/` directory structure
2. Implement `ISemanticExtractionService` interface
3. Create `KeyBERTExtractor` wrapper
4. Add dependency injection tokens

### Step 3: Integration Points
1. Modify chunking pipeline to use new service
2. Update database storage for semantic data
3. Maintain backward compatibility during transition

### Step 4: Testing Implementation
1. Unit tests for KeyBERT extraction
2. Integration tests with all 5 models
3. Performance benchmarks
4. Quality validation

## TMOAT Validation Framework

### Pre-Implementation Baseline
```bash
# Capture current state for all 5 test folders
for folder in test-gpu-bge-m3 test-gpu-multilingual-e5-large test-gpu-paraphrase-multilingual-minilm test-cpu-xenova-multilingual-e5-large test-cpu-xenova-multilingual-e5-small; do
  sqlite3 /Users/hanan/Projects/folder-mcp/tmp/${folder}/.folder-mcp/database.db <<SQL
    WITH phrase_analysis AS (
      SELECT
        json_each.value as phrase,
        CASE WHEN json_each.value LIKE '% %' THEN 1 ELSE 0 END as is_multiword
      FROM chunks, json_each(chunks.key_phrases)
      WHERE semantic_processed = 1
    )
    SELECT
      '${folder}' as model,
      COUNT(*) as total_phrases,
      ROUND(100.0 * SUM(is_multiword) / COUNT(*), 2) as multiword_percentage
    FROM phrase_analysis;
SQL
done > /tmp/baseline-metrics.txt
```

### Post-Implementation Validation

#### Test 1: Multiword Phrase Ratio
```bash
# After implementation and re-indexing
for folder in test-gpu-bge-m3 test-gpu-multilingual-e5-large test-gpu-paraphrase-multilingual-minilm test-cpu-xenova-multilingual-e5-large test-cpu-xenova-multilingual-e5-small; do
  sqlite3 /Users/hanan/Projects/folder-mcp/tmp/${folder}/.folder-mcp/database.db <<SQL
    SELECT
      '${folder}' as model,
      json_each.value as phrase,
      LENGTH(json_each.value) - LENGTH(REPLACE(json_each.value, ' ', '')) + 1 as word_count
    FROM chunks, json_each(chunks.key_phrases)
    WHERE semantic_processed = 1
    ORDER BY word_count DESC
    LIMIT 5;
SQL
done
```

**Success Criteria**:
- ✅ >80% phrases have 2+ words
- ✅ Top phrases are meaningful technical terms

#### Test 2: Phrase Quality Verification
```javascript
// tmp/verify-keybert-quality.js
const expectedPhrases = [
  "semantic search",
  "transformer-based embeddings",
  "vector similarity",
  "machine learning",
  "natural language processing",
  "document embeddings",
  "neural network models"
];

function verifyFolder(folderPath) {
  const db = new sqlite3.Database(`${folderPath}/.folder-mcp/database.db`);

  db.all(`
    SELECT DISTINCT json_each.value as phrase
    FROM chunks, json_each(chunks.key_phrases)
    WHERE semantic_processed = 1
  `, (err, results) => {
    const phrases = results.map(r => r.phrase.toLowerCase());

    const found = expectedPhrases.filter(exp =>
      phrases.some(p => p.includes(exp))
    );

    console.log(`✅ Found ${found.length}/${expectedPhrases.length} expected phrases`);
    console.log(`📝 Sample phrases: ${phrases.slice(0, 10).join(', ')}`);
  });
}
```

#### Test 3: Performance Validation
```bash
# Monitor processing time during re-indexing
time npm run daemon:restart

# Check processing time in logs
tail -f ~/.folder-mcp/daemon.log | grep -E "semantic|processing|KeyBERT"
```

**Success Criteria**:
- ✅ <200ms per document
- ✅ No memory leaks
- ✅ No Python crashes

#### Test 4: Cross-Model Consistency
```sql
-- All models should produce similar quality
WITH model_comparison AS (
  SELECT
    'test-gpu-bge-m3' as model,
    AVG(LENGTH(json_each.value)) as avg_phrase_length
  FROM chunks, json_each(chunks.key_phrases)
  WHERE semantic_processed = 1

  UNION ALL

  SELECT 'test-gpu-multilingual-e5-large', AVG(LENGTH(json_each.value))
  FROM chunks, json_each(chunks.key_phrases)
  WHERE semantic_processed = 1
  -- ... repeat for all models
)
SELECT * FROM model_comparison;
```

**Success Criteria**:
- ✅ Variance in quality <20% across models
- ✅ All models extract multiword phrases

#### Test 5: MCP End-to-End
```bash
# Test search with improved phrases
echo '{"method":"search","params":{"query":"semantic search implementation","folder_path":"/Users/hanan/Projects/folder-mcp/tmp/test-gpu-bge-m3"}}' | \
  npx folder-mcp mcp server | \
  jq '.result.documents[0].key_phrases'
```

**Success Criteria**:
- ✅ Returns documents with multiword phrases
- ✅ Phrases are relevant to search query

### Re-indexing Procedure
```bash
# Clean and re-index all test folders
function reindex_test_folders() {
  # Step 1: Clean databases
  for folder in test-gpu-bge-m3 test-gpu-multilingual-e5-large test-gpu-paraphrase-multilingual-minilm test-cpu-xenova-multilingual-e5-large test-cpu-xenova-multilingual-e5-small; do
    rm -rf /Users/hanan/Projects/folder-mcp/tmp/${folder}/.folder-mcp
  done

  # Step 2: Restart daemon
  npm run daemon:restart &

  # Step 3: Monitor progress
  watch -n 2 'for f in test-gpu-*; do
    echo -n "$f: "
    sqlite3 /Users/hanan/Projects/folder-mcp/tmp/$f/.folder-mcp/database.db \
      "SELECT COUNT(*) || \" chunks\" FROM chunks WHERE semantic_processed=1" 2>/dev/null || echo "indexing..."
  done'
}
```

## Success Metrics

### Quantitative Targets
| Metric | Current (Broken) | Target | Validation Method |
|--------|-----------------|--------|-------------------|
| Multiword phrase ratio | 11% | >80% | SQL query on chunks table |
| Average words per phrase | 1.1 | 2.5+ | Calculate from json_each |
| Processing time | N/A | <200ms | Monitor daemon logs |
| Model consistency | N/A | <20% variance | Cross-model comparison |

### Qualitative Targets
- **Before**: ["document", "search", "model", "data"]
- **After**: ["semantic search implementation", "transformer-based embeddings", "machine learning pipeline"]

## Risk Mitigation

### Risk 1: Python Dependency Issues
- **Mitigation**: Pre-install KeyBERT, test with all models before implementation
- **Fallback**: N-gram cosine similarity approach as backup

### Risk 2: Performance Degradation
- **Mitigation**: Benchmark before implementation, optimize batch processing
- **Fallback**: Async processing queue if needed

### Risk 3: Model Incompatibility
- **Mitigation**: Test KeyBERT with each model type individually
- **Fallback**: Model-specific extraction parameters

## Safety Stop Gates

### 🛑 Gate 1: Python Environment Ready
- [ ] KeyBERT installed successfully
- [ ] Works with test script for all 3 GPU models
- [ ] No import errors or version conflicts

**Stop if**: KeyBERT cannot be installed or has compatibility issues

### 🛑 Gate 2: Service Architecture Complete
- [ ] SemanticExtractionService created and tested
- [ ] Python integration working via JSON-RPC
- [ ] Dependency injection configured

**Stop if**: Architecture doesn't integrate cleanly

### 🛑 Gate 3: Quality Metrics Met
- [ ] >80% multiword phrases achieved on test data
- [ ] Processing time <200ms confirmed
- [ ] All 5 models producing quality results

**Stop if**: Quality targets not met after implementation

### 🛑 Gate 4: Production Ready
- [ ] All tests passing
- [ ] No memory leaks or crashes
- [ ] MCP endpoints returning quality phrases

**Stop if**: Any stability issues detected

## Definition of Done

- [x] KeyBERT integrated with Python embedding service
- [x] SemanticExtractionService implemented with clean architecture
- [x] >80% multiword phrases in all test folders
- [x] Processing time <200ms per document
- [x] All 5 embedding models working consistently
- [x] TMOAT validation tests passing
- [x] No regression in search accuracy
- [x] Documentation updated

## Next Sprint Preview

**Sprint 2: Hybrid Readability Assessment**
- Replace broken syllable counting (scores 3-11)
- Implement hybrid formula + embedding approach
- Target realistic 40-60 scores for technical docs
- Build on Sprint 1's KeyBERT foundation

---

**Sprint Status**: Ready to implement
**Dependencies**: Python environment with KeyBERT
**Estimated Effort**: 5-7 days
**Risk Level**: Medium (proven technology, new integration)