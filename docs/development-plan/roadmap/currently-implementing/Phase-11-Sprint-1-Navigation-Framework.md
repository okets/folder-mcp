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

### Step 4: Single Panel with Navigation (Layout Verification) ✅
**Status**: [x] Completed

**Goal**: Show only Manage Folders panel with Navigation, verify responsive behavior in all terminal sizes

**Changes**:
1. Hide Demo Controls panel completely (remove from render or conditionally hide)
2. Keep Navigation panel visible and functional
3. Only show Manage Folders panel in content area
4. Verify layout works in all terminal sizes and orientations

**Files Modified**:
- `src/interfaces/tui-ink/AppFullscreen.tsx` - Removed LayoutContainer, rendering single GenericListPanel directly
- `src/interfaces/tui-ink/hooks/useNavigation.ts` - Updated switchContainer to cycle between Navigation and Main only

**Implementation Details**:
- Replaced LayoutContainer (which requires multiple children) with direct Box wrapper
- Removed Demo Controls panel from render completely
- Updated Tab cycling to only move between Navigation → Main → Navigation (2-panel cycle)
- Maintained all responsive dimension calculations (landscape vs portrait)

**Verification Checklist**:
- [ ] Only 2 panels visible: Navigation + Manage Folders
- [ ] Demo Controls panel is completely hidden
- [ ] **Landscape mode (>100 cols)**:
  - [ ] Navigation panel on left (vertical list, 15% width)
  - [ ] Manage Folders panel on right (85% width)
  - [ ] No gaps or layout issues
- [ ] **Portrait mode (≤100 cols)**:
  - [ ] Navigation panel on top (horizontal list, 3 lines)
  - [ ] Manage Folders panel below
  - [ ] No overlapping or broken borders
- [ ] Tab cycles between Navigation and Manage Folders only
- [ ] Responsive behavior works at all terminal sizes
- [ ] No layout breakage in narrow terminals (<60 cols)
- [ ] No layout breakage in low-res terminals (<25 rows)

**Rollback**: Re-show Demo Controls panel, restore LayoutContainer, restore 3-container cycle

---

### Step 5: Navigation Focus & Orientation-Aware Hints ✅
**Status**: [x] Completed (2025-11-10)

**Goal**: Navigation panel starts focused with first item selected, StatusBar shows correct navigation hints for orientation

**Changes**:
1. Ensure Navigation panel is first in focus on TUI load (already done: `activeContainer: 'navigation'`)
2. Ensure first item ("○ Manage Folders") is selected by default (already done: `navigationSelectedIndex: 0`)
3. Update StatusBar to show orientation-aware navigation hints:
   - **Landscape mode (>100 cols)**: "Navigate:↑↓"
   - **Portrait mode (≤100 cols)**: "Navigate:←→"
4. Ensure arrow keys work correctly in both orientations:
   - Landscape: Up/Down navigate between items vertically
   - Portrait: Left/Right navigate between items horizontally

**Files Modified**:
- `src/interfaces/tui-ink/components/GenericListPanel.tsx` - Added `customKeyBindings` prop to allow panels to override automatic keybinding detection
- `src/interfaces/tui-ink/components/NavigationPanel.tsx` - Added orientation-aware custom keybindings

**Implementation Details**:
- Added optional `customKeyBindings?: Array<{key: string, description: string}>` prop to GenericListPanel
- Modified keybinding logic to use customKeyBindings if provided, otherwise auto-detect based on item type
- NavigationPanel now computes keybindings based on orientation:
  ```typescript
  const customKeyBindings = orientation === 'landscape'
      ? [{ key: '↑↓', description: 'Navigate' }]      // Landscape: up/down
      : [{ key: '←→', description: 'Navigate' }];     // Portrait: left/right
  ```
- StatusBar automatically displays correct hints via focus chain (no StatusBar changes needed!)

**Architecture Note**:
This implementation leverages the existing generic focus chain system documented in the architecture guide. StatusBar uses `InputContextService.getFocusAwareKeyBindings()` which automatically reads keybindings from the focused element's focus chain registration. No manual StatusBar updates needed - it's fully automatic!

**Verification Checklist**:
- [ ] On TUI launch, Navigation panel is focused (border highlighted)
- [ ] First item ("○ Manage Folders") is selected/highlighted
- [ ] **Landscape mode**:
  - [ ] StatusBar shows "Navigate:↑↓"
  - [ ] Up arrow moves selection up
  - [ ] Down arrow moves selection down
  - [ ] Items navigate vertically
