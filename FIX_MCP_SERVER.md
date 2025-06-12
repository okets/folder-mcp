# FIX_MCP_SERVER.md - Complete MCP Server Rebuild Plan

## 🎯 Goal
Rebuild the MCP server from scratch with a clean, working implementation that connects to Claude Desktop and provides reliable "hello world" functionality before adding complex features.

## 🧹 Phase 1: Clean Slate (30 minutes)

### Step 1.0: Process Management (Before Every Step)
- **Kill all running MCP server instances**: `Get-Process | Where-Object {$_.ProcessName -like "*node*" -and $_.CommandLine -like "*mcp*"} | Stop-Process -Force`
- **Check for port conflicts**: `netstat -ano | findstr :3000` (if using ports)
- **Clear any stuck processes**: `taskkill /f /im node.exe` (if needed)
- **Fresh terminal session**: Start new PowerShell window to avoid environment issues
- **Process Check**: Kill running instances, fresh terminal, rebuild
- **MANDATORY**: Clear Claude Desktop logs before testing: `Remove-Item "$env:APPDATA\Claude\logs\*" -Force`
- **MANDATORY**: Test connection from Claude and get user confirmation before proceeding
- **MANDATORY**: Check Claude Desktop logs for connection errors: `Get-Content "$env:APPDATA\Claude\logs\*" | Select-String -Pattern "mcp\|error\|folder-mcp"`
- Verify "hello_world" appears in tool list
- Execute "hello_world" from Claude interface
- **MANDATORY**: User confirms Claude Desktop integration works before proceeding to the next phase
- **MANDATORY**: update this document with any progress made during the process by Checklist


> **Critical Process Management Rule**: Between EVERY step in EVERY phase, we will:
> 1. Kill all running MCP server instances
> 2. Start fresh terminal session  
> 3. Rebuild project (`npm run build`)
> 4. Test new instance only
> 
> This prevents version confusion, port conflicts, and hanging processes that plagued our previous attempt.

### Step 1.1: Remove Legacy MCP Code
- [x] Delete `src/interfaces/mcp/` directory entirely
- [x] Delete broken `src/index.ts` 
- [x] Remove MCP-related DI registrations from `src/di/setup.ts`
  - Remove `UNIFIED_MCP_SERVER` token registration
  - Remove `createUnifiedMCPServer` factory call
- [x] Remove MCP service tokens from `src/di/interfaces.ts`
  - Remove `UNIFIED_MCP_SERVER: Symbol('UnifiedMCPServer')` from SERVICE_TOKENS
- [x] Clean up any MCP imports in other files

### Step 1.2: Remove Legacy MCP Tests
- [x] Delete `tests/unit/interfaces/mcp.test.ts`
- [x] Delete `tests/integration/protocols/mcp-protocol.test.ts`  
- [x] Delete `tests/e2e/mcp-scenarios.test.ts`
- [x] Delete test helper files (`test-*.js` in root)

**Rationale:** Legacy tests test the broken implementation. We'll rebuild tests incrementally as we implement features, ensuring they test the new working architecture.

