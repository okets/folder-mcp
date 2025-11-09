# folder-mcp TUI Screen Layouts

**Design Document - Phase 11: Professional TUI Interface**

This document contains ASCII mockups for all screens in the folder-mcp TUI application.

---

## Navigation Architecture

### Layout Structure
- **Left Sidebar (20% width)**: Navigation panel with screen list
- **Main Content (80% width)**: Active screen content area
- **Tab key**: Switch focus between navigation panel and content panel

### Navigation Panel
- **Up/Down arrows** to navigate between screens
- **Enter** to activate selected screen
- Screen indicators show which is active

### Content Panel
- **Up/Down arrows** for list navigation
- **Enter** to select/activate items
- **Left/Right arrows** for expand/collapse or sub-navigation
- **Esc** to return focus to navigation panel

### Global Controls
- **Tab/Shift+Tab**: Switch between navigation and content panels
- **Ctrl+C** or **Esc** (when navigation focused): Exit application

---

## Portrait Mode Layouts (< 100 cols)

### Navigation Row Design

In portrait mode (narrow terminals), the navigation transforms from a vertical sidebar to a horizontal tab bar to maximize content space.

**Navigation Row (2 rows high)**:
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 📁 folder-mcp    WebSocket connected • 1 folder monitored    80w30h┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ▶ Folders  ○ Remote  ○ MCP Setup  ○ Logs  ○ Settings      (tab) ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Behavior**:
- **←/→ arrows**: Navigate between screens
- **Enter**: Activate selected screen and focus content below
- **Tab**: Switch focus between navigation row and content
- Active screen shown with ▶, inactive with ○
- Content panel appears below, using full width

---

## Portrait Mode: Screen Examples

### Portrait: Folders Screen

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 📁 folder-mcp    WebSocket connected • 1 folder monitored    80w30h┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ▶ Folders  ○ Remote  ○ MCP Setup  ○ Logs  ○ Settings      (tab) ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
┏━ Monitored Folders ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ▶ /Users/hanan/Projects/folder-mcp/docs [active]            ▲┃
┃   1.83 files indexed • indexing…                             ┃┃
┃                                                               ┃┃
┃   Model: cpu:xenova-multilingual-e5-small                    ┃┃
┃   Status: Indexing (12s elapsed)                             ┃┃
┃   Database: .folder-mcp/database.db (2.4 MB)                 ┃┃
┃                                                               ┃┃
┃ ○ /Users/hanan/Documents/Research [inactive]                ┃┃
┃                                                               ┃┃
┃   Status: Ready (last indexed 3 days ago)                    ┃┃
┃   Documents: 145 • Chunks: 1,247                             ┃┃
┃                                                               ┃┃
┃ ○ /Users/hanan/Projects/client-work [inactive]              ┃┃
┃                                                               ┃┃
┃   Status: Error - Permission denied                          ┃┃
┃                                                               ┃┃
┃                   ┏━━━━━━━━━━━━━━━━┓                         ┃┃
┃                   ┃ + Add A Folder ┃                         ┃┃
┃                   ┗━━━━━━━━━━━━━━━━┛                         ▼┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

  Nav: ←→: Select  Enter: Go  │  Content: ↑↓: Navigate  Enter: Expand
```

### Portrait: Settings Screen

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 📁 folder-mcp    WebSocket connected • 1 folder monitored    80w30h┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ○ Folders  ○ Remote  ○ MCP Setup  ○ Logs  ▶ Settings      (tab) ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
┏━ Application Settings ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                               ▲┃
┃ ▶ Theme & Appearance                                         ┃┃
┃                                                               ┃┃
┃   Current Theme: [default ▼]                                 ┃┃
┃   Options: default, dark-optimized, light-optimized, minimal ┃┃
┃   Shortcut: Ctrl+T to toggle themes                          ┃┃
┃                                                               ┃┃
┃ ○ Embedding Model                                            ┃┃
┃                                                               ┃┃
┃   Current: cpu:xenova-multilingual-e5-small                  ┃┃
┃   Provider: [Python (GPU) ▼]                                 ┃┃
┃   Model: [xenova-multilingual-e5-small ▼]                    ┃┃
┃                                                               ┃┃
┃ ○ Performance                                                ┃┃
┃                                                               ┃┃
┃   Batch Size: [32  ] Max Workers: [4  ] Cache: [10 GB]      ┃┃
┃                                                               ┃┃
┃ ○ Chunking Strategy                                          ┃┃
┃ ○ Storage                                                    ┃┃
┃ ○ Advanced                                                   ┃┃
┃                                                               ┃┃
┃                 ┏━━━━━━━━━━━━━━━┓                            ┃┃
┃                 ┃ Save Settings ┃                            ┃┃
┃                 ┗━━━━━━━━━━━━━━━┛                            ▼┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

  Nav: ←→: Select  │  Content: ↑↓: Navigate  Enter: Edit  Ctrl+T: Theme
```

