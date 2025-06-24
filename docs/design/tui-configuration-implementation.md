# TUI Configuration Components Implementation Plan

## Overview
This document outlines the implementation plan for interactive configuration components in the folder-mcp TUI, including dependency injection (DI) patterns and module boundaries.

## Design Principles

### Navigation Philosophy
- **Keyboard Navigation, Not Shortcuts**: Yes/No options use arrow keys to navigate between options, not Y/N shortcuts
- **Hierarchical Navigation**: Enter/→ expands a config node, then navigate within, Esc cancels, Enter saves
- **Collapsed Summary**: Each configuration row shows current value in brackets with different color, truncating description if needed
- **Dynamic Status Bar**: Status bar shows context-sensitive key bindings that change based on current state (form navigation vs. node editing)

### Component Architecture
- Clean separation between domain models, services, and UI components
- Dependency injection for all services
- Reusable primitive components
- Type-safe throughout with TypeScript

## Domain Models

### Core Configuration Types
```typescript
// src/interfaces/tui-ink/models/configuration.ts

// Base configuration node interface
export interface IConfigurationNode<T = any> {
    id: string;
    label: string;
    description?: string;
    value: T;
    defaultValue: T;
    validation?: IValidationRule<T>[];
}

// Specific node types
export interface ITextInputNode extends IConfigurationNode<string> {
    type: 'text';
    placeholder?: string;
    multiline?: boolean;
    maxLength?: number;
}

export interface INumberInputNode extends IConfigurationNode<number> {
    type: 'number';
    min?: number;
    max?: number;
    step?: number;
}

export interface IRadioGroupNode<T = string> extends IConfigurationNode<T> {
    type: 'radio';
    options: ISelectOption<T>[];
}

export interface ICheckboxListNode extends IConfigurationNode<string[]> {
    type: 'checkbox';
    options: ISelectOption<string>[];
}

export interface ISelectDropdownNode<T = string> extends IConfigurationNode<T> {
    type: 'select';
    options: ISelectOption<T>[];
    filterable?: boolean;
}

export interface IYesNoNode extends IConfigurationNode<boolean> {
    type: 'yesno';
}

// Supporting types
export interface ISelectOption<T = string> {
    value: T;
    label: string;
    description?: string;
    disabled?: boolean;
}

export interface IValidationRule<T> {
    validate: (value: T) => boolean;
    message: string;
}

// Union type for all nodes
export type ConfigurationNode = 
    | ITextInputNode 
    | INumberInputNode 
    | IRadioGroupNode 
    | ICheckboxListNode 
    | ISelectDropdownNode 
    | IYesNoNode;
```

## Service Layer

### Service Interfaces
```typescript
// src/interfaces/tui-ink/services/interfaces.ts (additions)

export interface IConfigurationService {
    // Node management
    getNodes(): ConfigurationNode[];
    getNode(id: string): ConfigurationNode | undefined;
    updateNodeValue(id: string, value: any): void;
    
    // Validation
    validateNode(id: string): IValidationResult;
    validateAll(): IValidationResult[];
    
    // Serialization
    getConfiguration(): Record<string, any>;
    loadConfiguration(config: Record<string, any>): void;
}

export interface IFormNavigationService {
    // Node navigation
    getCurrentNodeId(): string | null;
    expandNode(nodeId: string): void;
    collapseNode(): void;
    isNodeExpanded(nodeId: string): boolean;
    
    // Within-node navigation
    getSelectedOptionIndex(): number;
    selectOption(index: number): void;
    
    // Form-level navigation
    moveToNextNode(): void;
    moveToPreviousNode(): void;
}

export interface IInputService {
    // Text input management
    getCursorPosition(): number;
    setCursorPosition(position: number): void;
    insertText(text: string): void;
    deleteText(count: number, direction: 'left' | 'right'): void;
    
    // Filter input
    getFilterText(): string;
    setFilterText(text: string): void;
    clearFilter(): void;
}

export interface IValidationService {
    registerRule<T>(rule: IValidationRule<T>): void;
    validate<T>(value: T, rules: IValidationRule<T>[]): IValidationResult;
}

export interface IValidationResult {
    isValid: boolean;
    errors: string[];
}

export interface IStatusBarService {
    // Update status bar based on current context
    setContext(context: 'form' | 'editing' | 'selecting' | 'filtering'): void;
    
    // Set custom key bindings for current state
    setKeyBindings(bindings: IKeyBinding[]): void;
    
    // Get current key bindings to display
    getKeyBindings(): IKeyBinding[];
}

export interface IKeyBinding {
    key: string;
    description: string;
}
```

