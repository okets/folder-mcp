# Task 6.3: Extend MCP Server for Multiple Folders

**Phase**: 6 - Configuration Foundation & CLI/TUI Parity  
**Status**: 🚧 IN PROGRESS  
**Created**: 2025-07-06  
**Complexity**: Medium  
**Approach**: Transform single-folder MCP server to configuration-driven multi-folder system while preserving all existing functionality

## 🎯 **Task Objective**

Modify existing MCP server to handle multiple folders with per-folder configuration

## 🔍 **Pre-Implementation Checklist**

- [ ] Review existing code in: `src/mcp-server.ts`, `src/interfaces/mcp/`, `src/application/`
- [ ] Identify reusable components: Indexing workflow, monitoring workflow, MCP endpoints
- [ ] Check for similar patterns in: `src/domain/files/`, `src/infrastructure/storage/`
- [ ] Consider platform differences: Path handling for Windows vs Unix
- [ ] Review related tests: `tests/unit/mcp/`, `tests/integration/mcp/`

## 📋 **Scope**

- [ ] Read folder list from configuration
- [ ] Apply folder-specific settings (model, excludes, etc.)
- [ ] Support folder configuration overrides
- [ ] Dynamic folder addition/removal
- [ ] Performance settings per folder
- [ ] Preserve existing endpoint functionality

## 📚 **Essential Project Context**

### From Completed Work
- Phase 1-5: MCP endpoints, file processing, TUI framework  
- Current capabilities: 9 MCP endpoints, FAISS search, Ollama embeddings
- Task 6.1: Configuration System Foundation - provides config loading and validation
- Task 6.2: Basic Daemon Architecture - provides process management

### Critical Files to Understand
- `src/mcp-server.ts` - Current single-folder MCP server entry point
- `src/application/indexing/index.ts` - Indexing workflow to extend
- `src/application/monitoring/index.ts` - File monitoring workflow
- `src/interfaces/mcp/endpoints.ts` - MCP endpoint implementations
- `src/config/manager-refactored.ts` - Configuration manager to use
- `src/infrastructure/storage/StorageProvider.ts` - Vector storage handling

## 🔗 **Dependencies & Related Work**

### Prerequisite Tasks
- **Task 6.1**: Configuration System Foundation - Provides comprehensive config loading
- **Task 6.2**: Basic Daemon Architecture - Manages MCP server lifecycle

### Task Sequence
- **Previous**: Task 6.2 Basic Daemon Architecture - Created daemon to manage server
- **Current**: Task 6.3 Extend MCP Server for Multiple Folders - Adds multi-folder support
- **Next**: Task 6.4 Configuration-Aware CLI Commands - Will manage folders via CLI

## 📍 **Context from Roadmap**

### Related User Stories
- **As a user, I want to add a folder to be shared**: `folder-mcp add ~/Documents`
- **As a user, I want to see all shared folders**: `folder-mcp list`

### Configuration System Design
- **Config Schema**: Folder list with per-folder overrides
- **Default Values**: Empty folder list, global defaults apply to all folders
- **Validation Rules**: Valid paths, unique folder names, valid model names
- **Code Updates**: MCP server, indexing/monitoring workflows, storage providers

### Implementation Details
From roadmap architecture:
```
Daemon → Single MCP Server → Multiple folders (from config)
                           ├── ~/Documents/.folder-mcp/
                           ├── ~/Projects/.folder-mcp/  
                           └── ~/Photos/.folder-mcp/
```

Configuration structure:
```yaml
folders:
  defaults:
    exclude:
      - "node_modules"
      - ".git"
      - "*.tmp"
  list:
    - path: ~/Documents
      name: "My Documents"
    - path: ~/Projects
      name: "Code Projects"
      embeddings:
        backend: ollama
        model: "nomic-embed-text"
```

## 🔧 **Implementation Assignments**

### Assignment 1: Folder Configuration Schema & Interfaces
**Goal**: Define configuration schema and interfaces for multi-folder support
**Estimated Time**: 3 hours

