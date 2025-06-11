# 🧪 Folder-MCP Test Suite

## 🚀 Quick Start

```bash
# Run all tests at once
node tests/run-all-tests.js

# Or run individual phases  
node tests/test-phase1-foundation.js
node tests/test-phase2-parsing.js
node tests/test-phase3-processing.js
node tests/test-phase4-search.js
node tests/test-phase5-mcp.js
node tests/test-phase6-realtime.js
node tests/test-phase7-production.js
node tests/test-phase8-ux.js
```

## ✅ Test Status

**Current Status**: All 8 phases passing with 100% success rate!

```
📊 Latest Test Results:
✅ Phase 1: Foundation (24/24 tests)
✅ Phase 2: Parsing (16/16 tests)  
✅ Phase 3: Processing (18/18 tests)
✅ Phase 4: Search (16/16 tests)
✅ Phase 5: MCP (31/31 tests)
✅ Phase 6: Real-time (13/13 tests)
✅ Phase 7: Production (11/11 tests)
✅ Phase 8: UX & Configuration (10/10 tests)

🎯 Overall: 139/139 tests passed (100% success rate)
```

This directory contains comprehensive tests for the folder-mcp project, organized by development phases.

## 📁 Test Files

| File | Description | Focus Area |
|------|-------------|------------|
| `test-phase1-foundation.js` | Foundation & CLI tests | Basic project setup, CLI commands, file listing, caching |
| `test-phase2-parsing.js` | File parsing tests | Text, PDF, Word, Excel, PowerPoint parsers |
| `test-phase3-processing.js` | Processing & embeddings tests | Text chunking, embedding generation |
| `test-phase4-search.js` | Vector search tests | FAISS indexing, similarity search |
| `test-phase5-mcp.js` | MCP integration tests | Model Context Protocol server, enhanced search |
| `test-phase6-realtime.js` | Real-time & configuration tests | File watcher integration, configuration system |
| `test-phase7-production.js` | Production ready tests | Error recovery system, performance optimization |
| `test-phase8-ux.js` | UX & configuration flow tests | Runtime configuration, system detection, caching |
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
node tests/test-phase6-realtime.js
node tests/test-phase7-production.js
node tests/test-phase8-ux.js
```

### All Tests at Once
```bash
# Run all test phases in sequence
node tests/run-all-tests.js
```

## 📊 Test Coverage

The test suite covers **139 individual tests** across **8 phases**:

- **Phase 1**: 24 tests (Foundation & CLI)
- **Phase 2**: 16 tests (File Parsing)  
- **Phase 3**: 18 tests (Processing & Embeddings)
- **Phase 4**: 16 tests (Vector Search)
- **Phase 5**: 31 tests (MCP Integration)  
- **Phase 6**: 13 tests (Real-time & Configuration)
- **Phase 7**: 11 tests (Production Ready - Error Recovery)
- **Phase 8**: 10 tests (UX & Configuration Flow - Runtime Configuration)

## 🎉 Recent Improvements

### Configuration System Refactoring (June 2025)
The test suite has been **significantly enhanced** with configuration system refactoring:

- ✅ **Enhanced Validation**: Support for both flat and nested configuration structures
- ✅ **Runtime Config Caching**: Proper caching without validation warnings
- ✅ **Model Name Fixes**: Corrected embedding model name mappings (`nomic-v1.5`)
- ✅ **Test Alignment**: All Phase 8 validation tests now use the correct validation system
- ✅ **100% Pass Rate**: All 8 phases now pass with complete success

**Before**: Phase 4 tests were failing due to model name mismatches  
**After**: All phases pass reliably with proper configuration validation

## ✅ Test Results

**Current Status**: All 8 phases passing with 100% success rate!

For detailed test results and pass rates, see `TEST-SUMMARY.md` which is generated after running the test suite.

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

## Phase 8: Streamline UX and Configuration Flow

### Step 28: Configuration Validation System

The validation system tests verify that the configuration validation system works correctly. These tests are located in `test-phase8-ux.js` and cover:

1. **Path Validation**
   - Valid folder paths
   - Non-existent folders
   - Include/exclude paths
   - Cache directory permissions

2. **Numeric Validation**
   - Valid numeric ranges
   - Invalid values
   - Default value application
   - Parameter dependencies

3. **Network Validation**
   - Port availability
   - Port number ranges
   - Host configuration
   - Timeout settings

4. **Model Validation**
   - Model existence
   - Model compatibility
   - Parameter validation
   - Default model selection

5. **Validation Summary**
   - Error reporting
   - Fix suggestions
   - Warning handling
   - Success messages

To run the validation tests:
```bash
npm test test-phase8-ux.js
```

Test data:
- Uses `C:\ThinkingHomes\test-simple` for basic tests
- Uses `C:\ThinkingHomes\test-folder` for extended tests
- Creates temporary test data in `tests/test-data-phase8`
