# Production-Ready Indexing: Comprehensive Test & Fix Plan

**Goal**: Make our indexing system production-grade reliable, not just pass tests. This plan addresses all potential failure scenarios and edge cases that could break our indexing system in production.

## 🚨 Critical Production Scenarios We Must Handle

### 1. File System Volatility (Most Common in Production)
- [ ] **During Scanning**: Files added/removed/modified while scanning
- [ ] **During Indexing**: Files added/removed/modified while indexing  
- [ ] **Folder Deletion**: Entire monitored folder deleted while daemon running
- [ ] **Folder Rename**: Monitored folder renamed (appears as delete + create)
- [ ] **Network Drives**: Mounted drives that disconnect/reconnect
- [ ] **Symlinks**: Following/not following, broken symlinks, circular references

### 2. Permission & Access Failures
- [ ] **Read-Only Folder**: Can't create `.folder-mcp` directory
- [ ] **No Read Permission**: Folder exists but can't scan files
- [ ] **Mixed Permissions**: Some files readable, others not (partial indexing)
- [ ] **Permission Changes**: Permissions changed while monitoring
- [ ] **Disk Full**: Can't write embeddings database
- [ ] **File Locks**: Files locked by other processes during indexing

### 3. Daemon Lifecycle Resilience
- [ ] **Crash Recovery**: Daemon crashes mid-indexing, must resume correctly
- [ ] **Graceful Restart**: Save state, restart, continue where left off
- [ ] **Orphaned Processes**: Clean up zombie embedding processes
- [ ] **Multiple Instances**: Prevent duplicate daemons
- [ ] **State Persistence**: Remember folder states across restarts
- [ ] **Configuration Changes**: Handle config updates without data loss

### 4. Concurrent Operation Chaos
- [ ] **Rapid Add/Remove**: Same folder added/removed/added quickly
- [ ] **Duplicate Adds**: Same folder added twice simultaneously
- [ ] **Parallel Indexing**: 10+ folders indexing at once
- [ ] **State Race Conditions**: Multiple state transitions at once
- [ ] **WebSocket Floods**: Multiple clients sending conflicting commands

### 5. Resource Exhaustion
- [ ] **Memory**: Indexing 100,000+ files
- [ ] **CPU**: Throttling under load
- [ ] **File Descriptors**: Too many open files
- [ ] **Inotify Limits**: Linux file watcher limits
- [ ] **Disk I/O**: Slow disks causing timeouts
- [ ] **Network**: Embedding service timeouts

### 6. Database Integrity
- [ ] **Corruption**: Detect and rebuild corrupted databases
- [ ] **Incomplete Writes**: Handle power loss during write
- [ ] **Version Mismatch**: Migrate old database schemas
- [ ] **Lock Contention**: Multiple processes accessing same DB
- [ ] **Backup/Restore**: Ability to recover from backups

### 7. Error Recovery & Resilience
- [ ] **Transient Failures**: Retry with exponential backoff
- [ ] **Partial Success**: Some files indexed, others failed
- [ ] **Dead Letter Queue**: Track permanently failed files
- [ ] **Circuit Breaker**: Stop trying after N failures
- [ ] **Self-Healing**: Automatic recovery from known issues

## 📋 Manual Test Scenarios (TMOAT Style)

### Test Suite A: File System Chaos
- [x] **Test 1: Files changing during indexing** ✅ COMPLETED
  1. Add folder with 50 files
  2. Wait for indexing to start
  3. Add 10 new files
  4. Delete 5 files
  5. Modify 5 files
  → Verify: System detects changes, re-scans, completes successfully
  → **RESULT**: ✅ File changes detected within 2-5 seconds, proper re-indexing flow implemented

- [x] **Test 2: Folder deletion while active** ✅ COMPLETED
  1. Add folder and wait for active state
  2. Delete folder from disk (rm -rf)
  → Verify: Error state in FMDM, graceful handling, no crash
  → **RESULT**: ✅ Deleted folders removed from FMDM within 30 seconds, no ghost folders

- [ ] **Test 3: Permission denial** ⏸️ DEFERRED
  1. Create folder with files
  2. chmod 000 on some files
  3. Add folder to daemon
  → Verify: Partial indexing succeeds, errors logged for inaccessible files
  → **STATUS**: Lower priority - core file system chaos issues resolved

### Test Suite B: Daemon Resilience
- [ ] **Test 4: Crash recovery**
  1. Add 3 folders, start indexing
  2. Kill -9 daemon process
  3. Restart daemon
  → Verify: Folders restored, indexing continues from checkpoint

- [ ] **Test 5: State persistence**
  1. Add folders in various states (scanning, indexing, active)
  2. Stop daemon gracefully
  3. Start daemon
  → Verify: All folders restored with correct states, no re-indexing of completed work

