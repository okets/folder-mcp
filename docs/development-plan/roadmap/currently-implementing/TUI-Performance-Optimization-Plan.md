# TUI Performance Optimization Plan

**Goal**: Eliminate unnecessary re-renders causing text selection loss and Windows terminal flickering.

**Ultimate Test**: Select text in TUI without it being deselected until a real re-render is required.

## Phase 1: Context Stabilization (CRITICAL) 🚨

The root cause: All context providers create new objects every render, causing cascade re-renders.

### Step 1.1: Fix FMDMContext Object Recreation
- [ ] **Change**: Wrap `contextValue` in `useMemo` with proper dependencies
- [ ] **File**: `src/interfaces/tui-ink/contexts/FMDMContext.tsx`
- [ ] **Test**: Start TUI, open model selector, trigger progress update (indexing)
- [ ] **Expected**: Model selector stays expanded during progress updates
- [ ] **Verification Point**: ⏸️ PAUSE - Confirm model selector no longer collapses on progress

### Step 1.2: Fix ThemeContext Object Recreation  
- [ ] **Change**: Wrap theme context value in `useMemo`
- [ ] **File**: `src/interfaces/tui-ink/contexts/ThemeContext.tsx`
- [ ] **Test**: Press 'T' to cycle themes while model selector is open
- [ ] **Expected**: Theme changes, model selector stays expanded
- [ ] **Verification Point**: ⏸️ PAUSE - Confirm theme switching doesn't collapse components

### Step 1.3: Fix ProgressModeContext Object Recreation
- [ ] **Change**: Wrap progress mode value in `useMemo` 
- [ ] **File**: `src/interfaces/tui-ink/contexts/ProgressModeContext.tsx`
- [ ] **Test**: Resize terminal (78w→61w) with model selector open
- [ ] **Expected**: Model selector stays expanded during resize
- [ ] **Verification Point**: ⏸️ PAUSE - Confirm terminal resize doesn't collapse components

### Step 1.4: Fix AnimationContext Object Recreation
- [ ] **Change**: Wrap animation context value in `useMemo`
- [ ] **File**: `src/interfaces/tui-ink/contexts/AnimationContext.tsx`
- [ ] **Test**: Press Ctrl+A (toggle animations) with model selector open
- [ ] **Expected**: Animations toggle, model selector stays expanded
- [ ] **Verification Point**: ⏸️ PAUSE - Confirm animation toggling doesn't collapse components

### Step 1.5: Stabilize All Context Event Handlers
- [ ] **Change**: Wrap all context event handlers in `useCallback`
- [ ] **Files**: All context files from steps 1.1-1.4
- [ ] **Test**: Perform all previous tests in sequence
- [ ] **Expected**: All interactions maintain component state
- [ ] **Verification Point**: ⏸️ PAUSE - Confirm all context interactions are stable

**Phase 1 Success Criteria**: Model selector survives progress updates, theme changes, resizes, and animation toggles.

---

## Phase 2: Component Memoization Audit

### Step 2.1: Add Missing React.memo Wrappers
- [ ] **Change**: Audit all components, add `React.memo` where missing
- [ ] **Priority Files**: 
  - `src/interfaces/tui-ink/components/FirstRunWizard.tsx`
  - `src/interfaces/tui-ink/components/StatusPanelData.tsx`
  - `src/interfaces/tui-ink/components/ConfigurationPanelData.tsx`
- [ ] **Test**: Navigate between panels with components expanded
- [ ] **Expected**: Panels don't re-render when not focused
- [ ] **Verification Point**: ⏸️ PAUSE - Confirm panel switching is smooth

### Step 2.2: Stabilize Event Handlers with useCallback
- [ ] **Change**: Wrap component event handlers in `useCallback`
- [ ] **Priority**: Event handlers passed as props to memoized components
- [ ] **Test**: Interact with buttons, selections while other components expanded
- [ ] **Expected**: Unrelated interactions don't cause re-renders
- [ ] **Verification Point**: ⏸️ PAUSE - Confirm isolated component interactions

**Phase 2 Success Criteria**: Component interactions are isolated, don't trigger unrelated re-renders.

---

## Phase 3: ManageFolderItem Pattern Fix

### Step 3.1: Analyze Current vs AddFolderWizard Pattern
- [ ] **Change**: Document the difference in creation patterns
- [ ] **Current Issue**: `createManageFolderItem()` called inside useMemo → child recreation
- [ ] **Target Pattern**: Store items in state like `wizardInstance`
- [ ] **Verification Point**: ⏸️ PAUSE - Plan reviewed and understood

### Step 3.2: Implement Folder Item Instance Management
- [ ] **Change**: Create state-managed folder items (similar to wizardInstance pattern)
- [ ] **File**: `src/interfaces/tui-ink/AppFullscreen.tsx`
- [ ] **Approach**: Replace useMemo item creation with state management
- [ ] **Test**: Create folder item, expand model selector, trigger any re-render cause
- [ ] **Expected**: Model selector maintains expansion and selection
- [ ] **Verification Point**: ⏸️ PAUSE - Confirm folder items use stable instances

