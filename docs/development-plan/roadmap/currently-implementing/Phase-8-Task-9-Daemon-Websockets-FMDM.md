# Phase 8 Task 9: Daemon WebSocket Communication with FMDM Architecture

**Status**: 🚧 IN PROGRESS  
**Priority**: 🔥 CRITICAL - Foundation for all future client-server architecture  
**Started**: 2025-07-27  

## Overview

Implement a **unified daemon architecture** that provides both WebSocket-based internal communication (TUI/CLI ↔ Daemon) and REST-based external communication (Claude Desktop ↔ MCP endpoints) in a single process. The daemon maintains the FMDM (Folder MCP Data Model) as the single source of truth and broadcasts updates to all connected clients whenever state changes.

## Unified Daemon Architecture

### **Single Process, Dual Servers Design**

The new daemon runs **two servers simultaneously** in one process:

```
┌─────────────────┐    WebSocket     ┌──────────────────┐    REST/HTTP    ┌─────────────────┐
│  TUI Clients    │◄─────────────────┤   Unified        ├─────────────────►│ Claude Desktop  │
│  CLI Clients    │   Port 31849     │   Daemon         │   Port 31850    │ External LLMs   │
│  Web Clients    │   (FMDM sync)    │   Process        │  (MCP endpoints)│                 │
└─────────────────┘                  └──────────────────┘                 └─────────────────┘
```

### **Communication Protocols**

1. **WebSocket Server (Port 31849)** - Internal Communication
   - **Purpose**: TUI/CLI folder management via FMDM protocol
   - **Clients**: First Run Wizard, Main TUI, Add Folder Wizard, CLI commands
   - **Protocol**: FMDM WebSocket messages (folder.add, folder.validate, etc.)

2. **REST Server (Port 31850)** - External Communication  
   - **Purpose**: MCP endpoints for Claude Desktop integration
   - **Clients**: Claude Desktop, External LLMs, API consumers
   - **Protocol**: Standard REST/HTTP with MCP JSON-RPC

### **Shared Business Logic**

Both servers access the same underlying services:
- **FMDM Service**: Single source of truth state management
- **Configuration Service**: Centralized folder configuration
- **Indexing Service**: Document processing and search indices
- **Validation Service**: Folder path and configuration validation

### **Benefits of Unified Architecture**

1. **Service Management Simplicity**: One process to start/stop/monitor
2. **Resource Efficiency**: Shared memory for indices, caches, file watchers
3. **Data Consistency**: Same data source for internal and external APIs
4. **Synchronization**: TUI changes immediately available to MCP endpoints

## Component Migration Strategy

### **Migration from Direct Configuration Access to FMDM WebSocket**

Currently, TUI components directly access `ConfigurationComponent` and `FolderValidationService`. These must be migrated to use the FMDM WebSocket protocol instead.

### **Primary Migration Targets (Critical)**

#### **1. TUI Entry Point** (`src/interfaces/tui-ink/index.tsx`)
- **Current Usage**: `configComponent.addFolder()`, `configComponent.validate()`
- **Impact**: Main entry point with CLI parameter handling and cascading flow logic
- **Migration**: Replace with FMDM WebSocket client calls

#### **2. App Main Screen** (`src/interfaces/tui-ink/AppFullscreen.tsx`)
- **Current Usage**: `ConfigurationComponent` import for folder management
- **Impact**: Main screen folder display and management interface
- **Migration**: Use FMDM context for folder list display

#### **3. First Run Wizard** (`src/interfaces/tui-ink/components/FirstRunWizard.tsx`)
- **Current Usage**: `ConfigurationComponent` for initial folder setup
- **Impact**: Critical for first-time user experience and onboarding
- **Migration**: Use FMDM WebSocket for folder creation

#### **4. Add Folder Wizard** (`src/interfaces/tui-ink/components/AddFolderWizard.tsx`)
- **Current Usage**: `FolderValidationService` for real-time validation
- **Impact**: Folder addition workflow and user experience
- **Migration**: Use FMDM WebSocket for validation and adding

#### **5. File Picker Component** (`src/interfaces/tui-ink/components/core/FilePickerListItem.tsx`)
- **Current Usage**: `FolderValidationService` for path validation during browsing
- **Impact**: Real-time validation while navigating folder structure
- **Migration**: Use FMDM WebSocket validation endpoint

### **Secondary Migration Targets**

- **Theme/Config Services**: `ConfigurableThemeService.ts`, `ConfigurationThemeProvider.tsx`
- **CLI Commands**: `src/interfaces/cli/commands/config.ts`, `simple-config.ts`
- **Other Components**: Various validation and configuration utilities

### **Migration Pattern**

**Before (Direct Configuration Access):**
```typescript
// Current pattern - direct service calls
const configComponent = container.resolve<ConfigurationComponent>(...);
await configComponent.addFolder(path, model);
const folders = await configComponent.getFolders();
await validationService.validate(path);
```

**After (FMDM WebSocket Communication):**
```typescript
// New pattern - WebSocket-based communication
const { fmdm, addFolder, validateFolder } = useFMDM();
await addFolder(path, model);
const folders = fmdm?.folders || [];
await validateFolder(path);
```

### **TUI Cascading Flow Preservation**

The migration must preserve the existing TUI cascading flow logic:

**Without Parameters:**
```bash
folder-mcp  # or npm run tui
```
1. Check if folders are configured via FMDM
2. **If no folders** → First Run Wizard → Create folder via WebSocket → Main TUI
3. **If folders exist** → Main TUI directly

**With Parameters:**
```bash
folder-mcp -d /path/to/folder -m some-model
```
1. **If -d or -m provided** → Add Folder Wizard (pre-populated) → Main TUI
2. All folder operations go through FMDM WebSocket protocol

## Core Architecture Principles

1. **FMDM as Single Source of Truth**: Daemon owns and manages the complete system state
2. **Validation Separation**: Real-time validation via dedicated endpoint before actions
3. **Simple Action Responses**: Actions return only success/failure
4. **State via Broadcasts**: All state updates come through FMDM broadcasts
5. **Client Simplicity**: Clients validate, act, then react to new FMDM

## Implementation Guidelines

### Dependency Injection Requirements
- **All services MUST be registered in DI container**: Register new services in `src/di/setup.ts`
- **No direct imports of services**: Use container resolution, not `new Service()` or `import { service }`
- **Follow existing DI patterns**: Look at current daemon DI setup for consistency
- **Clean dependency graphs**: Services should only depend on abstractions, not concrete implementations

### Module Boundary Requirements
- **Clear separation of concerns**: WebSocket logic separate from business logic separate from data models
- **No circular dependencies**: Services in different layers should have clear dependency direction
- **Shared types in separate modules**: Protocol types, FMDM interfaces should be importable by both daemon and TUI
- **Interface segregation**: Each service should have focused, single-responsibility interfaces

### Human Verification Points
- **End-to-end testing required**: Major integration points require human verification using actual TUI
- **Protocol compliance**: All WebSocket messages must exactly match specification
- **Performance verification**: Multi-client scenarios must be tested with real TUI instances

## WebSocket Protocol Design

### Client → Daemon Messages

#### 1. Connection Initialization
```typescript
{
  type: "connection.init",
  clientType: "tui" | "cli" | "web"
}
```

#### 2. Folder Validation (Real-time)
```typescript
{
  type: "folder.validate",
  id: string,  // Correlation ID
  payload: {
    path: string
  }
}
```

#### 3. Add Folder
```typescript
{
  type: "folder.add",
  id: string,
  payload: {
    path: string,
    model: string
  }
}
```

#### 4. Remove Folder
```typescript
{
  type: "folder.remove",
  id: string,
  payload: {
    path: string
  }
}
```

#### 5. Heartbeat
```typescript
{
  type: "ping",
  id: string
}
```

### Daemon → Client Messages

