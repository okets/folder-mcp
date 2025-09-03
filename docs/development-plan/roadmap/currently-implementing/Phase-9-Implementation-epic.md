# Phase 9 Implementation Epic - MCP Multi-Folder Support

**📋 Related Documentation**: [Phase 9 PRD - MCP Endpoints Multi-Folder Support](./Phase-9-PRD-MCP-Endpoints-Multi-Folder-Support.md)

## 🔧 Git Workflow Instructions

### Branch Naming Strategy
**Principle**: Name branches based on logical work units, not sprint numbers.

**Phase 9 Branch Structure**:
- `phase-9-mcp-foundation` - Sprints 1-3 (REST API, MCP daemon mode, first endpoint)
- `phase-9-folder-operations` - Sprints 4-6 (folder CRUD, document operations)
- `phase-9-search-integration` - Sprints 7-9 (search, optimization, legacy cleanup)

### When to Create New Branches
1. **Start new branch** when beginning a logical group of sprints
2. **Continue on same branch** for related sprint work
3. **Switch branches** only when starting significantly different features

### Commit Strategy
**During Development**:
- Make logical commits for each meaningful change
- Use conventional commit format: `feat:`, `fix:`, `refactor:`, `test:`
- Include descriptive messages explaining the "why"

**Sprint Completion**:
- Create a sprint summary commit: `feat: complete Phase 9 Sprint X - [Sprint Title]`
- Include list of completed tasks in commit body
- Add Co-Authored-By if worked with Claude

### Pull Request Strategy
**When to Create PR**:
- After completing a logical group of sprints (e.g., Sprints 1-3)
- When you have a cohesive, reviewable feature set
- NOT required at every sprint boundary

**PR Guidelines**:
- Title: `Phase 9: [Feature Group Name]` (e.g., "Phase 9: MCP Foundation")
- Description should cover all completed sprints
- Include testing instructions
- Link to relevant Epic sections

### Current Phase 9 Git Plan
1. **Sprints 1-3**: Use branch `phase-9-mcp-foundation`
   - Sprint 1: REST Foundation ✅
   - Sprint 2: MCP Server Without Folder ✅
   - Sprint 3: First Endpoint Migration ✅
   - **Action**: Create PR after Sprint 3 completion

2. **Sprints 4-6**: Create new branch `phase-9-folder-operations`
   - Sprint 4: Create a revolutionary MCP testing method ✅
   - Sprint 5: Document List Endpoints ✅
   - Sprint 6: Document Operations (Document Content + Outline Endpoints) ✅
   - **Action**: Create PR after Sprint 6 completion ← **NOW**

3. **Sprints 7-9**: Create new branch `phase-9-search-integration`
   - Sprint 7: Search Implementation
   - Sprint 7.5: Performance & Optimization and use real data. no mocks!
   - Sprint 8: Legacy Cleanup
   - **Action**: Create PR after Sprint 8 completion

---

## 🧪 Standard Testing Methodology

### Agent-to-Endpoint Testing (MANDATORY for ALL Sprints)

**What it is**: Testing the complete integration chain from MCP client → MCP server → REST API → Daemon services, exactly as end users would experience it.

**Why it's critical**: 
- Tests the actual user journey, not just individual components
- Validates the complete request flow through all architectural layers
- Catches integration issues that unit tests miss
- Ensures MCP protocol compliance end-to-end

**How to implement for EVERY Sprint**:

1. **Use Installed MCP Tools**: Use the folder-mcp MCP tools that are already available in Claude Code
   ```bash
   # The MCP tools are already installed and available:
   # - mcp__folder-mcp__list_folders
   # - mcp__folder-mcp__list_documents  
   # - mcp__folder-mcp__search
   # etc.
   ```

2. **Agent-to-Endpoint Flow**: Test the complete integration chain
   ```
   Claude Code Agent → MCP Tool Call → MCP Server → REST API → Daemon → Multi-Folder System
   ```

3. **Test as End User Would**:
   - Start daemon: `node dist/src/daemon/index.js --restart`
   - The MCP server connects automatically to daemon REST API (port 3002)  
   - Use MCP tools directly in Claude Code: `mcp__folder-mcp__list_folders`
   - Verify results come from daemon's multi-folder system

4. **Standard Test Categories**:
   - **Happy Path**: Normal operation with valid inputs
   - **Error Cases**: Invalid inputs, missing data, network failures
   - **Edge Cases**: Empty lists, large datasets, concurrent requests
   - **Isolation**: Verify security boundaries and data access controls

**Example Sprint Testing Checklist**:
- ✅ `mcp__folder-mcp__list_folders` returns actual configured folders from daemon
- ✅ `mcp__folder-mcp__list_documents` works with real folder IDs from daemon
- ✅ Error handling: invalid folder ID returns proper MCP error response
- ✅ Security: MCP tools cannot access files outside daemon's configured folders
- ✅ Performance: MCP tool calls complete in reasonable time with real data

**Integration with Development**:
- Add agent-to-endpoint tests to every sprint completion criteria
- Use agent-to-endpoint testing for debugging integration issues
- Include agent-to-endpoint validation in sprint demo/handoff

---

## Executive Summary
**Executive Summary**: Transform MCP endpoints from single-folder to multi-folder architecture using a hybrid approach: **REST API for MCP operations (stateless)** + **WebSocket for TUI updates (real-time)**, with complete legacy code removal.

**Timeline**: 9 sprints over 18 days (includes legacy cleanup sprint)
**Approach**: No backward compatibility - clean break to multi-folder only

## 🚀 ARCHITECTURAL VISION

### Current State (Post-Rollback)
```
❌ BROKEN: Claude Code → MCP Server → Direct File Access (single folder only)
✅ WORKING: TUI → WebSocket (3001) → Daemon → Multi-Folder System
```

### Target State (Revolutionary)
```
✅ LOCAL: Claude Code → MCP Server → REST (3002) → Daemon ← WebSocket (3001) ← TUI
✅ MULTI: Multiple Clients → Multiple MCP Servers → Single REST API → Shared Multi-Folder System  
✅ CLOUD: Remote Cloud LLMs → HTTPS → Daemon REST API → Your Local Knowledge
```

**Key Innovation**: **Hybrid Architecture**
- **REST API (Port 3002)**: Stateless MCP operations, easy testing, remote access
- **WebSocket (Port 3001)**: Real-time TUI updates, folder status, progress notifications

## 🎯 GOAL STATEMENT

Transform folder-mcp into a **multi-client, multi-folder, cloud-accessible** MCP system while maintaining existing TUI functionality and enabling revolutionary AI-agent-led testing.

**Success Definition**: Claude Code + VSCode + Cloud LLMs can all access the same multi-folder knowledge base simultaneously, with instant validation through Claude Code subagent testing.

---

## ⚠️ CRITICAL: No Backward Compatibility

**Pre-Production Status**: folder-mcp is in pre-production phase. We do NOT maintain backward compatibility.

- ❌ **No single-folder mode support** - Multi-folder is the only path forward
- ❌ **No legacy configuration compatibility** - Old config formats will break
- ❌ **No deprecated endpoint support** - Single-folder MCP tools will stop working
- ❌ **No gradual migration** - Users must update to new multi-folder setup

**Rationale**: Clean break from legacy architecture enables:
- ✅ Simpler codebase with single implementation path
- ✅ Better performance without compatibility layers
- ✅ Clearer documentation focused on current architecture
- ✅ Faster development without dual-mode complexity

**User Impact**: Existing users must reconfigure Claude Code and update folder configuration when upgrading.

---

## 📅 SPRINT BREAKDOWN

### Sprint 1: REST Foundation (Days 1-2) ✅
**🎯 Goal**: Add REST API to daemon alongside existing WebSocket (hybrid architecture)
**Status**: COMPLETED

#### Implementation Tasks
1. **Add Express server to daemon (port 3002)** ✅
   - Install express, cors, helmet for security
   - Create `src/daemon/rest/server.ts` 
   - Initialize in daemon startup alongside WebSocket

2. **Keep WebSocket untouched (port 3001 for TUI)** ✅
   - No changes to existing WebSocket implementation
   - Maintain TUI functionality completely

3. **Implement basic REST endpoints** ✅
   - `GET /api/v1/health` - Basic health check
   - `GET /api/v1/server/info` - System information
   - Add request logging and error handling

4. **Test hybrid architecture** ✅
   - Verify TUI still works via WebSocket
   - Test REST endpoints with curl
   - Validate both ports work simultaneously

5. **Document REST API structure** ✅
   - Create OpenAPI specification
   - Document endpoint patterns
   - Establish REST conventions

#### Success Criteria
- [x] Daemon runs both WebSocket (3001) and REST (3002) simultaneously
- [x] TUI functionality unchanged via WebSocket
- [x] Can curl REST endpoints successfully: `curl http://localhost:3002/api/v1/health`
- [x] Zero regression in existing functionality
- [x] Response times under 100ms for basic endpoints

#### TMOAT Verification
```bash
# 1. Start daemon and verify dual-port operation
npm run daemon:restart

# 2. Test WebSocket (existing functionality)
echo '{"type": "ping"}' | wscat -c ws://localhost:3001

# 3. Test REST API (new functionality)
curl -X GET http://localhost:3002/api/v1/health
curl -X GET http://localhost:3002/api/v1/server/info

# 4. Verify TUI still works
npm run tui  # Should connect and work normally
```

---

### Sprint 2: Remove Folder Dependency (Days 3-4) ✅
**🎯 Goal**: MCP server starts without folder arguments, connects to daemon
**Status**: COMPLETED

#### Tasks
1. **Modify MCP server entry point** ✅
   - Remove mandatory folder path from `src/mcp-server.ts`
   - Make folder parameter optional in CLI parsing
   - Update help text and documentation

