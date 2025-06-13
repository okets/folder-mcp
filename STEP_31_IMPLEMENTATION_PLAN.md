# Step 31 Implementation Plan: Local gRPC Transport Implementation

**Date Created**: June 13, 2025  
**Status**: 🏗️ IN PROGRESS - Core infrastructure completed, endpoint implementation ongoing  
**Priority**: 🔥 CRITICAL - Local Transport Foundation  
**Dependencies**: ✅ Step 30 Protocol Buffer Schema Design (COMPLETED)

**Implementation Started**: June 13, 2025  
**Current Phase**: Phase B - Service Endpoint Implementation  
**Progress**: 
- ✅ Phase A1 - gRPC Server Foundation (COMPLETED)
- ✅ Phase A2 - Basic Service Endpoint Structure (COMPLETED)  
- ✅ Phase A3 - DI Container Integration (COMPLETED)
- ✅ Phase B1 - Unix Domain Socket Transport (COMPLETED)
- ✅ Phase B2 - API Key System Foundation (COMPLETED - for future remote access)
- ✅ Phase B3 - Authentication Middleware (COMPLETED - inactive for local transport)
- ✅ Phase B4 - MCP Protocol Maintenance (COMPLETED - Claude Desktop working)
- 🏗️ Phase C1 - Complete Service Endpoint Implementation (IN PROGRESS)
- ⏸️ Phase C2 - MCP Protocol Enhancement (PENDING)
- ⏸️ Phase C3 - Local Transport Health Monitoring (PENDING)
- ⏸️ Phase C4 - CLI Integration Enhancement (PENDING)

**Latest Achievement**: ✅ **Dual-Protocol Local Transport Foundation Completed**
- ✅ MCP protocol working perfectly with Claude Desktop (stdio transport)
- ✅ Unix Domain Socket transport (Windows named pipe) working for gRPC
- ✅ Basic SearchDocs and SearchChunks endpoints implemented with validation
- ✅ Complete error mapping and gRPC status code handling
- ✅ Transport manager with graceful shutdown capabilities
- ✅ API key system implemented (foundation for future Step 35 remote access)
- ✅ Authentication middleware ready (inactive for local transport, filesystem permissions provide security)
- ✅ Shared domain services accessible by both MCP and gRPC protocols

**Updated Focus**: **Dual-Protocol Local Transport**
This implementation plan focuses on supporting BOTH MCP (RPC) and gRPC protocols for local access, providing comprehensive compatibility. MCP protocol ensures Claude Desktop integration continues working perfectly, while gRPC protocol enables high-performance local applications. All remote access features (TCP transport, TLS, Cloudflare Tunnel integration) have been moved to **Step 35: Remote Access & Cloud LLM Integration** for cleaner separation of concerns.

**Files Created in This Session**:
```
src/grpc/
├── auth/
│   ├── index.ts                 # ✅ Authentication module exports
│   ├── api-key-manager.ts       # ✅ API key system (for future Step 35)
│   └── auth-interceptor.ts      # ✅ gRPC auth middleware (inactive for local)
├── server.ts                     # ✅ Main gRPC server implementation
├── transport-manager.ts          # ✅ Local transport coordination
├── services/
│   ├── index.ts                 # ✅ Service implementations index
│   └── search-service.ts        # ✅ SearchDocs/SearchChunks implementations
├── interceptors/
│   └── index.ts                 # ✅ Interceptors index (placeholder)
└── utils/
    ├── proto-loader.ts          # ✅ Protocol buffer loading utilities
    └── error-mapper.ts          # ✅ Domain error to gRPC status mapping

src/config/
└── grpc-config.ts               # ✅ gRPC transport configuration

src/grpc-demo.ts                 # ✅ Working gRPC server demo
src/grpc-auth-test.ts            # ✅ Authentication system test (for future Step 35)
```

**Next Priority**: Complete all 13 service endpoints for local access and integrate with existing domain services

## 📋 Overview

**Goal**: Implement comprehensive dual-protocol local transport layer supporting both MCP (RPC) and gRPC protocols for maximum compatibility and performance. MCP protocol provides Claude Desktop integration while gRPC protocol enables high-performance local applications with complete service endpoint coverage.

**Success Criteria from Roadmap**:
- ✅ MCP transport: JSON-RPC over stdio for Claude Desktop integration (WORKING)
- Local gRPC transport: Unix Domain Socket (Windows named pipe) with filesystem permissions only
- Complete implementation of all 13 gRPC service endpoints
- Maintain MCP protocol compatibility with corresponding tools/capabilities
- gRPC service implementation using generated proto types with full type safety
- Integration with existing DI container and configuration system
- Local transport health monitoring and graceful shutdown for both protocols
- All tests pass with dual transport implementation
- TypeScript compiles without ANY errors
- Claude Desktop integration maintains compatibility (MCP protocol)
- Enhanced CLI commands for dual transport management

**Key Architecture Decisions**:
- **Dual Protocol Support**: Both MCP (RPC) and gRPC protocols running simultaneously
- **Protocol-Specific Optimization**: MCP for interactive chat, gRPC for high-performance operations
- **Shared Domain Services**: Both protocols use the same underlying document intelligence services
- **No Authentication**: Filesystem permissions provide security (API key system exists for future remote access)
- **Type Safety**: Leverage generated TypeScript types throughout the gRPC implementation
- **DI Integration**: Full integration with existing dependency injection container
- **Performance First**: Optimize gRPC for local high-throughput document processing scenarios

