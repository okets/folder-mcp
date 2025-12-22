# Phase 11 Sprint 4: Activity Log Screen

**Goal**: Build the Activity Log screen showing real-time daemon events with visual feedback

**Status**: ✅ COMPLETED

**Completion Date**: 2025-12-23

**Implementation Summary**:
Phase A (Daemon Data Flow) and Phase B (TUI Visualization) both completed with comprehensive code review fixes.

**Key Commits**:
- `c7932ca feat(activity): Phase B - Progress-oriented activity events in daemon`
- `33c167b fix(tui): Sprint 4 code review fixes + scroll/color improvements`

**What Was Built**:
- **ActivityService**: Ring buffer (500 events) with pub/sub pattern
- **WebSocket Integration**: Real-time activity.event broadcasts + activity.history requests
- **Progress River Model**: In-progress items float to top, completed flow downstream
- **ActivityLogPanel**: Real-time visualization with expand/collapse details
- **LogItem Component**: Icon + timestamp + message + progress bar layout
- **Theme Colors**: Cyan (in-progress), Green (completed), Orange (warning), White (info)

**Code Review Fixes Applied** (see Sprint-4-Code-Review-Tasks.md for details):
- ✅ MCP Activity Type Fix (pass eventType instead of hardcoded 'search')
- ✅ History Fetch Race Condition (functional updater for merging)
- ✅ TypeScript Type/Runtime Mismatches (payload optional, validation)
- ✅ Input Validation (timestamp, progress bar width, date formatting)
- ✅ Dead Code Removal (unused imports, truncateText, try-catch blocks)
- ✅ extractFolderName uses path.basename()
- ✅ FMDMClient substr to substring
- ✅ High Contrast Theme Warning Color (yellow)
- ✅ Scroll calculation with expanded items (cursor no longer vanishes)
- ✅ In-progress color changed from orange to cyan (accent) for clarity
- ✅ DI allowlist updated for ActivityService

---

## Design Summary

### Visual Layout

```
┌─ Activity Log ──────────────────────────────────────────────┐
│ 📁 14:32:05  Indexing ~/Documents              ⠋▓▓▓░░░░░ 47% │
│ 📁 14:28:12  Indexing complete: ~/Projects            ✓100% │
│ 🔌 14:32:02  Claude Desktop connected                     ✓ │
│ 🔍 14:31:58  Search: "budget report" → 3 results          ✓ │
│ 🔌 14:25:00  VSCode client disconnected                   ⚠ │
│ 📁 14:20:15  Indexing failed: ~/Secrets                   ✗ │
└─────────────────────────────────────────────────────────────┘
```

### Column Layout

| Column | Content | Width | Notes |
|--------|---------|-------|-------|
| Icon | Emoji or Symbol | 2 (emoji) / 1 (symbol) | Activity type |
| Time | `HH:MM:SS` | 8 | Fixed format |
| Message | Activity text | Flexible | Truncatable |
| Status | ProgressBar or Icon | Variable | Uses existing ProgressBar component |

### Activity Icons

**Primary (Emoji):**
| Type | Icon |
|------|------|
| indexing | 📁 |
| search | 🔍 |
| connection | 🔌 |
| model | 🧠 |
| system | ⚙️ |
| error | ❌ |

**Fallback (Symbols):**
| Type | Icon |
|------|------|
| indexing | ▣ |
| search | ◎ |
| connection | ↔ |
| model | ◈ |
| system | ● |
| error | ✗ |

---

## Activity Events Catalog

This is the complete list of events the user sees in the Activity Log.

### Log Levels (Simplified)

**Philosophy**: Don't pre-define importance - discover it by observation.

**Two Triggers:**
| Trigger | Examples | Initially |
|---------|----------|-----------|
| **User-initiated** | LLM queries, first folder add, explicit actions | Show ✅ |
| **Routine daemon** | Periodic re-index, model warm-up, background checks | Show ✅ |

**Two Levels:**
| Level | Description | When to Use |
|-------|-------------|-------------|
| **Full** | Everything (DEFAULT) | Start here, see all activity |
| **Important** | User-relevant only | After we identify what's noise |

**Approach:**
1. **Phase A**: Capture ALL events, mark each as `userInitiated: boolean`
2. **Phase B**: Display EVERYTHING initially (Full mode)
3. **Post-TUI**: Observe real usage, decide what's "noise"
4. **Later**: Implement "Important" filter based on observations

**Note**: The `userInitiated` field lets us filter later without re-doing capture logic.

### Event Catalog

#### 📁 Folder/Indexing Events

| Event | Type | Level | User Initiated | Sample Message | Has Progress |
|-------|------|-------|----------------|----------------|--------------|
| Folder added | indexing | success | ✅ Yes | `Added folder: ~/Documents` | No |
| Folder removed | indexing | info | ✅ Yes | `Removed folder: ~/Documents` | No |
| Indexing started (first time) | indexing | info | ✅ Yes | `Indexing ~/Documents (847 files)` | Yes (0%) |
| Indexing started (periodic) | indexing | info | ❌ No | `Re-scanning ~/Documents` | Yes (0%) |
| Indexing progress | indexing | info | (inherits) | `Indexing ~/Documents` | Yes (47%) |
| Indexing complete | indexing | success | (inherits) | `Indexed ~/Documents (847 files, 2m 15s)` | Yes (100%) |
| Indexing failed | indexing | error | (inherits) | `Indexing failed: ~/Secrets - Permission denied` | No |
| File added | indexing | info | ❌ No | `New: report-final.pdf` | No |
| File modified | indexing | info | ❌ No | `Changed: quarterly-budget.xlsx` | No |
| File deleted | indexing | info | ❌ No | `Removed: old-draft.docx` | No |

