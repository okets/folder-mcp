# Step 31 Implementation Plan: gRPC Transport Implementation

**Date Created**: June 13, 2025  
**Status**: 🚀 READY TO START - Next Immediate Task  
**Priority**: 🔥 CRITICAL - Core Transport Infrastructure  
**Dependencies**: ✅ Step 30 Protocol Buffer Schema Design (COMPLETED)

## 📋 Overview

**Goal**: Implement comprehensive multi-protocol gRPC transport layer with local Unix Domain Socket and remote TCP support, complete API key security system, and production-ready transport management for high-performance document intelligence services.

**Success Criteria from Roadmap**:
- Local transport: Unix Domain Socket (/tmp/folder-mcp.sock) with filesystem permissions only
- Remote transport: TCP with configurable port (50051) with API key authentication
- TLS/mTLS support for remote connections
- API key generation system (32-byte Base64 on first serve)
- Transport health checks and reconnection logic
- Graceful shutdown handling for all transports
- gRPC service implementation using generated proto types
- Integration with existing DI container and configuration system
- All tests pass with new transport implementation
- TypeScript compiles without ANY errors
- Claude Desktop integration maintains compatibility

## 🏗️ Implementation Phases

### Phase A: Core gRPC Service Implementation
**Priority**: First - Foundation Service Layer

#### A1. gRPC Server Foundation
- **Current State**: Protocol buffer schema complete with all 13 endpoints
- **Task**: Implement gRPC server using @grpc/grpc-js with typed proto definitions
- **Components to Create**:
  - [ ] **gRPC Server Setup**: Server initialization, proto loading, service registration
  - [ ] **Service Implementation**: All 13 endpoints with proper error handling
  - [ ] **Type Integration**: Use generated TypeScript types for type safety
  - [ ] **Error Handling**: Standardized gRPC error codes and messages
  - [ ] **Logging Integration**: Structured logging for all service calls
  - [ ] **Health Checks**: gRPC health checking protocol implementation

#### A2. Service Endpoint Implementation
- [ ] **Implement all 13 service methods** with proper type safety and error handling
- **Service Methods to Implement**:
  - [ ] **SearchDocs**: Semantic document discovery with metadata filtering
  - [ ] **SearchChunks**: Chunk-level search with similarity scoring
  - [ ] **ListFolders**: Folder tree structure with recursive navigation
  - [ ] **ListDocumentsInFolder**: Document listing with pagination
  - [ ] **GetDocMetadata**: Document metadata with structural information
  - [ ] **DownloadDoc**: Binary document streaming with content-type detection
  - [ ] **GetChunks**: Chunk text retrieval with token limiting
  - [ ] **GetDocSummary**: Single document summarization
  - [ ] **BatchDocSummary**: Multi-document batch processing
  - [ ] **TableQuery**: Spreadsheet semantic queries
  - [ ] **IngestStatus**: Document processing status monitoring
  - [ ] **RefreshDoc**: Document re-processing trigger
  - [ ] **GetEmbedding**: Raw vector access for debugging

#### A3. Business Logic Integration
- [ ] **Connect service layer to existing domain services** via DI container
- **Domain Service Integration**:
  - [ ] Search service for document and chunk queries
  - [ ] File system service for document access and metadata
  - [ ] Embedding service for vector operations
  - [ ] Content service for summarization and text processing
  - [ ] Cache service for performance optimization
  - [ ] Monitoring service for status tracking
- [ ] **Type-Safe Service Wrappers**: Ensure all domain service calls are properly typed
- [ ] **Error Translation**: Convert domain errors to appropriate gRPC status codes

---

### Phase B: Multi-Protocol Transport Implementation
**Priority**: Second - Transport Layer Foundation

#### B1. Unix Domain Socket Transport
- [ ] **Local Transport Implementation**: High-performance Unix socket for local communication
- [ ] **Security Model**: Filesystem permissions only (no API key required)
- **Socket Configuration**:
  - [ ] Default path: `/tmp/folder-mcp.sock` (configurable)
  - [ ] File permissions: 0600 (owner read/write only)
  - [ ] Automatic cleanup on shutdown
  - [ ] Socket availability detection
- **Connection Management**:
  - [ ] Connection pooling for local clients
  - [ ] Automatic reconnection handling
  - [ ] Graceful shutdown with active connection drainage
  - [ ] Health monitoring and diagnostics

