# Sprint 4: Code Review Tasks

**Sprint Context**: Activity Log Screen - Real-time daemon event visualization with Progress River model, consistent icons/colors, and comprehensive MCP activity logging.

**Review Date**: 2025-12-22

---

## Evaluation Summary

| Category | Valid | Rejected | Total |
|----------|-------|----------|-------|
| High Priority | 10 | 1 | 11 |
| Low Priority | 23 | 9 | 32 |
| **Total** | **33** | **10** | **43** |

---

## REJECTED SUGGESTIONS

These contradict our project principles:

| # | Suggestion | Rejection Reason |
|---|------------|------------------|
| 12 | Activity event throttling/debouncing | **Contradicts Sprint Spec**: We explicitly want to "show EVERYTHING initially" per Phase B spec. Throttling hides information. |
| 16 | Sanitize error messages in production | **Contradicts "Fail Loudly"**: We want to see actual errors in pre-production to fix root causes. |
| 18 | Progress branded type | **Over-engineering**: Pre-production doesn't need this level of type safety yet. |
| 32 | Try-catch around emit in daemon startup | **Contradicts "Fail Loudly"**: If activity logging fails during startup, we need to know immediately. |
| 33 | Try-catch around emit in daemon startup (duplicate) | **Contradicts "Fail Loudly"**: Same reason. |
| 43 | Guard activity logging construction | **Unnecessary**: The overhead is minimal and we want transparent logging always. |
| 31 | Positional undefineds refactor | **Out of Scope**: Valid but deferred to separate refactor sprint. Not a bug. |

---

## VALID SUGGESTIONS - GROUPED BY AREA

### Group 1: Critical Bug Fixes (PRIORITY)

These are actual bugs that should be fixed first.

#### 1.1 MCP Activity Type Hardcoded to 'search' ⚠️
**Suggestion #7** - `src/daemon/rest/server.ts:208-227`

**Problem**: `emitMcpActivity` hardcodes `type: 'search'` for ALL MCP operations. This means `list_folders`, `explore`, `get_document`, etc. all show as search type with wrong icons.

**Fix**: Accept `eventType` parameter and pass appropriate type per endpoint:
- `list_folders` → `type: 'system'` or new `'exploration'` type
- `explore` → `type: 'search'` (browsing)
- `get_document/*` → `type: 'search'` (retrieval)
- `search_content/find_documents` → `type: 'search'`

---

#### 1.2 History Fetch Race Condition ⚠️
**Suggestion #4** - `src/interfaces/tui-ink/contexts/FMDMContext.tsx:179-198`

**Problem**: `historyFetched.current = true` is set BEFORE the async request completes, and `setActivityEvents(deduped)` overwrites any live events that arrived during fetch.

**Fix**:
1. Set `historyFetched.current = true` AFTER request succeeds
2. Use functional updater to merge: `setActivityEvents(prev => mergeAndDedupe(prev, history))`
3. On failure, reset `historyFetched.current = false` and log error

---

#### 1.3 Folder Add Event Emitted Before Operation Completes
**Suggestion #8** - `src/daemon/websocket/handlers/folder-handlers.ts:105-112`

**Problem**: Activity event "Added folder" is emitted BEFORE `addFolder()` completes. If indexing fails, user sees "Added" incorrectly.

**Fix**: Move `activityService.emit()` to AFTER the `await addFolder(...)` completes (matching `handleRemoveFolder` pattern).

---

#### 1.4 ActivityLogPanel Index Mismatch with Placeholders
**Suggestion #10** - `src/interfaces/tui-ink/components/ActivityLogPanel.tsx:110-119, 182-188`

**Problem**: When showing placeholder items (connecting/no events), `activityEvents[selectedIndex]` returns wrong event or undefined.

**Fix**: Check if items are actual LogItems from events before accessing `activityEvents`:
```typescript
if (!connectionStatus.connected || activityEvents.length === 0) {
    // Placeholder items can't be expanded
    if (isLandscape) {
        onSwitchToNavigation();
        return true;
    }
    return false;
}
```

---

### Group 2: TypeScript Type/Runtime Mismatches

#### 2.1 ActivityHistoryRequestMessage Payload Optional
**Suggestion #1** - `src/daemon/websocket/message-types.ts:140-151`

**Problem**: Interface declares `payload` as required but runtime treats it as optional.

**Fix**: Change `payload: { limit?: number }` to `payload?: { limit?: number }`

---

#### 2.2 Activity History Payload Validation
**Suggestion #2** - `src/daemon/websocket/message-types.ts:589-602`

**Problem**: Validation doesn't properly check if payload is an object.

**Fix**: Add `typeof message.payload === 'object' && message.payload !== null` check before accessing `payload.limit`.

---

#### 2.3 Protocol Limit Validation
**Suggestion #9** - `src/daemon/websocket/protocol.ts:487-511`

**Problem**: `payload.limit` used directly without validation.

