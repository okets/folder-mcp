# TUI Layout Visual Reference

Quick visual guide to the folder-mcp TUI layouts. For full details, see `tui-comprehensive-layout-design.md`.

---

## Layout Modes Comparison

### Landscape Mode (≥100 columns)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 📁 folder-mcp    WebSocket connected • 3 folders • 🤖 Claude Desktop (2m ago) │
└──────────────────────────────────────────────────────────────────────────────┘
┌──────────────┬────────────────────────────────────────────────────────────────┐
│              │                                                                │
│  📁 Folders  │                 Manage Folders                                 │
│  📊 Logs     │                                                                │
│  🔌 MCP      │    [Folder list with expansion and configuration]             │
│  ⚙️ Settings  │                                                                │
│  🌐 Remote   │                                                                │
│              │                                                                │
│   Sidebar    │                      Main Panel                                │
│    (20%)     │                        (80%)                                   │
│              │                                                                │
└──────────────┴────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────────┐
│ Edit:⏎  Switch Panel:Tab  Navigate:↑↓  Jump:1-5  Help:?  Exit:Esc           │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Portrait Mode (<100 columns)
```
┌──────────────────────────────────────┐
│ 📁 folder-mcp    3 folders           │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ [📁] [📊] [🔌] [⚙️] [🌐]              │  ← Top nav (5 lines)
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│                                      │
│         Current Screen Content       │
│                                      │
│                                      │  ← Main panel (remaining space)
│                                      │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ Edit:⏎  Switch:Tab  Exit:Esc         │
└──────────────────────────────────────┘
```

---

## Screen 1: Manage Folders (Default)

```
┌─ Manage Folders ─────────────────────────────────────────────────────────────┐
│                                                                              │
│ ▶ /Users/hanan/Documents                                         [active]   │
│   Model: nomic-embed-text                                                    │
│                                                                              │
│ ■ /Users/hanan/Projects/folder-mcp                            [indexing 67%]│
│   ├─ Change Model                                                            │
│   │   ○ nomic-embed-text                                                     │
│   │   ● all-MiniLM-L6-v2                                                     │
│   │   ○ all-mpnet-base-v2                                                    │
│   │   ○ all-mpnet-base-v2                                                    │
│   └─ Remove Folder                                                           │
│                                                                              │
│ ▶ /Users/hanan/Downloads                                         [pending]  │
│   Model: all-MiniLM-L6-v2                                                    │
│                                                                              │
│ ▶ /Volumes/ExternalDrive/Archives                                   [error] │
│   Model: nomic-embed-text                                                    │
│   ⚠️ Directory not accessible                                                │
│                                                                              │
│                        [+ Add A Folder]                                      │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

Status Colors:
• Green ([active]): Folder indexed and ready
• Orange ([indexing]/[pending]/[downloading]): In progress
• Red ([error]): Problem requires attention
```

---

## Screen 2: Logs & Statistics

```
┌─ System Statistics ──────────────────────────────────────────────────────────┐
│                                                                              │
│ 📁 3 Folders Monitored       🔍 12,453 Documents Indexed                    │
│ 🔌 WebSocket Active          🤖 Claude Desktop (Active 2m ago)              │
│ ⚡ 89 MCP Calls Today         💾 Cache: 2.3 GB / 10 GB (23%)                │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
┌─ Live MCP Activity Stream ───────────────────────────────────────────────────┐
│                                                                              │
│ ▼ 14:23:45 🔍 search_content(folder-mcp, "configuration")                   │
│   │ Result: 8 chunks returned                                               │
│   │ Processing time: 0.87s                                                  │
│   │ Top relevance score: 0.94                                               │
│   │ Files: config/manager.ts, CLAUDE.md, README.md                          │
│                                                                              │
│ ▶ 14:23:32 📄 list_documents(folder-mcp)                                    │
│                                                                              │
│ ▼ 14:23:18 📄 get_document_data(folder-mcp, "README.md")                    │
│   │ Retrieved: 1,245 tokens                                                 │
│   │ Processing time: 0.12s                                                  │
│                                                                              │
│ ▶ 14:22:56 🔌 WebSocket: Connection established from Claude Desktop         │
│                                                                              │
│ ▶ 14:22:45 ⚡ Indexing: folder-mcp completed successfully (3.2s)            │
│                                                                              │
│ ▶ 14:22:12 ❌ Error: Failed to read /restricted/file.txt (Permission denied)│
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

Icons:
🔍 = Search operation    📄 = Document access    🔌 = WebSocket event
⚡ = Indexing operation   ❌ = Error occurred
```

