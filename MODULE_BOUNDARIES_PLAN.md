# Module Boundaries Implementation Plan

**Project**: folder-mcp  
**Date**: June 11, 2025  
**Objective**: Establish proper module boundaries to improve maintainability, testability, and scalability

## 📊 Current State Analysis

### ✅ Well-Structured Areas
- **Dependency Injection** (`src/di/`) - Good interfaces and service organization
- **Configuration System** (`src/config/`) - Clear separation of concerns with schema, validation, runtime config
- **Type Definitions** (`src/types/`) - Centralized type definitions

### ⚠️ Areas Requiring Module Boundaries

#### 1. **CLI Layer Issues**
- **Problem**: Direct imports from multiple low-level modules
- **Current**: `src/cli/commands.ts` imports from `../processing/`, `../embeddings/`, `../config/`, etc.
- **Impact**: Tight coupling, difficult testing, unclear responsibilities

#### 2. **MCP Server Duplication**
- **Problem**: Two MCP server implementations with overlapping responsibilities
- **Files**: `src/mcp/server.ts` and `src/mcp/mcpServer.ts`
- **Impact**: Code duplication, unclear which to use, maintenance burden

#### 3. **Processing Module Mixing**
- **Problem**: Mixed concerns between indexing, chunking, and processing services
- **Files**: `src/processing/indexing.ts`, `src/processing/chunking.ts`, `src/processing/indexingService.ts`
- **Impact**: Unclear ownership, difficult to modify independently

#### 4. **Search Implementation Scatter**
- **Problem**: Search logic distributed across multiple files without clear organization
- **Files**: `src/search/index.ts`, `src/search/enhanced.ts`, `src/search/cli.ts`
- **Impact**: Hard to understand search capabilities, duplicate functionality

#### 5. **Cross-Cutting Concerns**
- **Problem**: Utilities, error recovery, and logging spread throughout codebase
- **Files**: `src/utils/`, `src/watch/`, mixed error handling
- **Impact**: Inconsistent patterns, hard to maintain

### 🚨 Specific Issues Identified

#### Import Violations
```typescript
// src/cli/commands.ts - Too many direct imports
import { testEmbeddingSystem } from '../embeddings/index.js';
import { setupConfigCommand } from '../config/cli.js';
import { resolveConfig, parseCliArgs } from '../config/resolver.js';
import { initializeLocalConfig } from '../config/local.js';
```

#### Circular Dependencies
- `src/di/setup.ts` ↔ `src/config/resolver.ts`
- `src/processing/indexing.ts` ↔ `src/cache/index.ts`
- `src/mcp/server.ts` ↔ `src/embeddings/index.ts`

#### Mixed Abstraction Levels
- CLI commands directly instantiate domain services
- MCP handlers contain business logic
- Configuration mixed with runtime operations

## 🏗️ Proposed Module Architecture

### 1. **Layered Architecture Overview**

```
┌─────────────────────────────────────────┐
│             INTERFACES                  │ ← Entry points (CLI, MCP, API)
├─────────────────────────────────────────┤
│            APPLICATION                  │ ← Use cases & workflows
├─────────────────────────────────────────┤
│              DOMAIN                     │ ← Business logic
├─────────────────────────────────────────┤
│          INFRASTRUCTURE                 │ ← Technical services
├─────────────────────────────────────────┤
│              SHARED                     │ ← Common utilities & DI
└─────────────────────────────────────────┘
```

### 2. **New Directory Structure**

