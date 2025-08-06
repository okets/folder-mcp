/**
 * Python Embedding Service - Node.js Client
 * 
 * This service communicates with the Python embeddings process via JSON-RPC 2.0
 * over stdin/stdout. It provides the same interface as OllamaEmbeddingService
 * but uses a dedicated Python process for better performance and reliability.
 */

import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import type { TextChunk } from '../../types/index.js';
import type { 
  EmbeddingOperations, 
  EmbeddingVector, 
  EmbeddingResult, 
  BatchEmbeddingOperations 
} from '../../domain/embeddings/index.js';

/**
 * JSON-RPC 2.0 interfaces for communication
 */
interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id: string | number;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string | number;
}

interface PythonEmbeddingRequest {
  texts: string[];
  immediate?: boolean;
  model_name?: string;
  request_id?: string;
}

interface PythonEmbeddingResponse {
  embeddings: Array<{
    vector: number[];
    dimensions: number;
    model: string;
    created_at: string;
    chunk_id?: string;
  }>;
  success: boolean;
  processing_time_ms: number;
  model_info: {
    model_name: string;
    device: string;
    device_info: any;
    model_loaded: boolean;
    requests_processed: number;
    immediate_requests: number;
    batch_requests: number;
  };
  request_id?: string;
  error?: string;
}

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  model_loaded: boolean;
  gpu_available: boolean;
  memory_usage_mb: number;
  uptime_seconds: number;
  queue_size: number;
  request_id?: string;
}

/**
 * Configuration for Python embedding service
 */
interface PythonEmbeddingConfig {
  modelName: string;
  pythonPath?: string;
  scriptPath?: string;
  timeout: number;
  maxRetries: number;
  healthCheckInterval: number;
  autoRestart: boolean;
  maxRestartAttempts: number;
  restartDelay: number;
  // Test-only configuration for shorter durations
  testConfig?: {
    crawlingPauseSeconds?: number;  // Override crawling pause duration for testing
    keepAliveSeconds?: number;      // Override keep-alive duration for testing
    shutdownGracePeriodSeconds?: number;
  };
}

/**
 * Python Embedding Service Implementation
 */
