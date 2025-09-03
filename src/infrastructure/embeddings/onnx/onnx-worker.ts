/**
 * ONNX Worker Thread
 * Runs in a separate thread to process embedding requests without blocking the main event loop
 */

import { parentPort, workerData } from 'worker_threads';
// Import and patch onnxruntime-node BEFORE xenova/transformers loads it
import * as ort from 'onnxruntime-node';

// Apply monkey-patch immediately at module load time
console.error('[Worker] Applying ONNX Runtime patches at module level...');
if (ort.InferenceSession && ort.InferenceSession.create) {
  const originalCreate = ort.InferenceSession.create;
  ort.InferenceSession.create = async function(model: any, options: any = {}) {
    // Extract thread count from options or use default
    const numThreads = options.intraOpNumThreads || 2;
    
    const enhancedOptions = {
      ...options,
      intraOpNumThreads: numThreads,
      interOpNumThreads: 1,
      executionMode: 'sequential',
      graphOptimizationLevel: 'basic',
      logSeverityLevel: 2,
      extra: {
        session: {
          intra_op_allow_spinning: '0',
          inter_op_allow_spinning: '0',
          use_deterministic_compute: '1'
        }
      }
    };
    
    console.error(`[Worker] 🎯 INTERCEPTED InferenceSession.create:`, {
      threads: enhancedOptions.intraOpNumThreads,
      spinning: 'disabled'
    });
    
    return originalCreate.call(this, model, enhancedOptions);
  };
  console.error('[Worker] ✅ Module-level patch applied to ort.InferenceSession.create');
}

import { pipeline, env } from '@xenova/transformers';

interface WorkerData {
  modelId: string;
  modelConfig: any;
  workerId: number;
  numThreads?: number;
}

interface WorkerMessage {
  type: 'initialize' | 'embed' | 'shutdown';
  data?: any;
  taskId?: string;
}

interface WorkerResponse {
  type: 'ready' | 'result' | 'error' | 'initialized';
  taskId?: string;
  embeddings?: number[][];
  error?: string;
}

// Worker state
let model: any = null;
let modelConfig: any = null;
let workerId: number = -1;

/**
 * Initialize the worker and load the model
 */
async function initialize(): Promise<void> {
  try {
    const data = workerData as WorkerData;
    workerId = data.workerId;
    modelConfig = data.modelConfig;
    
    console.error(`[Worker ${workerId}] Initializing with model ${data.modelId}`);
    
    // Configure thread control for ONNX Runtime Node.js
    const numThreads = data.numThreads || 2;
    
    // Configure ONNX Runtime environment
    console.error(`[Worker ${workerId}] ort imported, checking structure...`);
    console.error(`[Worker ${workerId}] ort.InferenceSession exists: ${!!ort.InferenceSession}`);
    console.error(`[Worker ${workerId}] ort.InferenceSession.create type: ${typeof ort.InferenceSession?.create}`);
    
    if (ort.env) {
      console.error(`[Worker ${workerId}] Configuring ONNX Runtime environment`);
      
      // Set WASM threads (even though we use CPU provider, this might help)
      if (ort.env.wasm) {
        ort.env.wasm.numThreads = numThreads;
        console.error(`[Worker ${workerId}] Set ort.env.wasm.numThreads = ${numThreads}`);
      }
    }
    
    // Update the module-level patch with the specific thread count for this worker
    if (ort.InferenceSession && ort.InferenceSession.create) {
      const originalCreate = ort.InferenceSession.create;
      ort.InferenceSession.create = async function(model: any, options: any = {}) {
        // Use the worker-specific thread count
        const enhancedOptions = {
          ...options,
          intraOpNumThreads: numThreads,
          interOpNumThreads: 1,
          executionMode: 'sequential',
          graphOptimizationLevel: 'basic',
          logSeverityLevel: 2,
          extra: {
            session: {
              intra_op_allow_spinning: '0',
              inter_op_allow_spinning: '0',
              use_deterministic_compute: '1'
            }
          }
        };
        
        console.error(`[Worker ${workerId}] 🎯 INTERCEPTED InferenceSession.create:`, {
          threads: enhancedOptions.intraOpNumThreads,
          spinning: 'disabled',
          executionMode: enhancedOptions.executionMode
        });
        
        return originalCreate.call(this, model, enhancedOptions);
      };
      console.error(`[Worker ${workerId}] ✅ Re-patched with worker-specific thread count: ${numThreads}`);
    }
    
    // Also set via Xenova's env for compatibility
    env.backends.onnx.wasm.numThreads = numThreads;
    console.error(`[Worker ${workerId}] Set env.backends.onnx.wasm.numThreads = ${numThreads}`);
    
    // Extract model name from ID (format: "cpu:model-name")
    const modelName = data.modelId.split(':')[1] || data.modelId;
    
    // Load the model using Transformers.js
    // Use the huggingfaceId from model config if available
    const modelPath = modelConfig.huggingfaceId || modelName;
    
    console.error(`[Worker ${workerId}] Loading model from ${modelPath} with ${numThreads} threads`);
    
    // Now load the model - it will use our patched InferenceSession.create if available
    model = await pipeline('feature-extraction', modelPath);
    
    console.error(`[Worker ${workerId}] Model loaded successfully`);
    
    // Notify main thread that worker is ready
    parentPort?.postMessage({ type: 'initialized' } as WorkerResponse);
  } catch (error) {
    console.error(`[Worker ${workerId}] Initialization error:`, error);
    parentPort?.postMessage({
      type: 'error',
      error: `Failed to initialize worker: ${error}`
    } as WorkerResponse);
  }
}

