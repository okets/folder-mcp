# VSCode MCP Integration Test - Complete Validation Guide

## 🎯 **Test Overview**

**Primary Goal**: Confirm folder-mcp provides an excellent developer experience in VSCode 1.101+  
**What We're Testing**: MCP server integration, tool functionality, development workflow, and user experience  
**Test Environment**: `C:\ThinkingHomes\test-folder`  
**Prerequisites**: VSCode 1.101+, Node.js, folder-mcp project built successfully

**⚠️ IMPORTANT**: This test is designed to validate real user workflows, not just technical functionality. Follow each step exactly as written to get accurate results.

---

## 🧹 **Phase 1: Clean Environment Setup**
*Ensure a fresh testing environment to avoid false results*

### Step 1: Verify VSCode Version
**What**: Check VSCode supports MCP features  
**Why**: VSCode 1.101+ required for MCP integration

```powershell
# Run this command and verify output shows 1.101.0 or higher
code --version
```

**Expected Output**: 
```
1.101.0 (or higher)
[commit hash]
[platform info]
```

**❌ If version is older**: Update VSCode before proceeding  
**✅ Success**: Version 1.101.0+ confirmed

---

### Step 2: Clean VSCode MCP State
**What**: Remove any cached MCP server data  
**Why**: Prevent old configurations from interfering

```powershell
# Clear MCP server cache (run even if files don't exist)
Remove-Item "$env:APPDATA\Code\User\globalStorage\ms-vscode.vscode-copilot\mcpServers.json" -Force -ErrorAction SilentlyContinue

# Clear any workspace-specific MCP data
Remove-Item "$env:APPDATA\Code\User\workspaceStorage\*\ms-vscode.vscode-copilot\*" -Recurse -Force -ErrorAction SilentlyContinue
```

