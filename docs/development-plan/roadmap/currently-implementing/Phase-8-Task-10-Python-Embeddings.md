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
┌─────────────────┐    WebSocket     ┌──────────────────────┐    JSON-RPC     ┌────────────────────────┐
│  TUI Clients    │◄─────────────────┤   Unified Daemon     │     (stdio)     │  Python Embeddings     │
│  CLI Clients    │   Port 31849     │   (TypeScript)       ├────────────────►│  Worker Process        │
└─────────────────┘                  │                      │                 │                        │
                                     │  PythonEmbedding     │                 │ • sentence-transformers│
                                     │  Service             │                 │ • faiss-cpu            │
                                     │  (JSON-RPC Client)   │                 │ • numpy                │
                                     └──────────────────────┘                 │ • torch                │
                                                                              └────────────────────────┘
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

### Sub-Task 10.5: Add Curated Model List to System Configuration ✅ COMPLETED
**Priority**: HIGH  
**Estimated Time**: 1 hour  
**Completion Date**: 2025-07-29

**Create**: `system-configuration.json` (if not exists) or update existing
```json
{
  "embeddings": {
    "python": {
      "supportedModels": [
        "all-MiniLM-L6-v2",
        "all-mpnet-base-v2", 
        "all-MiniLM-L12-v2",
        "all-distilroberta-v1",
        "paraphrase-MiniLM-L6-v2"
      ]
    }
  }
}
```

**Create**: `src/infrastructure/embeddings/python/utils/supported_models.py`
```python
import json
import os
from typing import List

def get_supported_models() -> List[str]:
    """Get supported models from system configuration"""
    config_path = os.path.join(os.path.dirname(__file__), '../../../../..', 'system-configuration.json')
    
    try:
        with open(config_path, 'r') as f:
            config = json.load(f)
        return config.get('embeddings', {}).get('python', {}).get('supportedModels', [])
    except Exception:
        # Fallback list if config unavailable
        return ['all-MiniLM-L6-v2', 'all-mpnet-base-v2']

def validate_model(model_name: str) -> bool:
    """Validate model against supported list"""
    return model_name in get_supported_models()
```

**Success Criteria**:
- [ ] Configuration-based model list implemented
- [ ] No hardcoded model arrays in Python code
- [ ] Model validation works against config
- [ ] Fallback list for missing config

---

### Sub-Task 10.6: Add Daemon Model Download Orchestration ✅ COMPLETED
**Priority**: HIGH  
**Estimated Time**: 3 hours  
**Completion Date**: 2025-07-29

**Update**: `src/domain/daemon/daemon-service.ts`
```typescript
export class DaemonService extends EventEmitter implements IDaemonService {
  // ... existing code ...

  /**
   * Download model if not already cached, with progress tracking
   */
  async downloadModelIfNeeded(modelName: string): Promise<void> {
    this.logger.info(`Checking if model ${modelName} needs download`);
    
    try {
      // Check if model is already cached via Python service
      const embeddingService = this.container.resolve(SERVICE_TOKENS.EMBEDDING);
      const isModelCached = await embeddingService.isModelCached(modelName);
      
      if (isModelCached) {
        this.logger.info(`Model ${modelName} already cached`);
        return;
      }

      // Emit progress start event for TUI
      this.webSocketServer.broadcast('model_download_start', { 
        modelName, 
        status: 'downloading' 
      });

      // Call Python service to download model with progress tracking
      await embeddingService.downloadModel(modelName, (progress) => {
        // Emit progress updates to TUI via WebSocket
        this.webSocketServer.broadcast('model_download_progress', {
          modelName,
          progress: progress.percent,
          message: `Downloading ${modelName}... ${progress.percent}%`,
          estimatedTimeRemaining: progress.eta
        });
      });

      // Emit completion event
      this.webSocketServer.broadcast('model_download_complete', { 
        modelName, 
        status: 'ready' 
      });

      this.logger.info(`Model ${modelName} downloaded successfully`);
    } catch (error) {
      // Emit error event for TUI display
      this.webSocketServer.broadcast('model_download_error', { 
        modelName, 
        error: error.message 
      });
      throw error;
    }
  }
}
```

**Success Criteria**:
- [x] Daemon orchestrates model downloads
- [x] Progress events broadcast to TUI via WebSocket
- [x] Model cache checking works through Python service
- [x] Error handling with user feedback via WebSocket

---

