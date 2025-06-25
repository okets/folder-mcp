# TUI Generic Framework - Incremental Implementation Plan

## Overview
Build a proper generic TUI framework by extracting and generalizing the well-tested Configuration box implementation. Each step maintains full functionality of the existing TUI.

## Guiding Principles
1. **Small, testable increments** - Each step can be merged independently
2. **No breaking changes** - TUI remains fully functional after each step
3. **Configuration box as reference** - Use its proven patterns
4. **Progressive enhancement** - Start with basics, add features incrementally

## Phase 1: Extract Core Primitives (No Breaking Changes)

### Step 1.1: Extract ScrollbarCalculator
- Create `src/interfaces/tui-ink/components/core/ScrollbarCalculator.ts`
- Extract `calculateScrollbar` function from ConfigurationPanel
- Keep original function in place, make it call the new one
- Test: Verify Configuration panel still works identically

### Step 1.2: Extract BorderedBox to Core
- Create `src/interfaces/tui-ink/components/core/BorderedBox.tsx`
- Copy current BorderedBox implementation
- Update imports in Configuration panels to use core version
- Test: All panels render identically

### Step 1.3: Create Generic ListItem Component
- Create `src/interfaces/tui-ink/components/core/ListItem.tsx`
- Base it on Configuration panel's item rendering
- Support: icon, text, value, status, isActive props
- Don't use it yet - just create and test in isolation

## Phase 2: Create Generic List Container

### Step 2.1: Create ScrollableList Component
- Create `src/interfaces/tui-ink/components/core/ScrollableList.tsx`
- Extract scrolling logic from ConfigurationPanel
- Props: items, activeIndex, maxHeight, renderItem
- Test with mock data independently

### Step 2.2: Create Panel Base Component
- Create `src/interfaces/tui-ink/components/core/Panel.tsx`
- Compose BorderedBox + ScrollableList
- Add header/footer support
- Test independently with sample data

### Step 2.3: Migrate ConfigurationPanelSimple
- Update ConfigurationPanelSimple to use Panel component
- Map existing logic to new component props
- Verify identical behavior
- This proves the generic components work

## Phase 3: Standardize Item Rendering

### Step 3.1: Create ItemRenderer Service
- Create `src/interfaces/tui-ink/services/ItemRenderer.ts`
- Handles different item types (simple, with-value, with-status)
- Consistent truncation and spacing logic
- Test with various item configurations

### Step 3.2: Update ConfigurationPanel to Use ItemRenderer
- Replace inline item rendering with ItemRenderer
- Maintain exact same visual output
- Test thoroughly

### Step 3.3: Create Unified ListItemData Interface
```typescript
interface ListItemData {
  id: string;
  icon?: string;
  text: string;
  value?: string;
  status?: string;
  color?: string;
  selectable?: boolean;
}
```

## Phase 4: Migrate Other Panels

### Step 4.1: Create StatusPanel Adapter
- Map status items to ListItemData format
- Use generic Panel component
- Remove StatusItemLayout gradually

### Step 4.2: Unify Panel Behaviors
- Ensure all panels use same scrolling logic
- Consistent keyboard navigation
- Same visual indicators

### Step 4.3: Remove Duplicate Code
- Delete old panel-specific implementations
- Keep only generic components
- Update all imports

## Phase 5: Enhanced Features

### Step 5.1: Add Layout Service
- Extract width calculation logic
- Handle responsive design centrally
- Support different layout strategies

### Step 5.2: Add Theme Support
- Extract colors and styles
- Create theme provider
- Allow consistent styling

### Step 5.3: Add Animation Support
- Smooth scrolling transitions
- Selection animations
- Optional based on terminal capabilities

## Testing Strategy

### After Each Step:
1. Run existing TUI to verify no visual changes
2. Compare screenshots before/after
3. Test all keyboard interactions
4. Verify performance hasn't degraded
5. **Human QA Required**: Request user verification for:
   - Text input fields behavior
   - Focus management and tab navigation
   - Complex interactions (expand/collapse, edit mode)
   - Terminal-specific behaviors that can't be simulated

### Test Scenarios:
- Various terminal widths (40, 80, 120 columns)
- Different heights (10, 20, 50 rows)
- Edge cases (empty lists, single item, many items)
- Rapid scrolling and selection changes
- **Human Testing Required**:
  - Actual keyboard input in text fields
  - Copy/paste operations
  - Terminal-specific key combinations
  - Mouse interactions (if supported)

## Success Metrics

1. **Code Reduction**: >50% less duplicate code
2. **Bug Consistency**: Fix once, fixed everywhere
3. **Test Coverage**: >90% on core components
4. **Performance**: No regression in render time
5. **Maintainability**: New panels can be added in <30 min

