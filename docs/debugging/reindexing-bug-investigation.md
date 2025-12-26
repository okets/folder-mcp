# Re-Indexing Bug Investigation

> **Status**: ✅ TWO ROOT CAUSES FOUND AND FIXED (2025-12-26)
>
> **Last Updated**: 2025-12-26 03:00 IST
>
> **Problem**: Folders occasionally get completely re-indexed on daemon restart even though valid indexed data exists.

---

## 🎯 FIXES APPLIED (2025-12-26)

### Root Cause #1: Wrong Table Name in Fallback Query
The fallback query in `getEmbeddingCount()` was using a non-existent table name:
- **Wrong**: `SELECT COUNT(*) FROM embeddings` (table doesn't exist!)
- **Correct**: `SELECT COUNT(*) FROM documents` (always exists)

**Fix**: Changed `folder-lifecycle-service.ts:1539-1543`:
```typescript
// Before (WRONG)
const result = db.prepare('SELECT COUNT(*) as count FROM embeddings').get();

// After (FIXED)
const result = db.prepare('SELECT COUNT(*) as count FROM documents').get();
```

**Evidence**: 5 corruption backup files created (false positives) - cleaned up Dec 26 ~02:55.

---

### Root Cause #2: VERSION.json Path Resolution Failure
The schema version was read using `process.cwd()` which varies by execution context:
- When daemon runs from Claude Desktop, CWD is `/Applications/Claude.app/...`
- VERSION.json not found → fallback to version 3
- Database has version 4 → **SCHEMA MISMATCH** → `rebuildDatabase()` → RE-INDEX!

**Evidence**: Repeated MCP log entries:
```
[ERROR] Daemon stderr: Could not read VERSION.json, using default schema version
```

**Fix**: Changed `schema.ts:12-45` to:
1. Use `import.meta.url` to resolve paths relative to compiled file
2. Try multiple paths: `__dirname`, `cwd()`, `cwd()/dist`
3. Changed fallback from version 3 → version 4 (current schema)

```typescript
// Before (WRONG)
const versionPath = join(process.cwd(), 'VERSION.json');
return 3; // fallback

// After (FIXED)
const possiblePaths = [
    join(__dirname, '..', '..', '..', '..', 'VERSION.json'),
    join(process.cwd(), 'VERSION.json'),
    join(process.cwd(), 'dist', 'VERSION.json'),
];
return 4; // fallback matches current schema
```

---

### Cleanup Performed (Dec 26 02:55 IST)
- Removed 5 false-positive corruption backup files (~45MB total)
- Path: `/Users/hanan/Projects/folder-mcp/docs/.folder-mcp/embeddings.db.corrupted.*`

---

## Summary

**FIVE independent bugs** caused random re-indexing or progress jumping:

| # | Trigger | Cause | Fix |
|---|---------|-------|-----|
| 1 | `embeddingCount === 0` | Fallback query hit wrong table (`embeddings` vs `documents`) | Fixed table name |
| 2 | Schema version mismatch | `VERSION.json` not found → fallback v3 vs stored v4 | Multiple path resolution + v4 fallback |
| 3 | `isCorrupted: true` | Native module error treated as DB corruption | `isEnvironmentError()` check |
| 4 | Zombie MCP servers | Old processes with stale native modules | `killZombieMcpServers()` in restart |
| 5 | `No key phrases provided` | KeyBERT returns empty `[]` for some chunks | `generateFallbackKeyPhrases()` in extraction-service.ts |

All fixes are now in source and compiled dist.

---

### Root Cause #3: Environment Errors Treated as Corruption
When `better-sqlite3` throws native module mismatch error, `checkCorruption()` was treating it as database corruption → renamed `embeddings.db` to `.corrupted` → next restart saw no database → full re-index.

**Fix**: Added `isEnvironmentError()` detection in `database-recovery.ts`:
- Detects native module version mismatch, dlopen failures
- Returns `isCorrupted: false` for environment errors
- Database file is preserved

---

### Root Cause #4: Zombie MCP Server Processes
When `npm run build` runs, existing MCP server processes (spawned by Claude.app, VS Code) keep running with **old native modules**. These zombies cause:
- Environment errors when accessing database
- False corruption detection
- Database renamed to `.corrupted`

**Fix**: Added `killZombieMcpServers()` to `daemon/index.ts`:
- `npm run daemon:restart` now kills all `folder-mcp mcp server` processes
- MCP clients will spawn fresh instances with new modules

---

### Root Cause #5: Empty Key Phrases from KeyBERT
When daemon restarts and re-processes files, KeyBERT semantic extraction sometimes fails for specific chunks (short text, special characters, formatting-heavy content). Python silently returns an empty array `[]` instead of failing:

```python
# main.py:473-475
except Exception as e:
    logger.warning(f"Failed to extract keyphrases for text {i}: {e}")
    keyphrases_batch.append([])  # Empty list for failed extraction
```

This propagates through the system:
1. Python returns empty `[]` for that chunk
2. TypeScript receives empty array at `extraction-service.ts:212`
3. Chunk gets `semanticMetadata.keyPhrases = []`
4. Storage at `sqlite-vec-storage.ts:635` checks `keyPhrases.length > 0`
5. **THROWS ERROR**: "CRITICAL: No key phrases provided for chunk"
6. File processing fails, progress regresses

**Symptom**: Progress bar "jumps back and forth" during restart indexing.

**Fix**: Added `generateFallbackKeyPhrases()` in `extraction-service.ts`:
- Detects when KeyBERT returns empty array
- Generates basic key phrases using word frequency + bigram extraction
- Logs a warning but continues processing
- Ensures at least 1-5 key phrases are always available

```typescript
// extraction-service.ts
if (keyPhrases.length === 0) {
  keyPhrases = this.generateFallbackKeyPhrases(text);
  this.logger.warn('KeyBERT returned empty key phrases, using fallback extraction');
}
```

---

## Problem Description

- **Symptom**: Folders that were already indexed get re-indexed from scratch
- **Frequency**: Random/occasional - not every restart
- **Impact**: Long re-indexing times, poor user experience

---

## Related Commits (Previously Fixed Issues)

| Commit | Date | Issue Fixed |
|--------|------|-------------|
| `6c35160` | 2025-12-24 | Double-removal bug - folders reappearing in FMDM |
| `33230c8` | 2025-12-25 | Environment error data loss - native module mismatch deleting .folder-mcp |
| `00d1e6d` | 2025-09-06 | WAL mode isolation - file states not persisting between connections |
| `e554ac4` | 2025-09-12 | PROCESSING state stuck files not resuming on restart |

---

## Root Cause Analysis

### The Trigger Point

**Location**: `src/application/indexing/folder-lifecycle-service.ts:877-881`

```typescript
const embeddingCount = await this.getEmbeddingCount();
const forceReprocess = embeddingCount === 0;  // If 0, RE-INDEX EVERYTHING
if (forceReprocess) {
    this.logger.info('[MANAGER-DETECT] No embeddings found in database, forcing reprocessing of all files');
}
```

If `getEmbeddingCount()` returns 0 for ANY reason, all files are force-reprocessed.

### Chain of Failure Points

#### 1. `loadIndex()` Sets `ready = false`

**Location**: `src/infrastructure/embeddings/sqlite-vec/sqlite-vec-storage.ts:175-180`

```typescript
const stats = await this.dbManager.getStats();
if (stats.embeddingCount > 0) {
    this.ready = true;
} else {
    this.ready = false;  // ANY failure cascades from here
    this.logger?.warn('Vector index is empty');
}
```

If `getStats()` fails or returns 0 transiently, `ready` becomes `false`.

#### 2. `getEmbeddingCount()` Has 5+ Exit Paths Returning 0

**Location**: `src/application/indexing/folder-lifecycle-service.ts:1505-1554`

| Condition | Return Value | Line |
|-----------|--------------|------|
| `!this.active` | 0 | 1510 |
| Database file doesn't exist | 0 | 1518 |
| `sqliteVecStorage.getStats()` throws | Falls through | 1528 |
| Fallback query fails | 0 | 1543 |
| Any exception in outer try | 0 | 1552 |

#### 3. No Visibility Into WHY 0 Was Returned

The current code silently returns 0 without logging which path was taken or what error occurred.

### Why It's Occasional

Possible transient causes:
- SQLite WAL checkpoint timing (database momentarily unreadable)
- File system timing after sleep/wake
- Race conditions in database initialization
- Antivirus momentarily blocking file access

---

## Potential Connection to Commit 33230c8

Commit `33230c8` added environment error detection to prevent data loss, but there might be edge cases:

1. **Errors not classified as "environment errors"** but still shouldn't delete data
2. **`originalError` parameter not always passed** to `performResourceCleanup()`
3. **Some cleanup paths might not preserve data properly**

### Key Functions Added in 33230c8

```typescript
// src/daemon/services/monitored-folders-orchestrator.ts

function isEnvironmentError(error: Error | string): boolean {
  // Detects: NODE_MODULE_VERSION, dlopen failures, Python issues
}

private async performResourceCleanup(
  folderPath: string,
  reason: string,
  originalError?: Error  // If present, checks isEnvironmentError()
): Promise<void> {
  const preserveData = originalError ? isEnvironmentError(originalError) : false;
  // If preserveData=false, deletes .folder-mcp directory!
}
```

---

## Proposed Fixes (When Bug Recurs)

### Fix 1: Dedicated Indexing Events Log ✅

Create `~/.folder-mcp/indexing-events.log` that captures:

| Event | Location | What to Log |
|-------|----------|-------------|
| Database created | `database-manager.ts:initialize()` | NEW database created at {path} |
| Database loaded | `database-manager.ts:initialize()` | Existing database loaded, {count} embeddings |
| loadIndex ready=false | `sqlite-vec-storage.ts:loadIndex()` | loadIndex set ready=FALSE: count={n} |
| loadIndex ready=true | `sqlite-vec-storage.ts:loadIndex()` | loadIndex set ready=TRUE: count={n} |
| getEmbeddingCount result | `folder-lifecycle-service.ts` | getEmbeddingCount returned {n}, path={which}, reason={why} |
| forceReprocess=true | `folder-lifecycle-service.ts:878` | FORCE REPROCESS: embeddingCount=0, folder={path} |
| performResourceCleanup | `monitored-folders-orchestrator.ts` | Cleanup: reason={r}, preserveData={bool}, deletedDir={bool} |

**Log Format**:
```
[2025-12-26T10:30:45.123Z] [EVENT_TYPE] message | key=value, key=value
```

### Fix 2: Retry Logic for getEmbeddingCount() ✅

```typescript
private async getEmbeddingCountWithRetry(maxRetries = 3, delayMs = 500): Promise<number> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const count = await this.getEmbeddingCount();
        if (count > 0) return count;

        if (attempt < maxRetries) {
            this.logIndexingEvent('EMBEDDING_COUNT_RETRY',
                `Attempt ${attempt}/${maxRetries} returned 0, retrying...`);
            await new Promise(r => setTimeout(r, delayMs));
        }
    }

    this.logIndexingEvent('EMBEDDING_COUNT_ZERO',
        `All ${maxRetries} attempts returned 0 - forcing reprocess`);
    return 0;
}
```

### Fix 3: Enhanced Logging in 33230c8 Areas ✅

```typescript
// In performResourceCleanup()
this.logIndexingEvent('RESOURCE_CLEANUP', {
    folder: folderPath,
    reason,
    originalError: originalError?.message,
    isEnvError: originalError ? isEnvironmentError(originalError) : false,
    preserveData,
    willDeleteDir: !preserveData
});
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/daemon/index.ts` | Add `logIndexingEvent()` function |
| `src/application/indexing/folder-lifecycle-service.ts` | Add retry logic + logging |
| `src/infrastructure/embeddings/sqlite-vec/database-manager.ts` | Log DB creation/loading |
| `src/infrastructure/embeddings/sqlite-vec/sqlite-vec-storage.ts` | Log loadIndex outcomes |
| `src/daemon/services/monitored-folders-orchestrator.ts` | Log cleanup events |

---

## Deferred (Need More Data)

- **Marker file persistence** - Write `.folder-mcp/.indexed-marker` after successful indexing
- **WAL checkpoint forcing** - Force WAL checkpoint before counting embeddings
- **Database path validation** - Ensure path construction is consistent

---

## How to Debug When Bug Recurs

1. **Check if `.folder-mcp/` directory exists** before and after daemon restart
2. **Check `~/.folder-mcp/indexing-events.log`** (after implementing Fix 1)
3. **Look for patterns**:
   - Does it happen after system sleep?
   - After brew upgrade?
   - After killing daemon mid-indexing?
4. **Add temporary verbose logging** to `getEmbeddingCount()` to trace exact path taken