---

## Screen 3: MCP Connection Setup

```
┌─ MCP Connection Setup ───────────────────────────────────────────────────────┐
│                                                                              │
│ Select your MCP client:                                                      │
│                                                                              │
│ ● Claude Desktop                                                             │
│ ○ VSCode                                                                     │
│ ○ Cursor                                                                     │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ Configuration for Claude Desktop                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                              │
│ Config file location:                                                        │
│ ~/Library/Application Support/Claude/claude_desktop_config.json             │
│                                                                              │
│ {                                                                            │
│   "mcpServers": {                                                            │
│     "folder-mcp": {                                                          │
│       "command": "folder-mcp",                                               │
│       "args": ["mcp", "server"],                                             │
│       "env": {}                                                              │
│     }                                                                        │
│   }                                                                          │
│ }                                                                            │
│                                                                              │
│ Instructions:                                                                │
│ 1. Copy the JSON configuration above                                        │
│ 2. Open Claude Desktop                                                      │
│ 3. Go to Settings > Developer > Edit Config                                 │
│ 4. Paste the configuration into "mcpServers" section                        │
│ 5. Save and restart Claude Desktop                                          │
│ 6. Verify connection in Claude Desktop developer tools                      │
│                                                                              │
│              [Copy to Clipboard]          [Test Connection]                  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Screen 4: Global Settings

```
┌─ Global Settings ────────────────────────────────────────────────────────────┐
│                                                                              │
│ ▼ Appearance                                                                 │
│   │ Theme: [auto] [dark] [light]     (Current: auto → dark)                 │
│   └─ Animations: [Enabled]                                                   │
│                                                                              │
│ ▼ Default Model Configuration                                                │
│   │ Default model for new folders:                                           │
│   │   ○ nomic-embed-text (Recommended - balanced performance)               │
│   │   ● all-MiniLM-L6-v2 (Fast, good quality)                               │
│   │   ○ all-mpnet-base-v2 (High quality, slower)                            │
│   │                                                                          │
│   └─ Auto-download models: [Enabled]                                         │
│                                                                              │
│ ▼ Processing Configuration                                                   │
│   │ Batch Size: [32]        (Number of documents processed together)        │
│   │ Chunk Size: [1000]      (Characters per chunk for embeddings)           │
│   │ Chunk Overlap: [200]    (Character overlap between chunks)              │
│   │ Max Cache Size: [10 GB] (Maximum disk space for cache)                  │
│   │                                                                          │
│   └─ Cleanup Interval: [24 hours]                                            │
│                                                                              │
│ ▼ Advanced Options                                                           │
│   │ Cache Directory: [~/.cache/folder-mcp]                                   │
│   │ Development Mode: [Disabled]                                             │
│   │ Log Level: [info] [debug] [warning] [error]                             │
│   │                                                                          │
│   └─ Enable GPU Acceleration: [Enabled]                                      │
│                                                                              │
│                 [Reset to Defaults]          [Save Changes]                  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Screen 5: Remote Access (Placeholder)

```
┌─ Remote Access (Coming Soon) ────────────────────────────────────────────────┐
│                                                                              │
│                                                                              │
│                         🚧 Under Construction 🚧                             │
│                                                                              │
│                                                                              │
│   Remote Access features will be available in Phase 12.                     │
│                                                                              │
│   Planned Features:                                                          │
│                                                                              │
│   🌐 Cloudflare Tunnel Integration                                          │
│      • Easy setup with cloudflared                                           │
│      • Automatic HTTPS with custom domains                                   │
│                                                                              │
│   🔐 Access Control & Authentication                                         │
│      • API key management                                                    │
│      • IP whitelisting                                                       │
│      • Rate limiting                                                         │
│                                                                              │
│   📊 Remote Connection Monitoring                                            │
│      • Active connections dashboard                                          │
│      • Geographic distribution                                               │
│      • Usage statistics                                                      │
│                                                                              │
│   For now, folder-mcp runs as a local MCP server only.                      │
│                                                                              │
│                                                                              │
│                        [Back to Main Menu]                                   │
│                                                                              │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Context-Sensitive Help Modal

Triggered by pressing `?` on any screen:

```
┌─ Help: Manage Folders ───────────────────────────────────────────────────────┐
│                                                                              │
│ Navigation                                                                   │
│ ────────────────────────────────────────────────────────────────────────────│
│ ↑/↓          Navigate through folders                                        │
│ ⏎            Expand folder to show options                                   │
│ →            Expand folder (alternative)                                     │
│ ←/Esc        Collapse folder                                                 │
│ Tab          Switch between sidebar and main panel                           │
│ 1-5          Quick jump to screen (1=Folders, 2=Logs, etc.)                 │
│                                                                              │
│ Actions                                                                      │
│ ────────────────────────────────────────────────────────────────────────────│
│ ⏎            On "Add Folder" button: Start folder selection wizard          │
│ ⏎            On "Change Model": Open model selector                         │
│ ⏎            On "Remove Folder": Confirm folder removal                     │
│                                                                              │
│ Status Colors                                                                │
│ ────────────────────────────────────────────────────────────────────────────│
│ Green        Folder is active and fully indexed                             │
│ Orange       Pending, indexing, or downloading model                        │
│ Red          Error state - expand to see details                            │
│                                                                              │
│ Global Shortcuts                                                             │
│ ────────────────────────────────────────────────────────────────────────────│
│ T            Cycle through themes (auto/dark/light)                         │
│ Ctrl+A       Toggle animations on/off                                       │
│ ?            Show/hide this help                                            │
│ Esc          Exit application (with countdown)                              │
│                                                                              │
│                                                                              │
│                   Press ? or Esc to close this help                          │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Keyboard Shortcuts Quick Reference

