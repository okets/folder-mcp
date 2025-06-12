# folder-mcp Project Information

**Universal Folder-to-MCP-Server Tool**

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Coding Guidelines](#4-coding-guidelines)
5. [Development Progress Summary](#5-development-progress-summary)

---

## 1. Project Overview

### Core Purpose
Transform any local folder into an intelligent knowledge base that LLMs can query for context-aware responses.

### What it does
- Scans a folder and parses all document types (PDFs, PowerPoint, Excel, Word, text files)
- Extracts meaningful content while preserving document structure and relationships
- Creates semantic embeddings for intelligent retrieval
- Serves the content via MCP (Model Context Protocol) so any LLM can access your data
- Enables RAG (Retrieval-Augmented Generation) for accurate, context-specific responses

### Key Features
- Universal file support with intelligent parsing
- Structure preservation (slides, tables, sections - not just raw text)
- Smart chunking by meaning, not arbitrary sizes
- Rich metadata tracking for precise retrieval
- Smart caching system - embeddings stored in .folder-mcp
- Incremental updates - only processes changed files

### Transport Architecture (New in v1.0.0)
- **Multi-Protocol Support**: gRPC (local/remote) + HTTP REST gateway for universal compatibility
- **14 Comprehensive Endpoints**: Document search, folder navigation, content access, summarization, table queries, and system management
- **High Performance**: Unix domain sockets for local communication, TCP with mTLS for distributed deployments
- **Token-Aware**: All endpoints respect LLM context limits with configurable token boundaries
- **Production Ready**: Authentication, monitoring, streaming, and batch operations built-in

---

## 2. Tech Stack

### Core Technologies
- **Language**: TypeScript
- **Runtime**: Node.js
- **Build Tool**: TSC (TypeScript Compiler)
- **Package Manager**: npm

### Dependencies

#### File Parsing
- `pdf-parse` - PDF text extraction
- `mammoth` - Word document parsing
- `xlsx` - Excel file parsing
- `node-pptx-parser` - PowerPoint parsing

#### AI & Embeddings
- `@xenova/transformers` - Client-side Hugging Face models
- `faiss-node` - Facebook's vector similarity search

#### MCP & Infrastructure
- `@modelcontextprotocol/sdk` - Anthropic's MCP SDK
- `commander` - Command-line interface
- `glob` - File pattern matching
- `chokidar` - File watching
- `crypto` (built-in) - File hashing

#### Transport & Communication
- `@grpc/grpc-js` - gRPC client and server
- `@grpc/proto-loader` - Protocol Buffer loading
- `express` - HTTP gateway server
- `cors` - Cross-origin resource sharing
- `helmet` - Security middleware

#### Security & Authentication
- `crypto` (built-in) - API key generation and hashing
- `jsonwebtoken` - JWT token handling (optional)
- `rate-limiter-flexible` - Rate limiting
- `node-forge` - TLS certificate generation

#### Development Dependencies
- `vitest` - Fast unit testing
- `@types/node` - TypeScript definitions
- `eslint` - Code linting
- `@typescript-eslint/parser` - TypeScript ESLint
- `prettier` - Code formatting

---

## 3. Project Structure

```
folder-mcp/
├── src/
│   ├── index.ts          # Main entry point
│   ├── cli/              # CLI commands
│   ├── parsers/          # File parsers
│   ├── embeddings/       # Embedding logic
│   ├── cache/            # Cache management
│   ├── search/           # Vector search
│   ├── mcp/              # MCP server (legacy)
│   ├── transport/        # gRPC & HTTP transport
│   │   ├── grpc/         # gRPC server implementation
│   │   ├── http/         # HTTP gateway
│   │   └── security/     # Authentication & authorization
│   ├── endpoints/        # API endpoint implementations
│   └── proto/            # Protocol Buffer definitions
├── tests/
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE
```

---

## 4. Coding Guidelines

### Type Safety
- Add strict null checks throughout the codebase
- Replace remaining any types with proper interfaces
- Add comprehensive JSDoc documentation for all public APIs
- Implement strict TypeScript compiler options

### Code Quality
- Always implement proper dependency injection
- Always add proper module boundaries

---

## 5. Development Progress Summary

**Current Status**: Step 34/57 - Phase 7 Completed, Phase 8 Transport & Endpoints In Progress 🚀

### Overall Timeline
- **✅ Phases 1-7**: Foundation through Production Ready (Steps 1-25) - **COMPLETED**
- **🔄 Phase 8**: Transport Foundation & Core Endpoints (Steps 29, 34-39) - **IN PROGRESS** 
- **📋 Phase 9**: Advanced Endpoints & HTTP Gateway (Steps 29, 40-47) - **PLANNED**
- **📋 Phase 10**: Release Preparation (Steps 48-52) - **PLANNED**
- **📋 Phase 11**: UX Refinements (Steps 30-33) - **PLANNED**
- **📋 Phase 12**: Chat Interface Integration (Steps 53-57) - **FUTURE**

For detailed information about completed and upcoming tasks, see:
- [Completed Tasks](./completed_tasks.md) - All completed phases and detailed implementation notes
- [Upcoming Tasks](./upcoming_tasks.md) - Current and future phases with detailed specifications
