# VerticalToggleRow Implementation Plan

## User Story
As a TUI user, I want a single-line toggle switch component so I can quickly select between configuration options without expanding menus.

## Acceptance Criteria
- ✅ Single line display: `⁃ Choose configuration mode: ◉ Assisted (Recommended) ○ Manual (Advanced)`
- ✅ Left/Right arrows toggle selection immediately (no Enter/Space needed)
- ✅ Up/Down arrows pass through to parent for list navigation
- ✅ Responsive truncation: label first, then longer option, then shorter option
- ✅ All truncated strings show `…` indicator
- ✅ Works at multiple widths (100, 75, 60, 50, 40, 30, 20, 10 chars)

## Tasks

### 1. Create Component Structure (30 min)
- Create `src/interfaces/tui-ink/components/core/VerticalToggleRow.tsx`
- Define TypeScript interfaces for props and options
- Set up basic React component with Ink imports
- Add to exports in component index files

### 2. Implement Core Rendering (45 min)
- Build single-line layout with bullet, label, colon, options
- Use existing symbol constants (`◉` selected, `○` unselected)
- Apply theme colors for focus states
- Handle basic option display without truncation

### 3. Add Keyboard Navigation (30 min)
- Left/Right arrow handling for option toggling
- Immediate selection change (no Enter/Space required)
- Up/Down arrow pass-through to parent
- Proper state change signaling to prevent flickering

### 4. Implement Truncation Algorithm (60 min)
**Critical Implementation Note**: Truncation is complex and requires careful consideration of user experience at different terminal widths.

**Sequential Truncation Strategy (Critical Rule):**
1. **Label first**: Truncate progressively until minimum viable length
2. **Longer option second**: Only after label reaches minimum
3. **Shorter option last**: Only if absolutely necessary

**Key Rule**: Each truncation phase must be exhausted before moving to the next phase.

**Truncation Examples (Reference Implementation):**
```
100+ chars: ⁃ Choose configuration mode: ◉ Assisted (Recommended) ○ Manual (Advanced) ←→
75+ chars:  ⁃ Choose configuration mode: ◉ Assisted (Recommended) ○ Manual (Advanced)
60+ chars:  ⁃ Choose config mode…: ◉ Assisted (Recommended) ○ Manual (Advanced)
50+ chars:  ⁃ Choose config…: ◉ Assisted (Recommended) ○ Manual (Advanced)
40+ chars:  ⁃ Choose…: ◉ Assisted (Recommended) ○ Manual (Advanced)
35+ chars:  ⁃ Choose…: ◉ Assisted (Recommen… ○ Manual (Advanced)
30+ chars:  ⁃ Choose…: ◉ Assist… ○ Manual (Advanced)
20+ chars:  ⁃ Choose…: ◉ Assis… ○ Manu…
10+ chars:  ⁃ ◉ As… ○ M…
```

**Truncation Logic Flow:**
1. Label: `"Choose configuration mode"` → `"Choose config mode…"` → `"Choose config…"` → `"Choose…"` (STOP - minimum reached)
2. Longer option: `"Assisted (Recommended)"` → `"Assisted (Recommen…"` → `"Assist…"` → `"Assis…"`
3. Shorter option: `"Manual (Advanced)"` → `"Manual…"` → `"Manu…"`

**Implementation Tasks:**
- Calculate fixed structure overhead (bullet, symbols, spaces, navigation arrows)
- Apply truncation priority: label → longer option → shorter option
- Use existing `contentService.truncateText()` utility
- Always append `…` for truncated strings (never truncate without indicator)
- Test at all target widths with character-perfect accuracy

### 5. Replace AddFolderWizard Implementation (45 min)
- Locate existing "Choose configuration mode" in `AddFolderWizard.tsx`
- Replace current implementation with new `VerticalToggleRow` component
- Update props and state management to match new component interface
- Test in real wizard context with actual terminal resizing
- Verify keyboard navigation works within wizard flow

### 6. Documentation & Cleanup (15 min)
- Add JSDoc comments for component props
- Update component usage examples
- Remove temporary test files

## Definition of Done
- VerticalToggleRow renders correctly at all target widths
- Keyboard navigation works as specified
- Successfully replaces configuration mode selection in AddFolderWizard
- Focus management integrates with existing wizard navigation
- No visual flickering or layout issues in real usage
- Code follows existing TUI component patterns
- Wizard flows work seamlessly with new component

**Total Estimated Time: 3.5 hours**