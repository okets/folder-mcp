# Phase 8 Task 9: Daemon WebSocket Communication with FMDM Architecture

**Status**: 🚧 IN PROGRESS  
**Priority**: 🔥 CRITICAL - Foundation for all future client-server architecture  
**Started**: 2025-07-27  

## Overview

Implement WebSocket-based communication between daemon and TUI clients using the FMDM (Folder MCP Data Model) pattern. The daemon maintains the FMDM as the single source of truth and broadcasts updates to all connected clients whenever state changes.

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

### Sub-Task 9.1: Create FMDM TypeScript Interfaces
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
- [ ] TypeScript interfaces match FMDM specification
- [ ] No compilation errors
- [ ] Interfaces exported for use in other modules

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

### Sub-Task 9.2: Add WebSocket Server to Daemon
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
- [ ] WebSocket server starts on ws://127.0.0.1:31849
- [ ] Accepts connections
- [ ] Routes messages by type
- [ ] Tracks connected clients

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

### Sub-Task 9.3: Implement FMDM Service
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
- [ ] Confirm FMDM service instantiates correctly via DI
- [ ] Verify FMDM structure matches specification exactly
- [ ] Test that broadcast mechanism works with mock listeners

---

### Sub-Task 9.4: Implement WebSocket Message Protocol
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
- [ ] Confirm all message types compile without errors
- [ ] Verify protocol matches specification exactly
- [ ] Test that types work in both daemon and client contexts

---

### Sub-Task 9.5: Connect WebSocket Server to FMDM Service
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
- [ ] Start daemon and connect 2 wscat clients
- [ ] Verify both receive initial FMDM with correct connection count
- [ ] Disconnect one client, verify remaining client gets updated FMDM
- [ ] Confirm FMDM structure exactly matches specification

---

### Sub-Task 9.6: Migrate ConfigurationComponent to Daemon
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

---

### Sub-Task 9.7: Implement Folder Validation Handler
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