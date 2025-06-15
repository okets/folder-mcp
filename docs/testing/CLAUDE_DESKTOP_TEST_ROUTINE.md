# End-to-End Claude Desktop Integration Test

**Main Goal**: Verify all systems work together seamlessly  
**Sub Goal**: Update e2e tests based on discovered gaps and issues  
**Test Environment**: `C:\ThinkingHomes\test-folder`

## Pre-Test Cleanup (Steps 1-6)

### 1. Kill Running MCP Server Instances
```powershell
Get-Process | Where-Object {$_.ProcessName -like "*node*" -and $_.CommandLine -like "*mcp*"} | Stop-Process -Force
```

### 2. Check for Port Conflicts
```powershell
netstat -ano | findstr :3000
# If conflicts found, note PIDs and kill if necessary
```
*(Adjust port number as needed for your configuration)*

### 3. Clear Stuck Processes
```powershell
taskkill /f /im node.exe
```

### 4. Clear Claude Desktop Logs (MANDATORY)
```powershell
Remove-Item "$env:APPDATA\Claude\logs\*" -Force -ErrorAction SilentlyContinue
```

### 5. Delete MCP Cache Folder
```powershell
Remove-Item "C:\ThinkingHomes\test-folder\.folder-mcp" -Recurse -Force -ErrorAction SilentlyContinue
```

### 6. Fresh Terminal Session
- Close current PowerShell
- Open new PowerShell as Administrator
- Navigate to project directory

## Test Execution (Steps 7-11)

### 7. Start MCP Server
- Verify zero TypeScript errors: `npm run build` or `tsc --noEmit`
- Ensure all tests pass: `npm test`
- Launch server and verify startup logs
- Confirm server is listening on expected port
- **Success Criteria**: No TS errors, all tests pass, server starts without errors, port is active

### 8. Create/Update Mock Version File
- **If file doesn't exist**: Create `CIARA_REL_TEST.md` (tests creation scenario)
- **If file exists**: Append new version entry (tests update scenario)
- Use incremental version numbering (read existing file to determine next version)
- Include current timestamp
- **Agent Task**: Generate 3-4 realistic, randomly generated release notes for each new version entry
- Make the release notes varied and believable (features, fixes, improvements, etc.)
- **Success Criteria**: File is created/updated with unique, realistic content and proper version incrementing

### 9. Verify Filesystem Trigger & Embeddings Update
- Wait 10-15 seconds for file system watcher to detect changes
- **Verification Method**: Check server logs for embedding update messages
- **Success Criteria**: New file content appears in embeddings within 30 seconds

### 10. Claude Desktop Integration Test (MANDATORY)
- If there are no issues with the MCP server and file updates, proceed to test Claude Desktop's integration.
- If there are issues, address them first before proceeding.
**Generated Prompt for User:**
```
I'm testing our MCP server implementation and need a comprehensive functionality report in JSON format. Please:

1. Tell me about Ciara's most recent version information
2. List all endpoints/functions you used to retrieve this information  
3. Provide suggestions for improving information retrieval efficiency

Format your response as JSON with these keys:
- "ciara_version_info": [the version details you found]
- "endpoints_used": [array of function calls made]
- "retrieval_success": [true/false]
- "suggestions": [array of improvement recommendations]
- "issues_encountered": [array of any problems]
```

### 11. User Confirmation & Analysis
- **Input Required**: User pastes Claude Desktop's JSON response
- **Analysis**: Parse response for:
  - Did it find the new Ciara version?
  - Which functions were called?
  - Were there any errors?
  - Are suggestions actionable?

### 12. Issue Resolution & Planning
- If issues found, document them in a temporary .md file in the /roadmap/issues directory, explain clearly what isn't working, and why
- If suggestions are actionable, create tasks for implementation
- If everything works, note it and plan for minor enhancements
- Define clear success criteria for each task

## Success Metrics
- [ ] MCP server starts cleanly
- [ ] File changes trigger embedding updates within 30 seconds  
- [ ] Claude Desktop successfully retrieves new version information
- [ ] All MCP functions work as expected
- [ ] JSON response is well-formed and complete

**This step concludes when the entire flow executes successfully with only minor enhancement opportunities remaining.**