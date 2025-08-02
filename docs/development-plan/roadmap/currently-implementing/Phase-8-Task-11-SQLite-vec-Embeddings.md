# Phase 8 Task 11: SQLite-vec Embeddings Storage Implementation

**Status**: 🚧 IN PROGRESS  
**Start Date**: 2025-07-30  
**Dependencies**: Task 10 (Python Embeddings System)  
**Test Folder**: `/Users/hanan/Projects/folder-mcp/tests/fixtures/test-knowledge-base/`

## Overview

Replace the mock in-memory VectorSearchService and JSON file storage with a production-ready SQLite-vec implementation. This provides persistent embedding storage with fast similarity search using SIMD acceleration.

## Key Design Decisions

1. **Disposable Embeddings**: No migration needed - embeddings can be recreated from source files
2. **Per-Folder Databases**: Each folder gets its own `.folder-mcp/embeddings.db`
3. **Clean Architecture**: Proper DI boundaries between domain interfaces and infrastructure
4. **Zero Dependencies**: SQLite-vec is self-contained and works everywhere SQLite works
5. **Test-First Development**: All tests use the test knowledge base folder

## Architecture

```
Domain Layer:
├── IVectorSearchService (existing interface)
├── IEmbeddingService (existing interface)
└── Search domain types (SearchResult, etc)

Infrastructure Layer:
├── src/infrastructure/embeddings/sqlite-vec/
│   ├── sqlite-vec-storage.ts (main implementation)
│   ├── database-manager.ts (SQLite connection management)
│   ├── schema.ts (database schema definitions)
│   └── query-builder.ts (SQL query construction)
└── src/infrastructure/storage/
    └── multi-folder-storage.ts (update to use SQLite-vec)

DI Container:
└── Update services.ts to use SQLiteVecStorage instead of mock
```

## Updated Folder Status Model

**New Simplified Status Names** (to be implemented in Sub Task 7):
```typescript
export type FolderIndexingStatus = 
  | 'scanning'     // Looking for file changes, creating embeddings creation list
  | 'indexing'     // Currently indexing files (show X/Y progress)
  | 'active'       // Embeddings are fully available
  | 'error';       // Embeddings, folder or model unavailable
```

## Database Schema

```sql
-- Core tables
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT UNIQUE NOT NULL,
    fingerprint TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT,
    last_modified TIMESTAMP NOT NULL,
    last_indexed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    needs_reindex INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    start_offset INTEGER NOT NULL,
    end_offset INTEGER NOT NULL,
    token_count INTEGER,
    UNIQUE(document_id, chunk_index)
);

-- Virtual table for vector storage using vec0 extension
CREATE VIRTUAL TABLE IF NOT EXISTS embeddings USING vec0(
    chunk_id INTEGER PRIMARY KEY,
    embedding FLOAT32[768]  -- Dimension will be dynamic based on model
);

-- Metadata for search results
CREATE TABLE IF NOT EXISTS chunk_metadata (
    chunk_id INTEGER PRIMARY KEY REFERENCES chunks(id) ON DELETE CASCADE,
    page_number INTEGER,
    section_name TEXT,
    sheet_name TEXT,
    slide_number INTEGER
);

-- Configuration tracking
CREATE TABLE IF NOT EXISTS embedding_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),  -- Ensure single row
    model_name TEXT NOT NULL,
    model_dimension INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_path ON documents(file_path);
CREATE INDEX IF NOT EXISTS idx_documents_fingerprint ON documents(fingerprint);
CREATE INDEX IF NOT EXISTS idx_chunks_document ON chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_documents_needs_reindex ON documents(needs_reindex);
```

## Implementation Plan

### ✅ Sub Task 1: Setup and Infrastructure **COMPLETED**
- ✅ Install sqlite-vec package (`npm install sqlite-vec`)
- ✅ Create `src/infrastructure/embeddings/sqlite-vec/` directory structure  
- ✅ Implement `DatabaseManager` class for SQLite connection management
  - ✅ Connection pooling (if needed)
  - ✅ Database initialization with schema
  - ✅ WAL mode and performance settings
  - ✅ Error handling and recovery
