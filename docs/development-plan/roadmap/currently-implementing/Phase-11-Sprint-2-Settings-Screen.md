# Phase 11, Sprint 2: Settings Screen Implementation

**Phase**: 11 - Complete App Interface
**Sprint**: 2 - Settings Screen
**Status**: Phase A, B, Step 3.1 Complete → Ready for Step 3.2
**Start Date**: 2025-12-18

## Related Documentation
- [Phase 11 Overview](../folder-mcp-roadmap-1.1.md#phase-11-complete-app-interface)
- [Sprint 1: Navigation Framework](Phase-11-Sprint-1-Navigation-Framework.md)
- [TUI Component Visual Guide](../../design/TUI_COMPONENT_VISUAL_GUIDE.md)
- [Theme Cleanup Tasks](theme-cleanup-tasks.md) - Code review evaluation document

---

## Pre-Sprint: Theme Foundation ✅ COMPLETE

Before implementing the Settings screen, we completed essential theme infrastructure work to ensure the Theme selector will function correctly.

### What Was Done

#### 1. Theme Integration Across All Components
- **Problem**: Many components used `undefined` for non-selected text color, causing terminal default (white) to override theme
- **Fix**: Replaced `textColorProp(undefined)` with `textColorProp(theme.colors.textPrimary)` across 30+ components
- **Files**: SelectionBody, SelectionListItem, CollapsedSummary, VerticalToggleRow, ButtonsRow, and many others

#### 2. Minimal Theme Visibility
- **Problem**: Minimal theme had no visual distinction (all colors white)
- **Fix**: Changed base text to `gray` so `whiteBright` selections stand out
- **Result**: Proper contrast hierarchy for ASCII-only theme

#### 3. Theme Preview Lag Elimination
- **Problem**: When changing themes, selection highlight briefly showed OLD theme color
- **Fix**: Call `setCurrentTheme()` synchronously before React state update in ThemeContext
- **Result**: Instant theme application with no visual lag

#### 4. Legacy Theme Cleanup
- **Problem**: CliArgumentParser had hardcoded theme list with legacy names (`dark-optimized`, `light-optimized`)
- **Fix**: Import `ThemeName` from ThemeContext as single source of truth, use `Object.keys(themes)`
- **Files**: CliArgumentParser.ts, simple-config.ts, ProgressBar.tsx

### Why This Matters for Sprint 2
The Settings screen will include a Theme selector (Step 3.1). Without this foundation work:
- Theme changes wouldn't apply to all UI elements
- Minimal theme would be unusable
- Users would see jarring color lag when selecting themes
- Legacy theme names could cause validation errors

### Commits
- `dc95892` - fix(tui): complete theme integration and cleanup legacy code
- `a0e28e8` - feat(tui): comprehensive theme overhaul with 13 distinct themes

---

## Sprint Overview

### Goals
Implement the Settings screen - the simplest of the new screens. This establishes the pattern for adding new screens to the 4-screen architecture.

### Scope
- **In Scope**: Settings screen, 4-item navigation, placeholder panels for Connect and Activity Log
- **Out of Scope**: Connect screen functionality, Activity Log functionality

### Approach: ONE TUI Change at a Time
Each step makes exactly ONE visual change. Human verifies before proceeding.

```
Agent implements ONE change → npm run build → Human runs TUI → Human approves → Next step
```

---

## Target State

### Navigation Panel (4 items)
```
◈ Manage Folders
◇ Connect
◆ Activity Log
○ Settings
```

### Settings Panel Content
```
◇ Theme              [Light] [Dark] [Auto]
◇ Log Verbosity      [Quiet] [Normal] [Verbose]
◇ Default Model      (vertical list of models)
```

---

## Implementation Plan: 14 Steps

### Phase A: Navigation Panel Changes

#### Step 1.1: Rename "Demo Controls" to "Connect"
**Goal**: Change the second navigation item label only

**Change**: In navigation data, change label from "Demo Controls" to "Connect"

**Verification**:
- [ ] Navigation shows "Connect" instead of "Demo Controls"
- [ ] Everything else unchanged
- [ ] Panel switching still works

**Rollback**: Change label back to "Demo Controls"

---

#### Step 1.2: Add 3rd Navigation Item "Activity Log"
**Goal**: Add third item to navigation

**Change**: Add item `{ icon: '◆', label: 'Activity Log' }` after Connect

**Verification**:
- [ ] Navigation shows 3 items: Manage Folders, Connect, Activity Log
- [ ] Arrow navigation works through all 3
- [ ] Selecting Activity Log does NOT crash (may show nothing or existing panel)

**Rollback**: Remove 3rd navigation item

---

#### Step 1.3: Add 4th Navigation Item "Settings"
**Goal**: Add fourth item to navigation

**Change**: Add item `{ icon: '○', label: 'Settings' }` after Activity Log

**Verification**:
- [ ] Navigation shows 4 items: Manage Folders, Connect, Activity Log, Settings
- [ ] Arrow navigation works through all 4
- [ ] Landscape: 4 items vertically
- [ ] Portrait: 4 items horizontally (may truncate)

**Rollback**: Remove 4th navigation item

---

### Phase B: Placeholder Panels (one at a time)

#### Step 2.1: Create SettingsPanel Placeholder
**Goal**: Create empty Settings panel and wire to nav index 3

**Changes**:
1. Create `SettingsPanel.tsx` with GenericListPanel + one TextListItem placeholder
2. Wire nav index 3 to render SettingsPanel

**Verification**:
- [ ] Selecting "Settings" in nav shows Settings panel
- [ ] Panel has title "Settings"
- [ ] Panel shows placeholder text
- [ ] Focus switching (Tab) works

**Rollback**: Delete SettingsPanel.tsx, revert nav wiring

---

#### Step 2.2: Create ActivityLogPanel Placeholder
**Goal**: Create empty Activity Log panel and wire to nav index 2

**Changes**:
1. Create `ActivityLogPanel.tsx` with GenericListPanel + one TextListItem placeholder
2. Wire nav index 2 to render ActivityLogPanel

**Verification**:
- [ ] Selecting "Activity Log" in nav shows Activity Log panel
- [ ] Panel has title "Activity Log"
- [ ] Panel shows placeholder text
- [ ] Focus switching (Tab) works

**Rollback**: Delete ActivityLogPanel.tsx, revert nav wiring

---

#### Step 2.3: Create ConnectPanel Placeholder
**Goal**: Create empty Connect panel and wire to nav index 1 (replacing Demo Controls)

**Changes**:
1. Create `ConnectPanel.tsx` with GenericListPanel + one TextListItem placeholder
2. Wire nav index 1 to render ConnectPanel (instead of Demo Controls)

**Verification**:
- [ ] Selecting "Connect" in nav shows Connect panel
- [ ] Panel has title "Connect"
- [ ] Panel shows placeholder text
- [ ] Demo Controls panel no longer appears
- [ ] All 4 panels now accessible

**Rollback**: Delete ConnectPanel.tsx, restore Demo Controls wiring

---

### Phase C: Settings Panel Content (one item at a time)

#### Step 3.1: Add Theme SelectionListItem
**Goal**: Add first real setting to Settings panel

**Change**: Replace placeholder with one SelectionListItem:
- icon: "◇"
- label: "Theme"
- options: Light, Dark, Auto
- layout: horizontal
- default: Auto

**Verification**:
- [ ] Settings panel shows Theme item
- [ ] Can expand with Enter/→
- [ ] Can select options
- [ ] Escape collapses
- [ ] Horizontal layout displays correctly

**Rollback**: Revert to placeholder

---

#### Step 3.2: Add Log Verbosity SelectionListItem
**Goal**: Add second setting below Theme

**Change**: Add SelectionListItem below Theme:
- icon: "◇"
- label: "Log Verbosity"
- options: Quiet, Normal, Verbose
- layout: horizontal
- default: Normal

**Verification**:
- [ ] Settings panel shows 2 items
- [ ] Arrow navigation between items works
- [ ] Both items expand/collapse correctly
- [ ] Horizontal layout for both

**Rollback**: Remove Log Verbosity item

---

#### Step 3.3: Add Default Model SelectionListItem
**Goal**: Add third setting below Log Verbosity

**Change**: Add SelectionListItem below Log Verbosity:
- icon: "◇"
- label: "Default Model"
- options: (from model registry or hardcoded list for now)
- layout: vertical (many options)
- default: first available

**Verification**:
- [ ] Settings panel shows 3 items
- [ ] Arrow navigation through all 3
- [ ] Default Model uses vertical layout
- [ ] Can select from model list

**Rollback**: Remove Default Model item

---

### Phase D: Configuration Persistence (one setting at a time)

#### Step 4.1: Wire Theme to Configuration
**Goal**: Theme setting persists to config

**Changes**:
- Read theme from ConfigurationManager on mount
- Write theme changes to ConfigurationManager

**Verification**:
- [ ] Theme loads saved value on TUI start
- [ ] Changing theme saves immediately
- [ ] Restart TUI, theme persists

**Rollback**: Use hardcoded default

---

#### Step 4.2: Wire Log Verbosity to Configuration
**Goal**: Log Verbosity setting persists to config

**Changes**:
- Read logLevel from ConfigurationManager on mount
- Write logLevel changes to ConfigurationManager

**Verification**:
- [ ] Log Verbosity loads saved value
- [ ] Changing it saves immediately
- [ ] Restart TUI, persists

**Rollback**: Use hardcoded default

---

#### Step 4.3: Wire Default Model to Configuration
**Goal**: Default Model setting persists to config

**Changes**:
- Read defaultModel from ConfigurationManager on mount
- Write defaultModel changes to ConfigurationManager

**Verification**:
- [ ] Default Model loads saved value
- [ ] Changing it saves immediately
- [ ] Restart TUI, persists

**Rollback**: Use hardcoded default

---

### Phase E: Final Verification

#### Step 5: Comprehensive Testing
**Goal**: Verify everything works together

**Test Scenarios**:
1. Fresh start with defaults
2. Change all 3 settings, restart, verify persistence
3. Landscape mode - all 4 screens
4. Portrait mode - all 4 screens
5. Very narrow terminal
6. Very short terminal

**Verification**:
- [ ] All 14 prior steps verified
- [ ] No visual glitches
- [ ] No console errors
- [ ] Settings persist correctly

---

## Files Summary

### Files to Create
- `src/interfaces/tui-ink/components/SettingsPanel.tsx`
- `src/interfaces/tui-ink/components/ConnectPanel.tsx`
- `src/interfaces/tui-ink/components/ActivityLogPanel.tsx`

### Files to Modify
- `src/interfaces/tui-ink/components/NavigationPanel.tsx` (or data source)
- `src/interfaces/tui-ink/AppFullscreen.tsx`

---

## Completion Tracking

### Phase A: Navigation ✅ COMPLETE
- [x] Step 1.1: Rename "Demo Controls" to "Connect"
- [x] Step 1.2: Add "Activity Log" (3rd item)
- [x] Step 1.3: Add "Settings" (4th item)

### Phase B: Placeholder Panels ✅ COMPLETE
- [x] Step 2.1: SettingsPanel placeholder + wire
- [x] Step 2.2: ActivityLogPanel placeholder + wire
- [x] Step 2.3: ConnectPanel placeholder + wire

### Phase C: Settings Content
- [x] Step 3.1: Theme SelectionListItem ✅ COMPLETE
- [ ] Step 3.2: Log Verbosity SelectionListItem
- [ ] Step 3.3: Default Model SelectionListItem

### Phase D: Configuration
- [ ] Step 4.1: Wire Theme to config
- [ ] Step 4.2: Wire Log Verbosity to config
- [ ] Step 4.3: Wire Default Model to config

### Phase E: Testing
- [ ] Step 5: Comprehensive testing

**Sprint Status**: 7/14 steps completed (50%)

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-16 | Sprint 2 document created | Claude |
| 2025-12-16 | Expanded to 14 granular steps (one TUI change at a time) | Claude |
| 2025-12-18 | Pre-Sprint Foundation complete: theme integration, minimal theme fix, preview lag fix, legacy cleanup | Claude |
