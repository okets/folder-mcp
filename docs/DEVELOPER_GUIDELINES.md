# Developer Guidelines

**Project**: folder-mcp  
**Last Updated**: June 12, 2025  
**Purpose**: Establish coding standards and module boundary guidelines for maintainable, scalable architecture

## 🚀 Quick Start for New Developers

### Prerequisites Checklist

Before you start coding, ensure you have:

- [ ] **Node.js 18+** installed
- [ ] **TypeScript** knowledge (basics: types, interfaces, generics)
- [ ] **Git** configured with your credentials
- [ ] **VS Code** with recommended extensions installed
- [ ] **Understanding of Promises/async-await** in JavaScript

### First Day Setup

1. **Clone and Setup**:
   ```powershell
   git clone <repository-url>
   cd folder-mcp
   npm install
   npm run build
   npm test
   ```

2. **Understand the Project**:
   - Read `README.md` for project overview
   - Review `CONFIGURATION.md` for setup options
   - Run `npm run cli -- --help` to see available commands

3. **Explore the Codebase**:
   - Start with `src/interfaces/` to understand entry points
   - Look at `src/domain/` to understand business logic
   - Check `tests/` to see how features are tested

> **Why this order matters**: Starting with interfaces helps you understand what the system does for users, then diving into domain logic shows you how it works internally. This top-down approach prevents getting lost in implementation details.

## 🏗️ Architecture Overview

The folder-mcp project follows a **layered architecture** pattern with strict module boundaries to ensure separation of concerns, testability, and maintainability.

> **Why layered architecture?** It prevents code from becoming a "big ball of mud" where everything depends on everything else. This makes the code easier to understand, test, and modify. Think of it like organizing a house - you don't put the kitchen in the bathroom!

### Layered Architecture

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

## 📁 Module Structure

### Directory Organization

```
src/
├── interfaces/                 # External interfaces (Entry points)
│   ├── cli/                   # Command-line interface
│   ├── mcp/                   # MCP protocol interface
│   └── api/                   # Future REST API
│
├── application/               # Use cases & business workflows
│   ├── indexing/             # Indexing orchestration
│   ├── serving/              # Content serving workflows
│   └── monitoring/           # Watch & monitoring workflows
│
├── domain/                   # Core business logic
│   ├── files/               # File system domain
│   ├── content/             # Content processing domain
│   ├── embeddings/          # AI/ML domain
│   └── search/              # Search domain
│
├── infrastructure/          # Technical infrastructure
│   ├── cache/              # Caching infrastructure
│   ├── config/             # Configuration infrastructure
│   ├── logging/            # Logging infrastructure
│   └── errors/             # Error handling infrastructure
│
└── shared/                 # Shared foundation
    ├── types/              # Shared type definitions
    ├── utils/              # Shared utilities
    └── di/                 # Dependency injection
```

### Layer Responsibilities

#### 🔌 **Interfaces Layer** (`src/interfaces/`)
- **Purpose**: External communication protocols and entry points
- **Responsibilities**:
  - Handle user input (CLI commands, MCP requests, API calls)
  - Transform external requests to internal use cases
  - Format responses for external consumption
  - Validate input parameters
- **Characteristics**: Thin layer that delegates to application services

#### 🎯 **Application Layer** (`src/application/`)
- **Purpose**: Use case orchestration and business workflows
- **Responsibilities**:
  - Coordinate multiple domain services
  - Implement business workflows
  - Handle cross-cutting concerns (transactions, logging)
  - Orchestrate complex operations
- **Characteristics**: Stateless coordinators

#### 🧠 **Domain Layer** (`src/domain/`)
- **Purpose**: Core business logic and rules
- **Responsibilities**:
  - Implement business rules and logic
  - Define domain entities and value objects
  - Contain domain-specific algorithms
  - Enforce business invariants
- **Characteristics**: Pure business logic, no external dependencies

#### 🔧 **Infrastructure Layer** (`src/infrastructure/`)
- **Purpose**: Technical implementation details
- **Responsibilities**:
  - Database access and caching
  - External service integration
  - File system operations
  - Logging and monitoring
- **Characteristics**: Technical services with external dependencies

#### 📚 **Shared Layer** (`src/shared/`)
- **Purpose**: Common utilities and foundational services
- **Responsibilities**:
  - Type definitions
  - Utility functions
  - Dependency injection setup
  - Constants and enums
- **Characteristics**: No business logic, used by all layers

## 🚧 Module Boundaries & Dependency Rules

### ✅ Allowed Dependencies

| Layer | Can Import From | Rationale |
|-------|----------------|-----------|
| `interfaces/` | `application/`, `shared/` | Entry points orchestrate use cases |
| `application/` | `domain/`, `shared/` | Use cases coordinate domain logic |
| `domain/` | `shared/` only | Business logic is pure, no external deps |
| `infrastructure/` | `shared/` only | Technical services use shared utilities |
| `shared/` | Internal only | Foundation layer has no external deps |