## 🏗️ Implementation Phases

### Phase A: Core gRPC Service Implementation ✅ COMPLETED
**Priority**: First - Foundation Service Layer

#### A1. gRPC Server Foundation ✅ COMPLETED
- **Status**: Complete gRPC server using @grpc/grpc-js with typed proto definitions
- **Completed Components**:
  - [x] **gRPC Server Setup**: Server initialization, proto loading, service registration
  - [x] **Service Implementation**: Basic service structure with error handling
  - [x] **Type Integration**: Use generated TypeScript types for type safety
  - [x] **Error Handling**: Standardized gRPC error codes and messages
  - [x] **Logging Integration**: Structured logging for all service calls
  - [ ] **Health Checks**: gRPC health checking protocol implementation (Phase C)

#### A2. Service Endpoint Implementation ✅ COMPLETED (Basic Structure)
- [x] **Basic service method structure** with proper type safety and error handling
- **Service Methods Status**:
  - [x] **SearchDocs**: Complete implementation with validation and error handling
  - [x] **SearchChunks**: Complete implementation with validation and error handling
  - [ ] **Remaining 11 endpoints**: Implementation pending (Phase C)

#### A3. Business Logic Integration ✅ COMPLETED (Foundation)
- [x] **Connect service layer to existing domain services** via DI container
- **Domain Service Integration**:
  - [x] DI container setup with proper service tokens
  - [x] Logging service integration
  - [x] Error translation from domain to gRPC status codes
  - [ ] Full domain service integration (Phase C)

---

### Phase B: Local Transport Implementation ✅ COMPLETED
**Priority**: Second - Local Transport Foundation

#### B1. Unix Domain Socket Transport ✅ COMPLETED
- [x] **Local Transport Implementation**: High-performance Unix socket for local communication
- [x] **Security Model**: Filesystem permissions only (no API key required)
- **Socket Configuration**: ✅ ALL COMPLETED
  - [x] Default path: Windows named pipe `\\.\pipe\folder-mcp` (configurable)
  - [x] Automatic cleanup on shutdown
  - [x] Socket availability detection
- **Connection Management**: ✅ ALL COMPLETED
  - [x] Connection handling for local clients
  - [x] Graceful shutdown with active connection drainage
  - [x] Basic health monitoring and diagnostics

#### B2. API Key System Foundation ✅ COMPLETED
**Note**: This system was implemented as foundation for future Step 35 (Remote Access). For local transport, it remains inactive.
- [x] **API Key Generation**: Cryptographically secure 32-byte Base64 encoded keys
- [x] **Key Storage**: Secure storage in `~/.folder-mcp/api-keys.json`
- [x] **Authentication Middleware**: gRPC interceptor (inactive for local transport)

---

### Phase C: Complete Dual-Protocol Implementation 🏗️ IN PROGRESS
**Priority**: Third - Complete Local Service Coverage for Both Protocols

#### C1. All gRPC Service Endpoints Implementation 🏗️ IN PROGRESS
- **Status**: 2 of 13 endpoints completed, 11 remaining
- **Completed Endpoints**:
  - [x] **SearchDocs**: Semantic document discovery with metadata filters
  - [x] **SearchChunks**: Chunk-level search with text previews
- **Remaining gRPC Endpoints**:
  - [ ] **ListFolders**: Top-level folder tree structure
  - [ ] **ListDocumentsInFolder**: Paginated document listing
  - [ ] **GetDocMetadata**: Document metadata with structural information  
  - [ ] **DownloadDoc**: Binary document streaming with content-type detection
  - [ ] **GetChunks**: Chunk text retrieval with token limiting
  - [ ] **GetDocSummary**: Single document summarization
  - [ ] **BatchDocSummary**: Multi-document batch processing
  - [ ] **TableQuery**: Spreadsheet semantic queries
  - [ ] **IngestStatus**: Document processing status monitoring
  - [ ] **RefreshDoc**: Document re-processing trigger
  - [ ] **GetEmbedding**: Raw vector access for debugging

#### C2. MCP Protocol Enhancement 📋 PENDING
**Purpose**: Ensure MCP protocol provides equivalent capabilities to gRPC for Claude Desktop users
- **Current MCP Tools**:
  - [x] **hello_world**: Basic connectivity test (WORKING)
- **Required MCP Tool Implementation**:
  - [ ] **search_documents**: Semantic document search (equivalent to gRPC SearchDocs)
  - [ ] **search_chunks**: Chunk-level search (equivalent to gRPC SearchChunks)
  - [ ] **list_folders**: Folder navigation (equivalent to gRPC ListFolders)
  - [ ] **list_documents**: Document listing (equivalent to gRPC ListDocumentsInFolder)
  - [ ] **get_document_metadata**: Document info (equivalent to gRPC GetDocMetadata)
  - [ ] **get_document_content**: Document access (equivalent to gRPC GetChunks)
  - [ ] **summarize_document**: Document summary (equivalent to gRPC GetDocSummary)
  - [ ] **query_table**: Table queries (equivalent to gRPC TableQuery)
  - [ ] **get_status**: System status (equivalent to gRPC IngestStatus)
  - [ ] **refresh_document**: Re-processing (equivalent to gRPC RefreshDoc)

