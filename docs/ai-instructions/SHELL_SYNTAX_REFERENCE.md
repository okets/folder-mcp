# Cross-Platform Shell Syntax Reference

**CONTEXT-AWARE COMMANDS**: Always check environment_info for current OS and shell!

## Current Environment Detection
The AI assistant should always check the `environment_info` section to determine:
- Current OS (Windows/Mac/Linux)
- Default shell (PowerShell/bash/zsh/etc.)
- Use appropriate syntax for the detected environment

## Command Chaining by Platform

### Windows PowerShell
```powershell
# Sequential execution
command1; command2; command3

# Conditional execution
command1 -and command2 -and command3
```

### Mac/Linux (bash/zsh)
```bash
# Sequential execution
command1; command2; command3

# Conditional execution
command1 && command2 && command3
```

### ❌ WRONG: Mixing Syntaxes
```bash
# DON'T use bash syntax on Windows
command1 && command2  # Wrong on PowerShell

# DON'T use PowerShell syntax on Mac/Linux
command1 -and command2  # Wrong on bash/zsh
```

## Common PowerShell Patterns

### Process Management
```powershell
# Kill processes by name
taskkill /f /im node.exe

# Kill specific processes with filtering
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force
```

### File Operations
```powershell
# Remove files/folders
Remove-Item "path\to\file" -Force
Remove-Item "path\to\folder\*" -Force -Recurse

# Create directories
New-Item -ItemType Directory -Path "path\to\folder" -Force
```

### Network/Port Checking
```powershell
# Check ports
netstat -ano | findstr :3000

# Test network connectivity
Test-NetConnection -ComputerName localhost -Port 3000
```

### Environment Variables
```powershell
# Access environment variables
$env:APPDATA
$env:PATH

# Set environment variables
$env:NODE_ENV = "development"
```

## Reminder for AI Assistant
**ALWAYS CHECK ENVIRONMENT_INFO FIRST!**

Current session info will show:
- OS: Windows/Mac/Linux  
- Shell: PowerShell/bash/zsh/etc.

### Decision Logic:
- **Windows + PowerShell**: Use `;` and `-and`, PowerShell cmdlets
- **Mac/Linux + bash/zsh**: Use `;` and `&&`, Unix commands
- **When in doubt**: Ask user to confirm their current environment

### Cross-Platform Commands
Some commands work the same everywhere:
- `node server.js`
- `npm install`
- `git status`

Others need platform-specific versions:
- Process killing: `taskkill` (Windows) vs `pkill` (Mac/Linux)
- Path separators: `\` (Windows) vs `/` (Mac/Linux)
- Environment variables: `$env:VAR` (PowerShell) vs `$VAR` (bash)
