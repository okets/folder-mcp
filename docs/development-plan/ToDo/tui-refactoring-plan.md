# TUI Incremental Refactoring Plan

## Completion Status
- ✅ Phase 1: Extract Data and Types - **COMPLETED**
- ✅ Phase 2: Create Container Components - **COMPLETED**
- ✅ Phase 3: Service Layer Foundation - **COMPLETED**
- ✅ Phase 4: Minimal DI Container - **COMPLETED**
- ✅ Phase 5: Gradual Component Migration - **COMPLETED**
- ✅ Phase 6: AppFullscreen Cleanup and Legacy Code Removal - **COMPLETED**
- ✅ Phase 7: Fix Horizontal Overflow Bug (Module-Boundary Driven) - **COMPLETED**

## Overview
This document outlines a careful, incremental approach to refactoring the TUI application to introduce proper Dependency Injection (DI) and module boundaries. Each step is designed to have **zero visual impact** while improving the architecture.

## Guiding Principles
- **No Visual Changes**: Every step must maintain identical visual output
- **Incremental Progress**: Small, verifiable changes that can be rolled back
- **Continuous Verification**: Run `npm run tui` after each step
- **Preserve Functionality**: All keyboard navigation and features must work identically

## Phase 1: Extract Data and Types (No Visual Impact)

### Step 1.1: Create Data Models
- Create `src/interfaces/tui-ink/models/` directory
- Extract interfaces:
  ```typescript
  // models/ConfigItem.ts
  export interface ConfigItem {
    id: string;
    label: string;
    description?: string;
  }
  
  // models/StatusItem.ts
  export interface StatusItem {
    text: string;
    status: string;
  }
  ```
- Move sample data arrays to `models/sampleData.ts`
- Update imports in AppFullscreen.tsx
- **Verification**: Run `npm run tui` - should look identical

### Step 1.2: Create Types for UI State
- Define state interfaces in `models/types.ts`:
  ```typescript
  export type FocusedPanel = 'config' | 'status';
  
  export interface NavigationState {
    focusedPanel: FocusedPanel;
    selectedIndices: Record<FocusedPanel, number>;
  }
  
  export interface ScrollState {
    offset: number;
    visibleCount: number;
    totalCount: number;
  }
  ```
- Create border style types
- Extract theme type definitions
- **Verification**: Run `npm run tui` - should look identical

## Phase 2: Create Container Components (No Visual Impact)
Move from scattered functions to proper encapsulated components that own their behavior.

### Step 2.1: Enhance ScrollableContainer Component
- Move `calculateScrollbar` function into ScrollableContainer as private method
- Container should own its scroll state and scrollbar rendering
- Remove hardcoded width assumptions (currently 76 characters)
- Make it truly reusable:
  ```typescript
  interface ScrollableContainerProps {
    children: React.ReactNode;
    height: number;
    width: number;
    scrollOffset?: number;
    totalItems?: number;
    onScroll?: (offset: number) => void;
  }
  ```
- **Verification**: Run `npm run tui` - should look identical

### Step 2.2: Create BorderedBox Component
- Create `src/interfaces/tui-ink/components/BorderedBox.tsx`
- Move `createBorder` logic into a proper component
- Encapsulate all border rendering concerns:
  ```typescript
  interface BorderedBoxProps {
    title: string;
    subtitle?: string;
    focused?: boolean;
    width: number;
    height: number;
    children: React.ReactNode;
    showScrollbar?: boolean;
    scrollbarElements?: string[];
  }
  ```
- Component handles title embedding, focus states, and border drawing
- **Verification**: Run `npm run tui` - should look identical

### Step 2.3: Create LayoutContainer Component
- Create `src/interfaces/tui-ink/components/LayoutContainer.tsx`
- Extract layout decision logic from AppFullscreen
- Manages narrow vs wide terminal arrangement
- Handles space allocation between panels:
  ```typescript
  interface LayoutContainerProps {
    availableHeight: number;
    availableWidth: number;
    children: React.ReactElement[];
    narrowBreakpoint?: number; // Optional, defaults to 100 columns
  }
  ```