### Portrait: Live Logs Screen

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 📁 folder-mcp    WebSocket connected • 1 folder monitored    80w30h┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ○ Folders  ○ Remote  ○ MCP Setup  ▶ Logs  ○ Settings      (tab) ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
┏━ System Logs ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ [All ▼] [All Sources ▼] [Clear] [✓]Auto                     ▲┃
┃━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┃
┃                                                               ┃┃
┃ ▶ 14:32:45 INFO [Indexing] Started indexing /Users/han…     ┃┃
┃                                                               ┃┃
┃   Folder: /Users/hanan/Projects/folder-mcp/docs              ┃┃
┃   Files: 83 discovered                                       ┃┃
┃   Model: cpu:xenova-multilingual-e5-small                    ┃┃
┃                                                               ┃┃
┃ ○ 14:32:46 DEBUG [Embeddings] Batch 1/8 (10 files)          ┃┃
┃ ○ 14:32:47 DEBUG [Database] Stored 247 chunks               ┃┃
┃                                                               ┃┃
┃ ▶ 14:32:50 WARN [FileSystem] Permission denied              ┃┃
┃                                                               ┃┃
┃   File: /Users/hanan/.ssh/id_rsa                             ┃┃
┃   Error: EACCES: permission denied                           ┃┃
┃                                                               ┃┃
┃ ○ 14:33:01 INFO [MCP] Client connected                      ┃┃
┃ ○ 14:33:15 ERROR [Daemon] WebSocket lost                    ┃┃
┃ ○ 14:33:20 INFO [Daemon] Reconnected                        ┃┃
┃ ○ 14:33:45 INFO [Indexing] Completed (1m 0s)                ▼┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

  Nav: ←→: Select  │  Content: ↑↓: Scroll  Enter: Expand  C: Clear
```

---

## Landscape Mode Layouts (≥ 100 cols)

### Navigation Sidebar Design

In landscape mode (wide terminals), navigation uses a vertical sidebar for easy scanning and maximum content width.

---

## Screen 1: Folders (Default Screen)

**Purpose**: Manage all monitored folders - add, remove, configure, and monitor indexing status.

**Layout**: Navigation sidebar (20%) + Folder list panel (80%).

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 📁 folder-mcp          WebSocket connected • 1 folder monitored         89w48h ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
┏━ Navigation ━━━━┓ ┏━ Monitored Folders ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                 ┃ ┃ ▶ /Users/hanan/Projects/folder-mcp/docs [active]        ▲┃
┃ ▶ Folders       ┃ ┃   1.83 files indexed • indexing…                         ┃┃
┃                 ┃ ┃                                                           ┃┃
┃ ○ Remote Access ┃ ┃   Model: cpu:xenova-multilingual-e5-small                ┃┃
┃                 ┃ ┃   Status: Indexing (12s elapsed)                          ┃┃
┃ ○ MCP Setup     ┃ ┃   Database: .folder-mcp/database.db (2.4 MB)              ┃┃
┃                 ┃ ┃   Last Updated: 2 minutes ago                             ┃┃
┃ ○ Live Logs     ┃ ┃                                                           ┃┃
┃                 ┃ ┃ ○ /Users/hanan/Documents/Research [inactive]             ┃┃
┃ ○ Settings      ┃ ┃                                                           ┃┃
┃                 ┃ ┃   Status: Ready (last indexed 3 days ago)                 ┃┃
┃                 ┃ ┃   Documents: 145 • Chunks: 1,247                          ┃┃
┃                 ┃ ┃   Database: .folder-mcp/database.db (15.7 MB)             ┃┃
┃                 ┃ ┃                                                           ┃┃
┃                 ┃ ┃ ○ /Users/hanan/Projects/client-work [inactive]           ┃┃
┃                 ┃ ┃                                                           ┃┃
┃                 ┃ ┃   Status: Error - Permission denied                       ┃┃
┃                 ┃ ┃   Last Attempt: 1 hour ago                                ┃┃
┃                 ┃ ┃                                                           ┃┃
┃                 ┃ ┃                                                           ┃┃
┃                 ┃ ┃                   ┏━━━━━━━━━━━━━━━━━━┓                    ┃┃
┃                 ┃ ┃                   ┃  + Add A Folder  ┃                    ┃┃
┃                 ┃ ┃                   ┗━━━━━━━━━━━━━━━━━━┛                    ┃┃
┃                 ┃ ┃                                                           ┃┃
┃                 ┃ ┃                                                           ┃┃
┃                 ┃ ┃                                                           ┃┃
┗━━━━━━━━━━━━━━━━━┛ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━▼┛

  Nav: ↑↓: Select   Enter: Go   │   Content: ↑↓: Navigate   Enter: Expand   Tab: Switch
```