### Step 3.3: Fix Child Item State Preservation
- [ ] **Change**: Ensure child items (ModelLogItemWithProgress) maintain internal state
- [ ] **Test**: Expand model selector, resize terminal, check progress updates
- [ ] **Expected**: Model selector expansion survives all triggers
- [ ] **Verification Point**: ⏸️ PAUSE - Confirm child state preservation works

**Phase 3 Success Criteria**: ManageFolderItem child components maintain state through all re-render scenarios.

---

## Phase 4: Performance Verification & Ultimate Tests

### Step 4.1: Terminal Resize Stability
- [ ] **Test**: Aggressively resize terminal (multiple times, different sizes)
- [ ] **With**: Model selector expanded, text selected in TUI
- [ ] **Expected**: No unexpected component collapses, text selection stable
- [ ] **Verification Point**: ⏸️ PAUSE - Confirm resize stability

### Step 4.2: FMDM Update Stability  
- [ ] **Test**: Trigger folder indexing with various UI states
- [ ] **With**: Multiple components expanded, text selected
- [ ] **Expected**: Only progress bars update, everything else stable
- [ ] **Verification Point**: ⏸️ PAUSE - Confirm progress updates don't affect UI state

### Step 4.3: Multi-Action Stability Test
- [ ] **Test**: Perform complex sequence: expand → select text → resize → progress update → theme change
- [ ] **Expected**: Text selection persists throughout entire sequence
- [ ] **Verification Point**: ⏸️ PAUSE - Confirm complex interactions work

### Step 4.4: Ultimate Text Selection Test 🎯
- [ ] **Test**: Select text in TUI, perform ALL possible actions
- [ ] **Actions**: Resize, progress updates, theme changes, panel navigation, model selection
- [ ] **Expected**: Text selection NEVER disappears unless legitimately required
- [ ] **Success Criteria**: Text selection stability = optimization complete ✅

---

## Rollback Instructions

If any step breaks functionality:

1. **Immediate**: `git stash` or `git checkout -- <file>`
2. **Test**: Verify TUI loads and basic navigation works  
3. **Report**: Note which step failed and error details
4. **Continue**: Skip problematic step, continue with plan
5. **Return**: Address skipped steps after plan completion

---

## Performance Monitoring

### Debug Mode (Development)
- [ ] **Optional**: Add re-render logging in dev mode
- [ ] **Use**: `console.log('Component X re-rendered')` in useEffect
- [ ] **Goal**: Identify any remaining unnecessary re-renders

### Success Metrics
- [ ] Text selection persists during normal operations
- [ ] No component state loss during resizes
- [ ] Smooth UI interactions without flickering
- [ ] Model selector maintains state during progress updates

---

## Phase 5: Knowledge Capture & Windows TUI Agent Update

### Step 5.1: Document Memoization Best Practices
- [ ] **Change**: Compile list of memoization patterns that work/don't work
- [ ] **Document**: Context value creation, event handler stability, component memoization
- [ ] **Include**: What triggers re-renders, what prevents them
- [ ] **Verification Point**: ⏸️ PAUSE - Review compiled best practices

### Step 5.2: Rebuild Windows TUI Specialist Agent Understanding
- [ ] **Change**: **Heavy edit/near complete rewrite** of `/Users/hanan/Projects/folder-mcp/.claude/agents/windows-tui-specialist.md`
- [ ] **Problem**: Agent likely has wrong understanding of render flow causing bad guidance
- [ ] **Fix**: Replace render flow knowledge with our proven findings
- [ ] **New Foundation**: 
  - Correct React render cycle understanding for TUI
  - Context provider re-render cascade effects
  - Terminal redraw vs React re-render distinction
  - Memoization strategies that actually work
  - Real root causes vs symptoms (flickering isn't always ANSI packets)
- [ ] **Remove**: Incorrect assumptions about render triggers
- [ ] **Add**: Proven patterns from our optimization work
- [ ] **Test**: Ask agent to diagnose similar performance issues to verify corrected understanding
- [ ] **Verification Point**: ⏸️ PAUSE - Confirm agent has **correct** TUI performance knowledge (not just more knowledge)

### Step 5.3: Create TUI Performance Checklist
- [ ] **Change**: Create reusable checklist for future TUI performance work
- [ ] **Include**: 
  - Pre-development performance considerations
  - Code review checkpoints for re-render issues
  - Testing methodology for TUI stability
  - Windows terminal specific gotchas
- [ ] **Location**: Add to windows-tui-specialist agent knowledge base
- [ ] **Verification Point**: ⏸️ PAUSE - Confirm checklist is comprehensive

**Phase 5 Success Criteria**: Windows TUI Specialist agent is equipped with comprehensive knowledge of TUI performance patterns and anti-patterns.

---

## Current Status: Phase 1 - Context Stabilization

**Next Step**: Fix FMDMContext Object Recreation

**Ready to start when you are! 🚀**