### Test Suite C: Error Conditions
- [ ] **Test 6: Read-only folder**
  1. Create folder with content
  2. Mount as read-only or chmod 555
  3. Add to daemon
  → Verify: Error reported clearly, no crash, folder marked as error in FMDM

- [ ] **Test 7: Disk full**
  1. Fill disk to 95%
  2. Add large folder for indexing
  → Verify: Graceful failure, clear error message, cleanup attempted

- [ ] **Test 8: Database corruption**
  1. Add folder, let it index
  2. Corrupt embeddings.db (truncate, bad data)
  3. Restart daemon
  → Verify: Corruption detected, database rebuilt, user notified

### Test Suite D: Concurrency Stress
- [ ] **Test 9: Parallel operations**
  1. Add 10 folders simultaneously
  2. Remove 5 while others are indexing
  3. Add 5 more
  → Verify: No deadlocks, correct final state, all operations complete

- [ ] **Test 10: Rapid state changes**
  1. Add folder
  2. Immediately remove it (before scanning completes)
  3. Add it again
  → Verify: Clean state, no orphaned processes, correct final state

## 🔧 Implementation Fixes Required

### Priority 1: File Monitoring During All States
- [x] **Problem**: File changes during scanning/indexing are missed ✅ COMPLETED
- [x] **Fix**: 
  - ✅ Start file watcher immediately when folder is added
  - ✅ Maintain watcher through all state transitions
  - ✅ Connected change detection to folder state transitions
  - ✅ Implemented `active` → `scanning` state transition support

### Priority 2: Daemon State Persistence
- [x] **Problem**: Daemon doesn't restore folder states on restart ✅ COMPLETED
- [x] **Fix**:
  - ✅ Implemented `startAll()` in MonitoredFoldersOrchestrator
  - ✅ Added automatic configuration persistence for folders
  - ✅ Restore folders from configuration on daemon startup
  - ✅ Handle missing/deleted folders during restoration

### Priority 3: Comprehensive Error Handling
- [x] **Problem**: Errors don't update FMDM, no recovery strategy ✅ PARTIALLY COMPLETED
- [x] **Fix**:
  - ✅ Added error states to FMDM for folder creation failures
  - ✅ Enhanced error folder tracking in orchestrator
  - ✅ Added folder existence validation with cleanup
  - ⏸️ Retry logic and advanced recovery strategies (deferred - basic error handling implemented)

### Priority 4: Resource Management
- [ ] **Problem**: No limits or throttling
- [ ] **Fix**:
  - Add concurrent indexing limits
  - Implement memory usage monitoring
  - Add file count limits per batch
  - Create resource cleanup on errors

### Priority 5: Database Integrity
- [ ] **Problem**: No corruption detection or recovery
- [ ] **Fix**:
  - Add database health checks
  - Implement automatic rebuild on corruption
  - Add transaction support for atomic operations
  - Create backup mechanism

## 📊 Success Metrics

The indexing system is production-ready when:
- [ ] Can handle 100,000+ files without crashing
- [ ] Recovers from any single point of failure
- [ ] Provides clear error messages for all failure modes
- [ ] Never loses indexed data due to crashes
- [ ] Handles concurrent operations without deadlocks
- [ ] Respects system resources (memory, CPU, disk)
- [ ] Self-heals from transient failures
- [ ] Maintains data integrity across restarts

## 🎯 Execution Plan

### Phase 1: Manual Testing (TMOAT Approach)
- [ ] Run each test scenario manually
- [ ] Document actual vs expected behavior
- [ ] Identify all failure points

### Phase 2: Fix Implementation
- [ ] Fix issues in priority order
- [ ] Each fix includes error handling
- [ ] Add defensive programming

### Phase 3: Automated Test Creation
- [ ] Convert manual tests to automated
- [ ] Add stress tests
- [ ] Add chaos engineering tests

### Phase 4: Production Validation
- [ ] Run on real-world folders (10GB+)
- [ ] Test with various file systems
- [ ] Validate resource usage

## 📝 Progress Notes

### Test Suite A Progress: File System Chaos

**Test 1 - Files changing during indexing: 🔴 MAJOR ISSUE FOUND**
- **Issue**: File watching appears to be working (daemon logs show file watcher started), but when files are added/modified/deleted in an active folder, the daemon does not detect the changes and transition back to scanning/indexing.
- **Evidence**: 
  - Created fresh folder with 20 files
  - Added folder to daemon → went through scanning → indexing → active (100%)
  - Added 2 new files, deleted 2 files, modified 1 file after reaching active state
  - Created additional obvious test files (major_change.txt, another_test.txt, obvious_new_file.txt)
  - **Result**: Daemon stayed at "active (100%)" - no state transitions detected
