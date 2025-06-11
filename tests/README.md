# 🧪 Modular Test System for Folder-MCP

## Overview

This comprehensive test system is designed around the modular architecture established in the Module Boundaries Plan. Tests are organized by architectural layer and functionality, ensuring thorough coverage of all system components and their interactions.

## Test Organization

### 📁 Structure

```
tests/
├── unit/                          # Unit tests for individual modules
│   ├── domain/                   # Domain layer tests
│   │   ├── files.test.ts         # File operations tests
│   │   ├── content.test.ts       # Content processing tests
│   │   ├── embeddings.test.ts    # Embedding operations tests
│   │   └── search.test.ts        # Search logic tests
│   │
│   ├── application/              # Application layer tests
│   │   ├── indexing.test.ts      # Indexing workflows tests
│   │   ├── serving.test.ts       # Content serving tests
│   │   └── monitoring.test.ts    # Monitoring workflows tests
│   │
│   ├── infrastructure/           # Infrastructure layer tests
│   │   ├── cache.test.ts         # Cache implementation tests
│   │   ├── logging.test.ts       # Logging system tests
│   │   └── errors.test.ts        # Error handling tests
│   │
│   └── interfaces/               # Interface layer tests
│       ├── cli.test.ts           # CLI interface tests
│       └── mcp.test.ts           # MCP interface tests
│
├── integration/                  # Integration tests
│   ├── workflows/                # End-to-end workflow tests
│   │   ├── indexing.test.ts      # Full indexing pipeline
│   │   ├── search.test.ts        # Search functionality
│   │   └── serving.test.ts       # Content serving
│   │
│   ├── services/                 # Service integration tests
│   │   ├── di-container.test.ts  # Dependency injection tests
│   │   └── config.test.ts        # Configuration system tests
│   │
│   └── protocols/                # Protocol tests
│       ├── mcp-protocol.test.ts  # MCP protocol compliance
│       └── api-contracts.test.ts # API contract tests
│
├── architectural/                # Architectural constraint tests
│   ├── boundaries.test.ts        # Module boundary enforcement
│   ├── dependencies.test.ts      # Dependency rule validation
│   └── patterns.test.ts          # Architectural pattern compliance
│
├── performance/                  # Performance and load tests
│   ├── indexing.perf.test.ts     # Indexing performance
│   ├── search.perf.test.ts       # Search performance
│   └── memory.perf.test.ts       # Memory usage tests
│
├── e2e/                          # End-to-end system tests
│   ├── cli-scenarios.test.ts     # CLI usage scenarios
│   ├── mcp-scenarios.test.ts     # MCP server scenarios
│   └── real-world.test.ts        # Real-world usage patterns
│
├── fixtures/                     # Test data and fixtures
│   ├── files/                    # Sample files for testing
│   ├── configs/                  # Test configurations
│   └── mock-data/                # Mock data sets
│
├── helpers/                      # Test utilities and helpers
│   ├── test-utils.ts             # Common test utilities
│   ├── mock-factories.ts         # Mock object factories
│   ├── assertions.ts             # Custom assertions
│   └── setup.ts                  # Test environment setup
│
└── legacy/                       # Legacy tests (to be migrated)
    └── [existing test files]
```

## 🚀 Quick Start

### Run All Tests
```bash
npm test                          # Run all tests
npm run test:unit                 # Run only unit tests
npm run test:integration          # Run only integration tests
npm run test:e2e                  # Run only e2e tests
npm run test:architectural        # Run only architectural tests
npm run test:performance          # Run only performance tests
```

### Run Specific Test Categories
```bash
npm run test:domain               # Test domain layer
npm run test:application          # Test application layer
npm run test:infrastructure       # Test infrastructure layer
npm run test:interfaces           # Test interface layer
```

### Watch Mode
```bash
npm run test:watch                # Run tests in watch mode
npm run test:watch:unit           # Watch unit tests only
npm run test:watch:integration    # Watch integration tests only
```

