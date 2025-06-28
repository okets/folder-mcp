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
[BEFORE STARTING: Break down this task into smaller assignments focusing on HOW to implement, not just WHAT to do. Update this task, here in this document, with implementation steps when implementation begins.]

- [ ] Create FilePickerListItem for File/Folder selection
- [ ] Research compact and responsive CLI interface options for file and folder selection

**Validation After Completion**:
```bash
npm run build && npm test
git add -A && git commit -m "Task 3: FilePickerListItem component completed"
```

### **Task 4: Implement ProgressItem Component**
[BEFORE STARTING: Break down this task into smaller assignments focusing on HOW to implement, not just WHAT to do. Update this task, here in this document, with implementation steps when implementation begins.]

- [ ] Create ProgressItem that borrows most functionality from LogItem (read-only List Item)

**Validation After Completion**:
```bash
npm run build && npm test
git add -A && git commit -m "Task 4: ProgressItem component completed"
```

## 📊 **Progress Tracking**

### **Current Status**
- [ ] Safety framework set up (backup branch created)
- [x] Task 1: Complete TextInput Type Features - **Completed**
- [x] UI Enhancement: Validation errors replace keyboard hints - **Completed**
- [x] Task 2: Implement SelectionListItem Component - **Completed**
- [ ] Task 3: Implement FilePickerListItem Component - Not Started
- [ ] Task 4: Implement ProgressItem Component - Not Started

### **Completion Log**
| Task | Status | Completion Date | Commit Hash |
|------|--------|----------------|-------------|
| Safety Setup | ⏳ Pending | - | - |
| TextInput Validation | ✅ Completed | 2025-06-28 | 416e0b9 |
| Navigation Bug Fixes | ✅ Completed | 2025-06-28 | 1189aa3 |
| Validation UI Enhancement | ✅ Completed | 2025-06-28 | 7659b3c |
| SelectionListItem | ✅ Completed | 2025-06-28 | - |
| FilePickerListItem | ⏳ Pending | - | - |
| ProgressItem | ⏳ Pending | - | - |

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

**ProgressItem**:
- Extends LogItem as read-only display
- Progress bar visualization with percentage display