### Global (Always Available)
| Key | Action |
|-----|--------|
| `Tab` | Switch between sidebar/nav and main panel |
| `Shift+Tab` | Switch backwards |
| `1-5` | Quick jump to screen (1=Folders, 2=Logs, 3=MCP, 4=Settings, 5=Remote) |
| `T` | Cycle themes |
| `Ctrl+A` | Toggle animations |
| `?` | Show context-sensitive help |
| `Esc` | Exit (with 3-second countdown, press again to confirm) |

### In Sidebar/Navigation
| Key | Action |
|-----|--------|
| `↑/↓` | Navigate screens |
| `⏎` | Switch to selected screen |

### In Main Panel (varies by screen)
| Key | Action |
|-----|--------|
| `↑/↓` | Navigate items |
| `⏎` | Edit/Expand item |
| `→` | Expand collapsible item |
| `←/Esc` | Collapse/Exit edit mode |

---

## Responsive Breakpoints

| Columns | Mode | Sidebar/Nav | Main Panel | Notes |
|---------|------|-------------|------------|-------|
| < 60 | Ultra-narrow | Top nav (icons only) | Full width | Minimal features |
| 60-99 | Portrait | Top nav (5 lines) | Full width | Button text truncated |
| 100-119 | Landscape | Sidebar 20% | 80% | Standard layout |
| ≥ 120 | Wide | Sidebar 20% | 80% | Full features visible |

---

## Header States

### Full Header (Normal Resolution)
```
╭────────────────────────────────────────────────── [auto] 120w40h ╮
│ 📁 folder-mcp    WebSocket connected • 3 folders • 🤖 Claude Desktop (2m ago) │
╰────────────────────────────────────────────────────────────────────╯
```

### Compact Header (Low Resolution)
```
📁 folder-mcp    WebSocket connected • 3 folders • 🤖 2m
```

### Exit Countdown (Any Resolution)
```
╭───────────────────────────────────────────────────────────────────╮
│ 📁 folder-mcp    ● Press esc again to exit 3..                    │
╰───────────────────────────────────────────────────────────────────╯
```

---

## Status Bar Adaptation

### Wide Terminal (Descriptions + Keys)
```
╭──────────────────────────────────────────────────────────────────╮
│ Edit:⏎  Switch Panel:Tab  Navigate:↑↓  Jump:1-5  Help:?  Exit:Esc│
╰──────────────────────────────────────────────────────────────────╯
```

### Medium Terminal (Truncated Descriptions)
```
╭────────────────────────────────────────────────────╮
│ Edit:⏎  Switch:Tab  Nav:↑↓  Jump:1-5  ?  Exit:Esc │
╰────────────────────────────────────────────────────╯
```

### Narrow Terminal (Keys Only)
```
╭──────────────────────────────╮
│ ⏎  Tab  ↑↓  1-5  ?  Esc     │
╰──────────────────────────────╯
```

### Ultra-Narrow (Priority Keys)
```
⏎  Tab  Esc
```

---

## Component Hierarchy

