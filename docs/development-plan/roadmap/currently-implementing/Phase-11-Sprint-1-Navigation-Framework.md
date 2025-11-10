# Phase 11, Sprint 1: Navigation Framework Implementation

**Phase**: 11 - TUI Rebuild & Professional Interface
**Sprint**: 1 - Navigation Framework
**Status**: In Progress
**Start Date**: 2025-11-09

## Related Documentation
- [Phase 11 Overview](../folder-mcp-roadmap-1.1.md#phase-11-tui-rebuild--professional-interface)
- [TUI Architecture Summary](../../design/TUI_ARCHITECTURE_SUMMARY.md)
- [TUI Component Visual Guide](../../design/TUI_COMPONENT_VISUAL_GUIDE.md)
- [TUI Layout Design](../../design/tui-screen-layouts.md)

---

## Sprint Overview

### Goals
Transform the TUI from a fixed two-panel layout into a navigation-driven multi-panel system that supports:
- Navigation panel with selectable items (Manage Folders, Demo Controls)
- Dynamic content panel that switches based on navigation selection
- Responsive layouts for both landscape and portrait orientations
- Keyboard shortcuts for direct panel access

### Scope
- ✅ **In Scope**: Navigation framework, panel switching, responsive navigation layouts
- ❌ **Out of Scope**: Additional panels beyond Manage Folders and Demo Controls, remote access features, cloud configuration

### Approach: Visual Validation Methodology
Due to the interactive nature of TUI development and the agent's inability to run terminal applications, we use a **step-by-step visual validation approach**:

1. **Agent implements minimal change** (one visual element at a time)
2. **Agent builds the code** (`npm run build`)
3. **Human runs TUI** (`npm run tui`) and verifies specific change
4. **Human provides feedback** (looks good / has issue / completely broken)
5. **Agent proceeds** (next step / fix issue / rollback change)

This approach ensures:
- **Safety**: Small changes are easy to debug and rollback
- **Visibility**: Human sees and approves every visual change
- **Quality**: Responsive design stays intact throughout
- **Control**: Human gates all progress with visual confirmation

---

## Architecture Summary

### Current State
```
┌─────────────────────────────────────┐
│ Header (daemon status)              │
├──────────────────┬──────────────────┤
│ Main Panel       │ System Status    │
│ (Config items)   │ (Demo controls)  │
│                  │                  │
└──────────────────┴──────────────────┘
│ Footer (keybindings)                │
└─────────────────────────────────────┘
```

### Target State (Landscape)
```
┌─────────────────────────────────────┐
│ Header (daemon status)              │
├────┬────────────────────────────────┤
│Nav │ Content Panel                  │
│15% │ 85%                            │
│📁  │ [Active panel content]         │
│🎛️  │                                │
│    │                                │
└────┴────────────────────────────────┘
│ Footer (keybindings)                │
└─────────────────────────────────────┘
```

### Target State (Portrait)
```
┌─────────────────────────────────────┐
│ Header (daemon status)              │
├─────────────────────────────────────┤
│ Nav: [📁 Folders] [🎛️ Demo]        │
├─────────────────────────────────────┤
│ Content Panel                       │
│ [Active panel content]              │
│                                     │
└─────────────────────────────────────┘
│ Footer (keybindings)                │
└─────────────────────────────────────┘
```

### Key Design Decisions

1. **Navigation Position**:
   - Landscape: Vertical list on left (15% width)
   - Portrait: Horizontal row below header (3 lines height)

2. **Panel Switching**:
   - Event-driven: Navigation emits selection events
   - AppFullscreen handles panel switching
   - Instant switching (no animations)

3. **State Management**:
   - `activePanelId` lives in NavigationContext
   - All panel data comes from FMDM via WebSocket
   - No local panel state to preserve

4. **Responsive Breakpoints**:
   - Wide/Narrow: 100 columns
   - Low Resolution: 25 rows
   - Navigation adapts layout based on available space

---

## Critical Architecture Findings: Focus Chain & Generic Patterns

### StatusBar and Tab Indicator - ALREADY GENERIC ✅

**Investigation Date**: 2025-11-09

**Key Finding**: The TUI architecture is exceptionally well-designed. StatusBar keybindings and the `⁽ᵗᵃᵇ⁾` tab indicator are **already fully generic** and require NO refactoring.

### 1. StatusBar Keybinding System (GENERIC)

**How it Works:**
- StatusBar uses `InputContextService.getFocusAwareKeyBindings()` method
- This method **automatically** shows keybindings for whatever panel is currently focused
- No hardcoded panel-specific logic exists
- Completely dynamic based on focus chain state

**Implementation:**
```typescript
// StatusBar.tsx
const bindings = inputContextService.getFocusAwareKeyBindings();
// Automatically shows correct bindings for focused panel
```

**Key Features:**
- ✅ Modal-aware (shows only modal bindings when priority >= 1000)
- ✅ Focus chain aware (collects bindings from focused element + ancestors)
- ✅ Global handler support (includes handlers with priority < 0)
- ✅ Automatic deduplication (prevents duplicate keys)
- ✅ Change listeners (StatusBar updates automatically when focus changes)

### 2. Tab Indicator `⁽ᵗᵃᵇ⁾` Logic (GENERIC)

**How it Works:**
- Implemented in `BorderedBox.tsx` (lines 56-68)
- Shows `⁽ᵗᵃᵇ⁾` indicator when `focused={false}`
- Hides indicator when `focused={true}`
- Works for **any panel** that uses BorderedBox

**Implementation:**
```typescript
const createTopBorder = () => {
    if (focused) {
        // Focused: show only title
        return `${border.topLeft}${border.horizontal} ${title} ...${border.topRight}`;
    } else {
        // Not focused: show title + ⁽ᵗᵃᵇ⁾
        const tabText = '⁽ᵗᵃᵇ⁾';
        return `${border.topLeft}${border.horizontal} ${title} ... ${tabText} ${border.topRight}`;
    }
};
```

**Status**: ✅ No panel-specific logic, works universally

### 3. Focus Chain Registration Pattern (FOR ALL PANELS)

**Standard Pattern:**
```typescript
const MyPanel: React.FC<MyPanelProps> = ({
    elementId,      // Unique panel identifier
    parentId,       // Parent in focus hierarchy
    isFocused,      // Current focus state
    onInput         // Input handler callback
}) => {
    // 1. Define what keys this panel responds to
    const keyBindings: IKeyBinding[] = [
        { key: '↑↓', description: 'Navigate' },
        { key: 'Enter', description: 'Select' }
    ];

    // 2. Implement input handler
    const handleInput = useCallback((input: string, key: Key): boolean => {
        if (!isFocused) return false;
        // Handle keyboard input
        return true; // Return true if consumed
    }, [isFocused]);

    // 3. Register with focus chain
    useFocusChain({
        elementId,
        parentId,
        isActive: isFocused,
        keyBindings,        // ← StatusBar reads these automatically
        onInput: handleInput,
        priority: 100
    });

    // 4. Render with BorderedBox (gets ⁽ᵗᵃᵇ⁾ automatically)
    return (
        <BorderedBox
            title="Panel Title"
            focused={isFocused}  // ← Controls ⁽ᵗᵃᵇ⁾ indicator
            width={width}
            height={height}
        >
            {/* Content */}
        </BorderedBox>
    );
};
```

### 4. Orientation-Aware Keybindings (PATTERN)

**For NavigationPanel (and future panels with orientation awareness):**
```typescript
const keyBindings: IKeyBinding[] = orientation === 'landscape'
    ? [{ key: '↑↓', description: 'Navigate' }]   // Landscape: up/down
    : [{ key: '←→', description: 'Navigate' }];  // Portrait: left/right

// StatusBar will automatically show correct bindings based on orientation
```

### 5. Automatic StatusBar Updates (THE MAGIC)

**How StatusBar Updates When Focus Changes:**
1. Panel focuses → `useFocusChain` called with `isActive: true`
2. `focusChainService.setActive(elementId)` updates active element
3. Panel's `handleInput` registered with its `keyBindings`
4. `inputContextService.registerHandler()` → **notifies all listeners**
5. StatusBar's change listener fires → calls `setKeyBindings()`
6. StatusBar re-renders with new bindings

**This is completely automatic - zero manual StatusBar updates needed!**

### 6. What NavigationPanel Needs (FOLLOW THE PATTERN)

**Current State:**
- NavigationPanel exists visually but is NOT integrated with focus chain
- Does NOT use `useFocusChain` hook
- Does NOT register keybindings
- Does NOT implement input handler

**Required Changes:**
1. Use `useFocusChain` hook with proper parameters
2. Define `keyBindings` array (orientation-aware)
3. Implement `handleInput` callback
4. Pass `isFocused` from parent based on `activeContainer` state

**That's it!** StatusBar and tab indicator will work automatically.

### 7. Generic Pattern for Future Panels (5+ MORE PANELS)

**No custom StatusBar logic needed per panel!**
**No custom tab indicator logic needed per panel!**

**To add a new panel:**
1. Create component accepting `elementId`, `parentId`, `isFocused` props
2. Define `keyBindings` array for that panel's keys
3. Call `useFocusChain({ elementId, parentId, isActive: isFocused, keyBindings, onInput })`
4. Use `BorderedBox` with `focused={isFocused}` prop
5. StatusBar and `⁽ᵗᵃᵇ⁾` work automatically ✅

### 8. Architecture Quality Assessment

**Rating**: ⭐⭐⭐⭐⭐ Exceptional

**Strengths:**
- Fully generic and extensible
- Focus chain pattern is clean and well-separated
- StatusBar updates automatically via listener pattern
- Tab indicator tied to focus state, not hardcoded
- Orientation awareness supported
- No code duplication needed for new panels

**Conclusion**: The refactoring is **already complete**. NavigationPanel just needs to follow the existing pattern used by GenericListPanel.

---

## Implementation Plan: 12 Steps

### Step 1: Rename Panel Titles ✅
**Status**: [ ] Not Started

**Goal**: Rename existing panels to match final names without layout changes

**Changes**:
- Change "Main" title → "Manage Folders" in Main panel component
- Change "System Status" title → "Demo Controls" in System Status panel component
- No layout changes, no structural changes, just title strings

**Files Modified**:
- `src/interfaces/tui-ink/AppFullscreen.tsx` (or wherever panel titles are set)

**Verification Checklist**:
- [ ] TUI launches without errors
- [ ] Left panel shows "Manage Folders" title
- [ ] Right panel shows "Demo Controls" title
- [ ] All existing functionality still works
- [ ] No layout breakage in landscape mode
- [ ] No layout breakage in portrait mode

**Rollback**: Change title strings back to "Main" and "System Status"

---

### Step 2: Add Navigation State to Context ✅
**Status**: [ ] Not Started

**Goal**: Add infrastructure for tracking active panel without using it yet

**Changes**:
- Extend `NavigationContext` interface with:
  ```typescript
  activePanelId: string;  // 'folders' | 'demo'
  setActivePanel: (panelId: string) => void;
  ```
- Add state to `NavigationProvider` with default value `'folders'`
- No components consume this state yet
- No visual changes expected

**Files Modified**:
- `src/interfaces/tui-ink/contexts/NavigationContext.tsx`

**Verification Checklist**:
- [ ] TUI launches without errors
- [ ] No visual changes (exactly same as Step 1)
- [ ] TypeScript compiles without errors
- [ ] Context provides new state (check with React DevTools if available)

**Rollback**: Remove added state and method from context

---

### Step 3: Create Empty Navigation Panel ✅
**Status**: [ ] Not Started

**Goal**: Add placeholder navigation panel to layout with proper dimensions

**Changes**:
- Create `src/interfaces/tui-ink/components/NavigationPanel.tsx`:
  ```typescript
  interface NavigationPanelProps {
    width: number;
    height: number;
    isFocused: boolean;
    orientation: 'landscape' | 'portrait';
  }
  ```
- Render simple `BorderedBox` with title "Navigation" and static text "Items coming soon"
- Add to `AppFullscreen.tsx` layout:
  - Landscape: Show on left with 15% width
  - Portrait: Show on top with 3 lines height
- Adjust content area dimensions to accommodate navigation panel
- Keep both existing panels visible

**Files Created**:
- `src/interfaces/tui-ink/components/NavigationPanel.tsx`

**Files Modified**:
- `src/interfaces/tui-ink/AppFullscreen.tsx`
- `src/interfaces/tui-ink/components/LayoutContainer.tsx` (dimension calculations)

**Verification Checklist**:
- [ ] TUI launches without errors
- [ ] **Landscape mode**: Three panels visible (Navigation 15% left, Manage Folders, Demo Controls)
- [ ] **Portrait mode**: Navigation panel appears on top (horizontal, 3 lines)
- [ ] Navigation panel shows "Navigation" title
- [ ] Content panels still visible and functional
- [ ] No overlapping borders
- [ ] Dimensions calculate correctly at different terminal sizes

**Rollback**: Remove NavigationPanel from layout, restore original dimension calculations

---

### Step 4: Add Static Navigation Items ✅
**Status**: [ ] Not Started

**Goal**: Display navigation menu items without interactivity

**Changes**:
- Replace placeholder text in NavigationPanel with actual items:
  - **Landscape**: Vertical list with two items:
    - "📁 Manage Folders"
    - "🎛️ Demo Controls"
  - **Portrait**: Horizontal buttons (using `SimpleButtonsRow`) with same items
- No selection state, no highlighting, no input handling yet
- Items are just static visual elements

**Files Modified**:
- `src/interfaces/tui-ink/components/NavigationPanel.tsx`

**Verification Checklist**:
- [ ] **Landscape**: Two items appear vertically in navigation panel
- [ ] **Portrait**: Two items appear horizontally (button-like)
- [ ] Icons (📁, 🎛️) render correctly
- [ ] Text not truncated in landscape mode
- [ ] Items fit properly in portrait mode (not overlapping)
- [ ] No interaction possible yet (expected)

**Rollback**: Revert to placeholder "Items coming soon" text

---

### Step 5: Add Navigation Selection Visual ✅
**Status**: [ ] Not Started

**Goal**: Show visual indication of which panel is "active"

**Changes**:
- Add visual highlighting to first item ("📁 Manage Folders")
- Use focus border color or background color to indicate active item
- Hardcode selection to first item for now
- Still no interactivity, purely visual

**Files Modified**:
- `src/interfaces/tui-ink/components/NavigationPanel.tsx`

**Verification Checklist**:
- [ ] First item ("📁 Manage Folders") appears highlighted/selected
- [ ] Second item ("🎛️ Demo Controls") appears normal/unselected
- [ ] Highlighting visible in both landscape and portrait modes
- [ ] Highlighting uses appropriate theme color (focused border color)
- [ ] No keyboard interaction yet (expected)

**Rollback**: Remove highlighting styles, return to plain static items

---

### Step 6: Wire Navigation Input (Landscape) ✅
**Status**: [ ] Not Started

**Goal**: Make navigation items respond to arrow keys in landscape mode only

**Changes**:
- Add `selectedIndex` state to NavigationPanel (0 = first item, 1 = second item)
- Add keyboard input handler:
  - ↑ (Up Arrow): Move selection to previous item (with boundary check)
  - ↓ (Down Arrow): Move selection to next item (with boundary check)
- Update visual highlighting based on `selectedIndex`
- **Landscape mode only** - portrait mode stays static for now
- No panel switching yet, just selection visual feedback

**Files Modified**:
- `src/interfaces/tui-ink/components/NavigationPanel.tsx`

**Verification Checklist**:
- [ ] **Landscape mode**:
  - [ ] Pressing ↓ moves selection from "Manage Folders" to "Demo Controls"
  - [ ] Pressing ↑ moves selection from "Demo Controls" to "Manage Folders"
  - [ ] Selection stops at boundaries (no wrap-around)
  - [ ] Visual highlighting updates correctly
  - [ ] No errors in console
- [ ] **Portrait mode**: No changes (still static, expected)

**Rollback**: Remove keyboard handler and selectedIndex state

---

### Step 7: Wire Navigation Input (Portrait) ✅
**Status**: [ ] Not Started

**Goal**: Make navigation items respond to Left/Right arrows in portrait mode

**Changes**:
- Extend keyboard input handler for portrait mode:
  - ← (Left Arrow): Move selection to previous item
  - → (Right Arrow): Move selection to next item
- Update `SimpleButtonsRow` to show selection highlight
- Boundary checks apply (no wrap-around)

**Files Modified**:
- `src/interfaces/tui-ink/components/NavigationPanel.tsx`

**Verification Checklist**:
- [ ] **Portrait mode**:
  - [ ] Pressing → moves selection from "Manage Folders" to "Demo Controls"
  - [ ] Pressing ← moves selection from "Demo Controls" to "Manage Folders"
  - [ ] Selection stops at boundaries
  - [ ] Visual highlighting works in horizontal layout
- [ ] **Landscape mode**: Still works as in Step 6

**Rollback**: Remove portrait keyboard handling, keep landscape mode working

---

### Step 8: Hide "Demo Controls" Panel by Default ✅
**Status**: [ ] Not Started

**Goal**: Prepare for dynamic panel switching by showing only one content panel

**Changes**:
- Modify `AppFullscreen.tsx` to conditionally render content panels
- Show only "Manage Folders" panel initially
- Hide "Demo Controls" panel completely (not just minimized)
- Navigation still shows both items

**Files Modified**:
- `src/interfaces/tui-ink/AppFullscreen.tsx`

**Verification Checklist**:
- [ ] Navigation panel shows both items (📁 Manage Folders, 🎛️ Demo Controls)
- [ ] Content area shows only "Manage Folders" panel
- [ ] "Demo Controls" panel is not visible anywhere
- [ ] Layout still looks correct (no weird gaps)
- [ ] Manage Folders panel is fully functional

**Rollback**: Re-show Demo Controls panel alongside Manage Folders

---

### Step 9: Wire Panel Switching ✅
**Status**: [ ] Not Started

**Goal**: Make navigation selection actually switch between content panels

**Changes**:
- When navigation selection changes → call `setActivePanel(panelId)`
- When `activePanelId` changes → update which content panel is rendered
- Only one content panel visible at a time
- Panel switching logic:
  - Selection index 0 → `activePanelId = 'folders'` → Show Manage Folders
  - Selection index 1 → `activePanelId = 'demo'` → Show Demo Controls

**Files Modified**:
- `src/interfaces/tui-ink/components/NavigationPanel.tsx` (emit panel change)
- `src/interfaces/tui-ink/AppFullscreen.tsx` (respond to panel change)

**Verification Checklist**:
- [ ] Selecting "📁 Manage Folders" in navigation → shows Manage Folders panel
- [ ] Selecting "🎛️ Demo Controls" in navigation → shows Demo Controls panel
- [ ] Only one content panel visible at a time
- [ ] Panel switching works in both landscape and portrait modes
- [ ] FMDM data still displays correctly in Manage Folders panel
- [ ] Demo controls still function properly in Demo Controls panel
- [ ] No flickering or visual glitches during switch

**Rollback**: Disconnect panel switching, show only Manage Folders panel statically

---

### Step 10: Add Number Key Shortcuts ✅
**Status**: [ ] Not Started

**Goal**: Allow pressing "1" or "2" to directly switch panels from anywhere

**Changes**:
- Add global keyboard handler in `AppFullscreen.tsx`:
  - Press `1` → Switch to Manage Folders panel
  - Press `2` → Switch to Demo Controls panel
- Works regardless of which panel currently has focus
- Updates navigation selection to match

**Files Modified**:
- `src/interfaces/tui-ink/AppFullscreen.tsx`
- `src/interfaces/tui-ink/components/NavigationPanel.tsx` (accept external selection updates)

**Verification Checklist**:
- [ ] Pressing `1` switches to Manage Folders from any state
- [ ] Pressing `2` switches to Demo Controls from any state
- [ ] Navigation selection updates to match active panel
- [ ] Shortcuts work when navigation panel has focus
- [ ] Shortcuts work when content panel has focus
- [ ] No conflicts with existing keyboard shortcuts

**Rollback**: Remove number key handlers

---

### Step 11: Create Panel Registry ✅
**Status**: [ ] Not Started

**Goal**: Formalize panel definitions for future extensibility

**Changes**:
- Create `src/interfaces/tui-ink/PanelRegistry.ts`:
  ```typescript
  interface PanelDefinition {
    id: string;           // 'folders' | 'demo'
    label: string;        // Display name
    icon: string;         // Emoji or symbol
    shortcut: string;     // '1' | '2'
    component: React.FC<PanelProps>;
  }

  export const PANEL_REGISTRY: PanelDefinition[] = [
    { id: 'folders', label: 'Manage Folders', icon: '📁', shortcut: '1', component: ManageFoldersPanel },
    { id: 'demo', label: 'Demo Controls', icon: '🎛️', shortcut: '2', component: DemoControlsPanel }
  ];
  ```
- Refactor NavigationPanel to read from registry
- Refactor AppFullscreen to use registry for rendering
- No visual changes, pure code organization

**Files Created**:
- `src/interfaces/tui-ink/PanelRegistry.ts`

**Files Modified**:
- `src/interfaces/tui-ink/components/NavigationPanel.tsx`
- `src/interfaces/tui-ink/AppFullscreen.tsx`

**Verification Checklist**:
- [ ] TUI launches without errors
- [ ] Everything works exactly as in Step 10 (no visual changes)
- [ ] TypeScript compiles without errors
- [ ] Panel switching still works
- [ ] Number shortcuts still work

**Rollback**: Revert to hardcoded panel definitions

---

### Step 12: Comprehensive Responsiveness Verification ✅
**Status**: [ ] Not Started

**Goal**: Verify all responsive scenarios work correctly

**Changes**:
- No code changes
- Comprehensive testing phase

**Testing Scenarios**:

#### Landscape Mode (Terminal width > 100 cols)
- [ ] Navigation panel on left (15% width)
- [ ] Navigation items displayed vertically
- [ ] Content panel takes remaining width (85%)
- [ ] Border characters render correctly
- [ ] No text truncation in navigation items
- [ ] Panel switching works smoothly

#### Portrait Mode (Terminal width ≤ 100 cols)
- [ ] Navigation panel on top (3 lines height)
- [ ] Navigation items displayed horizontally
- [ ] Content panel below navigation
- [ ] SimpleButtonsRow renders correctly
- [ ] Items don't overlap in narrow terminals
- [ ] Panel switching works smoothly

#### Low Vertical Resolution (Terminal height < 25 rows)
- [ ] Navigation panel height adjusts appropriately
- [ ] Content panel still usable
- [ ] No overlapping elements
- [ ] Scrolling works if needed

#### Very Narrow (Terminal width < 60 cols)
- [ ] Navigation items truncate gracefully
- [ ] Icons still visible
- [ ] Panel switching still works
- [ ] No broken layout

#### Terminal Resize Behavior
- [ ] Switching from landscape → portrait adapts correctly
- [ ] Switching from portrait → landscape adapts correctly
- [ ] No crash or visual corruption during resize
- [ ] Active panel preserved during resize

#### Focus Management
- [ ] Tab key switches between navigation and content panels
- [ ] Navigation panel shows focus indication when active
- [ ] Content panel shows focus indication when active
- [ ] Number keys (1, 2) work from any focus state

#### FMDM Data Display
- [ ] Folder data displays correctly in Manage Folders panel
- [ ] Demo controls display correctly in Demo Controls panel
- [ ] WebSocket updates reflect in active panel
- [ ] No data loss when switching panels

**Issues Found**: (Document any issues discovered during testing)

**Fixes Applied**: (Document any fixes made)

**Final Verification**: [ ] All scenarios pass

---

## Success Criteria

At completion of Sprint 1, the following must be true:

### Functional Requirements
- ✅ Navigation panel displays with two items (Manage Folders, Demo Controls)
- ✅ Navigation adapts layout for landscape (vertical) and portrait (horizontal)
- ✅ Content panel switches based on navigation selection
- ✅ Keyboard navigation works (arrows for selection, Enter optional)
- ✅ Number shortcuts work (1 = Folders, 2 = Demo)
- ✅ Tab key switches focus between navigation and content
- ✅ Only one content panel visible at a time

### Non-Functional Requirements
- ✅ Responsive design maintains quality across terminal sizes
- ✅ No visual glitches or flickering during panel switching
- ✅ FMDM data continues to flow correctly to panels
- ✅ Existing functionality in both panels preserved
- ✅ TypeScript compilation succeeds with no errors
- ✅ `npm run build` succeeds
- ✅ `npm run tui` launches without errors

### Code Quality Requirements
- ✅ Panel registry system implemented for extensibility
- ✅ Clean separation between navigation and content components
- ✅ Proper focus management via NavigationContext
- ✅ Follows existing TUI component patterns
- ✅ Responsive behavior uses existing responsive utilities

---

## Risk Mitigation

### Identified Risks

1. **Layout Breakage**
   - **Risk**: Dimension calculations incorrect, causing overlapping panels or broken borders
   - **Mitigation**: Step-by-step verification with human visual confirmation
   - **Rollback**: Each step has explicit rollback procedure

2. **Focus Management Conflicts**
   - **Risk**: Tab key or arrow keys stop working correctly
   - **Mitigation**: Test focus behavior at each step
   - **Rollback**: Revert to previous focus handling logic

3. **Responsive Design Regression**
   - **Risk**: Breaking existing responsive behavior when adding navigation panel
   - **Mitigation**: Test both orientations at each step, comprehensive testing in Step 12
   - **Rollback**: Step 3 includes dimension adjustment rollback

4. **FMDM Data Flow Interruption**
   - **Risk**: Panel switching breaks WebSocket updates
   - **Mitigation**: Verify FMDM data displays correctly throughout implementation
   - **Rollback**: Keep existing panels accessible for fallback

5. **Terminal Rendering Issues**
   - **Risk**: Special characters (icons) render incorrectly in some terminals
   - **Mitigation**: Human verifies icon rendering in Step 4
   - **Fallback**: Use ASCII characters instead of emojis if needed

---

## Process Flow

### Agent Workflow
```
1. Implement minimal change (one step)
   ↓
2. Run `npm run build`
   ↓
3. Check for compilation errors
   ↓
4. Announce: "Step X ready for verification"
   ↓
5. Wait for human feedback
   ↓
6. Respond to feedback:
   - "Looks good" → Proceed to next step
   - "Has issue" → Fix and rebuild
   - "Broken" → Rollback and rethink
```

### Human Workflow
```
1. See announcement: "Step X ready"
   ↓
2. Run `npm run tui`
   ↓
3. Check verification checklist items
   ↓
4. Provide feedback:
   - "Looks good" → Agent continues
   - "I see [problem]" → Agent fixes
   - Screenshot if helpful
   ↓
5. Confirm fix or approve to proceed
```

### Feedback Format

**Good Feedback Examples**:
- ✅ "Looks good, proceed to next step"
- ✅ "Navigation items show correctly but icons are missing"
- ✅ "In portrait mode, the navigation panel overlaps the content"
- ✅ "Step works in landscape but broken in portrait (see screenshot)"

**Less Helpful Feedback**:
- ❌ "Broken" (not specific enough)
- ❌ "Something is wrong with the layout" (what specifically?)

---

## Future Extensibility

After Sprint 1 completion, adding new panels is straightforward:

1. Create panel component implementing `PanelProps` interface
2. Add entry to `PANEL_REGISTRY` in `PanelRegistry.ts`:
   ```typescript
   {
     id: 'logs',
     label: 'Live Logs',
     icon: '📋',
     shortcut: '3',
     component: LiveLogsPanel
   }
   ```
3. Navigation automatically includes new panel
4. Number shortcut automatically works

**Future Panels (Out of Scope for Sprint 1)**:
- Remote Access configuration
- MCP Setup
- Live Logs viewer
- Settings panel

---

## Notes

### Development Environment
- **TUI Testing**: Human must run `npm run tui` in real terminal (agent cannot run interactive apps)
- **Build Verification**: Agent runs `npm run build` to check compilation
- **Debugging**: Use `console.error()` for debug logs (stdout reserved for Ink rendering)

### Terminal Size Assumptions
- **Minimum Supported**: 60 cols × 20 rows
- **Recommended**: 100 cols × 30 rows
- **Optimal**: 120+ cols × 40+ rows

### Known Limitations
- Agent cannot see visual output (relies on human verification)
- Agent cannot test interactivity (human must test keyboard input)
- Terminal rendering varies by terminal emulator (test in user's actual terminal)

---

## Completion Tracking

- [x] Step 1: Rename Panel Titles
- [ ] Step 2: Add Navigation State to Context
- [ ] Step 3: Create Empty Navigation Panel
- [ ] Step 4: Add Static Navigation Items
- [ ] Step 5: Add Navigation Selection Visual
- [ ] Step 6: Wire Navigation Input (Landscape)
- [ ] Step 7: Wire Navigation Input (Portrait)
- [ ] Step 8: Hide "Demo Controls" Panel by Default
- [ ] Step 9: Wire Panel Switching
- [ ] Step 10: Add Number Key Shortcuts
- [ ] Step 11: Create Panel Registry
- [ ] Step 12: Comprehensive Responsiveness Verification

**Sprint Status**: 1/12 steps completed (8%)

---

## Change Log

| Date       | Change                                    | Author |
|------------|-------------------------------------------|--------|
| 2025-11-09 | Sprint 1 work document created            | Claude |
| 2025-11-09 | Step 1 completed: Panel titles renamed    | Claude |
| 2025-11-09 | Legacy code cleanup: 13 files deleted     | Claude |