#### 1. FMDM Update (Broadcast to all clients)
```typescript
{
  type: "fmdm.update",
  fmdm: {
    version: string,
    folders: Array<{
      path: string,
      model: string
    }>,
    daemon: {
      pid: number,
      uptime: number
    },
    connections: {
      count: number,
      clients: Array<{
        id: string,
        type: string,
        connectedAt: string
      }>
    },
    models: string[]
  }
}
```

#### 2. Validation Response
```typescript
{
  id: string,  // Matches request ID
  valid: boolean,
  errors: Array<{
    type: "not_exists" | "not_directory" | "duplicate" | "subfolder",
    message: string
  }>,
  warnings: Array<{
    type: "ancestor",
    message: string,
    affectedFolders?: string[]
  }>
}
```

#### 3. Action Response (Simple)
```typescript
{
  id: string,  // Matches request ID
  success: boolean,
  error?: string  // Only present if success is false
}
```

#### 4. Heartbeat Response
```typescript
{
  type: "pong",
  id: string
}
```

## Example Flows

### Flow 1: Adding a Regular Folder

```
1. User navigates to folder in TUI
   Client → Daemon: {"type": "folder.validate", "id": "v1", "payload": {"path": "/Users/test"}}
   Daemon → Client: {"id": "v1", "valid": true, "errors": [], "warnings": []}

2. User clicks "Add Folder"
   Client → Daemon: {"type": "folder.add", "id": "a1", "payload": {"path": "/Users/test", "model": "nomic-embed-text"}}
   Daemon → Client: {"id": "a1", "success": true}

3. Daemon updates internal state and broadcasts
   Daemon → ALL Clients: {"type": "fmdm.update", "fmdm": {...}}

4. All TUIs update their display based on new FMDM
```

### Flow 2: Adding an Ancestor Folder

```
1. User navigates to /Users/hanan (ancestor of /Users/hanan/Documents)
   Client → Daemon: {"type": "folder.validate", "id": "v2", "payload": {"path": "/Users/hanan"}}
   Daemon → Client: {
     "id": "v2", 
     "valid": true, 
     "errors": [], 
     "warnings": [{
       "type": "ancestor",
       "message": "This folder is an ancestor of 1 existing folder",
       "affectedFolders": ["/Users/hanan/Documents"]
     }]
   }

2. TUI shows warning but allows action
   User clicks "Add Folder" anyway
   Client → Daemon: {"type": "folder.add", "id": "a2", "payload": {"path": "/Users/hanan", "model": "nomic-embed-text"}}
   Daemon → Client: {"id": "a2", "success": true}

3. Daemon internally:
   - Removes /Users/hanan/Documents from config
   - Adds /Users/hanan to config
   - Updates FMDM
   - Broadcasts new state

4. All clients receive updated FMDM showing only /Users/hanan
```

### Flow 3: Validation Error (Blocked)

```
1. User navigates to non-existent folder
   Client → Daemon: {"type": "folder.validate", "id": "v3", "payload": {"path": "/does/not/exist"}}
   Daemon → Client: {
     "id": "v3",
     "valid": false,
     "errors": [{"type": "not_exists", "message": "Folder does not exist"}],
     "warnings": []
   }

2. TUI disables "Add Folder" button, shows error
```

## Sub-Task Implementation Plan

### Sub-Task 9.1: Create FMDM TypeScript Interfaces ✅ COMPLETED
**Priority**: HIGH  
**Estimated Time**: 30 minutes  

**Files**:
- Create `src/daemon/models/fmdm.ts`

**Implementation**:
```typescript
export interface FMDM {
  version: string;
  folders: FolderConfig[];
  daemon: DaemonStatus;
  connections: ConnectionInfo;
  models: string[];
}

export interface FolderConfig {
  path: string;
  model: string;
}

export interface DaemonStatus {
  pid: number;
  uptime: number;
}

export interface ConnectionInfo {
  count: number;
  clients: ClientConnection[];
}

export interface ClientConnection {
  id: string;
  type: 'tui' | 'cli' | 'web';
  connectedAt: string;
}
```

**Success Criteria**:
- [x] TypeScript interfaces match FMDM specification
- [x] No compilation errors
- [x] Interfaces exported for use in other modules

**Manual Test**:
```bash
npm run build
# Should compile without errors
```

**🛑 HUMAN VERIFICATION REQUIRED**:
- [ ] Confirm TypeScript compilation passes
- [ ] Verify all interfaces match FMDM specification exactly
- [ ] Check that exports work correctly in other modules

---

### Sub-Task 9.2: Add WebSocket Server to Daemon ✅ COMPLETED
**Priority**: HIGH  
**Estimated Time**: 2 hours  

**Files**:
- Create `src/daemon/websocket/server.ts`
- Update `src/daemon/index.ts`

**Implementation Steps**:
1. Install ws package: `npm install ws @types/ws`
2. Create WebSocket server on port 31849
3. Handle client connections
4. Implement message routing

**Success Criteria**:
- [x] WebSocket server starts on ws://127.0.0.1:31849
- [x] Accepts connections
- [x] Routes messages by type
- [x] Tracks connected clients

**DI Integration**:
- Register WebSocketServer in `src/di/setup.ts`
- Inject dependencies via container, not direct imports
- Follow existing DI patterns from current daemon structure

**Manual Test**:
```bash
# Terminal 1: Start daemon
folder-mcp --daemon

# Terminal 2: Test connection
wscat -c ws://127.0.0.1:31849
Connected (press CTRL+C to quit)
```

**🛑 HUMAN VERIFICATION REQUIRED**:
- [ ] Confirm WebSocket server starts without errors
- [ ] Verify wscat can connect successfully
- [ ] Test that daemon logs show client connections
- [ ] Ensure DI registration works correctly

---

### Sub-Task 9.3: Implement FMDM Service ✅ COMPLETED
**Priority**: HIGH  
**Estimated Time**: 2 hours  

**Files**:
- Create `src/daemon/services/fmdm-service.ts`

**Implementation**:
```typescript
export class FMDMService {
  private fmdm: FMDM;
  private listeners: Set<(fmdm: FMDM) => void> = new Set();
  
  constructor(
    private configService: ConfigurationService,
    private daemonInfo: DaemonInfo
  ) {
    this.fmdm = this.buildFMDM();
  }
  
  private buildFMDM(): FMDM {
    return {
      version: this.daemonInfo.version,
      folders: this.configService.getFolders(),
      daemon: {
        pid: process.pid,
        uptime: process.uptime()
      },
      connections: {
        count: 0,
        clients: []
      },
      models: this.getAvailableModels()
    };
  }
  
  getFMDM(): FMDM {
    return this.fmdm;
  }
  
  updateFolders(): void {
    this.fmdm = this.buildFMDM();
    this.broadcast();
  }
  
  addClient(client: ClientConnection): void {
    this.fmdm.connections.clients.push(client);
    this.fmdm.connections.count = this.fmdm.connections.clients.length;
    this.broadcast();
  }
  
  removeClient(clientId: string): void {
    this.fmdm.connections.clients = this.fmdm.connections.clients.filter(
      c => c.id !== clientId
    );
    this.fmdm.connections.count = this.fmdm.connections.clients.length;
    this.broadcast();
  }
  
  private broadcast(): void {
    this.listeners.forEach(listener => listener(this.fmdm));
  }
  
  subscribe(listener: (fmdm: FMDM) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
```

**DI Integration**:
- Register FMDMService in `src/di/setup.ts`
- Inject ConfigurationService and other dependencies
- Follow dependency injection patterns, no direct imports

**Success Criteria**:
- [ ] FMDM service builds correct structure
- [ ] Broadcasts on changes
- [ ] Manages client connections
- [ ] Subscription mechanism works

**🛑 HUMAN VERIFICATION REQUIRED**:
- [x] Confirm FMDM service instantiates correctly via DI
- [x] Verify FMDM structure matches specification exactly
- [x] Test that broadcast mechanism works with mock listeners

**✅ COMPLETED** - All requirements met

---

### Sub-Task 9.4: Implement WebSocket Message Protocol ✅ COMPLETED
**Priority**: HIGH  
**Estimated Time**: 2 hours  