```
src/
├── interfaces/                 # External interfaces (Entry points)
│   ├── cli/                   # Command-line interface
│   │   ├── index.ts           # Public API
│   │   ├── program.ts         # CLI program setup
│   │   ├── commands/          # Individual commands
│   │   │   ├── index.ts
│   │   │   ├── serve.ts
│   │   │   ├── embed.ts
│   │   │   └── search.ts
│   │   └── options.ts         # CLI option parsing
│   │
│   ├── mcp/                   # MCP protocol interface
│   │   ├── index.ts           # Public API
│   │   ├── server.ts          # Unified MCP server
│   │   ├── handlers/          # MCP request handlers
│   │   │   ├── index.ts
│   │   │   ├── files.ts
│   │   │   ├── search.ts
│   │   │   └── knowledge.ts
│   │   └── transport.ts       # Transport abstraction
│   │
│   └── api/                   # Future REST API
│       ├── index.ts
│       └── routes.ts
│
├── application/               # Use cases & business workflows
│   ├── indexing/             # Indexing orchestration
│   │   ├── index.ts          # Public API
│   │   ├── orchestrator.ts   # Main indexing workflow
│   │   ├── pipeline.ts       # Processing pipeline
│   │   └── incremental.ts    # Incremental indexing
│   │
│   ├── serving/              # Content serving workflows
│   │   ├── index.ts          # Public API
│   │   ├── content.ts        # Content retrieval
│   │   ├── search.ts         # Search workflows
│   │   └── knowledge.ts      # Knowledge base operations
│   │
│   └── monitoring/           # Watch & monitoring workflows
│       ├── index.ts          # Public API
│       ├── watcher.ts        # File watching
│       └── health.ts         # System health
│
├── domain/                   # Core business logic
│   ├── files/               # File system domain
│   │   ├── index.ts         # Public API
│   │   ├── parser.ts        # File parsing logic
│   │   ├── fingerprint.ts   # File fingerprinting
│   │   ├── watcher.ts       # File change detection
│   │   └── types.ts         # Domain types
│   │
│   ├── content/             # Content processing domain
│   │   ├── index.ts         # Public API
│   │   ├── chunking.ts      # Text chunking strategies
│   │   ├── processing.ts    # Content processing
│   │   ├── metadata.ts      # Metadata extraction
│   │   └── types.ts         # Domain types
│   │
│   ├── embeddings/          # AI/ML domain
│   │   ├── index.ts         # Public API
│   │   ├── models.ts        # Embedding models
│   │   ├── generation.ts    # Vector generation
│   │   ├── batch.ts         # Batch processing
│   │   └── types.ts         # Domain types
│   │
│   └── search/              # Search domain
│       ├── index.ts         # Public API
│       ├── vector.ts        # Vector similarity search
│       ├── enhanced.ts      # Enhanced search features
│       ├── ranking.ts       # Result ranking
│       └── types.ts         # Domain types
│
├── infrastructure/          # Technical infrastructure
│   ├── cache/              # Caching infrastructure
│   │   ├── index.ts        # Public API
│   │   ├── storage.ts      # Storage strategies
│   │   ├── strategy.ts     # Caching strategies
│   │   └── types.ts        # Infrastructure types
│   │
│   ├── config/             # Configuration infrastructure
│   │   ├── index.ts        # Public API (existing structure)
│   │   └── ...             # (keep existing files)
│   │
│   ├── logging/            # Logging infrastructure
│   │   ├── index.ts        # Public API
│   │   ├── logger.ts       # Logger implementation
│   │   ├── formatters.ts   # Log formatters
│   │   └── transports.ts   # Log transports
│   │
│   └── errors/             # Error handling infrastructure
│       ├── index.ts        # Public API
│       ├── recovery.ts     # Error recovery strategies
│       ├── handlers.ts     # Error handlers
│       └── types.ts        # Error types
│
└── shared/                 # Shared foundation
    ├── types/              # Shared type definitions
    │   ├── index.ts        # Public API (existing structure)
    │   └── ...             # (keep existing files)
    │
    ├── utils/              # Shared utilities
    │   ├── index.ts        # Public API
    │   ├── validation.ts   # Validation utilities
    │   ├── helpers.ts      # General helpers
    │   └── constants.ts    # Shared constants
    │
    └── di/                 # Dependency injection
        ├── index.ts        # Public API (existing structure)
        └── ...             # (keep existing files)
```

### 3. **Dependency Rules**

#### 3.1 **Allowed Dependencies**

| Layer | Can Import From | Rationale |
|-------|----------------|-----------|
| `interfaces/` | `application/`, `shared/` | Entry points orchestrate use cases |
| `application/` | `domain/`, `shared/` | Use cases coordinate domain logic |
| `domain/` | `shared/` only | Business logic is pure, no external deps |
| `infrastructure/` | `shared/` only | Technical services use shared utilities |
| `shared/` | Internal only | Foundation layer has no external deps |

