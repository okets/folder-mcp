# Gemini Code Assistant Context

## Project Overview

**folder-mcp** is a Model Context Protocol (MCP) server that transforms any machine into a semantically searchable knowledge base for AI agents. It allows LLMs to securely interact with local file systems, providing tools for reading, searching, and analyzing files and folders.

The project is built with TypeScript and Node.js, following Clean Architecture principles. It features a daemon for background processing, a full-screen TUI for configuration, and GPU-accelerated embeddings for high-quality semantic search.

### Core Purpose
- **Universal MCP Server:** Works with any MCP-compatible client (Claude, VSCode, Cursor, etc.).
- **Multi-folder Support:** Configure and serve multiple folders simultaneously.
- **Semantic Search:** GPU-accelerated embeddings for intelligent content retrieval.
- **Always-Running Daemon:** Background service with auto-start on boot.

## Architecture

The project follows Clean Architecture principles with a strict separation between domain and infrastructure.

### Core Architecture Layers
- **Domain Layer (`src/domain/`):** Pure business logic with no external dependencies.
- **Application Layer (`src/application/`):** Orchestrates domain services for complex workflows (Indexing, Monitoring, Serving).
- **Infrastructure Layer (`src/infrastructure/`):** Concrete implementations of domain abstractions (file system, caching, logging).
- **Interface Layer (`src/interfaces/`):** MCP Server, CLI, TUI, and TUI Demo.

### Dependency Injection
A token-based dependency injection system (`src/di/`) is used for centralized service registration and resolution, enabling clean testing with mock injection.

### Configuration System
A hierarchical configuration system is used, with the following priority:
1.  Defaults (code)
2.  System Config (`/etc/folder-mcp/config.yaml`)
3.  User Config (`~/.folder-mcp/config.yaml`)
4.  Environment Variables (`FOLDER_MCP_*`)
5.  Runtime (CLI flags)

## Development Workflow

As an AI agent, I will adhere to the following development workflow:

- **File Modification:** I will edit files freely without asking for permission.
- **Builds and Tests:** I will run builds and tests automatically to verify my changes.
- **Show Results:** I will show you the results of my work for your review.
- **Confirm Commits:** I will always ask for confirmation before committing any changes.

## Essential Commands

### Build and Development
```bash
npm run build          # Build TypeScript to dist/
npm run dev            # Build and run development server
npm start              # Run production server
```

### TUI Interface
```bash
npm run tui            # Launch unified TUI interface
npm run tuidemo        # Run TUI demo/testing interface
```

### CLI Commands
```bash
folder-mcp config get <key>              # Get configuration value
folder-mcp config set <key> <value>      # Set configuration value
folder-mcp config show [--sources]       # Show configuration (with sources)
folder-mcp config validate               # Validate configuration
folder-mcp config env list               # List environment variables
```

### Testing
```bash
npm test               # Run all tests with Vitest
npm run test:watch     # Run tests in watch mode
npm run test:unit      # Run unit tests only
npm run test:integration # Run integration tests only
npm run test:e2e       # Run end-to-end tests
npm run test:performance # Run performance tests
npm run test:coverage  # Generate coverage report
```

### Code Quality & Linting
```bash
npx eslint src/                    # Lint all source files
npx eslint tests/                  # Lint all test files
npx eslint --fix src/ tests/       # Auto-fix linting issues
```

## Testing Strategy

I will follow a systematic, test-driven approach to development.

### TMOAT (The Mother Of All Tests)
I will think like a human engineer, breaking down assignments into verifiable tests to validate assumptions. This includes:
- Querying the database (`sqlite3`) to verify data persistence.
- Monitoring runtime files to track changes.
- Using TMOAT scripts to test websocket endpoints.
- Restarting the daemon in the background. I will use the following command to run the daemon in a detached process, save its output to a log file, and get its PID:
  ```bash
  nohup npm run daemon:restart > daemon.log 2>&1 & echo $!
  ```
  I can then use the PID to monitor or terminate the process.
- Calling MCP endpoints directly for verification.

### A2E (Agent-to-Endpoint) Testing
For testing MCP endpoints, I will use the A2E methodology:
1.  **Read Known Content:** Use the `read_file` tool to examine a file with known content.
2.  **Ask Known Questions:** Use MCP tools (`search`, `list_documents`, etc.) to query for the known content.
3.  **Compare Results:** Verify that the MCP server returns the expected content.

**CRITICAL:** If the MCP server disconnects, I will stop all work and inform you immediately.

## TUI Development

When working on the TUI, I will follow these guidelines:

- **State Change Signaling:** I will only trigger re-renders when the state has actually changed to prevent flickering.
- **Visual Debugging:** Since I cannot see the TUI, I will use a collaborative debugging process:
    1.  I will add comprehensive logging to the TUI components.
    2.  I will ask you to run the TUI and capture the `stderr` to a log file.
    3.  I will analyze the log file to identify the root cause of the visual bug.
    4.  I will implement a fix and repeat the process until you confirm the bug is resolved.
- **Consistency:** I will not make fundamental changes to the visual design or UX patterns without your permission.