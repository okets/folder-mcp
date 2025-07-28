# Phase 8 Task 10: Python Embeddings System Implementation

**Status**: 🚧 IN PROGRESS  
**Priority**: 🔥 HIGH - Critical for production-ready embeddings without external dependencies  
**Start Date**: 2025-07-28  
**Dependencies**: Task 9 (WebSocket/FMDM Architecture) ✅ COMPLETED  

## Overview

Implement a robust Python-based embeddings system that replaces the Ollama dependency with a directly integrated solution using JSON-RPC communication. The system will provide high-performance embeddings with GPU acceleration support while maintaining the existing embedding interfaces.

## Architecture Design

### System Components

```
┌─────────────────┐    WebSocket     ┌──────────────────────┐    JSON-RPC     ┌─────────────────────┐
│  TUI Clients    │◄─────────────────┤   Unified Daemon     │     (stdio)     │  Python Embeddings  │
│  CLI Clients    │   Port 31849     │   (TypeScript)       ├─────────────────►│  Worker Process     │
└─────────────────┘                  │                      │                 │                     │
                                     │  PythonEmbedding     │                 │ • sentence-transformers│
                                     │  Service             │                 │ • faiss-cpu           │
                                     │  (JSON-RPC Client)   │                 │ • numpy               │
                                     └──────────────────────┘                 │ • torch               │
                                                                              └─────────────────────┘
```

### Key Design Principles

1. **Process Isolation**: Python runs as separate process for stability
2. **JSON-RPC Communication**: Standard protocol for cross-language communication
3. **Graceful Degradation**: Falls back to Ollama if Python unavailable
4. **Resource Management**: Proper lifecycle and resource cleanup
5. **DI Integration**: Follows existing dependency injection patterns
6. **Priority-Based Processing**: Immediate requests pause batch processing

### Priority-Based Processing with Crawling Pause

The system implements a "crawling pause" mechanism to ensure semantic search queries get immediate responses while folder indexing happens in the background:

**How it works:**
1. **Immediate requests** (search queries) are processed instantly via `generate_immediate`
2. Each immediate request updates a timestamp, pausing batch processing for 1 minute
3. **Batch requests** (folder indexing) run in background thread, checking pause status
4. If immediate request arrives during batch processing, batch pauses for 60 seconds
5. Multiple immediate requests extend the pause (crawling pause pattern)

**Example Timeline:**
```
0:00 - Batch indexing running
0:15 - Search query arrives → Process immediately, pause batch until 1:15
0:16 - Another search → Process immediately, extend pause until 1:16
0:20 - More searches → Process immediately, extend pause until 1:20
1:20 - No searches for 1 minute → Resume batch indexing
```

This ensures MCP search endpoints always get fast responses, while folder indexing uses available resources when the system is idle.

## Implementation Plan

### Sub-Task 10.1: Create Python Project Structure
**Priority**: HIGH  
**Estimated Time**: 30 minutes  

**Files to Create**:
```
src/infrastructure/embeddings/python/
├── embeddings_worker.py       # Main JSON-RPC server
├── requirements.txt           # Python dependencies
├── models/
│   ├── __init__.py
│   ├── model_manager.py      # Model loading and caching
│   └── model_registry.py     # Available models configuration
├── handlers/
│   ├── __init__.py
│   ├── embedding_handler.py  # Embedding generation logic
│   └── health_handler.py     # Health check implementation
└── utils/
    ├── __init__.py
    ├── gpu_detector.py       # GPU detection (CUDA/MPS)
    └── logger.py             # Logging configuration
```

**requirements.txt**:
```
sentence-transformers==2.3.1
faiss-cpu==1.7.4
numpy==1.24.3
torch>=2.0.0
jsonrpclib-pelix==0.4.3.2
pydantic==2.5.3
```

**Success Criteria**:
- [ ] Python project structure created
- [ ] Virtual environment set up
- [ ] Dependencies installable via pip
- [ ] Basic Python module imports work