- ✅ Create `schema.ts` with all table definitions
- ✅ Write unit tests for database initialization

### ✅ Sub Task 2: Core Storage Implementation **COMPLETED**
- ✅ Create `SQLiteVecStorage` class implementing `IVectorSearchService`
  - ✅ Constructor with database path injection
  - ✅ `buildIndex(embeddings, metadata)` implementation
    - ✅ Begin transaction
    - ✅ Insert/update documents
    - ✅ Insert chunks
    - ✅ Insert embeddings using vec0
    - ✅ Insert metadata
    - ✅ Commit transaction
  - ✅ `search(queryVector, topK, threshold)` implementation
    - ✅ Use vec_distance_cosine for similarity
    - ✅ Join with chunks and documents
    - ✅ Return SearchResult objects
  - ✅ `isReady()` status check
  - ✅ `loadIndex()` for compatibility (no-op)
- ✅ Implement proper error handling and logging
- ✅ Add transaction support for atomic operations

### ✅ Sub Task 3: WebSocket Protocol Extensions **COMPLETED**
- ✅ Add `folder.add` message handler to daemon WebSocket protocol
- ✅ Add `folder.remove` message handler to daemon WebSocket protocol  
- ✅ Add `folder.validate` message handler to daemon WebSocket protocol
- ✅ Implement configuration persistence through daemon
- ✅ Connect daemon to real configuration system with proper paths
- ✅ Fix TUI first-run wizard to use FMDM data instead of local config

### 🔍 **MANUAL TESTING REVIEW STOP 1: Basic SQLite-vec database operations** ✅ **PASSED**

**Test Results**: 
- ✅ SQLite databases created successfully in folder `.folder-mcp/embeddings.db`
- ✅ Database schema properly initialized with all required tables
- ✅ TUI-Daemon WebSocket communication working correctly
- ✅ Folder addition/removal operations functional via TUI
- ✅ Configuration persistence working across daemon restarts

**Status**: Ready to proceed with daemon indexing integration

### ✅ Sub Task 4: FMDM Status Interface Extension **COMPLETED**
- ✅ **Extend FMDM FolderConfig interface** with status tracking
  - ✅ Add `status` field to `FolderConfig` in `src/daemon/models/fmdm.ts`
  - ✅ Define `FolderIndexingStatus` type: `'pending' | 'indexing' | 'indexed' | 'error' | 'watching'`
  - ✅ Update TypeScript interfaces across codebase
- ✅ **Update daemon FMDM operations** to include status
  - ✅ Modify folder addition to set initial status as `'pending'`
  - ✅ Update all FMDM broadcast messages to include folder status
  - ✅ Add `updateFolderStatus()` method to FMDM service for status changes
  - ✅ Ensure status changes trigger FMDM updates to connected clients
- ✅ **Separate configuration concerns**
  - ✅ Create `ConfigFolderEntry` interface for configuration service
  - ✅ Keep FMDM `FolderConfig` separate with runtime status
  - ✅ Clean conversion between config and FMDM formats

### Sub Task 5: Daemon Indexing Pipeline Integration
- [ ] **Connect SQLiteVecStorage to daemon indexing**
  - [ ] Update `IndexingOrchestrator` to use SQLiteVecStorage instead of mock
  - [ ] Integrate per-folder database creation in daemon
  - [ ] Ensure databases are created in correct folder `.folder-mcp/embeddings.db` locations
- [ ] **Implement background indexing with status updates**
  - [ ] Modify indexing process to update folder status: `pending` → `indexing` → `indexed`
  - [ ] Handle indexing errors with `error` status, final success with `watching` status
  - [ ] Ensure status changes are broadcast via FMDM to TUI clients
- [ ] **Add folder validation integration**
  - [ ] Ensure SQLite database initialization during folder addition
  - [ ] Handle database creation errors gracefully
  - [ ] Update folder removal to clean up SQLite databases