**MCP Tool Implementation Strategy**:
- **Shared Logic**: MCP tools call the same domain services as gRPC endpoints
- **Response Formatting**: Convert domain responses to MCP-compatible format
- **Token Awareness**: Respect Claude Desktop's context limits
- **Error Handling**: Provide user-friendly error messages for chat context

#### C3. Domain Service Integration 📋 PENDING
- **Integration Required**:
  - [ ] Search service for document and chunk queries (both MCP and gRPC)
  - [ ] File system service for document access and metadata (both protocols)
  - [ ] Embedding service for vector operations (both protocols)
  - [ ] Content service for summarization and text processing (both protocols)
  - [ ] Cache service for performance optimization (both protocols)
  - [ ] Monitoring service for status tracking (both protocols)
- **Implementation Tasks**:
  - [ ] Connect each gRPC endpoint to appropriate domain services
  - [ ] Connect each MCP tool to appropriate domain services
  - [ ] Implement proper error handling and response mapping for both protocols
  - [ ] Add input validation and sanitization for both protocols
  - [ ] Implement token limiting for text responses (both protocols)

#### C4. Local Transport Health Monitoring 📋 PENDING
- **Health Check Implementation**:
  - [ ] gRPC health checking protocol
  - [ ] MCP protocol status monitoring
  - [ ] Local transport status monitoring (both protocols)
  - [ ] Dependency health checks (file system, cache, embeddings)
  - [ ] Performance metrics collection for both protocols
- **Monitoring Integration**:
  - [ ] Health status in CLI commands (both transports)
  - [ ] Structured logging for monitoring systems
  - [ ] Diagnostic endpoints for troubleshooting both protocols

---

### Phase D: Testing and CLI Integration 📋 PLANNED
**Priority**: Fourth - Quality Assurance and User Experience for Both Protocols

#### D1. Test Suite Integration 📋 PLANNED
- **Test Coverage**:
  - [ ] Unit tests for all gRPC service endpoints
  - [ ] Unit tests for all MCP tool implementations
  - [ ] Integration tests with domain services for both protocols
  - [ ] Local transport connection testing (both gRPC and MCP)
  - [ ] Cross-protocol consistency testing (same data, both protocols)
  - [ ] Error handling and edge case testing for both protocols
  - [ ] Performance testing for high-throughput scenarios (both protocols)
- **Test Infrastructure**:
  - [ ] Mock factories for domain services (shared between protocols)
  - [ ] Test fixtures for various document types
  - [ ] MCP client test harness for tool testing
  - [ ] gRPC client test harness for endpoint testing
  - [ ] Automated test execution in CI/CD

#### D2. CLI Enhancement 📋 PLANNED
- **Command Enhancements**:
  - [ ] `folder-mcp serve <folder>` with dual transport status
  - [ ] `folder-mcp status <folder>` with both MCP and gRPC transport health
  - [ ] `folder-mcp test-connection <folder>` for both protocol testing
  - [ ] `folder-mcp test-mcp <folder>` for MCP protocol testing
  - [ ] `folder-mcp test-grpc <folder>` for gRPC protocol testing
  - [ ] Enhanced logging and diagnostic output for both protocols
- **Configuration Integration**:
  - [ ] Local transport configuration options for both protocols
  - [ ] Socket path customization for gRPC
  - [ ] MCP protocol configuration options
  - [ ] Performance tuning parameters for both protocols
  - [ ] Protocol selection options (MCP only, gRPC only, both)

---

## 📁 File Structure Plan

### Completed Dual-Protocol Infrastructure ✅
```
src/grpc/
├── server.ts                     # ✅ Main gRPC server implementation
├── transport-manager.ts          # ✅ Local transport coordination
├── services/                     # ✅ gRPC service endpoint implementations
│   ├── index.ts                 # ✅ Service implementations index
│   └── search-service.ts        # ✅ SearchDocs, SearchChunks implementations
├── auth/                         # ✅ Authentication system (for future Step 35)
│   ├── index.ts                 # ✅ Authentication module exports
│   ├── api-key-manager.ts       # ✅ API key generation, storage, lifecycle
│   └── auth-interceptor.ts      # ✅ gRPC authentication middleware
├── interceptors/                 # ✅ gRPC middleware
│   └── index.ts                 # ✅ Interceptors index (placeholder)
└── utils/                        # ✅ gRPC utilities
    ├── proto-loader.ts          # ✅ Protocol buffer loading utilities
    └── error-mapper.ts          # ✅ Domain error to gRPC status mapping

src/mcp-server.ts                 # ✅ MCP protocol server (Claude Desktop integration)
src/interfaces/mcp/               # ✅ MCP protocol handlers and tools
```

### Remaining gRPC Service Implementation 📋
```
src/grpc/services/
├── navigation-service.ts         # 📋 ListFolders, ListDocumentsInFolder
├── document-service.ts           # 📋 GetDocMetadata, DownloadDoc, GetChunks
├── summary-service.ts            # 📋 GetDocSummary, BatchDocSummary
├── specialized-service.ts        # 📋 TableQuery, IngestStatus, RefreshDoc, GetEmbedding
└── health-service.ts             # 📋 gRPC health check protocol
```

