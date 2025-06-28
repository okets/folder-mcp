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

### **Task 1: Complete TextInput Type Features**
- [ ] Add Type support with validation for TextInput (numbers with min/max, email, ip address, Generic Regex)
- [ ] Support validation error message as parameter, not hard coded

#### **Implementation Assignments:**

**Assignment 1.1: Create Validation Infrastructure**
- [ ] Create `src/interfaces/tui/validation/types.ts` with validation type union and result interface
- [ ] Define validator function signature: `(value: string, options?: any) => ValidationResult`
- [ ] Set up factory pattern in `src/interfaces/tui/validation/validators.ts`

**Assignment 1.2: Implement Individual Validators**
- [ ] Number validator: Use `Number()` parsing, check `isNaN`, validate min/max bounds
- [ ] Email validator: Use simple regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- [ ] IP validator: Split and validate octets for IPv4, check hex groups for IPv6
- [ ] Regex validator: Create RegExp from pattern, handle invalid patterns with try-catch

**Assignment 1.3: Extend TextInput Configuration**
- [ ] Add `type?: ValidationType` to TextInput interface
- [ ] Add `validationOptions?` object with type-specific options (min/max, pattern, etc.)
- [ ] Include `customError?: string` for overriding default messages

**Assignment 1.4: Integrate Validation into TextInput**
- [ ] Add validation state: `validationError: string | null` and `isValid: boolean`
- [ ] Create `validate()` method that runs appropriate validator
- [ ] Hook validation into `handleKeyPress()` and `setValue()` methods
- [ ] Block submission in `handleEnter()` when `!isValid`

**Assignment 1.5: Add Visual Error State**
- [ ] Display error below input: `${chalk.red('✗')} ${chalk.red(this.validationError)}`
- [ ] Change border color to red when invalid and focused
- [ ] Show `chalk.red('[!]')` indicator in collapsed state for invalid values

**Assignment 1.6: Testing & Documentation**
- [ ] Unit tests for each validator in `tests/unit/validation/`
- [ ] Integration tests for TextInput validation flow
- [ ] Update example configs to demonstrate validation usage

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
- [ ] Task 1: Complete TextInput Type Features - Not Started
- [ ] Task 2: Implement SelectionListItem Component - Not Started  
- [ ] Task 3: Implement FilePickerListItem Component - Not Started
- [ ] Task 4: Implement ProgressItem Component - Not Started

### **Completion Log**
| Task | Status | Completion Date | Commit Hash |
|------|--------|----------------|-------------|
| Safety Setup | ⏳ Pending | - | - |
| TextInput Validation | ⏳ Pending | - | - |
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