#### 🔌 Connection Events

| Event | Type | Level | User Initiated | Sample Message | Has Progress |
|-------|------|-------|----------------|----------------|--------------|
| MCP client connected | connection | success | ✅ Yes | `Claude Desktop connected` | No |
| MCP client disconnected | connection | warning | ✅ Yes | `Cursor disconnected` | No |
| TUI connected | connection | info | ✅ Yes | `TUI client connected` | No |
| TUI disconnected | connection | info | ✅ Yes | `TUI client disconnected` | No |

**Client Type Detection:**
- Claude Desktop → `Claude Desktop connected`
- VSCode Extension → `VSCode connected`
- Cursor → `Cursor connected`
- Unknown → `MCP client connected`

#### 🧠 Model Events

| Event | Type | Level | User Initiated | Sample Message | Has Progress |
|-------|------|-------|----------------|----------------|--------------|
| Model download started | model | info | ✅ Yes | `Downloading bge-m3 (1.2 GB)` | Yes (0%) |
| Model download progress | model | info | (inherits) | `Downloading bge-m3` | Yes (67%) |
| Model download complete | model | success | (inherits) | `Model ready: bge-m3` | Yes (100%) |
| Model download failed | model | error | (inherits) | `Download failed: bge-m3 - Network timeout` | No |
| Default model changed | model | success | ✅ Yes | `Default model: bge-m3` | No |
| Model warm-up | model | info | ❌ No | `Warming up bge-m3...` | No |

#### 🔍 MCP/LLM Interaction Events

These events show what connected AI clients (Claude, Cursor, etc.) are asking for.

| Event | Type | Level | User Initiated | Sample Message | Has Progress |
|-------|------|-------|----------------|----------------|--------------|
| Search query | search | success | ✅ Yes | `Claude: Search "Q4 budget report"` | No |
| Search results | search | info | ✅ Yes | `  → 5 results in ~/Documents` | No |
| Document opened | search | info | ✅ Yes | `Claude: Opened report.pdf` | No |
| Document text retrieved | search | info | ✅ Yes | `  → 2,450 chars from report.pdf` | No |
| Chunks retrieved | search | info | ✅ Yes | `  → 3 chunks from report.pdf` | No |
| Folder explored | search | info | ✅ Yes | `Claude: Browsing ~/Documents/Reports` | No |
| Document list requested | search | info | ✅ Yes | `Claude: Listed 12 docs in ~/Projects` | No |
| Search failed | search | error | ✅ Yes | `Search failed: Database unavailable` | No |

**Client Attribution:**
- The client name (Claude, Cursor, VSCode, etc.) is shown when known
- Format: `{Client}: {Action} {Details}`

#### ⚙️ System Events

| Event | Type | Level | User Initiated | Sample Message | Has Progress |
|-------|------|-------|----------------|----------------|--------------|
| Daemon started | system | success | ✅ Yes | `Daemon started (v1.2.3)` | No |
| Daemon stopping | system | info | ✅ Yes | `Daemon shutting down...` | No |
| Error recovered | error | warning | ❌ No | `Recovered: WebSocket connection reset` | No |
| Memory warning | system | warning | ❌ No | `High memory usage: 2.1 GB (85%)` | No |
| Health check | system | info | ❌ No | `Health check OK` | No |

### Initial Display (Full Mode)

**We start by showing EVERYTHING:**

```
📁 14:35:10  Indexed ~/Documents (847 files, 2m 15s)      ✓100%
🔍 14:35:05    → 2,450 chars from quarterly-summary.pdf      ℹ
🔌 14:35:00  TUI client connected                             ✓
🔍 14:34:50    → 5 results in ~/Documents                    ℹ
🔍 14:34:45  Claude: Search "Q4 budget report"                ✓
📁 14:34:30  New: report-final.pdf                            ✓
📁 14:34:20  Changed: quarterly-budget.xlsx                   ✓
📁 14:34:00  Indexing ~/Documents                    ⠋▓▓▓▓░░ 67%
🔍 14:33:30  Claude: Browsing ~/Documents/Reports             ✓
🔌 14:32:00  Claude Desktop connected                         ✓
📁 14:31:30  Indexing ~/Documents                    ⠋▓▓░░░░ 35%
🧠 14:31:00  Downloading bge-m3                      ⠋▓▓▓░░░ 52%
📁 14:30:00  Added folder: ~/Documents                        ✓
⚙️ 14:20:00  Daemon started (v1.2.3)                          ✓
```

**After observing real usage**, we can add an "Important" filter that hides:
- Routine daemon events (`userInitiated: false`)
- Events we empirically determine are "noise"