**Fix**: Coerce to number, validate finite integer, clamp to 1-1000 range, default to 100.

---

#### 2.4 Message Type Guard Consistency
**Suggestion #42** - `src/daemon/websocket/message-types.ts:717-723`

**Problem**: `isActivityHistoryRequestMessage` only checks type and id, not payload structure.

**Fix**: Add payload validation for consistency with other type guards.

---

### Group 3: Input Validation & Edge Cases

#### 3.1 Timestamp Comparison Validation
**Suggestion #3** - `src/interfaces/tui-ink/contexts/FMDMContext.tsx:26-43`

**Problem**: Timestamp comparison can silently fail for malformed timestamps.

**Fix**: Parse once to numeric epoch, validate with `Number.isFinite()`, treat invalid as `-Infinity`. **Log warning** for invalid timestamps (don't silently ignore).

---

#### 3.2 Progress Bar Width Validation
**Suggestion #6** - `src/interfaces/tui-ink/utils/progress-bar.ts:27-59`

**Problem**: No validation for `width` and `percentage` parameters.

**Fix**:
- If `width` is not finite positive number, **throw TypeError** (fail loudly)
- If `percentage` is NaN/Infinity, clamp to 0-100
- Ensure `barWidth >= 1` after calculations

---

#### 3.3 Date Formatting Validation
**Suggestion #22** - `src/interfaces/tui-ink/utils/progress-bar.ts:100-111`

**Problem**: Relies on try-catch instead of explicit validation.

**Fix**: Check `isNaN(date.getTime())` first, return `'--:--'` for invalid dates, keep minimal try-catch for runtime errors only.

---

#### 3.4 ActivityLogItem Narrow Terminal Handling
**Suggestion #36** - `src/interfaces/tui-ink/components/ActivityLogItem.tsx:77-103`

**Problem**: Can compute negative `messageMaxWidth` for very narrow terminals.

**Fix**: Add minimum width check, return compact fallback (just icon/spinner) if `maxWidth < iconWidth + progressBarWidth + 1`.

---

#### 3.5 ActivityLogItem Detail Truncation
**Suggestion #37** - `src/interfaces/tui-ink/components/ActivityLogItem.tsx:105-144`

**Problem**: Long detail can consume all available space, doesn't handle narrow terminals.

**Fix**: Reserve minimum chars for core message before appending detail, handle `availableForMessage <= 0`.

---

### Group 4: Dead Code & Unused Imports

#### 4.1 useCallback Unused Import
**Suggestion #39** - `src/interfaces/tui-ink/components/ActivityLogPanel.tsx:14`

**Fix**: Remove `useCallback` from React import.

---

#### 4.2 ActivityLogItem Dead Code
**Suggestions #34, #35** - `src/interfaces/tui-ink/components/ActivityLogItem.tsx`

- `_isControllingInput` field never modified, getter always returns false
- `icon` setter defined but unused

**Fix**: Remove dead code or implement intended functionality.

---

#### 4.3 LogItem truncateText Dead Code
**Suggestion #21** - `src/interfaces/tui-ink/components/core/LogItem.tsx:191-205`

**Problem**: `truncateText` may be redundant with `renderSegments` truncation.

**Fix**: Search for callers, remove if unused.

---

#### 4.4 GenericListPanel Redundant Try-Catch
**Suggestion #17** - `src/interfaces/tui-ink/components/GenericListPanel.tsx:154-156, etc.`

**Problem**: Try-catch blocks that only re-throw.

**Fix**: Remove redundant try-catch blocks.

---

### Group 5: Code Quality & Consistency

#### 5.1 FMDMContext Merge Logic Optimization
**Suggestion #41** - `src/interfaces/tui-ink/contexts/FMDMContext.tsx:122-148`

**Problem**: Two separate `findIndex` scans for matching events.

**Fix**: Single-pass search or temporary Map for better performance.

---

#### 5.2 useNavigation isBlocked Consistency
**Suggestion #19** - `src/interfaces/tui-ink/hooks/useNavigation.ts:188-193`

**Problem**: `setActivityExpandedState` doesn't respect `isBlocked` flag.

**Fix**: Read `isBlocked` from prev state and return unchanged if true.

---

#### 5.3 LogItem Segment Type Field
**Suggestion #20** - `src/interfaces/tui-ink/components/core/LogItem.tsx:355-367`

**Problem**: `renderSegments` infers segment type by array length.

**Fix**: Add explicit `type: 'timestamp' | 'icon' | 'text'` field to segments.

---

#### 5.4 ActivityLogItem Switch Consolidation
**Suggestion #38** - `src/interfaces/tui-ink/components/ActivityLogItem.tsx:146-163`

**Problem**: Switch returns same value for multiple cases.

**Fix**: Group cases or use lookup map.

---

#### 5.5 ActivityLogPanel getSubtitle Memoization
**Suggestion #40** - `src/interfaces/tui-ink/components/ActivityLogPanel.tsx:273-302`

**Problem**: `getSubtitle` scans activityEvents multiple times, recreated every render.

**Fix**: Use `React.useMemo` with single-pass calculation.

---

### Group 6: Path & String Handling

#### 6.1 extractFolderName Use path.basename
**Suggestion #26** - `src/daemon/services/monitored-folders-orchestrator.ts:328-335`

**Problem**: Manual split logic instead of cross-platform `path.basename`.

**Fix**: Use `path.basename(folderPath)` for consistent handling.

---

#### 6.2 Folder Name Consistency in Messages
**Suggestions #27, #28** - `src/daemon/services/monitored-folders-orchestrator.ts:1879-1902`

**Problem**: Uses raw `folder.folderPath` instead of extracted folder name.

**Fix**: Use `extractFolderName()` for consistent user-friendly names.

---

#### 6.3 FMDMClient substr to substring
**Suggestion #29** - `src/interfaces/tui-ink/services/FMDMClient.ts:58-64, 613`

**Problem**: Uses deprecated `substr()`.

**Fix**: Replace with `substring(2, 11)` for consistent 9-char suffix.

---

### Group 7: Minor Cleanups

#### 7.1 Documentation Fixes
- **Suggestion #5**: Update progress-bar.ts comment about Unicode vs ASCII icons
- **Suggestion #24**: Move key prop comment to top of conditional block in AppFullscreen.tsx

---

#### 7.2 Redundant Initializations
- **Suggestion #25**: Remove `= undefined` from `private activityService: ActivityService | undefined`
- **Suggestion #23**: Remove unnecessary `Math.min` in `activity-service.ts`

---

#### 7.3 Nullish Coalescing
- **Suggestion #30**: Use `?? []` instead of `|| []` in FMDMClient.ts for events

---

#### 7.4 Empty String ClientId Handling
- **Suggestions #14, #15**: Use `!== undefined` instead of truthiness check for clientId

---

#### 7.5 Broadcast Refactoring
- **Suggestion #13**: Refactor `broadcastFMDM` and `broadcast` to use `broadcastMessage`

---

### Group 8: Accessibility

#### 8.1 High Contrast Theme Warning Color
**Suggestion #11** - `src/interfaces/tui-ink/contexts/ThemeContext.tsx:174-176`

**Problem**: Uses `magentaBright` for warnings, breaks accessibility expectations.

**Fix**: Use `yellowBright` or accessible amber for warnings.

---

## Implementation Order

### Phase 1: Critical Bug Fixes (Do First)
1. Group 1.1 - MCP Activity Type Fix
2. Group 1.2 - History Fetch Race Condition
3. Group 1.3 - Folder Add Event Timing
4. Group 1.4 - ActivityLogPanel Index Mismatch

### Phase 2: Type Safety
5. Group 2 - All TypeScript type/runtime fixes

### Phase 3: Input Validation
6. Group 3 - All input validation fixes

### Phase 4: Code Quality
7. Groups 4-7 - Dead code removal, consistency, cleanups

### Phase 5: Accessibility
8. Group 8 - Theme fixes

---

## Files Affected Summary

| File | Changes |
|------|---------|
| `src/daemon/rest/server.ts` | MCP activity type fix |
| `src/interfaces/tui-ink/contexts/FMDMContext.tsx` | Race condition, merge optimization, timestamp validation |
| `src/daemon/websocket/handlers/folder-handlers.ts` | Event timing fix |
| `src/interfaces/tui-ink/components/ActivityLogPanel.tsx` | Index mismatch, unused import, memoization |
| `src/daemon/websocket/message-types.ts` | Type fixes, validation |
| `src/daemon/websocket/protocol.ts` | Limit validation |
| `src/interfaces/tui-ink/utils/progress-bar.ts` | Input validation, date validation, docs |
| `src/interfaces/tui-ink/components/ActivityLogItem.tsx` | Dead code, narrow terminal, truncation |
| `src/interfaces/tui-ink/components/core/LogItem.tsx` | Segment types, dead code |
| `src/interfaces/tui-ink/hooks/useNavigation.ts` | isBlocked consistency |
| `src/daemon/services/monitored-folders-orchestrator.ts` | path.basename, folder name consistency |
| `src/interfaces/tui-ink/services/FMDMClient.ts` | substr fix, nullish coalescing |
| `src/interfaces/tui-ink/contexts/ThemeContext.tsx` | Warning color accessibility |
| `src/daemon/services/activity-service.ts` | Minor cleanup |
| `src/interfaces/tui-ink/AppFullscreen.tsx` | Comment location |
| `src/interfaces/tui-ink/components/GenericListPanel.tsx` | Redundant try-catch |
| `src/interfaces/tui-ink/daemon-connector.ts` | ClientId checks |
| `src/daemon/websocket/server.ts` | Broadcast refactoring |
