# Ink Conversion Plan for folder-mcp TUI

## Overview
Converting the current blessed-based TUI implementation to Ink (React for CLI). This plan outlines the systematic approach to migrate while preserving all functionality and improving the visual design.

## Current Architecture Analysis

### Core Components (Blessed)
1. **TUIApplication.ts** / **ModernTUIApplication.ts**
   - Main application orchestrator
   - Screen setup and keyboard handling
   - Component layout management
   - Focus/navigation state management

2. **VisualElement.ts**
   - Base class for all UI components
   - Focus/active state management
   - Parent-child relationships
   - Event handling abstraction

3. **ModernContainer.ts**
   - Container with rounded borders
   - Item selection and navigation
   - Expandable/collapsible items
   - Status indicators

4. **ModernHeader.ts**
   - Logo display (╭────────────────╮ style)
   - Status updates

5. **StatusBar.ts**
   - Dynamic keyboard shortcuts display
   - Temporary message display

6. **ListItem.ts**
   - Individual selectable items
   - Expandable content
   - Scrolling support

### Design System
- **modernTheme.ts**: Complete color palette, symbols, and styling system
- Unicode box-drawing characters for rounded corners
- Focus/selection state management
- Keyboard navigation patterns

## Ink Architecture Plan

### Phase 1: Setup and Foundation
1. **Install Ink Dependencies**
   ```bash
   npm install ink ink-spinner ink-select-input ink-text-input
   npm install --save-dev @types/react
   ```

2. **Create Ink App Structure**
   ```
   src/interfaces/tui-ink/
   ├── App.tsx                 # Main Ink app component
   ├── components/
   │   ├── Layout.tsx         # Overall layout manager
   │   ├── Header.tsx         # Logo header
   │   ├── Container.tsx      # Rounded border containers
   │   ├── StatusBar.tsx      # Status bar
   │   ├── ListItem.tsx       # Individual items
   │   └── HelpOverlay.tsx    # Help screen
   ├── hooks/
   │   ├── useNavigation.ts   # Navigation state
   │   ├── useFocus.ts        # Focus management
   │   └── useKeyboard.ts     # Keyboard shortcuts
   ├── contexts/
   │   ├── ThemeContext.tsx   # Theme provider
   │   └── AppContext.tsx     # Global app state
   └── utils/
       ├── theme.ts           # Ported theme system
       └── boxDrawing.ts      # Unicode helpers
   ```

### Phase 2: Component Migration

#### 2.1 Theme System
- Port `modernTheme.ts` to Ink's styling approach
- Create custom Box component with rounded corners using Unicode
- Implement color system using Ink's chalk integration

#### 2.2 Layout Components
```tsx
// Example Container component structure
const Container: FC<ContainerProps> = ({ title, children, focused }) => {
  return (
    <Box 
      flexDirection="column"
      borderStyle="round"
      borderColor={focused ? theme.colors.borderFocus : theme.colors.border}
    >
      <Text color={theme.colors.textPrimary}>{title}</Text>
      {children}
    </Box>
  );
};
```

#### 2.3 State Management
- Use React hooks for local state
- Context API for global app state
- Custom hooks for:
  - Focus management (`useFocus`)
  - Navigation (`useNavigation`)
  - Keyboard handling (`useKeyboard`)

### Phase 3: Feature Implementation

#### 3.1 Navigation System
```tsx
// Navigation hook structure
const useNavigation = () => {
  const [activeContainer, setActiveContainer] = useState<'config' | 'status'>('config');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  useInput((input, key) => {
    if (key.tab) {
      // Switch containers
    } else if (key.upArrow) {
      // Navigate up
    }
  });
  
  return { activeContainer, selectedIndex, ... };
};
```

#### 3.2 Focus Management
- Implement focus context that tracks:
  - Active container
  - Selected item within container
  - Expanded/collapsed states
- Visual indicators for focus states

#### 3.3 Keyboard Shortcuts
- Dynamic status bar that updates based on context
- Help overlay with all shortcuts
- Consistent navigation patterns (Tab, Arrows, Enter, Esc)

### Phase 4: Visual Enhancements

#### 4.1 Rounded Corners Fix
- Custom Box component using Text elements for corners
- Precise Unicode character positioning
- No blessed rendering issues

#### 4.2 Smooth Animations
- Use Ink's built-in animation support
- Transition effects for:
  - Focus changes
  - Item selection
  - Container expansion

#### 4.3 Better Unicode Support
- Direct control over character rendering
- No terminal compatibility issues
- Consistent cross-platform appearance

## Migration Tasks

### Week 1: Foundation
- [ ] Set up Ink project structure
- [ ] Create base App component
- [ ] Port theme system
- [ ] Implement custom Box with rounded corners
- [ ] Create Layout component

### Week 2: Core Components
- [ ] Migrate Header component
- [ ] Migrate Container component
- [ ] Migrate StatusBar component
- [ ] Implement navigation hooks
- [ ] Add focus management

### Week 3: Features & Polish
- [ ] Implement item selection/expansion
- [ ] Add keyboard shortcut system
- [ ] Create help overlay
- [ ] Add smooth transitions
- [ ] Test cross-platform compatibility

### Week 4: Integration & Testing
- [ ] Replace blessed entry point
- [ ] Update npm scripts
- [ ] Comprehensive testing
- [ ] Documentation updates
- [ ] Performance optimization

## Benefits of Ink Over Blessed

1. **Modern React Patterns**
   - Hooks for state management
   - Component composition
   - Better TypeScript support

2. **Better Unicode Handling**
   - Direct control over rendering
   - No positioning bugs
   - Consistent appearance

3. **Active Ecosystem**
   - Regular updates
   - Community components
   - Better documentation

4. **Improved Developer Experience**
   - Hot reload support
   - React DevTools
   - Familiar patterns

5. **Cross-Platform Consistency**
   - Better terminal detection
   - Graceful fallbacks
   - Reliable rendering

## Risk Mitigation

1. **Gradual Migration**
   - Keep blessed implementation as fallback
   - Test Ink version alongside
   - Switch via environment variable

2. **Feature Parity**
   - Ensure all blessed features work in Ink
   - Maintain keyboard shortcuts
   - Preserve visual design

3. **Performance**
   - Monitor render performance
   - Optimize re-renders
   - Use React.memo where needed

## Success Criteria

- [ ] All current features working in Ink
- [ ] Rounded corners render correctly
- [ ] No Unicode positioning issues
- [ ] Smooth navigation and focus
- [ ] Cross-platform compatibility
- [ ] Better or equal performance
- [ ] Cleaner, more maintainable code

## Next Steps

1. Create new branch: `feature/ink-tui`
2. Set up basic Ink structure
3. Start with Header component as proof of concept
4. Iterate based on results