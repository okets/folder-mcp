# Folder-MCP TUI Architecture & Component Reference

**Last Updated**: November 6, 2025
**Framework**: React + Ink (Terminal UI library)
**Location**: `/src/interfaces/tui-ink/`

## Executive Summary

The folder-mcp TUI is a sophisticated **React-based terminal UI system** built on Ink with clean architecture principles. It features:

- **Self-Constrained Component System** - Each component handles its own layout and width constraints
- **State Change Signaling** - Terminal rendering efficiency through precise re-render triggering
- **Responsive Layout Management** - Landscape/portrait modes with breakpoint-based responsiveness
- **Rich ListItem Components** - 10+ specialized list item types for different interactions
- **Input Control Delegation** - Items can take control of keyboard input when "focused"
- **Validation & Error Handling** - Integrated validation with visual feedback
- **Theme System** - Centralized theming with modern unicode border styles

---

## Core Architecture Layers

### 1. **IListItem Interface** (`components/core/IListItem.ts`)

All list items implement this fundamental interface. Critical pattern: **state change signaling**

```typescript
export interface IListItem extends ISelfConstrainedItem {
  icon: string;                                      // Display icon
  isActive: boolean;                                 // Currently selected
  isNavigable: boolean;                              // Can navigate to (skip if false)
  isControllingInput: boolean;                       // Taking keyboard input
  
  render(maxWidth: number, maxLines?: number): ReactElement;
  getRequiredLines(maxWidth: number, maxHeight?: number): number;
  
  // Lifecycle callbacks
  onEnter?(): void;                                  // User pressed Enter
  onExit?(): void;                                   // User exited control mode
  onSelect?(): void;                                 // Item became focused
  onDeselect?(): void;                               // Item lost focus
  
  // Input handling
  handleInput?(input: string, key: Key): boolean;    // MUST return true ONLY if state changed
  
  // Validation
  getValidationMessage?(): ValidationMessage | null;
  validateValue?(): void;
  
  // Expansion (for expandable items)
  onExpand?(key?: Key): void;
  onCollapse?(): boolean;
}
```

**CRITICAL TUI PATTERN - State Change Signaling**:
```typescript
// DON'T DO THIS - causes flickering:
handleInput(input: string, key: Key): boolean {
    if (key.downArrow) {
        this.index = Math.min(this.max, this.index + 1);
        return true; // WRONG! Returns true even when at boundary
    }
}

// DO THIS - prevents flickering:
handleInput(input: string, key: Key): boolean {
    if (key.downArrow) {
        const oldIndex = this.index;
        const newIndex = Math.min(this.max, this.index + 1);
        if (newIndex !== oldIndex) {
            this.index = newIndex;
            return true; // State actually changed
        }
        return false; // Already at boundary
    }
}
```

**Why**: Terminal rendering physically redraws the screen region. Returning `true` from `handleInput` triggers `setItemUpdateTrigger` in GenericListPanel, causing panel re-render and visible flickering.

---

## Core Components Reference

### 2. **GenericListPanel** (`components/core/GenericListPanel.tsx`)

The universal list/panel component that renders any array of IListItem objects.

**Features**:
- Line-based scrolling (not item-based - each item can span multiple lines)
- Automatic scroll positioning to keep selected item visible
- Delegated input handling to selected item
- Optional subtitle support
- Visual scrollbar with selected item position highlight

**Props**:
```typescript
interface GenericListPanelProps {
  title: string;
  subtitle?: string;
  items: IListItem[];
  width?: number;
  height?: number;
  focused?: boolean;
  selectedIndex?: number;
  onSelectionChange?: (index: number) => void;
  onInput?: (input: string, key: Key) => boolean;
}
```

**Scroll Calculation Logic**:
- Calculates `requiredLines` for each item via `item.getRequiredLines(maxWidth)`
- Tracks line positions for each item (start/end line number)
- When selected item becomes visible, adjusts scroll offset
- Renders only visible items to reduce re-renders

**Navigation**:
- ↑/↓ arrows navigate between items (skips non-navigable items)
- Enter/→ triggers `onEnter()` on selected item
- Selected item with `isControllingInput=true` receives all input via `handleInput()`

---

### 3. **BorderedBox** (`components/core/BorderedBox.tsx`)

Renders a bordered container with integrated title and optional scrollbar.