**Key Features**:
- Expandable folder items showing detailed status
- Visual status indicators (▶ active, ○ inactive, ✗ error)
- Real-time indexing progress
- "Add A Folder" button for new folders
- Per-folder actions: configure, remove, force reindex

**Interactions**:
- **Enter** on folder: Expand/collapse details
- **Delete** key: Remove selected folder (with confirmation)
- **Space** key: Trigger re-indexing
- **Enter** on "Add A Folder": Opens file picker

---

## Screen 2: Remote Access

**Purpose**: Configure how folder-mcp is accessed - local ports, authentication, and cloud tunnels.

**Layout**: Navigation sidebar (20%) + Single content panel (80%) with expandable sections.

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 📁 folder-mcp          WebSocket connected • 1 folder monitored         89w48h ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
┏━ Navigation ━━━━┓ ┏━ Remote Access Configuration ━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                 ┃ ┃                                                           ▲┃
┃ ○ Folders       ┃ ┃ ▶ Local Server Configuration                             ┃┃
┃                 ┃ ┃                                                            ┃┃
┃ ▶ Remote Access ┃ ┃   WebSocket Server                                        ┃┃
┃                 ┃ ┃   Port: [3333          ]  Host: [localhost          ]     ┃┃
┃ ○ MCP Setup     ┃ ┃   Status: ✓ Running                                        ┃┃
┃                 ┃ ┃                                                            ┃┃
┃ ○ Live Logs     ┃ ┃   MCP Server Port                                          ┃┃
┃                 ┃ ┃   Port: [3334          ]  Status: ✓ Running               ┃┃
┃ ○ Settings      ┃ ┃                                                            ┃┃
┃                 ┃ ┃   Authentication                                           ┃┃
┃                 ┃ ┃   Type: [None ▼]  Options: None, API Key, OAuth           ┃┃
┃                 ┃ ┃                                                            ┃┃
┃                 ┃ ┃   CORS Settings                                            ┃┃
┃                 ┃ ┃   Allowed Origins: [*                              ]       ┃┃
┃                 ┃ ┃                                                            ┃┃
┃                 ┃ ┃ ○ Cloud Access (Cloudflare Tunnel)                        ┃┃
┃                 ┃ ┃                                                            ┃┃
┃                 ┃ ┃   Status: Disabled                                         ┃┃
┃                 ┃ ┃   Enable cloud access to make folder-mcp accessible from   ┃┃
┃                 ┃ ┃   anywhere via Cloudflare tunnel with custom domain.       ┃┃
┃                 ┃ ┃                                                            ┃┃
┃                 ┃ ┃            ┏━━━━━━━━━━━━━━━━━━━━━━━━━┓                    ┃┃
┃                 ┃ ┃            ┃  Enable Cloud Access    ┃                    ┃┃
┃                 ┃ ┃            ┗━━━━━━━━━━━━━━━━━━━━━━━━━┛                    ┃┃
┃                 ┃ ┃                                                            ┃┃
┃                 ┃ ┃   Once enabled: Custom domain, API keys, Access control    ▼┃
┗━━━━━━━━━━━━━━━━━┛ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

  Nav: ↑↓: Select   │   Content: ↑↓: Navigate   Enter: Edit/Expand   →: Expand   ←: Collapse
