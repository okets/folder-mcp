# TUI Frontend Architecture

## Target UI Design

```
╭────────────────╮
│ 📁 folder-mcp  │
╰────────────────╯

╭ Configuration ⁽ⁱⁿ ᶠᵒᶜᵘˢ⁾────────────────────────────────────────────────────────────╮  ╭ Status ᵀᵃᵇ⁺ˢ───────────────╮
│                                                                                     │  │                            │
│ • Create optimized configuration for my machine                                     │  │                            │
│                                                                                     │  │ All core components ha...  │
│ Will detect:                                                                        │  │                            │
│ • Available memory                                                                  │  │ • Checking cached conf...  │
│ • Select embedding model manually                                                   │  │ • Loading default sett...  │
│ • Configure advanced options                                                        │  │ • Validating embedding...  │
│ • Set custom cache directory                                                        │  │                            │
│ • Configure network timeouts                                                        │  │                            │
│ • Enable debug logging                                                              │  │                            │
│ • Set memory limits                                                                 │  │                            │
│ • Load from existing config file                                                    │  │                            │
│ • Reset to factory defaults                                                         │  │                            │
│ • Export current configuration                                                      │  │                            │
│ • Run configuration wizard                                                          │  │                            │
│                                                                                     │  │                            │
╰─────────────────────────────────────────────────────────────────────────────────────╯  ╰────────────────────────────╯





 [Tab] Switch Focus • [Tab+S] Focus Status • [↑↓/PgUp/PgDn] Scroll • [Enter] Select Option • [q] Quit
```