**Testing**:
```bash
cd src/infrastructure/embeddings/python
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python -c "import sentence_transformers; print('Success')"
```

---

### Sub-Task 10.2: Implement JSON-RPC Server Foundation
**Priority**: HIGH  
**Estimated Time**: 2 hours  

**Implementation**: `embeddings_worker.py`
```python
import sys
import json
import logging
from jsonrpclib.SimpleJSONRPCServer import SimpleJSONRPCServer
from jsonrpclib.SimpleJSONRPCServer import SimpleJSONRPCRequestHandler

class StdioJSONRPCRequestHandler(SimpleJSONRPCRequestHandler):
    """Custom handler for JSON-RPC over stdio"""
    def setup(self):
        self.rfile = sys.stdin.buffer
        self.wfile = sys.stdout.buffer
        
class EmbeddingsRPCServer:
    def __init__(self):
        self.server = SimpleJSONRPCServer(
            ('localhost', 0),  # Use stdio, not network
            requestHandler=StdioJSONRPCRequestHandler
        )
        self.setup_handlers()
        
    def setup_handlers(self):
        self.server.register_function(self.health_check)
        self.server.register_function(self.get_capabilities)
        self.server.register_function(self.generate_embedding)
        self.server.register_function(self.generate_batch)
        
    def health_check(self):
        return {"status": "healthy", "version": "1.0.0"}
        
    def get_capabilities(self):
        return {
            "models": ["all-MiniLM-L6-v2"],
            "gpu_available": False,
            "max_batch_size": 32
        }
```

**Success Criteria**:
- [ ] JSON-RPC server starts without errors
- [ ] Responds to health_check method
- [ ] Handles stdio communication
- [ ] Graceful error handling

**Testing**:
Create `test_jsonrpc.py`:
```python
import subprocess
import json

# Test basic JSON-RPC communication
proc = subprocess.Popen(
    ['python', 'embeddings_worker.py'],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE
)

# Send health check request
request = {
    "jsonrpc": "2.0",
    "method": "health_check",
    "id": 1
}
proc.stdin.write(json.dumps(request).encode() + b'\n')
proc.stdin.flush()

# Read response
response = proc.stdout.readline()
print(json.loads(response))
```

---

### Sub-Task 10.3: Implement Model Manager with GPU Detection
**Priority**: HIGH  
**Estimated Time**: 2 hours  

**Implementation**: `models/model_manager.py`
```python
import torch
from sentence_transformers import SentenceTransformer
from typing import Optional, Dict, Any
import logging

class ModelManager:
    def __init__(self):
        self._models: Dict[str, SentenceTransformer] = {}
        self._device = self._detect_device()
        self._default_model = "all-MiniLM-L6-v2"
        
    def _detect_device(self) -> str:
        """Detect available GPU (CUDA or MPS) or fallback to CPU"""
        if torch.cuda.is_available():
            return "cuda"
        elif torch.backends.mps.is_available():
            return "mps"
        else:
            return "cpu"
            
    def get_model(self, model_name: Optional[str] = None) -> SentenceTransformer:
        """Get or load a model with caching"""
        model_name = model_name or self._default_model
        
        if model_name not in self._models:
            logging.info(f"Loading model {model_name} on {self._device}")
            self._models[model_name] = SentenceTransformer(
                model_name, 
                device=self._device
            )
            
        return self._models[model_name]
        
    def get_device_info(self) -> Dict[str, Any]:
        """Get information about compute device"""
        info = {"device": self._device}
        
        if self._device == "cuda":
            info["gpu_name"] = torch.cuda.get_device_name(0)
            info["gpu_memory"] = torch.cuda.get_device_properties(0).total_memory
        elif self._device == "mps":
            info["gpu_name"] = "Apple Silicon GPU"
            
        return info
```

