# Sprint 3: Model-Specific Indexing Optimizations

**Sprint ID**: SDE-SPRINT-3-2025-001
**Epic**: Semantic Data Extraction Quality Overhaul
**Duration**: 2-3 days
**Status**: Planning
**Priority**: Critical (Make-or-Break)

## Executive Summary

Sprint 3 implements model-specific optimizations during the **indexing phase only**. This sprint focuses on ensuring that when we generate embeddings for document chunks, we use each model according to its training methodology for optimal quality.

**Key Focus**: E5 models require "passage:" prefixes when embedding document content and L2 normalization. These optimizations happen during indexing, with the search-side optimizations handled in the next epic.

**Key Innovation**: We maintain `curated-models.json` as the single source of truth by adding a `capabilities` field to each model definition, enabling auto-discovery of optimization opportunities without hardcoded logic.

## Goals & Success Criteria

### Primary Goals
1. **E5 Passage Prefixes**: Implement "passage:" prefixes for E5 models during document embedding
2. **E5 L2 Normalization**: Apply proper L2 normalization for E5 model embeddings
3. **Configuration-Driven**: All optimizations declared in curated-models.json capabilities
4. **Indexing Focus**: Optimize only the embedding generation phase, not search

### Success Criteria (Measurable)
- **E5 Prefixes**: All E5 model document embeddings use "passage:" prefix format
- **E5 Normalization**: L2 normalization applied to all E5 model embeddings
- **Configuration**: Model capabilities properly loaded from curated-models.json
- **Performance**: Optimization overhead <10% of baseline indexing time
- **Compatibility**: All models continue working in non-optimized mode

## Risk Assessment

### Complexity Level: Low-Medium ⚠️

**Risk Areas:**

1. **E5 Prefix Implementation (MEDIUM RISK 🟡)**
   - **Text Preprocessing**: Modifies document text before embedding generation
   - **Consistency Critical**: Must match with search-side query prefixes (next epic)
   - **Regression Risk**: Could break existing E5 model usage if incorrectly applied

2. **Configuration Architecture (LOW RISK 🟢)**
   - **Schema Evolution**: Adding capabilities to curated-models.json
   - **Loading Logic**: TypeScript capability detection

3. **Python Integration (LOW RISK 🟢)**
   - **No New Dependencies**: Uses existing sentence-transformers library
   - **Simple Changes**: Text preprocessing and tensor normalization only

### Required Dependencies
```python
# No new dependencies required for Sprint 3
# Uses existing sentence-transformers and torch
torch>=2.0.0                 # Already have
sentence-transformers>=2.2.0 # Already have
```

### Mitigation Strategies
- **A/B Testing**: Compare prefixed vs non-prefixed embeddings for quality
- **Feature Flags**: Ability to disable E5 optimizations if issues arise
- **Rollback Plan**: Simple revert of prefix formatting logic
- **Search Coordination**: Document requirements for next epic's query-side implementation

## Architecture Overview

### Configuration-Driven Design

We extend `curated-models.json` with a `capabilities` object for each model:

```json
{
  "id": "gpu:bge-m3",
  "huggingfaceId": "BAAI/bge-m3",
  "capabilities": {
    "dense": true,
    "sparse": true,
    "colbert": true,
    "requiresPrefix": false,
    "requiresNormalization": false
  }
}
```

### Benefits of This Approach:
1. **Single Source of Truth**: All model metadata in curated-models.json
2. **Auto-Discovery**: No hardcoded model detection logic
3. **Future-Proof**: New models just declare their capabilities
4. **Type-Safe**: Generate TypeScript interfaces from configuration

## Technical Implementation

### Indexing-Phase Model Optimizations

#### 1. E5 Passage Prefix Formatting (During Indexing)
```python
# E5 models were trained with "passage:" prefix for document content
def optimize_text_for_embedding(text: str, model_name: str, text_type: str = 'passage') -> str:
    if model_name.startswith('intfloat/multilingual-e5'):
        # During indexing, all document chunks get "passage:" prefix
        return f"passage: {text}"

    # Other models use text as-is
    return text

# During document chunk embedding
optimized_text = optimize_text_for_embedding(chunk_content, model_name)
embedding = model.encode([optimized_text])

# Apply L2 normalization for E5 models
if model_name.startswith('intfloat/multilingual-e5'):
    embedding = F.normalize(embedding, p=2, dim=1)
```