### Required MCP Tool Implementation 📋
```
src/interfaces/mcp/tools/
├── search-tools.ts               # 📋 search_documents, search_chunks
├── navigation-tools.ts           # 📋 list_folders, list_documents
├── document-tools.ts             # 📋 get_document_metadata, get_document_content
├── summary-tools.ts              # 📋 summarize_document
├── specialized-tools.ts          # 📋 query_table, get_status, refresh_document
└── index.ts                      # 📋 Tool registration and exports
```

### Enhanced Configuration ✅
```
src/config/
├── grpc-config.ts               # ✅ gRPC server configuration
├── mcp-config.ts                # 📋 MCP protocol configuration
└── transport-config.ts          # 📋 Dual transport-specific configuration
```

### Testing Infrastructure 📋
```
tests/
├── grpc/                         # 📋 gRPC-specific tests
│   ├── services/                # 📋 Service endpoint tests
│   ├── transport/               # 📋 Local transport tests
│   └── integration/             # 📋 End-to-end gRPC transport tests
├── mcp/                          # 📋 MCP protocol tests
│   ├── tools/                   # 📋 MCP tool tests
│   ├── handlers/                # 📋 MCP handler tests
│   └── integration/             # 📋 End-to-end MCP tests
└── integration/                  # 📋 Cross-protocol integration tests
    ├── dual-protocol.test.ts    # 📋 Both protocols serving same data
    └── consistency.test.ts      # 📋 Response consistency between protocols
```

### Enhanced CLI Integration 📋
```
src/interfaces/cli/commands/
├── serve.ts                      # 📋 Enhanced with dual transport status
├── test-mcp.ts                   # 📋 MCP protocol connection testing
├── test-grpc.ts                  # 📋 gRPC protocol connection testing
└── transport-status.ts           # 📋 Dual transport health status
```

**Dual-Protocol Architecture**: Both MCP and gRPC protocols share the same domain services and business logic, ensuring consistent behavior and data access across both interfaces.

---

## 🔧 Technical Implementation Details

### gRPC Server Architecture

#### Server Initialization Pattern:
```typescript
// src/grpc/server.ts
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { FolderMCPService } from '../generated/folder-mcp';
import { createServices } from './services';

export class GrpcServer {
  private server: grpc.Server;
  private services: FolderMCPService;
  
  constructor(
    private config: GrpcConfig,
    private container: DIContainer
  ) {
    this.server = new grpc.Server();
    this.services = createServices(container);
    this.registerServices();
  }
  
  async start(): Promise<void> {
    // Unix Domain Socket for local high-performance access
    await this.startUnixSocket();
  }
  
  private async startUnixSocket(): Promise<void> {
    const socketPath = this.config.socketPath || '\\\\.\\pipe\\folder-mcp';
    
    return new Promise((resolve, reject) => {
      this.server.bindAsync(
        socketPath,
        grpc.ServerCredentials.createInsecure(),
        (error, port) => {
          if (error) {
            reject(error);
          } else {
            this.server.start();
            this.logger.info(`gRPC server listening on ${socketPath}`);
            resolve();
          }
        }
      );
    });
  }
}
```

#### Service Implementation Pattern:
```typescript
// src/grpc/services/search-service.ts
import { SearchDocsRequest, SearchDocsResponse } from '../../generated/folder-mcp';
import { ISearchService } from '../../domain/abstractions';

export class SearchService {
  constructor(
    private searchService: ISearchService,
    private logger: ILogger
  ) {}
  
  async searchDocs(
    request: SearchDocsRequest,
    call: grpc.ServerUnaryCall<SearchDocsRequest, SearchDocsResponse>
  ): Promise<SearchDocsResponse> {
    try {
      this.logger.info('SearchDocs request', { 
        query: request.query,
        topK: request.top_k,
        socketPath: call.getPeer() // Local socket identification
      });
      
      // Input validation
      if (!request.query || request.query.length === 0) {
        throw new Error('Query is required');
      }
      
      if (request.top_k < 1 || request.top_k > 50) {
        throw new Error('top_k must be between 1 and 50');
      }
      
      // Execute search via domain service
      const results = await this.searchService.searchDocuments({
        query: request.query,
        topK: request.top_k,
        filters: request.metadata_filters,
        dateFrom: request.date_from,
        dateTo: request.date_to,
        authors: request.authors,
        documentTypes: request.document_types
      });
      
      // Convert to proto response
      return {
        documents: results.documents.map(doc => ({
          document: {
            id: doc.id,
            path: doc.path,
            title: doc.title,
            document_type: doc.documentType,
            author: doc.author,
            creation_date: doc.creationDate,
            modification_date: doc.modificationDate,
            size_bytes: doc.sizeBytes
          },
          similarity_score: doc.similarityScore,
          match_context: doc.matchContext
        })),
        total_results: results.totalResults,
        search_duration_ms: results.searchDurationMs
      };
      
    } catch (error) {
      this.logger.error('SearchDocs error', { error: error.message });
      throw error; // gRPC error mapping handled by interceptor
    }
  }
}
```

