# TUI Visual Design System
*folder-mcp CLI Interface Design Specifications*

## Overview
This document defines the visual design system for the folder-mcp TUI interface, targeting Claude Code-level polish and user experience. All designs are optimized for modern terminal emulators with 256-color support.

## Current Implementation Status

### ✅ Implemented Visual Elements
- **Rounded Borders** - Using ╭╮╰╯ characters (BorderedBox component)
- **Navigation Bar** - Tab navigation between panels with smooth transitions
- **Scrollable Lists** - With visual scrollbar indicators (▲ ┃ ▼)
- **Responsive Design** - Layout adapts to terminal size (LayoutContainer)
- **Focus States** - Border color changes on focus (#475569 → #3B82F6)
- **Selection Indicators** - ▶ for selected, ○ for unselected items
- **Tab Transitions** - Smooth keyboard navigation between panels

### ❌ Missing Interactive Elements (Required for Configuration)
- **Text Input Fields** - Single-line and multi-line text entry
- **Yes/No Questions** - Confirmation dialogs
- **Radio Buttons** - Single choice selection (◯ ◉)
- **Checkboxes** - Multiple choice selection (☐ ☑)
- **Dropdown/Select Menus** - Model selection with options
- **Form Management** - Submit/cancel actions, validation
- **Progress Indicators** - For long operations
- **Modal Dialogs** - For confirmations and alerts
- **Command Input** - For slash commands
- **Loading States** - Spinners and progress bars

## Priority Implementation Plan

### Phase 1: Essential Configuration Components
These components are required for the configuration wizard described in the development plan:

1. **Text Input Component**
   - Single-line input with cursor and editing
   - Support for placeholder text
   - Validation states (error/success)
   - Example: Port number, folder path input

2. **Radio Button Group**
   - Single selection from multiple options
   - Visual states: ◯ (unselected) → ◉ (selected)
   - Example: Language support (single/multi)

3. **Select/Dropdown Component**
   - List of options with current selection
   - Scrollable for long lists
   - Type-to-filter functionality
   - Example: Embedding model selection

4. **Yes/No Dialog**
   - Modal overlay with question
   - Keyboard shortcuts (y/n)
   - Example: "Regenerate embeddings?"

5. **Progress Bar**
   - Determinate progress with percentage
   - Indeterminate for unknown duration
   - Example: Model download, embedding generation

### Phase 2: Enhanced User Experience
These components improve the overall experience:

1. **Checkbox List**
   - Multiple selections
   - Visual states: ☐ → ☑
   - Example: Language selection

2. **Command Palette**
   - Slash command input
   - Autocomplete suggestions
   - Example: \model, \status, \config

3. **Loading Animations**
   - Spinner variations (⟲, ⚬⚭⚮)
   - Smooth transitions
   - Example: Server startup

4. **Form Validation**
   - Real-time validation feedback
   - Error messages
   - Submit/cancel actions

5. **Modal System**
   - Overlay dialogs
   - Keyboard navigation
   - Multiple modal types

## Design Principles
- **Clarity**: Information hierarchy through typography and spacing
- **Elegance**: Subtle animations and smooth transitions
- **Efficiency**: Minimal cognitive load, maximum usability
- **Accessibility**: High contrast, clear focus indicators
- **Consistency**: Unified visual language across all screens

## Color Palette

### Primary Colors
```
Primary Blue    #3B82F6  [bright-blue]     ██████ Action items, primary buttons
Secondary Blue  #1E40AF  [blue]            ██████ Secondary elements, borders
Purple #780b7c  [purple]                   ██████ Highlights, success states
```

### Status Colors
```
Success Green   #10B981  [green]           ██████ Completed states, confirmations
Warning Orange  #F59E0B  [yellow]          ██████ Warnings, embedding recreations
Error Red       #EF4444  [red]             ██████ Errors, validation failures
Info Purple     #8B5CF6  [magenta]         ██████ Information, help text
```

### Neutral Colors
```
Text Primary    #F9FAFB  [white]           ██████ Primary text, labels
Text Secondary  #9CA3AF  [bright-black]    ██████ Secondary text, descriptions
Text Disabled   #6B7280  [black]           ██████ Disabled elements, placeholders
Background      #111827  [bg]              ██████ Main background
Surface         #1F2937  [dim]             ██████ Card backgrounds, inputs
Border          #374151  [dim]             ██████ Borders, separators
```

## Typography Scale

### Hierarchy
```
H1 - Large Title    22px equivalent  ████████████████████████
H2 - Section Title  18px equivalent  ██████████████████
H3 - Subsection     16px equivalent  ████████████████
Body - Regular      14px equivalent  ██████████████
Small - Helper      12px equivalent  ████████████
Code - Monospace    14px equivalent  ████████████████
```

### Text Styles
```
[bold]           Bold weight for emphasis
[dim]            Dimmed for secondary information  
[italic]         Italics for labels and hints
[underline]      Underlines for links and focus
[strikethrough]  Strikethrough for disabled items
```

## Character Library

### Border Characters

#### Rounded Borders (Claude Code Style - Primary)
```
╭─╮  ╭──────╮  ╭─ Title ──╮  Simple, with content, with title
│ │  │      │  │          │  
╰─╯  ╰──────╯  ╰──────────╯  

╭─┬─╮  ╭──┬──╮  Grid layouts with rounded corners
├─┼─┤  │  │  │  
╰─┴─╯  ╰──┴──╯  
```

#### Traditional Borders (Secondary Use)
```
┌─┬─┐  ┏━┳━┓  ╔═╦═╗  Traditional box styles
├─┼─┤  ┣━╋━┫  ╠═╬═╣  (light, bold, double)
└─┴─┘  ┗━┻━┛  ╚═╩═╝  

│ ┃ ║  Vertical lines (light, bold, double)
─ ━ ═  Horizontal lines (light, bold, double)
```

### Status Indicators (Modern Unicode)
```
◯◉⦿  Radio buttons (unselected, selected, focused)
☐☑☒  Checkboxes (unchecked, checked, indeterminate)
⏵⏸⏹  Media controls (play, pause, stop)
▸▾▴▪  Directional arrows (right, down, up, bullet)
◦•●  Bullets (light, medium, heavy)
⚬⚭⚮  Atomic symbols (nucleus, orbital, electron)
```

### Progress Elements (Ultra-Modern)
```
█▓▒░  Progress bar fill (100%, 75%, 50%, 25%)
⣿⣶⣤⣀  Braille patterns for smooth progress
▁▂▃▄▅▆▇█  Bar chart elements
◐◓◑◒  Spinning indicators (classic)
⟲⟳⌖⌗  Advanced spinners (rotate left/right, targets)
⧗⧖⧕⧔  Time-based progress (hourglasses)
⬢⬡⬟⬞  Hexagonal progress states
◯◉⊙⊚  Ring progress indicators
⚬⚭⚮⚯  Atomic orbital animations
```

### Special Symbols (Groundbreaking Modern)
```
√✗✘  Success/failure (mathematical check, crosses)
⚠⚡⚑  Warning, attention, flag
→←↑↓  Directional arrows
⭐✨💫  Stars, sparkles, highlights  
🔒🔓🔑  Security states (locked, unlocked, key)
⟢⟣⟡  Advanced arrows (curved, wave, lightning)
⧗⧖⧕  Time indicators (hourglass, clock, timer)
◈◇◆  Diamonds (outline, light, filled)
⬢⬡⬟  Hexagons (outline, light, filled)
◎⊙⊚  Targets and focus rings
⦿⦾⦽  Sophisticated bullets
```

## Spacing Grid

### Base Units
```
1u = 1 character width/height
2u = 2 characters (small spacing)
4u = 4 characters (medium spacing)  
8u = 8 characters (large spacing)
```

### Layout Spacing
```
Component Padding:    2u internal padding
Component Margin:     4u between components
Section Separation:   8u between major sections
Screen Margins:       4u from terminal edges
```

## Animation Timing

### Duration Scale
```
Instant:    0ms     Immediate feedback
Fast:       150ms   State changes, focus
Medium:     300ms   Screen transitions
Slow:       500ms   Major state changes
Loading:    1000ms  Progress indication cycles
```

### Easing Curves
```
ease-out:   Quick start, slow end (user-initiated)
ease-in:    Slow start, quick end (system-initiated) 
ease:       Balanced curve (neutral animations)
linear:     Constant speed (progress bars)
```

## Component Specifications

### Input Fields (Claude Code Style)
```
Default State:
╭─ Label ──────────────────────────────────────╮
│ placeholder text                             │
╰──────────────────────────────────────────────╯

Focused State:
╭─ Label ──────────────────────────────────────╮ [blue border]
│ █cursor here                                 │ [blue cursor]
╰──────────────────────────────────────────────╯

Error State:
╭─ Label ──────────────────────────────────────╮ [red border]
│ invalid input                                │ 
│ ⚠ Error message here                         │ [red text]
╰──────────────────────────────────────────────╯

Multi-line Input:
╭─ Content Description ────────────────────────╮
│ Code repository with Python and JavaScript  │
│ files for a web application backend         │
│                                              │
╰──────────────────────────────────────────────╯
```

### Interactive Components (Updated Specifications)

Based on current implementation and required functionality:

#### Text Input Field
```
Default State:
╭─ Folder Path ────────────────────────────────────╮
│ /Users/example/documents█                        │
╰──────────────────────────────────────────────────╯

Placeholder State:
╭─ Content Description ────────────────────────────╮
│ Tell me about your folder content...             │ [dim gray text]
╰──────────────────────────────────────────────────╯

Error State:
╭─ Server Port ────────────────────────────────────╮ [red border]
│ 80█                                              │
│ ⚠ Port 80 requires admin privileges             │ [red text]
╰──────────────────────────────────────────────────╯

Editing Keys:
- Left/Right arrows: Move cursor
- Backspace: Delete character before cursor
- Delete: Delete character at cursor
- Home/End: Jump to start/end
- Ctrl+U: Clear input
- Enter: Submit
- Esc: Cancel editing
```

#### Radio Button Group (Single Selection)
```
Language Support:
  ◯ Single-language (recommended for better accuracy)
  ◉ Multi-language (current setting)

Model Selection:
  ◉ nomic-embed-text (recommended) ← [current, blue background]
  ◯ all-MiniLM-L6-v2 (balanced)
  ◯ bge-large-en-v1.5 (high performance)

Navigation:
- ↑↓: Move selection
- Space/Enter: Select option
- Selection changes immediately (no submit needed)
```

#### Yes/No Dialog
```
╭─ Confirm Configuration Change ───────────────────╮
│                                                  │
│  Changing the embedding model will require       │
│  regenerating all embeddings.                   │
│                                                  │
│  This may take 5-10 minutes.                    │
│                                                  │
│  Continue? (Y/n)                                │
│                                                  │
╰──────────────────────────────────────────────────╯

Keys:
- Y/y: Confirm (default)
- N/n: Cancel
- Enter: Confirm (if Y is default)
- Esc: Cancel
```

#### Select/Dropdown with Filter
```
Closed State:
╭─ Embedding Model ────────────────────────────────╮
│ nomic-embed-text (current) ▼                    │
╰──────────────────────────────────────────────────╯

Open State (with type-to-filter):
╭─ Embedding Model ────────────────────────────────╮
│ ╭─ Filter: min█ ───────────────────────────────╮ │
│ │                                              │ │
│ │ ▶ all-MiniLM-L6-v2 (balanced)               │ │ [filtered]
│ │                                              │ │
│ │ 1 of 6 models                                │ │
│ ╰──────────────────────────────────────────────╯ │
╰──────────────────────────────────────────────────╯

Features:
- Type to filter options
- ↑↓ to navigate
- Enter to select
- Esc to close without selecting
```

#### Progress Bar (Determinate)
```
Downloading Model:
[████████████████████░░░░░░░░░░] 67% (45.2MB/67.8MB)

Generating Embeddings:
[████████████░░░░░░░░░░░░░░░░░░] 40% (156/389 documents)

With Time Estimate:
[████████████████░░░░░░░░░░░░░░] 53% | ETA: 2m 15s
```

#### Progress Bar (Indeterminate)
```
Initializing Server:
[⟲] Starting server...

Loading Configuration:
[⚬⚭⚮] Please wait...

Building Index:
[████▓▓▒▒░░ ░░▒▒▓▓████] Processing...
```

### Interactive Actions (Keyboard-First Design)
```
Vertical List Navigation (Predictable Arrow Keys):

Basic Choice List:
╭─ Initial Setup ──────────────────────────────╮
│                                              │
│ Choose configuration method:                 │
│                                              │
│  ⏵ Create optimized configuration           │ ← [current position, vibrant cyan bg]
│  ◦ Start configuration wizard               │
│                                              │
│ [↑↓] Navigate  [→] Enter  [←/Esc] Back       │
╰──────────────────────────────────────────────╯

After Arrow Down:
╭─ Initial Setup ──────────────────────────────╮
│                                              │
│ Choose configuration method:                 │
│                                              │
│  ◦ Create optimized configuration           │
│  ⏵ Start configuration wizard               │ ← [current position, vibrant cyan bg]
│                                              │
│ [↑↓] Navigate  [→] Enter  [←/Esc] Back       │
╰──────────────────────────────────────────────╯

Model Selection List:
╭─ Embedding Model ────────────────────────────╮
│                                              │
│ Select embedding model:                      │
│                                              │
│  ⏵ nomic-embed-text (recommended)           │ ← [current position, vibrant cyan bg]
│  ◦ all-MiniLM-L6-v2 (balanced)              │
│  ◦ bge-large-en-v1.5 (high performance)     │
│  ◦ multilingual-e5-large (multi-lang)       │
│                                              │
│ [↑↓] Navigate  [→] Enter  [←/Esc] Back       │
╰──────────────────────────────────────────────╯

Checkbox List (Multiple Selection):
╭─ Language Support ───────────────────────────╮
│                                              │
│ Select supported languages:                  │
│                                              │
│  ⏵ ☑ English                                │ ← [current position, vibrant cyan bg]
│  ◦ ☑ Python                                 │ [checked, bright green text]
│  ◦ ☐ JavaScript                             │
│  ◦ ☐ Markdown                               │
│  ◦ ☐ All Languages                          │
│                                              │
│ [↑↓] Navigate  [Space] Toggle  [Enter] Done  │
╰──────────────────────────────────────────────╯

After Arrow Down + Space:
╭─ Language Support ───────────────────────────╮
│                                              │
│ Select supported languages:                  │
│                                              │
│  ◦ ☑ English                                │ [checked, bright green text]
│  ⏵ ☑ Python                                 │ ← [current + checked, vibrant cyan bg]
│  ◦ ☐ JavaScript                             │
│  ◦ ☐ Markdown                               │
│  ◦ ☐ All Languages                          │
│                                              │
│ [↑↓] Navigate  [Space] Toggle  [Enter] Done  │
╰──────────────────────────────────────────────╯

Radio Button List (Single Selection):
╭─ Server Mode ────────────────────────────────╮
│                                              │
│ Choose server mode:                          │
│                                              │
│  ⏵ ◉ Development (hot reload)               │ ← [current position, vibrant cyan bg]
│  ◦ ◯ Production (optimized)                 │
│  ◦ ◯ Debug (verbose logging)                │
│                                              │
│ [↑↓] Navigate  [→] Enter  [←/Esc] Back       │
╰──────────────────────────────────────────────╯

Action List (Command Selection):
╭─ Server Actions ─────────────────────────────╮
│                                              │
│ Available actions:                           │
│                                              │
│  ⏵ ▶ Start Server                           │ ← [current position, vibrant cyan bg]
│  ◦ ⚙ Configure Settings                     │
│  ◦ 📊 View Status                            │
│  ◦ 🔄 Restart Server                         │
│  ◦ ⏹ Stop Server                            │
│  ◦ ❓ Show Help                              │
│  ◦ ❌ Quit Application                       │
│                                              │
│ [↑↓] Navigate  [→] Execute  [←/Esc] Back     │
╰──────────────────────────────────────────────╯

Form Field List (Sequential Navigation):
╭─ Configuration Form ─────────────────────────╮
│                                              │
│  ⏵ Content Description:                     │ ← [current position, vibrant cyan bg]
│    ╭────────────────────────────────────────╮│ [textbox border - kept!]
│    │ Python web application repository     ││
│    ╰────────────────────────────────────────╯│
│                                              │
│  ◦ Embedding Model:                         │
│    nomic-embed-text (current)               │
│                                              │
│  ◦ Server Port:                             │
│    3000                                      │
│                                              │
│ [↑↓] Navigate  [→] Edit  [←/Esc] Back        │
╰──────────────────────────────────────────────╯

Selection Indicators:
⏵ Current selection (blue background, white text)
◦ Unselected items (dim, gray text)
◉ Selected radio button (filled circle)
◯ Unselected radio button (empty circle)
☑ Checked checkbox (green checkmark)
☐ Unchecked checkbox (empty box)

Visual States (Vibrant Current Position):
Normal:     ◦ Configure Settings        [dim gray text #9CA3AF]
Selected:   ⏵ Configure Settings        [bright blue bg #60A5FA, white text, subtle glow]
Focused:    ⏵ Configure Settings        [vibrant cyan bg #06B6D4, white text, highlighted]
Active:     ⏵ ⟲ Configuring...          [pulsing blue bg + spinner]
Complete:   ⏵ ✓ Configured!             [bright green bg flash #34D399]
Error:      ⏵ ✗ Failed!                 [bright red bg flash #F87171]
Checked:    ◦ ☑ Enable Feature          [bright green checkmark #10B981]

Current Position Indicators:
Current:    ⏵ Current Item              [vibrant cyan background #06B6D4, white text, subtle glow]
Hovered:    ▸ Hover Item                [lighter blue background #93C5FD, white text]
Normal:     ◦ Normal Item               [no background, dim gray text #9CA3AF]

Enhanced Visual Examples:
╭─ Model Selection ────────────────────────────╮
│                                              │
│  ◦ nomic-embed-text (recommended)           │ [dim gray text]
│  ⏵ all-MiniLM-L6-v2 (balanced)             │ ← [VIBRANT CYAN BG - current position]
│  ▸ bge-large-en-v1.5 (high performance)     │ [light blue bg - hover preview]
│  ◦ multilingual-e5-large (multi-lang)       │ [dim gray text]
│                                              │
╰──────────────────────────────────────────────╯

Keyboard Position in Form:
╭─ Configuration ──────────────────────────────╮
│                                              │
│  ◦ Content Description:                     │ [normal field]
│    Python web app repository                │
│                                              │
│  ⏵ Embedding Model:                         │ ← [VIBRANT CYAN - keyboard here]
│    nomic-embed-text (current)               │
│                                              │
│  ◦ Server Port:                             │ [normal field]
│    3000                                      │
│                                              │
╰──────────────────────────────────────────────╯

Color Specifications:
- Current Position: Vibrant Cyan #06B6D4 (bright, attention-grabbing)
- Hover Preview: Light Blue #93C5FD (softer, preview state)
- Normal Items: Transparent background, dim gray text #9CA3AF
- Checked Items: Bright green text/icons #10B981
- Focus Glow: Subtle outer glow effect for current position

Borders Only for Specific Purposes:

1. Grouping Related Content:
╭─ Server Configuration ───────────────────────╮  [groups related fields]
│  ⏵ Embedding Model: nomic-embed-text        │
│  ◦ Server Port: 3000                        │
│  ◦ Cache Size: 512MB                        │
╰──────────────────────────────────────────────╯

2. Text Input Fields (Textboxes):
╭─────────────────────────────────────────╮      [clearly shows editable area]
│ Python web application repository      │      
╰─────────────────────────────────────────╯      

3. Filter/Search Boxes:
╭─ Filter ────────────────────────────────╮      [shows search functionality]
│ search term█                           │      
╰────────────────────────────────────────╯      

No Borders Around:
- Individual list items (use background colors instead)
- Menu options (clean list appearance)
- Buttons/actions (rely on icons and colors)
- Status indicators (minimal visual noise)  

Navigation Rules (Hierarchical + Simple):
- ↑ moves selection up one item
- ↓ moves selection down one item  
- → dive deeper / enter submenu / expand item
- ← go back / up one level / collapse item
- Enter activates/selects/confirms current item
- Space toggles checkboxes only
- Esc also goes back/cancels (same as ←)

Hierarchical Navigation Examples:
Main Menu [↑↓ to navigate, → to enter]
  ⏵ Configure Server     → [dive into server config]
  ◦ View Status          → [show status details]
  ◦ Help & Documentation → [open help system]

Server Config [← to go back, ↑↓ to navigate]
  ⏵ Embedding Model      → [model selection list]
  ◦ Server Port          → [port input field]
  ◦ Advanced Settings    → [advanced options]

Model Selection [← back to config, ↑↓ navigate, → for details]
  ⏵ nomic-embed-text     → [show model details/info]
  ◦ all-MiniLM-L6-v2     → [show model details/info]
  ◦ bge-large-en-v1.5    → [show model details/info]

Breadcrumb Navigation:
Main → Server Config → Model Selection
[← Back]              [← Back]        [← Back to Config]

Form Field Expansion:
╭─ Configuration Form ─────────────────────────╮
│                                              │
│ ╭─────────────────────────────────────────╮  │ [selected field]
│ │ ⏵ Content Description: [→ to edit]     │  │ ← [→ to expand/edit]
│ ╰─────────────────────────────────────────╯  │
│ ╭─────────────────────────────────────────╮  │
│ │ ◦ Embedding Model: [→ to select]       │  │
│ ╰─────────────────────────────────────────╯  │
╰──────────────────────────────────────────────╯

After pressing → on Content Description:
╭─ Edit Content Description ───────────────────╮
│                                              │
│ ╭─────────────────────────────────────────╮  │
│ │ Python web application repository       │  │ [editing mode]
│ │ with machine learning components█       │  │ [cursor active]
│ ╰─────────────────────────────────────────╯  │
│                                              │
│ [Enter] Save  [Esc/←] Cancel                 │
╰──────────────────────────────────────────────╯

Tree-like Navigation:
Server Configuration
├─ ⏵ Basic Settings     [→ to expand]
├─ ◦ Advanced Options   [→ to expand]  
└─ ◦ Security Settings  [→ to expand]

After pressing → on Basic Settings:
Server Configuration
├─ ⏵ Basic Settings     [← to collapse]
│  ├─ ⏵ Server Port: 3000
│  ├─ ◦ Model: nomic-embed-text
│  └─ ◦ Description: Web app...
├─ ◦ Advanced Options   [→ to expand]
└─ ◦ Security Settings  [→ to expand]

Type-to-Filter in Long Lists:
When user types in any list, a search box appears and items filter in real-time.

Before typing (normal list):
╭─ Embedding Model ────────────────────────────╮
│                                              │
│ Select embedding model:                      │
│                                              │
│ ╭─────────────────────────────────────────╮  │ [blue border, selected]
│ │ ⏵ nomic-embed-text (recommended)       │  │
│ ╰─────────────────────────────────────────╯  │
│ ╭─────────────────────────────────────────╮  │ [very dim border]
│ │ ◦ all-MiniLM-L6-v2 (balanced)          │  │
│ ╰─────────────────────────────────────────╯  │
│ ╭─────────────────────────────────────────╮  │ [very dim border]
│ │ ◦ bge-large-en-v1.5 (high performance) │  │
│ ╰─────────────────────────────────────────╯  │
│ ╭─────────────────────────────────────────╮  │ [very dim border]
│ │ ◦ multilingual-e5-large (multi-lang)   │  │
│ ╰─────────────────────────────────────────╯  │
│ ╭─────────────────────────────────────────╮  │ [very dim border]
│ │ ◦ sentence-transformers/all-mpnet      │  │
│ ╰─────────────────────────────────────────╯  │
│ ╭─────────────────────────────────────────╮  │ [very dim border]
│ │ ◦ intfloat/e5-large-v2                 │  │
│ ╰─────────────────────────────────────────╯  │
│                                              │
│ [↑↓] Navigate  [→] Enter  [←/Esc] Back       │
╰──────────────────────────────────────────────╯

After typing "min" (search box appears + list filters):
╭─ Embedding Model ────────────────────────────╮
│                                              │
│ Select embedding model:                      │
│                                              │
│ ╭─ Filter ─────────────────────────────────╮  │ [search box appears]
│ │ min█                                    │  │ [cursor in search box]
│ ╰─────────────────────────────────────────╯  │
│                                              │
│ ╭─────────────────────────────────────────╮  │ [blue border, selected]
│ │ ⏵ all-MiniLM-L6-v2 (balanced)          │  │ [filtered result]
│ ╰─────────────────────────────────────────╯  │
│                                              │
│ 1 of 6 models shown                         │
│                                              │
│ [Type] Filter  [↑↓] Navigate  [→] Select     │
│ [Backspace] Clear  [Esc] Cancel filter      │
╰──────────────────────────────────────────────╯

After typing "large" (different filter):
╭─ Embedding Model ────────────────────────────╮
│                                              │
│ Select embedding model:                      │
│                                              │
│ ╭─ Filter ─────────────────────────────────╮  │ [search box active]
│ │ large█                                  │  │ [cursor in search box]
│ ╰─────────────────────────────────────────╯  │
│                                              │
│ ╭─────────────────────────────────────────╮  │ [blue border, selected]
│ │ ⏵ bge-large-en-v1.5 (high performance) │  │ [filtered result 1]
│ ╰─────────────────────────────────────────╯  │
│ ╭─────────────────────────────────────────╮  │ [very dim border]
│ │ ◦ multilingual-e5-large (multi-lang)   │  │ [filtered result 2]
│ ╰─────────────────────────────────────────╯  │
│ ╭─────────────────────────────────────────╮  │ [very dim border]
│ │ ◦ intfloat/e5-large-v2                 │  │ [filtered result 3]
│ ╰─────────────────────────────────────────╯  │
│                                              │
│ 3 of 6 models shown                         │
│                                              │
│ [Type] Filter  [↑↓] Navigate  [→] Select     │
│ [Backspace] Clear  [Esc] Cancel filter      │
╰──────────────────────────────────────────────╯

Filtering in Action Lists:
╭─ Server Actions ─────────────────────────────╮
│                                              │
│ ╭─ Filter ─────────────────────────────────╮  │
│ │ con█                                    │  │ [user typed "con"]
│ ╰─────────────────────────────────────────╯  │
│                                              │
│ ╭─────────────────────────────────────────╮  │ [blue border, selected]
│ │ ⏵ ⚙ Configure Settings                 │  │ [matches "con"]
│ ╰─────────────────────────────────────────╯  │
│                                              │
│ 1 of 7 actions shown                        │
│                                              │
│ [Type] Filter  [↑↓] Navigate  [→] Execute    │
│ [Backspace] Clear  [Esc] Cancel filter      │
╰──────────────────────────────────────────────╯

Search Box Behavior:
- Appears instantly when user types any letter/number
- Filters items in real-time as user types
- Shows "X of Y items shown" count
- Maintains selection on first filtered item
- Backspace clears filter character by character
- Esc cancels filter and returns to full list
- Arrow keys work normally within filtered results
- Enter/→ selects item from filtered results

Search Box Styling:
╭─ Filter ─────────────────────────────────╮   [subtle border]
│ search term█                            │   [text + cursor]
╰─────────────────────────────────────────╯   [matches input field style]

No Tab Navigation - Everything accessible via directional arrows + typing!
```

### Progress Bars (Ultra-Modern Style)
```
Standard Progress:
Progress: [█████████▓░] 80% Complete

Indeterminate Progress (Orbital):
Loading:  [⚬⚭⚮] Please wait...

Advanced Indeterminate:
Loading:  [⟲] Analyzing documents...

Multi-line Progress:
Server Status:  [████████▓░] 80% Indexing files...
Current Task:   ⏵ Processing document 45/67
Embeddings:     [██████████] √ Complete

Hexagonal Progress:
System Check:   [⬢⬡⬢⬡⬢] Detecting capabilities...
```

### Modal Dialogs (Claude Code Style)
```
╭─ Dialog Title ───────────────────────────────────╮
│                                                  │
│  Dialog content goes here with proper spacing   │
│  and clear typography hierarchy.                 │
│                                                  │
│  ╭─────────────╮  ╭─────────────╮                │
│  │   Cancel    │  │   Confirm   │                │
│  ╰─────────────╯  ╰─────────────╯                │
╰──────────────────────────────────────────────────╯

Confirmation Dialog:
╭─ Regenerate Embeddings? ─────────────────────────╮
│                                                  │
│  ⚠  Changing the model will require regenerating │
│      all embeddings. This may take several       │
│      minutes depending on your document count.   │
│                                                  │
│  Continue with model change?                     │
│                                                  │
│  ╭─────────────╮  ╭─────────────╮                │
│  │ ✘ Cancel    │  │ √ Continue  │                │
│  ╰─────────────╯  ╰─────────────╯                │
╰──────────────────────────────────────────────────╯

Success Dialog:
╭─ Embeddings Complete ────────────────────────────╮
│                                                  │
│  ✨ Successfully processed 67 documents          │
│     Vector index created with 2,341 embeddings  │
│                                                  │
│  ⏵ Server is ready to start                     │
│                                                  │
│  ╭─────────────╮                                 │
│  │ √ Continue  │                                 │
│  ╰─────────────╯                                 │
╰──────────────────────────────────────────────────╯
```

### Command Input (Claude Code Signature Style)
```
╭─ Command Input ─────────────────────────────────────────────╮
│ > \help                                                     │
│                                                             │
│ Available Commands:                                         │
│ \model - Select embedding model                             │
│ \port - Change server port                                  │
│ \status - Show server status                                │
│ \config - Show configuration                                │
│ \connection - Get MCP connection JSON                       │
╰─────────────────────────────────────────────────────────────╯

With Autocomplete:
╭─ Command Input ─────────────────────────────────────────────╮
│ > \mod█                                                     │
│                                                             │
│ ╭─ Suggestions ─────╮                                       │
│ │ ⏵ \model          │ [highlighted suggestion]              │
│ │ ◦ \monitor        │                                       │
│ ╰───────────────────╯                                       │
╰─────────────────────────────────────────────────────────────╯

Server Ready State:
╭─ 🟢 folder-mcp Server Running ──────────────────────────────╮
│                                                             │
│ Port: 3000  Model: nomic-embed-text  Documents: 67 indexed │
│                                                             │
│ ╭─ Command Input ───────────────────────────────────────╮   │
│ │ > █                                                   │   │
│ │                                                       │   │
│ │ Press Tab for commands, 'h' for help, 'q' to quit    │   │
│ ╰───────────────────────────────────────────────────────╯   │
╰─────────────────────────────────────────────────────────────╯
```

## Focus System

### Focus Indicators
```
Tab Order:     Sequential highlighting with blue borders
Focus Ring:    Blue outline around active element  
Visual Cue:    ▶ arrow or highlight for current selection
Breadcrumbs:   Show current position in multi-step flows
```

### Keyboard Navigation
```
Tab/Shift+Tab: Move between interactive elements
Arrow Keys:    Navigate within components (lists, radios)
Enter:         Activate focused element
Escape:        Cancel/back action
Space:         Toggle checkboxes, expand items
```

## Responsive Behavior

### Terminal Size Support
```
Minimum:  80x24  Essential functionality only
Standard: 120x30 Full feature set
Large:    160x50 Enhanced spacing and details
```

### Adaptive Layout
```
- Components stack vertically on narrow screens
- Reduce padding and margins at small sizes
- Hide non-essential decorative elements
- Maintain minimum touch targets (3+ chars)
```

## Animation Specifications

### State Transitions
```
Fade In:     Opacity 0 → 1 over 300ms ease-out
Slide Up:    Transform Y+10 → 0 over 300ms ease-out  
Pulse:       Scale 1 → 1.05 → 1 over 150ms ease
Spinner:     Rotate 360° every 1000ms linear
```

### Interactive State Animations
```
Toggle Disable:
Frame 1:  ◉ GPU Acceleration          [normal state]
Frame 2:  ◉̶ GPU Acceleration          [strikethrough begins]
Frame 3:  ◉̶ ̶G̶P̶U̶ ̶A̶c̶c̶e̶l̶e̶r̶a̶t̶i̶o̶n̶          [full strikethrough]
Frame 4:  ◯ ̶G̶P̶U̶ ̶A̶c̶c̶e̶l̶e̶r̶a̶t̶i̶o̶n̶          [disabled state]
Duration: 400ms total, 100ms per frame

Toggle Enable (Reverse):
Frame 1:  ◯ ̶G̶P̶U̶ ̶A̶c̶c̶e̶l̶e̶r̶a̶t̶i̶o̶n̶          [disabled state]
Frame 2:  ◉̶ ̶G̶P̶U̶ ̶A̶c̶c̶e̶l̶e̶r̶a̶t̶i̶o̶n̶          [strikethrough fades]
Frame 3:  ◉̶ GPU Acceleration          [partial strikethrough]
Frame 4:  ◉ GPU Acceleration          [normal state]
Duration: 400ms total, 100ms per frame

Checkbox Animations:
Unchecked → Checked:
☐ → ☑ (200ms) + green flash (100ms)

Checked → Unchecked:
☑ → ☒ (100ms) → ☐ (200ms) + red flash (100ms)

Radio Button Transitions:
Selected: ◯ → ◉ with expanding ring effect (300ms)
Deselected: ◉ → ◯ with contracting effect (200ms)

List Item Selection:
Default:  ◦ Feature Name
Hover:    ▸ Feature Name              [arrow appears, 150ms]
Selected: ⏵ Feature Name              [bold arrow, 100ms]
Disabled: ◦̶ ̶F̶e̶a̶t̶u̶r̶e̶ ̶N̶a̶m̶e̶              [strike + dim, 300ms]

Button State Transitions (Borderless):
Default → Hover:
 ⏵ Submit Form  →   ⏵⏵ Submit Form     [double arrow + bg brighten, 200ms]

Hover → Active:
 ⏵⏵ Submit Form  →   ⏵⏵ Submit Form     [pulse effect + deeper bg, 100ms]

Loading Button Sequence:
 ⏵ Submit Form  →   ⟲ Processing...  →   ✓ Completed!
   [blue bg]          [blue bg spin]      [green bg flash]

Error State Animation:
 ⏵ Submit Form  →   ✗ Failed!  →   ◦ Retry
   [blue bg]        [red flash 3x]   [gray bg, ready]

Action Button Animations:
 ▶ Start  →  ▶▶ Start  →  ⟲ Starting...  →  ⏸ Running
 ⏸ Pause  →  ⏸⏸ Pause  →  ◦ Pausing...   →  ▶ Paused  
 ⏹ Stop   →  ⏹⏹ Stop   →  ⟲ Stopping...  →  ▶ Stopped

Focus Ring for Borderless Buttons:
 ⏵ Submit Form         [normal state]
 ⏵⏵ Submit Form        [focused - double arrow + brighter bg]
 ⏵⏵⏵ Submit Form       [active - triple arrow + pulse + deeper bg]

Color Transition Examples:
Primary:    Blue (#3B82F6) → Bright Blue (#60A5FA) → Deep Blue (#1E40AF)
Success:    Green (#10B981) → Bright Green (#34D399) → Deep Green (#059669)
Warning:    Orange (#F59E0B) → Bright Orange (#FBBF24) → Deep Orange (#D97706)
Danger:     Red (#EF4444) → Bright Red (#F87171) → Deep Red (#DC2626)
```

### Focus Ring Animations
```
Focus Gain:
Regular border → Blue glow expanding outward (200ms ease-out)
╭─────────────╮     ╭═════════════╮
│   Content   │ →   ║   Content   ║    [border thickens + glows]
╰─────────────╯     ╰═════════════╯

Focus Loss:
Blue glow → Regular border (150ms ease-in)
╭═════════════╮     ╭─────────────╮
║   Content   ║ →   │   Content   │    [glow fades + border thins]
╰═════════════╯     ╰─────────────╯

Tab Navigation:
Previous focused element fades while next element gains focus
Creates smooth "flow" effect across interface
```

### Loading States
```
Dots:        "Loading..." → "Loading." → "Loading.." → "Loading..."
Braille:     ⣾⣽⣻⢿⡿⣟⣯⣷ cycling every 100ms
Bar Fill:    Progressive fill left-to-right
Pulse Ring:  Expanding ring effect for completion
```

### Progress Bar Breathing Animation
```
Breathing Cycle (2000ms total):
Phase 1 (500ms): Base color → Bright        [ease-out]
Phase 2 (500ms): Bright → Peak              [ease]
Phase 3 (500ms): Peak → Bright              [ease]
Phase 4 (500ms): Bright → Base              [ease-in]

Color Progression:
Base:    #3B82F6 (primary blue)
Bright:  #60A5FA (30% brighter)
Peak:    #93C5FD (60% brighter)

Progress Bar States:
Loading:     [████████▓▓] 80% ⟲ Indexing files...
            ↑ Breathing colors cycle through base → bright → peak
            
Indeterminate: [⚬⚭⚮⚯] ⟲ Please wait...
              ↑ Orbital symbols pulse with breathing effect

Implementation:
- Use CSS-like color transitions with linear interpolation
- Apply breathing effect to all progress indicators
- Synchronize breathing cycle across multiple progress bars
- Pause breathing on user interaction (focus/hover)
```

## Accessibility Guidelines

### Contrast Requirements
```
Text on Background:     4.5:1 minimum ratio
Interactive Elements:   3:1 minimum ratio  
Focus Indicators:       High contrast borders
Error States:          Multiple indicators (color + text + symbol)
```

### Screen Reader Support
```
- Semantic structure with clear headings
- Alternative text for symbols and graphics
- Progress announcements for screen readers
- Clear state changes and navigation cues
```

## Configuration Wizard Flow

### Complete Configuration Form Example
This shows how all the interactive components work together in the actual configuration wizard:

```
╭─ folder-mcp Configuration Wizard ────────────────────────────────╮
│                                                                  │
│  Let's set up your folder-mcp server                           │
│                                                                  │
│  ╭─ Content Description ──────────────────────────────────────╮  │
│  │ Python web application with ML components█                │  │ [text input]
│  ╰───────────────────────────────────────────────────────────╯  │
│                                                                  │
│  Language Support:                                               │
│    ◯ Single-language (better accuracy)                          │
│    ◉ Multi-language (recommended for mixed codebases)          │ [radio group]
│                                                                  │
│  ╭─ Embedding Model ──────────────────────────────────────────╮  │
│  │ nomic-embed-text (recommended) ▼                          │  │ [dropdown]
│  ╰───────────────────────────────────────────────────────────╯  │
│                                                                  │
│  ╭─ Server Port ──────────────────────────────────────────────╮  │
│  │ 3000█                                                      │  │ [text input]
│  ╰───────────────────────────────────────────────────────────╯  │
│                                                                  │
│  Advanced Options:                                               │
│    ☑ Enable hot reload                                          │
│    ☐ Enable debug logging                                       │ [checkboxes]
│    ☑ Auto-index on startup                                      │
│                                                                  │
│  [Tab] Next Field  [Enter] Submit  [Esc] Cancel                │
╰──────────────────────────────────────────────────────────────────╯
```

### Configuration Confirmation Dialog
```
╭─ Review Configuration ───────────────────────────────────────────╮
│                                                                  │
│  Content: Python web application with ML components             │
│  Language: Multi-language support                               │
│  Model: nomic-embed-text                                        │
│  Port: 3000                                                      │
│                                                                  │
│  ⚠ This configuration requires downloading the embedding        │
│    model (256MB) and generating embeddings for all files.      │
│                                                                  │
│  Estimated time: 5-10 minutes                                   │
│                                                                  │
│  Continue with this configuration? (Y/n)                        │
│                                                                  │
╰──────────────────────────────────────────────────────────────────╯
```

### Progress During Setup
```
╭─ Setting Up folder-mcp ──────────────────────────────────────────╮
│                                                                  │
│  Downloading embedding model:                                    │
│  [████████████████████░░░░░░░░░░] 72% (184MB/256MB)           │
│                                                                  │
│  Generating embeddings:                                          │
│  [████████░░░░░░░░░░░░░░░░░░░░░░] 32% (45/142 files)         │
│                                                                  │
│  Current: Processing main.py                                     │
│  Speed: 12 files/sec | ETA: 1m 23s                             │
│                                                                  │
│  [Space] Pause  [Esc] Cancel                                    │
╰──────────────────────────────────────────────────────────────────╯
```

## Groundbreaking Interface Patterns

### Orbital Loading Animation
```
Step 1: ⚬        Step 2: ⚭        Step 3: ⚮        Step 4: ⚯
       nucleus          electron         orbital          fusion
```

### Modern Configuration Form
```
╭─ Configuration Setup ────────────────────────────────────────────╮
│                                                                  │
│ CLI Parameters (locked):                                         │
│ 🔒 Model: nomic-embed-text (from CLI)                           │
│                                                                  │
│ Content Description:                                             │
│ ╭────────────────────────────────────────────────────────────╮   │
│ │ Code repository with Python and JavaScript files          │   │
│ ╰────────────────────────────────────────────────────────────╯   │
│                                                                  │
│ Language Support:                                                │
│ ◉ Multi-language (current)    ◯ Single-language (recommended)   │
│                                                                  │
│ Embedding Model:                                                 │
│ ╭────────────────────────────────────────────────────────────╮   │
│ │ ⏵ nomic-embed-text (current)                              │   │
│ │ ◦ all-MiniLM-L6-v2 (recommended)                          │   │
│ │ ◦ bge-large-en-v1.5 (high performance)                    │   │
│ ╰────────────────────────────────────────────────────────────╯   │
│                                                                  │
│ Server Port:                                                     │
│ ╭────────────────────────────────────────────────────────────╮   │
│ │ 3000 (current)                                            │   │
│ ╰────────────────────────────────────────────────────────────╯   │
│                                                                  │
│ ⚠ Changing language support will require regenerating           │
│   embeddings                                                    │
│                                                                  │
│ [Tab] Navigate  [Enter] Submit  [Esc] Cancel                    │
╰──────────────────────────────────────────────────────────────────╯
```

### Futuristic Progress Dashboard
```
╭─ Processing Status ──────────────────────────────────────────────╮
│                                                                  │
│ Server Status:  [████████▓░] 80% ⏵ Indexing files...           │
│ Current Task:   ⟲ Processing document 45/67                     │
│ Embeddings:     [██████████] √ Complete                         │
│ Vector Index:   [⬢⬡⬢⬡⬢⬡⬢] ⚬ Building spatial index...        │
│                                                                  │
│ ◎ Estimated time remaining: 2m 15s                              │
│                                                                  │
│ [h] Help  [q] Quit  [space] Pause                               │
╰──────────────────────────────────────────────────────────────────╯
```

### Ultra-Modern Command Interface
```
╭─ ⭐ folder-mcp Server Running ───────────────────────────────────╮
│                                                                  │
│ ◎ Port: 3000  ⬢ Model: nomic-embed-text  ◈ Documents: 67       │
│                                                                  │
│ ╭─ Command Input ───────────────────────────────────────────╮   │
│ │ > █                                                       │   │
│ │                                                           │   │
│ │ ◦ Type commands or press [Tab] for suggestions            │   │
│ ╰───────────────────────────────────────────────────────────╯   │
│                                                                  │
│ Quick Actions:                                                   │
│ ⟢ \model    ⟢ \status    ⟢ \config    ⟢ \help                  │
│                                                                  │
│ Recent Activity:                                                 │
│ √ Server started successfully                                    │
│ √ Embeddings loaded (2,341 vectors)                             │
│ ⏵ Ready for connections                                          │
╰──────────────────────────────────────────────────────────────────╯
```

## Safe Implementation Practices

### Development Guidelines
1. **Test Each Component in Isolation**
   - Create standalone test files for each component
   - Verify keyboard navigation works correctly
   - Test edge cases (empty states, long text, special characters)
   - Ensure terminal compatibility

2. **Incremental Integration**
   - Build components independently first
   - Test in demo app before integrating
   - Add one component at a time to main app
   - Verify existing functionality remains intact

3. **User Confirmation Points**
   - Show component demo before integration
   - Get approval on visual design
   - Confirm keyboard behavior meets expectations
   - Wait for green light before proceeding to next component

4. **Rollback Strategy**
   - Keep existing code unchanged until new component is proven
   - Use feature flags for new components
   - Maintain ability to revert to previous state
   - Document any breaking changes

## Component-by-Component Implementation Plan

### Component 1: TextInput
**Files to create:**
```
src/interfaces/tui-ink/components/TextInput.tsx
src/interfaces/tui-ink/components/__tests__/TextInput.test.tsx
src/interfaces/tui-ink/examples/TextInputDemo.tsx
```

**Tasks:**
1. Create basic TextInput with cursor rendering
2. Implement keyboard navigation (arrows, home/end)
3. Add editing operations (insert, delete, backspace)
4. Support placeholder text
5. Add validation states (error, success)
6. Create demo showing all features
7. **CHECKPOINT: Review and approve before integration**

### Component 2: RadioGroup
**Files to create:**
```
src/interfaces/tui-ink/components/RadioGroup.tsx
src/interfaces/tui-ink/components/__tests__/RadioGroup.test.tsx
src/interfaces/tui-ink/examples/RadioGroupDemo.tsx
```

**Tasks:**
1. Create RadioGroup container component
2. Implement RadioButton item component
3. Add keyboard navigation (up/down arrows)
4. Handle selection state changes
5. Support disabled options
6. Create demo with multiple examples
7. **CHECKPOINT: Review and approve before integration**

### Component 3: YesNoDialog
**Files to create:**
```
src/interfaces/tui-ink/components/YesNoDialog.tsx
src/interfaces/tui-ink/components/__tests__/YesNoDialog.test.tsx
src/interfaces/tui-ink/examples/YesNoDialogDemo.tsx
```

**Tasks:**
1. Create modal overlay system
2. Implement dialog box with message
3. Add Y/N keyboard shortcuts
4. Support default selection
5. Handle escape key for cancel
6. Create demo showing different dialog types
7. **CHECKPOINT: Review and approve before integration**

### Component 4: ProgressBar
**Files to create:**
```
src/interfaces/tui-ink/components/ProgressBar.tsx
src/interfaces/tui-ink/components/__tests__/ProgressBar.test.tsx
src/interfaces/tui-ink/examples/ProgressBarDemo.tsx
```

**Tasks:**
1. Create determinate progress bar
2. Add percentage and size displays
3. Implement indeterminate progress
4. Add smooth animation updates
5. Support different visual styles
6. Create demo with various progress scenarios
7. **CHECKPOINT: Review and approve before integration**

### Component 5: CheckboxList
**Files to create:**
```
src/interfaces/tui-ink/components/CheckboxList.tsx
src/interfaces/tui-ink/components/__tests__/CheckboxList.test.tsx
src/interfaces/tui-ink/examples/CheckboxListDemo.tsx
```

**Tasks:**
1. Create CheckboxList container
2. Implement Checkbox item component
3. Add space key for toggle
4. Support select all/none
5. Handle disabled items
6. Create demo with interactive examples
7. **CHECKPOINT: Review and approve before integration**

### Component 6: SelectDropdown
**Files to create:**
```
src/interfaces/tui-ink/components/SelectDropdown.tsx
src/interfaces/tui-ink/components/__tests__/SelectDropdown.test.tsx
src/interfaces/tui-ink/examples/SelectDropdownDemo.tsx
```

**Tasks:**
1. Create collapsed/expanded states
2. Implement dropdown animation
3. Add type-to-filter functionality
4. Support keyboard navigation
5. Handle long option lists
6. Create demo with filtering examples
7. **CHECKPOINT: Review and approve before integration**

### Testing Strategy for Each Component
1. **Unit Tests**
   - Test all keyboard interactions
   - Verify state management
   - Check edge cases

2. **Visual Tests**
   - Screenshot comparisons
   - Terminal size variations
   - Theme compatibility

3. **Integration Tests**
   - Test with existing navigation
   - Verify focus management
   - Check memory usage

4. **User Acceptance**
   - Demo to user
   - Gather feedback
   - Make adjustments
   - Get explicit approval

## Implementation Roadmap

### Immediate Priorities (Phase 1)
1. **Text Input Component** - Essential for configuration fields
2. **Radio Button Groups** - For language and model selection
3. **Yes/No Dialogs** - For confirmation prompts
4. **Progress Bars** - For long operations feedback
5. **Form Validation** - For input validation

### Next Steps (Phase 2)
1. **Checkbox Lists** - For multiple selections
2. **Dropdown/Select** - Enhanced model selection
3. **Modal System** - For dialogs and overlays
4. **Command Input** - For slash commands
5. **Loading Animations** - Enhanced visual feedback

### Integration Requirements
- All components must work with existing Ink/React setup
- Maintain consistent visual style with BorderedBox
- Support keyboard-only navigation
- Preserve responsive behavior
- Follow existing theme colors and symbols

---

*This **groundbreaking** design system pushes terminal interfaces into the future with modern Unicode symbols, sophisticated animations, and revolutionary interaction patterns that surpass traditional GUI applications.*