#### Sub-tasks:
1. [ ] **1.1 Folder Configuration Schema**
   ```typescript
   // In src/config/schema/folders.ts
   export interface FolderConfig {
     path: string;
     name: string;
     enabled?: boolean;
     embeddings?: {
       backend?: 'ollama' | 'direct' | 'auto';
       model?: string;
     };
     exclude?: string[];
     performance?: {
       batchSize?: number;
       maxConcurrency?: number;
     };
   }
   
   export interface FoldersConfig {
     defaults?: {
       exclude?: string[];
       embeddings?: Partial<FolderConfig['embeddings']>;
       performance?: Partial<FolderConfig['performance']>;
     };
     list: FolderConfig[];
   }
   ```
   
2. [ ] **1.2 Multi-Folder Service Interfaces**
   ```typescript
   // In src/domain/folders/interfaces.ts
   export interface IFolderManager {
     getFolders(): FolderConfig[];
     getFolderByPath(path: string): FolderConfig | undefined;
     getFolderByName(name: string): FolderConfig | undefined;
     validateFolder(folder: FolderConfig): Promise<void>;
     resolveFolderPath(path: string): string;
   }
   ```
   
3. [ ] **1.3 Configuration Integration**
   ```typescript
   // Update src/config/interfaces.ts
   // Add folders section to main config interface
   // Update validation schemas
   ```

**Validation**:
```bash
npm run build && npm test -- tests/unit/config
# Expected: Build succeeds, config tests pass
```

**Implementation Notes**:
- Folder paths must be normalized for cross-platform support
- Folder names must be unique for identification
- Consider home directory expansion (~/)
- Validate folders exist and are accessible

**Completion Criteria**:
- [ ] Schema types defined
- [ ] Validation rules implemented
- [ ] Default merging logic works
- [ ] Tests cover edge cases

---

### Assignment 2: Folder Manager Implementation
**Goal**: Create folder manager service that handles multi-folder logic
**Estimated Time**: 4 hours

#### Sub-tasks:
1. [ ] **2.1 Domain Folder Manager Service**
   ```typescript
   // In src/domain/folders/folder-manager.ts
   export class FolderManager implements IFolderManager {
     constructor(
       private config: IConfiguration,
       private fileSystem: IFileSystemProvider
     ) {}
     
     getFolders(): FolderConfig[] {
       // Get folders from config
       // Apply defaults to each folder
       // Filter enabled folders
     }
     
     validateFolder(folder: FolderConfig): Promise<void> {
       // Check path exists
       // Check read permissions
       // Validate exclude patterns
     }
   }
   ```
   
2. [ ] **2.2 Folder Path Resolution**
   ```typescript
   // Handle cross-platform paths
   // Expand home directory (~/)
   // Normalize paths
   // Resolve relative paths
   ```

3. [ ] **2.3 DI Container Registration**
   ```typescript
   // In src/di/setup.ts
   container.register(FolderManagerToken, {
     useFactory: (container) => new FolderManager(...)
   });
   ```

**Validation**:
```bash
npm run build && npm test -- tests/unit/domain/folders
# Expected: All folder manager tests pass

# Platform-specific validation:
# Test Windows paths: C:\Users\...
# Test Unix paths: /home/user/...
# Test home expansion: ~/Documents
```

**Implementation Notes**:
- Use path.resolve() for cross-platform support
- Handle missing folders gracefully
- Cache folder validation results
- Support hot-reload of folder config

**Completion Criteria**:
- [ ] Folder manager implements all interface methods
- [ ] Path resolution works cross-platform
- [ ] Validation provides clear error messages
- [ ] DI integration complete

---

### Assignment 3: Multi-Folder Storage Provider
**Goal**: Extend storage provider to handle per-folder vector stores
**Estimated Time**: 5 hours

#### Sub-tasks:
1. [ ] **3.1 Multi-Folder Storage Interface**
   ```typescript
   // In src/infrastructure/storage/multi-folder-storage.ts
   export class MultiFolderStorageProvider implements IStorageProvider {
     private folderStores: Map<string, IStorageProvider>;
     
     constructor(
       private folderManager: IFolderManager,
       private storageFactory: IStorageFactory
     ) {}
     
     async initialize(): Promise<void> {
       // Create storage for each folder
       // Use folder-specific .folder-mcp directory
     }
     
     async search(query: string, folderName?: string): Promise<SearchResult[]> {
       // Search specific folder or all folders
       // Merge results from multiple stores
     }
   }
   ```
   