- Automatically arranges children based on terminal width:
  - **Narrow terminals** (<100 columns): Stack panels vertically
  - **Wide terminals** (>=100 columns): Arrange panels side-by-side
- Encapsulates responsive behavior and breakpoints
- **Verification**: Run `npm run tui` - should look identical

## Phase 3: Service Layer Foundation (No Visual Impact)

### Step 3.1: Create Service Interfaces
- Create `src/interfaces/tui-ink/services/interfaces.ts`:
  ```typescript
  export interface IThemeService {
    getColors(): ThemeColors;
    getSymbols(): ThemeSymbols;
    getBorderStyle(): BorderStyle;
  }
  
  export interface INavigationService {
    getState(): NavigationState;
    switchFocus(): void;
    moveSelection(panel: FocusedPanel, direction: 'up' | 'down'): void;
    getSelectedIndex(panel: FocusedPanel): number;
  }
  
  export interface IDataService {
    getConfigItems(): string[];
    getStatusItems(): StatusItem[];
  }
  
  export interface ITerminalService {
    getSize(): TerminalSize;
    isNarrow(): boolean;
  }
  ```
- No implementation yet
- **Verification**: Run `npm run tui` - should look identical

### Step 3.2: Create Service Implementations
- Implement services in `services/` directory:
  - `ThemeService`: Wraps existing theme.ts with proper interface
  - `NavigationService`: Encapsulates navigation state and logic from useNavigation hook
  - `DataService`: Returns sample data (will move from models/sampleData.ts)
  - `TerminalService`: Wraps useTerminalSize hook logic
- Services must return **exact same values** as current code
- **Verification**: Run `npm run tui` - should look identical

## Phase 4: Minimal DI Container (No Visual Impact)

### Step 4.1: Create DI Container with Type Safety
- Create `src/interfaces/tui-ink/di/tokens.ts`:
  ```typescript
  import { IThemeService, IDataService, INavigationService, ITerminalService } from '../services/interfaces.js';
  
  export const ServiceTokens = {
    ThemeService: Symbol('ThemeService') as symbol & { __type: IThemeService },
    DataService: Symbol('DataService') as symbol & { __type: IDataService },
    NavigationService: Symbol('NavigationService') as symbol & { __type: INavigationService },
    TerminalService: Symbol('TerminalService') as symbol & { __type: ITerminalService }
  };
  ```

- Create `src/interfaces/tui-ink/di/container.ts`:
  ```typescript
  export class DIContainer {
    private services = new Map<symbol, any>();
    
    register<T>(token: symbol & { __type: T }, instance: T): void {
      this.services.set(token, instance);
    }
    
    resolve<T>(token: symbol & { __type: T }): T {
      const service = this.services.get(token);
      if (!service) {
        throw new Error(`Service not found for token: ${token.toString()}`);
      }
      return service;
    }
  }
  ```
- **Verification**: Run `npm run tui` - should look identical

### Step 4.2: Create React Context for DI
- Create `src/interfaces/tui-ink/di/DIContext.tsx`:
  ```typescript
  import React, { createContext, useContext } from 'react';
  import { DIContainer } from './container.js';
  
  const DIContext = createContext<DIContainer | null>(null);
  
  export const DIProvider: React.FC<{ container: DIContainer; children: React.ReactNode }> = ({ 
    container, 
    children 
  }) => {
    return <DIContext.Provider value={container}>{children}</DIContext.Provider>;
  };
  
  export const useDI = () => {
    const container = useContext(DIContext);
    if (!container) throw new Error('DI container not found');
    return container;
  };
  ```