**This is TBD** - we implement filtering AFTER seeing the full log in action.

---

## Collapsed vs Expanded Content

LogItem supports expand/collapse for details. When expanded, additional detail lines appear with vertical connectors (`│` and `└`). This section defines what content appears in each mode.

### Data Model Update

```typescript
interface ActivityEvent {
  id: string;
  timestamp: Date;
  type: ActivityType;
  level: ActivityLevel;
  message: string;                // Collapsed: main text
  progress?: number;
  userInitiated: boolean;         // true = user action, false = routine daemon
  details?: string[];             // Expanded: detail lines (when available)
}
```

### 📁 Folder/Indexing Events

#### Folder Added
```
Collapsed: ▣ 14:32:05  Added folder: ~/Documents                   ✓
Expanded:
├ Path: /Users/hanan/Documents
└ Files detected: 847
```

#### Folder Removed
```
Collapsed: ▣ 14:32:05  Removed folder: ~/Documents                 ✓
Expanded:
├ Path: /Users/hanan/Documents
└ Index cleared: 847 files
```

#### Indexing Started
```
Collapsed: ▣ 14:32:05  Indexing ~/Documents (847 files)    ⠋░░░░░░░  0%
Expanded:
├ Path: /Users/hanan/Documents
├ Total files: 847
└ Types: 234 pdf, 156 docx, 89 xlsx, 368 other
```

#### Indexing Progress
```
Collapsed: ▣ 14:32:05  Indexing ~/Documents                ⠋▓▓▓░░░░ 47%
Expanded:
├ Current: quarterly-report-2024.pdf
├ Progress: 398/847 files
├ Speed: 12 files/sec
└ Types: 98 pdf, 67 docx, 45 xlsx, 188 other
```

#### Indexing Complete
```
Collapsed: ▣ 14:35:20  Indexed ~/Documents (847 files, 2m 15s)  ✓100%
Expanded:
├ Duration: 2 minutes 15 seconds
├ Files: 234 pdf, 156 docx, 89 xlsx, 368 other
├ Total chunks: 12,456
├ Skipped: 3 files (permission denied)
└ Index size: 45 MB
```

#### Indexing Failed
```
Collapsed: ▣ 14:32:05  Indexing failed: ~/Secrets                  ✗
Expanded:
├ Error: Permission denied
├ Path: /Users/hanan/Secrets
└ Suggestion: Check folder permissions or exclude folder
```

#### Re-index Triggered
```
Collapsed: ▣ 14:32:05  Re-indexing ~/Documents (12 changed)  ⠋░░░░░░░  0%
Expanded:
├ Changed: 8 files
├ Added: 3 files
└ Deleted: 1 file
```

#### File Added (Verbose)
```
Collapsed: ▣ 14:32:05  New: report-final.pdf                       ✓
Expanded:
├ Path: ~/Documents/Reports/report-final.pdf
├ Size: 2.4 MB
└ Type: PDF document
```

#### File Modified (Verbose)
```
Collapsed: ▣ 14:32:05  Changed: quarterly-budget.xlsx              ✓
Expanded:
├ Path: ~/Documents/Finance/quarterly-budget.xlsx
├ Size: 156 KB → 189 KB
└ Re-indexed: 12 chunks
```

#### File Deleted (Verbose)
```
Collapsed: ▣ 14:32:05  Removed: old-draft.docx                     ✓
Expanded:
├ Path: ~/Documents/Drafts/old-draft.docx
└ Removed: 8 chunks from index
```

### 🔌 Connection Events

#### MCP Client Connected
```
Collapsed: ↔ 14:32:05  Claude Desktop connected                    ✓
Expanded:
├ Client: Claude Desktop (v1.2.3)
├ Protocol: MCP v1.0
└ Session: abc123...
```

#### MCP Client Disconnected
```
Collapsed: ↔ 14:45:00  Cursor disconnected                         ⚠
Expanded:
├ Client: Cursor
├ Session duration: 12m 45s
└ Requests served: 47
```

#### TUI Connected (Debug)
```
Collapsed: ↔ 14:32:05  TUI client connected                        ✓
Expanded:
├ Connection: WebSocket
└ Session: xyz789...
```

#### TUI Disconnected (Debug)
```
Collapsed: ↔ 14:32:05  TUI client disconnected                     ✓
Expanded:
├ Session duration: 5m 30s
└ Clean shutdown: Yes
```

### 🧠 Model Events

#### Model Download Started
```
Collapsed: ◈ 14:32:05  Downloading bge-m3 (1.2 GB)          ⠋░░░░░░░  0%
Expanded:
├ Model: bge-m3
├ Size: 1.2 GB
├ Source: HuggingFace
└ Destination: ~/.cache/folder-mcp/models/
```

#### Model Download Progress (Verbose)
```
Collapsed: ◈ 14:33:00  Downloading bge-m3                  ⠋▓▓▓▓░░░ 67%
Expanded:
├ Downloaded: 804 MB / 1.2 GB
├ Speed: 15.2 MB/s
└ ETA: 26 seconds
```