2. [ ] **3.2 Storage Factory for Per-Folder Stores**
   ```typescript
   // In src/infrastructure/storage/storage-factory.ts
   export class StorageFactory implements IStorageFactory {
     createStorage(folder: FolderConfig): IStorageProvider {
       // Create FAISS storage for folder
       // Use folder.path/.folder-mcp/ directory
       // Apply folder-specific settings
     }
   }
   ```

3. [ ] **3.3 Result Aggregation Logic**
   ```typescript
   // Merge search results from multiple folders
   // Maintain folder attribution in results
   // Sort by relevance across folders
   // Handle folder-specific limits
   ```

**Validation**:
```bash
npm run build && npm test -- tests/unit/infrastructure/storage
# Expected: Multi-folder storage tests pass

# Manual testing:
# Create test folders with content
# Verify separate .folder-mcp directories
# Test cross-folder search
```

**Implementation Notes**:
- Each folder gets its own vector store
- Results must indicate source folder
- Consider memory usage with multiple stores
- Support lazy loading of folder stores

**Completion Criteria**:
- [ ] Multi-folder storage provider works
- [ ] Per-folder vector stores created
- [ ] Search aggregates results correctly
- [ ] Folder attribution in results

---

### Assignment 4: Extend Indexing Workflow
**Goal**: Modify indexing workflow to handle multiple folders
**Estimated Time**: 4 hours

#### Sub-tasks:
1. [ ] **4.1 Multi-Folder Indexing Workflow**
   ```typescript
   // In src/application/indexing/multi-folder-indexing.ts
   export class MultiFolderIndexingWorkflow implements IIndexingWorkflow {
     constructor(
       private folderManager: IFolderManager,
       private storageProvider: IMultiFolderStorageProvider,
       private embeddingService: IEmbeddingService
     ) {}
     
     async indexAllFolders(): Promise<void> {
       // Index each folder with its settings
       // Use folder-specific embeddings backend
       // Apply folder-specific excludes
     }
     
     async indexFolder(folderName: string): Promise<void> {
       // Index specific folder
       // Use folder configuration
     }
   }
   ```
   
2. [ ] **4.2 Folder-Specific Settings Application**
   ```typescript
   // Apply folder embeddings backend
   // Use folder exclude patterns
   // Apply folder performance settings
   // Handle folder-specific errors
   ```

3. [ ] **4.3 Progress Tracking Per Folder**
   ```typescript
   // Track indexing progress per folder
   // Report folder-specific statistics
   // Handle partial failures
   ```

**Validation**:
```bash
npm run build && npm test -- tests/unit/application/indexing
# Expected: Multi-folder indexing tests pass

# Integration testing:
# Add multiple test folders
# Verify each indexed separately
# Check folder-specific settings applied
```

**Implementation Notes**:
- Index folders in parallel when possible
- Respect folder performance settings
- Handle folder access errors gracefully
- Support incremental indexing per folder

**Completion Criteria**:
- [ ] Multi-folder indexing works
- [ ] Folder settings applied correctly
- [ ] Progress tracked per folder
- [ ] Error handling per folder

---

### Assignment 5: Extend Monitoring Workflow
**Goal**: Modify file monitoring to watch multiple folders
**Estimated Time**: 3 hours

#### Sub-tasks:
1. [ ] **5.1 Multi-Folder Monitoring**
   ```typescript
   // In src/application/monitoring/multi-folder-monitoring.ts
   export class MultiFolderMonitoringWorkflow implements IMonitoringWorkflow {
     private folderWatchers: Map<string, IFileWatcher>;
     
     async startMonitoring(): Promise<void> {
       // Start watcher for each folder
       // Apply folder-specific excludes
       // Handle folder add/remove dynamically
     }
     
     async stopMonitoring(): Promise<void> {
       // Stop all folder watchers
       // Clean up resources
     }
   }
   ```
   
2. [ ] **5.2 Dynamic Folder Management**
   ```typescript
   // Handle configuration changes
   // Add watchers for new folders
   // Remove watchers for removed folders
   // Update excludes on config change
   ```

3. [ ] **5.3 Event Aggregation**
   ```typescript
   // Aggregate file change events
   // Attribute events to folders
   // Handle cross-folder moves
   ```