**Files**:
- Create `src/daemon/websocket/protocol.ts`
- Create `src/daemon/websocket/message-types.ts`

**Define Message Types**:
```typescript
// Client → Daemon
export interface WSClientMessage {
  type: 'connection.init' | 'folder.validate' | 'folder.add' | 'folder.remove' | 'ping';
  id?: string;
  clientType?: string;
  payload?: any;
}

// Daemon → Client
export interface WSServerMessage {
  type?: 'fmdm.update' | 'pong';
  id?: string;
  success?: boolean;
  error?: string;
  valid?: boolean;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
  fmdm?: FMDM;
}
```

**Module Boundaries**:
- Protocol types in separate module for reuse
- Clear separation between client and server message types
- Export interfaces for use in both daemon and TUI

**Success Criteria**:
- [ ] Message types defined
- [ ] Type safety for all messages
- [ ] Clear protocol documentation

**🛑 HUMAN VERIFICATION REQUIRED**:
- [x] Confirm all message types compile without errors
- [x] Verify protocol matches specification exactly
- [x] Test that types work in both daemon and client contexts

**✅ COMPLETED** - All requirements met

---

### Sub-Task 9.5: Connect WebSocket Server to FMDM Service ✅ COMPLETED
**Priority**: HIGH  
**Estimated Time**: 1 hour  

**Files**:
- Update `src/daemon/websocket/server.ts`

**Implementation**:
1. Inject FMDMService into WebSocketServer
2. Send FMDM on client connection
3. Subscribe to FMDM changes
4. Broadcast updates to all clients

**Success Criteria**:
- [ ] New clients receive FMDM immediately
- [ ] All clients receive FMDM broadcasts
- [ ] Connection count updates correctly

**DI Integration**:
- Inject FMDMService into WebSocketServer constructor
- Use proper dependency resolution, no direct service creation
- Maintain clean separation between WebSocket and FMDM concerns

**Manual Test**:
```bash
# Connect two clients and verify both receive updates
# Terminal 1: wscat -c ws://127.0.0.1:31849
# Terminal 2: wscat -c ws://127.0.0.1:31849
# Both should receive FMDM with connections.count = 2
```

**🛑 HUMAN VERIFICATION REQUIRED - END-TO-END TEST**:
- [x] Start daemon and connect 2 wscat clients
- [x] Verify both receive initial FMDM with correct connection count
- [x] Disconnect one client, verify remaining client gets updated FMDM
- [x] Confirm FMDM structure exactly matches specification

**✅ COMPLETED** - All requirements met. Testing instructions provided.

---

### Sub-Task 9.6: Migrate ConfigurationComponent to Daemon ✅ COMPLETED
**Priority**: HIGH  
**Estimated Time**: 2 hours  

**Files**:
- Create `src/daemon/services/configuration-service.ts`
- Update daemon initialization

**Implementation**:
1. Wrap ConfigurationComponent for daemon use
2. Initialize on daemon startup
3. Connect to FMDM service
4. Handle configuration persistence

**DI Integration**:
- Register ConfigurationService in daemon DI container
- Inject existing ConfigurationComponent, don't recreate
- Maintain module boundaries - service wraps component cleanly

**Success Criteria**:
- [ ] Configuration loads in daemon
- [ ] FMDM reflects configuration
- [ ] Changes persist to disk

**🛑 HUMAN VERIFICATION REQUIRED**:
- [ ] Confirm configuration service instantiates correctly
- [ ] Verify FMDM shows correct folder list from config
- [ ] Test that configuration changes persist to disk

**🧪 TESTING INSTRUCTIONS**:
```bash
# 1. Build and start test daemon
npm run build
npm run test:daemon

# 2. Test configuration loading
npm run test:websocket

# 3. Manual verification - add folder via WebSocket
wscat -c ws://127.0.0.1:31849
> {"type": "connection.init", "clientType": "tui"}
> {"type": "folder.add", "id": "test1", "payload": {"path": "/Users/test", "model": "nomic-embed-text"}}

# 4. Verify config file updated
cat ~/.folder-mcp/config.yaml

# 5. Restart daemon and verify folder persisted
# Stop daemon (Ctrl+C), restart, check FMDM contains folder
```

**Expected Results**:
- Configuration loads correctly into FMDM on daemon start
- Folder add/remove operations persist to config file
- Restarting daemon preserves folder configuration
- FMDM always reflects current config state

---

### Sub-Task 9.7: Implement Folder Validation Handler ✅ COMPLETED
**Priority**: HIGH  
**Estimated Time**: 2 hours  

**Files**:
- Create `src/daemon/websocket/handlers/validation-handler.ts`
- Move `src/interfaces/tui-ink/services/FolderValidationService.ts` to daemon

**Implementation**:
```typescript
export class ValidationHandler {
  constructor(
    private configService: ConfigurationService,
    private validationService: FolderValidationService
  ) {}
  
  async handleValidateFolder(message: WSClientMessage): Promise<WSServerMessage> {
    const { path } = message.payload;
    const result = await this.validationService.validate(path);
    
    return {
      id: message.id,
      valid: result.isValid,
      errors: result.errors,
      warnings: result.warnings
    };
  }
}
```

**Success Criteria**:
- [ ] Validation endpoint works
- [ ] Returns errors for invalid paths
- [ ] Returns warnings for ancestors
- [ ] Fast response time

**DI Integration**:
- Register ValidationHandler in daemon DI container
- Inject ConfigurationService and FolderValidationService
- Move FolderValidationService from TUI to daemon infrastructure layer

**Module Boundaries**:
- FolderValidationService moves to `src/daemon/services/`
- Keep validation logic separate from WebSocket handling
- Maintain clean interface between validation and configuration

**Manual Test**:
```javascript
// Test validation via wscat
> {"type": "folder.validate", "id": "1", "payload": {"path": "/Users/test"}}
< {"id": "1", "valid": true, "errors": [], "warnings": []}

> {"type": "folder.validate", "id": "2", "payload": {"path": "/does/not/exist"}}
< {"id": "2", "valid": false, "errors": [{"type": "not_exists", "message": "Folder does not exist"}], "warnings": []}
```

**🛑 HUMAN VERIFICATION REQUIRED - END-TO-END TEST**:
- [ ] Start daemon and connect wscat
- [ ] Test valid folder path validation
- [ ] Test invalid folder path validation
- [ ] Test ancestor folder detection with warnings
- [ ] Verify all validation responses match protocol exactly

**🧪 TESTING INSTRUCTIONS**:
```bash
# 1. Build and start test daemon
npm run build
npm run test:daemon

# 2. Test validation via automated script
npm run test:websocket

# 3. Manual validation testing
wscat -c ws://127.0.0.1:31849

# Test valid folder
> {"type": "folder.validate", "id": "v1", "payload": {"path": "/Users"}}
# Expected: {"id": "v1", "valid": true, "errors": [], "warnings": []}

# Test invalid folder
> {"type": "folder.validate", "id": "v2", "payload": {"path": "/does/not/exist"}}
# Expected: {"id": "v2", "valid": false, "errors": [{"type": "not_exists", "message": "..."}], "warnings": []}

# Test ancestor scenario (after adding a subfolder first)
> {"type": "folder.add", "id": "a1", "payload": {"path": "/Users/test/subfolder", "model": "test"}}
> {"type": "folder.validate", "id": "v3", "payload": {"path": "/Users/test"}}
# Expected: {"id": "v3", "valid": true, "errors": [], "warnings": [{"type": "ancestor", "affectedFolders": ["/Users/test/subfolder"]}]}
```

**Expected Results**:
- Valid folders return `valid: true` with no errors
- Invalid folders return `valid: false` with specific error types
- Ancestor folders return warnings with affected folder list
- All responses include proper correlation IDs
- Validation is fast (< 100ms response time)

---

### Sub-Task 9.8: Implement Folder Action Handlers
**Priority**: HIGH  
**Estimated Time**: 2 hours  

**Files**:
- Create `src/daemon/websocket/handlers/folder-handlers.ts`