### Local Transport Optimization

#### Unix Domain Socket Benefits:
- **Zero Network Overhead**: Direct kernel-level IPC without TCP/IP stack
- **Maximum Throughput**: Optimal for high-volume document processing
- **Filesystem Security**: Natural access control via file permissions
- **Process Isolation**: Clean separation between MCP server and gRPC transport

#### Performance Characteristics:
- **Latency**: <1ms for local calls vs 1-5ms for localhost TCP
- **Throughput**: 10-100x higher than network sockets for large payloads
- **Memory Usage**: Direct memory access without network buffer copies
- **CPU Overhead**: Minimal compared to network protocol processing

### Domain Service Integration

#### Service Resolution Pattern:
```typescript
// src/grpc/services/index.ts
import { DIContainer } from '../../di/container';
import { SearchService } from './search-service';
import { NavigationService } from './navigation-service';
import { DocumentService } from './document-service';

export function createServices(container: DIContainer) {
  return {
    searchService: new SearchService(
      container.resolve('ISearchService'),
      container.resolve('ILogger')
    ),
    navigationService: new NavigationService(
      container.resolve('IFileSystemService'),
      container.resolve('ILogger')
    ),
    documentService: new DocumentService(
      container.resolve('IFileSystemService'),
      container.resolve('IContentService'),
      container.resolve('ILogger')
    )
  };
}
```

### Error Handling and Status Mapping

#### Domain to gRPC Error Translation:
```typescript
// src/grpc/utils/error-mapper.ts
import * as grpc from '@grpc/grpc-js';
import { DomainError } from '../../domain/errors';

export function mapDomainErrorToGrpcStatus(error: Error): grpc.StatusObject {
  if (error instanceof DomainError) {
    switch (error.code) {
      case 'FILE_NOT_FOUND':
        return {
          code: grpc.status.NOT_FOUND,
          details: error.message,
          metadata: new grpc.Metadata()
        };
      case 'INVALID_INPUT':
        return {
          code: grpc.status.INVALID_ARGUMENT,
          details: error.message,
          metadata: new grpc.Metadata()
        };
      case 'ACCESS_DENIED':
        return {
          code: grpc.status.PERMISSION_DENIED,
          details: error.message,
          metadata: new grpc.Metadata()
        };
      default:
        return {
          code: grpc.status.INTERNAL,
          details: 'Internal service error',
          metadata: new grpc.Metadata()
        };
    }
  }
  
  return {
    code: grpc.status.INTERNAL,
    details: 'Unknown error occurred',
    metadata: new grpc.Metadata()
  };
}
```
        throw new Error('top_k must be between 1 and 50');
      }
      
      // Execute search
      const results = await this.searchService.searchDocuments({
        query: request.query,
        topK: request.top_k,
        filters: request.metadata_filters,
        dateFrom: request.date_from,
        dateTo: request.date_to,
        authors: request.authors,
        documentTypes: request.document_types
      });
      
      // Convert to proto response
      return {
        documents: results.documents.map(doc => ({
          document: {
            id: doc.id,
            path: doc.path,
            title: doc.title,
            type: doc.type,
            size: doc.size,
            created_at: doc.createdAt.toISOString(),
            modified_at: doc.modifiedAt.toISOString(),
            metadata: doc.metadata
          },
          similarity_score: doc.similarityScore,
          matching_chunks: doc.matchingChunks,
          highlight_metadata: doc.highlightMetadata
        })),
        pagination: {
          page: results.pagination.page,
          per_page: results.pagination.perPage,
          total_count: results.pagination.totalCount,
          has_next: results.pagination.hasNext
        },
        query_metadata: {
          query: request.query,
          execution_time_ms: results.executionTimeMs,
          total_documents_searched: results.totalDocumentsSearched
        },
        status: {
          code: 0,
          message: 'Success'
        }
      };
    } catch (error) {
      this.logger.error('SearchDocs error', error);
      throw this.mapDomainError(error);
    }
  }
  
  private mapDomainError(error: Error): grpc.ServiceError {
    // Map domain errors to appropriate gRPC status codes
    if (error.message.includes('not found')) {
      return {
        code: grpc.status.NOT_FOUND,
        message: error.message
      };
    }
    
    if (error.message.includes('permission')) {
      return {
        code: grpc.status.PERMISSION_DENIED,
        message: error.message
      };
    }
    
    return {
      code: grpc.status.INTERNAL,
      message: 'Internal server error'
    };
  }
}
```

### Authentication Interceptor Implementation

#### API Key Authentication:
```typescript
// src/grpc/interceptors/auth-interceptor.ts
import * as grpc from '@grpc/grpc-js';
import { ApiKeyManager } from '../security/api-key-manager';

export class AuthInterceptor {
  constructor(
    private apiKeyManager: ApiKeyManager,
    private logger: ILogger
  ) {}
  
