# Fix Python Orchestration Plan - Complete Refactor

## Executive Summary

The Python orchestration has drifted significantly from the original clean design. Multiple Python processes are being created, models are cached incorrectly, and the singleton pattern is broken. This plan restores the original architecture: ONE Python process managing ALL GPU models sequentially.

## Current State Analysis

### What's Broken

1. **Multiple Python Processes** (Critical)
   - Registry creates new Python processes instead of reusing singleton
   - Each failed model switch attempt spawns attempts at new processes
   - Original design: ONE Python process for entire daemon lifetime

2. **Wrong Initial Model**
   - Python starts with `Xenova/multilingual-e5-small` (a CPU/ONNX model!)
   - This happens in `monitored-folders-orchestrator.ts:initializePythonEmbeddingService()`
   - Should start empty, no model loaded

3. **Model Factory Caching Issues**
   - `UnifiedModelFactory` caches disposed model bridges
   - Returns broken instances on subsequent requests
   - No validation of cached instance state

4. **No State Management**
   - Python service lacks proper state reporting
   - No handshaking between Node and Python
   - Race conditions when loading models

5. **Broken Singleton Registry**
   - Registry thinks it's maintaining singleton but isn't
   - `currentModelName` starts as `null`, causes switching confusion
   - No proper initialization tracking

## Original Design (To Restore)

### Core Principles
1. **ONE Python Process**: Lives for entire daemon lifetime
2. **Sequential Processing**: One model loaded at a time
3. **Clean Lifecycle**: Load → Use → Unload for each folder
4. **MCP Priority**: Indexing pauses for MCP requests
5. **State Machine**: Proper state tracking and handshaking

### Lifecycle Flow
```
Daemon Start:
  → Create Python singleton (empty)
  → Check available models
  → Python stays idle

Folder Indexing:
  → Load model into Python
  → Index folder
  → Unload model from Python
  → Python returns to idle

MCP Request:
  → Pause indexing
  → Load requested model
  → Keep loaded for 5 minutes
  → Resume indexing after timeout
```

## Implementation Fixes

### Fix 1: Python Singleton Initialization

#### File: `src/infrastructure/embeddings/python/main.py`
```python
# Remove model parameter requirement from __init__
def __init__(self):
    self.model = None
    self.model_name = None
    self.state = 'idle'  # Start idle, not loading
    self.tokenizer = None

# Start without loading any model
if __name__ == "__main__":
    server = EmbeddingRPCServer()  # No model parameter
    server.start()
```

#### File: `src/daemon/services/monitored-folders-orchestrator.ts`
```typescript
private async initializePythonEmbeddingService(): Promise<void> {
  // DO NOT pass any model name
  const pythonService = await createPythonEmbeddingService({
    // No modelName - starts empty
  });

  // Just verify Python works and wire to download manager
  await pythonService.initialize();
  await pythonService.waitForState('idle');

  this.modelDownloadManager.setPythonEmbeddingService(pythonService);
}
```

### Fix 2: Fix Model Factory Caching

#### File: `src/daemon/factories/unified-model-factory.ts`
```typescript
class UnifiedModelFactory {
  // Remove model caching entirely - bridges should be fresh
  // private modelCache = new Map<string, IEmbeddingModel>(); // DELETE THIS

  async createModel(config: EmbeddingModelConfig): Promise<IEmbeddingModel> {
    // Always create fresh bridge instance
    this.logger.info(`[MODEL-FACTORY] Creating new model: ${config.modelType}:${config.modelId}`);

    switch (config.modelType) {
      case 'python':
        return new PythonModelBridge(config, this.logger);
      case 'onnx':
        return new ONNXModelBridge(config, this.logger);
      default:
        throw new Error(`Unsupported model type: ${config.modelType}`);
    }
  }
}
```

### Fix 3: Python Service Registry

