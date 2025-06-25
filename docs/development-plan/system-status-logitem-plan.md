# System Status Panel - LogItem Implementation Plan

## Objective
Replace the current System Status panel with a new implementation built from the ground up using LogItem components, proving the generic framework can create complete panels with zero errors.

## Current State Analysis

### Existing System Status
- Uses `statusItems` array with `{ text: string, status: string }` format
- Simple list display with status indicators (✓, ⚠, ⋯, '')
- No expandable functionality
- Uses StatusItemLayout for rendering

### Target State
- Convert status items to LogEntry format
- Use LogItem components for rich, expandable display
- Leverage ExpandableDataPanel for complete functionality
- Maintain visual consistency while adding expand capabilities

## Object Hierarchy Design

```
SystemStatusLogPanel
├── ThemeProvider (context)
├── ExpandableDataPanel
│   ├── Panel (core component)
│   │   ├── BorderedBox
│   │   │   ├── Title: "System Status"
│   │   │   ├── Subtitle: "Current state"
│   │   │   └── Scrollbar
│   │   └── ScrollableList
│   │       └── [LogItem components]
│   │           ├── ExpandableListItem
│   │           │   ├── Collapsed: Icon + Timestamp + Message
│   │           │   └── Expanded: Details + Metadata
│   │           └── Theme-aware styling
│   └── Expansion State Management
│       ├── expandedItems: Set<number>
│       ├── Keyboard handling (Enter to expand)
│       └── Height calculations
└── Data Transformation
    ├── statusItemsToLogEntries()
    └── Dynamic log generation
```

## Data Model Transformation

### From StatusItem:
```typescript
interface StatusItem {
    text: string;
    status: string;
}
```

### To LogEntry:
```typescript
interface LogEntry {
    id: string;
    timestamp: Date;
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    details?: string;
    stackTrace?: string;
    metadata?: Record<string, any>;
    source?: string;
}
```

### Transformation Logic:
1. **Status mapping**:
   - '✓' → level: 'info', add success details
   - '⚠' → level: 'warn', add warning context
   - '⋯' → level: 'debug', add progress info
   - '' → level: 'info', standard message

2. **Message extraction**:
   - Parse metrics (e.g., "Memory usage: 1.2GB / 8GB")
   - Extract values for metadata
   - Create meaningful details for expansion

3. **Timestamp generation**:
   - Use relative times for recent events
   - Fixed times for system startup events

## Implementation Steps

### Step 1: Create Status-to-Log Transformer
```typescript
// src/interfaces/tui-ink/utils/statusToLog.ts
export function statusItemToLogEntry(
    item: StatusItem, 
    index: number,
    baseTime: Date = new Date()
): LogEntry
```

### Step 2: Create SystemStatusLogPanel Component
```typescript
// src/interfaces/tui-ink/components/SystemStatusLogPanel.tsx
export const SystemStatusLogPanel: React.FC<{
    width?: number;
    height?: number;
}>
```

### Step 3: Implement Smart Log Details
- Memory usage → Show breakdown in metadata
- Network status → Connection details
- Processing queue → Queue statistics
- Error count → Recent error list (if any)

### Step 4: Add Real-time Updates
- Periodic refresh of status items
- Smooth updates without losing expansion state
- Visual indicators for changes

### Step 5: Integration Testing
- Replace StatusPanel in main app
- Verify all interactions work
- Test edge cases (empty status, many items)

## Key Features to Implement

1. **Smart Details Generation**:
   - Parse status text for meaningful data
   - Generate relevant expanded content
   - Show actionable information

2. **Visual Consistency**:
   - Match current icon styles
   - Preserve color coding
   - Maintain panel dimensions

3. **Enhanced Functionality**:
   - Expandable details for each item
   - Keyboard navigation
   - Search/filter capability (future)

4. **Performance**:
   - Efficient re-rendering
   - Smooth expansion animations
   - Handle large status lists

## Success Criteria

1. **Zero Errors**:
   - No TypeScript errors
   - No runtime errors
   - No visual glitches

2. **Feature Parity**:
   - All current status items display correctly
   - Visual appearance matches original
   - Scrolling works identically

3. **Enhanced UX**:
   - Expand/collapse works smoothly
   - Meaningful details in expanded view
   - Keyboard navigation intuitive

4. **Code Quality**:
   - Uses only generic framework components
   - No custom hacks or workarounds
   - Clean, maintainable implementation

## Testing Plan

1. **Unit Tests**:
   - Status to log transformation
   - Edge cases (empty status, null values)

2. **Visual Tests**:
   - Compare collapsed view to original
   - Verify expanded content displays correctly
   - Test at various terminal sizes

3. **Integration Tests**:
   - Full app with new panel
   - Navigation between panels
   - Memory/performance monitoring

4. **User Acceptance**:
   - Smooth interaction feel
   - Useful expanded information
   - No regression in functionality