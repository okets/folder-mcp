# Orchestrated Folder Lifecycle Architecture

## Overview

This document describes the redesigned folder lifecycle management system that addresses the current issues with folders getting stuck in "pending" or "scanning" states. The new architecture introduces clear separation of concerns between orchestration and execution.

## 🎯 Core Design Principles

1. **Orchestrated Control**: MonitoredFoldersOrchestrator controls WHEN state transitions happen
2. **Execution Autonomy**: FolderLifecycleManager knows HOW to execute each state
3. **Single FMDM Updater**: Only the orchestrator updates FMDM (no more "unknown folder" warnings)
4. **Event-Driven**: Communication through events, not direct method calls
5. **No Blocking Operations**: All operations are async and non-blocking

## 📊 Architecture Overview

```
┌─────────────────────────────────────────┐
│   MonitoredFoldersOrchestrator         │
│   (Singleton - Coordinator)             │
├─────────────────────────────────────────┤
│ • Creates/destroys FolderManagers       │
│ • Controls state transitions            │
│ • Listens to events                     │
│ • Updates FMDM                          │
└────────────┬───────────────────────────┘
             │ Controls & Observes
    ┌────────┴────────┬─────────────┐
    ▼                 ▼             ▼
┌─────────┐      ┌─────────┐   ┌─────────┐
│ Folder  │      │ Folder  │   │ Folder  │
│ Manager │      │ Manager │   │ Manager │
│   #1    │      │   #2    │   │   #3    │
├─────────┤      ├─────────┤   ├─────────┤
│Executes        │Executes      │Executes
│Lifecycle       │Lifecycle     │Lifecycle
└─────────┘      └─────────┘   └─────────┘
```

## 📋 State Machine

### States
- **pending**: Waiting for orchestrator to start scanning
- **scanning**: Actively scanning filesystem and comparing with embeddings
- **ready**: Scan complete, has tasks, waiting for orchestrator to start indexing
- **indexing**: Processing embedding tasks
- **active**: Monitoring for file changes
- **error**: Error state with recovery information

### State Transitions
```
┌──────────────┐
│ Initializing │
└──────┬───────┘
       │
       ▼
┌──────────────┐     startScanning()      ┌────────────┐
│   Pending    │ ───────────────────────► │  Scanning  │
└──────────────┘   (Orchestrator calls)   └─────┬──────┘
       ▲                                         │
       │                                         ▼
       │                                   ┌────────────┐
       │                                   │   Ready    │
       │                                   └─────┬──────┘
       │                                         │
       │              startIndexing()            ▼
       │           (Orchestrator calls)    ┌────────────┐
       │                                   │  Indexing  │
       │                                   └─────┬──────┘
       │                                         │
       │           File changes detected         ▼
       └─────────────────────────────────  ┌────────────┐
                                          │   Active   │
                                          └────────────┘
```

## 🔄 Event Flow

### Events from FolderLifecycleManager
- **STATE_CHANGE**: Emitted on any state transition
- **SCAN_COMPLETE**: Scan finished, includes task list
- **INDEX_COMPLETE**: All tasks processed successfully
- **CHANGES_DETECTED**: File changes detected while in active state
- **ERROR**: Error occurred during operation

### Event Communication Flow
```
FolderLifecycleManager          MonitoredFoldersOrchestrator
        │                                    │
        │◄──── create & startScanning() ─────│ (On folder add)
        │                                    │
        ├─ Emit: STATE_CHANGE ──────────────►│
        │  {status: 'scanning'}              │
        │                                    ├─ Update FMDM
        │                                    │
        ├─ Emit: SCAN_COMPLETE ─────────────►│
        │  {tasks: [...]}                    │
        │                                    ├─ Update FMDM
        │◄──── startIndexing() ──────────────┤
        │                                    │
        ├─ Emit: STATE_CHANGE ──────────────►│
        │  {status: 'indexing'}              │
        │                                    ├─ Update FMDM
        │                                    │
        ├─ Emit: INDEX_COMPLETE ─────────────►│
        │  {status: 'active'}                │
        │                                    ├─ Update FMDM
        │                                    │
        ├─ Emit: CHANGES_DETECTED ───────────►│
        │                                    │
        │◄──── startScanning() ───────────────┤
        │                                    │
        └────────────────────────────────────┘
```

## 🏗️ Component Responsibilities

### MonitoredFoldersOrchestrator

**Responsibilities:**
- Create and destroy FolderLifecycleManager instances
- Control when state transitions happen
- Listen to events from all managers
- Update FMDM with aggregated state
- Handle WebSocket folder operations

**Key Methods:**
- `addFolder(path, model)`: Create manager and start scanning
- `removeFolder(path)`: Stop manager and clean up
- `startAll()`: Initialize all configured folders on daemon start
- `stopAll()`: Graceful shutdown of all managers

### FolderLifecycleManager

**Responsibilities:**
- Execute scanning when instructed
- Execute indexing when instructed
- Monitor file changes when active
- Emit events for all state changes
- Maintain folder-specific state

**Key Methods:**
- `startScanning()`: Begin filesystem scan
- `startIndexing()`: Process embedding tasks
- `getState()`: Return current state object
- `stop()`: Stop all operations

**Public State Object:**
```typescript
interface FolderLifecycleState {
  folderId: string;
  folderPath: string;
  status: 'pending' | 'scanning' | 'ready' | 'indexing' | 'active' | 'error';
  
  // Task list populated during scanning
  fileEmbeddingsTasks?: FileEmbeddingTask[];
  
  // Progress tracking
  progress?: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    percentage: number;
  };
  
  // Error information
  errorMessage?: string;
  consecutiveErrors?: number;
}
```

## 🛡️ Error Handling

### Database Corruption
1. FolderLifecycleManager detects corrupt database
2. Emits ERROR event with `recoverable: true`
3. Orchestrator receives error
4. Orchestrator instructs manager to delete database
5. Orchestrator calls `startScanning()` to rebuild

### Folder Not Found
1. FolderLifecycleManager detects missing folder
2. Emits ERROR event with `recoverable: false`
3. Orchestrator removes manager
4. Orchestrator updates FMDM
5. Orchestrator removes from configuration

### Daemon Restart Recovery
1. Orchestrator loads all configured folders
2. For each folder, create FolderLifecycleManager
3. Manager checks for existing `.folder-mcp` directory
4. If database exists, validate and recover state
5. Orchestrator calls appropriate method based on recovered state

## 🎯 Benefits

1. **Solves "Unknown Folder" Warnings**: Only orchestrator updates FMDM
2. **Prevents Race Conditions**: Orchestrator controls all transitions
3. **Clean Architecture**: Clear separation of concerns
4. **Future Extensibility**: Easy to add rate limiting, priorities, etc.
5. **Testable**: Each component has single responsibility

## 📝 Migration Notes

### Components to Rename
- `FolderLifecycleManager` (current) → `MonitoredFoldersOrchestrator` (new)
- `FolderLifecycleOrchestrator` (current) → `FolderLifecycleManager` (new)

### Files to Update
- Domain interfaces
- Application implementations
- Daemon integration points
- WebSocket handlers
- Test files

### Breaking Changes
- FMDM updates only through orchestrator
- State transitions only through orchestrator methods
- Event-based communication replaces direct method calls