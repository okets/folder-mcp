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

## 🚨 CRITICAL: Test Failure Analysis Protocol

**NEVER adjust tests to match broken implementations!** 

When a test fails, follow this decision tree:

### Test Failure Decision Process:
1. **THINK**: What is this test validating? Is it a valid business requirement?
2. **ANALYZE**: Is the test outdated due to architectural changes, or revealing a real bug?

**If test represents valid business logic/requirement:**
- ✅ **FIX THE IMPLEMENTATION** - The test is correct, our code is wrong
- ✅ Keep the test, make the system match the expected behavior

**If test is outdated/wrong:**  
- ❌ **DELETE THE TEST** - Remove stale/incorrect tests completely
- ❌ Never adjust tests just to make them pass

**If test is unclear:**
- 🤔 **INVESTIGATE** - Understand the business domain and intended behavior
- 🤔 Make informed decision based on domain knowledge, not convenience

### Skipped Tests Policy:
- **All `.skip()` tests must be evaluated**: Either fix and unskip, or delete entirely
- **No stale code allowed**: Tests that can't be fixed or aren't worth fixing should be removed
- **Clean test suite**: Every test must have clear value and pass reliably

## 🎯 Purpose

TMOAT is a comprehensive, agent-driven, end-to-end testing framework for the folder-mcp Orchestrated Folder Lifecycle Architecture. It follows a "smoke test first" approach - run one comprehensive test that covers everything, and only drill down if it fails.

## 📊 Automated Test Suite Execution

### Running Full Test Suite (3-Minute Method)

The full automated test suite takes approximately 3 minutes (175-183 seconds) to complete. Due to the long execution time, use this method:

**Background Process Testing Method:**
```bash
# Start tests as background process with output to file
npm test > /tmp/test-results.log 2>&1 &

# Wait for completion (check every 60 seconds)
sleep 60  # First check at 1 minute
tail -20 /tmp/test-results.log  # Check if still running

sleep 60  # Second check at 2 minutes
tail -20 /tmp/test-results.log  # Check if still running

sleep 60  # Third check at 3 minutes
tail -20 /tmp/test-results.log  # Check if still running

sleep 60  # Final check at 4 minutes (should be done)
tail -100 /tmp/test-results.log  # View results
```

**Expected Output:**
```
Test Files  74 passed | 1 skipped (75)
     Tests  889 passed | 2 skipped (891)
  Duration  ~182s
```

**Using Desktop Commander:**
```bash
# Via Desktop Commander for better process management
mcp__desktop-commander__start_process --command "npm test > /tmp/test-results.log 2>&1" --timeout_ms 300000

# Check results after ~3 minutes
tail -100 /tmp/test-results.log
```

### Quick Test Runs

