# Folder-MCP TUI Visual Component Guide

**Visual patterns, layouts, and rendering examples for each component**

---

## 1. GenericListPanel - Universal List Container

### Basic Structure
```
┌─── Configuration ──────────────────────────────────────────────────┐
│ ⁽ᵗᵃᵇ⁾                                                                   │
├──────────────────────────────────────────────────────────────────────┤
│ ⚙ Server Address: [192.168.1.100]                                    ▲ │
│ ⚙ Port Number: [8080]                                               ┃ │
│ ▶ Processing Options:                                                ┃ │
│ ⚙ Queue Size: [100]                                                  ┃ │
│ ⚙ Timeout (ms): [5000]                                              ▼ │
└──────────────────────────────────────────────────────────────────────┘
```

### With Subtitle
```
┌─── Main Panel ────── Configuration ────────────────────────────────┐
│ This panel shows all server settings                                 │
├──────────────────────────────────────────────────────────────────────┤
│ ⚙ Item 1                                                             │
│ ⚙ Item 2                                                             │
│ ⚙ Item 3                                                             │
└──────────────────────────────────────────────────────────────────────┘
```

### Scrollbar Examples
```
Long list (scrollbar shown):         Short list (no scrollbar):
┌─────────────────────────────┐     ┌─────────────────────────────┐
│ ▶ Item 1                    ▲     │ ▶ Item 1                    │
│ ○ Item 2                    ┃     │ ○ Item 2                    │
│ ○ Item 3                    ┇     │ ○ Item 3                    │
│ ○ Item 4                    ┃     └─────────────────────────────┘
│ ○ Item 5                    ▼
└─────────────────────────────┘
```

---

## 2. BorderedBox - Container with Title

### Focused State
```
╭─ Settings ─[padding]─╮
│ Content goes here    │
│                      │
╰──────────────────────╯
```

### Unfocused State (with tab indicator)
```
╭─ Settings ─[padding]─ ⁽ᵗᵃᵇ⁾ ╮
│ Content goes here             │
│                               │
╰───────────────────────────────╯
```

### With Scrollbar
```
╭─ Content ────────────╮ │
│ Line 1               │ ▲
│ Line 2               │ ┃
│ Line 3 (selected)    │ ┇
│ Line 4               │ ┃
│ Line 5               │ ▼
╰──────────────────────╯ │
```

---

## 3. TextListItem - Text Display

### Collapsed with Icon
```
• This is a descriptive text line that explains something
```

### Active State (shows cursor)
```
▶ This is a descriptive text line that explains something
```

### Wrapped Text (multiple lines)
```
⚠ This is a long text that needs to wrap across
  multiple lines because it doesn't fit in the
  available width of the container
```

### Truncated Text
```
• This is a very long text that gets truncated with…
```

---

## 4. SelectionListItem - Radio/Checkbox Selection

### Collapsed View
```
◎ Mode: [selected_option]
```

### Expanded - Vertical Layout (Radio Mode)
```
◎ Mode: select one
↳ ◎ Auto    ◎ Manual    ◎ Advanced
```

### Expanded - Horizontal Layout (Checkbox Mode)
```
◎ Options: select options
↳ ☑ Option 1   ☐ Option 2   ☐ Option 3   ☐ Option 4
```

### With Validation Error
```
◎ Mode: [value] ✗ Minimum 1 selection required
```

### With Details (Vertical Only)
```
◎ Mode: select one
│ Settings │ Value  │ Type
├──────────┼────────┼─────
│ Option 1 │ fast   │ mode
│ Option 2 │ slow   │ mode
```

---

## 5. TextInputItem - Text Input Field

### Collapsed
```
✎ Server Name: [hostname.example.com]
```

### Expanded (Editing)
```
✎ Server Name: [hostname.example|com]   (| = cursor)
   ^ Press Enter to save, Esc to cancel
```

### With Validation Error
```
✎ Server Name: [invalid!] ✗ Invalid hostname format
```

---

## 6. ConfigurationListItem - Advanced Configuration Editor

### Collapsed
```
⚙ Max Retries: [3]
```

### Expanded (Editing)
```
⚙ Max Retries: [5|]
  enter ✓ · esc ✗
```

### With Confirmation Dialog
```
╔════════════════════════════════════════╗
║ Warning: This will reset all settings  ║
║                                        ║
║        [ ✗ Cancel ]  [ ✓ Reset ]      ║
╚════════════════════════════════════════╝
```

---

## 7. FilePickerListItem - File Browser

### Collapsed (Selected Path)
```
📁 Folder: [/Users/hanan/Projects]
```

### Expanded (File List)
```
📁 Folder: [/Users/hanan/Projects]
├─ ↑ ../
├─ 📁 folder-mcp
├─ ▶ 📁 other-project
├─ 📄 README.md
└─ 📄 package.json
```

### Multi-Column Layout
```
📁 Folder: [/Users/hanan/Projects]
├─ ↑ ../          │ 📁 node_modules    │ 📄 tsconfig.json
├─ 📁 src         │ 📄 package.json    │ 📄 .gitignore
└─ 📁 tests       │ 📄 README.md       │ ▶ 📁 dist
```