### ❌ Forbidden Dependencies

- **Domain Isolation**: `domain/` cannot import from `infrastructure/` or `application/`
- **Infrastructure Isolation**: `infrastructure/` cannot import from `domain/` or `application/`
- **Application Boundaries**: `application/` cannot import from `infrastructure/` (except via DI)
- **Shared Foundation**: `shared/` cannot import from any other layer
- **No Circular Dependencies**: No circular dependencies between any modules

> **Why these restrictions matter**: 
> - **Domain Isolation**: Keeps business logic pure and testable without external dependencies
> - **Infrastructure Isolation**: Prevents technical details from leaking into business logic
> - **Application Boundaries**: Ensures use cases remain focused on orchestration, not implementation
> - **Shared Foundation**: Prevents the foundation from becoming dependent on higher-level concerns
> - **No Circular Dependencies**: Prevents infinite loops during module loading and makes the code easier to understand

### 🔄 Communication Patterns

#### ✅ Correct Patterns

```typescript
// ✅ Interface → Application → Domain
// interfaces/cli/commands/serve.ts
import { ServingOrchestrator } from '../../../application/serving/index.js';

// ✅ Application → Domain
// application/serving/orchestrator.ts
import { FileParser } from '../../domain/files/index.js';
import { VectorSearch } from '../../domain/search/index.js';

// ✅ Domain ↔ Infrastructure via Dependency Injection
// domain/files/parser.ts
constructor(
  private readonly cacheService: ICacheService,  // Injected
  private readonly loggingService: ILoggingService  // Injected
) {}
```

#### ❌ Anti-Patterns

```typescript
// ❌ Wrong: Direct infrastructure import in domain
import { CacheService } from '../../infrastructure/cache/storage.js';

// ❌ Wrong: Domain importing from application
import { IndexingOrchestrator } from '../../application/indexing/orchestrator.js';

// ❌ Wrong: Multiple layer jumps
import { FileParser } from '../../../domain/files/parser.js';
```

## 📝 Coding Standards

### 1. Public API Design

Every module must expose a clean public API through its `index.ts` file:

```typescript
// src/domain/files/index.ts
export { FileParser } from './parser.js';
export { FileWatcher } from './watcher.js';
export { createFileFingerprint } from './fingerprint.js';
export type { 
  FileOperations, 
  ParsedFile, 
  FileMetadata 
} from './types.js';

// Internal implementation details are not exported
```

### 2. Interface Segregation

Define focused, specific interfaces rather than large monolithic ones:

```typescript
// ✅ Good: Focused interface
export interface FileOperations {
  scanFolder(path: string): Promise<string[]>;
  parseFile(path: string): Promise<ParsedContent>;
  watchFolder(path: string, callback: FileChangeCallback): Promise<void>;
}

// ❌ Bad: Monolithic interface
export interface FileSystemService {
  scanFolder(path: string): Promise<string[]>;
  parseFile(path: string): Promise<ParsedContent>;
  watchFolder(path: string, callback: FileChangeCallback): Promise<void>;
  cacheFile(path: string): Promise<void>;
  logActivity(message: string): void;
  sendNotification(event: FileEvent): Promise<void>;
}
```

### 3. Dependency Injection

Use constructor injection for all dependencies:

> **Why constructor injection?** It makes dependencies explicit and required, prevents hidden dependencies, makes testing easier (you can inject mocks), and follows the "fail fast" principle - if a dependency is missing, the object can't be created.

```typescript
// ✅ Good: Constructor injection
export class IndexingOrchestrator {
  constructor(
    private readonly fileParser: FileParser,
    private readonly contentChunker: ContentChunker,
    private readonly embeddingModel: EmbeddingModel,
    private readonly cache: ICacheService
  ) {}
  
  async indexFolder(folderPath: string): Promise<IndexingResult> {
    // Implementation uses injected dependencies
    // Easy to test because dependencies can be mocked
  }
}

// ❌ Bad: Direct instantiation
export class IndexingOrchestrator {
  async indexFolder(folderPath: string): Promise<IndexingResult> {
    const fileParser = new FileParser(); // Tight coupling - hard to change
    const cache = new CacheService(); // Hard to test - always uses real cache
    // What if FileParser needs dependencies? This approach doesn't scale.
  }
}
```

### 4. Error Handling

Implement consistent error handling patterns:

> **Why consistent error handling matters**: It makes debugging easier, provides better user experience, prevents crashes, and helps maintain system stability. Different layers should handle errors differently based on their responsibilities.