**Validation**:
```bash
npm run build && npm test -- tests/unit/application/monitoring
# Expected: Multi-folder monitoring tests pass

# Manual testing:
# Start monitoring multiple folders
# Add/modify files in each
# Verify changes detected per folder
```

**Implementation Notes**:
- Use chokidar for file watching
- Handle watcher errors per folder
- Support hot-reload of folder list
- Minimize resource usage

**Completion Criteria**:
- [ ] Multiple folders monitored
- [ ] Dynamic folder add/remove works
- [ ] Events attributed to folders
- [ ] Resource cleanup on stop

---

### Assignment 6: Update MCP Endpoints
**Goal**: Modify MCP endpoints to support folder parameters
**Estimated Time**: 5 hours

#### Sub-tasks:
1. [ ] **6.1 Add Folder Parameter to Tools**
   ```typescript
   // In src/interfaces/mcp/endpoints.ts
   // Update tool schemas to include optional folder parameter
   
   const searchTool = {
     name: 'search',
     description: 'Search documents across folders',
     inputSchema: {
       type: 'object',
       properties: {
         query: { type: 'string' },
         folder: { type: 'string', description: 'Folder name to search in' }
       }
     }
   };
   ```
   
2. [ ] **6.2 Update Endpoint Implementations**
   ```typescript
   // In each endpoint handler:
   // Accept folder parameter
   // Route to appropriate folder store
   // Return folder attribution in results
   
   async search(query: string, folder?: string) {
     if (folder) {
       return this.storage.searchFolder(query, folder);
     }
     return this.storage.searchAllFolders(query);
   }
   ```

3. [ ] **6.3 Add Folder Listing Endpoint**
   ```typescript
   // New tool: list_folders
   // Returns configured folders with status
   // Shows indexing stats per folder
   ```

**Validation**:
```bash
npm run build && npm test -- tests/unit/interfaces/mcp
# Expected: All endpoint tests pass with folder params

# Integration testing with Claude Desktop:
# Test search with folder parameter
# Test listing folders
# Verify backward compatibility
```

**Implementation Notes**:
- Maintain backward compatibility
- Folder parameter is optional
- Validate folder names in requests
- Include folder info in responses

**Completion Criteria**:
- [ ] All endpoints accept folder parameter
- [ ] Folder routing works correctly
- [ ] New list_folders endpoint works
- [ ] Backward compatibility maintained

---

### Assignment 7: Update MCP Server Entry Point
**Goal**: Modify main server to use multi-folder components
**Estimated Time**: 3 hours

#### Sub-tasks:
1. [ ] **7.1 Remove Single Folder Argument**
   ```typescript
   // In src/mcp-server.ts
   // Remove process.argv[2] folder path check
   // Use configuration for folder list instead
   // Initialize multi-folder components
   ```
   
2. [ ] **7.2 Initialize Multi-Folder Services**
   ```typescript
   // Create folder manager
   // Initialize multi-folder storage
   // Start multi-folder indexing
   // Begin multi-folder monitoring
   ```

3. [ ] **7.3 Configuration Change Handling**
   ```typescript
   // Listen for config reload events
   // Re-initialize on folder changes
   // Handle errors gracefully
   ```

**Validation**:
```bash
npm run build && npm test -- tests/integration/mcp-server
# Expected: Server starts with multiple folders

# Manual testing:
# Start server with config file
# Verify all folders indexed
# Test with Claude Desktop
```

**Implementation Notes**:
- Server no longer takes folder argument
- All folders from configuration
- Support configuration hot-reload
- Graceful error handling

**Completion Criteria**:
- [ ] Server uses configuration for folders
- [ ] All folders initialized on start
- [ ] Configuration changes handled
- [ ] Error handling robust

---

### Assignment 8: Migration and Compatibility
**Goal**: Ensure smooth transition from single to multi-folder
**Estimated Time**: 2 hours

#### Sub-tasks:
1. [ ] **8.1 Configuration Migration Helper**
   ```typescript
   // In src/config/migration/folder-migration.ts
   // Detect old single-folder setup
   // Migrate to multi-folder config
   // Preserve existing settings
   ```
   
2. [ ] **8.2 Backward Compatibility Layer**
   ```typescript
   // Support old CLI argument temporarily
   // Convert to configuration format
   // Log deprecation warning
   ```