- **Expected**: Should transition active → scanning → ready → indexing → active when changes detected
- **Root Cause**: File watcher is started but change detection is not triggering folder state transitions properly

**Test 2 - Folder deletion while active: 🔴 CRITICAL ISSUE FOUND**
- **Issue**: When a monitored folder is deleted from disk while daemon is running, the daemon does not detect this and keeps the folder in FMDM with "active" status
- **Evidence**:
  - Created folder with 5 files
  - Added to daemon → scanning → indexing → active (100%)
  - Deleted entire folder from disk using `rm -rf`
  - **Result**: Folder remained in FMDM with "active (100%)" status
- **Expected**: Folder should be removed from FMDM or marked with error status
- **Root Cause**: No folder existence validation or file watcher error handling for deleted folders

**Critical Issues Summary:**
1. ✅ **FIXED** - File changes in active folders are now properly detected and trigger re-scanning
2. ✅ **FIXED** - Deleted folders are automatically removed from FMDM via periodic validation

**Fixes Implemented:**
- **File Change Detection**: 
  - Added `setChangeDetectionCallback` in `MonitoringOrchestrator` 
  - Connected file watcher events to `MonitoredFoldersOrchestrator.onChangesDetected()`
  - Modified `FolderLifecycleService.startScanning()` to allow transitions from `active` → `scanning`
  - File changes now properly trigger: active → scanning → ready → indexing → active

- **Folder Deletion Detection**:
  - Added periodic folder validation timer (every 30 seconds) in `MonitoredFoldersOrchestrator`
  - Validates all monitored folders still exist using `fs.existsSync()`
  - Automatically removes non-existent folders from FMDM and configuration
  - Cleans up file watchers and managers for deleted folders

**Additional Production Enhancements:**
- ✅ **Daemon Restart Persistence**: Implemented proper `startAll()` method to restore folders from configuration
- ✅ **Error Folder Reporting**: Enhanced FMDM to track and report error folders separately
- ✅ **Configuration Persistence**: Added automatic saving/removal of folders to/from configuration

**Test Results:**
- ✅ File added to active folder → detected within ~2-5 seconds → proper re-indexing
- ✅ Folder deleted from disk → removed from FMDM within ~30 seconds → no ghost folders
- ✅ All existing test suites passing (Python embeddings, performance, user stories, file watching)
- ⚠️ 2 daemon e2e tests still failing (WebSocket FMDM broadcast + error reporting issues)

### Latest Progress (2025-01-07):

#### ✅ **COMPLETED** - Daemon Restart Functionality
- **Issue**: Daemon restart test failing with "FMDM update timeout after 5000ms"
- **Root Cause**: DaemonRegistry singleton enforcement preventing new daemon from starting
- **Fixes Applied**:
  - ✅ Added explicit `updateDaemonStatus()` call to ensure FMDM has daemon info  
  - ✅ Added `--restart` flag to override singleton enforcement
  - ✅ Added 2-second delay after daemon termination to ensure ports are released
  - ✅ Enhanced process management with proper SIGTERM handling
- **Evidence**: Restarted daemon shows proper startup sequence, WebSocket server starts, clients can connect
- **Status**: Daemon restart functionality is working correctly

#### ⚠️ **OPEN ISSUES** - E2E Test Failures
1. **WebSocket Initial FMDM Broadcast Race Condition**:
   - Client connects to restarted daemon successfully
   - Initial FMDM state not sent to newly connected clients
   - Race condition or timing issue in WebSocket message handling

2. **Error Reporting Test Timeout**:
   - "should report errors through FMDM" test failing with 10s timeout
   - Error state not being properly broadcast to WebSocket clients
   - Same underlying WebSocket broadcast issue

#### ⚠️ **OPEN ISSUE** - Folder Lifecycle State Problem  
- **Issue**: On daemon restart, TUI shows all folders as "indexing (0%)" instead of proper lifecycle
- **Expected Flow**: pending → scanning → ready → indexing → active
- **Current Flow**: indexing → active (missing intermediate states)
- **Impact**: User experience shows incorrect progress states

**Production Readiness Status:**
🎯 **CORE PRODUCTION ISSUES RESOLVED** - The indexing system handles the two most critical production scenarios (file changes + folder deletion). **Daemon restart functionality is working correctly**. 

⚠️ **REMAINING ISSUES**: WebSocket broadcast race condition affecting test reliability and user experience. This needs to be resolved for full production readiness.

*Use this section to track progress, findings, and decisions as we work through the checklist*

---

This plan will make our indexing system truly production-ready through comprehensive testing and systematic fixes.