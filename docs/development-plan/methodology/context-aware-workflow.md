# Context-Aware Planning Workflow for folder-mcp

## 🔄 Three-Command Linear Workflow

This workflow uses three commands for clean separation of concerns:

1. **`/create-phase-plan`** - Creates phase overview
2. **`/create-task-plan`** - Creates task details (WHAT to do)
3. **`/execute-prp`** - Executes with validation (HOW to do it properly)

```mermaid
graph TD
    A[folder-mcp-roadmap-1.1.md] -->|/create-phase-plan 6| B[Phase-6-plan.md]
    B -->|/create-task-plan 6 1| C[Phase-6-Task-1.md]
    C -->|/execute-prp Phase-6-Task-1.md| D[Implementation + Validation]
    D -->|Human Verification| E[✅ Task 1 Complete]
    E -->|/create-task-plan 6 2| F[Phase-6-Task-2.md]
    F -->|/execute-prp Phase-6-Task-2.md| G[Implementation + Validation]
    G -->|Human Verification| H[✅ Task 2 Complete]
    
    E --> I[Update Phase Plan Progress]
    H --> I
    I --> J[Linear Progress: 2/11 Tasks Complete]
```

## 📋 How It Works

### Step 1: Create Phase Plan
```bash
/create-phase-plan 6
```
This generates a **high-level overview** with:
- All tasks listed with complexity estimates
- Phase-wide context and goals
- Progress tracking for the entire phase
- Links to create individual task plans

### Step 2: Create Task Plans (As Needed)
```bash
/create-task-plan 6 1  # For Configuration System Foundation
/create-task-plan 6 2  # For Basic Daemon Architecture
# etc...
```
Each generates a **detailed implementation plan** with:
- Specific implementation assignments
- Task-specific validation
- Granular progress tracking
- Exact code locations and structures

## 📊 Measurable Linear Progress

Since all work is sequential, progress is clearly measurable:

- **Phase Progress**: X/Y tasks complete (e.g., 3/11 = 27%)
- **Task Progress**: X/Y assignments complete (e.g., 2/5 = 40%)
- **Time Tracking**: Actual vs estimated for each task
- **Clear Handoffs**: Each task completion enables the next

No parallel work means:
- Simple progress tracking
- Clear dependencies
- No coordination overhead
- Predictable timeline

## 📊 Example: Phase 6 Linear Workflow

### 1. Generate Phase Plan
```bash
/create-phase-plan 6
```
Creates: `Phase-6-Configuration-Foundation-plan.md` with:
- 11 tasks in sequential order
- Linear progress tracking (0/11)
- Clear task sequence
- Overall timeline estimate

### 2. Start First Task
```bash
/create-task-plan 6 1
```
Creates: `Phase-6-Task-1-Configuration-System.md` with:
- Sequential implementation assignments
- Must complete Assignment 1 before 2, etc.
- Progress shown as percentage complete
- ~8-10 implementation steps in order

### 3. Execute Task with Validation
```bash
/execute-prp docs/implementation-plans/Phase-6-Task-1-Configuration-System.md
```
- Enforces DI patterns automatically
- Validates after each assignment
- Summarizes for human verification
- **Never marks complete without human**

### 4. Human Verification
- Review AI summary
- Run verification commands
- Check architecture
- Sign off on completion

### 5. Move to Next Task
```bash
/create-task-plan 6 2  # Only after Task 1 is verified complete
```

**Linear Progress Visualization**:
```
Phase 6: [██░░░░░░░░░] 2/11 Tasks (18%)
Task 2:  [████░░░░░░] 2/5 Assignments (40%)
```

## 🔧 Command Locations

Place these files in your project:
```
folder-mcp/
├── .claude/
│   └── commands/
│       ├── create-phase-plan.md
│       └── create-task-plan.md
├── folder-mcp-roadmap-1.1.md
├── IMPLEMENTATION-METHODOLOGY.md
└── [Your implementation plans will be generated here]
```

## 💡 Usage Tips for Linear Workflow