3. [ ] **8.3 Documentation Updates**
   ```typescript
   // Update README.md
   // Update Claude Desktop config examples
   // Add migration guide
   ```

**Validation**:
```bash
# Test migration scenarios:
# Old: node mcp-server.js /path/to/folder
# New: Uses configuration file

# Verify existing setups continue working
```

**Implementation Notes**:
- Don't break existing installations
- Clear migration instructions
- Deprecation warnings helpful
- Automatic migration when possible

**Completion Criteria**:
- [ ] Migration helper works
- [ ] Backward compatibility maintained
- [ ] Documentation updated
- [ ] Clear upgrade path

## ✅ **Task Completion Criteria**

From roadmap:
- [ ] MCP server reads folder configuration
- [ ] Per-folder settings applied correctly
- [ ] Configuration changes trigger re-indexing
- [ ] Folder-specific models working
- [ ] Performance tuning per folder

Additional requirements:
- [ ] All assignments completed
- [ ] All tests passing
- [ ] Documentation updated

## 🧪 **Test Requirements from Architectural Bug Analysis**

### Critical Test Failures to Resolve
Based on real-data testing analysis, this task must ensure these failing tests pass:

#### Real Data Indexing Workflow Tests (8 failures)
- **File**: `tests/integration/workflows/indexing-real-data.test.ts`
- **Issue**: Path resolution bugs and indexing workflow failures exposed by real business documents
- **Root Cause**: File parsing system looks for files in wrong directory (project root instead of subdirectories)
- **Fix Target**: All 8 real-data indexing tests must pass

**Example of issue being fixed**:
```
Error: ENOENT: no such file or directory, open '/Users/user/Projects/folder-mcp/market_research.md'
Expected: /Users/user/Projects/folder-mcp/tests/fixtures/test-knowledge-base/Marketing/market_research.md
```

#### Additional Requirements
- **Real document processing**: Must successfully index actual business documents from test knowledge base
- **Path resolution**: Fix file parsing service path resolution for subdirectory files  
- **Error handling**: Proper error handling for indexing workflow failures
- **Statistics tracking**: Accurate progress and statistics with real files

### Test Validation Criteria
```bash
# These specific tests must pass after implementation:
npm test -- tests/integration/workflows/indexing-real-data.test.ts
# Expected: 0 failed, 8 passed

# Verify real document indexing works:
npm test -- tests/unit/domain/files.test.ts
npm test -- tests/unit/domain/content.test.ts
# Expected: All real-data tests pass
```

## 🧪 **Testing Requirements**

### Unit Tests
- `tests/unit/config/folders.test.ts` - Folder configuration validation
- `tests/unit/domain/folders/folder-manager.test.ts` - Folder manager logic
- `tests/unit/infrastructure/storage/multi-folder.test.ts` - Multi-folder storage
- `tests/unit/application/indexing/multi-folder.test.ts` - Multi-folder indexing
- `tests/unit/application/monitoring/multi-folder.test.ts` - Multi-folder monitoring
- `tests/unit/interfaces/mcp/multi-folder-endpoints.test.ts` - Updated endpoints

### Integration Tests
- Configuration loading with multiple folders
- Multi-folder indexing and search
- Dynamic folder addition/removal
- Cross-folder search results
- Claude Desktop compatibility

### Manual E2E Testing
- User configures multiple folders in YAML
- User starts MCP server (no folder argument)
- System indexes all configured folders
- User searches across all folders via Claude
- User searches within specific folder
- User adds new folder to config and reloads
- System indexes new folder automatically

### Configuration Test Cases
- **Default Config**: No folders configured, helpful error message
- **Single Folder**: Works like before for compatibility  
- **Multiple Folders**: Each with different settings
- **Invalid Folders**: Clear error messages for missing/inaccessible folders

## 📊 **Progress Tracking**

### Assignment Status
- [x] Assignment 1: Folder Configuration Schema & Interfaces ✅ COMPLETED
  - [x] 1.1 Folder Configuration Schema
  - [x] 1.2 Multi-Folder Service Interfaces
  - [x] 1.3 Configuration Integration
- [x] Assignment 2: Folder Manager Implementation ✅ COMPLETED
  - [x] 2.1 Domain Folder Manager Service
  - [x] 2.2 Folder Path Resolution
  - [x] 2.3 DI Container Registration