```
AppFullscreen
├─ Header (with LLM indicator)
│
├─ LayoutContainer (responsive)
│  │
│  ├─ Landscape Mode (≥100 cols)
│  │  ├─ SidebarNavigation (20% width)
│  │  │  └─ GenericListPanel
│  │  │     └─ SelectionListItem[] (5 screens)
│  │  │
│  │  └─ MainPanelContent (80% width)
│  │     └─ [Current Screen Component]
│  │
│  └─ Portrait Mode (<100 cols)
│     ├─ TopNavigationBar (5 lines)
│     │  └─ SimpleButtonsRow (icon buttons)
│     │
│     └─ MainPanelContent (remaining space)
│        └─ [Current Screen Component]
│
└─ StatusBar (context-aware key bindings)
```

---

## Screen Components Detail

```
Screen 1: ManageFoldersScreen
└─ GenericListPanel
   ├─ ManageFolderItem[] (existing)
   │  ├─ Collapsed: path + model + status
   │  └─ Expanded:
   │     ├─ SelectionListItem (Change Model)
   │     └─ SimpleButtonsRow (Remove Folder)
   └─ SimpleButtonsRow (Add Folder button)

Screen 2: LogsStatisticsScreen
├─ GenericListPanel (top 30%)
│  └─ TextListItem[] (statistics)
└─ GenericListPanel (bottom 70%)
   └─ LogItem[] (expandable events)

Screen 3: MCPConnectionSetupScreen
└─ GenericListPanel
   ├─ SelectionListItem[] (client selection)
   ├─ TextListItem[] (config display)
   └─ SimpleButtonsRow (Copy/Test buttons)

Screen 4: GlobalSettingsScreen
└─ GenericListPanel
   ├─ ContainerListItem[] (sections)
   │  ├─ SelectionListItem (dropdown settings)
   │  ├─ ConfigurationListItem (text input)
   │  └─ SelectionListItem (toggles)
   └─ SimpleButtonsRow (Reset/Save)

Screen 5: RemoteAccessPlaceholder
└─ GenericListPanel
   ├─ TextListItem[] (coming soon message)
   └─ SimpleButtonsRow (back button)
```

---

## Color Coding

### Status Colors (from theme)
- **Green** (`theme.colors.successGreen`): Success, active, healthy
- **Orange** (`theme.colors.warningOrange`): In progress, pending, warning
- **Red** (`theme.colors.dangerRed`): Error, failed, critical
- **Blue** (`theme.colors.primary`): Interactive, selected
- **Gray** (`theme.colors.textMuted`): Disabled, secondary

### Semantic Usage
```typescript
// Folder status
'active' → green
'indexing' → orange
'downloading-model' → orange
'pending' → orange
'error' → red

// WebSocket
connected → green text
connecting → orange text
disconnected → red text

// LLM indicator
hasActiveConnection (< 4min) → show 🤖
hasActiveConnection (≥ 4min) → hide indicator
```

---

## For Developers

### Quick Start Adding a New Screen

1. **Create screen component:**
```typescript
export function MyNewScreen() {
  const items: IListItem[] = [
    // Your list items
  ];
  
  return (
    <GenericListPanel
      title="My Screen"
      items={items}
      selectedIndex={selectedIndex}
      isFocused={isFocused}
      elementId="my-screen"
      parentId="app-root"
    />
  );
}
```

2. **Add to screen router:**
```typescript
type ScreenType = 'manage-folders' | 'logs-statistics' | 'my-new-screen';

const screens = [
  { icon: '📁', label: 'Folders', screen: 'manage-folders' },
  { icon: '📊', label: 'Logs', screen: 'logs-statistics' },
  { icon: '✨', label: 'My Screen', screen: 'my-new-screen' }
];
```

3. **Add help content:**
```typescript
const helpContent: Record<ScreenType, HelpContent> = {
  'my-new-screen': {
    title: 'My Screen Help',
    sections: [
      {
        heading: 'Navigation',
        items: [
          { key: '↑/↓', description: 'Navigate items' }
        ]
      }
    ]
  }
};
```

### Testing Checklist

- [ ] Screen renders at 80x24 (minimum)
- [ ] Screen renders at 120x40 (comfortable)
- [ ] Landscape → Portrait transition works
- [ ] Tab switches focus correctly
- [ ] Help modal shows correct content
- [ ] Real-time updates work (if applicable)
- [ ] Status bar shows relevant keys
- [ ] Theme switching works
- [ ] Memory usage stable (no leaks)

---

## Related Documentation

- **Full Design:** `tui-comprehensive-layout-design.md`
- **TUI Guidelines:** `CLAUDE.md` (TUI Development Guidelines section)
- **Component Docs:** See `src/interfaces/tui-ink/components/` for component implementations

---

**Last Updated:** 2025-11-06  
**Status:** Design Proposal (Implementation Pending)
