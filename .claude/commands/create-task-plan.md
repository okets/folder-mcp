# create-task-plan

Create a detailed, context-aware implementation plan for a specific task.

## Usage

```
/create-task-plan <phase-number> <task-number>
```

## EXACT Implementation Instructions

When this command is executed, you MUST:

1. **Read the roadmap file**:
   - File: `docs/development-plan/roadmap/folder-mcp-roadmap-1.1.md`
   - Find `## Phase <phase-number>:`
   - Within that phase, find `### Task <task-number>:`
   - Extract ALL content for that specific task

2. **Extract these EXACT elements from the task**:
   - Task name from the heading
   - **Goal** statement
   - **Scope** items (all bullet points)
   - **Implementation Details** (if present)
   - **Configuration** examples (if present)
   - **Completion Criteria** (all checkboxes)
   - **Testing** requirements

3. **Gather context from**:
   - Phase-level user stories that relate to this task
   - Configuration principles from the phase
   - Any code examples in the task section
   - Dependencies mentioned in scope

4. **Generate the output file**:
   - Location: `docs/development-plan/roadmap/currently-implementing/Phase-{phase}-Task-{number}-{name-kebab}.md`
   - Break scope into logical assignments (3-5 assignments per task)
   - Each assignment should be independently implementable

## Assignment Generation Rules

### For Configuration Tasks:
1. Schema/Interface definition
2. Implementation with validation
3. Integration with existing systems
4. Testing and documentation

### For Service/Manager Tasks:
1. Interface definition (domain layer)
2. Implementation with DI
3. DI container registration
4. Unit tests with mocks
5. Integration tests

### For CLI/TUI Tasks:
1. Command structure setup
2. Core functionality implementation
3. Configuration integration
4. User feedback/validation
5. Testing

### CRITICAL: Configuration System Planning
Since the configuration system drives ALL functionality:
- **ALWAYS** include configuration schema changes in relevant tasks
- **ALWAYS** define how the feature will be configuration-driven
- **ALWAYS** plan configuration validation and defaults

## Required Output Format

```markdown
# Task [PHASE].[NUMBER]: [EXACT TASK NAME FROM ROADMAP]

**Phase**: [PHASE NUMBER] - [PHASE NAME]  
**Status**: 🚧 IN PROGRESS  
**Created**: [TODAY'S DATE]  
**Complexity**: [High/Medium/Low based on scope size]  
**Approach**: [Brief strategy for this task]

## 🚨 **EXECUTION REQUIREMENTS**

**⚠️ CRITICAL: This task plan MUST be executed using the `/execute-prp` command.**

```bash
/execute-prp docs/development-plan/roadmap/currently-implementing/Phase-[X]-Task-[Y]-[name].md
```

**❌ PROHIBITED**: Direct implementation without execute-prp
- Bypasses architectural validation
- Skips DI enforcement checks  
- Avoids progress tracking
- Violates established workflow

**✅ MANDATORY WORKFLOW**:
1. Task plan created with `/create-task-plan [phase] [task]`
2. Task executed with `/execute-prp [task-plan-file]`
3. All assignments validated through execute-prp
4. Progress tracking maintained automatically
5. Only commit after execute-prp completion

## 🎯 **Task Objective**

[EXACT GOAL FROM ROADMAP TASK]

## 🔍 **Pre-Implementation Checklist**

- [ ] Review existing code in: [LIST RELEVANT DIRECTORIES]
- [ ] Identify reusable components: [LIST EXPECTED COMPONENTS]
- [ ] Check for similar patterns in: [LIST REFERENCE FILES]
- [ ] Consider platform differences: [Windows/Unix/Cross-platform]
- [ ] Review related tests: [LIST TEST DIRECTORIES]

## 📋 **Scope**

[CONVERT ALL SCOPE BULLETS TO CHECKBOXES]
- [ ] [Scope item 1 from roadmap]
- [ ] [Scope item 2 from roadmap]
- [ ] [Continue for all scope items]

## 📚 **Essential Project Context**

### From Completed Work
[REFERENCE RELEVANT COMPLETED PHASES/TASKS]
- Phase 1-5: MCP endpoints, file processing, TUI framework  
- Current capabilities: 9 MCP endpoints, FAISS search, Ollama embeddings

### Critical Files to Understand
[LIST RELEVANT FILES BASED ON TASK SCOPE]

## 🔗 **Dependencies & Related Work**

### Prerequisite Tasks
[LIST PREVIOUS TASKS IN THIS PHASE IF TASK NUMBER > 1]

### Task Sequence
- **Previous**: [Task X-1 name] - [What it provided]
- **Current**: [This task name] - [What it adds]
- **Next**: [Task X+1 name] - [What it will need]

## 📍 **Context from Roadmap**

### Related User Stories
[COPY RELEVANT USER STORIES FROM PHASE]

### Configuration System Design
[REQUIRED FOR ALL TASKS - Define how this feature will be configuration-driven]
- **Config Schema**: What configuration options will this feature expose?
- **Default Values**: What are sensible defaults that work out-of-box?
- **Validation Rules**: What validation is needed for config values?
- **Code Updates**: What existing code needs updating to use the new config?

### Implementation Details
[COPY ANY CODE EXAMPLES OR IMPLEMENTATION NOTES FROM TASK]

## 🔧 **Implementation Assignments**

[GENERATE 5-10 ASSIGNMENTS BASED ON SCOPE - MORE GRANULAR THAN BEFORE]

### Assignment 1: [FIRST LOGICAL STEP BASED ON SCOPE]
**Goal**: [What this accomplishes from scope]
**Estimated Time**: [X hours]

#### Sub-tasks:
1. [ ] **1.1 [First sub-task]**
   ```typescript
   // In src/[path]/[file].ts
   [Code structure to implement]
   ```
   
2. [ ] **1.2 [Second sub-task]**
   - Platform considerations: [Windows/Unix specifics if any]
   - Related files: [List files that need updates]
   
3. [ ] **1.3 [Test creation]**
   ```typescript
   // In tests/unit/[module]/[test].test.ts
   describe('[Feature]', () => {
     test('should [behavior]', () => {
       // Test implementation
     });
   });
   ```

**Validation**:
```bash
npm run build && npm test -- tests/unit/[module]
# Expected: Build succeeds, tests pass