### Step 4.3: Setup DI Container
- Create `src/interfaces/tui-ink/di/setup.ts`:
  ```typescript
  import { DIContainer } from './container.js';
  import { ServiceTokens } from './tokens.js';
  import { ThemeService, DataService, NavigationService, TerminalService } from '../services/index.js';
  
  export const setupDIContainer = (): DIContainer => {
    const container = new DIContainer();
    
    // Register all services
    container.register(ServiceTokens.ThemeService, new ThemeService());
    container.register(ServiceTokens.DataService, new DataService());
    container.register(ServiceTokens.NavigationService, new NavigationService());
    container.register(ServiceTokens.TerminalService, new TerminalService());
    
    return container;
  };
  ```

- Update `index.tsx` to wrap App with DIProvider:
  ```typescript
  import { DIProvider } from './di/DIContext.js';
  import { setupDIContainer } from './di/setup.js';
  
  const container = setupDIContainer();
  
  const app = render(
    <DIProvider container={container}>
      <App />
    </DIProvider>
  );
  ```
- Components still use direct imports (migration happens in Phase 5)
- **Verification**: Run `npm run tui` - should look identical

## Phase 5: Gradual Component Migration (No Visual Impact)

**Note**: This phase will use the components created in Phase 2 (BorderedBox, LayoutContainer) and services from Phase 3-4.

### Step 5.1: Migrate Header Component
- Update Header.tsx:
  ```typescript
  import { useDI } from '../di/DIContext.js';
  import { ServiceTokens } from '../di/tokens.js';
  
  export const Header: React.FC = () => {
    const di = useDI();
    const themeService = di.resolve(ServiceTokens.ThemeService);
    const { colors, symbols } = {
      colors: themeService.getColors(),
      symbols: themeService.getSymbols()
    };
    
    // Rest of component remains identical, using colors.accent instead of theme.colors.accent
  };
  ```
- Keep exact same render output
- **Verification**: Run `npm run tui` - should look identical

### Step 5.2: Migrate StatusBar Component
- Inject ThemeService and DataService
- Keep defaultShortcuts as fallback
- Maintain exact same props interface
- **Verification**: Run `npm run tui` - should look identical

### Step 5.3: Use BorderedBox in AppFullscreen
- Replace inline `createBorder` usage with BorderedBox component
- Pass scrollbar elements from calculateScrollbar
- Maintain exact same visual output:
  ```typescript
  <BorderedBox
    title="Configuration"
    subtitle="Setup your folder-mcp server"
    focused={navigation.isConfigFocused}
    width={configWidth}
    height={configHeight}
    showScrollbar={true}
    scrollbarElements={scrollbar}
  >
    {/* Render config items */}
  </BorderedBox>
  ```
- **Verification**: Run `npm run tui` - should look identical

### Step 5.4: Use LayoutContainer in AppFullscreen
- Replace manual narrow/wide layout logic with LayoutContainer
- Pass configuration and status panels as children
- Let LayoutContainer handle the arrangement:
  ```typescript
  <LayoutContainer
    availableHeight={availableHeight}
    availableWidth={columns}
    narrowBreakpoint={100}
  >
    <ConfigurationPanel />
    <StatusPanel />
  </LayoutContainer>
  ```
- **Verification**: Run `npm run tui` - should look identical

## Phase 6: AppFullscreen Cleanup and Legacy Code Removal (No Visual Impact)

### Step 6.1: Clean Up AppFullscreen
- Remove inline helper functions that are now in components:
  - ✅ `createBorder` - Already removed (replaced by BorderedBox)
  - `calculateScrollbar` - Still used by ConfigurationPanel and StatusPanel
- Extract panel components to separate files:
  - Move `ConfigurationPanel` to `components/ConfigurationPanel.tsx`
  - Move `StatusPanel` to `components/StatusPanel.tsx`
- **Verification**: Run `npm run tui` - should look identical