#### Model Download Complete
```
Collapsed: ◈ 14:35:00  Model ready: bge-m3                      ✓100%
Expanded:
├ Model: bge-m3
├ Size: 1.2 GB
├ Duration: 2m 55s
└ Verified: SHA256 checksum OK
```

#### Model Download Failed
```
Collapsed: ◈ 14:35:00  Download failed: bge-m3                     ✗
Expanded:
├ Model: bge-m3
├ Error: Network timeout after 30s
├ Downloaded: 804 MB / 1.2 GB (67%)
└ Retry: Will attempt again in 5 minutes
```

#### Default Model Changed
```
Collapsed: ◈ 14:32:05  Default model: bge-m3                       ✓
Expanded:
├ Previous: all-MiniLM-L6-v2
├ New: bge-m3
└ Re-indexing: Not required (same dimensions)
```

### 🔍 MCP/LLM Interaction Events

#### Search Query
```
Collapsed: ◎ 14:32:05  Claude: Search "Q4 budget report"           ✓
Expanded:
├ Query: "Q4 budget report quarterly expenses"
├ Client: Claude Desktop
├ Folder: ~/Documents
└ Time: 145ms
```

#### Search Results (Verbose)
```
Collapsed: ◎ 14:32:05    → 5 results in ~/Documents                ℹ
Expanded:
├ Top match: quarterly-report-Q4.pdf (0.94)
├ Match 2: budget-summary.xlsx (0.87)
├ Match 3: expenses-Q4.docx (0.82)
├ Threshold: 0.75
└ Time: 145ms
```

#### Document Opened
```
Collapsed: ◎ 14:32:05  Claude: Opened quarterly-summary.pdf        ✓
Expanded:
├ Document: quarterly-summary.pdf
├ Path: ~/Documents/Reports/
├ Size: 2.4 MB
└ Pages: 12
```

#### Document Text Retrieved (Verbose)
```
Collapsed: ◎ 14:32:05    → 2,450 chars from quarterly-summary.pdf  ℹ
Expanded:
├ Characters: 2,450
├ Chunks returned: 3
└ Response time: 23ms
```

#### Chunks Retrieved (Verbose)
```
Collapsed: ◎ 14:32:05    → 3 chunks from report.pdf                ℹ
Expanded:
├ Chunk IDs: 145, 146, 147
├ Total chars: 4,200
└ Source: report.pdf (pages 3-5)
```

#### Folder Explored (Verbose)
```
Collapsed: ◎ 14:32:05  Claude: Browsing ~/Documents/Reports        ✓
Expanded:
├ Path: ~/Documents/Reports
├ Files: 24
└ Subdirectories: 3
```

#### Document List Requested (Verbose)
```
Collapsed: ◎ 14:32:05  Claude: Listed 12 docs in ~/Projects        ✓
Expanded:
├ Folder: ~/Projects
├ Documents: 12 (4 pdf, 5 md, 3 txt)
└ Response time: 12ms
```

#### Search Failed
```
Collapsed: ◎ 14:32:05  Search failed: Database unavailable         ✗
Expanded:
├ Query: "quarterly report"
├ Error: SQLite database locked
├ Client: Claude Desktop
└ Retry: Available after database recovery
```

### ⚙️ System Events

#### Daemon Started
```
Collapsed: ● 14:32:05  Daemon started (v1.2.3)                     ✓
Expanded:
├ Version: 1.2.3
├ Port: 45678
├ PID: 12345
├ Model: bge-m3
└ Folders: 3 configured
```

#### Daemon Stopping
```
Collapsed: ● 14:45:00  Daemon shutting down...                     ℹ
Expanded:
├ Reason: User requested shutdown
├ Uptime: 12m 55s
├ Requests served: 234
└ Cleanup: In progress...
```

#### Error Recovered
```
Collapsed: ✗ 14:32:05  Recovered: WebSocket connection reset       ⚠
Expanded:
├ Error: ECONNRESET
├ Duration: 2.3 seconds
├ Clients affected: 1
└ Action: Automatic reconnection
```

#### Memory Warning
```
Collapsed: ● 14:32:05  High memory usage: 2.1 GB (85%)             ⚠
Expanded:
├ Current: 2.1 GB
├ Limit: 2.5 GB
├ Largest index: ~/Documents (1.2 GB)
└ Suggestion: Consider removing large folders
```

### Implementation Notes

1. **Details are optional** - Not all events need expanded details
2. **Generate on demand** - Details can be computed when user expands
3. **Keep details concise** - Maximum 5-6 detail lines per event
4. **Use consistent formatting**:
   - Keys are capitalized: `Path:`, `Size:`, `Duration:`
   - Values are descriptive but brief
   - Paths use `~` for home directory
5. **No duplicate info** - Details should add context, not repeat collapsed text

---

### Message Formatting Guidelines

1. **Keep messages short** - truncation happens at ~40-50 chars
2. **Lead with action** - "Indexing", "Downloaded", "Connected"
3. **Include context** - folder path, file name, result count
4. **Use past tense for completions** - "Indexed", "Downloaded"
5. **Use present tense for ongoing** - "Indexing", "Downloading"
6. **Paths**: Use `~` for home directory, truncate middle if needed

**Path Truncation Examples:**
- `/Users/hanan/Documents` → `~/Documents`
- `/Users/hanan/Very/Long/Path/To/Folder` → `~/Very/.../Folder`