- [x] Assignment 3: Multi-Folder Storage Provider ✅ COMPLETED
  - [x] 3.1 Multi-Folder Storage Interface
  - [x] 3.2 Storage Factory for Per-Folder Stores
  - [x] 3.3 Result Aggregation Logic
- [x] Assignment 4: Extend Indexing Workflow ✅ COMPLETED
  - [x] 4.1 Multi-Folder Indexing Workflow
  - [x] 4.2 Folder-Specific Settings Application
  - [x] 4.3 Progress Tracking Per Folder
- [x] Assignment 5: Extend Monitoring Workflow ✅ COMPLETED
  - [x] 5.1 Multi-Folder Monitoring
  - [x] 5.2 Dynamic Folder Management
  - [x] 5.3 Event Aggregation
- [x] Assignment 6: Update MCP Endpoints ✅ COMPLETED
  - [x] 6.1 Add Folder Parameter to Tools
  - [x] 6.2 Update Endpoint Implementations
  - [x] 6.3 Add Folder Listing Endpoint
- [x] Assignment 7: Update MCP Server Entry Point ✅ COMPLETED
  - [x] 7.1 Remove Single Folder Argument
  - [x] 7.2 Initialize Multi-Folder Services
  - [x] 7.3 Configuration Change Handling
- [x] Assignment 8: Migration and Compatibility ✅ COMPLETED
  - [x] 8.1 Configuration Migration Helper
  - [x] 8.2 Backward Compatibility Layer
  - [x] 8.3 Documentation Updates

### Time Tracking
| Assignment | Estimated | Actual | Status | Notes |
|------------|-----------|--------|--------|-------|
| 1: Folder Configuration Schema | 3 hours | 1.5 hours | Complete | Schema, interfaces, and integration successful |
| 2: Folder Manager Implementation | 4 hours | 2 hours | Complete | Core logic, validation, path resolution, DI setup |
| 3: Multi-Folder Storage | 5 hours | 3 hours | Complete | Storage factory, multi-folder provider, result aggregation |
| 4: Extend Indexing | 4 hours | 2.5 hours | Complete | Multi-folder workflow, settings application, progress tracking |
| 5: Extend Monitoring | 3 hours | 2 hours | Complete | Multi-folder monitoring workflow, event aggregation, health system |
| 6: Update MCP Endpoints | 5 hours | 3 hours | Complete | Multi-folder search, folder routing, new getFolderInfo endpoint |
| 7: Update Server Entry | 3 hours | 2 hours | Complete | Multi-folder server initialization, backward compatibility, enhanced tools |
| 8: Migration & Compatibility | 2 hours | 1.5 hours | Complete | Configuration migration helper, CLI command, backward compatibility |

### Implementation Discoveries

#### Assignment 1: Folder Configuration Schema & Interfaces ✅ COMPLETED 2025-07-06

**Key Findings**:
- Successfully created comprehensive folder configuration schema at `src/config/schema/folders.ts`
- Domain interfaces follow established patterns in `src/domain/folders/interfaces.ts`
- Configuration integration into main schema works seamlessly with existing validation

**Decisions Made**:
- Used explicit interface definitions rather than `Partial<>` types to avoid TypeScript strictness issues
- Created separate `FolderDefaultsConfig` interface for cleaner type hierarchy
- Added comprehensive domain error classes for better error handling
- Included folder status and multi-folder system status interfaces for future monitoring

**Architecture Insights**:
- Configuration system extensibility proved excellent - adding folders required minimal changes
- Domain layer separation remains clean with proper interface definitions
- Dependency injection tokens established following existing `FOLDER_TOKENS` pattern

**Reusable Patterns**:
- Schema definition pattern: separate file in `src/config/schema/` directory
- Domain interface pattern: dedicated interfaces file with error classes and DI tokens
- Configuration integration: update main schema, defaults, and export functions
- Type safety: explicit interfaces avoid complex generic types that cause compilation issues

#### Assignment 2: Folder Manager Implementation ✅ COMPLETED 2025-07-06

**Key Findings**:
- Successfully created comprehensive domain services in `src/domain/folders/folder-manager.ts`
- All four services implemented: FolderManager, FolderValidator, FolderPathResolver, FolderConfigMerger
- Event-driven architecture with EventEmitter for folder state changes
- Cross-platform path resolution with Windows/Unix compatibility

