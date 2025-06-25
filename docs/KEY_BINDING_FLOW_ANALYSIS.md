# Key Binding Flow Analysis

## Overview
The key binding system in the TUI consists of three main services working together to manage keyboard input routing and display available shortcuts in the status bar.

## Core Services

### 1. FocusChainService
**File**: `src/interfaces/tui-ink/services/FocusChainService.ts`
- Manages UI element hierarchy (parent-child relationships)
- Tracks active element (only one at a time)
- Builds focus chain from active element to root
- Key methods:
  - `setActive(elementId)` - Sets the active element
  - `getFocusChain()` - Returns [active, ...ancestors]
  - `isInFocusChain(elementId)` - Checks if element is in active chain

### 2. InputContextService
**File**: `src/interfaces/tui-ink/services/InputContextService.ts`
- Central registry for input handlers
- Associates key bindings with handlers
- Routes input based on priority
- Key components:
  - `handlers: Map<string, RegisteredHandler>` - All registered handlers
  - `changeListeners: Set<() => void>` - Notification system
  - Priority system: Higher numbers process first

### 3. StatusBar Component
**File**: `src/interfaces/tui-ink/components/StatusBar.tsx`
- Displays active key bindings
- Listens for changes from InputContextService
- Updates dynamically as focus changes

## Registration Flow

### Step 1: Component Registration
Components use `useFocusChain` hook to register:

```typescript
// From ConfigurationPanelSimple.tsx:201-214
useFocusChain({
    elementId: 'config-panel',
    parentId: 'navigation',
    isActive: navigation.isConfigFocused,
    onInput: handleConfigInput,
    keyBindings: [/* context-specific bindings */],
    priority: 50 // or 1000 for modal states
});
```

### Step 2: Hook Processing
The `useFocusChain` hook (`src/interfaces/tui-ink/hooks/useFocusChain.ts`):
1. Registers parent-child relationship (lines 36-38)
2. Updates active state (lines 49-56)
3. Registers handler with InputContextService (lines 59-65)

### Step 3: Service Updates
InputContextService:
1. Stores handler with metadata (lines 70-78)
2. Notifies all change listeners (lines 30-51)
3. StatusBar receives notification and updates

## Priority System

| Priority | Use Case | Example |
|----------|----------|---------|
| 1000+ | Modal/Edit states | Text input editing |
| 50-100 | Panel handlers | Configuration panel navigation |
| 10-20 | Navigation | Global navigation |
| -100 | App-level | Quit command |

## Key Binding Resolution

### Current Implementation (PROBLEMATIC)
In `InputContextService.getActiveKeyBindings()` (lines 110-151):

1. **High Priority Mode Check** (lines 116-130):
   - If any handler has priority ≥ 1000, show only its bindings
   - Problem: This breaks when config panel is focused but not in edit mode

2. **Fallback Collection** (lines 133-145):
   - Collects bindings from ALL handlers
   - Removes duplicates by key
   - Problem: Shows bindings from inactive components

### The Core Issue
The current implementation has two modes:
1. High-priority only (edit mode)
2. Show everything (normal mode)

This doesn't respect the focus chain - it should show bindings from:
- The active element
- Its ancestors in the focus chain
- Global handlers (low priority)

## Input Processing Flow

1. **Root Capture**: `useRootInput` captures all keyboard input
2. **Routing**: InputContextService sorts handlers by priority
3. **Processing**: Each handler tried until one returns `true`
4. **Propagation**: Unhandled input continues down the chain

## Example: Edit Mode Transition

1. User presses Enter on config item
2. ConfigurationPanelSimple enters edit mode
3. Re-registers with:
   - Edit-specific key bindings
   - High priority (1000)
4. StatusBar updates to show only edit bindings
5. All input routed to edit handler first

## Architecture Problems

1. **No Focus Chain Awareness**: `getActiveKeyBindings()` doesn't use focus chain
2. **Binary Priority System**: Either high-priority or everything
3. **Timing Issues**: Components register at different React lifecycle phases
4. **No Context Isolation**: Can't have nested input contexts

## Proposed Solution

Replace current `getActiveKeyBindings()` with focus-chain-aware implementation:
1. Get active element from FocusChainService
2. Get focus chain (active + ancestors)
3. Collect bindings from handlers in focus chain
4. Add global handlers (priority < 0)
5. Remove duplicates, respecting priority