### Step 1.3: Keep Working Foundation
- [x] Keep `src/simple-mcp-server.ts` as reference (files were missing)
- [x] Keep `src/restored-mcp-server.ts` as working baseline (files were missing)
- [x] Preserve domain, infrastructure, and application layers (they're solid)

## 🏗️ Phase 2: Build Minimal MCP Server (45 minutes)

### Step 2.1: Create New MCP Structure Following Layer Guidelines
```
src/interfaces/mcp/           # ✅ Interface Layer - Entry points
├── server.ts                 # Main MCP server class (thin delegation layer)
├── transport.ts             # Stdio transport wrapper  
├── handlers/
│   └── basic.ts            # Hello world handler only
└── types.ts                # MCP-specific types and interfaces
```

**Architecture Compliance:**
- `interfaces/mcp/` can import from `application/`, `shared/` only (per DEVELOPER_GUIDELINES.md)
- Use constructor injection for all dependencies (not direct instantiation)
- Thin delegation to application services (interface layer should be minimal)
- No business logic in interface layer (delegate to application layer)
- Follow ServiceFactory patterns used elsewhere in codebase
- Proper DI registration in `src/di/setup.ts`

### Step 2.2: Implement Basic MCP Server (`src/interfaces/mcp/server.ts`)
- [x] **Process Check**: Kill running instances, fresh terminal, rebuild
- [x] Simple class following interface layer guidelines
- [x] Constructor injection for dependencies (no direct instantiation)
- [x] Only stdio transport support initially  
- [x] Single "hello_world" tool
- [x] Use proper TypeScript types and interfaces
- [x] Delegate tool calls to application layer services

**Key Pattern:**
```typescript
export class MCPServer {
  constructor(
    private readonly helloService: IHelloService,  // Injected from application layer
    private readonly logger: ILoggingService      // Injected infrastructure
  ) {}
  
  // Minimal interface logic - delegate to application services
}
```
- [x] Clean error handling that doesn't break Claude
- [x] Delegate to application layer (no business logic here)

**DI Integration:**
- [x] Use `ILoggingService` interface (injected)
- [x] Register with `SERVICE_TOKENS.MCP_SERVER` (new token)
- [x] Use ServiceFactory pattern for creation

### Step 2.3: Create Entry Point (`src/mcp-server.ts`)
- [x] **Process Check**: Kill running instances, fresh terminal, rebuild
- [x] Simple entry script that takes folder path argument
- [x] Uses `setupDependencyInjection()` correctly
- [x] Resolves MCP server from container
- [x] Replace existing `src/index.ts`

### Step 2.4: Update DI System
- [x] **Process Check**: Kill running instances, fresh terminal, rebuild
- [x] Add `MCP_SERVER: Symbol('MCPServer')` to SERVICE_TOKENS
- [x] Add `createMCPServer()` method to ServiceFactory
- [x] Register in `setupDependencyInjection()` with proper conditional logic
- [x] Follow singleton pattern for server registration

### Step 2.5: Update Package.json
- [x] **Process Check**: Kill running instances, fresh terminal, rebuild
- [x] Update main entry point to `dist/mcp-server.js`
- [x] Ensure build scripts work correctly
- [x] **Test Fresh Instance**: Command line echo test to verify new server works

## 🔌 Phase 3: Claude Desktop Integration (30 minutes)

### Step 3.1: Test Basic Connection
- [x] **Process Check**: Kill running instances, fresh terminal, rebuild
- [x] Build and test with command line (echo tests)
- [x] Verify "hello_world" tool discovery
- [x] Verify "hello_world" tool execution
- [x] Ensure proper JSON-RPC responses

### Step 3.2: Configure Claude Desktop
- [x] **Process Check**: Kill running instances, fresh terminal, rebuild
- [x] Create Claude Desktop configuration
- [x] **MANDATORY**: Clear Claude Desktop logs before testing: `Remove-Item "$env:APPDATA\Claude\logs\*" -Force`
- [x] **MANDATORY**: Test connection from Claude and get user confirmation before proceeding
- [x] **MANDATORY**: Check Claude Desktop logs for connection errors: `Get-Content "$env:APPDATA\Claude\logs\*" | Select-String -Pattern "mcp\|error\|folder-mcp"`
- [x] Verify "hello_world" appears in tool list
- [x] Execute "hello_world" from Claude interface
- [x] **MANDATORY**: User confirms Claude Desktop integration works before proceeding to Phase 4

### Step 3.3: Document Connection Setup
- [x] **Process Check**: Kill running instances, fresh terminal, rebuild
- [x] Update README.md with correct Claude Desktop config
- [x] Add troubleshooting section
- [x] Document expected behavior
- [x] **MANDATORY**: Only proceed after user confirms Claude Desktop works properly

**Important MCP Protocol Lesson**: When working with Claude Desktop MCP:
1. Only valid JSON-RPC messages can go to stdout
2. All logs must redirect to stderr only
3. Console.log/error/info must never be used directly
4. Watch for any debugging that might pollute stdout
5. Fix implemented: Redirect all console methods to stderr and ensure transport only writes JSON to stdout

> **Critical Claude Desktop Verification**: Between Phase 3 and Phase 4, we MUST:
> 1. Clear Claude Desktop logs: `Remove-Item "$env:APPDATA\Claude\logs\*" -Force`
> 2. Test with Claude Desktop interface directly
> 3. Get user confirmation that connection and tools work
> 4. Check logs for any errors before proceeding
> 5. Do NOT proceed to Phase 4 without successful Claude Desktop integration

## 🛠️ Phase 4: Add Core Tools (60 minutes)

### Step 4.1: Add File Operations Handler (`src/mcp/handlers/files.ts`)
- [ ] **Process Check**: Kill running instances, fresh terminal, rebuild
- [ ] `read_file` - Read file contents with path validation
- [ ] `list_files` - List directory contents
- [ ] `search_files` - Search files by pattern
- [ ] Proper error handling and security checks

### Step 4.2: Add System Handler (`src/mcp/handlers/system.ts`)
- [ ] **Process Check**: Kill running instances, fresh terminal, rebuild
- [ ] `get_folder_info` - Basic folder information
- [ ] Server status and metadata

### Step 4.3: Test Each Tool Individually
- [ ] **Process Check**: Kill running instances, fresh terminal, rebuild
- [ ] Command line tests for each tool
- [ ] Claude Desktop tests for each tool
- [ ] `list_files` - better handling large directories to prevent context blocking.
- [ ] Error case testing

## 🏛️ Phase 5: Integrate with Application Layer (45 minutes)

### Step 5.1: Connect to Existing Services
- [ ] Use FileSystemService for file operations
- [ ] Use LoggingService for proper logging
- [ ] Use ConfigurationService for settings

### Step 5.2: Add Knowledge Operations (Optional)
- [ ] Only if vector search is working
- [ ] `search_knowledge` tool
- [ ] Proper error handling for missing indexes

### Step 5.3: Dependency Injection Integration
- [ ] Clean DI registration for MCP server
- [ ] Minimal service dependencies
- [ ] No circular dependencies

## 🧪 Phase 6: Testing & Validation (30 minutes)

### Step 6.1: Automated Tests
- [ ] Unit tests for MCP server
- [ ] Integration tests with Claude Desktop
- [ ] Error handling tests

### Step 6.2: Documentation
- [ ] Update README.md with new architecture
- [ ] Document all available tools
- [ ] Add examples and usage

## 📋 Phase 7: Cleanup & Polish (15 minutes)

### Step 7.1: Remove Temporary Files
- [ ] Delete `src/simple-mcp-server.ts`
- [ ] Delete `src/restored-mcp-server.ts`
- [ ] Delete test files (`test-*.js`)

### Step 7.2: Final Validation
- [ ] Clean build
- [ ] Full Claude Desktop test
- [ ] Performance check

---

## 🚀 Implementation Order

### Priority 1 (Must Work)
1. ✅ Hello world tool in Claude Desktop
2. ✅ File reading from Claude Desktop
3. ✅ Error handling that doesn't break Claude

### Priority 2 (Should Work)
4. File listing and search
5. Folder information
6. Proper logging and debugging

### Priority 3 (Nice to Have)
7. Knowledge/vector search integration
8. Advanced error recovery
9. Performance optimizations

---

## 🎯 Success Criteria

### Minimum Viable Product (MVP)
- [ ] Claude Desktop connects without errors
- [ ] "hello_world" tool visible and executable
- [ ] "read_file" tool works with any text file
- [ ] No console errors or hanging
- [ ] Clean startup and shutdown

### Full Success
- [ ] All file operations work reliably
- [ ] Proper error messages in Claude
- [ ] Performance is acceptable (<2s for simple operations)
- [ ] Code is maintainable and well-documented
- [ ] No legacy code confusion

---

## 🗂️ File Changes Summary

### Files to Delete
- `src/interfaces/mcp/` (entire directory)
- `src/index.ts`
- `src/simple-mcp-server.ts` (after Phase 7)
- `src/restored-mcp-server.ts` (after Phase 7)
- Test files: `test-*.js`

### Files to Create
- `src/mcp/server.ts`
- `src/mcp/transport.ts`
- `src/mcp/handlers/basic.ts`
- `src/mcp/handlers/files.ts`
- `src/mcp/handlers/system.ts`
- `src/mcp/types.ts`
- `src/mcp-server.ts` (new entry point)

### Files to Update
- `package.json` (main entry point)
- `src/di/setup.ts` (clean MCP registration)
- `src/di/interfaces.ts` (clean service tokens)
- `README.md` (updated usage instructions)

---

## ⏱️ Total Estimated Time: 4.5 hours

This plan ensures we rebuild the MCP server properly without legacy code confusion, test it thoroughly with Claude Desktop, and have a solid foundation for future enhancements.