**Implementation**:
```typescript
export class FolderHandlers {
  constructor(
    private configService: ConfigurationService,
    private fmdmService: FMDMService,
    private validationService: FolderValidationService
  ) {}
  
  async handleAddFolder(message: WSClientMessage): Promise<WSServerMessage> {
    const { path, model } = message.payload;
    
    // Validate first
    const validation = await this.validationService.validate(path);
    if (!validation.isValid) {
      return {
        id: message.id,
        success: false,
        error: validation.errors[0].message
      };
    }
    
    // Handle ancestor scenario
    if (validation.warnings?.some(w => w.type === 'ancestor')) {
      const affectedFolders = validation.warnings[0].affectedFolders || [];
      for (const folder of affectedFolders) {
        await this.configService.removeFolder(folder);
      }
    }
    
    // Add the folder
    await this.configService.addFolder(path, model);
    
    // Update FMDM
    this.fmdmService.updateFolders();
    
    return {
      id: message.id,
      success: true
    };
  }
  
  async handleRemoveFolder(message: WSClientMessage): Promise<WSServerMessage> {
    const { path } = message.payload;
    
    try {
      await this.configService.removeFolder(path);
      this.fmdmService.updateFolders();
      
      return {
        id: message.id,
        success: true
      };
    } catch (error) {
      return {
        id: message.id,
        success: false,
        error: error.message
      };
    }
  }
}
```

**DI Integration**:
- Register FolderHandlers in daemon DI container
- Inject ConfigurationService, FMDMService, and ValidationService
- Maintain clean separation between action handling and business logic

**Success Criteria**:
- [ ] Add folder works
- [ ] Remove folder works
- [ ] Ancestor replacement works
- [ ] FMDM broadcasts after changes

**🛑 HUMAN VERIFICATION REQUIRED - END-TO-END TEST**:
- [ ] Start daemon, connect wscat
- [ ] Test adding a valid folder - verify success response and FMDM broadcast
- [ ] Test removing a folder - verify success response and FMDM broadcast
- [ ] Test ancestor folder replacement scenario
- [ ] Verify all responses match protocol exactly

**🧪 TESTING INSTRUCTIONS**:
```bash
# 1. Build and start test daemon
npm run build
npm run test:daemon

# 2. Full automated testing
npm run test:websocket

# 3. Manual folder operations testing
# Terminal 1: wscat -c ws://127.0.0.1:31849
# Terminal 2: wscat -c ws://127.0.0.1:31849 (to verify broadcasts)

# Test add folder
> {"type": "folder.add", "id": "add1", "payload": {"path": "/Users/test", "model": "nomic-embed-text"}}
# Expected: {"id": "add1", "success": true}
# Both terminals should receive FMDM update with new folder

# Test remove folder
> {"type": "folder.remove", "id": "rem1", "payload": {"path": "/Users/test"}}
# Expected: {"id": "rem1", "success": true}
# Both terminals should receive FMDM update with folder removed

# Test ancestor replacement
> {"type": "folder.add", "id": "add2", "payload": {"path": "/Users/test/sub", "model": "test"}}
> {"type": "folder.add", "id": "add3", "payload": {"path": "/Users/test", "model": "test"}}
# Expected: add3 succeeds, /Users/test/sub automatically removed, FMDM shows only /Users/test

# Test error conditions
> {"type": "folder.add", "id": "err1", "payload": {"path": "/does/not/exist", "model": "test"}}
# Expected: {"id": "err1", "success": false, "error": "..."}
```

**Expected Results**:
- Add folder operations update FMDM and broadcast to all clients
- Remove folder operations update FMDM and broadcast to all clients
- Ancestor replacement removes descendant folders automatically
- Error responses include helpful error messages
- All operations maintain FMDM consistency

**🧑‍💻 HUMAN TESTING REQUIRED**:
After implementing Sub-Task 9.8, please verify:

1. **Start Test Environment**:
   ```bash
   # Terminal 1: Start daemon
   npm run build
   node test-daemon.js
   
   # Terminal 2: Connect first client
   wscat -c ws://127.0.0.1:31849
   
   # Terminal 3: Connect second client for broadcast verification
   wscat -c ws://127.0.0.1:31849
   ```

2. **Test Folder Add Operations**:
   ```json
   // Terminal 2: Add a folder
   {"type": "folder.add", "id": "add-test-1", "payload": {"path": "/Users/test/folder1", "model": "nomic-embed-text"}}
   ```
   - ✅ Verify Terminal 2 receives: `{"id": "add-test-1", "success": true}`
   - ✅ Verify both terminals receive FMDM update with new folder

3. **Test Folder Remove Operations**:
   ```json
   // Terminal 2: Remove the folder
   {"type": "folder.remove", "id": "rem-test-1", "payload": {"path": "/Users/test/folder1"}}
   ```
   - ✅ Verify Terminal 2 receives: `{"id": "rem-test-1", "success": true}`
   - ✅ Verify both terminals receive FMDM update with folder removed

4. **Test Ancestor Replacement**:
   ```json
   // Add subfolder first
   {"type": "folder.add", "id": "add-sub", "payload": {"path": "/Users/test/parent/child", "model": "test"}}
   // Then add parent folder (should remove child automatically)
   {"type": "folder.add", "id": "add-parent", "payload": {"path": "/Users/test/parent", "model": "test"}}
   ```
   - ✅ Verify both operations succeed
   - ✅ Verify final FMDM only contains `/Users/test/parent` (child removed)

5. **Test Error Conditions**:
   ```json
   // Try to add non-existent folder
   {"type": "folder.add", "id": "err-test", "payload": {"path": "/does/not/exist", "model": "test"}}
   ```
   - ✅ Verify receives: `{"id": "err-test", "success": false, "error": "..."}`
   - ✅ Verify error message is helpful and descriptive

**Expected Human Verification Outcomes**:
- All folder operations work as expected
- FMDM broadcasts reach all connected clients
- Error handling is robust and informative
- No daemon crashes or connection issues
- Response times are under 100ms for operations

---

### Sub-Task 9.9: Create TUI WebSocket Client
**Priority**: HIGH  
**Estimated Time**: 2 hours  

**Files**:
- Create `src/interfaces/tui-ink/services/FMDMClient.ts`

**Implementation**:
```typescript
export class FMDMClient {
  private ws: WebSocket | null = null;
  private fmdm: FMDM | null = null;
  private listeners = new Set<(fmdm: FMDM) => void>();
  private requests = new Map<string, (response: any) => void>();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnected = false;
  
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket('ws://127.0.0.1:31849');
      
      this.ws.on('open', () => {
        this.isConnected = true;
        this.ws!.send(JSON.stringify({
          type: 'connection.init',
          clientType: 'tui'
        }));
        resolve();
      });
      
      this.ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'fmdm.update') {
          this.fmdm = message.fmdm;
          this.notifyListeners();
        } else if (message.id && this.requests.has(message.id)) {
          const handler = this.requests.get(message.id)!;
          this.requests.delete(message.id);
          handler(message);
        }
      });
      
      this.ws.on('close', () => {
        this.isConnected = false;
        this.scheduleReconnect();
      });
      
      this.ws.on('error', reject);
    });
  }
  
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => this.scheduleReconnect());
    }, 1000);
  }
  
  async validateFolder(path: string): Promise<ValidationResult> {
    const id = this.generateId();
    return this.sendRequest({
      type: 'folder.validate',
      id,
      payload: { path }
    });
  }
  
  async addFolder(path: string, model: string): Promise<{ success: boolean; error?: string }> {
    const id = this.generateId();
    return this.sendRequest({
      type: 'folder.add',
      id,
      payload: { path, model }
    });
  }
  
  async removeFolder(path: string): Promise<{ success: boolean; error?: string }> {
    const id = this.generateId();
    return this.sendRequest({
      type: 'folder.remove',
      id,
      payload: { path }
    });
  }
  
  private sendRequest(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws || !this.isConnected) {
        reject(new Error('Not connected'));
        return;
      }
      
      this.requests.set(message.id, resolve);
      this.ws.send(JSON.stringify(message));
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.requests.has(message.id)) {
          this.requests.delete(message.id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }
  
  getFMDM(): FMDM | null {
    return this.fmdm;
  }
  
  subscribe(listener: (fmdm: FMDM) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  private notifyListeners(): void {
    if (!this.fmdm) return;
    this.listeners.forEach(listener => listener(this.fmdm!));
  }
  
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
```