---

### Status Indicators

Uses existing `ProgressBar` component:
- **In Progress**: `⠋▓▓▓░░░░░ 47%` (spinner + bar + percentage)
- **Complete**: `✓100%` (green)
- **Error**: `✗ERR` (red)
- **Success (no progress)**: `✓` (green)
- **Warning**: `⚠` (orange)
- **Info**: `ℹ` (blue)

### Data Model

```typescript
interface ActivityEvent {
  id: string;                    // UUID for React keys
  timestamp: Date;               // For HH:MM:SS display
  type: ActivityType;            // Icon selection
  level: ActivityLevel;          // Status color + indicator
  message: string;               // Activity text (truncatable) - shown in collapsed mode
  progress?: number;             // 0-100 for ProgressBar, undefined for instant events
  userInitiated: boolean;        // true = user action, false = routine daemon activity
  details?: string[];            // Detail lines shown when expanded (optional)
}

type ActivityType = 'indexing' | 'search' | 'connection' | 'model' | 'system' | 'error';
type ActivityLevel = 'info' | 'success' | 'warning' | 'error';
type LogLevel = 'full' | 'important';  // For future filtering (start with 'full')
```

### Behavior

- **Storage**: In-memory ring buffer (500 events max), no disk persistence
- **New Events**: Appear at top, push older events down
- **Navigation**: If user is scrolled down, their selection index increments to stay on same item
- **Daemon Restart**: Fresh log (no persistence)

---

## Implementation Workflow

**Architecture**: Producer-Consumer Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                        DAEMON (Producer)                        │
│  ┌──────────────┐    ┌─────────────────┐    ┌───────────────┐  │
│  │ Capture      │───▶│ ActivityService │───▶│ WebSocket     │  │
│  │ Points       │    │ (ring buffer)   │    │ Broadcast     │  │
│  └──────────────┘    └─────────────────┘    └───────┬───────┘  │
└─────────────────────────────────────────────────────┼───────────┘
                                                      │
                                              WebSocket Messages
                                                      │
┌─────────────────────────────────────────────────────▼───────────┐
│                         TUI (Consumer)                          │
│  ┌───────────────┐    ┌─────────────────┐    ┌───────────────┐  │
│  │ WebSocket     │───▶│ Local State     │───▶│ ActivityLog   │  │
│  │ Listener      │    │ (React useState)│    │ Panel         │  │
│  └───────────────┘    └─────────────────┘    └───────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Sprint Phases**:

| Phase | Focus | Goal |
|-------|-------|------|
| **Phase A** | Daemon Data Flow | Build complete data pipeline, verify ALL data is captured |
| **Phase B** | TUI Visualization | Read-only display of verified data stream |

---

## Phase A: Daemon Data Flow

**Goal**: Complete data collection and WebSocket transmission. Verify ALL information is available before building TUI.

### Task A1: ActivityEvent Data Model & Service

**Files to Create:**
- `src/daemon/models/activity-event.ts`
- `src/daemon/services/activity-service.ts`

**Data Model:**

```typescript
// src/daemon/models/activity-event.ts
export interface ActivityEvent {
  id: string;                    // UUID for deduplication
  timestamp: Date;               // When event occurred
  type: ActivityType;            // Icon selection
  level: ActivityLevel;          // Status color + indicator
  message: string;               // Collapsed view text
  progress?: number;             // 0-100 for progress events
  userInitiated: boolean;        // true = user action, false = routine daemon
  details?: string[];            // Expanded view lines
}

export type ActivityType = 'indexing' | 'search' | 'connection' | 'model' | 'system' | 'error';
export type ActivityLevel = 'info' | 'success' | 'warning' | 'error';
export type LogLevel = 'full' | 'important';  // For future filtering
```

**Service:**

```typescript
// src/daemon/services/activity-service.ts
export class ActivityService {
  private buffer: ActivityEvent[] = [];
  private readonly maxSize = 500;
  private subscribers: Set<(event: ActivityEvent) => void> = new Set();

  emit(event: Omit<ActivityEvent, 'id' | 'timestamp'>): ActivityEvent {
    const fullEvent: ActivityEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };

    this.buffer.unshift(fullEvent);
    if (this.buffer.length > this.maxSize) {
      this.buffer.pop();
    }

    this.subscribers.forEach(cb => cb(fullEvent));
    return fullEvent;
  }

  getRecent(limit: number = 100): ActivityEvent[] {
    return this.buffer.slice(0, limit);
  }

  subscribe(callback: (event: ActivityEvent) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }
}
```

**Acceptance Criteria:**
- [ ] ActivityEvent interface defined with all fields
- [ ] ActivityService with ring buffer (500 max)
- [ ] Subscribe/emit pattern working
- [ ] Unit tests passing

---

### Task A2: WebSocket Message Types

**Files to Modify:**
- `src/daemon/websocket/message-types.ts`

**Add Message Types:**

