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
  ○ nomic-embed-text (general purpose)
  ○ all-MiniLM-L6-v2 (lightweight, fast)
  ○ codebert-base (optimized for code)

Step 3: Content language
> 🌍 English (auto-detected)

Step 4: Auto-start on system boot?
> ◉ Yes (recommended)
  ○ No

[Start Indexing] [Advanced Options]
```

The wizard intelligently:
- Detects GPU capabilities and recommends optimal model
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
folder-mcp add ~/Work --model codebert-base --language en
```

### **Key Principles**
- **Zero Configuration**: Smart defaults for everything
- **Progressive Disclosure**: Simple for beginners, powerful for experts  
- **Self-Contained**: Complete embedding solution with automatic GPU acceleration
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

## ✅ **COMPLETED TASKS**

### Task 1: Simplify TUI Entry Point
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

### Task 2: Create Daemon Architecture (Framework First)
**Status**: ✅ Completed  
**Discovered**: 2025-07-08  
**What**: Create minimal daemon + TUI architecture without changing existing functionality.

**Why**: We need the framework in place before adding features. Starting with minimal changes ensures we don't break existing functionality while establishing the foundation for all future features.

**Design Reference**: [Unified Application Architecture](../../../design/unified-app-architecture.md)

**Subtasks**:
- [x] Create `src/daemon/index.ts` entry point
- [x] Move MCP server logic to daemon process
- [x] Update MCP endpoints to use folder paths instead of names for identification
- [x] Implement basic PID file management (`~/.folder-mcp/daemon.pid`)
- [x] Add `folder-mcp --daemon` command to start daemon
- [x] Add basic HTTP server to daemon (port 9876) with `/health` endpoint
- [x] Modify TUI to detect running daemon via PID file
- [x] Show connection status in TUI header
- [x] Keep all existing MCP functionality unchanged

**Success Criteria**:
```bash
# Terminal 1
folder-mcp --daemon  # Starts daemon in background
ps aux | grep folder-mcp  # Shows running daemon process

# Terminal 2
npm run tui  # Shows "Connected to daemon (PID: 12345)" in header
```

### Task 3: Minimal First-Run Wizard
**Status**: ✅ Completed  
**Discovered**: 2025-07-08  
**What**: Simple wizard that uses existing functionality to onboard new users.

**Why**: Users need guidance on first run, but we'll keep it minimal initially - just folder selection and use default embedding model.

