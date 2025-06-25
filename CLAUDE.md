# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

**Build and Development:**
```bash
npm run build          # Build TypeScript to dist/
npm run dev            # Build and run development server
npm start              # Run production server
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

**MCP Server Usage:**
```bash
node dist/mcp-server.js <folder-path>  # Start MCP server with folder path
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

The project uses a centralized YAML configuration (`config.yaml`) with:
- Embedding models (Nomic, MixedBread AI, etc.)
- Cache settings, processing parameters
- Development mode options (hot reload, debugging)
- VSCode MCP integration settings

Configuration is resolved through `src/config/resolver.ts` which handles environment-specific overrides.

## MCP Protocol Implementation

**Entry Point:** `src/mcp-server.ts` - Main server that:
1. Sets up dependency injection
2. Starts MCP protocol server
3. Initializes file indexing and watching
4. Handles graceful shutdown

**CRITICAL:** All logging MUST go to stderr only. Claude Desktop expects only valid JSON-RPC on stdout.

**Tools Provided:**
- `search` - Semantic search across documents
- `get_document_outline` - Extract document structure
- `get_document_data` - Get document content and metadata
- `list_folders/documents` - File system browsing
- `get_sheet_data/slides/pages` - Format-specific data extraction

## File Processing Pipeline

**Supported Formats:** PDF, DOCX, XLSX, PPTX, TXT, MD
**Processing Flow:**
1. File parsing (`domain/files/parser.ts`)
2. Content chunking (`domain/content/chunking.ts`)
3. Embedding generation (Ollama integration)
4. Vector storage (FAISS-based)

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

Enable with `ENABLE_ENHANCED_MCP_FEATURES=true`:
- Hot reload on file changes
- Enhanced debugging output
- Real-time file system monitoring
- Development-specific MCP endpoints

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