**Visual Features**:
- Modern unicode borders: `╭─╮` / `│` / `╰─╯`
- Focus-aware border colors (bright blue when focused)
- Embedded title with automatic truncation
- Tab indicator `⁽ᵗᵃᵇ⁾` when not focused
- Optional subtitle line
- Vertical scrollbar with position indicator

**Border Calculation**:
```
Focused:   ╭─ TITLE ─[padding]─╮
Not focused: ╭─ TITLE ─[padding]─ ⁽ᵗᵃᵇ⁾ ╮
```

**Content Width**:
```
contentWidth = width - 3 - (scrollbar ? 1 : 0)
// -3: left border (1) + space (1) + right border (1)
```

---

## ListItem Component Types

### **1. TextListItem** (`components/core/TextListItem.tsx`)

Simple text display item. Not navigable by default (skipped in navigation).

**Features**:
- Text wrapping with word boundaries or truncation
- Wrap mode: Calculates actual lines needed using word wrapping algorithm
- Truncate mode: Single-line display with ellipsis
- Active state shows cursor arrow `▶` instead of icon

**Usage**:
```typescript
const item = new TextListItem(
  icon: '• ',
  text: 'Some descriptive text',
  isActive: false,
  overflowMode: 'wrap' // or 'truncate'
);
```

**Width Calculation**:
```
availableWidth = maxWidth - iconWidth - 3  // Reserve 3 for indentation
```

---

### **2. SelectionListItem** (`components/core/SelectionListItem.tsx`)

Radio button or checkbox selection component with two modes.

**Features**:
- **Radio Mode**: Single selection, auto-selects as you navigate
- **Checkbox Mode**: Multiple selections, space to toggle
- **Layout Modes**: Vertical or horizontal (responsive auto-switch)
- **Responsive**: Auto-switches layout if truncation > 10%
- **Validation**: Min/max selection constraints
- **Keyboard Navigation**:
  - Vertical layout: ↑↓ to navigate, space to toggle, ← to exit
  - Horizontal layout: ←→ to navigate, ↑↓ to exit

**Two Rendering States**:
```
Collapsed:  ◎ Mode: [selected_value]
Expanded:   ■ Mode: select one
            ◎ Option 1  ◎ Option 2  ◎ Option 3
```

**Validation Display**:
```typescript
export interface SelectionOption {
  value: string;
  label: string;
  details?: Record<string, string>;  // For detailed view
}
```

---

### **3. TextInputItem** (`components/core/TextInputItem.tsx`)

Expandable text input field with validation.

**Features**:
- Inline editing with cursor position tracking
- Cursor blink effect (530ms interval)
- Validation on Enter
- Password masking support
- Custom validation function

**Edit State**:
- Tab expands to edit mode
- Arrow keys move cursor left/right
- Backspace/Delete to remove characters
- Escape cancels, Enter saves

---

### **4. ConfigurationListItem** (`components/core/ConfigurationListItem.tsx`)

Advanced configuration editor with validation rules and destructive action confirmations.

**Features**:
- Full input editing with validation
- Password field support with show/hide toggle
- Confirmation dialog for destructive changes
- External validation rules
- FMDM validation adapter integration (WebSocket-based)

**States**:
```
Collapsed:    ⚙ Setting Name: [current_value] ✓
Expanded:     ⚙ Setting Name: [editing_value]
              Validation errors displayed inline
Confirming:   [Confirmation dialog with "Cancel" "Confirm" buttons]
```

---

### **5. FilePickerListItem** (`components/core/FilePickerListItem.tsx`)

Interactive file/folder browser with validation.

**Features**:
- Browse file system with Enter to descend, Backspace to go up
- Filter by file/folder/both
- Hidden file toggle with 'H' key
- Multi-column layout when space available
- Pattern-based filtering
- FMDM conflict detection (folder already configured)

**Keyboard Navigation**:
- ↑↓ to navigate items
- → or Enter to enter directory/select file
- ← or Backspace to go to parent directory
- H to toggle hidden files
- Escape to cancel

---

### **6. SimpleButtonsRow** (`components/core/SimpleButtonsRow.tsx`)

Interactive button row with responsive rendering modes.

**Features**:
- Regular mode: Bordered button boxes with 3 lines
- Low-resolution mode: Compact `[Button]` format
- Auto-detects terminal capabilities (underline support)
- Respects global terminal height for mode selection
- Focus-aware styling