#### File: `src/daemon/factories/model-factories.ts`
```typescript
class PythonEmbeddingServiceRegistry {
  private static instance: PythonEmbeddingServiceRegistry;
  private singletonService: PythonEmbeddingService | null = null;
  private initialized = false;
  private currentModelName: string | null = null;

  public async getService(config: any): Promise<PythonEmbeddingService> {
    // Create singleton ONCE, empty
    if (!this.singletonService) {
      console.log(`[PYTHON-REGISTRY] Creating SINGLETON PythonEmbeddingService (no model)`);

      const venvPythonPath = join(process.cwd(), 'src/infrastructure/embeddings/python/venv/bin/python3');
      this.singletonService = new PythonEmbeddingService({
        pythonPath: venvPythonPath
        // NO modelName parameter
      });

      await this.singletonService.initialize();
      await this.singletonService.waitForState('idle');
      this.initialized = true;
      console.log(`[PYTHON-REGISTRY] Singleton initialized in idle state`);
    }

    // Wait for initialization if in progress
    if (!this.initialized) {
      await this.waitForInitialization();
    }

    // Load model if requested and different
    const requestedModel = config.modelName;
    if (requestedModel && this.currentModelName !== requestedModel) {
      // Unload current if any
      if (this.currentModelName) {
        await this.singletonService.unloadModel();
        await this.singletonService.waitForState('idle');
        this.currentModelName = null;
      }

      // Load new model
      await this.singletonService.loadModel(requestedModel);
      await this.singletonService.waitForState('ready');
      this.currentModelName = requestedModel;
    }

    return this.singletonService;
  }

  private async waitForInitialization(): Promise<void> {
    const maxWait = 30000; // 30 seconds
    const start = Date.now();
    while (!this.initialized && Date.now() - start < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!this.initialized) {
      throw new Error('Python service initialization timeout');
    }
  }
}
```

### Fix 4: Implement State Management

#### File: `src/infrastructure/embeddings/python-embedding-service.ts`
```typescript
class PythonEmbeddingService {
  private state: 'uninitialized' | 'initializing' | 'idle' | 'loading' | 'ready' | 'unloading' | 'error' = 'uninitialized';

  async initialize(): Promise<void> {
    if (this.state !== 'uninitialized') {
      return; // Already initialized
    }

    this.state = 'initializing';

    // Start Python process WITHOUT model
    const scriptPath = path.join(__dirname, 'python', 'main.py');
    this.pythonProcess = spawn(this.pythonPath, [scriptPath], {
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });

    // Wait for Python to be ready
    await this.waitForState('idle');
    this.initialized = true;
  }

  async waitForState(targetState: string, timeoutMs = 30000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const status = await this.getStatus();
      if (status.state === targetState) {
        return;
      }
      if (status.state === 'error') {
        throw new Error(`Python service entered error state`);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Timeout waiting for state ${targetState}`);
  }

  async getStatus(): Promise<any> {
    try {
      const response = await this.sendRequest('get_status', {});
      return response;
    } catch (error) {
      return { state: 'error', error: error.message };
    }
  }

  async loadModel(modelName: string): Promise<void> {
    if (this.state !== 'idle' && this.state !== 'ready') {
      throw new Error(`Cannot load model in state ${this.state}`);
    }

    this.state = 'loading';
    await this.sendRequest('load_model', { model_name: modelName });
    await this.waitForState('ready');
  }

  async unloadModel(): Promise<void> {
    if (this.state !== 'ready') {
      return; // No model to unload
    }

    this.state = 'unloading';
    await this.sendRequest('unload_model', {});
    await this.waitForState('idle');
  }
}
```

### Fix 5: Python RPC Implementation

#### File: `src/infrastructure/embeddings/python/main.py`
```python
class EmbeddingRPCServer:
    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.model_name = None
        self.state = 'idle'
        self.device = self._get_device()

    def get_status(self):
        """Return detailed state information"""
        return {
            'state': self.state,
            'current_model': self.model_name,
            'device': str(self.device),
            'memory_usage_mb': self._get_memory_usage(),
            'gpu_available': torch.cuda.is_available() or torch.backends.mps.is_available(),
            'timestamp': datetime.now().isoformat()
        }

    def load_model(self, model_name):
        """Load a model into memory"""
        if self.state not in ['idle', 'ready']:
            return {'error': f'Cannot load model in state {self.state}'}

        try:
            self.state = 'loading'

            # Unload current model if any
            if self.model is not None:
                self._unload_current_model()

            # Load new model
            logger.info(f"Loading model: {model_name}")
            self.model = SentenceTransformer(model_name, device=self.device)
            self.tokenizer = self.model.tokenizer
            self.model_name = model_name
            self.state = 'ready'

            return {
                'success': True,
                'model': model_name,
                'state': self.state
            }

        except Exception as e:
            self.state = 'error'
            logger.error(f"Failed to load model: {e}")
            return {'error': str(e), 'state': self.state}

    def unload_model(self):
        """Unload current model from memory"""
        if self.model is None:
            return {'success': True, 'state': 'idle'}

        try:
            self.state = 'unloading'
            self._unload_current_model()
            self.state = 'idle'
            return {'success': True, 'state': self.state}

        except Exception as e:
            self.state = 'error'
            return {'error': str(e), 'state': self.state}

    def _unload_current_model(self):
        """Internal method to free model memory"""
        if self.model is not None:
            del self.model
            self.model = None
        if self.tokenizer is not None:
            del self.tokenizer
            self.tokenizer = None
        self.model_name = None

        # Force garbage collection
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        elif torch.backends.mps.is_available():
            torch.mps.empty_cache()