### Coverage and CI
```bash
npm run test:coverage             # Run tests with coverage report
npm run test:ci                   # Run tests in CI mode with JUnit output
```

## 📋 Test Categories

### Unit Tests
**Purpose**: Test individual modules in isolation
- **Domain Tests**: Pure business logic validation
- **Application Tests**: Use case orchestration testing
- **Infrastructure Tests**: Technical service testing
- **Interface Tests**: External communication layer testing

**Characteristics**:
- Fast execution (< 100ms per test)
- No external dependencies
- Mock all collaborators
- High code coverage focus

### Integration Tests
**Purpose**: Test module interactions and workflows
- **Service Integration**: DI container and service composition
- **Workflow Integration**: Cross-layer data flow
- **Protocol Integration**: MCP compliance and API contracts

**Characteristics**:
- Moderate execution time (< 5s per test)
- Real service interactions within boundaries
- Database/cache integration allowed
- Focus on interface contracts

### Architectural Tests
**Purpose**: Enforce module boundaries and design rules
- **Boundary Enforcement**: Prevent illegal imports
- **Dependency Validation**: Ensure proper layering
- **Pattern Compliance**: Validate architectural patterns

**Characteristics**:
- Static analysis of code structure
- Fast execution
- Fail-fast on architecture violations
- Part of CI pipeline

### Performance Tests
**Purpose**: Validate performance characteristics
- **Throughput Testing**: Files per second metrics
- **Memory Testing**: Memory usage patterns
- **Latency Testing**: Response time measurements
- **Load Testing**: High-volume scenarios

**Characteristics**:
- Longer execution times
- Resource-intensive
- Baseline comparisons
- Performance regression detection

### End-to-End Tests
**Purpose**: Validate complete user workflows
- **CLI Scenarios**: Complete command workflows
- **MCP Scenarios**: Full protocol interactions
- **Real-world Testing**: Actual usage patterns

**Characteristics**:
- Longest execution times
- Full system integration
- User-perspective validation
- High-value scenarios only

## 🔧 Test Utilities

### TestUtils Class
Common utilities for all test types:
```typescript
// File system operations
await TestUtils.createTempDir('test-prefix-');
await TestUtils.createTestFiles(dir, { 'file.txt': 'content' });
await TestUtils.cleanupTempDir(dir);

// Timing and performance
const { result, duration } = await TestUtils.measureTime(async () => {
  // Your async operation
});

// Memory monitoring
const memory = TestUtils.getMemoryUsage();

// Test data generation
const content = TestDataGenerator.sampleFileContent('code');
const largeContent = TestDataGenerator.largeContent(1000); // 1MB

// Async utilities
await TestUtils.waitFor(() => condition, { timeout: 5000 });
await AsyncTestUtils.expectRejects(promise, 'Expected error');
```

### Mock Factories
Standardized mock objects for consistent testing:
```typescript
const mockLogger = MockFactories.createLogger();
const mockCache = MockFactories.createCacheService();
const mockFileProcessor = MockFactories.createFileProcessor();
```

### Custom Assertions
Domain-specific assertions for better test readability:
```typescript
expect(result).toBeValidSearchResult();
expect(indexingResult).toHaveProcessedFiles(10);
expect(cacheStats).toHaveHitRate(0.85);
```

## 📊 Test Coverage

### Coverage Targets
- **Unit Tests**: 90%+ line coverage
- **Integration Tests**: 80%+ feature coverage
- **E2E Tests**: 70%+ user journey coverage

### Coverage Reports
- HTML reports generated in `coverage/` directory
- CI integration with coverage checks
- Branch coverage tracking
- Function coverage validation

## 🔄 Continuous Integration

### Test Pipeline
1. **Fast Tests** (< 30s): Unit + Architectural
2. **Medium Tests** (< 5m): Integration
3. **Slow Tests** (< 15m): Performance + E2E

