# Sprint 0: Document-Level Semantic Aggregation

## Overview

**Sprint Goal**: Implement document-level semantic aggregation during indexing to create a foundation for intelligent folder navigation.

**Why Sprint 0 Exists**: Before implementing Sprint 1 (list_folders endpoint), we need document-level semantic data. Currently, semantic extraction only exists at the chunk level. This sprint adds the missing document-level aggregation layer.

**Business Impact**: Enables semantic navigation features by providing document-level themes, readability metrics, and topic diversity scores that can be aggregated into folder-level insights.

## Current State Analysis

### Database Schema Status
- ✅ **Chunk-level semantics**: Fully implemented with quality metrics (>80% multiword phrases, >90% domain-specific topics)
- ❌ **Document-level semantics**: Missing - only computed on-demand in `SemanticMetadataService.getDocumentSemanticSummary()`
- ❌ **Document schema**: No persistent storage for document-level semantic data

### Quality Metrics Achieved
- **Multiword phrase ratio**: >80% (was 11%)
- **Domain-specific topics**: >90% (was 29% generic)
- **Readability accuracy**: >90% (was 71% incorrect)

### Model Support Analysis
- **Python Models**: Full KeyBERT + BERTopic support for enhanced extraction
- **ONNX Models**: Embedding-based clustering for basic topic extraction
- **Architecture**: Model-agnostic base with model-specific enhancements

## Architecture Design

### Fail-Loud Principle
- **NO silent fallbacks** - explicit failure tracking for each document
- **Error visibility** - extraction failures stored in database with detailed error messages
- **Retry mechanism** - configurable retry attempts with backoff
- **Quality thresholds** - fail documents that don't meet minimum quality requirements

### Two-Tier Processing Model

#### Tier 1: Base Aggregation (All Models)
```typescript
// Works for ALL embedding models
interface BaseDocumentSemantics {
  aggregated_topics: string[];        // Top 15-20 topics from chunks
  aggregated_phrases: string[];       // Top 20-30 phrases from chunks
  metrics: {
    total_chunks: number;
    avg_readability: number;          // Average from chunks
    topic_diversity: number;          // Shannon entropy calculation
    phrase_richness: number;          // Multiword phrase ratio
    semantic_coherence: number;       // Topic similarity analysis
  };
}
```

#### Tier 2: Model-Specific Enhancement (Python Only)
```typescript
// Only for models supporting KeyBERT/BERTopic
interface EnhancedDocumentSemantics extends BaseDocumentSemantics {
  document_topics: string[];          // Global themes via strategic sampling
  document_phrases: string[];         // Document-wide key phrases
  enhanced_metrics: {
    topic_clustering_quality: number; // BERTopic coherence score
    phrase_extraction_confidence: number; // KeyBERT confidence
  };
}
```

### Processing Pipeline Integration

#### Current Pipeline (Indexing Orchestrator)
1. Parse document → chunks
2. Generate embeddings for chunks
3. Extract semantic metadata per chunk
4. **[NEW]** → Aggregate chunks into document-level semantics
5. Store document with semantic summary

#### Integration Point
```typescript
// In IndexingOrchestrator.processFile() after extractSemanticMetadata()
const documentSemantics = await this.documentSemanticAggregator.aggregateDocument({
  documentId: document.id,
  chunks: chunksWithSemantics,
  options: this.getAggregationOptions()
});

// Store in documents table
await this.documentRepository.updateSemanticFields(document.id, documentSemantics);
```

## Implementation Tasks

### Task 1: Core Aggregation Engine ✅ COMPLETED
- ✅ Database migration for document semantic fields
- ✅ TypeScript interfaces for document semantic data
- ✅ Migration tested on existing database
- ✅ BERTopic added to Python dependency validation during daemon startup

### Task 2: Base Aggregation Service
**File**: `src/domain/semantic/document-aggregator.ts`

**Core Methods**:
- `aggregateDocument()` - Main aggregation entry point
- `aggregateTopics()` - Merge and rank topics from chunks
- `aggregatePhrases()` - Merge and rank phrases from chunks
- `calculateMetrics()` - Compute diversity, coherence, readability
- `validateQuality()` - Ensure minimum quality thresholds

**Quality Validation**:
- Minimum 80% chunk coverage with semantic data
- Minimum 60% multiword phrase ratio
- Topic diversity > 0.3 (Shannon entropy)
- Processing time limit: 1 second per document

### Task 3: Model-Specific Enhancement Handlers

#### Python Model Handler
**File**: `src/domain/semantic/python-document-enhancer.ts`

**Features**:
- Strategic document sampling (first 500 + middle 500 + last 500 chars)
- KeyBERT extraction on sampled content
- BERTopic clustering for global themes
- Enhanced quality metrics

#### ONNX Model Handler
**File**: `src/domain/semantic/onnx-document-enhancer.ts`

**Features**:
- Embedding-based topic clustering
- Similarity-based phrase grouping
- Basic enhancement metrics
- Falls back to base aggregation if enhancement fails

### Task 4: Integration with Indexing Pipeline
**File**: `src/application/indexing/orchestrator.ts`

**Integration Changes**:
- Add document aggregation step after chunk semantic extraction
- Error handling with fail-loud principle
- Performance monitoring and timeout handling
- Batch processing optimization for multiple documents