**Decisions Made**:
- Single file implementation for related services to reduce complexity
- Used explicit status object construction to avoid TypeScript strict property issues
- Lazy-loaded dependencies in DI registration to avoid circular dependencies
- Configuration change watching for automatic folder list updates

**Architecture Insights**:
- Domain services cleanly separated from infrastructure concerns
- Proper dependency injection with service factory pattern
- Validation strategy separates concerns: configuration, path, safety, permissions
- Status tracking provides foundation for monitoring and UI feedback

**Cross-Platform Considerations**:
- Path resolution handles ~ expansion, normalization, absolute conversion
- Case-insensitive path comparison on Windows
- System directory validation prevents indexing dangerous locations
- Permission checking uses directory read access as safety measure

#### Assignment 3: Multi-Folder Storage Provider ✅ COMPLETED 2025-07-06

**Key Findings**:
- Successfully created multi-folder storage system in `src/infrastructure/storage/multi-folder-storage.ts`
- Implemented storage factory pattern for per-folder vector stores
- Result aggregation with folder attribution for cross-folder search
- Proper abstraction over existing VectorSearchService infrastructure

**Decisions Made**:
- Used factory pattern for creating folder-specific storage instances
- Folder-specific cache directories (.folder-mcp/storage) for isolation
- Deferred searchByText implementation until embedding service integration
- Map-based storage management for efficient folder lookup

**Architecture Insights**:
- Storage provider abstracts multiple vector stores behind single interface
- Factory pattern enables folder-specific storage configuration
- Result aggregation maintains source folder attribution for UI/debugging
- Infrastructure layer properly separated from domain and application concerns

**Integration Points**:
- DI registration follows established service factory pattern
- Storage interfaces designed for future embedding service integration
- Error handling provides graceful degradation per folder
- Statistics interface ready for monitoring and management UIs

#### Assignment 4: Extend Indexing Workflow ✅ COMPLETED 2025-07-06

**Key Findings**:
- Successfully created multi-folder indexing workflow in `src/application/indexing/multi-folder-indexing.ts`
- Implemented folder-specific settings application with proper configuration inheritance
- Progress tracking per folder with comprehensive error handling and status reporting
- Batch processing with concurrency controls for efficient resource usage

**Decisions Made**:
- Used Promise.allSettled for parallel folder processing with graceful error handling
- Conditional status object construction to avoid TypeScript strict optional property issues
- Folder-specific configuration merging with performance settings override capability
- Comprehensive progress tracking with per-folder statistics and timing

**Architecture Insights**:
- Application workflow orchestrates multiple domain services cleanly
- Proper separation between folder configuration and indexing execution
- Event-driven progress reporting enables real-time UI updates
- Error isolation prevents single folder failures from affecting others

**Performance Considerations**:
- Configurable concurrency limits prevent resource exhaustion
- Batch processing with folder-specific performance settings
- Progress tracking optimized for frequent updates without memory leaks
- Graceful degradation when folders become inaccessible

#### Assignment 5: Extend Monitoring Workflow ✅ COMPLETED 2025-07-06

**Key Findings**:
- Successfully created comprehensive multi-folder monitoring system in `src/application/monitoring/multi-folder-monitoring.ts`
- Implemented dynamic folder management with configuration change detection
- Event aggregation system with cross-folder attribution and health monitoring
- Complete health monitoring system with recommendations and auto-resolution capabilities

**Decisions Made**:
- Used Map-based tracking for efficient folder watcher management
- Event aggregation with configurable history limits for memory management
- Health monitor with issue detection and auto-resolution recommendations
- Comprehensive status interfaces for monitoring and management UIs

**Architecture Insights**:
- Multi-folder monitoring cleanly abstracts single-folder monitoring workflows
- Health monitoring system provides actionable insights for system maintenance
- Event aggregation enables cross-folder analytics and troubleshooting
- Dynamic folder management supports hot configuration reloading

**System Features**:
- Folder health checking with automatic issue detection (inactive watchers, high error rates, queue backlogs)
- System resource monitoring (memory, CPU, file handles)
- Performance metrics tracking (processing times, events per second, restart frequency)
- Actionable health recommendations with automation flags