**Subtasks**:
- [x] Detect if `~/.folder-mcp/config.json` exists
- [x] Show simple wizard screen: "Welcome! Select a folder to index"
- [x] Use folder selection dialog (can reuse existing components)
- [x] Create config with selected folder and current defaults
- [x] Start indexing with default embedding model
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
# Select folder → Indexes with Python embeddings → Shows TUI
```

### Task 3.1: Enhance Wizard with File Picker Component
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

### Task 3.2: Fix Wizard Stability Issues
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

### Task 4: Fix Configuration System Unity
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

### Task 4.1: Create ValidationRegistry as Single Source of Truth
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

### Task 4.2: Expand ConfigurationComponent as Unified Interface
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

### Task 4.3: Replace Scattered Configuration Access Across TUI Components
**Status**: ✅ Completed  
**Discovered**: 2025-07-09  
**What**: Replace all direct ConfigManager usage in TUI components with unified ConfigurationComponent.

**Implementation Summary**:
- Updated main TUI entry point (`src/interfaces/tui-ink/index.tsx`)
- Updated FirstRunWizard to use ConfigurationComponent
- Updated ConfigurableThemeService to use ConfigurationComponent
- Fixed all TUI-related tests to use new system
- Added async initialization support for theme service

### Task 4.4: Replace CLI Configuration Access
**Status**: ✅ Completed  
**Discovered**: 2025-07-09  
**What**: Replace direct ConfigManager usage in CLI commands with unified ConfigurationComponent.

**Implementation Summary**:
- Updated simple-config.ts to use ConfigurationComponent
- Advanced config.ts was already using ConfigurationComponent
- All CLI validation now goes through ValidationRegistry
- Removed manual validation code in favor of unified system

### Task 4.5: Replace Wizard Configuration Access
**Status**: ✅ Completed  
**Discovered**: 2025-07-09  
**What**: Replace direct ConfigManager usage in wizard with unified ConfigurationComponent.

**Implementation Summary**:
- FirstRunWizard now uses ConfigurationComponent for all config operations
- Proper validation and error handling integrated
- Configuration persistence works correctly across wizard sessions

### Task 4.6: Eliminate Direct ConfigManager Access Outside ConfigurationComponent
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

### Task 4.7: Complete Folder Configuration Flow from All Directions
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

### Task 8: Multi-Folder Configuration  
**Status**: ✅ COMPLETED  
**Discovered**: 2025-07-10  
**What**: Implement clean multi-folder support by extending the unified configuration system with `-d` and `-m` CLI parameters and folder management.

**Why**: After perfecting single folder configuration, users need to manage multiple folders with different models. This creates the foundation for folder isolation and proper embedding model selection per content type (e.g., code-optimized models for source code folders).

**Implementation Summary**:
1. **CLI Parameters**: Extended `folder-mcp.ts` to support `-m, --model <model>` flag alongside existing `-d, --dir <path>` flag
2. **Model Validation**: Added comprehensive model validation to ValidationRegistry with supported Python embedding models
3. **Configuration Management**: Extended ConfigurationComponent with full folder array CRUD operations following proper schema
4. **Auto-completion Handler**: Created new AutoCompletionHandler component with confirmation prompts for partial parameters
5. **TUI Integration**: Updated TUI entry point and FirstRunWizard to handle model parameters and auto-completion flow
6. **Schema Compliance**: All configuration follows proper FolderConfig schema with embeddings.model structure

**Multi-Folder Application Flow**:
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

**Model Options** (Python embedding models):
- `nomic-embed-text` (default, general purpose)
- `all-mpnet-base-v2` (high accuracy)
- `all-MiniLM-L6-v2` (lightweight, fast)
- `codebert-base` (optimized for source code)
- `mxbai-embed-large` (highest quality)
- `sentence-transformers/all-MiniLM-L12-v2` (balanced)
- `BAAI/bge-small-en-v1.5` (efficient)
- `thenlper/gte-small` (good for documents)

**Implementation Subtasks**:
- [x] **CLI Parameter Handling**: Add `-m, --model <model>` flag with validation
- [x] **Model Validation**: Add model validation rules to ValidationRegistry 
- [x] **Configuration Integration**: Extend ConfigurationComponent with folder array methods
- [x] **TUI Wizard Updates**: Add model selection using existing SingleChoice component
- [x] **Auto-completion Logic**: Implement smart parameter completion with confirmation prompts
- [x] **Main App Display**: Show folders using existing ConfigurationItem components

**Success Criteria**: ✅ All Achieved
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

### Task 8.5: Implement SimpleButtonsRow List Item Component
**Status**: ✅ COMPLETED  
**Discovered**: 2025-07-11  
**What**: Design and implement a comprehensive button row component with responsive behavior, ANSI color support, and alignment options.

**Why**: Need a production-ready component for action buttons in TUI interfaces with sophisticated features for real-world use cases. This replaces preliminary button components with a fully-featured implementation.

**Key Features Implemented**:
- **Responsive Design**: Automatically switches between bordered (3-line) and minimized (1-line) modes based on terminal size and space constraints
- **Progressive Truncation**: Removes button padding before truncating text to maximize space efficiency
- **ANSI Color Support**: Full support for ANSI escape codes in button text (e.g., colored icons)
- **Global Coordination**: Shares terminal size information with other components for consistent responsive behavior
- **Alignment Options**: Support for left, center, and right alignment of button rows
- **Smart Focus Management**: Proper keyboard navigation with visual focus indicators

**Technical Implementation**:
- **Component**: `SimpleButtonsRow` implementing `IListItem` interface
- **File**: `src/interfaces/tui-ink/components/core/SimpleButtonsRow.tsx`
- **Responsive Logic**: Uses global terminal size (`globalTerminalRows < 25`) and local space constraints (`maxLines < 3`)
- **Visual Modes**:
  - **Regular Mode** (≥25 rows, ≥3 lines available): 3-line bordered boxes with colored corners
  - **Low Resolution Mode** (<25 rows or <3 lines): Single-line bracket layout with underline focus

**Progressive Truncation Algorithm**:
1. Calculate space needed for all buttons with padding
2. If any button doesn't fit, remove padding from ALL buttons globally
3. If text still doesn't fit, truncate text directly (no ellipsis for space efficiency)
4. ANSI-aware truncation preserves escape sequences while truncating visible characters

**ANSI Color Handling**:
- **Problem Solved**: ANSI escape codes conflicted with React Ink's bold styling
- **Solution**: Removed bold styling entirely to avoid conflicts
- **Result**: Clean rendering of colored symbols (e.g., orange ✗ in Decline button)

**Alignment Implementation**:
- **Type**: `ButtonAlignment = 'left' | 'center' | 'right'`
- **Application**: Uses Ink's `justifyContent` property on all layout containers
- **Consistency**: Applied to both regular mode (all 3 lines) and low resolution mode

**Visual Examples**:

**Regular Mode** (bordered boxes):
```
╔─────────╗  ╭──────────╮  ╭────────╮
│ √Accept │  │ ✗Decline │  │ Cancel │
╚─────────╝  ╰──────────╯  ╰────────╯
```

**Low Resolution Mode** (compact brackets):
```
[ √Accept ] [ ✗Decline ] [ Cancel ]
```

**Implementation Subtasks**:
- [x] Create responsive switching logic between bordered and minimized modes
- [x] Implement global terminal size coordination system
- [x] Add progressive truncation (padding removal before text truncation)
- [x] Implement ANSI-aware text truncation with escape sequence preservation
- [x] Remove bold styling to resolve ANSI escape code conflicts
- [x] Add alignment support (left, center, right) for button row positioning
- [x] Test with colored ANSI symbols (orange ✗ in sample data)
- [x] Integrate with existing focus management and keyboard navigation

**Testing Results**:
- ✅ Responsive behavior works correctly at different terminal sizes
- ✅ Progressive truncation prioritizes text over margins as requested
- ✅ ANSI colors (orange ✗ symbol) display correctly without bold conflicts
- ✅ Alignment options (center demonstrated) work in both visual modes
- ✅ Keyboard navigation flows properly between buttons and panels
- ✅ Global terminal size coordination prevents visual inconsistencies

**Task Completion**:
Component is production-ready and demonstrates all requested features. The implementation provides a solid foundation for button-based interactions throughout the TUI application.

### Task 8.5: Implement Nested ListItem Visual Component
**Status**: ✅ COMPLETED  
**Discovered**: 2025-07-15  
**What**: Create a ListItem that can display other ListItems inside it when expanded, with proper responsive behavior.

**Why**: This is the core visual element architecture needed to enable folder setup wizards and other complex interfaces. Currently GenericListPanel manages flat arrays of IListItem[], but we need a ContainerListItem that can show child ListItems with proper scrolling and input delegation.

**Scope**: Pure visual component architecture task - NOT business logic, model recommendations, or wizard features.

**Implementation Summary**:
Task 8.5 has been completed with comprehensive technical research and design documentation. The detailed implementation plan provides a complete roadmap for creating the ContainerListItem component with proper scrolling, input delegation, and responsive behavior.

**Key Technical Requirements Addressed**:
- **Collapsed/Expanded States**: Single line display when collapsed, full child ListItem display when expanded
- **Responsive Design**: Terminal resize handling and vertical overflow management like GenericListPanel
- **Input Flow**: Keyboard input routing to active child items through delegation chain
- **Fixed Height Strategy**: Prevents infinite recursion by using fixed height allocation

**Implementation Strategy Documented**:
1. **Mimic GenericListPanel's scrolling logic** for internal viewport management
2. **Fixed height strategy** (like FilePickerListItem) to prevent infinite recursion  
3. **Input delegation chain** to route keyboard input through nested structure

**Subtasks Completed**:
- [x] Research current responsive design architecture
- [x] Analyze GenericListPanel's scrolling and input delegation patterns
- [x] Design comprehensive ContainerListItem interface and behavior specification
- [x] Document implementation phases with proof of concept, scrolling, delegation, and integration
- [x] Create detailed technical implementation guide with code examples
- [x] Define success criteria and testing approach
- [x] Document technical challenges and solutions

**Technical Foundation Established**:
This creates the complete visual architecture foundation needed for:
- Folder setup wizards with multiple steps
- Complex configuration interfaces  
- Any nested interactive elements in the TUI

**Files Documented**:
- Implementation plan for `src/interfaces/tui-ink/components/core/ContainerListItem.tsx`
- Testing strategy for nested ListItem behavior
- Integration patterns with existing GenericListPanel

The task provides a complete implementation roadmap that can be followed to create the ContainerListItem component when needed for specific user interface requirements.

### Task 8.5.5: Implement ContainerListItem with Advanced Viewport System
**Status**: ✅ COMPLETED  
**Discovered**: 2025-07-19  
**What**: Implement the full ContainerListItem component with sophisticated viewport management system and direction-aware bring-into-view logic.

**Why**: Following the foundation laid in Task 8.5, implement the actual ContainerListItem component to enable complex wizard interfaces with proper navigation and visual feedback.

**Implementation Summary**:
Created a production-ready ContainerListItem component with a complete ViewportSystem architecture that handles:

**Core ViewportSystem Architecture**:
1. **ViewportCalculator**: Handles all dimension calculations, header layout, and confirmation layout
2. **ScrollStateManager**: Manages scroll offset with direction-aware positioning algorithms
3. **ElementVisibilityCalculator**: Determines which elements are visible and handles clipping
4. **NavigationManager**: Finds navigable elements with proper keyboard navigation
5. **ExpansionManager**: Handles collapsed/expanded state transitions

**Key Features Implemented**:
- **Direction-Aware Scroll Positioning**: Down navigation positions elements at viewport bottom, up navigation at top
- **Render-Cycle Scroll Adjustment**: Ensures selected elements stay visible during render for atomic operations
- **Height Constraints**: Prevents elements from exceeding viewport bounds with proper clipping
- **Minimal Scroll Logic**: Only scrolls when necessary to show complete elements
- **Responsive Behavior**: Adapts to terminal size changes and maxLines constraints
- **Proper Input Delegation**: Routes keyboard input through nested component hierarchy

**Viewport Management Innovations**:
- **Consistent Calculation**: Same viewport calculation used for both rendering and navigation
- **Element Position Tracking**: Precise element boundary tracking for visibility calculations
- **Scroll Indicator Integration**: Line-based scroll indicators (▲/▼) at exact viewport boundaries
- **Overflow Prevention**: Elements constrained to viewport height to prevent infinite expansion

**Layout Improvements**:
- **Simplified Wizard Layout**: Removed explanatory text elements for cleaner navigation
- **Configuration Item Focus**: Direct configuration items without intervening text elements
- **Visual Clarity**: Clean presentation focused on actionable items

**Technical Subtasks Completed**:
- [x] Implement complete ViewportSystem with 5 specialized managers
- [x] Add direction-aware scroll positioning algorithms in ScrollStateManager
- [x] Implement render-cycle scroll adjustment for atomic element visibility
- [x] Add height constraints to ElementVisibilityCalculator
- [x] Fix viewport calculation consistency between render and navigation cycles
- [x] Remove explanatory text elements from wizard layout
- [x] Add comprehensive navigation direction tracking
- [x] Implement minimal scroll logic to reduce unnecessary scrolling

**Success Criteria Achieved**:
- ✅ Selected elements always stay in viewport during navigation
- ✅ Direction-aware positioning: down navigation shows elements at bottom, up at top
- ✅ Responsive behavior adapts to terminal size changes
- ✅ Keyboard navigation flows smoothly between nested elements
- ✅ Visual feedback is immediate and consistent
- ✅ Layout is clean and focused on user actions

**Files Implemented**:
- `src/interfaces/tui-ink/components/core/ContainerListItem.tsx` - Main component
- `src/interfaces/tui-ink/components/core/viewport/` - Complete viewport system
- Updated `src/interfaces/tui-ink/AppFullscreen.tsx` - Simplified wizard layout

**Commit**: `838d8be` - Complete implementation with direction-aware bring-into-view logic

### Task 8.6: Add Folder Wizard Implementation
**Status**: ✅ COMPLETED  
**Discovered**: 2025-07-24  
**What**: Implement a reusable Add Folder Wizard component that collects folder path and model selection.

**Why**: Need a unified component for adding folders that works in both first-run wizard and main screen, supporting future evolution to interview-based model selection.

**Key Features Implemented**:
- **Reusable Component**: Single wizard for both first-run and additional folder addition
- **Model Metadata Display**: Enhanced model selection showing languages, parameters, GPU requirements, and backend
- **CLI Integration**: Smart parameter handling with validation and auto-completion
- **Future-Ready**: Architecture supports evolution to interview-based model selection
- **Comprehensive Validation**: FolderValidationService with duplicate, sub-folder, and ancestor detection
- **Destructive Confirmation**: Proper confirmation flows for potentially destructive operations
- **Non-Destructive Cancel**: Clean cancel functionality without confirmation prompts

**Implementation Summary**:
- Created AddFolderWizard factory with ContainerListItem architecture
- Implemented model metadata infrastructure with 8 supported embedding models  
- Added FolderValidationService with comprehensive validation pipeline
- Integrated destructive flag mechanism for proper button behavior
- Added real-time validation with proper error/warning display
- Implemented dual-button mode with validation-based button states
- Fixed focus management and navigation issues
- Replaced all emojis with ASCII characters for terminal compatibility

**Implementation Plan**: See detailed linear plan in [Phase-8-Task-8.6-Add-Folder-Wizard.md](Phase-8-Task-8.6-Add-Folder-Wizard.md)

### Task 7: Complete CLI Cleanup and Folder Selection Flow
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

### Task 5: Integrate -d Parameter with Unified Config System
**Status**: ✅ Completed  
**Discovered**: 2025-07-09  
**What**: Properly integrate `-d` parameter with the unified configuration system for seamless folder addition.

**Why**: The `-d` parameter should "add a folder to MCP" and integrate with the wizard flow by answering the first question and showing CLI parameters as read-only LogItems.

**Implementation Details**: 
- Full CLI parameter integration with ConfigurationComponent validation system
- CLI parameters (`-d` and `-m`) are parsed and validated using the unified config validation rules
- Auto-completion flow shows CLI parameters and prompts for missing values
- Seamless integration between CLI, wizard, and main app configuration

**Subtasks**:
- [x] **Update CLI parsing**: Integrate `-d` parameter with unified config system (folder-mcp.ts:31, index.tsx:18-21)
- [x] **Add folder validation**: Validate CLI-provided folder paths with proper error handling (index.tsx:107-124)
- [x] **CLI parameter storage**: Store CLI-provided folder in unified config (index.tsx:87: `configComponent.addFolder()`)
- [x] **Visual feedback**: Show CLI parameters as LogItems in auto-completion handler (AutoCompletionHandler component)

**Success Criteria**:
```bash
# Valid folder - skip wizard question
folder-mcp -d /valid/path  # Shows "✓ Folder: /valid/path (from CLI)" in LogItem