### Sub-Task 10.7: Add Python Model Download JSON-RPC Method ✅ COMPLETED
**Priority**: HIGH  
**Estimated Time**: 2 hours  
**Completion Date**: 2025-07-29

**Update**: `src/infrastructure/embeddings/python/handlers/embedding_handler.py`
```python
import os
from pathlib import Path
from sentence_transformers import SentenceTransformer
from .utils.supported_models import validate_model

class EmbeddingHandler:
    # ... existing code ...
    
    def download_model(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Download model with progress reporting for JSON-RPC"""
        model_name = request.get('model_name')
        
        if not validate_model(model_name):
            return {
                'success': False,
                'error': f'Model {model_name} not in supported list'
            }
        
        try:
            # Check if already cached
            if self.is_model_cached(model_name):
                return {
                    'success': True,
                    'message': f'Model {model_name} already cached',
                    'progress': 100
                }
            
            logger.info(f"Downloading model {model_name}...")
            
            # Download model - sentence-transformers handles caching automatically
            # This will download to ~/.cache/torch/sentence_transformers/
            model = SentenceTransformer(model_name)
            
            return {
                'success': True,
                'message': f'Model {model_name} downloaded successfully',
                'progress': 100
            }
            
        except Exception as e:
            logger.error(f"Failed to download model {model_name}: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def is_model_cached(self, model_name: str) -> bool:
        """Check if model is already in sentence-transformers cache"""
        try:
            # Check default sentence-transformers cache directory
            cache_dir = Path.home() / '.cache' / 'torch' / 'sentence_transformers'
            model_dir = cache_dir / model_name.replace('/', '_')
            
            # Check if model directory exists and contains required files
            if model_dir.exists() and (model_dir / 'config.json').exists():
                return True
                
            # Alternative: try loading to check if cached
            try:
                SentenceTransformer(model_name, cache_folder=str(cache_dir))
                return True
            except:
                return False
        except Exception:
            return False
```

**Success Criteria**:
- [x] JSON-RPC download method implemented
- [x] Model validation against supported list
- [x] Cache checking prevents re-downloads
- [x] Uses sentence-transformers automatic caching

---

### Sub-Task 10.8: Add TUI Progress Display to ManageFolderItem ✅ COMPLETED
**Priority**: HIGH  
**Estimated Time**: 2 hours  
**Completion Date**: 2025-07-29

**Update**: `src/interfaces/tui-ink/components/ManageFolderItem.tsx`
```typescript
import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

export interface ManageFolderItemProps {
  // ... existing props ...
}

interface ModelDownloadProgress {
  modelName: string;
  progress: number;
  message: string;
  status: 'downloading' | 'complete' | 'error';
}

export const ManageFolderItem: React.FC<ManageFolderItemProps> = ({
  // ... existing props
}) => {
  const [downloadProgress, setDownloadProgress] = useState<ModelDownloadProgress | null>(null);

  useEffect(() => {
    // Listen for model download progress events from daemon
    const handleModelDownloadStart = (data: any) => {
      setDownloadProgress({
        modelName: data.modelName,
        progress: 0,
        message: `Starting download: ${data.modelName}`,
        status: 'downloading'
      });
    };

    const handleModelDownloadProgress = (data: any) => {
      setDownloadProgress({
        modelName: data.modelName,
        progress: data.progress,
        message: data.message,
        status: 'downloading'
      });
    };

    const handleModelDownloadComplete = (data: any) => {
      setDownloadProgress({
        modelName: data.modelName,
        progress: 100,
        message: `Model ${data.modelName} ready`,
        status: 'complete'
      });
      
      // Clear progress display after 2 seconds
      setTimeout(() => setDownloadProgress(null), 2000);
    };

    const handleModelDownloadError = (data: any) => {
      setDownloadProgress({
        modelName: data.modelName,
        progress: 0,
        message: `Download failed: ${data.error}`,
        status: 'error'
      });
      
      // Clear error after 5 seconds
      setTimeout(() => setDownloadProgress(null), 5000);
    };

    // Subscribe to WebSocket events (reusing LogItems pattern)
    webSocketService.on('model_download_start', handleModelDownloadStart);
    webSocketService.on('model_download_progress', handleModelDownloadProgress);
    webSocketService.on('model_download_complete', handleModelDownloadComplete);
    webSocketService.on('model_download_error', handleModelDownloadError);

    return () => {
      webSocketService.off('model_download_start', handleModelDownloadStart);
      webSocketService.off('model_download_progress', handleModelDownloadProgress);
      webSocketService.off('model_download_complete', handleModelDownloadComplete);
      webSocketService.off('model_download_error', handleModelDownloadError);
    };
  }, []);

  return (
    <Box flexDirection="column">
      {/* Existing folder management content */}
      
      {/* Progress display when downloading models - similar to LogItems */}
      {downloadProgress && (
        <Box marginTop={1} paddingX={2} borderStyle="round" borderColor="blue">
          <Box flexDirection="column">
            <Text color={downloadProgress.status === 'error' ? 'red' : 'blue'}>
              {downloadProgress.message}
            </Text>
            {downloadProgress.status === 'downloading' && (
              <Box marginTop={1}>
                <ModelDownloadProgressBar 
                  progress={downloadProgress.progress} 
                  width={40}
                  color={downloadProgress.status === 'error' ? 'red' : 'blue'}
                />
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

// Reuse progress bar pattern from LogItems
const ModelDownloadProgressBar: React.FC<{
  progress: number;
  width: number;
  color?: string;
}> = ({ progress, width, color = 'blue' }) => {
  const filled = Math.floor((progress / 100) * width);
  const empty = width - filled;
  
  return (
    <Text color={color}>
      {'█'.repeat(filled)}{'░'.repeat(empty)} {Math.round(progress)}%
    </Text>
  );
};
```

