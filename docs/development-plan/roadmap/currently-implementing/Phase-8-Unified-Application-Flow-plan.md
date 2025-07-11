# Phase 8: Unified Application Flow Implementation Plan

**Status**: 🚧 IN PROGRESS  
**Start Date**: 2025-07-08  
**Approach**: Dynamic/Exploratory - Tasks defined as discovered  

## 🎯 **Phase Overview**

Create a unified application flow that combines the GUI, daemon control, and all existing components into a cohesive, production-ready application.

## 🌟 **The Vision: Complete User Journey**

### **1. Simple Installation**
```bash
npm install -g folder-mcp
```
One command installs everything globally - the `folder-mcp` command becomes available system-wide.

### **2. Intelligent First Run**
When a new user runs `folder-mcp` for the first time:
```
$ folder-mcp

Welcome to folder-mcp! 🎉
Let's set up your knowledge base.

Step 1: Choose a folder to index
> 📁 ~/Documents/MyProject

Step 2: Select embedding model
> 🤖 Auto-detect (recommended)
  ○ Transformers.js (offline, fast)
  ○ Ollama (high quality, requires Ollama)

Step 3: Content language
> 🌍 English (auto-detected)

Step 4: Auto-start on system boot?
> ◉ Yes (recommended)
  ○ No

[Start Indexing] [Advanced Options]
```

The wizard intelligently:
- Detects available models (Ollama, GPU capabilities)
- Analyzes folder content to suggest language
- Configures auto-start within the app
- Uses smart defaults for everything

### **3. Daily Use - Visual Interface**
On subsequent runs, users see the full TUI:
```
$ folder-mcp

╭─────────────────────────────────────────────── folder-mcp ──╮
│ 📁 Status: Connected to daemon (PID: 12345)                │
╰──────────────────────────────────────────────────────────────╯

Indexed Folders:
→ ~/Documents/MyProject    15,234 files • 2.3GB • English
  ~/Work/ClientDocs         8,456 files • 1.1GB • Mixed

[a]dd folder  [r]emove  [s]earch  [q]uit
```

### **4. Power User Mode**
Advanced users can bypass the TUI entirely:
```bash
# Add current directory with auto-detection
folder-mcp --headless

# Add specific folder
folder-mcp --headless -f ~/Documents

# Full control
folder-mcp add ~/Work --model ollama:codellama --language en
```

### **Key Principles**
- **Zero Configuration**: Smart defaults for everything
- **Progressive Disclosure**: Simple for beginners, powerful for experts  
- **Offline First**: Works without internet via Transformers.js
- **Intelligent Defaults**: Auto-detect models, languages, and settings
- **Seamless Experience**: From installation to daily use

### **Core Goals**
- **Unified Entry Point**: Single `folder-mcp` command that intelligently routes to appropriate interface
- **Seamless Integration**: All components work together as one cohesive system
- **Production Polish**: Handle edge cases, errors, and unexpected states gracefully
- **User Experience**: Intuitive flow from installation to daily use
- **Real-time Feedback**: Users see immediate results of their actions
- **Persistent Service**: Daemon architecture that survives TUI sessions

### **Success Criteria**
- Single command launches complete experience
- All components integrated and communicating
- Graceful error handling throughout
- Clear user feedback for all operations
- Production-ready stability

## 🏗️ **Implementation Strategy**

### **Dynamic Task Discovery**
This phase uses an exploratory approach where tasks are discovered and documented as we progress through the integration work. Each task will be added to this document as it's identified, creating a living record of the unification process.

### **Core Philosophy: Bottom-Up Incremental Development**

**Our Proven Approach:**
1. **Start with Simple User Flows**: Begin with one concrete user need (e.g., "set a folder")
2. **Implement Across All Interfaces**: Build the same flow in wizard, CLI, and TUI
3. **Let Needs Emerge Naturally**: This reveals shared requirements and patterns
4. **Build Reusable Components**: Create properly designed solutions (e.g., GenericListPanel, ValidationRegistry)
5. **Unify When Patterns Are Clear**: Only after frontend patterns solidify, carefully bridge to backend

**What We've Built So Far:**
- ✅ **Solid MCP Proof of Concept**: Working server with embeddings and tested endpoints
- ✅ **Robust TUI Framework**: Responsive, modern terminal UX with reusable components
- ✅ **Unified Configuration Frontend**: Single source of truth for validation and config access

**Why This Works:**
- **No Premature Abstraction**: We don't guess what we'll need - we build what users actually do
- **Natural Component Discovery**: Real use cases reveal the right abstractions
- **Stable Foundation**: Each layer is solid before building the next
- **Safe Progress**: Small steps mean we can always verify things work