#### Assignment 6: Update MCP Endpoints ✅ COMPLETED 2025-07-06

**Key Findings**:
- Successfully updated MCP endpoints to support multi-folder operations in `src/interfaces/mcp/endpoints.ts`
- Added backward compatibility layer for single-folder mode operation
- Enhanced search endpoint with folder filtering and multi-folder storage integration
- Created new `getFolderInfo` endpoint for comprehensive folder status and management

**Decisions Made**:
- Optional multi-folder services in constructor for backward compatibility
- Conditional routing: use multi-folder storage when available, fall back to single-folder
- Folder attribution in search results with proper metadata including source folder
- New endpoint for folder management without breaking existing API

**Architecture Insights**:
- Clean abstraction between single and multi-folder modes at interface layer
- Search endpoint naturally supports both folder-specific and cross-folder queries
- Document path resolution handles both legacy and multi-folder scenarios
- Result attribution maintains folder context for debugging and UI purposes

**API Enhancements**:
- Search endpoint respects `filters.folder` parameter for folder-specific searches
- `listFolders()` returns configured folders instead of directory listing
- `listDocuments()` uses folder manager to resolve folder paths correctly
- New `getFolderInfo()` provides comprehensive folder status, document counts, and settings
- All endpoints maintain backward compatibility with single-folder mode

#### Assignment 7: Update MCP Server Entry Point ✅ COMPLETED 2025-07-06

**Key Findings**:
- Successfully updated MCP server entry point in `src/mcp-server.ts` to support both legacy and multi-folder modes
- Implemented intelligent mode detection based on command line arguments vs configuration
- Enhanced MCP tool definitions with folder filtering and new `get_folder_info` endpoint
- Proper initialization of multi-folder workflows for indexing and monitoring

**Decisions Made**:
- Backward compatibility layer: server still accepts single folder argument for legacy mode
- Multi-folder mode auto-detected when no command line argument provided
- Enhanced search tool with full parameter set including folder filtering
- Optional multi-folder service injection with graceful fallback to single-folder mode

**Architecture Insights**:
- Clean separation between legacy single-folder and new multi-folder initialization
- Service resolution handles missing multi-folder services gracefully
- Background processes (indexing, monitoring) automatically adapt to available services
- Proper shutdown handling for both single and multi-folder monitoring

**Server Enhancements**:
- Added `get_folder_info` tool for comprehensive folder status management
- Enhanced `search` tool with folder filtering, mode selection, and improved parameters
- Dual initialization paths: legacy mode vs configuration-driven multi-folder mode
- Graceful error handling and fallback behaviors for missing configuration
- Proper background process management with folder-aware initialization

#### Assignment 8: Migration and Compatibility ✅ COMPLETED 2025-07-06

**Key Findings**:
- Created comprehensive migration system in `src/config/migration/folder-migration.ts`
- Built user-friendly CLI migration command in `src/interfaces/cli/commands/migrate.ts`
- Implemented intelligent detection of legacy vs multi-folder usage patterns
- Provided sample configuration generation and validation tools

**Decisions Made**:
- Backward compatibility built into MCP server entry point (Assignment 7)
- Migration helper generates YAML configuration files with proper structure
- CLI command provides dry-run, sample generation, and validation options
- Preserves existing configuration when migrating to avoid data loss

**Architecture Insights**:
- Migration system is completely optional - users can migrate when ready
- Configuration validation ensures generated configs meet schema requirements
- Sample configuration provides comprehensive examples of multi-folder setup
- CLI integration makes migration accessible through familiar command interface

**Migration Features**:
- Automatic detection of legacy single-folder command line usage
- Smart folder name generation from path when not specified
- Dry-run mode shows migration actions without making changes
- Sample configuration generation with comprehensive examples
- Configuration validation with detailed error reporting
- Preservation of existing multi-folder configuration during migration

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
npm test -- tests/unit/domain/folders
npm test -- tests/integration/multi-folder

# Test with configuration
FOLDER_MCP_CONFIG_PATH=./test-config.yaml npm run dev
```

### Common Issues
- **Path resolution**: Use path.resolve() for cross-platform
- **Home directory**: Expand ~ before validation
- **Folder permissions**: Check read access before indexing
- **Memory usage**: Multiple vector stores need management

---

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