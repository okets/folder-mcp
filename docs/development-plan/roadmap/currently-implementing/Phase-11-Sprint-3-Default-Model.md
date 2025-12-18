# Phase 11, Sprint 3: Default Model System

**Phase**: 11 - Complete App Interface
**Sprint**: 3 - Default Model
**Status**: Ready to Start
**Prerequisite**: Sprint 2 (Settings Screen) ✅ Complete
**Start Date**: TBD

## Related Documentation
- [Phase 11 Overview](../folder-mcp-roadmap-1.1.md#phase-11-complete-app-interface)
- [Sprint 2: Settings Screen](Phase-11-Sprint-2-Settings-Screen.md) ✅ Complete
- [TUI Component Visual Guide](../../design/TUI_COMPONENT_VISUAL_GUIDE.md)

---

## Vision

Create a unified "default model" system where:
- **ONE model for all folders** is the recommended approach (stability)
- User can optionally pick their default model (Settings or First Run)
- If user never picks, system uses hardware-detected recommendation
- **Source of truth lives in DAEMON** (not TUI) for CLI compatibility

---

## Sprint Overview

### Goals
1. Add Default Model picker to Settings panel with rich UI
2. Integrate with FMDM for real-time state synchronization
3. Simplify Add Folder Wizard (remove unnecessary steps)
4. Integrate model picker into First Run Wizard
5. Verify CLI uses daemon's default model

### Scope
- **In Scope**: FMDM integration, Default Model service, Settings UI, Wizard simplification
- **Out of Scope**: Connect screen functionality, Activity Log functionality

### Approach: ONE TUI Change at a Time
Each step makes exactly ONE visual change. Human verifies before proceeding.

```
Agent implements ONE change → npm run build → Human runs TUI → Human approves → Next step
```

---

## Architecture: Source of Truth

### FMDM Integration
The default model is communicated via **FMDM (Folder MCP Data Model)** - the real-time data stream from daemon to all clients.

**New FMDM Field**:
```typescript
export interface FMDM {
  // ... existing fields ...
  defaultModel: {
    modelId: string;           // e.g., 'gpu:bge-m3' or 'cpu:all-MiniLM-L6-v2'
    source: 'user' | 'recommended';  // How this value was determined
  };
}
```

**Data Flow**:
```
┌─────────────────────────────────────────────────────────────┐
│                         DAEMON                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Default Model Service                               │   │
│  │  - getDefaultModel() → { modelId, source }           │   │
│  │  - setDefaultModel(modelId) → void                   │   │
│  │  - If user never set → return recommended model      │   │
│  │  - Persisted to ~/.folder-mcp/config.yaml            │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  FMDM Service (broadcasts to all clients)            │   │
│  │  - Includes defaultModel in FMDM state               │   │
│  │  - Real-time updates when user changes model         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         ┌─────────┐ ┌──────────┐ ┌─────────┐
         │   TUI   │ │   CLI    │ │   MCP   │
         │ (FMDM)  │ │ (FMDM)   │ │ Server  │
         └─────────┘ └──────────┘ └─────────┘
```

### WebSocket Commands
- **Read**: TUI/CLI receives `defaultModel` via FMDM stream (passive)
- **Write**: `defaultModel.set` WebSocket command to update user's choice

---

## Implementation Plan: 6 Steps

### Phase A: FMDM & Daemon Integration

#### Step 1a: Add `defaultModel` to FMDM Interface
**Goal**: Extend FMDM data model with default model field

**Changes**:
1. Add `defaultModel` field to `FMDM` interface in `fmdm.ts`
2. Update `FMDMService` to include defaultModel in broadcasts

**Files**:
- `src/daemon/models/fmdm.ts`
- `src/daemon/services/fmdm-service.ts`

**Verification**:
- [ ] FMDM interface has `defaultModel: { modelId, source }` field
- [ ] TypeScript compiles without errors
- [ ] Daemon starts without errors

**Rollback**: Remove new field from interface

---

#### Step 1b: Create Default Model Service + WebSocket Handler
**Goal**: Backend service to get/set default model

**Changes**:
1. Create `DefaultModelService` with get/set methods
2. Add `defaultModel.set` WebSocket command handler
3. Integrate with hardware detection for recommended model
4. Persist to `~/.folder-mcp/config.yaml`

**Files**:
- `src/daemon/services/default-model-service.ts` (NEW)
- `src/daemon/websocket/handlers/model-handlers.ts`

**Verification**:
- [ ] `getDefaultModel()` returns `{ modelId, source: 'recommended' }` initially
- [ ] `setDefaultModel(id)` persists and changes source to `'user'`
- [ ] FMDM broadcasts include defaultModel
- [ ] WebSocket command `defaultModel.set` works

**Rollback**: Delete new service file, revert handler changes

---

### Phase B: Settings Panel UI

#### Step 1c: Add Default Model Picker to Settings
**Goal**: Rich model picker showing same UI as Add Folder Wizard

**UI Elements** (same as Add Folder Wizard):
| Column | Description |
|--------|-------------|
| Name | Model display name |
| Match | % match based on hardware + languages |
| Recommendation | Recommended / Alternative / Previously Downloaded |
| Speed | High / Medium / Low |
| Languages | Number of languages supported |
| Type | GPU / CPU |
| Size | e.g., 2.1GB, 550MB |
| Local | ✓ if already downloaded |

**Changes**:
1. Add Default Model `SelectionListItem` to SettingsPanel
2. Read current value from FMDM context
3. On selection change, send `defaultModel.set` WebSocket command
4. Layout: vertical (many options)

**Files**:
- `src/interfaces/tui-ink/components/SettingsPanel.tsx`

**Verification**:
- [ ] Settings panel shows 3 items (Theme, Log Verbosity, Default Model)
- [ ] Default Model shows rich picker UI
- [ ] Current selection reflects FMDM state
- [ ] Changing model sends WebSocket command
- [ ] FMDM updates reflected in UI

**Rollback**: Remove Default Model item from Settings

---

### Phase C: Add Folder Wizard Simplification

#### Step 2: Simplify Add Folder Wizard
**Goal**: Streamline to just folder selection + optional model override

**REMOVE**:
- ❌ "Choose configuration mode" (Assisted/Manual)
- ❌ "Select Document Languages"

**CHANGE**:
- "Choose embedding model" → "Use specific model (experimental)"

**Result**: Add Folder becomes:
1. Select folder to index
2. (Optional) Override model - labeled as "experimental"

**Files**:
- `src/interfaces/tui-ink/components/AddFolderWizard.tsx`

**Verification**:
- [ ] Wizard shows simplified flow
- [ ] No configuration mode selection
- [ ] No language selection
- [ ] Model override marked as "experimental"
- [ ] Default model from FMDM used by default

**Rollback**: Revert wizard changes

---

### Phase D: First Run Wizard Integration

#### Step 3: Add Model Picker to First Run Wizard
**Goal**: New users pick default model before adding first folder

**Flow**:
1. Welcome screen (existing)
2. **Default Model Picker** (NEW - same UI as Settings)
3. Simplified Add Folder Wizard (post Step 2)

**Files**:
- `src/interfaces/tui-ink/components/FirstRunWizard.tsx`

**Verification**:
- [ ] First Run shows model picker step
- [ ] User can select default model
- [ ] Selection persists via FMDM
- [ ] Next step uses selected model as default

**Rollback**: Remove model picker step

---

### Phase E: CLI Integration

#### Step 4: Verify CLI Uses FMDM Default Model
**Goal**: CLI uses same source of truth for default model

**Verification**:
- [ ] `folder-mcp add <path>` (no model) → uses default from FMDM
- [ ] `folder-mcp add <path> -m <model>` → uses specified model
- [ ] Default model = user's choice OR recommended if never set

**Files**:
- `src/interfaces/cli/commands/add.ts`

**API Behavior**:
```
GET defaultModel → returns { modelId, source: 'user' | 'recommended' }
SET defaultModel → stores user's choice in daemon config
```

**Rollback**: N/A (verification step)

---

## Files Summary

### Files to Create
- `src/daemon/services/default-model-service.ts`

### Files to Modify
- `src/daemon/models/fmdm.ts`
- `src/daemon/services/fmdm-service.ts`
- `src/daemon/websocket/handlers/model-handlers.ts`
- `src/interfaces/tui-ink/components/SettingsPanel.tsx`
- `src/interfaces/tui-ink/components/AddFolderWizard.tsx`
- `src/interfaces/tui-ink/components/FirstRunWizard.tsx`
- `src/interfaces/cli/commands/add.ts`

---

## Completion Tracking

### Phase A: FMDM & Daemon Integration
- [ ] Step 1a: Add `defaultModel` to FMDM interface
- [ ] Step 1b: Create DefaultModelService + WebSocket handler

### Phase B: Settings Panel UI
- [ ] Step 1c: Add Default Model picker to Settings

### Phase C: Add Folder Wizard Simplification
- [ ] Step 2: Simplify Add Folder Wizard

### Phase D: First Run Wizard Integration
- [ ] Step 3: Add model picker to First Run Wizard

### Phase E: CLI Integration
- [ ] Step 4: Verify CLI uses FMDM default model

**Sprint Status**: 0/6 steps completed (0%)

---

## Questions Resolved

1. **Languages Survey**: Languages are transient - used only during model picking to calculate Match %. Not persisted.

2. **Daemon Config Location**: Use existing `~/.folder-mcp/config.yaml` - same file as other settings.

3. **Sprint Scope**: This is one coherent sprint. Steps 1a-1c are foundational, Steps 2-4 are consumer integrations.

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-18 | Sprint 3 document created from plan | Claude |
