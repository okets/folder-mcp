# Phase 8 - Task 8.6: Add Folder Wizard Implementation

## Overview
Implement a reusable Add Folder Wizard component that collects folder path and model selection, usable in both first-run wizard and main screen.

## Linear Implementation Plan

### Step 1: Create Model Metadata Infrastructure
- [ ] Create `src/interfaces/tui-ink/models/modelMetadata.ts`
- [ ] Define `ModelMetadata` interface with fields: name, displayName, languages, params, gpuRequired, backend
- [ ] Create `modelMetadata` record with all supported models
- [ ] Map backend names: "transformers.js" → "folder-mcp", keep "ollama" as is
- [ ] Export helper functions: `getModelMetadata(modelName)`, `getAllModelsWithMetadata()`

### Step 2: Create AddFolderWizard Factory
- [ ] Create `src/interfaces/tui-ink/components/AddFolderWizard.tsx`
- [ ] Define `AddFolderWizardResult` interface: `{path: string, model: string}`
- [ ] Define `AddFolderWizardOptions` interface with initialPath, initialModel, onComplete, onCancel
- [ ] Implement `createAddFolderWizard()` factory function that returns ContainerListItem
- [ ] Add FilePickerListItem child for folder selection with validation
- [ ] Add SelectionListItem child for model selection (basic version first)

### Step 3: Enhance Model Selection Display
- [ ] Modify SelectionListItem render to detect model selection context
- [ ] Implement column-based layout for model metadata display
- [ ] Add responsive column widths based on terminal size
- [ ] Format display: "Name | Languages | Params | GPU | Backend"
- [ ] Test with various terminal widths to ensure readability

### Step 4: Update CLI Entry Point Logic
- [ ] Modify `src/interfaces/tui-ink/index.tsx`
- [ ] Implement `shouldShowWizard()` function with proper flow logic
- [ ] Add folder validation: `isValidFolder(path)` - check exists and is directory
- [ ] Add model validation: `isValidModel(model)` - check against supported models
- [ ] Handle case: No params → check if folders configured
- [ ] Handle case: Both params valid → add folder directly, skip wizard
- [ ] Handle case: Params incomplete/invalid → show wizard
- [ ] Add --headless mode support

### Step 5: Restructure FirstRunWizard
- [ ] Backup current `FirstRunWizard.tsx` implementation
- [ ] Remove duplicate wizard UI code (keep validation logic)
- [ ] Import and use `createAddFolderWizard()` for UI
- [ ] Preserve CLI parameter validation and error screens
- [ ] Update to use GenericListPanel with single wizard item
- [ ] Test with various CLI parameter combinations

### Step 6: Update Main Screen - Add Button
- [ ] Modify `src/interfaces/tui-ink/AppFullscreen.tsx`
- [ ] Add state: `const [showAddFolderWizard, setShowAddFolderWizard] = useState(false)`
- [ ] Create SimpleButtonsRow with "Add A Folder" button
- [ ] Position button at top of config items list
- [ ] Wire button to set `showAddFolderWizard(true)`

### Step 7: Update Main Screen - Folder List
- [ ] Import LogItem for folder display
- [ ] Replace stub ContainerListItem (lines 159-199) with new implementation
- [ ] Map existing folders to LogItem instances
- [ ] Add folder path as main text, model as expandable detail
- [ ] Add status indicator (✓ for valid folders, ✗ for invalid)

### Step 8: Update Main Screen - Wizard Integration
- [ ] Add wizard to items list when `showAddFolderWizard` is true
- [ ] Create wizard with onComplete handler that adds folder
- [ ] Ensure wizard starts in expanded mode (call `wizard.onEnter()`)
- [ ] Add onCancel handler to hide wizard
- [ ] Refresh folder list after successful addition

### Step 9: Human-Agent TUI Testing
Following the established TUI debugging methodology from CLAUDE.md:

#### Initial Testing Round
- [ ] Agent adds debug logging to key components (AddFolderWizard, model selection, etc.)
- [ ] Agent builds the code: `npm run build`
- [ ] Human runs TUI with stderr capture: `npm run tui 2>debug.log`
- [ ] Human provides feedback: "done" or describes issues
- [ ] Agent reads debug.log and analyzes any issues
- [ ] Iterate until human confirms "looks good"

#### Integration Test Scenarios (Human Executes)
- [ ] Test: `folder-mcp` with no params, no folders → shows wizard
- [ ] Test: `folder-mcp` with no params, has folders → shows main screen
- [ ] Test: `folder-mcp -d /valid/path -m valid-model` → adds folder, shows main
- [ ] Test: `folder-mcp -d /invalid/path` → shows wizard with error
- [ ] Test: `folder-mcp -m invalid-model` → shows wizard with error
- [ ] Test: `folder-mcp -d /valid/path -m valid-model --headless` → adds folder, exits
- [ ] Test: Main screen "Add A Folder" button → shows wizard
- [ ] Test: Complete wizard from main screen → updates folder list

#### Visual Testing Checklist (Human Verifies)
- [ ] Model metadata columns align properly at different terminal widths
- [ ] Scrolling works correctly in model selection list
- [ ] Focus indicators display correctly (▶, ■, ·)
- [ ] ContainerListItem expands/collapses smoothly
- [ ] No visual jitter or flickering
- [ ] Colors and borders render correctly

### Step 10: Cleanup and Documentation
- [ ] **CRITICAL**: Remove ALL console.error debug statements (causes Windows terminal jitter)
- [ ] Verify no debug logs remain: `grep -r "console.error" src/interfaces/tui-ink/`
- [ ] Remove old stub ContainerListItem from main screen
- [ ] Update inline comments explaining the flow
- [ ] Add JSDoc comments to new functions
- [ ] Update Phase 8 documentation with task completion
- [ ] Final human test: Run TUI one more time to confirm no debug output
- [ ] Commit with message: "feat: implement Add Folder Wizard for unified folder configuration"

## Success Criteria
- [x] Single reusable wizard component for folder addition
- [x] Works in both first-run and main screen contexts
- [x] Shows model metadata in user-friendly format
- [x] Respects CLI flow: power users can skip wizard
- [x] Clean architecture ready for future "interview mode"

## Notes
- Keep the implementation focused on current needs (direct model selection)
- Ensure architecture supports future evolution to interview-based model selection
- Use "folder-mcp" instead of "transformers.js" for user clarity
- Maintain consistent UX with existing ContainerListItem patterns