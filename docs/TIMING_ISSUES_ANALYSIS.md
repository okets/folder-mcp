# Timing Issues Analysis

## Component Lifecycle Registration Order

Based on code analysis, the registration order follows React's component mounting sequence:

### 1. Expected Registration Sequence

```
1. AppFullscreen mounts
   └─> useRootInput() sets up global input handler
   └─> useFocusChain('app', ...) registers app handler
   
2. NavigationProvider mounts (wraps children)
   └─> useNavigation() creates navigation state
   └─> useFocusChain('navigation', parent: 'app') registers
   
3. LayoutContainer renders children
   
4. ConfigurationPanelSimple mounts
   └─> useFocusChain('config-panel', parent: 'navigation') registers
   
5. StatusBar mounts
   └─> useEffect sets up listener for InputContextService changes
   └─> Immediately calls getActiveKeyBindings()
```

## Identified Timing Issues

### Issue 1: StatusBar Initial Render
**Problem**: StatusBar may render before all components have registered their handlers
**Location**: `StatusBar.tsx:18-31`
```typescript
useEffect(() => {
    const updateBindings = () => {
        try {
            const inputContextService = di.resolve(ServiceTokens.InputContextService);
            const bindings = inputContextService.getActiveKeyBindings();
            setKeyBindings(bindings);
        } catch {
            // Service not available
        }
    };
    
    updateBindings(); // Called immediately - may miss handlers
```

**Impact**: Initial render might show incomplete key bindings

### Issue 2: Dynamic Key Binding Updates
**Problem**: When ConfigurationPanelSimple changes between normal/edit mode, it re-registers with different bindings
**Location**: `ConfigurationPanelSimple.tsx:201-214`
```typescript
useFocusChain({
    // ...
    keyBindings: editingNodeIndex !== null ? [
        // Edit mode bindings
    ] : [
        // Normal mode bindings  
    ],
    priority: editingNodeIndex !== null ? 1000 : 50
});
```

**Sequence**:
1. Component re-renders with new state
2. useEffect in useFocusChain runs
3. Unregisters old handler
4. Registers new handler
5. Notifies listeners

**Race Condition**: StatusBar might query bindings during the unregister/register gap

### Issue 3: Focus Chain vs Registration Order
**Problem**: Components register in mount order, not focus chain order
- App registers first (lowest in hierarchy)
- Config panel registers last (highest in hierarchy)
- But focus chain is built from active element upward

**Impact**: Early queries to getActiveKeyBindings() might not see all handlers

### Issue 4: React Concurrent Features
**Problem**: React 19's concurrent rendering might cause:
- Components to mount in unpredictable order
- Effects to run asynchronously
- Multiple render passes before settling

## Current Workarounds

### 1. Navigation Never Active
`useNavigation.ts:102-108`
```typescript
isActive: false, // Never mark as active to avoid conflicts
```
This prevents navigation from being in the focus chain, avoiding conflicts.

### 2. High Priority Override
`InputContextService.ts:116-130`
When any handler has priority ≥ 1000, only its bindings are shown.
This creates a binary system instead of respecting the focus hierarchy.

### 3. Change Listeners
Components use listeners to react to registration changes, but this is reactive, not proactive.

## Root Cause

The fundamental issue is that the system relies on:
1. **Registration timing** - Components register when they mount
2. **Query timing** - StatusBar queries whenever it updates
3. **No coordination** - No way to ensure all components are ready

Instead of fixing timing, the architecture should be **timing-independent** by:
1. Making key bindings declarative based on state
2. Computing bindings from focus chain + registered handlers
3. Not relying on registration order

## Proposed Solution

Replace imperative registration with declarative bindings:
1. Components declare their bindings as part of their render
2. A context provider collects bindings from the component tree
3. StatusBar computes bindings based on current focus state
4. No timing dependencies - it's always consistent with rendered state