```typescript
// Domain layer: Throw domain-specific errors
// Why: Domain errors represent business rule violations
export class ContentChunker {
  chunkText(text: string): TextChunk[] {
    if (!text.trim()) {
      throw new EmptyContentError('Cannot chunk empty content');
    }
    // Implementation
  }
}

// Application layer: Handle and transform errors
// Why: Application layer knows how to recover from different error types
export class IndexingOrchestrator {
  async indexFolder(folderPath: string): Promise<IndexingResult> {
    try {
      // Implementation
    } catch (error) {
      if (error instanceof EmptyContentError) {
        // Graceful handling: log warning but continue processing
        this.logger.warn(`Skipping empty file: ${error.message}`);
        return { success: true, warnings: [error.message] };
      }
      // Unknown errors are wrapped and re-thrown
      throw new IndexingError(`Failed to index folder: ${error.message}`, error);
    }
  }
}

// Interface layer: Convert errors to user-friendly messages
// Why: Users shouldn't see technical error details
export class CLICommand {
  async execute(): Promise<void> {
    try {
      await this.orchestrator.indexFolder(path);
      console.log('✅ Indexing completed successfully');
    } catch (error) {
      if (error instanceof IndexingError) {
        console.error(`❌ Failed to index folder: ${error.userMessage}`);
        process.exit(1);
      }
      throw error; // Re-throw unexpected errors
    }
  }
}
```

### 5. Type Safety

Use TypeScript effectively for type safety:

> **Why strong typing matters**: TypeScript catches errors at compile time instead of runtime, makes code self-documenting, improves IDE support with autocomplete and refactoring, and makes large codebases maintainable. Weak typing leads to runtime errors and confusion about what data structures contain.

```typescript
// ✅ Good: Strong typing
export interface IndexingOptions {
  readonly chunkSize: number;        // Clear: this is a number
  readonly overlapSize: number;      // Clear: this is a number  
  readonly fileTypes: readonly string[];     // Clear: array of strings, immutable
  readonly excludePatterns: readonly string[]; // Clear: array of strings, immutable
}

export interface IndexingResult {
  readonly success: boolean;         // Clear: boolean result
  readonly filesProcessed: number;   // Clear: count of files
  readonly warnings: readonly string[];     // Clear: array of warning messages
  readonly errors: readonly Error[]; // Clear: array of error objects
}

// ❌ Bad: Weak typing
export interface IndexingOptions {
  [key: string]: any; // Could be anything! No IDE help, no compile-time checks
}

// ❌ Also bad: Mutable types
export interface IndexingResult {
  success: boolean;
  warnings: string[]; // Can be modified after creation, leading to bugs
}
```

**Additional Type Safety Best Practices**:

```typescript
// ✅ Use union types for constrained values
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
// Prevents typos: logLevel = 'information' would be a compile error

// ✅ Use branded types for IDs
type UserId = string & { readonly brand: unique symbol };
type PostId = string & { readonly brand: unique symbol };
// Prevents mixing up different ID types

// ✅ Use optional vs required properties intentionally
interface CreateUserRequest {
  name: string;           // Required
  email: string;         // Required
  avatar?: string;       // Optional
}
```

## 🔄 Git Workflow & Collaboration

### Branch Strategy

> **Why we use feature branches**: They allow multiple developers to work on different features simultaneously without conflicts, enable code review before merging, and provide a clear history of what changes were made for each feature.

```bash
# Create a new feature branch
git checkout main
git pull origin main
git checkout -b feature/add-search-ranking

# Work on your feature with meaningful commits
git add .
git commit -m "Add vector similarity scoring algorithm"
git commit -m "Implement search result ranking logic"
git commit -m "Add tests for ranking functionality"

# Push and create pull request
git push origin feature/add-search-ranking
```

### Commit Message Guidelines

> **Why good commit messages matter**: They help other developers (and future you) understand why changes were made, make debugging easier when using `git blame`, and create a clear history of the project's evolution.

**Format**: `<type>(<scope>): <description>`

```bash
# ✅ Good commit messages
feat(search): add semantic similarity ranking
fix(cli): handle empty input files gracefully  
refactor(domain): extract chunking strategy interface
test(search): add integration tests for vector search
docs(api): update MCP protocol documentation

# ❌ Bad commit messages
fix stuff
update code
working version
asdf
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring without changing behavior
- `test`: Adding or updating tests
- `docs`: Documentation changes
- `chore`: Build process or auxiliary tool changes

### Code Review Guidelines

> **Why code reviews are essential**: They catch bugs early, share knowledge across the team, ensure code follows our standards, and improve overall code quality. Even senior developers benefit from fresh eyes on their code.

**As a Reviewer**:
- Focus on logic, architecture, and maintainability
- Be constructive: suggest solutions, not just problems
- Ask questions if something is unclear
- Approve when the code meets our standards

**As an Author**:
- Keep PRs small and focused (< 400 lines when possible)
- Write clear PR descriptions explaining what and why
- Respond to feedback promptly and professionally
- Don't take feedback personally - it's about the code, not you

```markdown
# Good PR Description Template
## What
Brief description of the changes