**Regular Mode**:
```
╭─────╮  ╭─────╮
│ √Yes │  │ ✗No │
╰─────╯  ╰─────╯
```

**Low-Resolution Mode**:
```
[ Yes ] [ No ]
```

**Input**:
- ←→ arrows to navigate between buttons
- Enter or Space to activate button
- ↑↓ arrows pass through to parent list navigation

---

### **7. VerticalToggleRow** (`components/core/VerticalToggleRow.tsx`)

Single-line toggle component for quick configuration selection.

**Features**:
- Immediate selection with ←→ arrows (no Enter needed)
- Responsive truncation with priority rules
- Pass-through ↑↓ for list navigation

**Visual**:
```
Speed: ⊙ Slow    ○ Normal    ○ Fast
```

---

### **8. LogItem** (`components/core/LogItem.tsx`)

Expandable log message display with multi-line wrapping.

**Features**:
- Expandable/collapsible with space bar
- Icon changes based on log level (error, warning, info)
- Word wrapping with preserved formatting
- Timestamp display

---

### **9. ExpandableListItem** (`components/core/ExpandableListItem.tsx`)

Hook-based expandable item state management.

```typescript
const { isExpanded, expand, collapse, toggle } = useExpandableItem();
```

---

### **10. ContainerListItem** (`components/core/ContainerListItem.tsx`)

Wrapper for rendering complex content as a list item.

---

## Theme System

### **Theme Definition** (`utils/theme.ts`)

```typescript
export const theme = {
  colors: {
    accent: '#2f70d8',                      // Blue for focus/active
    border: '#475569',                      // Unfocused borders
    borderFocus: '#3B82F6',                 // Focused borders
    textPrimary: '#F8FAFC',                 // Main text
    textSecondary: '#94A3B8',               // Secondary text
    textMuted: '#64748B',                   // Disabled/muted
    configValuesColor: '#648151',           // Olive green for values
    successGreen: '#10B981',                // Success state
    warningOrange: '#F59E0B',               // In-progress/warning
    dangerRed: '#EF4444'                    // Errors/destructive
  },
  symbols: {
    border: {
      topLeft: '╭',      topRight: '╮',
      bottomLeft: '╰',   bottomRight: '╯',
      horizontal: '─',   vertical: '│'
    }
  }
};
```

**Usage with Conditional Props**:
```typescript
import { textColorProp } from '../utils/conditionalProps';

<Text {...textColorProp(theme.colors.accent)}>
  Colored text
</Text>
```

---

## Responsive Layout System

### **LayoutContainer** (`components/LayoutContainer.tsx`)

Automatically adapts layout based on terminal dimensions and focus state.

**Breakpoints**:
```typescript
const isNarrow = availableWidth < 100;              // Stack panels vertically
const isLowVerticalResolution = availableHeight < 20;
const isExtremelyLowVerticalResolution = availableHeight < 13;
```

**Layout Modes**:

1. **Landscape** (wide) - Two panels side-by-side
   ```
   ┌─────────────────┬─────────────────┐
   │   Main Panel    │  Status Panel    │
   │                 │                  │
   └─────────────────┴─────────────────┘
   ```

2. **Portrait** (narrow) - Panels stacked vertically
   ```
   ┌─────────────────────────────────────┐
   │        Main Panel (70%)              │
   ├─────────────────────────────────────┤
   │      Status Panel (30%)              │
   └─────────────────────────────────────┘
   ```

3. **Low Resolution** - Active panel full height, inactive minimized
   ```
   ┌─────────────────────────────────────┐
   │     Main Panel (Active)              │
   │     [Full height]                    │
   ├─────────────────────────────────────┤
   │ Status [Minimized]                  │
   └─────────────────────────────────────┘
   ```

4. **Extremely Low** (< 13 rows) - Show frame only for inactive panel

---

## Scrollbar System

### **ScrollbarCalculator** (`components/core/ScrollbarCalculator.ts`)

Calculates visual scrollbar representation.

**Visual Format**:
```
▲   (top triangle - always shown)
│   (scrollbar track)
│   (selected item position shown as ┇)
│   (scrollbar track)
▼   (bottom triangle - always shown)
```

