# Sprint 0.1 Implementation Plan: Document-Level Semantic Enhancement

**Sprint Goal**: Implement document-level semantic extraction using average embeddings to score keyphrases and topics by semantic relevance, replacing frequency-based aggregation.

**Test Environment**: `/Users/hanan/Projects/folder-mcp` (self-indexing for known content validation)

**TMOAT Methodology**: Break work into verifiable tests, validate assumptions at each step, fix issues in folder lifecycle order.

## **Core Principles**

### **Fail-Loud Philosophy** 🚨
- **NEVER fail silently** - All errors must be visible and actionable
- **Fail fast with details** - Provide specific error messages for debugging
- **No graceful degradation** - If document-level extraction fails, the error must be reported
- **Log all failures** - Every failure gets logged with full context

### **No Backwards Compatibility**
- **Databases are disposable** - Delete and recreate rather than migrate
- **No migration plans needed** - Fresh indexing solves all schema changes
- **Break things freely** - Focus on correct implementation, not compatibility

### **Model-Specific Requirements**
- **Python Models (GPU)**: Use KeyBERT for candidates, Python embedding service for scoring
- **ONNX Models (CPU)**: Use N-gram extraction for candidates, ONNX embedding service for scoring
- **Both**: Must support document embedding calculation and candidate scoring

---

## Phase 1: Document Embedding Storage Implementation

### Milestone 1.1: Add Document Embedding Column
**Goal**: Add document_embedding storage to documents table

**Test Approach**:
```bash
# 1. Check current schema (use any test database)
sqlite3 tmp/test-gpu-bge-m3/.folder-mcp/embeddings.db ".schema documents"

# 2. Verify document_embedding column doesn't exist yet
sqlite3 tmp/test-gpu-bge-m3/.folder-mcp/embeddings.db "PRAGMA table_info(documents);" | grep embedding
```

**FAIL-LOUD Requirements**:
- If schema check fails → STOP with clear error message
- If unable to access test database → STOP and report database path issue
- Log exact schema state before any changes

**Success Criteria**: Confirmed documents table lacks document_embedding column

---

### Milestone 1.2: Implement Document Embedding Column
**Goal**: Add document_embedding BLOB column to documents table

**Test Approach**:
```bash
# 1. NO BACKUP NEEDED - databases are disposable
# 2. Add column to schema directly in code
# 3. Delete all test databases to force fresh schema
rm -rf tmp/test-*/.folder-mcp/

# 4. Restart daemon to recreate with new schema
npm run daemon:restart

# 5. Verify new column exists
sqlite3 tmp/test-gpu-bge-m3/.folder-mcp/embeddings.db "PRAGMA table_info(documents);" | grep document_embedding
```

**FAIL-LOUD Requirements**:
- If ALTER TABLE fails → CRASH with SQLite error details
- If column creation fails → CRASH with schema validation error
- If daemon restart fails → CRASH with startup error details

**Success Criteria**: documents.document_embedding BLOB column exists in all new databases

**No Rollback Plan**: Just delete databases and fix code if issues arise

---

## Phase 2: Document Embedding Calculation Implementation

### Milestone 2.1: Implement Average Embedding Calculation
**Goal**: Calculate and store document-level average embeddings

**Model-Specific Implementation**:

**For Python Models (GPU)**:
```typescript
// In PythonDocumentEnhancer
async calculateDocumentEmbedding(chunks: ChunkData[]): Promise<Float32Array> {
  const embeddings = chunks.map(chunk => chunk.embedding);
  return this.averageEmbeddings(embeddings);
}
```

**For ONNX Models (CPU)**:
```typescript
// In ONNXDocumentEnhancer
async calculateDocumentEmbedding(chunks: ChunkData[]): Promise<Float32Array> {
  const embeddings = chunks.map(chunk => chunk.embedding);
  return this.averageEmbeddings(embeddings);
}
```

**Test Approach**:
```bash
# 1. Trigger fresh indexing
rm -rf tmp/test-*/.folder-mcp/ && npm run daemon:restart

# 2. Verify document embeddings are stored
for db in tmp/test-*/.folder-mcp/embeddings.db; do
  echo "=== $db ==="
  sqlite3 "$db" "SELECT file_path, length(document_embedding)/4 as dimensions FROM documents WHERE document_embedding IS NOT NULL LIMIT 2;"
done
```

**FAIL-LOUD Requirements**:
- If embedding averaging fails → CRASH with "Document embedding calculation failed: [details]"
- If dimension mismatch → CRASH with "Embedding dimension mismatch: expected X, got Y"
- If storage fails → CRASH with "Document embedding storage failed: [SQLite error]"