#### 3.2 **Forbidden Dependencies**

- ❌ `domain/` cannot import from `infrastructure/` or `application/`
- ❌ `infrastructure/` cannot import from `domain/` or `application/`
- ❌ `application/` cannot import from `infrastructure/` (except via DI)
- ❌ `shared/` cannot import from any other layer
- ❌ No circular dependencies between any modules

#### 3.3 **Communication Patterns**

```typescript
// ✅ Correct: Interface → Application → Domain
// interfaces/cli/commands/serve.ts
import { ServingOrchestrator } from '../../../application/serving/index.js';

// ✅ Correct: Application → Domain
// application/serving/orchestrator.ts
import { FileParser } from '../../domain/files/index.js';
import { VectorSearch } from '../../domain/search/index.js';

// ✅ Correct: Domain ↔ Infrastructure via DI
// domain/files/parser.ts
constructor(
  private readonly cacheService: ICacheService,  // Injected
  private readonly loggingService: ILoggingService  // Injected
) {}

// ❌ Wrong: Direct infrastructure import in domain
import { CacheService } from '../../infrastructure/cache/storage.js';
```

## 🚀 Implementation Roadmap

### Phase 1: Foundation Setup (Week 1)
**Goal**: Prepare infrastructure for modular architecture

#### 1.1 Create New Directory Structure
```bash
# Create new module directories
mkdir -p src/interfaces/{cli,mcp,api}
mkdir -p src/application/{indexing,serving,monitoring}
mkdir -p src/domain/{files,content,embeddings,search}
mkdir -p src/infrastructure/{cache,logging,errors}
mkdir -p src/shared/{utils}
```

#### 1.2 Create Module Index Files
Each module gets a public API:
```typescript
// Example: src/domain/files/index.ts
export { FileParser } from './parser.js';
export { FileWatcher } from './watcher.js';
export { createFileFingerprint } from './fingerprint.js';
export type { 
  FileOperations, 
  ParsedFile, 
  FileMetadata 
} from './types.js';
```

#### 1.3 Update DI System
Modify `src/shared/di/interfaces.ts` to support new module structure:
```typescript
// Add module-specific service tokens
export const MODULE_TOKENS = {
  // Domain services
  FILE_DOMAIN: Symbol('FileDomain'),
  CONTENT_DOMAIN: Symbol('ContentDomain'),
  EMBEDDINGS_DOMAIN: Symbol('EmbeddingsDomain'),
  SEARCH_DOMAIN: Symbol('SearchDomain'),
  
  // Application services
  INDEXING_APP: Symbol('IndexingApplication'),
  SERVING_APP: Symbol('ServingApplication'),
  MONITORING_APP: Symbol('MonitoringApplication'),
} as const;
```

### Phase 2: Domain Extraction (Week 2)
**Goal**: Extract pure business logic into domain modules

#### 2.1 Files Domain
**Migrate**: `src/parsers/`, `src/utils/fingerprint.ts`, parts of `src/watch/`
```typescript
// src/domain/files/parser.ts
export class FileParser {
  constructor(
    private readonly logger: ILoggingService
  ) {}
  
  async parseFile(filePath: string): Promise<ParsedContent> {
    // Pure business logic for file parsing
  }
}
```

#### 2.2 Content Domain
**Migrate**: `src/processing/chunking.ts`, content processing logic
```typescript
// src/domain/content/chunking.ts
export class ContentChunker {
  constructor(
    private readonly config: ChunkingConfig
  ) {}
  
  chunkText(text: string): TextChunk[] {
    // Pure chunking algorithms
  }
}
```

#### 2.3 Embeddings Domain
**Migrate**: Core embedding logic from `src/embeddings/`
```typescript
// src/domain/embeddings/models.ts
export class EmbeddingModel {
  async generateEmbeddings(chunks: TextChunk[]): Promise<EmbeddingVector[]> {
    // Pure embedding generation logic
  }
}
```

