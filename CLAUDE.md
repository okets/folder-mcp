# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Workflow Preferences

**File Modification Policy**: 
- ✅ **Edit files freely** - No permission needed for any file changes
- ✅ **Run builds/tests freely** - Verify changes work automatically  
- ✅ **Show results** - Let you review the changes and outcomes
- ⚠️ **Confirm git commits only** - Always ask before `git commit` or `git push`

**Rationale**: Git provides complete rollback protection. Focus on efficient development, not file permission overhead.

## Essential Commands

**Build and Development:**
```bash
npm run build          # Build TypeScript to dist/
npm run dev            # Build and run development server
npm start              # Run production server
```

**TUI Interface:**
```bash
npm run tui            # Launch unified TUI interface (main entry point)
npm run tuidemo        # Run TUI demo/testing interface
```

**CLI Commands:**
```bash
folder-mcp             # Launch TUI by default (future: detect daemon)
folder-mcp --daemon    # Start daemon only (no TUI)
folder-mcp --headless  # Skip TUI, run headless (future)
folder-mcp config      # Configuration management subcommands
```

**Configuration CLI:**
```bash
folder-mcp config get <key>              # Get configuration value
folder-mcp config set <key> <value>      # Set configuration value
folder-mcp config show [--sources]       # Show configuration (with sources)
folder-mcp config validate               # Validate configuration
folder-mcp config env list               # List environment variables
```

**Testing:**
```bash
npm test               # Run all tests with Vitest
npm run test:watch     # Run tests in watch mode
npm run test:unit      # Run unit tests only
npm run test:integration # Run integration tests only
npm run test:e2e       # Run end-to-end tests
npm run test:performance # Run performance tests
npm run test:coverage  # Generate coverage report
```

**Configuration Testing:**
```bash
npm run test:unit -- tests/config/        # Run configuration unit tests
npm run test:integration -- tests/integration/config/  # Run configuration integration tests
```

**MCP Server Usage:**
```bash
node dist/mcp-server.js <folder-path>  # Start MCP server with folder path
```

## What is folder-mcp?

**folder-mcp** is a tool that turns any machine into an MCP server, providing semantic search and file reading capabilities to AI agents (Claude, VSCode, Cursor, or any MCP-compatible client). 

### Core Purpose
- **Transform any folder/filesystem** into a semantically searchable knowledge base
- **Universal MCP server** - Works with any MCP client (not just Claude)
- **Multi-folder support** - Configure and serve multiple folders simultaneously
- **Local or cloud access** - Use locally or expose via Cloudflare tunnel with custom domain
- **GPU-accelerated embeddings** - Python-based embeddings for high-quality semantic search
- **Always-running daemon** - Background service with auto-start on boot

### User Experience Vision
```bash
# Install once
npm install -g folder-mcp

# Launch TUI to configure
folder-mcp

# In TUI:
# - Add multiple folders to serve
# - Configure local/cloud access
# - Set up embedding models
# - Monitor daemon status

# Daemon runs forever, any MCP client can connect
```

## Architecture Overview

This is a **Model Context Protocol (MCP) server** that provides semantic file system access to LLMs through structured tools. The architecture follows **Clean Architecture principles** with strict domain/infrastructure separation.

### Core Architecture Layers

**Domain Layer (`src/domain/`):**
- Pure business logic with no external dependencies
- File operations, content processing, embeddings, search abstractions
- Domain services are injected with infrastructure providers

**Application Layer (`src/application/`):**
- Orchestrates domain services for complex workflows
- Three main workflows: Indexing, Monitoring (file watching), Serving (knowledge)
- Contains business process logic and coordination

**Infrastructure Layer (`src/infrastructure/`):**
- Concrete implementations of domain abstractions
- File system, caching, logging, error recovery
- Node.js-specific providers for cross-platform support

**Interface Layer (`src/interfaces/`):**
- **MCP Server** (`interfaces/mcp/`): Main entry point implementing MCP protocol
- **CLI Interface** (`interfaces/cli/`): Command-line tools and utilities
- **TUI Interface** (`interfaces/tui-ink/`): Visual terminal interface built with React/Ink
- **TUI Demo** (`interfaces/tui-ink-demo/`): Component showcase and testing interface

### Dependency Injection System

Located in `src/di/`, this system:
- Provides centralized service registration and resolution
- Supports both sync and async service creation
- Uses token-based service identification
- Enables clean testing through mock injection

Key files:
- `di/setup.ts` - Main DI configuration
- `di/interfaces.ts` - Service tokens and interfaces
- `di/container.ts` - Core container implementation

### Configuration System