**Success Criteria**: All documents have document_embedding with correct dimensions (1024 for E5, 384 for MiniLM, etc.)

---

### Milestone 2.2: Implement Filename Keyword Parsing
**Goal**: Extract keyword candidates from filename components

**Filename Parsing Logic**:
```typescript
function parseFilenameKeywords(filePath: string): string[] {
  const filename = path.basename(filePath, path.extname(filePath));

  // Split on hyphens, underscores, camelCase
  const parts = filename
    .split(/[-_]/)
    .flatMap(part => part.split(/(?=[A-Z])/))
    .map(part => part.toLowerCase().trim())
    .filter(part =>
      part.length > 2 &&           // Not too short
      !/^\d+$/.test(part) &&       // Not just numbers
      !['and', 'or', 'the', 'of'].includes(part)  // Not stop words
    );

  return parts;
}
```

**Test Approach**:
```bash
# 1. Test parsing logic directly
node -e "
const result = parseFilenameKeywords('semantic-data-extraction-epic.md');
console.log('Filename keywords:', result);
// Expected: ['semantic', 'data', 'extraction', 'epic']
"

# 2. Verify integration in indexing
# After re-indexing, check that filename keywords appear in candidates
```

**FAIL-LOUD Requirements**:
- If filename parsing returns empty array → LOG WARNING with filename
- If filename parsing throws error → CRASH with "Filename parsing failed: [error]"

**Success Criteria**: Filename parsing produces meaningful keyword candidates for all test files

---

## Phase 3: Candidate Scoring Implementation

### Milestone 3.1: Implement Candidate Embedding Generation
**Goal**: Generate embeddings for all candidates (keyphrases + topics + filename keywords)

**Model-Specific Implementation**:

**For Python Models**:
```typescript
// Use PythonEmbeddingService to generate candidate embeddings
async generateCandidateEmbeddings(candidates: string[]): Promise<Float32Array[]> {
  // Use same model that generated document embeddings
  return await this.pythonService.generateBatchEmbeddings(candidates);
}
```

**For ONNX Models**:
```typescript
// Use ONNX model to generate candidate embeddings
async generateCandidateEmbeddings(candidates: string[]): Promise<Float32Array[]> {
  // Use same ONNX model that generated document embeddings
  return await this.onnxService.generateBatchEmbeddings(candidates);
}
```

**Test Approach**:
```bash
# 1. Test candidate embedding generation
# Add debug logging to see candidate embeddings being generated

# 2. Verify dimensions match document embeddings
# All embeddings for same model should have same dimensions

# 3. Test with both Python and ONNX models
```

**FAIL-LOUD Requirements**:
- If candidate embedding generation fails → CRASH with "Candidate embedding failed for model X: [error]"
- If dimension mismatch → CRASH with "Candidate embedding dimension mismatch: expected X, got Y"
- If batch generation fails → CRASH with "Batch embedding generation failed: [details]"

**Success Criteria**: Candidate embeddings generated with correct dimensions for all model types

---

### Milestone 3.2: Implement Semantic Candidate Scoring
**Goal**: Score all candidates against document embedding using cosine similarity

**Scoring Algorithm**:
```typescript
function scoreCandidatesAgainstDocument(
  candidates: string[],
  candidateEmbeddings: Float32Array[],
  documentEmbedding: Float32Array
): Array<{phrase: string, score: number}> {

  const scored = candidates.map((candidate, i) => ({
    phrase: candidate,
    score: cosineSimilarity(candidateEmbeddings[i], documentEmbedding)
  }));

  // Sort by score descending
  return scored.sort((a, b) => b.score - a.score);
}
```

**Test Approach**:
```bash
# 1. Test scoring logic with known documents
# For README.md, expect high scores for "folder-mcp", "semantic search"
# For roadmap files, expect high scores for "roadmap", "implementation"

# 2. Verify filename keywords get appropriate scores
# Not too high (shouldn't dominate) but not too low (should be considered)

# 3. Check score distribution makes sense
# Scores should range from 0.3-0.95, not all clustered around same value
```

**FAIL-LOUD Requirements**:
- If cosine similarity calculation fails → CRASH with "Cosine similarity failed: [error]"
- If scoring produces NaN values → CRASH with "Invalid similarity scores detected"
- If all scores are identical → CRASH with "Scoring failed - no discrimination between candidates"

