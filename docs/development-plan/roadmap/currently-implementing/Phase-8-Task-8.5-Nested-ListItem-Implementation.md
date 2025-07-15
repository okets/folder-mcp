# Phase 8 Task 8.5: Nested ListItem Visual Component Implementation

**Status**: 📋 PLANNED  
**Discovered**: 2025-07-15  
**Priority**: HIGH - Blocking folder setup wizards and complex interfaces

## Overview

Create a `ContainerListItem` that can display other `IListItem` instances inside it when expanded, with proper responsive behavior that mimics `GenericListPanel`'s scrolling and input delegation.

**This is a pure visual component architecture task** - NOT business logic, model recommendations, or wizard features.

## Technical Research Summary

### Current Architecture Analysis

#### GenericListPanel's Responsibility (Container)
- **Space Allocation**: Calculates `itemMaxLines = remainingLines` for each item
- **Viewport Scrolling**: Tracks line positions and scrolls items into view
- **Input Delegation**: Routes input to `selectedItem.handleInput()` when `isControllingInput = true`
- **Truncation**: Items that don't fit are scrolled out of view

#### IListItem's Responsibility (Items)
- **Reports space needed**: `getRequiredLines(maxWidth)` tells container how much space needed
- **Handles internal scrolling**: Uses `maxLines` parameter to implement internal scrolling
- **Self-constrains width**: Truncates content to fit `maxWidth`
- **Fixed height strategy**: FilePickerListItem shows "max 4 items" then scrolls internally

### Key Discovery: Fixed Height Strategy

**FilePickerListItem Pattern**:
```typescript
getRequiredLines(maxWidth: number): number {
  if (!this._isControllingInput) return 1; // Collapsed
  
  // Fixed height: header + path + max 4 items + confirm
  return 2 + Math.min(regularItems.length, 4) + confirmLines;
}
```

**Then internally in FilePickerBody**:
```typescript
if (regularItems.length > maxLines) {
  // Internal scrolling - show subset of items
  const visibleItems = regularItems.slice(startIndex, startIndex + maxLines);
  showScrollUp = startIndex > 0;
  showScrollDown = startIndex + maxLines < regularItems.length;
}
```

### Input Flow Architecture

**Current**: `GenericListPanel` → `ActiveItem.handleInput()`

**Needed**: `GenericListPanel` → `ContainerListItem` → `ActiveChildItem.handleInput()`

## Implementation Design

### ContainerListItem Interface

```typescript
class ContainerListItem implements IListItem {
  readonly selfConstrained = true as const;
  
  private _isControllingInput: boolean = false;
  private _childItems: IListItem[] = [];
  private _childSelectedIndex: number = 0;
  private _childScrollOffset: number = 0;
  private _childLinePositions: Array<{start: number, end: number}> = [];
  
  constructor(
    public icon: string,
    private label: string,
    private childItems: IListItem[],
    private onComplete?: (results: any) => void
  ) {
    this._childItems = [...childItems];
  }
  
  get isControllingInput(): boolean {
    return this._isControllingInput;
  }
  
  // Core IListItem methods
  render(maxWidth: number, maxLines?: number): ReactElement | ReactElement[];
  getRequiredLines(maxWidth: number): number;
  handleInput(input: string, key: Key): boolean;
  onEnter(): void;
  onExit(): void;
}
```

### Fixed Height Strategy

```typescript
getRequiredLines(maxWidth: number): number {
  if (!this._isControllingInput) {
    return 1; // Collapsed view
  }
  
  // FIXED HEIGHT - prevents infinite recursion
  // Similar to FilePickerListItem's approach
  return 8; // Always request 8 lines, scroll internally if needed
}
```

### Internal Scrolling Logic (Copy from GenericListPanel)

