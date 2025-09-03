/**
 * ONNX Worker Thread Pool
 * Manages a pool of worker threads for CPU-intensive ONNX embedding operations
 * Prevents event loop blocking by offloading model operations to worker threads
 */

import { Worker } from 'worker_threads';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { EventEmitter } from 'events';

export interface EmbeddingTask {
  id: string;
  texts: string[];
  options: {
    pooling?: string;
    normalize?: boolean;
  };
}

export interface WorkerMessage {
  type: 'initialize' | 'embed' | 'shutdown';
  data?: any;
  taskId?: string;
}

export interface WorkerResponse {
  type: 'ready' | 'result' | 'error' | 'initialized';
  taskId?: string;
  embeddings?: number[][];
  error?: string;
}

interface WorkerInfo {
  worker: Worker;
  busy: boolean;
  taskQueue: Array<{
    task: EmbeddingTask;
    resolve: (value: number[][]) => void;
    reject: (error: Error) => void;
  }>;
}

export class ONNXWorkerPool extends EventEmitter {
  private workers: WorkerInfo[] = [];
  private roundRobinIndex = 0;
  private modelId: string;
  private modelConfig: any;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  private poolSize: number;
  private numThreads: number | undefined;

  constructor(modelId: string, modelConfig: any, poolSize?: number, numThreads?: number) {
    super();
    this.modelId = modelId;
    this.modelConfig = modelConfig;
    this.numThreads = numThreads !== undefined ? numThreads : 2; // Optimal 2 threads from CPM testing
    
    // Default pool size: Optimal 2 workers from CPM testing
    // Previous logic was CPU-based but testing showed 2 is optimal
    this.poolSize = poolSize || 2;
    
    console.error(`[ONNXWorkerPool] Creating pool with ${this.poolSize} workers, ${this.numThreads || 'auto'} threads each for model ${modelId}`);
  }

  /**
   * Initialize the worker pool
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.doInitialize();
    await this.initializationPromise;
    this.isInitialized = true;
  }

  private async doInitialize(): Promise<void> {
    const initPromises: Promise<void>[] = [];

    for (let i = 0; i < this.poolSize; i++) {
      initPromises.push(this.createWorker(i));
    }

    await Promise.all(initPromises);
    console.error(`[ONNXWorkerPool] All ${this.poolSize} workers initialized successfully`);
  }

  private async createWorker(index: number): Promise<void> {
    return new Promise((resolve, reject) => {
      // Get the directory of the current module
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      
      // Handle both test environment (src/) and production environment (dist/)
      let workerPath = path.join(__dirname, 'onnx-worker.js');
      
      // If running from src/ (test environment), look in dist/ instead
      if (__dirname.includes('/src/')) {
        const distPath = __dirname.replace('/src/', '/dist/src/');
        workerPath = path.join(distPath, 'onnx-worker.js');
      }
      
      const worker = new Worker(workerPath, {
        workerData: {
          modelId: this.modelId,
          modelConfig: this.modelConfig,
          workerId: index,
          numThreads: this.numThreads
        }
      });

      const workerInfo: WorkerInfo = {
        worker,
        busy: false,
        taskQueue: []
      };

      // Handle worker messages
      worker.on('message', (response: WorkerResponse) => {
        if (response.type === 'initialized') {
          console.error(`[ONNXWorkerPool] Worker ${index} initialized`);
          this.workers.push(workerInfo);
          resolve();
        } else if (response.type === 'result' || response.type === 'error') {
          this.handleWorkerResponse(workerInfo, response);
        }
      });

      worker.on('error', (error) => {
        console.error(`[ONNXWorkerPool] Worker ${index} error:`, error);
        // Only reject initialization if worker not yet initialized
        if (!this.workers.includes(workerInfo)) {
          reject(error);
        } else {
          // Worker already initialized, just handle the error
          this.handleWorkerError(workerInfo, error);
        }
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          console.error(`[ONNXWorkerPool] Worker ${index} exited with code ${code}`);
          this.handleWorkerExit(workerInfo);
        }
      });

      // Initialize the worker
      worker.postMessage({ type: 'initialize' } as WorkerMessage);
    });
  }

  /**
   * Process embeddings using a worker thread
   */
  async processEmbeddings(texts: string[], options: any = {}): Promise<number[][]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const task: EmbeddingTask = {
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        texts,
        options
      };

      // Get next available worker using round-robin
      const worker = this.getNextWorker();
      
      if (!worker) {
        reject(new Error('No workers available'));
        return;
      }

      // Add task to worker's queue
      worker.taskQueue.push({ task, resolve, reject });

