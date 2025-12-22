# Sprint 4: Code Review Round 2

**Sprint Context**: Activity Log Screen - Follow-up code review after initial Sprint 4 completion.

**Review Date**: 2025-12-23

**Status**: 📋 EVALUATED (not yet implemented)

---

## Evaluation Summary

| Category | Valid | Rejected | Total |
|----------|-------|----------|-------|
| High Priority | 8 | 2 | 10 |

---

## REJECTED SUGGESTIONS

These contradict our project principles (consistent with Sprint 4 Round 1 rejections):

| # | Suggestion | Rejection Reason |
|---|------------|------------------|
| 3 | Try-catch around activityService.emit() | **Contradicts "Fail Loudly"**: Same as Sprint 4 rejections #32, #33, #43. If activity logging fails, we WANT to know immediately to fix the root cause. We do NOT swallow errors. |
| 8 | Guard messageMaxWidth against negative (narrow terminal) | **SKIPPED per user request**: Same as Sprint 4 Group 3.4-3.5. User explicitly asked to skip narrow terminal handling. This is the same suggestion rephrased. |

---

## VALID SUGGESTIONS - GROUPED BY AREA

### Group 1: Type Safety Improvements (REST Server)

These eliminate `any` casts and improve type correctness.

#### 1.1 KeyPhrase Type Instead of `any`
**Suggestion #1** - `src/daemon/rest/server.ts:1886-1916`

**Problem**: `sem.keyPhrases.map((kp: any) => ...)` uses loose `any` cast weakening type safety.

**Fix**:
- Import `KeyPhrase` type from types.ts
- Replace `(kp: any)` with `(kp: KeyPhrase)`
- Use `kp.text || String(kp)` as fallback

---

#### 1.2 EnhancedDocumentInfo Type for top_key_phrases
**Suggestion #2** - `src/daemon/rest/server.ts:1287-1312`

**Problem**: `(doc as any).top_key_phrases` circumvents TypeScript safety.

**Fix**:
- Update `EnhancedDocumentInfo` interface to include `top_key_phrases` with correct shape
- Or narrow `doc` to proper interface before accessing
- Remove the `any` cast and access `doc.top_key_phrases?.[0]?.text` directly

---

### Group 2: LogItem Width Calculation Consistency

These fix width calculation inconsistencies that could cause layout issues.

#### 2.1 detailIndentWidth Calculation Verification
**Suggestion #4** - `src/interfaces/tui-ink/components/core/LogItem.tsx:108-117`

**Problem**: Reviewer claims `+3` is off-by-one because symbol+spacing should be 2 chars.

**Analysis Required**: Need to verify:
- Is symbol always 1 char, or can it be 2 chars (`└▶` when active)?
- Does spacing vary based on state?
- Current calculation: `(this.timestamp ? 8 : 0) + 3`

**Action**: Verify calculation matches actual rendered widths. Fix if truly off-by-one.

---

#### 2.2 progressWidth Consistency with ProgressBar
**Suggestion #5** - `src/interfaces/tui-ink/components/core/LogItem.tsx:364-365, 408-412`

**Problem**: Reserved space calculation doesn't match rendered width:
- Calculation: `progressWidth = progressMode === 'short' ? 5 : 16`
- Render: `<ProgressBar width={15} />`

**Fix**: Use consistent value in both places:
```typescript
const progressWidth = hasProgress ? 15 : 0;  // Match ProgressBar width prop
// OR
<ProgressBar width={progressWidth} />  // Use calculated value
```

---

### Group 3: Navigation Hook Consistency (useNavigation.ts)

These were noted in Sprint 4 Group 5.2 but may not have been fully addressed.

#### 3.1 setActivitySelectedIndex Missing Guards
**Suggestion #6** - `src/interfaces/tui-ink/hooks/useNavigation.ts:180-186`

**Problem**: `setActivitySelectedIndex` is missing:
1. `isBlocked` guard (other setters have this)
2. Bounds validation (other setters clamp index to valid range)

**Current code** (no validation):
```typescript
const setActivitySelectedIndex = useCallback((index: number) => {
    setState(prev => ({
        ...prev,
        activitySelectedIndex: index  // No validation!
    }));
}, []);
```

**Fix**: Match pattern from `setStatusSelectedIndex`:
```typescript
const setActivitySelectedIndex = useCallback((index: number, itemCount: number) => {
    if (isBlocked) return;
    setState(prev => ({
        ...prev,
        activitySelectedIndex: Math.max(0, Math.min(itemCount - 1, index))
    }));
}, [isBlocked]);
```

**Note**: This changes the function signature. Callers must be updated.