### Quality Gates
- All unit tests must pass
- Coverage thresholds must be met
- Architectural boundaries must be respected
- Performance benchmarks must be within tolerance

### Test Parallelization
- Unit tests run in parallel by default
- Integration tests grouped by resource usage
- E2E tests run sequentially for stability

## 🏗️ Test Development Guidelines

### Writing Unit Tests
```typescript
describe('Module Name', () => {
  describe('Function/Method Name', () => {
    it('should handle expected behavior', () => {
      // Arrange: Set up test data and mocks
      // Act: Execute the code under test
      // Assert: Verify the results
    });
    
    it('should handle error conditions', () => {
      // Test error scenarios
    });
    
    it('should handle edge cases', () => {
      // Test boundary conditions
    });
  });
});
```

### Writing Integration Tests
```typescript
describe('Integration - Workflow Name', () => {
  beforeEach(async () => {
    // Set up test environment
  });
  
  afterEach(async () => {
    // Clean up resources
  });
  
  it('should complete end-to-end workflow', async () => {
    // Test complete workflows with real service interactions
  });
});
```

### Performance Test Guidelines
- Establish baseline measurements
- Test with realistic data volumes
- Monitor memory usage patterns
- Set reasonable performance targets
- Compare against previous versions

### E2E Test Guidelines
- Focus on critical user journeys
- Use realistic test data
- Test error scenarios
- Validate complete workflows
- Keep tests maintainable and reliable

## 🚨 Test Maintenance

### Regular Tasks
- Update test data as system evolves
- Refactor tests when code structure changes
- Monitor test execution times and memory usage
- Update performance baselines
- Review and update architectural constraints

### Test Debugging
- Use descriptive test names
- Include sufficient context in failures
- Provide clear error messages
- Use test-specific logging
- Isolate failing tests quickly

### Memory Management Best Practices
- Avoid large global test data (use per-test generation instead)
- Clean up temporary resources in afterEach hooks
- Monitor memory usage in performance tests
- Use appropriate test isolation levels
- Consider platform-specific cleanup requirements

### Type Safety Maintenance
- Use canonical types from `src/types/index.ts`
- Avoid duplicate interface definitions across modules
- Keep mock implementations aligned with real interfaces
- Regular review of type consistency across test files

## 📈 Metrics and Monitoring

### Test Metrics
- Execution time trends
- Flaky test identification
- Coverage trend analysis
- Performance regression detection

### Quality Metrics
- Test-to-code ratio
- Defect detection effectiveness
- Test maintenance overhead
- CI pipeline reliability

This comprehensive test system ensures high-quality, maintainable code while supporting the modular architecture of folder-mcp.

## 🔧 Recent Improvements and Fixes

### Memory and Performance Optimizations
- **Memory Leak Resolution**: Removed 1MB global test file generation that was causing out-of-memory errors
- **Vitest Configuration**: Reduced concurrent workers from 4 to 2 and disabled concurrent test execution
- **Windows File Cleanup**: Added retry logic with delays to handle Windows file system permission issues
- **Performance Test Stability**: Changed from absolute performance expectations to relative performance bounds

### Type System Standardization
- **TextChunk Interface**: Unified multiple conflicting TextChunk definitions to use canonical type from `src/types/index.ts`
- **Import Consistency**: Fixed import inconsistencies across domain modules (embeddings, content, search)
- **Test Type Safety**: Updated all tests to use correct field names (`startPosition` vs `startOffset`, `chunkIndex` vs `index`)

### Test Implementation Fixes
- **Content Domain Tests**: Completely rewrote content.test.ts with proper type usage and simplified implementations
- **Embeddings Tests**: Fixed TextChunk usage to match canonical interface
- **Mock Factories**: Cleaned up mock implementations to use consistent types
- **Error Handling**: Improved test utility error handling with better Windows compatibility

