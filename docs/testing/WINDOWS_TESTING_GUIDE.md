# Windows Testing Guide for folder-mcp

This guide provides comprehensive instructions for testing folder-mcp on Windows after the compatibility improvements.

## Prerequisites

### Required Software
1. **Node.js** (v18 or v20)
   - Download from: https://nodejs.org/
   - Verify: `node --version`

2. **Python 3.8+**
   - Download from: https://www.python.org/downloads/
   - During installation, CHECK "Add Python to PATH"
   - Verify: `python --version` (should work, not `python3`)

3. **Git for Windows**
   - Download from: https://git-scm.com/download/win
   - Choose "Git Bash" during installation

### Terminal Options (Test in ALL)
- **Windows Terminal** (Recommended)
  - Install from Microsoft Store
  - Best ANSI support
- **PowerShell** (Built-in)
  - Run as Administrator for best results
- **Command Prompt** (cmd.exe)
  - Legacy but should work
- **VS Code Terminal**
  - Good for development

## Installation Steps

```powershell
# Clone the repository
git clone https://github.com/yourusername/folder-mcp.git
cd folder-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

## Critical Tests

### 1. Python Command Detection
**What was fixed:** Uses `python` on Windows instead of `python3`

**Test:**
```powershell
# Should use 'python' command on Windows
npm run test -- tests/integration/services/python-embeddings.test.ts

# Verify Python embedding service starts
node -e "const { PythonEmbeddingService } = require('./dist/src/infrastructure/embeddings/python-embedding-service.js'); const s = new PythonEmbeddingService({ modelName: 'all-MiniLM-L6-v2' }); s.initialize().then(() => console.log('SUCCESS')).catch(e => console.error('FAILED:', e.message));"
```

**Expected:** Service initializes without "python3: command not found" error

### 2. Daemon Process Detection
**What was fixed:** Handles both forward and backward slashes in process paths

**Test:**
```powershell
# Start daemon
npm run daemon

# In another terminal, try to start second daemon
npm run daemon

# Should see: "Daemon already running (PID: XXXX)"
```

**Expected:** Second daemon refuses to start, detecting the first one

### 3. Signal Handling
**What was fixed:** Only uses Windows-supported signals (SIGTERM, SIGINT)

**Test:**
```powershell
# Start daemon
npm run daemon

# Press Ctrl+C
# Should see: "Received SIGINT, shutting down gracefully..."
```

**Expected:** Clean shutdown without "Unknown signal" errors

### 4. TUI Terminal Compatibility
**What was fixed:** Removed render-time console.error() calls that fragment ANSI sequences

**Test in each terminal type:**
```powershell
# Windows Terminal
npm run tui

# PowerShell
npm run tui

# Command Prompt
npm run tui

# VS Code Terminal
npm run tui
```

**Check for:**
- No screen flickering during navigation
- Clean panel transitions
- Proper box drawing characters (╭─╮│╰╯)
- No corrupted text or artifacts
- Smooth scrolling

**Debug environment variables (should NOT cause flickering):**
```powershell
# These should show warning but not break the TUI
$env:TUI_DEBUG="true"; npm run tui
$env:DEBUG_TRUNCATE="true"; npm run tui
```

### 5. Path Operations
**What was fixed:** Uses path module instead of string manipulation

**Test with various path formats:**
```powershell
# Test with spaces in path
npm run daemon
# Add folder: C:\Program Files\Test Folder\

# Test with different drives
# Add folder: D:\Projects\

# Test with deep nesting
# Add folder: C:\Users\YourName\Documents\Projects\DeepFolder\SubFolder\
```

**Expected:** All paths handled correctly regardless of format

## Comprehensive Test Suite

Run the full test suite:
```powershell
# All tests
npm test

# Specific test categories
npm run test:unit
npm run test:integration
npm run test:e2e
```

## Edge Cases to Test

### 1. Long Paths (>260 characters)
```powershell
# Create a deep folder structure
$longPath = "C:\test"
for ($i = 0; $i -lt 20; $i++) {
    $longPath = Join-Path $longPath "very_long_folder_name_$i"
}
New-Item -ItemType Directory -Path $longPath -Force

