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

## Phase 4.5: Fix StatusPanel Bugs

### Analysis of Current Issues (from screenshot):
- Configuration panel: Shows 8 items correctly with scrollbar
- Status panel: Only shows 3 items with empty space at bottom
- Terminal appears to be ~80 chars wide (should trigger narrow mode at <100)
- Layout is stacked (narrow mode) giving Status panel only ~35% height

### Bug 1: Height Allocation in Narrow Mode
- In narrow mode, Status panel gets 35% of available height (6 rows)
- This results in only 3 content lines (6 - 3 overhead)
- Should reconsider the 65%/35% split - maybe 50%/50% or dynamic based on content

### Bug 2: Text Truncation Issue
- Text shows "Validating embedding model..." with truncation
- The full text "Validating embedding model types" should fit
- Issue: ANSI codes in the header are being counted in length calculation
- Already fixed: Added proper ANSI-aware truncation

### Bug 3: Status Indicator Display
- Status indicators (✓, ⚠) are showing with correct colors
- Already fixed: Separated status indicator from text
- Alignment looks correct in the screenshot

### Bug 4: Dynamic Height Calculation
- Consider making narrow mode split dynamic based on content
- Or provide equal split (50%/50%) for better balance
- Current 65%/35% split leaves Status panel too cramped

### Bug 5: Width Calculation for Truncation
- Verify itemMaxWidth calculation is correct
- Account for borders, scrollbar, and padding properly
- Status indicators should not count against text width

### Implementation Steps:
1. First: Add debug logging to understand actual dimensions
2. Adjust narrow mode height split (65%/35% → 50%/50%)
3. Verify text truncation with proper width calculation
4. Test with different terminal sizes
5. Ensure scrollbar appears when needed

### Verification:
- [ ] Status panel shows appropriate number of items for its height
- [ ] No unnecessary text truncation
- [ ] Both panels get fair height allocation in narrow mode
- [ ] Scrollbar appears when content exceeds viewport
- [ ] Works correctly in both narrow (<100 cols) and wide modes

## Phase 5: List Item Interface Architecture

### Design Decision:
- Move from generic ListItem component to interface-based system
- Each list item type handles its own layout and truncation
- ScrollableBlock enforces hard boundaries (clips overflow)
- Compute truncation on each render for animation/responsive support

### Interface Design:
```typescript
interface IListItem {
  render(maxWidth: number): React.ReactElement;
  getRequiredLines(maxWidth: number): number;
}
```

### Concrete Implementations:

#### ConfigurationListItem:
- Header: Icon + Label + Value (truncate with "...")
- Expanded: TextInput box sized to maxWidth with internal overflow
- Example: `"▶ Folder Path: [/Users/example/do...]"`

#### StatusListItem:
- Header: Icon + Text + Status (preserve icon & status, truncate text)
- Expanded: Word-wrapped detail lines
- Example: `"○ Validating embedding model t… ⚠"`

### Implementation Steps:
1. Create IListItem interface
2. Implement ConfigurationListItem and StatusListItem
3. Update ScrollableBlock to clip horizontal overflow
4. Refactor panels to use new concrete list items
5. Remove old generic ListItem component
6. Test responsive behavior and animations

### Verification:
- [ ] Each list item type handles its own truncation correctly
- [ ] ScrollableBlock clips any horizontal overflow
- [ ] Status symbols remain visible when text truncates
- [ ] TextInput in expanded mode fits available width
- [ ] Animations and responsive resize work smoothly

## Phase 6: ListItem Truncation Implementation with Segments Approach

### Problem Statement:
- List items are not properly truncating their content based on maxWidth
- Ink's Text component wraps when content exactly matches container width
- Nested Text components for colors make wrapping behavior worse
- Need to preserve colored status indicators while preventing text wrapping

### Root Cause:
When text content exactly fills the available width, Ink automatically wraps it to the next line. This happens even with properly calculated widths because Ink's layout engine treats exact-width content as needing wrapping.

### Design Philosophy:
- Use a segments-based approach to build lines with precise control
- Pre-calculate safe widths with buffer to prevent exact-width scenarios
- Maintain color support through controlled Text component composition
- Each ListItem type implements its own segment builder

### Step 6.1: Implement Segments Parser for StatusListItem
**Goal**: Fix text wrapping while preserving colored status indicators

#### Segments Approach:
```typescript
interface Segment {
    text: string;
    color?: string;
}

class StatusListItem {
    buildSegments(maxWidth: number): Segment[] {
        const BUFFER = 2; // Prevent exact width match
        const safeWidth = maxWidth - BUFFER;
        
        // Calculate space allocation
        const iconWidth = this.icon.length + 1;
        const statusWidth = this.status ? this.status.length + 1 : 0;
        const textWidth = safeWidth - iconWidth - statusWidth;
        
        // Truncate text if needed
        const displayText = this.truncateText(this.text, textWidth);
        
        // Calculate padding
        const usedWidth = iconWidth + displayText.length + statusWidth;
        const padding = Math.max(0, safeWidth - usedWidth);
        
        // Build segments
        return [
            { text: `${this.icon} ${displayText}`, color: this.isActive ? 'accent' : undefined },
            { text: ' '.repeat(padding) },
            { text: this.status ? ` ${this.status}` : '', color: this.getStatusColor() }
        ];
    }
    
    render(maxWidth: number): ReactElement {
        const segments = this.buildSegments(maxWidth);
        return (
            <Text>
                {segments.map((seg, i) => 
                    seg.color ? (
                        <Text key={i} color={seg.color}>{seg.text}</Text>
                    ) : (
                        <React.Fragment key={i}>{seg.text}</React.Fragment>
                    )
                )}
            </Text>
        );
    }
}
```

