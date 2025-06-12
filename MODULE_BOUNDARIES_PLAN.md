# Module Boundaries Plan

## Overview
This document outlines the module boundaries for the folder-mcp project, defining the responsibilities of each module and the allowed interactions between them.

## Layer Structure

### Domain Layer
**Location**: `src/domain`
- Contains core business logic and entities
- No dependencies on other layers
- Defines abstract interfaces for repositories and services
- Pure TypeScript with no external dependencies

### Application Layer
**Location**: `src/application`
- Contains application-specific business logic
- Orchestrates domain objects to accomplish use cases
- Can depend on domain layer only
- Defines service interfaces implemented in infrastructure

### Infrastructure Layer
**Location**: `src/infrastructure`
- Contains implementation details of services
- Can depend on domain and application layers
- External integrations (filesystem, network, etc.)
- Concrete implementations of abstract repositories

### Interface Layer
**Location**: `src/interfaces`
- Contains UI, API, and other entry points
- Can depend on application layer and shared utilities
- Components:
  - CLI interface (`src/interfaces/cli`)
  - MCP interface (`src/interfaces/mcp`)
  - API interface (`src/interfaces/api`)

### Shared Layer
**Location**: `src/shared`
- Contains utilities shared across layers
- No dependencies on any other layer
- Purely functional helpers, error types, etc.

## Dependency Injection
- DI Container: `src/di`
- Service registration
- Token-based service resolution
- Factory patterns for service creation

## MCP Module Boundaries
**Location**: `src/interfaces/mcp`
- Responsible for MCP protocol handling
- Structured as:
  - `server.ts` - Main MCP server class (thin delegation layer)
  - `transport.ts` - Stdio transport wrapper
  - `handlers/` - Tool implementation handlers
  - `types.ts` - MCP-specific types and interfaces
- Allowed dependencies:
  - Can import from application layer
  - Can import from shared utilities
  - MUST NOT import from other interface modules
  - MUST NOT import from infrastructure directly

## Enforcement
- Architectural tests enforce these boundaries
- CI pipeline validates boundary violations
- Code reviews should check for proper layer separation
