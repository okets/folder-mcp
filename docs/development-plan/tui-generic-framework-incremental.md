# TUI Generic Framework - Incremental Implementation Plan

## Overview
Build a proper generic TUI framework by extracting and generalizing the well-tested Configuration box implementation. Transform the main TUI while keeping a reference copy (`tui:old`) for comparison.

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

## Phase 0: Create Reference Copy
**Goal**: Preserve current TUI as reference point

### Steps:
1. Copy current TUI to `src/interfaces/tui-ink-old/`
2. Update all imports in the copied files to work from new location
3. Add `tui:old` script to package.json: `tsx src/interfaces/tui-ink-old/index.tsx`
4. Test that `npm run tui:old` works exactly like current `npm run tui`

### Human QA Checkpoint:
- [ ] `tui:old` runs successfully
- [ ] Both TUIs look and behave identically
- [ ] All features work in the reference copy

## Phase 1: Extract Core Primitives from Configuration Box

### Step 1.1: Extract ScrollbarCalculator
- Create `src/interfaces/tui-ink/components/core/ScrollbarCalculator.ts`
- Extract `calculateScrollbar` function from ConfigurationPanel
- Update ConfigurationPanel to use the extracted version
- Test: Configuration panel still works identically

### Step 1.2: Extract TextInput as Body Component
- Create `src/interfaces/tui-ink/components/core/items/bodies/TextInputBody.tsx`
- Extract from ConfigurationPanelSimple's edit mode logic
- This is just the expandable body content for a ListItem
- Support: value, onChange, cursor position, width handling

### Step 1.3: Create Generic ListItem Component
- Create `src/interfaces/tui-ink/components/core/items/ListItem.tsx`
- Based on Configuration panel's item rendering
- **ListItem structure**: icon + header + (optional) body
- Props: icon, header, body, isActive, isExpanded
- **Required method**: `truncate(width: number)` for header text
- Body only shows when expanded
- Configuration items: icon='▶/·', header='Label: [value]', body=TextInput
- Status items: icon='○', header='Status text', body=log details

### Human QA Checkpoint:
- [ ] Configuration panel still works perfectly
- [ ] Components extracted but TUI unchanged
- [ ] Side-by-side comparison with `tui:old` shows no differences

## Phase 2: Create Generic Container Components

### Step 2.1: Create ScrollableBlock Component
- Create `src/interfaces/tui-ink/components/core/containers/ScrollableBlock.tsx`
- Extract scrolling logic from ConfigurationPanel
- Props: children, maxHeight, maxWidth, scrollOffset, showScrollbar
- Generic container that manages scroll viewport
- **Critical**: Handles horizontal overflow - hides anything beyond maxWidth
- Prevents border breaking by enforcing width constraints
- All child content must respect the width boundary

### Step 2.2: Create GenericPanel Component
- Create `src/interfaces/tui-ink/components/core/containers/GenericPanel.tsx`
- Compose BorderedBox + ScrollableBlock
- Add focus management
- Support header, subtitle, scrollbar
- Panel manages the list logic, ScrollableBlock just handles viewport

### Step 2.3: Refactor ConfigurationPanel to Use Generic Components
- Update ConfigurationPanel to use GenericPanel
- Map existing logic to generic components
- Verify identical behavior

### Human QA Checkpoint:
- [ ] Configuration panel works identically
- [ ] Edit mode still functions
- [ ] Responsive design maintained
- [ ] No visual differences from `tui:old`

## Phase 3: Implement ListItem Variants

### Step 3.1: Update Configuration Items to Use ListItem
- Configuration ListItem structure:
  - icon: '▶' (active) or '·' (inactive)
  - header: 'Label: [current value]'
  - body: TextInput for editing
- Enter expands to show body, Enter/Esc collapses

### Step 3.2: Transform Status Panel to Use Generic Components
- Update StatusPanel to use GenericPanel (like Configuration)
- Status ListItem structure:
  - icon: '○' (or '▶' when active)
  - header: 'Status message ✓/⚠/⋯' (status at end)
  - body: Detailed log information
- Same ListItem component as Configuration, different content

### Step 3.3: Unify Behavior Patterns
- All ListItems use same expand/collapse logic
- Consistent keyboard handling
- Same visual indicators (▶ when active, etc.)
- Test both panels working with unified component

### Human QA Checkpoint:
- [ ] Both panels use the same ListItem component
- [ ] Configuration items expand/collapse for editing
- [ ] Status items expand/collapse to show details
- [ ] Consistent behavior across both panels

## Phase 4: Final Integration and Testing

### Step 4.1: Verify Both Panels Use Generic Framework
- ConfigurationPanel already using GenericPanel (from Phase 2.3)
- StatusPanel already using ListItems (from Phase 3.2)
- Both panels now fully generic
- Only difference: Status items are expandable

### Step 4.2: Integration Testing
- Test with `npm run tui`
- Compare side-by-side with `tui:old`
- Verify only difference is expandable items
- Test all interactions

### Human QA Checkpoint:
- [ ] Status panel looks identical when collapsed
- [ ] Items are expandable with Enter
- [ ] All navigation works
- [ ] Responsive design works
- [ ] Everything else identical to `tui:old`

## Phase 5: Final Testing and Cleanup

### Step 5.1: Comprehensive Testing
- Test all keyboard shortcuts
- Test responsive design at various sizes
- Test edit mode in configuration
- Test expand/collapse in status
- Performance testing

### Step 5.2: Code Cleanup
- Remove any duplicate code
- Ensure consistent patterns
- Document the framework components

### Final Human QA:
- [ ] `tui` and `tui:old` identical except expandable status
- [ ] All functionality preserved
- [ ] Clean component architecture
- [ ] Ready for future enhancements

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
```