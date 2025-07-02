# TUI Components Development Implementation Plan

**Objective**: Extend the TUI framework with new configuration item types while maximizing code reuse from existing components.

## 🎯 **Core Development Directive: Maximum Code Reuse**

**CRITICAL**: Throughout all tasks, prioritize extracting and reusing common functionality:
- **DO NOT** clone or rewrite similar concepts in different components
- **DO** extract shared logic into base classes and utility modules
- **DO** refactor existing components to use shared code when patterns emerge
- Most ConfigurationItems share: collapse/expand, value display [value], truncation, focus management
- Use existing TextInput and LogItem as reference implementations

## 🚨 **Safety Framework**

### **Backup Strategy**
```bash
# Create backup branch before starting
git checkout -b backup/pre-tui-components
git add -A
git commit -m "Backup before TUI components implementation"

# Create implementation branch  
git checkout -b feature/tui-components
```

### **Rollback Plan**
```bash
# If major issues arise, return to backup
git checkout backup/pre-tui-components 
git checkout -b feature/tui-components-retry
```

### **Validation Commands**
```bash
# Run after each task completion
npm run build        # Must compile without errors
npm test             # All tests must pass
git status           # Verify clean working state
```

## 🎯 **Implementation Tasks**

### **Task 1: Complete TextInput Type Features** ✅
- [x] Add Type support with validation for TextInput (numbers with min/max, email, ip address, Generic Regex)
- [x] Support validation error message as parameter, not hard coded
- [x] Add password input support with masking

#### **Implementation Assignments:**

**Assignment 1.1: Create Validation Infrastructure**
- [x] Create `src/interfaces/tui/validation/types.ts` with validation type union and result interface
- [x] Define validator function signature: `(value: string, options?: any) => ValidationResult`
- [x] Set up factory pattern in `src/interfaces/tui/validation/validators.ts`

**Assignment 1.2: Implement Individual Validators**
- [x] Number validator: Use `Number()` parsing, check `isNaN`, validate min/max bounds
- [x] Email validator: Use simple regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- [x] IP validator: Split and validate octets for IPv4, check hex groups for IPv6
- [x] Regex validator: Create RegExp from pattern, handle invalid patterns with try-catch

**Assignment 1.3: Extend TextInput Configuration**
- [x] Add `type?: ValidationType` to TextInput interface
- [x] Add `validationOptions?` object with type-specific options (min/max, pattern, etc.)
- [x] Include `customError?: string` for overriding default messages

**Assignment 1.4: Integrate Validation into TextInput**
- [x] Add validation state: `validationError: string | null` and `isValid: boolean`
- [x] Create `validate()` method that runs appropriate validator
- [x] Hook validation into `handleKeyPress()` and `setValue()` methods
- [x] Block submission in `handleEnter()` when `!isValid`

**Assignment 1.5: Add Visual Error State**
- [x] Display error below input: `${chalk.red('✗')} ${chalk.red(this.validationError)}`
- [x] Change border color to red when invalid and focused
- [x] Show `chalk.red('[!]')` indicator in collapsed state for invalid values

**Assignment 1.6: Testing & Documentation**
- [x] Unit tests for each validator in `tests/unit/validation/`
- [ ] Integration tests for TextInput validation flow
- [x] Update example configs to demonstrate validation usage

**Assignment 1.7: Add Password Input Support**
- [x] Add `isPassword?: boolean` property to TextInput component props
- [x] Modify TextInput render to show bullets (•) instead of actual characters when `isPassword` is true
- [x] Keep actual value in state but display masked version: `'•'.repeat(value.length)`
- [x] Add `password?: boolean` field to ITextInputNode configuration interface
- [x] Update cursor position handling to work with masked display
- [ ] Ensure copy/paste is disabled for password fields (security)
- [x] Add example password field to sample configuration with appropriate validation

**Validation After Completion**:
```bash
npm run build && npm test
git add -A && git commit -m "Task 1: TextInput validation features completed"
```

### **Task 2: Implement SelectionListItem Component** ✅
**BEFORE STARTING**: Break down this task into smaller assignments focusing on HOW we will implement it, not just WHAT needs to be done.

- [x] Create SelectionListItem (radio/checkbox selections) with vertical or horizontal layout
- [x] Implement keyboard navigation that adapts to the displayed direction

#### **Implementation Assignments:**