The project uses a comprehensive hierarchical configuration system with multiple sources and validation:

**Configuration Hierarchy (highest priority wins):**
1. **Defaults** (Priority 0) - Smart defaults embedded in code
2. **System Config** (Priority 1) - `/etc/folder-mcp/config.yaml` (optional)
3. **User Config** (Priority 2) - `~/.folder-mcp/config.yaml`
4. **Environment Variables** (Priority 4) - `FOLDER_MCP_*` variables
5. **Runtime** (Priority 5) - CLI flags and programmatic changes

**Key Features:**
- YAML configuration files with flat structure
- Comprehensive environment variable support (`FOLDER_MCP_*`)
- Configuration validation with helpful error messages
- Configuration source tracking
- Hot reload capabilities
- CLI management commands (`folder-mcp config`)

**Essential Environment Variables:**
- `FOLDER_MCP_MODEL_NAME` - Embedding model name
- `FOLDER_MCP_BATCH_SIZE` - Processing batch size
- `FOLDER_MCP_DEVELOPMENT_ENABLED` - Enable development mode
- `FOLDER_MCP_DEVELOPMENT_ENABLED` - Enable development mode

**Configuration Management:**
```bash
folder-mcp config get modelName           # Get configuration value
folder-mcp config set batchSize 64        # Set configuration value
folder-mcp config show --sources          # Show configuration hierarchy
folder-mcp config validate               # Validate configuration
folder-mcp config env list               # List environment variables
```

**Core Implementation:**
- `src/config/manager-refactored.ts` - Main configuration manager with hierarchy support
- `src/config/interfaces.ts` - Configuration interfaces and tokens
- `src/config/di-setup.ts` - Dependency injection setup for configuration services
- `src/interfaces/cli/commands/config.ts` - CLI configuration management commands

**Default Configuration Values:**
- Cache directory: `~/.cache/folder-mcp`
- Max cache size: `10GB`
- Cleanup interval: 24 hours
- Chunk size: 1000
- Chunk overlap: 200
- Batch size: 32
- Model: `nomic-embed-text` (Ollama)

See `docs/configuration.md` for complete configuration documentation.

## Key Components and Their Roles

### 1. Always-Running Daemon
- **Purpose**: Background service that manages all configured folders
- **Features**: 
  - Auto-starts on boot with user-level permissions
  - Manages multiple folder configurations
  - Handles MCP server instances
  - WebSocket server for real-time communication
  - Health monitoring and auto-recovery

### 2. Full-Screen TUI (Terminal User Interface)
- **Purpose**: Configuration and management interface
- **Features**:
  - Add/remove multiple folders
  - Configure local access (ports, authentication)
  - Configure cloud access (Cloudflare tunnel)
  - Select embedding models
  - Monitor daemon health and statistics
  - View real-time logs

### 3. MCP Server Implementation
- **Entry Point:** `src/mcp-server.ts` - Main server that:
  1. Sets up dependency injection
  2. Starts MCP protocol server
  3. Initializes file indexing and watching
  4. Handles graceful shutdown

- **CRITICAL:** All logging MUST go to stderr only. MCP clients expect only valid JSON-RPC on stdout.

- **Tools Provided:**
  - `search` - Semantic search across documents (powered by embeddings)
  - `get_document_outline` - Extract document structure
  - `get_document_data` - Get document content and metadata
  - `list_folders/documents` - File system browsing
  - `get_sheet_data/slides/pages` - Format-specific data extraction

### 4. Embedding System
- **Primary**: Python-based GPU-accelerated embeddings
  - High-quality semantic search
  - Curated model list (all-MiniLM-L6-v2, all-mpnet-base-v2, etc.)
  - First-run model download (~400MB)
- **Power User Option**: Ollama integration
  - For additional models not in curated list
  - NOT a fallback - an advanced feature

## File Processing Pipeline

**Supported Formats:** PDF, DOCX, XLSX, PPTX, TXT, MD

**Processing Flow:**
1. File parsing (`domain/files/parser.ts`)
2. Content chunking (`domain/content/chunking.ts`)
3. Embedding generation (Python or Ollama)
4. Vector storage (FAISS-based)

**Embedding Providers:**
- **Python Embeddings** (Primary):
  - Located in `src/infrastructure/embeddings/python/`
  - GPU-accelerated via PyTorch
  - Runs as subprocess with JSON-RPC communication
  - Includes keep-alive and priority queue features
- **Ollama Integration** (Power user option):
  - API URL: `http://127.0.0.1:11434`
  - Additional model flexibility
  - Requires separate Ollama installation