**Critical Note**: Search queries will need "query:" prefix in the next epic for consistency.

#### 2. Model Capability Matrix (Indexing Focus)

| Model | Dense | Passage Prefix | L2 Norm | Next Epic Needs |
|-------|-------|----------------|---------|-----------------|
| BGE-M3 | ✅ | ❌ | ❌ | Query embedding as-is |
| E5-Large | ✅ | ✅ "passage:" | ✅ | Query "query:" prefix |
| E5-Small | ✅ | ✅ "passage:" | ✅ | Query "query:" prefix |
| MiniLM-L12 | ✅ | ❌ | ❌ | Query embedding as-is |

#### 3. Expected Improvement from E5 Optimization
- **Consistency**: Document embeddings generated as E5 models expect
- **Foundation**: Sets up proper similarity matching for next epic's search optimization
- **Quality**: Better semantic understanding when search queries also use proper prefixes

## Critical Discovery: Stale Code & KeyBERT Impact

### 🚨 Stale Code Cleanup Required

**Discovery**: We have TWO competing keyword extraction systems in the codebase:

1. **OLD BROKEN**: `ContentProcessingService.extractKeyPhrases()` - Simple word frequency counting (the broken approach from the epic)
2. **NEW WORKING**: `SemanticExtractionService.extractKeyPhrases()` - KeyBERT implementation (built in Sprint 1)

**Problem**: `enhanced-processing.ts` still calls the OLD broken system:
```typescript
// WRONG - using broken word frequency approach
const keyPhrases = ContentProcessingService.extractKeyPhrases(content, maxKeyPhrases);
```

**Required Fix**: Replace with SemanticExtractionService to use KeyBERT implementation.

### KeyBERT and E5 Prefix Integration

**Critical Finding**: KeyBERT shares the same embedding model that will receive E5 prefixes.

**Impact Chain**:
```
E5 Prefixes → Shared SentenceTransformer Model → KeyBERT Uses Same Model → Keywords Affected
```

**Expected Outcome**: POSITIVE impact - E5 models work better with proper prefixes, improving both embeddings AND keyword extraction quality.

**Validation Required**: Ensure "passage:" prefix doesn't appear in extracted keywords and quality maintains/improves.

## TMOAT Testing Strategy

### Simplified Test-Driven Implementation

Focus on E5 optimization and configuration validation only.

### Phase 1: Configuration Validation (Day 1)

#### Test 1.1: Configuration Schema Loading
**Goal**: Verify curated-models.json loads with E5 capabilities
```bash
node -e "
const config = require('./src/config/curated-models.json');
const e5Model = config.gpuModels.models.find(m => m.huggingfaceId.includes('e5-large'));
console.log('E5 capabilities:', e5Model.capabilities);
"
```
**Success Criteria**: E5 capabilities object exists with requiresPrefix and requiresNormalization
**TMOAT Validation**: TypeScript compilation succeeds with new schema

### Phase 2: E5 Optimization Testing (Day 2)