### Step 6.2: Apply Segments Approach to ConfigurationListItem
**Goal**: Fix configuration item truncation using same segments pattern

#### Implementation:
```typescript
class ConfigurationListItem {
    buildSegments(maxWidth: number): Segment[] {
        const BUFFER = 2;
        const safeWidth = maxWidth - BUFFER;
        
        if (this.isExpanded) {
            // Header only - body handled separately
            return [
                { text: '▼ ', color: this.isActive ? 'accent' : undefined },
                { text: `${this.label}:`, color: this.isActive ? 'accent' : undefined }
            ];
        } else {
            // Calculate space for "[value]"
            const iconWidth = 2; // '▶ '
            const labelWidth = this.label.length + 2; // label + ': '
            const valueWidth = this.value ? this.value.length + 2 : 0; // '[' + ']'
            
            // Truncate if needed
            if (iconWidth + labelWidth + valueWidth > safeWidth) {
                // Truncate value first, then label
                const availableForValue = safeWidth - iconWidth - labelWidth - 2;
                const truncatedValue = this.truncateText(this.value, Math.max(3, availableForValue));
                return [
                    { text: `${this.icon} ${this.label}: `, color: this.isActive ? 'accent' : undefined },
                    { text: '[', color: 'dim' },
                    { text: truncatedValue },
                    { text: ']', color: 'dim' }
                ];
            }
            
            return [
                { text: `${this.icon} ${this.label}: `, color: this.isActive ? 'accent' : undefined },
                { text: '[', color: 'dim' },
                { text: this.value || '' },
                { text: ']', color: 'dim' }
            ];
        }
    }
}
```

### Step 6.3: Create Shared Truncation Utilities
**Goal**: Centralize width calculation and truncation logic

```typescript
// In ContentService or new TruncationService
class TruncationService {
    // Already exists in ContentService
    truncateText(text: string, maxWidth: number): string {
        if (text.length <= maxWidth) return text;
        if (maxWidth <= 3) return '…';
        return text.slice(0, maxWidth - 1) + '…';
    }
    
    // Add segment builder helper
    buildSegments(parts: Array<{text: string, color?: string}>): Segment[] {
        return parts.filter(part => part.text.length > 0);
    }
}
```

### Step 6.4: Alternative Approaches (if segments fail)
**Goal**: Document fallback strategies

#### Option 1: Chalk Pre-coloring
```typescript
import chalk from 'chalk';
const line = `${icon} ${text}${padding} ${chalk[statusColor](status)}`;
return <Text>{line}</Text>;
```

#### Option 2: Fixed Safety Buffer
```typescript
// Always reserve 2-3 chars to prevent exact width
const safeMaxWidth = maxWidth - 3;
// Build line normally but with reduced width
```

#### Option 3: Custom Width with ContentService
```typescript
// Use ContentService to measure exact visual width
const visualWidth = contentService.getVisualWidth(line);
if (visualWidth >= maxWidth - 1) {
    // Truncate further
}
```

### Step 6.5: Test Edge Cases
**Goal**: Ensure robust truncation in all scenarios

Test cases:
- Very narrow terminals (< 50 columns)
- Very long text with no spaces
- Unicode characters and emojis
- Status indicators at different positions
- Text that exactly matches width - 1, width, width + 1
- Empty status vs. with status
- Active vs. inactive items
- Expanded vs. collapsed items

### Implementation Order:
1. Start with StatusListItem segments approach
2. Test with various widths and content
3. If successful, apply to ConfigurationListItem
4. If segments approach fails, try chalk pre-coloring
5. As last resort, use fixed safety buffer

### Success Criteria:
- [ ] No text wrapping in StatusPanel
- [ ] Status indicators show correct colors
- [ ] Text truncates with ellipsis when too long
- [ ] All items in list are visible (not empty)
- [ ] Works across different terminal widths
## End of Phase 6
**Goal**: Ensure proper display in actual terminal

- Run side-by-side comparison with tui:old
- Test in different terminal widths
- Verify no text wrapping occurs
- Ensure status indicators remain visible
- Check that scrollbars still work correctly

### Implementation Notes:

1. **Width Calculation Formulas**:
   ```typescript
   // For ConfigurationListItem header
   maxLabelWidth = maxWidth - 2 (icon) - 3 (": [") - 1 ("]") - minValueWidth
   
   // For StatusListItem header
   maxTextWidth = maxWidth - 2 (icon) - 2 (status + space)
   ```

2. **Truncation Strategy**:
   - Always leave room for ellipsis ("..." = 3 chars)
   - Truncate at word boundaries when possible
   - For paths, try to show beginning and end

3. **Key Differences in Body Handling**:
   - **TextInput body**: Single line with horizontal scrolling in fixed-width box
   - **StatusListItem body**: Multiple lines with word wrapping, no horizontal scroll

### Verification Checklist (QA intensive):
- [ ] Configuration items show label and value appropriately truncated
- [ ] Status items always show icon and status indicator
- [ ] No text wraps to multiple lines in headers
- [ ] Text input in edit mode scrolls within box boundaries
- [ ] Status details word-wrap correctly when expanded
- [ ] Works in both narrow and wide terminal modes
- [ ] No visual artifacts or layout breaks
- [ ] User QA approval required at each step
## Phase 7: Final Cleanup

### Step 7.1: Remove Duplicated Code
- Remove inline calculateScrollbar from StatusPanel
- Consolidate any repeated patterns
- Ensure both panels use same components

### Step 7.2: Test Everything
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