#### B2. Remote TCP Transport
- [ ] **Remote Transport Implementation**: TCP server for remote gRPC connections
- [ ] **Security Model**: API key authentication required for all remote connections
- **TCP Configuration**:
  - [ ] Default port: 50051 (configurable)
  - [ ] Bind address: configurable (default: 0.0.0.0 for remote, 127.0.0.1 for local-only)
  - [ ] Connection limits and timeout configuration
  - [ ] Keep-alive settings for long-lived connections
- **Authentication Integration**:
  - [ ] gRPC interceptor for API key validation
  - [ ] Bearer token extraction from metadata
  - [ ] Integration with API key management system
  - [ ] Request rate limiting per API key

#### B3. TLS/mTLS Security Layer
- [ ] **TLS Configuration**: Secure connections for production deployments
- **Certificate Management**:
  - [ ] Self-signed certificate generation for development
  - [ ] Custom certificate support for production
  - [ ] Certificate validation and expiration monitoring
  - [ ] Automatic certificate renewal hooks
- **mTLS Support**:
  - [ ] Client certificate validation
  - [ ] Certificate-based access control
  - [ ] Integration with API key system
  - [ ] Audit logging for certificate-based connections

---

### Phase C: API Key Security System
**Priority**: Third - Security Infrastructure

#### C1. API Key Generation and Storage
- [ ] **Strong Key Generation**: Cryptographically secure 32-byte Base64 encoded keys
- **Key Storage System**:
  - [ ] Storage location: `~/.folder-mcp/api-keys.json`
  - [ ] JSON structure with folder-to-key mapping
  - [ ] Atomic file operations for key updates
  - [ ] Backup and recovery mechanisms
- **Key Lifecycle Management**:
  - [ ] Automatic generation on first `folder-mcp serve <folder>`
  - [ ] Key rotation with `folder-mcp rotate-key <folder>`
  - [ ] Key revocation with `folder-mcp revoke-key <folder>`
  - [ ] Key listing and status display
- **Security Features**:
  - [ ] In-memory key caching for performance
  - [ ] Key validation and format verification
  - [ ] Secure key comparison (timing-safe)
  - [ ] Key expiration and automatic rotation (optional)

#### C2. Authentication Middleware
- [ ] **gRPC Interceptor Implementation**: Server-side authentication for remote connections
- **Authentication Logic**:
  - [ ] Extract Bearer token from `authorization` metadata
  - [ ] Support alternative `x-api-key` metadata format
  - [ ] Validate key against stored keys for the served folder
  - [ ] Bypass authentication for Unix Domain Socket connections
- **Error Handling**:
  - [ ] Return `UNAUTHENTICATED` status for missing keys
  - [ ] Return `PERMISSION_DENIED` status for invalid keys
  - [ ] Rate limiting for failed authentication attempts
  - [ ] Audit logging for all authentication events

#### C3. CLI Integration Enhancement
- [ ] **Extend existing CLI commands** with transport-specific options
- **Command Enhancements**:
  - [ ] `folder-mcp serve <folder>` with transport selection
  - [ ] Transport health status in `folder-mcp status <folder>`
  - [ ] Connection testing with `folder-mcp test-connection <folder>`
  - [ ] Key management integration with transport configuration
- **Configuration Integration**:
  - [ ] Transport protocol selection (unix, tcp, both)
  - [ ] Port and socket path configuration
  - [ ] TLS certificate configuration
  - [ ] Authentication settings per transport

---

### Phase D: Transport Management and Health Monitoring
**Priority**: Fourth - Operational Excellence

#### D1. Connection Management
- [ ] **Connection Pooling**: Efficient connection reuse for high-throughput scenarios
- **Connection Lifecycle**:
  - [ ] Connection establishment and handshake
  - [ ] Keep-alive and heartbeat monitoring
  - [ ] Graceful connection termination
  - [ ] Connection recovery and retry logic
- **Resource Management**:
  - [ ] Memory usage monitoring for active connections
  - [ ] Connection limits and throttling
  - [ ] Automatic cleanup of stale connections
  - [ ] Resource leak detection and prevention

#### D2. Health Monitoring System
- [ ] **gRPC Health Check Protocol**: Standard health checking implementation
- **Health Status Tracking**:
  - [ ] Service availability monitoring
  - [ ] Transport layer health status
  - [ ] Dependency health checks (file system, cache, embeddings)
  - [ ] Performance metrics collection