#### Test 2.1: E5 Prefix Impact Measurement
**Goal**: Validate E5 prefix formatting improves similarity matching AND KeyBERT quality
**Method**: A/B test with passage vs query prefixes + KeyBERT validation
```python
# Test E5 prefix consistency (indexing simulation)
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import torch.nn.functional as F
from keybert import KeyBERT

model = SentenceTransformer('intfloat/multilingual-e5-large')
kw_model = KeyBERT(model=model)

query_text = "machine learning model optimization"
passage_text = "techniques for improving neural network performance"

# Method 1: No prefixes (current)
emb_q1 = model.encode([query_text])
emb_p1 = model.encode([passage_text])
sim1 = cosine_similarity(emb_q1, emb_p1)[0][0]

# KeyBERT without prefixes
keywords_old = kw_model.extract_keywords(passage_text, top_k=5)

# Method 2: Proper prefixes (Sprint 3 + next epic)
emb_q2 = model.encode([f"query: {query_text}"])
emb_p2 = model.encode([f"passage: {passage_text}"])

# Apply L2 normalization
emb_q2 = F.normalize(torch.tensor(emb_q2), p=2, dim=1).numpy()
emb_p2 = F.normalize(torch.tensor(emb_p2), p=2, dim=1).numpy()

sim2 = cosine_similarity(emb_q2, emb_p2)[0][0]

# KeyBERT with prefixes
keywords_new = kw_model.extract_keywords(f"passage: {passage_text}", top_k=5)

improvement = ((sim2 - sim1) / sim1) * 100
print(f"Without prefixes: {sim1:.4f}")
print(f"With prefixes + L2: {sim2:.4f}")
print(f"Improvement: {improvement:.2f}%")

print(f"Keywords without prefix: {keywords_old}")
print(f"Keywords with prefix: {keywords_new}")

# Validate no "passage" in keywords
assert not any("passage" in kw[0].lower() for kw in keywords_new), "Prefix leaked into keywords!"
```
**Success Criteria**:
- Prefix + normalization shows >5% embedding improvement
- KeyBERT quality maintains or improves
- No "passage" prefix appears in extracted keywords
**TMOAT Validation**: Document results for next epic's query-side implementation

### Phase 3: Pipeline Integration Testing (Day 3)

#### Test 3.1: TypeScript-Python Communication
**Goal**: Verify capability-based optimization requests
**Method**: Test JSON-RPC communication with new parameters
```bash
# Test capability passing through embedding service
# Start Python process with capability detection
# Send embedding request with optimization flags
# Verify Python process applies correct optimizations
```
**Success Criteria**: Python receives and applies model-specific optimizations
**TMOAT Validation**: Monitor JSON-RPC logs for optimization metadata

#### Test 3.2: Daemon Integration Test
**Goal**: Verify optimizations work in full daemon context
**Method**: End-to-end daemon restart and indexing
```bash
# Remove existing index to force re-indexing
rm -rf .folder-mcp

# Start daemon with BGE-M3 model configuration
npm run daemon:restart &

# Monitor logs for optimization application
tail -f ~/.cache/folder-mcp/logs/daemon.log | grep -i "optimization\|sparse\|colbert\|prefix"

# Test indexing known content
echo "BGE-M3 transformer architecture semantic embeddings" > test-sprint3.md
```
**Success Criteria**: Logs show optimizations applied during indexing
**TMOAT Validation**: SQLite database query for optimized embedding metadata

### Phase 4: End-to-End MCP Validation (Day 4)

#### Test 4.1: Search Quality Improvement
**Goal**: Measure search quality improvement from optimizations
**Method**: Compare search results before/after optimizations
```bash
# Start MCP server
folder-mcp mcp server &

# Test technical term search (benefits from sparse embeddings)
echo '{"method": "search", "params": {"query": "BGE-M3 multilingual embedding", "folder_path": "/Users/hanan/Projects/folder-mcp"}}'

# Test semantic search (benefits from dense embeddings)
echo '{"method": "search", "params": {"query": "model optimization techniques", "folder_path": "/Users/hanan/Projects/folder-mcp"}}'
```
**Success Criteria**: Search returns more relevant results with better scores
**TMOAT Validation**: Compare relevance scores and result quality metrics

#### Test 4.2: Model Compatibility Matrix
**Goal**: Verify all models work with/without optimizations
**Method**: Systematic testing of each model configuration
```bash
# Test each model with optimizations enabled/disabled
MODELS=("BAAI/bge-m3" "intfloat/multilingual-e5-large" "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")

for model in "${MODELS[@]}"; do
  echo "Testing model: $model"
  # Test with optimizations
  # Test without optimizations
  # Verify both modes work
done
```
**Success Criteria**: All models function in both optimized and fallback modes

## Implementation Timeline

### Day 1: Stale Code Cleanup & Configuration Foundation
- [ ] **CRITICAL**: Remove stale keyword extraction calls in enhanced-processing.ts
- [ ] Replace ContentProcessingService.extractKeyPhrases with SemanticExtractionService
- [ ] Verify no performance degradation from switching to KeyBERT system
- [ ] Update curated-models.json with E5 capabilities
- [ ] Create TypeScript capability loader utility
- [ ] Test configuration loading and validation
- [ ] Create rollback documentation