**Success Criteria**:
- [x] Progress display integrated into ManageFolderItem
- [x] Reuses existing LogItems progress bar pattern
- [x] WebSocket events properly handled
- [x] Visual consistency with existing TUI elements

---

### Sub-Task 10.9: Add WebSocket Model List Endpoint
**Priority**: MEDIUM  
**Estimated Time**: 1 hour  

**Create**: `src/daemon/websocket/handlers/models.ts`
```typescript
import { WebSocketMessageHandler } from '../interfaces/websocket-handler.js';
import { WebSocket } from 'ws';
import { readFileSync } from 'fs';
import { join } from 'path';

export class ModelsHandler implements WebSocketMessageHandler {
  
  async handleMessage(message: any, ws: WebSocket): Promise<void> {
    if (message.type === 'models_list') {
      try {
        // Get supported models from system configuration
        const supportedModels = this.getSupportedModels();

        ws.send(JSON.stringify({
          type: 'models_list_response',
          requestId: message.requestId,
          data: {
            models: supportedModels,
            backend: 'python',
            cached: await this.getCachedModelStatus(supportedModels)
          }
        }));
      } catch (error) {
        ws.send(JSON.stringify({
          type: 'error',
          requestId: message.requestId,
          error: 'Failed to get model list'
        }));
      }
    }
  }

  private getSupportedModels(): string[] {
    try {
      // Read from system configuration
      const configPath = join(process.cwd(), 'system-configuration.json');
      const config = JSON.parse(readFileSync(configPath, 'utf8'));
      return config.embeddings?.python?.supportedModels || this.getFallbackModels();
    } catch (error) {
      return this.getFallbackModels();
    }
  }

  private getFallbackModels(): string[] {
    return [
      'all-MiniLM-L6-v2',
      'all-mpnet-base-v2'
    ];
  }

  private async getCachedModelStatus(models: string[]): Promise<{[key: string]: boolean}> {
    // Quick cache status check (optional enhancement)
    const status: {[key: string]: boolean} = {};
    for (const model of models) {
      // For now, assume not cached - daemon can check later
      status[model] = false;
    }
    return status;
  }
}
```

**Success Criteria**:
- [ ] WebSocket endpoint returns model list from configuration
- [ ] Fast response (no external API calls)
- [ ] Proper error handling and fallback
- [ ] Simple model names only (no metadata)

---

### Sub-Task 10.10: Update AddFolderWizard Model Selection
**Priority**: HIGH  
**Estimated Time**: 2 hours  

