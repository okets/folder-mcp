# Validation Test Cases Example

This document shows what the validation test cases would look like in the TUI.

## StatusPanel Examples

```
╭─ Status ─────────────────────────────────────────────────────────────╮
│ ○ LogItem (existing): ✓                                              │
│ · TextInput (number): [8080]                                         │
│ · TextInput (email): [user@test.com]                                 │
│ · TextInput (password): [••••••••••]                                 │
│ ■ SelectionList (log level): [info]                                  │
│ ■ SelectionList (decision): [approve]                                │
│ 📂 Select File: [/Users/hanan/Projects/folder-mcp]                   │
│ · Invalid Email: [not-an-email] ✗                                    │
│ · Port (out of range): [99999] ✗                                    │
│ · Invalid IP: [192.168.1.999] ✗                                     │
│ ○ ProgressItem (TODO): ○                                             │
╰──────────────────────────────────────────────────────────────────────╯
```

## ConfigurationPanel Examples

```
╭─ Configuration ──────────────────────────────────────────────────────╮
│ 📁 Project Folder: [/Users/hanan]                                    │
│ 📄 Select Config File: [/Users/hanan]                                │
│ 📄 Missing File: [/Users/hanan/non-existent-file.txt] ✗             │
│ ○ LogItem (existing component): ℹ                                    │
│ · TextInput (no validation): [Sample text value]                     │
│ · TextInput (number: 1-100): [50]                                    │
│ · TextInput (email): [admin@example.com]                             │
│ · TextInput (IPv4): [192.168.1.1]                                   │
│ · TextInput (regex: [A-Z]{3}): [ABC]                                │
│ · TextInput (password): [••••••••••••••]                            │
│ ■ SelectionList (theme): [auto]                                      │
│ ■ SelectionList (features): [autosave, notifications]               │
│ · Weak Password: [••••] ✗                                            │
│ · Invalid Pattern: [abc123] ✗                                        │
│ · Too Short: [Hi] ✗                                                  │
│ ○ ProgressItem (Task 4 - TODO): ○                                    │
╰──────────────────────────────────────────────────────────────────────╯
```

## Expanded View Examples

When a ConfigurationListItem with validation error is expanded:

```
│ ■ Invalid Email: ✗ Invalid email format                              │
│ ┌─ Input ────────────────────────────────────────────────────────┐   │
│ │ not-an-email█                                                  │   │
│ └─────────────────────────────────────────────────────────────────┘   │
```

When FilePickerListItem with non-existent file is expanded:

```
│ ■ Missing File (file mode): [enter] └▶ [esc] ✗ [h] show            │
│ │  Path: [/Users/hanan/non-existent-file.txt]                       │
│ └─ (access denied)                                                   │
```

## Validation States

The validation system supports three states:

1. **Error (Red)**: ✗ - Shows when validation fails
2. **Warning (Orange)**: ! - Shows when value is acceptable but not optimal
3. **Valid (Green)**: ✓ - Shows when value passes all validations

## Features Demonstrated

1. **Bullet Color Change**: The bullet (·, ■, 📄) changes color based on validation state
2. **Inline Validation Messages**: Error messages appear next to values in collapsed view
3. **Responsive Truncation**: Long messages are truncated with ellipsis
4. **Initial Validation**: Invalid default values are validated on component creation
5. **File Existence Check**: FilePickerListItem validates that files/folders exist