#### 2.4 Search Domain
**Migrate**: `src/search/index.ts`, `src/search/enhanced.ts`
```typescript
// src/domain/search/vector.ts
export class VectorSearch {
  async findSimilar(query: EmbeddingVector, k: number): Promise<SearchResult[]> {
    // Pure search algorithms
  }
}
```

### Phase 3: Infrastructure Consolidation (Week 3)
**Goal**: Centralize technical infrastructure

#### 3.1 Cache Infrastructure
**Migrate**: `src/cache/` → `src/infrastructure/cache/`
```typescript
// src/infrastructure/cache/storage.ts
export class CacheStorage implements ICacheService {
  // Technical caching implementation
}
```

#### 3.2 Logging Infrastructure
**Extract**: Logging from DI services → `src/infrastructure/logging/`
```typescript
// src/infrastructure/logging/logger.ts
export class Logger implements ILoggingService {
  // Technical logging implementation
}
```

#### 3.3 Error Infrastructure
**Migrate**: `src/utils/errorRecovery.ts` → `src/infrastructure/errors/`
```typescript
// src/infrastructure/errors/recovery.ts
export class ErrorRecoveryManager {
  // Technical error handling
}
```

#### 3.4 Move Config to Infrastructure
**Migrate**: `src/config/` → `src/infrastructure/config/`
- Keep existing structure
- Update imports throughout codebase

### Phase 4: Application Layer Creation (Week 4)
**Goal**: Create use case orchestrators

#### 4.1 Indexing Application
**Migrate**: `src/processing/indexing.ts`, `src/processing/indexingService.ts`
```typescript
// src/application/indexing/orchestrator.ts
export class IndexingOrchestrator {
  constructor(
    private readonly fileParser: FileParser,
    private readonly contentChunker: ContentChunker,
    private readonly embeddingModel: EmbeddingModel,
    private readonly cache: ICacheService
  ) {}
  
  async indexFolder(folderPath: string): Promise<IndexingResult> {
    // Orchestrate the indexing workflow
    const files = await this.fileParser.scanFolder(folderPath);
    const content = await this.fileParser.parseFiles(files);
    const chunks = await this.contentChunker.chunkContent(content);
    const embeddings = await this.embeddingModel.generateEmbeddings(chunks);
    await this.cache.storeEmbeddings(embeddings);
    return { success: true, filesProcessed: files.length };
  }
}
```

#### 4.2 Serving Application
**Extract**: Serving logic from MCP servers
```typescript
// src/application/serving/content.ts
export class ContentServingOrchestrator {
  async getFileContent(filePath: string): Promise<string> {
    // Orchestrate content retrieval
  }
  
  async searchKnowledge(query: string): Promise<SearchResult[]> {
    // Orchestrate knowledge search
  }
}
```

#### 4.3 Monitoring Application
**Migrate**: `src/watch/` logic
```typescript
// src/application/monitoring/watcher.ts
export class FileWatchingOrchestrator {
  async startWatching(folderPath: string): Promise<void> {
    // Orchestrate file watching workflow
  }
}
```

### Phase 5: Interface Refactoring (Week 5)
**Goal**: Create clean external interfaces

#### 5.1 CLI Interface
**Migrate**: `src/cli/commands.ts` → `src/interfaces/cli/`
```typescript
// src/interfaces/cli/commands/serve.ts
export class ServeCommand {
  constructor(
    private readonly servingApp: ContentServingOrchestrator
  ) {}
  
  async execute(options: ServeOptions): Promise<void> {
    // Thin interface layer - delegates to application
    await this.servingApp.startServer(options);
  }
}
```

#### 5.2 MCP Interface
**Consolidate**: `src/mcp/server.ts` + `src/mcp/mcpServer.ts` → `src/interfaces/mcp/`
```typescript
// src/interfaces/mcp/server.ts
export class MCPServer {
  constructor(
    private readonly servingApp: ContentServingOrchestrator
  ) {}
  
  private setupHandlers(): void {
    // Thin MCP protocol layer
    this.server.setRequestHandler('read_file', async (request) => {
      return await this.servingApp.getFileContent(request.params.filePath);
    });
  }
}
```