**Unit Tests for Sub Task 5**:
```typescript
// tests/daemon/indexing/sqlite-vec-integration.test.ts
describe('SQLiteVecStorage Daemon Integration', () => {
  it('should connect SQLiteVecStorage to IndexingOrchestrator', async () => {
    // Test that IndexingOrchestrator uses SQLiteVecStorage not mock
  });
  
  it('should create per-folder databases in correct locations', async () => {
    // Test database creation at folderPath/.folder-mcp/embeddings.db
  });
  
  it('should update folder status during indexing process', async () => {
    // Test status progression: pending → indexing → indexed → watching
  });
  
  it('should handle indexing errors with proper status updates', async () => {
    // Test error status updates and recovery
  });
  
  it('should broadcast status changes via FMDM', async () => {
    // Test that status changes trigger FMDM broadcasts
  });
  
  it('should initialize SQLite database during folder addition', async () => {
    // Test database initialization in daemon folder handlers
  });
  
  it('should clean up databases during folder removal', async () => {
    // Test database cleanup when folders are removed
  });
});

// tests/daemon/services/fmdm-status-integration.test.ts  
describe('FMDM Status Integration', () => {
  it('should update folder status via updateFolderStatus method', async () => {
    // Test FMDM service status updates
  });
  
  it('should broadcast status changes to connected clients', async () => {
    // Test WebSocket status broadcasting
  });
  
  it('should handle multiple folder status updates independently', async () => {
    // Test concurrent status updates for different folders
  });
});
```

**Integration Tests**:
```bash
# Test with actual test-knowledge-base folder
npm run test:integration -- --grep "SQLite-vec daemon integration"

# Manual daemon testing
node dist/src/daemon/index.js  # Start daemon
# In another terminal: npm run tui
# Add test-knowledge-base folder, watch status updates
```

### 🔍 **MANUAL TESTING REVIEW STOP 2: Daemon Integration**

**Test Focus**: SQLite-vec storage working with daemon, status tracking functional

**Manual TUI Test Scenarios**:
```bash
# Terminal 1: Start TUI
npm run tui

# Test Scenario 1: Status progression during indexing
1. Add test-knowledge-base folder via TUI
2. Watch ManageFolderItem status progress through states:
   - Should start as "pending" or "initializing"
   - Progress through: "scanning" → "parsing" → "embedding" → "indexing"
   - End at "ready" when complete
3. Verify SQLite database created at: test-knowledge-base/.folder-mcp/embeddings.db
4. Check database has proper schema and contains indexed documents

# Test Scenario 2: Database creation and content verification
1. After indexing completes, inspect SQLite database:
   sqlite3 /path/to/folder/.folder-mcp/embeddings.db
   .tables  # Should show: documents, chunks, embeddings, chunk_metadata, embedding_config
   SELECT COUNT(*) FROM documents;  # Should show indexed document count
   SELECT COUNT(*) FROM chunks;     # Should show chunk count > document count
   SELECT COUNT(*) FROM embeddings; # Should match chunk count
2. Verify embedding dimensions are consistent
3. Test search functionality works with SQLite-vec backend
```

**Pass/Fail Criteria**:
- ✅ **PASS**: Status progression works correctly through all indexing sub tasks
- ✅ **PASS**: SQLite databases created in correct locations with proper schema
- ✅ **PASS**: Documents successfully indexed and searchable
- ✅ **PASS**: TUI shows real-time status updates during indexing
- ❌ **FAIL**: Status updates don't reflect actual indexing progress
- ❌ **FAIL**: SQLite databases not created or have wrong schema
- ❌ **FAIL**: Indexing fails or documents not properly stored

**Required Before Proceeding**: SQLite-vec storage fully integrated with daemon, status tracking working correctly

### ✅ Sub Task 6: Basic Status Broadcasting Infrastructure **COMPLETED**

**What was implemented:**
- [x] **FMDM Service with status broadcasting**
  - [x] `updateFolderStatus()` method in FMDM service
  - [x] WebSocket broadcast of status changes to all connected clients
  - [x] Status field in FMDM model (`FolderConfig.status`)
- [x] **Daemon integration with basic status updates**
  - [x] Status updates in `startFolderIndexing()`: pending → indexing → indexed/error
  - [x] Error handling with status update to 'error' on failures
  - [x] Connection to FMDM service for broadcasting
