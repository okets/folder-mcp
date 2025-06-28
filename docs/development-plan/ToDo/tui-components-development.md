# TUI Components Development Implementation Plan

**Objective**: Extend the TUI framework with new configuration item types while maximizing code reuse from existing components.

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

**Validation After Completion**:
```bash
npm run build && npm test
git add -A && git commit -m "Task 1: TextInput validation features completed"
```

### **Task 2: Extract Common Functionality**
- [ ] Use common functionality as much as possible
- [ ] Extract shared truncation, expand/collapse, and value display logic from existing TextInput and LogItem components
- [ ] Create base classes for maximum code reuse

**Validation After Completion**:
```bash
npm run build && npm test
git add -A && git commit -m "Task 2: Common functionality extraction completed"
```

### **Task 3: Implement SelectionListItem Component**
- [ ] Create SelectionListItem (radio/checkbox selections) with vertical or horizontal layout
- [ ] Implement keyboard navigation that adapts to the displayed direction

**Validation After Completion**:
```bash
npm run build && npm test
git add -A && git commit -m "Task 3: SelectionListItem component completed"
```

### **Task 4: Implement FilePickerListItem Component**
- [ ] Create FilePickerListItem for File/Folder selection
- [ ] Research compact and responsive CLI interface options for file and folder selection

**Validation After Completion**:
```bash
npm run build && npm test
git add -A && git commit -m "Task 4: FilePickerListItem component completed"
```

### **Task 5: Implement ProgressItem Component**
- [ ] Create ProgressItem that borrows most functionality from LogItem (read-only List Item)

**Validation After Completion**:
```bash
npm run build && npm test
git add -A && git commit -m "Task 5: ProgressItem component completed"
```

## 📊 **Progress Tracking**

### **Current Status**
- [ ] Safety framework set up (backup branch created)
- [ ] Task 1: Complete TextInput Type Features - Not Started
- [ ] Task 2: Extract Common Functionality - Not Started  
- [ ] Task 3: Implement SelectionListItem Component - Not Started
- [ ] Task 4: Implement FilePickerListItem Component - Not Started
- [ ] Task 5: Implement ProgressItem Component - Not Started

### **Completion Log**
| Task | Status | Completion Date | Commit Hash |
|------|--------|----------------|-------------|
| Safety Setup | ⏳ Pending | - | - |
| TextInput Validation | ⏳ Pending | - | - |
| Common Functionality | ⏳ Pending | - | - |
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