#### 5.3 Remove Duplicate Implementations
- Delete `src/mcp/mcpServer.ts` (merge into unified server)
- Delete `src/cli/commandsRefactored.ts` (merge into unified CLI)
- Consolidate legacy vs DI implementations

#### 5.4 Complete Legacy Code Removal
**Goal**: Eliminate all legacy implementations for clean, maintainable codebase

Since this is a pre-production tool with a sole developer, remove all legacy code to avoid maintenance overhead:

**Legacy Directories to Delete**:
```bash
# Remove entire legacy modules
Remove-Item -Recurse -Force src\processing\
Remove-Item -Recurse -Force src\search\
Remove-Item -Recurse -Force src\watch\
Remove-Item -Recurse -Force src\embeddings\
Remove-Item -Recurse -Force src\parsers\
Remove-Item -Recurse -Force src\cache\
Remove-Item -Recurse -Force src\cli\

# Remove legacy utility files
Remove-Item -Force src\utils\errorRecovery.ts
Remove-Item -Force src\utils\fingerprint.ts
```

**Rationale**:
- ✅ **Single Source of Truth**: Eliminate confusion about which implementation to use
- ✅ **Reduced Complexity**: Remove duplicate code paths and maintenance burden
- ✅ **Clean Architecture**: Pure modular structure without legacy cruft
- ✅ **Future-Proof**: New features only need to consider modular architecture

**Migration Status**:
- ✅ Processing logic → `src/application/indexing/` & `src/domain/content/`
- ✅ Search logic → `src/application/serving/` & `src/domain/search/`
- ✅ Watch logic → `src/application/monitoring/`
- ✅ Embedding logic → `src/domain/embeddings/`
- ✅ Parser logic → `src/domain/files/`
- ✅ Cache logic → `src/infrastructure/cache/`
- ✅ Error recovery → `src/infrastructure/errors/`

**Post-Removal Actions**:
1. Update any remaining imports to use new modular paths
2. Remove legacy service registrations from DI container
3. Update tests to use new module structure
4. Validate no broken references remain

### Phase 6: Validation & Testing (Week 6)
**Goal**: Ensure architectural integrity

#### 6.1 Update Import Statements
Use automated tools to update all imports:
```bash
# Find all TypeScript files and update imports
find src -name "*.ts" -exec sed -i 's|../config/|../infrastructure/config/|g' {} \;
```

#### 6.2 Add Architectural Tests
```typescript
// tests/architecture.test.ts
describe('Module Boundaries', () => {
  it('should not allow domain to import from infrastructure', () => {
    const domainFiles = glob.sync('src/domain/**/*.ts');
    domainFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      expect(content).not.toMatch(/from ['"]\.\.['"]/); // No relative imports up
      expect(content).not.toMatch(/infrastructure/); // No infrastructure imports
    });
  });
});
```

#### 6.3 Update Existing Tests
Modify test files to use new module structure:
```typescript
// Before
import { indexFolder } from '../src/processing/indexing.js';

// After
import { IndexingOrchestrator } from '../src/application/indexing/index.js';
```

## 📋 Module API Specifications

### Domain Module APIs

#### Files Domain
```typescript
// src/domain/files/index.ts
export interface FileOperations {
  scanFolder(path: string): Promise<string[]>;
  parseFile(path: string): Promise<ParsedContent>;
  watchFolder(path: string, callback: FileChangeCallback): Promise<void>;
}

export class FileParser implements FileOperations {
  // Implementation
}

export { createFileFingerprint } from './fingerprint.js';
export type { ParsedContent, FileMetadata } from './types.js';
```

#### Content Domain
```typescript
// src/domain/content/index.ts
export interface ContentOperations {
  chunkText(text: string, options: ChunkingOptions): TextChunk[];
  processContent(content: ParsedContent): ProcessedContent;
  extractMetadata(content: ParsedContent): ContentMetadata;
}

export class ContentProcessor implements ContentOperations {
  // Implementation
}

export type { TextChunk, ProcessedContent, ChunkingOptions } from './types.js';
```