### With Validation (folder conflict)
```
📁 Folder: [/path] ✗ Folder already configured
```

---

## 8. SimpleButtonsRow - Interactive Buttons

### Regular Mode (Focused on 'Yes')
```
╭──────╮  ╭──────╮
│ ✓Yes │  │ ✗ No │
╰──────╯  ╰──────╯
```

### Regular Mode (Focused on 'Cancel')
```
╭────────╮  ╭────────╮  ╭──────╮
│ Cancel │  │ ✓Save  │  │ ✗Delete│
╰────────╯  ╰────────╯  ╰──────╯
```

### Low-Resolution Mode (1 line)
```
[ Yes ] [ No ]
```

### With Terminal Underline Support
```
[ _Yes_ ] [ No ]     (underline on focused)
```

### Without Underline Support
```
[ YES  ] [ No ]      (background highlight on focused)
```

---

## 9. VerticalToggleRow - Quick Toggle

### Basic Toggle
```
Speed: ⊙ Slow    ○ Normal    ○ Fast
```

### With More Options
```
Theme: ⊙ Light   ○ Dark   ○ Auto   ○ Minimal
```

### Truncated (narrow width)
```
Speed: ⊙ Sl… ○ Nor… ○ Fa…
```

---

## 10. ProgressBar - Progress Indicators

### Short Mode (4 characters)
```
⊙70%    (spinner + percentage)
✓       (completion)
✗ERR    (error)
```

### Long Mode (with full bar)
```
⊙▰▰▰▰▰▱▱▱ 70%      (in progress)
✓▰▰▰▰▰▰▰▰▰100%     (complete)
✗▱▱▱▱▱▱▱▱▱ ERR      (error)
```

### Auto Mode Selection
```
Width < 6:   70%                (percentage only)
Width < 20:  ⊙70%               (short mode)
Width ≥ 20:  ⊙▰▰▰▰▱▱▱ 70%       (long mode)
```

---

## 11. LogItem - Expandable Log Messages

### Collapsed (Single Line)
```
⚠ Request timeout after 5000ms
```

### Expanded (Multi-line)
```
⚠ Request timeout after 5000ms
  Connection to server 192.168.1.100:8080
  was interrupted. Last activity: 2024-01-15
  at 14:30:22 UTC. Retrying...
```

### Different Log Levels
```
ℹ Informational message about system status
⚠ Warning: This action may have side effects
✗ Error: Failed to connect to database
✓ Success: Configuration saved successfully
```

---

## 12. Responsive Layout Examples

### Landscape Mode (Wide Terminal)
```
┌─────────────────────────┬─────────────────────────┐
│       Configuration     │     System Status       │
│                         │                         │
│ ⚙ Setting 1: [value]    │ Memory: 45% (2.1 GB)   │
│ ⚙ Setting 2: [value]    │ CPU: 12% (4 cores)     │
│ ⚙ Setting 3: [value]    │ Disk: 78% (463 GB)     │
│                         │                         │
└─────────────────────────┴─────────────────────────┘
```

### Portrait Mode (Narrow Terminal)
```
┌──────────────────────────────────────┐
│       Configuration (70%)            │
│                                      │
│ ⚙ Setting 1: [value]                │
│ ⚙ Setting 2: [value]                │
│ ⚙ Setting 3: [value]                │
├──────────────────────────────────────┤
│ System Status (30%)                  │
│ Memory: 45% | CPU: 12% | Disk: 78%  │
└──────────────────────────────────────┘
```

### Low Vertical Resolution
```
┌──────────────────────────────────────┐
│     Configuration (Active - Full)    │
│                                      │
│ ⚙ Setting 1: [value]                │
│ ⚙ Setting 2: [value]                │
├──────────────────────────────────────┤
│ System Status (Minimized)            │
└──────────────────────────────────────┘
```

### Extremely Low Resolution
```
┌──────────────────────────────────────┐
│     Configuration (Active - Full)    │
│                                      │
│ ⚙ Setting 1: [value]                │
│ ⚙ Setting 2: [value]                │
│ ⚙ Setting 3: [value]                │
├──────────────────────────────────────┤
│ System Status                        │
└──────────────────────────────────────┘
```

---

## Color Scheme Reference

### Text Colors
```
Accent (Focus):        ■ ■ ■   (#2f70d8 - Bright Blue)
Primary Text:          ■ ■ ■   (#F8FAFC - Off-white)
Secondary Text:        ■ ■ ■   (#94A3B8 - Light gray)
Muted Text:            ■ ■ ■   (#64748B - Medium gray)
Configuration Values:  ■ ■ ■   (#648151 - Olive green)
```

### State Colors
```
Success:               ■ ■ ■   (#10B981 - Green)
Warning:               ■ ■ ■   (#F59E0B - Orange)
Danger:                ■ ■ ■   (#EF4444 - Red)
Border Unfocused:      ■ ■ ■   (#475569 - Dark gray)
Border Focused:        ■ ■ ■   (#3B82F6 - Bright blue)
```

