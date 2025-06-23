# TUI VisualElement Architecture Implementation Plan

## Core Architecture Overview

```
VisualElement (abstract base)
├── ListItem (content with expand/scroll behavior)
└── RoundBoxContainer (manages child navigation)
```

**Key Principle**: Each VisualElement implements `processKeystroke(key)` according to its purpose. No separate "scrolling system" - just different keystroke handling strategies.

## Implementation Steps

### 1. Create VisualElement Base Class
**File**: `src/interfaces/tui/components/VisualElement.ts`

```typescript
export abstract class VisualElement {
  protected _active: boolean = false;
  protected _focused: boolean = false;
  protected _id: string;

  constructor(id: string) {
    this._id = id;
  }

  get id(): string { return this._id; }
  get active(): boolean { return this._active; }
  get focused(): boolean { return this._focused; }

  setActive(active: boolean): void { this._active = active; }
  setFocused(focused: boolean): void { this._focused = focused; }

  // Each subclass implements keystroke handling for its purpose
  abstract processKeystroke(key: string): boolean;
  
  // Return current visual representation
  abstract getRenderContent(): string[];
  
  // Return keyboard shortcuts for status bar
  abstract getShortcuts(): Array<{key: string, description: string}>;
}
```

### 2. Implement ListItem Class
**File**: `src/interfaces/tui/components/ListItem.ts`

```typescript
export interface ListItemData {
  content: string;
  fullContent?: string;
}

export class ListItem extends VisualElement {
  private data: ListItemData;
  private scrollPosition: number = 0;

  constructor(id: string, data: ListItemData) {
    super(id);
    this.data = data;
  }

  processKeystroke(key: string): boolean {
    if (!this.active) return false;

    switch (key) {
      case 'up':
        return this.scrollUp();
      case 'down':
        return this.scrollDown();
      case 'escape':
      case 'left':
        // Deactivate - handled by parent
        return false;
      default:
        return false;
    }
  }

  getRenderContent(): string[] {
    if (this.active && this.data.fullContent) {
      // Active: Show full content with wrapping, handle scrolling
      const lines = this.wrapText(this.data.fullContent);
      return this.getVisibleLines(lines);
    } else {
      // Inactive: Show single line with visual indicator
      const bullet = this.active ? '●' : this.focused ? '◦' : '•';
      return [`${bullet} ${this.data.content}`];
    }
  }

  getShortcuts() {
    return this.active ? 
      [{ key: '↑↓', description: 'Scroll' }, { key: '←/Esc', description: 'Back' }] :
      [];
  }

  private scrollUp(): boolean { /* scroll content up one line */ }
  private scrollDown(): boolean { /* scroll content down one line */ }
  private wrapText(text: string): string[] { /* wrap text to fit container */ }
  private getVisibleLines(lines: string[]): string[] { /* apply scroll position */ }
}
```

### 3. Implement RoundBoxContainer Class
**File**: `src/interfaces/tui/components/RoundBoxContainer.ts`

```typescript
export class RoundBoxContainer extends VisualElement {
  private children: VisualElement[] = [];
  private focusedIndex: number = 0;
  private activeChild: VisualElement | null = null;

  setChildren(children: VisualElement[]): void {
    this.children = children;
    this.focusedIndex = children.length > 0 ? 0 : -1;
    this.updateChildFocus();
  }

  processKeystroke(key: string): boolean {
    // If a child is active, let it handle first
    if (this.activeChild && this.activeChild.processKeystroke(key)) {
      return true;
    }

    // Container-level navigation
    switch (key) {
      case 'up':
        return this.navigateUp();
      case 'down':
        return this.navigateDown();
      case 'enter':
      case 'right':
        return this.activateCurrentChild();
      case 'escape':
      case 'left':
        return this.deactivateCurrentChild();
      default:
        return false;
    }
  }

  getRenderContent(): string[] {
    return this.children.flatMap(child => child.getRenderContent());
  }

  getShortcuts() {
    if (this.activeChild) {
      return this.activeChild.getShortcuts();
    }
    return [
      { key: '↑↓/PgUp/PgDn', description: 'Next/Prev' },
      { key: '→/Enter', description: 'Open' }
    ];
  }

  private navigateUp(): boolean { /* move focus to previous child */ }
  private navigateDown(): boolean { /* move focus to next child */ }
  private activateCurrentChild(): boolean { /* activate focused child */ }
  private deactivateCurrentChild(): boolean { /* deactivate active child */ }
  private updateChildFocus(): void { /* set focused state on children */ }
}
```

