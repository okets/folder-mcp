# Phase 11 Windows Test Procedure

**Purpose**: Comprehensive test procedure for all Phase 11 TUI features on Windows
**Target**: Claude Code agent on Windows machine
**Date Created**: 2025-12-25

---

## Overview

This document provides a systematic test procedure for verifying all Phase 11 features work correctly on Windows. The tests cover:

| Sprint | Feature | Key Components |
|--------|---------|----------------|
| Sprint 1 | Navigation Framework | 4-panel navigation, responsive layouts |
| Sprint 2 | Settings Screen | Theme selector, Log Verbosity |
| Sprint 3 | Default Model System | Model picker, First Run Wizard |
| Sprint 4 | Activity Log | Real-time events, progress bars |
| Sprint 5 | Connect Screen | 9 MCP clients, auto-configure |

---

## Test Environment Setup

### Prerequisites

1. **Start the daemon in background**:
   ```powershell
   npm run daemon:restart
   ```

2. **Verify daemon is running**:
   ```powershell
   # Check daemon logs (Windows path)
   Get-Content "$env:USERPROFILE\.folder-mcp\logs\daemon.log" -Tail 20
   ```

3. **Prepare test folders** (create if they don't exist):
   ```powershell
   mkdir C:\ThinkingHomes\folder-mcp\tmp\test-docs -Force
   # Add some test .md or .txt files to this folder for indexing tests
   ```

4. **Build the TUI**:
   ```powershell
   npm run build
   ```

---

## Test Execution Instructions

### CRITICAL: Human-Agent Collaboration Required

**You (Claude Code on Windows) CANNOT run `npm run tui` directly** because the terminal is non-interactive.

**Workflow**:
1. Ask the human to run TUI commands
2. Request specific observations about what they see
3. Document results based on human feedback
4. Ask human to perform keyboard actions and report results

### Communication Pattern

```
Agent: "Please run `npm run tui` and tell me:
        1. How many items in the navigation panel?
        2. What are their names?
        3. Which one is currently highlighted?"
```

---

## TEST 1: Navigation Framework (Sprint 1)

### 1.1 Navigation Panel Items

**Ask human to run**: `npm run tui`

**Verify**:
- [ ] Navigation panel shows exactly 4 items
- [ ] Items are: "Manage Folders", "Connect", "Activity Log", "Settings"
- [ ] First item (Manage Folders) is highlighted on startup
- [ ] Icons visible: `◈`, `◇`, `◆`, `○`

**Expected Layout (Landscape - wide terminal)**:
```
╭── Navigation ──╮  ╭── Manage Folders ─────────────────────╮
│ ▶ Manage Fol.. │  │                                       │
│ ◇ Connect      │  │ [Content panel]                       │
│ ◆ Activity Log │  │                                       │
│ ○ Settings     │  │                                       │
╰────────────────╯  ╰───────────────────────────────────────╯
```

**Expected Layout (Portrait - narrow terminal)**:
```
╭── Navigation ─────────────────────────────────╮
│ ▶ Manage Folders  ◇ Connect  ◆ Activity  ○ Set │
╰───────────────────────────────────────────────╯
╭── Manage Folders ─────────────────────────────╮
│                                               │
│ [Content panel]                               │
│                                               │
╰───────────────────────────────────────────────╯
```

### 1.2 Keyboard Navigation

**Ask human to test**:
1. Press `↓` (Down Arrow) - should move to "Connect"
2. Press `↓` again - should move to "Activity Log"
3. Press `↓` again - should move to "Settings"
4. Press `↓` again - should wrap to "Manage Folders"
5. Press `↑` (Up Arrow) - should move to "Settings"

**Verify**:
- [ ] Arrow keys navigate between items
- [ ] Selection wraps at boundaries (circular navigation)
- [ ] Selected item shows `▶` cursor icon
- [ ] Content panel changes when selection changes

### 1.3 Tab Focus Switching

**Ask human to test**:
1. Press `Tab` - focus should move to content panel
2. Press `Tab` again - focus should return to navigation

**Verify**:
- [ ] Tab switches focus between navigation and content panel
- [ ] Focused panel has highlighted border
- [ ] Non-focused panel shows `⁽ᵗᵃᵇ⁾` indicator in title

### 1.4 Responsive Layout

**Ask human to test**:
1. Resize terminal to wide (>100 columns) - should show landscape layout
2. Resize terminal to narrow (≤100 columns) - should show portrait layout

**Verify**:
- [ ] Layout transitions smoothly
- [ ] No visual glitches during resize
- [ ] All content remains visible
- [ ] Navigation switches between vertical (landscape) and horizontal (portrait)

---

## TEST 2: Settings Screen (Sprint 2)

### 2.1 Access Settings Panel

**Ask human to**:
1. Navigate to "Settings" in navigation panel (press `↓` 3 times from start)
2. Observe the Settings panel content

**Verify**:
- [ ] Settings panel shows "Settings" title
- [ ] Panel contains Theme selector
- [ ] Panel contains Log Verbosity selector
- [ ] Panel contains Default Model picker

### 2.2 Theme Selector

**Ask human to**:
1. Press `Tab` to focus Settings panel
2. Navigate to Theme item (should be first)
3. Press `Enter` or `→` to expand
4. Use arrow keys to browse themes
5. Press `Enter` to select a theme
6. Press `Escape` to collapse

**Available Themes**:
- default, light, minimal
- high-contrast, colorblind (accessibility)
- ocean, forest, sunset (nature)
- dracula, nord, monokai, solarized, gruvbox (classic editor)

**Verify**:
- [ ] Theme selector expands on Enter
- [ ] All 13 themes are listed
- [ ] Selecting a theme applies it IMMEDIATELY (live preview)
- [ ] No visual lag when switching themes
- [ ] Selected theme persists after collapse

### 2.3 Log Verbosity Selector

**Ask human to**:
1. Navigate to Log Verbosity item
2. Expand and change verbosity level

**Options**: Quiet, Normal, Verbose

**Verify**:
- [ ] Log Verbosity selector works
- [ ] Options display correctly
- [ ] Selection can be changed

### 2.4 Default Model Picker

**Ask human to**:
1. Navigate to Default Model item
2. Expand to see available models
3. Observe model information displayed

**Expected Model Info Columns**:
- Name (model display name)
- Match % (hardware + language compatibility)
- Speed (High/Medium/Low)
- Type (GPU/CPU)
- Size (e.g., 2.1GB)
- Local (✓ if downloaded)

**Verify**:
- [ ] Default Model picker shows rich UI
- [ ] Multiple models available
- [ ] Current selection reflects FMDM state
- [ ] Model info columns display correctly
- [ ] Changing model updates FMDM (daemon side)


---

## TEST 3: Activity Log Screen (Sprint 4)

### 3.1 Access Activity Log Panel

**Ask human to**:
1. Navigate to "Activity Log" in navigation panel
2. Observe the Activity Log panel content

**Verify**:
- [ ] Activity Log panel shows "Activity Log" title
- [ ] Panel displays real-time daemon events
- [ ] Events have icons, timestamps, and messages

### 3.2 Activity Event Display

**Expected Event Format**:
```
📁 14:32:05  Indexing ~/Documents              ⠋▓▓▓░░░░░ 47%
🔍 14:31:58  Search: "budget report" → 3 results     ✓
🔌 14:32:02  Claude Desktop connected                ✓
```

**Activity Icons**:
| Type | Emoji | Fallback |
|------|-------|----------|
| indexing | 📁 | ▣ |
| search | 🔍 | ◎ |
| connection | 🔌 | ↔ |
| model | 🧠 | ◈ |
| system | ⚙️ | ● |
| error | ❌ | ✗ |

**Verify**:
- [ ] Events show correct icons (emoji or symbol fallback)
- [ ] Timestamps display in HH:MM:SS format
- [ ] Messages are readable and truncate gracefully
- [ ] Progress bars show for in-progress events

### 3.3 Trigger Indexing Event

**Ask human to**:
1. Keep Activity Log panel visible
2. In another terminal, add a folder via WebSocket or use existing indexed folder
3. Watch for indexing events to appear

**Verify**:
- [ ] "Indexing started" event appears
- [ ] Progress updates show in real-time
- [ ] "Indexing complete" event appears when done
- [ ] Progress bar animates during indexing

### 3.4 Expand/Collapse Event Details

**Ask human to**:
1. Navigate to an event in the Activity Log
2. Press `Enter` to expand
3. Observe detail lines
4. Press `Escape` to collapse

**Verify**:
- [ ] Events expand to show detail lines
- [ ] Details use `├` and `└` connector characters
- [ ] Collapse works correctly
- [ ] Only one event expanded at a time

### 3.5 Navigation While Events Arriving

**Ask human to**:
1. Trigger ongoing activity (e.g., start indexing)
2. While events arrive, navigate up/down in the log

**Verify**:
- [ ] Navigation works smoothly during updates
- [ ] Selection stays on same item when new events arrive at top
- [ ] No visual glitches or flickering

---

## TEST 4: Connect Screen (Sprint 5)

### 4.1 Access Connect Panel

**Ask human to**:
1. Navigate to "Connect" in navigation panel
2. Observe the Connect panel content

**Verify**:
- [ ] Connect panel shows "Connect MCP Clients" title
- [ ] Panel has two sections: LOCAL CONNECTIONS and REMOTE ACCESS
- [ ] LOCAL CONNECTIONS shows 9 MCP client items
- [ ] REMOTE ACCESS shows Phase 12 placeholder

### 4.2 MCP Client List

**Expected Clients** (9 total):
1. Claude Desktop
2. Claude Code
3. Cursor
4. Windsurf
5. Codex CLI
6. Cline
7. Qwen Code
8. GitHub Copilot CLI
9. VS Code (Copilot)

**Verify**:
- [ ] All 9 clients listed
- [ ] Each shows correct name
- [ ] Navigation works through all items
- [ ] Section headers (LOCAL CONNECTIONS, REMOTE ACCESS) are non-navigable

### 4.3 Expand Client Item

**Ask human to**:
1. Select a client (e.g., Claude Desktop)
2. Press `Enter` to expand

**Expected Expanded View**:
```
▶ Claude Desktop ✓
  Path: C:\Users\{user}\AppData\Roaming\Claude\claude_desktop_config.json
  ╭─────────╮ ╭─────────────╮
  │ Remove  │ │ Show Config │
  ╰─────────╯ ╰─────────────╯
```

**Verify**:
- [ ] Expanded item shows config file path
- [ ] Path uses Windows format (backslashes: `C:\Users\...`)
- [ ] Two buttons visible: Connect/Remove + Show Config
- [ ] VS Code shows only "Show Config" (no Connect button)
- [ ] Left/Right arrows navigate between buttons

### 4.4 Windows Path Verification

**Verify correct Windows paths for each client**:
- [ ] Claude Desktop: `%APPDATA%\Claude\claude_desktop_config.json`
- [ ] Claude Code: `%USERPROFILE%\.claude.json`
- [ ] Cursor: `%USERPROFILE%\.cursor\mcp.json`
- [ ] Windsurf: `%USERPROFILE%\.codeium\windsurf\mcp_config.json`
- [ ] Codex CLI: `%USERPROFILE%\.codex\config.toml`
- [ ] Cline: `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`
- [ ] Qwen Code: `%USERPROFILE%\.qwen\settings.json`
- [ ] GitHub Copilot CLI: `%USERPROFILE%\.copilot\mcp-config.json`
- [ ] VS Code: `.vscode\mcp.json` (project-level)


### 4.5 Show Config Popup

**Ask human to**:
1. Expand a client item
2. Navigate to "Show Config" button
3. Press `Enter` to open popup

**Expected Popup Layout**:
```
Claude Desktop Config
────────────────────────────────────────────────────────────────
Config file: C:\Users\{user}\AppData\Roaming\Claude\claude_desktop_config.json
[C] Copy  [Esc] Close
────────────────────────────────────────────────────────────────

{
  "mcpServers": {
    "folder-mcp": {
      "command": "folder-mcp",
      "args": ["mcp", "server"]
    }
  }
}

────────────────────────────────────────────────────────────────
```

**Verify**:
- [ ] Popup covers entire panel (no side borders - clean copy)
- [ ] Shows config file path (Windows format)
- [ ] JSON content is syntax-highlighted
- [ ] [C] Copy shortcut visible
- [ ] [Esc] Close shortcut visible
- [ ] Pressing `Escape` closes popup

### 4.6 Clipboard Copy (Windows)

**Ask human to**:
1. Open Show Config popup for any client
2. Press `C` to copy to clipboard
3. Open Notepad and paste (Ctrl+V)

**Verify**:
- [ ] "Copied to clipboard!" message appears
- [ ] Popup auto-closes after copy
- [ ] Pasted JSON is clean (no border artifacts)
- [ ] JSON is valid and parseable

### 4.7 Connect/Remove Toggle

**Ask human to**:
1. Expand a client that is NOT configured (shows "Connect" button)
2. Press Connect button
3. Observe button changes to "Remove"
4. Check if client's config file was modified

**Verify**:
- [ ] Connect button auto-configures the client
- [ ] Button changes from "Connect" to "Remove"
- [ ] Success notification appears
- [ ] Config file contains folder-mcp entry
- [ ] Remove button removes the entry

### 4.8 VS Code Special Case

**Ask human to**:
1. Navigate to "VS Code (Copilot)" item
2. Expand it

**Verify**:
- [ ] Only "Show Config" button visible (no Connect/Remove)
- [ ] Path shows `.vscode\mcp.json` (project-level)
- [ ] Popup shows instructions about per-project config

---

## TEST 5: First Run Wizard (Sprint 3)

### 5.1 Trigger First Run Wizard

**To test**: Delete config file and restart TUI
```powershell
Remove-Item "$env:USERPROFILE\.folder-mcp\config.yaml" -Force -ErrorAction SilentlyContinue
npm run tui
```

**Verify**:
- [ ] First Run Wizard appears on fresh start
- [ ] Welcome screen displays
- [ ] Default Model picker step appears
- [ ] User can select a model
- [ ] Add Folder step follows

### 5.2 Default Model Picker in Wizard

**Ask human to**:
1. Observe model picker in First Run Wizard
2. Select a model
3. Proceed to next step

**Verify**:
- [ ] Model picker shows same UI as Settings
- [ ] Model info columns display correctly
- [ ] Selection persists to daemon via FMDM
- [ ] Next step uses selected model

### 5.3 Simplified Add Folder Wizard

**Ask human to**:
1. Reach Add Folder step in wizard
2. Observe available options

**Verify**:
- [ ] NO "Choose configuration mode" step
- [ ] NO "Select Document Languages" step
- [ ] File picker for folder selection works
- [ ] Optional "Use specific model" marked as experimental
- [ ] Wizard completes successfully

---

## TEST 6: Windows-Specific Concerns

### 6.1 Path Separator Handling

**Verify throughout all tests**:
- [ ] All displayed paths use backslashes (`\`) not forward slashes (`/`)
- [ ] Config file paths expand correctly (`%APPDATA%` → `C:\Users\...`)
- [ ] No path comparison bugs (duplicate folder issue fixed)

### 6.2 Terminal Rendering

**Ask human to verify in Windows Terminal / PowerShell**:
- [ ] Box-drawing characters render correctly (╭╮╰╯│─)
- [ ] Emoji icons display (📁🔍🔌🧠⚙️) or fall back to symbols
- [ ] Colors display correctly (depends on terminal color support)
- [ ] No flickering during updates

### 6.3 Unicode Support

**Verify**:
- [ ] Progress bar characters render: `⠋▓░`
- [ ] Status icons render: `✓✗⚠ℹ`
- [ ] Arrow indicators render: `▶●○◇◆◈`
- [ ] Tab indicator renders: `⁽ᵗᵃᵇ⁾`

### 6.4 Long Path Handling

**Ask human to**:
1. Test with a deeply nested folder path
2. Observe how paths truncate in narrow views

**Verify**:
- [ ] Long paths truncate with `...` in middle
- [ ] No layout breakage with long paths
- [ ] Full path visible in expanded views or popups

---

## TEST 7: Integration Tests

### 7.1 Full Workflow: Add Folder → Activity Log → Search

1. Start TUI fresh
2. Add a folder with test documents
3. Watch Activity Log for indexing events
4. After indexing completes, connect an MCP client
5. Perform a search via MCP client
6. Verify search event appears in Activity Log

**Verify**:
- [ ] End-to-end workflow completes
- [ ] All events logged correctly
- [ ] No crashes or hangs

### 7.2 Theme Persistence

1. Change theme in Settings
2. Exit TUI (Ctrl+C)
3. Restart TUI
4. Verify theme persisted

**Verify**:
- [ ] Theme persists across TUI restarts
- [ ] Stored in daemon config, not TUI

### 7.3 Model Switch During Indexing

1. Start indexing a folder
2. While indexing, change Default Model in Settings
3. Verify behavior

**Expected**: Current indexing continues with original model. New model used for future indexing.

**Verify**:
- [ ] No crash when changing model during indexing
- [ ] Behavior is predictable

---

## Results Template

Copy and fill this template with test results:

```
## Phase 11 Windows Test Results
Date: YYYY-MM-DD
Tester: [Name]
Windows Version: [e.g., Windows 11 23H2]
Terminal: [e.g., Windows Terminal, PowerShell]

### TEST 1: Navigation Framework
- [ ] 1.1 Navigation Panel Items: PASS/FAIL
- [ ] 1.2 Keyboard Navigation: PASS/FAIL
- [ ] 1.3 Tab Focus Switching: PASS/FAIL
- [ ] 1.4 Responsive Layout: PASS/FAIL

### TEST 2: Settings Screen
- [ ] 2.1 Access Settings Panel: PASS/FAIL
- [ ] 2.2 Theme Selector: PASS/FAIL
- [ ] 2.3 Log Verbosity Selector: PASS/FAIL
- [ ] 2.4 Default Model Picker: PASS/FAIL

### TEST 3: Activity Log Screen
- [ ] 3.1 Access Activity Log Panel: PASS/FAIL
- [ ] 3.2 Activity Event Display: PASS/FAIL
- [ ] 3.3 Trigger Indexing Event: PASS/FAIL
- [ ] 3.4 Expand/Collapse Details: PASS/FAIL
- [ ] 3.5 Navigation During Events: PASS/FAIL

### TEST 4: Connect Screen
- [ ] 4.1 Access Connect Panel: PASS/FAIL
- [ ] 4.2 MCP Client List: PASS/FAIL
- [ ] 4.3 Expand Client Item: PASS/FAIL
- [ ] 4.4 Windows Path Verification: PASS/FAIL
- [ ] 4.5 Show Config Popup: PASS/FAIL
- [ ] 4.6 Clipboard Copy: PASS/FAIL
- [ ] 4.7 Connect/Remove Toggle: PASS/FAIL
- [ ] 4.8 VS Code Special Case: PASS/FAIL

### TEST 5: First Run Wizard
- [ ] 5.1 Trigger First Run: PASS/FAIL
- [ ] 5.2 Model Picker: PASS/FAIL
- [ ] 5.3 Add Folder Wizard: PASS/FAIL

### TEST 6: Windows-Specific
- [ ] 6.1 Path Separators: PASS/FAIL
- [ ] 6.2 Terminal Rendering: PASS/FAIL
- [ ] 6.3 Unicode Support: PASS/FAIL
- [ ] 6.4 Long Path Handling: PASS/FAIL

### TEST 7: Integration
- [ ] 7.1 Full Workflow: PASS/FAIL
- [ ] 7.2 Theme Persistence: PASS/FAIL
- [ ] 7.3 Model Switch: PASS/FAIL

### Issues Found:
1. [Issue description, steps to reproduce]
2. ...

### Notes:
[Any additional observations]
```

---

## Troubleshooting

### TUI Won't Start
```powershell
# Check for build errors
npm run build

# Check daemon is running
Get-Process -Name "node" | Where-Object { $_.CommandLine -like "*daemon*" }

# Restart daemon
npm run daemon:restart
```

### No Activity Events Appearing
```powershell
# Check WebSocket connection in daemon logs
Get-Content "$env:USERPROFILE\.folder-mcp\logs\daemon.log" -Tail 50 | Select-String "WebSocket"
```

### Clipboard Not Working
```powershell
# Test Windows clipboard manually
echo "test" | clip
# Paste in Notepad to verify
```

### Theme Not Applying
- Ensure daemon is running (theme stored in daemon config)
- Check for JavaScript errors in terminal output

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-25 | Initial Windows test procedure created | Claude |


---

## TEST 8: MCP Server Error Handling (Daemon Not Running)

### 8.1 MCP Server Without Daemon

**Purpose**: Verify MCP server provides helpful error when daemon isn't running

**Setup**:
```powershell
# Stop the daemon
Get-Process -Name "node" | Where-Object { $_.CommandLine -like "*daemon*" } | Stop-Process -Force

# Verify daemon is stopped
Get-Process -Name "node" | Where-Object { $_.CommandLine -like "*daemon*" }
# Should return nothing
```

**Test**:
```powershell
# Try to start MCP server directly
npx folder-mcp mcp server
```

**Expected Behavior**:
- MCP server should detect daemon is not running
- Should output a clear error message (NOT a cryptic crash)
- Error message should suggest starting the daemon first

**Verify**:
- [ ] MCP server does NOT crash with unhandled exception
- [ ] Error message is user-friendly
- [ ] Error message mentions daemon not running
- [ ] Error suggests how to start daemon (e.g., `npm run daemon:restart` or `folder-mcp --daemon`)

### 8.2 MCP Client Connection Without Daemon

**Purpose**: Verify MCP clients get meaningful error when connecting without daemon

**Setup**: Keep daemon stopped from 8.1

**Test**: Configure an MCP client (e.g., Claude Code) and try to use folder-mcp tools

**Expected Behavior**:
- Connection attempt should fail gracefully
- MCP client should show connection error (not hang indefinitely)

**Verify**:
- [ ] MCP client shows connection error
- [ ] No infinite hang or timeout
- [ ] Error is understandable to user

### 8.3 Recovery After Starting Daemon

**Purpose**: Verify system recovers when daemon is started

**Test**:
```powershell
# Start daemon
npm run daemon:restart

# Wait for startup (5 seconds)
Start-Sleep -Seconds 5

# Try MCP server again
npx folder-mcp mcp server
```

**Verify**:
- [ ] MCP server starts successfully after daemon is running
- [ ] WebSocket connection established
- [ ] MCP tools become available

---

## TEST 9: All Connector Buttons (Windows)

### Purpose
Test that ALL 8 Connect/Remove buttons work correctly on Windows. VS Code only has Show Config (no Connect button).

### Pre-requisites
1. Daemon is running
2. TUI is launched
3. Navigate to Connect panel

### 9.1 Claude Desktop Connector

**Config Path**: `%APPDATA%\Claude\claude_desktop_config.json`

**Test Steps**:
1. Navigate to "Claude Desktop" in Connect panel
2. Expand item (Enter)
3. Note initial button state (Connect or Remove)
4. If "Connect" shown:
   - Press Enter on Connect button
   - Verify success notification
   - Verify button changes to "Remove"
   - Check config file exists and contains folder-mcp entry
5. If "Remove" shown:
   - Press Enter on Remove button
   - Verify success notification
   - Verify button changes to "Connect"
   - Check config file no longer has folder-mcp entry
6. Toggle back to verify both directions work

**Verify**:
- [ ] Connect creates config file if not exists
- [ ] Connect merges into existing config (doesn't overwrite other servers)
- [ ] Remove cleanly removes folder-mcp entry
- [ ] Remove preserves other servers in config
- [ ] JSON format is valid after both operations
- [ ] Uses `npx` command format for GUI app PATH compatibility

**Check Config File**:
```powershell
Get-Content "$env:APPDATA\Claude\claude_desktop_config.json" | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

### 9.2 Claude Code Connector

**Config Path**: `%USERPROFILE%\.claude.json`

**Test Steps**: Same as 9.1

**Additional Verification**:
- [ ] Config includes `"type": "stdio"` field
- [ ] Both user scope (`~/.claude.json`) and project scope (`.mcp.json`) mentioned in Show Config

**Check Config File**:
```powershell
Get-Content "$env:USERPROFILE\.claude.json" | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

### 9.3 Cursor Connector

**Config Path**: `%USERPROFILE%\.cursor\mcp.json`

**Test Steps**: Same as 9.1

**Verify**:
- [ ] Creates `.cursor` directory if not exists
- [ ] Config format matches Cursor requirements

**Check Config File**:
```powershell
Get-Content "$env:USERPROFILE\.cursor\mcp.json" | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

### 9.4 Windsurf Connector

**Config Path**: `%USERPROFILE%\.codeium\windsurf\mcp_config.json`

**Test Steps**: Same as 9.1

**Verify**:
- [ ] Creates `.codeium\windsurf` directory structure if not exists
- [ ] Config format matches Windsurf requirements

**Check Config File**:
```powershell
Get-Content "$env:USERPROFILE\.codeium\windsurf\mcp_config.json" | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

### 9.5 Codex CLI Connector

**Config Path**: `%USERPROFILE%\.codex\config.toml`

**Test Steps**: Same as 9.1

**IMPORTANT**: Codex uses TOML format, not JSON!

**Verify**:
- [ ] Creates `.codex` directory if not exists
- [ ] Config is valid TOML (not JSON)
- [ ] `[mcp_servers.folder-mcp]` section added correctly
- [ ] Existing TOML content preserved

**Check Config File**:
```powershell
Get-Content "$env:USERPROFILE\.codex\config.toml"
```

**Expected TOML Content**:
```toml
[mcp_servers.folder-mcp]
command = "folder-mcp"
args = ["mcp", "server"]
```

### 9.6 Cline Connector

**Config Path**: `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`

**Test Steps**: Same as 9.1

**Verify**:
- [ ] Creates deep directory structure if not exists
- [ ] Path uses correct VS Code globalStorage location
- [ ] Config format matches Cline extension requirements

**Check Config File**:
```powershell
$path = "$env:APPDATA\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json"
Get-Content $path | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

### 9.7 Qwen Code Connector

**Config Path**: `%USERPROFILE%\.qwen\settings.json`

**Test Steps**: Same as 9.1

**Verify**:
- [ ] Creates `.qwen` directory if not exists
- [ ] Config format matches Qwen Code requirements

**Check Config File**:
```powershell
Get-Content "$env:USERPROFILE\.qwen\settings.json" | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

### 9.8 GitHub Copilot CLI Connector

**Config Path**: `%USERPROFILE%\.copilot\mcp-config.json`

**Test Steps**: Same as 9.1

**IMPORTANT**: GitHub Copilot CLI requires `tools: ["*"]` in config!

**Verify**:
- [ ] Creates `.copilot` directory if not exists
- [ ] Config includes `tools: ["*"]` array (Zod validation requirement)
- [ ] Config format matches GitHub Copilot CLI requirements

**Check Config File**:
```powershell
Get-Content "$env:USERPROFILE\.copilot\mcp-config.json" | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

**Expected JSON Content**:
```json
{
  "mcpServers": {
    "folder-mcp": {
      "command": "folder-mcp",
      "args": ["mcp", "server"],
      "tools": ["*"]
    }
  }
}
```

### 9.9 VS Code (Copilot) - Show Config Only

**Config Path**: `.vscode\mcp.json` (project-level)

**Note**: VS Code does NOT have Connect/Remove buttons because config is per-project.

**Test Steps**:
1. Navigate to "VS Code (Copilot)" in Connect panel
2. Expand item (Enter)
3. Verify ONLY "Show Config" button visible
4. Press Enter on Show Config
5. Verify popup displays correct config format

**Verify**:
- [ ] NO Connect button (only Show Config)
- [ ] NO Remove button
- [ ] Show Config popup explains per-project config
- [ ] Config uses `"servers"` key (not `"mcpServers"`)
- [ ] Popup shows `.vscode\mcp.json` path

**Expected VS Code Config Format**:
```json
{
  "servers": {
    "folder-mcp": {
      "command": "folder-mcp",
      "args": ["mcp", "server"]
    }
  }
}
```

---

## TEST 9 Summary Checklist

| Client | Connect | Remove | Show Config | Format | Special |
|--------|---------|--------|-------------|--------|---------|
| Claude Desktop | [ ] | [ ] | [ ] | JSON | npx for PATH |
| Claude Code | [ ] | [ ] | [ ] | JSON | type: stdio |
| Cursor | [ ] | [ ] | [ ] | JSON | - |
| Windsurf | [ ] | [ ] | [ ] | JSON | Deep path |
| Codex CLI | [ ] | [ ] | [ ] | TOML | Not JSON! |
| Cline | [ ] | [ ] | [ ] | JSON | VS Code globalStorage |
| Qwen Code | [ ] | [ ] | [ ] | JSON | - |
| GitHub Copilot CLI | [ ] | [ ] | [ ] | JSON | tools: ["*"] |
| VS Code | N/A | N/A | [ ] | JSON | servers key, per-project |

---

## Updated Results Template

Add these to the Results Template:

```
### TEST 8: MCP Server Error Handling
- [ ] 8.1 MCP Server Without Daemon: PASS/FAIL
- [ ] 8.2 MCP Client Connection Without Daemon: PASS/FAIL
- [ ] 8.3 Recovery After Starting Daemon: PASS/FAIL

### TEST 9: All Connector Buttons
- [ ] 9.1 Claude Desktop: PASS/FAIL
- [ ] 9.2 Claude Code: PASS/FAIL
- [ ] 9.3 Cursor: PASS/FAIL
- [ ] 9.4 Windsurf: PASS/FAIL
- [ ] 9.5 Codex CLI (TOML): PASS/FAIL
- [ ] 9.6 Cline: PASS/FAIL
- [ ] 9.7 Qwen Code: PASS/FAIL
- [ ] 9.8 GitHub Copilot CLI: PASS/FAIL
- [ ] 9.9 VS Code (Show Config only): PASS/FAIL
```

---

| Date | Change | Author |
|------|--------|--------|
| 2025-12-25 | Added TEST 8: MCP Server Error Handling | Claude |
| 2025-12-25 | Added TEST 9: All Connector Buttons detailed testing | Claude |
