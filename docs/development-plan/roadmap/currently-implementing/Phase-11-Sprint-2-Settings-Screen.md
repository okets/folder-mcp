# Phase 11, Sprint 2: Settings Screen Implementation

**Phase**: 11 - Complete App Interface
**Sprint**: 2 - Settings Screen
**Status**: Not Started
**Start Date**: TBD

## Related Documentation
- [Phase 11 Overview](../folder-mcp-roadmap-1.1.md#phase-11-complete-app-interface)
- [Sprint 1: Navigation Framework](Phase-11-Sprint-1-Navigation-Framework.md)
- [TUI Component Visual Guide](../../design/TUI_COMPONENT_VISUAL_GUIDE.md)

---

## Sprint Overview

### Goals
Implement the Settings screen - the simplest of the new screens. This establishes the pattern for adding new screens to the 4-screen architecture.

### Scope
- **In Scope**: Settings screen, 4-item navigation, placeholder panels for Connect and Activity Log
- **Out of Scope**: Connect screen functionality, Activity Log functionality, configuration persistence (use existing ConfigurationManager)

### Approach: Visual Validation Methodology
Same step-by-step approach as Sprint 1:
1. Agent implements minimal change
2. Agent builds the code (`npm run build`)
3. Human runs TUI (`npm run tui`) and verifies
4. Human provides feedback
5. Agent proceeds or fixes

---

## Settings Screen Design

### Component Structure

**Container**: `GenericListPanel` with title="Settings"

**Items** (3 total):
| # | Component | Label | Options | Layout |
|---|-----------|-------|---------|--------|
| 1 | `SelectionListItem` | Theme | Light, Dark, Auto | horizontal |
| 2 | `SelectionListItem` | Log Verbosity | Quiet, Normal, Verbose | horizontal |
| 3 | `SelectionListItem` | Default Model | (from model registry) | vertical |

### Behavior
- All items are navigable (up/down arrows)
- Enter or right-arrow expands item to edit selection
- Escape collapses back to list
- Changes persist to config immediately via ConfigurationManager
- SelectionListItem auto-switches layout if truncation >10%

### Icons
All items use single-char icon "◇" (diamond outline)

---

## Navigation Panel Update

### Current State (2 items)
```
◈ Manage Folders
◇ Demo Controls
```

### Target State (4 items)
```
◈ Manage Folders
◇ Connect
◆ Activity Log
○ Settings
```

### Navigation Data Structure
```typescript
const navigationItems = [
    { icon: '◈', label: 'Manage Folders', panelId: 'folders' },
    { icon: '◇', label: 'Connect', panelId: 'connect' },
    { icon: '◆', label: 'Activity Log', panelId: 'activity' },
    { icon: '○', label: 'Settings', panelId: 'settings' },
];
```

---

## Implementation Plan: 6 Steps

### Step 1: Update Navigation Items to 4
**Goal**: Change NavigationPanel from 2 items to 4 items

**Changes**:
- Update `NavigationPanel.tsx` or data source to have 4 items
- Update icons and labels as specified above
- Keep panel switching logic working for index 0 and 1 (existing panels)

**Files Modified**:
- `src/interfaces/tui-ink/components/NavigationPanel.tsx`
- Possibly `src/interfaces/tui-ink/AppFullscreen.tsx` (if navigation data is there)

**Verification Checklist**:
- [ ] Navigation shows 4 items with correct icons and labels
- [ ] Landscape mode: 4 items displayed vertically
- [ ] Portrait mode: 4 items displayed horizontally (may truncate)
- [ ] Arrow navigation works through all 4 items
- [ ] Selecting items 0 and 1 still shows existing panels

**Rollback**: Revert navigation items back to 2

---

### Step 2: Create Placeholder Panels
**Goal**: Add empty placeholder panels for Connect, Activity Log, and Settings

**Changes**:
- Create `ConnectPanel.tsx` - simple GenericListPanel with title and placeholder TextListItem
- Create `ActivityLogPanel.tsx` - simple GenericListPanel with title and placeholder TextListItem
- Create `SettingsPanel.tsx` - simple GenericListPanel with title and placeholder TextListItem
- Do NOT wire up content yet - just placeholders

**Files Created**:
- `src/interfaces/tui-ink/components/ConnectPanel.tsx`
- `src/interfaces/tui-ink/components/ActivityLogPanel.tsx`
- `src/interfaces/tui-ink/components/SettingsPanel.tsx`

**Panel Props Pattern**:
```typescript
interface PanelProps {
    width: number;
    height: number;
    isFocused: boolean;
    elementId: string;
    parentId: string;
}
```

**Verification Checklist**:
- [ ] All 3 new files compile without errors
- [ ] Each panel renders a bordered box with title
- [ ] Placeholder text visible in each panel

**Rollback**: Delete the 3 new panel files

---

### Step 3: Wire Up Panel Switching for All 4
**Goal**: Make navigation selection switch between all 4 panels

**Changes**:
- Update `AppFullscreen.tsx` conditional rendering:
  - Index 0 → Manage Folders (existing)
  - Index 1 → Connect (placeholder)
  - Index 2 → Activity Log (placeholder)
  - Index 3 → Settings (placeholder)
- Pass correct props to each panel

**Files Modified**:
- `src/interfaces/tui-ink/AppFullscreen.tsx`

**Verification Checklist**:
- [ ] Navigating to each item shows corresponding panel
- [ ] Panel titles match: "Manage Folders", "Connect", "Activity Log", "Settings"
- [ ] Focus switching (Tab) works with all 4 panels
- [ ] No errors when switching between panels
- [ ] Landscape and portrait modes both work

**Rollback**: Revert AppFullscreen conditional rendering to 2-panel logic

---

### Step 4: Implement Settings Panel Content
**Goal**: Add the 3 SelectionListItems to Settings panel

**Changes**:
- Create 3 SelectionListItem instances in SettingsPanel:
  1. Theme: Light, Dark, Auto (default: Auto)
  2. Log Verbosity: Quiet, Normal, Verbose (default: Normal)
  3. Default Model: (from model registry, default: first available)
- Wire up onValueChange handlers
- Items should be navigable with up/down arrows

**Model Registry Integration**:
```typescript
// Get models from registry
import { getAvailableModels } from '../../config/model-registry';
const models = getAvailableModels();
const modelOptions = models.map(m => ({ value: m.id, label: m.displayName }));
```

**Files Modified**:
- `src/interfaces/tui-ink/components/SettingsPanel.tsx`

**Verification Checklist**:
- [ ] Settings panel shows 3 items
- [ ] Each item has correct icon, label, and options
- [ ] Arrow navigation moves between items
- [ ] Enter/→ expands item to show options
- [ ] Can select different options
- [ ] Escape collapses back to item list
- [ ] Horizontal layout works for Theme and Log Verbosity
- [ ] Vertical layout works for Default Model (many options)

**Rollback**: Revert SettingsPanel to placeholder

---

### Step 5: Wire Settings to Configuration
**Goal**: Persist settings changes to ConfigurationManager

**Changes**:
- Read initial values from ConfigurationManager on mount
- Write changes to ConfigurationManager on selection change
- Handle configuration errors gracefully

**Configuration Keys**:
- `theme`: 'light' | 'dark' | 'auto'
- `logLevel`: 'quiet' | 'normal' | 'verbose'
- `defaultModel`: string (model ID)

**Files Modified**:
- `src/interfaces/tui-ink/components/SettingsPanel.tsx`

**Verification Checklist**:
- [ ] Settings load current config values on mount
- [ ] Changing a setting updates config immediately
- [ ] Restarting TUI shows saved settings
- [ ] Invalid config values handled gracefully

**Rollback**: Remove config integration, use hardcoded defaults

---

### Step 6: Comprehensive Testing
**Goal**: Verify all functionality across different scenarios

**Test Scenarios**:
1. **Fresh start**: TUI launches with default settings
2. **Change settings**: All 3 settings can be changed and persist
3. **Responsive**: Works in landscape and portrait
4. **Navigation**: All 4 screens accessible, Tab switching works
5. **Keyboard**: All keyboard shortcuts work correctly
6. **Edge cases**: Very narrow terminals, very short terminals

**No code changes in this step - testing only**

**Verification Checklist**:
- [ ] All Step 1-5 verifications pass
- [ ] Settings persist across TUI restart
- [ ] No visual glitches in any terminal size
- [ ] No errors in console

---

## Success Criteria

At completion of Sprint 2:

### Functional Requirements
- [ ] Navigation shows 4 items (Manage Folders, Connect, Activity Log, Settings)
- [ ] All 4 panels accessible via navigation
- [ ] Settings panel has 3 working SelectionListItems
- [ ] Settings persist to configuration
- [ ] Placeholder content visible in Connect and Activity Log panels

### Non-Functional Requirements
- [ ] Responsive design works in landscape and portrait
- [ ] No visual glitches during panel switching
- [ ] TypeScript compiles without errors
- [ ] `npm run build` succeeds
- [ ] `npm run tui` launches without errors

### Code Quality
- [ ] Uses only existing custom components
- [ ] Follows established patterns from Sprint 1
- [ ] No emojis (single-char icons only)
- [ ] Proper focus chain integration

---

## Risk Mitigation

### Identified Risks

1. **Navigation Panel Overflow**
   - **Risk**: 4 items may not fit in portrait mode
   - **Mitigation**: HorizontalListRenderer handles truncation, test early
   - **Rollback**: Reduce label lengths if needed

2. **Configuration Integration**
   - **Risk**: ConfigurationManager API may not match expected interface
   - **Mitigation**: Explore ConfigurationManager early, adapt as needed
   - **Rollback**: Use local state only, defer persistence

3. **Model Registry Access**
   - **Risk**: Model list may be empty or unavailable
   - **Mitigation**: Handle empty model list gracefully
   - **Fallback**: Show "No models available" message

---

## Files Summary

### Files to Create
- `src/interfaces/tui-ink/components/SettingsPanel.tsx`
- `src/interfaces/tui-ink/components/ConnectPanel.tsx`
- `src/interfaces/tui-ink/components/ActivityLogPanel.tsx`

### Files to Modify
- `src/interfaces/tui-ink/components/NavigationPanel.tsx`
- `src/interfaces/tui-ink/AppFullscreen.tsx`
- `src/interfaces/tui-ink/hooks/useNavigation.ts` (possibly)

---

## Completion Tracking

- [ ] Step 1: Update Navigation Items to 4
- [ ] Step 2: Create Placeholder Panels
- [ ] Step 3: Wire Up Panel Switching for All 4
- [ ] Step 4: Implement Settings Panel Content
- [ ] Step 5: Wire Settings to Configuration
- [ ] Step 6: Comprehensive Testing

**Sprint Status**: 0/6 steps completed (0%)

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-16 | Sprint 2 document created | Claude |