**Current State:**
- Frontend configuration is unified (wizard → CLI → TUI all use ConfigurationComponent)
- Backend still uses HybridConfigLoader (and that's OK for now!)
- Next: Build more user flows to understand backend integration needs

## 🚨 **PHASE 8 WORKING RULES**

### 1. **DELETE, DON'T MIGRATE**
- We are pre-production - no migration plans needed
- Replace old functionality completely
- Delete obsolete code immediately
- We are not a code museum!

### 2. **ZERO TECHNICAL DEBT**
- NO mockups
- NO stubs
- NO simulations
- NO "TODO"s in the code
- Implement it properly or don't implement it at all

### 3. **ALL TESTS MUST PASS**
- `npm test` must always show 100% passing
- If a test fails:
  - Irrelevant test? DELETE IT
  - Relevant test? FIX THE CODE
- No skipped tests, no commented tests

### 4. **MAINTAIN ARCHITECTURE**
- Every task respects module boundaries
- Proper dependency injection throughout
- No shortcuts that break clean architecture
- Domain/Application/Infrastructure/Interface separation

### 5. **COMMIT ONLY WHEN INSTRUCTED**
- During Phase 8, only commit when explicitly told to
- Work can accumulate across multiple tasks
- User will indicate when to create commits
- This allows for more flexible experimentation

## 📋 **Dynamic Task List**

*Tasks will be added here as they are discovered during implementation*

### Discovered Tasks:

#### Task 1: Simplify TUI Entry Point
**Status**: ✅ Completed  
**Discovered**: 2025-07-08  
**What**: Create a single, unified TUI entry point instead of multiple screen-specific commands.

**Why**: The TUI had evolved to have separate commands for each screen (config, status, folders, wizard), creating confusion about where to start. A unified entry point provides a clear starting place for users.

**Subtasks**:
- [x] Remove multiple TUI commands from package.json
- [x] Remove command-line argument parsing for screen selection
- [x] Move existing content from MainPanel to SecondaryPanel
- [x] Prepare MainPanel for new unified interface
- [x] Remove header animation (test code cleanup)

**Result**: Users now have one command (`npm run tui`) that launches the full interface, with navigation handled within the application rather than through different commands.

#### Task 2: Create Daemon Architecture (Framework First)
**Status**: ✅ Completed  
**Discovered**: 2025-07-08  
**What**: Create minimal daemon + TUI architecture without changing existing functionality.

**Why**: We need the framework in place before adding features. Starting with minimal changes ensures we don't break existing functionality while establishing the foundation for all future features.

**Design Reference**: [Unified Application Architecture](../../../design/unified-app-architecture.md)

**Subtasks**:
- [ ] Create `src/daemon/index.ts` entry point
- [ ] Move MCP server logic to daemon process
- [ ] Update MCP endpoints to use folder paths instead of names for identification
- [ ] Implement basic PID file management (`~/.folder-mcp/daemon.pid`)
- [ ] Add `folder-mcp --daemon` command to start daemon
- [ ] Add basic HTTP server to daemon (port 9876) with `/health` endpoint
- [ ] Modify TUI to detect running daemon via PID file
- [ ] Show connection status in TUI header
- [ ] Keep all existing MCP functionality unchanged

**Success Criteria**:
```bash
# Terminal 1
folder-mcp --daemon  # Starts daemon in background
ps aux | grep folder-mcp  # Shows running daemon process

# Terminal 2
npm run tui  # Shows "Connected to daemon (PID: 12345)" in header
```

#### Task 3: Minimal First-Run Wizard
**Status**: ✅ Completed  
**Discovered**: 2025-07-08  
**What**: Simple wizard that uses existing functionality to onboard new users.

**Why**: Users need guidance on first run, but we'll keep it minimal initially - just folder selection and use existing Ollama model.

**Subtasks**:
- [x] Detect if `~/.folder-mcp/config.json` exists
- [x] Show simple wizard screen: "Welcome! Select a folder to index"
- [x] Use folder selection dialog (can reuse existing components)
- [x] Create config with selected folder and current defaults
- [x] Start indexing with existing Ollama integration
- [x] Transition to main TUI after setup

**Implementation Details**:
- Created `FirstRunWizard` component with 2-step setup process
- Added config detection logic in main TUI entry point
- Implemented folder path input with real-time editing
- Added visual feedback for wizard completion
- Created config file creation with proper error handling

**Success Criteria**:
```bash
rm -rf ~/.folder-mcp
folder-mcp  # Shows wizard
# Select folder → Indexes with Ollama → Shows TUI
```

**Task Completion Protocol**:
- [x] Mark progress on this document
- [x] Summarize what was done and describe UX testing
- [x] Wait for confirmation before commit

**UX Testing Instructions**:
1. Remove existing config: `rm -rf ~/.folder-mcp`
2. Run TUI: `npm run tui`
3. Should see first-run wizard with folder selection
4. Type folder path and press Enter
5. Should see confirmation screen, press Enter again
6. Should see "setup complete" message then transition to main TUI
7. Run again: `npm run tui` - should skip wizard and go straight to main TUI

#### Task 3.1: Enhance Wizard with File Picker Component
**Status**: ✅ Completed  
**Discovered**: 2025-07-08  
**What**: Replace basic text input with proper file picker component for folder selection.

**Why**: The current wizard uses basic text input which is not user-friendly. We have excellent file picker components available that provide visual navigation and proper UX.

**Requirements**:
- Use existing FilePickerListItem component inside BorderedBox
- Smart defaults based on environment:
  - Dev mode (`FOLDER_MCP_DEVELOPMENT_ENABLED=true`): Default to `tests/fixtures/test-knowledge-base`
  - CLI `-f` parameter: Use provided folder and skip wizard question
  - Otherwise: Use current working directory as default
- Display selected folder config in main panel after selection
- DO NOT connect to MCP server or start embeddings yet

**Subtasks**:
- [x] Update Phase 8 document with this task
- [x] Import FilePickerListItem and BorderedBox components
- [x] Implement smart default folder logic
- [x] Replace text input with file picker in wizard
- [x] Test all three default scenarios
- [x] Add config display to main panel (after wizard completion)

**Implementation Details**:
- Enhanced FirstRunWizard component with FilePickerListItem integration
- Implemented smart default folder logic with environment detection
- Added visual file picker using BorderedBox container
- Supports all three default scenarios: normal mode, dev mode, and CLI -f parameter
- File picker provides full navigation with folder browsing capabilities
- Auto-advances to confirmation step after folder selection

**Task Completion Protocol**:
- [x] Mark progress on this document
- [x] Summarize what was done and describe UX testing
- [x] Wait for confirmation before commit

**UX Testing Instructions**:
1. **Normal mode**: `rm -rf ~/.folder-mcp && npm run tui`
   - Should default to current working directory (/Users/hanan/Projects/folder-mcp)
   - Press Enter to browse folders visually
   - Press Space to continue with default folder

2. **Dev mode**: `rm -rf ~/.folder-mcp && FOLDER_MCP_DEVELOPMENT_ENABLED=true npm run tui`
   - Should default to tests/fixtures/test-knowledge-base
   - Same navigation options as normal mode

3. **CLI -f parameter**: `rm -rf ~/.folder-mcp && npm run tui -- -f /custom/path`
   - Should default to /custom/path
   - Same navigation options as normal mode

All scenarios show the selected folder in the confirmation step and create the config file properly.

#### Task 3.2: Fix Wizard Stability Issues
**Status**: ✅ Completed  
**Discovered**: 2025-07-08  
**What**: Fix undefined value handling in wizard step navigation.

**Why**: The wizard was crashing when navigating between steps due to undefined values in the selection arrays.

**Issue**: When using GenericListPanel with radio mode, the selected values array could contain undefined values, causing the wizard to crash when trying to auto-advance to the next step.

**Subtasks**:
- [x] Add defensive checks for undefined values in model selection
- [x] Add defensive checks for undefined values in language selection
- [x] Test wizard stability with rapid navigation

**Implementation Details**:
- Added `values[0] !== undefined` checks before using selected values
- Prevents crashes when quickly navigating through wizard steps
- Ensures stable operation even with rapid keyboard input

**Task Completion Protocol**:
- [x] Mark progress on this document
- [x] Summarize what was done
- [x] Wait for confirmation before commit

**Testing**: The wizard now handles rapid navigation without crashes, properly checking for valid values before proceeding to the next step.

#### Task 4: Fix Configuration System Unity
**Status**: ✅ Completed  
**Discovered**: 2025-07-09  
**What**: Unify the wizard and main app configuration systems to use the same storage mechanism.

**Why**: Currently wizard saves to `~/.folder-mcp/config.json` but main app reads from `config.yaml`. This creates a broken UX where first-run configuration is lost on subsequent runs.

**Problem Analysis**:
- **Two separate config systems**: Wizard uses JSON at `~/.folder-mcp/config.json`, main app uses YAML at `config.yaml`
- **Data flow broken**: First run passes config object directly, second run falls back to sample data
- **No persistence**: Wizard configuration never reaches main app's config system

**Subtasks**:
- [x] **Connect wizard to unified config system**: Make wizard save to the same location main app reads from
- [x] **Update config file location**: Configure main app to read from `~/.folder-mcp/config.yaml` instead of `config.yaml`
- [x] **Test configuration persistence**: Verify wizard config survives across runs
- [x] **Remove duplicate config logic**: Clean up separate JSON config mechanism

**Implementation Summary**:
- Updated wizard to use unified ConfigManager with `~/.folder-mcp/config.yaml`
- Connected main app to read from same unified configuration system
- Replaced manual JSON config creation with proper ConfigManager integration
- Fixed config passing through component hierarchy
- All validation and config access now goes through single source of truth

**Success Criteria**:
```bash
# First run - wizard saves config
rm -rf ~/.folder-mcp && folder-mcp  # Select folder in wizard

# Second run - main app reads saved config
folder-mcp  # Shows same folder and config from wizard, no sample data
```

**Task Completion Protocol**:
- [x] Mark progress on this document
- [x] Summarize what was done and describe UX testing
- [x] Wait for confirmation before commit

#### Task 4.1: Create ValidationRegistry as Single Source of Truth
**Status**: ✅ Completed  
**Discovered**: 2025-07-09  
**What**: Create centralized validation registry that serves as single source of truth for all configuration validation rules.

**Why**: Validation logic was scattered across TUI, CLI, and config files with potential inconsistencies. ValidationRegistry centralizes all validation rules to ensure consistency.

**Key Components**:
- **ValidationRegistry**: Central registry with all validation rules
- **Path-based validation**: Rules registered by configuration path (e.g., 'user.email', 'server.port')
- **TUI integration**: Direct integration with existing TUI validators
- **CLI integration**: Same validation rules apply to CLI configuration setting

**Implementation Details**:
- Created `src/config/ValidationRegistry.ts` with comprehensive validation rules
- Fixed email validation bug: Updated regex from `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` to `/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/`
- Integrated with existing TUI validators via `getTuiValidators()` method
- Added support for array paths (e.g., `folders.list[].path`)
- Comprehensive test coverage with failing-then-passing test approach

**Validation Rules Centralized**:
- Theme validation (auto, light, dark)
- Folder path validation (must exist)
- Embedding model validation (supported models)
- Batch size validation (1-1000)
- Server port validation (1000-65535)
- Server host validation (IP or localhost)
- Email validation (strict regex)

**Task Completion Protocol**:
- [x] Mark progress on this document
- [x] Create ValidationRegistry implementation
- [x] Fix email validation bug
- [x] Test validation with failing then passing tests
- [x] Wait for confirmation before commit

#### Task 4.2: Expand ConfigurationComponent as Unified Interface
**Status**: ✅ Completed  
**Discovered**: 2025-07-09  
**What**: Expand ConfigurationComponent to become the single source of truth for both validation AND configuration access.

**Why**: ValidationRegistry solved validation centralization, but configuration ACCESS is still scattered across TUI, CLI, wizard, and other systems. ConfigurationComponent needs to become the unified interface.

**Architecture Implemented**:
```
ConfigurationComponent (Unified Interface)
├── ValidationRegistry (validation rules)
├── ConfigManager (storage mechanism)
├── DI Container (dependency injection)
├── Event System (observers + compatibility)
└── Unified API (get/set/validate/bulk operations)
```

**Subtasks**:
- [x] **Expand ConfigurationComponent API**: Add comprehensive get/set methods for all config paths
- [x] **Create type-safe interfaces**: Define TypeScript interfaces for all configuration sections
- [x] **Add bulk operations**: Support for getting/setting multiple config values at once
- [x] **Integrate with DI system**: Make ConfigurationComponent available through dependency injection
- [x] **Create configuration observers**: Allow components to watch for configuration changes
- [x] **Add configuration defaults**: Centralized default values for all configuration paths
- [x] **Add backward compatibility**: Event system and legacy method support

**Implementation Summary**:
- Expanded ConfigurationComponent with comprehensive API (get/set/validate/bulk/observers)
- Added event system for configuration changes with backward compatibility
- Added default values management for all configuration paths
- Integrated with DI container for application-wide availability
- Added file system operations (reset, hasConfigFile, getConfigFilePath)

**Success Criteria**: ✅ All Achieved
- All TUI components access config through ConfigurationComponent
- All CLI commands access config through ConfigurationComponent  
- All wizard steps access config through ConfigurationComponent
- No direct ConfigManager access outside of ConfigurationComponent
- Single source of truth for both validation and configuration access

#### Task 4.3: Replace Scattered Configuration Access Across TUI Components
**Status**: ✅ Completed  
**Discovered**: 2025-07-09  
**What**: Replace all direct ConfigManager usage in TUI components with unified ConfigurationComponent.

**Implementation Summary**:
- Updated main TUI entry point (`src/interfaces/tui-ink/index.tsx`)
- Updated FirstRunWizard to use ConfigurationComponent
- Updated ConfigurableThemeService to use ConfigurationComponent
- Fixed all TUI-related tests to use new system
- Added async initialization support for theme service

#### Task 4.4: Replace CLI Configuration Access
**Status**: ✅ Completed  
**Discovered**: 2025-07-09  
**What**: Replace direct ConfigManager usage in CLI commands with unified ConfigurationComponent.

**Implementation Summary**:
- Updated simple-config.ts to use ConfigurationComponent
- Advanced config.ts was already using ConfigurationComponent
- All CLI validation now goes through ValidationRegistry
- Removed manual validation code in favor of unified system

#### Task 4.5: Replace Wizard Configuration Access
**Status**: ✅ Completed  
**Discovered**: 2025-07-09  
**What**: Replace direct ConfigManager usage in wizard with unified ConfigurationComponent.

**Implementation Summary**:
- FirstRunWizard now uses ConfigurationComponent for all config operations
- Proper validation and error handling integrated
- Configuration persistence works correctly across wizard sessions

#### Task 4.6: Eliminate Direct ConfigManager Access Outside ConfigurationComponent
**Status**: ✅ Completed  
**Discovered**: 2025-07-09  
**What**: Remove all remaining direct ConfigManager usage throughout the codebase.

**Implementation Summary**:
- Updated DI setup to inject ConfigurationComponent where needed
- Fixed FolderManager and FolderValidator to use ConfigurationComponent
- Added backward compatibility methods to ConfigurationComponent
- Added compatibility tokens for old systems
- All tests passing (75/75 files, 844/844 tests)

**Critical Discovery**: Frontend configuration is now fully unified, but **backend services still use HybridConfigLoader**. This creates a disconnect where user configuration doesn't affect backend functionality.

#### Task 4.7: Complete Folder Configuration Flow from All Directions
**Status**: ✅ Completed  
**Discovered**: 2025-07-09  
**What**: Complete the folder configuration flow from all entry points, including proper -d parameter integration with read-only wizard display.

**Why**: Folder configuration is the critical foundation for everything else. By perfecting this one flow across all interfaces (wizard, CLI, TUI), we establish patterns for all other configuration items. The TUI is fundamentally about configuration management - get this right and everything else follows.

**Implementation Approach**: Following user guidance on TDD (Test-Driven Development) for CLI bypasses that affect TUI behavior.

**Implementation Summary**:
1. **CLI -d Parameter Integration**:
   - [x] Created comprehensive TDD tests for CLI -d parameter functionality
   - [x] Enhanced ValidationRegistry to validate folders are directories (not just files)
   - [x] Fixed ConfigurationComponent to properly convert ValidationRegistry interface to IConfigManager interface
   - [x] Updated FirstRunWizard to detect and skip folder selection when valid -d parameter provided
   - [x] All build errors and test failures fixed (867/867 tests passing)
   
2. **Test-Driven Development Results**:
   - Created `tests/unit/interfaces/folder-mcp-cli.test.ts` with full coverage
   - Tests validate parameter passing, wizard behavior, and edge cases
   - Fixed interface mismatch between ValidationRegistry (`isValid`) and IConfigManager (`valid`)
   - Enhanced folder validation to check if path is directory using `statSync`
   
3. **Zero Tolerance for Errors**:
   - Fixed all TypeScript compilation errors
   - Fixed all failing tests by updating to correct interfaces
   - Achieved 100% test success rate (867 passing tests)
   - Build completes successfully with no errors

**Key Technical Improvements**:
- ValidationRegistry now checks if folder path is a directory:
  ```typescript
  const stat = statSync(value);
  return stat.isDirectory();
  ```
- ConfigurationComponent properly converts validation results:
  ```typescript
  return { valid: registryResult.isValid };  // Convert interface
  ```
- FirstRunWizard gracefully handles pre-configured folders

**Success Criteria**: ✅ All Achieved
```bash
# CLI pre-configuration works
folder-mcp -d /valid/folder    # Wizard skips folder selection step

# Invalid folder shows proper error
folder-mcp -d /path/to/file.txt  # Error: Path is not a directory

# All tests pass
npm test  # 867/867 tests passing
npm run build  # Build succeeds with no errors
```

**Task Completion Protocol**:
- [x] Implement -d parameter integration with wizard using TDD
- [x] Fix all build and test failures
- [x] Document implementation approach
- [x] Mark progress on this document

#### Task 4.8: Multi-Folder Configuration
**Status**: ✅ IMPLEMENTATION COMPLETE - READY FOR TESTING  
**Discovered**: 2025-07-10  
**What**: Implement clean multi-folder support by extending the unified configuration system with `-d` and `-m` CLI parameters and folder management.

#### Task 4.8.5: Implement ButtonsRow List Item Component
**Status**: ✅ COMPLETED  
**Discovered**: 2025-07-11  
**What**: Design and implement a new ButtonsRow list item component that displays an array of interactive buttons with colored borders and ANSI text support.

**Why**: Need a reusable component for action buttons in TUI interfaces, with responsive design that adapts between regular mode (bordered boxes) and short vertical mode (compact layout). This will be used for confirmation dialogs, action panels, and other interactive elements.

**Requirements**:
- **Always open**: ButtonsRow is never collapsed
- **Responsive design**: 
  - Regular mode (≥25 rows): Bordered boxes with colored corners
  - Low resolution mode (`isLowResolution = rows < 25`): Compact bracket layout
- **Button properties**: name, border-color, text (with ANSI support), event value
- **Focus indicators**: Selection blue corners (╔╚╗╝) in regular mode, ▶ arrow in low resolution mode
- **Colorful text**: Full ANSI escape sequence support in button text
- **Alignment support**: left, right, center alignment for button row layout

**Design Specifications**:
```typescript
interface ButtonConfig {
  name: string;           // Internal identifier
  borderColor: string;    // Color for button border
  text: string;          // Display text (supports ANSI)
  eventValue: any;       // Value returned when button activated
}

interface ButtonsRowConfig {
  buttons: ButtonConfig[];
  align?: 'left' | 'right' | 'center';  // Row alignment (default: left)
}
```

**Visual Examples**:

**Regular Mode (rows ≥ 25)**:
```
╔─────────╗  ╭──────────╮
│ √Accept │  │ ✗ Decline│
╚─────────╝  ╰──────────╯
```
- Buttons have colored borders (borderColor property)
- Selection blue corners (╔╚╗╝) for focused button
- Unicode box drawing characters for borders

**Low Resolution Mode (isLowResolution = rows < 25)**:
```
Focused button:    [▶cancel ] [ Save ]
Not focused:       [ Cancel ] [ Save ]
```
- Compact bracket layout saves vertical space
- ▶ arrow indicates focused button
- Single line layout

**Implementation Subtasks**:
- [x] Create ButtonsRow component implementing IListItem directly (action item pattern)
- [x] Implement responsive layout detection (`isLowResolution = rows < 25`)
- [x] Add button rendering for both regular mode (bordered boxes) and low resolution mode (compact brackets)
- [x] Integrate theme colors for selection blue highlighting (theme.colors.accent)
- [x] Add keyboard navigation: left/right for buttons (circular), up/down for list navigation, enter/space for activation
- [x] Support ANSI text rendering with Transform wrapper to prevent spacing issues
- [x] Add alignment support (left/right/center) for button row layout
- [x] Test component in both visual modes (added to demo configuration panel with ANSI colored buttons)

**Implementation Details**:
- **File**: `src/interfaces/tui-ink/components/core/ButtonsRow.tsx`
- **Base Class**: Implements `IListItem` directly (action item pattern, not ValidatedListItem)
- **Layout Detection**: Uses `useStdout().rows < 25` pattern from existing components
- **Keyboard Flow**: Always open item with internal button focus management
  - Item focused → first button focused automatically
  - Left/Right: Navigate between buttons (circular)
  - Up/Down: Exit to normal list navigation
  - Enter/Space: Activate focused button
- **Visual Modes**:
  - Regular: Unicode box drawing with colored borders
  - Low resolution: Compact bracket layout with ▶ focus indicator
- **Theme Integration**: Uses `theme.colors.accent` for selection highlighting
- **ANSI Support**: Transform wrapper prevents Ink spacing issues with escape sequences

**Why**: After perfecting single folder configuration, users need to manage multiple folders with different models. This creates the foundation for folder isolation and proper embedding model selection per content type.

## Multi-Folder Application Flow

```
1. User runs folder-mcp
2. With CLI params?
   ├─ No → First run? → Wizard : Main App
   └─ Yes → Validate params
       ├─ Validation fails → Exit with error (daemon keeps running)
       └─ Validation passes → Both params?
           ├─ Both -d and -m → Add folder, show Main App
           └─ Only one param → Auto-complete + confirmation → Add folder, show Main App
```

**Auto-completion Logic**:
- If only `-d` provided: Use default model (e.g., `nomic-embed-text`)
- If only `-m` provided: Use current working directory as path

**Configuration Storage**:
Store folders as simple array in `config.yaml`:
```yaml
folders:
  list:
    - path: "/Users/hanan/Documents"
      model: "nomic-embed-text"
    - path: "/Users/hanan/Projects" 
      model: "codebert-base"
```

**Model Options** (3-5 supported + ollama pattern):
- `nomic-embed-text` (default)
- `all-mpnet-base-v2` (general purpose)
- `all-MiniLM-L6-v2` (lightweight)
- `codebert-base` (code-specific)
- `mxbai-embed-large` (high quality)
- `ollama:*` pattern for power users

**Main App Display**:
Show configured folders using existing ConfigurationItem components:
```
Configured Folders:
┌─────────────────────────────────────┐
│ folder 1 path: /Users/hanan/Documents │
│ folder 1 model: nomic-embed-text      │
│ folder 2 path: /Users/hanan/Projects  │ 
│ folder 2 model: codebert-base         │
└─────────────────────────────────────┘
```

**Implementation Subtasks**:
- [x] **CLI Parameter Handling**: Add `-m, --model <model>` flag with validation
- [x] **Model Validation**: Add model validation rules to ValidationRegistry 
- [x] **Configuration Integration**: Extend ConfigurationComponent with folder array methods
- [x] **TUI Wizard Updates**: Add model selection using existing SingleChoice component
- [ ] **Main App Display**: Show folders using existing ConfigurationItem components (deferred)
- [x] **Auto-completion Logic**: Implement smart parameter completion with confirmation prompts

**Implementation Summary**:
1. **CLI Parameters**: Extended `folder-mcp.ts` to support `-m, --model <model>` flag alongside existing `-d, --dir <path>` flag
2. **Model Validation**: Added comprehensive model validation to ValidationRegistry with 8 supported models including ollama pattern
3. **Configuration Management**: Extended ConfigurationComponent with full folder array CRUD operations following proper schema
4. **Auto-completion Handler**: Created new AutoCompletionHandler component with confirmation prompts for partial parameters
5. **TUI Integration**: Updated TUI entry point and FirstRunWizard to handle model parameters and auto-completion flow
6. **Schema Compliance**: All configuration follows proper FolderConfig schema with embeddings.model structure

**Files to Modify**:
1. `src/interfaces/cli/folder-mcp.ts` - Add -m flag and decision tree logic
2. `src/config/ValidationRegistry.ts` - Add folder path + model validation rules
3. `src/config/ConfigurationComponent.ts` - Add folder array management methods
4. `src/interfaces/tui-ink/components/FirstRunWizard.tsx` - Add model selection
5. Main app component - Display folders using ConfigurationItem

**Success Criteria**:
```bash
# Both parameters - direct add
folder-mcp -d ~/Documents -m nomic-embed-text

# Single parameter - auto-complete with confirmation
folder-mcp -d ~/Documents  # Prompts: "Use default model 'nomic-embed-text'? (Y/n)"
folder-mcp -m codebert-base  # Prompts: "Add current directory? (Y/n)"

# Validation errors
folder-mcp -d /nonexistent  # Error: Directory does not exist
folder-mcp -m invalid-model  # Error: Model not supported

# TUI shows configured folders
folder-mcp  # Displays folder list with paths and models
```

## Human QA Testing Process

### Pre-Testing Setup
```bash
# Clean slate for testing
rm -rf ~/.folder-mcp
npm run build
```

### Test Scenario 1: First Run Without Parameters
**Expected Flow**: Wizard → Folder selection → Model selection → Main App

**Test Steps**:
1. Run `folder-mcp` (no parameters)
2. Should show first-run wizard
3. Select a folder using file picker
4. Select a model from list (5 options + ollama pattern)
5. Should create config.yaml with folder/model pair
6. Should show main app with configured folder displayed

**Validation Points**:
- [ ] Wizard appears on first run
- [ ] Folder picker works correctly
- [ ] Model selection shows all 5 models + ollama option
- [ ] Config file created at `~/.folder-mcp/config.yaml`
- [ ] Main app shows folder with correct path and model
- [ ] Second run skips wizard and goes to main app

### Test Scenario 2: Both CLI Parameters
**Expected Flow**: Validate → Add folder → Main App

**Test Steps**:
1. Run `folder-mcp -d ~/Documents -m nomic-embed-text`
2. Should validate both parameters
3. Should add folder to config immediately
4. Should show main app with folder displayed

**Validation Points**:
- [ ] No wizard shown
- [ ] Folder added to config.yaml
- [ ] Main app shows correct folder and model
- [ ] No confirmation prompts (user knows what they're doing)

### Test Scenario 3: Single Parameter - Folder Only
**Expected Flow**: Validate → Auto-complete → Confirm → Add folder → Main App

**Test Steps**:
1. Run `folder-mcp -d ~/Projects`
2. Should validate folder exists
3. Should prompt: "Use default model 'nomic-embed-text'? (Y/n)"
4. Confirm with 'Y'
5. Should add folder with default model
6. Should show main app

**Validation Points**:
- [ ] Folder validation works
- [ ] Auto-completion prompt appears
- [ ] Confirmation saves to config
- [ ] Main app shows folder with default model

### Test Scenario 4: Single Parameter - Model Only  
**Expected Flow**: Validate → Auto-complete → Confirm → Add folder → Main App

**Test Steps**:
1. Run `folder-mcp -m codebert-base` from ~/Projects directory
2. Should validate model is supported
3. Should prompt: "Add current directory '~/Projects' with model 'codebert-base'? (Y/n)"
4. Confirm with 'Y'
5. Should add current directory with specified model

**Validation Points**:
- [ ] Model validation works
- [ ] Current directory detected correctly
- [ ] Confirmation prompt shows both path and model
- [ ] Config updated correctly

### Test Scenario 5: Validation Errors
**Expected Flow**: Show error → Exit CLI → Daemon continues running

**Test Steps**:
1. Run `folder-mcp -d /nonexistent/path`
2. Should show error: "Directory does not exist"
3. CLI should exit with error code
4. Daemon should continue running (if started)

**Test Steps for Model Error**:
1. Run `folder-mcp -m invalid-model-name`
2. Should show error: "Model not supported. Supported models: [list]"
3. CLI should exit with error code

**Validation Points**:
- [ ] Clear, helpful error messages
- [ ] CLI exits with proper error code
- [ ] Daemon isolation (doesn't crash daemon)
- [ ] Error messages suggest valid alternatives

### Test Scenario 6: Multiple Folders
**Expected Flow**: Add multiple folders → Display in main app

**Test Steps**:
1. Run `folder-mcp -d ~/Documents -m nomic-embed-text`
2. Run `folder-mcp -d ~/Projects -m codebert-base`
3. Run `folder-mcp` (no params)
4. Should show main app with both folders listed

**Validation Points**:
- [ ] Multiple folders stored in config.yaml
- [ ] Each folder has correct model
- [ ] Main app displays all folders
- [ ] No conflicts between folders

### Test Scenario 7: Ollama Model Pattern
**Expected Flow**: Validate ollama pattern → Add folder → Main App

**Test Steps**:
1. Run `folder-mcp -d ~/Code -m ollama:codellama`
2. Should validate ollama pattern (starts with "ollama:")
3. Should add folder with ollama model
4. Should show in main app

**Validation Points**:
- [ ] Ollama pattern validation works
- [ ] Model stored correctly as "ollama:codellama"
- [ ] Main app displays ollama model properly

### Test Scenario 8: Deleted Folder Handling
**Expected Flow**: Detect missing folder → Show warning → Continue gracefully

**Test Steps**:
1. Add folder: `folder-mcp -d ~/temp-test -m nomic-embed-text`
2. Delete folder: `rm -rf ~/temp-test`
3. Run `folder-mcp`
4. Should detect missing folder gracefully

**Validation Points**:
- [ ] Missing folder detected
- [ ] Warning message shown (not crash)
- [ ] Other folders still work
- [ ] Option to remove missing folder from config

### Test Scenario 9: Deleted Ollama Model
**Expected Flow**: Detect missing model → Show warning → Continue gracefully

**Test Steps**:
1. Add folder: `folder-mcp -d ~/test -m ollama:nonexistent-model`
2. Run `folder-mcp`
3. Should detect that ollama model doesn't exist
4. Should show warning but continue

**Validation Points**:
- [ ] Missing ollama model detected
- [ ] Warning message shown
- [ ] Application doesn't crash
- [ ] Other folders with valid models still work
- [ ] Option to fix or remove problematic folder

### Test Scenario 10: Configuration Persistence
**Expected Flow**: Config survives app restarts

**Test Steps**:
1. Add multiple folders through various methods
2. Close application
3. Run `folder-mcp` again
4. Should show same configuration

**Validation Points**:
- [ ] Config file persists between runs
- [ ] All folders displayed correctly
- [ ] No data loss
- [ ] Configuration integrity maintained

**Task Completion Protocol**:
- [ ] Implement all CLI parameter handling
- [ ] Add model validation to ValidationRegistry
- [ ] Extend ConfigurationComponent for folder arrays
- [ ] Update FirstRunWizard with model selection
- [ ] Create main app folder display
- [ ] Complete all 10 QA test scenarios
- [ ] Fix any bugs discovered during testing
- [ ] Mark progress on this document
- [ ] Wait for confirmation before commit

#### Task 5: Integrate -d Parameter with Unified Config System
**Status**: ⏳ Waiting  
**Discovered**: 2025-07-09  
**Dependencies**: ⚠️ **BLOCKED BY Task 4.7** - Backend must be connected to unified config first
**What**: Properly integrate `-d` parameter with the unified configuration system for seamless folder addition.

**Why**: The `-d` parameter should "add a folder to MCP" and integrate with the wizard flow by answering the first question and showing CLI parameters as read-only LogItems.

**Updated Priority**: **MEDIUM** - Frontend CLI integration is mostly complete, this is enhancement.

**Subtasks**:
- [ ] **Update CLI parsing**: Integrate `-d` parameter with unified config system
- [ ] **Add folder validation**: Validate CLI-provided folder paths with proper error handling
- [ ] **CLI parameter storage**: Store CLI-provided folder in unified config
- [ ] **Visual feedback**: Show CLI parameters as LogItems at top of wizard

**Success Criteria**:
```bash
# Valid folder - skip wizard question
folder-mcp -d /valid/path  # Shows "✓ Folder: /valid/path (from CLI)" in LogItem

# Invalid folder - show error then picker
folder-mcp -d /invalid/path  # Shows "✗ Invalid path: /invalid/path" + folder picker
```

#### Task 6: Enhanced Wizard Flow with CLI Integration
**Status**: ⏳ Waiting  
**Discovered**: 2025-07-09  
**Dependencies**: ⚠️ **BLOCKED BY Task 4.7** - Backend must be connected to unified config first
**What**: Enhance wizard to skip CLI-answered questions and show CLI parameters in read-only mode.

**Why**: Questions answered by CLI parameters should appear as read-only LogItems and be skipped in the wizard flow.

**Updated Priority**: **LOW** - Most wizard functionality is already complete.

**Subtasks**:
- [ ] **Add LogItems section**: Show CLI parameters at top of wizard in read-only mode
- [ ] **Skip answered questions**: Skip wizard questions that have been answered by CLI
- [ ] **Validation display**: Show validation status (✓ valid, ✗ invalid) for CLI parameters
- [ ] **Seamless flow**: User only sees unanswered questions in wizard

**Success Criteria**:
- CLI parameters appear as LogItems at top of wizard
- Answered questions are skipped
- Validation errors are clearly displayed
- User only interacts with unanswered questions

#### Task 7: Complete CLI Cleanup and Folder Selection Flow
**Status**: ✅ Completed  
**Discovered**: 2025-07-09  
**What**: Clean up legacy CLI parameters and implement robust folder selection flow with validation.

**Why**: Need clean CLI system and proper folder addition flow before embeddings. Current system has accumulated legacy parameters and the folder selection needs proper CLI integration.

**Problem Analysis**:
- Legacy flag `ENABLE_ENHANCED_MCP_FEATURES` exists in 8 files and needs cleanup
- `-d` flag is manually parsed in wizard via `process.argv` instead of proper CLI integration
- No validation of CLI-provided folder paths
- No visual feedback for CLI parameters in wizard

**Subtasks**:
- [x] **CLI Cleanup**: Replace all `ENABLE_ENHANCED_MCP_FEATURES` references with `FOLDER_MCP_DEVELOPMENT_ENABLED`
- [x] **Add -d Flag to Commander.js**: Implement `-d, --dir <path>` option with proper parsing
- [x] **Path Validation**: Check folder exists, is directory, is readable - show errors gracefully
- [x] **Enhanced Wizard Flow**: Skip answered questions, show CLI parameters in read-only LogItems
- [x] **Error Handling**: Invalid -d paths show error LogItem then folder picker with defaults
- [x] **Priority Logic Implementation**: CLI -d (validated) → Dev flag → Current directory
- [x] **Navigation Cursor System**: Implement active cursor management (`▶`, `■`, `·`) similar to demo TUI for better UX

**Technical Implementation**:
- Update `src/interfaces/cli/folder-mcp.ts` to add `-d` flag
- Update `src/interfaces/tui-ink/index.tsx` to accept folder parameter
- Update `src/interfaces/tui-ink/components/FirstRunWizard.tsx` to use LogItems for CLI feedback
- Clean up `src/config/dev-mode.ts` and 7 other files with legacy flag
- Add folder validation utilities
- **Navigation Cursor System**: Move cursor management from external components to GenericListPanel.tsx as built-in feature:
  - Add cursor logic in item processing loop (around line 333)
  - Set `'▶'` for expandable items, `'■'` for interactive items, `'·'` for default
  - Preserve validation icons (`√`, `✗`) for unselected items
  - Remove external cursor management from AppFullscreen.tsx (lines 119-140, 147-156)
  - Ensure single Enter key activation instead of two right arrows

**Success Criteria**:
```bash
# Valid folder - skip wizard question
folder-mcp -d /valid/path  # Shows "✓ Folder: /valid/path (from CLI)" in LogItem

# Invalid folder - show error then picker
folder-mcp -d /invalid/path  # Shows "✗ Invalid path: /invalid/path" + folder picker

# Normal flow with dev flag
FOLDER_MCP_DEVELOPMENT_ENABLED=true folder-mcp  # Picker defaults to test fixtures

# Normal flow
folder-mcp  # Picker defaults to current directory
```

**Task Completion Protocol**:
- [x] Mark progress on this document
- [x] Summarize what was done and describe UX testing
- [x] Wait for confirmation before commit

**UX Testing Instructions**:
[Completed - cursor system implemented and working]

#### Task 8: Implement Transformers.js Embeddings
**Status**: ⏳ Waiting  
**Discovered**: 2025-07-08  
**Dependencies**: 🔥 **BLOCKED BY Task 4.7** - Backend must be connected to unified config first
**What**: Add offline embeddings with Transformers.js including proper mean pooling.

**Why**: With folder selection flow complete and frontend configuration unified, we need offline embeddings for true offline operation. However, this requires backend integration to actually use the configured embedding models.

**Updated Priority**: **HIGH** - Critical for offline functionality, but blocked by backend integration.

**Technical Details**: See [Embedding Pipeline Architecture](../../../design/unified-app-architecture.md#embedding-pipeline-architecture)

**Subtasks**:
- [ ] Create `src/infrastructure/embeddings/transformers-embedding-service.ts`
- [ ] Implement mean pooling following the architecture document
- [ ] Add model download management
- [ ] Create fallback chain: try Transformers → fall back to Ollama
- [ ] Update wizard to show both embedding options
- [ ] Test with `all-MiniLM-L6-v2` model

**Success Criteria**:
```bash
# Disconnect from internet
folder-mcp add ~/test-folder --model transformers:all-MiniLM-L6-v2
# Should successfully index offline
```

#### Task 9: Basic CLI Command Structure
**Status**: ⏳ Waiting  
**Discovered**: 2025-07-08  
**Dependencies**: 🔥 **BLOCKED BY Task 4.7** - Backend must be connected to unified config first
**What**: Implement core CLI commands that communicate with the daemon.

**Why**: With clean CLI structure established, we can now add power user commands. These commands work under the hood for the wizard and provide direct CLI access.

**Updated Priority**: **HIGH** - Essential for power user functionality, but blocked by backend integration.

**Subtasks**:
- [ ] Extend `src/interfaces/cli/folder-mcp.ts` with new commands
- [ ] `folder-mcp add <folder> [options]` - sends request to daemon
- [ ] `folder-mcp list` - queries daemon for indexed folders
- [ ] `folder-mcp status` - shows daemon status and stats
- [ ] `folder-mcp remove <folder>` - removes folder from index
- [ ] All commands communicate via HTTP to daemon

**Success Criteria**:
```bash
folder-mcp add ~/Documents --model transformers
folder-mcp list  # Shows: ~/Documents (indexed)
folder-mcp status  # Shows: Daemon running (PID: 12345), 1 folder indexed
```

#### Task 10: Enhanced Process Management
**Status**: ⏳ Waiting  
**Discovered**: 2025-07-08  
**Dependencies**: 🔥 **BLOCKED BY Task 4.7** - Backend must be connected to unified config first
**What**: Robust daemon lifecycle management with auto-start and recovery.

**Why**: Production systems need reliable process management, including handling crashes and stale PIDs.

**Updated Priority**: **MEDIUM** - Important for production, but blocked by backend integration.

**Subtasks**:
- [ ] Implement proper PID file locking (prevent multiple daemons)
- [ ] Auto-start daemon when any command needs it
- [ ] Detect and clean up stale PID files
- [ ] Add `folder-mcp stop` and `folder-mcp restart` commands
- [ ] Implement graceful shutdown on SIGTERM
- [ ] Add daemon crash recovery in TUI

**Success Criteria**:
```bash
folder-mcp stop  # Gracefully stops daemon
folder-mcp add ~/test  # Auto-starts daemon, then adds folder
kill -9 $(cat ~/.folder-mcp/daemon.pid)  # Simulate crash
folder-mcp status  # Detects crashed daemon, cleans up PID file
```

#### Task 11: Multi-Agent Connection Management
**Status**: ⏳ Waiting  
**Discovered**: 2025-07-08  
**Dependencies**: 🔥 **BLOCKED BY Task 4.7** - Backend must be connected to unified config first
**What**: Add HTTP transport for MCP and implement Agents Connection screen.

**Why**: Users want to use multiple AI agents (Claude Desktop, VSCode, etc) but stdio only supports one connection.

**Updated Priority**: **HIGH** - Key differentiator feature, but blocked by backend integration.

**Technical Details**: See [Agent Connection Management](../../../design/unified-app-architecture.md#agent-connection-management)

**Subtasks**:
- [ ] Add HTTP MCP endpoint to daemon (`/mcp`)
- [ ] Track active connections (stdio vs HTTP)
- [ ] Create Agents Connection screen in TUI
- [ ] Implement primary agent selection (gets stdio)
- [ ] Auto-configure agent JSON files
- [ ] Generate auth tokens for HTTP connections
- [ ] Handle stdio conflicts gracefully

**Success Criteria**:
- Select Claude Desktop as primary in TUI
- Claude Desktop config auto-updates to use stdio
- VSCode config auto-updates to use HTTP
- Both agents can connect simultaneously

#### Task 12: Enhanced Setup Wizard
**Status**: ⏳ Waiting  
**Discovered**: 2025-07-08  
**Dependencies**: 🔥 **BLOCKED BY Task 4.7** - Backend must be connected to unified config first
**What**: Full wizard experience with system detection and smart defaults.

**Why**: With folder selection complete, we can enhance the wizard with advanced features. First impressions matter - the wizard should detect available options and guide users to the best setup.

**Updated Priority**: **MEDIUM** - Enhancement feature, but blocked by backend integration.

**Subtasks**:
- [ ] System assessment (GPU, memory, Ollama availability)
- [ ] Model selection with recommendations
- [ ] Show download progress for Transformers.js models
- [ ] Language detection from system locale
- [ ] Auto-start configuration option
- [ ] Test setup before proceeding

**Success Criteria**:
- Wizard detects Ollama if installed
- Recommends best model based on system
- Shows progress during model download
- Completes with working setup

#### Task 13: System Integration (Auto-start)
**Status**: ⏳ Waiting  
**Discovered**: 2025-07-08  
**Dependencies**: 🔥 **BLOCKED BY Task 4.7** - Backend must be connected to unified config first
**What**: Operating system integration for auto-start on boot.

**Why**: Production deployments need the daemon to start automatically.

**Updated Priority**: **LOW** - Nice-to-have feature, but blocked by backend integration.

**Subtasks**:
- [ ] macOS: Create launchd plist generator
- [ ] Linux: Create systemd service generator  
- [ ] Windows: Registry entry for startup
- [ ] `folder-mcp config set autoStart true/false`
- [ ] Show auto-start status in TUI

**Success Criteria**:
```bash
folder-mcp config set autoStart true
# Restart computer
ps aux | grep folder-mcp  # Daemon already running
```

#### Task 14: Multi-Folder Support
**Status**: ⏳ Waiting  
**Discovered**: 2025-07-08  
**Dependencies**: 🔥 **BLOCKED BY Task 4.7** - Backend must be connected to unified config first
**What**: Support multiple indexed folders with isolation.

**Why**: With single folder flow established, we can extend to multiple folders. Users have knowledge in different folders and want to search across them or keep them separate.

**Updated Priority**: **HIGH** - Core feature, but blocked by backend integration.

**Subtasks**:
- [ ] Modify storage to support folder isolation
- [ ] Per-folder configuration (model, language)
- [ ] Update all screens to show multiple folders
- [ ] Cross-folder search with source attribution
- [ ] Folder management UI in TUI

**Success Criteria**:
```bash
folder-mcp add ~/Documents --model transformers
folder-mcp add ~/Code --model ollama:codellama  
folder-mcp search "function"  # Searches both, shows which folder each result is from
```

#### Task 15: Complete Documentation and Release Prep
**Status**: ⏳ Waiting  
**What**: Update all documentation and prepare for release.

**Dependencies**: ⚠️ **BLOCKED BY Task 4.7** - Need working system to document
**Updated Priority**: **MEDIUM** - Essential for release, but blocked by backend integration.

**Subtasks**:
- [ ] Update main README with new architecture
- [ ] Create user guide for all features
- [ ] Document configuration options
- [ ] API reference for HTTP endpoints
- [ ] Troubleshooting guide
- [ ] Update roadmap document with Phase 8 summary
- [ ] Run through pre-release checklist from design document

**Success Criteria**:
- All documentation is complete and accurate
- User guide covers all features with examples
- API reference is comprehensive
- Troubleshooting guide addresses common issues
- Roadmap is updated with Phase 8 completion

#### Task 13: Implement Centralized Focus Management System
**Status**: ⏳ Waiting  
**Priority**: Low (will be bumped up if focus issues persist)
**Discovered**: 2025-07-09  
**What**: Create a proper centralized focus management system for the TUI.

**Why**: Current system conflates focus, selection, active state, and keyboard control. This causes tight coupling between visual indicators (cursor) and keyboard handling. A centralized system would provide clean separation of concerns.

**Problem Analysis**:
- Focus state is scattered across components
- Keyboard handling and visual state are tightly coupled
- No clear hierarchy of focus (app → panel → item)
- Active vs selected vs controlling states are conflated

**Proposed Architecture**:
- **Hierarchical Focus System**: All ancestors of active element are "focused"
- **Single Active Element**: Only one element handles keyboard input at any time
- **Clear State Separation**:
  - `focused`: Which panel/component has focus ancestry
  - `selected`: Which item in a list is highlighted
  - `active`: Which element currently handles keyboard input
  - `controlling`: Whether an item has taken over input from its panel
- **Visual Indicators**:
  - `▶` = Selected item (panel is active)
  - `■` = Active/controlling item (item handles input)
  - Border highlight = Focused panel

**Subtasks**:
- [ ] Design centralized FocusManager service
- [ ] Implement focus hierarchy tracking
- [ ] Create keyboard input routing system
- [ ] Separate visual state from input handling
- [ ] Migrate existing components to use FocusManager
- [ ] Update all panels and items to new system
- [ ] Test complex focus scenarios (nested items, modal dialogs)

**Success Criteria**:
- Single source of truth for focus state
- Clean separation between visual and input concerns
- Consistent keyboard handling across all components
- Easy to reason about focus flow
- No more conflated state management

**Technical Notes**:
- Build on Option 2 implementation (current cursor system)
- Consider using React Context for focus state
- May need custom hooks for focus management
- Ensure backward compatibility during migration

**Task Completion Protocol**:
- [ ] Mark progress on this document
- [ ] Summarize what was done and describe UX testing
- [ ] Wait for confirmation before commit

**UX Testing Instructions**:
[To be filled when task is completed]


## 📊 **Progress Tracking**

### **Discovered Tasks Log**
| Task # | Task Description | Discovered Date | Status | Notes |
|--------|------------------|-----------------|--------|-------|
| 1 | Simplify TUI Entry Point | 2025-07-08 | ✅ | Single command instead of multiple screens |
| 2 | Create Daemon Architecture | 2025-07-08 | ✅ | Framework first - minimal changes |
| 3 | Minimal First-Run Wizard | 2025-07-08 | ✅ | Simple folder selection |
| 3.1 | Enhance Wizard with File Picker | 2025-07-08 | ✅ | Visual folder navigation |
| 3.2 | Fix Wizard Stability Issues | 2025-07-08 | ✅ | Handle undefined values in navigation |
| 4 | Fix Configuration System Unity | 2025-07-09 | ✅ | Unify wizard and main app config systems |
| 4.1 | Create ValidationRegistry | 2025-07-09 | ✅ | Centralized validation rules |
| 4.2 | Expand ConfigurationComponent | 2025-07-09 | ✅ | Unified interface for validation + config access |
| 4.3 | Replace TUI Configuration Access | 2025-07-09 | ✅ | All TUI components use ConfigurationComponent |
| 4.4 | Replace CLI Configuration Access | 2025-07-09 | ✅ | All CLI commands use ConfigurationComponent |
| 4.5 | Replace Wizard Configuration Access | 2025-07-09 | ✅ | Wizard uses ConfigurationComponent |
| 4.6 | Eliminate Direct ConfigManager Access | 2025-07-09 | ✅ | Only ConfigurationComponent uses ConfigManager |
| 4.7 | Complete Folder Configuration Flow | 2025-07-09 | 🚧 | Perfect folder config across wizard/CLI/TUI |
| 5 | Integrate -d Parameter with Unified Config | 2025-07-09 | ⏳ | CLI folder addition enhancement |
| 6 | Enhanced Wizard Flow with CLI Integration | 2025-07-09 | ⏳ | Skip CLI-answered questions |
| 7 | Complete CLI Cleanup and Folder Selection Flow | 2025-07-09 | ✅ | Clean CLI params, cursor system |
| 8 | Implement Transformers.js | 2025-07-08 | ⏳ | Offline embeddings with mean pooling |
| 9 | Basic CLI Commands | 2025-07-08 | ⏳ | add, list, status, remove |
| 10 | Enhanced Process Management | 2025-07-08 | ⏳ | Auto-start, crash recovery |
| 11 | Multi-Agent Connections | 2025-07-08 | ⏳ | stdio + HTTP support |
| 12 | Enhanced Setup Wizard | 2025-07-08 | ⏳ | System detection, smart defaults |
| 13 | System Integration | 2025-07-08 | ⏳ | Auto-start on boot |
| 14 | Multi-Folder Support | 2025-07-08 | ⏳ | Isolated folder management |
| 15 | Documentation & Release | 2025-07-08 | ⏳ | Complete docs and checklist |
| 16 | Centralized Focus Management | 2025-07-09 | ⏳ | Clean separation of focus/active/control states |

### **Key Discoveries**
- **Task 1**: The TUI had accumulated multiple entry points for different screens (config, status, folders, wizard) which added complexity. By removing these and creating a single entry point, we simplify the user experience and prepare for a unified flow where navigation happens within the app rather than through different commands.

- **Unified Architecture Plan**: Initial attempts at Task 2 revealed the need for a comprehensive design. We created a detailed architecture document and broke down the implementation into smaller, manageable tasks that build on each other linearly. This UX-led approach ensures we can verify success at each step.

## 🎨 **TUI Visual Guidelines**

*This section captures visual debugging learnings to prevent future rendering issues. TUI bugs are difficult to debug remotely, so these guidelines help maintain visual consistency.*

### **BorderedBox Component - Do's and Don'ts**

**✅ DO:**
- Pass simple content directly as children (Text, SelfConstrainedWrapper)
- Let BorderedBox handle all layout and border rendering internally
- Use proper focus state with `navigation.isMainFocused`/`navigation.isStatusFocused`
- Keep content simple and let the component manage positioning

**❌ DON'T:**
- Wrap content in complex Box layouts with height/width constraints
- Use `flexDirection`, `alignItems`, `justifyContent` inside BorderedBox children
- Override BorderedBox's internal layout system
- Add your own height calculations that conflict with the component's logic
- Use Box components for simple text concatenation (causes text wrapping)

**Example - Correct Usage:**
```tsx
<BorderedBox title="Main" focused={navigation.isMainFocused}>
    <Text>Simple content here</Text>
</BorderedBox>
```

**Example - Incorrect Usage:**
```tsx
<BorderedBox title="Main" focused={navigation.isMainFocused}>
    <Box flexDirection="column" alignItems="center" height={actualHeight - 4}>
        <Text>Content wrapped in complex layout</Text>
    </Box>
</BorderedBox>
```

### **TUI Visual Bug Debugging Method**

**Human-Agent Collaborative Process for TUI visual issues:**

**Why This Method Works**: Claude cannot run TUI applications directly but can analyze debug output character-by-character. This creates an effective collaborative debugging flow.

**Step-by-Step Process:**

1. **Agent adds comprehensive logging** - Character counts, available space, exact calculations with descriptive labels
2. **Agent builds the code** - `npm run build` to compile TypeScript changes
3. **Human runs TUI with stderr capture**: `npm run tui 2>debug.log`
4. **Human shares debug.log contents** - Agent analyzes character-level discrepancies
5. **Agent identifies root cause** - Using precise character math and layout calculations  
6. **Agent implements fix** - Based on debug log analysis
7. **Iterate steps 2-6** until visual behavior matches expectations
8. **Agent removes debug logs** - Clean up when bug is resolved

**Key Principles:**
- **Terminal is a 2D character matrix** - Every character position matters in responsive TUI
- **Character-level precision** - Debug logs must show exact character counts at each step
- **Human verification** - Agent cannot see visual output, relies on human feedback and debug logs
- **Systematic approach** - Follow width flow from terminal → panel → component → text rendering

### **Detailed TUI Debugging Implementation**

**Character-Level Logging Strategy:**
```typescript
// Example logging pattern for width flow debugging
console.error(`\n=== COMPONENT WIDTH CALCULATION ===`);
console.error(`Terminal columns: ${columns}`);
console.error(`Panel width: ${width} || ${columns - 2} = ${panelWidth}`);
console.error(`borderOverhead: ${borderOverhead}`);
console.error(`itemMaxWidth: ${panelWidth} - ${borderOverhead} = ${itemMaxWidth}`);
console.error(`This itemMaxWidth will be passed to LogItem.render()`);
console.error(`=== END COMPONENT WIDTH ===\n`);
```

**Truncation Logic Debugging:**
```typescript
// Example logging for truncation analysis
if (targetText.includes('debug-trigger')) {
    console.error(`\n--- TRUNCATION CALCULATION ---`);
    console.error(`maxWidth: ${maxWidth} chars`);
    console.error(`iconLength: ${iconLength} chars (icon:"${icon}" + space)`);
    console.error(`BUFFER: ${BUFFER} chars`);
    console.error(`availableForText: ${maxWidth} - ${iconLength} - ${BUFFER} = ${availableForText} chars`);
    console.error(`textLength: ${text.length} chars`);
    console.error(`Need truncation? ${text.length} > ${availableForText} = ${text.length > availableForText}`);
    console.error(`FINAL RENDER TEXT: "${finalText}" (${finalText.length} chars)`);
    console.error(`=== END TRUNCATION ===\n`);
}
```

**Debug Flow Coverage:**
1. **Width Flow**: Terminal → Panel → BorderedBox → ListItem
2. **Content Flow**: Text input → Truncation logic → Final render
3. **Character Counting**: Exact chars at each step
4. **Validation**: Expected vs actual behavior

**Usage:**
```bash
npm run tui 2>debug.log
# Analyze debug.log for character-level discrepancies
# Iterate until visual behavior matches calculations
```

### **Visual Bug Solutions Log**
- **Task 1.1**: MainPanel borders breaking + text cutting → ✅ **FIXED** by removing complex Box wrapper inside BorderedBox, using simple Text child instead
- **Task 1.2**: LogItem text wrapping outside borders → ✅ **FIXED** by adding truncation logic to same-color rendering path that was bypassing text length checks
- **Task 1.3**: ProgressBar text truncation too aggressive → ✅ **FIXED** by reducing buffer from 3 chars to 1 char for better space utilization

**Methodology Success**: The human-agent collaborative debugging process using `npm run tui 2>debug.log` proved highly effective for character-level TUI bug analysis. All visual issues were resolved through systematic debug log analysis.

### **Integration Points**
*Track which components were connected and how*

## 🔍 **Phase-Specific Context**

### Why Dynamic Approach?
Integration phases are inherently exploratory. As we connect components, we discover:
- Missing interfaces between systems
- Unexpected edge cases
- User experience gaps
- Performance considerations
- Error scenarios that need handling

By keeping the task list dynamic, we can:
- Respond to discoveries quickly
- Avoid over-planning for unknown problems
- Focus on real issues vs theoretical ones
- Maintain development momentum

### Documentation Commitment
While tasks are dynamic, documentation is critical:
- Each discovered task gets documented immediately
- Decisions and rationale captured in real-time
- Problems and solutions recorded for future reference
- Final roadmap update consolidates all learnings

## 🌉 **Backend Integration Philosophy**

### When to Bridge Frontend and Backend

**Current Reality**: 
- Frontend is unified (ConfigurationComponent)
- Backend uses HybridConfigLoader
- **This separation is intentional and good!**

**When NOT to integrate backend**:
- ❌ When you discover a gap (like we did with Task 4.7)
- ❌ When it seems "critical" or "blocking"
- ❌ When you haven't built enough user flows
- ❌ When the frontend patterns aren't fully proven

**When TO integrate backend**:
- ✅ After implementing 5-7 complete user flows
- ✅ When patterns are crystal clear and repeated
- ✅ When you understand exactly what the backend needs
- ✅ When you can bridge without breaking anything

**Why This Works**:
1. **Frontend First**: Users interact with frontend - get that right first
2. **Pattern Discovery**: Multiple user flows reveal the right abstractions
3. **Safe Integration**: When patterns are proven, backend integration is obvious
4. **No Guessing**: We don't guess what backend needs - we KNOW from frontend

**The HybridConfigLoader Question**:
Task 4.7 originally wanted to remove HybridConfigLoader immediately. This would have:
- Broken existing functionality
- Required guessing at backend needs
- Created instability in working code
- Violated our incremental approach

Instead, HybridConfigLoader will be replaced naturally when:
- We have 5+ working user flows
- The frontend patterns are battle-tested
- We know exactly how backend should connect
- We can do it safely without breaking anything

**Next Steps**: Build more user flows! Each one teaches us what the backend integration should look like.

## ✅ **Phase Validation**

### Continuous Validation
- After each task: Verify integration still works
- Regular user flow testing
- Performance monitoring
- Error scenario testing

### Final Validation
- Complete user journey test
- All components working together
- Documentation complete
- Roadmap updated

## 📝 **Living Document Sections**

### Implementation Notes
*Add notes here during development*

### Decision Log
*Record key decisions and their rationale*

### Problems Encountered
*Document issues and their solutions*

### Future Considerations
*Note items for future phases*

## 🔮 **Future Tasks (After Pattern Maturity)**

These tasks will be addressed after we have 5-7 working user flows and clear patterns:

### Backend Configuration Bridge
**Status**: 📅 Future  
**What**: Replace HybridConfigLoader with ConfigurationComponent in backend services.

**When This Becomes Ready**:
- After implementing folder status, indexing control, search, and multi-folder flows
- When we understand exactly how backend needs configuration
- When we can map every HybridConfigLoader usage to a ConfigurationComponent pattern
- When we have comprehensive tests for all user flows

**Why Wait**:
- Frontend patterns need to be proven first
- We need to understand real usage patterns
- Backend integration should be obvious, not forced
- Zero risk of breaking working functionality

**Implementation Plan** (when ready):
1. Map all HybridConfigLoader usage patterns
2. Create compatibility layer first
3. Migrate services one by one
4. Maintain backward compatibility
5. Remove HybridConfigLoader only after all services migrated
6. Comprehensive end-to-end testing

---

**To add a new task to this phase:**
Simply edit this document and add the task to the "Discovered Tasks" section with its details, then implement it.