**Success Criteria**: Candidates scored with meaningful similarity distributions

---

## Phase 4: Scored Storage Implementation

### Milestone 4.1: Update Document Semantic Summary Format
**Goal**: Store scored keyphrases and topics in semantic_summary JSON

**New Storage Format**:
```json
{
  "top_keyphrases": [
    {"phrase": "semantic search", "score": 0.95},
    {"phrase": "vector database", "score": 0.87},
    {"phrase": "roadmap", "score": 0.72}  // from filename
  ],
  "top_topics": [
    {"topic": "machine learning", "score": 0.92},
    {"topic": "information retrieval", "score": 0.78}
  ],
  "metrics": {
    "total_chunks": 15,
    "avg_readability": 45.2,
    "extraction_confidence": 0.89
  },
  "quality": {
    "extraction_method": "semantic_scoring",
    "processing_time_ms": 450
  }
}
```

**Test Approach**:
```bash
# 1. Trigger fresh indexing with new storage format
rm -rf tmp/test-*/.folder-mcp/ && npm run daemon:restart

# 2. Verify scored format in semantic_summary
sqlite3 tmp/test-gpu-bge-m3/.folder-mcp/embeddings.db "SELECT file_path, semantic_summary FROM documents WHERE semantic_summary IS NOT NULL LIMIT 1;"

# 3. Verify scores are meaningful (not all 0.5 or all 0.9)
```

**FAIL-LOUD Requirements**:
- If JSON serialization fails → CRASH with "Semantic summary serialization failed: [error]"
- If scores are missing → CRASH with "Missing scores in semantic data"
- If storage fails → CRASH with "Semantic summary storage failed: [SQLite error]"

**Success Criteria**: All documents have semantic_summary with scored keyphrases and topics

---

### Milestone 4.2: Model-Specific Integration Testing
**Goal**: Verify both Python and ONNX models use new scoring system correctly

**Model-Specific Testing**:

**Python Models (GPU)**:
```bash
# 1. Test BGE-M3 model specifically
sqlite3 tmp/test-gpu-bge-m3/.folder-mcp/embeddings.db "SELECT file_path, json_extract(semantic_summary, '$.top_keyphrases[0].phrase') as top_phrase, json_extract(semantic_summary, '$.top_keyphrases[0].score') as score FROM documents WHERE semantic_summary IS NOT NULL LIMIT 3;"

# 2. Verify scores use KeyBERT + semantic scoring
# Expect multiword phrases with high scores
```

**ONNX Models (CPU)**:
```bash
# 1. Test E5-Small ONNX model specifically
sqlite3 tmp/test-cpu-xenova-multilingual-e5-small/.folder-mcp/embeddings.db "SELECT file_path, json_extract(semantic_summary, '$.top_keyphrases[0].phrase') as top_phrase, json_extract(semantic_summary, '$.top_keyphrases[0].score') as score FROM documents WHERE semantic_summary IS NOT NULL LIMIT 3;"

# 2. Verify scores use N-gram + semantic scoring
# Expect multiword phrases with reasonable scores
```

**FAIL-LOUD Requirements**:
- If Python model fails semantic scoring → CRASH with "Python semantic scoring failed: [error]"
- If ONNX model fails semantic scoring → CRASH with "ONNX semantic scoring failed: [error]"
- If model produces no scored results → CRASH with "No scored results from model X"

**Success Criteria**: Both Python and ONNX models produce scored semantic summaries

---

## Phase 5: End-to-End Validation

### Milestone 5.1: Document-Level Quality Validation
**Goal**: Verify document-level semantics represent true document themes

**Semantic Quality Tests**:
```bash
# 1. Test README.md semantic representation
sqlite3 tmp/test-gpu-bge-m3/.folder-mcp/embeddings.db "
SELECT
  file_path,
  json_extract(semantic_summary, '$.top_keyphrases[0].phrase') as phrase1,
  json_extract(semantic_summary, '$.top_keyphrases[0].score') as score1,
  json_extract(semantic_summary, '$.top_topics[0].topic') as topic1
FROM documents
WHERE file_path LIKE '%README%';
"

# Expected for README.md:
# - Top keyphrases: "folder-mcp", "semantic search", "document processing"
# - Top topics: "machine learning", "software development"
# - Scores: 0.7-0.95 range

# 2. Test roadmap file semantic representation
# Expected: "roadmap", "implementation", "phase" with high scores

# 3. Test filename keyword integration
# Verify filename components appear with appropriate scores (0.6-0.8 range)
```