# Invalid folder - show error then picker
folder-mcp -d /invalid/path  # Shows "✗ Invalid path: /invalid/path" + folder picker
```

### Task 6: Enhanced Wizard Flow with CLI Integration
**Status**: ✅ Completed  
**Discovered**: 2025-07-09  
**What**: Enhance wizard to skip CLI-answered questions and show CLI parameters in read-only mode.

**Why**: Questions answered by CLI parameters should appear as read-only LogItems and be skipped in the wizard flow.

**Implementation Details**:
- AutoCompletionHandler component displays CLI parameters with validation status
- Both `-d` and `-m` parameters completely skip wizard (index.tsx:85-88)
- Partial parameters trigger auto-completion flow with visual feedback
- Validation errors shown with fallback values and clear error messages

**Subtasks**:
- [x] **Add LogItems section**: Show CLI parameters at top of wizard in read-only mode (AutoCompletionHandler.tsx:131-157)
- [x] **Skip answered questions**: Skip wizard questions that have been answered by CLI (index.tsx:85-88)
- [x] **Validation display**: Show validation status (✓ valid, ✗ invalid) for CLI parameters (AutoCompletionHandler.tsx:132-156)
- [x] **Seamless flow**: User only sees unanswered questions in wizard (auto-completion flow handles this)

**Success Criteria**:
- CLI parameters appear as LogItems at top of wizard
- Answered questions are skipped
- Validation errors are clearly displayed
- User only interacts with unanswered questions

## 🚧 **PARTIALLY COMPLETED TASKS**

### Task 8: Multi-Folder Configuration - Main App Display
**Status**: 🚧 PARTIALLY COMPLETED - Core implementation done, main app display deferred  
**What**: Show configured folders using existing ConfigurationItem components in main app.

**Implementation Status**:
- ✅ CLI parameter handling complete
- ✅ Model validation complete
- ✅ Configuration management complete
- ✅ Auto-completion logic complete
- ✅ Wizard integration complete
- ⏳ **Main App Display**: Deferred to focus on status bar improvements

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

**Remaining Work**:
- [ ] **Main App Display**: Show folders using existing ConfigurationItem components

## ⏳ **WAITING TASKS**

### Task 9: Daemon-TUI WebSocket Communication Architecture
**Status**: ✅ COMPLETED  
**Priority**: 🔥 CRITICAL - Foundation for all future client-server architecture
**What**: Establish WebSocket communication between daemon and TUI clients, moving ConfigurationComponent to daemon and creating clean client-server separation.

**Why**: Current TUI directly accesses ConfigurationComponent, preventing multiple client support and real-time synchronization. This task creates the foundation for multi-client architecture (TUI, web, native) with real-time updates.

#### Core Architecture Changes

**WebSocket Communication Protocol**:
- **Daemon WebSocket Server**: `ws://127.0.0.1:31849/ws` (localhost only)
- **MCP Server**: Continues on `127.0.0.1:31847` (separate from internal communication)
- **Bidirectional Messages**: Commands from clients, events from daemon
- **Message Format**: JSON with correlation IDs for request/response