### Step 6.2: Use Injected Services Where Appropriate
- ConfigurationPanel and StatusPanel can optionally use services
- Keep hooks where they make sense (useNavigation for interactivity)
- **Verification**: Run `npm run tui` - should look identical

### Step 6.3: Clean Up Legacy Code and Temporary Files
- Remove all `.backup` files created during refactoring
- Remove unused imports and dead code
- Ensure all components follow consistent patterns
- Update imports to use proper paths
- **Verification**: Run `npm run tui` - should look identical

### Step 6.4: Final Code Organization
- Ensure consistent file naming and organization
- Update barrel exports if needed
- Document the new architecture in comments
- **Verification**: Run `npm run tui` - should look identical

## Testing Protocol for Each Step

### Visual Test
1. Run `npm run tui`
2. Compare with screenshot/memory of previous state
3. Check borders, colors, text alignment
4. Verify scrollbars appear correctly

### Behavior Test
1. Test arrow keys (up/down navigation)
2. Test Tab key (focus switching)
3. Test Enter/Right arrow (expand - if implemented)
4. Test Esc/Left arrow (back - if implemented)
5. Test 'q' key (quit)

### Scroll Test
1. Navigate past visible items
2. Verify scroll indicators appear
3. Check scrollbar visualization
4. Ensure selected item stays visible

### Resize Test
1. Resize terminal window
2. Check portrait/landscape transition
3. Verify layout adjusts correctly
4. Ensure no text overflow

## Rollback Strategy

### For Each Step:
```bash
# If any visual change is detected:
git status  # Check what changed
git diff    # Review changes
git checkout .  # Rollback all changes
rm -rf [any new directories created]
```

### Commit Strategy:
- One commit per successful step
- Clear commit message: "refactor(tui): [Phase X.Y] Description - no visual changes"
- Tag known good states: `git tag tui-refactor-phase-X`

## Success Metrics

### Per Step:
- ✅ No visual changes detected
- ✅ All keyboard shortcuts work
- ✅ Scrolling behaves identically
- ✅ Terminal resize handled correctly
- ✅ No new warnings in console

### Overall Goals:
- Achieve clear separation of concerns
- Enable unit testing of business logic
- Make components reusable
- Improve maintainability
- Prepare for future overflow handling features

## Risk Mitigation

### High Risk Areas:
1. **Scrollbar calculations**: Very sensitive to off-by-one errors
2. **Border rendering**: Unicode characters must align perfectly
3. **Width calculations**: Terminal width handling is complex
4. **React keys**: Must maintain stable keys for smooth rendering

### Mitigation Strategies:
- Test each change in multiple terminal sizes
- Keep original functions available for comparison
- Add debug logging (to stderr) if needed
- Take screenshots before major changes
- Have rollback commands ready

## Phase 7: Fix Horizontal Overflow Bug (Module-Boundary Driven)

### Problem Statement
Horizontal overflow breaks container borders when content exceeds allocated width. This occurs due to contract mismatches between components - no component is properly enforcing overflow boundaries.

### Root Cause Analysis
1. **BorderedBox**: Makes assumptions about content width without enforcing constraints
2. **StatusPanel**: Uses `flexDirection="row"` without width constraints  
3. **LayoutContainer**: Doesn't enforce overflow boundaries on children
4. **Missing contracts**: No explicit layout contracts between parent/child components

### Step 7.1: Define Clear Component Contracts
- Create `ILayoutConstraints` interface in `models/types.ts`:
  ```typescript
  export interface ILayoutConstraints {
    maxWidth: number;
    maxHeight: number;
    overflow: 'truncate' | 'wrap' | 'hidden';
  }
  ```
- Create `IContentService` interface for text measurement and truncation
- Implement `ContentService` with text width calculation logic
- Register ContentService in DI container
- **Verification**: Run `npm run tui` - no visual changes