**FAIL-LOUD Requirements**:
- If top phrases are generic ("document", "text") → CRASH with "Semantic quality failure: generic results"
- If scores are all similar (±0.1) → CRASH with "Scoring failure: no discrimination"
- If filename keywords missing → CRASH with "Filename integration failure"

**Success Criteria**: Document semantics accurately represent document themes with meaningful score distributions

---

### Milestone 5.2: Cross-Model Consistency Validation
**Goal**: Verify all 5 models produce consistent, high-quality document semantics

**Cross-Model Testing**:
```bash
# 1. Compare top phrases across all models for same document
for db in tmp/test-*/.folder-mcp/embeddings.db; do
  echo "=== Model: $(basename $(dirname $(dirname $db))) ==="
  sqlite3 "$db" "
  SELECT
    json_extract(semantic_summary, '$.top_keyphrases[0].phrase') as phrase1,
    json_extract(semantic_summary, '$.top_keyphrases[1].phrase') as phrase2,
    json_extract(semantic_summary, '$.top_topics[0].topic') as topic1
  FROM documents
  WHERE file_path LIKE '%README%';
  "
done

# 2. Verify score quality across models
# All models should produce scores in 0.3-0.95 range
# Top phrases should be semantically relevant, not generic

# 3. Test filename keyword consistency
# All models should include filename-derived keywords with appropriate scores
```

**FAIL-LOUD Requirements**:
- If any model produces all generic results → CRASH with "Model X semantic quality failure"
- If any model fails to include filename keywords → CRASH with "Model X filename integration failure"
- If any model produces invalid scores → CRASH with "Model X scoring failure"

**Success Criteria**: All 5 models produce semantically meaningful, scored results with filename integration

---

## Phase 6: MCP Endpoint Integration

### Milestone 6.1: MCP Endpoint Testing with Scored Semantics
**Goal**: Verify scored semantics are accessible through MCP endpoints

**Test Approach**:
```bash
# 1. Test MCP endpoints directly
folder-mcp mcp server

# 2. Use get_document_data to verify scored format
# Check that semantic summaries include scores for both keyphrases and topics

# 3. Test search functionality with improved semantics
# Verify search results benefit from better document-level understanding
```

**MCP Integration Requirements**:
- Document data should include scored keyphrases and topics
- Search should use improved document semantics for better ranking
- Filename keywords should be visible in document metadata

**FAIL-LOUD Requirements**:
- If MCP server fails to start → CRASH with "MCP server startup failed: [error]"
- If document data missing scores → CRASH with "MCP endpoint data format error"
- If search fails → CRASH with "MCP search functionality broken: [error]"

**If MCP Server Disconnected**: STOP and ask human to reconnect

**Success Criteria**: MCP endpoints return documents with scored semantic summaries

---

### Milestone 6.2: Folder-Level Aggregation Validation
**Goal**: Verify scored semantics enable intelligent folder-level summaries

**Test Approach**:
```bash
# 1. Extract top phrases across all documents in a folder
# This simulates folder-level aggregation using scores

for db in tmp/test-*/.folder-mcp/embeddings.db; do
  echo "=== Folder: $(basename $(dirname $(dirname $db))) ==="
  sqlite3 "$db" "
  WITH scored_phrases AS (
    SELECT
      json_each.value->>'phrase' as phrase,
      CAST(json_each.value->>'score' as REAL) as score
    FROM documents, json_each(json_extract(semantic_summary, '$.top_keyphrases'))
    WHERE semantic_summary IS NOT NULL
  )
  SELECT phrase, AVG(score) as avg_score, COUNT(*) as frequency
  FROM scored_phrases
  GROUP BY phrase
  ORDER BY avg_score DESC, frequency DESC
  LIMIT 10;
  "
done

# 2. Verify folder summaries are meaningful
# Top phrases should represent the folder's content theme
# Scores should enable intelligent selection (not just frequency)
```

**FAIL-LOUD Requirements**:
- If JSON extraction fails → CRASH with "Semantic summary JSON parse error"
- If no scores found → CRASH with "Missing scores in folder aggregation"
- If aggregation produces only generic terms → CRASH with "Folder aggregation quality failure"

**Success Criteria**: Folder-level aggregation produces meaningful summaries using semantic scores

---

## Phase 7: Performance and Cleanup

### Milestone 7.1: Performance Validation
**Goal**: Ensure document-level semantic extraction doesn't significantly impact performance