export class PythonEmbeddingService implements EmbeddingOperations, BatchEmbeddingOperations {
  private readonly config: PythonEmbeddingConfig;
  private pythonProcess: ChildProcess | null = null;
  private initialized = false;
  private nextRequestId = 1;
  private pendingRequests = new Map<string | number, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private lastHealthCheck: HealthCheckResponse | null = null;
  private isShuttingDown = false;
  private restartAttempts = 0;
  private lastRestartTime = 0;
  private restartTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<PythonEmbeddingConfig>) {
    this.config = {
      modelName: 'all-MiniLM-L6-v2',
      pythonPath: 'python3',
      scriptPath: join(process.cwd(), 'src/infrastructure/embeddings/python/main.py'),
      timeout: 30000, // 30 seconds
      maxRetries: 3,
      healthCheckInterval: 30000, // 30 seconds
      autoRestart: true,
      maxRestartAttempts: 5,
      restartDelay: 2000, // 2 seconds
      ...config
    };
  }

  /**
   * Initialize the Python embedding service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      console.error(`Initializing Python embedding service with model: ${this.config.modelName}`);
      
      // Start Python process
      await this.startPythonProcess();
      
      // Perform initial health check
      const health = await this.healthCheck();
      if (health.status === 'unhealthy') {
        throw new Error('Python embedding service failed health check');
      }

      // Start periodic health checks
      this.startHealthCheckTimer();

      this.initialized = true;
      console.error('Python embedding service initialized successfully');
      
    } catch (error) {
      throw new Error(`Failed to initialize Python embedding service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a single embedding
   */
  async generateSingleEmbedding(text: string): Promise<EmbeddingVector> {
    const response = await this.generateEmbeddings([{ 
      content: text, 
      chunkIndex: 0, 
      startPosition: 0, 
      endPosition: text.length,
      tokenCount: Math.ceil(text.length / 4),
      metadata: {
        sourceFile: 'single-text',
        sourceType: 'text',
        totalChunks: 1,
        hasOverlap: false
      }
    }]);
    
    if (response.length === 0) {
      throw new Error('No embedding generated');
    }
    
    const embedding = response[0];
    if (!embedding) {
      throw new Error('No embedding generated');
    }
    
    return embedding;
  }

  /**
   * Generate embeddings for multiple chunks
   */
  async generateEmbeddings(chunks: TextChunk[]): Promise<EmbeddingVector[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const texts = chunks.map(chunk => chunk.content);
    const request: PythonEmbeddingRequest = {
      texts,
      immediate: true, // Single requests are considered immediate
      model_name: this.config.modelName,
      request_id: `req_${this.nextRequestId++}`
    };

    const response = await this.sendJsonRpcRequest('generate_embeddings', request);
    
    if (!response.success) {
      throw new Error(response.error || 'Embedding generation failed');
    }

    // Convert to EmbeddingVector format
    return response.embeddings.map((emb: any, index: number) => ({
      vector: emb.vector,
      dimensions: emb.dimensions,
      model: emb.model,
      createdAt: emb.created_at,
      chunkId: chunks[index] ? `chunk_${index}_${chunks[index].chunkIndex}` : undefined,
      metadata: {
        generatedAt: emb.created_at,
        modelVersion: emb.model,
        tokensUsed: Math.ceil(texts[index]?.length || 0 / 4),
        confidence: 1.0
      }
    }));
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  calculateSimilarity(vector1: EmbeddingVector, vector2: EmbeddingVector): number {
    if (vector1.vector.length !== vector2.vector.length) {
      throw new Error('Vectors must have the same dimensions for similarity calculation');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vector1.vector.length; i++) {
      const v1 = vector1.vector[i] ?? 0;
      const v2 = vector2.vector[i] ?? 0;
      dotProduct += v1 * v2;
      norm1 += v1 * v1;
      norm2 += v2 * v2;
    }

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Process embeddings in batches
   */
  async processBatch(chunks: TextChunk[], batchSize: number = 32): Promise<EmbeddingResult[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const results: EmbeddingResult[] = [];

    // Process in batches
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map(chunk => chunk.content);
      
      const request: PythonEmbeddingRequest = {
        texts,
        immediate: false, // Batch requests are not immediate
        model_name: this.config.modelName,
        request_id: `batch_${this.nextRequestId++}`
      };

      const startTime = Date.now();
      
      try {
        const response = await this.sendJsonRpcRequest('generate_embeddings', request);
        const processingTime = Date.now() - startTime;

        if (response.success) {
          // Convert successful results
          for (let j = 0; j < batch.length; j++) {
            const chunk = batch[j];
            const embedding = response.embeddings[j];
            
            if (chunk && embedding) {
              results.push({
                chunk,
                embedding: {
                  vector: embedding.vector,
                  dimensions: embedding.dimensions,
                  model: embedding.model,
                  createdAt: embedding.created_at,
                  chunkId: `chunk_${i + j}_${chunk.chunkIndex}`,
                  metadata: {
                    generatedAt: embedding.created_at,
                    modelVersion: embedding.model,
                    tokensUsed: Math.ceil(chunk.content.length / 4),
                    confidence: 1.0
                  }
                },
                processingTime,
                success: true
              });
            }
          }
        } else {
          // Handle batch failure
          for (let j = 0; j < batch.length; j++) {
            const chunk = batch[j];
            if (chunk) {
              results.push({
                chunk,
                embedding: {
                  vector: new Array(384).fill(0), // Default dimensions
                  dimensions: 384,
                  model: this.config.modelName,
                  createdAt: new Date().toISOString(),
                  chunkId: `chunk_${i + j}_${chunk.chunkIndex}`,
                  metadata: {
                    generatedAt: new Date().toISOString(),
                    modelVersion: this.config.modelName,
                    tokensUsed: 0,
                    confidence: 0
                  }
                },
                processingTime,
                success: false,
                error: response.error || 'Batch processing failed'
              });
            }
          }
        }
      } catch (error) {
        // Handle individual batch errors
        const processingTime = Date.now() - startTime;
        for (let j = 0; j < batch.length; j++) {
          const chunk = batch[j];
          if (chunk) {
            results.push({
              chunk,
              embedding: {
                vector: new Array(384).fill(0),
                dimensions: 384,
                model: this.config.modelName,
                createdAt: new Date().toISOString(),
                chunkId: `chunk_${i + j}_${chunk.chunkIndex}`,
                metadata: {
                  generatedAt: new Date().toISOString(),
                  modelVersion: this.config.modelName,
                  tokensUsed: 0,
                  confidence: 0
                }
              },
              processingTime,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }

      // Small delay between batches to be nice to the system
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    return results;
  }

  /**
   * Estimate processing time
   */
  estimateProcessingTime(chunkCount: number): number {
    // Python embeddings are faster than Ollama API calls
    return chunkCount * 50; // 50ms per chunk estimate
  }

  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get model configuration
   */
  getModelConfig(): any {
    return {
      model: this.config.modelName,
      pythonPath: this.config.pythonPath,
      scriptPath: this.config.scriptPath,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries
    };
  }

  /**
   * Perform health check
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    try {
      const response = await this.sendJsonRpcRequest('health_check', {
        request_id: `health_${this.nextRequestId++}`
      });
      
      this.lastHealthCheck = response;
      return response;
    } catch (error) {
      const unhealthyResponse: HealthCheckResponse = {
        status: 'unhealthy',
        model_loaded: false,
        gpu_available: false,
        memory_usage_mb: 0,
        uptime_seconds: 0,
        queue_size: 0
      };
      
      this.lastHealthCheck = unhealthyResponse;
      return unhealthyResponse;
    }
  }

  /**
   * Get last health check result
   */
  getLastHealthCheck(): HealthCheckResponse | null {
    return this.lastHealthCheck;
  }

  /**
   * Gracefully shutdown the service
   */
  async shutdown(timeoutSeconds: number = 30): Promise<void> {
    console.error('Shutting down Python embedding service...');

    try {
      // Mark as shutting down to prevent auto-restart
      this.isShuttingDown = true;
      
      // Cancel any pending restart timer
      if (this.restartTimer) {
        clearTimeout(this.restartTimer);
        this.restartTimer = null;
      }
      
      // Stop health check timer
      if (this.healthCheckTimer) {
        clearInterval(this.healthCheckTimer);
        this.healthCheckTimer = null;
      }

      // Send shutdown request to Python process
      if (this.pythonProcess) {
        try {
          // Use the shutdown timeout (plus a small buffer) for the JSON-RPC timeout
          const rpcTimeoutMs = (timeoutSeconds * 1000) + 1000; // Add 1 second buffer
          await this.sendJsonRpcRequest('shutdown', {
            timeout_seconds: timeoutSeconds,
            request_id: `shutdown_${this.nextRequestId++}`
          }, rpcTimeoutMs);
        } catch (error) {
          console.error('Error sending shutdown request:', error);
        }

        // Wait for process to exit gracefully
        const exitPromise = new Promise<void>((resolve) => {
          this.pythonProcess!.on('exit', () => resolve());
        });

        const timeoutPromise = new Promise<void>((resolve) => {
          setTimeout(resolve, timeoutSeconds * 1000);
        });

        await Promise.race([exitPromise, timeoutPromise]);

        // Force kill if still running
        if (!this.pythonProcess.killed) {
          this.pythonProcess.kill('SIGKILL');
        }

        this.pythonProcess = null;
      }

      // Reject all pending requests
      for (const [id, pending] of this.pendingRequests) {
        clearTimeout(pending.timeout);
        pending.reject(new Error('Service shutting down'));
      }
      this.pendingRequests.clear();

      this.initialized = false;
      console.error('Python embedding service shutdown complete');

    } catch (error) {
      console.error('Error during shutdown:', error);
      throw error;
    }
  }

  /**
   * Start the Python process
   */
  private async startPythonProcess(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.error(`Starting Python process: ${this.config.pythonPath} ${this.config.scriptPath} ${this.config.modelName}`);

      // Prepare environment variables for test configuration
      const env = { ...process.env };
      if (this.config.testConfig) {
        if (this.config.testConfig.crawlingPauseSeconds !== undefined) {
          env.FOLDER_MCP_TEST_CRAWLING_PAUSE_SECONDS = this.config.testConfig.crawlingPauseSeconds.toString();
        }
        if (this.config.testConfig.keepAliveSeconds !== undefined) {
          env.FOLDER_MCP_TEST_KEEP_ALIVE_SECONDS = this.config.testConfig.keepAliveSeconds.toString();
        }
        if (this.config.testConfig.shutdownGracePeriodSeconds !== undefined) {
          env.FOLDER_MCP_TEST_SHUTDOWN_GRACE_PERIOD_SECONDS = this.config.testConfig.shutdownGracePeriodSeconds.toString();
        }
      }

      // Buffer stderr to capture startup errors
      let stderrBuffer = '';
      let processStarted = false;

      this.pythonProcess = spawn(this.config.pythonPath || 'python3', [
        this.config.scriptPath || join(process.cwd(), 'src/infrastructure/embeddings/python/main.py'),
        this.config.modelName
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: env
      });

      // Capture stderr immediately to detect startup errors
      this.pythonProcess.stderr?.on('data', (data) => {
        const message = data.toString();
        stderrBuffer += message;
        // Still log to console for debugging
        if (message.trim()) {
          console.error(`Python[stderr]: ${message.trim()}`);
        }
      });

      // Handle process events
      this.pythonProcess.on('spawn', () => {
        console.error('Python process spawned successfully');
        processStarted = true;
        this.setupProcessHandlers();
        resolve();
      });

      this.pythonProcess.on('error', (error) => {
        console.error('Python process error:', error);
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });

      this.pythonProcess.on('exit', (code, signal) => {
        console.error(`Python process exited: code=${code}, signal=${signal}`);
        this.pythonProcess = null;
        this.initialized = false;
        
        // If process exits before starting successfully, check for known errors
        if (!processStarted) {
          // Check if dependencies are missing
          if (code === 1 && stderrBuffer.includes('dependencies not available')) {
            reject(new Error('Python embedding dependencies not available'));
            return;
          }
          // Generic startup failure
          reject(new Error(`Python process failed to start: exit code ${code}`));
          return;
        }
        
        // Reject all pending requests
        for (const [id, pending] of this.pendingRequests) {
          clearTimeout(pending.timeout);
          pending.reject(new Error(`Python process exited: code=${code}, signal=${signal}`));
        }
        this.pendingRequests.clear();
        
        // Handle automatic restart if not shutting down
        if (!this.isShuttingDown && this.config.autoRestart) {
          this.handleProcessExit(code, signal);
        }
      });
    });
  }

  /**
   * Set up process communication handlers
   */
  private setupProcessHandlers(): void {
    if (!this.pythonProcess) return;

    // Handle stdout (JSON-RPC responses)
    let buffer = '';
    this.pythonProcess.stdout?.on('data', (data) => {
      buffer += data.toString();
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep the incomplete line
      
      for (const line of lines) {
        if (line.trim()) {
          this.handleJsonRpcResponse(line.trim());
        }
      }
    });

    // Note: stderr is already handled in startPythonProcess to capture startup errors
  }

  /**
   * Handle JSON-RPC response from Python process
   */
  private handleJsonRpcResponse(responseStr: string): void {
    try {
      const response: JsonRpcResponse = JSON.parse(responseStr);
      
      const pending = this.pendingRequests.get(response.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(response.id);
        
        if (response.error) {
          pending.reject(new Error(`RPC Error: ${response.error.message}`));
        } else {
          pending.resolve(response.result);
        }
      } else {
        console.error(`Received response for unknown request ID: ${response.id}`);
      }
    } catch (error) {
      console.error('Error parsing JSON-RPC response:', error, 'Raw:', responseStr);
    }
  }

  /**
   * Send JSON-RPC request to Python process
   */
  private async sendJsonRpcRequest(method: string, params: any, customTimeout?: number): Promise<any> {
    if (!this.pythonProcess || !this.pythonProcess.stdin) {
      throw new Error('Python process not available');
    }

    const requestId = `${method}_${this.nextRequestId++}`;
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method,
      params,
      id: requestId
    };

    return new Promise((resolve, reject) => {
      // Use custom timeout if provided, otherwise default config timeout
      const timeoutMs = customTimeout || this.config.timeout;
      
      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout: ${method} (${timeoutMs}ms)`));
      }, timeoutMs);

      // Store pending request
      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      // Send request
      try {
        const requestStr = JSON.stringify(request) + '\n';
        if (this.pythonProcess?.stdin) {
          this.pythonProcess.stdin.write(requestStr);
        } else {
          throw new Error('Python process stdin not available');
        }
      } catch (error) {
        clearTimeout(timeout);
        this.pendingRequests.delete(requestId);
        reject(error);
      }
    });
  }

  /**
   * Start periodic health checks
   * Also monitors for process health and triggers restart if needed
   */
  private startHealthCheckTimer(): void {
    this.healthCheckTimer = setInterval(async () => {
      try {
        const health = await this.healthCheck();
        
        // If health check indicates the process is unhealthy and auto-restart is enabled
        if (health.status === 'unhealthy' && this.config.autoRestart && !this.isShuttingDown) {
          console.error('Python process unhealthy, triggering restart...');
          await this.restartProcess();
        }
      } catch (error) {
        console.error('Health check failed:', error);
        
        // If health check completely fails, consider restarting
        if (this.config.autoRestart && !this.isShuttingDown && this.restartAttempts < this.config.maxRestartAttempts) {
          console.error('Health check failed completely, triggering restart...');
          await this.restartProcess();
        }
      }
    }, this.config.healthCheckInterval);
  }
  
  /**
   * Handle Python process exit and determine if restart is needed
   */
  private handleProcessExit(code: number | null, signal: NodeJS.Signals | null): void {
    console.error(`Handling process exit: code=${code}, signal=${signal}, restartAttempts=${this.restartAttempts}`);
    
    // Don't restart if we've exceeded max attempts
    if (this.restartAttempts >= this.config.maxRestartAttempts) {
      console.error(`Max restart attempts (${this.config.maxRestartAttempts}) exceeded, not restarting`);
      return;
    }
    
    // Check if this is a graceful shutdown due to keep-alive timeout (expected exit code 0)
    const isGracefulKeepAliveShutdown = code === 0;
    const currentTime = Date.now();
    
    if (isGracefulKeepAliveShutdown) {
      console.error('Python process exited gracefully due to keep-alive timeout');
      // Reset restart attempts for graceful shutdowns
      this.restartAttempts = 0;
    } else {
      console.error('Python process exited unexpectedly, attempting restart...');
      // Increment restart attempts for unexpected exits
      this.restartAttempts++;
    }
    
    // Schedule restart with delay
    this.scheduleRestart();
  }
  
  /**
   * Schedule a process restart with delay
   */
  private scheduleRestart(): void {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
    }
    
    const delay = this.config.restartDelay * Math.min(this.restartAttempts + 1, 5); // Exponential backoff, max 5x
    console.error(`Scheduling restart in ${delay}ms (attempt ${this.restartAttempts + 1}/${this.config.maxRestartAttempts})`);
    
    this.restartTimer = setTimeout(async () => {
      try {
        await this.restartProcess();
      } catch (error) {
        console.error('Failed to restart Python process:', error);
      }
    }, delay);
  }
  
  /**
   * Restart the Python process
   */
  private async restartProcess(): Promise<void> {
    if (this.isShuttingDown) {
      console.error('Not restarting: service is shutting down');
      return;
    }
    
    console.error('Restarting Python embedding process...');
    
    try {
      // Kill existing process if still alive
      if (this.pythonProcess && !this.pythonProcess.killed) {
        this.pythonProcess.kill('SIGTERM');
        
        // Wait a bit for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Force kill if still alive
        if (!this.pythonProcess.killed) {
          this.pythonProcess.kill('SIGKILL');
        }
      }
      
      // Reset state
      this.pythonProcess = null;
      this.initialized = false;
      this.lastHealthCheck = null;
      
      // Clear any pending requests with restart error
      for (const [id, pending] of this.pendingRequests) {
        clearTimeout(pending.timeout);
        pending.reject(new Error('Python process restarting'));
      }
      this.pendingRequests.clear();
      
      // Start new process
      await this.startPythonProcess();
      
      // Perform health check
      const health = await this.healthCheck();
      if (health.status === 'unhealthy') {
        throw new Error('Restarted process failed health check');
      }
      
      this.initialized = true;
      this.lastRestartTime = Date.now();
      
      console.error('Python embedding process restarted successfully');
      
    } catch (error) {
      console.error('Failed to restart Python process:', error);
      this.restartAttempts++;
      
      // Schedule another restart if we haven't exceeded max attempts
      if (this.restartAttempts < this.config.maxRestartAttempts) {
        this.scheduleRestart();
      } else {
        console.error('Max restart attempts exceeded, giving up');
      }
      
      throw error;
    }
  }
  
  /**
   * Download a model with validation and progress tracking
   */
  async downloadModel(modelName: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    progress: number;
  }> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const response = await this.sendJsonRpcRequest('download_model', {
        model_name: modelName,
        request_id: `download_${this.nextRequestId++}`
      });

      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        progress: 0
      };
    }
  }

  /**
   * Check if a model is cached locally
   */
  async isModelCached(modelName: string): Promise<boolean> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const response = await this.sendJsonRpcRequest('is_model_cached', {
        model_name: modelName,
        request_id: `cache_check_${this.nextRequestId++}`
      });

      return response.cached || false;
    } catch (error) {
      console.error(`Failed to check cache for model ${modelName}:`, error);
      return false;
    }
  }

  /**
   * Get service statistics including restart information
   */
  getServiceStats(): {
    initialized: boolean;
    restartAttempts: number;
    lastRestartTime: number;
    processId: number | undefined;
    lastHealthCheck: HealthCheckResponse | null;
  } {
    return {
      initialized: this.initialized,
      restartAttempts: this.restartAttempts,
      lastRestartTime: this.lastRestartTime,
      processId: this.pythonProcess?.pid,
      lastHealthCheck: this.lastHealthCheck
    };
  }
}