**Update**: `src/interfaces/tui-ink/components/FirstRunWizard.tsx`
```typescript
// Add model selection state
const [availableModels, setAvailableModels] = useState<string[]>([]);
const [selectedModel, setSelectedModel] = useState<string>('');
const [modelSelectionIndex, setModelSelectionIndex] = useState<number>(0);

useEffect(() => {
  // Fetch available models when wizard starts
  const fetchModels = async () => {
    try {
      // Request model list from daemon via WebSocket
      const response = await webSocketService.request('models_list', {});
      const models = response.data.models || ['all-MiniLM-L6-v2'];
      
      setAvailableModels(models);
      setSelectedModel(models[0]); // Default to first model
      setModelSelectionIndex(0);
    } catch (error) {
      console.error('Failed to fetch models:', error);
      // Fallback to default model
      const fallbackModels = ['all-MiniLM-L6-v2'];
      setAvailableModels(fallbackModels);
      setSelectedModel(fallbackModels[0]);
      setModelSelectionIndex(0);
    }
  };
  
  fetchModels();
}, []);

// Add model selection step to wizard
const renderModelSelection = () => (
  <Box flexDirection="column">
    <Text color="blue" bold>Select Embedding Model:</Text>
    <Text color="gray" marginTop={1}>
      Choose a model for document processing and semantic search:
    </Text>
    
    <Box marginTop={2} flexDirection="column">
      {availableModels.map((model, index) => (
        <Box key={model} marginY={0}>
          <Text color={index === modelSelectionIndex ? 'green' : 'white'}>
            {index === modelSelectionIndex ? '→ ' : '  '}
            {model}
            {index === 0 && ' (recommended)'}
          </Text>
        </Box>
      ))}
    </Box>
    
    <Box marginTop={2}>
      <Text color="gray">Use ↑/↓ to select, Enter to confirm</Text>
    </Box>
  </Box>
);

// Add keyboard handling for model selection
const handleModelSelectionInput = (input: string, key: Key) => {
  if (key.upArrow) {
    const newIndex = Math.max(0, modelSelectionIndex - 1);
    if (newIndex !== modelSelectionIndex) {
      setModelSelectionIndex(newIndex);
      setSelectedModel(availableModels[newIndex]);
      return true;
    }
  } else if (key.downArrow) {
    const newIndex = Math.min(availableModels.length - 1, modelSelectionIndex + 1);
    if (newIndex !== modelSelectionIndex) {
      setModelSelectionIndex(newIndex);
      setSelectedModel(availableModels[newIndex]);
      return true;
    }
  } else if (key.return) {
    // Proceed to next step with selected model
    onModelSelected(selectedModel);
    return true;
  }
  return false;
};
```

**Success Criteria**:
- [ ] Model selection dropdown populated from WebSocket endpoint
- [ ] Simple model name display (no metadata complexity)
- [ ] Keyboard navigation works properly
- [ ] First model marked as recommended

---

### Sub-Task 10.12: Implement Python Process Keep-Alive System ✅ COMPLETED
**Priority**: HIGH  
**Estimated Time**: 3 hours  
**Status**: ✅ COMPLETED

**Implementation Goal**: Add configurable keep-alive system for Python process lifecycle management.

**Features Required**:
1. **5-minute keep-alive after immediate requests** - Keep Python process running for 5 minutes after last search request
2. **Configurable timers** - Make both crawling pause (1-minute) and keep-alive (5-minute) configurable
3. **Immediate request prioritization** - Search requests are "immediate" and should reset keep-alive timer
4. **Comprehensive testing** - Use Jest fake timers with ~10 second test timeouts
5. **Process lifecycle management** - Proper startup, keep-alive, and shutdown handling

**Implementation Approach**:
```typescript
// Configuration additions to system-configuration.json
{
  "embeddings": {
    "python": {
      "processManagement": {
        "crawlingPauseMinutes": 1,    // 1 minute pause after search
        "keepAliveMinutes": 5,        // 5 minutes keep-alive
        "shutdownGracePeriodSeconds": 30
      }
    }
  }
}
```

**Key Components to Update**:
- `src/infrastructure/embeddings/python-embedding-service.ts` - Process lifecycle management
- `src/infrastructure/embeddings/python/handlers/embedding_handler.py` - Timer management 
- `src/config/system-configuration.json` - Configurable timers
- `tests/integration/python-process-lifecycle.test.ts` - Comprehensive testing with fake timers

**Testing Strategy**:
```typescript
// Use Jest fake timers for fast async testing
describe('Python Process Keep-Alive', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  
  it('should keep process alive for 5 minutes after immediate request', async () => {
    // Fast test with ~10 second timeouts instead of real 5 minutes
  });
});
```