**Success Criteria**:
- [ ] GPU detection works correctly
- [ ] Model loading succeeds
- [ ] Model caching prevents reloading
- [ ] Memory management is efficient

**Testing**:
```python
# test_model_manager.py
from models.model_manager import ModelManager

manager = ModelManager()
print(f"Device: {manager.get_device_info()}")

# Load model
model = manager.get_model()
print(f"Model loaded: {model}")

# Test embedding
embedding = model.encode("Test sentence")
print(f"Embedding shape: {embedding.shape}")
```

---

### Sub-Task 10.4: Implement Embedding Handler
**Priority**: HIGH  
**Estimated Time**: 2 hours  

**Implementation**: `handlers/embedding_handler.py`
```python
from typing import List, Dict, Any, Optional
import numpy as np
from models.model_manager import ModelManager
import time
import threading
from queue import Queue

class EmbeddingHandler:
    def __init__(self, model_manager: ModelManager):
        self.model_manager = model_manager
        self.batch_queue = Queue()
        self.last_immediate_time = 0
        self.pause_duration = 60  # 1 minute crawling pause
        self.batch_thread = None
        self._start_batch_processor()
        
    def generate_immediate(self, text: str, model: Optional[str] = None) -> Dict[str, Any]:
        """Generate embedding immediately for search queries - pauses batch processing"""
        # Update crawling pause timer
        self.last_immediate_time = time.time()
        
        # Process immediately
        return self.generate_single(text, model)
        
    def should_process_batch(self) -> bool:
        """Check if we should process batch items (1 minute since last immediate)"""
        time_since_immediate = time.time() - self.last_immediate_time
        return time_since_immediate > self.pause_duration
        
    def _start_batch_processor(self):
        """Start background thread for batch processing"""
        self.batch_thread = threading.Thread(target=self._batch_processor_loop, daemon=True)
        self.batch_thread.start()
        
    def _batch_processor_loop(self):
        """Background thread that processes batch queue with crawling pause"""
        while True:
            if not self.should_process_batch():
                time.sleep(1)  # Check every second
                continue
                
            if not self.batch_queue.empty():
                batch_data = self.batch_queue.get()
                # Process batch only if no recent immediate requests
                self._process_batch_data(batch_data)
            else:
                time.sleep(0.1)  # Sleep when queue is empty
        
    def generate_single(self, text: str, model: Optional[str] = None) -> Dict[str, Any]:
        """Generate embedding for single text"""
        start_time = time.time()
        
        if not text or not text.strip():
            return {
                "vector": [0.0] * 384,  # Default dimensions
                "dimensions": 384,
                "processing_time": 0,
                "model": model or "all-MiniLM-L6-v2"
            }
            
        try:
            model_instance = self.model_manager.get_model(model)
            embedding = model_instance.encode(text)
            
            return {
                "vector": embedding.tolist(),
                "dimensions": len(embedding),
                "processing_time": int((time.time() - start_time) * 1000),
                "model": model or self.model_manager._default_model
            }
        except Exception as e:
            raise Exception(f"Embedding generation failed: {str(e)}")
            
    def generate_batch(self, texts: List[str], model: Optional[str] = None, 
                      batch_size: int = 32) -> List[Dict[str, Any]]:
        """Queue embeddings for batch processing (used for folder indexing)"""
        # Add to queue for background processing
        batch_data = {
            'texts': texts,
            'model': model,
            'batch_size': batch_size,
            'future': threading.Event()  # For result synchronization
        }
        self.batch_queue.put(batch_data)
        
        # For now, return placeholder - in real implementation, return future/promise
        return self._generate_batch_sync(texts, model, batch_size)
        
    def _generate_batch_sync(self, texts: List[str], model: Optional[str] = None, 
                            batch_size: int = 32) -> List[Dict[str, Any]]:
        """Synchronous batch generation (fallback)"""
        results = []
        model_instance = self.model_manager.get_model(model)
        
        # Process in batches
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            start_time = time.time()
            
            # Handle empty texts in batch
            batch_embeddings = []
            for text in batch:
                if not text or not text.strip():
                    batch_embeddings.append(np.zeros(384))
                else:
                    embedding = model_instance.encode(text)
                    batch_embeddings.append(embedding)
                    
            processing_time = int((time.time() - start_time) * 1000)
            
            for j, embedding in enumerate(batch_embeddings):
                results.append({
                    "vector": embedding.tolist(),
                    "dimensions": len(embedding),
                    "processing_time": processing_time // len(batch),
                    "model": model or self.model_manager._default_model,
                    "batch_index": i + j
                })
                
        return results
```

