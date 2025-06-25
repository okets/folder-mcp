# Key Binding Architecture Fix Plan

## Problem Statement
The status bar is not correctly displaying available keyboard shortcuts based on the current UI state. While keyboard handling works correctly, the display doesn't match the actual available keys.

### Specific Issues:
1. When configuration box is active: Missing [→/Enter] Edit binding
2. When in edit mode: Shows navigation keys instead of only edit-specific keys
3. The system needs to support future configuration types (checkboxes, Yes/No, lists)

## Root Cause Analysis
- Multiple layers managing state with no single source of truth
- Timing issues where components register at different times during React lifecycle
- Input context service collects bindings from all handlers instead of respecting focus hierarchy

## Implementation Plan

### Phase 1: Analysis and Documentation
- [✓] Document current key binding flow from registration to display (2025-01-25 15:45)
  - Created detailed analysis in docs/KEY_BINDING_FLOW_ANALYSIS.md
  - Identified core issue: getActiveKeyBindings() doesn't respect focus chain
  - Found binary priority system problem (high-priority or everything)
- [🔄] Map all components that register key handlers
- [ ] Identify timing issues in component lifecycle
- [ ] Create state diagram of focus chain transitions

### Phase 2: Design Single Source of Truth
- [ ] Design new architecture with centralized key binding state
- [ ] Define clear ownership of key binding visibility rules
- [ ] Create interface for key binding context providers
- [ ] Plan migration path from current system

### Phase 3: Implement Core Infrastructure
- [ ] Create KeyBindingContext provider with proper hierarchy
- [ ] Implement focus-aware key binding collection
- [ ] Add proper event system for binding updates
- [ ] Ensure timing-safe registration/unregistration

### Phase 4: Refactor Existing Components
- [ ] Update ConfigurationPanelSimple to use new system
- [ ] Update StatusBar to consume from new provider
- [ ] Update navigation hooks to integrate properly
- [ ] Remove old InputContextService binding collection

### Phase 5: Testing and Validation
- [ ] Unit tests for key binding context isolation
- [ ] Integration tests for focus chain scenarios
- [ ] Visual tests for status bar updates
- [ ] Test with multiple nested input contexts

### Phase 6: Support Future Input Types
- [ ] Design extensible pattern for new input types
- [ ] Create base component for configuration inputs
- [ ] Implement checkbox input type as proof of concept
- [ ] Document pattern for adding new types

## Success Criteria
1. Status bar always shows correct keys for active context
2. Nested contexts properly isolate their key bindings
3. No timing issues or race conditions
4. Easy to add new configuration input types
5. Clean, maintainable architecture

## Technical Constraints
- Must work with React 19.1.0 and Ink 6.0.0
- Must integrate with existing DI system
- Must maintain current keyboard functionality
- Must support arbitrary nesting depth

## Progress Tracking
Each phase will be updated with:
- Start date
- Completion status
- Issues encountered
- Code references
- Test results

## Task Update Instructions

### How to Update Tasks
1. **Before starting a task**: Mark it as `[🔄]` (in progress)
2. **After completing a task**: Mark it as `[✓]` (completed) with timestamp
3. **If blocked**: Mark it as `[⚠️]` (blocked) with reason
4. **Add notes**: Include brief notes under each completed task

### Example:
```
- [✓] Document current key binding flow (2025-01-25 14:30)
  - Found 5 components registering handlers
  - Timing issue in InputContextService line 142
```

### Commit Requirements
1. **Commit after EVERY completed task** - No batching multiple tasks
2. **Commit message format**: `fix(key-bindings): [Phase X.Y] <specific task description>`
3. **Small, atomic commits** - Each commit should be reversible
4. **Test before committing** - Run `npm run tui` to verify no regressions

### Progress Rules
1. **Work on ONE task at a time** - Complete before moving to next
2. **Update this file immediately** after task completion
3. **If a task reveals sub-tasks**, add them as indented items
4. **Measure progress** by completed checkboxes, not time spent

---

## Current Status: Planning Phase
Next Step: Begin Phase 1 - Analysis and Documentation