```

**Key Features**:
- Local server configuration (ports, authentication)
- Cloud tunnel setup for remote access (Phase 12)
- Real-time status indicators
- Expandable sections for different access types

**Interactions**:
- **Enter** on field: Edit value
- **Enter** on dropdown: Show options
- **Enter** on button: Enable/disable features

---

## Screen 3: MCP Setup

**Purpose**: Help users connect folder-mcp to MCP clients (Claude Desktop, VSCode, Cursor, etc.).

**Layout**: Navigation sidebar (20%) + Main content panel (80%) with client selector, configuration JSON, and setup instructions.

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 📁 folder-mcp          WebSocket connected • 1 folder monitored         89w48h ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
┏━ Navigation ━━━━┓ ┏━ MCP Client Setup (Claude Desktop) ━━━━━━━━━━━━━━━━━━━━━━┓
┃                 ┃ ┃ Select Client:                                           ▲┃
┃ ○ Folders       ┃ ┃ ▶ Claude Desktop    ○ Claude Code    ○ VSCode    ○ Cursor ┃
┃                 ┃ ┃                                                            ┃
┃ ○ Remote Access ┃ ┃ Config file location:                                     ┃
┃                 ┃ ┃ ~/Library/Application Support/Claude/claude_desktop_co... ┃
┃ ▶ MCP Setup     ┃ ┃                                                            ┃
┃                 ┃ ┃ ┏━ Configuration JSON ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ ┃
┃ ○ Live Logs     ┃ ┃ ┃ {                                                     ┃ ┃
┃                 ┃ ┃ ┃   "mcpServers": {                                     ┃ ┃
┃ ○ Settings      ┃ ┃ ┃     "folder-mcp": {                                   ┃ ┃
┃                 ┃ ┃ ┃       "command": "node",                              ┃ ┃
┃                 ┃ ┃ ┃       "args": [                                       ┃ ┃
┃                 ┃ ┃ ┃         "/path/to/folder-mcp/dist/mcp-server.js"     ┃ ┃
┃                 ┃ ┃ ┃       ],                                              ┃ ┃
┃                 ┃ ┃ ┃       "env": {                                        ┃ ┃
┃                 ┃ ┃ ┃         "FOLDER_MCP_PORT": "3334"                     ┃ ┃
┃                 ┃ ┃ ┃       }                                               ┃ ┃
┃                 ┃ ┃ ┃     }                                                 ┃ ┃
┃                 ┃ ┃ ┃   }                                                   ┃ ┃
┃                 ┃ ┃ ┃ }                                                     ┃ ┃
┃                 ┃ ┃ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ ┃
┃                 ┃ ┃                                                            ┃
┃                 ┃ ┃    ┏━━━━━━━━━━━━━━━━━┓  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━┓   ┃
┃                 ┃ ┃    ┃ Copy to Clipboard┃  ┃ Open Config File        ┃   ┃
┃                 ┃ ┃    ┗━━━━━━━━━━━━━━━━━┛  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛   ┃
┃                 ┃ ┃                                                            ▼┃
┗━━━━━━━━━━━━━━━━━┛ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                   ┏━ Setup Steps ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
                   ┃ 1. Copy configuration using button above                  ┃
                   ┃ 2. Open Claude Desktop config file                        ┃
                   ┃ 3. Add folder-mcp to "mcpServers" section                 ┃
                   ┃ 4. Restart Claude Desktop                                 ┃
                   ┃ 5. Test by asking Claude to search your folders           ┃
                   ┃                                                            ┃
                   ┃ 💡 Ensure folder-mcp daemon is running first              ┃
                   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

  Nav: ↑↓: Select   │   Content: Tab: Switch Client   Enter: Copy/Open   Esc: Back
```

**Key Features**:
- Client selection list (Claude Desktop, VSCode, Cursor, etc.)
- Dynamic configuration generation based on selected client
- Copy-to-clipboard functionality
- Direct file opening for config files
- Step-by-step setup instructions

**Interactions**:
- **Enter** on client: Generate config for that client
- **Enter** on "Copy to Clipboard": Copy JSON config
- **Enter** on "Open Config File": Launch default editor with config file