## Why  
Explanation of the problem this solves

## Testing
How you tested the changes

## Notes
Any special considerations for reviewers
```

## 🧪 Testing Guidelines

> **Why testing is crucial**: Tests catch bugs before users do, enable safe refactoring, document how code should behave, and give confidence when making changes. Without tests, every change is scary because you don't know what might break.

### Testing Pyramid

```
        /\
       /  \
      / E2E \ <- Few, slow, expensive but realistic
     /______\
    /        \
   /Integration\ <- Some, medium speed, test component interaction  
  /__________\
 /            \
/     Unit      \ <- Many, fast, cheap, test individual functions
/______________\
```

**Why this distribution?**
- **Unit tests**: Fast feedback, pinpoint failures, easy to write
- **Integration tests**: Catch interface problems, test real interactions
- **E2E tests**: Ensure the whole system works, catch UI/UX issues

### 1. Test Structure

Organize tests to mirror the module structure:

```
tests/
├── unit/
│   ├── domain/
│   │   ├── files/
│   │   ├── content/
│   │   └── search/
│   ├── application/
│   └── infrastructure/
├── integration/
├── architectural/
└── e2e/
```

### 2. Domain Testing

Domain logic should be easily testable in isolation:

> **Why domain tests are important**: Domain logic contains your business rules - the core value of your application. These tests should be fast, reliable, and test pure logic without external dependencies.

```typescript
// ✅ Good: Pure domain logic test
describe('ContentChunker', () => {
  it('should chunk text into specified sizes', () => {
    // Arrange: Set up test data
    const chunker = new ContentChunker({ chunkSize: 100, overlapSize: 20 });
    const longText = 'A'.repeat(250); // 250 characters
    
    // Act: Execute the functionality
    const result = chunker.chunkText(longText);
    
    // Assert: Verify the results
    expect(result).toHaveLength(3); // Should create 3 chunks
    expect(result[0].text).toHaveLength(100);
    expect(result[1].text).toHaveLength(100);
    expect(result[2].text).toHaveLength(70); // Remaining text
    
    // Verify overlap
    const overlap1to2 = result[0].text.slice(-20);
    const start2 = result[1].text.slice(0, 20);
    expect(overlap1to2).toBe(start2);
  });
  
  it('should handle edge cases gracefully', () => {
    const chunker = new ContentChunker({ chunkSize: 100, overlapSize: 20 });
    
    // Test empty input
    expect(() => chunker.chunkText('')).toThrow(EmptyContentError);
    
    // Test text shorter than chunk size
    const shortText = 'Short text';
    const result = chunker.chunkText(shortText);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe(shortText);
  });
});
```

### 3. Application Testing

Application layer tests should use mocks for dependencies:

```typescript
// ✅ Good: Application test with mocks
describe('IndexingOrchestrator', () => {
  it('should orchestrate complete indexing workflow', async () => {
    const mockFileParser = createMockFileParser();
    const mockContentChunker = createMockContentChunker();
    const mockEmbeddingModel = createMockEmbeddingModel();
    const mockCache = createMockCache();
    
    const orchestrator = new IndexingOrchestrator(
      mockFileParser,
      mockContentChunker,
      mockEmbeddingModel,
      mockCache
    );
    
    const result = await orchestrator.indexFolder('/test/path');
    
    expect(result.success).toBe(true);
    expect(mockFileParser.scanFolder).toHaveBeenCalledWith('/test/path');
    expect(mockCache.storeEmbeddings).toHaveBeenCalled();
  });
});
```

### 4. Architectural Tests

Enforce architectural boundaries with automated tests:

```typescript
// tests/architectural/boundaries.test.ts
describe('Module Boundaries', () => {
  it('should not allow domain to import from infrastructure', () => {
    const domainFiles = glob.sync('src/domain/**/*.ts');
    domainFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      expect(content).not.toMatch(/from ['"]\.\.\/.+\/infrastructure/);
      expect(content).not.toMatch(/import.*infrastructure/);
    });
  });
  
  it('should not allow circular dependencies', () => {
    const dependencyGraph = buildDependencyGraph('src/');
    const cycles = findCycles(dependencyGraph);
    expect(cycles).toHaveLength(0);
  });
});
```

## 🚀 Development Workflow

### 1. Adding New Features

When adding new functionality, follow this approach:

1. **Identify the Domain**: Which domain does this feature belong to?
2. **Design Domain Logic**: Implement pure business logic in the domain layer
3. **Create Application Workflow**: Orchestrate domain services in application layer
4. **Add Interface**: Expose functionality through appropriate interface
5. **Update DI Configuration**: Register new services in dependency injection container
6. **Write Tests**: Add tests at each layer
7. **Update Documentation**: Update relevant documentation

### 2. File Organization

#### Module Index Files

Each module should have a well-defined public API:

```typescript
// src/domain/content/index.ts
// Public API - what other modules can use
export { ContentProcessor } from './processing.js';
export { ContentChunker } from './chunking.js';
export { extractMetadata } from './metadata.js';