# Try to add this folder in the TUI
```

### 2. Network Paths (UNC)
```powershell
# Test with network share
\\server\share\folder
```

### 3. Case Sensitivity
```powershell
# Windows is case-insensitive, test that operations work regardless
# Add folder: C:\Test
# Reference as: c:\test
```

### 4. Special Characters
```powershell
# Test folders with special characters
C:\Test & Folder
C:\Test (2024)
C:\Test @ Work
```

## Performance Testing

### Terminal Rendering Performance
```powershell
# Measure TUI responsiveness
Measure-Command { npm run tui }

# Should launch in < 2 seconds
# Navigation should feel instant (< 100ms response)
```

### Python Process Startup
```powershell
# Time embedding service initialization
Measure-Command {
    node -e "const { PythonEmbeddingService } = require('./dist/src/infrastructure/embeddings/python-embedding-service.js'); const s = new PythonEmbeddingService({ modelName: 'all-MiniLM-L6-v2' }); s.initialize().then(() => process.exit(0));"
}

# Should complete in < 5 seconds (excluding first-time model download)
```

## Troubleshooting

### Issue: Python not found
```powershell
# Check Python installation
where python
# Should show: C:\Python3X\python.exe or similar

# If not found, add to PATH:
$env:Path += ";C:\Python39"  # Adjust to your Python path
```

### Issue: TUI characters corrupted
```powershell
# Enable UTF-8 in Windows
chcp 65001

# For PowerShell, set encoding
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
```

### Issue: Permission denied errors
```powershell
# Run as Administrator
# Right-click terminal -> Run as Administrator
```

### Issue: Daemon won't stop
```powershell
# Find and kill Node processes
Get-Process node | Stop-Process -Force
```

## Automated CI Testing

For GitHub Actions or other CI:

```yaml
strategy:
  matrix:
    os: [windows-latest]
    node: [18, 20]
    python: ['3.8', '3.10', '3.12']

steps:
  - uses: actions/checkout@v3
  - uses: actions/setup-node@v3
    with:
      node-version: ${{ matrix.node }}
  - uses: actions/setup-python@v4
    with:
      python-version: ${{ matrix.python }}
  
  - run: npm ci
  - run: npm run build
  - run: npm test
  
  # Windows-specific tests
  - run: python --version  # Should work on Windows
  - run: node -e "console.log(process.platform === 'win32' ? 'Windows OK' : 'Not Windows')"
```

## Validation Checklist

- [ ] Python embedding service starts with `python` command
- [ ] Daemon singleton enforcement works (can't start two daemons)
- [ ] Ctrl+C shuts down daemon gracefully
- [ ] TUI runs without flickering in Windows Terminal
- [ ] TUI runs without flickering in PowerShell
- [ ] TUI runs without flickering in Command Prompt
- [ ] Box drawing characters render correctly
- [ ] Paths with spaces are handled correctly
- [ ] Paths with backslashes work properly
- [ ] Different drive letters work (C:\, D:\, etc.)
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Performance is acceptable (< 100ms UI response)

## Reporting Issues

If you encounter Windows-specific issues:

1. **Terminal Info:**
   - Terminal type (Windows Terminal, PowerShell, etc.)
   - Windows version: `winver`
   - Node version: `node --version`
   - Python version: `python --version`

2. **Screenshots:**
   - Capture any visual glitches
   - Include terminal output

3. **Logs:**
   ```powershell
   # Enable debug logging
   $env:DEBUG="*"
   npm run tui 2> debug.log
   ```

4. **Steps to Reproduce:**
   - Exact commands run
   - Folder paths used
   - Terminal settings

## Success Criteria

The Windows compatibility fixes are successful when:

1. **No Python3 errors** - Python embedding service starts correctly
2. **Daemon singleton works** - Only one daemon can run at a time
3. **Clean shutdown** - No signal errors on Ctrl+C
4. **No TUI flickering** - Smooth rendering in all terminals
5. **Path handling works** - All Windows path formats handled correctly
6. **Tests pass** - All automated tests succeed on Windows
7. **Performance parity** - Similar performance to Unix systems

This comprehensive testing ensures folder-mcp works seamlessly on Windows with the same reliability as Unix/macOS systems.