  intercept(
    methodDescriptor: grpc.MethodDescriptor<any, any>,
    call: grpc.ServerUnaryCall<any, any> | grpc.ServerReadableStream<any, any>
  ): grpc.InterceptingCall {
    return new grpc.InterceptingCall(call, {
      start: (metadata, listener, next) => {
        // Skip authentication for Unix Domain Socket connections
        if (this.isUnixSocketConnection(call)) {
          next(metadata, listener);
          return;
        }
        
        // Extract API key from metadata
        const authHeader = metadata.get('authorization')[0] as string;
        const apiKeyHeader = metadata.get('x-api-key')[0] as string;
        
        let apiKey: string | null = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          apiKey = authHeader.substring(7);
        } else if (apiKeyHeader) {
          apiKey = apiKeyHeader;
        }
        
        if (!apiKey) {
          const error: grpc.ServiceError = {
            code: grpc.status.UNAUTHENTICATED,
            message: 'API key required for remote connections'
          };
          listener.onReceiveStatus(error);
          return;
        }
        
        // Validate API key
        if (!this.apiKeyManager.validateKey(apiKey)) {
          this.logger.warn('Invalid API key attempt', { 
            key: apiKey.substring(0, 8) + '...',
            method: methodDescriptor.path,
            peer: call.getPeer()
          });
          
          const error: grpc.ServiceError = {
            code: grpc.status.PERMISSION_DENIED,
            message: 'Invalid API key'
          };
          listener.onReceiveStatus(error);
          return;
        }
        
        // Add user context to metadata
        metadata.set('user-authenticated', 'true');
        metadata.set('user-id', this.apiKeyManager.getUserId(apiKey));
        
        next(metadata, listener);
      }
    });
  }
  
  private isUnixSocketConnection(call: grpc.Call): boolean {
    const peer = call.getPeer();
    return peer.startsWith('unix:');
  }
}
```

### API Key Management System

#### Secure Key Generation and Storage:
```typescript
// src/security/api-key/manager.ts
import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export class ApiKeyManager {
  private readonly keyStorePath: string;
  private keyCache: Map<string, ApiKeyInfo> = new Map();
  
  constructor() {
    this.keyStorePath = join(homedir(), '.folder-mcp', 'api-keys.json');
  }
  
  async generateKey(folderPath: string): Promise<string> {
    // Generate cryptographically secure 32-byte key
    const keyBytes = randomBytes(32);
    const keyString = keyBytes.toString('base64');
    
    // Store key with folder mapping
    const keyInfo: ApiKeyInfo = {
      key: keyString,
      folderPath,
      createdAt: new Date().toISOString(),
      lastUsed: null,
      isActive: true
    };
    
    await this.storeKey(folderPath, keyInfo);
    this.keyCache.set(keyString, keyInfo);
    
    return keyString;
  }
  
  async rotateKey(folderPath: string): Promise<string> {
    // Generate new key
    const newKey = await this.generateKey(folderPath);
    
    // Mark old key as inactive (grace period)
    const oldKeys = await this.getKeysForFolder(folderPath);
    for (const oldKey of oldKeys) {
      if (oldKey.key !== newKey) {
        oldKey.isActive = false;
        oldKey.rotatedAt = new Date().toISOString();
        await this.storeKey(folderPath, oldKey);
      }
    }
    
    return newKey;
  }
  
  validateKey(key: string): boolean {
    try {
      // Check cache first
      if (this.keyCache.has(key)) {
        const keyInfo = this.keyCache.get(key)!;
        if (keyInfo.isActive) {
          keyInfo.lastUsed = new Date().toISOString();
          return true;
        }
      }
      
      // Load from storage if not in cache
      const keyInfo = this.loadKeyFromStorage(key);
      if (keyInfo && keyInfo.isActive) {
        this.keyCache.set(key, keyInfo);
        keyInfo.lastUsed = new Date().toISOString();
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }
  
  private async storeKey(folderPath: string, keyInfo: ApiKeyInfo): Promise<void> {
    await fs.mkdir(dirname(this.keyStorePath), { recursive: true });
    
    let keyStore: KeyStore = {};
    try {
      const content = await fs.readFile(this.keyStorePath, 'utf8');
      keyStore = JSON.parse(content);
    } catch (error) {
      // File doesn't exist or is invalid, start fresh
    }
    
    if (!keyStore[folderPath]) {
      keyStore[folderPath] = [];
    }
    
    keyStore[folderPath].push(keyInfo);
    
    // Atomic write
    const tempPath = this.keyStorePath + '.tmp';
    await fs.writeFile(tempPath, JSON.stringify(keyStore, null, 2));
    await fs.rename(tempPath, this.keyStorePath);
  }
}

interface ApiKeyInfo {
  key: string;
  folderPath: string;
  createdAt: string;
  lastUsed: string | null;
  isActive: boolean;
  rotatedAt?: string;
}

interface KeyStore {
  [folderPath: string]: ApiKeyInfo[];
}
```

### Transport Manager Implementation

#### Multi-Protocol Transport Coordination:
```typescript
// src/transport/transport-manager.ts
export class TransportManager {
  private grpcServer: GrpcServer;
  private unixTransport: UnixTransport | null = null;
  private tcpTransport: TcpTransport | null = null;
  private healthMonitor: HealthMonitor;
  
  constructor(
    private config: TransportConfig,
    private container: DIContainer
  ) {
    this.grpcServer = new GrpcServer(config.grpc, container);
    this.healthMonitor = new HealthMonitor(container);
  }
  
  async start(): Promise<void> {
    // Start gRPC server with configured transports
    await this.grpcServer.start();
    
    // Initialize health monitoring
    await this.healthMonitor.start();
    
    // Setup graceful shutdown
    this.setupGracefulShutdown();
  }
  
  async stop(): Promise<void> {
    // Graceful shutdown sequence
    await this.healthMonitor.stop();
    await this.grpcServer.stop();
  }
  
  getStatus(): TransportStatus {
    return {
      unix: this.unixTransport?.getStatus() || null,
      tcp: this.tcpTransport?.getStatus() || null,
      health: this.healthMonitor.getStatus()
    };
  }
  
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      console.log(`Received ${signal}, initiating graceful shutdown...`);
      await this.stop();
      process.exit(0);
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}
```

---

## 📊 Token Limit and Performance Implementation

### Response Size Management:
```typescript
// Token limit enforcement in service implementations
export class DocumentService {
  private readonly MAX_CHUNK_TOKENS = 1000;
  private readonly MAX_SUMMARY_TOKENS = 500;
  private readonly MAX_BATCH_TOKENS = 2000;
  
  async getChunks(request: GetChunksRequest): Promise<GetChunksResponse> {
    const chunks = await this.chunkService.getChunks(request.document_id, request.chunk_ids);
    
    let totalTokens = 0;
    const filteredChunks = [];
    
    for (const chunk of chunks) {
      const chunkTokens = this.tokenizer.count(chunk.content);
      if (totalTokens + chunkTokens <= this.MAX_CHUNK_TOKENS) {
        filteredChunks.push(chunk);
        totalTokens += chunkTokens;
      } else {
        break; // Stop when token limit reached
      }
    }
    
    return {
      chunks: filteredChunks,
      document_metadata: await this.getDocumentMetadata(request.document_id),
      total_token_count: totalTokens,
      truncated: filteredChunks.length < chunks.length
    };
  }
}
```

### Streaming Implementation:
```typescript
// Streaming response for large downloads
async downloadDoc(
  request: DownloadDocRequest,
  call: grpc.ServerWritableStream<DownloadDocRequest, DownloadDocResponse>
): Promise<void> {
  try {
    const document = await this.documentService.getDocument(request.document_id);
    const stream = await this.documentService.createReadStream(document.path);
    
    const CHUNK_SIZE = 64 * 1024; // 64KB chunks
    let bytesRead = 0;
    
    stream.on('data', (chunk: Buffer) => {
      bytesRead += chunk.length;
      
      const response: DownloadDocResponse = {
        content_chunk: chunk,
        metadata: {
          document_id: request.document_id,
          content_type: document.contentType,
          total_size: document.size,
          bytes_read: bytesRead
        },
        progress: {
          completed: bytesRead,
          total: document.size,
          percentage: Math.round((bytesRead / document.size) * 100)
        }
      };
      
      call.write(response);
    });
    
    stream.on('end', () => {
      call.end();
    });
    
    stream.on('error', (error) => {
      call.destroy(error);
    });
  } catch (error) {
    call.destroy(this.mapDomainError(error));
  }
}
```

---

## ✅ Success Validation Checklist

**Step 31 Complete When All Items Are Checked:**

### Core gRPC Service Requirements:
- [ ] gRPC server implemented with all 13 service endpoints
- [ ] Generated TypeScript types integrated with service implementations
- [ ] Proper error handling with gRPC status codes
- [ ] Structured logging for all service calls
- [ ] Health check protocol implementation
- [ ] Service method input validation

### Multi-Protocol Transport Requirements:
- [ ] Unix Domain Socket transport with filesystem permissions
- [ ] TCP transport with configurable port and TLS support
- [ ] Transport protocol selection (unix, tcp, both)
- [ ] Connection pooling and management
- [ ] Graceful shutdown handling for all transports
- [ ] Transport health monitoring and diagnostics

### Security System Requirements:
- [ ] API key generation with 32-byte Base64 encoding
- [ ] Secure key storage in `~/.folder-mcp/api-keys.json`
- [ ] gRPC authentication interceptor for remote connections
- [ ] Bearer token and x-api-key metadata support
- [ ] Key lifecycle management (generate, rotate, revoke)
- [ ] TLS/mTLS support for remote connections

### Integration Requirements:
- [ ] DI container integration with type-safe service registration
- [ ] Configuration system enhancement with transport settings
- [ ] CLI command enhancement with transport options
- [ ] Domain service integration via dependency injection
- [ ] Error translation from domain to gRPC status codes
- [ ] Performance monitoring and metrics collection

### Testing Requirements:
- [ ] Unit tests for all service endpoint implementations
- [ ] Integration tests for multi-protocol transport
- [ ] Security tests for authentication and authorization
- [ ] Performance tests for connection handling
- [ ] End-to-end tests with real gRPC clients
- [ ] Claude Desktop compatibility verification

### Quality Assurance Requirements:
- [ ] TypeScript compilation without errors or warnings
- [ ] All existing tests continue to pass
- [ ] New tests achieve >90% code coverage
- [ ] Performance benchmarks met for all endpoints
- [ ] Memory usage within acceptable limits
- [ ] No resource leaks in connection management

---

## 🚀 Implementation Sequence

### Week 1: Core gRPC Service Implementation (Phase A)
**Days 1-2: Service Foundation**
1. [ ] **Implement gRPC server setup** with proto loading and service registration
2. [ ] **Create service base classes** with common error handling and logging
3. [ ] **Implement search services** (SearchDocs, SearchChunks)
4. [ ] **Add input validation** and token limiting to search endpoints

**Days 3-4: Navigation and Document Services**
1. [ ] **Implement navigation services** (ListFolders, ListDocumentsInFolder)
2. [ ] **Implement document services** (GetDocMetadata, DownloadDoc, GetChunks)
3. [ ] **Add streaming support** for binary document downloads
4. [ ] **Integrate with existing domain services** via DI container

**Day 5: Specialized Services**
1. [ ] **Implement summary services** (GetDocSummary, BatchDocSummary)
2. [ ] **Implement specialized services** (TableQuery, IngestStatus, RefreshDoc, GetEmbedding)
3. [ ] **Add health check service** with dependency monitoring
4. [ ] **Complete service endpoint testing**

### Week 2: Multi-Protocol Transport (Phase B)
**Days 1-2: Unix Domain Socket Transport**
1. [ ] **Implement Unix socket server** with filesystem permissions
2. [ ] **Add connection management** and health monitoring
3. [ ] **Implement graceful shutdown** with active connection drainage
4. [ ] **Test local transport** with real gRPC clients

**Days 3-4: TCP Transport with Security**
1. [ ] **Implement TCP server** with configurable port and binding
2. [ ] **Add TLS/mTLS support** with certificate management
3. [ ] **Implement connection limits** and keep-alive settings
4. [ ] **Test remote transport** with authentication

**Day 5: Transport Coordination**
1. [ ] **Implement transport manager** for multi-protocol coordination
2. [ ] **Add transport selection logic** and configuration
3. [ ] **Implement health monitoring** across all transports
4. [ ] **Complete transport integration testing**

### Week 3: Security System (Phase C)
**Days 1-2: API Key Management**
1. [ ] **Implement secure key generation** with cryptographic randomness
2. [ ] **Create key storage system** with atomic file operations
3. [ ] **Add key lifecycle management** (generate, rotate, revoke)
4. [ ] **Implement key validation** with timing-safe comparison

**Days 3-4: Authentication System**
1. [ ] **Implement gRPC authentication interceptor** 
2. [ ] **Add Bearer token and x-api-key support** in metadata
3. [ ] **Implement rate limiting** for failed authentication attempts
4. [ ] **Add audit logging** for authentication events

**Day 5: CLI Integration**
1. [ ] **Enhance CLI commands** with transport and security options
2. [ ] **Add transport testing commands** for connection verification
3. [ ] **Implement key management commands** with transport integration
4. [ ] **Complete security system testing**

### Week 4: Integration and Testing (Phases D & E)
**Days 1-2: Health Monitoring and Management**
1. [ ] **Implement connection pooling** and resource management
2. [ ] **Add comprehensive health monitoring** with metrics collection
3. [ ] **Implement graceful shutdown** coordination across all components
4. [ ] **Add monitoring integration** with structured logging

**Days 3-4: Configuration and DI Integration**
1. [ ] **Enhance configuration system** with transport settings
2. [ ] **Complete DI container integration** with type-safe registration
3. [ ] **Add environment variable support** for deployment
4. [ ] **Implement configuration validation** and error handling

**Day 5: Final Testing and Validation**
1. [ ] **Complete comprehensive test suite** with >90% coverage
2. [ ] **Perform end-to-end integration testing** 
3. [ ] **Verify Claude Desktop compatibility** 
4. [ ] **Conduct performance testing** and optimization

---

## 🎯 Next Steps After Completion

**Step 31 COMPLETED** → **Step 32-34**: Core Service Endpoints Implementation
- **Step 32**: Core Search Endpoints (SearchDocs, SearchChunks)
- **Step 33**: Navigation Endpoints (ListFolders, ListDocumentsInFolder)  
- **Step 34**: Document Content Endpoints (GetDocMetadata, DownloadDoc, GetChunks)

**Step 35**: Remote Access & Cloud LLM Integration
- **TCP Transport**: Remote gRPC server with configurable port
- **API Key Authentication**: Bearer token validation for remote connections
- **Cloudflare Tunnel Integration**: Zero-config remote access for cloud LLMs
- **TLS/mTLS Support**: Certificate management and secure connections
- **Subdomain Service**: User-friendly `username.folder-mcp.com` URLs
- **Rate Limiting & Audit Logging**: Enterprise-grade security features

**Separation of Concerns**: Step 31 focuses exclusively on local transport to establish a solid foundation. Remote access complexity is isolated in Step 35, allowing for dedicated focus on cloud LLM integration requirements.

---

**Step 31 Status**: 🏗️ **IN PROGRESS** - Core infrastructure completed, endpoint implementation ongoing  
**Priority**: 🔥 **CRITICAL - Local Transport Foundation**  
**Dependencies**: ✅ **All Met** (Step 30 Protocol Buffer Schema Complete)

---

*This document serves as the complete implementation guide for Step 31 local transport. Update checkboxes as tasks are completed and add implementation notes as development progresses.*
