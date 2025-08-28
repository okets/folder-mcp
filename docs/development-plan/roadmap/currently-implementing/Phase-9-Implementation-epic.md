# Phase 9: MCP Multi-Folder Support - Simple SCRUM Plan

**📋 Related Documentation**: [Phase 9 PRD - MCP Endpoints Multi-Folder Support](./Phase-9-PRD-MCP-Endpoints-Multi-Folder-Support.md)

## 🚀 Current Status
**Sprint 1**: ✅ **COMPLETE** (All 4 tasks done)
- MCP server can now run without folder arguments
- WebSocket connection to daemon established 
- Daemon API endpoints implemented:
  - `get_server_info()` - Returns system info with hardware capabilities
  - `get_folder_info()` - Returns folder configuration and status
  - `getFoldersConfig()` - Returns all configured folders

**Notable Changes:**
- Changed from `get_status()` to `get_server_info()` for better clarity
- Implemented as "hello world" level endpoints (level 2/10 effort)
- Reused existing MachineCapabilities for hardware info

**Test Files:**
- `tests/integration/phase-9-sprint-1-task-1.test.ts` - Tests MCP server without folder argument
- `tests/integration/phase-9-simple-api.test.ts` - Tests get_server_info and get_folder_info endpoints

## Goal
Transform MCP endpoints from single-folder to multi-folder aware through daemon connection.

## Problem
Current: `MCP Server → Direct File Access (single folder)`
Target: `MCP Server → WebSocket → Daemon → Multi-Folder System`

## Prerequisites
**Path-Aware Topic Detection**: The daemon must have topic detection working to provide rich folder metadata:
- Subfolder intelligence: Documents in same subfolder get 20% similarity boost during clustering
- Subfolder names weighted 5x in topic term extraction (e.g., "Algebra/" becomes primary cluster term)
- Topic clusters cached for fast retrieval by endpoints (< 50ms)
- **Status**: This should already be implemented as part of Task 11.5 completion

## Verification Method
- **Backend changes**: TMOAT scripts (WebSocket tests, database queries, logs)
- **LLM functionality**: Subagent testing (after architecture is working)

---

## Sprint 1: Foundation (Days 1-4)
**Goal**: Connect MCP server to daemon via WebSocket

### Tasks
1. **Remove folder argument requirement from MCP server** ✅ Done
   - Modify `src/mcp-server.ts` to start without folder path
   - Make folder parameter optional in CLI parsing
   - Test: `node dist/mcp-server.js` starts without crashing

2. **Add WebSocket client to MCP server** ✅ Done
   - Install `ws` dependency
   - Create `DaemonClient` class for WebSocket communication
   - Connect to daemon on startup: `ws://localhost:3001`
   - Test: WebSocket connection established, logs show "Connected to daemon"

3. **Create daemon API endpoints for MCP requests** ✅ Done
   - Add WebSocket handlers in daemon for MCP operations
   - Implement `get_server_info`, `get_folder_info` endpoints first
   - Test: Direct WebSocket calls to daemon return expected data

4. **Forward MCP calls through WebSocket** ✅ Done (for implemented endpoints)
   - Updated MCP server to use `DaemonClient` for folder configuration
   - Implemented WebSocket message handling for new endpoints
   - Test: WebSocket calls to daemon return expected data

### Sprint 1 Success Criteria
- [x] MCP server starts without folder arguments
- [x] WebSocket connection to daemon established
- [x] get_server_info endpoint works through daemon
- [ ] Response time < 1 second

---

## Sprint 2: Basic Endpoints + State Validation (Days 5-7)
**Goal**: Get core read-only endpoints working with multi-folder data and state validation

### Tasks
1. **Implement state validation middleware**
   - Block operations on non-active folders with helpful errors
   - Allow read operations on 'indexing' folders (partial data)
   - Prevent operations on 'error'/'pending' folders
   - Provide status-specific guidance to LLMs

2. **Implement daemon-side folder operations**
   - Create handlers for `get_folder_info`, `list_documents`
   - Return data from all configured folders with enhanced response format
   - Include folder status, document counts, topics with proper structure

3. **Update MCP endpoints to be folder-aware**
   - Add `folder` parameter to `list_documents`
   - Update response format to include detailed folderContext:
     ```json
     {
       "folderContext": {
         "name": "Sales",
         "path": "/path/to/Sales",
         "model": "all-MiniLM-L6-v2", 
         "status": "active"
       }
     }
     ```
   - Validate folder state before operations

4. **Create MCP testing subagent**
   - Configure Claude Code: `"args": ["/path/to/dist/mcp-server.js"]`
   - Create subagent with MCP tools access
   - Test basic endpoints: get_server_info, get_folder_info, list_documents