- [x] **WebSocket protocol support**
  - [x] FMDM updates automatically broadcast to TUI clients
  - [x] Multiple folder status tracking independently
  - [x] Real-time connection maintained between daemon and TUI

**Current Status Flow**: `pending` → `indexing` → `indexed` or `error`

### ✅ Sub Task 7: Complete Status System with TUI Display **COMPLETED**

**Status**: ✅ COMPLETED
**Why**: Basic status system implemented and working, architectural issues identified

**What Was Implemented**:
- ✅ Updated FMDM Status Model with new status types (scanning/indexing/active/error)
- ✅ Added progress tracking fields to FolderConfig interface
- ✅ Implemented VALID_STATUS_TRANSITIONS state machine
- ✅ Updated FMDM Service with throttling mechanism (1 update/second per folder)
- ✅ Added state transition validation to prevent invalid transitions
- ✅ Implemented pending updates queue with 100ms flush interval
- ✅ Added scanning phase to IndexingOrchestrator
- ✅ Updated daemon indexing flow with complete status lifecycle
- ✅ Connected status display to TUI with progress and error handling
- ✅ Created comprehensive test suite for status system

**Critical Issues Fixed**:
1. **Storage Module Import**: Fixed ES module imports requiring explicit .js extensions
2. **Status Transitions**: Added self-transition for 'indexing' to allow progress updates
3. **Status Reversion Bug**: Identified root cause as missing async orchestration

## Sub Task 7.5: Implement FolderLifecycleOrchestrator 🚧 NEXT

**Status**: 🚧 NOT STARTED
**Why**: Need proper orchestration to manage complete folder lifecycle and prevent race conditions

### Problem Statement:
Current implementation reports indexing completion while async callbacks (chunking, embedding) are still pending. This causes:
- Status reverting from 'active' back to 'indexing 94%'
- Race conditions between completion reporting and async work
- No single source of truth for folder processing state

### Solution - FolderLifecycleOrchestrator:
A comprehensive orchestrator that manages the entire folder lifecycle:

1. **Scanning Phase Orchestration**:
   - Coordinate file discovery and planning
   - Report scanning progress (X files found, Y to index)
   - Determine if indexing is needed or go straight to active

2. **Indexing Phase Orchestration**:
   - Track ALL async work (parsing, chunking, embedding)
   - Prevent premature completion reporting
   - Ensure all callbacks complete before status change
   - Provide accurate progress reporting

3. **Status Management**:
   - Single source of truth for folder status
   - Enforce proper state transitions
   - Handle error states and recovery
   - Support incremental re-indexing

4. **Integration Points**:
   - Receive work from daemon's startFolderIndexing
   - Coordinate with IndexingOrchestrator
   - Update FMDM with accurate status
   - Track async job completion

### Implementation Tasks:
- [ ] Create FolderLifecycleOrchestrator class
- [ ] Implement async job tracking mechanism
- [ ] Add scanning phase with progress reporting
- [ ] Ensure proper completion detection for all async work
- [ ] Integrate with daemon and FMDM service
- [ ] Add comprehensive error handling and recovery
- [ ] Support pause/resume capabilities
- [ ] Enable incremental indexing triggers

### Architectural Issues to Address:
1. **Async Callback Race Conditions**:
   - Current IndexingOrchestrator reports completion while async work is pending
   - Need to track all async operations (parsing, chunking, embedding)
   - Prevent premature 'active' status until ALL work completes

2. **Missing Lifecycle Coordination**:
   - No single component manages the complete folder lifecycle
   - Status updates scattered across multiple services
   - Need unified orchestration from scanning through active state

3. **Configuration Synchronization**:
   - Multiple configuration sources (FMDM, ConfigurationComponent, FolderManager)
   - Cache invalidation issues between components
   - Need single source of truth for folder state


## Sub Task 8: Embed All Documents on First Run ❌ NOT IMPLEMENTED

**Status**: ❌ NOT STARTED
**Why**: Moved to after Sub Task 7.5 completion

### 🔍 **MANUAL TESTING REVIEW STOP 3: Complete Status Integration**