**Module Boundaries**:
- FMDMClient in `src/interfaces/tui-ink/services/`
- Import FMDM types from daemon models
- Keep WebSocket logic separate from React components

**Success Criteria**:
- [ ] Client connects to daemon
- [ ] Receives FMDM on connection
- [ ] Can validate folders
- [ ] Can add/remove folders
- [ ] Auto-reconnects on disconnect

**🛑 HUMAN VERIFICATION REQUIRED**:
- [ ] Confirm FMDMClient compiles without errors
- [ ] Test client connection and reconnection logic
- [ ] Verify all WebSocket message types work correctly

**🧪 TESTING INSTRUCTIONS**:
```bash
# 1. Build the client
npm run build

# 2. Create test script for TUI client
# Create: test-tui-client.js
```

**Test Script (`test-tui-client.js`)**:
```javascript
const { FMDMClient } = require('./dist/interfaces/tui-ink/services/FMDMClient.js');

async function testTUIClient() {
  const client = new FMDMClient();
  
  // Test connection
  await client.connect();
  console.log('✅ Connected');
  
  // Test subscription
  const unsubscribe = client.subscribe((fmdm) => {
    console.log('🔄 FMDM Update:', fmdm.version);
  });
  
  // Test validation
  const validation = await client.validateFolder('/Users');
  console.log('📊 Validation:', validation);
  
  // Test folder operations
  const addResult = await client.addFolder('/tmp/test', 'nomic-embed-text');
  console.log('➕ Add result:', addResult);
  
  const removeResult = await client.removeFolder('/tmp/test');
  console.log('➖ Remove result:', removeResult);
  
  // Test reconnection
  console.log('🔌 Testing reconnection...');
  client.disconnect();
  await new Promise(r => setTimeout(r, 2000));
  await client.connect();
  console.log('✅ Reconnected');
  
  unsubscribe();
  client.disconnect();
}

testTUIClient().catch(console.error);
```

**Manual Testing**:
```bash
# 1. Start daemon
npm run test:daemon

# 2. Run TUI client test
node test-tui-client.js
```

**Expected Results**:
- Client connects successfully
- FMDM subscription receives updates
- Folder validation returns proper results
- Add/remove operations work correctly
- Auto-reconnection works after disconnection
- No memory leaks or hanging connections

---

### Sub-Task 9.10: Create FMDM React Context
**Priority**: HIGH  
**Estimated Time**: 1 hour  

**Files**:
- Create `src/interfaces/tui-ink/contexts/FMDMContext.tsx`

**Implementation**:
```typescript
interface FMDMContextValue {
  fmdm: FMDM | null;
  isConnected: boolean;
  validateFolder: (path: string) => Promise<ValidationResult>;
  addFolder: (path: string, model: string) => Promise<{ success: boolean; error?: string }>;
  removeFolder: (path: string) => Promise<{ success: boolean; error?: string }>;
}

const FMDMContext = React.createContext<FMDMContextValue | null>(null);

export const FMDMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fmdm, setFMDM] = useState<FMDM | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef<FMDMClient>();
  
  useEffect(() => {
    const client = new FMDMClient();
    clientRef.current = client;
    
    const unsubscribe = client.subscribe(setFMDM);
    
    client.connect()
      .then(() => setIsConnected(true))
      .catch(console.error);
    
    return () => {
      unsubscribe();
      client.disconnect();
    };
  }, []);
  
  const value: FMDMContextValue = {
    fmdm,
    isConnected,
    validateFolder: (path) => clientRef.current!.validateFolder(path),
    addFolder: (path, model) => clientRef.current!.addFolder(path, model),
    removeFolder: (path) => clientRef.current!.removeFolder(path)
  };
  
  return (
    <FMDMContext.Provider value={value}>
      {children}
    </FMDMContext.Provider>
  );
};

export const useFMDM = () => {
  const context = useContext(FMDMContext);
  if (!context) {
    throw new Error('useFMDM must be used within FMDMProvider');
  }
  return context;
};
```

**Module Boundaries**:
- React context in `src/interfaces/tui-ink/contexts/`
- Import FMDMClient from services layer
- Clean separation between context and client implementation

**Success Criteria**:
- [ ] Context provides FMDM access
- [ ] Tracks connection status
- [ ] Exposes action methods
- [ ] Updates on FMDM changes

**🛑 HUMAN VERIFICATION REQUIRED**:
- [ ] Confirm React context compiles without errors
- [ ] Test that context provides FMDM to child components
- [ ] Verify connection status updates correctly

**🧪 TESTING INSTRUCTIONS**:

**Test Component (`test-fmdm-context.tsx`)**:
```typescript
import React from 'react';
import { render } from 'ink-testing-library';
import { FMDMProvider, useFMDM } from '../src/interfaces/tui-ink/contexts/FMDMContext';

const TestComponent = () => {
  const { fmdm, isConnected, addFolder } = useFMDM();
  
  return (
    <div>
      Status: {isConnected ? 'Connected' : 'Disconnected'}
      Folders: {fmdm?.folders.length || 0}
      Version: {fmdm?.version || 'None'}
    </div>
  );
};

const App = () => (
  <FMDMProvider>
    <TestComponent />
  </FMDMProvider>
);

// Test rendering
const { lastFrame } = render(<App />);
console.log(lastFrame());
```

**Manual Testing**:
```bash
# 1. Start daemon
npm run test:daemon

# 2. Test context in TUI demo
npm run tuidemo

# 3. Create simple context test
npx tsx test-fmdm-context.tsx
```

**Expected Results**:
- Context provides FMDM data to child components
- Connection status updates correctly
- Folder operations work through context
- No React rendering errors or warnings
- Context handles connection failures gracefully

---

### Sub-Task 9.11: Update FilePickerListItem for WebSocket Validation
**Priority**: HIGH  
**Estimated Time**: 1 hour  

**Files**:
- Update `src/interfaces/tui-ink/components/core/FilePickerListItem.tsx`

**Changes**:
1. Replace FolderValidationService with FMDMContext validation
2. Call validateFolder during path selection
3. Display validation results in UI

**Module Boundaries**:
- Remove direct FolderValidationService dependency
- Use FMDMContext for validation instead of direct service calls
- Maintain clean component architecture

**Success Criteria**:
- [ ] Real-time validation works
- [ ] Shows errors for invalid paths
- [ ] Shows warnings for ancestors
- [ ] Responsive performance

**🛑 HUMAN VERIFICATION REQUIRED**:
- [ ] Confirm FilePickerListItem compiles without validation service
- [ ] Test real-time validation during folder browsing
- [ ] Verify validation responses appear correctly in UI

**🧪 TESTING INSTRUCTIONS**:
```bash
# 1. Start daemon with validation service
npm run test:daemon

# 2. Test file picker in isolation
# Create test-file-picker.tsx
```

**Test Component (`test-file-picker.tsx`)**:
```typescript
import React, { useState } from 'react';
import { render } from 'ink';
import { FMDMProvider } from '../src/interfaces/tui-ink/contexts/FMDMContext';
import { FilePickerListItem } from '../src/interfaces/tui-ink/components/core/FilePickerListItem';

const App = () => {
  const [selectedPath, setSelectedPath] = useState('/Users');
  
  return (
    <FMDMProvider>
      <FilePickerListItem
        selectedPath={selectedPath}
        onPathSelected={setSelectedPath}
        onValidation={(result) => console.log('Validation:', result)}
      />
    </FMDMProvider>
  );
};

render(<App />);
```

