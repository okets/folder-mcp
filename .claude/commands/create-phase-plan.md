# create-phase-plan

Create a high-level phase implementation plan from the folder-mcp roadmap with comprehensive context engineering.

## Context Engineering Principles

This command follows context engineering best practices:
- **Minimize Cognitive Load**: Present information in logical, digestible sections
- **Maximize Relevance**: Include ALL context needed to understand and implement the phase
- **Enable Deep Understanding**: Connect phase work to overall project goals and architecture
- **Reduce Back-and-Forth**: Anticipate what information will be needed during implementation

## Usage

```
/create-phase-plan <phase-number>
```

## EXACT Implementation Instructions

When this command is executed, you MUST:

1. **FIRST: Validate Previous Phase Complete (if creating Phase N+1)**:
   - Check `docs/development-plan/roadmap/currently-implementing/` for Phase N documents
   - If Phase N documents exist, verify ALL tasks are ✅ COMPLETED:
     - Read each `Phase-N-Task-X-*.md` file
     - Check "Progress Tracking" → "Assignment Status" for ✅ COMPLETED markers
     - Check "Time Tracking" table for "Complete" status
   - **IF INCOMPLETE**: STOP with validation error message (see template below)
   - **IF COMPLETE**: Archive Phase N documents to `completed/phase-N/`

2. **Archive Previous Phase (if validated complete)**:
   ```bash
   mkdir -p docs/development-plan/roadmap/completed/phase-N
   mv docs/development-plan/roadmap/currently-implementing/Phase-N-*.md \
      docs/development-plan/roadmap/completed/phase-N/
   ```

3. **Read the ENTIRE roadmap file for context**:
   - File: `docs/development-plan/roadmap/folder-mcp-roadmap-1.1.md`
   - First scan for: Project Goal, Architecture sections, Component Definitions, Success Metrics
   - Then find the section starting with `## Phase <number>:`
   - Extract ALL content until the next `## Phase` section
   - Look back for any sections referenced by the phase

4. **Extract these EXACT elements**:
   - Phase number and name from the heading
   - All user stories from "### **User Stories**" section
   - Success criteria from "### **Success Criteria**" section
   - All tasks from "### Task X:" sections (scan for all tasks in the phase)
   - Phase completion review requirements
   - Any configuration examples or architecture details mentioned in tasks
   - Related sections from earlier in roadmap that provide context (e.g., Configuration Architecture, Component Definitions)

5. **Count the tasks correctly**:
   - Search for all "### Task [number]:" patterns within the phase
   - The task count determines the progress tracking

6. **Generate the output file**:
   - Location: `docs/development-plan/roadmap/currently-implementing/Phase-{number}-{name-kebab-case}-plan.md`
   - Use the EXACT template format below
   - Fill in ALL extracted information

### Validation Error Template

If previous phase is incomplete, output this format:

```markdown
❌ **Cannot create Phase [N+1] - Phase [N] is incomplete**

### Issues Found:
- [ ] **Phase-[N]-Task-[X]**: [List incomplete assignments]
- [ ] **Phase-[N]-Task-[Y]**: Time tracking shows "In Progress"
- [ ] **Phase-[N]-Task-[Z]**: Missing ✅ COMPLETED markers

### Required Actions:
1. Complete all remaining assignments in Phase [N]
2. Mark all assignments with ✅ COMPLETED in task documents
3. Update time tracking tables to show "Complete" status
4. Run `/next-please` to verify phase completion
5. Then retry: `/create-phase-plan [N+1]`

**Phase [N] must be 100% complete before starting Phase [N+1]**
```

## Required Output Format