// Type exports
export type { 
  ContentOperations,
  TextChunk,
  ProcessedContent,
  ChunkingOptions,
  ContentMetadata 
} from './types.js';

// Internal implementation details are NOT exported
// - helpers.ts
// - validators.ts
// - constants.ts
```

#### Internal Organization

Within each module, organize files by responsibility:

```
src/domain/content/
├── index.ts           # Public API
├── types.ts           # Type definitions
├── processing.ts      # Main business logic
├── chunking.ts        # Chunking algorithms
├── metadata.ts        # Metadata extraction
├── helpers.ts         # Internal utilities (not exported)
├── validators.ts      # Internal validation (not exported)
└── constants.ts       # Internal constants (not exported)
```

### 3. Import Guidelines

#### Use Absolute Imports from Module Root

```typescript
// ✅ Good: Import from module public API
import { ContentProcessor } from '../../domain/content/index.js';
import { IndexingOrchestrator } from '../../application/indexing/index.js';

// ❌ Bad: Direct imports from internal files
import { ContentProcessor } from '../../domain/content/processing.js';
import { chunkText } from '../../domain/content/chunking.js';
```

#### Organize Imports

```typescript
// 1. Node.js built-in modules
import { promises as fs } from 'fs';
import path from 'path';

// 2. External packages
import { EventEmitter } from 'events';
import chokidar from 'chokidar';

// 3. Internal modules (same layer)
import { FileOperations } from './interfaces.js';
import { createFileFingerprint } from './fingerprint.js';

// 4. Shared modules
import { ILoggingService } from '../../shared/di/interfaces.js';
import { validatePath } from '../../shared/utils/index.js';

// 5. Types (separate section)
import type { 
  ParsedContent, 
  FileMetadata, 
  FileChangeCallback 
} from './types.js';
```

## 🔍 Code Quality Standards

### 1. Naming Conventions

- **Classes**: PascalCase (`FileParser`, `IndexingOrchestrator`)
- **Interfaces**: PascalCase with 'I' prefix for service interfaces (`ILoggingService`)
- **Methods**: camelCase (`parseFile`, `generateEmbeddings`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_CHUNK_SIZE`, `DEFAULT_TIMEOUT`)
- **Files**: kebab-case (`content-processor.ts`, `file-operations.ts`)

### 2. Documentation

#### Class Documentation

```typescript
/**
 * Processes file content into structured, searchable chunks.
 * 
 * This class implements various chunking strategies to break down
 * large documents into smaller, semantically meaningful pieces
 * that can be efficiently processed by embedding models.
 * 
 * @example
 * ```typescript
 * const chunker = new ContentChunker({ 
 *   chunkSize: 1000, 
 *   overlapSize: 200 
 * });
 * const chunks = chunker.chunkText(documentText);
 * ```
 */
export class ContentChunker {
  /**
   * Creates a new ContentChunker with the specified options.
   * 
   * @param options - Configuration for chunking behavior
   * @param logger - Optional logging service for debugging
   */
  constructor(
    private readonly options: ChunkingOptions,
    private readonly logger?: ILoggingService
  ) {}
}
```

#### Method Documentation

```typescript
/**
 * Chunks text content into overlapping segments.
 * 
 * @param text - The input text to be chunked
 * @param options - Optional chunking options to override defaults
 * @returns Array of text chunks with metadata
 * @throws {EmptyContentError} When input text is empty or whitespace only
 * @throws {InvalidChunkSizeError} When chunk size is invalid
 */
chunkText(text: string, options?: Partial<ChunkingOptions>): TextChunk[] {
  // Implementation
}
```

### 3. Performance Considerations

#### Async/Await Best Practices

```typescript
// ✅ Good: Parallel operations where possible
export class IndexingOrchestrator {
  async indexFiles(filePaths: string[]): Promise<IndexingResult> {
    // Parse files in parallel
    const parsePromises = filePaths.map(path => this.fileParser.parseFile(path));
    const parsedFiles = await Promise.all(parsePromises);
    
    // Process chunks sequentially to control memory usage
    const allChunks: TextChunk[] = [];
    for (const file of parsedFiles) {
      const chunks = await this.contentChunker.chunkContent(file.content);
      allChunks.push(...chunks);
    }
    
    return { success: true, filesProcessed: filePaths.length };
  }
}

// ❌ Bad: Sequential operations when parallel is possible
export class IndexingOrchestrator {
  async indexFiles(filePaths: string[]): Promise<IndexingResult> {
    const allChunks: TextChunk[] = [];
    
    // Unnecessarily sequential
    for (const path of filePaths) {
      const file = await this.fileParser.parseFile(path);
      const chunks = await this.contentChunker.chunkContent(file.content);
      allChunks.push(...chunks);
    }
    
    return { success: true, filesProcessed: filePaths.length };
  }
}
```