- [ ] **Portrait mode**:
  - [ ] StatusBar shows "Navigate:←→"
  - [ ] Left arrow moves selection left
  - [ ] Right arrow moves selection right
  - [ ] Items navigate horizontally
- [ ] Selection wraps/stops at boundaries appropriately
- [ ] Switching between landscape/portrait updates StatusBar hints correctly

**Rollback**: Remove customKeyBindings prop from GenericListPanel, remove keybinding logic from NavigationPanel

---

### Step 5.5: Layout Improvements & Spacing Optimization ✅
**Status**: [x] Completed (2025-11-12)

**Goal**: Fix TUI layout transitions, spacing issues, and truncation bugs to achieve professional presentation

**Changes Implemented**:

1. **Content-Based Layout Transitions**:
   - Replaced magic 100-column threshold with calculated minimum widths
   - Navigation panel: Fixed width of 18 cols (16 chars + 2 borders)
   - Main panel: Minimum 80 cols for usable content
   - Transition point: `18 + 80 + 2 = 100 cols` (calculated, not magic number)
   - Navigation panel always shows 3 rows in portrait (never drops to 1)

2. **Spacing Optimization**:
   - Reduced icon-to-text spacing from 3 spaces to 1 space in TextListItem
   - Fixed GenericListPanel borderOverhead from 6 to 4 (matches BorderedBox actual overhead)
   - Eliminated excessive 5-char right padding across all panels

3. **SelectionBody Truncation Fix** (Major Bug):
   - **Root Cause**: SelectionBody calculated available width incorrectly, causing 15-char loss
   - **Problem Flow**:
     - Terminal 32 cols → itemMaxWidth 26 → SelectionBody overhead -7 → Only 19 chars
     - calculateColumnLayout spacing 12 chars → Post-spacing width 7 → Label only 7 chars!
     - Result: "BGE-M3 (Comprehensive)" truncated to "BGE-M…" (only 6 chars shown)
   - **Solution**:
     - SelectionBody: Reduced overhead from -5 to -3, scrollbar space from 2 to 1, added symbolAndSpacing calculation
     - columnLayout: Use full availableWidth in fallback, not post-spacing availableForColumns
     - Result: Label column gets 22 chars instead of 7 at width 32
   - **Files Modified**:
     - `src/interfaces/tui-ink/components/core/SelectionBody.tsx` (lines 65-72)
     - `src/interfaces/tui-ink/utils/columnLayout.ts` (lines 59-69)

4. **Additional Fixes**:
   - SelectionBody: Require minimum 2 columns for columnar view (fixes single "Name" column bug)
   - SelectionBody: Always truncate when text exceeds width (removed col.truncated dependency)
   - columnLayout: Increased label column allocation from 35% to 50%

**Results**:
- ✅ Navigation panel visible at 24 rows (no more disappearing)
- ✅ Smooth transitions between portrait/landscape modes
- ✅ Proper text truncation without wrapping or border breaks
- ✅ Model selection dropdown shows full text: "BGE-M3 (Comprehensi…)" instead of "BGE-M…"
- ✅ Professional spacing throughout all panels
- ✅ Consistent behavior across all terminal widths (23, 32, 40+ cols)

**Commits**:
- `3c0bbbd` - feat(tui): implement Phase 11 Sprint 1 - navigation framework with adaptive orientation
- `2a22e01` - fix(tui): resolve SelectionBody truncation discrepancy

**Verification**:
- [x] Terminal 32w × 29h: Shows ~19 chars in model selection (previously 6)
- [x] Terminal 40w × 29h: Shows ~35 chars in model selection (previously 14)
- [x] No text wrapping or border breaks
- [x] Navigation panel always shows 3 rows in portrait
- [x] Smooth landscape/portrait transitions
- [x] File picker columnar layout works correctly
- [x] All spacing feels professional and consistent

---

### Step 6: Auto-Select Without Enter ✅
**Status**: [ ] Not Started

**Goal**: Navigation items auto-select on cursor movement, no need to press Enter/Space

**Current Behavior**:
- Navigation items are TextListItem with `isNavigable = false`
- Selection happens via `navigationSelectedIndex` change
- Moving cursor should automatically "select" the item