**ConfigurationComponent Migration**:
- **Move to Daemon**: ConfigurationComponent becomes daemon-exclusive
- **WebSocket Exposure**: Config operations via WS commands (`folder-add`, `folder-remove`, etc.)
- **TUI Transformation**: Remove all direct config access, use WebSocket commands only
- **Data Model**: Daemon maintains canonical state, broadcasts changes to all clients

**Multi-Client Support**:
- **Multiple TUI Instances**: Several TUI processes can connect simultaneously
- **Real-Time Sync**: All clients see identical state, instant updates
- **Connection Management**: Client identification, connection health monitoring

#### Implementation Plan

**Sub-task 1: Daemon WebSocket Infrastructure**
- [ ] **Create**: `src/domain/daemon/websocket-server.ts` - WebSocket server on `127.0.0.1:31849`
- [ ] **Create**: `src/domain/daemon/message-handlers.ts` - Command handlers for folder operations, validation, system commands
- [ ] **Create**: `src/domain/daemon/data-model.ts` - Canonical daemon data model interface

**Sub-task 2: Move Services to Daemon**
- [ ] **Relocate**: `src/interfaces/tui-ink/services/FolderValidationService.ts` → `src/domain/daemon/folder-validation-service.ts`
- [ ] **Update**: `src/config/validation/FolderBusinessValidator.ts` - Remove TUI dependency, use WebSocket
- [ ] **Migrate**: ConfigurationComponent to daemon ownership