#### Memory Management

```typescript
// ✅ Good: Process large datasets in batches
export class EmbeddingGenerator {
  async generateEmbeddings(chunks: TextChunk[]): Promise<EmbeddingVector[]> {
    const batchSize = this.options.batchSize;
    const results: EmbeddingVector[] = [];
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const batchResults = await this.processEmbeddingBatch(batch);
      results.push(...batchResults);
      
      // Allow garbage collection between batches
      if (i % (batchSize * 10) === 0) {
        await this.yield();
      }
    }
    
    return results;
  }
  
  private async yield(): Promise<void> {
    return new Promise(resolve => setImmediate(resolve));
  }
}
```

## 🚨 Common Anti-Patterns to Avoid

### 1. Layer Violations

```typescript
// ❌ Bad: Domain layer directly using infrastructure
export class FileParser {
  async parseFile(path: string): Promise<ParsedContent> {
    // Wrong: Direct infrastructure dependency
    const cache = new CacheService();
    const cached = await cache.get(path);
    if (cached) return cached;
    
    // Parse file...
  }
}

// ✅ Good: Domain layer using injected abstraction
export class FileParser {
  constructor(
    private readonly cache: ICacheService
  ) {}
  
  async parseFile(path: string): Promise<ParsedContent> {
    const cached = await this.cache.get(path);
    if (cached) return cached;
    
    // Parse file...
  }
}
```

### 2. God Objects

```typescript
// ❌ Bad: Single class doing too much
export class FileSystemManager {
  parseFile(path: string): ParsedContent { /* */ }
  chunkContent(content: string): TextChunk[] { /* */ }
  generateEmbeddings(chunks: TextChunk[]): EmbeddingVector[] { /* */ }
  searchSimilar(query: string): SearchResult[] { /* */ }
  cacheResults(results: any): void { /* */ }
  logActivity(message: string): void { /* */ }
}

// ✅ Good: Single responsibility principle
export class FileParser {
  parseFile(path: string): ParsedContent { /* */ }
}

export class ContentChunker {
  chunkContent(content: string): TextChunk[] { /* */ }
}

export class EmbeddingGenerator {
  generateEmbeddings(chunks: TextChunk[]): EmbeddingVector[] { /* */ }
}
```

### 3. Leaky Abstractions

```typescript
// ❌ Bad: Exposing implementation details
export interface FileOperations {
  parseFile(path: string): Promise<ParsedContent>;
  getCache(): CacheService; // Leaky abstraction
  getLogger(): Logger; // Leaky abstraction
}

// ✅ Good: Clean abstraction
export interface FileOperations {
  parseFile(path: string): Promise<ParsedContent>;
  clearCache(): Promise<void>; // Behavior, not implementation
}
```

## 📚 Resources

### Learning Materials

- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [Dependency Injection Patterns](https://martinfowler.com/articles/injection.html)

### Tools

- **ESLint**: For code quality and style enforcement
- **Prettier**: For consistent code formatting
- **TypeScript**: For type safety and better developer experience
- **Vitest**: For fast, reliable testing
- **madge**: For dependency analysis and circular dependency detection

### IDE Configuration

#### VS Code Settings

```json
{
  "typescript.preferences.includePackageJsonAutoImports": "off",
  "typescript.suggest.autoImports": true,
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  }
}
```

## 🚨 Debugging & Troubleshooting

### Common Issues for New Developers

> **Why debugging skills matter**: You'll spend more time debugging than writing new code. Learning systematic debugging approaches saves hours of frustration and makes you more effective.

#### Issue 1: Import/Module Not Found Errors

```typescript
// ❌ Error: Cannot find module '../../../domain/files'
import { FileParser } from '../../../domain/files';

// ✅ Fix: Use proper file extensions in Node.js
import { FileParser } from '../../../domain/files/index.js';

// ✅ Better: Import from module public API
import { FileParser } from '../../../domain/files/index.js';
```

**Debugging steps**:
1. Check if the file exists at the path you're importing
2. Verify the file has the correct export
3. Ensure you're using `.js` extensions for local imports
4. Check if there's a public API (index.ts) you should import from instead

#### Issue 2: Circular Dependency Errors

```bash
# Error message you might see:
ReferenceError: Cannot access 'FileParser' before initialization
```

**How to fix**:
1. Use the architectural tests to detect cycles: `npm run test:arch`
2. Identify the cycle using dependency analysis
3. Break the cycle by:
   - Moving shared code to a lower layer
   - Using dependency injection instead of direct imports
   - Creating an interface in the shared layer

#### Issue 3: Type Errors After Refactoring

```typescript
// Error: Property 'chunkText' does not exist on type 'ContentProcessor'
const chunks = processor.chunkText(content);
```

**Debugging approach**:
1. Check what type `processor` actually is (hover in VS Code)
2. Look at the interface/class definition
3. Check if the method was renamed or moved
4. Update the import if the API changed

### Debugging Strategies

#### 1. Console Debugging (Quick & Simple)

```typescript
export class IndexingOrchestrator {
  async indexFolder(folderPath: string): Promise<IndexingResult> {
    console.log('🔍 Starting indexing for:', folderPath);
    
    const files = await this.fileParser.scanFolder(folderPath);
    console.log('📁 Found files:', files.length);
    
    for (const file of files) {
      console.log('📄 Processing:', file);
      const content = await this.fileParser.parseFile(file);
      console.log('📝 Content length:', content.text.length);
      // ... more processing
    }
  }
}
```

#### 2. Using the Debugger (VS Code)

1. Set breakpoints by clicking the left margin in VS Code
2. Run with debugger: `F5` or `Debug > Start Debugging`
3. Step through code: `F10` (step over), `F11` (step into)
4. Inspect variables in the Debug panel

#### 3. Logging for Production

```typescript
export class IndexingOrchestrator {
  constructor(
    private readonly logger: ILoggingService
  ) {}
  
  async indexFolder(folderPath: string): Promise<IndexingResult> {
    this.logger.info('Starting indexing', { folderPath });
    
    try {
      const result = await this.processFolder(folderPath);
      this.logger.info('Indexing completed', { 
        folderPath, 
        filesProcessed: result.filesProcessed 
      });
      return result;
    } catch (error) {
      this.logger.error('Indexing failed', { folderPath, error });
      throw error;
    }
  }
}
```

## 🔒 Security Guidelines

> **Why security matters**: Even internal tools can be attacked or misused. Security vulnerabilities can lead to data breaches, system compromise, or service disruption. Better to build security in from the start than add it later.

### Input Validation

```typescript
// ✅ Good: Validate all inputs
export class FileParser {
  async parseFile(filePath: string): Promise<ParsedContent> {
    // Validate input
    if (!filePath || typeof filePath !== 'string') {
      throw new ValidationError('File path must be a non-empty string');
    }
    
    // Prevent path traversal attacks
    const normalizedPath = path.normalize(filePath);
    if (normalizedPath.includes('..')) {
      throw new SecurityError('Path traversal not allowed');
    }
    
    // Check file exists and is readable
    await fs.access(normalizedPath, fs.constants.R_OK);
    
    // Proceed with parsing...
  }
}

// ❌ Bad: No validation
export class FileParser {
  async parseFile(filePath: string): Promise<ParsedContent> {
    // Directly using user input - dangerous!
    const content = await fs.readFile(filePath, 'utf8');
    return { text: content };
  }
}
```

### Error Information Disclosure

```typescript
// ✅ Good: Generic error messages for users
export class CLICommand {
  async execute(filePath: string): Promise<void> {
    try {
      await this.processor.processFile(filePath);
    } catch (error) {
      // Log full error details for developers
      this.logger.error('File processing failed', { filePath, error });
      
      // Show generic message to users
      console.error('Failed to process file. Please check the file path and permissions.');
      process.exit(1);
    }
  }
}

// ❌ Bad: Exposing internal details
export class CLICommand {
  async execute(filePath: string): Promise<void> {
    try {
      await this.processor.processFile(filePath);
    } catch (error) {
      // This might expose file system structure, database details, etc.
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
    }
  }
}
```

## ⚡ Performance Guidelines

> **Why performance matters**: Users expect responsive applications. Poor performance leads to bad user experience, wasted resources, and can make the application unusable with large datasets.

### Async Best Practices

```typescript
// ✅ Good: Parallel processing when possible
export class EmbeddingGenerator {
  async processFiles(files: string[]): Promise<EmbeddingVector[]> {
    // Process files in parallel, but limit concurrency to avoid overwhelming the system
    const results: EmbeddingVector[] = [];
    const batchSize = 5; // Process 5 files at a time
    
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchPromises = batch.map(file => this.processFile(file));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Give other operations a chance to run
      await this.yield();
    }
    
    return results;
  }
  
  private async yield(): Promise<void> {
    return new Promise(resolve => setImmediate(resolve));
  }
}

// ❌ Bad: Everything in sequence (slow)
export class EmbeddingGenerator {
  async processFiles(files: string[]): Promise<EmbeddingVector[]> {
    const results: EmbeddingVector[] = [];
    
    for (const file of files) {
      const result = await this.processFile(file); // Processes one at a time
      results.push(result);
    }
    
    return results;
  }
}
```

### Memory Management

```typescript
// ✅ Good: Stream processing for large files
export class LargeFileProcessor {
  async processLargeFile(filePath: string): Promise<void> {
    const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
    let buffer = '';
    
    for await (const chunk of stream) {
      buffer += chunk;
      
      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        await this.processLine(line);
      }
    }
    
    // Process remaining buffer
    if (buffer) {
      await this.processLine(buffer);
    }
  }
}

// ❌ Bad: Loading entire file into memory
export class LargeFileProcessor {
  async processLargeFile(filePath: string): Promise<void> {
    const content = await fs.readFile(filePath, 'utf8'); // Could be gigabytes!
    const lines = content.split('\n');
    
    for (const line of lines) {
      await this.processLine(line);
    }
  }
}
```

## 🎯 Common Mistakes & How to Avoid Them

### 1. Layer Violations

**Mistake**: Importing infrastructure directly in domain layer

```typescript
// ❌ Wrong
import { CacheService } from '../../infrastructure/cache/storage.js';

export class FileParser {
  async parseFile(path: string): Promise<ParsedContent> {
    const cache = new CacheService(); // Direct dependency!
    // ...
  }
}
```

**Fix**: Use dependency injection

```typescript
// ✅ Correct
export class FileParser {
  constructor(
    private readonly cache: ICacheService // Injected interface
  ) {}
  
  async parseFile(path: string): Promise<ParsedContent> {
    // Use injected cache
  }
}
```

**Why this matters**: Direct dependencies make code hard to test and tightly coupled to specific implementations.

### 2. God Objects

**Mistake**: Creating classes that do too many things

```typescript
// ❌ Wrong: This class has too many responsibilities
export class FileManager {
  parseFile(path: string): ParsedContent { /* */ }
  chunkContent(content: string): TextChunk[] { /* */ }
  generateEmbeddings(chunks: TextChunk[]): EmbeddingVector[] { /* */ }
  searchSimilar(query: string): SearchResult[] { /* */ }
  cacheResults(results: any): void { /* */ }
  logActivity(message: string): void { /* */ }
  sendNotifications(event: FileEvent): void { /* */ }
}
```

**Fix**: Single Responsibility Principle

```typescript
// ✅ Correct: Each class has one clear responsibility
export class FileParser {
  parseFile(path: string): ParsedContent { /* */ }
}

export class ContentChunker {
  chunkContent(content: string): TextChunk[] { /* */ }
}

export class EmbeddingGenerator {
  generateEmbeddings(chunks: TextChunk[]): EmbeddingVector[] { /* */ }
}
```

**Why this matters**: Smaller, focused classes are easier to understand, test, and modify.

### 3. Poor Error Handling

**Mistake**: Swallowing errors or not handling them appropriately

```typescript
// ❌ Wrong: Silent failures
export class FileProcessor {
  async processFile(path: string): Promise<void> {
    try {
      const content = await this.parseFile(path);
      await this.processContent(content);
    } catch (error) {
      // Silent failure - error is lost!
      console.log('Something went wrong');
    }
  }
}
```

**Fix**: Proper error handling and logging

```typescript
// ✅ Correct: Proper error handling
export class FileProcessor {
  async processFile(path: string): Promise<ProcessResult> {
    try {
      const content = await this.parseFile(path);
      await this.processContent(content);
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to process file', { path, error });
      return { 
        success: false, 
        error: `Failed to process ${path}: ${error.message}` 
      };
    }
  }
}
```

### 4. Weak Type Usage

**Mistake**: Using `any` or weak types

```typescript
// ❌ Wrong: Loses all type safety
function processData(data: any): any {
  return data.someProperty.map((item: any) => item.value);
}
```

**Fix**: Use proper types

```typescript
// ✅ Correct: Strong typing
interface DataItem {
  readonly value: string;
  readonly id: number;
}

interface InputData {
  readonly someProperty: readonly DataItem[];
}

function processData(data: InputData): string[] {
  return data.someProperty.map(item => item.value);
}
```

## 🛠️ Environment Setup for New Developers

### Required VS Code Extensions

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.test-adapter-converter",
    "hbenl.vscode-test-explorer"
  ]
}
```

### Package Scripts Explained

```bash
# Development
npm run dev          # Start development server with hot reload
npm run build        # Compile TypeScript to JavaScript
npm run type-check   # Check types without compiling

# Testing
npm test            # Run all tests
npm run test:unit   # Run only unit tests
npm run test:integration # Run integration tests
npm run test:arch   # Run architectural boundary tests
npm run test:watch  # Run tests in watch mode

# Code Quality
npm run lint        # Check code style and quality
npm run lint:fix    # Fix auto-fixable linting issues
npm run format      # Format code with Prettier

# Utilities
npm run clean       # Clean build artifacts
npm run deps        # Analyze dependencies for cycles
```

---

**Maintainer**: Development Team  
**Review Schedule**: Monthly  
**Next Review**: July 12, 2025
