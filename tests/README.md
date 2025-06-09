# 🧪 Folder-MCP Test Suite

## 🚀 Quick Start

```bash
# Run all tests at once
node tests/run-all-tests.js

# Or run individual phases  
node tests/test-phase1-foundation.js    # 100% ✅
node tests/test-phase2-parsing.js       # 100% ✅ 
node tests/test-phase3-processing.js    # 83% ⚠️
node tests/test-phase4-search.js        # 69% ⚠️
node tests/test-phase5-mcp.js           # 100% ✅
```

## 📊 Current Status: **91% Pass Rate (82/90 tests)**

This directory contains comprehensive tests for the folder-mcp project, organized by development phases.

## 📁 Test Files

| File | Description | Focus Area |
|------|-------------|------------|
| `test-phase1-foundation.js` | Foundation & CLI tests | Basic project setup, CLI commands, file listing, caching |
| `test-phase2-parsing.js` | File parsing tests | Text, PDF, Word, Excel, PowerPoint parsers |
| `test-phase3-processing.js` | Processing & embeddings tests | Text chunking, embedding generation |
| `test-phase4-search.js` | Vector search tests | FAISS indexing, similarity search |
| `test-phase5-mcp.js` | MCP integration tests | Model Context Protocol server, enhanced search |
| `run-all-tests.js` | Test runner | Executes all phases sequentially |

## 🚀 Running Tests

### Individual Phases
```bash
# Run individual test phases
node tests/test-phase1-foundation.js
node tests/test-phase2-parsing.js
node tests/test-phase3-processing.js
node tests/test-phase4-search.js
node tests/test-phase5-mcp.js
```

### All Tests at Once
```bash
# Run all test phases in sequence
node tests/run-all-tests.js
```

## 📊 Test Coverage

The test suite covers **90 individual tests** across **5 phases**:

- **Phase 1**: 24 tests (Foundation & CLI)
- **Phase 2**: 16 tests (File Parsing)  
- **Phase 3**: 18 tests (Processing & Embeddings)
- **Phase 4**: 16 tests (Vector Search)
- **Phase 5**: 16 tests (MCP Integration)

## ✅ Expected Results

When all tests pass, you should see:
- **Phase 1**: 100% (24/24 tests) - Foundation solid
- **Phase 2**: 100% (16/16 tests) - All parsers working
- **Phase 3**: ~83% (15/18 tests) - Core processing functional
- **Phase 4**: ~69% (11/16 tests) - Search basics working
- **Phase 5**: 100% (16/16 tests) - MCP server perfect

## 🔧 Test Environment

Each test phase:
1. **Sets up** its own test data directory
2. **Runs** comprehensive functionality tests
3. **Cleans up** test files automatically
4. **Reports** detailed results with pass/fail counts

## 🎯 Test Philosophy

- **Comprehensive**: Tests cover all major functionality
- **Isolated**: Each phase is independent
- **Realistic**: Uses actual CLI commands and file operations
- **Robust**: Includes error cases and edge conditions
- **Fast**: Most phases complete in under 30 seconds

## 🐛 Troubleshooting

### Common Issues
- **Build Required**: Run `npm run build` before testing
- **Dependencies**: Ensure all npm packages are installed
- **Permissions**: Some tests create temporary directories
- **Timeouts**: Embedding tests may take longer on slower systems

### Debug Mode
Add verbose logging by modifying test files or checking individual command outputs.

## 📝 Notes

- Tests use the `--skip-embeddings` flag where appropriate for speed
- Embedding tests (Phase 3) require the actual embedding system
- MCP tests verify server functionality without requiring clients
- All tests are designed to work on Windows, macOS, and Linux
