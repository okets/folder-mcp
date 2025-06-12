# Claude Desktop Test Routine

This document contains the standard testing procedure for MCP server integration with Claude Desktop.

## PowerShell Command Chaining Reminder
**IMPORTANT**: Use `;` for PowerShell command chaining, NOT `&&` (which is bash syntax)

## When to Use
Execute this routine whenever instructed to "test with claude" or when debugging MCP server connectivity issues.

## Test Procedure

### 1. Kill Running MCP Server Instances
```powershell
Get-Process | Where-Object {$_.ProcessName -like "*node*" -and $_.CommandLine -like "*mcp*"} | Stop-Process -Force
```

### 2. Check for Port Conflicts
```powershell
netstat -ano | findstr :3000
```
*(Adjust port number as needed for your configuration)*

### 3. Clear Stuck Processes (if needed)
```powershell
taskkill /f /im node.exe
```

### 4. Fresh Terminal Session
- Start new PowerShell window to avoid environment issues
- Process Check: Kill running instances, fresh terminal, rebuild

### 5. **MANDATORY**: Clear Claude Desktop Logs
```powershell
Remove-Item "$env:APPDATA\Claude\logs\*" -Force
```

### 6. **MANDATORY**: Test Connection
- Test connection from Claude Desktop
- Get user confirmation before proceeding

### 7. **MANDATORY**: Check Claude Desktop Logs
```powershell
Get-Content "$env:APPDATA\Claude\logs\*" | Select-String -Pattern "mcp\|error\|folder-mcp"
```

### 8. **MANDATORY**: User Confirmation
- User confirms Claude Desktop integration works before proceeding to the next phase

## Notes
- All steps marked **MANDATORY** must be completed and confirmed
- Fresh terminal session helps avoid environment variable conflicts
- Log clearing ensures clean debugging information
- User confirmation prevents proceeding with broken integration