### Service Tokens
```typescript
// src/interfaces/tui-ink/di/tokens.ts (additions)

export const ServiceTokens = {
    // ... existing tokens ...
    ConfigurationService: Symbol('ConfigurationService') as symbol & { __type: IConfigurationService },
    FormNavigationService: Symbol('FormNavigationService') as symbol & { __type: IFormNavigationService },
    InputService: Symbol('InputService') as symbol & { __type: IInputService },
    ValidationService: Symbol('ValidationService') as symbol & { __type: IValidationService },
    StatusBarService: Symbol('StatusBarService') as symbol & { __type: IStatusBarService },
};
```

## Module Structure

```
src/interfaces/tui-ink/
├── models/
│   ├── configuration.ts          # Domain models for config nodes
│   └── validation.ts            # Validation rule definitions
│
├── services/
│   ├── ConfigurationService.ts  # Config state management
│   ├── FormNavigationService.ts # Form navigation logic
│   ├── InputService.ts          # Text input handling
│   └── ValidationService.ts     # Validation engine
│
├── components/
│   ├── configuration/
│   │   ├── ConfigurationForm.tsx     # Main form container
│   │   ├── ConfigurationNode.tsx     # Base node component
│   │   ├── nodes/
│   │   │   ├── TextInputNode.tsx
│   │   │   ├── RadioGroupNode.tsx
│   │   │   ├── CheckboxListNode.tsx
│   │   │   ├── SelectDropdownNode.tsx
│   │   │   └── YesNoNode.tsx
│   │   └── shared/
│   │       ├── NodeWrapper.tsx       # Collapsed/expanded wrapper
│   │       ├── ValidationMessage.tsx # Error display
│   │       └── FilterInput.tsx       # Type-to-filter input
│   │
│   └── primitives/               # Reusable UI primitives
│       ├── TextInput.tsx         # Basic text input
│       ├── RadioButton.tsx       # Single radio button
│       ├── Checkbox.tsx          # Single checkbox
│       └── SelectList.tsx        # Scrollable option list
│
└── hooks/
    ├── useNodeNavigation.ts      # Node-specific navigation
    ├── useTextInput.ts           # Text input management
    └── useValidation.ts          # Validation state
```

## Visual Design Specifications

### Configuration Node States

#### Text Input Node
**Collapsed:**
```
│ Folder Path: [/Users/example/documents]                        →
```
- Description in default text color
- Value in brackets with secondary/muted color

### Collapsed Summary Truncation

When space is limited, the description is truncated while preserving the value:

**Full width:**
```
│ Enable Automatic Indexing on Startup: [Yes]                    →
```

**Medium width:**
```
│ Enable Automatic Index...: [Yes]                              →
```

**Narrow width:**
```
│ Enable...: [Yes]                                               →
```

**Very narrow (value always shown):**
```
│ ...: [Yes]                                                     →
```

For checkbox lists, values are comma-separated:
```
│ Advanced Options: [Hot reload, Auto-index, Debug logging]      →
```

When truncated:
```
│ Advanced...: [Hot reload, Auto-index, Debug logging]          →
```

**Expanded:**
```
▶ Folder Path:
  ╭────────────────────────────────────────────────────────────╮
  │ /Users/example/documents█                                  │
  ╰────────────────────────────────────────────────────────────╯
```

**Status Bar (when expanded):**
```
[←→] Move cursor  [Backspace] Delete  [Esc] Cancel  [Enter] Save
```

#### Radio Button Node
**Collapsed:**
```
│ Language Support: [Multi-language]                             →
```

**Expanded:**
```
▶ Language Support:
  │ Single-language (better accuracy)
  ◉ Multi-language (recommended for mixed codebases)
```

**Status Bar (when expanded):**
```
[↑↓] Navigate  [Space/Enter] Select  [Esc] Cancel
```

#### Yes/No Node
**Collapsed:**
```
│ Enable Hot Reload: [Yes]                                       →
```

**Expanded:**
```
▶ Enable Hot Reload:
  ◉ Yes
  │ No
```

**Status Bar (when expanded):**
```
[↑↓] Navigate  [Space/Enter] Select  [Esc] Cancel
```

#### Checkbox List Node
**Collapsed:**
```
│ Advanced Options: [Hot reload, Auto-index]                     →
```

**Expanded:**
```
▶ Advanced Options:
  ☑ Enable hot reload
  ☐ Enable debug logging  
  ☑ Auto-index on startup
```

