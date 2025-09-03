/**
 * ONNX Worker Thread
 * Runs in a separate thread to process embedding requests without blocking the main event loop
 */

import { parentPort, workerData } from 'worker_threads';
import { pipeline } from '@xenova/transformers';

interface WorkerData {
  modelId: string;
  modelConfig: any;
  workerId: number;
  numThreads?: number; // Configuration parameter (not used for monkey-patching)
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
  workerId?: number;
  modelPath?: string;
}

// Worker state
let model: any = null;
let modelConfig: any = null;
let workerId: number = -1;
let modelPath: string = '';

/**
 * Initialize the worker and load the model
 */
async function initialize(): Promise<void> {
  try {
    const data = workerData as WorkerData;
    workerId = data.workerId;
    modelConfig = data.modelConfig;
    
    // Extract model name from ID (format: "cpu:model-name")
    const modelName = data.modelId.split(':')[1] || data.modelId;
    
    // Use the huggingfaceId from model config if available
    modelPath = modelConfig.huggingfaceId || modelName;
    
    console.log(`[Worker ${workerId}] Initializing with model ${data.modelId}`);
    if (data.numThreads) {
      console.log(`[Worker ${workerId}] Thread configuration: ${data.numThreads} (provided via config)`);
    }
    console.log(`[Worker ${workerId}] Loading model from ${modelPath}`);
    
    // Load the model using Transformers.js
    model = await pipeline('feature-extraction', modelPath);
    
    console.log(`[Worker ${workerId}] Model loaded successfully`);
    
    // Notify main thread that worker is ready with enhanced diagnostics
    parentPort?.postMessage({ 
      type: 'initialized',
      workerId: workerId,
      modelPath: modelPath
    } as WorkerResponse);
  } catch (error) {
    console.error(`[Worker ${workerId}] Initialization error:`, error);
    parentPort?.postMessage({
      type: 'error',
      error: `Failed to initialize worker: ${error}`,
      workerId: workerId,
      modelPath: modelPath
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
      console.log(`[Worker ${workerId}] Shutting down`);
      if (model) {
        model = null;
      }
      process.exit(0);
      
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