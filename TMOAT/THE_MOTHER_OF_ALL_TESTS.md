# The Mother of All Tests (TMOAT)

## ⚠️ IMPORTANT: Living Test Suite - Continuously Evolving

**TMOAT is a living document that MUST be updated:**
- 📝 **Before starting ANY feature**: Check if TMOAT covers your test cases
- ➕ **If not covered**: ADD new test steps to TMOAT FIRST
- 🔄 **Modify existing tests**: Update them when behavior changes
- 🎯 **Agent-Led TDD**: Write the test, run it (see it fail), then implement

**Testing workflow:**
1. **START**: Check TMOAT - does it test your feature?
2. **IF NO**: Add test steps to TMOAT
3. **RUN**: Execute the new test (it should fail)
4. **IMPLEMENT**: Build the feature
5. **VERIFY**: Run TMOAT again (it should pass)
6. **COMMIT**: Only after TMOAT passes

**This is agent-led TDD** - The test suite grows with every feature.

## 🎯 Purpose

TMOAT is a comprehensive, agent-driven, end-to-end testing framework for the folder-mcp Orchestrated Folder Lifecycle Architecture. It follows a "smoke test first" approach - run one comprehensive test that covers everything, and only drill down if it fails.

## 🤖 Testing Philosophy

1. **Smoke Test First**: Start with one test that exercises the entire system
2. **Automated + Manual**: Verify automated tests exist and pass BEFORE manual testing
3. **Diagnose on Failure**: Only run targeted tests if smoke test fails
4. **Fix and Iterate**: Developers fix issues immediately upon discovery
5. **Real-World Validation**: Tests run against actual daemon, not mocks
6. **Smart Efficiency**: No redundant testing of proven functionality

**TMOAT is NOT isolated** - It integrates with and validates the automated test suite.

## 🛠️ Required Tools