**Status Bar (when expanded):**
```
[↑↓] Navigate  [Space] Toggle  [Esc] Cancel  [Enter] Save
```

#### Select/Dropdown Node
**Collapsed:**
```
│ Embedding Model: [nomic-embed-text]                            →
```

**Expanded:**
```
▶ Embedding Model:
  ╭────────────────────────────────────────────────────────────╮
  │ Type to filter...                                          │
  ╰────────────────────────────────────────────────────────────╯
  
  ◉ nomic-embed-text (recommended)
  │ all-MiniLM-L6-v2 (balanced)
  │ bge-large-en-v1.5 (high performance)
  │ multilingual-e5-large (multi-language)
```

**Status Bar (when expanded):**
```
[Type] Filter  [↑↓] Navigate  [Enter] Select  [Esc] Cancel
```

## Status Bar Context States

The status bar dynamically updates based on the current context:

### Form Navigation Mode (all nodes collapsed)
```
[↑↓] Navigate  [→/Enter] Edit  [Tab] Switch Panel  [q] Quit
```

### Text Input Mode
```
[←→] Move cursor  [Backspace] Delete  [Esc] Cancel  [Enter] Save
```

### Selection Mode (Radio/Yes-No)
```
[↑↓] Navigate  [Space/Enter] Select  [Esc] Cancel
```

### Checkbox Mode
```
[↑↓] Navigate  [Space] Toggle  [Esc] Cancel  [Enter] Save
```

### Dropdown/Filter Mode
```
[Type] Filter  [↑↓] Navigate  [Enter] Select  [Esc] Cancel
```

### Implementation Pattern
```typescript
// Status bar updates automatically based on navigation state
const updateStatusBar = (navService: IFormNavigationService, statusBarService: IStatusBarService) => {
    const currentNodeId = navService.getCurrentNodeId();
    
    if (!currentNodeId) {
        // Form-level navigation
        statusBarService.setKeyBindings([
            { key: '↑↓', description: 'Navigate' },
            { key: '→/Enter', description: 'Edit' },
            { key: 'Tab', description: 'Switch Panel' },
            { key: 'q', description: 'Quit' }
        ]);
    } else {
        // Node-specific bindings based on node type
        const node = configService.getNode(currentNodeId);
        switch (node?.type) {
            case 'text':
                statusBarService.setKeyBindings([
                    { key: '←→', description: 'Move cursor' },
                    { key: 'Backspace', description: 'Delete' },
                    { key: 'Esc', description: 'Cancel' },
                    { key: 'Enter', description: 'Save' }
                ]);
                break;
            // ... other node types
        }
    }
};
```

## Implementation Order (Revised)

### Development Approach
- **Direct Integration**: Implement components directly in the main TUI (`npm run tui`)
- **Incremental Development**: One configuration type at a time
- **Visual Testing**: Test each component visually before proceeding
- **No Demo Environment**: Work in the actual application context

### Phase 1: Replace ConfigurationPanel ✅
Replace the current static ConfigurationPanel with a dynamic configuration system.

### Phase 2: TextInput Configuration ✅
1. **Simplify TextInputNode** ✅ - Created ConfigurationPanelSimple without complex services
2. **Fix Navigation** ✅ - Arrow keys work for navigating between items
3. **Fix Enter/Expand** ✅ - Configuration items display with values in brackets
4. **Test Visual Result** ✅ - Verified configuration panel shows all items with values
5. **Status**: Configuration items are displaying correctly with collapsed summaries

**Visual Output Achieved:**
```
╭─ Configuration ──────────────────────────────────────────────────────────────╮
│ Setup your folder-mcp server                                                 │
│ ▶ Folder Path: [/Users/example/documents] →                                  │
│ │ Embedding Model: [nomic-embed-text] →                                      │
│ │ Cache Directory: [~/.folder-mcp/cache] →                                   │
│ │ Memory Limit: [2048] →                                                     │
│ │ Enable Hot Reload: [Yes] →                                                 │
│ │ Enable Debug Logging: [No] →                                               │
│ │ Network Timeout: [30] →                                                    │
│                                                                              │
╰──────────────────────────────────────────────────────────────────────────────╯
```

**Current Status**: Basic collapsed view is working. Need to implement expanded editing view.

### Phase 2.1: TextInput Editing - Issues Found
1. **Current State**: 
   - Collapsed view shows configuration items with values in brackets ✅
   - Basic expand/collapse mechanism implemented
   - Blinking cursor implemented ✅
   