1. **Complete Tasks Sequentially**: Never start Task N+1 until Task N is 100% complete
2. **Track Progress Linearly**: Update percentage complete after each assignment
3. **Create Task Plans One at a Time**: Generate task plan only when ready to start that task
4. **Validate Before Moving On**: Each task must pass all validation before proceeding
5. **Commit at Milestones**: Clear git history showing linear progression

## 🚀 Getting Started

1. Create the `.claude/commands/` directory
2. Save both command files there
3. Run `/create-phase-plan 6` to start with Phase 6
4. Run `/create-task-plan 6 1` when ready to implement first task

The commands will automatically:
- Extract all relevant information from your roadmap
- Structure it into actionable plans
- Include validation at every step
- Provide clear implementation guidance

## 🚨 Critical Quality Gates

Every task plan now includes:

1. **DI Enforcement Throughout**
   - Examples in every assignment
   - Validation commands after each step
   - Human review checklist

2. **Zero TypeScript Errors**
   - First item in completion criteria
   - Blocks progress if not met
   - Checked after every assignment

3. **Human-Only Completion**
   - AI summarizes what was done
   - Human runs verification steps
   - Human signs off on completion

These are non-negotiable requirements that ensure code quality and architectural consistency across your entire project.

Complete Folder Structure for folder-mcp
📁 Project Structure with Context Engineering
folder-mcp/
├── .claude/                           # Claude-specific files
│   └── commands/                      # Slash commands
│       ├── create-phase-plan.md       # Creates phase overview
│       ├── create-task-plan.md        # Creates task details
│       └── execute-prp.md             # Executes plans with validation
│
├── docs/                              # All documentation
│   ├── development-plan/              # Development planning
│   │   ├── methodology/               # Development methodologies
│   │   │   ├── IMPLEMENTATION-METHODOLOGY.md
│   │   │   ├── USEFUL-PROMPTS.md
│   │   │   └── context-aware-workflow.md
│   │   └── roadmap/                   # Project roadmap
│   │       ├── completed/             # Completed implementation docs
│   │       │   ├── 0.endpoints-cleanup.md
│   │       │   ├── 1.mcp-endpoint-redesign.md
│   │       │   ├── 2.robust-real-folder-oriented-tests-implementation.md
│   │       │   ├── 3.tui-design-and-implementation-plan.md
│   │       │   ├── 4.tui-components-development.md
│   │       │   └── 5.tui-eliminate-all-dev-errors.md
│   │       ├── currently-implementing/
│   │       │   └── 6.configuration-foundation-CLI-TUI-parity.md
│   │       └── folder-mcp-roadmap-1.1.md
│   │
│   └── (other docs folders as needed)
│
├── src/                               # Source code with DI structure
│   ├── domain/                        # Interfaces only
│   │   └── config/
│   │       └── IConfigurationManager.ts
│   │
│   ├── application/                   # Business logic
│   │   └── config/
│   │       └── ConfigurationManager.ts
│   │
│   ├── infrastructure/                # External dependencies
│   │   └── config/
│   │       └── YamlFileLoader.ts
│   │
│   └── di/                           # Dependency injection
│       └── container.ts              # All service registrations
│
└── tests/                            # Test files
    ├── unit/
    ├── integration/
    └── e2e/
🔄 Workflow with Folder Structure
1. **Roadmap Reference**
   - Main roadmap: `docs/development-plan/roadmap/folder-mcp-roadmap-1.1.md`
   - Currently implementing: `docs/development-plan/roadmap/currently-implementing/`
   - Completed tasks: `docs/development-plan/roadmap/completed/`

2. **Create Implementation Plans** (if using PRP approach)
   - Plans would be generated in a designated folder
   - Follow task plans in the roadmap structure

3. **After Completion**
   - Completed tasks are already organized in `docs/development-plan/roadmap/completed/`
   - Update current task status
   - Continue to next task

📝 Key Points

- Roadmap and completed tasks live in `docs/development-plan/roadmap/`
- Methodology docs are in `docs/development-plan/methodology/`
- Source code follows strict DI structure (domain → application → infrastructure)
- Slash commands live in `.claude/commands/`

This structure keeps everything organized with:
- Clear separation of planning vs implementation
- Completed work already tracked in roadmap structure
- Methodologies grouped together
- Natural task progression tracking