## Migration Checkpoints

After each phase, verify:
- [ ] All existing panels work identically
- [ ] No visual regressions
- [ ] Tests pass
- [ ] Performance acceptable
- [ ] **Human QA Sign-off**: User has tested interactive features
- [ ] Code can be merged to main

## Human QA Checkpoints

### Phase 1 QA (After Core Primitives):
- No user interaction needed (internal refactoring only)

### Phase 2 QA (After Generic List Container):
- [ ] Verify scrolling feels natural with keyboard
- [ ] Test selection persistence during scroll
- [ ] Confirm visual indicators match expectations

### Phase 3 QA (After Item Rendering):
- [ ] Test text truncation with various content
- [ ] Verify special characters display correctly
- [ ] Check spacing and alignment visually

### Phase 4 QA (After Panel Migration):
- [ ] **Critical**: Test ConfigurationPanelNew text input
- [ ] Verify tab navigation between fields
- [ ] Test expand/collapse with Enter key
- [ ] Confirm edit mode enter/exit behavior
- [ ] Test value persistence after editing
- [ ] Verify cursor positioning in text fields

### Phase 5 QA (After Enhanced Features):
- [ ] Test theme changes (if implemented)
- [ ] Verify animations don't cause flicker
- [ ] Test on different terminal emulators
- [ ] Confirm accessibility features work

## Phase 6: Expandable List Items

### Step 6.1: Create Generic ExpandableListItem Component
- Create `src/interfaces/tui-ink/components/core/ExpandableListItem.tsx`
- Extract common expand/collapse functionality from existing implementations
- Support both collapsed and expanded states with customizable content
- Props: label, value, isExpanded, isActive, expandedContent, icons
- Test: Create examples with different content types

### Step 6.2: Create TextInputItem Component
- Create `src/interfaces/tui-ink/components/core/items/TextInputItem.tsx`
- Refactor existing text input functionality from ConfigurationPanelSimple
- Uses ExpandableListItem for consistent behavior
- Maintains all existing keyboard handling and validation
- Test: Verify identical behavior to current implementation

### Step 6.3: Create LogItem Component
- Create `src/interfaces/tui-ink/components/core/items/LogItem.tsx`
- Collapsed state: `· [timestamp] Log summary text`
- Expanded state: Full log details with stack trace, metadata
- Features:
  - Timestamp formatting
  - Log level indicators (error/warn/info)
  - Syntax highlighting for stack traces
  - Scrollable content if log is large
- Test: Create sample log data with various types

### Step 6.4: Update DataPanel for Expandable Items
- Add expansion state management to DataPanel
- Support keyboard shortcuts (Enter to expand/collapse)
- Update ItemRenderer to handle expandable items
- Maintain scroll position when expanding/collapsing
- Test: Verify smooth expansion without layout jumps

### Step 6.5: Migrate Configuration Panel
- Replace ConfigurationPanelSimple with new components
- Use TextInputItem for all configuration fields
- Ensure edit mode works identically
- Test: Full regression test of configuration editing

### Step 6.6: Create LogPanel Component
- Create new panel using DataPanel + LogItem
- Support filtering by log level
- Add search functionality
- Test: Performance with large number of logs

## Phase 7: Advanced Features

### Step 7.1: Create Additional Item Types
- SelectItem - Dropdown selection with options
- ToggleItem - Boolean on/off switch
- SliderItem - Numeric value with min/max
- FilePickerItem - File/folder selection
- Test each with real use cases

### Step 7.2: Add Nested Expansion Support
- Support items that expand to show sub-items
- Tree-like navigation with proper indentation
- Keyboard shortcuts for expand/collapse all
- Test: Deep nesting scenarios

### Step 7.3: Add Item Validation Framework
- Real-time validation as user types
- Visual indicators for errors/warnings
- Validation messages below items
- Test: Various validation rules

## Human QA Checkpoints

### Phase 6 QA (After Expandable Items):
- [ ] **Critical**: Test text input in expanded items
- [ ] Verify Enter key expands/collapses correctly
- [ ] Test Tab navigation through expandable items
- [ ] Confirm cursor positioning in text fields
- [ ] Test Escape key cancels edits properly
- [ ] Verify scroll behavior when expanding items

### Phase 7 QA (After Advanced Features):
- [ ] Test all new item types interactively
- [ ] Verify nested expansion keyboard navigation
- [ ] Test validation feedback visibility
- [ ] Confirm no performance issues with many items
- [ ] Test on various terminal sizes

## Rollback Plan

Each step is designed to be reversible:
- Git commits for each step
- Feature flags for new components
- Parallel implementations during migration
- Quick revert possible at any checkpoint