The testing agent must have access to:
- **Desktop Commander** (`mcp__desktop-commander__*`) - For process management and file operations
- **WebSocket Client** - For daemon communication (ws://127.0.0.1:31850)
- **TMOAT Helpers** - Pre-built utilities in `docs/testing/tmoat-helpers.js`
- **File System Access** - To create/modify test folders
- **Process Spawning** - To start/stop the daemon
- **SQLite Access** - To inspect `.folder-mcp/embeddings.db` files

### TMOAT Helpers Available

```javascript
import { 
    TMOATWebSocketClient,    // WebSocket connection and FMDM monitoring
    TMOATFileHelper,         // File creation/modification utilities  
    TMOATValidator,          // Test validation functions
    TMOATPatterns           // Common test patterns
} from './tmoat-helpers.js';
```

## 📁 Test Folder Structure

```
/Users/hanan/Projects/folder-mcp/tests/fixtures/
├── test-knowledge-base/     # READ-ONLY test files
│   ├── Engineering/         # Technical documents
│   ├── Legal/              # PDF files
│   ├── Finance/            # XLSX files
│   └── Marketing/          # DOCX files
└── tmp/                    # CRUD test folders (create here)
    ├── smoke-test-1/       # Created during tests
    ├── smoke-test-2/       # Created during tests
    └── smoke-test-3/       # Created during tests
```

**Important**: 
- Use `test-knowledge-base` for read-only operations
- Create all test folders in `tests/fixtures/tmp/`
- Clean up `tmp/` folder after each test run

## 📋 Test Execution Protocol

### 1. Pre-Test Setup
```bash
# Clean up any previous test artifacts
rm -rf /Users/hanan/Projects/folder-mcp/tests/fixtures/tmp/*

# Build the project
npm run build

# Start daemon with clean state
node dist/src/daemon/index.js --restart

# Connect to WebSocket
ws://127.0.0.1:31850
```

### 2. Test Execution Flow
```
1. Run THE SMOKE TEST first
   ├─ PASSES → System works, ship it! ✅
   └─ FAILS → Run specific diagnostic test
        └─ Fix issue → Re-run smoke test
```

### 3. Quick Start with TMOAT Helpers
```javascript
// Use the pre-built helpers to speed up testing
import { TMOATPatterns } from './tmoat-helpers.js';

async function runQuickSmokeTest() {
    const client = await TMOATPatterns.setupSmokeTest();
    
    await TMOATPatterns.testFolderLifecycle(
        client, 
        '/Users/hanan/Projects/folder-mcp/tests/fixtures/tmp/smoke-test'
    );
    
    client.close();
}
```

### 3. WebSocket Message Format
```javascript
// Add folder
{ type: 'folder.add', payload: { path: '/path/to/folder', model: 'nomic-embed-text' }}

// Remove folder  
{ type: 'folder.remove', payload: { path: '/path/to/folder' }}

// Monitor FMDM updates
{ type: 'fmdm.update', fmdm: { folders: [...], daemon: {...}, connections: {...} }}
```

### 4. State Validation Points
- **Folder Status**: pending → scanning → ready → indexing → active
- **Progress Tracking**: 0% to 100% during indexing
- **Database Creation**: `.folder-mcp/embeddings.db` exists
- **File Monitoring**: Changes trigger re-scanning

## 🔍 Debugging Protocol

When a test fails, the agent should:
1. **Capture WebSocket logs** - All FMDM updates and messages
2. **Check daemon logs** - Via `stderr` output
3. **Inspect database** - Verify embeddings and fingerprints
4. **Examine file system** - Confirm `.folder-mcp` structure
5. **Document findings** - Create detailed failure report

## 📊 Success Criteria

Each test scenario must validate:
- ✅ Correct state transitions
- ✅ Accurate progress reporting
- ✅ Database persistence
- ✅ FMDM synchronization
- ✅ Error handling and recovery
- ✅ Resource cleanup

---

## 🚀 THE SMOKE TEST - "Everything Should Just Work"

**Time Estimate**: 5-10 minutes
**Purpose**: Validate entire system in one comprehensive test

### Test Setup

**Step 0: Verify Automated Tests Pass**
```bash
# MANDATORY: Run automated tests BEFORE manual testing
npm test                    # All automated tests must pass
npm run test:unit          # Unit tests
npm run test:integration   # Integration tests

# If any automated tests fail, stop and fix them first
# TMOAT cannot proceed with failing automated tests
```

**Step 0.5: Prepare Manual Test Environment**
```bash
# Create tmp directory if it doesn't exist
mkdir -p /Users/hanan/Projects/folder-mcp/tests/fixtures/tmp

# Clean any previous test artifacts
rm -rf /Users/hanan/Projects/folder-mcp/tests/fixtures/tmp/*

# Copy test files to create 3 folders of different sizes
cp -r tests/fixtures/test-knowledge-base/Engineering tests/fixtures/tmp/smoke-small  # 2 files
cp -r tests/fixtures/test-knowledge-base/Legal tests/fixtures/tmp/smoke-medium      # 5 files  
cp -r tests/fixtures/test-knowledge-base/Finance tests/fixtures/tmp/smoke-large     # 10 files
```

### Smoke Test Execution

**Step 1: Start daemon with --restart flag**
```bash
node dist/src/daemon/index.js --restart
```
✓ Daemon starts successfully
✓ Previous instances killed if any

**Step 2: Add 3 folders simultaneously**
```javascript
// Using TMOAT Helpers for cleaner code:
import { TMOATWebSocketClient } from './tmoat-helpers.js';

const client = new TMOATWebSocketClient();
await client.connect();

// Add all three folders
await client.addFolder('tests/fixtures/tmp/smoke-small');
await client.addFolder('tests/fixtures/tmp/smoke-medium'); 
await client.addFolder('tests/fixtures/tmp/smoke-large');

// Or manually via WebSocket:
// ws.send(JSON.stringify({ 
//   type: 'folder.add', 
//   payload: { 
//     path: '/Users/hanan/Projects/folder-mcp/tests/fixtures/tmp/smoke-small',
//     model: 'nomic-embed-text' 
//   }
// }));
```
✓ All folders appear in FMDM
✓ State progression: pending → scanning → ready → indexing → active
✓ Smaller folders complete first
✓ Progress reaches 100% for each

**Step 3: Test file monitoring (while active)**
```javascript
// Using TMOAT Helpers:
import { TMOATFileHelper } from './tmoat-helpers.js';

// Add file to small folder
TMOATFileHelper.createTestFile(
    'tests/fixtures/tmp/smoke-small/new-file.txt', 
    'New file content for testing'
);

// Modify file in medium folder
TMOATFileHelper.modifyTestFile(
    'tests/fixtures/tmp/smoke-medium/existing-file.txt',
    '\nModified content added during active state'
);

// Delete file from large folder (manual)
// rm tests/fixtures/tmp/smoke-large/Data.xlsx
```
✓ Each folder transitions: active → scanning → ready → indexing → active
✓ Only changed files are processed
✓ Progress reflects partial work

**Step 4: Stop daemon gracefully**
```bash
# Send SIGTERM or Ctrl+C
kill -TERM <daemon-pid>
```
✓ Daemon shuts down cleanly
✓ No errors in logs

**Step 5: Make offline changes**
```bash
echo "offline file" > tests/fixtures/tmp/smoke-small/offline.txt
```

**Step 6: Restart daemon**
```bash
node dist/src/daemon/index.js
```
✓ Daemon restores folder states
✓ Detects offline changes in smoke-small
✓ Only new file gets indexed

**Step 7: Remove a folder**
```javascript
ws.send(JSON.stringify({ 
  type: 'folder.remove', 
  payload: { path: '/Users/hanan/Projects/folder-mcp/tests/fixtures/tmp/smoke-medium' }
}));
```
✓ Folder removed from FMDM
✓ `.folder-mcp` directory deleted
✓ Other folders remain active

**Step 8: Test error handling**
```javascript
ws.send(JSON.stringify({ 
  type: 'folder.add', 
  payload: { 
    path: '/Users/hanan/Projects/folder-mcp/tests/fixtures/tmp/does-not-exist',
    model: 'nomic-embed-text' 
  }
}));
```
✓ Error state in FMDM
✓ Clear error message
✓ Daemon doesn't crash

**Step 9: Cleanup**
```bash
rm -rf /Users/hanan/Projects/folder-mcp/tests/fixtures/tmp/*
```

### Smoke Test Results

| Step | Component Tested | Result | Automated Test Coverage |
|------|-----------------|--------|-------------------------|
| 0 | Automated test suite | 🟢 PASS | All unit/integration tests |
| 1 | Daemon restart flag | 🟢 PASS | `tests/integration/daemon-*.test.ts` |
| 2 | Concurrent processing | 🟢 PASS | `tests/integration/folder-lifecycle-*.test.ts` |
| 3 | File monitoring | 🟢 PASS | `tests/integration/file-watcher-*.test.ts` |
| 4 | Graceful shutdown | 🟢 PASS | `tests/integration/server-shutdown.test.ts` |
| 5-6 | Offline changes | 🟢 PASS | Manual only (complex scenario) |
| 7 | Folder removal | 🟢 PASS | Covered by integration tests |
| 8 | Error handling | 🟢 PASS | `tests/integration/error-recovery.test.ts` |

**Overall**: 🟢 **SYSTEM READY TO SHIP**

**Automated Coverage Check**: ✅ All manual test areas have corresponding automated tests

---

## 🔍 DIAGNOSTIC TESTS (Only if Smoke Test Fails)

### Diagnostic Test 1: Basic Lifecycle
**When to run**: Folders stuck in pending/scanning/ready states

**Focus**: Single folder, watch every state transition
```bash
mkdir -p tests/fixtures/tmp/diag-lifecycle
cp tests/fixtures/test-knowledge-base/Engineering/* tests/fixtures/tmp/diag-lifecycle/
# Add folder and log EVERY FMDM update
# Check: Where does it get stuck?
# Check: Any errors in daemon stderr?
# Check: Database initialization logs?
```

### Diagnostic Test 2: Database & Persistence
**When to run**: Re-indexing on every restart, fingerprints not working

**Focus**: Database creation and change detection
```bash
# Check .folder-mcp directory exists
ls -la tests/fixtures/tmp/*/folder-mcp/
# Inspect database
sqlite3 tests/fixtures/tmp/smoke-small/.folder-mcp/embeddings.db "SELECT COUNT(*) FROM documents;"
# Compare fingerprints before/after restart
```

### Diagnostic Test 3: Concurrency Issues  
**When to run**: Folders interfere with each other, race conditions

**Focus**: Add folders one at a time vs simultaneously
```bash
# Test 1: Add sequentially with 10 second gaps
# Test 2: Add all at once
# Compare: Do results differ?
# Check: Task queue processing logs
```

### Diagnostic Test 4: File Monitoring
**When to run**: Changes not detected in active state

**Focus**: Individual change types and debouncing
```bash
# Test each separately:
# 1. Add single file → wait → verify scan
# 2. Modify single file → wait → verify scan  
# 3. Delete single file → wait → verify scan
# 4. Rapid changes → verify debouncing works
```

### Diagnostic Test 5: Error Recovery
**When to run**: Errors crash daemon or leave bad state

**Focus**: Each error type in isolation
```bash
# Test individually:
# 1. Non-existent path → should error gracefully
# 2. Delete folder while active → should handle
# 3. Delete .folder-mcp → should recover
# 4. Kill -9 during indexing → should recover on restart
---

## 🎯 Quick Decision Tree

```
Smoke Test Failed?
    │
    ├─ Step 2 failed (folders stuck) → Run Diagnostic Test 1
    ├─ Step 6 failed (re-indexing all) → Run Diagnostic Test 2  
    ├─ Step 2 failed (race conditions) → Run Diagnostic Test 3
    ├─ Step 3 failed (changes ignored) → Run Diagnostic Test 4
    └─ Step 8 failed (daemon crashed) → Run Diagnostic Test 5
```

---

## 🚦 Test Results Template

### Smoke Test Run: [DATE]

```
AUTOMATED TESTS FIRST:
npm test ....................................... [ ]
npm run test:unit .............................. [ ]
npm run test:integration ....................... [ ]
--> All automated tests must pass before manual testing

MANUAL SMOKE TEST:
Build: npm run build ........................... [ ]
Daemon start: node dist/src/daemon/index.js .... [ ]
Step 1: Daemon restart flag .................... [ ]
Step 2: Concurrent folder processing ........... [ ]  
Step 3: File monitoring ........................ [ ]
Step 4: Graceful shutdown ...................... [ ]
Step 5-6: Offline changes & restart ............ [ ]
Step 7: Folder removal ......................... [ ]
Step 8: Error handling ......................... [ ]
Cleanup: rm -rf tests/fixtures/tmp/* .......... [ ]

Overall Result: [ ] PASS / [ ] FAIL
```

**If FAIL, which step**: ___________
**Error message**: ___________
**Next action**: Run Diagnostic Test #___

---

## 📊 Performance Metrics (Optional)

- **Total test time**: ___ seconds
- **Time to active (per folder)**:
  - Small (2 files): ___ seconds
  - Medium (5 files): ___ seconds  
  - Large (10 files): ___ seconds
- **Indexing speed**: ___ files/second
- **Memory usage**: Peak ___ MB
- **CPU usage**: Peak ___ %
- **Database size**: ___ MB for ___ files

---

## 🔧 Troubleshooting Quick Reference

**Issue**: Folder stuck in 'pending' state
- Check daemon logs for errors
- Verify folder path exists and is readable
- Ensure model is available
- Run Diagnostic Test 1

**Issue**: Re-indexing everything on restart
- Check .folder-mcp directory exists
- Verify database has fingerprints
- Check detectChanges() logic
- Run Diagnostic Test 2

**Issue**: Progress not updating
- Monitor WebSocket for FMDM updates
- Check if indexing service is running
- Verify task queue is processing
- Look for errors in embedding generation

**Issue**: Database not created
- Check folder write permissions
- Verify SQLiteVecStorage initialization
- Look for disk space issues
- Check for .folder-mcp conflicts

**Issue**: Changes not detected
- Verify file watcher is active
- Check debounce timing
- Ensure folder is in 'active' state
- Look for inotify limit issues (Linux)

## 🔨 How to Extend TMOAT for New Features

### Before implementing ANY feature:

1. **Check Automated Test Coverage** - Does an automated test exist for this feature?
2. **If NO automated test**:
   - Create automated test FIRST (unit/integration as appropriate)
   - Add to relevant test file in `tests/unit/` or `tests/integration/`
   - Run `npm test` to see it fail
3. **Review the TMOAT Smoke Test** - Does it cover your feature's manual testing?
4. **If NO manual coverage, add test steps**:
   ```markdown
   **Step X: Test [Feature Name]**
   ```bash
   # Commands to test the feature manually
   ```
   ✓ Expected outcome 1
   ✓ Expected outcome 2
   | X | [Feature Name] | 🟢 PASS | `tests/path/to/automated.test.ts` |
   ```

5. **Update the Results Template** - Add your feature to both automated and manual checklists
6. **Run automated test** - Should FAIL (feature not implemented)
7. **Run TMOAT** - Should FAIL (feature not implemented)
8. **Implement the feature**
9. **Run automated test** - Should PASS
10. **Run TMOAT** - Should PASS
11. **Both must pass before feature is complete**

### Example: Adding WebSocket Authentication Feature

```markdown
**Step 10: Test WebSocket Authentication**
```javascript
// Try connecting without auth token
ws.send(JSON.stringify({ type: 'folder.add', ... }));
// Should get authentication error

// Connect with valid token
ws.send(JSON.stringify({ 
  type: 'connection.init', 
  token: 'test-token-123' 
}));
// Should succeed
```
✓ Unauthenticated requests rejected
✓ Authenticated requests accepted
```

## 📅 When to Run TMOAT

### Mandatory Testing Points:
1. **Before declaring feature complete** - No exceptions
2. **After fixing bugs** - Verify no regressions
3. **Before pull requests** - Must pass for PR approval
4. **After merging changes** - Verify integration works
5. **When debugging issues** - Reproduce and fix

### Quick Check vs Full Test:
- **Quick Check** (2 mins): Run smoke test steps 1-3 only
- **Full Test** (10 mins): Complete smoke test
- **Deep Dive** (30+ mins): Smoke test + relevant diagnostic tests

## 🎯 Success Criteria Summary

TMOAT is considered successful when:
- ✅ **THE SMOKE TEST PASSES** - All 9 steps complete successfully
- ✅ No daemon crashes during testing
- ✅ State transitions follow expected pattern
- ✅ Progress reaches 100% for each folder
- ✅ Database persists across restarts
- ✅ File changes are detected and processed
- ✅ Errors are handled gracefully
- ✅ Cleanup is complete

## 🚦 Test Status Legend

When documenting test results, use:
- 🟢 **PASS**: Test completed successfully
- 🟡 **PARTIAL**: Test passed with minor issues
- 🔴 **FAIL**: Test failed, investigation needed
- ⚪ **SKIP**: Test not applicable or blocked
- 🔄 **RETRY**: Test needs re-execution
- 🐛 **BUG**: Test revealed a bug to fix

---

## 📈 TMOAT Evolution Log

Track how TMOAT grows over time:

| Date | Feature Added | Test Steps Added | Added By |
|------|--------------|------------------|----------|
| [Initial] | Core Lifecycle | Steps 1-9 | Original |
| | | | |
| | | | |

*Add entries above as you extend TMOAT for new features*

---

*TMOAT - A living test suite that grows with every feature. Agent-led TDD at its finest.*