**Sub-task 3: TUI WebSocket Client**
- [ ] **Create**: `src/interfaces/tui-ink/services/WebSocketClient.ts` - WebSocket connection with correlation IDs
- [ ] **Create**: `src/interfaces/tui-ink/contexts/DaemonContext.ts` - React context for WebSocket client

**Sub-task 4: TUI Component Transformation**
- [ ] **Update**: `src/interfaces/tui-ink/AppFullscreen.tsx` - Remove direct config access, use daemon model
- [ ] **Update**: `src/interfaces/tui-ink/components/AddFolderWizard.tsx` - Use WebSocket commands
- [ ] **Create**: `src/interfaces/tui-ink/components/ManageFolderItem.tsx` - WebSocket-based folder removal

**Sub-task 5: Validation System Migration**
- [ ] **Update**: `src/interfaces/tui-ink/components/core/FilePickerListItem.tsx` - WebSocket validation
- [ ] **Remove**: `src/interfaces/tui-ink/services/FolderValidationService.ts` - Moved to daemon

**Sub-task 6: Error Handling & Connection Management**
- [ ] **Create**: `src/interfaces/tui-ink/services/OfflineStateManager.ts` - Handle connection failures
- [ ] **Update**: `src/interfaces/tui-ink/components/StatusBar.tsx` - Show connection status