**Calculation**:
```typescript
// availableSpace = visibleItems - 2 (excluding triangles)
const lineLength = Math.ceil(availableSpace * visibleItems / totalItems);
const topSpace = Math.round(maxTopSpace * scrollOffset / maxScrollOffset);
```

---

## Utility Functions & Services

### **Content Service** (`services/ContentService.ts`)

Text measurement and truncation utilities.

```typescript
// Measure visual width of text (excluding ANSI codes)
const width = contentService.measureText(text);

// Truncate text to fit width
const truncated = contentService.truncateText(text, maxWidth);
```

### **Validation Display** (`utils/validationDisplay.ts`)

```typescript
// Get visual width (handles ANSI codes)
const width = getVisualWidth(text);

// Format validation messages
const formatted = formatValidationDisplay(message, maxWidth);

// Get validation icon
const icon = getValidationIcon(state);
```

### **Conditional Props** (`utils/conditionalProps.ts`)

```typescript
import { textColorProp, buildProps } from '../utils/conditionalProps';

// Conditional color prop
<Text {...textColorProp(isError ? 'red' : 'green')}>Text</Text>

// Build props object conditionally
{...buildProps({ title: focused ? 'Active' : undefined })}
```

---

## Input Handling Pattern

### **Keyboard Input Flow**

```
1. User presses key
2. GenericListPanel.handleInput() called
3. If item.isControllingInput === true:
   → Delegate to item.handleInput()
   → If returns true: re-render panel (state changed)
   → If returns false: input not handled
4. Else: GenericListPanel handles navigation
   → ↑: selectedIndex--
   → ↓: selectedIndex++
   → Enter/→: item.onEnter()
   → Call onSelectionChange() callback
```

### **Item Control Mode Pattern**

```typescript
class MyItem implements IListItem {
  private _isControllingInput = false;
  
  get isControllingInput() { return this._isControllingInput; }
  
  onEnter() {
    this._isControllingInput = true;  // Take control
  }
  
  handleInput(input: string, key: Key): boolean {
    if (key.escape) {
      this._isControllingInput = false;  // Release control
      return true;
    }
    // Handle other input
    return true; // Return true ONLY if state changed
  }
  
  onExit() {
    this._isControllingInput = false;
  }
}
```

---

## Self-Constrained Component Pattern

### **ISelfConstrainedItem** (`components/core/ISelfConstrainedItem.ts`)

```typescript
export interface ISelfConstrainedItem {
  readonly selfConstrained: true;
}
```

**Principle**: Components that implement this are responsible for their own width management. Parents MUST NOT apply additional truncation.

**Wrapper Pattern**:
```typescript
<SelfConstrainedWrapper>
  {item.render(maxWidth)}
</SelfConstrainedWrapper>
```

This prevents double-truncation where both parent and item try to constrain width.

---

## Visual Feedback Patterns

### **Active State Indicators**

| Element | Inactive | Active |
|---------|----------|--------|
| Icon | Normal icon | `▶` (cursor) |
| Border | Dark gray `#475569` | Bright blue `#3B82F6` |
| Text | Normal | Accent blue |

### **Validation States**

| State | Icon | Color | Display |
|-------|------|-------|---------|
| Valid | `✓` | Green | Brief inline |
| Invalid | `✗` | Red | Inline error message |
| Warning | `⚠` | Orange | Inline warning |

### **Progress Indicators**

```typescript
// Full progress bar (10 cells)
⊙▰▰▰▰▰▰▰▱▱ 70%

// Short mode (4 chars max)
⊙70%

// Completion
✓▰▰▰▰▰▰▰▰▰100%
```

---

## Common Implementation Patterns

### **Pattern 1: Basic Navigation Item**

```typescript
class NavigationItem implements IListItem {
  readonly selfConstrained = true as const;
  readonly isNavigable = true;
  private _isControllingInput = false;
  
  constructor(
    public icon: string,
    private label: string,
    public isActive: boolean
  ) {}
  
  get isControllingInput() { return this._isControllingInput; }
  
  render(maxWidth: number): ReactElement {
    return <Text>{this.icon} {this.label}</Text>;
  }
  
  getRequiredLines() { return 1; }
  
  onEnter() {
    // Handle action
  }
  
  handleInput(input: string, key: Key): boolean {
    // Handle specific input
    return false;
  }
}
```

### **Pattern 2: Expandable Interactive Item**

