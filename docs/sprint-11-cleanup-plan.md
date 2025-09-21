# Sprint 11 Document-Level Semantics - Post-Fix Cleanup Plan

## Executive Summary
✅ **Sprint 11 bug FIXED**: Document-level embeddings and keywords now correctly persist in folder-specific databases.

🎯 **Main remaining task**: Single DB connection optimization to eliminate multiple connections per folder during indexing.

## Current Status (What's Working)
- ✅ **Document-level semantics persist correctly** - Sprint 11 features fully functional
- ✅ **Removed phantom "default database" fallback** that caused silent failures
- ✅ **Fixed architecture**: FolderLifecycleService now handles all storage with folder-specific databases
- ✅ **Cleaned up debug logs** from troubleshooting sessions
- ✅ **Working smoke test**: Multiple folders correctly index with document-level semantics

## Main Issue to Resolve

### 🎯 Single DB Connection Optimization
**Problem**: Currently multiple database connections open for the same SQLite file during indexing:
1. `SQLiteVecStorage` in FolderLifecycleService - handles chunk storage
2. `SQLiteVecStorage.updateDocumentSemantics()` - opens another connection for document updates
3. Potential additional connections during search operations

**Impact**:
- SQLite locking issues
- Inefficient resource usage
- Performance degradation
- Potential race conditions

**Solution**: Refactor to single connection per folder during indexing cycle

## Remaining Tasks

### Task 1: Minor Cleanup (5 minutes)
- Remove any remaining commented-out code from debugging sessions
- Clean up unused imports that may have been added during troubleshooting
- Verify no stale code patterns remain

### Task 2: Single DB Connection Architecture (Main Task - 45 minutes)

**Current Flow (Multiple Connections):**
```
FolderLifecycleService → SQLiteVecStorage → new Database()
    ↓
Orchestrator returns documentSemantics
    ↓
FolderLifecycleService.updateDocumentSemantics() → SQLiteVecStorage.updateDocumentSemantics() → new Database()
```

**Target Flow (Single Connection):**
```
FolderLifecycleService → SQLiteVecStorage (maintains single connection)
    ↓
All operations (INSERT documents, INSERT chunks, INSERT embeddings, UPDATE document semantics)
use same connection within transaction boundaries
```

**Implementation:**
1. **SQLiteVecStorage connection management**:
   - Keep database connection open throughout indexing lifecycle
   - Use transactions to batch related operations
   - Ensure proper connection cleanup on shutdown

2. **Combine operations in transactions**:
   ```sql
   BEGIN TRANSACTION;
   INSERT INTO documents (...);
   INSERT INTO chunks (...);
   INSERT INTO embeddings (...);
   UPDATE documents SET document_embedding=..., document_keywords=... WHERE id=...;
   COMMIT;
   ```

3. **Remove redundant connection opens**:
   - `updateDocumentSemantics()` should use existing connection
   - Don't create new Database instances for each operation

### Task 3: Fix Tests (30 minutes)
- Update tests to expect single connection behavior
- Fix any tests that assume multiple connections
- Update mocks to match new connection lifecycle

### Task 4: Final Verification (15 minutes)
- Run smoke test with multiple folders
- Verify no SQLite locking errors in logs
- Confirm document-level semantics still persist correctly
- Measure performance improvement

## Implementation Priority

**Phase 1**: Connection Lifecycle Management
- Modify SQLiteVecStorage to maintain persistent connection during indexing
- Implement proper connection cleanup

**Phase 2**: Transaction Batching
- Combine document + chunk + embedding + semantics operations
- Use SQL transactions for atomicity

**Phase 3**: Testing & Verification
- Update tests, run smoke tests, confirm no regressions

## Success Criteria
- ✅ Single database connection per folder during indexing
- ✅ No SQLite locking errors in logs
- ✅ Document-level semantics continue to persist correctly
- ✅ Improved indexing performance
- ✅ All tests passing
- ✅ Clean, maintainable code

## Files to Modify
- `src/infrastructure/embeddings/sqlite-vec/sqlite-vec-storage.ts` - Main connection management
- `src/application/indexing/folder-lifecycle-service.ts` - Update to use single connection pattern
- Related test files
- Remove any stale debugging code

## Notes
- This optimization addresses performance and reliability, not functionality
- Document-level semantics are already working correctly
- Focus is on eliminating unnecessary database connections during indexing cycles