**Test Focus**: End-to-end status tracking and user experience validation

**Manual TUI Test Scenarios**:
```bash
# Terminal 1: Start TUI
npm run tui

# Test Scenario 1: Real-time status tracking
1. Start with clean state (no configured folders)
2. Add test-knowledge-base folder via TUI
3. Watch ManageFolderItem status during indexing:
   - Should start as "pending" (yellow/orange)
   - Progress through sub tasks with appropriate colors
   - End at "ready" (green) when complete
4. Verify status updates happen in real-time, not just start/end
5. Check that TUI remains responsive throughout indexing

# Test Scenario 2: Multiple folder independence
1. Add first folder, let it start indexing
2. While first folder is indexing, add second folder
3. Verify each ManageFolderItem shows independent status
4. Confirm both progress to "ready" independently
5. Test removing one folder doesn't affect the other

# Test Scenario 3: Error handling and recovery
1. Add folder with permission issues or corrupted files
2. Watch status progress until error encountered
3. Verify status changes to "error" (red) with clear indication
4. Fix the issue and test retry functionality if available
5. Confirm status progresses back to "ready" after resolution

# Test Scenario 4: Performance and responsiveness
1. Add large folder (50+ documents) via TUI
2. Monitor TUI responsiveness during indexing
3. Verify status updates don't cause lag or performance issues
4. Check that other TUI functions work normally during indexing
```

**Pass/Fail Criteria**:
- ✅ **PASS**: Status transitions are clear and accurate throughout indexing
- ✅ **PASS**: Real-time updates work smoothly without performance impact
- ✅ **PASS**: Multiple folders show independent status correctly
- ✅ **PASS**: Error states are clearly indicated with helpful information
- ✅ **PASS**: TUI remains responsive during heavy indexing operations
- ❌ **FAIL**: Status updates are delayed, inaccurate, or missing
- ❌ **FAIL**: Performance degrades during status updates
- ❌ **FAIL**: Multiple folders interfere with each other's status display

**Required Before Proceeding**: Complete status integration working flawlessly, excellent user experience

### ❌ Sub Task 9: Performance Optimization and Edge Cases **NOT IMPLEMENTED**
- [ ] **Database performance optimization**
  - [ ] Implement database vacuum/optimization on startup
  - [ ] Add query performance monitoring and logging
  - [ ] Optimize embedding search queries for large datasets
- [ ] **Error handling and robustness**
  - [ ] Handle corrupt database recovery
  - [ ] Add model version checking to detect embedding dimension mismatches
  - [ ] Force reindex when model changes
  - [ ] Handle file permission errors gracefully
- [ ] **Cleanup and maintenance**
  - [ ] Implement proper cleanup on daemon shutdown
  - [ ] Remove mock `VectorSearchService` from `src/di/services.ts`
  - [ ] Delete JSON file storage code and unused imports
  - [ ] Update DI container registration to use SQLiteVecStorage

### ❌ Sub Task 10: Testing and Validation **NOT IMPLEMENTED**
- [ ] **Comprehensive unit tests**
  - [ ] SQLiteVecStorage database operations
  - [ ] Document CRUD operations
  - [ ] Embedding storage and retrieval
  - [ ] Search functionality with performance validation
  - [ ] Error scenarios and recovery
- [ ] **Integration tests with test knowledge base**
  - [ ] Index all test documents
  - [ ] Verify search quality matches or exceeds mock system
  - [ ] Test incremental updates and file monitoring
  - [ ] Performance benchmarks (indexing speed, search latency, memory usage)
- [ ] **End-to-end testing**
  - [ ] Complete TUI workflow testing
  - [ ] Multi-folder scenarios
  - [ ] Error handling and recovery
  - [ ] Database integrity validation

### 🔍 **MANUAL TESTING REVIEW STOP 4: Complete Functionality Verification**

**Test Focus**: End-to-end functionality, performance, and robustness validation

