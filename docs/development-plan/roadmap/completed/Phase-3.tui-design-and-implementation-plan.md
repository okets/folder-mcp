# Phase 1: CLI TUI MVP Implementation Plan

## Overview
This document outlines the actionable implementation plan for Phase 1 of the folder-mcp CLI TUI MVP, based on the initiation flow diagram and development requirements.

## TUI Flow Tree Visualization

```
┌─────────────────────────────────────────────────────────────────┐
│                         Launch Application                      │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Initialize TUI Framework                     │
│  • Full-screen terminal interface                               │
│  • Keyboard event handling                                      │
│  • Screen management                                            │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Check Cached Config                         │
│  • Look for .folder-mcp configuration                          │
└─────────────────┬───────────────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │ Cached Config?    │
        └─────┬─────────────┘
     Yes ─────┤───── No
              │
    ┌─────────▼──────────┐              ┌──────────────────────────┐
    │  Load from Cache   │              │   System Auto-Detection  │
    │  • Read .folder-mcp│              │  • Detect available models│
    │  • Validate config │              │  • Calculate defaults     │
    └─────────┬──────────┘              └─────────┬────────────────┘
              │                                   │
              └─────────┬─────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    User Configuration Choice                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  TUI Dialog with Options:                                   ││
│  │  [ ] Create Optimized configuration for my machine         ││
│  │  [ ] Start Configuration Wizard                            ││
│  │                                                             ││
│  │  Navigation: ↑↓ Arrow keys, Enter to select               ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────┬───────────────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │ User Choice?      │
        └─────┬─────────────┘
  Optimized ──┤───── Wizard
              │
    ┌─────────▼──────────┐              ┌──────────────────────────┐
    │   Skip Wizard      │              │  Configuration Wizard    │
    │   • Multi-language │              │  ┌─────────────────────┐ │
    │     defaults       │              │  │ Content Description │ │
    └─────────┬──────────┘              │  │ • Tell me about     │ │
              │                         │  │   folder content    │ │
              │                         │  │ • Single/Multi lang │ │
              │                         │  └─────────────────────┘ │
              │                         │  ┌─────────────────────┐ │
              │                         │  │ Model Selection     │ │
              │                         │  │ • Multi-lang models │ │
              │                         │  │ • Single-lang (big) │ │
              │                         │  │ • Performance info  │ │
              │                         │  └─────────────────────┘ │
              │                         │  ┌─────────────────────┐ │
              │                         │  │ Port Configuration  │ │
              │                         │  │ • Default: 3000     │ │
              │                         │  │ • Custom input      │ │
              │                         │  └─────────────────────┘ │
              │                         └─────────┬────────────────┘
              │                                   │
              └─────────┬─────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Runtime Configuration Check                     │
│  • Compare current config with cached version                   │
│  • Determine if embeddings need regeneration                    │
└─────────────────┬───────────────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │ Config Changed?   │
        └─────┬─────────────┘
     Yes ─────┤───── No
              │
    ┌─────────▼──────────┐              ┌──────────────────────────┐
    │ Update Embeddings  │              │ Check Embedding Status   │
    │ Storage            │              │ • Verify completeness    │
    └─────────┬──────────┘              └─────────┬────────────────┘
              │                                   │
              └─────────┬─────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Progress Notification Area                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Server Status: [████████░░] 80% Indexing files...          ││
│  │                                                             ││
│  │ Current: Processing document 45/67                         ││
│  │ Embeddings: [██████████] Complete                          ││
│  │                                                             ││
│  │ Press 'h' for help, 'q' to quit                           ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MCP Server Ready                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 🟢 folder-mcp Server Running                               ││
│  │                                                             ││
│  │ Port: 3000                                                  ││
│  │ Model: nomic-embed-text                                     ││
│  │ Documents: 67 indexed                                       ││
│  │                                                             ││
│  │ ┌─────────────────────────────────────────────────────────┐ ││
│  │ │ Command Input:                                          │ ││
│  │ │ > \help                                                 │ ││
│  │ │                                                         │ ││
│  │ │ Available Commands:                                     │ ││
│  │ │ \model - Select embedding model                         │ ││
│  │ │ \port - Change server port                              │ ││
│  │ │ \status - Show server status                            │ ││
│  │ │ \config - Show configuration                            │ ││
│  │ │ \connection - Get MCP connection JSON                   │ ││
│  │ └─────────────────────────────────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## Linear Implementation Plan (Following Flow Chart)

### Step 1: Launch Application
**Goal: Get the TUI framework running and validate CLI parameters**

**User Conversation:**
- User launches the application with optional CLI parameters
- System initializes TUI framework and displays branding/splash screen
- System immediately validates CLI parameters: "Validating command-line arguments..."
- If CLI errors: "❌ Invalid parameter --model=invalid-model. Available models: nomic-embed-text, all-MiniLM-L6-v2"
- If CLI requires embedding recreation AND existing embeddings found: "⚠️ Model parameter will require regenerating embeddings. Continue? (y/N)"
- If CLI requires embedding recreation but no existing embeddings: Continue without prompt
- If CLI provides complete config: "CLI configuration detected, skipping interactive setup..."
- Basic component architecture is established

**Step Tasks:**
- [ ] Create main TUI entry point (`src/interfaces/tui/TUIApplication.tsx`)
- [ ] Initialize Ink app with React components
- [ ] **CLI Parameter Validation:**
  - [ ] Parse command-line arguments immediately at launch
  - [ ] Validate all CLI parameters against available options
  - [ ] Show error messages for invalid parameters with suggestions
  - [ ] Check if CLI parameters require embedding regeneration
  - [ ] Check for existing embeddings before prompting for recreation
  - [ ] Prompt user confirmation for embedding recreation ONLY if existing embeddings found
  - [ ] Store validated CLI config for use throughout flow
- [ ] Set up basic component-based architecture with hooks
- [ ] Create initial launch screen component with branding
- [ ] **Design System Foundation:**
  - [ ] Create `src/interfaces/tui/design/colors.ts` with color palette
  - [ ] Create `src/interfaces/tui/design/typography.ts` with text styles
  - [ ] Create `src/interfaces/tui/design/animations.ts` with easing functions

### Step 2: Initialize TUI Framework
**Goal: Core TUI infrastructure with keyboard handling**

**User Conversation:**
- System sets up keyboard navigation and screen management
- User can now interact with the interface using keyboard
- Smooth transitions and animations are ready for use

**Step Tasks:**
- [ ] Create `src/interfaces/tui/hooks/useKeyboard.ts` for keyboard handling
- [ ] Implement screen routing system with React state management
- [ ] Create `src/interfaces/tui/hooks/useAnimation.ts` for smooth transitions
- [ ] **Advanced Keyboard Handling:**
  - [ ] Focus management with React refs and useEffect
  - [ ] Tab/shift-tab navigation with React focus trap
  - [ ] Arrow key navigation with smooth state transitions

### Step 3: Check Cached Config
**Goal: Configuration detection and loading**

**User Conversation:**
- System checks for existing configuration in .folder-mcp file
- User sees loading indicator while config is being validated
- If config exists, user sees "Loading previous configuration..." message
- If no config, user proceeds to configuration choice

**Step Tasks:**
- [ ] Implement .folder-mcp config file detection
- [ ] Create config validation logic
- [ ] Build config loading with error handling
- [ ] Add visual feedback for config status

### Step 4: User Configuration Choice
**Goal: Optimized vs Manual configuration decision (unless CLI provides complete config)**

**User Conversation:**
- If CLI provides complete configuration: Skip this step entirely
- If CLI provides partial configuration: "Some settings provided via CLI, choose how to handle remaining settings:"
  - "Use optimized defaults for remaining settings" 
  - "Configure remaining settings manually"
- If no CLI configuration: User is presented with two options:
  - "Create Optimized configuration for my machine" - with animated bullets
  - "Start Configuration Wizard"
- User navigates with arrow keys, sees smooth focus transitions
- User presses Enter to make selection
- System provides immediate visual feedback and routes to chosen path

**Step Tasks:**
- [ ] Create `src/interfaces/tui/components/ConfigurationChoice.tsx`
- [ ] **CLI Integration Logic:**
  - [ ] Check if CLI provides complete configuration (skip step)
  - [ ] Handle partial CLI configuration scenarios
  - [ ] Display different options based on CLI parameter coverage
- [ ] **Interactive Feedback:**
  - [ ] Use Ink's `<Box>` and `<Text>` with color state changes
  - [ ] Focus indicators with useState and conditional styling
  - [ ] Create `src/interfaces/tui/components/AnimatedBullets.tsx` (Claude Code style)
- [ ] Implement optimized configuration path (auto-detect and apply best settings)
- [ ] Route to configuration wizard using screen state management

### Step 5: Configuration Wizard
**Goal: Present configuration form with intelligent pre-selections, skipping CLI-provided settings**

**User Conversation:**
- System first calculates optimized defaults and loads cached settings
- User sees a configuration form like this:

```
┌─ Configuration Setup ────────────────────────────────────────────┐
│                                                                  │
│ CLI Parameters (locked):                                         │
│ ✓ Model: nomic-embed-text (from CLI)                            │
│                                                                  │
│ Content Description:                                             │
│ ┌────────────────────────────────────────────────────────────┐   │
│ │ Code repository with Python and JavaScript files          │   │
│ └────────────────────────────────────────────────────────────┘   │
│                                                                  │
│ Language Support:                                                │
│ ● Multi-language (current)    ○ Single-language (recommended)   │
│                                                                  │
│ Embedding Model: (locked by CLI)                                │
│ ┌────────────────────────────────────────────────────────────┐   │
│ │ nomic-embed-text (from CLI)                               │   │
│ └────────────────────────────────────────────────────────────┘   │
│                                                                  │
│ Server Port:                                                     │
│ ┌────────────────────────────────────────────────────────────┐   │
│ │ 3000 (current)                                            │   │
│ └────────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ⚠️  Changing language support will require regenerating          │
│     embeddings                                                  │
│                                                                  │
│ [Tab] Navigate  [Enter] Submit  [Esc] Cancel                    │
└──────────────────────────────────────────────────────────────────┘
```

- Form fields are pre-selected based on priority: current > recommended > default
- CLI-provided parameters appear as locked/grayed out fields
- User navigates form with Tab/Shift-Tab between editable fields
- Dynamic warnings appear below fields when user makes changes that affect embeddings
- User confirms with Enter or cancels with Esc

**Step Tasks:**
- [ ] **Form Layout & CLI Integration:**
  - [ ] Create `src/interfaces/tui/components/ConfigurationForm.tsx` as main form component
  - [ ] Display CLI-provided parameters as locked/disabled fields at top
  - [ ] Hide form fields already provided by CLI parameters
  - [ ] Implement form navigation with Tab/Shift-Tab between fields
- [ ] **Pre-selection Logic:**
  - [ ] Calculate optimized defaults before form loads
  - [ ] Load cached configuration for comparison
  - [ ] Implement priority system: current > recommended > default
  - [ ] Pre-select form values based on priority hierarchy
- [ ] **Form Fields:**
  - [ ] **Content Description**: `<TextInput>` with cached value pre-filled (hide if CLI provided)
  - [ ] **Language Support**: Radio button group with current/recommended pre-selected
  - [ ] **Embedding Model**: Dropdown/Select with current pre-selected, options labeled "(recommended)"
  - [ ] **Server Port**: `<TextInput>` with current/recommended port pre-filled (hide if CLI provided)
- [ ] **Dynamic Warnings:**
  - [ ] Monitor form field changes with React state
  - [ ] Show "⚠️ Changing model will require regenerating embeddings" below relevant fields
  - [ ] Hide/show warnings based on whether selection differs from current
- [ ] **System Integration:**
  - [ ] Create `src/interfaces/tui/services/SystemCapabilities.ts` for hardware detection
  - [ ] Create `src/interfaces/tui/services/HuggingFaceMetadata.ts` for model data
  - [ ] Create `src/interfaces/tui/services/OllamaIntegration.ts` for Ollama CLI
  - [ ] **BitNet support for very weak machines**
- [ ] **Form Submission:**
  - [ ] Merge CLI parameters with form selections
  - [ ] Track which selections differ from cache for Step 6
  - [ ] Submit form on Enter or explicit submit action

### Step 6: Runtime Configuration Check
**Goal: Determine if embeddings need regeneration based on tracked changes**

**User Conversation:**
- System uses tracked changes from wizard (or compares for optimized path)
- User sees "Checking configuration changes..." spinner
- If embedding-affecting changes detected: "Model changed from 'all-MiniLM-L6-v2' to 'nomic-embed-text', regenerating embeddings..."
- If only non-embedding changes: "Port updated, embeddings remain valid..."
- If no changes: "Configuration unchanged, verifying embeddings..."
- User sees specific reasoning for what changed and why regeneration is/isn't needed

**Step Tasks:**
- [ ] Use tracked changes from Step 5 wizard or compare for optimized path
- [ ] Identify which specific settings changed (model, language, etc.)
- [ ] Determine embedding regeneration needs based on embedding-affecting changes
- [ ] Display specific reasoning for decisions to user
- [ ] Route to appropriate embedding process

### Step 7: Embedding Management
**Goal: Update or verify embeddings with progress tracking**

**User Conversation:**
- If model needs download: "Downloading [model-name]..." with progress bar
- User sees GPU/CPU status: "Using GPU acceleration" or "Using CPU (slower)"
- During embedding generation: "Processing documents [32/156] - Batch 4/5"
- FAISS index building: "Building vector index..." with spinner
- User sees estimated time remaining and current operation
- Success: "Embeddings ready! Processed X documents"

**Step Tasks:**
- [ ] **Embedding Model Setup:**
  - [ ] Create `src/interfaces/tui/services/ModelDownloader.ts` with progress hooks
  - [ ] **Model download progress with React state and useEffect**
  - [ ] **GPU/CPU status using `src/interfaces/tui/components/StatusDisplay.tsx`**
- [ ] **Progress & Notification System:**
  - [ ] Create `src/interfaces/tui/hooks/useProgress.ts` for embedding progress
  - [ ] **FAISS vector index progress with React state updates**
  - [ ] Create `src/interfaces/tui/components/LoadingSpinner.tsx` with animations
  - [ ] Progress bars using Ink's layout and useState for smooth updates
- [ ] **Integration Points:**
  - [ ] Connect MCP server initialization with React context
  - [ ] Embedding system integration with async React patterns
  - [ ] File watching integration with useEffect cleanup

### Step 8: Progress Notification Area
**Goal: Real-time progress display with animations**

**User Conversation:**
- User sees comprehensive progress dashboard with multiple progress bars
- Real-time updates: "Server Status: [████████░░] 80% Indexing files..."
- Current operation: "Processing document 45/67"
- Server state transitions: "Starting server..." → "Ready"
- User can press 'h' for help, 'q' to quit during this phase
- Smooth animations keep user engaged during long operations

**Step Tasks:**
- [ ] Real-time progress bars
- [ ] Server state notifications with smooth transitions
- [ ] **Animation & Transitions:**
  - [ ] Fade in/out transitions for content changes
  - [ ] Contextual help tooltips that appear/disappear gracefully
- [ ] Error handling and display
- [ ] Success confirmations

### Step 9: MCP Server Ready
**Goal: Final interface with command system**

**User Conversation:**
- User sees: "🟢 folder-mcp Server Running" with server details
- Display shows: "Port: 3000, Model: nomic-embed-text, Documents: 67 indexed"
- User can type commands in input box: "> \help"
- Available slash commands displayed with descriptions
- User can invoke \model, \port, \status, \config, \connection, \help
- Interactive help system guides user through available commands
- User can now use the fully functional MCP server interface

**Step Tasks:**
- [ ] Create `src/interfaces/tui/screens/MainScreen.tsx` with server ready state
- [ ] **Command Input System:**
  - [ ] Enhance `CommandInput.tsx` with focus animations using React state
  - [ ] Create `src/interfaces/tui/navigation/SlashCommands.ts` parser
  - [ ] Build autocomplete with React state and filtered suggestions
- [ ] **Slash Commands Implementation:**
  - [ ] `\model` - Modal dialog using conditional rendering
  - [ ] `\port` - Port config modal with `<TextInput>`
  - [ ] `\status` - Status overlay using React state
  - [ ] `\config` - Config viewer with scrollable `<Box>`
  - [ ] `\connection` - JSON display with copy functionality
  - [ ] `\help` - Help modal using conditional rendering
- [ ] **Advanced Help System:**
  - [ ] Create `src/interfaces/tui/components/HelpSystem.tsx`
  - [ ] Connection JSON generation with React state
  - [ ] Keyboard shortcuts overlay with animations
- [ ] **Final Polish:**
  - [ ] Optimize React renders with useMemo and useCallback
  - [ ] Responsive layout using Ink's flexbox and terminal size hooks
  - [ ] Performance optimization with React.memo for heavy components

## Technical Architecture

### TUI Components Structure (Ink + React)
```
src/interfaces/tui/
├── components/                    # **React components for Ink**
│   ├── ConfigurationForm.tsx      # **Form-based configuration wizard**
│   ├── ConfigurationChoice.tsx    # **Initial configuration choice**
│   ├── ProgressNotification.tsx   # **Animated progress bars**
│   ├── CommandInput.tsx           # **Input with focus animations**
│   ├── StatusDisplay.tsx          # **Real-time status updates**
│   ├── ModelSelection.tsx         # **Model browsing with metadata**
│   ├── SystemDetection.tsx        # **CPU/GPU/RAM detection**
│   ├── AnimatedBullets.tsx        # **Claude Code-style bullets**
│   ├── LoadingSpinner.tsx         # **Smooth loading animations**
│   └── HelpSystem.tsx
├── screens/                       # **Full-screen React components**
│   ├── WelcomeScreen.tsx
│   ├── ConfigScreen.tsx
│   ├── MainScreen.tsx
│   └── ErrorScreen.tsx
├── hooks/                         # **Custom React hooks**
│   ├── useKeyboard.ts             # **Advanced keyboard handling**
│   ├── useAnimation.ts            # **Animation utilities**
│   ├── useTheme.ts                # **Color scheme management**
│   └── useProgress.ts             # **Progress tracking**
├── design/                        # **Design system**
│   ├── colors.ts                  # **Color palette definition**
│   ├── typography.ts              # **Text styles and spacing**
│   ├── animations.ts              # **Easing functions and timing**
│   └── theme.ts                   # **Overall design tokens**
├── navigation/
│   ├── KeyboardHandler.ts
│   ├── SlashCommands.ts
│   └── NavigationManager.ts
├── services/                      # **Backend integration services**
│   ├── HuggingFaceMetadata.ts     # **Model metadata from HF Hub**
│   ├── OllamaIntegration.ts       # **Ollama CLI management**
│   ├── SystemCapabilities.ts     # **Hardware detection**
│   └── ModelDownloader.ts         # **Download progress tracking**
└── TUIApplication.tsx             # **Main Ink app component**
```

### State Management
- Application state using reactive patterns
- Configuration state synchronization
- Progress tracking and updates
- Command history and context

### Error Handling
- Graceful degradation for missing features
- User-friendly error messages
- Recovery suggestions
- Fallback to CLI mode if TUI fails

## Visual Design System Implementation

**CRITICAL REQUIREMENT: Create Interactive Demo Before Development**

Before building the actual TUI interface, we MUST create a comprehensive visual demo showcasing all design elements from `docs/design/tui-visual-design.md`. This demo will serve as:

1. **Visual Proof of Concept** - Validate that our groundbreaking design works in practice
2. **Component Library** - Build reusable components that become the foundation
3. **Animation Testing** - Perfect timing, easing, and visual effects before integration
4. **Design Validation** - Ensure the interface is truly "jaw-dropping" and "silk smooth"

### Demo Requirements

**Interactive Showcase Application:**
```
src/demo/
├── visual-demo.tsx              # Main demo application
├── components/                  # All design system components
│   ├── AnimatedProgress.tsx     # Breathing progress bars
│   ├── InteractiveToggles.tsx   # Strikethrough disable animations
│   ├── ModernButtons.tsx        # Button state transitions
│   ├── FocusAnimations.tsx      # Focus ring and tab flow
│   ├── FormElements.tsx         # Input fields, dropdowns, radios
│   ├── LoadingStates.tsx        # Orbital, braille, spinner animations
│   ├── NotificationSystem.tsx   # Success, error, warning dialogs
│   └── SymbolLibrary.tsx        # Modern Unicode symbol showcase
├── animations/                  # Animation utilities
│   ├── breathing.ts             # Progress bar breathing logic
│   ├── transitions.ts           # State transition functions
│   ├── easing.ts               # Easing curve implementations
│   ├── timing.ts               # Animation timing coordination
│   └── resize.ts               # Responsive resize animations
└── styles/                     # Design system implementation
    ├── colors.ts               # Color palette with breathing variants
    ├── typography.ts           # Text styles and spacing
    ├── borders.ts              # Rounded border implementations
    ├── breakpoints.ts          # Responsive breakpoint definitions
    └── layout.ts               # Responsive layout utilities