**Success Criteria**:
- [x] Python process stays alive for configurable period after immediate requests
- [x] Crawling pause duration is configurable (default 1 minute)
- [x] Keep-alive duration is configurable (default 5 minutes)
- [x] Comprehensive tests use fake timers with ~10 second timeouts
- [x] Process shutdown is graceful with proper cleanup
- [x] Integration with existing search request handling

**Implementation Summary**:
✅ **Configuration System**: Added `processManagement` configuration to `system-configuration.json` with configurable timers:
   - `crawlingPauseMinutes`: 1 (pause batch processing after immediate requests)
   - `keepAliveMinutes`: 5 (keep Python process alive after last immediate request)
   - `shutdownGracePeriodSeconds`: 30 (graceful shutdown timeout)

✅ **Python Handler Updates**: Enhanced `embedding_handler.py` with keep-alive timer system:
   - `_reset_keep_alive_timer()`: Resets timer for immediate requests
   - `_handle_keep_alive_timeout()`: Graceful shutdown after timeout
   - `_graceful_shutdown_worker()`: Clean process termination

✅ **Node.js Service Enhancement**: Updated `python-embedding-service.ts` with:
   - Process lifecycle management with auto-restart capability
   - Health monitoring with restart triggers
   - Configurable restart attempts with exponential backoff
   - Graceful shutdown prevention of auto-restart
   - Integration with model download and cache checking

✅ **Testing Infrastructure**: Created comprehensive integration tests with:
   - Vitest fake timers for fast async testing
   - Process lifecycle validation
   - Keep-alive functionality verification
   - Health check and restart logic testing
   - Model download and cache validation

**Architecture Integration**:
- Integrates with existing priority-based processing system
- Extends current crawling pause mechanism with configurable keep-alive
- Maintains compatibility with immediate vs batch request prioritization
- Uses existing configuration management system

---

### Sub-Task 10.11: Integration Testing and Documentation
**Priority**: MEDIUM  
**Estimated Time**: 2 hours  

**Create**: `tests/integration/python-model-management.test.ts`
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DaemonService } from '../../src/domain/daemon/daemon-service.js';

describe('Python Model Management Integration', () => {
  let daemon: DaemonService;
  let mockWebSocket: any;
  
  beforeAll(async () => {
    daemon = new DaemonService(testConfig);
    await daemon.start();
    
    // Mock WebSocket for progress events
    mockWebSocket = {
      broadcast: vi.fn(),
      on: vi.fn(),
      off: vi.fn()
    };
    daemon.webSocketServer = mockWebSocket;
  });
  
  afterAll(async () => {
    await daemon.stop();
  });
  
  it('should download model with progress events', async () => {
    const progressEvents: any[] = [];
    mockWebSocket.broadcast.mockImplementation((event, data) => {
      progressEvents.push({ event, data });
    });
    
    // Trigger model download
    await daemon.downloadModelIfNeeded('all-MiniLM-L6-v2');
    
    // Verify progress events were broadcast
    expect(progressEvents).toContainEqual({
      event: 'model_download_start',
      data: { modelName: 'all-MiniLM-L6-v2', status: 'downloading' }
    });
    
    expect(progressEvents).toContainEqual({
      event: 'model_download_complete',
      data: { modelName: 'all-MiniLM-L6-v2', status: 'ready' }
    });
  });

  it('should skip download for already cached models', async () => {
    // Mock model as already cached
    const embeddingService = daemon.container.resolve('EMBEDDING_SERVICE');
    vi.spyOn(embeddingService, 'isModelCached').mockResolvedValue(true);
    
    const progressEvents: any[] = [];
    mockWebSocket.broadcast.mockImplementation((event, data) => {
      progressEvents.push({ event, data });
    });
    
    await daemon.downloadModelIfNeeded('all-MiniLM-L6-v2');
    
    // Should not broadcast download events for cached models
    expect(progressEvents).toHaveLength(0);
  });

  it('should handle model download errors gracefully', async () => {
    const embeddingService = daemon.container.resolve('EMBEDDING_SERVICE');
    vi.spyOn(embeddingService, 'downloadModel').mockRejectedValue(
      new Error('Network error')
    );
    
    const progressEvents: any[] = [];
    mockWebSocket.broadcast.mockImplementation((event, data) => {
      progressEvents.push({ event, data });
    });
    
    await expect(daemon.downloadModelIfNeeded('invalid-model')).rejects.toThrow('Network error');
    
    expect(progressEvents).toContainEqual({
      event: 'model_download_error',
      data: { modelName: 'invalid-model', error: 'Network error' }
    });
  });
});
```

**Update**: `README.md` section
```markdown
## Python Embeddings Model Management