```

## Testing Plan

### Pre-Test Setup
```bash
# Clean all test databases
for folder in /Users/hanan/Projects/folder-mcp/tmp/test-*; do
  rm -rf "$folder/.folder-mcp"
done

# Kill any existing Python processes
pkill -f "python.*main.py"
```

### Test Execution
```bash
# Start daemon fresh
npm run daemon:restart

# Monitor logs for:
# 1. Python starts with state='idle', no model
# 2. Each folder loads its model sequentially
# 3. Model unloads after each folder
# 4. Only ONE Python process throughout
```

### Success Criteria
- ✅ Single Python process maintained
- ✅ Python starts in 'idle' state with no model
- ✅ Models load sequentially (one at a time)
- ✅ Each model unloads before next loads
- ✅ All 5 test folders index successfully
- ✅ No "Python embedding service not initialized" errors
- ✅ Proper state transitions in logs

### Expected Log Pattern
```
[PYTHON-REGISTRY] Creating SINGLETON PythonEmbeddingService (no model)
[PYTHON] State: uninitialized → initializing → idle
[QUEUE] Processing folder 1/5: test-gpu-multilingual-e5-large
[PYTHON] State: idle → loading → ready
[INDEXING] Processing files...
[PYTHON] State: ready → unloading → idle
[QUEUE] Processing folder 2/5: test-cpu-xenova-e5-small
[ONNX] Creating new service...
[INDEXING] Processing files...
[ONNX] Disposing service...
[QUEUE] Processing folder 3/5: test-gpu-bge-m3
[PYTHON] State: idle → loading → ready
...
```

## Rollback Safety

1. All changes are isolated to specific methods
2. No database schema changes
3. No API changes
4. Can revert file by file if needed

## Implementation Order

### Phase 1: Core Fixes (Priority)
1. Fix Python `main.py` to start without model
2. Fix `monitored-folders-orchestrator.ts` initialization
3. Remove model caching from `UnifiedModelFactory`

### Phase 2: State Management
1. Implement state machine in Python service
2. Add `waitForState()` method
3. Add proper status reporting

### Phase 3: Registry Fix
1. Fix `PythonEmbeddingServiceRegistry` singleton logic
2. Ensure only one Python process
3. Proper initialization tracking

### Phase 4: Testing
1. Run test sequence
2. Verify single Python process
3. Confirm sequential processing

## Notes

- This restores the original clean design
- Eliminates ALL race conditions
- Ensures true singleton pattern
- Provides clear state visibility
- Maintains single Python process