**Expected**: Commands complete without errors (files may not exist, that's OK)  
**✅ Success**: Commands completed

---

### Step 3: Kill Any Running MCP Servers
**What**: Stop any folder-mcp processes  
**Why**: Ensure clean server startup

```powershell
# Find and kill any running MCP servers
Get-Process | Where-Object {$_.ProcessName -eq "node" -and $_.CommandLine -like "*mcp-server*"} | Stop-Process -Force

# Alternative if above doesn't work
taskkill /f /im node.exe /fi "WINDOWTITLE eq mcp*" 2>$null
```

**Expected**: Either no processes found, or processes killed successfully  
**✅ Success**: No MCP server processes running

---

### Step 4: Clean Test Workspace
**What**: Remove any cached folder-mcp data  
**Why**: Ensure fresh indexing and testing

```powershell
# Remove folder-mcp cache from test directory
Remove-Item "C:\ThinkingHomes\test-folder\.folder-mcp" -Recurse -Force -ErrorAction SilentlyContinue

# Verify test folder exists, create if needed
if (!(Test-Path "C:\ThinkingHomes\test-folder")) {
    New-Item -ItemType Directory -Path "C:\ThinkingHomes\test-folder"
    Write-Host "Created test folder"
}
```

**Expected**: Test folder exists and is clean  
**✅ Success**: Test folder ready

---

### Step 5: Verify Project Build
**What**: Ensure folder-mcp builds without errors  
**Why**: TypeScript errors will prevent MCP server from working

```powershell
cd C:\ThinkingHomes\folder-mcp
npm run build
```

**Expected Output**: Build completes with "Build completed successfully" or similar  
**❌ If build fails**: Fix TypeScript errors before proceeding  
**✅ Success**: Build completed without errors

---

## 🔧 **Phase 2: VSCode Configuration**
*Configure VSCode to work with your MCP server*

### Step 6: Create MCP Server Configuration
**What**: Tell VSCode how to connect to folder-mcp  
**Why**: VSCode needs connection details to start the MCP server

**Action**: Create file `C:\ThinkingHomes\test-folder\.vscode\mcp.json`

```json
{
  "servers": {
    "folder-mcp": {
      "command": "node",
      "args": ["C:\\ThinkingHomes\\folder-mcp\\dist\\mcp-server.js"],
      "dev": {
        "watch": "C:\\ThinkingHomes\\folder-mcp\\dist/**/*.js",
        "debug": { "type": "node" }
      },
      "env": {
        "NODE_ENV": "development",
        "MCP_DEBUG": "true"
      }
    }
  }
}
```

**Important**: 
- Create the `.vscode` folder first if it doesn't exist
- Use absolute paths (not relative paths)
- Double backslashes in Windows paths

**✅ Success**: File created with correct content

---

### Step 7: Launch VSCode with Test Workspace
**What**: Open VSCode in the test directory  
**Why**: VSCode needs to be running in the test workspace to find MCP configuration

```powershell
# Open VSCode in test workspace
code C:\ThinkingHomes\test-folder

# Wait for VSCode to fully load (about 10 seconds)
Start-Sleep -Seconds 10
```

**What to Look For**:
1. VSCode opens with `test-folder` as the workspace
2. You can see `.vscode/mcp.json` in the Explorer panel
3. No immediate error notifications appear

**✅ Success**: VSCode opened in test workspace

---

## 🔍 **Phase 3: Basic MCP Connection Test**
*Verify VSCode can find and connect to your MCP server*

### Step 8: Check MCP Server Discovery
**What**: Verify VSCode detects the folder-mcp server  
**Why**: This is the foundation - if VSCode can't see the server, nothing else will work

**Actions**:
1. In VSCode, press `Ctrl+Shift+P` (Command Palette)
2. Type `MCP: List Servers`
3. Press Enter

**Expected Results**:
- Command executes without error
- Shows a list with `folder-mcp` server
- Server status should be "Starting" or "Running"

**❌ Troubleshooting if server not found**:
1. Check `.vscode/mcp.json` file exists and has correct content
2. Verify file paths are absolute and correct
3. Restart VSCode completely
4. Check VSCode output panel for MCP errors

**✅ Success**: folder-mcp server appears in server list

---

### Step 9: Verify MCP Server Connection
**What**: Confirm the server is actually running and responding  
**Why**: Server might appear in list but fail to start

**Actions**:
1. Open VSCode Output panel (`View > Output`)
2. Select "MCP" from the dropdown
3. Look for connection messages

**Expected Log Messages**:
```
[INFO] Starting MCP server: folder-mcp
[INFO] MCP server connected successfully
[INFO] Handshake completed
```

**❌ If you see errors**:
- Connection failed: Check server paths in mcp.json
- Permission denied: Run VSCode as administrator
- Module not found: Ensure `npm run build` completed successfully

**✅ Success**: Server connected without errors

---

### Step 10: Test Basic Tool Discovery
**What**: Verify VSCode can see MCP tools  
**Why**: Tools are what make MCP useful - they must be discoverable

**Actions**:
1. Open VSCode Chat panel (`View > Chat` or `Ctrl+Alt+I`)
2. Click the "Agent" mode button (robot icon)
3. Click "Configure Tools" button
4. Look for folder-mcp tools in the list

**Expected Tools** (should see these 9+ tools):
- `get_status` - System status information
- `search_documents` - Search through documents  
- `search_chunks` - Search document chunks
- `list_folders` - List folders in workspace
- `list_documents` - List documents in folder
- `get_document_content` - Get document content
- `get_document_metadata` - Get document info
- `summarize_document` - Summarize documents
- `refresh_document` - Refresh document processing

**❌ If no tools appear**:
1. Wait 30 seconds and refresh
2. Check MCP output logs for tool registration errors
3. Verify MCP server is still running
4. Restart VSCode if needed

**✅ Success**: All expected tools are visible and can be selected

---

## 🎯 **Phase 4: Real-World Usage Test**
*Test how the MCP server performs with actual user tasks*

### Step 11: Create Test Content
**What**: Create realistic content for testing  
**Why**: We need actual documents to test search and analysis features

**Action**: Create file `C:\ThinkingHomes\test-folder\VSCODE_INTEGRATION_GUIDE.md`

```markdown
# VSCode MCP Integration Guide

## Overview
This document explains how to integrate MCP servers with VSCode 1.101+.

## Key Features
- Tool sets for organized functionality
- MCP prompts for quick access to common tasks  
- Resource responses that can be saved directly
- Development mode for faster iteration
- Agent mode integration for intelligent workflows

## Implementation Details
The MCP server uses JSON-RPC protocol over stdio transport.
Authentication is handled through VSCode's built-in mechanisms.
Performance is optimized for local development workflows.

## Best Practices
1. Use descriptive tool names and descriptions
2. Implement proper error handling
3. Provide meaningful progress feedback
4. Test with realistic document sets
5. Optimize for common developer workflows
```

**✅ Success**: Test file created with realistic content

---

### Step 12: Test Basic Tool Execution
**What**: Verify individual tools work correctly  
**Why**: Core functionality must work before testing advanced features

**Actions**:
1. In VSCode Chat (Agent mode), enter this prompt:
```
Please use the get_status tool to check our system status, then use search_documents to search for any available documents in the workspace.
```
2. Wait for tools to execute
3. Observe the responses

**Expected Results**:
- `get_status` executes and returns system status information
- `search_documents` executes and returns document search results
- Both tools complete without errors
- Responses are well-formatted and readable

**❌ If tools fail**:
- Check MCP output logs for specific error messages
- Verify tools are still selected in "Configure Tools"
- Try individual tools one at a time

**✅ Success**: Both tools execute successfully with good responses

---

### Step 13: Test Document Search Functionality
**What**: Test the core document intelligence features  
**Why**: This is the primary value proposition of folder-mcp

**Setup**: Wait 30 seconds for the test document to be indexed

**Actions**:
1. In VSCode Chat, enter this prompt:
```
Search for documents about "VSCode integration" and show me the most relevant results with brief summaries.
```
2. Wait for search to complete
3. Review the results

**Expected Results**:
- Search finds the `VSCODE_INTEGRATION_GUIDE.md` file
- Results include relevance scores or confidence indicators
- Summaries are accurate and helpful
- Search completes in under 5 seconds

**❌ If search fails**:
- Check if document was indexed (server logs)
- Try broader search terms like "integration" or "MCP"
- Verify indexing completed without errors

**✅ Success**: Search finds relevant documents with useful summaries

---

### Step 14: Test Document Analysis
**What**: Test higher-level analysis capabilities  
**Why**: Users want insights, not just raw search results

**Actions**:
1. In VSCode Chat, enter this prompt:
```
Please analyze all documents in this workspace. What are the main topics and what would be most important for a developer to know?
```
2. Wait for analysis to complete
3. Review the insights provided

**Expected Results**:
- Analysis covers documents in the workspace
- Identifies key topics accurately
- Provides developer-focused insights
- Response is well-structured and actionable

**❌ If analysis fails**:
- Check if multiple tools were used (list_documents, get_document_content, etc.)
- Verify tools can access workspace files
- Check for permission or path issues

**✅ Success**: Analysis provides valuable, accurate insights

---

## 🚀 **Phase 5: Development Experience Test**
*Test the developer workflow and productivity features*

### Step 15: Test Hot Reload (Development Mode)
**What**: Verify code changes are reflected quickly  
**Why**: Fast iteration is crucial for development productivity

**Setup**: Note current time for measuring reload speed

**Actions**:
1. Open `C:\ThinkingHomes\folder-mcp\src\interfaces\mcp\handlers\specialized.ts`
2. Find the get_status handler
3. Add a debug message to the status response, such as modifying the message format
4. Save the file (`Ctrl+S`)
5. Wait for automatic rebuild and server restart
6. In VSCode Chat, test the get_status tool again

**Expected Results**:
- File watching detects the change automatically
- Server rebuilds and restarts without manual intervention
- Total time from save to working tool is under 10 seconds
- Modified status response appears in tool output

**❌ If hot reload fails**:
- Check MCP output logs for restart messages
- Verify `dev.watch` configuration in mcp.json
- Manual restart VSCode if needed

**✅ Success**: Code change reflected in under 10 seconds without manual restart

---

### Step 16: Test Error Handling
**What**: Verify graceful handling of errors  
**Why**: Errors are inevitable; good error handling improves user experience

**Actions**:
1. Temporarily break the MCP server (add syntax error)
2. Save the file
3. Try to use tools in VSCode Chat
4. Observe error messages
5. Fix the syntax error and save
6. Test tools again

**Expected Results**:
- VSCode detects server failure quickly
- Error messages are helpful (not just "connection failed")
- Server automatically recovers when code is fixed
- Tools work normally after recovery

**✅ Success**: Graceful error handling and automatic recovery

---

## 📊 **Phase 6: Performance and User Experience**
*Validate performance meets user expectations*

### Step 17: Performance Test with Multiple Documents
**What**: Test with a realistic document set  
**Why**: Performance must be acceptable with real-world content volumes

**Setup**: Create 5 more test documents with different content

**Actions**:
1. Create additional markdown files with varied content
2. Wait for indexing to complete (watch server logs)
3. Test comprehensive search across all documents
4. Measure response times

**Expected Results**:
- Indexing completes within 2 minutes
- Search across all documents completes in under 3 seconds
- Results are relevant and well-ranked
- Memory usage remains reasonable (under 200MB)

**✅ Success**: Good performance with multiple documents

---

### Step 18: User Experience Validation
**What**: Evaluate overall user experience  
**Why**: Technical functionality must translate to good UX

**Evaluation Criteria**:
1. **Discoverability**: Can users easily find and use MCP tools?
2. **Reliability**: Do tools work consistently without errors?
3. **Speed**: Are response times acceptable for interactive use?
4. **Usefulness**: Do results provide genuine value to users?
5. **Integration**: Does it feel native to VSCode or bolted-on?

**Actions**: Use the system as you would in real development work

**✅ Success**: System provides a genuinely useful and pleasant user experience

---

## ✅ **Test Results Summary**

### **Quick Checklist** (Check each item as you complete it)

**Basic Setup & Connection**:
- [ ] VSCode 1.101+ confirmed
- [ ] MCP server appears in server list  
- [ ] Server connects without errors
- [ ] All 9+ tools are discoverable

**Core Functionality**:
- [ ] get_status tool works
- [ ] search_documents returns relevant results
- [ ] Document analysis provides insights
- [ ] Document listing shows files correctly

**Development Experience**:
- [ ] Hot reload works in under 10 seconds
- [ ] Error handling is graceful
- [ ] Recovery is automatic

**Performance & UX**:
- [ ] Performance acceptable with multiple documents
- [ ] Overall user experience is positive
- [ ] Integration feels native to VSCode

---

## 🔧 **When Things Go Wrong - Common Issues**

### **MCP Server Not Found**
- **Cause**: Configuration file missing or incorrect
- **Fix**: Verify `.vscode/mcp.json` exists with correct paths
- **Test**: `MCP: List Servers` command

### **Tools Not Appearing**  
- **Cause**: Server started but tool registration failed
- **Fix**: Check MCP output logs for registration errors
- **Test**: Check "Configure Tools" dialog

### **Tools Fail to Execute**
- **Cause**: Runtime errors in server code
- **Fix**: Check server logs for JavaScript/TypeScript errors  
- **Test**: Try get_status tool first (basic system tool)

### **Poor Performance**
- **Cause**: Large document set or indexing issues
- **Fix**: Check indexing logs, consider smaller test set
- **Test**: Monitor memory usage and response times

### **Hot Reload Not Working**
- **Cause**: File watching not configured or not working
- **Fix**: Verify `dev.watch` setting in mcp.json
- **Test**: Make simple code change and observe logs

---

## 🎯 **Success Definition**

**This test passes when**:
1. ✅ VSCode connects to folder-mcp server reliably
2. ✅ All core tools execute successfully  
3. ✅ Document search and analysis provide useful results
4. ✅ Development experience is smooth (hot reload works)
5. ✅ Performance is acceptable for real-world use
6. ✅ Overall experience feels professional and polished

**If any phase fails**, document the specific issue, identify the root cause, and either fix the problem or adjust expectations. The goal is a genuinely useful developer tool, not just technically functional software.