**Manual TUI Test Scenarios**:
```bash
# Terminal 1: Start TUI
npm run tui

# Test Scenario 1: Complete workflow validation
1. Fresh start: Add test-knowledge-base folder via TUI
2. Wait for complete indexing, verify "ready" status
3. Verify SQLite database created with proper schema
4. Test search functionality if available via daemon endpoints
5. Confirm search results are accurate and performant (< 100ms)

# Test Scenario 2: Performance validation
1. Add large folder (50+ documents) via TUI
2. Monitor indexing performance and memory usage
3. Time indexing process (should be reasonable for document count)
4. Verify TUI remains responsive during heavy indexing
5. Test multiple concurrent folder indexing if applicable

# Test Scenario 3: Error scenario robustness
1. Add folder with corrupted/unreadable files
2. Verify graceful error handling, no crashes
3. Test folder with permission errors
4. Confirm indexing continues with readable files
5. Test removing folder during indexing
6. Verify clean cancellation and database cleanup

# Test Scenario 4: Database integrity validation
1. After successful indexing, inspect database:
   sqlite3 /path/to/folder/.folder-mcp/embeddings.db
   PRAGMA integrity_check;  # Should return "ok"
2. Verify vector dimensions consistent across embeddings
3. Check all foreign key relationships are valid
4. Confirm embedding_config table has correct model information
```

**Pass/Fail Criteria**:
- ✅ **PASS**: Complete workflow works end-to-end without errors
- ✅ **PASS**: Performance meets requirements, TUI stays responsive
- ✅ **PASS**: Error scenarios handled gracefully, no crashes
- ✅ **PASS**: Database integrity checks pass, no corruption
- ✅ **PASS**: Search functionality works with SQLite-vec backend
- ❌ **FAIL**: Any crashes or unhandled exceptions
- ❌ **FAIL**: Performance degrades significantly
- ❌ **FAIL**: Database corruption or integrity issues

**Required Before Proceeding**: All functionality working correctly, performance requirements met

## Testing Strategy

All tests will use the test knowledge base at `/Users/hanan/Projects/folder-mcp/tests/fixtures/test-knowledge-base/` which contains:
- Legal contracts (PDF, DOCX)
- Sales data (XLSX)
- Presentations (PPTX)
- Various document types for comprehensive testing

### Test Scenarios
1. **Basic Operations**
   - Initialize database
   - Index documents
   - Search for content
   - Update documents
   - Delete documents

2. **Edge Cases**
   - Empty folder
   - Huge documents (5000+ chunks)
   - Corrupted files
   - Permission errors
   - Database corruption

3. **Performance**
   - Index 100+ documents
   - Search response time < 100ms
   - Memory usage stable
   - Concurrent operations

4. **Integration**
   - File monitoring updates
   - Multi-folder search
   - MCP endpoint compatibility

## Success Criteria

- [ ] All tests passing (zero tolerance for failures)
- [ ] Mock VectorSearchService completely removed
- [ ] JSON file storage code deleted
- [ ] SQLite-vec working with test knowledge base
- [ ] Search results match or exceed mock quality
- [ ] Performance meets requirements (< 100ms search)
- [ ] Multi-folder support fully functional
- [ ] File monitoring integration working
- [ ] Clean shutdown and startup
- [ ] No memory leaks

## Code Cleanup Checklist

### Files to Delete/Clean
- [ ] `src/di/services.ts` - Remove mock VectorSearchService class
- [ ] Remove JSON embedding save logic from indexing pipeline
- [ ] Remove JSON embedding load logic from cache system
- [ ] Clean up `.folder-mcp/embeddings/` directory creation
- [ ] Remove any embedding-related mock data

### Files to Update
- [ ] `src/di/services.ts` - Register SQLiteVecStorage
- [ ] `src/infrastructure/storage/multi-folder-storage.ts` - Use SQLiteVecStorage
- [ ] `src/application/indexing/orchestrator.ts` - Ensure compatibility
- [ ] Tests that rely on mock storage

## Notes

- SQLite-vec uses SIMD acceleration (AVX on x86, NEON on ARM)
- Supports multiple distance metrics (we'll use cosine similarity)
- Can handle millions of vectors efficiently
- No external dependencies or servers required
- Works in all environments where SQLite works