```typescript
private calculateChildViewport(availableLines: number): {
  visibleChildren: IListItem[],
  scrollOffset: number,
  showScrollUp: boolean,
  showScrollDown: boolean
} {
  // Step 1: Calculate line positions for all children
  this._childLinePositions = [];
  let currentLine = 0;
  
  for (let i = 0; i < this._childItems.length; i++) {
    const child = this._childItems[i];
    const childLines = child.getRequiredLines ? child.getRequiredLines(maxWidth - 2) : 1;
    
    this._childLinePositions.push({
      start: currentLine,
      end: currentLine + childLines
    });
    currentLine += childLines;
  }
  
  // Step 2: Calculate scroll offset to keep selected child visible
  const selectedPosition = this._childLinePositions[this._childSelectedIndex];
  if (selectedPosition) {
    // Keep selected child visible (copy GenericListPanel logic lines 149-156)
    if (selectedPosition.end > this._childScrollOffset + availableLines) {
      // Item is cut off at bottom - scroll down
      this._childScrollOffset = selectedPosition.end - availableLines;
    } else if (selectedPosition.start < this._childScrollOffset) {
      // Item is cut off at top - scroll up
      this._childScrollOffset = selectedPosition.start;
    }
  }
  
  // Step 3: Find visible children based on scroll offset
  const visibleChildren: IListItem[] = [];
  for (let i = 0; i < this._childItems.length; i++) {
    const pos = this._childLinePositions[i];
    if (pos && pos.end > this._childScrollOffset && pos.start < this._childScrollOffset + availableLines) {
      visibleChildren.push(this._childItems[i]);
    }
  }
  
  return {
    visibleChildren,
    scrollOffset: this._childScrollOffset,
    showScrollUp: this._childScrollOffset > 0,
    showScrollDown: this._childScrollOffset + availableLines < currentLine
  };
}
```

### Render Implementation

```typescript
render(maxWidth: number, maxLines?: number): ReactElement | ReactElement[] {
  if (!this._isControllingInput) {
    // Collapsed view
    return (
      <Text>
        <Text color={this.isActive ? theme.colors.accent : theme.colors.textMuted}>
          {this.icon}
        </Text>
        <Text color={this.isActive ? theme.colors.accent : undefined}>
          {' '}{this.label}
        </Text>
      </Text>
    );
  }
  
  // Expanded view
  const elements: ReactElement[] = [];
  const availableLines = (maxLines || 8) - 2; // Reserve header + footer
  
  // Calculate viewport
  const viewport = this.calculateChildViewport(availableLines);
  
  // Header
  elements.push(
    <Text key="header" color={theme.colors.accent}>
      ■ {this.label}
    </Text>
  );
  
  // Render visible children
  viewport.visibleChildren.forEach((child, index) => {
    // Set active state
    const isChildSelected = this._childItems.indexOf(child) === this._childSelectedIndex;
    child.isActive = isChildSelected;
    
    // Calculate available lines for this child
    const childPosition = this._childLinePositions[this._childItems.indexOf(child)];
    const childMaxLines = childPosition ? childPosition.end - childPosition.start : 1;
    
    // Render child with indentation
    const childElements = child.render(maxWidth - 2, childMaxLines);
    if (Array.isArray(childElements)) {
      childElements.forEach((element, elemIndex) => {
        elements.push(
          <Box key={`child-${index}-${elemIndex}`} marginLeft={1}>
            {element}
          </Box>
        );
      });
    } else {
      elements.push(
        <Box key={`child-${index}`} marginLeft={1}>
          {childElements}
        </Box>
      );
    }
  });
  
  // Scroll indicators
  if (viewport.showScrollUp) {
    elements.push(
      <Text key="scroll-up" color={theme.colors.textMuted}>
        ↑ More items above
      </Text>
    );
  }
  if (viewport.showScrollDown) {
    elements.push(
      <Text key="scroll-down" color={theme.colors.textMuted}>
        ↓ More items below
      </Text>
    );
  }
  
  return elements;
}
```

### Input Delegation System

```typescript
handleInput(input: string, key: Key): boolean {
  if (!this._isControllingInput) return false;
  
  const activeChild = this._childItems[this._childSelectedIndex];
  
  // Priority 1: If child is controlling input, delegate to it
  if (activeChild?.isControllingInput && activeChild.handleInput) {
    return activeChild.handleInput(input, key);
  }
  
  // Priority 2: Handle navigation between children
  if (key.upArrow) {
    this._childSelectedIndex = Math.max(0, this._childSelectedIndex - 1);
    return true;
  }
  
  if (key.downArrow) {
    this._childSelectedIndex = Math.min(this._childItems.length - 1, this._childSelectedIndex + 1);
    return true;
  }
  
  if (key.return && activeChild?.onEnter) {
    activeChild.onEnter(); // Child takes control
    return true;
  }
  
  if (key.escape) {
    this.onExit(); // Exit container
    return true;
  }
  
  return false;
}
```

### Focus Management

