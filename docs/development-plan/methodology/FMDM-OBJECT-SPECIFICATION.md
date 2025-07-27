# FMDM (Folder MCP Data Model) Object Specification

## Overview

The FMDM (Folder MCP Data Model) is the central data structure that represents the complete state of the folder-mcp system. It serves as the single source of truth for all connected clients and is broadcast by the daemon whenever state changes occur.

## Design Principles

1. **Client-Focused**: Only contains data that clients need to display or use for user interactions
2. **Daemon-Owned**: The daemon is the sole authority for FMDM updates
3. **Broadcast-Based**: Changes are pushed to all connected clients automatically
4. **Minimal**: Excludes internal daemon configuration and processing details

## FMDM Structure

```json
{
  "version": "1.0.0",
  
  "folders": [
    {
      "path": "/Users/hanan/Documents",
      "model": "nomic-embed-text"
    },
    {
      "path": "/Users/hanan/Projects/folder-mcp", 
      "model": "codebert-base"
    }
  ],
  
  "daemon": {
    "pid": 12345,
    "uptime": 172800
  },
  
  "connections": {
    "count": 2,
    "clients": [
      {
        "id": "tui-1234",
        "type": "tui",
        "connectedAt": "2025-07-27T10:15:00.000Z"
      },
      {
        "id": "tui-5678", 
        "type": "tui",
        "connectedAt": "2025-07-27T10:20:00.000Z"
      }
    ]
  },
  
  "models": [
    "nomic-embed-text",
    "all-mpnet-base-v2", 
    "all-MiniLM-L6-v2",
    "codebert-base",
    "mxbai-embed-large",
    "sentence-transformers/all-MiniLM-L12-v2",
    "BAAI/bge-small-en-v1.5",
    "thenlper/gte-small"
  ]
}
```

## Field Definitions

### `version` (string)
- **Purpose**: The installed folder-mcp release version
- **Format**: Semantic versioning (e.g., "1.0.0")
- **Usage**: Clients can check for available updates by comparing this version

### `folders` (array)
- **Purpose**: List of user-configured folders
- **Usage**: Display in folder list, manage folders

#### Folder Object:
- `path` (string): Absolute path to the monitored folder
- `model` (string): Selected embedding model for this folder

### `daemon` (object)
- **Purpose**: Current daemon process information
- **Usage**: Display connection status in UI

#### Fields:
- `pid` (number): Process ID of the daemon
- `uptime` (number): Seconds since daemon started

### `connections` (object)
- **Purpose**: Active client connection information
- **Usage**: Multi-client awareness, connection count display

#### Fields:
- `count` (number): Total number of connected clients
- `clients` (array): List of connected client details
  - `id` (string): Unique client identifier
  - `type` (string): Client type ("tui" | "cli" | "web")
  - `connectedAt` (string): ISO 8601 timestamp of connection

### `models` (array)
- **Purpose**: Available embedding models
- **Usage**: Populate model selection dropdowns in wizards
- **Values**: Array of model name strings

## What's NOT in FMDM

The following are explicitly excluded as they are daemon internals or client-specific:

1. **Client Preferences**: Theme, layout, UI settings (stored by each client)
2. **Processing Configuration**: Batch size, chunk size, overlap settings
3. **Validation Rules**: Internal validation logic
4. **File System Details**: Cache paths, temp directories
5. **Authentication**: Tokens, API keys
6. **Performance Metrics**: Memory usage, CPU stats (unless needed for display)

## Lifecycle

### 1. Initial Connection
When a client connects via WebSocket:
1. Client sends connection handshake
2. Daemon assigns client ID
3. Daemon sends complete FMDM
4. Client renders UI based on FMDM

### 2. State Changes
When state changes (e.g., folder added):
1. Daemon updates internal state
2. Daemon updates FMDM
3. Daemon broadcasts new FMDM to all clients
4. Clients compare new vs old FMDM
5. Clients update UI for changed sections

### 3. Client Disconnection
When a client disconnects:
1. Daemon removes client from connections list
2. Daemon broadcasts updated FMDM to remaining clients

## Future Extensibility

As new features are added, the FMDM can be extended by adding new fields to existing objects:

```json
{
  "version": "1.1.0",
  
  "folders": [
    {
      "path": "/Users/hanan/Documents",
      "model": "nomic-embed-text",
      // Future: Folder-specific status
      "status": "indexing",
      "indexing": {
        "progress": 67,
        "filesProcessed": 1234,
        "totalFiles": 1850
      },
      "lastIndexed": "2025-07-27T10:25:00.000Z"
    }
  ],
  
  "daemon": {...},
  "connections": {...},
  "models": [...],
  
  // Future: System capabilities
  "capabilities": {
    "gpuAvailable": true,
    "gpuType": "Apple M1"
  }
}
```

## Implementation Notes

1. **Immutability**: Clients should treat FMDM as read-only
2. **Atomic Updates**: Always send complete FMDM, not patches
3. **Efficient Comparison**: Clients should use efficient diffing to detect changes
4. **Type Safety**: Use TypeScript interfaces for FMDM structure

## TypeScript Interface

```typescript
interface FMDM {
  version: string;
  
  folders: Array<{
    path: string;
    model: string;
  }>;
  
  daemon: {
    pid: number;
    uptime: number;
  };
  
  connections: {
    count: number;
    clients: Array<{
      id: string;
      type: 'tui' | 'cli' | 'web';
      connectedAt: string;
    }>;
  };
  
  models: string[];
}
```