The Python embedding backend uses a curated list of high-quality sentence-transformer models:

### Supported Models
- **all-MiniLM-L6-v2** (default) - Fast, 384 dimensions, good general performance
- **all-mpnet-base-v2** - Higher quality, 768 dimensions, better accuracy
- **all-MiniLM-L12-v2** - Balanced option, 384 dimensions
- **all-distilroberta-v1** - Specialized for certain domains
- **paraphrase-MiniLM-L6-v2** - Optimized for paraphrase detection

### Model Downloads
- Models are downloaded automatically when first selected
- Progress is shown in the TUI during downloads
- Models are cached locally using sentence-transformers caching
- No need to manually manage model files

### Configuration
Models are configured in `system-configuration.json`:
```json
{
  "embeddings": {
    "python": {
      "supportedModels": [
        "all-MiniLM-L6-v2",
        "all-mpnet-base-v2"
      ]
    }
  }
}
```

### For More Models
If you need access to more embedding models, use the Ollama backend:
```bash
folder-mcp config set processing.embeddingBackend ollama
ollama pull nomic-embed-text
```
```

**Success Criteria**:
- [ ] Integration tests pass for complete download flow
- [ ] Error handling tested for network issues
- [ ] Documentation covers model selection and configuration
- [ ] User guide explains model characteristics

---

## Testing Strategy

### Unit Tests
- Model validation against configuration list
- WebSocket endpoint responses
- Progress event handling
- TUI component rendering

### Integration Tests
- Complete model download flow
- Daemon-Python communication
- TUI progress display during downloads
- AddFolderWizard model selection

### User Acceptance Tests
- Wizard shows model list from configuration
- Model downloads with visible progress
- First embedding generation works after download
- Error handling for unsupported models

---

## Success Metrics

### Performance Targets
- Model list loads instantly (< 100ms)
- Download progress updates every 2-5 seconds
- First embedding generation within 30s of model selection
- TUI remains responsive during downloads

### User Experience Goals
- Clear model selection without guessing names
- Visible progress for all long operations
- No hidden downloads or surprises
- Consistent progress display patterns

### Technical Requirements
- Configuration-driven model list (no hardcoding)
- Reuse existing TUI progress components
- WebSocket integration with daemon
- Proper error handling and recovery

---

## Implementation Notes

### Key Architectural Decisions
1. **Configuration-based model list** - stored in system-configuration.json
2. **Daemon-orchestrated downloads** - centralized progress tracking
3. **TUI progress integration** - reuse LogItems patterns
4. **Simple model names only** - no metadata complexity for now

---

## Testing Strategy

### Unit Tests
- Model validation against configuration list
- WebSocket endpoint responses
- Progress event handling
- TUI component rendering

### Integration Tests
- Complete model download flow
- Daemon-Python communication
- TUI progress display during downloads
- AddFolderWizard model selection

### User Acceptance Tests
- Wizard shows model list from configuration
- Model downloads with visible progress
- First embedding generation works after download
- Error handling for unsupported models

---

## Success Metrics

### Performance Targets
- Model list loads instantly (< 100ms)
- Download progress updates every 2-5 seconds
- First embedding generation within 30s of model selection
- TUI remains responsive during downloads

### User Experience Goals
- Clear model selection without guessing names
- Visible progress for all long operations
- No hidden downloads or surprises
- Consistent progress display patterns

### Technical Requirements
- Configuration-driven model list (no hardcoding)
- Reuse existing TUI progress components
- WebSocket integration with daemon
- Proper error handling and recovery

---

## Implementation Notes

### Key Architectural Decisions
1. **Configuration-based model list** - stored in system-configuration.json
2. **Daemon-orchestrated downloads** - centralized progress tracking
3. **TUI progress integration** - reuse LogItems patterns
4. **Simple model names only** - no metadata complexity for now

### Future Enhancements (Post-Implementation)
- Rich model metadata with descriptions
- Model recommendation based on content type
- Download progress caching/resumption
- Model size and resource requirements display
- Custom model addition interface

---

## Next Steps

After completing this task:
1. Performance optimization based on benchmarks
2. Additional model support
3. Advanced features (caching, quantization)
4. Web UI integration for model selection