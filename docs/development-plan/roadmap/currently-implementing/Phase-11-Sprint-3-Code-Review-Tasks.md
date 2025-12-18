# Phase 11, Sprint 3: Code Review Tasks

**Sprint**: Default Model System (Steps 1a-1c + Language Persistence Extension)
**Review Date**: 2025-12-18
**Status**: Evaluated - Ready for Implementation

---

## Summary

17 suggestions received from automated code review.
- **14 ACCEPTED** (with modifications where noted)
- **3 REJECTED** (explained below)

---

## REJECTED Suggestions

### Suggestion #3: Make defaultModel optional for backward compatibility
**REJECTED** - We are in pre-production and explicitly do not maintain backward compatibility. The sprint document defines `defaultModel` as a required field in FMDM. Breaking changes are acceptable.

### Suggestion #4: Change source 'recommended' to 'fallback'
**PARTIALLY REJECTED** - The semantic distinction between 'recommended' and 'fallback' is unnecessary complexity. HOWEVER, the underlying concern about hardcoded model names IS valid and addressed in Group 5. The 'recommended' source value is correct for hardware-detected recommendations.

### Suggestion #19: Add error handling for missing model/languages in completion
**REJECTED** - The early returns in the completion handler are intentional validation. If `selectedModel` or `selectedLanguages` is missing at confirmation time, it indicates a UI bug that should be caught during development, not handled gracefully at runtime. Adding logging is acceptable (covered in Group 4) but we should NOT add user-facing error handling for impossible states.

---

## ACCEPTED Suggestions (Grouped by Theme)

### Group 1: Type Safety - Extract Named Interfaces
**Priority**: Medium | **Effort**: Low

Extract verbose inline types to named interfaces for better readability and reuse.

| # | File | Change |
|---|------|--------|
| 6 | `FMDMClient.ts:393` | Extract `SetDefaultModelResponse` interface |
| 8 | `FMDMContext.tsx:32,160` | Extract `SetDefaultModelResult` type (share with #6) |

**Implementation Note**: Create ONE shared type that both files can use.

---

### Group 2: Promise & Timer Handling
**Priority**: High | **Effort**: Medium

Fix async anti-patterns and resource leaks.

| # | File | Change |
|---|------|--------|
| 2 | `DefaultModelWizard.tsx:46-72` | Remove async executor from Promise constructor |
| 18 | `DefaultModelWizard.tsx:489-516` | Clear timeout after response arrives |

**Details**:
- #2: Make `connect` an async function without Promise wrapper
- #18: Store timeout ID and call `clearTimeout()` when request resolves/rejects

---

### Group 3: Array Mutation
**Priority**: High | **Effort**: Low

| # | File | Change |
|---|------|--------|
| 1 | `DefaultModelWizard.tsx:522-526` | Create shallow copy before sorting models array |

**Fix**: Replace `models.sort(...)` with `[...models].sort(...)`

---

### Group 4: Validation & Error Handling
**Priority**: Medium | **Effort**: Low

| # | File | Change |
|---|------|--------|
| 11 | `message-types.ts:509-518` | Validate empty modelId strings and languages array format |
| 13 | `SettingsPanel.tsx:54-64` | Add error logging in catch block (but don't rethrow) |

**Details**:
- #11: Reject empty strings for modelId, validate languages is array of non-empty strings
- #13: Add `console.error` logging but keep existing flow (increment wizardUpdateTrigger)

---

### Group 5: No Hardcoded Model Names
**Priority**: High | **Effort**: Low

Per team leader directive: "WE NEVER HARD CODE MODEL NAMES!"

| # | File | Change |
|---|------|--------|
| 15 | `default-model-service.ts:198` | Replace `'cpu:all-MiniLM-L6-v2'` with `findSmallestCpuModel()` |
| (4) | `fmdm-service.ts:176-182` | Replace hardcoded model in `buildInitialFMDM()` with `findSmallestCpuModel()` |

**Note**: Suggestion #4 was partially rejected for semantic reasons, but the hardcoded model concern is valid.

---

### Group 6: Code Cleanup
**Priority**: Low | **Effort**: Low

Simple cleanup tasks.

| # | File | Change |
|---|------|--------|
| 12 | `SettingsPanel.tsx:1` | Remove unused `useRef` import |
| 17 | `DefaultModelWizard.tsx:195-200` | Change `initialModel?: string \| undefined` to `initialModel?: string` |
| 14 | `default-model-service.ts:106-111` | Make `hardwareProfile` optional in `DefaultModelSelection`, remove dummy object |

---

### Group 7: Logging Consistency
**Priority**: Low | **Effort**: Low

| # | File | Change |
|---|------|--------|
| 10 | `model-handlers.ts:439` | Use `newConfig.modelId` in log instead of input `modelId` |

---

### Group 8: API Consistency
**Priority**: Low | **Effort**: Low

| # | File | Change |
|---|------|--------|
| 7 | `FMDMClient.ts:400-404` | Return response directly instead of manual mapping |
| 9 | `FMDMContext.tsx:257-267` | Add `setDefaultModel` to `useFMDMOperations` hook |

**Note for #9**: Alternatively, rename hook to `useFMDMFolderOperations` if setDefaultModel is intentionally excluded.

---

### Group 9: Documentation
**Priority**: Low | **Effort**: Low

| # | File | Change |
|---|------|--------|
| 5 | `interfaces.ts:660` | Add JSDoc comment for `DEFAULT_MODEL_SERVICE` token |

---

### Group 10: Test Improvements
**Priority**: Medium | **Effort**: Low

| # | File | Change |
|---|------|--------|
| 16 | `phase-9-sprint-1-task-1.test.ts:35-64` | Add `exit/close/error` listener to fail fast if daemon crashes during startup |

---

## Implementation Order

1. **Group 5** (No Hardcoded Models) - High priority, team directive
2. **Group 2** (Promise/Timer) - High priority, potential resource leaks
3. **Group 3** (Array Mutation) - High priority, potential bugs
4. **Group 4** (Validation) - Medium priority, better error handling
5. **Group 1** (Type Safety) - Medium priority, code quality
6. **Group 10** (Tests) - Medium priority, better diagnostics
7. **Groups 6-9** (Cleanup/Consistency) - Low priority, nice to have

---

## Files Affected

| File | Suggestions |
|------|-------------|
| `DefaultModelWizard.tsx` | #1, #2, #17, #18 |
| `FMDMClient.ts` | #6, #7 |
| `FMDMContext.tsx` | #8, #9 |
| `SettingsPanel.tsx` | #12, #13 |
| `default-model-service.ts` | #14, #15 |
| `fmdm-service.ts` | (from #4) |
| `message-types.ts` | #11 |
| `model-handlers.ts` | #10 |
| `interfaces.ts` | #5 |
| `phase-9-sprint-1-task-1.test.ts` | #16 |