2. **Critical Issues Discovered**:
   
   **Issue 1: Box Gap Problem**
   - When expanding a configuration item, it breaks the BorderedBox layout
   - Root cause: BorderedBox expects each child to be single-line
   - Expanded items render as multi-line components, causing overflow
   
   **Issue 2: Keyboard Control Problem**
   - Multiple `useInput` hooks compete for keyboard input
   - 'q' key is globally bound to quit, unavailable for text input
   - Arrow keys continue navigating while editing text
   - No concept of "input ownership" or "active element"
   
3. **Root Cause Analysis**:
   - Both issues stem from lack of proper ownership boundaries
   - No hierarchical focus management
   - No concept of render space allocation
   - Components can't properly claim keyboard input or screen space

3. **Expected Expanded View**:
   ```
   ▶ Folder Path:
     ╭────────────────────────────────────────────╮
     │ /Users/example/documents█                  │
     ╰────────────────────────────────────────────╯
     [Esc] Cancel  [Enter] Save
   ```

### Phase 3: Yes/No Configuration
1. **Create YesNoNode** - Simple binary choice
2. **Implement Navigation** - Up/down between Yes/No
3. **Test Visual Result**
4. **Get User Feedback**

### Phase 4: Radio Group Configuration
1. **Create RadioGroupNode** - Single selection from options
2. **Implement Navigation** - Arrow keys through options
3. **Test Visual Result**
4. **Get User Feedback**

### Phase 5: Checkbox List Configuration
1. **Create CheckboxListNode** - Multiple selections
2. **Implement Toggle** - Space to check/uncheck
3. **Test Visual Result**
4. **Get User Feedback**

### Phase 6: Select/Dropdown Configuration
1. **Create SelectDropdownNode** - With type-to-filter
2. **Implement Filter** - Real-time filtering
3. **Test Visual Result**
4. **Get User Feedback**

### Testing Protocol
For each component:
1. Implement the component
2. Integrate into main TUI
3. Run `npm run tui`
4. Verify visual appearance
5. Test keyboard navigation
6. Fix any issues
7. Only then request user feedback

## Component Implementation Patterns

### Collapsed Summary Rendering
```typescript
interface ICollapsedSummaryProps {
    label: string;
    value: string | string[];
    maxWidth: number;
    isSelected: boolean;
}

const CollapsedSummary: React.FC<ICollapsedSummaryProps> = ({ 
    label, 
    value, 
    maxWidth,
    isSelected 
}) => {
    const theme = useTheme();
    const displayValue = Array.isArray(value) ? value.join(', ') : value;
    
    // Calculate available space
    const prefixWidth = 2; // "│ " or "▶ "
    const suffixWidth = 1; // "→"
    const bracketsWidth = 2; // "[]"
    const separatorWidth = 2; // ": "
    
    const availableWidth = maxWidth - prefixWidth - suffixWidth - bracketsWidth - separatorWidth;
    
    // Always show value, truncate label if needed
    const valueWidth = displayValue.length;
    const labelWidth = availableWidth - valueWidth;
    
    let truncatedLabel = label;
    if (labelWidth < label.length) {
        truncatedLabel = label.substring(0, Math.max(3, labelWidth - 3)) + '...';
    }
    
    return (
        <Text>
            <Text color={isSelected ? theme.colors.accent : undefined}>
                {isSelected ? '▶' : '│'} {truncatedLabel}: 
            </Text>
            <Text color={theme.colors.textSecondary}>
                [{displayValue}]
            </Text>
            <Text> →</Text>
        </Text>
    );
};
```

### Base Component Pattern
```typescript
abstract class ConfigurationNodeComponent<T extends ConfigurationNode> extends React.Component {
    protected configService: IConfigurationService;
    protected navService: IFormNavigationService;
    protected themeService: IThemeService;
    
    abstract renderCollapsed(): JSX.Element;
    abstract renderExpanded(): JSX.Element;
    
    render() {
        const isExpanded = this.navService.isNodeExpanded(this.props.node.id);
        return isExpanded ? this.renderExpanded() : this.renderCollapsed();
    }
}
```