```typescript
class InteractiveItem implements IListItem {
  readonly selfConstrained = true as const;
  readonly isNavigable = true;
  private _isControllingInput = false;
  private _isExpanded = false;
  
  get isControllingInput() { return this._isControllingInput; }
  
  onEnter() {
    this._isControllingInput = true;
    this._isExpanded = true;
  }
  
  onExit() {
    this._isControllingInput = false;
  }
  
  handleInput(input: string, key: Key): boolean {
    if (key.escape) {
      this.onExit();
      return true;
    }
    // Handle edit input
    const stateChanged = this.processInput(input, key);
    return stateChanged;
  }
  
  getRequiredLines(maxWidth: number): number {
    return this._isExpanded ? 5 : 1;
  }
  
  render(maxWidth: number): ReactElement {
    return this._isExpanded 
      ? this.renderExpanded(maxWidth)
      : this.renderCollapsed(maxWidth);
  }
  
  private processInput(input: string, key: Key): boolean {
    const oldValue = this.value;
    // Modify state...
    return this.value !== oldValue;
  }
}
```

### **Pattern 3: Multi-Component Item**

```typescript
class ComplexItem implements IListItem {
  readonly selfConstrained = true as const;
  readonly isNavigable = true;
  
  render(maxWidth: number): ReactElement | ReactElement[] {
    // Return array of elements for multi-line items
    return [
      <Text key="line1">Header content</Text>,
      <Text key="line2">Body content</Text>,
      <Text key="line3">Footer content</Text>
    ];
  }
  
  getRequiredLines(maxWidth: number): number {
    return 3;
  }
}
```

---

## Width Calculation Best Practices

### **Formula Pattern**

```typescript
// Basic reserved space
const iconWidth = displayIcon.length + 1;        // icon + space
const borderOverhead = 3;                        // | space |
const indentation = 3;                           // "   "
const availableWidth = maxWidth - iconWidth - borderOverhead - indentation;

// With scrollbar
const scrollbarWidth = showScrollbar ? 1 : 0;
const contentWidth = panelWidth - 3 - scrollbarWidth;

// For truncation
const ellipsisWidth = 1;
const truncateThreshold = availableWidth - ellipsisWidth;
if (text.length > truncateThreshold) {
  displayText = text.substring(0, truncateThreshold) + '…';
}
```

### **Character-Level Precision**

```typescript
// For exact positioning, count characters precisely
const prefix = '■ ';           // 2 chars
const suffix = ': ';           // 2 chars
const fixedChars = prefix.length + suffix.length;  // 4 chars

if (label.length + fixedChars > maxWidth) {
  // Truncate label
}
```

---

## Performance Considerations

### **Rendering Optimization**

1. **Line-based Scrolling**: Only visible items are rendered
2. **State Change Signaling**: Only re-render when state actually changes
3. **Component Memoization**: Use React.memo() for expensive computations
4. **Avoid Render-time Console Calls**: Causes ANSI packet fragmentation on Windows
5. **SelfConstrainedWrapper**: Prevents double-truncation overhead

### **Memory Management**

1. **Cleanup in useEffect**: Always return cleanup function
2. **Bounded Item Arrays**: Don't render thousands of items at once
3. **Reuse Calculated Values**: Cache width/height calculations

---

## Common Gotchas & Solutions

### **Gotcha 1: Flickering at Navigation Boundaries**

**Problem**: Pressing down arrow at last item causes visible flicker

**Solution**: Return `false` from `handleInput()` when already at boundary
```typescript
const oldIndex = this.index;
this.index = Math.min(this.max, this.index + 1);
if (this.index === oldIndex) return false;  // No state change
return true;
```

### **Gotcha 2: ANSI Code Handling**

**Problem**: Text with colors gets measured incorrectly

**Solution**: Use `getVisualWidth()` utility that strips ANSI codes
```typescript
const visualLength = getVisualWidth(coloredText);  // Not coloredText.length
```

### **Gotcha 3: Width Overflow at Boundaries**

**Problem**: Text exactly matching maxWidth wraps unexpectedly

**Solution**: Always leave 1-character safety buffer
```typescript
const availableWidth = maxWidth - 1;  // -1 for safety
if (text.length >= availableWidth) { /* truncate */ }
```

### **Gotcha 4: Terminal Feature Detection**

**Problem**: Underline, background colors not supported in all terminals