# Platform-specific validation if needed:
# Windows: [specific command]
# Unix: [specific command]
```

**Implementation Notes**:
- [Key decisions to make during implementation]
- [Potential gotchas or edge cases]
- [Performance considerations]

**Completion Criteria**:
- [ ] All sub-tasks complete
- [ ] Tests pass on all platforms
- [ ] No TypeScript errors
- [ ] [Other specific criteria from scope]

---

[CONTINUE WITH MORE GRANULAR ASSIGNMENTS]

## ✅ **Task Completion Criteria**

From roadmap:
[COPY ALL COMPLETION CRITERIA AS CHECKBOXES]

Additional requirements:
- [ ] All assignments completed
- [ ] All tests passing
- [ ] Documentation updated

## 🧪 **Testing Requirements**

### Unit Tests
[LIST SPECIFIC TEST FILES TO CREATE/UPDATE]
- Configuration validation tests
- Feature functionality tests
- Edge case handling tests

### Integration Tests
[REQUIRED - How does this integrate with the configuration system?]
- Configuration loading and parsing
- Feature behavior with different configs

### Manual E2E Testing
[DETAILED USER SCENARIOS]
- User configures the feature via YAML
- User uses environment variables to override
- User validates feature behavior changes with config
- User troubleshoots with help endpoint

### Configuration Test Cases
- **Default Config**: Feature works with zero configuration
- **Custom Config**: Feature respects all configuration options
- **Invalid Config**: Proper error messages for invalid values

## 📊 **Progress Tracking**

### Assignment Status
[LIST ALL ASSIGNMENTS WITH SUB-TASKS AS NESTED CHECKBOXES]

### Time Tracking
| Assignment | Estimated | Actual | Status | Notes |
|------------|-----------|--------|--------|-------|
[CREATE ROW FOR EACH ASSIGNMENT WITH STATUS: Not Started/In Progress/Complete/Blocked]

### Implementation Discoveries
[THIS SECTION GETS UPDATED AS WORK PROGRESSES]
- **Key Findings**: [Document what was discovered during implementation]
- **Decisions Made**: [Record important implementation decisions]
- **Changes from Plan**: [Note any deviations from original plan and why]
- **Reusable Patterns**: [Document patterns that could be used elsewhere]

### Platform-Specific Notes
[TRACK PLATFORM-SPECIFIC ISSUES AND SOLUTIONS]
- **Windows**: [Issues/solutions specific to Windows]
- **macOS**: [Issues/solutions specific to macOS]
- **Linux**: [Issues/solutions specific to Linux]

## 🔍 **Quick Reference**

### Key Commands
```bash
# Build and test
npm run build && npm test

# Run specific tests
npm test -- tests/unit/[feature]
```

### Common Issues
- **Build errors**: Check imports and types
- **Test failures**: Verify test setup and mocks

---

**To execute this plan:**
```
/execute-prp docs/development-plan/roadmap/currently-implementing/Phase-[X]-Task-[Y]-[name].md
```
```

## 📝 **Living Document Note**

**IMPORTANT**: This task plan is a LIVING DOCUMENT that should be updated throughout implementation:
- Update assignment status as work progresses (Not Started → In Progress → Complete)
- Document discoveries and decisions in the Implementation Discoveries section
- Add platform-specific notes as issues are encountered
- Update time tracking with actual hours spent
- If assignments need to be broken down further, add sub-tasks as needed
- Mark completed items with ✅ and include completion date

When marking an assignment complete, consider adding:
- What was actually implemented (if different from plan)
- Key code snippets showing the solution
- Any patterns that emerged
- Links to relevant commits

## CRITICAL EXTRACTION RULES

1. **Exact Task Content**: Extract the COMPLETE task section from roadmap
2. **Scope Preservation**: Keep ALL scope items, don't summarize
3. **Code Examples**: Include any code snippets from the task
4. **Assignment Logic**: Break scope into implementable chunks
5. **Context Focus**: Include what to build, not how to build it
6. **Configuration First**: ALWAYS plan how the feature will be configuration-driven
7. **Test Planning**: Include comprehensive test scenarios for both automated and manual testing

## Example: Phase 6, Task 2 Should Extract

From roadmap section "### Task 2: Basic Daemon Architecture":
- Goal: "Create configuration-driven daemon..."
- Scope items about daemon, configuration, health checks, etc.
- Configuration YAML example
- Completion criteria checkboxes

Then generate assignments like:
1. Core Daemon Class Structure
2. Process Manager Implementation  
3. Health Monitor Implementation
4. Signal Handler Implementation
5. CLI Integration

## Validation

After generating, verify:
- [ ] All scope items are covered by assignments
- [ ] Each assignment is actionable and clear
- [ ] Testing is included in each assignment
- [ ] File paths are specific and correct
- [ ] Completion criteria match roadmap exactly