**Performance Testing**:
```bash
# 1. Time full indexing process for all 5 models
time (rm -rf tmp/test-*/.folder-mcp/ && npm run daemon:restart)

# 2. Monitor memory usage during indexing
# Document embedding calculation and candidate scoring should not cause memory issues

# 3. Verify indexing completes within reasonable time
# Should complete within 5-10 minutes for all 5 folders
```

**Performance Requirements**:
- Document embedding calculation: <500ms per document
- Candidate scoring: <200ms per document
- Total overhead: <2x current indexing time
- Memory usage: Should not exceed 2GB during indexing

**FAIL-LOUD Requirements**:
- If indexing takes >15 minutes → CRASH with "Performance degradation detected"
- If memory usage exceeds 4GB → CRASH with "Memory usage too high"
- If any document takes >5 seconds → CRASH with "Document processing timeout"

**Success Criteria**: Performance overhead is acceptable for production use

---

## Failure Mode Analysis and Debugging

### Critical Failure Points:

1. **Document Embedding Calculation Failures**:
   - **Cause**: Dimension mismatches, missing chunk embeddings, averaging errors
   - **Detection**: CRASH with "Document embedding calculation failed: [specific error]"
   - **Recovery**: Delete databases, fix calculation logic, re-index

2. **Candidate Scoring Failures**:
   - **Cause**: Embedding generation fails, cosine similarity errors, NaN values
   - **Detection**: CRASH with "Candidate scoring failed for model X: [error]"
   - **Recovery**: Check embedding service integration, fix scoring logic

3. **Model-Specific Integration Failures**:
   - **Cause**: Python service unavailable, ONNX model loading fails, API changes
   - **Detection**: CRASH with specific model error messages
   - **Recovery**: Verify model services are running, check integration points

4. **Storage Format Failures**:
   - **Cause**: JSON serialization errors, schema mismatches, SQLite issues
   - **Detection**: CRASH with "Semantic summary storage failed: [SQLite error]"
   - **Recovery**: Delete databases, fix schema, re-index

5. **Performance Degradation**:
   - **Cause**: Inefficient embedding generation, memory leaks, slow candidate scoring
   - **Detection**: CRASH with "Performance degradation detected"
   - **Recovery**: Profile bottlenecks, optimize batch processing

### Systematic Debugging Approach:

1. **Fail-Loud Philosophy**: Never ignore errors, always crash with details
2. **Check Logs First**: Examine daemon logs for specific error messages
3. **Database Validation**: Query databases to verify data at each step
4. **Model-Specific Testing**: Test Python and ONNX models separately
5. **Known Content Validation**: Use familiar files to verify semantic quality
6. **No Backwards Compatibility**: Delete databases and re-index when fixing issues

### Debugging Commands:

```bash
# Check daemon logs for errors
tail -f logs/daemon.log

# Verify document embeddings
sqlite3 tmp/test-gpu-bge-m3/.folder-mcp/embeddings.db "SELECT file_path, length(document_embedding)/4 as dims FROM documents WHERE document_embedding IS NOT NULL;"

# Check semantic summary format
sqlite3 tmp/test-gpu-bge-m3/.folder-mcp/embeddings.db "SELECT file_path, semantic_summary FROM documents WHERE semantic_summary IS NOT NULL LIMIT 1;"

# Test candidate scoring results
sqlite3 tmp/test-gpu-bge-m3/.folder-mcp/embeddings.db "SELECT json_extract(semantic_summary, '$.top_keyphrases[0]') FROM documents WHERE semantic_summary IS NOT NULL;"
```

---

## Success Criteria Summary

**Core Technical Achievements**:
- ✅ Document embeddings calculated and stored for all documents
- ✅ Candidate scoring uses semantic similarity (not frequency)
- ✅ Filename keywords integrated with appropriate scoring
- ✅ Scored storage format enables folder-level aggregation
- ✅ Both Python and ONNX models use semantic scoring

**Quality Achievements**:
- ✅ Document semantics represent true document themes
- ✅ Keyphrases and topics are semantically meaningful (not generic)
- ✅ Score distributions provide meaningful discrimination
- ✅ Filename integration works without dominating results
- ✅ Cross-model consistency in semantic quality

**System Integration**:
- ✅ MCP endpoints expose scored semantic summaries
- ✅ All 5 curated models produce high-quality results
- ✅ Performance overhead acceptable for production
- ✅ Fail-loud error handling prevents silent failures
- ✅ No backwards compatibility issues (databases recreated)