```typescript
// Activity event broadcast (daemon → client)
export interface ActivityEventMessage extends WSServerMessageBase {
  type: 'activity.event';
  event: ActivityEvent;
}

// Activity history request (client → daemon)
export interface ActivityHistoryRequestMessage extends WSClientMessageBase {
  type: 'activity.history';
  id: string;
  payload: {
    limit?: number;  // Default 100
  };
}

// Activity history response (daemon → client)
export interface ActivityHistoryResponseMessage extends WSServerMessageBase {
  type: 'activity.history.response';
  id: string;
  events: ActivityEvent[];
}
```

**Update Union Types:**
- Add to `WSServerMessage` union
- Add to `WSClientMessage` union
- Add type guard functions
- Add message creation helpers

**Acceptance Criteria:**
- [ ] Message types defined
- [ ] Type guards implemented
- [ ] Creation helpers implemented
- [ ] Validation updated

---

### Task A3: WebSocket Integration

**Files to Modify:**
- `src/daemon/websocket/server.ts`
- `src/daemon/websocket/protocol.ts`

**Implementation:**

1. Inject `ActivityService` into WebSocket server
2. Subscribe to activity events and broadcast to all clients
3. Handle `activity.history` request - send recent events on client connect
4. Add handler in protocol for history requests

```typescript
// In FMDMWebSocketServer constructor or setDependencies:
this.activityService.subscribe((event) => {
  this.broadcastActivityEvent(event);
});

// New method:
private broadcastActivityEvent(event: ActivityEvent): void {
  const message: ActivityEventMessage = {
    type: 'activity.event',
    event
  };
  // Broadcast to all connected clients
  this.clients.forEach(({ ws }) => {
    this.sendToClient(ws, message);
  });
}
```

**Acceptance Criteria:**
- [ ] Activity events broadcast to all clients
- [ ] History request returns recent events
- [ ] New clients receive history on connect

---

### Task A4: Activity Capture Points

**Files to Modify:**
- `src/daemon/services/folder-indexing-queue.ts` (indexing events)
- `src/daemon/websocket/server.ts` (connection events)
- `src/daemon/services/model-download-manager.ts` (model events)
- `src/daemon/rest/server.ts` (MCP/REST endpoint events)
- `src/daemon/index.ts` (daemon lifecycle events)

**Events to Emit by File:**

**folder-indexing-queue.ts:**
| Event | Message | Details (expanded) |
|-------|---------|-------------------|
| Indexing started | `Indexing ~/Documents (847 files)` | Path, file count, types breakdown |
| Indexing progress | `Indexing ~/Documents` + progress | Current file, speed, type stats |
| Indexing complete | `Indexed ~/Documents (847 files, 2m 15s)` | Duration, types, chunks, skipped, size |
| Indexing failed | `Indexing failed: ~/Documents - Permission denied` | Error, path, suggestion |
| File added | `New: report-final.pdf` | Path, size, type |
| File modified | `Changed: quarterly-budget.xlsx` | Path, size change, re-indexed chunks |
| File deleted | `Removed: old-draft.docx` | Path, removed chunks |

**websocket/server.ts:**
| Event | Message | Details (expanded) |
|-------|---------|-------------------|
| MCP client connected | `Claude Desktop connected` | Client version, protocol, session ID |
| MCP client disconnected | `Cursor disconnected` | Duration, requests served |
| TUI connected (Debug) | `TUI client connected` | Connection type, session ID |
| TUI disconnected (Debug) | `TUI client disconnected` | Duration, clean shutdown |

**model-download-manager.ts:**
| Event | Message | Details (expanded) |
|-------|---------|-------------------|
| Download started | `Downloading bge-m3 (1.2 GB)` | Model, size, source, destination |
| Download progress | `Downloading bge-m3` + progress | Downloaded, speed, ETA |
| Download complete | `Model ready: bge-m3` | Size, duration, verification |
| Download failed | `Download failed: bge-m3 - Network timeout` | Error, progress, retry info |

**rest/server.ts (MCP/LLM interactions):**
| Event | Message | Details (expanded) |
|-------|---------|-------------------|
| Search query | `Claude: Search "Q4 budget report"` | Full query, client, folder, time |
| Search results (Verbose) | `  → 5 results in ~/Documents` | Top matches with scores, threshold, time |
| Document opened | `Claude: Opened quarterly-summary.pdf` | Document, path, size, pages |
| Document text (Verbose) | `  → 2,450 chars from quarterly-summary.pdf` | Characters, chunks, response time |
| Chunks retrieved (Verbose) | `  → 3 chunks from report.pdf` | Chunk IDs, chars, source |
| Folder explored (Verbose) | `Claude: Browsing ~/Documents/Reports` | Path, files, subdirs |
| Document list (Verbose) | `Claude: Listed 12 docs in ~/Projects` | Folder, doc breakdown, response time |

**daemon/index.ts:**
| Event | Message | Details (expanded) |
|-------|---------|-------------------|
| Daemon started | `Daemon started (v1.2.3)` | Version, port, PID, model, folders |
| Daemon stopping | `Daemon shutting down...` | Reason, uptime, requests served |

**Acceptance Criteria:**
- [ ] Indexing lifecycle emits events with full details
- [ ] Connection events captured with session info
- [ ] Model events captured with download stats
- [ ] MCP/REST endpoint calls emit events with client attribution
- [ ] All events include `details[]` array for expanded view
- [ ] All events appear in activity stream