- **Monitoring Integration**:
  - [ ] Health status in CLI commands
  - [ ] Structured logging for monitoring systems
  - [ ] Metrics export for observability platforms
  - [ ] Alert thresholds and notification hooks

#### D3. Graceful Shutdown Management
- [ ] **Shutdown Sequence**: Coordinated shutdown of all transport layers
- **Shutdown Phases**:
  1. [ ] Stop accepting new connections
  2. [ ] Drain active requests with timeout
  3. [ ] Close transport listeners
  4. [ ] Cleanup resources (sockets, certificates, keys)
  5. [ ] Final status reporting
- **Signal Handling**:
  - [ ] SIGTERM for graceful shutdown
  - [ ] SIGINT for immediate shutdown
  - [ ] SIGHUP for configuration reload
  - [ ] Process manager integration (PM2, systemd)

---

### Phase E: Integration and Testing
**Priority**: Fifth - Quality Assurance

#### E1. DI Container Integration
- [ ] **Service Registration**: Register gRPC services with dependency injection container
- **Factory Pattern Enhancement**:
  - [ ] Transport factory for protocol selection
  - [ ] Service factory for endpoint implementation
  - [ ] Configuration factory for transport settings
  - [ ] Lifecycle management through DI
- [ ] **Type Safety**: Ensure all DI registrations maintain TypeScript type safety
- [ ] **Testing Integration**: Mock-friendly DI setup for unit testing

#### E2. Configuration System Enhancement
- [ ] **Transport Configuration Schema**: Extend config schema with transport settings
- **Configuration Options**:
  - [ ] Transport protocol selection (unix, tcp, both)
  - [ ] Port and socket path configuration
  - [ ] TLS/certificate settings
  - [ ] API key management options
  - [ ] Connection limits and timeouts
- [ ] **Environment Variable Support**: Standard environment variable naming
- [ ] **Configuration Validation**: Runtime validation of transport settings

#### E3. Testing Strategy
- [ ] **Unit Tests**: Individual service method testing with mocks
- [ ] **Integration Tests**: End-to-end transport testing with real connections
- [ ] **Security Tests**: Authentication and authorization verification
- [ ] **Performance Tests**: Load testing for connection handling
- [ ] **Compatibility Tests**: Verify Claude Desktop integration remains functional

---

## 📁 Detailed File Structure Plan

### New gRPC Service Implementation
```
src/grpc/
├── server.ts                     # NEW: Main gRPC server implementation
├── services/                     # NEW: Service endpoint implementations
│   ├── search-service.ts        # SearchDocs, SearchChunks implementations
│   ├── navigation-service.ts    # ListFolders, ListDocumentsInFolder
│   ├── document-service.ts      # GetDocMetadata, DownloadDoc, GetChunks
│   ├── summary-service.ts       # GetDocSummary, BatchDocSummary
│   ├── specialized-service.ts   # TableQuery, IngestStatus, RefreshDoc, GetEmbedding
│   └── health-service.ts        # gRPC health check protocol
├── interceptors/                 # NEW: gRPC middleware
│   ├── auth-interceptor.ts      # API key authentication
│   ├── logging-interceptor.ts   # Request/response logging
│   ├── error-interceptor.ts     # Error handling and translation
│   └── metrics-interceptor.ts   # Performance metrics collection
├── security/                     # NEW: Security implementations
│   ├── api-key-manager.ts       # Key generation, storage, validation
│   ├── certificate-manager.ts   # TLS certificate management
│   └── rate-limiter.ts          # Request rate limiting
└── utils/                        # NEW: gRPC utilities
    ├── proto-loader.ts          # Protocol buffer loading utilities
    ├── error-mapper.ts          # Domain error to gRPC status mapping
    └── stream-helper.ts         # Streaming response utilities
```

### Enhanced Transport Layer
```
src/transport/
├── grpc-transport.ts             # ENHANCED: gRPC-specific transport implementation
├── unix-transport.ts             # NEW: Unix Domain Socket transport
├── tcp-transport.ts              # NEW: TCP transport with TLS support
├── transport-manager.ts          # NEW: Multi-transport coordination
├── connection-pool.ts            # NEW: Connection pooling and management
└── health-monitor.ts             # NEW: Transport health monitoring
```