**Solution**: Detect terminal capabilities and degrade gracefully
```typescript
const hasModernSupport = process.env.TERM_PROGRAM === 'Apple_Terminal';
const styleElement = hasModernSupport 
  ? <Text underline>text</Text>
  : <Text backgroundColor="#accent">text</Text>;
```

---

## Testing Utilities

### **Demo Component Showcase** (`tui-ink-demo/`)

Run with `npm run tuidemo` to see all components in action.

### **Sample Data Generators** (`models/mixedSampleData.ts`)

```typescript
export const createConfigurationPanelItems = (): IListItem[] => {
  // Returns array of sample configuration items
};

export const createStatusPanelItems = (): IListItem[] => {
  // Returns array of sample status items
};
```

---

## Future Enhancements

1. **Modal System**: Overlay dialogs for confirmations
2. **Advanced Animations**: Smooth transitions between states
3. **Custom Themes**: User-definable color schemes
4. **Accessibility**: Screen reader support
5. **Plugin System**: Allow custom list item types
6. **Recording/Playback**: Record terminal sessions for testing

---

## Related Documentation

- **Phase 8 Plan**: `docs/development-plan/roadmap/currently-implementing/Phase-8-Unified-Application-Flow-plan.md`
- **Unified Architecture**: `docs/design/unified-app-architecture.md`
- **Configuration System**: `docs/configuration.md`
- **Testing Guide**: `docs/testing/THE_MOTHER_OF_ALL_TESTS.md`

---

## Quick Reference: Component Selection

| Need | Component | Notes |
|------|-----------|-------|
| Text display | `TextListItem` | Non-navigable, wrap or truncate |
| Single selection | `SelectionListItem` | Radio mode, auto-selects |
| Multiple selections | `SelectionListItem` | Checkbox mode, space to toggle |
| Text input | `ConfigurationListItem` | Full editing + validation |
| File picker | `FilePickerListItem` | Browse file system |
| Buttons | `SimpleButtonsRow` | Responsive bordered buttons |
| Log display | `LogItem` | Expandable with formatting |
| Toggle quickly | `VerticalToggleRow` | Single-line mode selector |
| Generic list | `GenericListPanel` | Container for any items |
| Complex layout | `BorderedBox` | Manual content with borders |

---

## Code Organization

```
src/interfaces/tui-ink/
├── components/
│   ├── core/                          # Reusable base components
│   │   ├── IListItem.ts               # Interface (implement this!)
│   │   ├── ISelfConstrainedItem.ts    # Self-constraint marker
│   │   ├── GenericListPanel.tsx       # Universal list renderer
│   │   ├── BorderedBox.tsx            # Bordered container
│   │   ├── TextListItem.tsx           # Text display
│   │   ├── SelectionListItem.tsx      # Radio/checkbox selection
│   │   ├── TextInputItem.tsx          # Text input field
│   │   ├── ConfigurationListItem.tsx  # Advanced config editor
│   │   ├── FilePickerListItem.tsx     # File browser
│   │   ├── SimpleButtonsRow.tsx       # Button row
│   │   ├── VerticalToggleRow.tsx      # Toggle selector
│   │   ├── LogItem.tsx                # Log display
│   │   ├── ExpandableListItem.tsx     # Expandable state hook
│   │   ├── ScrollbarCalculator.ts     # Scrollbar rendering
│   │   └── ... more components
│   ├── LayoutContainer.tsx            # Responsive layout manager
│   ├── BorderedBox.tsx                # Legacy bordering
│   └── ... other components
├── contexts/                          # React contexts
│   ├── ThemeContext.tsx               # Theme provider
│   ├── LayoutContext.tsx              # Layout constraints
│   ├── NavigationContext.tsx          # Navigation state
│   └── ... other contexts
├── utils/                             # Utility functions
│   ├── theme.ts                       # Color & symbol definitions
│   ├── validationDisplay.ts           # Validation formatting
│   ├── conditionalProps.ts            # Prop builders
│   ├── columnLayout.ts                # Multi-column layout
│   ├── animations.ts                  # Animation frames
│   └── ... other utilities
├── services/                          # Business logic
│   ├── ContentService.ts              # Text measurement
│   ├── StatusBarService.ts            # Status bar management
│   └── ... other services
└── index.tsx                          # Main entry point
```

---

**This document serves as the TUI component reference and architecture guide for folder-mcp development.**