### Day 2: E5 Optimization Implementation & KeyBERT Validation
- [ ] Implement E5 prefix formatting in Python handler
- [ ] Implement L2 normalization for E5 models
- [ ] **NEW**: Validate KeyBERT keyword extraction with E5 prefixes
- [ ] A/B test prefix impact measurement (both embeddings AND keywords)
- [ ] Isolated testing of E5 optimization

### Day 3: Integration & Validation
- [ ] Connect TypeScript capability detection
- [ ] Full daemon integration testing with E5 prefixes
- [ ] Performance benchmarking
- [ ] Document requirements for next epic's query-side implementation

## Files to Create/Modify

### New Files
- `src/domain/embeddings/model-capabilities.ts` - TypeScript capability interfaces and loader
- `tests/integration/e5-optimization.test.ts` - E5 prefix and normalization tests

### Modified Files
- **`src/domain/content/enhanced-processing.ts`** - CRITICAL: Replace stale ContentProcessingService calls with SemanticExtractionService
- `src/config/curated-models.json` - Add capabilities to E5 models
- `src/infrastructure/embeddings/python-embedding-service.ts` - Capability integration for E5
- `src/infrastructure/embeddings/python/handlers/embedding_handler.py` - E5 prefix and L2 normalization

### Stale Code Analysis
**Files Using Broken System**:
- `src/domain/content/enhanced-processing.ts:51` - Calls old extractKeyPhrases
- `src/domain/content/enhanced-processing.ts:104` - Fallback also uses old system
- `src/domain/content/enhanced-processing.ts:130` - Section processing uses old system

**Technical Debt**: These calls prevent us from using the KeyBERT system we built in Sprint 1.

## Rollback Plan

### If E5 Optimization Issues Arise:
1. **Revert curated-models.json**: Remove E5 capabilities fields
2. **Disable E5 Optimizations**: Remove prefix formatting logic
3. **Python Fallback**: Ensure E5 models work without prefixes
4. **Database Compatibility**: Existing embeddings continue to work

### Rollback Commands:
```bash
# Quick rollback - disable E5 optimizations
git checkout HEAD~1 src/config/curated-models.json
git checkout HEAD~1 src/infrastructure/embeddings/python/handlers/embedding_handler.py
npm run daemon:restart

# Full rollback with re-indexing
git revert [sprint-3-commits]
rm -rf .folder-mcp  # Force re-indexing without E5 optimizations
npm run daemon:restart
```

### Coordination with Next Epic
**CRITICAL**: If Sprint 3 E5 optimizations are rolled back, the next epic MUST NOT implement E5 query prefixes, as this would create a mismatch between passage embeddings (no prefix) and query embeddings (with prefix).

## Quality Assurance

### Validation Gates
1. **Configuration Tests**: E5 capabilities load correctly from curated-models.json
2. **A/B Tests**: Prefix + normalization shows measurable improvement
3. **Integration Tests**: E5 optimizations work in full indexing pipeline
4. **Performance Tests**: Optimization overhead stays <10%
5. **Compatibility Tests**: All models continue working with/without optimizations

### Success Metrics Dashboard
- E5 prefix implementation: ✅/❌ (binary)
- E5 prefix improvement: X.X% (target: >5%)
- Performance overhead: X.X% (target: <10%)
- Model compatibility: X/5 models working (target: 5/5)

## Next Epic Requirements

### Critical Dependencies for Search Optimization
1. **E5 Query Prefixes**: Next epic MUST implement "query:" prefixes for E5 models
2. **L2 Normalization**: Query embeddings need same normalization as passage embeddings
3. **Consistency Check**: Validate that search and indexing use matching optimizations
4. **Tokenization-Aware Search**: Implement the hybrid search approach we designed

### Future Considerations
- This sprint's capability system enables easy addition of new optimizations
- Search-time optimizations (hybrid search) implemented in next epic
- Model consistency maintained across indexing and search phases

---

**Sprint Lead**: Claude Code
**Review Required**: Human approval before implementation begins
**Next Review**: After Phase 2 completion (Day 2 EOD)