### Service Usage Pattern
```typescript
const TextInputNode: React.FC<{ node: ITextInputNode }> = ({ node }) => {
    const di = useDI();
    const configService = di.resolve(ServiceTokens.ConfigurationService);
    const navService = di.resolve(ServiceTokens.FormNavigationService);
    const inputService = di.resolve(ServiceTokens.InputService);
    
    const isExpanded = navService.isNodeExpanded(node.id);
    const value = configService.getNode(node.id)?.value || '';
    
    if (!isExpanded) {
        return <CollapsedView label={node.label} value={value} />;
    }
    
    return <ExpandedTextInput 
        value={value}
        onChange={(newValue) => configService.updateNodeValue(node.id, newValue)}
        cursorPosition={inputService.getCursorPosition()}
    />;
};
```

### Navigation Flow
```typescript
// Main form navigation
useInput((input, key) => {
    const navService = di.resolve(ServiceTokens.FormNavigationService);
    const currentNodeId = navService.getCurrentNodeId();
    
    if (!currentNodeId) {
        // Form-level navigation
        if (key.upArrow) navService.moveToPreviousNode();
        if (key.downArrow) navService.moveToNextNode();
        if (key.rightArrow || key.return) {
            navService.expandNode(navService.getCurrentNodeId());
        }
    } else {
        // Within-node navigation
        if (key.escape) navService.collapseNode();
        // Node-specific handling...
    }
});
```

## Testing Strategy

### Unit Tests
- Test each service in isolation
- Mock dependencies using DI
- Test validation rules
- Test navigation state transitions

### Component Tests
- Test collapsed/expanded rendering
- Test keyboard interactions
- Test value updates
- Test validation display

### Integration Tests
- Test complete form flow
- Test service interactions
- Test state persistence
- Test edge cases

## Implementation Checklist

### Infrastructure
- [ ] Create domain models
- [ ] Implement validation service
- [ ] Implement input service
- [ ] Implement form navigation service
- [ ] Update DI container and tokens

### Primitive Components
- [ ] TextInput with cursor
- [ ] RadioButton component
- [ ] Checkbox component
- [ ] SelectList with scrolling

### Configuration Nodes
- [ ] NodeWrapper base component
- [ ] TextInputNode
- [ ] RadioGroupNode
- [ ] YesNoNode (special case of RadioGroup)
- [ ] CheckboxListNode
- [ ] SelectDropdownNode

### Form Integration
- [ ] ConfigurationForm container
- [ ] ConfigurationService implementation
- [ ] Replace existing ConfigurationPanel
- [ ] Test complete flow

### Polish
- [ ] Smooth animations
- [ ] Proper focus management
- [ ] Accessibility improvements
- [ ] Performance optimization

## Success Criteria
- Clean, testable architecture with proper DI
- Smooth keyboard navigation matching design spec
- All configuration types working correctly
- Proper validation and error handling
- Seamless integration with existing TUI

## Phase 3: Architectural Refactoring (NEW)

### Problem Statement
The current implementation has two critical architectural issues:

1. **Box Gap Problem**: Expanded configuration items break the BorderedBox layout because it expects single-line children
2. **Keyboard Control Problem**: Multiple components compete for keyboard input, and active fields can't claim exclusive control

### Architectural Solution: Focus Chain & Render Slots

Based on hierarchical ownership principles:
- Only ONE element can be "active" in the entire application
- Active element and its ancestors form the "focus chain"
- Active element owns keyboard input and can claim screen space

### New Services to Implement

#### IFocusChainService
```typescript
interface IFocusChainService {
  setActive(elementId: string | null): void;
  getActive(): string | null;
  registerParent(childId: string, parentId: string): void;
  getFocusChain(): string[]; // Returns [active, ...ancestors]
  isInFocusChain(elementId: string): boolean;
}
```

#### IInputContextService
```typescript
interface IInputContextService {
  registerHandler(elementId: string, handler: InputHandler, priority: number): void;
  unregisterHandler(elementId: string): void;
  handleInput(input: string, key: Key): boolean;
  getActiveKeyBindings(): IKeyBinding[];
}
```

#### IRenderSlotService
```typescript
interface IRenderSlotService {
  claimSlots(elementId: string, count: number): void;
  releaseSlots(elementId: string): void;
  getTotalSlots(containerId: string): number;
}
```

### Implementation Plan

1. **Phase 3.1: Focus Chain & Input Control**
   - Implement focus chain service
   - Implement input context service
   - Update components to use focus chain
   - Remove competing useInput hooks

2. **Phase 3.2: Render Slot System**
   - Implement render slot service
   - Update configuration items to claim slots
   - Update BorderedBox to respect slot allocation

3. **Phase 3.3: Integration & Polish**
   - Update status bar with context-aware bindings
   - Add visual indicators for active state
   - Comprehensive testing

This architectural refactoring will provide a solid foundation for all future interactive components.