```typescript
onEnter(): void {
  this._isControllingInput = true;
  
  // Initialize child selection
  if (this._childSelectedIndex >= this._childItems.length) {
    this._childSelectedIndex = 0;
  }
  
  // Set initial active states
  this._childItems.forEach((child, index) => {
    child.isActive = (index === this._childSelectedIndex);
  });
}

onExit(): void {
  this._isControllingInput = false;
  
  // Clean up child states
  this._childItems.forEach(child => {
    child.isActive = false;
    if (child.isControllingInput && child.onExit) {
      child.onExit();
    }
  });
}
```

## Implementation Phases

### Phase 1: Basic Structure (Proof of Concept)

**Goal**: Create ContainerListItem that can show/hide child items

**Files to Create**:
- `src/interfaces/tui-ink/components/core/ContainerListItem.tsx`
- `src/interfaces/tui-ink/components/core/TextListItem.tsx` (simple test child)

**Test Setup**:
```typescript
const testChildren = [
  new TextListItem("·", "What language is your content?", "English"),
  new TextListItem("·", "What type of content?", "Documents"),
  new TextListItem("·", "Select folder", "/Users/me/Documents")
];

const containerItem = new ContainerListItem("📁", "Add Folder", testChildren);
```

**Success Criteria**:
- Shows "📁 Add Folder" when collapsed
- Shows 3 child items when expanded
- Handles ↑↓ navigation between children
- Properly handles Enter/Escape

### Phase 2: Internal Scrolling

**Goal**: Implement viewport scrolling when children exceed available space

**Implementation**:
- Add `calculateChildViewport()` method
- Implement line position tracking
- Add scroll indicators
- Test with 10+ children in limited space

**Success Criteria**:
- Shows scroll indicators when needed
- Keeps selected child visible
- Scrolls smoothly with arrow keys
- Respects available space limits

### Phase 3: Input Delegation

**Goal**: Properly delegate input to child items

**Implementation**:
- Add child `isControllingInput` detection
- Implement input delegation chain
- Handle child onEnter/onExit events
- Test with interactive children (SelectionListItem)

**Success Criteria**:
- Child items can take control of input
- Navigation works at both levels
- Proper focus management
- Clean state transitions

### Phase 4: Integration Testing

**Goal**: Integrate with existing GenericListPanel

**Implementation**:
- Add ContainerListItem to main app
- Test alongside other ListItems
- Verify focus management
- Test terminal resizing

**Success Criteria**:
- Works in real application
- No conflicts with other items
- Proper responsive behavior
- Smooth user experience

## Technical Challenges & Solutions

### Challenge 1: Infinite Recursion
**Problem**: Child items calling `getRequiredLines()` could cause infinite recursion
**Solution**: Use fixed height strategy like FilePickerListItem

### Challenge 2: Input Focus Chain
**Problem**: Input needs to flow through multiple levels
**Solution**: Priority-based input delegation with state tracking

### Challenge 3: Viewport Calculation
**Problem**: Need to mimic GenericListPanel's complex scrolling logic
**Solution**: Copy exact algorithms from GenericListPanel with adaptations

### Challenge 4: State Management
**Problem**: Multiple levels of active/selected/controlling states
**Solution**: Clear state hierarchy with proper cleanup

## Test Cases

### Basic Functionality
- [ ] Collapsed state shows single line
- [ ] Expanded state shows child items
- [ ] Navigation between children works
- [ ] Enter/Escape handling works

### Scrolling Behavior
- [ ] Shows scroll indicators when needed
- [ ] Keeps selected child visible
- [ ] Handles terminal resize
- [ ] Works with varying child heights

### Input Delegation
- [ ] Child items can take control
- [ ] Navigation works at both levels
- [ ] Proper state cleanup
- [ ] No input conflicts

### Integration
- [ ] Works in GenericListPanel
- [ ] No conflicts with other items
- [ ] Proper focus management
- [ ] Responsive behavior

## Success Metrics

1. **Functionality**: All basic operations work correctly
2. **Performance**: No noticeable lag with 20+ children
3. **Usability**: Intuitive navigation and interaction
4. **Stability**: No crashes or state corruption
5. **Integration**: Seamless with existing codebase

## Future Extensions

Once the basic ContainerListItem is working, it can be extended for:
- **Folder Setup Wizards**: Multi-step configuration flows
- **Complex Forms**: Nested input validation
- **Tree Navigation**: Hierarchical data structures
- **Dynamic Content**: Runtime child addition/removal

This provides the visual architecture foundation for all advanced TUI interfaces in the application.