### Sprint 2 Success Criteria
- [x] get_folder_info shows folders with status (topics pending)
- [ ] list_documents works with folder parameter and state validation
- [ ] State validation blocks operations on non-active folders
- [ ] Subagent can successfully call endpoints
- [ ] All responses include structured folderContext

---

## Sprint 3: Document Access (Days 8-10)
**Goal**: Enable document retrieval from any folder

### Tasks
1. **Update document endpoints for folder awareness**
   - Modify `get_document_outline`, `get_document_data`
   - Add `get_sheet_data`, `get_slides`, `get_pages` with folder parameter
   - Implement folder + document path resolution

2. **Test document access across folders**
   - Verify can access Sales documents: Q4_Board_Deck.pptx
   - Verify can access Legal documents: Acme_Vendor_Agreement.pdf
   - Test different file formats (PDF, DOCX, XLSX, PPTX)

### Sprint 3 Success Criteria
- [ ] Can get outlines from documents in different folders
- [ ] Can access slides, sheets, pages by folder
- [ ] Error handling for invalid folder/document combinations
- [ ] Subagent can retrieve content from multiple folders

---

## Sprint 4: Search Implementation (Days 11-13)  
**Goal**: Enable folder-specific semantic search with model registry

### Tasks
1. **Add folder parameter to search endpoint**
   - Make `folder` parameter required for search
   - Update schema definition for search tool
   - Validate folder state before search execution

2. **Implement model registry and switching in daemon**
   - Track which model each folder uses (model registry system)
   - Load correct embedding model per folder automatically
   - Cache models with LRU eviction (max 3 models) 
   - Handle model loading failures gracefully
   - Model loading orchestration with proper attribution

3. **Enhanced search responses with folderContext**
   - Include detailed folderContext in search results:
     ```json
     {
       "folderContext": {
         "name": "Sales",
         "path": "/path/to/Sales",
         "model": "all-MiniLM-L6-v2",
         "status": "active"
       },
       "results": [...],
       "performance": {
         "searchTime": 245,
         "modelLoadTime": 156
       }
     }
     ```

4. **Test search isolation**
   - Search "Q4 revenue" in Sales → should find business docs
   - Search "Q4 revenue" in Legal → should find few/no results  
   - Search "contracts" in Legal → should find legal docs
   - Search "contracts" in Sales → should find few/no results

### Sprint 4 Success Criteria
- [ ] Search requires and uses folder parameter with state validation
- [ ] Model registry tracks which model each folder uses
- [ ] Results include structured folderContext with model information
- [ ] Model switching works automatically with performance metrics
- [ ] Search isolation between folders confirmed
- [ ] Performance: search < 500ms including model loading (PRD target)

---

## Sprint 5: Integration Testing (Days 14-15)
**Goal**: Complete validation and performance optimization

### Tasks
1. **Create comprehensive integration test**
   - Test all endpoints with real data
   - Verify database state matches responses
   - Measure performance against targets
   - Test error scenarios

2. **Final subagent validation**
   - Complete workflow: discover folders → list docs → search → retrieve content
   - Cross-folder testing to confirm isolation
   - Error handling validation

3. **Performance optimization**
   - Optimize model caching
   - Improve WebSocket message handling
   - Ensure all operations meet performance targets

### Sprint 5 Success Criteria
- [ ] All 10 endpoints work with multi-folder setup
- [ ] Subagent completes full multi-folder workflow
- [ ] Performance targets met across all operations
- [ ] Error messages clear and actionable
- [ ] System ready for production use

---

## Daily SCRUM Questions
1. **What did I verify yesterday?** (specific test results)
2. **What will I implement and test today?** (concrete tasks)
3. **What's blocking me?** (failed tests, missing pieces)

## Definition of Done (Each Sprint)
- [ ] All planned functionality implemented
- [ ] TMOAT tests written and passing
- [ ] Subagent validation completed (Sprint 2+)
- [ ] Database state verified
- [ ] Performance targets met
- [ ] No regressions in existing functionality

## Success Metrics
- **Technical**: All endpoints work with folder parameters and state validation
- **Performance**: Search < 500ms, folder resolution < 10ms, model switching < 2s, state validation < 5ms (PRD targets)
- **Quality**: Subagent completes complex multi-folder workflows
- **Usability**: Error messages help users resolve issues
- **Model Management**: Model registry tracks and switches models correctly per folder

---

This plan is linear, straightforward, and builds functionality incrementally. Each sprint delivers working, testable functionality without complex dependencies.