```markdown
# Phase [NUMBER]: [EXACT PHASE NAME FROM ROADMAP] Implementation Plan

**Status**: 📋 PLANNED  
**Start Date**: [TODAY'S DATE]  
**Target Completion**: ~[ESTIMATE BASED ON TASK COUNT]  

## 🎯 **Phase Overview**

[EXACT PHASE GOAL FROM ROADMAP]

### **User Stories**
[COPY ALL USER STORIES VERBATIM FROM ROADMAP]

### **Success Criteria**
[COPY ALL SUCCESS CRITERIA VERBATIM FROM ROADMAP]

## 🏗️ **Implementation Strategy**

### **Core Philosophy**
[EXTRACT KEY PRINCIPLES FROM ROADMAP FOR THIS PHASE]

### **Implementation Approach**
[DEFINE HIGH-LEVEL STRATEGY, e.g.:
- Incremental Approach: Build core system first, then layer features
- Testing Early: Build testing framework alongside implementation
- Schema-First Design: Define complete structure upfront
- Reuse Existing: Leverage existing code where applicable]

### **Why This Order?**
[EXPLAIN THE RATIONALE FOR TASK ORDERING:
- Why certain tasks must come before others
- What dependencies drive the sequence
- How this order optimizes development flow
- What risks are mitigated by this approach]

## 📚 **MUST READ - Essential Project Context**

### Project Goal
[EXTRACT FROM ROADMAP - The overarching project goal and how this phase contributes]

### Architecture Overview
[EXTRACT RELEVANT ARCHITECTURE SECTIONS - System design, component relationships]

### Key Concepts & Terminology
[EXTRACT RELEVANT DEFINITIONS FROM "Component Definitions & Terminology" SECTION]

### Development Philosophy
[EXTRACT RELEVANT PRINCIPLES - e.g., UX-Led Development, Configuration-First approach]

### Success Metrics
[EXTRACT RELEVANT METRICS FROM ROADMAP THAT THIS PHASE IMPACTS]

## 📍 **Current System State**

### What We Have (Foundation)
[EXTRACT RELEVANT ITEMS FROM PHASE 0 SECTION]

### What This Phase Adds
[LIST ALL ❌ ITEMS FROM "What We Need to Build" THAT THIS PHASE ADDRESSES]

## 🚨 **Safety Framework**

### **Backup Strategy**
```bash
# Create backup branch before starting Phase [X]
git checkout -b backup/pre-phase-[X]
git add -A
git commit -m "Backup before Phase [X]: [Phase Name]"

# Create phase branch  
git checkout -b phase-[X]-implementation
```

### **Rollback Plan**
```bash
# If major issues arise, return to backup
git checkout backup/pre-phase-[X]
git checkout -b phase-[X]-retry
```

## 🔍 **Pre-Implementation Review**

### **What to Review**
[BASED ON PHASE CONTEXT, LIST WHAT EXISTING CODE/FEATURES TO REVIEW:
- Existing components that relate to this phase
- Current implementation patterns to follow
- Potential code to reuse or extend
- Known limitations to address]

### **Expected Findings**
[ANTICIPATE WHAT MIGHT BE DISCOVERED:
- Components that can be extended vs rewritten
- Patterns to maintain for consistency
- Gaps in current implementation
- Technical debt to consider]

## 📋 **Phase Tasks Overview**

Total Tasks: [ACTUAL COUNT]
Estimated Duration: ~[ESTIMATE]

| Task # | Task Name | Complexity | Status | Command |
|--------|-----------|------------|--------|---------|
[GENERATE ROW FOR EACH TASK FOUND - USE EXACT TASK NAMES FROM ROADMAP]

### **Task Order Rationale**
[FOR EACH TASK, BRIEFLY EXPLAIN WHY IT'S IN THIS POSITION:
1. Task 1: Foundation that everything else builds on
2. Task 2: Uses output from Task 1, enables Task 3
3. Task 3: etc.]

## 🔗 **Dependencies & Related Work**

### Prerequisite Phases
[IDENTIFY WHAT PREVIOUS PHASES THIS BUILDS ON]
- **Phase 1-5**: What foundations were laid
- **Completed Components**: What existing work this extends

### Inter-Task Dependencies
[MAP OUT HOW TASKS IN THIS PHASE DEPEND ON EACH OTHER]
- Each task's inputs and outputs
- What must be complete before each task can start
- Integration points between tasks

### Future Dependencies
[WHAT FUTURE PHASES DEPEND ON THIS WORK]
- What this phase enables
- Critical paths for future development

### External Dependencies
[ANY EXTERNAL SYSTEMS OR TOOLS REQUIRED]
- Ollama for embeddings
- FAISS for vector search
- Express.js for SSE server
- Cloudflare for tunnels

## 🎯 **Implementation Order**

### Sequential Execution Plan:
[LIST ALL TASKS WITH BRIEF DESCRIPTION OF WHAT EACH ADDS]

### Task Dependencies:
- Task order defines dependencies (Task 2 depends on Task 1, etc.)
- Each task assumes all previous tasks are complete
- No parallel execution - pure linear progress
- Clear handoff points between tasks
- Measurable progress: X/[TOTAL] tasks = Y% complete

## 📚 **Key Implementation Details from Roadmap**

[FOR EACH TASK THAT HAS IMPLEMENTATION DETAILS, CONFIGURATION, OR CODE EXAMPLES IN THE ROADMAP:
### Task X: [Name]
- Include any code snippets
- Include any YAML configuration examples
- Include any specific implementation notes
- Keep the full context that was carefully added to the roadmap]

## 📊 **Phase Progress Tracking**

### **Overall Status**
- [ ] Phase backup created
- [ ] Phase documentation reviewed
- [ ] All task plans generated
[LIST ALL TASKS AS CHECKBOXES]

### **Phase Metrics**
| Metric | Target | Current | Status | Progress |
|--------|--------|---------|--------|----------|
| Tasks Completed | [TOTAL] | 0 | 🔴 | 0% |
| Test Coverage | 80%+ | - | ⏳ | - |
| Documentation | Complete | - | ⏳ | - |
| Time Elapsed | [EST] days | 0 | ⏳ | 0% |

### **Linear Progress Bar**
```
[GENERATE EMPTY BOXES EQUAL TO TASK COUNT] 0/[TOTAL] Tasks (0%)
```

### **Phase Completion Log**
| Task | Status | Completion Date | Key Decisions/Findings |
|------|--------|-----------------|------------------------|
| Pre-Implementation Review | ⏳ | - | - |
| Task 1: [Name] | ⏳ | - | - |
| Task 2: [Name] | ⏳ | - | - |
[CONTINUE FOR ALL TASKS]

### **Milestone Tracking**
| Milestone | Date | Notes |
|-----------|------|-------|
| Phase Started | - | - |
| First Task Complete | - | - |
| 50% Complete | - | - |
| All Tasks Complete | - | - |
| Phase Review | - | - |

## 🔍 **Phase-Specific Context**

[INCLUDE ANY PHASE-SPECIFIC PRINCIPLES FROM ROADMAP]

### Key Architecture Concepts
[EXTRACT RELEVANT ARCHITECTURE SECTIONS, DIAGRAMS, OR COMPONENT DEFINITIONS FROM ROADMAP]

### Configuration Examples
[INCLUDE ANY YAML OR CODE EXAMPLES FROM THE PHASE TASKS]

### Related Roadmap Sections
[REFERENCE AND SUMMARIZE RELEVANT SECTIONS LIKE:
- Configuration Architecture (if Phase 6)
- Component Definitions (if introducing new components)
- System Architecture (if modifying architecture)
- Success Metrics (specific to this phase)]

## ✅ **Phase Validation**

### Build Validation
```bash
npm run build
# Expected: 0 errors after phase completion
```

### Test Suite Validation
```bash
npm test
# Expected: All existing tests pass + new tests added
```

### Feature Validation
[PHASE-SPECIFIC VALIDATION COMMANDS BASED ON WHAT THE PHASE IMPLEMENTS]

## 📝 **Phase Completion Checklist**

Before marking this phase complete:
- [ ] All tasks completed and validated
- [ ] No regression in existing functionality  
- [ ] Documentation updated
- [ ] Tests added for new features
- [ ] Phase review conducted
- [ ] Next phase dependencies satisfied

[INCLUDE PHASE COMPLETION REVIEW REQUIREMENTS FROM ROADMAP IF SPECIFIED]

## 🚀 **Next Steps**

After completing this phase:
1. Run `/create-phase-plan [NEXT PHASE NUMBER]` for Phase [X+1]: [NEXT PHASE NAME]
2. Conduct phase retrospective
3. Update roadmap with actual timings

---

**To implement individual tasks, use:**
```
/create-task-plan [PHASE] 1  # Start with first task
```
```