#### Success Criteria
- ✅ **WebSocket Communication**: Daemon and TUI communicate exclusively via WebSocket protocol
- ✅ **Multi-Instance Support**: Multiple TUI instances show identical state and respond to same events in real-time
- ✅ **Configuration Routing**: All configuration file changes flow through daemon exclusively, no direct TUI access

#### Not in Scope (Future Tasks)
- **Embeddings Management**: Indexing, progress tracking, vector storage (next task)
- **MCP Endpoints**: Search, document retrieval, MCP JSON-RPC protocol (separate from internal communication)

### Task 10: Implement Python Subprocess Embeddings
**Status**: ⏳ Waiting  
**Discovered**: 2025-07-08  
**Dependencies**: 🔥 **BLOCKED BY Task 9** - WebSocket communication must be established first
**What**: Add high-performance embeddings via Python subprocess with GPU acceleration support.

**Why**: With folder selection flow complete and frontend configuration unified, we need production-grade embeddings with automatic GPU optimization. Python provides mature libraries for CUDA/MPS acceleration.

**Updated Priority**: **HIGH** - Critical for performance and production readiness, but blocked by backend integration.

**Architecture Overview**:
- **Node.js Layer**: MCP protocol, file monitoring, orchestration
- **Python Layer**: Complete document processing pipeline (reading, extraction, chunking, embedding)
- **Communication**: JSON-RPC over stdio between Node.js PythonProcessManager and Python worker
- **GPU Support**: Automatic detection and use of NVIDIA CUDA or Apple Silicon MPS