**Manual Testing**:
```bash
# 1. Start daemon
npm run test:daemon

# 2. Test file picker
npx tsx test-file-picker.tsx

# 3. Navigate through folders and observe:
#    - Real-time validation feedback
#    - Error/warning display
#    - Performance (should be responsive)

# 4. Test edge cases:
#    - Navigate to restricted folders
#    - Navigate to non-existent paths
#    - Navigate to folders already configured
```

**Expected Results**:
- Real-time validation as user navigates
- Visual feedback for valid/invalid/warning states
- No lag or stuttering during navigation
- Clear error messages for invalid paths
- Warning indicators for ancestor folders
- Validation requests are debounced for performance

**🧑‍💻 HUMAN TESTING REQUIRED**:
After implementing Sub-Task 9.11, please verify:

1. **Start Test Environment**:
   ```bash
   # Terminal 1: Start daemon
   npm run build
   node test-daemon.js
   
   # Terminal 2: Test file picker component
   npx tsx test-file-picker.tsx
   ```

2. **Test Real-Time Validation**:
   - ✅ Navigate through different folders using arrow keys
   - ✅ Observe validation status appearing immediately as you navigate
   - ✅ Verify validation messages appear in the UI
   - ✅ Check that validation is responsive (no lag or delays)

3. **Test Error Scenarios**:
   - ✅ Navigate to a folder that's already configured → should show duplicate error
   - ✅ Navigate to a subfolder of configured folder → should show subfolder error
   - ✅ Navigate to restricted/permission-denied folder → should show appropriate error