**Security Features:**
- Directory traversal attack prevention
- Automatic exclusion of sensitive directories:
  - `**/node_modules/**`
  - `**/.git/**`
  - `**/.folder-mcp/**`
- Permission error handling with graceful degradation

## Testing Strategy

**Memory-Optimized:** Vitest config uses single-fork execution to prevent memory issues
**Test Categories:**
- **Unit tests** - Test individual components in isolation
- **Integration tests** - Test service interactions and workflows
- **Real integration tests** - Test with actual file fixtures in `tests/fixtures/`
- **Performance tests** - Memory and speed benchmarks
- **E2E tests** - Full MCP protocol scenarios

**Test Data:** Located in `tests/fixtures/test-knowledge-base/` with realistic business documents.

## Development Mode Features

Enable with `FOLDER_MCP_DEVELOPMENT_ENABLED=true`:
- Hot reload on file changes
- Enhanced debugging output
- Real-time file system monitoring
- Development-specific MCP endpoints
- Configuration hot reload
- Enhanced error reporting

## Key Integration Points

**Claude Desktop Configuration:**
```json
{
  "mcpServers": {
    "folder-mcp": {
      "command": "node",
      "args": ["path/to/dist/mcp-server.js", "/path/to/folder"],
      "env": {}
    }
  }
}
```

**VSCode MCP:** Configured via `vscode-mcp-config.json` with development server support.

## Important Implementation Notes

- **Security:** All file paths are validated to prevent directory traversal
- **Performance:** Uses incremental indexing and file watching for efficiency
- **Cross-platform:** Supports Windows, macOS, and Linux through abstracted providers
- **Error Recovery:** Graceful degradation when embedding services unavailable
- **Memory Management:** Careful resource cleanup and garbage collection in tests

## Collaborative Approach

When the user requests features or approaches that may have better alternatives, I should:
- **Challenge constructively:** Offer alternative solutions that might be more elegant or user-friendly
- **Ask clarifying questions:** Understand the real need behind the request
- **Suggest improvements:** Propose better UX patterns or technical approaches when appropriate
- **Be proactive:** Don't just implement what's asked - think about the user experience and offer better solutions

## Visual Design and UX Guidelines

**CRITICAL:** When working on visual elements, TUI layouts, or UX features:
- **NEVER break consistency** by changing design patterns without explicit permission
- **ASK BEFORE DECIDING** - Always ask the user before making fundamental changes to visual design or UX patterns
- **Test visual changes** by running the code and verifying the output before claiming completion
- **Preserve existing functionality** - Don't remove features to solve problems unless explicitly requested
- When fixing visual bugs, maintain the original design intent and only fix the specific issue requested

## Commit Policy

**CRITICAL:** NEVER commit code without explicit user confirmation:
- **ASK FOR CONFIRMATION** - Always ask the user to confirm that the task is completed and the fix works before attempting to commit
- **VERIFY FIXES** - Actually test and verify that the problem is solved, don't just assume it's fixed
- **NO AUTO-COMMITS** - Don't commit "partial fixes" or "work in progress" without user approval
- **WAIT FOR APPROVAL** - The user must explicitly say the task is complete before any git commit is made

## TUI Visual Debugging Methodology

When the user mentions "visual bugs", "TUI bugs", or provides ASCII screenshots of terminal interfaces, use this systematic approach:

### 1. Count and Measure First
- Start every investigation by understanding the resolution.
- Count the exact number of rows/columns in the provided ASCII screenshot
- Identify each visual element and its position
- Note empty lines, spaces, and special characters
- Create a mental or written map of what you see

### 2. Compare Against Code
- Look up the actual data arrays in the code (e.g., how many items exist)
- Find the relevant calculation functions (height, width, scrollbar, etc.)
- Identify what the expected values should be based on the code

### 3. Reconstruct the Visual
- Create a simple test script to verify calculations
- Use console.log to show the visual representation
- Test edge cases (first item, last item, middle positions)
- Show the math step-by-step

### 4. Analyze Discrepancies
- Compare calculated vs actual visible elements
- Identify where counts don't match
- Trace through the exact calculations with real numbers
- Use comments like "but screenshot shows X" when there's a mismatch

### 5. Test Your Solution
- Create small test files to verify the fix
- Show before/after calculations
- Verify edge cases still work
- Clean up test files after verification

### Example Analysis Format
```
From the screenshot:
- Total rows in panel: X (excluding borders)
- Visible items: Y
- Empty lines: Z
- Scrollbar length: N cells

From the code:
- Total items: A (from array length)
- Calculated visible: B
- Box overhead: C

Discrepancy: Expected X but seeing Y
```