      // Process if worker is not busy
      if (!worker.busy) {
        this.processNextTask(worker);
      }
    });
  }

  private getNextWorker(): WorkerInfo | null {
    if (this.workers.length === 0) {
      return null;
    }

    // Round-robin selection
    const startIndex = this.roundRobinIndex;
    let attempts = 0;

    while (attempts < this.workers.length) {
      const worker = this.workers[this.roundRobinIndex];
      this.roundRobinIndex = (this.roundRobinIndex + 1) % this.workers.length;
      
      // Prefer workers with shorter queues
      if (worker && (!worker.busy || worker.taskQueue.length < 5)) {
        return worker;
      }
      
      attempts++;
    }

    // If all workers are busy, return the one with shortest queue
    const shortestQueueWorker = this.workers.reduce((prev, curr) => 
      prev.taskQueue.length <= curr.taskQueue.length ? prev : curr
    );
    return shortestQueueWorker || null;
  }

  private processNextTask(workerInfo: WorkerInfo): void {
    if (workerInfo.taskQueue.length === 0) {
      workerInfo.busy = false;
      return;
    }

    workerInfo.busy = true;
    const taskItem = workerInfo.taskQueue[0];
    if (!taskItem) {
      workerInfo.busy = false;
      return;
    }
    
    const { task } = taskItem;

    // Send task to worker
    workerInfo.worker.postMessage({
      type: 'embed',
      taskId: task.id,
      data: {
        texts: task.texts,
        options: task.options
      }
    } as WorkerMessage);
  }

  private handleWorkerResponse(workerInfo: WorkerInfo, response: WorkerResponse): void {
    if (workerInfo.taskQueue.length === 0) {
      console.error('[ONNXWorkerPool] Received response but no tasks in queue');
      return;
    }

    const { resolve, reject } = workerInfo.taskQueue.shift()!;

    if (response.type === 'error') {
      reject(new Error(response.error || 'Unknown worker error'));
    } else if (response.type === 'result' && response.embeddings) {
      resolve(response.embeddings);
    } else {
      reject(new Error('Invalid worker response'));
    }

    // Process next task if any
    this.processNextTask(workerInfo);
  }

  private handleWorkerError(workerInfo: WorkerInfo, error: Error): void {
    // Reject all pending tasks for this worker
    while (workerInfo.taskQueue.length > 0) {
      const { reject } = workerInfo.taskQueue.shift()!;
      reject(error);
    }
    workerInfo.busy = false;
  }

  private handleWorkerExit(workerInfo: WorkerInfo): void {
    // Remove worker from pool
    const index = this.workers.indexOf(workerInfo);
    if (index !== -1) {
      this.workers.splice(index, 1);
    }

    // Reject all pending tasks
    while (workerInfo.taskQueue.length > 0) {
      const { reject } = workerInfo.taskQueue.shift()!;
      reject(new Error('Worker exited unexpectedly'));
    }

    // Try to create a replacement worker
    if (this.isInitialized && this.workers.length < this.poolSize) {
      console.error('[ONNXWorkerPool] Creating replacement worker');
      // Use a unique index for the replacement worker
      const replacementIndex = Date.now();
      this.createWorker(replacementIndex).catch(error => {
        console.error('[ONNXWorkerPool] Failed to create replacement worker:', error);
      });
    }
  }

  /**
   * Shutdown all workers
   */
  async shutdown(): Promise<void> {
    console.error(`[ONNXWorkerPool] Shutting down ${this.workers.length} workers`);
    
    const shutdownPromises = this.workers.map(workerInfo => {
      return new Promise<void>((resolve) => {
        // Reject pending tasks
        while (workerInfo.taskQueue.length > 0) {
          const { reject } = workerInfo.taskQueue.shift()!;
          reject(new Error('Worker pool shutting down'));
        }

        // Send shutdown message
        workerInfo.worker.postMessage({ type: 'shutdown' } as WorkerMessage);
        
        // Wait for worker to acknowledge shutdown or timeout
        const shutdownTimeout = setTimeout(() => {
          workerInfo.worker.terminate();
          resolve();
        }, 5000); // Allow more time for cleanup
        
        // Listen for shutdown acknowledgment
        workerInfo.worker.once('message', (msg: WorkerResponse) => {
          if (msg.type === 'ready') { // Worker acknowledged shutdown
            clearTimeout(shutdownTimeout);
            workerInfo.worker.terminate();
            resolve();
          }
        });
      });
    });

    await Promise.all(shutdownPromises);
    this.workers = [];
    this.isInitialized = false;
    this.initializationPromise = null;
    console.error('[ONNXWorkerPool] Shutdown complete');
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    workerCount: number;
    busyWorkers: number;
    totalQueueLength: number;
    isInitialized: boolean;
  } {
    const busyWorkers = this.workers.filter(w => w.busy).length;
    const totalQueueLength = this.workers.reduce((sum, w) => sum + w.taskQueue.length, 0);

    return {
      workerCount: this.workers.length,
      busyWorkers,
      totalQueueLength,
      isInitialized: this.isInitialized
    };
  }
}