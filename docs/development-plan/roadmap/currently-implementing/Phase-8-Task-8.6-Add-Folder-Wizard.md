# Phase 8 - Task 8.6: Add Folder Wizard Implementation

## Overview
Implement a reusable Add Folder Wizard component that collects folder path and model selection, usable in both first-run wizard and main screen.

## Linear Implementation Plan

### Step 1: Create Model Metadata Infrastructure
- [x] Create `src/interfaces/tui-ink/models/modelMetadata.ts`
- [x] Define `ModelMetadata` interface with fields: name, displayName, languages, params, gpuRequired, backend
- [x] Create `modelMetadata` record with all supported models
- [x] Map backend names: "transformers.js" → "folder-mcp", keep "ollama" as is
- [x] Export helper functions: `getModelMetadata(modelName)`, `getAllModelsWithMetadata()`

### Step 2: Create AddFolderWizard Factory
- [x] Create `src/interfaces/tui-ink/components/AddFolderWizard.tsx`
- [x] Define `AddFolderWizardResult` interface: `{path: string, model: string}`
- [x] Define `AddFolderWizardOptions` interface with initialPath, initialModel, onComplete, onCancel
- [x] Implement `createAddFolderWizard()` factory function that returns ContainerListItem
- [x] Add FilePickerListItem child for folder selection with validation
- [x] Add SelectionListItem child for model selection (basic version first)

### Step 3: Enhance Model Selection Display
- [x] Modify SelectionListItem render to detect model selection context (already supported via showDetails)
- [x] Implement column-based layout for model metadata display (using existing details feature)
- [x] Add responsive column widths based on terminal size (SelectionBody handles this)
- [x] Format display: "Name | Languages | Params | GPU | Backend" (via details object)
- [ ] Test with various terminal widths to ensure readability (requires human testing)

### Step 4: Update CLI Entry Point Logic
- [x] Modify `src/interfaces/tui-ink/index.tsx`
- [x] Implement `shouldShowWizard()` function with proper flow logic (existing checkConfigAndImplementFlow)
- [x] Add folder validation: `isValidFolder(path)` - check exists and is directory (uses ConfigurationComponent)
- [x] Add model validation: `isValidModel(model)` - check against supported models (uses ConfigurationComponent)
- [x] Handle case: No params → check if folders configured (lines 95-102)
- [x] Handle case: Both params valid → add folder directly, skip wizard (lines 86-97)
- [x] Handle case: Params incomplete/invalid → show wizard (lines 99-101)
- [x] Add --headless mode support (executeHeadless function)

### Step 5: Restructure FirstRunWizard
- [x] Backup current `FirstRunWizard.tsx` implementation
- [x] Remove duplicate wizard UI code (keep validation logic)
- [x] Import and use `createAddFolderWizard()` for UI
- [x] Preserve CLI parameter validation and error screens
- [x] Update to use GenericListPanel with single wizard item
- [ ] Test with various CLI parameter combinations (requires human testing)

### Step 6: Update Main Screen - Add Button
- [x] Modify `src/interfaces/tui-ink/AppFullscreen.tsx`
- [x] Add state: `const [showAddFolderWizard, setShowAddFolderWizard] = useState(false)`
- [x] Create SimpleButtonsRow with "Add A Folder" button
- [x] Position button at top of config items list
- [x] Wire button to set `showAddFolderWizard(true)`

### Step 7: Update Main Screen - Folder List
- [x] Import LogItem for folder display
- [x] Replace stub ContainerListItem (lines 159-199) with new implementation
- [x] Map existing folders to LogItem instances
- [x] Add folder path as main text, model as expandable detail
- [x] Add status indicator (✓ for valid folders, ✗ for invalid)

### Step 8: Update Main Screen - Wizard Integration
- [x] Add wizard to items list when `showAddFolderWizard` is true
- [x] Create wizard with onComplete handler that adds folder
- [x] Ensure wizard starts in expanded mode (call `wizard.onEnter()`)
- [x] Add onCancel handler to hide wizard
- [x] Refresh folder list after successful addition

### Step 9: Add Validation & Confirmation Enhancement
Based on user feedback, critical validation issues must be addressed before testing:

#### Step 9.1: Enhance ContainerListItem Confirmation System ✅
- [x] Add validation state support to ContainerListItem constructor
- [x] Implement dual-button layout: "✓ Confirm Selection" + "✗ Cancel" 
- [x] Add left/right arrow navigation between buttons (inspired by ConfigurationListItem)
- [x] Add conditional button states: gray out Confirm when validation errors exist
- [x] Update ViewportCalculator.calculateConfirmationLayout() for dual buttons
- [x] Test button navigation and visual states

#### Step 9.2: Create Folder Validation Service ✅
- [x] Create `src/interfaces/tui-ink/services/FolderValidationService.ts`
- [x] Implement three validation scenarios:
  - **Duplicate**: Exact path already monitored (error → disable Confirm)
  - **Sub-folder**: New path is child of existing folder (error → disable Confirm)  
  - **Ancestor**: New path is parent of existing folders (warning → enable Confirm)
- [x] Integrate with ConfigurationComponent.getFolders() for validation checks
- [x] Return validation results with error/warning messages

#### Step 9.3: Integrate Validation with AddFolderWizard ✅
- [x] Add real-time validation to FilePickerListItem selection
- [x] Pass validation results to ContainerListItem for button state management
- [x] Enable dual-button mode with validation-based button states
- [x] Added comprehensive debug logging for validation flow
- [ ] For ancestor scenario: integrate existing IDestructiveConfig + ConfirmationBody system
- [ ] Test all three validation scenarios with proper button states

#### Step 9.4: Leverage Existing Destructive Confirmation for Ancestor ✅
- [x] Research ConfigurationListItem confirmation patterns (already implemented)
- [x] Create IDestructiveConfig for ancestor folder replacement scenario
- [x] Show which existing folders will be replaced/removed in destructive config
- [x] Add infrastructure to detect ancestor scenarios and create destructive configurations
- [x] Add comprehensive logging for ancestor confirmation flow
- [ ] **TODO**: Full integration of ConfirmationBody component (requires ContainerListItem enhancement)
- [ ] **TODO**: Test destructive confirmation navigation and behavior (requires full implementation)

### Step 9.5: Fix UX Issues (Critical) ✅
Based on user feedback, critical UX issues must be addressed immediately:

#### Step 9.5.1: Fix Button Row Positioning ✅
- [x] Move "Add A Folder" button from top to bottom of configuration items list
- [x] Ensure proper navigation flow: folders first, then actions at bottom
- [x] Future-proof for additional action buttons

#### Step 9.5.2: Implement Real Destructive Confirmation ✅
- [x] Create DestructiveConfirmationWrapper component using existing ConfirmationBody
- [x] Show actual destructive confirmation dialog for ancestor scenarios (not just console logs)
- [x] Integrate with existing IDestructiveConfig and ConfirmationBody infrastructure
- [x] Handle confirmation result: proceed with folder addition or cancel

#### Step 9.5.3: Integrate Validation with FilePickerListItem ✅
- [x] Use FilePickerListItem's built-in validation system (_externalValidationMessage)
- [x] Pass FolderValidationService results to FilePickerListItem's performValidation method
- [x] Display validation errors/warnings directly in file picker UI using robust validation infrastructure
- [x] Remove redundant validation state from ContainerListItem, keep button state management
- [x] Use existing ValidationMessage, ValidationState, formatValidationDisplay

### Step 9.6: Remove Parallel Validation System ✅
Based on feedback about emojis and architecture cleanliness:

#### Step 9.6.1: Remove Parallel Validation System ✅
- [x] Remove redundant validation message passing through ContainerListItem
- [x] Remove updateValidation method from ContainerListItem
- [x] Keep button state management for enable/disable functionality

#### Step 9.6.2: Enhance Existing Validation System ✅
- [x] Update FilePickerListItem to use FolderValidationService directly
- [x] Integrate async validation properly with ValidatedListItem base class
- [x] Display validation results in file picker using existing formatValidationDisplay

#### Step 9.6.3: Fix AddFolderWizard Integration ✅
- [x] Pass FolderValidationService to FilePickerListItem constructor
- [x] Remove validation state and onValidationChange from wizard
- [x] Keep button state management via ValidationResult

#### Step 9.6.4: Replace All Emojis with ASCII ✅
- [x] Replace ⬇️ with v in FolderValidationService
- [x] Replace 📁 with standard folder icon
- [x] Ensure all validation messages use ASCII only

### Step 9.7: Fix Icon Width Issues ✅
Based on feedback about multi-character icons:

#### Step 9.7.1: Find and Fix Add Folder Button Emoji ✅
- [x] Replace '+' emoji in Add Folder button with ASCII '+'
- [x] Verify single-width character for button icon

