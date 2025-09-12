# Sprint 12.1: Course Correction - Python Embeddings Stability Fix

**Sprint Type**: Course Correction (Emergency Fix)  
**Sprint Duration**: 2-4 hours  
**Priority**: CRITICAL  
**Risk Level**: Low (Python-only changes, easily reversible)

## Problem Statement

The Python embeddings service has a race condition that causes model unloading during active work, leading to:
- MPS assertion failures: "Cannot commit an already committed command buffer"
- Request timeouts during heavy processing
- System instability when switching between indexing and MCP requests

## Root Cause Analysis

### What's Actually Happening
```
1. Large indexing job running (1000+ chunks)
2. Keep-alive timer fires after 5 minutes
3. Checks if queue empty/no current request
4. ⚠️ RACE CONDITION: Between check and unload, new request arrives
5. Model starts unloading while new request tries to use it
6. 💥 MPS/CUDA error - trying to use freed GPU memory
```

### Current Architecture (Actually Good!)
- ✅ Python process stays alive indefinitely (correct)
- ✅ Model loads on-demand, unloads when idle (smart)
- ✅ Keep-alive only manages model, not process (efficient)
- ❌ Race condition in unload decision (needs fixing)

## Sprint Objectives

1. **Implement Progress Heartbeat System** - Python reports progress with timestamps
2. **Remove fixed timeouts** - Replace with progress-based monitoring
3. **Fix the race condition** - Make model unload decision atomic
4. **Optimize memory cleanup** - Keep it, but time it better

## New Architecture: Progress-Based Monitoring

### The Problem with Timeouts
```
Current: Node.js waits 3 minutes → Timeout → Assumes Python is dead → Kills it
Reality: Python is processing chunk 567 of 1000 → Gets killed while working!
```

### The Solution: Progress Heartbeats
```
New: Python sends progress updates with timestamps
     Node.js monitors timestamp progression
     Only restarts if timestamps stop updating for extended period
```

## Implementation Plan

### Phase 1: Python Progress Reporter (1.5 hours)

**File**: `src/infrastructure/embeddings/python/handlers/embedding_handler.py`

Add progress reporting to Python:

```python
import json
import sys
import time

class EmbeddingHandler:
    def __init__(self):
        self.last_progress_time = 0
        self.state = 'IDLE'  # IDLE | WORKING | UNLOADING
        self.state_lock = threading.Lock()
        
    def _send_progress(self, status: str, current: int = 0, total: int = 0, details: str = ""):
        """Send progress update to Node.js via stdout"""
        progress_update = {
            'jsonrpc': '2.0',
            'method': 'progress_update',
            'params': {
                'type': 'progress',
                'status': status,
                'current': current,
                'total': total,
                'timestamp': time.time(),
                'details': details,
                'message': f"{status}: {current}/{total}" if total > 0 else status
            }
        }
        
        # Send to stdout for Node.js to receive
        print(json.dumps(progress_update), flush=True)
        self.last_progress_time = time.time()
    
    async def _generate_embeddings_sync(self, texts: List[str], ...):
        """Process embeddings with progress reporting"""
        total_texts = len(texts)
        embeddings = []
        
        # Report start
        self._send_progress('processing_embeddings', 0, total_texts)
        
        for i in range(0, total_texts, batch_size):
            batch = texts[i:i + batch_size]
            batch_num = i // batch_size + 1
            total_batches = (total_texts + batch_size - 1) // batch_size
            
            # Report batch progress
            self._send_progress(
                'processing_batch',
                current=i,
                total=total_texts,
                details=f"Batch {batch_num}/{total_batches}"
            )
            
            # Process batch
            with torch.no_grad():
                outputs = self.model.encode(batch, ...)
            embeddings.extend(outputs)
            
            # Report completion of this batch
            processed = min(i + batch_size, total_texts)
            self._send_progress(
                'processing_embeddings',
                current=processed,
                total=total_texts,
                details=f"Completed {processed} embeddings"
            )
            
            # Memory cleanup between batches (with progress)
            if i + batch_size < total_texts and self.device == 'mps':
                self._send_progress('cleaning_memory', 0, 0)
                self._light_memory_cleanup()
        
        # Report completion
        self._send_progress('completed', total_texts, total_texts)
        return embeddings
    
    def _load_model_sync(self):
        """Load model with progress reporting"""
        self._send_progress('loading_model', 0, 0, "Initializing model...")
        
        # Load model
        self.model = SentenceTransformer(...)
        
        self._send_progress('loading_model', 50, 100, "Moving to device...")
        self.model.to(self.device)
        
        self._send_progress('loading_model', 100, 100, "Model ready")
```

### Phase 2: Node.js Progress Monitor (1 hour)

**File**: `src/infrastructure/embeddings/python-embedding-service.ts`

Replace timeout-based monitoring with progress-based:

```typescript
interface ProgressUpdate {
  type: 'progress';
  status: string;
  current: number;
  total: number;
  timestamp: number;
  details: string;
  message: string;
}

class PythonEmbeddingService {
  private lastProgressUpdate: ProgressUpdate | null = null;
  private progressWatchdog: NodeJS.Timeout | null = null;
  private isProcessingActive: boolean = false;
  
  // Remove fixed request timeouts!
  private readonly PROGRESS_TIMEOUT_MS = 60000; // 1 minute without progress = problem
  private readonly IDLE_TIMEOUT_MS = 300000; // 5 minutes truly idle = maybe restart
  
  private handleJsonRpcResponse(responseStr: string): void {
    try {
      const message = JSON.parse(responseStr);
      
      // Check for progress updates (no 'id' field, just method)
      if (message.method === 'progress_update') {
        this.handleProgressUpdate(message.params);
        return;
      }
      
      // Normal response handling...
      const response: JsonRpcResponse = message;
      const pending = this.pendingRequests.get(response.id);
      if (pending) {
        clearTimeout(pending.timeout); // Clear timeout if any
        this.pendingRequests.delete(response.id);
        
        if (response.error) {
          pending.reject(new Error(`RPC Error: ${response.error.message}`));
        } else {
          pending.resolve(response.result);
        }
      }
    } catch (error) {
      console.error('Error parsing JSON-RPC response:', error);
    }
  }
  
  private handleProgressUpdate(progress: ProgressUpdate): void {
    // Store latest progress
    this.lastProgressUpdate = progress;
    this.isProcessingActive = true;
    
    // Log meaningful progress
    if (progress.total > 0) {
      const percentage = Math.round((progress.current / progress.total) * 100);
      console.error(`[EMBEDDING PROGRESS] ${progress.status}: ${percentage}% (${progress.current}/${progress.total}) - ${progress.details}`);
    } else {
      console.error(`[EMBEDDING PROGRESS] ${progress.status}: ${progress.details || progress.message}`);
    }
    
    // Reset watchdog - Python is alive!
    this.resetProgressWatchdog();
    
    // Mark as idle when completed
    if (progress.status === 'completed' || progress.status === 'idle') {
      this.isProcessingActive = false;
    }
  }
  
  private resetProgressWatchdog(): void {
    // Clear existing watchdog
    if (this.progressWatchdog) {
      clearTimeout(this.progressWatchdog);
    }
    
    // Only set watchdog if actively processing
    if (this.isProcessingActive) {
      this.progressWatchdog = setTimeout(() => {
        this.checkProgressHealth();
      }, this.PROGRESS_TIMEOUT_MS);
    }
  }
  
  private checkProgressHealth(): void {
    if (!this.lastProgressUpdate) {
      console.error('[PROGRESS] No progress updates received');
      return;
    }
    
    const timeSinceLastUpdate = Date.now() - (this.lastProgressUpdate.timestamp * 1000);
    
    if (timeSinceLastUpdate > this.PROGRESS_TIMEOUT_MS) {
      console.error(
        `[PROGRESS WARNING] No progress for ${Math.round(timeSinceLastUpdate / 1000)}s ` +
        `Last status: ${this.lastProgressUpdate.status}`
      );
      
      // Only consider restart if REALLY stuck
      if (timeSinceLastUpdate > this.IDLE_TIMEOUT_MS) {
        console.error('[PROGRESS ERROR] Python appears stuck, considering restart');
        this.handlePythonStuck();
      }
    } else {
      // Still healthy, check again later
      this.resetProgressWatchdog();
    }
  }
  
  private async sendJsonRpcRequest(method: string, params: any): Promise<any> {
    const requestId = `${method}_${this.nextRequestId++}`;
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method,
      params,
      id: requestId
    };
    
    return new Promise((resolve, reject) => {
      // NO TIMEOUT for embedding operations!
      // We rely on progress updates instead
      let timeout: NodeJS.Timeout | null = null;
      
      // Only add timeout for quick operations (health check, status)
      if (method === 'health_check' || method === 'is_model_cached') {
        timeout = setTimeout(() => {
          this.pendingRequests.delete(requestId);
          reject(new Error(`Request timeout: ${method} (30s)`));
        }, 30000);
      }
      
      // Store pending request
      this.pendingRequests.set(requestId, { resolve, reject, timeout });
      
      // Send request
      const requestStr = JSON.stringify(request) + '\n';
      this.pythonProcess?.stdin?.write(requestStr);
      
      // Start progress monitoring for embedding operations
      if (method === 'generate_embeddings') {
        this.isProcessingActive = true;
        this.resetProgressWatchdog();
      }
    });
  }
}
```

### Phase 3: Fix Race Condition in Model Unloading (30 minutes)

**File**: `src/infrastructure/embeddings/python/handlers/embedding_handler.py`

Ensure model never unloads while processing:

```python
def _handle_keep_alive_timeout(self) -> None:
    """Handle keep-alive timeout with atomic state check"""
    with self.state_lock:
        # Check all conditions atomically
        if (self.state != 'IDLE' or 
            self.request_queue.qsize() > 0 or 
            self.current_request is not None):
            
            logger.debug(f"Cannot unload - state={self.state}, queue={self.request_queue.qsize()}")
            self._reset_keep_alive_timer()
            return
        
        # Mark as unloading to prevent new work
        self.state = 'UNLOADING'
    
    # Report unloading progress
    self._send_progress('unloading_model', 0, 0, "Freeing GPU memory")
    
    # Safe to unload outside lock
    logger.info("Unloading model after idle timeout")
    self._unload_model()
    
    # Reset state
    with self.state_lock:
        self.state = 'IDLE'
    
    self._send_progress('idle', 0, 0, "Model unloaded, process ready")

def _light_memory_cleanup(self):
    """Lighter memory cleanup between batches"""
    if self.device == 'mps':
        # Synchronize before cleanup to avoid MPS errors
        torch.mps.synchronize()
        torch.mps.empty_cache()
```

### Phase 4: Testing & Validation (30 minutes)

## Test Scenarios

1. **Progress Monitoring Test**
   ```bash
   # Start indexing large folder
   # Watch logs for progress updates:
   [EMBEDDING PROGRESS] processing_embeddings: 10% (100/1000)
   [EMBEDDING PROGRESS] processing_embeddings: 20% (200/1000)
   # Verify no timeouts occur
   ```

2. **Heavy Load Test**
   ```bash
   # Index folder with 1000+ files
   # During indexing, send MCP search request
   # Verify:
   - Progress updates continue
   - No "Request timeout" errors
   - MCP request completes (priority queue)
   ```

3. **Idle Unload Test**
   ```bash
   # Send single search query
   # Wait 5 minutes
   # Check logs for:
   [EMBEDDING PROGRESS] unloading_model: Freeing GPU memory
   [EMBEDDING PROGRESS] idle: Model unloaded, process ready
   ```

4. **Stuck Detection Test**
   ```bash
   # Simulate stuck process (comment out progress updates)
   # Verify watchdog triggers after 1 minute:
   [PROGRESS WARNING] No progress for 60s
   # After 5 minutes:
   [PROGRESS ERROR] Python appears stuck, considering restart
   ```

## Success Metrics

### Must Have (Sprint Completion)
- [ ] Progress updates visible in logs during processing
- [ ] No timeout errors during heavy embedding operations
- [ ] Model never unloads while processing
- [ ] Python process never killed while working
- [ ] Watchdog only triggers when truly stuck

### Nice to Have (If Time Permits)
- [ ] Progress percentage shown to users
- [ ] Estimated time remaining calculations
- [ ] Memory usage in progress updates

## Key Improvements

### Before: Timeout-Based
- Fixed 3-minute timeout kills working Python
- No visibility into what Python is doing
- False positives when processing is slow

### After: Progress-Based
- No timeouts on embedding operations
- Real-time progress updates
- Only restart when progress stops

## Testing Checklist

```bash
# Test 1: Basic Operation
1. Start daemon
2. Run search query
3. Verify quick response
4. Check logs for clean execution

# Test 2: Heavy Load
1. Start indexing large folder (1000+ files)
2. During indexing, run search query
3. Verify search completes quickly (priority queue)
4. Verify no model unload during work

# Test 3: Idle Behavior  
1. Run single search query
2. Wait 5 minutes
3. Check logs for "Model unloaded"
4. Run another search
5. Verify model reloads (3-6 seconds)
6. Verify search completes

# Test 4: Race Condition
1. Start indexing
2. Force keep-alive timeout (reduce to 10 seconds for testing)
3. Verify model doesn't unload while indexing
4. Stop indexing
5. Verify model unloads after idle
```

## Rollback Plan

If issues arise:
1. Git stash changes in Python files  
2. Restart daemon
3. System returns to previous state

All changes are isolated to:
- `embedding_handler.py` (add progress reporting)
- `main.py` (handle progress messages)
- `python-embedding-service.ts` (remove timeouts, add progress handler)

No database migrations, no data structure changes, no API changes.

## Code Changes Summary

### Files to Modify
1. **src/infrastructure/embeddings/python/handlers/embedding_handler.py**
   - Add state management (IDLE/WORKING/UNLOADING)
   - Fix race condition with state_lock
   - Optimize memory cleanup timing
   - Clean up excessive logging

2. **src/infrastructure/embeddings/python-embedding-service.ts**
   - Increase/remove request timeouts
   - Add request-type-based timeouts

3. **src/infrastructure/embeddings/python/main.py**
   - No changes needed (process lifecycle is correct)

## Architecture Notes

- The current architecture is actually well-designed
- Python process stays alive, only model loads/unloads (smart!)
- Keep-alive mechanism works correctly
- We're replacing timeout-based monitoring with progress-based monitoring

## Sprint Completion Definition

Sprint is complete when:
1. Progress reporting implemented in Python
2. Progress monitoring implemented in Node.js
3. Request timeouts removed for embedding operations
4. Race condition fixed with state locks
5. All tests pass without timeout errors

## Why This Will Work

**The Core Insight**: A busy Python process that's sending progress updates is alive and working. Only kill it if progress stops for an extended period.

This eliminates false positives where Node.js kills Python just because it's taking longer than expected to process large batches.

---

**Ready to implement!** This progress-based approach is more robust and provides better visibility into what Python is actually doing.