---

## Screen 4: Live Logs

**Purpose**: Real-time monitoring of all system events, indexing progress, and errors.

**Layout**: Navigation sidebar (20%) + Log panel (80%) with filtering controls and scrollable log entries.

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 📁 folder-mcp          WebSocket connected • 1 folder monitored         89w48h ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
┏━ Navigation ━━━━┓ ┏━ System Logs ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                 ┃ ┃ Filter: [All Levels ▼] [All Sources ▼] [Clear] [✓] Auto ▲┃
┃ ○ Folders       ┃ ┃━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┃
┃                 ┃ ┃                                                            ┃┃
┃ ○ Remote Access ┃ ┃ ▶ 14:32:45 INFO [Indexing] Started indexing /Users/han…   ┃┃
┃                 ┃ ┃                                                            ┃┃
┃ ○ MCP Setup     ┃ ┃   Folder: /Users/hanan/Projects/folder-mcp/docs           ┃┃
┃                 ┃ ┃   Files: 83 discovered                                     ┃┃
┃ ▶ Live Logs     ┃ ┃   Model: cpu:xenova-multilingual-e5-small                  ┃┃
┃                 ┃ ┃                                                            ┃┃
┃ ○ Settings      ┃ ┃ ○ 14:32:46 DEBUG [Embeddings] Batch 1/8 (10 files)        ┃┃
┃                 ┃ ┃ ○ 14:32:47 DEBUG [Database] Stored 247 chunks             ┃┃
┃                 ┃ ┃ ○ 14:32:48 DEBUG [Embeddings] Batch 2/8 (10 files)        ┃┃
┃                 ┃ ┃                                                            ┃┃
┃                 ┃ ┃ ▶ 14:32:50 WARN [FileSystem] Permission denied            ┃┃
┃                 ┃ ┃                                                            ┃┃
┃                 ┃ ┃   File: /Users/hanan/.ssh/id_rsa                           ┃┃
┃                 ┃ ┃   Error: EACCES: permission denied                         ┃┃
┃                 ┃ ┃   Action: Skipped file                                     ┃┃
┃                 ┃ ┃                                                            ┃┃
┃                 ┃ ┃ ○ 14:33:01 INFO [MCP] Client connected                    ┃┃
┃                 ┃ ┃ ○ 14:33:02 DEBUG [MCP] Tool: search_content               ┃┃
┃                 ┃ ┃ ○ 14:33:03 DEBUG [Search] Query returned 12 results       ┃┃
┃                 ┃ ┃                                                            ┃┃
┃                 ┃ ┃ ▶ 14:33:15 ERROR [Daemon] WebSocket connection lost       ┃┃
┃                 ┃ ┃                                                            ┃┃
┃                 ┃ ┃   Reason: Connection timeout                               ┃┃
┃                 ┃ ┃   Retry: Reconnecting in 5s (attempt 1/3)                 ┃┃
┃                 ┃ ┃                                                            ┃┃
┃                 ┃ ┃ ○ 14:33:20 INFO [Daemon] Reconnected successfully         ┃┃
┃                 ┃ ┃ ○ 14:33:45 INFO [Indexing] Completed (1m 0s)              ▼┃
┗━━━━━━━━━━━━━━━━━┛ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

  Nav: ↑↓: Select   │   Content: ↑↓: Scroll   Enter: Expand   Space: Pause   C: Clear