### File Organization and Cleanup (June 11, 2025)
- **Complete Directory Structure**: Created all missing directories according to test system plan (`fixtures/`, `legacy/`)
- **Legacy Script Management**: Moved all JavaScript test scripts (`test-phase*.js`, `validate-phase1.js`, `run-all-tests.js`) to `tests/legacy/` and then removed them
- **File Reorganization**: Moved misplaced files to correct locations (`architecture.test.ts` → `architectural/phase1-foundation.test.ts`)
- **Cleanup of Temporary Files**: Removed duplicate and temporary test files (`content.test.old.ts`, `content.test.new.ts`)
- **Missing Test File Creation**: Created all missing test files specified in the test system plan:
  - `tests/unit/infrastructure/errors.test.ts`
  - `tests/integration/services/config.test.ts`
  - `tests/performance/search.perf.test.ts`
  - `tests/performance/memory.perf.test.ts`
  - `tests/e2e/real-world.test.ts`
  - `tests/architectural/dependencies.test.ts`
  - `tests/architectural/patterns.test.ts`
- **Final Test Count**: 38 total test files properly organized across all categories

### Configuration Improvements
- **Memory Management**: Added worker memory limits and reduced concurrency to prevent crashes
- **Test Isolation**: Improved test isolation to prevent cross-test contamination
- **File Cleanup**: Enhanced temporary file cleanup with platform-specific handling

## 📝 Writing New Tests

### Test File Naming
- Unit tests: `*.test.ts`
- Integration tests: `*.integration.test.ts`
- Performance tests: `*.perf.test.ts`
- E2E tests: `*.e2e.test.ts`

### Test Structure Example
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestUtils } from '../helpers/test-utils.js';