---

### 🛑 HUMAN SAFETY STOP #1: Complete Data Flow Verification

**Critical Checkpoint**: Before ANY TUI work, verify the complete data pipeline works.

**Test Procedure:**

1. **Start daemon**: `npm run daemon:restart`
2. **Connect WebSocket test script** (TMOAT):
   ```bash
   node TMOAT/scripts/websocket-activity-test.js
   ```
3. **Trigger activities** and verify ALL data is captured:
   - [ ] Add a folder → See `Indexing started` with details
   - [ ] Wait for indexing → See progress events with details
   - [ ] Indexing completes → See completion event with full stats
   - [ ] Request history → Receive all recent events

**Verification Checklist:**

| Data Field | Verify Present | Example |
|------------|---------------|---------|
| `id` | ✓ UUID | `a1b2c3d4-...` |
| `timestamp` | ✓ ISO string | `2024-01-15T14:32:05.123Z` |
| `type` | ✓ Valid type | `indexing`, `search`, etc. |
| `level` | ✓ Valid level | `info`, `success`, `warning`, `error` |
| `message` | ✓ Formatted | `Indexed ~/Documents (847 files, 2m 15s)` |
| `progress` | ✓ When applicable | `47` (number 0-100) |
| `userInitiated` | ✓ Boolean | `true` (user action) or `false` (routine) |
| `details` | ✓ Array of strings | `["Duration: 2m 15s", "Files: 847"]` |

**Human Action Required:**
- [ ] Confirm WebSocket receives `activity.event` messages
- [ ] Confirm ALL fields are populated correctly
- [ ] Confirm `details[]` contains useful expanded info
- [ ] Confirm `activity.history` returns recent events
- [ ] Share sample JSON of received events
- [ ] Report any missing data or issues

**DO NOT PROCEED TO PHASE B** until all data is verified complete.

---

## Phase B: TUI Visualization

**Goal**: Build read-only display of the verified activity data stream.

**Prerequisites**: Phase A complete, all data fields verified via HUMAN SAFETY STOP #1.

---

### Task B1: ActivityLogItem Component

**Files to Create:**
- `src/interfaces/tui-ink/components/core/ActivityLogItem.ts`

**Design:**
Read-only visualization of `ActivityEvent` data. Extend or adapt `LogItem` to display:
- Type icon (emoji with 2-char width handling, fallback to symbol)
- Time in `HH:MM:SS` format
- Message (truncatable)
- ProgressBar or status icon
- Expandable details

**Implementation Notes:**

```typescript
export class ActivityLogItem implements IListItem {
  readonly selfConstrained = true as const;
  readonly isNavigable = true;
  private _isExpanded: boolean = false;

  constructor(
    private event: ActivityEvent,  // Read-only data from daemon
    public isActive: boolean = false,
    private useEmoji: boolean = true
  ) {}

  private getIcon(): { icon: string; width: number } {
    const EMOJI_ICONS = {
      indexing: { icon: '📁', width: 2 },
      search: { icon: '🔍', width: 2 },
      connection: { icon: '🔌', width: 2 },
      model: { icon: '🧠', width: 2 },
      system: { icon: '⚙️', width: 2 },
      error: { icon: '❌', width: 2 },
    };

    const SYMBOL_ICONS = {
      indexing: { icon: '▣', width: 1 },
      search: { icon: '◎', width: 1 },
      connection: { icon: '↔', width: 1 },
      model: { icon: '◈', width: 1 },
      system: { icon: '●', width: 1 },
      error: { icon: '✗', width: 1 },
    };

    return this.useEmoji ? EMOJI_ICONS[this.event.type] : SYMBOL_ICONS[this.event.type];
  }

  private formatTime(): string {
    const d = this.event.timestamp;
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  }

  // Expand/collapse for details (from LogItem pattern)
  onExpand(): void { this._isExpanded = true; }
  onCollapse(): boolean {
    if (this._isExpanded) { this._isExpanded = false; return true; }
    return false;
  }

  render(maxWidth: number): ReactElement | ReactElement[] {
    // Collapsed: Icon + time + message + progress
    // Expanded: + details lines with │ └ connectors
    // Account for emoji width in calculations
  }
}
```

**Acceptance Criteria:**
- [ ] Displays icon, time, message, progress correctly
- [ ] Handles emoji width (2 chars) in layout
- [ ] Falls back to symbols if configured
- [ ] Uses existing ProgressBar component
- [ ] Truncates message cleanly
- [ ] Expand/collapse shows `details[]` from event data

---

### Task B2: ActivityLogPanel Component

**Files to Create:**
- `src/interfaces/tui-ink/components/panels/ActivityLogPanel.tsx`

**Design:**
Use `GenericListPanel` pattern with:
- List of `ActivityLogItem` components
- Real-time updates via WebSocket subscription
- Navigation-aware event insertion
- **No filtering initially** - show everything (Full mode)

