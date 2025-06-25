# Key Handler Component Map

## Component Hierarchy and Registration

### 1. AppFullscreen (Root)
- **File**: `src/interfaces/tui-ink/AppFullscreen.tsx`
- **Element ID**: `'app'`
- **Parent**: None (root)
- **Priority**: `-100` (lowest)
- **Active**: Always
- **Key Bindings**:
  ```typescript
  { key: 'q', description: 'Quit' } // Only when not in edit mode
  ```
- **Purpose**: Application-level commands that should be overridable

### 2. Navigation System
- **File**: `src/interfaces/tui-ink/hooks/useNavigation.ts`
- **Element ID**: `'navigation'`
- **Parent**: `'app'`
- **Priority**: `10`
- **Active**: Never (`isActive: false`) - designed to avoid conflicts
- **Key Bindings**:
  ```typescript
  { key: 'Tab', description: 'Switch Panel' }
  { key: '↑↓', description: 'Navigate' }
  ```
- **Purpose**: Global navigation between panels

### 3. ConfigurationPanelSimple
- **File**: `src/interfaces/tui-ink/components/ConfigurationPanelSimple.tsx`
- **Element ID**: `'config-panel'`
- **Parent**: `'navigation'`
- **Priority**: 
  - Normal mode: `50`
  - Edit mode: `1000` (highest)
- **Active**: When `navigation.isConfigFocused === true`
- **Key Bindings**:
  - Normal mode:
    ```typescript
    { key: '→/Enter', description: 'Edit' }
    ```
  - Edit mode:
    ```typescript
    { key: '←→', description: 'Move cursor' }
    { key: 'Esc', description: 'Cancel' }
    { key: 'Enter', description: 'Save' }
    ```

## Priority Ladder

| Priority | Component | Purpose |
|----------|-----------|---------|
| 1000 | ConfigurationPanelSimple (edit) | Modal state - captures all input |
| 50 | ConfigurationPanelSimple (normal) | Panel-specific navigation |
| 10 | Navigation | Global navigation |
| -100 | App | Overridable app commands |

## Registration Pattern

All components follow the same pattern:

```typescript
const { isInFocusChain } = useFocusChain({
    elementId: 'unique-id',
    parentId: 'parent-id',  // optional
    isActive: condition,    // when this element should be active
    onInput: handler,       // function to process input
    keyBindings: [...],     // bindings to show in status bar
    priority: number        // processing order
});
```

## Focus Chain States

### State 1: Config Panel Focused (Normal)
```
Focus Chain: ['config-panel', 'navigation', 'app']
Active Handlers (by priority):
- config-panel (50): → Enter
- navigation (10): Tab ↑↓
- app (-100): q
```

### State 2: Config Panel Edit Mode
```
Focus Chain: ['config-panel', 'navigation', 'app']
Active Handlers (by priority):
- config-panel (1000): ←→ Esc Enter
- (all others blocked by high priority)
```

## Current Issues

1. **StatusBar doesn't respect focus chain** - Shows all bindings or only high-priority
2. **Navigation never active** - Uses `isActive: false` as workaround
3. **No support for nested contexts** - Can't have sub-panels with own bindings
4. **Missing components** - Status panel not implemented yet

## Future Components to Add

1. **StatusPanel** - Similar to ConfigurationPanel
2. **ModalDialog** - For confirmations, inputs
3. **ListSelector** - For dropdown-style selections
4. **CheckboxGroup** - For multiple selections
5. **TextArea** - For multi-line input