### Application Module APIs

#### Indexing Application
```typescript
// src/application/indexing/index.ts
export interface IndexingWorkflow {
  indexFolder(path: string, options: IndexingOptions): Promise<IndexingResult>;
  indexFiles(files: string[], options: IndexingOptions): Promise<IndexingResult>;
  getIndexingStatus(path: string): Promise<IndexingStatus>;
}

export class IndexingOrchestrator implements IndexingWorkflow {
  // Implementation
}

export type { IndexingOptions, IndexingResult, IndexingStatus } from './types.js';
```

### Interface Module APIs

#### CLI Interface
```typescript
// src/interfaces/cli/index.ts
export interface CLIProgram {
  addCommand(command: CLICommand): void;
  execute(args: string[]): Promise<void>;
}

export class FolderMCPCLI implements CLIProgram {
  // Implementation
}

export type { CLICommand, CLIOptions } from './types.js';
```

## 🔧 Benefits of New Architecture

### 1. **Clear Separation of Concerns**
- **Domain**: Pure business logic, no external dependencies
- **Application**: Use case orchestration, dependency coordination
- **Infrastructure**: Technical implementation details
- **Interfaces**: External communication protocols

### 2. **Improved Testability**
```typescript
// Easy to test domain logic in isolation
const fileParser = new FileParser(mockLogger);
const result = await fileParser.parseFile('test.txt');
expect(result.content).toBe('expected content');

// Easy to test application workflows with mocks
const indexingApp = new IndexingOrchestrator(
  mockFileParser,
  mockContentChunker,
  mockEmbeddingModel,
  mockCache
);
```

### 3. **Reduced Coupling**
- Modules communicate only through well-defined interfaces
- Changes in one module don't ripple through others
- Easy to swap implementations (e.g., different caching strategies)

### 4. **Better Developer Experience**
- Clear places to add new functionality
- Easier onboarding for new developers
- Consistent patterns across the codebase

### 5. **Future Scalability**
- Easy to add new interfaces (REST API, GraphQL, etc.)
- Simple to add new domains (versioning, permissions, etc.)
- Supports team scaling and parallel development

## 🚨 Migration Risks & Mitigation

### Risk 1: Breaking Changes During Migration
**Mitigation**:
- Implement behind feature flags
- Maintain parallel implementations during transition
- Comprehensive test coverage before migration

### Risk 2: Import Path Confusion
**Mitigation**:
- Use automated migration scripts
- Clear documentation of new paths
- IDE configuration for auto-imports

### Risk 3: DI Container Complexity
**Mitigation**:
- Update DI system incrementally
- Maintain backward compatibility
- Clear DI registration patterns

## 📊 Success Metrics

### Code Quality Metrics
- **Cyclomatic Complexity**: Reduce average complexity by 30%
- **Coupling Metrics**: Reduce inter-module dependencies by 50%
- **Test Coverage**: Maintain >90% coverage throughout migration

### Developer Productivity Metrics
- **Build Time**: Should not increase significantly
- **Test Run Time**: Improve due to better isolation
- **Feature Development Time**: Should decrease after migration

### Architectural Metrics
- **Import Violations**: Zero violations of dependency rules
- **Circular Dependencies**: Zero circular dependencies
- **API Surface**: Reduce public API surface by 40%

## 🎯 Next Steps

### Immediate Actions (This Week)
1. **Review and approve this plan** with the team
2. **Set up architectural linting** to prevent violations
3. **Create migration branch** for implementation
4. **Update project documentation** with new structure

### Week 1 Tasks
1. **Create directory structure** as outlined in Phase 1
2. **Set up module index files** with public APIs
3. **Update DI system** for new module tokens
4. **Create architectural tests** to enforce boundaries

### Long-term Goals
1. **Complete migration** within 6 weeks
2. **Establish coding standards** for new architecture
3. **Create developer guidelines** for module boundaries
4. **Plan future enhancements** enabled by modular structure

---

**Author**: GitHub Copilot  
**Review Required**: Architecture Team  
**Implementation Timeline**: 6 weeks  
**Priority**: High - Foundation for future scalability
