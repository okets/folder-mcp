# TUI Incremental Refactoring Plan

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

### Step 5.3: Extract ConfigurationBox Component
- Create `components/ConfigurationBox.tsx`
- Move lines 193-248 (portrait) and 349-405 (landscape)
- Accept all needed props:
  ```typescript
  interface ConfigurationBoxProps {
    items: ConfigItem[];
    selectedIndex: number;
    isFocused: boolean;
    visibleCount: number;
    scrollOffset: number;
    width: number;
    height: number;
  }
  ```
- **Verification**: Run `npm run tui` - should look identical

### Step 5.4: Extract StatusBox Component
- Create `components/StatusBox.tsx`
- Move lines 251-322 (portrait) and 408-473 (landscape)
- Similar props pattern as ConfigurationBox
- **Verification**: Run `npm run tui` - should look identical

## Phase 6: AppFullscreen Cleanup (No Visual Impact)

### Step 6.1: Use Injected Services
- Replace direct imports with service calls:
  ```typescript
  const di = useDI();
  const layoutService = di.resolve<ILayoutService>('layout');
  const dataService = di.resolve<IDataService>('data');
  ```
- Keep all calculations identical
- **Verification**: Run `npm run tui` - should look identical

### Step 6.2: Extract Layout Orchestration
- Move portrait/landscape decision to LayoutService
- Service returns configuration for component placement
- AppFullscreen becomes thin orchestration layer
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

## Future Considerations

Once refactoring is complete, we can safely add:
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