**Validation Targets**:
- ✅ Document-level semantics beat chunk frequency aggregation
- ✅ Known documents (README.md, roadmap files) get expected semantic summaries
- ✅ Folder-level aggregation produces meaningful summaries using scores
- ✅ System works reliably without silent failures

This plan ensures we build and test incrementally, validate assumptions at each step, and maintain system functionality throughout the refactoring process.

---

## Comprehensive Smoke Test (Better Testing Approach)

**Goal**: Validate that our 5 curated models can all index successfully before implementing changes

**Test Folders**:
- `tmp/test-gpu-multilingual-e5-large/.folder-mcp/embeddings.db`
- `tmp/test-gpu-bge-m3/.folder-mcp/embeddings.db`
- `tmp/test-gpu-paraphrase-multilingual-minilm/.folder-mcp/embeddings.db`
- `tmp/test-cpu-xenova-multilingual-e5-small/.folder-mcp/embeddings.db`
- `tmp/test-cpu-xenova-multilingual-e5-large/.folder-mcp/embeddings.db`

### **Smoke Test Procedure**:

#### **Step 1: Clean Slate**
```bash
# Remove all existing database folders
rm -rf tmp/test-gpu-multilingual-e5-large/.folder-mcp
rm -rf tmp/test-gpu-bge-m3/.folder-mcp
rm -rf tmp/test-gpu-paraphrase-multilingual-minilm/.folder-mcp
rm -rf tmp/test-cpu-xenova-multilingual-e5-small/.folder-mcp
rm -rf tmp/test-cpu-xenova-multilingual-e5-large/.folder-mcp
```

#### **Step 2: Fresh Daemon Restart**
```bash
# Kill any running daemon and start fresh instance in background
npm run daemon:restart
```

#### **Step 3: Monitor Indexing Progress**
```bash
# Watch daemon logs for indexing completion
tail -f logs/daemon.log

# Look for completion messages for all 5 folders:
# - "Folder indexing completed: test-gpu-multilingual-e5-large"
# - "Folder indexing completed: test-gpu-bge-m3"
# - "Folder indexing completed: test-gpu-paraphrase-multilingual-minilm"
# - "Folder indexing completed: test-cpu-xenova-multilingual-e5-small"
# - "Folder indexing completed: test-cpu-xenova-multilingual-e5-large"
```

#### **Step 4: Validate Database Creation**
```bash
# Verify all 5 databases were created
ls -la tmp/test-gpu-multilingual-e5-large/.folder-mcp/embeddings.db
ls -la tmp/test-gpu-bge-m3/.folder-mcp/embeddings.db
ls -la tmp/test-gpu-paraphrase-multilingual-minilm/.folder-mcp/embeddings.db
ls -la tmp/test-cpu-xenova-multilingual-e5-small/.folder-mcp/embeddings.db
ls -la tmp/test-cpu-xenova-multilingual-e5-large/.folder-mcp/embeddings.db
```

#### **Step 5: Database Content Validation**
```bash
# Check each database has indexed documents
for db in tmp/test-*/.folder-mcp/embeddings.db; do
    echo "=== Database: $db ==="
    sqlite3 "$db" "SELECT COUNT(*) as documents FROM documents;"
    sqlite3 "$db" "SELECT COUNT(*) as chunks FROM chunks;"
    sqlite3 "$db" "SELECT COUNT(*) as embeddings FROM embeddings;"
    echo ""
done
```

#### **Step 6: Expected Results**
Each database should show:
- **Documents**: 5-6 documents (README.md, roadmap files, etc.)
- **Chunks**: 50-200+ chunks (depending on document size)
- **Embeddings**: Same count as chunks

### **Success Criteria**:
- ✅ All 5 database files created successfully
- ✅ No indexing errors in daemon logs
- ✅ Each database contains expected document/chunk/embedding counts
- ✅ All 5 models (GPU and ONNX) processed successfully

### **Failure Scenarios**:
- **Missing databases**: Model failed to initialize or index
- **Zero counts**: Database created but indexing failed
- **Error logs**: Check daemon logs for specific model failures
- **Partial success**: Some models work, others fail (indicates model-specific issues)

### **Why This Test is Better**:
1. **Complete System Validation**: Tests entire pipeline end-to-end
2. **Model Coverage**: Validates all 5 curated models work
3. **Real Data**: Uses actual project files as test content
4. **Infrastructure Validation**: Confirms daemon, database, and embedding systems work
5. **Baseline Establishment**: Creates known-good state before changes

**Note**: This smoke test should be run BEFORE implementing any Sprint 0.1 changes to establish a working baseline.