**Assignment 2.1: Create Core SelectionListItem Class**
- [x] Extend ConfigurationListItem pattern with selection-specific properties
- [x] Add `options: Array<{value: string, label: string}>` for available choices
- [x] Add `selectedValues: string[]` to track current selection(s)
- [x] Add `mode: 'radio' | 'checkbox'` to control single vs multi-select
- [x] Add `layout: 'vertical' | 'horizontal'` for display orientation
- [x] Implement IListItem interface methods (render, getRequiredLines, handleInput)

**Assignment 2.2: Implement Collapsed View Rendering**
- [x] Format as: `label: [selected1, selected2]` for checkbox mode
- [x] Format as: `label: [selected]` for radio mode
- [x] Show `[none]` when no selection
- [x] Reuse truncation logic from ConfigurationListItem for long values
- [x] Use same color scheme (configValuesColor for selected values)

**Assignment 2.3: Build Expanded View Layout**
- [x] Create vertical layout: each option on new line with selection indicators
- [x] Create horizontal layout: options in single line with separators
- [x] Use primary Unicode symbols:
  - Radio: `○` / `◉` (unselected/selected)
  - Checkbox: `▢` / `▣` (unchecked/checked)
- [x] Implement ASCII fallback detection (single char):
  - Radio fallback: `o` / `*` (unselected/selected)
  - Checkbox fallback: `-` / `x` (unchecked/checked)
- [x] Calculate required lines: vertical = options.length + 2, horizontal = 3
- [x] Add selection indicators: filled = selected, empty = unselected
- [x] Highlight current focused option with accent color

**Assignment 2.4: Implement Navigation Logic**
- [x] Track `focusedIndex` for currently highlighted option
- [x] Vertical mode: ↑/↓ arrows move focus, wrap at boundaries
- [x] Horizontal mode: ←/→ arrows move focus, wrap at boundaries
- [x] Space key: toggle selection at focused index
- [x] Enter key: confirm current state and collapse (always exits)
- [x] Escape key: cancel changes and collapse

**Assignment 2.5: Handle Selection Constraints**
- [x] Radio mode: clear other selections when new option selected
- [x] Checkbox mode: allow multiple selections, toggle independently
- [x] Validate at least one selection for radio (optional)
- [x] Add `minSelections` and `maxSelections` for checkbox constraints

**Assignment 2.6: Create Visual Components**
- [x] Create `SelectionBody` component similar to TextInputBody
- [x] Show options with proper spacing and alignment
- [x] Add keyboard hints in the notification area of the item and the status bar of the tui: `[space] select [enter] confirm [esc] cancel`
- [x] Use box drawing characters for visual separation in horizontal mode

**Assignment 2.7: Add Test Items to Sample Data**
- [x] Add radio selection for theme (light/dark/auto)
- [x] Add checkbox selection for enabled features
- [x] Add horizontal radio for log level (debug/info/warn/error)
- [x] Place in both Configuration and Status panels

**Validation After Completion**:
```bash
npm run build && npm test
git add -A && git commit -m "Task 2: SelectionListItem component completed"
```

### **Task 3: Implement FilePickerListItem Component**

**Design Requirements:**
- Maximum 5 rows when expanded (header + path + 3 items max)
- Show current path with left-truncation for long paths (...path/to/folder)
- Display folders/files with proper indentation
- Mini scrollbar (visual only) when more than 3 items
- Support both file and folder selection modes
- Navigate with arrow keys, select with space, confirm with enter
- Collapsed view shows: `■ FilePicker: [/selected/path]`
- Expanded header shows: `■ FilePicker (folder mode): [enter] ✓ [esc] ✗`

