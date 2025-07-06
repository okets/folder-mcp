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
- [ ] Assignment 1: Folder Configuration Schema & Interfaces
  - [ ] 1.1 Folder Configuration Schema
  - [ ] 1.2 Multi-Folder Service Interfaces
  - [ ] 1.3 Configuration Integration
- [ ] Assignment 2: Folder Manager Implementation
  - [ ] 2.1 Domain Folder Manager Service
  - [ ] 2.2 Folder Path Resolution
  - [ ] 2.3 DI Container Registration
- [ ] Assignment 3: Multi-Folder Storage Provider
  - [ ] 3.1 Multi-Folder Storage Interface
  - [ ] 3.2 Storage Factory for Per-Folder Stores
  - [ ] 3.3 Result Aggregation Logic
- [ ] Assignment 4: Extend Indexing Workflow
  - [ ] 4.1 Multi-Folder Indexing Workflow
  - [ ] 4.2 Folder-Specific Settings Application
  - [ ] 4.3 Progress Tracking Per Folder
- [ ] Assignment 5: Extend Monitoring Workflow
  - [ ] 5.1 Multi-Folder Monitoring
  - [ ] 5.2 Dynamic Folder Management
  - [ ] 5.3 Event Aggregation
- [ ] Assignment 6: Update MCP Endpoints
  - [ ] 6.1 Add Folder Parameter to Tools
  - [ ] 6.2 Update Endpoint Implementations
  - [ ] 6.3 Add Folder Listing Endpoint
- [ ] Assignment 7: Update MCP Server Entry Point
  - [ ] 7.1 Remove Single Folder Argument
  - [ ] 7.2 Initialize Multi-Folder Services
  - [ ] 7.3 Configuration Change Handling
- [ ] Assignment 8: Migration and Compatibility
  - [ ] 8.1 Configuration Migration Helper
  - [ ] 8.2 Backward Compatibility Layer
  - [ ] 8.3 Documentation Updates

### Time Tracking
| Assignment | Estimated | Actual | Status | Notes |
|------------|-----------|--------|--------|-------|
| 1: Folder Configuration Schema | 3 hours | | Not Started | |
| 2: Folder Manager Implementation | 4 hours | | Not Started | |
| 3: Multi-Folder Storage | 5 hours | | Not Started | |
| 4: Extend Indexing | 4 hours | | Not Started | |
| 5: Extend Monitoring | 3 hours | | Not Started | |
| 6: Update MCP Endpoints | 5 hours | | Not Started | |
| 7: Update Server Entry | 3 hours | | Not Started | |
| 8: Migration & Compatibility | 2 hours | | Not Started | |

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