```

**Key Features**:
- Real-time log streaming from daemon
- Expandable log entries with full details
- Level filtering (DEBUG, INFO, WARN, ERROR)
- Source filtering (Indexing, MCP, FileSystem, etc.)
- Auto-scroll toggle
- Clear logs functionality
- Color-coded log levels

**Interactions**:
- **Enter** on log: Expand/collapse details
- **Space**: Pause/resume auto-scroll
- **C**: Clear all logs
- **Filter dropdowns**: Show/hide specific log levels or sources

---

## Screen 5: Settings

**Purpose**: Global application settings - models, performance, storage, and advanced options.

**Layout**: Navigation sidebar (20%) + Settings panel (80%) with expandable categories.

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 📁 folder-mcp          WebSocket connected • 1 folder monitored         89w48h ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
┏━ Navigation ━━━━┓ ┏━ Application Settings ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                 ┃ ┃                                                           ▲┃
┃ ○ Folders       ┃ ┃ ▶ Theme & Appearance                                      ┃┃
┃                 ┃ ┃                                                            ┃┃
┃ ○ Remote Access ┃ ┃   Current Theme: [default ▼]                              ┃┃
┃                 ┃ ┃   Options: default, dark-optimized, light-optimized,      ┃┃
┃ ○ MCP Setup     ┃ ┃            minimal                                         ┃┃
┃                 ┃ ┃   Shortcut: Ctrl+T to toggle themes                        ┃┃
┃ ○ Live Logs     ┃ ┃                                                            ┃┃
┃                 ┃ ┃ ○ Embedding Model                                         ┃┃
┃ ▶ Settings      ┃ ┃                                                            ┃┃
┃                 ┃ ┃   Current: cpu:xenova-multilingual-e5-small               ┃┃
┃                 ┃ ┃   Provider: [Python (GPU) ▼] Model: [xenova-... ▼]       ┃┃
┃                 ┃ ┃   Status: ✓ Model loaded and ready                        ┃┃
┃                 ┃ ┃                                                            ┃┃
┃                 ┃ ┃ ○ Performance                                             ┃┃
┃                 ┃ ┃                                                            ┃┃
┃                 ┃ ┃   Batch Size: [32      ] (faster = more memory)          ┃┃
┃                 ┃ ┃   Max Workers: [4       ] (parallel CPU cores)            ┃┃
┃                 ┃ ┃   Cache Size: [10 GB    ] (embedding cache)               ┃┃
┃                 ┃ ┃                                                            ┃┃
┃                 ┃ ┃ ○ Chunking Strategy                                       ┃┃
┃                 ┃ ┃                                                            ┃┃
┃                 ┃ ┃   Chunk Size: [1000     ] (characters per chunk)          ┃┃
┃                 ┃ ┃   Chunk Overlap: [200      ] (overlap size)               ┃┃
┃                 ┃ ┃   Strategy: [Semantic ▼] (Fixed, Paragraph)               ┃┃
┃                 ┃ ┃                                                            ┃┃
┃                 ┃ ┃ ○ Storage                                                 ┃┃
┃                 ┃ ┃                                                            ┃┃
┃                 ┃ ┃   Database: [~/.cache/folder-mcp/              ]          ┃┃
┃                 ┃ ┃   Current Size: 18.2 MB                                   ┃┃
┃                 ┃ ┃   ┏━━━━━━━━━━━━━━━┓  ┏━━━━━━━━━━━━━━━┓                  ┃┃
┃                 ┃ ┃   ┃ Clear Caches  ┃  ┃ Compact DBs   ┃                  ┃┃
┃                 ┃ ┃   ┗━━━━━━━━━━━━━━━┛  ┗━━━━━━━━━━━━━━━┛                  ┃┃
┃                 ┃ ┃                                                            ┃┃
┃                 ┃ ┃ ○ Advanced                                                ┃┃
┃                 ┃ ┃                                                            ┃┃
┃                 ┃ ┃   Dev Mode: [✗] Telemetry: [✓] Auto-start: [✓]          ┃┃
┃                 ┃ ┃                                                            ┃┃
┃                 ┃ ┃              ┏━━━━━━━━━━━━━━━━┓                           ┃┃
┃                 ┃ ┃              ┃ Save Settings  ┃                           ┃┃
┃                 ┃ ┃              ┗━━━━━━━━━━━━━━━━┛                           ▼┃
┗━━━━━━━━━━━━━━━━━┛ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

  Nav: ↑↓: Select   │   Content: ↑↓: Navigate   Enter: Edit   Space: Toggle   Ctrl+T: Theme
```

**Key Features**:
- **Theme & Appearance** - Switch between 4 themes (default, dark-optimized, light-optimized, minimal)
- **Embedding Model** - Select provider and model for semantic search
- **Performance** - Tune batch size, workers, and cache settings
- **Chunking Strategy** - Configure how documents are split and processed
- **Storage** - Manage database location, clear caches, compact databases
- **Advanced** - Development mode, telemetry, auto-start options
- Unsaved changes indicator

