# Phase 11 Sprint 5: Connect Screen

**Phase**: 11 - Complete App Interface
**Sprint**: 5 - Connect Screen
**Status**: PLANNING
**Estimated Start Date**: TBD

## Related Documentation
- [Phase 11 Overview](../folder-mcp-roadmap-1.1.md#phase-11-complete-app-interface)
- [Sprint 4: Activity Log Screen](Phase-11-Sprint-4-Activity-Log-Screen.md) (Completed)
- [Sprint 2: Settings Screen](Phase-11-Sprint-2-Settings-Screen.md) (Pattern Reference)

---

## Sprint Overview

### Goal
Build the Connect Screen - the 3rd of 4 screens in our TUI application. This screen has **two sections**:

1. **Local Connections** - Help users connect AI tools running on the same machine
2. **Remote Access** - Placeholder for Phase 12 (Cloudflare tunnel, custom domain)

### User Value
- **One-click connect**: Auto-configure MCP client with a single button
- **Clean copy**: JSON copied without terminal border artifacts
- **Platform-aware**: Correct file paths for macOS, Windows, Linux
- **Tool-specific**: Configurations tailored to each MCP client

### Scope
- **In Scope**: Local connection setup for 6 MCP clients, auto-connect, clipboard copy, connection string popup
- **Out of Scope**: Remote access functionality (Phase 12)
- **Placeholder**: Remote Access section with "Coming in Phase 12" message

### Key Design Decisions

#### 1. Direct Config Editing
Based on [MCP Client Integration Research](MCP_FULL_RESEARCH.md), we chose **direct config file editing** over alternative methods (bundles, deep-links, CLI commands) because:
1. **We have local file access** - We're a local application, not a website
2. **Lowest friction for users** - One click, done
3. **VS Code exception** - Project-level config means we can't know which project directory, so Show Config only

#### 2. Deployment-Safe Command Format (CRITICAL)
**Problem**: Can't use hardcoded paths like `/Users/.../dist/mcp-server.js` - they won't work after deployment.

**Solution**: Use CLI command name, not file path:
```json
{
  "command": "folder-mcp",
  "args": ["mcp", "server"]
}
```

**Why this works**:
- `npm install -g folder-mcp` adds `folder-mcp` to user's PATH
- OS resolves `folder-mcp` to wherever npm installed it
- No hardcoded paths needed!

**Prerequisite**: Add `folder-mcp mcp server` CLI subcommand (Task A0).

#### 3. Toggle Button (Connect ↔ Remove)
When folder-mcp is already configured in a client:
- **Not configured**: Show "Connect" button
- **Already configured**: Show "Remove" button
- Always show "Show Config" button

---

## MCP Configuration Research

### Supported MCP Clients

| Client | Config File Location | Format | Connect Method |
|--------|---------------------|--------|----------------|
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) <br> `%APPDATA%\Claude\claude_desktop_config.json` (Windows) | JSON with `mcpServers` | ✅ Direct edit |
| Claude Code | `~/.claude.json` (user) or `.mcp.json` (project) | JSON with `mcpServers` | ✅ Direct edit + CLI |
| Cursor | `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project) | JSON with `mcpServers` | ✅ Direct edit |
| Windsurf | `~/.windsurf/mcp.json` (global) | JSON with `mcpServers` | ✅ Direct edit |
| Codex CLI | `~/.codex/config.json` (global) | JSON with `mcpServers` | ✅ Direct edit + CLI |
| VS Code (Copilot) | `.vscode/mcp.json` (project-level only) | JSON with `servers` | ⚠️ Show Config only |

**Note on VS Code**: Config is project-level (`.vscode/mcp.json`), so we can't auto-configure it - we don't know which project directory the user wants. Show Config popup only.

### Configuration Formats

#### Claude Desktop Format
```json
{
  "mcpServers": {
    "folder-mcp": {
      "command": "folder-mcp",
      "args": ["mcp", "server"]
    }
  }
}
```

**Config Path by Platform**:
| Platform | Path |
|----------|------|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

**Windows Expanded**: `C:\Users\{username}\AppData\Roaming\Claude\claude_desktop_config.json`

---

#### Claude Code Format
```json
{
  "mcpServers": {
    "folder-mcp": {
      "type": "stdio",
      "command": "folder-mcp",
      "args": ["mcp", "server"]
    }
  }
}
```

**Config Path by Platform**:
| Platform | User Scope | Project Scope |
|----------|------------|---------------|
| macOS | `~/.claude.json` | `.mcp.json` |
| Windows | `%USERPROFILE%\.claude.json` | `.mcp.json` |
| Linux | `~/.claude.json` | `.mcp.json` |

**Windows Expanded**: `C:\Users\{username}\.claude.json`

**CLI Alternative**:
```bash
claude mcp add folder-mcp -- folder-mcp mcp server
```

---

#### VSCode Format
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

**Config Path by Platform**:
| Platform | Project Config | Global Config |
|----------|----------------|---------------|
| macOS | `.vscode/mcp.json` | `~/Library/Application Support/Code/User/settings.json` |
| Windows | `.vscode/mcp.json` | `%APPDATA%\Code\User\settings.json` |
| Linux | `.vscode/mcp.json` | `~/.config/Code/User/settings.json` |

**Windows Expanded**: `C:\Users\{username}\AppData\Roaming\Code\User\settings.json`

---

#### Cursor Format
```json
{
  "mcpServers": {
    "folder-mcp": {
      "command": "folder-mcp",
      "args": ["mcp", "server"]
    }
  }
}
```

**Config Path by Platform**:
| Platform | Global Config | Project Config |
|----------|---------------|----------------|
| macOS | `~/.cursor/mcp.json` | `.cursor/mcp.json` |
| Windows | `%USERPROFILE%\.cursor\mcp.json` | `.cursor/mcp.json` |
| Linux | `~/.cursor/mcp.json` | `.cursor/mcp.json` |

**Windows Expanded**: `C:\Users\{username}\.cursor\mcp.json`

---

#### Windsurf Format
```json
{
  "mcpServers": {
    "folder-mcp": {
      "command": "folder-mcp",
      "args": ["mcp", "server"]
    }
  }
}
```

**Config Path by Platform**:
| Platform | Global Config |
|----------|---------------|
| macOS | `~/.windsurf/mcp.json` |
| Windows | `%USERPROFILE%\.windsurf\mcp.json` |
| Linux | `~/.windsurf/mcp.json` |

**Windows Expanded**: `C:\Users\{username}\.windsurf\mcp.json`

---

#### Codex CLI Format (OpenAI)
```json
{
  "mcpServers": {
    "folder-mcp": {
      "command": "folder-mcp",
      "args": ["mcp", "server"]
    }
  }
}
```

**Config Path by Platform**:
| Platform | Global Config |
|----------|---------------|
| macOS | `~/.codex/config.json` |
| Windows | `%USERPROFILE%\.codex\config.json` |
| Linux | `~/.codex/config.json` |

**Windows Expanded**: `C:\Users\{username}\.codex\config.json`

**CLI Alternative**:
```bash
codex mcp add folder-mcp -- folder-mcp mcp server
```

---

### Platform Detection Logic

```typescript
function getConfigPath(client: string): string {
  const platform = process.platform; // 'darwin' | 'win32' | 'linux'
  const home = process.env.HOME || process.env.USERPROFILE || '';

  // Platform-specific path builders
  const paths = {
    'claude-desktop': {
      darwin: `${home}/Library/Application Support/Claude/claude_desktop_config.json`,
      win32: `${process.env.APPDATA}\\Claude\\claude_desktop_config.json`,
      linux: `${home}/.config/Claude/claude_desktop_config.json`
    },
    'claude-code': {
      darwin: `${home}/.claude.json`,
      win32: `${home}\\.claude.json`,
      linux: `${home}/.claude.json`
    },
    'cursor': {
      darwin: `${home}/.cursor/mcp.json`,
      win32: `${home}\\.cursor\\mcp.json`,
      linux: `${home}/.cursor/mcp.json`
    },
    'windsurf': {
      darwin: `${home}/.windsurf/mcp.json`,
      win32: `${home}\\.windsurf\\mcp.json`,
      linux: `${home}/.windsurf/mcp.json`
    },
    'codex-cli': {
      darwin: `${home}/.codex/config.json`,
      win32: `${home}\\.codex\\config.json`,
      linux: `${home}/.codex/config.json`
    },
    'vscode': {
      darwin: '.vscode/mcp.json',  // Project-level only - cannot auto-configure
      win32: '.vscode/mcp.json',
      linux: '.vscode/mcp.json'
    }
  };

  return paths[client][platform];
}
```

### Windows-Specific Notes

- Use backslashes (`\`) in displayed paths for Windows users
- `%APPDATA%` = `C:\Users\{username}\AppData\Roaming`
- `%USERPROFILE%` = `C:\Users\{username}`
- JSON files may need to be created if they don't exist
- Windows Terminal / PowerShell handle clipboard via `clip` command

---

## User Stories

1. **As a Claude Desktop user**, I want to click "Connect" and have folder-mcp automatically configured in my Claude Desktop, so I can start using it immediately without manual editing.

2. **As a Claude Code user**, I want to click "Connect" for auto-configuration OR see the CLI command, so I can choose my preferred setup method.

3. **As a Cursor/Windsurf user**, I want one-click setup just like Claude Desktop users get.

4. **As a VS Code (Copilot) user**, I want to see the correct JSON format since I need to manually add it to my project's `.vscode/mcp.json`.

5. **As a Codex CLI user**, I want to see both JSON and CLI command options since OpenAI's tool works similarly to Claude Code.

6. **As a first-time user**, I want to see the exact file path where the configuration will be added, specific to my operating system.

7. **As a power user**, I want quick access to "Show Config" for all tools so I can review what's being configured or set up multiple tools efficiently.

---

## Design: Screen Layout

### Design Philosophy
- **Two sections**: Local Connections + Remote Access (placeholder)
- **6 MCP clients**: Claude Desktop, Claude Code, Cursor, Windsurf, Codex CLI, VS Code
- **Direct config editing**: Auto-configure by merging into client's config file
- **VS Code exception**: Project-level config, so Show Config only (can't know which project)
- **Expand to see actions** - 2 buttons using `SimpleButtonsRow` (Connect + Show Config)
- **No inline JSON** - Copying bordered text includes border artifacts
- **Full-screen popup** - For viewing connection string (no side borders)
- **Platform detection** - Show correct paths for current OS

### Why 2 Buttons Instead of Inline JSON?

**Problem**: Copying text from a bordered terminal panel includes the border characters:
```
│   │ {                                                   │
│   │   "mcpServers": {                                   │
```
This breaks the JSON when pasted.

**Solution**: Show 2 action buttons when expanded:
1. **Connect** - Auto-install config to the client's config file
2. **Show Config** - Full-screen popup with "Copy To Clipboard" button

---

### Landscape Layout (Wide Terminal)

```
╭── Navigation ──╮  ╭── Connect MCP Clients ──────────────────────────────────╮
│ ◇ Manage Fol.. │  │                                                         │
│ ▶ Connect      │  │  LOCAL CONNECTIONS                                      │
│ ◇ Activity Log │  │                                                         │
│ ○ Settings     │  │ ▶ Claude Desktop                                        │
│                │  │   Path: ~/Library/Application Support/Claude/...        │
│                │  │        ╭─────────╮ ╭─────────────╮                       │
│                │  │        │ Connect │ │ Show Config │                       │
│                │  │        ╰─────────╯ ╰─────────────╯                       │
│                │  │                                                         │
│                │  │ ◇ Claude Code                                           │
│                │  │ ◇ Cursor                                                │
│                │  │ ◇ Windsurf                                              │
│                │  │ ◇ Codex CLI                                             │
│                │  │ ◇ VS Code (Copilot)  ← Show Config only                 │
│                │  │                                                         │
│                │  │ ─────────────────────────────────────────────────────── │
│                │  │                                                         │
│                │  │  REMOTE ACCESS                                          │
│                │  │                                                         │
│                │  │ ○ Coming in Phase 12: Cloudflare tunnel, custom domain  │
│                │  │                                                         │
│ ↑↓ Navigate    │  │ ↑↓ Navigate   Enter Expand   ←→ Buttons   Esc Collapse  │
╰────────────────╯  ╰─────────────────────────────────────────────────────────╯
```

### Portrait Layout (Narrow Terminal)

```
╭── Navigation ───────────────────────────────╮
│ ◇ Manage Folders  ▶ Connect  ◇ Activity Log │
╰─────────────────────────────────────────────╯
╭── Connect MCP Clients ──────────────────────╮
│                                             │
│  LOCAL CONNECTIONS                          │
│                                             │
│ ▶ Claude Desktop                            │
│   Path: ~/Library/Application Suppo...      │
│   [Connect] [Show Config]                   │
│                                             │
│ ◇ Claude Code                               │
│ ◇ Cursor                                    │
│ ◇ Windsurf                                  │
│ ◇ Codex CLI                                 │
│ ◇ VS Code (Copilot)                         │
│                                             │
│ ─────────────────────────────────────────── │
│                                             │
│  REMOTE ACCESS                              │
│                                             │
│ ○ Coming in Phase 12                        │
│                                             │
│ ↑↓ Navigate   Enter Expand   Tab Nav        │
╰─────────────────────────────────────────────╯
```

---

### Collapsed vs Expanded States

**Collapsed Item:**
```
◇ Claude Desktop
```

**Expanded Item - NOT Configured:**
```
▶ Claude Desktop
  Path: ~/Library/Application Support/Claude/claude_desktop_config.json
  ╭─────────╮ ╭─────────────╮
  │ Connect │ │ Show Config │
  ╰─────────╯ ╰─────────────╯
```

**Expanded Item - ALREADY Configured (toggle to Remove):**
```
▶ Claude Desktop ✓
  Path: ~/Library/Application Support/Claude/claude_desktop_config.json
  ╭────────╮ ╭─────────────╮
  │ Remove │ │ Show Config │
  ╰────────╯ ╰─────────────╯
```

**Expanded Item (VS Code - Show Config only):**
```
▶ VS Code (Copilot)
  Path: .vscode/mcp.json (project-level)
  ╭─────────────╮
  │ Show Config │
  ╰─────────────╯
```

**Expanded Item (low-res/narrow mode):**
```
▶ Claude Desktop
  Path: ~/Library/Application Support/Claude/...
  [Connect] [Show Config]   or   [Remove] [Show Config]
```

---

### Full-Screen Connection String Popup

When user clicks "Show Config", display a **full-screen popup** with **no decorative borders** so text can be copied cleanly:

```
Claude Desktop Config
────────────────────────────────────────────────────────────────────────────────
Config file: ~/Library/Application Support/Claude/claude_desktop_config.json
[C] Copy  [Esc] Close
────────────────────────────────────────────────────────────────────────────────

{
  "mcpServers": {
    "folder-mcp": {
      "command": "folder-mcp",
      "args": ["mcp", "server"]
    }
  }
}


✓ Copied to clipboard!
────────────────────────────────────────────────────────────────────────────────
```

**Key features:**
- **Clean design** - No decorative borders (boxes, corners) - just simple horizontal divider lines
- **Shows config file path** - User knows where to add the config if doing manually
- **Keyboard shortcuts** - [C] Copy to clipboard, [Esc] to close
- **Syntax highlighted JSON** - Keys in accent color, strings in success color, brackets muted
- **Status feedback** - Shows "✓ Copied to clipboard!" on copy, auto-closes after brief delay
- **Full terminal width and height** - No wasted space
- **Easy to copy** - Clean JSON without border artifacts

---

## Component Mapping

### Existing Components to Use

| UI Element | Component | Notes |
|------------|-----------|-------|
| Panel container | `GenericListPanel` | Standard panel with navigation |
| MCP client item | `ContainerListItem` | Expandable container pattern |
| Config path line | `TextListItem` | Shows config file path |
| Action buttons | `SimpleButtonsRow` | Connect + Show Config (2 buttons, or 1 for VS Code) |
| Section header | `TextListItem` | "LOCAL CONNECTIONS" / "REMOTE ACCESS" |
| Remote placeholder | `TextListItem` | "Coming in Phase 12" message |

### New Component Needed

**`ConnectionStringPopup`** - Full-screen popup for displaying connection string

**Purpose**: Display JSON config in a format that can be copied without border artifacts

**Key Features**:
- Full terminal width (no side borders)
- Horizontal separator lines only (top/bottom)
- Title bar with client name + close hint
- Config file path
- JSON content (plain text, copyable)
- Tip line at bottom
- Closes on Escape

**Similar Pattern**: Could extend `DestructiveConfirmationWrapper` or create standalone

### Component Hierarchy

```
ConnectPanel
├── TextListItem ("LOCAL CONNECTIONS" header)
├── ConnectClientItem (Claude Desktop) ← ContainerListItem pattern
│   ├── TextListItem (config path)
│   └── SimpleButtonsRow (Connect + Show Config)
├── ConnectClientItem (Claude Code)
│   └── SimpleButtonsRow (Connect + Show Config)
├── ConnectClientItem (Cursor)
│   └── SimpleButtonsRow (Connect + Show Config)
├── ConnectClientItem (Windsurf)
│   └── SimpleButtonsRow (Connect + Show Config)
├── ConnectClientItem (Codex CLI)
│   └── SimpleButtonsRow (Connect + Show Config)
├── ConnectClientItem (VS Code / Copilot)
│   └── SimpleButtonsRow (Show Config only) ← No Connect button
├── TextListItem (separator line)
├── TextListItem ("REMOTE ACCESS" header)
└── TextListItem ("Coming in Phase 12...")

ConnectionStringPopup (overlay when "Show config" clicked)
├── Title bar with close hint
├── Config path text
├── JSON content (no side borders)
├── CLI command (for Claude Code / Codex CLI)
└── Copy To Clipboard button
```

---

## Implementation Plan

### Phase A: Data Layer

#### Task A0: CLI Subcommand for MCP Server (PREREQUISITE)
**Goal**: Add `folder-mcp mcp server` CLI subcommand so config files can use the command name instead of hardcoded paths.

**Files to Modify:**
- `src/interfaces/cli/folder-mcp.ts`

**Implementation:**
```typescript
// In folder-mcp.ts, add routing for 'mcp server'
if (args[0] === 'mcp' && args[1] === 'server') {
  // Import and run MCP server
  await import('../../mcp-server.js');
  return;
}
```

**Why This is Critical:**
- Config files will use `"command": "folder-mcp"` instead of `"command": "node"`
- No hardcoded paths like `/Users/.../dist/mcp-server.js`
- Works regardless of where npm installed the package

**Acceptance Criteria:**
- [ ] Running `folder-mcp mcp server` starts the MCP server (stdio mode)
- [ ] MCP clients can connect using `{ "command": "folder-mcp", "args": ["mcp", "server"] }`

---

#### Task A1: MCP Configuration Generator
**Goal**: Create utilities to generate, detect, and manage MCP configs for each client

**Files to Create:**
- `src/interfaces/tui-ink/utils/mcp-config-generator.ts`

**Implementation:**
```typescript
interface MCPClientConfig {
  id: string;
  name: string;
  icon: string;
  canAutoConnect: boolean;  // false for VS Code (project-level)
  getConfigPath(): string;  // Platform-aware
  generateConfig(): string; // JSON string (formatted)
  getCLICommand?(): string; // Optional CLI alternative (Claude Code, Codex CLI)
}

export function getMCPConfigs(): MCPClientConfig[];
export function detectPlatform(): 'macos' | 'windows' | 'linux';

// Detection and removal functions (for toggle button)
export async function isConfigured(clientId: string): Promise<boolean>;
export async function addToConfig(clientId: string): Promise<{ success: boolean; error?: string }>;
export async function removeFromConfig(clientId: string): Promise<{ success: boolean; error?: string }>;
```

**Supported Clients:**
| Client | Icon | Has CLI Alternative | Can Auto-Connect |
|--------|------|---------------------|------------------|
| Claude Desktop | 🤖 | No | ✅ Yes |
| Claude Code | 💻 | Yes (`claude mcp add ...`) | ✅ Yes |
| Cursor | ⚡ | No | ✅ Yes |
| Windsurf | 🌊 | No | ✅ Yes |
| Codex CLI | 🔮 | Yes (`codex mcp add ...`) | ✅ Yes |
| VS Code (Copilot) | 📝 | No | ❌ No (project-level) |

**Acceptance Criteria:**
- [ ] Platform detection works correctly
- [ ] Config paths are correct for each platform
- [ ] JSON configs use `folder-mcp mcp server` (no hardcoded paths)
- [ ] `isConfigured()` correctly detects if folder-mcp is in client config
- [ ] `addToConfig()` merges folder-mcp into existing config (doesn't overwrite)
- [ ] `removeFromConfig()` removes folder-mcp entry cleanly
- [ ] CLI commands are correct for Claude Code and Codex CLI

---

#### Task A2: Clipboard Utility
**Goal**: Create cross-platform clipboard copy functionality

**Files to Create:**
- `src/interfaces/tui-ink/utils/clipboard.ts`

**Implementation:**
```typescript
export async function copyToClipboard(text: string): Promise<{ success: boolean; error?: string }>;
```

**Platform Commands:**
- macOS: `pbcopy`
- Windows: `clip` (via PowerShell for proper encoding)
- Linux: `xclip -selection clipboard` or `xsel --clipboard`

**Acceptance Criteria:**
- [ ] Copy works on macOS
- [ ] Copy works on Windows
- [ ] Copy works on Linux (graceful error if xclip missing)
- [ ] Returns success/failure with error message

---

### Phase B: UI Components

#### Task B1: ConnectClientItem Component
**Goal**: Create expandable item for each MCP client using ContainerListItem pattern

**Files to Create:**
- `src/interfaces/tui-ink/components/core/ConnectClientItem.ts`

**Design:**
Uses `ContainerListItem` pattern with child items:
- Collapsed: Icon + client name
- Expanded: Config path text + 2-button SimpleButtonsRow (or 1-button for VS Code)

**Button Configuration (most clients):**
```typescript
const buttons: ButtonConfig[] = [
  { name: 'connect', text: 'Connect', borderColor: 'green', eventValue: 'connect' },
  { name: 'show', text: 'Show Config', borderColor: 'yellow', eventValue: 'show' }
];
```

**Button Configuration (VS Code only):**
```typescript
const buttons: ButtonConfig[] = [
  { name: 'show', text: 'Show Config', borderColor: 'yellow', eventValue: 'show' }
];
```

**Acceptance Criteria:**
- [ ] Displays collapsed state correctly
- [ ] Expands on Enter, collapses on Escape
- [ ] Shows config path as first line when expanded
- [ ] Shows 2-button row for most clients (Connect + Show Config)
- [ ] Shows 1-button row for VS Code (Show Config only)
- [ ] Left/right navigation between buttons works
- [ ] Button activation triggers appropriate action

---

#### Task B2: ConnectionStringPopup Component
**Goal**: Full-screen popup for viewing and copying connection string

**Files to Create:**
- `src/interfaces/tui-ink/components/ConnectionStringPopup.tsx`

**Design:**
```typescript
interface ConnectionStringPopupProps {
  clientId: McpClientId;   // Client identifier for lookup
  configJson: string;      // Formatted JSON to display
  width: number;           // Terminal width
  height: number;          // Terminal height
  onClose: () => void;     // Called on Escape or after copy
}
```

**Layout (simple, clean):**
- Title: `{clientName} Config`
- Horizontal divider
- Config file path line
- Keyboard shortcuts: `[C] Copy  [Esc] Close`
- Horizontal divider
- Syntax-highlighted JSON content
- Status message area (shows copy success/error)
- Bottom divider

**Keyboard Handling:**
- `C` or `Enter` - Copy to clipboard, show success, auto-close after 800ms
- `Escape` - Close immediately

**Acceptance Criteria:**
- [x] Covers entire panel (100% width/height)
- [x] No decorative borders - just simple horizontal divider lines
- [x] Shows client name in title
- [x] Shows config file path
- [x] Shows syntax-highlighted JSON
- [x] [C] or Enter copies to clipboard
- [x] Shows "✓ Copied to clipboard!" feedback
- [x] Auto-closes after successful copy
- [x] Escape closes popup
- [x] Resize-safe (uses refs for state preservation)

---

#### Task B3: Update ConnectPanel
**Goal**: Wire up ConnectPanel with full content

**Files to Modify:**
- `src/interfaces/tui-ink/components/ConnectPanel.tsx`

**Implementation:**
```
Items list:
1. TextListItem - "LOCAL CONNECTIONS" (non-navigable header)
2. ConnectClientItem - Claude Desktop
3. ConnectClientItem - Claude Code
4. ConnectClientItem - Cursor
5. ConnectClientItem - Windsurf
6. ConnectClientItem - Codex CLI
7. ConnectClientItem - VS Code (Copilot) ← Show Config only
8. TextListItem - separator line (non-navigable)
9. TextListItem - "REMOTE ACCESS" (non-navigable header)
10. TextListItem - "Coming in Phase 12..." (non-navigable)
```

**State Management:**
- Track which client is expanded (only one at a time)
- Track if popup is showing
- Track popup content (which client's config)

**Acceptance Criteria:**
- [ ] Shows 6 MCP clients in Local Connections section
- [ ] Shows Remote Access placeholder section
- [ ] Navigation skips non-navigable header items
- [ ] Only one client expanded at a time
- [ ] "Connect" auto-configures the client (5 of 6 clients)
- [ ] "Show Config" opens popup with JSON and copy button
- [ ] VS Code shows only "Show Config" (no Connect button)

---

### Phase C: Integration & Polish

#### Task C1: Button Actions
**Goal**: Implement the 2 button actions (Connect + Show Config)

**"Connect" action (5 of 6 clients):**
1. Read existing config file (create if doesn't exist)
2. Parse JSON, merge our server entry into `mcpServers` (or `servers` for VS Code format)
3. Write back to config file (preserve existing content)
4. Show success notification: "Connected! Restart {client} to use folder-mcp"
5. Handle errors gracefully (permission denied, invalid JSON, etc.)

**"Show Config" action (all 6 clients):**
1. Set popup state to show
2. Pass client config to popup (JSON + config path + CLI command if applicable)
3. Handle popup close (Escape)
4. Handle "Copy To Clipboard" button in popup

**Popup "Copy To Clipboard" action:**
1. Get JSON config for selected client
2. Call clipboard utility
3. Show success/error notification in popup

**Acceptance Criteria:**
- [ ] Connect reads/merges/writes config file correctly
- [ ] Connect handles missing file (creates new with proper structure)
- [ ] Connect handles existing config (merges without overwriting other servers)
- [ ] Connect handles invalid JSON (shows error, doesn't corrupt file)
- [ ] Connect handles permission denied (shows helpful error)
- [ ] Show Config opens popup with correct JSON content
- [ ] Popup shows CLI command for Claude Code and Codex CLI
- [ ] Popup Copy button shows "Copied!" or error message
- [ ] All notifications auto-dismiss

---

#### Task C2: Notification Integration
**Goal**: Show feedback for button actions

**Use existing `NotificationArea`** if available, or simple inline text feedback

**Notifications needed:**
- "Connected! Restart {client} to use folder-mcp" (success, 3s)
- "Connection failed: {reason}" (error, 3s)
- "Copied to clipboard!" (success, 2s)
- "Copy failed: {reason}" (error, 3s)

**Acceptance Criteria:**
- [ ] Notifications appear after button actions
- [ ] Auto-dismiss after timeout
- [ ] Don't block user interaction

---

### Phase D: Final Verification

#### Task D1: Cross-Platform Testing
**Goal**: Verify configs and clipboard work on all platforms

**Test Checklist:**
- [ ] macOS: paths correct, clipboard works
- [ ] Windows: paths correct, clipboard works
- [ ] Linux: paths correct, clipboard works (or graceful error)

---

#### Task D2: Visual Testing
**Goal**: Verify layout in different terminal sizes

**Test Checklist:**
- [ ] Landscape mode: buttons side-by-side with borders
- [ ] Portrait mode: buttons may use low-res `[]` format
- [ ] Popup displays correctly at various widths
- [ ] Scrolling works if content exceeds height
- [ ] Section headers display correctly

---

## Technical Decisions

### Q: Should we detect installed tools?
**A: No** - Out of scope for Sprint 5. All 4 clients shown regardless of installation status.

### Q: Should we detect daemon status?
**A: No** - Daemon status is Phase 12 (Remote Access) scope. Connect screen shows configs regardless of daemon state.

### Q: How do we handle clipboard in terminal?
**A: Shell commands** - Use platform-specific commands (`pbcopy`, `clip`, `xclip`) via child_process.

### Q: Should we auto-detect platform?
**A: Yes** - Use `process.platform` to show correct paths automatically.

### Q: Why not show JSON inline in the list?
**A: Border artifacts** - When users select and copy text from a bordered panel, they get:
```
│   │ {                                   │
│   │   "mcpServers": {                   │
```
This breaks the JSON. The popup approach with no side borders solves this.

### Q: What does "Connect" do?
**A: Auto-configures the MCP client** by:
1. Reading existing config file (creates if doesn't exist)
2. Parsing JSON and merging our server entry into `mcpServers`
3. Writing back to config file (preserving existing servers)
4. Showing success notification with restart hint

**Edge cases to handle:**
- File doesn't exist → Create with our config
- File exists but invalid JSON → Show error, don't overwrite
- File exists with other servers → Merge, don't replace
- Permission denied → Show helpful error message

---

## Files Summary

### New Files
- `src/interfaces/tui-ink/utils/mcp-config-generator.ts` - Config generation per client
- `src/interfaces/tui-ink/utils/clipboard.ts` - Cross-platform clipboard
- `src/interfaces/tui-ink/components/core/ConnectClientItem.ts` - Expandable MCP client item
- `src/interfaces/tui-ink/components/ConnectionStringPopup.tsx` - Full-screen config viewer

### Modified Files
- `src/interfaces/tui-ink/components/ConnectPanel.tsx` - Main panel with sections

---

## Success Criteria

### Sprint Complete When:
- [ ] Connect screen shows two sections: Local Connections + Remote Access
- [ ] 6 MCP clients displayed (Claude Desktop, Claude Code, Cursor, Windsurf, Codex CLI, VS Code)
- [ ] 5 clients show 2 buttons when expanded (Connect + Show Config)
- [ ] VS Code shows 1 button when expanded (Show Config only)
- [ ] "Connect" auto-configures client by merging into config file
- [ ] "Show Config" opens full-screen popup with no side borders
- [ ] Popup includes "Copy To Clipboard" button
- [ ] Popup shows CLI command for Claude Code and Codex CLI
- [ ] Platform-specific paths shown correctly (macOS/Windows/Linux)
- [ ] Remote Access section shows Phase 12 placeholder
- [ ] Navigation works (up/down, expand/collapse, left/right buttons, tab to nav)
- [ ] All existing TUI functionality still works

### Stretch Goals (If Time Permits):
- [ ] Detect if client is installed before showing
- [ ] Remember last expanded client
- [ ] Add success animation after Connect

---

## Research Sources

- [MCP Client Integration Research](MCP_FULL_RESEARCH.md) - Comprehensive survey of MCP clients and connection patterns
- [Claude Code MCP Documentation](https://code.claude.com/docs/en/mcp)
- [VSCode MCP Developer Guide](https://code.visualstudio.com/api/extension-guides/ai/mcp)
- [VSCode MCP Servers Guide](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)
- [Model Context Protocol - Connect Local Servers](https://modelcontextprotocol.io/docs/develop/connect-local-servers)
- [Claude Desktop MCP Setup](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop)
- [MCP Configuration in Claude Code (Blog)](https://scottspence.com/posts/configuring-mcp-tools-in-claude-code)

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-23 | Sprint 5 document created with research and design | Claude |
| 2025-12-23 | Updated based on MCP Research: 6 clients, direct config editing, VS Code exception | Claude |
| 2025-12-23 | Renamed "Config:" to "Path:" to avoid confusion with "Show Config" button | Claude |
| 2025-12-23 | Added Windsurf and Codex CLI configurations | Claude |
| 2025-12-23 | Added deployment-safe command format (`folder-mcp mcp server`) | Claude |
| 2025-12-23 | Added Task A0: CLI subcommand prerequisite | Claude |
| 2025-12-23 | Added toggle button (Connect ↔ Remove) based on configuration state | Claude |
| 2025-12-23 | Added `isConfigured()` and `removeFromConfig()` to Task A1 | Claude |
| 2025-12-23 | Simplified popup design: removed decorative borders, added config path, [C] Copy shortcut | Claude |
| 2025-12-23 | Fixed resize state loss with useRef for popup state and selectedIndex | Claude |