**Success Criteria**:
- [ ] Single embedding generation works
- [ ] Batch processing is efficient
- [ ] Empty text handling is correct
- [ ] Error handling is comprehensive

---

### Sub-Task 10.5: Complete JSON-RPC Integration
**Priority**: HIGH  
**Estimated Time**: 1 hour  

**Update**: `embeddings_worker.py`
```python
def main():
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[logging.StreamHandler(sys.stderr)]
    )
    
    # Initialize components
    model_manager = ModelManager()
    embedding_handler = EmbeddingHandler(model_manager)
    
    # Create server
    server = EmbeddingsRPCServer(model_manager, embedding_handler)
    
    # Register methods with priority support
    server.server.register_function(embedding_handler.generate_single, 'generate_embedding')
    server.server.register_function(embedding_handler.generate_immediate, 'generate_immediate')
    server.server.register_function(embedding_handler.generate_batch, 'generate_batch')
    
    logging.info("Python embeddings worker started")
    server.start()
```

**Success Criteria**:
- [ ] Complete JSON-RPC server runs
- [ ] All methods are callable
- [ ] Logging works properly
- [ ] Graceful shutdown on SIGTERM

---

### Sub-Task 10.6: Create TypeScript JSON-RPC Client
**Priority**: HIGH  
**Estimated Time**: 3 hours  

