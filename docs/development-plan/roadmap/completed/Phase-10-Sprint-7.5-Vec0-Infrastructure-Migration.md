# Phase 10 Sprint 7.5: Vec0 Infrastructure Migration

**Sprint Type**: Ad-hoc Infrastructure Enhancement
**Phase**: 10 - Semantic Endpoint Navigation
**Sprint**: 7.5 (Infrastructure preparation)
**Priority**: High - Foundation for search endpoint (Sprint 8)
**Duration**: 6-8 hours
**Pre-production**: YES - Databases are disposable, can reindex anytime

---

## 🎯 Sprint Goal

Migrate embedding storage from TEXT format to SQLite vec0 virtual tables, preparing the infrastructure for native vector similarity search implementation in Sprint 8. Focus on **write path stability** - ensuring embeddings are stored correctly in vec0 format while maintaining all existing folder lifecycle operations.

**Out of Scope**: Search endpoint implementation (that's Sprint 8)

---

## 📋 Context & Motivation

### Current State
- **Embeddings stored as TEXT**: Chunk embeddings stored as JSON strings, document embeddings as base64
- **Manual similarity search**: MultiFolderVectorSearchService iterates ALL embeddings in JavaScript
- **No indexing**: Linear scan with manual cosine similarity for every search
- **Performance bottleneck**: Slow for large datasets (thousands of embeddings)

### Why Vec0 Now?
1. **Infrastructure readiness**: Before implementing search endpoint, storage layer must be ready
2. **Single model per database**: Each folder's database uses one model with fixed dimension
3. **Disposable databases**: Source files are truth, can always reindex
4. **Write path focus**: Get embeddings into vec0 format now, read path (search) comes in Sprint 8

### Key Constraint
**Single Model Per Database**: Each `.folder-mcp/embeddings.db` uses ONE model at a time, enforced by:
```sql
CREATE TABLE embedding_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),  -- Single row!
    model_name TEXT NOT NULL,
    model_dimension INTEGER NOT NULL
);
```

This means vec0 virtual tables can use a **fixed dimension per database**.

---

## 📊 Model Dimensions Overview

From `src/config/curated-models.json`:

| Model ID | Dimensions | Provider |
|----------|------------|----------|
| `gpu:bge-m3` | **1024** | Python GPU |
| `gpu:multilingual-e5-large` | **1024** | Python GPU |
| `gpu:paraphrase-multilingual-minilm` | **384** | Python GPU |
| `cpu:xenova-multilingual-e5-small` | **384** | ONNX CPU |
| `cpu:xenova-multilingual-e5-large` | **1024** | ONNX CPU |

**Two dimension sizes**: 384 or 1024

---

## 🏗️ Architecture Changes

### Current Schema (TEXT Storage)
```sql
-- OLD: Regular table with TEXT column
CREATE TABLE embeddings (
    chunk_id INTEGER PRIMARY KEY,
    embedding TEXT  -- JSON serialized array
);

-- Document embeddings stored in documents table
CREATE TABLE documents (
    ...
    document_embedding TEXT,  -- base64 encoded Float32Array
    embedding_generated INTEGER DEFAULT 0
);
```

### New Schema (Vec0 Virtual Tables with Metadata)
```sql
-- ✅ NEW: Vec0 virtual table for chunk embeddings
-- Uses INTEGER metadata column for explicit chunk_id storage
CREATE VIRTUAL TABLE chunk_embeddings USING vec0(
    chunk_id INTEGER,                 -- Metadata column for JOIN
    embedding FLOAT32[${dimension}]   -- Dimension from embedding_config
);

-- ✅ NEW: Vec0 virtual table for document embeddings
-- Uses INTEGER metadata column for explicit document_id storage
CREATE VIRTUAL TABLE document_embeddings USING vec0(
    document_id INTEGER,              -- Metadata column for JOIN
    embedding FLOAT32[${dimension}]   -- Same dimension as chunks
);

-- UNCHANGED: Semantic metadata preserved
CREATE TABLE chunks (
    ...
    key_phrases TEXT,           -- JSON array (UNCHANGED)
    readability_score REAL,     -- Score 0-100 (UNCHANGED)
    semantic_processed INTEGER  -- Flag (UNCHANGED)
);

CREATE TABLE documents (
    ...
    document_keywords TEXT,      -- JSON array (UNCHANGED)
    keywords_extracted INTEGER   -- Flag (UNCHANGED)
    -- document_embedding REMOVED - now in document_embeddings table
    -- embedding_generated REMOVED - derive from document_embeddings existence
);
```

### Schema Version
- **Current**: Version 3 (with document-level semantics)
- **Target**: Version 4 (with vec0 virtual tables)

### Vec0 Metadata Columns Design

**Key Design Decision**: Vec0 supports metadata columns alongside vector data, eliminating the need for rowid synchronization.

**Benefits**:
- ✅ **Explicit IDs**: Store `chunk_id` and `document_id` directly in vec0 tables
- ✅ **Direct JOINs**: `JOIN chunk_embeddings ON chunks.id = chunk_embeddings.chunk_id`
- ✅ **No Sync Complexity**: No need to keep rowids synchronized with insertion order
- ✅ **Standard SQL**: DELETE, UPDATE, and SELECT work with metadata columns
- ✅ **Fail-Loud**: Can't accidentally join wrong embeddings to wrong chunks

**Example**:
```sql
-- Query with metadata JOIN
SELECT c.content, ce.chunk_id, distance
FROM chunks c
JOIN chunk_embeddings ce ON c.id = ce.chunk_id
WHERE ce.embedding MATCH vec_f32(?)
AND k = 10;

-- Delete by metadata
DELETE FROM chunk_embeddings WHERE chunk_id = ?;
```

---

## 🔧 Implementation Tasks

### Phase 1: Schema Updates (Low Risk)
**Files**: `src/infrastructure/embeddings/sqlite-vec/schema.ts`

**Tasks**:
1. ✅ Add `chunk_embeddings` vec0 virtual table template
2. ✅ Add `document_embeddings` vec0 virtual table template
3. ✅ Remove `embeddings` TEXT table
4. ✅ Remove `document_embedding` and `embedding_generated` columns from documents table
5. ✅ Update schema version to 4
6. ✅ Update `getAllTableStatements()` to use dynamic dimension injection

**Expected Changes**:
```typescript
// BEFORE
export const EMBEDDINGS_TABLE_TEMPLATE = `
CREATE TABLE IF NOT EXISTS embeddings (
    chunk_id INTEGER PRIMARY KEY,
    embedding TEXT
);`;

// AFTER - Vec0 with metadata columns (no PRIMARY KEY needed)
export const CHUNK_EMBEDDINGS_TABLE_TEMPLATE = `
CREATE VIRTUAL TABLE IF NOT EXISTS chunk_embeddings USING vec0(
    chunk_id INTEGER,
    embedding FLOAT32[\${dimension}]
);`;

export const DOCUMENT_EMBEDDINGS_TABLE_TEMPLATE = `
CREATE VIRTUAL TABLE IF NOT EXISTS document_embeddings USING vec0(
    document_id INTEGER,
    embedding FLOAT32[\${dimension}]
);`;

export function getAllTableStatements(embeddingDimension: number): string[] {
    return [
        DOCUMENTS_TABLE,
        CHUNKS_TABLE,
        CHUNK_EMBEDDINGS_TABLE_TEMPLATE.replace('${dimension}', embeddingDimension.toString()),
        DOCUMENT_EMBEDDINGS_TABLE_TEMPLATE.replace('${dimension}', embeddingDimension.toString()),
        EMBEDDING_CONFIG_TABLE,
        FILE_STATES_TABLE,
        SCHEMA_VERSION_TABLE,
        ...INDEXES
    ];
}
```

---

### Phase 2: Database Manager Updates (Medium Risk)
**Files**: `src/infrastructure/embeddings/sqlite-vec/database-manager.ts`

**Tasks**:
1. ✅ Update `initialize()` to check schema version
2. ✅ Add `createVec0Schema()` for new databases
3. ✅ Add `verifyModelConsistency()` for existing databases
4. ✅ Add model change detection with helpful error messages
5. ✅ Update schema validation to check vec0 tables

**New Methods**:
```typescript
private async createVec0Schema(): Promise<void> {
    // 1. Get dimension from config
    const dimension = this.config.modelDimension;

    // 2. Insert embedding_config first
    db.prepare(`
        INSERT OR REPLACE INTO embedding_config
        (id, model_name, model_dimension, updated_at)
        VALUES (1, ?, ?, CURRENT_TIMESTAMP)
    `).run(this.config.modelName, dimension);

    // 3. Create vec0 tables with correct dimension
    const statements = getAllTableStatements(dimension);
    for (const statement of statements) {
        db.exec(statement);
    }

    // 4. Set schema version to 4
    db.prepare(`
        INSERT OR REPLACE INTO schema_version (id, version)
        VALUES (1, 4)
    `).run();
}

private async verifyModelConsistency(): Promise<void> {
    const configRow = db.prepare('SELECT model_name, model_dimension FROM embedding_config WHERE id = 1').get();

    if (configRow.model_name !== this.config.modelName) {
        const storedDim = configRow.model_dimension;
        const newDim = this.config.modelDimension;

        if (storedDim !== newDim) {
            throw new Error(
                `MODEL_CHANGED: Database created with ${configRow.model_name} (${storedDim}d), ` +
                `now configured for ${this.config.modelName} (${newDim}d). ` +
                `Database rebuild required - delete .folder-mcp and reindex.`
            );
        }
    }
}
```

---

### Phase 3: Write Path Updates (High Risk - Core Functionality)
**Files**: `src/infrastructure/embeddings/sqlite-vec/sqlite-vec-storage.ts`

**Tasks**:
1. ✅ Update `insertEmbeddingsWithMetadata()` to use vec0 tables
2. ✅ Update `updateDocumentSemantics()` to use document_embeddings table
3. ✅ Keep semantic metadata writes unchanged
4. ✅ Add transaction consistency checks

**Key Changes**:
```typescript
// BEFORE (chunk embeddings)
const embeddingJson = JSON.stringify(embeddingArray);
insertEmbeddingStmt.run(chunkId, embeddingJson);

// AFTER (chunk embeddings) - Use vec_f32() SQL function
const insertChunkEmbedding = db.prepare(
    'INSERT INTO chunk_embeddings (chunk_id, embedding) VALUES (?, vec_f32(?))'
);
insertChunkEmbedding.run(chunkId, JSON.stringify(embeddingArray));

// BEFORE (document embeddings)
UPDATE documents
SET document_embedding = ?, embedding_generated = 1
WHERE file_path = ?

// AFTER (document embeddings) - Use vec_f32() SQL function
const insertDocEmbedding = db.prepare(
    'INSERT INTO document_embeddings (document_id, embedding) VALUES (?, vec_f32(?))'
);
insertDocEmbedding.run(documentId, JSON.stringify(embeddingArray));
```

**Critical**: Must use `vec_f32()` SQL function to convert JSON array to proper FLOAT32 BLOB format.

---

### Phase 4: Delete Path Updates (High Risk - Data Integrity)
**Files**: `src/infrastructure/embeddings/sqlite-vec/sqlite-vec-storage.ts`

**Tasks**:
1. ✅ Implement manual CASCADE delete for vec0 tables
2. ✅ Update `deleteDocument()` with vec0-aware deletion
3. ✅ Ensure transactional integrity
4. ✅ Add deletion verification

**Critical Change** - Vec0 virtual tables don't support foreign keys:
```typescript
async deleteDocument(filePath: string): Promise<void> {
    const db = this.dbManager.getDatabase();

    const deleteTransaction = db.transaction(() => {
        // 1. Get document ID
        const doc = db.prepare('SELECT id FROM documents WHERE file_path = ?').get(filePath);
        if (!doc) return;
        const docId = (doc as any).id;

        // 2. Get all chunk IDs
        const chunks = db.prepare('SELECT id FROM chunks WHERE document_id = ?').all(docId);
        const chunkIds = chunks.map((c: any) => c.id);

        // 3. ⚠️ CRITICAL: Manual CASCADE for vec0 tables
        for (const chunkId of chunkIds) {
            db.prepare('DELETE FROM chunk_embeddings WHERE chunk_id = ?').run(chunkId);
        }
        db.prepare('DELETE FROM document_embeddings WHERE document_id = ?').run(docId);

        // 4. Delete document (regular CASCADE handles chunks table)
        db.prepare('DELETE FROM documents WHERE id = ?').run(docId);
    });

    deleteTransaction();
}
```

---

### Phase 5: Testing & Validation (Critical)
**Files**:
- `tests/unit/infrastructure/embeddings/sqlite-vec/sqlite-vec-storage.test.ts`
- `tests/integration/folder-lifecycle-*.test.ts`

**Tasks**:
1. ✅ Unit tests for vec0 schema creation
2. ✅ Unit tests for model consistency checks
3. ✅ Unit tests for manual CASCADE delete
4. ✅ Integration tests for full lifecycle with vec0
5. ✅ Verify semantic metadata still accessible
6. ✅ Verify no regressions in existing tests

**Test Categories**:

#### Unit Tests
```typescript
describe('Vec0 Schema Creation', () => {
    it('should create vec0 tables with correct dimension', async () => {
        const storage = new SQLiteVecStorage({
            folderPath: testFolder,
            modelName: 'gpu:paraphrase-multilingual-minilm',
            modelDimension: 384
        });

        await storage.initialize();

        // Verify vec0 tables exist
        const tables = db.prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%embeddings'"
        ).all();

        expect(tables).toContainEqual({ name: 'chunk_embeddings' });
        expect(tables).toContainEqual({ name: 'document_embeddings' });
    });

    it('should detect model dimension mismatch', async () => {
        // Create database with 384d model
        await createDatabase(384);

        // Try to open with 1024d model
        const storage = new SQLiteVecStorage({
            folderPath: testFolder,
            modelName: 'gpu:bge-m3',
            modelDimension: 1024
        });

        await expect(storage.initialize()).rejects.toThrow('MODEL_CHANGED');
    });

    it('should CASCADE delete vec0 embeddings', async () => {
        await storage.addEmbeddings(embeddings, metadata);
        await storage.deleteDocument(filePath);

        // Verify vec0 tables are empty
        const chunkCount = db.prepare('SELECT COUNT(*) as count FROM chunk_embeddings').get();
        const docCount = db.prepare('SELECT COUNT(*) as count FROM document_embeddings').get();

        expect(chunkCount.count).toBe(0);
        expect(docCount.count).toBe(0);
    });
});
```

#### Integration Tests
```typescript
describe('Folder Lifecycle with Vec0', () => {
    it('should complete full indexing with vec0 storage', async () => {
        const lifecycleService = new FolderLifecycleService(
            folderId,
            folderPath,
            orchestrator,
            fileSystem,
            sqliteVecStorage,
            fileStateService,
            logger,
            'gpu:paraphrase-multilingual-minilm'  // 384d model
        );

        await lifecycleService.start();
        await waitForIndexing();

        // Verify vec0 tables populated
        const stats = await sqliteVecStorage.getStats();
        expect(stats.embeddingCount).toBeGreaterThan(0);

        // Verify semantic metadata still accessible
        const search = await multiFolderSearch.searchInFolder(
            queryVector,
            folderPath,
            10,
            0.7
        );

        expect(search[0].keyPhrases).toBeDefined();
        expect(search[0].readabilityScore).toBeGreaterThan(0);
    });
});
```

---

## 🚨 Critical Risks & Mitigations

### Risk 1: Vec0 Virtual Tables Don't Support Foreign Keys
**Impact**: CASCADE deletes won't work automatically
**Mitigation**: Manual CASCADE delete in application code using metadata columns (Phase 4)
**Testing**: Unit tests verify all vec0 entries deleted when document removed

**Note**: Using metadata columns (`chunk_id`, `document_id`) eliminates rowid synchronization issues. DELETE operations use: `DELETE FROM chunk_embeddings WHERE chunk_id = ?`

### Risk 2: Model Change Breaks Database
**Impact**: User switches model, database has wrong dimension
**Mitigation**: Model consistency check throws helpful error with reindex instructions
**Testing**: Unit test verifies dimension mismatch detection

### Risk 3: Semantic Metadata Lost
**Impact**: Key phrases, readability scores accidentally deleted
**Mitigation**: Semantic data stored in separate columns (chunks/documents tables), not in vec0
**Testing**: Integration tests verify semantic metadata accessible after vec0 migration

### Risk 4: Write Path Breaks Indexing
**Impact**: Files fail to index after vec0 changes
**Mitigation**: Incremental rollout with thorough testing at each phase
**Testing**: Full folder lifecycle tests must pass before completion

---

## 📁 Files Modified

### Schema Layer
- ✅ `src/infrastructure/embeddings/sqlite-vec/schema.ts` - Add vec0 table definitions

### Database Layer
- ✅ `src/infrastructure/embeddings/sqlite-vec/database-manager.ts` - Schema initialization
- ✅ `src/infrastructure/embeddings/sqlite-vec/sqlite-vec-storage.ts` - Write/delete operations

### Tests
- ✅ `tests/unit/infrastructure/embeddings/sqlite-vec/sqlite-vec-storage.test.ts`
- ✅ `tests/unit/infrastructure/embeddings/sqlite-vec/database-manager.test.ts`
- ✅ `tests/integration/folder-lifecycle-*.test.ts` - Verify no regressions

---

## ✅ Definition of Done

### Infrastructure Readiness
- [ ] Vec0 virtual tables created with correct dimension at database initialization
- [ ] Model dimension lookup from `curated-models.json` works correctly
- [ ] Schema version 4 properly tracked and validated
- [ ] Model consistency check detects dimension mismatches

### Write Path Stability
- [ ] Chunk embeddings stored in `chunk_embeddings` vec0 table
- [ ] Document embeddings stored in `document_embeddings` vec0 table
- [ ] Semantic metadata (key phrases, readability) still stored in chunks/documents tables
- [ ] Full folder lifecycle completes without errors

### Delete Path Integrity
- [ ] Manual CASCADE delete removes vec0 entries when document deleted
- [ ] Transactional integrity maintained across all tables
- [ ] No orphaned embeddings in vec0 tables

### Testing Coverage
- [ ] All unit tests pass (sqlite-vec-storage, database-manager)
- [ ] All integration tests pass (folder-lifecycle)
- [ ] New tests for vec0 schema creation
- [ ] New tests for manual CASCADE delete
- [ ] New tests for model consistency checks

### Error Handling
- [ ] Helpful error message when model dimension mismatches
- [ ] Clear instructions for database rebuild when model changes
- [ ] Graceful handling of corrupted/missing embedding_config

---

## 🔮 Future Work (Out of Scope)

### Sprint 8: Search Endpoint Implementation
Once vec0 infrastructure is stable, implement native vector search:
- Read from vec0 tables using `MATCH` operator
- SIMD-accelerated similarity search
- Performance benchmarking vs current manual approach
- Search endpoint using pre-computed embeddings

### Model Change UX
- TUI detection of model mismatch
- One-click reindex button
- Progress tracking during rebuild

---

## 📊 Success Metrics

### Pre-Sprint Baseline
- **Embedding storage**: TEXT format (JSON/base64)
- **Search method**: Manual iteration + cosine similarity in JavaScript
- **Indexing time**: ~X seconds for test folder (measure before sprint)
- **Database size**: ~Y MB for test folder (measure before sprint)

### Post-Sprint Target
- **Embedding storage**: Vec0 virtual tables with native format
- **Search method**: Still manual (search implementation is Sprint 8)
- **Indexing time**: ≤ baseline (write path should not slow down)
- **Database size**: Similar to baseline (vec0 should be comparable)
- **Test coverage**: All lifecycle tests pass with vec0

### Validation Method
- Run full test suite before sprint (baseline)
- Run full test suite after each phase
- Compare results to ensure no regressions
- Verify semantic metadata still accessible in all tests

---

## 🎯 Sprint Execution Order

1. **Phase 1** (1 hour): Schema updates - get table definitions ready
2. **Phase 2** (1-2 hours): Database manager - initialization and validation
3. **Phase 3** (2-3 hours): Write path - critical functionality
4. **Phase 4** (2 hours): Delete path - data integrity
5. **Phase 5** (2-3 hours): Testing and validation - comprehensive coverage

**Total: 6-8 hours**

---

## 💡 Notes

- **Pre-production mode**: No backward compatibility needed, can break things
- **Databases are disposable**: Source files are truth, always safe to delete `.folder-mcp` and reindex
- **Semantic data independence**: Key phrases and readability scores are completely separate from embeddings
- **Single model constraint**: Makes implementation much simpler than multi-model support would be
- **Infrastructure focus**: This sprint prepares storage, Sprint 8 implements search

---

**Ready to implement?** Start with Phase 1 (Schema Updates) and work through phases sequentially, testing at each step.