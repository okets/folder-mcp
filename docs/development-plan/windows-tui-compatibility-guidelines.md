# Windows TUI Compatibility Guidelines

## Critical Rule: NEVER use console.error() during render cycle

**The Golden Rule**: Any `console.error()` call during React component rendering fragments ANSI escape sequence packets on Windows terminals, causing screen flickering and visual corruption.

## Windows Console Host Architecture

Windows Console Host processes ANSI escape sequences in **discrete "packets"** rather than character-by-character:
- React-Ink generates complex sequences like `\x1b[?1049h\x1b[2J\x1b[1;1H` (enter alternate buffer + clear + home cursor)
- These must arrive as **one uninterrupted stream** on Windows
- `console.error()` during render creates context switches that **fragment these packets**

## Render-time vs Event-time Logging

### 🔴 FORBIDDEN (Render-time logging)
Never use `console.error()` in methods called during React reconciliation:
- `render()` - Component rendering
- `getRequiredLines()` - Layout calculations  
- `calculateViewport()` - Scroll positioning
- `calculateChildViewport()` - Nested positioning
- Any React hook execution during render
- Layout calculation functions

### ✅ SAFE (Event-time logging)
Safe to use `console.error()` in:
- User event handlers (`onInput`, `onClick`, `onKeyPress`)
- Async operations (`daemon connection`, `file operations`)
- Error boundaries and try/catch blocks
- Component lifecycle methods outside render
- Cleanup functions and teardown

## Examples

### ❌ BAD - Causes Windows Flickering
```typescript
export const MyComponent: React.FC<Props> = ({ width, height }) => {
    const di = useDI();
    const debugService = di.resolve(ServiceTokens.DebugService);
    
    // FORBIDDEN: This fragments ANSI packets on Windows
    if (debugService.isEnabled()) {
        console.error(`Layout: ${width}x${height}`);
    }
    
    return <Text>Content</Text>;
};
```

### ✅ GOOD - Windows Compatible
```typescript
export const MyComponent: React.FC<Props> = ({ width, height, onError }) => {
    const handleUserInput = (input: string) => {
        try {
            // Process input
        } catch (error) {
            // SAFE: Event-time logging in error handler
            console.error('Failed to process input:', error);
            onError?.(error);
        }
    };
    
    return <Text>Content</Text>;
};
```

## Debug Logging Guidelines

### Environment Variable Gating
All debug logging must be gated behind environment variables:
```typescript
// CORRECT: Properly gated but still avoid in render methods
if (process.env.TUI_DEBUG === 'true') {
    console.error('Debug info'); // Only in event handlers!
}
```

### DebugService Usage
- ✅ **Safe**: Use DebugService in event handlers, async callbacks
- ❌ **Forbidden**: Use DebugService in render methods, layout calculations
- 🔄 **Refactor**: Move debug logging to component lifecycle events

## Component Patterns to Avoid

### Layout Container Anti-Pattern
```typescript
// BAD: Don't do this
export const LayoutContainer: React.FC<Props> = ({ width, height }) => {
    const debugService = di.resolve(ServiceTokens.DebugService);
    
    if (debugService.isEnabled()) {
        debugService.logLayout('LayoutContainer', { width, height }); // FRAGMENTS ANSI!
    }
    
    return layout;
};
```

### Bordered Box Anti-Pattern
```typescript
// BAD: Don't do this  
export const BorderedBox: React.FC<Props> = ({ title, width, height }) => {
    const debugService = di.resolve(ServiceTokens.DebugService);
    
    if (debugService.isEnabled()) {
        debugService.logLayout(`BorderedBox[${title}]`, { width, height }); // FRAGMENTS ANSI!
    }
    
    return borderedContent;
};
```

## Testing Requirements

### Windows Compatibility Testing
Before any TUI changes:
1. **Test on Windows Terminal** - Primary Windows terminal environment
2. **Test in PowerShell** - Legacy Windows terminal
3. **Test in Command Prompt** - Minimal ANSI support environment  
4. **Test in VSCode Terminal** - Development environment

### Debug Environment Testing
Always test with debug logging enabled to ensure no render-time logging:
```bash
TUI_DEBUG=true npm run tui
DEBUG_LAYOUT=true npm run tui
```

## Emergency Detection

### Symptoms of Windows ANSI Fragmentation
- Screen flickering during navigation
- Visual artifacts and corruption
- Incomplete screen redraws
- Terminal state corruption
- Cursor positioning errors

### Quick Diagnostic
If Windows users report flickering:
1. Check for new `console.error()` calls in render methods
2. Look for DebugService usage in layout components
3. Verify no debug environment variables are inadvertently set
4. Test with `TUI_DEBUG=true` to reproduce the issue

## Historical Context

This issue was **completely solved in commit 625da16** through surgical removal of render-time debug logging from:
- TextListItem.tsx (20+ debug statements)
- ContainerListItem.tsx (dynamic height debugging)  
- ButtonsRow.tsx (width calculation debugging)
- AppFullscreen.tsx (wizard completion logging)

The fix restored **perfect parity** between Windows and macOS TUI experience. Any regression indicates new render-time logging has been introduced.

## Implementation Guidelines

### Code Review Checklist
- [ ] No `console.error()` in render methods
- [ ] No DebugService usage in layout calculations
- [ ] All debug logging properly gated behind environment variables
- [ ] Debug logging only in event handlers and async operations
- [ ] Windows compatibility testing completed

### Development Workflow
1. **Write component** - No debug logging in render methods
2. **Add debugging** - Only in event handlers if needed  
3. **Test Windows compatibility** - Verify no flickering
4. **Code review** - Check for render-time logging violations
5. **Merge** - Only after Windows compatibility confirmed

## Long-term Architecture

### Future-Safe Patterns
- Use React DevTools for component debugging instead of console logging
- Implement debugging overlays that don't interfere with ANSI streams
- Consider Windows-specific terminal detection for enhanced compatibility
- Maintain separation between render logic and debugging infrastructure

This document ensures the **"perfect balance"** achieved in commit 625da16 is **never lost again**.