### Key Principles
- Don't guess - count and calculate
- Show your math explicitly
- Test edge cases (top, bottom, middle)
- Verify visually that the fix matches the screenshot
- Use descriptive variable names in test scripts

## Critical Technical Challenges

### Python Embeddings Distribution
**The Challenge**: folder-mcp requires Python with GPU-accelerated ML libraries (torch, sentence-transformers) for high-quality semantic search. This is complex because:
- Users shouldn't need to install Python or manage dependencies
- Total size with dependencies can exceed 1GB
- Different platforms need different binaries
- Must work immediately after `npm install -g folder-mcp`

**Current Status**: Python embedding system is coded but not yet working in tests due to:
- Import structure issues (relative imports in directly executed scripts)
- Missing dependencies in test environment
- No distribution mechanism implemented

**Solution Being Implemented**: Pre-compiled Python executables using PyInstaller, distributed via npm postinstall scripts.

## Phase 8: Unified Application Flow

**CURRENT PHASE - IN PROGRESS**

Phase 8 is focused on creating a unified application experience that combines all components into a cohesive system. Key aspects:

### Vision & Goals
- **Unified Entry Point**: Single `folder-mcp` command that intelligently routes to appropriate interface
- **First-Run Wizard**: Smart setup flow for new users with folder selection, model detection, and configuration
- **Visual TUI as Default**: Launch TUI by default, with options for daemon-only or headless modes
- **Daemon Architecture**: Background service that persists between TUI sessions (future)
- **Zero Configuration**: Smart defaults with auto-detection of models, languages, and optimal settings

### Phase 8 Working Rules
1. **DELETE, DON'T MIGRATE** - Replace old functionality completely, no migration needed
2. **ZERO TECHNICAL DEBT** - No mocks, stubs, or TODOs - implement properly or not at all
3. **ALL TESTS MUST PASS** - Fix failing tests or delete irrelevant ones
4. **MAINTAIN ARCHITECTURE** - Respect clean architecture boundaries
5. **COMMIT ONLY WHEN INSTRUCTED** - Work accumulates until explicitly told to commit

### Completed Tasks
- **Task 1**: Simplified TUI entry point - single `npm run tui` command
- **Task 2**: Visual TUI as default interface documentation
- **Task 3**: Minimal first-run wizard with folder picker

### Current Implementation
- **First-Run Wizard**: Located in `src/interfaces/tui-ink/components/FirstRunWizard.tsx`
- **Unified TUI Entry**: Single entry point at `src/interfaces/tui-ink/index.tsx`
- **CLI Entry Point**: `src/interfaces/cli/folder-mcp.ts` with future daemon support
- **Generic Components**: Reusable `GenericListPanel` for consistent list behavior

### TUI Architecture
- **Focus Management**: Tab navigation between panels with proper focus states
- **Keyboard Handling**: Consistent shortcuts across all panels (arrows, enter, escape)
- **Visual Consistency**: Rounded borders, proper scrollbars, and focus indicators
- **Component Reuse**: Generic components for lists, panels, and navigation

### Key Files
- Phase 8 Plan: `docs/development-plan/roadmap/currently-implementing/Phase-8-Unified-Application-Flow-plan.md`
- Unified Architecture Design: `docs/design/unified-app-architecture.md`
- TUI Components: `src/interfaces/tui-ink/components/`
- CLI Commands: `src/interfaces/cli/commands/`

## TUI Component Guide

### Core Components
- **AppFullscreen**: Main application container that manages the full TUI experience
- **GenericListPanel**: Reusable list component with scrolling, selection, and keyboard navigation
- **BorderedBox**: Container with rounded borders and optional focus states
- **NavigationBar**: Tab-based navigation between different panels
- **FirstRunWizard**: Initial setup wizard for new users with folder selection

### TUI Panels
- **MainPanel**: Primary content area (currently shows wizard or main interface)
- **SecondaryPanel**: Configuration and settings interface
- **StatusPanel**: System status and information display

### Component Patterns
- All list components should extend or use `GenericListPanel` for consistency
- Focus management uses `hasFocus` prop with visual border changes
- Keyboard shortcuts are standardized: arrows for navigation, enter to select, escape to go back
- Scrollbars use consistent characters: ▲ (top), ┃ (middle), ▼ (bottom)

### Testing TUI Components
```bash
npm run tui        # Run the main TUI application
npm run tuidemo    # Run component demos and tests
```

### TUI Development Tips
- Always test in a real terminal, not VS Code's integrated terminal
- Use `console.error()` for debugging (stdout is reserved for Ink rendering)
- Test with different terminal sizes to ensure responsive behavior
- Verify keyboard navigation works smoothly between all interactive elements