---

#### 3.2 setActivityExpandedState Missing isBlocked Guard
**Suggestion #7** - `src/interfaces/tui-ink/hooks/useNavigation.ts:188-193`

**Problem**: `setActivityExpandedState` doesn't check `isBlocked` flag like other setters.

**Current code** (no guard):
```typescript
const setActivityExpandedState = useCallback((updater) => {
    setState(prev => ({
        ...prev,
        activityExpandedState: updater(prev.activityExpandedState)
    }));
}, []);
```

**Fix**: Add isBlocked guard:
```typescript
const setActivityExpandedState = useCallback((updater) => {
    setState(prev => {
        if (prev.isBlocked) return prev;  // Guard
        return {
            ...prev,
            activityExpandedState: updater(prev.activityExpandedState)
        };
    });
}, []);
```

---

### Group 4: Minor Consistency Fixes

#### 4.1 Documentation: Unicode Not ASCII
**Suggestion #9** - `src/interfaces/tui-ink/utils/progress-bar.ts:74, 80-98`

**Problem**: Comment says "All icons are single-cell ASCII symbols" but function returns Unicode glyphs (◆, ◈, ↔, etc.).

**Fix**: Update comment to accurately describe:
```typescript
/**
 * Get activity type icon
 * All icons are Unicode symbols chosen for single-cell width in most terminals.
 * Note: Some terminals may render these as double-width.
 */
```

**Note**: The width-aware handling and configurable fallback suggestions are OUT OF SCOPE (narrow terminal handling was skipped per user request).

---

#### 4.2 getRequiredLines Optional Checking Consistency
**Suggestion #10** - `src/interfaces/tui-ink/components/GenericListPanel.tsx:202-205`

**Problem**: Inconsistent optional checking:
- Lines 93, 140: `item.getRequiredLines ? item.getRequiredLines(itemMaxWidth) : 1`
- Lines 203, 474: `listItem.getRequiredLines(itemMaxWidth)` (no check!)

**Fix**: Apply consistent pattern to all occurrences:
```typescript
// Line 203
const itemLines = listItem.getRequiredLines ? listItem.getRequiredLines(itemMaxWidth) : 1;

// Line 474
const requiredLines = listItem.getRequiredLines ? listItem.getRequiredLines(itemMaxWidth) : 1;
```

---

## Implementation Order

### Phase 1: Type Safety (REST Server)
1. Group 1.1 - KeyPhrase type
2. Group 1.2 - EnhancedDocumentInfo type

### Phase 2: Width Calculations (LogItem)
3. Group 2.1 - Verify detailIndentWidth (investigate first)
4. Group 2.2 - progressWidth consistency

### Phase 3: Navigation Consistency
5. Group 3.1 - setActivitySelectedIndex guards (requires caller updates)
6. Group 3.2 - setActivityExpandedState isBlocked guard

### Phase 4: Minor Fixes
7. Group 4.1 - Documentation fix
8. Group 4.2 - getRequiredLines consistency

---

## Files Affected Summary

| File | Changes |
|------|---------|
| `src/daemon/rest/server.ts` | Type imports and casts (Groups 1.1, 1.2) |
| `src/interfaces/tui-ink/components/core/LogItem.tsx` | Width calculations (Groups 2.1, 2.2) |
| `src/interfaces/tui-ink/hooks/useNavigation.ts` | isBlocked guards and validation (Groups 3.1, 3.2) |
| `src/interfaces/tui-ink/utils/progress-bar.ts` | Documentation fix (Group 4.1) |
| `src/interfaces/tui-ink/components/GenericListPanel.tsx` | Optional checking (Group 4.2) |

---

## Decision Notes

### Why Suggestion #3 is Rejected (Try-catch around emit)

The automated reviewer suggested:
> "wrap the call to this.activityService.emit(...) in a try-catch... so activity logging failures do not affect API responses"

**Our Principle**: We follow "Fail Loudly" during pre-production. If activity logging fails:
- We WANT the system to show the error
- We can identify and fix the root cause
- Silently swallowing errors masks bugs

This was already rejected in Sprint 4 for the same suggestion (#32, #33, #43).

### Why Suggestion #8 is Rejected (Narrow Terminal Handling)

The automated reviewer suggested:
> "guard against messageMaxWidth becoming negative by clamping it to a minimum of 0"

**User's Previous Decision**: In Sprint 4, user explicitly asked to skip Groups 3.4-3.5 (narrow terminal handling). This is the same category of fix - handling terminals too narrow for the UI.

We accept this limitation in pre-production. Narrow terminals are not a priority.