**Subtasks**:
- [ ] Create `src/infrastructure/embeddings/python-process-manager.ts` for Node.js side
- [ ] Create `python/embeddings_worker.py` with complete document processing pipeline
- [ ] Implement JSON-RPC protocol for Node.js ↔ Python communication
- [ ] Add automatic GPU detection (CUDA/MPS) with CPU fallback
- [ ] Create persistent Python process with health monitoring
- [ ] Add batch processing optimization for multiple files
- [ ] Implement progress tracking and reporting
- [ ] Update wizard to show Python embeddings option
- [ ] Create model selection logic based on content type detection

**Success Criteria**:
```bash
# Python process auto-starts and detects GPU
folder-mcp add ~/test-folder --model all-MiniLM-L6-v2
# Shows: "✓ GPU detected: NVIDIA RTX 3080 (CUDA)" or "✓ GPU detected: Apple M1 (MPS)"
# Successfully indexes with GPU acceleration
```

### Task 11: MCP Endpoints Migration to Daemon-Centric Architecture
**Status**: ⏳ Waiting  
**Dependencies**: Task 10 (New Embeddings Mechanism)  
**Priority**: **HIGH** - Critical for unified architecture  

**What**: Completely rewrite MCP endpoints to use daemon as single source of truth. Remove all direct configuration access and make MCP endpoints pure daemon clients.