## TUI Development Guidelines

### Critical TUI Dos and Don'ts

#### The Golden Rule: State Change Signaling
In TUI development, **only trigger re-renders when state actually changes**. Terminal UIs physically redraw the screen, unlike web UIs that use virtual DOM diffing.

#### ✅ DO:
- Return `true` from `handleInput` ONLY when state actually changes
- Check boundaries before claiming navigation happened
- Use accurate state change signaling
- Test visual changes in real terminal before claiming completion
- Use character-level precision for layout calculations
- Store old state before modifying to compare for changes

#### ❌ DON'T:
- Return `true` from input handlers without verifying state changed
- Trigger re-renders unnecessarily (terminal redraws are expensive)
- Assume navigation is possible without boundary checks
- Change visual design patterns without permission
- Trust calculations without testing actual terminal output
- Use blanket `return true` at the end of handleInput methods

### The Anti-Pattern That Causes Flickering
```typescript
// DON'T DO THIS - causes flickering at boundaries:
handleInput(input: string, key: Key): boolean {
    if (key.downArrow) {
        this.index = Math.min(this.max, this.index + 1);
        return true; // WRONG! Returns true even when already at max
    }
    return true; // WRONG! Consumes all input
}
```

### The Correct Pattern
```typescript
// DO THIS - prevents flickering:
handleInput(input: string, key: Key): boolean {
    if (key.downArrow) {
        const oldIndex = this.index;
        const newIndex = Math.min(this.max, this.index + 1);
        if (newIndex !== oldIndex) {
            this.index = newIndex;
            return true; // State actually changed
        }
        return false; // Already at boundary, no change
    }
    return false; // Don't consume unhandled input
}
```

### Why This Matters
1. **Terminal Rendering**: Unlike web browsers, terminals must physically redraw characters
2. **Cascade Effect**: `handleInput` returning `true` → `setItemUpdateTrigger` → panel re-render → screen flicker
3. **User Experience**: Flickering is jarring and makes the app feel unresponsive
4. **Performance**: Unnecessary re-renders waste CPU and can cause lag

### Key Areas to Check
- **Navigation boundaries**: First/last item in lists
- **Container components**: When navigating within nested components
- **File pickers**: When at root directory or deepest folder
- **Selection lists**: When at first/last option
- **Any scrollable content**: When at top/bottom of scroll area

### Human-Agent TUI Debugging Methodology

**Problem**: Claude Code cannot run TUI applications directly due to non-interactive terminal limitations.

**Solution**: Human-agent collaborative debugging process:

1. **Agent adds comprehensive logging** - Character counts, available space, exact calculations with descriptive labels
2. **Agent builds the code** - `npm run build` to compile TypeScript changes
3. **Human runs TUI with stderr capture**: `npm run tui 2>debug.log`
4. **Human confirms completion** - Simple "done" or "please check" message
5. **Agent reads debug.log** - Analyzes character-level discrepancies from the log file
6. **Agent identifies root cause** - Using precise character math and layout calculations  
7. **Agent implements fix** - Based on debug log analysis
8. **Iterate steps 2-7** until human confirms the bug is resolved
9. **Agent removes debug logs** - Clean up only after human confirms fix is complete

**Human Feedback During Iteration:**
- **Issue persists**: "Still the same" - Agent continues with current approach
- **New issues**: Human describes new problems, may provide:
  - Verbal description of visual issues
  - ASCII screenshots of terminal output
  - Image screenshots showing the problem
  - Suggested solutions or observations
- **Resolution**: Human explicitly confirms "bug is resolved" or "looks good now"

**Key Principles:**
- **Terminal is a 2D character matrix** - Every character position matters in responsive TUI
- **Character-level precision** - Debug logs must show exact character counts at each step
- **Human verification required** - Agent never decides bug is solved without human confirmation
- **Systematic approach** - Follow width flow from terminal → panel → component → text rendering
- **Wait for human approval** - Only remove debug logs after human confirms the fix works

**Example Debug Log Pattern:**
```typescript
console.error(`\\n=== COMPONENT WIDTH CALCULATION ===`);
console.error(`Terminal columns: ${columns}`);
console.error(`Panel width: ${width} || ${columns - 2} = ${panelWidth}`);
console.error(`borderOverhead: ${borderOverhead}`);
console.error(`itemMaxWidth: ${panelWidth} - ${borderOverhead} = ${itemMaxWidth}`);
console.error(`=== END COMPONENT WIDTH ===\\n`);
```

This methodology has proven highly effective for resolving TUI visual bugs through systematic character-level analysis.