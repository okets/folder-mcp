# TUI Frontend Architecture

## Core Concept: VisualElement Hierarchy

The TUI is built on a hierarchical system of VisualElements where keyboard control and focus management follow strict rules.

### Key Principles

1. **Every component on screen inherits from VisualElement**
2. **Only ONE element can be Active at any time** - this element controls ALL keyboard input
3. **Focus propagates up the entire parent chain** - when an element is InFocus, all its ancestors are too
4. **The Active element decides everything** - it receives all keystrokes first and chooses what to do

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

## Implementation Roadmap

### Phase 1: Fix StatusBar Integration ✅ Success: Status bar shows shortcuts from KeyboardManager
1. Update `StatusBar.tsx` to import KeyboardManager
2. Replace `useShortcuts()` with `KeyboardManager.getInstance().getStatusBarShortcuts()`
3. Remove ShortcutContext dependencies from StatusBar
4. Verify status bar updates when active element changes

### Phase 2: Remove Duplicate RoundBoxContainer ✅ Success: Only one RoundBoxContainer exists
1. Delete the React component at `components/RoundBoxContainer.tsx`
2. Update all imports to use `components/roundbox/RoundBoxContainer.ts`
3. Ensure ConfigScreen creates VisualElement-based RoundBoxContainers
4. Fix any TypeScript errors from the component removal

### Phase 3: Fix Rendering Pipeline ✅ Success: Navigation causes visible UI updates
1. Update ConfigScreen to render VisualElement content:
   - Replace React `<RoundBoxContainer>` with `container.getRenderContent()`
   - Convert string arrays to React elements properly
2. Add render trigger to KeyboardManager:
   - Call `setRenderTrigger()` after any active/focus change
   - Ensure all VisualElement state changes trigger re-render
3. Update Box rendering to show active/focused states visually

### Phase 4: Remove Legacy Focus System ✅ Success: No useFocus hooks remain
1. Remove `useFocus` hook usage from all components
2. Delete the focus utility functions
3. Remove `activeContainerId` and related state from ConfigScreen
4. Ensure Tab key is handled by ConfigScreen's processKeystroke()

### Phase 5: Implement Proper Navigation ✅ Success: Can navigate with arrows and activate with enter
1. Fix RoundBoxContainer keyboard handling:
   - When Active: ↑/↓ changes focused child, →/Enter activates child
   - Track focused child index properly
2. Fix ListItem keyboard handling:
   - When Active: ↑/↓ scrolls content, ←/Esc deactivates to parent
3. Test full navigation flow:
   - Start with RoundBoxContainer active
   - Navigate between items with arrows
   - Activate item with enter
   - Deactivate back to container with escape

### Phase 6: Visual Feedback ✅ Success: Can see which element is active/focused
1. Update Box component to accept and display focus/active states
2. Modify getRenderContent() to include visual indicators:
   - Active container: double-line border
   - Focused container: highlighted border
   - Active item: highlighted background
   - Focused item: arrow or bullet indicator
3. Ensure visual states update immediately on navigation

### Phase 7: Cleanup and Polish ✅ Success: No console errors, smooth navigation
1. Remove all console.log statements except errors
2. Remove old keyboard handling code
3. Ensure graceful handling of edge cases:
   - Empty containers
   - Single item containers
   - Keyboard input when no active element
4. Add proper TypeScript types for all VisualElement interactions

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