### Enhanced Configuration
```
src/config/
├── transport-config.ts           # NEW: Transport-specific configuration
├── security-config.ts            # NEW: Security and API key configuration
├── grpc-config.ts               # NEW: gRPC server configuration
└── tls-config.ts                # NEW: TLS/certificate configuration
```

### Security System
```
src/security/
├── api-key/                      # NEW: API key management system
│   ├── generator.ts             # Cryptographic key generation
│   ├── storage.ts               # Secure key storage and retrieval
│   ├── validator.ts             # Key validation and verification
│   └── manager.ts               # Key lifecycle management
├── auth/                         # NEW: Authentication system
│   ├── interceptor.ts           # gRPC authentication interceptor
│   ├── middleware.ts            # HTTP authentication middleware
│   └── rate-limiter.ts          # Authentication rate limiting
└── tls/                          # NEW: TLS certificate management
    ├── cert-generator.ts        # Self-signed certificate generation
    ├── cert-manager.ts          # Certificate lifecycle management
    └── cert-validator.ts        # Certificate validation and monitoring
```

### Enhanced CLI Integration
```
src/interfaces/cli/commands/
├── serve.ts                      # ENHANCED: Transport-aware serve command
├── transport-test.ts             # NEW: Transport connection testing
├── transport-status.ts           # NEW: Transport health status
└── security/                     # ENHANCED: Security command enhancements
    ├── generate-key.ts          # Enhanced with transport integration
    ├── rotate-key.ts            # Enhanced with active connection handling
    └── test-auth.ts             # NEW: Authentication testing command
```

### Testing Infrastructure
```
tests/
├── grpc/                         # NEW: gRPC-specific tests
│   ├── services/                # Service endpoint tests
│   ├── interceptors/            # Middleware tests
│   ├── security/                # Authentication tests
│   └── transport/               # Transport layer tests
├── security/                     # NEW: Security system tests
│   ├── api-key/                 # API key management tests
│   ├── auth/                    # Authentication tests
│   └── tls/                     # TLS/certificate tests
└── integration/                  # ENHANCED: Transport integration tests
    ├── grpc-integration.test.ts # End-to-end gRPC testing
    ├── multi-transport.test.ts  # Multi-protocol testing
    └── security-integration.test.ts # Security integration testing
```

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
import { createInterceptors } from './interceptors';

export class GrpcServer {
  private server: grpc.Server;
  private services: FolderMCPService;
  
  constructor(
    private config: GrpcConfig,
    private container: DIContainer
  ) {
    this.server = new grpc.Server();
    this.services = createServices(container);
    this.setupInterceptors();
    this.registerServices();
  }
  
  async start(): Promise<void> {
    // Unix Domain Socket
    if (this.config.enableUnixSocket) {
      await this.startUnixSocket();
    }
    
    // TCP with optional TLS
    if (this.config.enableTcp) {
      await this.startTcpServer();
    }
  }
  
  private setupInterceptors(): void {
    const interceptors = createInterceptors(this.container);
    this.server.addInterceptor(interceptors.auth);
    this.server.addInterceptor(interceptors.logging);
    this.server.addInterceptor(interceptors.metrics);
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
    metadata: grpc.Metadata,
    call: grpc.ServerUnaryCall<SearchDocsRequest, SearchDocsResponse>
  ): Promise<SearchDocsResponse> {
    try {
      this.logger.info('SearchDocs request', { 
        query: request.query,
        topK: request.top_k,
        userId: metadata.get('user-id')[0]
      });
      
      // Input validation
      if (!request.query || request.query.length === 0) {
        throw new Error('Query is required');
      }
      
      if (request.top_k < 1 || request.top_k > 50) {
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

**Step 31 COMPLETED** → **Step 32**: Core Search Endpoints Implementation
- **High-performance search services** using the gRPC transport layer
- **Semantic document discovery** with metadata filtering and similarity scoring
- **Chunk-level search** with text previews and token limiting
- **Advanced search features** with complex filtering and ranking
- **Search performance optimization** with caching and indexing

---

**Step 31 Status**: 🚀 **READY TO START**  
**Priority**: 🔥 **CRITICAL - Core Transport Infrastructure**  
**Dependencies**: ✅ **All Met** (Step 30 Protocol Buffer Schema Complete)

---

*This document serves as the complete implementation guide for Step 31. Update checkboxes as tasks are completed and add implementation notes as development progresses.*