### Task 5: Repository Layer Updates
**File**: `src/infrastructure/persistence/document-repository.ts`

**New Methods**:
- `updateSemanticFields()` - Store document-level semantic data
- `getDocumentsWithSemantics()` - Query documents with semantic data
- `getSemanticExtractionStats()` - Monitor extraction success rates

## Error Handling Strategy

### Fail-Loud Implementation
```typescript
interface DocumentAggregationError {
  document_id: number;
  file_path: string;
  error_message: string;
  error_stage: 'aggregation' | 'enhancement' | 'storage';
  extraction_method: ExtractionMethod;
  attempts: number;
  timestamp: Date;
}
```

### Error Categories
- **Aggregation Failures**: Insufficient chunk data, quality threshold violations
- **Enhancement Failures**: Model-specific processing errors (Python/ONNX)
- **Storage Failures**: Database write errors, schema violations
- **Timeout Failures**: Processing exceeded time limits

### Recovery Strategy
- **No silent fallbacks** - each error is recorded and reported
- **Retry mechanism** - up to 3 attempts with exponential backoff
- **Graceful degradation** - documents without semantics are marked as failed, not ignored
- **Monitoring alerts** - high failure rates trigger TMOAT validation

## Testing Strategy (TMOAT)

### Agent-Led Testing Requirements

#### Database State Validation
```sql
-- Verify document semantic fields populated
SELECT COUNT(*) as total_docs,
       COUNT(semantic_summary) as docs_with_semantics,
       COUNT(CASE WHEN extraction_failed = 1 THEN 1 END) as failed_docs
FROM documents;
```

#### Quality Metrics Validation
```sql
-- Check quality metrics distribution
SELECT
  AVG(avg_readability_score) as avg_readability,
  AVG(topic_diversity_score) as avg_diversity,
  AVG(phrase_richness_score) as avg_richness
FROM documents
WHERE semantic_summary IS NOT NULL;
```

#### End-to-End Flow Testing
1. **Fresh indexing** - Delete `.folder-mcp`, restart daemon, verify aggregation
2. **Model compatibility** - Test both Python and ONNX model folders
3. **Error scenarios** - Corrupt files, timeout conditions, invalid data
4. **Performance** - Measure aggregation time per document (target: <1s)

### Smoke Test Requirements
- **Test folders**: All 5 configured model folders
- **Success criteria**: >80% documents successfully aggregated
- **Quality validation**: Aggregated data matches chunk-level semantics
- **Error tracking**: All failures properly logged and categorized

## Performance Targets

### Processing Speed
- **Base aggregation**: <500ms per document
- **Enhanced aggregation**: <1000ms per document
- **Batch processing**: >10 documents/second

### Quality Metrics
- **Chunk coverage**: >80% of chunks with semantic data
- **Phrase richness**: >60% multiword phrases
- **Topic diversity**: >0.3 Shannon entropy
- **Semantic coherence**: >0.5 similarity score

### Error Rates
- **Aggregation failures**: <5% of documents
- **Enhancement failures**: <10% of Python model documents
- **Storage failures**: <1% of successfully processed documents

## Success Criteria

### Functional Requirements
- ✅ Document-level semantic fields added to database
- ⏳ All documents have semantic_summary populated or explicit failure reason
- ⏳ Model-agnostic base aggregation works for both Python and ONNX models
- ⏳ Model-specific enhancement works for Python models
- ⏳ Fail-loud error handling captures and reports all failures

### Quality Requirements
- ⏳ Aggregated topics maintain >90% domain-specificity
- ⏳ Aggregated phrases maintain >80% multiword ratio
- ⏳ Readability scores accurate within ±5 points
- ⏳ Topic diversity reflects document complexity

### Integration Requirements
- ⏳ Indexing pipeline automatically aggregates new documents
- ⏳ MCP endpoints can access document-level semantic data
- ⏳ TMOAT validation passes for all test scenarios

## Risks and Mitigations

### Risk: Processing Time Overhead
- **Mitigation**: Async processing with configurable timeouts
- **Fallback**: Skip enhancement for time-critical indexing

### Risk: Model-Specific Failures
- **Mitigation**: Fail-loud with detailed error reporting
- **Monitoring**: TMOAT alerts for high failure rates

### Risk: Quality Regression
- **Mitigation**: Continuous quality validation during aggregation
- **Safeguard**: Reject documents below quality thresholds

### Risk: Memory Usage with Large Documents
- **Mitigation**: Streaming aggregation for documents with >1000 chunks
- **Monitoring**: Memory usage tracking during processing

## Post-Sprint Validation

### TMOAT Validation Scenarios
1. **Fresh Installation**: Complete folder indexing with document aggregation
2. **Model Migration**: Switch between Python and ONNX models
3. **Error Recovery**: Corrupt semantic data recovery
4. **Performance Load**: Large folder with 1000+ documents

### MCP Endpoint Readiness
After Sprint 0 completion, MCP endpoints should be able to:
- Query documents by semantic themes
- Filter by readability score ranges
- Sort by topic diversity or phrase richness
- Access aggregated semantic summaries

This Sprint 0 creates the foundation for Sprint 1's intelligent list_folders endpoint by ensuring all documents have rich, accurate semantic metadata ready for folder-level aggregation.