---

## Unicode Symbols Reference

### Borders
```
╭ ╮ ╰ ╯           (Rounded corners)
├ ┤ ┆ ┊           (Vertical dividers)
─ │              (Horizontal/vertical lines)
```

### Selection
```
◎ ○              (Radio button states)
☑ ☐              (Checkbox states)
✓ ✗              (Check/X marks)
⊙                (Filled circle)
```

### Arrows & Navigation
```
▶ ◀              (Play/previous)
↑ ↓ ← →          (Direction arrows)
⊕ ⊖              (Plus/minus in circles)
▲ ▼              (Up/down triangles)
```

### Progress & Status
```
⊙ ⊗              (Spinner states)
▰ ▱              (Progress bar filled/empty)
■ □              (Filled/empty squares)
┃ ┇              (Scrollbar states)
```

### Special
```
⚙                (Settings/config)
✎                (Edit/pencil)
📁 📄            (Folder/file)
⚠ ℹ              (Warning/info)
```

---

## Animation Examples

### Spinner Sequence (BRAILLE_SPINNER)
```
Frame 1: ⠋
Frame 2: ⠙
Frame 3: ⠹
Frame 4: ⠸
Frame 5: ⠼
Frame 6: ⠴
Frame 7: ⠦
Frame 8: ⠧
Frame 9: ⠇
Frame 10: ⠏
(repeats)
```

### Progress Wave (for indeterminate progress)
```
Frame 1: ▱▱▱▱▱
Frame 2: ▰▱▱▱▱
Frame 3: ▰▰▱▱▱
Frame 4: ▱▰▰▱▱
Frame 5: ▱▱▰▰▱
Frame 6: ▱▱▱▰▰
(repeats)
```

---

## Width Management Examples

### Width Calculation Flow
```
Terminal Width: 120 columns

┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Available Width: 120                                                                                │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────┬───────────────────────────────────────────────┐
│ Panel 1: 60 columns                           │ Panel 2: 58 columns                           │
├───────────────────────────────────────────────┼───────────────────────────────────────────────┤
│ BorderOverhead: 3 chars (| space |)           │ BorderOverhead: 3 chars                       │
│ Available for content: 57 chars               │ Available for content: 55 chars               │
├───────────────────────────────────────────────┼───────────────────────────────────────────────┤
│ IconWidth: 2 (icon + space)                   │ IconWidth: 2                                  │
│ TextWidth: 55 (57 - 2)                        │ TextWidth: 53                                 │
└───────────────────────────────────────────────┴───────────────────────────────────────────────┘
```

### Text Truncation Priority
```
Available Width: 30

Original:    "Server Configuration Options"  (28 chars) ✓ Fits
Truncated:   "Server Configuration Op…"    (29 chars) ✓ With ellipsis

Available Width: 15
Original:    "Options"         (7 chars) ✓ Fits
Alternative: "Opt…"            (4 chars) ✓ Truncated

Available Width: 3
Only:        "…"               (1 char) ✓ Ellipsis only
```

---

## State Transition Diagrams

### SelectionListItem States
```
                    ┌─────────────────┐
                    │   COLLAPSED     │
                    │  [selected]     │
                    └────────┬────────┘
                             │ onEnter()
                             ↓
                    ┌─────────────────┐
                    │   EXPANDED      │
                    │  [selecting]    │
                    └────────┬────────┘
                             │ Enter or Escape
                             ↓
                    ┌─────────────────┐
                    │   COLLAPSED     │
                    │  [updated/orig] │
                    └─────────────────┘
```

### TextInputItem States
```
                    ┌─────────────────┐
                    │   COLLAPSED     │
                    │  [display only] │
                    └────────┬────────┘
                             │ onEnter()
                             ↓
                    ┌─────────────────┐
                    │   EDITING       │
                    │  [cursor blink] │
                    └────────┬────────┘
                    ┌────────┴────────┐
                    ↓                 ↓
            Enter (Escape)      [Validation]
                    │                 │
                    ├─ Valid ─────────┤
                    │                 │
                    ↓                 ↓
            ┌─────────────────┐  ┌──────────┐
            │   COLLAPSED     │  │  ERROR   │
            │  [updated]      │  │[try again]
            └─────────────────┘  └──────────┘
```

---

## Keyboard Shortcut Quick Reference

### Navigation
```
↑ ↓         Navigate between list items
← →         Navigate within item (when item is controlling input)
Tab         Switch between panels
Escape      Exit item control mode / go back
```

### List Items
```
Enter       Activate selected item / Confirm selection
Space       Toggle checkbox / Confirm action
Left/Right  Navigate radio/checkbox options
```

### Text Input
```
← →         Move cursor
Backspace   Delete character before cursor
Delete      Delete character at cursor
Ctrl+A      Select all (when supported)
```

### File Picker
```
Enter       Enter directory / Select file
Backspace   Go to parent directory
H           Toggle hidden files
```

---

**This visual guide helps developers understand the exact rendering patterns and can be referenced when implementing new components or modifying existing ones.**