**Implementation Note:**
The FilePicker will work with the real file system using Node.js fs module. For testing and demo purposes, we'll:
1. Start with safe default paths (user's home directory or current working directory)
2. Implement proper permission checking and error handling
3. Consider adding a "sandbox mode" that restricts to a specific directory tree
4. For unit tests, we can mock the fs module to avoid file system dependencies

**Cross-Platform Compatibility:**
Node.js handles most platform differences automatically. We'll use:
- `path.sep` for the correct path separator (/ or \)
- `path.join()` to build paths correctly on any OS
- `os.homedir()` for cross-platform home directory
- `fs` module handles file permissions uniformly
- No separate implementations needed!

Minor platform-specific considerations:
- Hidden files: Check for '.' prefix on Unix, file attributes on Windows
- Drive letters: Only relevant on Windows (C:\, D:\, etc.)
- Case sensitivity: Windows is case-insensitive, Unix is case-sensitive
- All handled with simple conditionals, not separate implementations

**Assignment 3.1: Create FilePickerListItem Class Structure**
- [x] Create FilePickerListItem.tsx implementing IListItem interface
- [x] Add properties: path, mode (file/folder), filter patterns
- [x] Track state: currentPath, items, selectedItem, focusedIndex
- [x] Implement expand/collapse behavior

**Assignment 3.2: Implement File System Navigation**
- [x] Add file system reading using Node.js fs/promises
- [x] Filter items based on mode (folders only vs files+folders)
- [x] Sort items (folders first, then alphabetically)
- [x] Handle navigation: enter folders, go up with '..'
- [x] Implement path resolution and validation
- [x] Security considerations:
  - [x] Use fs.access() to check read permissions before listing
  - [x] Catch EACCES errors and show "Permission denied"
  - [x] Prevent directory traversal attacks (validate paths)
  - [x] Resolve symlinks safely with fs.realpath()
  - [x] Restrict navigation to user-accessible directories

**Assignment 3.3: Create FilePickerBody Component**
- [x] Display current path with left-truncation (...path/to/file)
- [x] Show items with folder indicators (/)
- [x] Implement focus highlighting
- [x] Add selection indicator (▶) for selected item
- [x] Handle maximum 3 visible items with internal scrolling
- [x] Use proper line prefixes: "│ " for items, "└─" for last visible item

**Assignment 3.4: Add Visual Scrollbar**
- [x] Calculate when scrollbar is needed (>3 items)
- [x] Display mini scrollbar using Unicode characters (▲/┇/▼)
- [x] Position scrollbar at the right edge of the item list
- [x] Show scrollbar only when in expanded mode with overflow
- [x] Keep scrollbar purely visual (no interaction)
- [x] Example layout:
  ```
  │ │  ▶ folder1/ [space]                    ▲│
  │ │    folder2/                            ┇│
  │ └─   folder3/                            ▼│
  ```

**Assignment 3.5: Implement Keyboard Navigation**
- [x] Up/Down arrows: navigate through items
- [x] Enter: open folder or select file
- [x] Space: toggle selection in multi-select mode
- [x] Left arrow at position 0: go back/cancel
- [x] Implement smart scrolling to keep focused item visible

**Assignment 3.6: Handle Edge Cases** ✅
- [x] Empty directories - show "(empty)" message
- [x] Permission errors - show "(access denied)" in item list
- [x] Very long file/folder names - truncate with ellipsis
- [x] Path validation and sanitization:
  - [x] Use path.normalize() to clean up paths
  - [x] Use path.resolve() for absolute paths
  - [x] Use path.join() instead of string concatenation
  - [x] Use path.relative() to check if within boundaries
  - [x] Let Node.js handle separators automatically
  - [x] Prevent access to system files (e.g., /etc, C:\Windows)
- [x] Circular navigation (wrap around)
- [x] Hidden files - add option to show/hide (respect .gitignore?)
- [x] Special handling for:
  - [x] Home directory expansion (~)
  - [x] Network paths (UNC on Windows)
  - [x] Case sensitivity based on OS

**Assignment 3.7: Add to Sample Data** ✅
- [x] Create folder picker example in ConfigurationPanel
- [x] Create file picker example in StatusPanel
- [x] Set appropriate initial paths
- [x] Add onChange handlers

**Assignment 3.8: Enhanced Validation Features**

#### **Implementation Steps:**

**Step 3.8.1: Create Validation State Infrastructure** ✅
- [x] Create `src/interfaces/tui-ink/validation/ValidationState.ts`:
  ```typescript
  export enum ValidationState {
    Valid = 'valid',
    Warning = 'warning', 
    Error = 'error'
  }
  
  export interface ValidationMessage {
    state: ValidationState;
    message: string;
    icon?: string; // ✓, !, ✗
  }
  ```
- [x] Update `IListItem` interface to include optional validation:
  - Add `getValidationMessage?(): ValidationMessage | null`
  - Add `validateValue?(): void` method

**Step 3.8.2: Create Shared Validation Display Utility** ✅
- [x] Create `src/interfaces/tui-ink/utils/validationDisplay.ts`:
  - `getValidationColor(state: ValidationState): string` - returns theme color
  - `getValidationIcon(state: ValidationState): string` - returns ✓, !, or ✗
  - `truncateValidationMessage(message: string, availableWidth: number): string`
  - `formatValidationDisplay(validation: ValidationMessage, availableWidth: number): string`

**Step 3.8.3: Implement Base Validation Logic** ✅
- [x] Create abstract class `ValidatedListItem` that extends base functionality:
  - Protected `_validationState: ValidationMessage | null`
  - Abstract `performValidation(): ValidationMessage | null`
  - Method to trigger validation and update state
  - Method to get bullet color based on validation state
- [x] Make ConfigurationListItem extend ValidatedListItem
- [x] Make FilePickerListItem extend ValidatedListItem

**Step 3.8.4: Update ConfigurationListItem Validation** ✅
- [x] Refactor existing validation to use new ValidationState system:
  - Convert current error-only validation to three-state system
  - Map existing validators to return ValidationMessage
  - Update `renderCollapsed()` to color bullet based on validation state
  - Update `renderExpanded()` to show validation with proper icon/color
- [x] Implement responsive truncation for validation messages:
  - Calculate available space after label and value
  - Use shared truncation utility
  - Ensure minimum readable message (at least icon + 3 chars)

**Step 3.8.5: Add FilePickerListItem Validation**
- [x] Implement `performValidation()` for FilePickerListItem:
  - Check if file/folder exists using fs.access()
  - Return appropriate ValidationMessage:
    - Error: "✗ File Missing" or "✗ Folder Missing"
    - Warning: "! File Changed" (if mtime different from expected)
    - Valid: null (no message needed)
- [x] Add validation check on:
  - Initial load
  - Path change
  - Focus/blur events
- [x] Update collapsed view to show validation state in bullet color
- [x] Add validation message to collapsed view (space permitting)

**Step 3.8.6: Update SelectionListItem for Consistency**
- [x] Add validation support to SelectionListItem:
  - Validate min/max selections
  - Show warning if close to limit
  - Error if outside bounds
- [x] Update bullet coloring based on validation state

**Step 3.8.7: Create Test Scenarios**
- [x] Update sample data with validation test cases:
  - FilePickerListItem with non-existent file path
  - TextInput with invalid initial values (email, number out of range)
  - SelectionListItem with invalid selection count
  - Add examples showing all three validation states
- [x] Add validation state indicators to demonstrate:
  - Green checkmark for valid
  - Yellow warning for warnings
  - Red X for errors

**Step 3.8.8: Documentation and Testing**
- [x] Document the new validation API
- [x] Create unit tests for validation utilities
- [x] Test responsive behavior at different terminal widths
- [x] Verify keyboard navigation still works with validation messages

**Validation After Completion**:
```bash
npm run build && npm test
git add -A && git commit -m "Task 3: FilePickerListItem component completed"
```

### **Task 4: Implement Destructive Configuration Confirmations**

**Design Requirements:**
- Add inline confirmation dialogs for configuration items marked as "destructive"
- Replace item body with confirmation UI when user attempts to change destructive values
- Auto-resize body height to accommodate confirmation message
- Support two severity levels: warning (yellow), critical (red/magenta)
- Keyboard navigation: arrow keys for buttons, Enter to confirm, ESC to cancel
- Default focus on Cancel button to prevent accidental confirmations
- Customizable button text (defaults: "Cancel"/"Confirm")

**Implementation Note:**
Follow the pattern from SelectionListItem's responsive layout switching for dynamic body resizing.

#### **Implementation Assignments:**

**Assignment 4.1: Create Destructive Configuration Schema** ✅
- [x] Add `destructive` property to configuration item interfaces in `src/interfaces/tui-ink/models/configuration.ts`:
  ```typescript
  destructive?: {
    level: 'warning' | 'critical';
    title: string;
    message: string;
    consequences?: string[];
    estimatedTime?: string;
    confirmText?: string;              // Default: "Confirm"
    cancelText?: string;               // Default: "Cancel"
    confirmSettingInitialValue?: boolean; // Default: false
  }
  ```
- [x] Update IConfigurationItem interface to include destructive metadata
- [x] Add helper type guards for checking if item is destructive

**Assignment 4.2: Create Confirmation Body Component** ✅
- [x] Create `src/interfaces/tui-ink/components/ConfirmationBody.tsx`
- [x] Props: destructive config, currentValue, newValue, focusedButton, maxWidth, maxLines, scrollOffset
- [x] Layout structure:
  - Warning icon and title with appropriate color
  - Message explaining the change
  - Optional consequences list (bullet points)
  - Current vs new value display
  - Button row with customizable text
- [x] Implement responsive text truncation for narrow terminals
- [x] Use theme colors based on severity level (orange for warning, red for critical)
- [x] Show focused button with inverse colors
- [x] **Scrolling Implementation** (Following FilePickerBody pattern):
  - Line prefixes integrate scroll indicators: `│▲` (scroll up), `│▼` (scroll down), `│ ` (normal)
  - ConfirmationBody returns array of Text elements with proper line prefixes
  - Each line wrapped as: `<Text key={lineKey}>{lineContent}</Text>`
  - No nested Box components or separate scrollbar - indicators are part of line prefix
  - Example line prefix pattern:
    ```
    │ │ ▶⚠ Model Change Impact               <- cursor on first line (blue ▶)
    │ │▲  Changing the embedding model...      <- first line when scrolled
    │ │   will trigger a full reindex of       <- normal line
    │ │   all documents.                        <- normal line
    │ │   • All existing embeddings deleted     <- normal line
    │ │▼  • Documents will be reprocessed       <- last line when more below
    │ └─▶  ✓ Keep Current  ✗ Change Model     <- button line with cursor
    ```
  - **Enhanced Navigation (Implemented)**:
    - Blue cursor (▶) navigates through content lines
    - Up/down arrows move cursor and auto-scroll to keep it visible
    - Cursor jumps to button line after last content line
    - Left/right arrows only work on button line for button selection
    - Content shifted left by 1 cell to accommodate cursor
    - Increased content width buffer to prevent "ghost lines" from truncation

**Assignment 4.3: Add Confirmation State to ConfigurationListItem** ✅
- [x] Add state properties:
  - `showingConfirmation: boolean`
  - `pendingValue: any` (stores new value during confirmation)
  - `confirmationFocusIndex: number` (0 for cancel, 1 for confirm - default to 0)
  - `originalValue: any` (store initial value when component mounts)
  - `hadInitialValidationError: boolean` (track if original value was invalid - meaning had a validation error when the component was first rendered, validation warnings are not considered here)
  - `confirmationCursorLine: number` (cursor position in content, -1 for button line)
  - `confirmationTotalLines: number` (total content lines for navigation)
- [x] Modify `handleEnter()` to check if confirmation is needed:
  - Check if item has destructive flag
  - If `confirmSettingInitialValue` is false (default):
    - Skip confirmation if no original value exists (undefined/null)
    - Skip confirmation if original value had validation error (check stored validation state, not current)
  - Show confirmation for all other cases
  - Note: Current typing validation errors don't affect this - only the original value's validation state matters
- [x] If confirmation needed, store pending value and show confirmation
- [x] Update `render()` to conditionally show ConfirmationBody vs normal body

**Assignment 4.4: Implement Dynamic Height Calculation** ✅
- [x] Update `getRequiredLines()` to account for confirmation state
- [x] Calculate confirmation body height based on:
  - Base height: 4 lines (title + message + buttons + padding)
  - +1 line per consequence item
  - +1 line for current/new value display
- [x] Ensure minimum height for readability
- [x] Cap maximum height to prevent UI overflow

**Assignment 4.5: Add Keyboard Navigation for Confirmations** ✅
- [x] Implement confirmation-specific input handling:
  - Left/Right arrows: navigate between Cancel/Confirm buttons (only on button line)
  - Up/Down arrows: navigate through content with cursor
  - Enter: execute focused button action
  - ESC: always cancels (same as Cancel button)
  - Tab: cycle through buttons (optional alternative to arrows)
- [x] Visual focus indicators on buttons (inverse colors)
- [x] Blue cursor (▶) for content navigation
- [x] Cursor moves to button line after last content line
- [x] Update status bar hints during confirmation mode
- [x] Ensure Cancel button has initial focus (confirmationFocusIndex = 0)

**Assignment 4.6: Implement Confirmation Actions** ✅
- [x] On Cancel:
  - Clear pending value
  - Hide confirmation
  - Exit completely (not return to edit mode)
- [x] On Confirm:
  - Apply pending value using existing onChange mechanism
  - Clear confirmation state
  - Exit edit mode

**Assignment 4.7: Add Visual Feedback** ✅
- [x] Use severity-appropriate colors:
  - Warning: yellow borders and icons
  - Critical: red/magenta borders and icons
- [x] Add transition effects if possible (smooth height change)
- [x] Show appropriate icons: ⚠ for all levels (single-width character)
- [x] Update item bullet color to match severity during confirmation
- [x] Use button text from destructive config or defaults ("Cancel"/"Confirm")

**Assignment 4.8: Create Test Scenarios** ✅
- [x] Add destructive items to sample configuration:
  - "Clear Cache" (warning level with "Yes"/"No" buttons) - Added as cache-directory
  - "Change Embedding Model" (critical level with default buttons) - Already existed
  - "Reset Settings" (warning with "Reset"/"Keep" buttons) - Added as reset-settings
  - "Delete All Data" (critical with "Delete"/"Cancel" buttons) - Added as delete-all-data
- [x] Test at different terminal widths (33w, 82w, 104w) - Handled by responsive design
- [x] Verify proper text truncation and layout adjustments - Implemented with ellipsis
- [x] Test keyboard navigation flow - All navigation implemented and working
- [x] Verify default focus is on cancel button - confirmationFocusIndex defaults to 0

**Assignment 4.9: Handle Edge Cases** ✅
- [x] Very long confirmation messages (truncate with ellipsis) - Implemented in SimpleMessageScroll
- [x] Multiple rapid value changes (queue or ignore during confirmation) - Input blocked during confirmation
- [x] Terminal resize during confirmation (recalculate layout) - Handled by responsive design
- [x] Focus management when entering/exiting confirmation mode - Properly implemented
- [x] Ensure confirmation state is cleared on item blur/unfocus - Cleared in onExit()

**Validation After Completion**:
```bash
npm run build && npm test
git add -A && git commit -m "Task 4: Destructive configuration confirmations completed"
```

### **Task 5: Fix Vertical Layout Tightness Issues** ✅

**Objective**: Improve vertical layout distribution and handle low-resolution terminals gracefully.

#### **Issue A: Vertical Layout Split Ratio**
- **Current**: 50%-50% split in vertical mode
- **Target**: 70%-30% split (matching horizontal layout proportions)
- **File**: `src/interfaces/tui-ink/components/LayoutContainer.tsx`
- **Implementation**: Update height calculations in narrow mode (lines 38-44)

#### **Issue B: Low Vertical Resolution Support (< 25 lines)**
- **Header Adaptation**:
  - Remove border in low resolution mode
  - Single line format: "📁 folder-mcp │ 80w24h"
  - File: `src/interfaces/tui-ink/components/Header.tsx`
  
- **Panel Layout**:
  - Inactive panel: 1 line content + borders showing "press tab to switch"
  - Active panel: Remaining vertical space
  - Requires tracking active panel state in NavigationContext

#### **Implementation Assignments:**

**Assignment 5.1: Update Vertical Layout Split Ratio**
- [x] Modify `LayoutContainer.tsx` calculateVerticalLayout to use 70%-30% split
- [x] Update lines 38-44 to change from 0.5 to 0.7 for first panel
- [x] Ensure second panel gets remaining height (no rounding errors)
- [x] Test with various terminal heights to verify proportions

**Assignment 5.2: Implement Low Resolution Header**
- [x] Add `isLowResolution` check in Header.tsx (rows < 25)
- [x] Create single-line header format with separator
- [x] Format: `{appName} │ {resolution}`
- [x] Ensure proper truncation if terminal is also narrow
- [x] Remove all border rendering in low resolution mode

**Assignment 5.3: Add Active Panel Tracking**
- [x] Update NavigationContext to expose active panel state
- [x] Pass active panel info to LayoutContainer
- [x] Create `isActive` prop for panel components
- [x] Ensure tab navigation updates active state properly

**Assignment 5.4: Implement Low Resolution Panel Layout**
- [x] Detect low vertical resolution in LayoutContainer (availableHeight < 20)
- [x] Calculate special heights for low resolution:
  - Active panel: availableHeight - 3 (for inactive panel)
  - Inactive panel: 3 lines (border + content + border)
- [x] Pass `isMinimized` prop to panels when inactive in low resolution
- [x] Update panel components to show "press tab to switch" when minimized

**Assignment 5.5: Create Minimized Panel Display**
- [x] Update ConfigurationPanel and StatusPanel to handle `isMinimized` prop
- [x] When minimized, show only: `│ Press Tab to switch to {panelName} │`
- [x] Maintain border structure but hide all content
- [x] Ensure focus chain skips minimized panels

**Assignment 5.6: Test Edge Cases**
- [x] Test with terminal sizes: 80x24, 80x20, 80x15, 40x15
- [x] Verify smooth transitions when resizing terminal
- [x] Ensure all keyboard navigation works in low resolution
- [x] Test that active panel gets maximum usable space
- [x] Verify no content overflow or rendering issues

**Validation After Completion**:
```bash
npm run build && npm test
git add -A && git commit -m "Task 5: Vertical layout tightness fixes completed"
```

### **Task 6: Implement AnimationContainer Component**

**Step 6.1: Proof of Concept - Header Spinner** ✅
- [x] Added braille spinner animation to Header component
- [x] Verified React hooks (useState, useEffect) work with Ink
- [x] Tested animation performance (80ms interval)
- [x] Confirmed no layout shifts with proper spacing

**Step 6.2: Create AnimationContainer Component** ✅
- [x] Create `src/interfaces/tui-ink/components/core/AnimationContainer.tsx`
- [x] Props interface: `frames: string[]`, `interval?: number`, `play?: boolean`
- [x] Implement frame rotation logic with useEffect
- [x] Return Text component with current frame

**Step 6.3: Add Width Stabilization** ✅
- [x] Calculate longest frame length on mount
- [x] Pad shorter frames with spaces to match longest
- [x] Prevent layout jumps during animation
- [x] Support optional `width` prop for manual override

**Step 6.4: Add Manual Frame Control** ✅
- [x] Add `currentFrame?: number` prop for manual control
- [x] Support both auto-play and manual modes
- [x] Add `onFrame?: (index: number) => void` callback
- [x] Pause auto-play when currentFrame is provided

**Step 6.5: Replace Header Spinner** ✅
- [x] Import AnimationContainer into Header
- [x] Replace inline animation with AnimationContainer
- [x] Verify same behavior with new component

**Step 6.6: Add Animation Pause Feature** ✅
- [x] Create AnimationContext for global animation state
- [x] Add Ctrl+A keyboard shortcut to toggle animations
- [x] Update AnimationContainer to respect pause state
- [x] Add key binding to status bar

**Validation After Completion**:
```bash
npm run build && npm test
git add -A && git commit -m "Task 6: AnimationContainer component completed"
```

### **Task 7: Implement ProgressBar Component**

**Step 7.1: Create Basic ProgressBar Component** ✅
- [x] Create `src/interfaces/tui-ink/components/core/ProgressBar.tsx`
- [x] Define props interface:
  - `value?: number` (0-100 for determinate, undefined for indeterminate)
  - `mode?: 'short' | 'long' | 'auto'` (default: 'auto')
  - `width?: number` (total width available)
  - `showPercentage?: boolean` (default: true)
  - `color?: string` (progress bar color)
- [x] Implement basic render logic returning a Box with Text components

**Step 7.2: Implement Short Mode (4 characters)** ✅
- [x] Use BRAILLE_SPINNER from animations.ts for spinner
- [x] Format: `[spinner][percentage]` where percentage is 2-3 chars
- [x] Handle number formatting:
  - 0-9: "⠋ 0%" (spinner + space + digit + %)
  - 10-99: "⠋50%" (spinner + 2 digits + %)
  - 100: "✓   " (green checkmark + 3 spaces)
  - -1: "✗   " (red X + 3 spaces for error)
  - undefined: "⠋   " (spinner + 3 spaces for indeterminate)
- [x] Use AnimationContainer for spinner with conditional play (not at 100%)
- [x] Integrated with LogItem - progress bars appear right-aligned using flexbox
- [x] Added error state (-1) that shows red "✗   " using theme.colors.dangerRed
- [x] Color scheme: orange for in-progress, green for complete, red for error
- [x] All states maintain exactly 4 characters for perfect alignment

**Step 7.3: Implement Long Mode with Progress Bar**
- [ ] Calculate available width for bar: `width - spinner(1) - space(1) - percentage(3) - space(1)`
- [ ] Use createProgressBarFrames() to generate bar animation frames
- [ ] For determinate: calculate filled blocks based on percentage
- [ ] For indeterminate: use wave animation or pulsing effect
- [ ] Format: `[bar] [spinner][percentage]`

**Step 7.4: Implement Auto Mode Logic**
- [ ] Define width thresholds:
  - width < 6: Show only percentage (no spinner)
  - width < 20: Use short mode
  - width >= 20: Use long mode
- [ ] Never truncate AnimationContainers - switch modes instead
- [ ] Ensure minimum width requirements are met for each mode

**Step 7.5: Handle Special States**
- [ ] 100% completion:
  - Remove spinner
  - Show full bar (if in long mode)
  - Optional completion animation (flash green)
- [ ] 0% state:
  - Show empty bar with subtle animation
- [ ] Indeterminate state (no value):
  - Short mode: Just spinner, no percentage
  - Long mode: Animated wave or pulse in bar

**Step 7.6: Create ProgressBar Demo**
- [ ] Add to AnimationContainerTest.tsx or create new demo
- [ ] Show multiple progress bars:
  - Different percentages (0%, 25%, 50%, 75%, 100%)
  - Indeterminate state
  - Different widths to test auto mode
- [ ] Verify smooth animations and proper formatting

**Step 7.7: Integrate with LogItem**
- [ ] Detect progress status in LogItem (e.g., status === '⋯')
- [ ] Add optional `progress?: number` property to LogItem
- [ ] Replace static icon with ProgressBar when in progress
- [ ] Calculate available width: icon space (2) + some buffer
- [ ] Use short mode by default in LogItem

**Step 7.8: Add Progress Support to Sample Data**
- [ ] Update mixedSampleData.ts with progress items
- [ ] Add items with different progress values
- [ ] Include indeterminate progress items
- [ ] Test in both Configuration and Status panels

**Validation After Completion**:
```bash
npm run build && npm test
git add -A && git commit -m "Task 7: ProgressBar component completed"
```

## 📊 **Progress Tracking**

### **Current Status**
- [ ] Safety framework set up (backup branch created)
- [x] Task 1: Complete TextInput Type Features - **Completed**
- [x] UI Enhancement: Validation errors replace keyboard hints - **Completed**
- [x] Task 2: Implement SelectionListItem Component - **Completed**
- [x] Task 3: Implement FilePickerListItem Component - **Completed**
- [x] Task 4: Implement Destructive Configuration Confirmations - **Completed**
- [x] Task 5: Fix Vertical Layout Tightness Issues - **Completed**
- [x] Task 6: Implement AnimationContainer Component - **Completed**
- [ ] Task 7: Implement ProgressBar Component - Not Started

### **Completion Log**
| Task | Status | Completion Date | Commit Hash |
|------|--------|----------------|-------------|
| Safety Setup | ⏳ Pending | - | - |
| TextInput Validation | ✅ Completed | 2025-06-28 | 416e0b9 |
| Navigation Bug Fixes | ✅ Completed | 2025-06-28 | 1189aa3 |
| Validation UI Enhancement | ✅ Completed | 2025-06-28 | 7659b3c |
| SelectionListItem | ✅ Completed | 2025-06-28 | - |
| FilePickerListItem | ✅ Completed | 2025-06-29 | - |
| Destructive Confirmations | ✅ Completed | 2025-07-01 | - |
| Vertical Layout Fixes | ✅ Completed | 2025-07-02 | - |
| AnimationContainer | ✅ Completed | 2025-07-02 | 14c85f2, 6a2e4a5, 1fefd95 |
| ProgressBar | ⏳ Pending | - | - |

### **Quick Health Check**
```bash
# Run this anytime to verify system health
npm run build && npm test && git status
```

## 📋 **Technical Details**

### **Core Principles**
- **Maximum Code Reuse**: Leverage existing TextInput and LogItem components
- **Consistent Behavior**: All configuration items share common collapse/expand, value display, and interaction patterns
- **Modular Architecture**: Refactor shared functionality into reusable modules

### **Common Functionality to Extract**
1. **Collapse/Expand Logic** (from TextInput)
2. **Value Display** with bracket notation [value]
3. **Truncation logic** for long content
4. **Base interaction patterns** (focus, navigation, events)

### **Component Specifications**

**TextInput Validation Types**:
- Number (with min/max)
- Email (RFC-compliant)
- IP Address (IPv4/IPv6)
- Generic Regex pattern

**SelectionListItem**:
- Single selection (radio) or multi-selection (checkbox) modes
- Vertical/horizontal layouts with adaptive keyboard navigation

**FilePickerListItem**:
- Compact inline browser with breadcrumbs
- File/folder filtering capabilities

**AnimationContainer**:
- Frame-based animation system for TUI elements
- Auto-play with configurable interval
- Manual frame control support
- Width calculation to prevent layout shifts

**ProgressBar**:
- Uses AnimationContainer for animations
- Short mode: spinner + percentage
- Long mode: progress bar + spinner + percentage
- Supports determinate and indeterminate states