# TUI Visual Design System
*folder-mcp CLI Interface Design Specifications*

## Overview
This document defines the visual design system for the folder-mcp TUI interface, targeting Claude Code-level polish and user experience. All designs are optimized for modern terminal emulators with 256-color support.

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
Accent Cyan     #06B6D4  [cyan]            ██████ Highlights, success states
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

### Status Indicators (Simple)
```
◯◉  Radio buttons (unselected, selected)
[ ][✓]  Checkboxes (unchecked, checked) - Clean bracket style
⏵⏸⏹  Media controls (play, pause, stop)
▸▾▴  Directional arrows (right, down, up)
◦•  Bullets (light, heavy)
```

### Progress Elements (Clean)
```
█▓▒░  Progress bar fill (100%, 75%, 50%, 25%)
▁▂▃▄▅▆▇█  Bar chart elements
```

### Special Symbols (Essential Only)
```
√✗  Success/failure
⚠  Warning
→←↑↓  Directional arrows
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

Focused State (Overwrite Mode):
╭─ Label ──────────────────────────────────────╮ [blue border]
│ █placeholder text                            │ [cursor at beginning for overwrite]
╰──────────────────────────────────────────────╯

Typing State:
╭─ Label ──────────────────────────────────────╮ [blue border]
│ user input█                                  │ [cursor at end while typing]
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

Multi-Select List (Clean Bracket Style):
╭─ Language Support ───────────────────────────╮
│                                              │
│ Select supported languages:                  │
│                                              │
│  ⏵ [✓] English                              │ ← [current position, vibrant cyan bg]
│  ◦ [✓] Python                               │ [checked, bright green text]
│  ◦ [ ] JavaScript                           │
│  ◦ [ ] Markdown                             │
│  ◦ [ ] All Languages                        │
│                                              │
│ [↑↓] Navigate  [Space] Toggle  [Enter] Done  │
╰──────────────────────────────────────────────╯

After Arrow Down + Space:
╭─ Language Support ───────────────────────────╮
│                                              │
│ Select supported languages:                  │
│                                              │
│  ◦ [✓] English                              │ [checked, bright green text]
│  ⏵ [✓] Python                               │ ← [current + checked, vibrant cyan bg]
│  ◦ [ ] JavaScript                           │
│  ◦ [ ] Markdown                             │
│  ◦ [ ] All Languages                        │
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

Yes/No Questions (Horizontal Layout):
╭─ Confirmation ───────────────────────────────╮
│                                              │
│ Continue with this action?                   │
│                                              │
│    ● Yes    ○ No                            │ ← [horizontal layout]
│                                              │
│ [←→] Navigate  [Y/N] Quick  [Enter] Confirm  │
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
│  ◦ Language:                                │ [non-selectable label]
│    ● Multi-language    ○ English only       │ [individual radio options]
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

### Progress Bars (Clean & Simple)
```
Progress with Spinner:
Progress: [████████░░] ⠋ 80% Indexing files...

Progress with Status Icons:
Indexing:   [████████░░] ✓ 80% Complete
Embeddings: [██████████] ✓ 100% Complete
Startup:    [▓▒░▒▓▒░▒] ⠙ Starting server...

Multi-line Progress:
Server Status:  [████████░░] ⠸ 80% Indexing files...
Current Task:   Processing document 45/67
Embeddings:     [██████████] ✓ Complete
Vector Index:   [▓▒░▒▓▒░▒] ⠦ Building spatial index...
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

### Progress Bar Colors
```
Standard States:
Progress: [████████▓░] 80%  [gradient: bright → medium → dim blue]
Complete: [██████████] 100% [solid bright blue]
Error:    [████▓░░░░░] 40%  [gradient: bright → medium → dim red]

Indeterminate Animation:
Loading: [▓▒░▒▓▒░▒] Please wait...
        ↑ Simple wave pattern, no sparkles or decorations

Color Values:
Filled:   #3B82F6 (bright blue)
Partial:  #1E40AF (medium blue) 
Empty:    #374151 (dim gray)

NO SPARKLES (✨✦), NO CIRCLES (◦), NO DECORATIVE SYMBOLS
```

## Improved UX Patterns

### Text Input Behavior
```
Overwrite Mode Indication:
- Cursor blinks at beginning of placeholder
- Shows intent to replace entire placeholder
- Stable positioning prevents text jumping

Typing Mode:
- Cursor moves to end when user starts typing
- Natural append behavior for continued input
- Clear visual distinction between modes
```

### Navigation Improvements
```
Individual Radio Options:
- Each radio choice is separately navigable
- No confusing group cycling behavior
- Arrow keys move between actual options

Horizontal Yes/No Layout:
- Side-by-side presentation
- Left/right arrows for intuitive navigation
- Y/N keys for quick selection
```

### Border Consistency
```
Uniform Border Coloring:
- All border segments use same color
- Proper padding calculations
- Consistent right border alignment
- Visual coherence across all screens
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

## Groundbreaking Interface Patterns

### Simple Loading Animation
```
Step 1: ▓        Step 2: ▒        Step 3: ░        Step 4: ▒
       bright          medium          dim           medium
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

### Processing Status Dashboard
```
╭─ Processing Status ──────────────────────────────────────────────╮
│                                                                  │
│ Server Status:  [████████▓░] 80% Indexing files...              │
│ Current Task:   Processing document 45/67                       │
│ Embeddings:     [██████████] Complete                           │
│ Vector Index:   [▓▒░▒▓▒░▒] Building spatial index...           │
│                                                                  │
│ Estimated time remaining: 2m 15s                                │
│                                                                  │
│ [h] Help  [q] Quit  [space] Pause                               │
╰──────────────────────────────────────────────────────────────────╯
```

### Clean Command Interface
```
╭─ folder-mcp Server Running ─────────────────────────────────────╮
│                                                                  │
│ Port: 3000  Model: nomic-embed-text  Documents: 67              │
│                                                                  │
│ ╭─ Command Input ───────────────────────────────────────────╮   │
│ │ > █                                                       │   │
│ │                                                           │   │
│ │ Type commands or press [Tab] for suggestions              │   │
│ ╰───────────────────────────────────────────────────────────╯   │
│                                                                  │
│ Quick Actions:                                                   │
│ \model    \status    \config    \help                           │
│                                                                  │
│ Recent Activity:                                                 │
│ √ Server started successfully                                    │
│ √ Embeddings loaded (2,341 vectors)                             │
│ Ready for connections                                            │
╰──────────────────────────────────────────────────────────────────╯
```

---

*This **groundbreaking** design system pushes terminal interfaces into the future with modern Unicode symbols, sophisticated animations, and revolutionary interaction patterns that surpass traditional GUI applications.*