/**
 * Process embedding request
 */
async function processEmbeddings(texts: string[], options: any, taskId: string): Promise<void> {
  try {
    if (!model) {
      throw new Error('Model not initialized');
    }
    
    // Apply prefixes if needed (for E5 models)
    let processedTexts = texts;
    if (modelConfig?.requirements?.prefixes) {
      const prefix = options.textType === 'query' 
        ? modelConfig.requirements.prefixes.query || ''
        : modelConfig.requirements.prefixes.passage || '';
      
      if (prefix) {
        processedTexts = texts.map((text: string) => prefix + text);
      }
    }
    
    // Assume upstream chunking/tokenization has been done
    // Avoid double-truncation which can cause character vs token issues
    const truncatedTexts = processedTexts;
    
    // Generate embeddings
    const results = await model(truncatedTexts, {
      pooling: options.pooling || 'mean',
      normalize: options.normalize !== false
    });
    
    // Extract embeddings from results
    const embeddings: number[][] = [];
    
    if (Array.isArray(results)) {
      for (const result of results) {
        if (result && result.data) {
          embeddings.push(Array.from(result.data));
        }
      }
    } else if (results && results.data) {
      // Handle tensor result
      const data = Array.from(results.data) as number[];
      const embeddingDim = modelConfig?.dimensions || 384;
      
      // Split tensor data into individual embeddings
      for (let i = 0; i < texts.length; i++) {
        const start = i * embeddingDim;
        const end = start + embeddingDim;
        embeddings.push(data.slice(start, end));
      }
    }
    
    // Validate embedding count
    if (embeddings.length !== texts.length) {
      throw new Error(`Embedding count mismatch: expected ${texts.length}, got ${embeddings.length}`);
    }
    
    // Send results back to main thread
    parentPort?.postMessage({
      type: 'result',
      taskId,
      embeddings
    } as WorkerResponse);
    
  } catch (error) {
    console.error(`[Worker ${workerId}] Processing error:`, error);
    parentPort?.postMessage({
      type: 'error',
      taskId,
      error: `Failed to process embeddings: ${error}`
    } as WorkerResponse);
  }
}

/**
 * Handle messages from main thread
 */
function handleMessage(message: WorkerMessage): void {
  switch (message.type) {
    case 'initialize':
      initialize().catch(error => {
        console.error(`[Worker ${workerId}] Fatal initialization error:`, error);
        process.exit(1);
      });
      break;
      
    case 'embed':
      if (!message.data || !message.taskId) {
        parentPort?.postMessage({
          type: 'error',
          taskId: message.taskId,
          error: 'Invalid embed request'
        } as WorkerResponse);
        return;
      }
      
      if (!model) {
        parentPort?.postMessage({ 
          type: 'error', 
          taskId: message.taskId, 
          error: 'not_initialized' 
        } as WorkerResponse);
        return;
      }
      
      processEmbeddings(
        message.data.texts,
        message.data.options || {},
        message.taskId
      ).catch(error => {
        console.error(`[Worker ${workerId}] Unhandled processing error:`, error);
      });
      break;
      
    case 'shutdown':
      console.error(`[Worker ${workerId}] Shutting down`);
      if (model) {
        model = null;
      }
      process.exit(0);
      break;
      
    default:
      console.error(`[Worker ${workerId}] Unknown message type: ${message.type}`);
  }
}

// Set up message handler
if (parentPort) {
  parentPort.on('message', handleMessage);
} else {
  console.error('Worker started without parent port');
  process.exit(1);
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error(`[Worker ${workerId}] Uncaught exception:`, error);
  parentPort?.postMessage({
    type: 'error',
    error: `Worker crashed: ${error}`
  } as WorkerResponse);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(`[Worker ${workerId}] Unhandled rejection:`, reason);
  parentPort?.postMessage({
    type: 'error',
    error: `Worker unhandled rejection: ${reason}`
  } as WorkerResponse);
  process.exit(1);
});