**File**: `src/infrastructure/embeddings/python-embedding-service.ts`
```typescript
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { join } from 'path';
import type { 
  EmbeddingOperations, 
  BatchEmbeddingOperations,
  EmbeddingVector,
  EmbeddingResult,
  TextChunk 
} from '../../domain/embeddings/index.js';

interface JSONRPCRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id: string | number;
}

interface JSONRPCResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string | number;
}

export class PythonEmbeddingService implements EmbeddingOperations, BatchEmbeddingOperations {
  private process: ChildProcess | null = null;
  private requestId = 0;
  private pendingRequests = new Map<string | number, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();
  private isInitialized = false;
  private eventEmitter = new EventEmitter();
  
  constructor(
    private readonly config: {
      pythonPath?: string;
      scriptPath?: string;
      timeout?: number;
      maxRetries?: number;
    } = {}
  ) {
    this.config = {
      pythonPath: 'python3',
      timeout: 30000,
      maxRetries: 3,
      ...config
    };
  }
  
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      await this.startPythonProcess();
      
      // Test health check
      const health = await this.callMethod('health_check');
      if (health.status !== 'healthy') {
        throw new Error('Python worker unhealthy');
      }
      
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize Python embedding service: ${error}`);
    }
  }
  
  private async startPythonProcess(): Promise<void> {
    const scriptPath = this.config.scriptPath || 
      join(__dirname, 'python', 'embeddings_worker.py');
      
    this.process = spawn(this.config.pythonPath!, [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    this.process.stdout?.on('data', (data) => {
      this.handleStdout(data);
    });
    
    this.process.stderr?.on('data', (data) => {
      console.error(`Python stderr: ${data}`);
    });
    
    this.process.on('error', (error) => {
      console.error('Python process error:', error);
      this.cleanup();
    });
    
    this.process.on('exit', (code, signal) => {
      console.error(`Python process exited: code=${code}, signal=${signal}`);
      this.cleanup();
    });
    
    // Wait for process to be ready
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  
  private handleStdout(data: Buffer): void {
    const lines = data.toString().split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      try {
        const response: JSONRPCResponse = JSON.parse(line);
        const pending = this.pendingRequests.get(response.id);
        
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(response.id);
          
          if (response.error) {
            pending.reject(new Error(response.error.message));
          } else {
            pending.resolve(response.result);
          }
        }
      } catch (error) {
        // Not JSON, probably log output
        console.log(`Python output: ${line}`);
      }
    }
  }
  
  private async callMethod(method: string, params?: any): Promise<any> {
    if (!this.process || !this.process.stdin) {
      throw new Error('Python process not running');
    }
    
    const id = ++this.requestId;
    const request: JSONRPCRequest = {
      jsonrpc: '2.0',
      method,
      params,
      id
    };
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, this.config.timeout!);
      
      this.pendingRequests.set(id, { resolve, reject, timeout });
      
      this.process!.stdin!.write(JSON.stringify(request) + '\n');
    });
  }
  
  async generateSingleEmbedding(text: string): Promise<EmbeddingVector> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const result = await this.callMethod('generate_embedding', { text });
    
    return {
      vector: result.vector,
      dimensions: result.dimensions,
      model: result.model,
      createdAt: new Date().toISOString(),
      metadata: {
        generatedAt: new Date().toISOString(),
        modelVersion: result.model,
        tokensUsed: Math.ceil(text.length / 4),
        confidence: 1.0
      }
    };
  }
  
  async generateImmediateEmbedding(text: string): Promise<EmbeddingVector> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    // Use immediate method for search queries - pauses batch processing
    const result = await this.callMethod('generate_immediate', { 
      text,
      timeout: 5000  // Shorter timeout for immediate requests
    });
    
    return {
      vector: result.vector,
      dimensions: result.dimensions,
      model: result.model,
      createdAt: new Date().toISOString(),
      metadata: {
        generatedAt: new Date().toISOString(),
        modelVersion: result.model,
        tokensUsed: Math.ceil(text.length / 4),
        confidence: 1.0,
        priority: 'immediate'
      }
    };
  }
  
  async generateEmbeddings(chunks: TextChunk[]): Promise<EmbeddingVector[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const texts = chunks.map(chunk => chunk.content);
    const results = await this.callMethod('generate_batch', { texts });
    
    return results.map((result: any, index: number) => ({
      vector: result.vector,
      dimensions: result.dimensions,
      model: result.model,
      createdAt: new Date().toISOString(),
      chunkId: `chunk_${index}_${chunks[index].chunkIndex}`,
      metadata: {
        generatedAt: new Date().toISOString(),
        modelVersion: result.model,
        tokensUsed: Math.ceil(chunks[index].content.length / 4),
        confidence: 1.0
      }
    }));
  }
  
  calculateSimilarity(vector1: EmbeddingVector, vector2: EmbeddingVector): number {
    // Cosine similarity calculation
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vector1.vector.length; i++) {
      dotProduct += vector1.vector[i] * vector2.vector[i];
      norm1 += vector1.vector[i] * vector1.vector[i];
      norm2 += vector2.vector[i] * vector2.vector[i];
    }
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }
  
  async processBatch(chunks: TextChunk[], batchSize: number = 32): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const startTime = Date.now();
      
      try {
        const embeddings = await this.generateEmbeddings(batch);
        
        for (let j = 0; j < batch.length; j++) {
          results.push({
            chunk: batch[j],
            embedding: embeddings[j],
            processingTime: Date.now() - startTime,
            success: true
          });
        }
      } catch (error) {
        // Handle batch failure
        for (const chunk of batch) {
          results.push({
            chunk,
            embedding: this.createZeroEmbedding(),
            processingTime: Date.now() - startTime,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }
    
    return results;
  }
  
  estimateProcessingTime(chunkCount: number): number {
    // Estimate based on model and hardware
    const baseTime = 50; // ms per chunk
    return chunkCount * baseTime;
  }
  
  private createZeroEmbedding(): EmbeddingVector {
    return {
      vector: new Array(384).fill(0),
      dimensions: 384,
      model: 'all-MiniLM-L6-v2',
      createdAt: new Date().toISOString(),
      metadata: {
        generatedAt: new Date().toISOString(),
        modelVersion: 'all-MiniLM-L6-v2',
        tokensUsed: 0,
        confidence: 0
      }
    };
  }
  
  private cleanup(): void {
    this.isInitialized = false;
    this.pendingRequests.forEach(({ reject, timeout }) => {
      clearTimeout(timeout);
      reject(new Error('Python process terminated'));
    });
    this.pendingRequests.clear();
    this.process = null;
  }
  
  async shutdown(): Promise<void> {
    if (this.process) {
      this.process.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (this.process) {
        this.process.kill('SIGKILL');
      }
    }
    this.cleanup();
  }
}
```

**Success Criteria**:
- [ ] TypeScript client compiles without errors
- [ ] Implements all required interfaces
- [ ] Process management is robust
- [ ] Error handling is comprehensive

---

### Sub-Task 10.7: Dependency Injection Integration
**Priority**: HIGH  
**Estimated Time**: 1 hour  

**Update**: `src/di/setup.ts`
```typescript
// Add to imports
import { PythonEmbeddingService } from '../infrastructure/embeddings/python-embedding-service.js';
import { OllamaEmbeddingService } from '../infrastructure/embeddings/ollama-embedding-service.js';

// Add embedding service registration with fallback
container.register(DITokens.embeddingService, {
  useFactory: () => {
    const config = container.resolve<ConfigurationComponent>(DITokens.configurationComponent);
    const embeddingProvider = config.get('embeddings.provider') || 'python';
    
    if (embeddingProvider === 'python') {
      try {
        const pythonService = new PythonEmbeddingService({
          pythonPath: config.get('embeddings.pythonPath') || 'python3',
          timeout: config.get('embeddings.timeout') || 30000
        });
        
        // Test initialization
        pythonService.initialize().catch(error => {
          console.error('Python embedding service failed to initialize:', error);
          console.log('Falling back to Ollama service');
        });
        
        return pythonService;
      } catch (error) {
        console.error('Failed to create Python embedding service:', error);
      }
    }
    
    // Fallback to Ollama
    return new OllamaEmbeddingService({
      baseUrl: config.get('embeddings.ollamaUrl') || 'http://127.0.0.1:11434',
      model: config.get('embeddings.model') || 'nomic-embed-text'
    });
  }
});
```

**Success Criteria**:
- [ ] DI registration works correctly
- [ ] Configuration-based provider selection
- [ ] Graceful fallback to Ollama
- [ ] No breaking changes to existing code

---

### Sub-Task 10.8: Update Daemon Integration
**Priority**: HIGH  
**Estimated Time**: 1 hour  

**Update**: `src/domain/daemon/daemon-service.ts`
```typescript
// Add Python process lifecycle management
private async startEmbeddingService(): Promise<void> {
  const embeddingService = this.container.resolve(DITokens.embeddingService);
  
  if (embeddingService instanceof PythonEmbeddingService) {
    this.logger.info('Initializing Python embedding service...');
    try {
      await embeddingService.initialize();
      this.logger.info('Python embedding service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Python embedding service:', error);
      this.logger.info('Will use Ollama fallback');
    }
  }
}

// Add to start() method
async start(): Promise<void> {
  // ... existing code ...
  
  // Start embedding service
  await this.startEmbeddingService();
  
  // ... rest of start logic ...
}

// Add to stop() method
async stop(): Promise<void> {
  // ... existing code ...
  
  // Stop embedding service
  const embeddingService = this.container.resolve(DITokens.embeddingService);
  if (embeddingService instanceof PythonEmbeddingService) {
    await embeddingService.shutdown();
  }
  
  // ... rest of stop logic ...
}
```

**Success Criteria**:
- [ ] Daemon starts Python process
- [ ] Proper lifecycle management
- [ ] Clean shutdown handling
- [ ] Error recovery works

---

### Sub-Task 10.9: Create Integration Tests
**Priority**: HIGH  
**Estimated Time**: 2 hours  

**File**: `tests/integration/embeddings/python-embeddings.test.ts`
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PythonEmbeddingService } from '../../../src/infrastructure/embeddings/python-embedding-service.js';

describe('Python Embeddings Integration', () => {
  let service: PythonEmbeddingService;
  
  beforeAll(async () => {
    service = new PythonEmbeddingService();
    await service.initialize();
  });
  
  afterAll(async () => {
    await service.shutdown();
  });
  
  it('should generate single embedding', async () => {
    const result = await service.generateSingleEmbedding('Hello world');
    
    expect(result.vector).toHaveLength(384);
    expect(result.dimensions).toBe(384);
    expect(result.model).toBe('all-MiniLM-L6-v2');
    expect(result.metadata?.confidence).toBe(1.0);
  });
  
  it('should handle empty text', async () => {
    const result = await service.generateSingleEmbedding('');
    
    expect(result.vector).toHaveLength(384);
    expect(result.vector.every(v => v === 0)).toBe(true);
  });
  
  it('should process batch efficiently', async () => {
    const chunks = Array.from({ length: 10 }, (_, i) => ({
      content: `Test chunk ${i}`,
      chunkIndex: i,
      metadata: {}
    }));
    
    const startTime = Date.now();
    const results = await service.processBatch(chunks, 5);
    const duration = Date.now() - startTime;
    
    expect(results).toHaveLength(10);
    expect(results.every(r => r.success)).toBe(true);
    expect(duration).toBeLessThan(5000); // Should be fast
  });
  
  it('should calculate similarity correctly', () => {
    const vector1 = {
      vector: [1, 0, 0],
      dimensions: 3,
      model: 'test',
      createdAt: new Date().toISOString()
    };
    
    const vector2 = {
      vector: [0.7071, 0.7071, 0],
      dimensions: 3,
      model: 'test',
      createdAt: new Date().toISOString()
    };
    
    const similarity = service.calculateSimilarity(vector1, vector2);
    expect(similarity).toBeCloseTo(0.7071, 4);
  });
  
  it('should recover from process crash', async () => {
    // Simulate process crash
    (service as any).process?.kill('SIGKILL');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Should reinitialize on next call
    const result = await service.generateSingleEmbedding('Recovery test');
    expect(result.vector).toHaveLength(384);
  });
});
```

**Success Criteria**:
- [ ] All integration tests pass
- [ ] Process recovery works
- [ ] Performance is acceptable
- [ ] Error scenarios handled

---

### Sub-Task 10.10: Add Health Monitoring
**Priority**: MEDIUM  
**Estimated Time**: 1 hour  

**File**: `src/infrastructure/embeddings/python-health-monitor.ts`
```typescript
export class PythonHealthMonitor {
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private consecutiveFailures = 0;
  private readonly maxFailures = 3;
  
  constructor(
    private readonly service: PythonEmbeddingService,
    private readonly onUnhealthy: () => void
  ) {}
  
  start(intervalMs: number = 30000): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.service.callMethod('health_check');
        if (health.status === 'healthy') {
          this.consecutiveFailures = 0;
        } else {
          this.handleFailure();
        }
      } catch (error) {
        this.handleFailure();
      }
    }, intervalMs);
  }
  
  private handleFailure(): void {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= this.maxFailures) {
      this.onUnhealthy();
    }
  }
  
  stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}
```

**Success Criteria**:
- [ ] Health monitoring works
- [ ] Detects unhealthy state
- [ ] Triggers recovery actions
- [ ] No false positives

---

### Sub-Task 10.11: Configuration and Documentation
**Priority**: MEDIUM  
**Estimated Time**: 1 hour  

**Update**: `src/config/schema/embeddings.ts`
```typescript
export interface EmbeddingsConfig {
  provider: 'python' | 'ollama';
  pythonPath?: string;
  pythonScriptPath?: string;
  timeout?: number;
  maxRetries?: number;
  model?: string;
  batchSize?: number;
  ollamaUrl?: string;  // Fallback option
}
```

**Update**: `README.md` section
```markdown
## Embeddings Configuration

folder-mcp supports two embedding providers:

### Python Embeddings (Default)
- Uses sentence-transformers directly
- Automatic GPU detection (CUDA/MPS)
- No external dependencies

Configuration:
```yaml
embeddings:
  provider: python
  model: all-MiniLM-L6-v2
  batchSize: 32
  pythonPath: python3  # or full path to Python executable
```

### Ollama Embeddings (Fallback)
- Requires Ollama installation
- Used when Python unavailable

Configuration:
```yaml
embeddings:
  provider: ollama
  ollamaUrl: http://127.0.0.1:11434
  model: nomic-embed-text
```
```

**Success Criteria**:
- [ ] Configuration schema updated
- [ ] Documentation is clear
- [ ] Migration path documented
- [ ] Troubleshooting guide added

---

## Testing Strategy

### Unit Tests
- JSON-RPC message parsing
- Error handling scenarios
- Configuration validation
- Interface compliance

### Integration Tests
- End-to-end embedding generation
- Process lifecycle management
- Fallback to Ollama
- Performance benchmarks

### Manual Testing Checklist
- [ ] Python process starts with daemon
- [ ] GPU detection works correctly
- [ ] Embeddings generate successfully
- [ ] Batch processing is efficient
- [ ] Process recovery after crash
- [ ] Clean shutdown on daemon stop
- [ ] Fallback to Ollama when Python fails

## Integration with MCP Endpoints

The embeddings service should be used differently based on the operation:

**For Search Operations (MCP search endpoint)**:
```typescript
// Use immediate method - processes instantly and pauses batch operations
const searchEmbedding = await embeddingService.generateImmediateEmbedding(query);
```

**For Indexing Operations (folder processing)**:
```typescript
// Use batch method - runs in background when no immediate requests
const embeddings = await embeddingService.processBatch(chunks, 32);
```

This ensures search queries always get sub-second responses while indexing happens efficiently in the background.

## Success Metrics

1. **Stability**: Zero crashes in 24-hour test run
2. **Performance**: < 100ms per embedding (immediate requests)
3. **Resource Usage**: < 500MB memory for model
4. **Recovery Time**: < 5 seconds after crash
5. **Compatibility**: Works on Windows/macOS/Linux
6. **Priority Handling**: Search queries never wait for batch processing

## Migration Path

1. **Phase 1**: Python service available but not default
2. **Phase 2**: Python becomes default, Ollama as fallback
3. **Phase 3**: Deprecate Ollama support (optional)

## Troubleshooting Guide

### Common Issues

**Python not found**:
```bash
# Check Python installation
python3 --version

# Set explicit path in config
embeddings:
  pythonPath: /usr/local/bin/python3
```

**Module import errors**:
```bash
# Install dependencies
cd src/infrastructure/embeddings/python
pip install -r requirements.txt
```

**GPU not detected**:
```bash
# Check CUDA
python -c "import torch; print(torch.cuda.is_available())"

# Check MPS (Apple Silicon)
python -c "import torch; print(torch.backends.mps.is_available())"
```

## Next Steps

After completing this task:
1. Performance optimization based on benchmarks
2. Additional model support
3. Advanced features (caching, quantization)
4. Web UI integration for model selection