### Step 7.2: BorderedBox Enforces Its Contract
- Accept `ILayoutConstraints` prop in BorderedBox
- Calculate exact content area: `contentWidth = width - 4 - (showScrollbar ? 1 : 0)`
- Create `LayoutConstraintContext` to pass constraints to children
- Wrap all content with constraints enforcement
- **Verification**: Run `npm run tui` - no visual changes

### Step 7.3: Create ConstrainedContent Wrapper
- New component `src/interfaces/tui-ink/components/ConstrainedContent.tsx`
- Uses ContentService from DI to measure and truncate text
- Enforces width constraints on all children
- BorderedBox uses this to wrap content
- **Verification**: Run `npm run tui` - borders should stay intact

### Step 7.4: Fix ConfigurationPanel Boundaries
- Create `useLayoutConstraints` hook to access parent constraints
- Calculate item width: `constraints.maxWidth - 3` (for selection indicator)
- Pass explicit width to Text components
- Use ConstrainedContent wrapper for each item
- **Verification**: Run `npm run tui` - config items shouldn't overflow

### Step 7.5: Fix StatusPanel Smart Layout
- Create `StatusItemLayout` component for row layout logic
- Intelligently allocate space between text and status indicator
- Use ContentService to truncate text while preserving status
- Ensure status indicators always remain visible
- **Verification**: Run `npm run tui` - status items properly formatted

### Step 7.6: LayoutContainer as Layout Authority
- Calculate precise widths accounting for all spacing
- Create `LayoutContext` providing constraints to all children
- Fix rounding errors in width distribution
- Ensure panels fit exactly in allocated space
- **Verification**: Run `npm run tui` - panels fit perfectly side-by-side

### Step 7.7: Add Debug Mode and Testing
- Create `IDebugService` for layout debugging
- Add layout boundary visualization in development mode
- Create test fixtures with extremely long text
- Test with terminal widths: 50, 80, 100, 120 columns
- Add layout invariant assertions
- **Verification**: Resize terminal while running - borders never break

### Success Criteria
- ✅ Borders remain intact at all terminal widths
- ✅ Text truncates properly without breaking layout
- ✅ Status indicators always visible
- ✅ No horizontal scrolling needed
- ✅ Clean component contracts established
- ✅ Layout logic properly encapsulated

### Key Principles
1. **Each component owns its boundaries** - enforces its layout contract
2. **Explicit contracts** - no implicit assumptions about space
3. **Service layer for complex logic** - content measurement via DI
4. **Incremental verification** - test after each small change
5. **Debugging support** - make layout issues visible

## Refactoring Complete! 🎉

All 7 phases have been successfully completed:
1. ✅ Data and type extraction with zero visual impact
2. ✅ Component encapsulation (ScrollableContainer, BorderedBox, LayoutContainer)
3. ✅ Service layer with proper interfaces
4. ✅ Type-safe dependency injection container
5. ✅ Gradual component migration to use DI
6. ✅ Legacy code cleanup and organization
7. ✅ Horizontal overflow bug fixed with proper text truncation

### Key Achievements
- **Clean Architecture**: Clear separation between domain, application, and interface layers
- **Dependency Injection**: Type-safe DI container for all services
- **Module Boundaries**: Each component owns its behavior and enforces its contracts
- **Responsive Design**: Panels adapt to terminal size in both narrow and wide modes
- **Overflow Protection**: Consistent text truncation prevents border breaking
- **Debug Support**: Built-in debug service for troubleshooting layout issues
- **Full Height Utilization**: Panels fill all available vertical space

### Next Steps
With the refactoring complete, the TUI is now ready for:
- Proper text overflow handling (truncation with "...")
- Horizontal scrolling for long items
- Dynamic width calculations
- Configurable themes
- Plugin architecture for custom panels

## Notes

- This plan prioritizes safety over speed
- Each phase builds on the previous one
- No phase should take more than 30 minutes
- If stuck on a phase, skip to next or ask for help
- The goal is better architecture, not perfect architecture