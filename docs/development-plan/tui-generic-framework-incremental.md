# TUI Generic Framework - Incremental Implementation Plan

## Overview
Build a proper generic TUI framework by extracting and generalizing the well-tested Configuration box implementation. Transform the main TUI while keeping a reference copy (`tui:old`) for comparison.

## Current State Assessment
The previous generic framework implementation was partially completed but needs cleanup and proper restructuring. We have:
- Core components already created but potentially over-engineered
- Multiple ConfigurationPanel variants that need consolidation  
- StatusPanel not yet using the generic framework
- No reference copy (tui-ink-old) for comparison

## Core Principle: Extract from Configuration Box First
- Configuration box is well-tested and working perfectly
- Extract its patterns into generic components
- Build framework from proven components
- LogItem comes AFTER we have the generic foundation

## Common Terminology
- **ListItem**: The base component with three parts:
  - **icon**: Single character indicator (e.g., '○', '▶', '·')
  - **header**: Main text line, always visible
  - **body**: Optional content shown when expanded
- **ScrollableBlock**: Container that handles overflow (both vertical and horizontal)
- **GenericPanel**: Composition of BorderedBox + ScrollableBlock + list management
- **truncate(width)**: Required method to prevent header text overflow

## Pre-Phase: Cleanup and Reset
**Goal**: Clean up the existing implementation and prepare for proper incremental approach

### Steps:
1. **Identify and keep the working ConfigurationPanel**
   - Test each variant (ConfigurationPanel.tsx, ConfigurationPanelSimple.tsx, etc.)
   - Identify which one has the working edit mode
   - Delete all unused variants
   
2. **Clean up core components**
   - Review existing core components
   - Remove unused/over-engineered components
   - Keep only: BorderedBox, ScrollbarCalculator
   
3. **Reset StatusPanel**
   - Ensure StatusPanel is in its original working state
   - Should still have inline calculateScrollbar function

### Verification Checkpoint:
- [ ] Run `npm run tui`
- [ ] Configuration panel works with edit mode
- [ ] Status panel shows all items with working scrollbar
- [ ] Both panels display correctly

## Phase 0: Create Reference Copy
**Goal**: Preserve current TUI as reference point

### Steps:
1. Copy current TUI to `src/interfaces/tui-ink-old/`
2. Update all imports in the copied files to work from new location
3. Add `tui:old` script to package.json: `tsx src/interfaces/tui-ink-old/index.tsx`
4. Test that `npm run tui:old` works exactly like current `npm run tui`

### Verification Checkpoint:
- [ ] `tui:old` runs successfully
- [ ] Both TUIs look and behave identically
- [ ] All features work in the reference copy

## Phase 1: Extract Core Primitives (Small Steps)

### Step 1.1: Extract ScrollbarCalculator (if not already done)
- Verify `src/interfaces/tui-ink/components/core/ScrollbarCalculator.ts` exists
- Ensure both panels use the extracted version
- Test: Both panels still work identically

### Step 1.2: Create Simple ListItem Component
- Create `src/interfaces/tui-ink/components/core/ListItem.tsx`
- Start with just icon + header rendering
- No body/expansion yet
- Props: icon, header, isActive, width
- Include truncate method for header

### Step 1.3: Test ListItem in ConfigurationPanel
- Update ConfigurationPanel to use ListItem for rendering
- Keep all existing logic, just use ListItem for display
- Verify: Configuration panel looks exactly the same

### Verification Checkpoint:
- [ ] Configuration panel still works perfectly
- [ ] Edit mode still functions
- [ ] Visual appearance unchanged
- [ ] Side-by-side comparison with `tui:old` shows no differences

## Phase 2: Add Expandable Support

### Step 2.1: Add Body Support to ListItem
- Update ListItem to support optional body content
- Add isExpanded prop
- Body only renders when isExpanded is true

### Step 2.2: Create TextInputBody Component
- Extract text input logic from ConfigurationPanel
- Create as a separate body component
- Support: value, onChange, cursor position

### Step 2.3: Wire Up Expansion in ConfigurationPanel
- Add expansion state management
- Enter key toggles expansion
- When expanded, show TextInputBody
- Verify edit mode works through expansion

### Verification Checkpoint:
- [ ] Configuration items expand/collapse with Enter
- [ ] Edit mode works when expanded
- [ ] Collapse on Esc or Enter after edit
- [ ] No visual changes from `tui:old` when collapsed

## Phase 3: Create Container Components

### Step 3.1: Create ScrollableBlock
- Extract viewport/scrolling logic
- Handle maxHeight, scrollOffset
- Clip content that exceeds bounds

### Step 3.2: Create GenericPanel
- Compose BorderedBox + ScrollableBlock
- Add list management (activeIndex, items)
- Handle keyboard navigation

### Step 3.3: Migrate ConfigurationPanel
- Update to use GenericPanel
- Map existing logic to generic structure
- Verify identical behavior

### Verification Checkpoint:
- [ ] Configuration panel works identically
- [ ] No visual changes
- [ ] All interactions preserved
- [ ] Side-by-side comparison with `tui:old` shows no differences

## Phase 4: Update StatusPanel

### Step 4.1: Convert StatusPanel to ListItems
- Update StatusPanel to use ListItem components
- Status items: icon='○', header with status indicator
- No body content yet

### Step 4.2: Add Expandable Status Items
- Add body content for status details
- Enable expansion with Enter key
- Show detailed log information when expanded

### Step 4.3: Migrate to GenericPanel
- Update StatusPanel to use GenericPanel
- Ensure consistent behavior with ConfigurationPanel

### Verification Checkpoint:
- [ ] Status panel looks identical when collapsed
- [ ] Items expand to show details
- [ ] Navigation works consistently
- [ ] Everything else identical to `tui:old`

## Phase 5: Final Cleanup

### Step 5.1: Remove Duplicated Code
- Remove inline calculateScrollbar from StatusPanel
- Consolidate any repeated patterns
- Ensure both panels use same components

### Step 5.2: Test Everything
- Compare with `tui:old`
- Test all keyboard shortcuts
- Verify responsive behavior
- Test edge cases

### Final Verification:
- [ ] Only visible change: expandable status items
- [ ] Everything else identical to `tui:old`
- [ ] Clean, reusable component architecture
- [ ] All functionality preserved

## Key Principles
1. **Small, verifiable steps** - Each step can be tested independently
2. **No breaking changes** - TUI must work at every step
3. **Incremental refactoring** - Extract and test one piece at a time
4. **Reference comparison** - Always compare against `tui:old`
5. **Configuration first** - It's our working reference implementation

## Key Success Metrics
1. Configuration box must work EXACTLY as before
2. No regressions in any functionality
3. Clean extraction of generic components
4. Only visible change: expandable status items

## Testing Commands
```bash
# Reference copy
npm run tui:old

# Main TUI being transformed
npm run tui

# Quick test to verify both work
npm run tui:old & npm run tui
```