This is our first goal - creating this exact interface using neo-blessed. Note the visual indicators:
- The Configuration container shows ⁽ⁱⁿ ᶠᵒᶜᵘˢ⁾ indicator
- The Status container shows ᵀᵃᵇ⁺ˢ shortcut hint
- The status bar at the bottom shows context-aware keyboard shortcuts
- Royal blue (#4169E1) focus color will highlight the active container border

## Core Concept: VisualElement Hierarchy

The TUI is built on a hierarchical system of VisualElements where keyboard control and focus management follow strict rules.

### Key Principles

1. **Every component on screen inherits from VisualElement**
2. **Only ONE element can be Active at any time** - this element controls ALL keyboard input
3. **Focus propagates up the entire parent chain** - when an element is InFocus, all its ancestors are too
4. **The Active element decides everything** - it receives all keystrokes first and chooses what to do

## Neo-Blessed Implementation Strategy

### Why Neo-Blessed?

Neo-blessed provides the perfect foundation for our VisualElement architecture:
- **Imperative API**: Direct control over rendering and state
- **Built-in focus system**: Only one element can be focused (matches our Active concept)
- **Event bubbling**: Events propagate up the widget tree naturally
- **Custom widgets**: Easy to extend blessed.Element for our VisualElements
- **No virtual DOM**: We control exactly when to render

### Mapping Our Design to Neo-Blessed

| Our Concept | Neo-Blessed Equivalent |
|-------------|----------------------|
| VisualElement | blessed.Element (extended) |
| Active element | Focused element in blessed |
| processKeystroke() | element.key() handlers |
| getRenderContent() | element.setContent() / render |
| Parent/child hierarchy | Built-in widget tree |
| KeyboardManager | blessed.screen + focus events |
| Royal blue focus | style.focus property |

### Implementation Steps

#### Step 1: Create Base VisualElement Wrapper
```javascript
const blessed = require('neo-blessed');

class VisualElement extends blessed.Box {
  constructor(options) {
    super({
      ...options,
      keys: true,
      mouse: true
    });
    
    // Map our concepts to blessed
    this._isActive = false;
    this._isFocused = false;
    
    // Hook into blessed's focus system
    this.on('focus', () => {
      this._isActive = true;
      this.onActivated();
      this.propagateFocusUp();
    });
    
    this.on('blur', () => {
      this._isActive = false;
      this.onDeactivated();
    });
  }
  
  // Our abstract methods (to be overridden)
  onActivated() {}
  onDeactivated() {}
  onFocused() {}
  onBlurred() {}
  
  // Map processKeystroke to blessed's key handling
  processKeystroke(key) {
    // Implemented via this.key() in subclasses
  }
}
```

#### Step 2: Implement RoundBoxContainer
```javascript
class RoundBoxContainer extends VisualElement {
  constructor(options) {
    super({
      ...options,
      label: options.title,
      border: {
        type: 'line',
        fg: '#A65EF6'  // Purple border
      },
      style: {
        focus: {
          border: {
            fg: '#4169E1'  // Royal blue when focused!
          }
        }
      }
    });
    
    this.items = [];
    this.selectedIndex = 0;
    
    // Navigation keys
    this.key(['up', 'k'], () => this.selectPrevious());
    this.key(['down', 'j'], () => this.selectNext());
    this.key(['right', 'enter', 'l'], () => this.activateSelected());
    this.key(['left', 'escape', 'h'], () => this.deactivateToParent());
  }
  
  addItem(item) {
    const listItem = new ListItem({
      content: item.content,
      parent: this,
      top: this.items.length,
      height: 1
    });
    
    this.items.push(listItem);
    this.updateVisualState();
  }
  
  selectPrevious() {
    if (this.selectedIndex > 0) {
      this.selectedIndex--;
      this.updateVisualState();
    }
  }
  
  selectNext() {
    if (this.selectedIndex < this.items.length - 1) {
      this.selectedIndex++;
      this.updateVisualState();
    }
  }
  
  activateSelected() {
    const selected = this.items[this.selectedIndex];
    if (selected) {
      selected.focus();  // Blessed handles focus transfer
    }
  }
  
  updateVisualState() {
    this.items.forEach((item, index) => {
      item.setSelected(index === this.selectedIndex);
    });
    this.screen.render();
  }
}
```

#### Step 3: Implement ListItem
```javascript
class ListItem extends VisualElement {
  constructor(options) {
    super({
      ...options,
      height: 'shrink',
      style: {
        fg: 'white',
        focus: {
          fg: '#4169E1',  // Royal blue text when active
          bold: true
        }
      }
    });
    
    this.fullContent = options.fullContent || options.content;
    this.collapsed = true;
    this.selected = false;
    
    // Content control keys
    this.key(['up', 'k'], () => this.scrollUp());
    this.key(['down', 'j'], () => this.scrollDown());
    this.key(['left', 'escape', 'h'], () => this.deactivateToParent());
    
    this.updateContent();
  }
  
  setSelected(selected) {
    this.selected = selected;
    this.updateContent();
  }
  
  onActivated() {
    this.collapsed = false;
    this.updateContent();
  }
  
  onDeactivated() {
    this.collapsed = true;
    this.updateContent();
  }
  
  updateContent() {
    const bullet = this.focused ? '●' : (this.selected ? '→' : '•');
    const content = this.collapsed ? 
      `${bullet} ${this.content}` : 
      this.fullContent;
    
    this.setContent(content);
    this.screen.render();
  }
  
  deactivateToParent() {
    if (this.parent) {
      this.parent.focus();  // Return focus to container
    }
  }
}
```

#### Step 4: Create the Screen and Application
```javascript
class TUIApplication {
  constructor() {
    // Create the blessed screen
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Folder MCP',
      fullUnicode: true
    });
    
    // Global quit
    this.screen.key(['q', 'C-c'], () => {
      process.exit(0);
    });
    
    // Create main container
    this.configContainer = new RoundBoxContainer({
      parent: this.screen,
      label: ' Configuration ',
      left: 0,
      top: 2,
      width: '70%',
      height: '80%'
    });
    
    // Add items
    configItems.forEach(item => {
      this.configContainer.addItem(item);
    });
    
    // Create status bar
    this.statusBar = blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      style: {
        fg: 'white',
        bg: 'blue'
      }
    });
    
    // Update status bar on focus changes
    this.screen.on('element focus', (el) => {
      this.updateStatusBar(el);
    });
    
    // Initial focus
    this.configContainer.focus();
    this.screen.render();
  }
  
  updateStatusBar(activeElement) {
    const shortcuts = [];
    let current = activeElement;
    
    // Collect shortcuts up the chain
    while (current) {
      if (current.getShortcuts) {
        shortcuts.push(...current.getShortcuts());
      }
      current = current.parent;
    }
    
    this.statusBar.setContent(
      shortcuts.map(s => `${s.key}: ${s.desc}`).join(' | ')
    );
    this.screen.render();
  }
}
```

#### Step 5: Visual Styling
```javascript
// Royal blue focus throughout the app
const theme = {
  colors: {
    primary: '#A65EF6',      // Purple
    focus: '#4169E1',        // Royal blue
    warning: '#F59E0B',      // Orange
    text: '#FFFFFF',         // White
    muted: '#9CA3AF'         // Gray
  },
  
  // Component styles
  container: {
    border: {
      type: 'line',
      fg: '#A65EF6'
    },
    style: {
      focus: {
        border: { fg: '#4169E1' }  // Royal blue border when focused
      }
    }
  },
  
  listItem: {
    style: {
      fg: 'white',
      selected: {
        fg: '#4169E1',  // Royal blue text
        bold: true
      },
      focus: {
        bg: '#4169E1',  // Royal blue background
        fg: 'white',
        bold: true
      }
    }
  }
};
```

### Key Features of Neo-Blessed

1. **Direct Focus Control**: `element.focus()` transfers focus immediately
2. **Event Bubbling**: Return false from any handler to stop propagation
3. **Imperative Rendering**: Call `screen.render()` exactly when needed
4. **Style Inheritance**: Focus styles cascade through the widget tree
5. **Built-in Key Bindings**: `element.key()` for clean keyboard handling
6. **Royal Blue Focus**: Simple `style.focus` property - no hacks needed!

## VisualElement Base Class

```typescript
abstract class VisualElement {
    // State management
    protected _active: boolean = false;
    protected _focused: boolean = false;
    
    // Hierarchy
    protected _parent: VisualElement | null = null;
    protected _children: VisualElement[] = [];
    
    // Required overrides
    abstract onActivated(): void;      // What happens when becoming active
    abstract onDeactivated(): void;    // What happens when losing active state
    abstract onFocused(): void;        // What happens when gaining focus
    abstract onBlurred(): void;        // What happens when losing focus
    
    // Keyboard handling
    abstract processKeystroke(key: string): boolean;  // Returns true if handled
    abstract getKeyboardShortcuts(): KeyboardShortcut[];  // Shortcuts to show in status bar
}
```

## The Active vs Focused Distinction

### Active Element
- **There is only ONE active element in the entire application**
- Receives ALL keyboard input first
- Decides whether to handle keys or pass them to parents
- Has full control over the keyboard

### Focused Element
- Multiple elements can be focused (entire parent chain)
- Indicates the "current path" in the hierarchy
- Contributes shortcuts to the status bar
- Does NOT receive keyboard input unless also Active

## Examples of Active/Focus States

### Example 1: App Launch
```
TUIApplication (InFocus)
└── ConfigScreen (InFocus)
    └── Config RoundBoxContainer (InFocus + ACTIVE) ← Controls keyboard
        ├── ListItem 1 (InFocus) ← Selected but not active
        ├── ListItem 2
        └── ListItem 3
```

**Keyboard behavior:**
- ↑/↓ keys: RoundBoxContainer moves focus between ListItems
- →/Enter: RoundBoxContainer makes focused ListItem active
- q: RoundBoxContainer passes to TUIApplication to quit

### Example 2: ListItem Activated
```
TUIApplication (InFocus)
└── ConfigScreen (InFocus)
    └── Config RoundBoxContainer (InFocus)
        ├── ListItem 1 (InFocus + ACTIVE) ← Now controls keyboard
        ├── ListItem 2
        └── ListItem 3
```

**Keyboard behavior:**
- ↑/↓ keys: ListItem scrolls its own content
- ←/Esc: ListItem deactivates itself, RoundBoxContainer becomes active
- q: ListItem might pass to parents or ignore

### Example 3: Future TextInput
```
TUIApplication (InFocus)
└── ConfigScreen (InFocus)
    └── Form RoundBoxContainer (InFocus)
        └── TextInput (InFocus + ACTIVE) ← Captures ALL keystrokes
```

**Keyboard behavior:**
- All letter/number keys: TextInput adds to its content
- Enter: TextInput saves and deactivates
- Esc: TextInput cancels and deactivates
- Even 'q' is captured for text entry!

## DO's and DON'Ts

### DO's ✅
- **DO** have the Active element receive all keystrokes first
- **DO** propagate focus up the entire parent chain
- **DO** collect shortcuts from ALL focused elements for the status bar
- **DO** let Active elements decide what keys to handle vs pass to parents
- **DO** make parent containers Active by default (not their children)
- **DO** use KeyboardManager.setActive() to change active element
- **DO** trigger re-renders when visual state changes

### DON'Ts ❌
- **DON'T** have multiple active elements
- **DON'T** send keystrokes directly to focused (non-active) elements
- **DON'T** hardcode navigation logic in child elements
- **DON'T** mix React's focus system with VisualElement focus
- **DON'T** use React components for VisualElements - use getRenderContent()
- **DON'T** forget to update KeyboardManager when creating new VisualElements
- **DON'T** handle keyboard events outside of processKeystroke()

## KeyboardManager Singleton

The KeyboardManager is the central coordinator:

```typescript
class KeyboardManager {
    private static instance: KeyboardManager;
    private activeElement: VisualElement | null = null;
    
    // Only ONE active element
    setActive(element: VisualElement) {
        if (this.activeElement) {
            this.activeElement.setActive(false);
        }
        this.activeElement = element;
        element.setActive(true);
        this.propagateFocus(element);
    }
    
    // Collect shortcuts from ALL focused elements
    getStatusBarShortcuts(): KeyboardShortcut[] {
        const shortcuts: KeyboardShortcut[] = [];
        let current = this.activeElement;
        while (current) {
            shortcuts.push(...current.getKeyboardShortcuts());
            current = current.parent;
        }
        return shortcuts;
    }
    
    // Route keystrokes to active element
    handleKeystroke(key: string) {
        if (this.activeElement) {
            this.activeElement.processKeystroke(key);
        }
    }
}
```

## Common Implementation Patterns

### Container Navigation Pattern
```typescript
class RoundBoxContainer extends VisualElement {
    processKeystroke(key: string): boolean {
        if (!this._active) return false;
        
        switch(key) {
            case 'ArrowUp':
                this.focusPreviousChild();
                return true;
            case 'ArrowDown':
                this.focusNextChild();
                return true;
            case 'ArrowRight':
            case 'Enter':
                this.activateFocusedChild();
                return true;
            default:
                // Pass to parent
                return this._parent?.processKeystroke(key) ?? false;
        }
    }
}
```

### Content Control Pattern
```typescript
class ListItem extends VisualElement {
    processKeystroke(key: string): boolean {
        if (!this._active) return false;
        
        switch(key) {
            case 'ArrowUp':
                this.scrollUp();
                return true;
            case 'ArrowDown':
                this.scrollDown();
                return true;
            case 'ArrowLeft':
            case 'Escape':
                this.deactivateToParent();
                return true;
            default:
                // Pass to parent
                return this._parent?.processKeystroke(key) ?? false;
        }
    }
}
```

### Input Capture Pattern
```typescript
class TextInput extends VisualElement {
    processKeystroke(key: string): boolean {
        if (!this._active) return false;
        
        switch(key) {
            case 'Enter':
                this.saveAndDeactivate();
                return true;
            case 'Escape':
                this.cancelAndDeactivate();
                return true;
            default:
                // Capture ALL other keys for text input
                this.appendText(key);
                return true;
        }
    }
}
```

## Neo-Blessed Implementation Roadmap

### Phase 1: Project Setup
1. Install neo-blessed: `npm install neo-blessed`
2. Create basic project structure:
   - `src/interfaces/tui/index.js` - Entry point
   - `src/interfaces/tui/components/` - Visual components
   - `src/interfaces/tui/screens/` - Screen layouts
   - `src/interfaces/tui/theme.js` - Visual styling
3. Create initial blessed screen with proper terminal setup
4. Verify basic rendering and keyboard input works

### Phase 2: Base VisualElement Implementation
1. Create `VisualElement.js` extending blessed.Box
2. Implement focus state management:
   - Hook into blessed's focus/blur events
   - Add `onActivated()` and `onDeactivated()` lifecycle methods
   - Implement focus propagation up parent chain
3. Add keyboard handling infrastructure:
   - Map our `processKeystroke()` to blessed's `key()` method
   - Implement proper event bubbling with return false
4. Test with a simple box that changes color on focus

### Phase 3: RoundBoxContainer Component
1. Extend VisualElement to create RoundBoxContainer
2. Implement container-specific features:
   - Purple border by default (#A65EF6)
   - Royal blue border on focus (#4169E1)
   - Track selected child index
3. Add navigation keyboard handlers:
   - ↑/↓ to move selection between children
   - →/Enter to activate selected child
   - ←/Esc to deactivate back to parent
4. Implement visual state updates with proper rendering

### Phase 4: ListItem Component
1. Extend VisualElement to create ListItem
2. Implement collapsed/expanded states:
   - Show bullet + title when collapsed
   - Show full content when active/expanded
3. Add content scrolling for long items:
   - Track scroll position
   - ↑/↓ scrolls when active
4. Visual indicators:
   - • = default bullet
   - → = selected (parent navigating)
   - ● = active (has keyboard control)

### Phase 5: StatusBar Implementation
1. Create StatusBar as blessed.Box at screen bottom
2. Implement shortcut collection:
   - Listen to 'element focus' events on screen
   - Walk up parent chain collecting shortcuts
   - Format as "key: description | key: description"
3. Style with consistent theme colors
4. Update automatically on any focus change

### Phase 6: Configuration Screen
1. Create ConfigScreen layout:
   - Logo at top
   - Main RoundBoxContainer (70% width)
   - Status RoundBoxContainer (30% width)
   - StatusBar at bottom
2. Populate with configuration items and status messages
3. Implement Tab navigation between containers
4. Test full keyboard navigation flow

### Phase 7: Polish and Edge Cases
1. Handle edge cases:
   - Empty containers
   - Single item containers
   - No focused element on startup
2. Add smooth scrolling for long lists
3. Implement proper cleanup on exit
4. Add TypeScript definitions if needed

### Success Criteria Checklist
After all phases, verify:
- [ ] Status bar shows shortcuts from the active element and all its focused parents
- [ ] Only one element is active at any time
- [ ] Focus propagates up the parent chain correctly
- [ ] Arrow keys navigate between items when container is active
- [ ] Enter/Right activates the focused item
- [ ] Esc/Left deactivates item back to container
- [ ] Visual feedback clearly shows active and focused states
- [ ] No React focus system remnants remain
- [ ] All navigation is handled through processKeystroke()
- [ ] Re-renders happen automatically on state changes