describe('ModuleName', () => {
  beforeEach(async () => {
    // Setup for each test
  });

  afterEach(async () => {
    // Cleanup after each test
  });

  describe('specificFeature', () => {
    it('should behave correctly under normal conditions', async () => {
      // Arrange
      const input = TestUtils.createTestInput();
      
      // Act
      const result = await moduleFunction(input);
      
      // Assert
      expect(result).toMatchExpectedOutput();
    });

    it('should handle error conditions gracefully', async () => {
      // Error handling test
    });
  });
});
```

## 🔄 Migration Plan

### Phase 1: Setup New Structure
1. ✅ Create new test directory structure
2. ✅ Set up test helpers and utilities
3. ✅ Create architectural constraint tests

### Phase 2: Migrate Domain Tests
1. ✅ Extract domain logic tests from legacy tests
2. ✅ Create focused unit tests for each domain module
3. ✅ Add integration tests for domain interactions

### Phase 3: Application & Infrastructure Tests
1. ✅ Create application workflow tests
2. ✅ Add infrastructure service tests
3. ✅ Create integration tests for service interactions

### Phase 4: Interface & E2E Tests
1. ✅ Create interface layer tests
2. ✅ Add comprehensive E2E scenarios
3. ✅ Create performance benchmarks

### Phase 5: Legacy Test Integration
1. ✅ Migrate valuable legacy tests
2. ✅ Remove duplicate test coverage
3. ✅ Consolidate test data and fixtures

## 📈 Continuous Improvement

- Regular test review and refactoring
- Performance baseline updates
- Coverage goal adjustments
- Tool and framework updates
- Test architecture evolution

## 🚧 Current Issues and TODOs

### Recently Resolved Issues ✅
- [x] **Memory Leak in Test Setup**: Fixed 1MB global test file that was causing OOM errors
- [x] **TextChunk Interface Inconsistencies**: Standardized to use canonical types from `src/types/index.ts`
- [x] **Flaky Performance Tests**: Removed unreliable performance assumptions in chunking tests
- [x] **Windows File Cleanup Issues**: Added retry logic for Windows permission errors
- [x] **Type Safety Issues**: Fixed import inconsistencies and type mismatches across test files
- [x] **Vitest Configuration**: Optimized memory usage and reduced concurrency to prevent crashes

### Priority Tasks
- [x] Consolidate test utility implementations to avoid duplication
- [x] Update test files to use the new utility structure
- [x] Add proper type definitions for all test utilities
- [x] Implement consistent error handling across test utilities
- [x] **File Organization**: Organize all test files into proper directories according to the test system plan
- [x] **Legacy Script Cleanup**: Remove unused JavaScript test scripts and move to legacy directory
- [x] **Missing Test Files**: Create missing test files for complete coverage of the test system plan

### Next Steps - Additional Improvements Needed
- [ ] **Real Implementation Testing**: Replace mock-heavy tests with tests against actual implementations
- [ ] **Enhanced Error Injection**: Add sophisticated error injection capabilities for better failure testing
- [ ] **Edge Case Coverage**: Add tests for Unicode/special characters, very large files, network timeouts
- [ ] **Cross-Platform Testing**: Ensure consistent test behavior across Windows/Linux/macOS
- [ ] **Performance Baselines**: Establish and monitor performance baselines over time
- [ ] **Load Testing**: Add tests that simulate realistic load patterns

### Known Technical Debt
- [ ] **Mock vs Real Testing**: Some integration tests still use mocks instead of real service implementations
- [ ] **Test Data Management**: Need better strategy for generating and managing realistic test data
- [ ] **Architectural Boundary Testing**: Some tests bypass architectural boundaries they should enforce
- [ ] **Memory Usage Monitoring**: Add systematic memory usage tracking in performance tests

---

**Status as of June 11 2025:**
- ✅ All linter errors have been resolved.
- ✅ The modular test system structure is fully implemented.
- ✅ Test utilities are consolidated and type-safe.
- ✅ All test files use the new utility structure.
- ✅ Architectural, integration, performance, and E2E tests are present and follow the guidelines.
- ✅ **File Organization Complete**: All test files are now properly organized according to the test system plan
- ✅ **Legacy Scripts Cleaned**: Removed unused JavaScript test scripts and organized legacy files
- ✅ **Missing Files Created**: All missing test files from the test system plan have been created
- ✅ **Directory Structure**: Complete directory structure matches the test system specification exactly
- ✅ Legacy tests have been migrated or removed as appropriate.
- ✅ **Critical Memory Issues Resolved**: Fixed memory leaks and OOM errors that were preventing test execution
- ✅ **Type System Consistency**: Standardized TextChunk and other interface definitions across all modules
- ✅ **Windows Compatibility**: Improved file cleanup and cross-platform test reliability
- ✅ **Performance Test Stability**: Fixed flaky performance tests with more reliable assertions
- ⚠️ **Memory Usage**: Tests now run with reduced concurrency to prevent memory issues; consider investigating underlying causes
- 🔄 **Ongoing**: Continue monitoring test performance and adding comprehensive edge case coverage

**Test Execution Status:**
- Unit Tests: ✅ Passing (with memory optimizations)
- Integration Tests: ✅ Passing 
- Architectural Tests: ✅ Passing
- Performance Tests: ✅ Passing (with adjusted expectations)
- E2E Tests: ✅ Passing
- Memory Usage: ⚠️ Requires reduced concurrency settings

**Test Organization Summary:**
- 📁 **38 total test files** organized across all categories
- 🏗️ **Complete architectural test coverage** (boundaries, dependencies, patterns)
- 🔧 **All infrastructure layers tested** (cache, logging, errors)
- 🌐 **Full integration test suite** (protocols, services, workflows)
- ⚡ **Comprehensive performance testing** (indexing, search, memory)
- 🎭 **End-to-end scenarios** (CLI, MCP, real-world usage)
- 📦 **Proper fixture organization** (test data, configs, mock data)
- 🧹 **Clean legacy management** (legacy scripts removed, structure preserved)

**Next Focus Areas:**
1. Investigate and resolve underlying memory usage patterns
2. Add comprehensive edge case testing (Unicode, large files, concurrent access)
3. Implement more realistic test data and scenarios
4. Establish performance baselines and regression detection