### 4. Create KeyboardHandler
**File**: `src/interfaces/tui/keyboard/KeyboardHandler.ts`

```typescript
export class KeyboardHandler {
  private activeElement: VisualElement | null = null;

  setActiveElement(element: VisualElement | null): void {
    this.activeElement = element;
  }

  processKeystroke(key: string): boolean {
    if (this.activeElement) {
      return this.activeElement.processKeystroke(key);
    }
    return false;
  }

  getCurrentShortcuts(): Array<{key: string, description: string}> {
    if (this.activeElement) {
      return this.activeElement.getShortcuts();
    }
    return [{ key: 'q', description: 'Quit' }];
  }
}
```

### 5. React Integration (NO FLICKERING)
**File**: `src/interfaces/tui/screens/ConfigScreen.tsx`

**CRITICAL**: Avoid state updates that cause re-renders. Use stable references.

```typescript
export const ConfigScreen: React.FC<ConfigScreenProps> = ({ 
  terminalSize, 
  focusState,
  onElementNavigationReady 
}) => {
  // Create stable instances - NO useState for these
  const keyboardHandler = useMemo(() => new KeyboardHandler(), []);
  const configContainer = useMemo(() => new RoundBoxContainer('config'), []);
  const statusContainer = useMemo(() => new RoundBoxContainer('status'), []);

  // Static data
  const configItems = useMemo(() => [
    new ListItem('config-0', { 
      content: 'Create optimized configuration',
      fullContent: 'Long detailed content for configuration...'
    }),
    // ... more items
  ], []);

  // Initialize containers ONCE
  useEffect(() => {
    configContainer.setChildren(configItems);
    statusContainer.setChildren(statusItems);
  }, [configContainer, statusContainer, configItems]);

  // Set active container based on focus
  useEffect(() => {
    const activeContainer = focusState.currentFocus === 'main' ? 
      configContainer : statusContainer;
    keyboardHandler.setActiveElement(activeContainer);
    
    // Set visual active state
    configContainer.setActive(focusState.currentFocus === 'main');
    statusContainer.setActive(focusState.currentFocus === 'status');
  }, [focusState.currentFocus]);

  // Expose keyboard handler
  useEffect(() => {
    if (onElementNavigationReady) {
      onElementNavigationReady(keyboardHandler.processKeystroke.bind(keyboardHandler));
    }
  }, [onElementNavigationReady]);

  // Generate content - STABLE, no flickering dependencies
  const configContent = useMemo(() => {
    return configContainer.getRenderContent();
  }, [configContainer, focusState.currentFocus]); // Only re-render on focus change

  const statusContent = useMemo(() => {
    return statusContainer.getRenderContent();
  }, [statusContainer, focusState.currentFocus]);

  return (
    <AppLayout
      terminalSize={terminalSize}
      mainContent={configContent}
      notificationContent={statusContent}
      focusState={focusState}
    />
  );
};
```

### 6. Key Anti-Flickering Rules

1. **NO useState for VisualElement instances** - use useMemo with empty deps
2. **NO state updates in keystroke processing** - VisualElements modify themselves directly
3. **Only re-render on external changes** - like focusState.currentFocus
4. **Stable object references** - don't recreate objects in render cycles
5. **Direct object mutation** - VisualElements change their internal state directly

### 7. Implementation Order

1. Create VisualElement base class
2. Implement ListItem with proper expand/scroll behavior
3. Implement RoundBoxContainer with child navigation
4. Create KeyboardHandler for delegation
5. Integrate with React using stable patterns
6. Replace all content with ListItem instances
7. Test navigation and visual feedback

### 8. Testing Approach

- Start with simple ListItem creation and rendering
- Test focus/active visual states
- Test keystroke delegation through KeyboardHandler
- Test container navigation between children
- Test element activation and content expansion
- Verify no flickering during navigation

### 9. Success Criteria

- [ ] Smooth navigation between elements (no flickering)
- [ ] Visual feedback for focused/active states
- [ ] Proper keyboard shortcut display
- [ ] Element expansion when activated
- [ ] Content scrolling within active elements
- [ ] Clean OOP architecture with proper DI

This plan focuses on implementing your elegant vision where each VisualElement handles keystrokes according to its nature, with React serving only as a stable rendering layer.