**Theme Options**:
- **default** - Balanced theme for dark terminals
- **dark-optimized** - Bright colors optimized for dark backgrounds
- **light-optimized** - Dark colors optimized for light backgrounds
- **minimal** - Simple ASCII-only theme for maximum compatibility

**Interactions**:
- **Enter** on category: Expand/collapse
- **Enter** on field: Edit value
- **Enter** on dropdown: Show theme/model options
- **Space** on checkbox: Toggle on/off
- **Ctrl+T**: Quick toggle between themes (works from any screen)
- **Enter** on "Save Settings": Apply and persist changes

---

## Responsive Layout Behavior

### Landscape Mode (Wide terminals: ≥ 100 cols)
**Layout**: Vertical navigation sidebar (20%) + Content panel (80%)
- Navigation panel shows all screens with full names
- Content area has maximum horizontal space
- Full visibility of all UI elements

### Portrait Mode (Narrow terminals: < 100 cols)
**Layout**: Horizontal navigation row + Content panel (100% width)
- Navigation becomes a horizontal tab bar (1-2 rows high)
- Content panel uses full width below navigation
- Screen names may be abbreviated (e.g., "Folders", "Remote", "MCP", "Logs", "Settings")
- Navigation row shows active screen with visual indicator

### Compact Mode (Very small terminals: < 70 cols or < 20 rows)
- Ultra-minimal UI with essential controls only
- Single-letter abbreviations for screens (F, R, M, L, S)
- Truncated text with ellipsis
- Reduced padding and borders

---

## Global Keyboard Shortcuts

**Focus Management:**
- **Tab** - Switch focus between navigation panel and content panel
- **Shift+Tab** - Switch focus in reverse direction

**Navigation Panel (when focused):**
- **↑/↓** - Navigate between screens
- **Enter** - Activate selected screen and focus content
- **Esc** or **Ctrl+C** - Exit application

**Content Panel (when focused):**
- **↑/↓** - Navigate lists/items
- **←/→** - Expand/collapse or sub-navigation
- **Enter** - Select/activate/edit item
- **Space** - Toggle checkbox or special action (varies by screen)
- **Del/Backspace** - Delete item (with confirmation, where applicable)
- **Esc** - Return focus to navigation panel
- **C** - Clear logs (Live Logs screen only)

**Direct Screen Access (from either panel):**
- **Alt+1** - Jump to Folders screen
- **Alt+2** - Jump to Remote Access screen
- **Alt+3** - Jump to MCP Setup screen
- **Alt+4** - Jump to Live Logs screen
- **Alt+5** - Jump to Settings screen

**Global Toggles (works from any screen):**
- **Ctrl+T** - Toggle between themes (cycles through: default → dark-optimized → light-optimized → minimal → default)

---

## Visual Design Elements

**Status Indicators:**
- **▶** - Active/selected item
- **○** - Inactive/collapsed item
- **✓** - Success/enabled
- **✗** - Error/disabled
- **⚠** - Warning

**Progress Indicators:**
- **Spinner**: ⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏ (animated)
- **Progress bar**: ━━━━━━━━━━ with percentage

**Color Scheme** (using theme system):
- **Borders**: Blue for focused, gray for unfocused
- **Text**: White for primary, gray for secondary
- **Status**: Green for success, red for error, yellow for warning
- **Selection**: Blue background highlight

---

## Implementation Notes

### Component Reuse
- **GenericListPanel** - All list-based content (folders, logs, settings)
- **BorderedBox** - Consistent borders and titles
- **ConfigurationListItem** - Settings and configuration fields
- **LogItem** - Expandable log entries
- **SimpleButtonsRow** - Action buttons
- **FilePickerBody** - Folder selection in "Add Folder" flow

### State Management
- Use **NavigationContext** for screen switching
- Use **FocusChain** for keyboard navigation within screens
- Use **ThemeContext** for consistent colors and styling

### Performance Considerations
- Virtualize long log lists (only render visible items)
- Debounce filter changes
- Memoize expensive calculations
- Lazy-load screen content when switching tabs

---

## Next Steps

1. Implement tab-based navigation controller
2. Create screen components using existing panels
3. Add MCP setup screen with clipboard integration
4. Build live log streaming from daemon
5. Implement settings persistence
6. Add responsive layout breakpoints
7. Polish transitions and animations