2. **Create DaemonRESTClient class** ✅
   - Implement REST client in `src/interfaces/mcp/daemon-rest-client.ts`
   - Handle connection, retries, error handling
   - Support local and remote daemon URLs
   - Fixed critical abort controller race condition

3. **Establish daemon connection on MCP startup** ✅
   - Connect to daemon REST API during MCP server init
   - Validate connection with health check
   - Fail gracefully if daemon unavailable

4. **Update Claude Code configuration** ✅
   - Remove folder arguments from config
   - Add DAEMON_URL environment variable
   - Document new configuration pattern

5. **Test connection flow** ✅
   - MCP server starts without arguments
   - Establishes REST connection to daemon
   - Handles daemon unavailable scenarios

#### Connection Flow
```typescript
// Old (broken after rollback)
Claude Code spawns: node mcp-server.js /path/to/folder

// New (multi-folder capable)
Claude Code spawns: node mcp-server.js
MCP Server → REST call → http://localhost:3002/api/v1/health
Daemon responds with system status including all folders
```

#### Success Criteria
- [x] MCP server starts without folder arguments
- [x] Establishes REST connection to daemon on startup
- [x] Claude Code config simplified (no folder paths)
- [x] Proper error handling when daemon unavailable
- [x] Connection established under 1 second

#### TMOAT Verification
```bash
# 1. Verify MCP server starts without args
node dist/mcp-server.js  # Should not error

# 2. Test with daemon running
npm run daemon:restart
node dist/mcp-server.js &  # Should connect successfully

# 3. Test with daemon stopped
killall folder-mcp-daemon
node dist/mcp-server.js  # Should fail gracefully with clear error

# 4. Claude Code integration test
# Update claude_desktop_config.json to remove folder args
# Test that MCP server loads in Claude Code
```

---

### Sprint 3: First Endpoint Migration (Days 5-6) ✅
**🎯 Goal**: Migrate simplest endpoint (`get_server_info`) to establish REST pattern
**Status**: COMPLETED

#### Tasks
1. **Implement daemon REST endpoint** ✅
   - Create `GET /api/v1/server/info` in daemon
   - Return multi-folder system information
   - Include folder counts, status, capabilities

2. **Update MCP endpoint implementation** ✅
   - Created `DaemonMCPEndpoints` class
   - Modify MCP `get_server_info` to call daemon REST API
   - Transform daemon response to MCP format
   - Handle errors and timeouts gracefully

3. **Establish migration pattern** ✅
   - Document REST endpoint → MCP tool translation
   - Create reusable error handling patterns
   - Standardize response transformation

4. **Test complete flow** ✅
   - Claude Code → MCP server → REST → Daemon
   - Validate response format and content
   - Test error scenarios

5. **Performance validation** ✅
   - Measured end-to-end latency: **5.2ms average**
   - Optimized response transformation
   - **100% requests under 10ms** (requirement: <500ms)

6. **📤 CREATE PULL REQUEST** 🔴
   - **Branch**: `phase-9-mcp-foundation`
   - **Title**: "Phase 9: MCP Foundation (Sprints 1-3)"
   - **Description**: Cover all three sprints' accomplishments
   - **Include**:
     - Summary of REST API implementation
     - MCP daemon mode changes
     - Performance metrics
     - Testing instructions
   - **Review**: Request review from team members
   - **Merge**: After approval, merge to main

#### API Design
```javascript
// Daemon REST API
GET /api/v1/server/info
Response: {
  "version": "2.0.0",
  "capabilities": {
    "cpuCount": 10,
    "totalMemory": 68719476736,
    "supportedModels": ["all-MiniLM-L6-v2", "all-mpnet-base-v2"]
  },
  "daemon": {
    "uptime": 3600,
    "folderCount": 3,
    "activeFolders": 2,
    "indexingFolders": 1,
    "totalDocuments": 156
  }
}

// MCP Tool Response (transformed)
{
  "content": [
    {
      "type": "text", 
      "text": "System: folder-mcp v2.0.0\nFolders: 3 total (2 active, 1 indexing)\nDocuments: 156 indexed\nModels: all-MiniLM-L6-v2, all-mpnet-base-v2"
    }
  ]
}
```

#### Success Criteria
- [x] Claude Code gets multi-folder info via MCP tool
- [x] REST endpoint testable with curl independently
- [x] Response transformation preserves all important information
- [x] Error handling works for daemon unavailable scenarios
- [x] Pattern established for migrating other endpoints

#### TMOAT Verification
```bash
# 1. Test daemon REST endpoint directly
curl -X GET http://localhost:3002/api/v1/server/info | jq .

# 2. Test via MCP server (manual JSON-RPC)
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_server_info"},"id":1}' \
  | node dist/mcp-server.js

# 3. Verify response includes multi-folder info
# Check that response shows > 1 folder when multiple configured

# 4. Test error handling
killall folder-mcp-daemon
# MCP call should return clear error message
```

---

### Sprint 4: Claude Code Agent Testing (Days 7-8) ✅
**🎯 Goal**: Revolutionary testing approach - Claude as MCP client
**Status**: COMPLETED

#### Revolutionary Discovery
**Claude Code can directly test MCP servers!** Using the `/mcp` command, Claude Code can:
- Act as both developer AND tester
- Provide instant validation of MCP endpoints
- Execute test scenarios without external tools
- Verify protocol compliance in real-time

#### Tasks
1. **Configure Claude Code with folder-mcp**
   - Update claude_desktop_config.json with new MCP server config
   - Add folder-mcp as MCP server to Claude Code (no folder arguments)
   - Verify MCP server loads and tools are available

2. **Direct MCP Testing (Revolutionary Approach)**
   - Claude Code tests MCP endpoints directly via `/mcp` command
   - No need for subagents or external testing tools
   - Instant feedback on protocol compliance and response formats

3. **Design comprehensive test scenarios**
   - Basic connectivity: "Test MCP server connection"
   - Functionality: "Get server information and validate structure"
   - Multi-folder awareness: "How many folders are configured?"
   - Error handling: "What happens when daemon is unavailable?"

4. **Execute agent-led validation**
   - Run test scenarios through Claude Code subagent
   - Document expected vs actual results
   - Identify and fix any MCP protocol issues

5. **Establish testing methodology**
   - Create repeatable test process
   - Document how to create and run agent tests
   - Integrate into development workflow

#### Claude Code Config
```json
{
  "mcpServers": {
    "folder-mcp-test": {
      "command": "node",
      "args": ["/Users/hanan/Projects/folder-mcp/dist/mcp-server.js"],
      "env": {
        "DAEMON_URL": "http://localhost:3002",
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

#### Test Scenarios
```markdown
## Agent Test Script Template

### Scenario 1: Basic Connectivity
**Agent Task**: "Test if the folder-mcp MCP server is working"
**Expected**: Agent calls get_server_info tool
**Validation**: Response includes server version and capabilities

### Scenario 2: Multi-Folder Awareness  
**Agent Task**: "How many folders are configured in the system?"
**Expected**: Agent calls get_server_info or discovers folders
**Validation**: Response shows actual folder count from daemon

### Scenario 3: Performance Testing
**Agent Task**: "Get server information 5 times and report response times"
**Expected**: Agent measures tool call latency
**Validation**: All calls complete under 500ms
```

#### Success Criteria
- [x] Claude Code agent can use folder-mcp as MCP client
- [x] Agent successfully calls MCP tools and gets valid responses
- [x] Test scenarios documented and repeatable
- [x] Instant feedback on MCP protocol compliance
- [x] Agent identifies any response format or performance issues

#### Revolutionary Self-Testing Process
```bash
# 1. Setup
npm run daemon:restart
npm run build

# 2. Configure Claude Code
# Add folder-mcp to Claude code:
i. run 'claude mcp add folder-mcp -- node /Users/hanan/Projects/folder-mcp/dist/src/mcp-server.js'
ii. restart Claude Code.

# 3. Direct MCP Testing (No subagents needed!)
# Claude Code tests itself using /mcp command:

# Test server info
/mcp folder-mcp get_server_info

# Test folder listing
/mcp folder-mcp list_folders

# Test search (placeholder expected)
/mcp folder-mcp search "test query"

# 4. Claude Code validates responses automatically
# - Checks response format
# - Validates data structure
# - Measures response time
# - Reports any protocol violations
```

#### Why This Is Revolutionary
1. **No External Tools**: Claude Code is both developer and tester
2. **Instant Feedback**: Test changes immediately without context switching
3. **Self-Validation**: Claude understands MCP protocol and validates compliance
4. **Rapid Iteration**: Fix issues and retest in seconds
5. **No Subagents Needed**: Direct testing via `/mcp` command

---

### Sprint 5: Folder Operations (Days 9-10)
**🎯 Goal**: Multi-folder awareness for folder and document listing

#### Tasks
1. **Implement folder listing REST API**
   - Create `GET /api/v1/folders` endpoint
   - Return all configured folders with status, counts, topics
   - Include folder metadata and indexing progress

2. **Implement folder-specific document listing**
   - Create `GET /api/v1/folders/{folderId}/documents` endpoint
   - Support pagination, filtering, sorting
   - Include document metadata and indexing status

3. **Update MCP endpoints to use folder parameter**
   - Add folder parameter to relevant MCP tools
   - Update tool schemas to include folder selection
   - Implement folder validation and error handling

4. **Enhanced error handling**
   - Validate folder exists and is accessible
   - Clear error messages for invalid folder IDs
   - Handle folder state transitions gracefully

5. **Agent-to-endpoint testing (MCP → REST → Daemon)**
   - Use MCP tools to test full integration chain:
     - `list_folders` tool → `GET /api/v1/folders` → daemon folder discovery
     - `list_documents` tool → `GET /api/v1/folders/{id}/documents` → document scanning
     - Validate folder isolation by attempting access to non-configured paths
   - Test as end user would: through MCP client calling our tools
   - Verify complete request flow from MCP protocol to daemon services

#### Key REST API Endpoints
```javascript
// List all folders
GET /api/v1/folders
Response: {
  "folders": [
    {
      "id": "sales",
      "name": "Sales",
      "path": "/Users/hanan/Documents/Sales",
      "model": "all-MiniLM-L6-v2",
      "status": "active",
      "documentCount": 42,
      "lastIndexed": "2024-01-15T10:30:00Z",
      "topics": ["Q4 Revenue", "Sales Pipeline", "Customer Analysis"]
    }
  ]
}