For faster feedback during development:
```bash
# Run specific test file
npm test -- tests/integration/daemon-e2e.test.ts

# Run with pattern matching
npm test -- --grep "daemon"

# Run unit tests only (fast)
npm run test:unit
```

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
- **Desktop Commander** (`mcp__desktop-commander__*`) - **CRITICAL**: Primary tool for ALL process management and file operations
- **WebSocket Client** - For daemon communication (ws://127.0.0.1:31850)
- **ESLint** (`mcp__eslint__lint-files`) - **ESSENTIAL**: For catching interface errors, missing methods, type mismatches, and code quality issues
- **Tree-sitter** (`mcp__tree-sitter__*`) - **ESSENTIAL**: For semantic code analysis, finding methods, interfaces, class definitions, and understanding code structure
- **TMOAT Helpers** - Pre-built utilities in `TMOAT/tmoat-helpers.js`
- **File System Access** - To create/modify test folders (via Desktop Commander)
- **NEVER use direct process spawning** - All process management MUST go through Desktop Commander
- **SQLite Access** - To inspect `.folder-mcp/embeddings.db` files

### 🔧 Long-Running Test Management

**CRITICAL**: For long-running commands (npm test, builds, etc.), use Desktop Commander background execution:

```bash
# ❌ WRONG: Direct execution - will timeout
npm test

# ✅ CORRECT: Background execution via Desktop Commander
mcp__desktop-commander__start_process --command "npm test" --timeout_ms 600000

# Then periodically check status:
mcp__desktop-commander__read_process_output --pid <process-id> --timeout_ms 5000

# Check if process is still running:
mcp__desktop-commander__list_sessions
```

**Why this matters:**
- `npm test` can take 5-10+ minutes with integration tests
- Python embeddings tests download models (slow on first run)
- Direct command execution will timeout in agents
- Desktop Commander provides proper background process management

**CRITICAL WORKFLOW**:
1. Use Desktop Commander to manage daemon lifecycle (start/stop/restart)
2. Use WebSocket to communicate with daemon (add/remove folders, monitor FMDM)
3. Use Desktop Commander for all file operations and process monitoring
4. NEVER try to run the TUI - it requires interactive terminal that agents can't access

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

## 🚨 CRITICAL: Temporary File Policy

**NEVER SPAM THE USER'S PC OR PROJECT ROOT WITH TEMPORARY FILES!**

**MANDATORY RULES:**
- ✅ **ALWAYS** create temporary files in designated directories only:
  - `[project-path]/tests/fixtures/tmp/` for test fixtures and test data
  - `[project-path]/tmp/` for general temporary files, test scripts, debug logs
- ❌ **NEVER** create temporary files in:
  - **Project root directory** (`./test-*.js`, `./debug.*`, `./monitor-*`)
  - User's home directory (`/Users/hanan/`)
  - System temp directories (`/tmp/`, `/var/tmp/`)
  - Any location outside the project folder

**🧹 CLEANUP PROTOCOL:**
- **BEFORE any test/operation**: `rm -f ./test-* ./debug.* ./monitor-* ./quick-*`
- **AFTER any test/operation**: `rm -rf ./tmp/* ./tests/fixtures/tmp/*`
- **Clean project root**: Remove any files matching forbidden patterns

**❌ FORBIDDEN file patterns in project root:**
- `./test-*.js`, `./test-*.cjs`, `./test-*.ts` → Use `./tmp/test-*.js`
- `./debug.*`, `./debug-*.*` → Use `./tmp/debug.*`
- `./monitor-*.*`, `./quick-*.*`, `./check-*.*` → Use `./tmp/monitor-*.*`
- `./indexing-*.*`, `.*-process.*` → Use `./tmp/indexing-*.*`
- Any files starting with: `test-`, `debug-`, `monitor-`, `quick-`, `check-`

**✅ TESTING FILE ORGANIZATION:**
- **Read-only fixtures**: Use `tests/fixtures/test-knowledge-base/` (never modify)
- **Test data creation**: Use `tests/fixtures/tmp/test-data-${timestamp}/`
- **Test scripts**: Use `tmp/test-${operation}-${timestamp}.js`
- **Debug logs**: Use `tmp/debug-${component}.log`
- **CRITICAL**: Any code creating temporary directories MUST use project-local paths only

## 📋 Test Execution Protocol

### 1. Pre-Test Setup
```bash
# Clean up any previous test artifacts
rm -rf /Users/hanan/Projects/folder-mcp/tests/fixtures/tmp/*

# Build the project
npm run build

# CRITICAL: Start daemon using Desktop Commander (NOT directly)
# This allows full agent control over the daemon process lifecycle
mcp__desktop-commander__start_process --command "node dist/src/daemon/index.js --restart" --timeout_ms 10000

# Connect to WebSocket from test code
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
// Connection init (REQUIRED - use supported client type)
{ type: 'connection.init', clientType: 'cli' }

// Add folder (CRITICAL: Use correct model name)
{ type: 'folder.add', payload: { path: '/path/to/folder', model: 'folder-mcp:all-MiniLM-L6-v2' }}

// Remove folder  
{ type: 'folder.remove', payload: { path: '/path/to/folder' }}

// Monitor FMDM updates
{ type: 'fmdm.update', fmdm: { folders: [...], daemon: {...}, connections: {...} }}
```

**CRITICAL WebSocket Requirements:**
- **Client Type**: Must be 'cli', 'tui', or 'web' (NOT 'tmoat-smoke-test')
- **Model Name**: Must use 'folder-mcp:all-MiniLM-L6-v2' (NOT 'nomic-embed-text')
- **Connection Init**: Always send connection.init first before any other messages

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

**Step 1: Start daemon using Desktop Commander**
```bash
# CRITICAL: Use Desktop Commander to run daemon in background
# The daemon MUST be run in the background using the Desktop Commander MCP server
# This allows the testing agent to have full control over the daemon lifecycle

# Start daemon with --restart flag through Desktop Commander:
mcp__desktop-commander__start_process --command "node dist/src/daemon/index.js --restart" --timeout_ms 10000

# OR use npx folder-mcp --daemon if CLI is preferred (future)
# npx folder-mcp --daemon --restart

# NEVER run daemon directly without Desktop Commander in testing
# NEVER try to run the TUI (requires interactive terminal that agents can't use)
```
✓ Daemon starts successfully in background
✓ Previous instances killed if any
✓ Desktop Commander manages the process
✓ Agent has full control over daemon lifecycle

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
//     model: 'folder-mcp:all-MiniLM-L6-v2' 
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

**Step 4: Stop daemon gracefully using Desktop Commander**
```bash
# Use Desktop Commander to terminate the process properly
# This ensures clean shutdown and proper resource cleanup

mcp__desktop-commander__force_terminate --pid <daemon-pid>

# OR if using the CLI approach (future):
# npx folder-mcp --daemon --stop
```
✓ Daemon shuts down cleanly
✓ No errors in logs
✓ Desktop Commander handles process termination properly

**Step 5: Make offline changes**
```bash
echo "offline file" > tests/fixtures/tmp/smoke-small/offline.txt
```

**Step 6: Restart daemon using Desktop Commander**
```bash
# Restart daemon through Desktop Commander
mcp__desktop-commander__start_process --command "node dist/src/daemon/index.js" --timeout_ms 10000

# OR if using CLI approach (future):
# npx folder-mcp --daemon --restart
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
    model: 'folder-mcp:all-MiniLM-L6-v2' 
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

## 🎯 Comprehensive TMOAT Test Scenarios

The expanded TMOAT test suite now includes atomic tests for comprehensive system validation:

### Basic System Operations (Tests 1-4)
1. **Connection Test**: WebSocket connection establishment with correct client type
2. **Folder Addition Test**: Complete folder lifecycle (pending → scanning → ready → indexing → active)
3. **File Monitoring Test**: Real-time file change detection while folder is active
4. **Folder Cleanup Test**: Proper folder removal and resource cleanup

### Advanced System Resilience (Tests 5-9) 
5. **Database Verification Test**: Validates `.folder-mcp/embeddings.db` creation and SQLite structure
6. **Complete Folder Cleanup Test**: Ensures complete `.folder-mcp` directory removal on folder deletion
7. **Daemon Restart Test**: Tests incremental scanning after daemon restart (remove 2 files, add 1, modify 1)
8. **Offline Changes Test**: Validates detection of file changes made while daemon was offline
9. **Database Recovery Test**: Verifies system rebuilds database when `.folder-mcp` directory is deleted

### Test Execution
```bash
# Run complete atomic test suite
node TMOAT/run-smoke-test.js

# Run individual atomic test
node TMOAT/atomic-test-N-description.js
```

Each atomic test is self-contained and validates specific functionality with real WebSocket communication to the daemon.

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