**Why**: Daemon must be the authoritative service. MCP endpoints should only call daemon methods, never access configuration, embeddings, or file systems directly.

**Architecture Change**:
- **Before**: MCP server → Direct config/embedding/file access
- **After**: MCP server → Daemon API calls only

**Subtasks**:
- [ ] Remove all configuration imports from MCP endpoints (HybridConfigLoader, etc.)
- [ ] Replace direct embedding service calls with daemon embedding endpoints
- [ ] Replace direct file system access with daemon file operation endpoints  
- [ ] Replace direct vector search with daemon search endpoints
- [ ] Convert MCP endpoints to pure API relay functions (daemon client)
- [ ] Remove standalone mcp-server.ts dependency injection setup
- [ ] MCP endpoints only interact with daemon via WebSocket/HTTP APIs
- [ ] Delete obsolete configuration and embedding service code
- [ ] Update tests to mock daemon endpoints instead of direct services

### Task 12: Enhanced Process Management
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

### Task 13: Multi-Agent Connection Management
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

### Task 14: System Integration (Auto-start)
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

### Task 15: Complete Documentation and Release Prep
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

### Task 18: Implement Centralized Focus Management System
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
| 4.7 | Complete Folder Configuration Flow | 2025-07-09 | ✅ | Perfect folder config across wizard/CLI/TUI |
| 8 | Multi-Folder Configuration | 2025-07-10 | ✅ | CLI params, model validation, auto-completion |
| 8.5 | SimpleButtonsRow Component | 2025-07-11 | ✅ | Production-ready button component |
| 8.5 | Nested ListItem Visual Component | 2025-07-15 | ✅ | Complete implementation design and documentation |
| 8.5.5 | ContainerListItem with Viewport System | 2025-07-19 | ✅ | Direction-aware bring-into-view with complete viewport architecture |
| 8.6 | Add Folder Wizard Implementation | 2025-07-24 | ✅ | Reusable wizard with validation and dual-button support |


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

### **Visual Bug Solutions Log**
- **Status Bar Border Breaking**: ✅ **FIXED** by removing exit countdown message from header and moving it to status bar where it displays as "Exit:esc(again 3…)"
- **Status Bar Layout**: ✅ **ENHANCED** by changing format from "key:description" to "description:key" with proper styling (descriptions normal, keys bold/bright)

**Methodology Success**: The human-agent collaborative debugging process using `npm run tui 2>debug.log` proved highly effective for character-level TUI bug analysis. All visual issues were resolved through systematic debug log analysis.

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
Simply edit this document and add the task to the appropriate section with its details, then implement it.