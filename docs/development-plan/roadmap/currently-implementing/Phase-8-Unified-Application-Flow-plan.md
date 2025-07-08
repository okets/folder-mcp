# Phase 8: Unified Application Flow Implementation Plan

**Status**: 🚧 IN PROGRESS  
**Start Date**: 2025-07-08  
**Approach**: Dynamic/Exploratory - Tasks defined as discovered  

## 🎯 **Phase Overview**

Create a unified application flow that combines the GUI, daemon control, and all existing components into a cohesive, production-ready application.

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

#### Task 2: Visual TUI as Default Interface
**Status**: 🎯 Ready for Implementation  
**Discovered**: 2025-07-08  
**What**: Make TUI the default interface when users run `folder-mcp`, with service status displayed in the header line.

**Why**: Users should get immediate visual feedback when running `folder-mcp`. The TUI loads instantly while background services start, showing progress in the header.

**Core Requirements:**
1. **Immediate TUI Launch**: `folder-mcp` shows TUI instantly
2. **Background Service Startup**: MCP server and other services start after TUI loads
3. **Status in Header**: Add "status: Starting services..." then "status: Ready" after the folder name
4. **Headless Bypass**: `folder-mcp --headless` skips TUI entirely

**Implementation Flow:**
```bash
folder-mcp
→ TUI renders immediately with "📁 folder-mcp    status: Starting services..."
→ Background: MCP server starts  
→ Header updates to "📁 folder-mcp    status: Ready"

folder-mcp --headless  
→ No TUI, runs current behavior directly
```

**Visual Design:**
```
╭─────────────────────────────────────────────── [default]  68w39h ╮
│ 📁 folder-mcp    status: Starting services...                   │
╰──────────────────────────────────────────────────────────────────╯

→ becomes →

╭─────────────────────────────────────────────── [default]  68w39h ╮
│ 📁 folder-mcp    status: Ready                                   │
╰──────────────────────────────────────────────────────────────────╯
```

**Technical Approach:**
- Modify main entry point to parse `--headless` flag
- Default: Launch TUI immediately, then start services
- Add status text component in header after "📁 folder-mcp"
- `--headless`: Run existing CLI/server logic directly

**Subtasks:**
- [ ] Create unified entry point with `--headless` detection
- [ ] Launch TUI immediately on default path
- [ ] Add "status: Starting services..." text in header
- [ ] Start background services after TUI initialization  
- [ ] Update status text to "status: Ready"
- [ ] Preserve existing headless functionality

### Final Task (Predefined):
- **Update Roadmap Document**: 
  1. Document Phase 8 summary in `docs/development-plan/roadmap/folder-mcp-roadmap-1.1.md`
  2. Update future phases if we've completed their work in Phase 8
  3. Adjust upcoming phase instructions based on Phase 8 practices

## 📊 **Progress Tracking**

### **Discovered Tasks Log**
| Task # | Task Description | Discovered Date | Status | Notes |
|--------|------------------|-----------------|--------|-------|
| 1 | Simplify TUI Entry Point | 2025-07-08 | ✅ | Single command instead of multiple screens |
| 2 | Visual TUI as Default Interface | 2025-07-08 | 🎯 | TUI-first with --headless option |
| Final | Update Roadmap Document | 2025-07-08 | ⏳ | Predefined |

### **Key Discoveries**
- **Task 1**: The TUI had accumulated multiple entry points for different screens (config, status, folders, wizard) which added complexity. By removing these and creating a single entry point, we simplify the user experience and prepare for a unified flow where navigation happens within the app rather than through different commands.

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