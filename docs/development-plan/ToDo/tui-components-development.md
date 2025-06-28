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

### **Task 2: Implement SelectionListItem Component**
- [ ] Create SelectionListItem (radio/checkbox selections) with vertical or horizontal layout
- [ ] Implement keyboard navigation that adapts to the displayed direction

**Validation After Completion**:
```bash
npm run build && npm test
git add -A && git commit -m "Task 2: SelectionListItem component completed"
```

### **Task 3: Implement FilePickerListItem Component**
- [ ] Create FilePickerListItem for File/Folder selection
- [ ] Research compact and responsive CLI interface options for file and folder selection

**Validation After Completion**:
```bash
npm run build && npm test
git add -A && git commit -m "Task 3: FilePickerListItem component completed"
```

### **Task 4: Implement ProgressItem Component**
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
- [ ] Task 2: Implement SelectionListItem Component - Not Started  
- [ ] Task 3: Implement FilePickerListItem Component - Not Started
- [ ] Task 4: Implement ProgressItem Component - Not Started

### **Completion Log**
| Task | Status | Completion Date | Commit Hash |
|------|--------|----------------|-------------|
| Safety Setup | ⏳ Pending | - | - |
| TextInput Validation | ✅ Completed | 2025-06-28 | - |
| SelectionListItem | ⏳ Pending | - | - |
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