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

### **Core Philosophy**
- **Integration First**: Connect what exists before adding new features
- **User Journey**: Follow the user's path to discover pain points
- **Iterative Refinement**: Quick iterations with continuous improvement
- **Document as We Go**: Capture decisions and discoveries in real-time

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

#### Task 4: Implement Transformers.js Embeddings
**Status**: ⏳ Waiting  
**Discovered**: 2025-07-08  
**What**: Add offline embeddings with Transformers.js including proper mean pooling.

**Why**: Critical gap - we have no offline embeddings and no mean pooling implementation. This enables true offline operation.

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

**Task Completion Protocol**:
- [ ] Mark progress on this document
- [ ] Summarize what was done and describe UX testing
- [ ] Wait for confirmation before commit

**UX Testing Instructions**:
[To be filled when task is completed]

#### Task 5: Basic CLI Command Structure
**Status**: ⏳ Waiting  
**Discovered**: 2025-07-08  
**What**: Implement core CLI commands that communicate with the daemon.

**Why**: Power users need CLI access, and the wizard needs these commands to work under the hood.

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

**Task Completion Protocol**:
- [ ] Mark progress on this document
- [ ] Summarize what was done and describe UX testing
- [ ] Wait for confirmation before commit

**UX Testing Instructions**:
[To be filled when task is completed]

#### Task 6: Enhanced Process Management
**Status**: ⏳ Waiting  
**Discovered**: 2025-07-08  
**What**: Robust daemon lifecycle management with auto-start and recovery.

**Why**: Production systems need reliable process management, including handling crashes and stale PIDs.

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

**Task Completion Protocol**:
- [ ] Mark progress on this document
- [ ] Summarize what was done and describe UX testing
- [ ] Wait for confirmation before commit

**UX Testing Instructions**:
[To be filled when task is completed]

#### Task 7: Multi-Agent Connection Management
**Status**: ⏳ Waiting  
**Discovered**: 2025-07-08  
**What**: Add HTTP transport for MCP and implement Agents Connection screen.

**Why**: Users want to use multiple AI agents (Claude Desktop, VSCode, etc) but stdio only supports one connection.

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

**Task Completion Protocol**:
- [ ] Mark progress on this document
- [ ] Summarize what was done and describe UX testing
- [ ] Wait for confirmation before commit

**UX Testing Instructions**:
[To be filled when task is completed]

#### Task 8: Enhanced Setup Wizard
**Status**: ⏳ Waiting  
**Discovered**: 2025-07-08  
**What**: Full wizard experience with system detection and smart defaults.

**Why**: First impressions matter - the wizard should detect available options and guide users to the best setup.

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

**Task Completion Protocol**:
- [ ] Mark progress on this document
- [ ] Summarize what was done and describe UX testing
- [ ] Wait for confirmation before commit

**UX Testing Instructions**:
[To be filled when task is completed]

#### Task 9: System Integration (Auto-start)
**Status**: ⏳ Waiting  
**Discovered**: 2025-07-08  
**What**: Operating system integration for auto-start on boot.

**Why**: Production deployments need the daemon to start automatically.

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

**Task Completion Protocol**:
- [ ] Mark progress on this document
- [ ] Summarize what was done and describe UX testing
- [ ] Wait for confirmation before commit

**UX Testing Instructions**:
[To be filled when task is completed]

#### Task 10: Multi-Folder Support
**Status**: ⏳ Waiting  
**Discovered**: 2025-07-08  
**What**: Support multiple indexed folders with isolation.

**Why**: Users have knowledge in different folders and want to search across them or keep them separate.

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

**Task Completion Protocol**:
- [ ] Mark progress on this document
- [ ] Summarize what was done and describe UX testing
- [ ] Wait for confirmation before commit

**UX Testing Instructions**:
[To be filled when task is completed]

### Final Task: Complete Documentation and Release Prep
**Status**: ⏳ Waiting  
**What**: Update all documentation and prepare for release.

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
| 4 | Implement Transformers.js | 2025-07-08 | ⏳ | Offline embeddings with mean pooling |
| 5 | Basic CLI Commands | 2025-07-08 | ⏳ | add, list, status, remove |
| 6 | Enhanced Process Management | 2025-07-08 | ⏳ | Auto-start, crash recovery |
| 7 | Multi-Agent Connections | 2025-07-08 | ⏳ | stdio + HTTP support |
| 8 | Enhanced Setup Wizard | 2025-07-08 | ⏳ | System detection, smart defaults |
| 9 | System Integration | 2025-07-08 | ⏳ | Auto-start on boot |
| 10 | Multi-Folder Support | 2025-07-08 | ⏳ | Isolated folder management |
| Final | Documentation & Release | 2025-07-08 | ⏳ | Complete docs and checklist |

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

---

**To add a new task to this phase:**
Simply edit this document and add the task to the "Discovered Tasks" section with its details, then implement it.