```

**Demo Features to Implement:**
- [ ] **Live Animation Showcase** - Every animation from the design system running
- [ ] **Interactive Playground** - Click/keyboard to trigger all state changes
- [ ] **Timing Controls** - Speed up/slow down animations to perfect timing
- [ ] **Color Variations** - Test breathing effects with different color schemes
- [ ] **Component Isolation** - Each component demonstrates independently
- [ ] **Performance Testing** - Ensure animations are smooth at 60fps
- [ ] **Responsive Design Testing** - Real-time terminal resize with smooth adaptation
- [ ] **Layout Reflow Testing** - Components gracefully reorganize on size changes
- [ ] **Breakpoint Validation** - Test minimum, standard, and large terminal sizes

**Success Criteria for Demo:**
- [ ] **Jaw-Dropping Factor** - Interface feels more advanced than typical GUI apps
- [ ] **Silk Smooth Performance** - All animations run without stuttering
- [ ] **Component Reusability** - Every demo component can be directly used in main app
- [ ] **Visual Consistency** - Claude Code-level polish across all elements
- [ ] **Animation Perfection** - Timing and easing feel natural and professional
- [ ] **Responsive Excellence** - Layout adapts flawlessly to any terminal size
- [ ] **Resize Animations** - Smooth transitions during terminal size changes
- [ ] **Breakpoint Mastery** - Interface remains functional and beautiful at all sizes

### Implementation Priority

**IMMEDIATE NEXT TASK: Phase 0.5 Visual Demo (BEFORE Step 1)**

**CRITICAL:** Create comprehensive demo implementing ALL design elements from `docs/design/tui-visual-design.md`

This becomes our immediate priority that MUST be completed before starting the main TUI implementation:

### **Demo Implementation Checklist:**

**1. Complete Design System Implementation:**
- [ ] **Color palette** - All colors from design doc (#3B82F6, #06B6D4, #10B981, etc.)
- [ ] **Typography scale** - H1, H2, H3, Body, Small, Code styles
- [ ] **Modern Unicode symbols** - All groundbreaking symbols (⏵, ◦, ☑, ◉, ⚬⚭⚮, etc.)
- [ ] **Rounded borders** - Claude Code style borders (╭╮╰╯) for grouping and textboxes
- [ ] **Spacing grid** - 1u, 2u, 4u, 8u spacing system

**2. Interactive Navigation System:**
- [ ] **Vertical list navigation** - Predictable ↑↓ arrow key behavior
- [ ] **Hierarchical navigation** - → dive deeper, ← go back
- [ ] **Vibrant current position** - Cyan background (#06B6D4) for keyboard focus
- [ ] **Type-to-filter** - Real-time search boxes in long lists
- [ ] **Only 5 keys needed** - ↑↓←→ Enter Space Esc navigation

**3. Animation System:**
- [ ] **Breathing progress bars** - 2-second color cycling (base → bright → peak)
- [ ] **Interactive state animations** - Strikethrough disable, checkbox toggles
- [ ] **Focus transitions** - Smooth selection changes with color transitions
- [ ] **Loading states** - Orbital animations (⚬⚭⚮⚯), spinners, progress fills
- [ ] **Button state sequences** - ⏵ → ⟲ → ✓ animation chains

**4. Component Library:**
- [ ] **Borderless lists** - Clean selection with background colors only
- [ ] **Form fields** - Textboxes with borders, labels without borders
- [ ] **Checkbox/radio lists** - Smooth ☐→☑ and ◯→◉ transitions
- [ ] **Action selections** - Icon-based actions with color coding
- [ ] **Modal dialogs** - Grouped content with appropriate borders

**5. Responsive Design:**
- [ ] **Breakpoint system** - 80x24 (min), 120x30 (std), 160x50 (large)
- [ ] **Smooth resize animations** - Layout reflow during terminal size changes
- [ ] **Component adaptation** - Elements reorganize intelligently
- [ ] **Priority hiding** - Non-essential elements hide on narrow screens

**6. Advanced Features:**
- [ ] **Real-time filtering** - Search box appears on typing
- [ ] **Contextual hints** - Always show available keys for current state
- [ ] **State-driven interface** - Actions change based on current state
- [ ] **Error recovery** - Failed states with retry animations

**7. Performance & Polish:**
- [ ] **60fps animations** - Smooth performance across all interactions
- [ ] **Memory optimization** - Efficient component rendering
- [ ] **Terminal compatibility** - Works across different terminal emulators
- [ ] **Accessibility** - Screen reader compatible structure

### **Demo Validation Criteria:**
- [ ] **Every element** from `docs/design/tui-visual-design.md` works perfectly
- [ ] **Jaw-dropping factor** - Interface exceeds modern GUI standards
- [ ] **Silk smooth performance** - No stuttering or lag
- [ ] **Component reusability** - All components ready for production use

**Why This Is Critical:**
- **Prevents Rework** - Get animations right before integration
- **Validates Design** - Ensures our "groundbreaking" vision actually works
- **Creates Foundation** - Demo components become the actual app components
- **Perfects Timing** - Fine-tune all animation durations and easing
- **Builds Confidence** - Proves the interface will be genuinely impressive

**Demo Command:**
```bash
npm run demo:visual    # Launch interactive design system demo
npm run demo:record    # Record demo for documentation
```

## Testing Strategy
- **Visual Demo Testing** - Interactive validation of all design elements
- Unit tests for each TUI component
- Integration tests for user flows
- Manual testing for keyboard navigation
- Accessibility testing for screen readers
- **Animation Performance Testing** - Ensure smooth 60fps across terminals

## TUI Library Recommendation

**Recommended: Ink + React**

**Why Ink?**
- React-based components for familiar development patterns
- Excellent animation support through hooks and state management
- Built-in keyboard navigation and focus management
- Active community and great documentation
- Perfect for achieving Claude Code-level polish

**Alternative: Blessed** (if you prefer lower-level control)
- More manual but gives fine-grained control over animations
- Better performance for very complex UIs
- Steeper learning curve

**Installation:**
```bash
npm install ink react
npm install --save-dev @types/react
```

**✅ SELECTED: Ink + React** - Chosen for Claude Code-level polish and animation capabilities

## Success Criteria

### Phase 0.5: Visual Demo Success
- ✅ **Interactive design system demo** showcases every animation flawlessly
- ✅ **Jaw-dropping visual impact** - Interface exceeds modern GUI app standards
- ✅ **Silk smooth performance** - All animations run at consistent 60fps
- ✅ **Component library ready** - Every demo component is production-ready
- ✅ **Animation timing perfected** - All durations and easing curves feel natural
- ✅ **Modern Unicode symbols** render correctly across terminal environments
- ✅ **Breathing effects validated** - Progress bars create organic, living feel
- ✅ **Interactive states polished** - Strikethrough, focus, hover animations perfect
- ✅ **Responsive design mastered** - Layout adapts beautifully to any terminal size
- ✅ **Resize animations smooth** - Terminal size changes trigger graceful transitions
- ✅ **Breakpoint system validated** - Interface remains functional at all sizes
- ✅ **Component reflow perfect** - Elements reorganize intelligently on resize

### Main Implementation Success
- ✅ Full-screen TUI launches successfully **with smooth animations**
- ✅ Configuration wizard guides user through setup **with Claude Code-level polish**
- ✅ **CLI parameter validation at launch with embedding recreation warnings**
- ✅ **Form-based configuration with intelligent pre-selections**
- ✅ **System auto-detection works on target platforms (CPU/GPU/RAM)**
- ✅ **Model selection shows HuggingFace metadata and recommendations**
- ✅ **Ollama integration for model management**
- ✅ **BitNet support for weak machines**
- ✅ Slash commands provide full CLI functionality **with visual feedback**
- ✅ Progress bars show real-time status **with smooth animations including model downloads and embedding generation**
- ✅ MCP server integrates seamlessly
- ✅ Keyboard navigation is intuitive and complete **with focus animations**
- ✅ **UI feels as polished and responsive as Claude Code interface**
- ✅ **Interface is genuinely groundbreaking** - Sets new standard for terminal applications