```typescript
export function ActivityLogPanel({
  hasFocus,
  width,
  height,
}: ActivityLogPanelProps): ReactElement {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Subscribe to WebSocket events
  useEffect(() => {
    // Get initial history
    requestActivityHistory();

    // Subscribe to new events
    const unsubscribe = subscribeToActivityEvents((event) => {
      setEvents(prev => {
        const newEvents = [event, ...prev].slice(0, 100);
        // If user is scrolled down, increment their index
        if (selectedIndex > 0) {
          setSelectedIndex(i => i + 1);
        }
        return newEvents;
      });
    });

    return unsubscribe;
  }, []);

  // NO FILTERING - show everything initially
  // Convert to ActivityLogItem instances
  const items = events.map((event, index) =>
    new ActivityLogItem(event, index === selectedIndex)
  );

  return (
    <GenericListPanel
      items={items}
      hasFocus={hasFocus}
      // ...
    />
  );
}
```

**Acceptance Criteria:**
- [ ] Displays ALL activity events from daemon (no filtering)
- [ ] Receives real-time updates via WebSocket
- [ ] Navigation works correctly
- [ ] Handles new events while user is scrolled

---

### Task B3: Integration

**Files to Modify:**
- Main navigation (add Activity Log tab)

**Wire Up:**
1. Add Activity Log panel to main navigation
2. Ensure tab switching works correctly
3. Verify real-time updates work

**Note**: No verbosity setting yet. We observe real usage first, then decide what to filter.

**Acceptance Criteria:**
- [ ] Activity Log tab appears in navigation
- [ ] All events display in real-time
- [ ] Tab switching works correctly

---

### Future: Log Level Setting (Post-Observation)

After observing real usage in the TUI, we can add:
- "Log Level" setting with options: Full, Important
- "Important" mode filters to `userInitiated: true` events only
- This is **deferred** until we see what's actually noise

---

### 🛑 HUMAN SAFETY STOP #2: Full Integration Test

**Complete end-to-end verification:**

1. Fresh daemon start: `npm run daemon:restart`
2. Run TUI: `npm run tui`
3. Navigate to Activity Log tab
4. Trigger activities and watch the log

**Human Action Required:**
- [ ] Screenshot of Activity Log panel during indexing (showing progress)
- [ ] Screenshot of expanded event showing details
- [ ] Screenshot after indexing complete
- [ ] Verify ALL events are showing (no filtering yet)
- [ ] Report any visual glitches (especially emoji width issues)
- [ ] Report any missing data or timing issues
- [ ] **Identify which events feel like "noise"** → inform future filtering

---

## Testing Checklist

### Unit Tests
- [ ] ActivityService ring buffer behavior
- [ ] ActivityEvent serialization (including `userInitiated` field)
- [ ] Message type validation
- [ ] Time formatting

### Integration Tests
- [ ] WebSocket activity broadcast
- [ ] History request/response
- [ ] Event capture from indexing
- [ ] Event capture from connections
- [ ] Event capture from MCP/LLM interactions

### Manual Testing (with Human Screenshots)
- [ ] Emoji rendering in various terminals
- [ ] Layout at different panel widths
- [ ] Progress bar animation
- [ ] Scroll behavior with incoming events
- [ ] Expand/collapse behavior with details

---

## Files Summary

### Phase A: Daemon (New Files)
- `src/daemon/models/activity-event.ts` - Data model
- `src/daemon/services/activity-service.ts` - Ring buffer + pub/sub
- `TMOAT/scripts/websocket-activity-test.js` - Verification script

### Phase A: Daemon (Modified Files)
- `src/daemon/websocket/message-types.ts` - Add activity messages
- `src/daemon/websocket/server.ts` - Broadcast activity events
- `src/daemon/websocket/protocol.ts` - Handle history requests
- `src/daemon/services/folder-indexing-queue.ts` - Emit indexing events
- `src/daemon/services/model-download-manager.ts` - Emit model events
- `src/daemon/rest/server.ts` - Emit MCP/LLM interaction events
- `src/daemon/index.ts` - DI setup + lifecycle events

### Phase B: TUI (New Files)
- `src/interfaces/tui-ink/components/core/ActivityLogItem.ts`
- `src/interfaces/tui-ink/components/panels/ActivityLogPanel.tsx`

### Phase B: TUI (Modified Files)
- Main navigation (add Activity Log tab)

### Future (Deferred)
- Settings panel (log level option) - after observing real usage
- `src/interfaces/tui-ink/models/settingsData.ts` - for log level setting

---

## Success Criteria

### Phase A Success (Data Flow)
- [ ] ActivityService captures ALL events from all sources
- [ ] Events include `userInitiated: boolean` field
- [ ] Events include complete `details[]` for expanded view
- [ ] WebSocket broadcasts `activity.event` in real-time
- [ ] `activity.history` returns buffered events (up to 500)
- [ ] TMOAT verification script confirms all data fields

### Phase B Success (TUI)
- [ ] Activity Log screen displays ALL real-time daemon events
- [ ] Events show correct icons, times, messages, and progress
- [ ] Expand/collapse shows details from event data
- [ ] Navigation works smoothly even as new events arrive
- [ ] No visual glitches with emoji icons
- [ ] All existing TUI functionality still works

### Future (Post-Observation)
- [ ] Identify which events are "noise" from real usage
- [ ] Implement "Important" filter based on observations