#### Step 9.7.2: Replace Multi-Character Icons with Single Characters ✅
- [x] Replace 'м' (Cyrillic) with 'M' in model selector
- [x] Replace '⧉' with '#' in wizard container
- [x] Ensure all icons are single ASCII characters

#### Step 9.7.3: Verify Single-Width Characters ✅
- [x] Audit all IListItem implementations for icon width
- [x] Ensure all icons use single ASCII characters
- [x] Test for proper alignment in TUI

### Step 10: Fix Critical Issues ✅
Based on testing feedback:

#### Step 10.1: Fix Remaining Emoji in FolderValidationService ✅
- [x] Replace folder emoji (📁) with ASCII text
- [x] Update validation messages to use descriptive text instead of emojis

#### Step 10.2: Fix Cursor Positioning After Folder Addition ✅
- [x] Add wizardJustAdded state to track when wizard is added
- [x] Use useEffect to move focus to wizard when it's added
- [x] Reset main panel selection to 0 (wizard position)

#### Step 10.3: Fix Enter Key Navigation in ContainerListItem ✅
- [x] Implement proper enter key handling to move focus into children
- [x] Fix navigation from container to first child item
- [x] Ensure proper focus management when entering containers

#### Step 10.4: Create ValidationPipeline Interface ✅
- [x] Define IValidationPipeline interface with validate method
- [x] Add ValidationContext with folder, model, and allFolders
- [x] Create pipeline that runs validators in sequence

#### Step 10.5: Create Validator Implementations ✅
- [x] Create DuplicateFolderValidator
- [x] Create SubfolderValidator
- [x] Create AncestorFolderValidator
- [x] Each returns appropriate ValidationResult

#### Step 10.6: Enhance ValidationRegistry with Pipeline ✅
- [x] Add createValidationPipeline method to registry
- [x] Implement pipeline execution logic
- [x] Support early termination on errors

#### Step 10.7: Update ConfigurationComponent to Use Pipeline ✅
- [x] Replace inline validation with pipeline usage
- [x] Register all validators with ValidationRegistry
- [x] Use pipeline.validate() for folder validation

### Step 11: Fix Focus Management When Wizard Is Added ✅
- [x] Track wizard addition state in AppFullscreen
- [x] Use useEffect to move focus when wizard appears
- [x] Reset navigation index to wizard position (0)

### Step 12: Fix Validation Display in Collapsed ContainerListItem ✅
- [x] Update ContainerListItem to show validation in collapsed view
- [x] Position validation message below title when collapsed
- [x] Ensure validation is visible in both expanded and collapsed states

### Step 13: Fix Real-Time Validation Updates ✅
Based on user feedback about validation not updating during navigation:

#### Step 13.1: Fix Path Color Based on Validation State ✅
- [x] Add getPathColor() method to FilePickerListItem
- [x] Prioritize validation state over path validity for color
- [x] Use red for errors, yellow for warnings, green for valid

#### Step 13.2: Ensure Validation Shows in Collapsed View ✅
- [x] Update FilePickerListItem to check hasWarning condition
- [x] Show validation messages for both errors and warnings

#### Step 13.3: Fix Validation Clearing During Navigation ✅
- [x] Update ValidatedListItem.validateValue() to preserve async validation
- [x] Only update validation when performValidation returns non-null

#### Step 13.4: Fix Warning Validation Logic ✅
- [x] Change condition from `!validationResult.isValid` to include `hasWarning`
- [x] Ensure warnings (isValid=true, hasWarning=true) display properly

#### Step 13.5: Fix LogItem Escape Key Handling ✅
- [x] Remove input control from LogItems
- [x] Let escape key bubble up to app-level handler

### Step 14: Human-Agent TUI Testing ✅
- [x] Validation warnings now show correctly during navigation
- [x] Path color updates based on validation state
- [x] Escape key issue identified but initially misunderstood

### Step 15: Fix Global Escape Key for LogItems ✅
Based on user feedback that escape only works when "Add A Folder" button is highlighted:

- [x] Modified LogItem.onCollapse() to return boolean indicating if collapse occurred
- [x] Updated IListItem interface to include proper onCollapse signature
- [x] Updated GenericListPanel to check onCollapse return value before consuming escape
- [x] Fixed left arrow handling to also check return value
- [x] Escape now properly bubbles up when LogItems are already collapsed