**Target Behavior**:
- Moving cursor automatically selects the item (no Enter/Space required)
- Remove any "Select:⏎" or "Select:␣" hints from StatusBar for Navigation panel
- Visual feedback shows which item is under cursor

**Changes**:
1. Verify TextListItem auto-selection behavior (should already work this way)
2. Update StatusBar to not show "Select" hints when Navigation panel is focused
3. Ensure visual feedback is clear for which item is selected

**Files Modified**:
- `src/interfaces/tui-ink/components/StatusBar.tsx` - Conditional hints based on active panel
- Possibly `src/interfaces/tui-ink/components/NavigationPanel.tsx` - Ensure selection highlighting works

**Verification Checklist**:
- [ ] Moving up/down (landscape) or left/right (portrait) changes selection immediately
- [ ] No "Select:⏎" or "Select:␣" hint in StatusBar when Navigation focused
- [ ] Visual feedback clearly shows which item is selected
- [ ] Selection works without pressing Enter or Space
- [ ] StatusBar shows only navigation hints (not selection hints) for Navigation panel

**Rollback**: Revert StatusBar changes

---

### Step 7: Panel Switching Based on Navigation Selection ✅
**Status**: [ ] Not Started

**Goal**: Switching navigation selection switches visible content panel

**Changes**:
1. Wire navigation selection to panel visibility:
   - `navigationSelectedIndex === 0` → Show Manage Folders panel
   - `navigationSelectedIndex === 1` → Show Demo Controls panel
2. Bring back Demo Controls panel rendering (was hidden in Step 4)
3. Only one content panel visible at a time
4. Panel switch happens immediately when navigation selection changes

**Implementation Pattern**:
```typescript
// In AppFullscreen.tsx
const showManageFolders = navigation.navigationSelectedIndex === 0;
const showDemoControls = navigation.navigationSelectedIndex === 1;

// Then in render:
{showManageFolders && <ManageFoldersPanel ... />}
{showDemoControls && <DemoControlsPanel ... />}
```

**Files Modified**:
- `src/interfaces/tui-ink/AppFullscreen.tsx` - Conditional rendering based on `navigation.navigationSelectedIndex`

**Verification Checklist**:
- [ ] Selecting "○ Manage Folders" (index 0) shows Manage Folders panel
- [ ] Selecting "○ Demo Controls" (index 1) shows Demo Controls panel
- [ ] Only one content panel visible at a time
- [ ] Panel switching works in both landscape and portrait modes
- [ ] Panel switching is instant (no flicker or visual glitches)
- [ ] Tab key still works to move focus between Navigation and active content panel
- [ ] Content panel maintains its own selection/scroll state
- [ ] FMDM data displays correctly in Manage Folders panel
- [ ] Demo controls function correctly in Demo Controls panel

**Rollback**: Revert to showing only Manage Folders panel statically

---

### Step 8: Comprehensive Responsiveness Verification ✅
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
- [x] Step 2: Add Navigation State to Context
- [x] Step 3: Create Empty Navigation Panel (with Tab focus)
- [x] Step 4: Single Panel with Navigation (Layout Verification)
- [x] Step 5: Navigation Focus & Orientation-Aware Hints
- [x] Step 5.5: Layout Improvements & Spacing Optimization (Added 2025-11-12)
- [ ] Step 6: Auto-Select Without Enter
- [ ] Step 7: Panel Switching Based on Navigation Selection
- [ ] Step 8: Comprehensive Responsiveness Verification

**Sprint Status**: 6/9 steps completed (67%)

---

## Change Log

| Date       | Change                                    | Author |
|------------|-------------------------------------------|--------|
| 2025-11-09 | Sprint 1 work document created            | Claude |
| 2025-11-09 | Step 1 completed: Panel titles renamed    | Claude |
| 2025-11-09 | Legacy code cleanup: 13 files deleted     | Claude |
| 2025-11-10 | Step 4 completed: Single panel layout verified | Claude |
| 2025-11-10 | Step 5 completed: Orientation-aware navigation hints | Claude |
| 2025-11-12 | Step 5.5 completed: Layout improvements & spacing optimization | Claude |
| 2025-11-12 | Fixed content-based transitions (18+80+2 cols) | Claude |
| 2025-11-12 | Fixed SelectionBody 15-char truncation bug | Claude |
| 2025-11-12 | Optimized spacing: icon-to-text 3→1 space | Claude |
| 2025-11-12 | Fixed borderOverhead calculations (6→4) | Claude |