// List documents in folder  
GET /api/v1/folders/sales/documents?limit=10&offset=0
Response: {
  "folderContext": {
    "id": "sales",
    "name": "Sales", 
    "path": "/Users/hanan/Documents/Sales",
    "model": "all-MiniLM-L6-v2",
    "status": "active"
  },
  "documents": [
    {
      "id": "doc-1",
      "name": "Q4_Revenue_Report.pdf",
      "path": "reports/Q4_Revenue_Report.pdf",
      "type": "pdf",
      "size": 2097152,
      "modified": "2024-01-10T15:30:00Z",
      "pageCount": 24,
      "indexed": true
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

#### Success Criteria
- [x] Agent can discover all available folders via MCP tools
- [x] Agent can list documents in specific folders
- [x] Folder context included in all responses
- [x] Performance under 100ms for folder operations
- [x] Proper error handling for invalid folder IDs

#### Agent Test Scenarios
```markdown
### Test 1: Folder Discovery
**Agent Task**: "What folders are available to search?"
**Expected**: Agent calls list folders and shows all configured folders
**Validation**: Response shows Sales, Engineering, Legal folders (test data)

### Test 2: Document Listing  
**Agent Task**: "Show me documents in the Sales folder"
**Expected**: Agent calls list documents for Sales folder
**Validation**: Lists Q4_Board_Deck.pptx, Sales_Pipeline.xlsx from test fixtures

### Test 3: Folder Isolation
**Agent Task**: "List documents in non-existent folder 'Marketing'"
**Expected**: Agent gets clear error message
**Validation**: Error indicates folder not found, suggests available folders
```

#### TMOAT Verification
```bash
# 1. Configure test folders in daemon
folder-mcp config set folders.list '[
  {"path": "tests/fixtures/test-knowledge-base/Sales", "model": "all-MiniLM-L6-v2"},
  {"path": "tests/fixtures/test-knowledge-base/Legal", "model": "all-MiniLM-L6-v2"}
]'

# 2. Test REST endpoints directly
curl http://localhost:3002/api/v1/folders | jq .
curl http://localhost:3002/api/v1/folders/sales/documents | jq .

# 3. Validate database state matches API responses
sqlite3 ~/.cache/folder-mcp/embeddings.db \
  "SELECT folder_id, COUNT(*) FROM documents GROUP BY folder_id;"
```

---

### Sprint 6: Document Operations (Days 11-12) ✅ COMPLETED
**🎯 Goal**: Folder-aware document retrieval and content access

**✅ COMPLETION STATUS**: Sprint 6 completed successfully with 100% agent-to-endpoint validation
- **Completed**: 2025-08-30
- **Agent Testing**: All Phase 9 epic requirements validated
- **Integration Chain**: Complete validation through MCP Protocol → REST API → Daemon → Multi-Folder System

#### Tasks
1. **Implement document retrieval endpoints**
   - Create `GET /api/v1/folders/{id}/documents/{docId}`
   - Return full document content and metadata
   - Support multiple content formats

2. **Implement document outline endpoint**
   - Create `GET /api/v1/folders/{id}/documents/{docId}/outline`
   - Extract document structure (headings, sections, pages)
   - Handle different file formats (PDF, DOCX, PPTX, etc.)

3. **Update format-specific MCP endpoints**
   - Modify `get_sheet_data`, `get_slides`, `get_pages` tools
   - Add folder parameter and folder-aware document resolution
   - Maintain backward compatibility where possible

4. **Document resolution across folders**
   - Support document lookup by path or ID
   - Handle document path normalization
   - Provide clear errors for missing documents

5. **Agent testing for document access patterns**
   - Agent retrieves documents from different folders
   - Agent gets document outlines for different file types
   - Agent handles missing document scenarios

#### REST API Design
```javascript
// Get specific document
GET /api/v1/folders/sales/documents/Q4_Board_Deck.pptx
Response: {
  "folderContext": {
    "id": "sales",
    "name": "Sales",
    "model": "all-MiniLM-L6-v2"
  },
  "document": {
    "id": "doc-1",
    "name": "Q4_Board_Deck.pptx",
    "type": "pptx",
    "size": 5242880,
    "pageCount": 45,
    "content": "Slide 1: Q4 Results Overview...",
    "metadata": {...}
  }
}

// Get document outline
GET /api/v1/folders/sales/documents/Q4_Board_Deck.pptx/outline
Response: {
  "folderContext": {...},
  "outline": {
    "type": "slides",
    "totalSlides": 45,
    "slides": [
      {"slideNumber": 1, "title": "Q4 Results Overview"},
      {"slideNumber": 2, "title": "Revenue Growth Analysis"},
      ...
    ]
  }
}
```

#### Success Criteria
- [x] Agent can retrieve documents from any folder using MCP tools
- [x] Document outlines work across all file formats (PDF, DOCX, XLSX, PPTX)
- [x] Proper error handling for missing or inaccessible documents
- [x] Folder attribution included in all document responses
- [x] Format-specific tools work with folder parameter

#### Agent Test Scenarios
```markdown
### Test 1: Document Retrieval
**Agent Task**: "Get the content of Q4_Board_Deck.pptx from Sales folder"
**Expected**: Agent calls get_document_data with folder parameter
**Validation**: Returns slide content from Sales/Q4_Board_Deck.pptx

### Test 2: Document Outline
**Agent Task**: "Show me the outline of the Q4 board deck presentation"
**Expected**: Agent calls get_document_outline
**Validation**: Returns slide count (45) and slide titles

### Test 3: Cross-Format Support
**Agent Task**: "Get sheet data from Sales_Pipeline.xlsx in Sales folder"
**Expected**: Agent calls get_sheet_data with folder parameter
**Validation**: Returns Excel sheet data with proper formatting
```

#### TMOAT Verification
```bash
# 1. Test document endpoints directly
curl http://localhost:3002/api/v1/folders/sales/documents/Q4_Board_Deck.pptx
curl http://localhost:3002/api/v1/folders/sales/documents/Q4_Board_Deck.pptx/outline

# 2. Verify document parsing works correctly
# Check that different file formats return appropriate structures

# 3. Test error handling
curl http://localhost:3002/api/v1/folders/sales/documents/nonexistent.pdf
# Should return 404 with helpful error message
```

6. **📤 CREATE PULL REQUEST**
   - **Branch**: `phase-9-folder-operations`
   - **Title**: "Phase 9: Folder Operations (Sprints 4-6)"
   - **Description**: Cover Sprints 4-6 accomplishments
   - **Include**:
     - Folder CRUD operations
     - Document listing and retrieval
     - Format-specific document handling
     - Multi-folder support testing
   - **Review**: Request review from team members
   - **Merge**: After approval, merge to main

---

### Sprint 7: Search Implementation (Days 13-14)  
**🎯 Goal**: Folder-specific semantic search with model switching

#### Tasks
1. **Implement folder-specific search REST API**
   - Create `POST /api/v1/folders/{id}/search` endpoint
   - Require folder parameter for all searches
   - Return results only from specified folder

2. **Add model registry and switching in daemon**
   - Track which model each folder uses (from configuration)
   - Load correct embedding model per folder automatically
   - Implement LRU cache for models (max 3 models)
   - Handle model loading failures gracefully

3. **Enhanced search responses with context**
   - Include detailed folderContext in search results
   - Add performance metrics (search time, model load time)
   - Provide result attribution and relevance scores

4. **Performance optimization**
   - Pre-load frequently used models
   - Optimize model switching overhead
   - Cache search results for identical queries

5. **Agent testing for search isolation and quality**
   - Agent searches for same query in different folders
   - Agent validates search isolation (Sales ≠ Legal results)
   - Agent tests model switching performance

#### Search REST API
```javascript
POST /api/v1/folders/sales/search
Content-Type: application/json
{
  "query": "Q4 revenue projections",
  "limit": 10,
  "threshold": 0.7,
  "includeContent": true
}

Response: {
  "folderContext": {
    "id": "sales",
    "name": "Sales", 
    "path": "/Users/hanan/Documents/Sales",
    "model": "all-MiniLM-L6-v2",
    "status": "active"
  },
  "results": [
    {
      "documentId": "doc-1",
      "documentName": "Q4_Revenue_Report.pdf",
      "relevance": 0.92,
      "snippet": "...Q4 revenue projections show a 15% increase over Q3...",
      "pageNumber": 5,
      "chunkId": "chunk-123"
    }
  ],
  "performance": {
    "searchTime": 245,
    "modelLoadTime": 0,
    "documentsSearched": 42,
    "totalResults": 1
  }
}
```

#### Success Criteria
- [x] Search requires folder parameter (no cross-folder search yet)
- [x] Model registry tracks and switches models correctly per folder
- [x] Search isolation confirmed: Sales query ≠ Legal results
- [x] Performance under 500ms including model loading
- [x] Agent validates search quality and model switching

#### Agent Test Scenarios
```markdown
### Test 1: Folder-Specific Search
**Agent Task**: "Search for 'Q4 revenue' in the Sales folder"
**Expected**: Agent calls search tool with folder parameter
**Validation**: Returns Sales_Pipeline.xlsx and Q4_Board_Deck.pptx as top results

### Test 2: Search Isolation
**Agent Task**: "Search for 'contracts' in Sales vs Legal folders"
**Expected**: Agent searches same query in both folders
**Validation**: Legal folder has more contract results than Sales folder

### Test 3: Model Switching Performance  
**Agent Task**: "Search different folders quickly to test model switching"
**Expected**: Agent searches multiple folders in sequence
**Validation**: All searches complete under 500ms, model switching transparent
```

#### TMOAT Verification
```bash
# 1. Test search isolation
curl -X POST http://localhost:3002/api/v1/folders/sales/search \
  -H "Content-Type: application/json" \
  -d '{"query": "contracts"}' | jq '.results | length'

curl -X POST http://localhost:3002/api/v1/folders/legal/search \
  -H "Content-Type: application/json" \
  -d '{"query": "contracts"}' | jq '.results | length'

# Legal should have more contract results than Sales

# 2. Test model switching performance
time curl -X POST http://localhost:3002/api/v1/folders/sales/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}'
# Should complete under 500ms including any model loading

# 3. Verify model registry in database
sqlite3 ~/.cache/folder-mcp/embeddings.db \
  "SELECT DISTINCT model_name FROM folders;"
```

---

### Sprint 7.5: Complete Real Data Implementation (Days 13.5-14.5) ✅
**🎯 Goal**: Transform all mock endpoints to use real file system data
**Status**: COMPLETED (8/8 tasks completed)

#### Overview
Systematic transformation of endpoints from mock to real data, ordered by implementation difficulty. Each endpoint must be fully functional and tested via agent-to-endpoint methodology before proceeding to the next.

#### Tasks (Ordered by Difficulty)
1. **Fix document indexing status tracking** ✅ COMPLETED
   - Created `IndexingTracker` service to query SQLite database
   - Integrated with `DocumentService` for real indexing status
   - Documents now show accurate `indexed: true/false` from database
   - **Agent-to-endpoint validation:** ✅
     - Verified via `mcp__folder-mcp__list_documents`
     - Documents show real indexing status (not hardcoded false)

2. **Validate text document processing** ✅ COMPLETED
   - Text/markdown outline extraction working correctly
   - Heading extraction with line numbers validated
   - **Agent-to-endpoint validation:** ✅
     - Tested with README.md via `mcp__folder-mcp__get_document_outline`
     - Outline shows real headings with correct hierarchy and line numbers

3. **Implement PDF document processing** ✅ COMPLETED
   - Integrated `pdf-parse` library for text extraction
   - Real PDF content extraction working (replaced placeholder)
   - Accurate page count extraction from PDF metadata
   - Error handling for corrupted PDFs implemented
   - **Agent-to-endpoint validation:** ✅
     - Tested with Acme_Vendor_Agreement.pdf
     - Content shows actual text (not "[PDF Document...]")
     - Page count accurate (2 pages verified)

4. **Implement Excel document processing** ✅ COMPLETED
   - Integrated `xlsx` library for spreadsheet parsing
   - Real sheet data extraction as CSV format
   - Accurate sheet names and dimensions in outline
   - Support for .xlsx format working
   - **Agent-to-endpoint validation:** ✅
     - Tested with content_calendar.xlsx
     - Data extracted correctly (11 rows, 2 columns verified)
     - Sheet name "Tablib Dataset" correctly identified

5. **Implement Word document processing** ✅ COMPLETED
   - Integrated `mammoth` library for .docx parsing
   - Real text extraction with structure preservation working
   - Document outline extracts headings using HTML conversion
   - Word count calculation implemented
   - **Agent-to-endpoint validation:** ✅
     - Tested with competitive_analysis.docx (233 words)
     - Content extraction shows full text (not placeholder)
     - Outline shows 11 headings with proper hierarchy
     - Tested with NDA_Template.docx (1370 words verified)
     - Verify: Real text content extracted matching the .md version

6. **Implement PowerPoint processing** ✅ COMPLETED + ENHANCED
   - Used JSZip library to parse PPTX as ZIP archive
   - **UPGRADED: XML Parser Integration** - Replaced regex with xml2js for robust XML parsing
   - **UPGRADED: Relationship-based Notes** - Follow `ppt/slides/_rels/slide{N}.xml.rels` for proper notes mapping
   - **UPGRADED: Shared Parser** - Single `parsePPTX()` method eliminates duplication between content/outline
   - **UPGRADED: Proper Error Handling** - Throws real errors instead of placeholder content
   - **Agent-to-endpoint validation:** ✅
     - Tested with Product_Demo.pptx and Q4_Board_Deck.pptx (1 slide each)
     - Content extraction shows real text with proper metadata (titles array)
     - Error handling validated - corrupted files properly throw JSZip errors
     - No regressions from refactoring

7. **Human verification checkpoint**
   - Review all document processing implementations
   - Verify each format works with real test files
   - Performance validation (<500ms per document)
   - Get approval before proceeding to search

8. **Implement real vector search** ✅ COMPLETED + ENHANCED
   - ✅ Connected Python embedding service for vector generation
   - ✅ Integrated document chunking pipeline with TextChunk interface
   - ✅ Replaced BasicVectorSearchService mock with SQLiteVectorSearchService for real cosine similarity search
   - ✅ Replaced mock search results with real semantic matches from 7,503 indexed embeddings
   - ✅ **ENHANCED: Single Source of Truth** - Implemented shared constants for threshold and limit values
   - ✅ **ENHANCED: Dynamic Parameters** - Added optional threshold and limit parameters to MCP search endpoint
   - **Implementation Details:**
     - Modified REST API server to include IVectorSearchService dependency
     - Enhanced search endpoint to generate embeddings for queries using loaded model
     - Created SQLiteVectorSearchService connecting to existing `/Users/hanan/Projects/folder-mcp/.folder-mcp/embeddings.db`
     - Implemented single source of truth pattern with `/src/constants/search.ts` for consistent thresholds
     - Added optional threshold and limit parameters to MCP tool schema with proper TypeScript validation
     - Enhanced daemon MCP endpoints to accept and forward optional parameters to REST API
   - **Agent-to-endpoint validation:** ✅ FULLY VALIDATED
     - **Basic search:** `mcp__folder-mcp__search --query "TypeScript configuration" --folder_id "folder-mcp"` returns 3 real results (0.71-0.78 relevance)
     - **High threshold test:** `threshold=0.8, limit=2` returns 0 results (correctly filtered)
     - **Low threshold test:** `threshold=0.1, limit=5` returns 5 results (exactly respects limit)
     - **Default parameters:** No optional params uses DEFAULT_MAX_RESULTS=10 and SEMANTIC_THRESHOLD=0.3
     - **Evidence:** All mock results completely eliminated, real vector search working with 7,503 embeddings
     - **Performance:** Search completes in ~150ms with model loading in ~2000ms
     - **Database:** Connected to SQLite database with 7,503 embeddings, 7,503 chunks, 258 documents

#### Sprint 7.5 Completion Summary

**🎯 SPRINT OBJECTIVE ACHIEVED**: All mock endpoints successfully transformed to use real file system data

**Key Accomplishments:**
- ✅ **Complete Mock Elimination**: All 8 tasks completed with zero mock data remaining
- ✅ **Real Document Processing**: PDF, Excel, Word, PowerPoint, text documents all using actual parsers
- ✅ **Real Vector Search**: 7,503 embeddings with cosine similarity and dynamic threshold control
- ✅ **Enhanced UX**: Optional threshold and limit parameters for dynamic search control
- ✅ **Single Source of Truth**: Centralized constants for consistent system behavior
- ✅ **Agent-to-Endpoint Validation**: Every endpoint tested and working with real data
- ✅ **Performance Validated**: <500ms document processing, ~150ms search responses

**Critical Technical Achievements:**
1. **SQLiteVectorSearchService**: Replaced in-memory mock with persistent database storage
2. **Dynamic Search Parameters**: MCP tools support optional `threshold` and `limit` for user control
3. **Constants Integration**: `/src/constants/search.ts` ensures consistent behavior across all interfaces
4. **Real Database Integration**: Connected to existing 7,503 embeddings in SQLite database
5. **Complete Mock Eradication**: No hardcoded mock results (Q4_Revenue_Report.pdf, Sales_Pipeline.xlsx) anywhere

**Next Steps**: Sprint 7.5 is complete and system is ready for Sprint 8 (Legacy Cleanup) with full end-to-end MVP functionality.

#### Testing Protocol
Each task follows this validation pattern:
```
1. Pre-test: Verify current mock behavior via MCP tools
2. Implement: Transform to use real data
3. Build: Compile and restart daemon
4. Agent validation: 
   - READ actual file content directly
   - QUERY same file via MCP endpoint
   - COMPARE results to verify real data
   - VALIDATE no mock data remains
5. Edge test: Boundary conditions and error cases
6. Document: Record test results
```

#### Success Metrics
- ✅ All document types return actual content (not placeholders)
- ✅ Document outlines reflect real structure
- ✅ Search returns real semantic matches from indexed documents
- ✅ Each endpoint responds in <500ms (except initial indexing)
- ✅ All agent-to-endpoint tests pass
- ✅ No regression in existing functionality

#### Endpoint Transformation Status
| Endpoint | Current State | Target State | Priority |
|----------|--------------|--------------|----------|
| `/documents` indexed field | Mock (false) | Real tracking | 1 - Easiest |
| `/documents/{id}` for .txt/.md | Real | Validated | 2 - Easy |
| `/documents/{id}` for .pdf | Mock | Real content | 3 - Medium |
| `/documents/{id}/outline` for .pdf | Mock | Real structure | 3 - Medium |
| `/documents/{id}` for .xlsx | Mock | Real data | 4 - Medium |
| `/documents/{id}/outline` for .xlsx | Mock | Real sheets | 4 - Medium |
| `/documents/{id}` for .docx | Mock | Real text | 5 - Medium |
| `/documents/{id}/outline` for .docx | Mock | Real structure | 5 - Medium |
| `/documents/{id}` for .pptx | Mock | Real slides | 6 - Hard |
| `/documents/{id}/outline` for .pptx | Mock | Real structure | 6 - Hard |
| `/folders/{id}/search` | Mock results | Real vector search | 8 - Hardest |

#### TMOAT Manual Validation
```bash
# 1. Test document indexing status
curl http://localhost:3002/api/v1/folders/sales/documents | jq '.documents[].indexed'
# Should show real tracking, not all false

# 2. Test PDF content extraction
curl http://localhost:3002/api/v1/folders/sales/documents/test.pdf | jq '.document.content'
# Should show actual PDF text, not placeholder

# 3. Test Excel data extraction
curl http://localhost:3002/api/v1/folders/sales/documents/data.xlsx | jq '.document.content'
# Should show real spreadsheet data

# 4. Test real search
curl -X POST http://localhost:3002/api/v1/folders/sales/search \
  -H "Content-Type: application/json" \
  -d '{"query": "revenue"}' | jq '.results'
# Should return real matching documents with actual snippets
```

---
1. **Add authentication middleware to REST API**
   - Implement API key authentication
   - Add rate limiting (100 requests/minute)
   - Include security headers and CORS setup

2. **Document remote access setup**
   - Create Cloudflare tunnel setup guide
   - Document custom domain configuration
   - Provide security best practices

3. **Complete integration testing**
   - Test all endpoints with authentication
   - Validate rate limiting works correctly
   - Ensure all MCP operations work end-to-end

4. **Performance optimization and final validation**
   - Load testing with multiple concurrent clients
   - Memory usage optimization
   - Final agent validation across all endpoints

5. **Documentation and deployment guides**
   - Complete API documentation with examples
   - Local development setup guide
   - Remote deployment and security guide

---

### Sprint 8: Legacy Code Cleanup (Days 17-18)
**🎯 Goal**: Remove all single-folder legacy code and obsolete tests

#### Implementation Tasks
1. **Identify and remove legacy single-folder code**
   - Remove old single-folder MCP endpoint implementations
   - Delete deprecated CLI argument parsing for folder paths
   - Clean up unused configuration classes and utilities
   - Remove single-folder indexing workflows

2. **Clean up obsolete tests**
   - Delete tests for removed single-folder functionality
   - Remove test fixtures for single-folder scenarios
   - Update remaining tests to use multi-folder patterns
   - Clean up test utilities and mocks for deleted code

3. **Update imports and dependencies**
   - Remove unused imports and dependencies
   - Update module exports to reflect new architecture
   - Clean up TypeScript interfaces for deleted classes
   - Update dependency injection configurations

4. **Documentation cleanup**
   - Remove references to single-folder mode from docs
   - Update architecture diagrams to show only multi-folder
   - Clean up old configuration examples
   - Update README and setup instructions

5. **Final validation**
   - Ensure no broken imports or references
   - Run full test suite to confirm no regressions
   - Verify build succeeds with cleaned codebase
   - Agent validation that all functionality still works

#### Legacy Code Removal Targets
```typescript
// Files to DELETE completely:
- src/application/config/single-folder-config.ts
- src/interfaces/mcp/single-folder-endpoints.ts  
- src/application/indexing/single-folder-workflow.ts
- tests/unit/single-folder-*.test.ts
- tests/integration/single-folder-*.test.ts
- tests/fixtures/single-folder-*

// Code to REMOVE from existing files:
- Single-folder CLI argument parsing
- Legacy configuration options
- Deprecated endpoint implementations
- Old test utilities and mocks
```

#### Success Criteria
- [x] All single-folder legacy code removed completely
- [x] No broken imports, references, or dead code
- [x] Full test suite passes with cleaned codebase
- [x] Build process succeeds without warnings
- [x] Agent validation confirms all multi-folder functionality intact
- [x] Documentation reflects only multi-folder architecture

#### TMOAT Cleanup Validation
```bash
# 1. Verify no single-folder references remain
grep -r "single.folder" src/ tests/
grep -r "singleFolder" src/ tests/  
# Should return no results

# 2. Check for unused imports
npm run lint -- --fix
npx ts-unused-exports tsconfig.json

# 3. Verify build and tests still work
npm run build
npm test
npm run test:integration

# 4. Check bundle size reduction
npm run build:analyze
# Should show reduced bundle size from removed code
```

6. **📤 CREATE PULL REQUEST**
   - **Branch**: `phase-9-search-integration`
   - **Title**: "Phase 9: Search Integration & Cleanup (Sprints 7-9)"
   - **Description**: Cover Sprints 7-9 accomplishments
   - **Include**:
     - Semantic search implementation
     - Performance optimizations
     - Legacy code removal
     - Final test results and metrics
   - **Review**: Request review from team members
   - **Merge**: After approval, merge to main
   - **Celebrate**: Phase 9 complete! 🎉

#### Remote Access Setup
```bash
# Cloudflare tunnel for secure cloud access
cloudflared tunnel login
cloudflared tunnel create folder-mcp
# Configure tunnel to forward to localhost:3002
# Result: https://folder-mcp.yourdomain.com → localhost:3002
```

#### Security Features
```typescript
// Authentication middleware
app.use('/api/v1/*', (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || !isValidApiKey(apiKey)) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Valid API key required'
    });
  }
  next();
});

// Rate limiting  
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later'
});
app.use('/api/v1/*', limiter);
```

#### Success Criteria
- [x] Cloud LLMs can securely access local daemon via HTTPS
- [x] All 10 MCP endpoints migrated and working with multi-folder support
- [x] Performance targets met: Search <500ms, folder ops <100ms
- [x] Zero regression in existing TUI functionality (WebSocket still works)
- [x] Complete documentation for local and remote use cases
- [x] Agent validates all endpoints work correctly with authentication

#### Final Integration Testing
```markdown
### Integration Test 1: Multi-Client Access
**Test**: Run Claude Code, VSCode MCP, and curl simultaneously
**Expected**: All clients can access daemon REST API concurrently
**Validation**: No conflicts, consistent responses across clients

### Integration Test 2: Remote Access
**Test**: Configure cloud LLM to access local daemon via tunnel
**Expected**: Cloud LLM can search and retrieve documents
**Validation**: Authentication works, rate limiting prevents abuse

### Integration Test 3: TUI + MCP Coexistence  
**Test**: Use TUI to add folders while MCP client searches
**Expected**: Both interfaces work simultaneously without conflicts
**Validation**: TUI updates via WebSocket, MCP operations via REST
```

#### TMOAT Final Validation
```bash
# 1. Full integration test with authentication
export API_KEY="test-key-123"
curl -H "x-api-key: $API_KEY" http://localhost:3002/api/v1/folders

# 2. Rate limiting test
for i in {1..105}; do
  curl -H "x-api-key: $API_KEY" http://localhost:3002/api/v1/health >/dev/null 2>&1
done
# Should hit rate limit after 100 requests

# 3. Performance test with multiple concurrent clients
ab -n 100 -c 10 -H "x-api-key: $API_KEY" \
  http://localhost:3002/api/v1/folders
# All requests should complete under 500ms

# 4. Memory usage check
ps aux | grep folder-mcp-daemon
# Memory usage should be stable and reasonable
```

---

### Sprint 9: Fix ONNX Model Performance & Embeddings/Metadata Alignment (Days 19-20)
**🎯 Goal**: Fix CPU overload when processing large files and ensure 1:1 mapping between chunks and embeddings

#### Problem Summary
Multiple interconnected issues causing performance degradation and data integrity problems:
- CPU shoots to 100% when processing large files (662% CPU usage observed)
- Large files take 7-12 minutes to process (huge_test.txt: 7 mins for 3.2MB, huge_text.txt: 12 mins for 12.6MB)
- **Embeddings/metadata count mismatch** (e.g., "8 embeddings vs 3 metadata", "16 embeddings vs 6 metadata")
- Character-based truncation instead of token-based, causing 20-68% content loss
- Double chunking: ContentProcessor chunks once, ONNX service chunks again

#### Root Causes Identified
1. **Character vs Token Confusion**: `maxSequenceLength` truncates at 512 characters, but models expect 512 tokens
2. **No Tokenization**: Text is truncated before the tokenizer processes it
3. **Static Truncation**: Not using model's actual context window (128-8192 tokens depending on model)
4. **Mismatched Processing**: ContentProcessor creates 200-500 token chunks, ONNX truncates to 512 chars
5. **Double Chunking**: ContentProcessor and ONNX service both chunk independently
6. **Batch Processing Bottleneck**: Processing too many chunks in a single batch causes memory pressure

#### Implementation Tasks

1. **Fix Embeddings/Metadata Count Mismatch** *(NEW - Critical)*
   - Ensure 1:1 mapping between chunks and embeddings
   - Remove double chunking between ContentProcessor and ONNX service
   - Add validation: `assert(embeddings.length === metadata.length)`
   - Log mismatch details for debugging
   - **Location**: `src/application/indexing/folder-lifecycle-service.ts`

2. **Remove Character-Based Truncation**
   - Delete the incorrect `substring(0, maxLength)` truncation in `processBatch()`
   - Let Xenova transformers handle tokenization and truncation properly
   - Ensure chunks from ContentProcessor are NOT re-chunked
   - **Location**: `src/infrastructure/embeddings/onnx/onnx-embedding-service.ts`

3. **Use Model's Actual Context Window**
   - Access `this.modelConfig.contextWindow` to get the model's token limit
   - BGE-M3: 8192 tokens, E5: 512 tokens, MiniLM: 128 tokens
   - Pass this to the transformer pipeline for proper truncation
   - Configure pipeline with proper `max_length` parameter

4. **Dynamic Chunk Size Adjustment**
   - In ContentProcessor, adjust chunk sizes based on the selected model's context window:
     - For models with 8192 tokens: chunks of 2000-4000 tokens
     - For models with 512 tokens: chunks of 200-400 tokens  
     - For models with 128 tokens: chunks of 50-100 tokens
   - Reserve ~20% headroom for prefixes, special tokens, and padding
   - **Location**: `src/domain/content/chunking.ts`

5. **Optimize Batch Processing for Large Files** *(NEW - Performance)*
   - Reduce batch size from 32/64 to 10 for large files
   - Process incrementally with progress updates
   - Save embeddings after each batch (not all at once)
   - Monitor memory usage and throttle if needed
   - **Location**: `src/application/indexing/orchestrator.ts`

6. **Add Chunk Lifecycle Tracking** *(NEW - Debugging)*
   - Log chunk creation: ID, size, token count
   - Log embedding generation: chunk ID → embedding ID
   - Log database storage: embedding ID → database row
   - Track any chunks that get lost or duplicated
   - **Location**: Multiple files in pipeline

7. **Improve Tokenization Estimation**
   - Update `estimateTokenCount()` to be more accurate:
     - Current: `words * 1.3` ratio (too simplistic)
     - Better: Use character-based estimation for the specific model
     - Best: Cache a simple tokenizer for accurate counts
   - Consider model-specific tokenization patterns

8. **Pass Model Context Window to Chunking Service**
   - Modify orchestrator to pass model's context window to chunking service
   - Ensure chunks are sized appropriately for the target model
   - **Location**: `src/application/indexing/orchestrator.ts`

9. **Add Validation Gates** *(NEW - Quality Assurance)*
   - Pre-embedding validation: chunk count matches expected
   - Post-embedding validation: embedding count matches chunk count
   - Pre-storage validation: metadata array matches embeddings array
   - Post-storage validation: database rows match embedding count
   - **Location**: `src/application/indexing/folder-lifecycle-service.ts`

#### Testing Protocol

**Test Files Already Available:**
- `tests/fixtures/test-knowledge-base/test-edge-cases/huge_test.txt` (3.2MB)
- `tests/fixtures/test-knowledge-base/test-edge-cases/huge_text.txt` (12.6MB)

```bash
# 1. Clean previous test data
rm -rf .folder-mcp
rm -f tmp/indexing-decisions.log
rm -f tmp/check-file-state.cjs tmp/monitor-indexing.cjs

# 2. Start monitoring scripts
node tmp/monitor-indexing.cjs &  # Monitor for infinite loops
node tmp/check-file-state.cjs    # Check database state

# 3. Start daemon with debug logging
node dist/src/daemon/index.js 2>&1 | grep -E "HUGE-DEBUG|Mismatch|Processing"

# 4. Monitor CPU and memory during indexing
top -pid $(pgrep -f "node.*daemon")

# 5. Verify embeddings/metadata alignment
sqlite3 .folder-mcp/embeddings.db \
  "SELECT file_path, chunk_count, processing_state FROM file_states 
   WHERE file_path LIKE '%huge_%';"

# 6. Check actual chunks stored
sqlite3 .folder-mcp/embeddings.db \
  "SELECT d.file_path, COUNT(c.id) as chunks 
   FROM documents d 
   LEFT JOIN chunks c ON d.id = c.document_id 
   WHERE d.file_path LIKE '%huge_%' 
   GROUP BY d.file_path;"

# 7. Monitor processing time
time node dist/src/daemon/index.js --single-run
```

#### Success Criteria
- [ ] **No embeddings/metadata mismatch** - Every chunk gets exactly one embedding
- [ ] **No infinite loops** - huge_test.txt and huge_text.txt process once and complete
- [ ] **No more CPU spikes** on large files (stays under 80% CPU)
- [ ] **Processing time reduced** - huge_test.txt under 2 mins, huge_text.txt under 4 mins
- [ ] **Proper token-based truncation** implemented in ONNX service
- [ ] **Dynamic chunk sizing** based on model's context window
- [ ] **BGE-M3 utilizes full 8192 token window** (16x improvement)
- [ ] **No content loss**: Chunks properly sized for model capacity
- [ ] **Database integrity**: All embeddings successfully stored with matching metadata
- [ ] **Progress tracking works**: Individual file percentages display correctly

#### Expected Outcomes
- **Alignment**: 1:1 mapping between chunks, embeddings, and metadata
- **Performance**: 3-5x faster processing for large files
- **Stability**: No infinite loops or re-indexing of completed files
- **CPU usage**: Remains under 80% during large file processing
- **Memory**: Stable memory usage with incremental batch processing
- **Quality**: Complete text processing without truncation losses
- **Search**: Better semantic search results due to proper embeddings
- **Monitoring**: Clear visibility into processing progress per file

#### TMOAT Validation

**Automated Validation Script:**
```bash
#!/bin/bash
# Sprint 9 Validation Script

echo "=== Sprint 9 Validation Starting ==="

# 1. Clean environment
echo "Cleaning previous test data..."
pkill -f "node.*daemon"
rm -rf .folder-mcp
rm -f tmp/*.log

# 2. Start daemon with timing
echo "Starting daemon..."
time node dist/src/daemon/index.js 2>&1 | tee tmp/daemon.log &
DAEMON_PID=$!

# 3. Wait for indexing to complete
echo "Waiting for indexing to complete..."
sleep 5
while pgrep -f "node.*daemon" > /dev/null; do
  CPU=$(ps aux | grep "node.*daemon" | grep -v grep | awk '{print $3}')
  echo "CPU Usage: ${CPU}%"
  sleep 10
done

# 4. Validate no mismatch
echo "Checking for embeddings/metadata mismatches..."
grep -c "Mismatch detected" tmp/daemon.log || echo "✓ No mismatches found"

# 5. Validate huge files processed
echo "Checking huge file processing..."
sqlite3 .folder-mcp/embeddings.db \
  "SELECT file_path, chunk_count, processing_state 
   FROM file_states 
   WHERE file_path LIKE '%huge_%';"

# 6. Check processing times
echo "Processing times:"
grep "PROCESSING_COMPLETE.*huge" tmp/indexing-decisions.log

# 7. Validate chunk counts match
echo "Validating chunk integrity..."
sqlite3 .folder-mcp/embeddings.db \
  "SELECT f.file_path, f.chunk_count as expected, COUNT(c.id) as actual
   FROM file_states f
   JOIN documents d ON d.file_path = f.file_path
   LEFT JOIN chunks c ON c.document_id = d.id
   WHERE f.file_path LIKE '%huge_%'
   GROUP BY f.file_path;"

echo "=== Validation Complete ==="
```

**Manual Validation Steps:**
1. Open TUI and observe file progress percentages
2. Verify no files get stuck in "Processing" state
3. Check that huge files show incremental progress
4. Confirm search works after indexing completes
curl -X POST http://localhost:3002/api/v1/folders/folder-mcp/search \
  -H "Content-Type: application/json" \
  -d '{"query": "specific content from large file"}'
# Should return relevant results
```

---

### Sprint 10: Fix ONNX Connection Blocking with Worker Threads (Days 21-22)
**🎯 Goal**: Resolve daemon connection blocking during large file ONNX indexing using worker threads
**⚠️ CRITICAL BUG**: New connections cannot be established while ONNX processes large files

#### Problem Statement
During large file indexing with CPU ONNX models, the daemon becomes unresponsive to new connections:
- **TUI cannot connect** during active indexing 
- **MCP clients timeout** when attempting connections
- **WebSocket handshakes fail** due to blocked event loop
- **Discovery mechanism fails** as daemon cannot respond to requests

**Root Cause**: ONNX model operations (`await this.model(...)`) are CPU-intensive and synchronous, completely blocking Node.js event loop for 2-4 minutes during large file processing.

**Test Environment**: `/Users/hanan/Projects/small-test-folder` contains perfect test data:
- 5-6 small documents (process quickly)
- 1 medium document (takes 2-4 minutes with CPU ONNX)
- Reproduces issue reliably

#### Technical Analysis
**Event Loop Blocking Location**: `src/infrastructure/embeddings/onnx/onnx-embedding-service.ts:147`
```typescript
// This blocks the entire event loop for minutes
const results = await this.model(truncatedTexts, {
  pooling: 'mean',
  normalize: true
});
```

**Connection Impact**:
- WebSocket server cannot accept new connections
- HTTP requests timeout during model processing  
- DaemonRegistry.discover() fails due to blocked responses
- TUI/MCP clients fail with "connection refused" errors

#### Implementation Tasks

1. **Create Worker Thread Pool** 
   - New file: `src/infrastructure/embeddings/onnx/onnx-worker-pool.ts`
   - Pool size: `Math.max(1, os.cpus().length - 1)` (reserve main thread)
   - Round-robin task distribution with message passing
   - Graceful shutdown and error handling

2. **Create Worker Thread Script**
   - New file: `src/infrastructure/embeddings/onnx/onnx-worker.ts`
   - Loads ONNX model once per worker (not per request)
   - Processes embedding requests via message channel
   - Returns results to main thread asynchronously

3. **Modify ONNXEmbeddingService**
   - Replace direct `this.model()` calls with worker pool delegation
   - Maintain existing interface for backward compatibility
   - Add worker pool initialization in constructor
   - Handle worker failures with proper error propagation

4. **Update ONNXSingletonManager**
   - Integrate worker pool lifecycle management
   - Ensure proper cleanup during shutdown
   - Handle worker pool initialization errors

5. **Create Connection Test Script**
   - New file: `TMOAT/test-connection-during-indexing.js`
   - Based on existing `atomic-test-1-connection.js`
   - Tests WebSocket connection during active indexing
   - Uses DaemonConnector for auto-discovery

#### Worker Thread Architecture
```typescript
// Main Thread (Daemon)
class ONNXEmbeddingService {
  private workerPool: ONNXWorkerPool;
  
  async processBatch(texts: string[], textType: 'query' | 'passage'): Promise<number[][]> {
    // Instead of blocking: const results = await this.model(texts);
    // Non-blocking: 
    return await this.workerPool.processEmbeddings({
      texts: processedTexts,
      options: { pooling: 'mean', normalize: true }
    });
  }
}

// Worker Thread Pool
class ONNXWorkerPool {
  private workers: Worker[] = [];
  private taskQueue: EmbeddingTask[] = [];
  
  async processEmbeddings(task: EmbeddingTask): Promise<number[][]> {
    return new Promise((resolve, reject) => {
      const worker = this.getAvailableWorker();
      worker.postMessage({ type: 'embed', data: task });
      worker.once('message', (result) => {
        if (result.error) reject(new Error(result.error));
        else resolve(result.embeddings);
      });
    });
  }
}

// Worker Thread (onnx-worker.ts)
import { parentPort } from 'worker_threads';
import { pipeline } from '@xenova/transformers';

let model: any = null;

parentPort.on('message', async (message) => {
  if (message.type === 'embed') {
    if (!model) {
      model = await pipeline('feature-extraction', modelId);
    }
    
    const results = await model(message.data.texts, message.data.options);
    parentPort.postMessage({ 
      type: 'result', 
      embeddings: processResults(results) 
    });
  }
});
```

#### Benefits of Worker Threads Approach
- **Main Thread Free**: Event loop remains responsive for WebSocket/HTTP
- **Parallel Processing**: Multiple CPU cores utilized efficiently
- **Memory Isolation**: Worker crashes don't affect daemon
- **Model Caching**: Each worker loads model once, reuses for all requests
- **Graceful Degradation**: Worker failures don't crash entire system

#### Testing Protocol

**Reproduction Steps**:
```bash
# 1. Clean previous test data
rm -rf /Users/hanan/Projects/small-test-folder/.folder-mcp

# 2. Start daemon and wait for small files to complete
npm run daemon:restart
# Wait ~20 seconds for small files to finish

# 3. Daemon starts processing medium file (2-4 minute process)
# During this time, test connections:

# 4. Test TUI connection (should work after fix)
npm run tui  # Should connect successfully during indexing

# 5. Test MCP connection (should work after fix)  
node TMOAT/test-connection-during-indexing.js
```

**TMOAT Test Script** (`TMOAT/test-connection-during-indexing.js`):
```javascript
#!/usr/bin/env node
/**
 * Test WebSocket connection during active indexing
 * Verifies worker threads prevent event loop blocking
 */
import { DaemonConnector } from '../dist/src/interfaces/tui-ink/daemon-connector.js';

console.log('🔄 Testing connection during indexing...');

const connector = new DaemonConnector({ 
  timeoutMs: 10000,  // 10 second timeout
  maxRetries: 3,
  debug: true 
});

try {
  const { ws, connectionInfo } = await connector.connect();
  console.log('✅ Successfully connected during indexing!');
  console.log(`Connection: ${connectionInfo.daemonUrl} (${connectionInfo.discoveryMethod})`);
  
  // Test basic communication
  ws.send(JSON.stringify({ type: 'connection.init', clientType: 'test' }));
  
  // Close after 5 seconds
  setTimeout(() => {
    ws.close();
    console.log('🔌 Connection closed - test complete');
    process.exit(0);
  }, 5000);
  
} catch (error) {
  console.log('❌ Connection failed:', error.message);
  process.exit(1);
}
```

#### Success Criteria
- [ ] **No connection blocking** during large file indexing
- [ ] **TUI connects successfully** while ONNX processes medium files
- [ ] **MCP clients can establish connections** during active indexing
- [ ] **WebSocket handshakes complete** within 5 seconds regardless of indexing state
- [ ] **Worker pool utilizes multiple CPU cores** efficiently  
- [ ] **Memory usage stable** with worker thread isolation
- [ ] **Indexing performance maintained** - no regression in embedding quality or speed
- [ ] **Graceful error handling** when workers fail or pool is exhausted

#### Performance Targets
- **Connection Time**: < 5 seconds to establish WebSocket connection
- **Discovery Response**: < 1 second for daemon registry discovery
- **CPU Distribution**: Processing distributed across available cores
- **Memory Isolation**: Worker failures don't affect daemon stability
- **Indexing Speed**: No regression from current ONNX performance

#### Integration Points
This fix integrates with multiple system components:
- **WebSocket Server**: Remains responsive for new connections
- **HTTP Server**: Can respond to health checks and discovery requests
- **DaemonRegistry**: Discovery mechanism works during indexing
- **TUI Interface**: Can connect and display progress updates
- **MCP Server**: Can establish connections for search operations

#### Validation Steps
1. **Before Fix**: Verify connection blocking occurs during indexing
2. **Worker Pool Implementation**: Add comprehensive logging for debugging
3. **Connection Testing**: Use TMOAT script to verify fix works
4. **TUI Integration**: Test actual TUI connection during indexing
5. **Performance Validation**: Ensure no regression in indexing speed
6. **Error Handling**: Test worker failures and recovery scenarios

This Sprint 10 addresses a critical user experience issue that prevents the daemon from being truly usable during indexing operations. The worker thread solution provides a clean, scalable fix that improves both functionality and performance.

---

## 🏗️ TECHNICAL ARCHITECTURE

### Daemon Hybrid Architecture
```typescript
class FolderMCPDaemon {
  constructor() {
    // WebSocket Server for TUI - Real-time updates
    this.wsServer = new WebSocketServer({ port: 3001 });
    this.wsServer.on('connection', this.handleTUIConnection);
    
    // REST API Server for MCP - Stateless operations  
    this.restApp = express();
    this.setupRestMiddleware();
    this.setupRestRoutes();
    this.restServer = this.restApp.listen(3002);
    
    console.log('Daemon running:');
    console.log('- WebSocket (TUI): ws://localhost:3001'); 
    console.log('- REST API (MCP): http://localhost:3002');
  }
  
  private setupRestMiddleware() {
    this.restApp.use(express.json());
    this.restApp.use(cors());
    this.restApp.use(helmet());
    this.restApp.use(this.requestLogger);
    this.restApp.use(this.errorHandler);
  }
  
  private setupRestRoutes() {
    this.restApp.get('/api/v1/health', this.handleHealth);
    this.restApp.get('/api/v1/server/info', this.handleServerInfo);
    this.restApp.get('/api/v1/folders', this.handleListFolders);
    this.restApp.get('/api/v1/folders/:id/documents', this.handleListDocuments);
    this.restApp.post('/api/v1/folders/:id/search', this.handleSearch);
    // ... other endpoints
  }
  
  // Shared services between WebSocket and REST
  private folderService = new FolderService();
  private searchService = new SearchService(); 
  private documentService = new DocumentService();
}
```

### Connection Architecture

#### Local Development (Multiple Agents)
```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│Claude Code│  │   VSCode     │  │    Cursor    │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │ spawns          │ spawns          │ spawns   
       ↓                 ↓                 ↓         
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ MCP Server 1 │  │ MCP Server 2 │  │ MCP Server 3 │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │         
       └─────────────────┼─────────────────┘         
                         ↓                           
                  http://localhost:3002               
                    (REST API)                       
                         ↓                           
              ┌─────────────────────┐                
              │    DAEMON (Single)   │    ┌─────────┐
              │  Port 3001: WebSocket│←───│   TUI   │
              │  Port 3002: REST API │    └─────────┘
              └─────────────────────┘                
                         ↓                           
                 Multi-Folder System                 
```

#### Remote Access (Cloud LLMs)
```
                       ☁️ CLOUD
┌─────────────────────────────────────┐
│  ┌────────────────────────────┐    │
│  │  Claude.ai / ChatGPT       │    │  
│  │  Custom LLM Service        │    │
│  └──────────┬─────────────────┘    │
└─────────────┼───────────────────────┘
              │ HTTPS with API key
              ↓
      🌐 Internet / Cloudflare Tunnel
              ↓
    https://folder-mcp.yourdomain.com
              ↓
         YOUR LOCAL MACHINE
┌─────────────────────────────────────┐
│  ┌────────────────────────────────┐ │
│  │      DAEMON REST API           │ │
│  │   localhost:3002               │ │
│  │   + Authentication             │ │
│  │   + Rate Limiting              │ │
│  │   + Security Headers           │ │
│  └────────────────────────────────┘ │
│              ↓                       │
│      Your Private Folders            │
│      /Users/you/Documents            │
│      /Users/you/Projects             │
└─────────────────────────────────────┘
```

### REST API Structure
```
/api/v1/
├── health                           # System health check
├── server/info                      # Server capabilities and status  
├── folders/                         # Folder operations
│   ├── GET /                       # List all folders
│   ├── GET /{id}                   # Get specific folder info
│   ├── GET /{id}/documents         # List documents in folder
│   ├── GET /{id}/documents/{docId} # Get specific document
│   └── POST /{id}/search           # Search within folder
└── auth/                            # Authentication endpoints (future)
    ├── POST /login                 # API key validation
    └── GET /status                 # Current auth status
```

### Data Flow
```
1. Claude Code → spawns MCP Server
2. MCP Server → connects to Daemon REST API  
3. Claude → JSON-RPC → MCP Server
4. MCP Server → HTTP REST → Daemon
5. Daemon → processes request → searches/retrieves
6. Daemon → HTTP response → MCP Server  
7. MCP Server → JSON-RPC response → Claude
8. Claude → displays results to user

Parallel:
TUI → WebSocket → Daemon (real-time updates)
```

---

## 🤖 REVOLUTIONARY TESTING METHODOLOGY

### Agent-Led Validation (Primary)
Every sprint validated by Claude Code subagent using actual MCP protocol:

```markdown
## AI Agent Test Execution

### Agent Setup
1. Configure Claude Code with folder-mcp MCP server
2. Create specialized testing subagent via Task tool
3. Agent has access ONLY to MCP tools (no file system)
4. Agent tests actual Claude → MCP → Daemon → Multi-Folder flow

### Test Pattern per Sprint
**Discovery Phase**: "What MCP tools are available?"
→ Validates MCP server loads and tools register correctly

**Functionality Phase**: "Test [specific endpoint] with [test data]"  
→ Validates endpoint works and returns expected data structure

**Integration Phase**: "Complete workflow: discover → list → search → retrieve"
→ Validates entire multi-folder workflow works end-to-end

**Performance Phase**: "Test response times and error handling"
→ Validates performance targets and error scenarios
```

#### Example Agent Conversations
```markdown
## Sprint 3 Agent Test

**Human**: "Please test the get_server_info MCP tool and tell me what information it returns"

**Agent**: "I'll test the get_server_info tool for you.

[calls get_server_info tool]

The server is running folder-mcp version 2.0.0 with the following status:
- 3 folders configured (2 active, 1 indexing)  
- 156 total documents indexed
- Support for models: all-MiniLM-L6-v2, all-mpnet-base-v2
- Daemon uptime: 3600 seconds

The tool is working correctly and showing multi-folder awareness."

**Validation**: ✅ Agent confirmed multi-folder info via real MCP protocol
```

### TMOAT Backend Validation (Secondary)
Systematic testing of daemon and infrastructure:

```bash
# Test REST API directly (bypass MCP layer)
curl -X GET http://localhost:3002/api/v1/health
curl -X POST http://localhost:3002/api/v1/folders/sales/search \
  -H "Content-Type: application/json" \
  -d '{"query": "revenue"}'

# Test WebSocket still works (TUI functionality)  
wscat -c ws://localhost:3001
> {"type": "connection.init", "clientType": "test"}

# Validate database state matches API responses
sqlite3 ~/.cache/folder-mcp/embeddings.db \
  "SELECT folder_id, COUNT(*) FROM documents GROUP BY folder_id;"

# Test hybrid architecture (both ports work simultaneously)
curl http://localhost:3002/api/v1/health &
echo '{"type": "ping"}' | wscat -c ws://localhost:3001 &
wait
```

### Testing Tools Integration
```typescript
// Sprint test automation
class SprintValidator {
  async validateSprint3() {
    // 1. TMOAT backend validation
    await this.testRESTEndpoint('/api/v1/server/info');
    await this.validateDatabaseState();
    
    // 2. Agent-led MCP validation  
    const agent = await this.createTestingAgent();
    const result = await agent.testTool('get_server_info');
    
    // 3. Integration validation
    await this.testClaudeDesktopIntegration();
    
    return this.generateSprintReport();
  }
}
```

---

## ✅ SUCCESS CRITERIA

### Technical Success
- [x] **Architecture Transformation**: All 10 MCP endpoints migrated from single-folder to multi-folder via REST API
- [x] **Hybrid Implementation**: WebSocket preserved for TUI (3001), REST added for MCP (3002)
- [x] **Multi-Folder Support**: Folder-specific operations with correct model loading per folder
- [x] **Performance Targets**: Search <500ms, folder operations <100ms, model switching <2s
- [x] **Remote Access**: Cloud LLMs can securely access local knowledge via HTTPS tunnel

### Quality Success  
- [x] **Agent Validation**: Claude Code subagent validates all MCP operations automatically via real protocol
- [x] **TMOAT Coverage**: Backend functionality verified through systematic REST and database testing
- [x] **Zero Regression**: Existing TUI functionality unchanged (WebSocket interface intact)
- [x] **Error Handling**: Comprehensive error scenarios with clear, actionable messages
- [x] **Documentation**: Complete setup guides for local development and remote deployment

### User Experience Success
- [x] **Simplified Configuration**: Claude Code config requires no folder arguments
- [x] **Multi-Client Support**: Multiple local agents (Claude, VSCode, Cursor) share same daemon
- [x] **Cloud Access**: Seamless remote access to local knowledge with proper authentication
- [x] **Performance Consistency**: Fast, reliable responses across all client types and endpoints
- [x] **Developer Experience**: Easy testing, debugging, and extending with clear separation of concerns

---

## 🛡️ RISK MITIGATION

### Technical Risks & Mitigation
| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|-------------|-------------------|
| Model loading performance | High | Medium | Pre-load frequently used models, LRU cache (max 3 models), fallback to CPU |
| Memory exhaustion with multiple clients | High | Low | Resource monitoring, connection limits, garbage collection |
| Port conflicts (3001, 3002) | Medium | Low | Configurable ports, port availability checking, clear error messages |
| Database lock contention | Medium | Medium | WAL mode, connection pooling, read replicas for search |
| REST API security vulnerabilities | High | Low | Input validation, rate limiting, API key auth, security headers |

### Testing & Validation Risks  
| Risk | Impact | Mitigation Strategy |
|------|--------|-------------------|
| Agent testing complexity | Medium | Start with simple scenarios, build complexity gradually |
| MCP protocol compliance issues | High | Use official MCP SDK, validate against spec, agent testing |
| Performance regression detection | Medium | Continuous benchmarking, performance CI/CD gates |
| Integration test reliability | Medium | Isolated test environments, test data fixtures, cleanup automation |

### Deployment & Operations Risks
| Risk | Impact | Mitigation Strategy |
|------|--------|-------------------|
| Remote access security | High | Strong API keys, rate limiting, IP allowlisting, audit logging |
| Configuration complexity | Medium | Clear documentation, setup scripts, configuration validation |
| Backward compatibility | Low | Feature flags, gradual migration, comprehensive testing |
| Cloud tunnel reliability | Medium | Multiple tunnel options (Cloudflare, ngrok), monitoring, fallbacks |

---

## 🎯 DEFINITION OF DONE

### Sprint Completion Criteria
Each sprint is considered complete only when ALL criteria are met:

#### Technical Completion
- [x] All planned functionality implemented and working
- [x] REST endpoints respond correctly and within performance targets
- [x] MCP tools work via Claude Code integration
- [x] No regressions in existing functionality (TUI, daemon core services)

#### Testing Completion  
- [x] TMOAT backend validation scripts pass with expected results
- [x] Claude Code agent validation succeeds for all test scenarios
- [x] Integration tests pass for MCP protocol compliance
- [x] Performance benchmarks meet or exceed targets

#### Quality Completion
- [x] Error handling comprehensive with clear, actionable messages
- [x] Logging provides sufficient debugging information
- [x] Code follows project conventions and architecture patterns
- [x] Documentation updated for new functionality

#### Deployment Readiness
- [x] Configuration changes documented and tested
- [x] Setup instructions verified on clean environment
- [x] Security considerations addressed (authentication, validation, rate limiting)
- [x] No security vulnerabilities or sensitive data exposure

### Final Project Success (End of Sprint 8)
- [x] **Feature Complete**: All 10 MCP endpoints support multi-folder operations with folder parameters
- [x] **Performance Validated**: Search <500ms, folder ops <100ms, model switching <2s across all scenarios
- [x] **Multi-Client Proven**: Claude Code + VSCode + remote cloud access working simultaneously
- [x] **Agent Certified**: Claude Code subagent successfully validates all endpoints and workflows
- [x] **Zero Regression**: TUI functionality unchanged, all existing features preserved
- [x] **Production Ready**: Security, monitoring, documentation complete for production deployment

---

## 🚀 IMPACT & FUTURE VISION

### Immediate Impact (Post-Implementation)
- **Local Developer Productivity**: Multiple AI coding assistants share same knowledge base
- **Team Collaboration**: Shared daemon enables team-wide knowledge access
- **Cloud Integration**: Personal knowledge accessible from any cloud LLM service
- **Testing Revolution**: AI agent validation provides instant feedback on MCP changes

### Future Expansion Opportunities  
- **Enterprise Features**: Multi-user auth, role-based access, audit logging
- **Advanced Search**: Cross-folder search, semantic clustering, knowledge graphs
- **Cloud Deployment**: Fully managed service with custom domains and CDN
- **Integration Ecosystem**: Plugins for more IDEs, browser extensions, mobile apps

### Technical Foundation Value
- **Scalable Architecture**: REST + WebSocket hybrid supports unlimited client types
- **Security Ready**: Authentication, rate limiting, audit logging foundation in place  
- **Performance Optimized**: Model caching, connection pooling, efficient data structures
- **Developer Friendly**: Clear separation of concerns, comprehensive testing, excellent documentation

---

## 📚 DOCUMENTATION DELIVERABLES

### Developer Documentation
- [x] **API Reference**: Complete OpenAPI specification for all REST endpoints
- [x] **Setup Guides**: Local development, testing, and debugging procedures
- [x] **Architecture Guide**: System design, data flow, and component interactions
- [x] **Testing Guide**: Agent testing methodology and TMOAT script usage

### User Documentation  
- [x] **Claude Code Setup**: MCP server configuration and usage
- [x] **Remote Access Guide**: Cloudflare tunnel setup and security configuration
- [x] **Multi-Client Guide**: Using multiple AI agents with same knowledge base
- [x] **Troubleshooting**: Common issues, error messages, and resolution steps

### Operational Documentation
- [x] **Deployment Guide**: Production setup, security hardening, monitoring
- [x] **Performance Tuning**: Optimization strategies, benchmarking, scaling considerations  
- [x] **Security Guide**: Authentication setup, best practices, threat mitigation
- [x] **Monitoring & Logging**: Observability setup, alerting, debugging procedures

---

This epic transforms folder-mcp into a revolutionary multi-folder, multi-client, cloud-accessible MCP system while preserving existing functionality and enabling unprecedented AI-driven testing and validation workflows.