### Step 10: Human-Agent TUI Testing
Following the established TUI debugging methodology from CLAUDE.md:

#### Initial Testing Round
- [x] Agent adds debug logging to key components (AddFolderWizard, model selection, etc.)
- [x] Agent builds the code: `npm run build`
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

#### Validation Test Scenarios (Human Executes)
- [ ] Test: Try to add duplicate folder → Confirm disabled, Cancel enabled, error message shown
- [ ] Test: Try to add sub-folder of monitored folder → Confirm disabled, Cancel enabled, error message shown
- [ ] Test: Try to add ancestor folder → Warning shown, Confirm enabled, destructive confirmation appears
- [ ] Test: Left/right arrows navigate between Cancel and Confirm buttons
- [ ] Test: Validation updates in real-time as user navigates folders

#### Visual Testing Checklist (Human Verifies)
- [ ] Model metadata columns align properly at different terminal widths
- [ ] Scrolling works correctly in model selection list
- [ ] Focus indicators display correctly (▶, ■, ·)
- [ ] ContainerListItem expands/collapses smoothly
- [ ] No visual jitter or flickering
- [ ] Colors and borders render correctly
- [ ] Cancel and Confirm buttons appear side by side
- [ ] Button states (enabled/disabled) display correctly
- [ ] Validation messages show clearly
- [ ] Destructive confirmation dialog works properly

### Step 16: Final Cleanup and Documentation
- [ ] **CRITICAL**: Remove ALL console.error debug statements (causes Windows terminal jitter)
- [ ] Verify no debug logs remain: `grep -r "console.error" src/interfaces/tui-ink/`
- [x] Remove old stub ContainerListItem from main screen (already done)
- [ ] Update inline comments explaining the flow
- [ ] Add JSDoc comments to new functions
- [x] Update Phase 8 documentation with task completion (this document)
- [ ] Final human test: Run TUI one more time to confirm no debug output
- [ ] Commit with message: "feat: implement Add Folder Wizard with validation and escape key fixes"

### Step 17: Create ManageFolderItem Component
Based on user request for folder management UI with destructive removal confirmation:

#### Step 17.1: Create ManageFolderItem Factory ⭕
- [ ] Create `src/interfaces/tui-ink/components/ManageFolderItem.tsx`
- [ ] Implement `createManageFolderItem()` factory function following AddFolderWizard pattern
- [ ] Return ConfigurationListItem containing nested components

#### Step 17.2: Design Component Structure ⭕
**ConfigurationListItem containing**:
- [ ] **Read-only folder path LogItem**: Display folder path (non-interactive)
- [ ] **Read-only model details LogItem**: Display model name + metadata (non-interactive)
- [ ] **Remove button**: SimpleButtonsRow with "Remove Tracked Folder" button

#### Step 17.3: Integrate Destructive Confirmation ⭕
- [ ] Use existing `DestructiveConfirmationWrapper` + `IDestructiveConfig`
- [ ] Create destructive config for folder removal with appropriate messaging:
  ```typescript
  {
      level: 'critical',
      title: 'Remove Tracked Folder',
      message: 'Remove folder from configuration. Daemon will detect and clean up.',
      consequences: [
          'Remove from configuration file',
          'Daemon will detect the configuration change',
          'Daemon will clean up embeddings automatically',
          'All connected clients will be notified'
      ],
      confirmText: 'Remove from Config',
      cancelText: 'Keep Folder'
  }
  ```

#### Step 17.4: Implement Removal Logic ⭕
- [ ] Wire remove button to show destructive confirmation
- [ ] On confirmation: call `ConfigurationComponent.removeFolder(path)`
- [ ] Update folder list after successful removal
- [ ] Handle removal errors gracefully

#### Step 17.5: Replace LogItem Usage in AppFullscreen ⭕
- [ ] Update `AppFullscreen.tsx` to use `createManageFolderItem()` instead of LogItem
- [ ] Replace current folder display implementation (lines 184-192)
- [ ] Maintain existing folder validation and status indicators
- [ ] Preserve folder loading and refresh functionality

#### Step 17.6: Test Folder Management Flow ⭕
- [ ] Test: Folder display shows path, model, and remove button
- [ ] Test: Remove button triggers destructive confirmation
- [ ] Test: Confirmation cancellation preserves folder
- [ ] Test: Confirmation proceeds with folder removal
- [ ] Test: Folder list refreshes after removal
- [ ] Test: Error handling for removal failures

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