4. **Test Warning Scenarios**:
   - ✅ Navigate to parent folder of configured folders → should show ancestor warning
   - ✅ Verify warning displays affected folder list
   - ✅ Confirm warning allows selection (doesn't block)

5. **Test Performance**:
   - ✅ Navigate rapidly through many folders → validation should keep up
   - ✅ No visible stuttering or freezing during navigation
   - ✅ Validation requests should be debounced (not sent on every keystroke)

**Expected Human Verification Outcomes**:
- FilePickerListItem works without FolderValidationService dependency
- Real-time validation provides immediate feedback during navigation
- All validation error types display correctly with helpful messages
- Performance is smooth and responsive even with rapid navigation
- Component properly integrates with FMDM WebSocket protocol

---

### Sub-Task 9.12: Update TUI Components to Use FMDM
**Priority**: HIGH  
**Estimated Time**: 3 hours  

**Files to Update**:
- `src/interfaces/tui-ink/index.tsx` - Wrap with FMDMProvider
- `src/interfaces/tui-ink/AppFullscreen.tsx` - Use FMDM for folder list
- `src/interfaces/tui-ink/components/FirstRunWizard.tsx` - Use FMDM actions
- `src/interfaces/tui-ink/components/AddFolderWizard.tsx` - Use FMDM actions
- `src/interfaces/tui-ink/components/ManageFolderItem.tsx` - Use FMDM actions
- `src/interfaces/tui-ink/components/Header.tsx` - Show connection status

**Example Changes**:
```typescript
// Before
const configComponent = container.resolve<ConfigurationComponent>(...);
const folders = await configComponent.getFolders();

// After
const { fmdm } = useFMDM();
const folders = fmdm?.folders || [];
```

**Module Boundaries**:
- Remove all direct ConfigurationComponent usage from TUI
- Use FMDMContext exclusively for folder data and actions
- Maintain clean separation between TUI and daemon infrastructure

**Success Criteria**:
- [ ] TUI shows folders from FMDM
- [ ] Add folder uses WebSocket
- [ ] Remove folder uses WebSocket
- [ ] Connection status displays
- [ ] No direct config access

**🛑 HUMAN VERIFICATION REQUIRED - FULL TUI TEST**:
- [ ] Start daemon and launch TUI
- [ ] Verify TUI shows correct folder list from FMDM
- [ ] Test adding a folder through TUI - verify it appears immediately
- [ ] Test removing a folder through TUI - verify it disappears immediately
- [ ] Open second TUI instance and verify both stay synchronized
- [ ] Test connection status indicator works correctly

**🧑‍💻 COMPREHENSIVE HUMAN TESTING REQUIRED**:
After implementing Sub-Task 9.12, please verify complete TUI migration to WebSocket:

1. **Test Environment Setup**:
   ```bash
   # Terminal 1: Start daemon
   npm run build
   node test-daemon.js
   
   # Terminal 2: Launch TUI
   npm run tui
   
   # Terminal 3: WebSocket monitoring
   wscat -c ws://127.0.0.1:31849
   ```

2. **Test TUI-Daemon Connection**:
   - ✅ TUI starts successfully and connects to daemon
   - ✅ Connection status indicator shows "Connected" 
   - ✅ Folder list loads from FMDM (not direct config access)
   - ✅ Monitor Terminal 3 receives FMDM updates when TUI connects

3. **Test Add Folder Wizard**:
   ```bash
   # In TUI: Navigate to Add Folder, select a test folder
   ```
   - ✅ File picker shows real-time validation (errors/warnings)
   - ✅ Folder validation uses WebSocket (not FolderValidationService)
   - ✅ Successfully adding folder updates TUI immediately
   - ✅ Monitor Terminal 3 receives FMDM broadcast with new folder
   - ✅ No direct ConfigurationComponent calls (check logs)

4. **Test Multi-Client Synchronization**:
   ```bash
   # Terminal 4: Launch second TUI instance
   npm run tui
   ```
   - ✅ Both TUI instances show identical folder lists
   - ✅ Add folder in TUI #1 → appears immediately in TUI #2
   - ✅ Remove folder in TUI #2 → disappears immediately in TUI #1
   - ✅ All changes reflect in both instances within 100ms

5. **Test Error Handling & Connection Recovery**:
   ```bash
   # Stop daemon (Ctrl+C in Terminal 1), observe TUI behavior
   ```
   - ✅ TUI shows "Disconnected" status when daemon stops
   - ✅ TUI attempts auto-reconnection (retry indicator visible)
   - ✅ Restart daemon → TUI reconnects automatically
   - ✅ After reconnection, folder list syncs correctly

6. **Test Complete TUI Functionality**:
   - ✅ **FirstRunWizard**: Uses FMDM for initial folder setup
   - ✅ **AddFolderWizard**: Uses WebSocket validation, not direct service
   - ✅ **ManageFolderItem**: Remove operations via WebSocket
   - ✅ **Header**: Shows connection status and FMDM stats
   - ✅ **AppFullscreen**: Displays folders from FMDM, not config

7. **Verify Architecture Compliance**:
   ```bash
   # Check for any remaining direct config access
   grep -r "ConfigurationComponent\|FolderValidationService" src/interfaces/tui-ink/
   # Should return minimal or no results
   ```
   - ✅ No direct `ConfigurationComponent` imports in TUI components
   - ✅ No `FolderValidationService` imports in TUI components  
   - ✅ All folder operations go through `FMDMContext`
   - ✅ Clean separation between TUI and daemon infrastructure

**Expected Human Verification Outcomes**:
- **Complete Migration**: TUI uses WebSocket exclusively, no direct config access
- **Real-Time Sync**: All TUI instances stay synchronized via FMDM broadcasts
- **Robust Connection Handling**: Auto-reconnection and status indicators work
- **Seamless UX**: User experience is smooth with no noticeable change from old architecture
- **Performance**: No lag, stuttering, or delays in folder operations
- **Architecture Compliance**: Clean module boundaries maintained

---

### Sub-Task 9.13: Implement Smart Re-rendering Hook
**Priority**: MEDIUM  
**Estimated Time**: 1 hour  

**Files**:
- Create `src/interfaces/tui-ink/hooks/useFMDMSelector.ts`

**Implementation**:
```typescript
export function useFMDMSelector<T>(
  selector: (fmdm: FMDM) => T,
  equalityFn: (a: T, b: T) => boolean = Object.is
): T | null {
  const { fmdm } = useFMDM();
  const [selected, setSelected] = useState<T | null>(null);
  const prevSelectedRef = useRef<T | null>(null);
  
  useEffect(() => {
    if (!fmdm) {
      setSelected(null);
      return;
    }
    
    const newSelected = selector(fmdm);
    if (!equalityFn(newSelected, prevSelectedRef.current)) {
      prevSelectedRef.current = newSelected;
      setSelected(newSelected);
    }
  }, [fmdm, selector, equalityFn]);
  
  return selected;
}

// Usage examples:
const folders = useFMDMSelector(fmdm => fmdm.folders);
const connectionCount = useFMDMSelector(fmdm => fmdm.connections.count);
const daemonPid = useFMDMSelector(fmdm => fmdm.daemon.pid);
```

**Module Boundaries**:
- Hook in `src/interfaces/tui-ink/hooks/`
- Uses FMDMContext but provides optimized selectors
- Clean separation between selection logic and component rendering

**Success Criteria**:
- [ ] Components only re-render when their data changes
- [ ] No unnecessary re-renders
- [ ] Good performance with frequent updates

**🛑 HUMAN VERIFICATION REQUIRED**:
- [ ] Test selector hook with different FMDM sections
- [ ] Verify components using hook only re-render when relevant data changes
- [ ] Performance test with rapid FMDM updates

---

### Sub-Task 9.14: Multi-Client Testing
**Priority**: HIGH  
**Estimated Time**: 2 hours  

**Test Scenarios**:

1. **Basic Multi-Client Sync**:
   ```bash
   # Terminal 1: Start daemon
   folder-mcp --daemon
   
   # Terminal 2: TUI #1
   folder-mcp
   
   # Terminal 3: TUI #2
   folder-mcp
   
   # Add folder in TUI #1
   # Verify: Appears in TUI #2 immediately
   ```

2. **Ancestor Folder Replacement**:
   ```bash
   # Start with /Users/hanan/Documents in config
   # Add /Users/hanan in TUI #1
   # Verify: Both TUIs show only /Users/hanan
   ```

3. **Connection Recovery**:
   ```bash
   # Start daemon and TUI
   # Kill daemon
   # Verify: TUI shows disconnected
   # Restart daemon
   # Verify: TUI auto-reconnects and shows folders
   ```

**Success Criteria**:
- [ ] Multiple TUIs stay synchronized
- [ ] Ancestor replacement works correctly
- [ ] Connection recovery works
- [ ] Performance acceptable with 5+ clients

**🛑 HUMAN VERIFICATION REQUIRED - COMPREHENSIVE END-TO-END TEST**:
- [ ] Test basic multi-client sync scenario exactly as described
- [ ] Test ancestor folder replacement scenario with multiple TUIs
- [ ] Test connection recovery scenario with automatic reconnection
- [ ] Performance test with 5+ concurrent TUI clients
- [ ] Verify all FMDM broadcasts work correctly across all scenarios

**🧪 COMPREHENSIVE TESTING INSTRUCTIONS**:

**Test 1: Basic Multi-Client Sync**
```bash
# Terminal 1: Start daemon
npm run test:daemon

# Terminal 2: TUI #1
npm run tui

# Terminal 3: TUI #2
npm run tui

# Terminal 4: WebSocket client
wscat -c ws://127.0.0.1:31849

# Test steps:
# 1. Add folder in TUI #1
# 2. Verify appears in TUI #2 and WebSocket client immediately
# 3. Remove folder in TUI #2
# 4. Verify removed from TUI #1 and WebSocket client immediately
```

**Test 2: Ancestor Folder Replacement**
```bash
# Setup: Start daemon + 3 clients as above

# Test steps:
# 1. Add /Users/test/subfolder in TUI #1
# 2. Add /Users/test in TUI #2 
# 3. Verify:
#    - Both TUIs show only /Users/test
#    - /Users/test/subfolder was automatically removed
#    - All clients received FMDM updates
```

**Test 3: Connection Recovery**
```bash
# Setup: Start daemon + TUI

# Test steps:
# 1. Note TUI shows "Connected" status
# 2. Kill daemon (Ctrl+C)
# 3. Verify TUI shows "Disconnected" status
# 4. Restart daemon: npm run test:daemon
# 5. Verify TUI auto-reconnects and shows folders
```

**Test 4: Performance Test**
```bash
# Create performance-test.js
```

**Performance Test Script (`performance-test.js`)**:
```javascript
const WebSocket = require('ws');

async function createClient(id) {
  const ws = new WebSocket('ws://127.0.0.1:31849');
  
  ws.on('open', () => {
    console.log(`Client ${id} connected`);
    ws.send(JSON.stringify({
      type: 'connection.init',
      clientType: 'tui'
    }));
  });
  
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'fmdm.update') {
      console.log(`Client ${id} received FMDM (${msg.fmdm.connections.count} connections)`);
    }
  });
  
  return ws;
}

async function performanceTest() {
  console.log('Creating 10 concurrent clients...');
  
  const clients = [];
  for (let i = 0; i < 10; i++) {
    clients.push(await createClient(i));
    await new Promise(r => setTimeout(r, 100)); // Stagger connections
  }
  
  // Wait and verify all connected
  await new Promise(r => setTimeout(r, 2000));
  console.log('All clients should show 10 connections');
  
  // Test broadcast performance
  const testClient = clients[0];
  console.log('Testing broadcast performance...');
  
  const start = Date.now();
  testClient.send(JSON.stringify({
    type: 'folder.add',
    id: 'perf-test',
    payload: { path: '/tmp/perf-test', model: 'test' }
  }));
  
  // Measure broadcast time
  setTimeout(() => {
    const elapsed = Date.now() - start;
    console.log(`Broadcast completed in ${elapsed}ms`);
    
    // Cleanup
    clients.forEach(ws => ws.close());
  }, 1000);
}

performanceTest().catch(console.error);
```

**Run Performance Test**:
```bash
# 1. Start daemon
npm run test:daemon

# 2. Run performance test
node performance-test.js
```

**Expected Results**:
- **Multi-Client Sync**: Changes appear instantly in all clients
- **Ancestor Replacement**: Automatic cleanup works correctly
- **Connection Recovery**: Auto-reconnection works smoothly
- **Performance**: 
  - 10+ concurrent clients supported
  - FMDM broadcasts complete in <100ms
  - No memory leaks or connection issues
  - CPU usage remains reasonable
- **Reliability**: No lost messages or sync issues

---

### Sub-Task 9.15: Error Handling & Edge Cases
**Priority**: MEDIUM  
**Estimated Time**: 1 hour  

**Scenarios to Handle**:
- Daemon not running when TUI starts
- WebSocket connection drops during operation
- Invalid messages received
- Concurrent modifications from multiple clients
- Validation timeout

**Success Criteria**:
- [ ] Clear error messages in UI
- [ ] No crashes on errors
- [ ] Operations fail gracefully
- [ ] Connection status accurate

**🛑 HUMAN VERIFICATION REQUIRED - ERROR SCENARIOS**:
- [ ] Test TUI behavior when daemon is not running
- [ ] Test WebSocket connection drops during operation
- [ ] Test invalid/malformed messages to daemon
- [ ] Test concurrent operations from multiple clients
- [ ] Verify all error scenarios handled gracefully without crashes

**🧪 ERROR SCENARIO TESTING**:

**Test 1: Daemon Not Running**
```bash
# 1. Ensure daemon is NOT running
# 2. Start TUI: npm run tui
# 3. Verify:
#    - Clear "Disconnected" status shown
#    - No crashes or hanging
#    - Graceful error messages
#    - Auto-retry attempts visible
```

**Test 2: Connection Drops During Operation**
```bash
# 1. Start daemon: npm run test:daemon
# 2. Start TUI: npm run tui
# 3. Begin adding a folder (don't complete)
# 4. Kill daemon during operation
# 5. Verify:
#    - Operation fails gracefully
#    - Clear error message shown
#    - TUI remains responsive
#    - Auto-reconnection starts
```

**Test 3: Invalid Messages**
```bash
# Create error-test.js
```

**Error Test Script (`error-test.js`)**:
```javascript
const WebSocket = require('ws');

async function testErrorHandling() {
  const ws = new WebSocket('ws://127.0.0.1:31849');
  
  ws.on('open', () => {
    console.log('Testing error handling...');
    
    // Test invalid JSON
    ws.send('invalid json{');
    
    // Test unknown message type
    ws.send(JSON.stringify({ type: 'unknown_type' }));
    
    // Test missing required fields
    ws.send(JSON.stringify({ type: 'folder.add' }));
    
    // Test invalid payload
    ws.send(JSON.stringify({
      type: 'folder.validate',
      id: 'test',
      payload: { invalid: 'field' }
    }));
  });
  
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'error') {
      console.log('✅ Error handled:', msg.message);
    }
  });
}

testErrorHandling().catch(console.error);
```

**Test 4: Concurrent Operations**
```bash
# Create concurrent-test.js
```

**Concurrent Test Script (`concurrent-test.js`)**:
```javascript
const WebSocket = require('ws');

async function testConcurrentOperations() {
  const clients = [];
  
  // Create 3 clients
  for (let i = 0; i < 3; i++) {
    const ws = new WebSocket('ws://127.0.0.1:31849');
    clients.push(ws);
  }
  
  await new Promise(r => setTimeout(r, 1000));
  
  // All clients try to add same folder simultaneously
  const folderPath = '/tmp/concurrent-test';
  clients.forEach((ws, i) => {
    ws.send(JSON.stringify({
      type: 'folder.add',
      id: `concurrent-${i}`,
      payload: { path: folderPath, model: 'test' }
    }));
  });
  
  // Verify only one succeeds, others get appropriate errors
  let responses = 0;
  clients.forEach(ws => {
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id && msg.id.startsWith('concurrent-')) {
        console.log(`Response ${++responses}:`, msg);
      }
    });
  });
}

testConcurrentOperations().catch(console.error);
```

**Run Error Tests**:
```bash
# 1. Start daemon
npm run test:daemon

# 2. Run error tests
node error-test.js
node concurrent-test.js
```

**Expected Results**:
- **Daemon Not Running**: Clear error messages, no crashes
- **Connection Drops**: Graceful failure, auto-reconnection
- **Invalid Messages**: Proper error responses, no daemon crashes
- **Concurrent Operations**: Race conditions handled, consistent state
- **General**: All error scenarios logged appropriately

---

### Sub-Task 9.16: Migrate TUI Components to FMDM WebSocket
**Priority**: HIGH  
**Estimated Time**: 3 hours  

**Components to Migrate**:
- **TUI Entry Point** (`src/interfaces/tui-ink/index.tsx`)
- **App Main Screen** (`src/interfaces/tui-ink/AppFullscreen.tsx`)
- **First Run Wizard** (`src/interfaces/tui-ink/components/FirstRunWizard.tsx`)
- **Add Folder Wizard** (`src/interfaces/tui-ink/components/AddFolderWizard.tsx`)
- **File Picker** (`src/interfaces/tui-ink/components/core/FilePickerListItem.tsx`)

**Migration Pattern**:
```typescript
// Replace direct configuration access
const configComponent = container.resolve<ConfigurationComponent>(...);
await configComponent.addFolder(path, model);

// With FMDM WebSocket communication
const { fmdm, addFolder } = useFMDM();
await addFolder(path, model);
```

**Success Criteria**:
- [ ] All 5 primary components use FMDM WebSocket instead of direct config access
- [ ] TUI cascading flow works exactly as before (no folders → wizard → main)
- [ ] CLI parameters (-d, -m) still trigger add folder wizard correctly
- [ ] Real-time validation performance maintained in file picker
- [ ] No TypeScript compilation errors

**🛑 HUMAN VERIFICATION REQUIRED - FULL TUI EXPERIENCE TEST**:
- [ ] Test TUI without parameters: first run wizard → main screen flow
- [ ] Test TUI with -d parameter: add folder wizard → main screen flow
- [ ] Test TUI with existing folders: direct to main screen
- [ ] Test real-time folder validation during file browsing
- [ ] Test multi-TUI synchronization with folder add/remove operations

---

### Sub-Task 9.17: Integrate MCP Endpoints into Unified Daemon
**Priority**: HIGH  
**Estimated Time**: 2 hours  

**Implementation**:
- Move MCP REST endpoints to run inside unified daemon on port 31850
- Connect MCP endpoints to shared business logic (same services as WebSocket)
- Ensure MCP endpoints can access current folder configuration via FMDM

**Files**:
- Update `src/domain/daemon/daemon-service.ts` to start REST server
- Move `src/interfaces/mcp/endpoints.ts` logic into daemon
- Connect MCP endpoints to shared FMDM service

**Success Criteria**:
- [ ] MCP REST endpoints accessible on http://127.0.0.1:31850
- [ ] Claude Desktop can connect and use MCP endpoints
- [ ] MCP endpoints show current folders from FMDM
- [ ] TUI folder changes immediately available to MCP endpoints
- [ ] Single daemon process manages both WebSocket and REST servers

**🛑 HUMAN VERIFICATION REQUIRED - MCP INTEGRATION TEST**:
- [ ] Start unified daemon and verify both ports (31849 WebSocket, 31850 REST)
- [ ] Connect Claude Desktop to MCP endpoints
- [ ] Add folder via TUI, verify it's immediately available to MCP
- [ ] Test MCP search functionality works with TUI-managed folders

---

### Sub-Task 9.18: Legacy Cleanup and PID Integration  
**Priority**: MEDIUM  
**Estimated Time**: 1 hour  

**Cleanup Tasks**:
- Delete old `src/daemon/index.ts` (simple HTTP-only daemon)
- Update main screen daemon PID detection to use new unified daemon
- Remove any documentation references to old daemon
- Clean up unused imports and references

**Files**:
- Remove `src/daemon/index.ts`
- Update any PID file detection logic
- Update CLI daemon start command to use unified daemon (no -f parameter required)

**Success Criteria**:
- [ ] Old daemon code completely removed
- [ ] Main screen shows correct PID for unified daemon
- [ ] `folder-mcp daemon start` works without folder parameter
- [ ] No broken imports or references to deleted code
- [ ] Documentation only references unified daemon

**🛑 HUMAN VERIFICATION REQUIRED - CLEANUP VERIFICATION**:
- [ ] Confirm old daemon files are deleted and no longer accessible
- [ ] Verify main screen PID detection works with new daemon
- [ ] Test that daemon start command works without parameters
- [ ] Ensure no broken functionality from cleanup

---

## Overall Success Metrics

1. **Architecture Compliance**: FMDM is single source of truth
2. **Validation Separation**: Real-time validation before actions
3. **Multi-Client Support**: 3+ TUIs work simultaneously
4. **Performance**: Updates propagate in <100ms
5. **Reliability**: Auto-reconnect works smoothly
6. **Code Quality**: All TypeScript checks pass

## Testing Checklist

### Functional Tests
- [ ] Single TUI works as before
- [ ] Multiple TUIs stay synchronized
- [ ] Real-time validation works
- [ ] Add folder with all scenarios (normal, duplicate, ancestor)
- [ ] Remove folder works
- [ ] Connection recovery works

### Performance Tests
- [ ] 5 simultaneous clients
- [ ] Rapid folder operations
- [ ] Large folder lists (50+)
- [ ] Network interruption recovery

### Edge Cases
- [ ] Daemon not running
- [ ] Invalid folder paths
- [ ] Concurrent operations
- [ ] Malformed messages

## Architecture Benefits

1. **Simplicity**: Clients just validate → act → react
2. **Consistency**: Single source of truth prevents conflicts
3. **Scalability**: Easy to add new client types
4. **Maintainability**: Clear separation of concerns
5. **Real-time**: Instant updates across all clients

## Next Steps After Task 9

With the WebSocket/FMDM foundation in place:
- **Task 10**: Python embeddings can update indexing status in FMDM
- **Task 11**: CLI commands can use FMDMClient
- **Future**: Web UI can connect to same WebSocket endpoint
- **Future**: Mobile apps can use the same protocol