## CRITICAL EXTRACTION RULES

1. **Task Counting**: You MUST find ALL "### Task X:" sections in the phase to get accurate count
2. **Exact Names**: Use EXACT task names from roadmap, not summaries
3. **Phase Boundaries**: Stop extracting when you hit the next "## Phase" section
4. **User Stories**: Copy them VERBATIM, including bullet formatting
5. **Success Criteria**: Include ALL criteria from the phase section
6. **Implementation Details**: Include ALL code examples, YAML configs, and detailed explanations from each task
7. **Broader Context**: Look for related sections in the roadmap that provide context:
   - For Phase 6: Include Configuration Architecture section
   - For Phase 7: Include endpoint details and search modes
   - For Phase 8: Include transport decisions and SSE details
   - Component Definitions when new components are introduced
   - System Architecture when it's being modified

## Example Extraction for Phase 6

From roadmap you should find:
- Phase Name: "Configuration Foundation & CLI/TUI Parity"
- Task Count: 6 (not 11)
- Tasks:
  1. Configuration System Foundation
  2. Basic Daemon Architecture  
  3. Extend MCP Server for Multiple Folders
  4. Configuration-Aware CLI Commands
  5. Configuration-Driven TUI
  6. CLI/TUI Parity Validation

## Validation

After generating, verify:
- [ ] Task count matches actual tasks in roadmap phase
- [ ] All task names are exact matches
- [ ] User stories are complete
- [ ] Success criteria are included
- [ ] File is created in correct location