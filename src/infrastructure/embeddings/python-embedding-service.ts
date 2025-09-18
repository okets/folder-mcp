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
import { createDefaultSemanticMetadata } from '../../types/index.js';
import type {
  EmbeddingOperations,
  EmbeddingVector,
  EmbeddingResult,
  BatchEmbeddingOperations
} from '../../domain/embeddings/index.js';
import { EmbeddingErrors } from './embedding-errors.js';
import type { SemanticExtractionOptions } from '../../domain/semantic/interfaces.js';
import { getModelCapabilities, type ModelCapabilities } from '../../config/model-registry.js';

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
  text_type?: 'query' | 'passage';  // Add text type for prefix handling
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
  status: 'healthy' | 'degraded' | 'unhealthy' | 'idle';
  model_loaded: boolean;
  gpu_available: boolean;
  memory_usage_mb: number;
  uptime_seconds: number;
  queue_size: number;
  request_id?: string;
}

interface ProgressUpdate {
  type: 'progress';
  status: string;
  current: number;
  total: number;
  timestamp: number;
  details: string;
  message: string;
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
    timeout: NodeJS.Timeout | null;  // null for embedding requests that rely on progress monitoring
  }>();
  private lastHealthCheck: HealthCheckResponse | null = null;
  private isShuttingDown = false;
  private restartAttempts = 0;
  private lastRestartTime = 0;
  private restartTimer: NodeJS.Timeout | null = null;
  private downloadProgressCallback?: (progress: number) => void;
  private modelConfig?: any;  // Store model config for prefix requirements
  
  // Service degradation state for graceful failure handling
  private isDegraded = false;
  private degradationReason: string | null = null;
  
  // Progress monitoring
  private lastProgressUpdate: ProgressUpdate | null = null;
  private progressWatchdog: NodeJS.Timeout | null = null;
  private isProcessingActive = false;
  private readonly PROGRESS_TIMEOUT_MS = 60000; // 1 minute without progress = problem
  private readonly IDLE_TIMEOUT_MS = 300000; // 5 minutes truly idle = maybe restart
  
  // Track successful embeddings to use as health signal
  private lastSuccessfulEmbedding: number = 0;
  private totalEmbeddingsGenerated: number = 0;
  private processStartTime: number = Date.now();

  constructor(config?: Partial<PythonEmbeddingConfig>, modelConfig?: any) {
    // Try to detect the correct Python command for the platform
    const defaultPythonPath = process.platform === 'win32' ? 'python' : 'python3';

    // Model name is now optional - Python can start without a model
    // If no model name provided, Python will start in idle state

    // No hard timeouts for embeddings - we rely on progress monitoring
    // Keep a short timeout only for health checks and other quick operations
    const defaultTimeout = 30000; // 30 seconds for health checks only

    // Build config with defaults first, then spread config (excluding undefined values)
    const baseConfig = {
      modelName: '', // Default to idle state
      pythonPath: defaultPythonPath,
      scriptPath: join(process.cwd(), 'src/infrastructure/embeddings/python/main.py'),
      timeout: defaultTimeout,
      maxRetries: 3,
      autoRestart: true,
      maxRestartAttempts: 5,
      restartDelay: 2000, // 2 seconds
    };

    // Merge config, filtering out undefined/null values
    this.config = {
      ...baseConfig,
      ...(config ? Object.fromEntries(
        Object.entries(config).filter(([_, v]) => v !== undefined && v !== null)
      ) : {})
    };


    this.modelConfig = modelConfig; // Store model config for prefix requirements
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
        // Health check failed - this usually means Python dependencies are missing
        // Provide a clear, actionable error message instead of technical details
        const modelDisplayName = this.getModelDisplayName(this.config.modelName);
        throw new Error(EmbeddingErrors.pythonDependenciesMissing(modelDisplayName));
      }

      this.initialized = true;
      this.processStartTime = Date.now(); // Track when process started
      console.error('Python embedding service initialized successfully');
      
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize Python embedding service: ${errorMessage}`);
    }
  }

  /**
   * Generate a single embedding
   * @param text - Text to embed
   * @param textType - Type of text: 'query' for search queries, 'passage' for document text
   */
  async generateSingleEmbedding(text: string, textType: 'query' | 'passage' = 'query'): Promise<EmbeddingVector> {
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
      }, semanticMetadata: createDefaultSemanticMetadata() }], textType);
    
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
   * @param chunks - Text chunks to embed
   * @param textType - Type of text: 'query' for search queries, 'passage' for document chunks
   */
  async generateEmbeddings(chunks: TextChunk[], textType: 'query' | 'passage' = 'passage'): Promise<EmbeddingVector[]> {
    // Check if service is degraded
    if (this.isDegraded) {
      console.error(`Embedding request rejected: Service is degraded (${this.degradationReason})`);
      // FAIL LOUDLY - no silent fallbacks allowed
      throw new Error(`Python embedding service is degraded: ${this.degradationReason}`);
    }
    
    if (!this.initialized) {
      await this.initialize();
    }

    const texts = chunks.map(chunk => chunk.content);

    const request: PythonEmbeddingRequest = {
      texts,
      immediate: true, // Prioritize interactive embedding requests
      model_name: this.config.modelName,
      request_id: `req_${this.nextRequestId++}`,
      text_type: textType  // Pass textType to Python process
    };

    const response = await this.sendJsonRpcRequest('generate_embeddings', request);
    
    if (!response.success) {
      throw new Error(response.error || 'Embedding generation failed');
    }

    // Update successful embedding tracking for health check skipping
    this.lastSuccessfulEmbedding = Date.now();
    this.totalEmbeddingsGenerated += response.embeddings.length;
    console.error(`[EMBEDDINGS] Successfully generated ${response.embeddings.length} embeddings (total: ${this.totalEmbeddingsGenerated})`);

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
   * @param chunks - Text chunks to embed
   * @param batchSize - Size of each batch
   * @param textType - Type of text: 'query' for search queries, 'passage' for document chunks
   */
  async processBatch(chunks: TextChunk[], batchSize: number = 32, textType: 'query' | 'passage' = 'passage'): Promise<EmbeddingResult[]> {
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
        request_id: `batch_${this.nextRequestId++}`,
        text_type: textType  // Pass textType to Python process
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
          // FAIL LOUDLY - no silent fallbacks allowed
          throw new Error(`Batch embedding failed: ${response.error || 'Batch processing failed'}`);
        }
      } catch (error) {
        // FAIL LOUDLY - no silent fallbacks allowed
        throw new Error(`Batch embedding error: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Small delay between batches to be nice to the system
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    // Track successful embedding generation
    if (results.length > 0) {
      this.lastSuccessfulEmbedding = Date.now();
      this.totalEmbeddingsGenerated += results.length;
      console.error(`[HEALTH-TRACKING] Successfully generated ${results.length} embeddings. Total: ${this.totalEmbeddingsGenerated}`);
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
   * Get the service type (for type-safe detection)
   */
  getServiceType(): 'onnx' | 'gpu' {
    return 'gpu';
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
        if (this.pythonProcess && !this.pythonProcess.killed) {
          this.pythonProcess.kill('SIGKILL');
        }

        this.pythonProcess = null;
      }

      // Reject all pending requests
      for (const [id, pending] of this.pendingRequests) {
        if (pending.timeout) clearTimeout(pending.timeout);
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
   * Unload the current model from the Python service
   * Frees memory and puts Python in idle state
   */
  async unloadModel(): Promise<void> {
    await this.requestModelUnload();
    this.config.modelName = '';  // Clear model name to reflect idle state
  }

  /**
   * Load a different model without restarting the Python process
   * This maintains the singleton pattern and just switches the model
   */
  async loadModel(modelName: string, modelId?: string): Promise<void> {
    if (!this.initialized) {
      throw new Error('Python embedding service not initialized');
    }

    if (this.config.modelName === modelName) {
      console.error(`[PYTHON-EMBEDDING] Model ${modelName} is already loaded`);
      return;
    }

    console.error(`[PYTHON-EMBEDDING] Loading model ${modelName} via RPC...`);

    try {
      // Get model capabilities from configuration (if modelId provided)
      let capabilities: ModelCapabilities | null = null;
      if (modelId) {
        capabilities = getModelCapabilities(modelId);
        console.error(`[PYTHON-EMBEDDING] Model capabilities for ${modelId}:`, capabilities);
      }

      // Send load_model request to Python process with capabilities
      const response = await this.sendJsonRpcRequest('load_model', {
        model_name: modelName,
        model_id: modelId,
        capabilities: capabilities,
        request_id: `load_model_${this.nextRequestId++}`
      }, 60000); // 60 second timeout for model loading

      if (response.success) {
        // Update the config with the new model name
        (this.config as any).modelName = modelName;
        console.error(`[PYTHON-EMBEDDING] Successfully loaded model ${modelName}`);
        console.error(`[PYTHON-EMBEDDING] Model info:`, response.model_info);
      } else {
        throw new Error(response.error || 'Failed to load model');
      }
    } catch (error) {
      console.error(`[PYTHON-EMBEDDING] Error loading model ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Start the Python process
   */
  private async startPythonProcess(): Promise<void> {
    // Check if process is already running
    if (this.pythonProcess && !this.pythonProcess.killed) {
      console.error(`Python process already running for model: ${this.config.modelName}`);
      return;
    }
    
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

      // Windows compatibility: Use 'python' on Windows, 'python3' on Unix
      const defaultPythonCommand = process.platform === 'win32' ? 'python' : 'python3';

      // Build args array - only include model name if provided
      const args = [
        this.config.scriptPath || join(process.cwd(), 'src/infrastructure/embeddings/python/main.py')
      ];

      // Only add model name if it's not empty (empty means start in idle state)
      if (this.config.modelName && this.config.modelName.trim() !== '') {
        args.push(this.config.modelName);
      }

      this.pythonProcess = spawn(this.config.pythonPath || defaultPythonCommand, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: env
      });

      // Capture stderr immediately to detect startup errors
      this.pythonProcess.stderr?.on('data', (data) => {
        const message = data.toString();
        stderrBuffer += message;
        // Extract download progress from HuggingFace progress bars
        this.extractDownloadProgress(message);
        
        // Still log to console for debugging
        if (message.trim()) {
          console.error(`Python[stderr]: ${message.trim()}`);
        }
        
        // Immediately check for dependency errors and reject early
        if (message.includes('DEPENDENCY_ERROR:')) {
          const modelDisplayName = this.getModelDisplayName(this.config.modelName);
          const match = message.match(/DEPENDENCY_ERROR: Missing packages: (.+)/);
          const missingPackages = match ? match[1] : 'unknown packages';
          reject(new Error(EmbeddingErrors.specificPythonDependenciesMissing(modelDisplayName, missingPackages)));
          return;
        }
        
        // Also catch import errors directly from stderr
        if (message.includes('ModuleNotFoundError') || message.includes('ImportError')) {
          const modelDisplayName = this.getModelDisplayName(this.config.modelName);
          reject(new Error(EmbeddingErrors.pythonDependenciesMissing(modelDisplayName)));
          return;
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
        
        // Check for ENOENT (file not found) error specifically
        if ('code' in error && error.code === 'ENOENT') {
          const modelDisplayName = this.getModelDisplayName(this.config.modelName);
          reject(new Error(EmbeddingErrors.pythonNotFound(modelDisplayName)));
          return;
        }
        
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });

      this.pythonProcess.on('exit', (code, signal) => {
        console.error(`Python process exited: code=${code}, signal=${signal}`);
        this.pythonProcess = null;
        this.initialized = false;
        
        // If process exits before starting successfully, check for known errors
        if (!processStarted) {
          // Check if Python is missing
          if (code === 127 || stderrBuffer.includes('python: command not found') || stderrBuffer.includes('No such file or directory')) {
            const modelDisplayName = this.getModelDisplayName(this.config.modelName);
            reject(new Error(EmbeddingErrors.pythonNotFound(modelDisplayName)));
            return;
          }
          
          // Enhanced dependency checking for better Windows error messages
          if (code === 1) {
            // Check for the new DEPENDENCY_ERROR pattern from Python script
            if (stderrBuffer.includes('DEPENDENCY_ERROR:')) {
              const modelDisplayName = this.getModelDisplayName(this.config.modelName);
              // Extract specific missing packages from the error message
              const match = stderrBuffer.match(/DEPENDENCY_ERROR: Missing packages: (.+)/);
              const missingPackages = match ? match[1] : 'unknown packages';
              reject(new Error(EmbeddingErrors.specificPythonDependenciesMissing(modelDisplayName, missingPackages || 'unknown packages')));
              return;
            }
            
            // Fallback: Check for legacy dependency-related error patterns
            if (stderrBuffer.includes('dependencies not available') || 
                stderrBuffer.includes('Required dependencies not available') ||
                stderrBuffer.includes('jsonrpclib-pelix not available') ||
                stderrBuffer.includes('sentence-transformers') ||
                stderrBuffer.includes('torch') ||
                stderrBuffer.includes('ImportError') ||
                stderrBuffer.includes('ModuleNotFoundError')) {
              const modelDisplayName = this.getModelDisplayName(this.config.modelName);
              reject(new Error(EmbeddingErrors.pythonDependenciesMissing(modelDisplayName)));
              return;
            }
          }
          
          // Generic startup failure with more context
          reject(new Error(`Python process failed to start: exit code ${code}. stderr: ${stderrBuffer.slice(0, 200)}`));
          return;
        }
        
        // Reject all pending requests
        for (const [id, pending] of this.pendingRequests) {
          if (pending.timeout) clearTimeout(pending.timeout);
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
      const message = JSON.parse(responseStr);
      
      // Check for progress updates (no 'id' field, just method)
      if (message.method === 'progress_update') {
        this.handleProgressUpdate(message.params);
        return;
      }
      
      // Normal response handling
      const response: JsonRpcResponse = message;
      const pending = this.pendingRequests.get(response.id);
      if (pending) {
        if (pending.timeout) clearTimeout(pending.timeout); // Clear timeout if any
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
   * Handle progress update from Python process
   */
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
  
  /**
   * Reset the progress watchdog timer
   */
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
  
  /**
   * Check progress health and take action if stuck
   */
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
  
  /**
   * Handle Python process that appears stuck
   */
  private async handlePythonStuck(): Promise<void> {
    console.error('[PROGRESS] Attempting to recover from stuck Python process');

    // Reject all pending requests with a clear error
    for (const [id, pending] of this.pendingRequests) {
      if (pending.timeout) {
        clearTimeout(pending.timeout);
      }
      pending.reject(new Error('Python process stopped responding - no progress updates received'));
    }
    this.pendingRequests.clear();

    // Try to restart the Python process
    if (this.restartAttempts < this.config.maxRestartAttempts) {
      await this.restartProcess();
    } else {
      console.error('[PROGRESS] Max restart attempts reached, service degraded');
      this.isDegraded = true;
      this.degradationReason = 'Python process repeatedly stuck';
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
      // NO TIMEOUT for embedding operations!
      // We rely on progress updates instead
      let timeout: NodeJS.Timeout | null = null;
      
      // Add timeout for all operations
      if (method === 'health_check' || method === 'is_model_cached') {
        timeout = setTimeout(() => {
          this.pendingRequests.delete(requestId);
          reject(new Error(`Request timeout: ${method} (30s)`));
        }, 30000);
      } else if (method === 'generate_embeddings') {
        // NO HARD TIMEOUT for embeddings - rely on progress monitoring instead
        // The progress watchdog will detect if Python stops sending updates
        // This avoids machine-dependent timeout issues
        console.error(`[PYTHON-EMBEDDING] Starting embedding generation for ${this.config.modelName} - no hard timeout, relying on progress monitoring`);
      } else if (customTimeout) {
        // Use custom timeout if explicitly provided (for non-embedding operations)
        timeout = setTimeout(() => {
          this.pendingRequests.delete(requestId);
          reject(new Error(`Request timeout: ${method} (${customTimeout}ms)`));
        }, customTimeout);
      }

      // Store pending request (timeout may be null for embedding requests)
      this.pendingRequests.set(requestId, { resolve, reject, timeout: timeout || null });

      // Send request
      try {
        const requestStr = JSON.stringify(request) + '\n';
        if (this.pythonProcess?.stdin) {
          this.pythonProcess.stdin.write(requestStr);
        } else {
          throw new Error('Python process stdin not available');
        }
      } catch (error) {
        if (timeout) clearTimeout(timeout);
        this.pendingRequests.delete(requestId);
        reject(error);
      }
      
      // Start progress monitoring for embedding operations
      if (method === 'generate_embeddings') {
        this.isProcessingActive = true;
        this.resetProgressWatchdog();
      }
    });
  }

  
  /**
   * Enter degraded mode when Python service is unavailable
   */
  private enterDegradedMode(reason: string): void {
    if (!this.isDegraded) {
      console.error(`ENTERING DEGRADED MODE: ${reason}`);
      console.error('The daemon will continue running but embeddings will be unavailable');
      this.isDegraded = true;
      this.degradationReason = reason;
      
      // Clear any pending requests
      for (const [id, pending] of this.pendingRequests) {
        if (pending.timeout) clearTimeout(pending.timeout);
        pending.reject(new Error(`Service degraded: ${reason}`));
      }
      this.pendingRequests.clear();
    }
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
   * Schedule a process restart with exponential backoff
   */
  private scheduleRestart(): void {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
    }
    
    // Exponential backoff with jitter to prevent thundering herd
    // Base delay: 2s, 4s, 8s, 16s, 32s (capped at 32s)
    const baseDelay = this.config.restartDelay;
    const exponentialDelay = baseDelay * Math.pow(2, Math.min(this.restartAttempts, 4));
    // Add jitter: ±25% randomization
    const jitter = exponentialDelay * (0.75 + Math.random() * 0.5);
    const delay = Math.round(jitter);
    
    console.error(`Scheduling restart in ${delay}ms (attempt ${this.restartAttempts + 1}/${this.config.maxRestartAttempts})`);
    console.error(`Exponential backoff: base=${baseDelay}ms, calculated=${exponentialDelay}ms, with jitter=${delay}ms`);
    
    this.restartTimer = setTimeout(async () => {
      try {
        await this.restartProcess();
        // Success is handled inside restartProcess
      } catch (error) {
        console.error('Failed to restart Python process:', error);
        // If we still have attempts left, it will be rescheduled from within restartProcess
        if (this.restartAttempts >= this.config.maxRestartAttempts) {
          this.enterDegradedMode('Maximum restart attempts exceeded');
        }
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
        if (this.pythonProcess && !this.pythonProcess.killed) {
          this.pythonProcess.kill('SIGKILL');
        }
      }
      
      // Reset state
      this.pythonProcess = null;
      this.initialized = false;
      this.lastHealthCheck = null;
      
      // Clear any pending requests with restart error
      for (const [id, pending] of this.pendingRequests) {
        if (pending.timeout) clearTimeout(pending.timeout);
        pending.reject(new Error('Python process restarting'));
      }
      this.pendingRequests.clear();
      
      // Start new process
      await this.startPythonProcess();
      
      // CRITICAL FIX: Give Python process time to fully initialize before health check
      // The model loading and server initialization can take several seconds
      const initWaitTime = 5000; // 5 seconds for model loading
      console.error(`Waiting ${initWaitTime}ms for Python process to initialize...`);
      await new Promise(resolve => setTimeout(resolve, initWaitTime));
      
      // Now perform health check with retries
      // BGE-M3 model loading takes 3-6 seconds, so allow more time
      let healthCheckAttempts = 0;
      const maxHealthCheckAttempts = 5; // Increased from 3 to 5
      let health: HealthCheckResponse | null = null;
      
      while (healthCheckAttempts < maxHealthCheckAttempts) {
        healthCheckAttempts++;
        console.error(`Health check attempt ${healthCheckAttempts}/${maxHealthCheckAttempts}...`);
        
        try {
          health = await this.healthCheck();
          if (health.status === 'healthy' || health.status === 'idle') {
            // Accept 'idle' during initialization - model is still loading
            console.error(`Health check passed! Status: ${health.status}, Model loaded: ${health.model_loaded}`);
            break;
          }
          console.error(`Health check returned status: ${health.status}, model_loaded: ${health.model_loaded}`);
        } catch (error) {
          console.error(`Health check attempt ${healthCheckAttempts} failed:`, error);
        }
        
        // Wait before next attempt (unless it's the last attempt)
        if (healthCheckAttempts < maxHealthCheckAttempts && (!health || health.status === 'unhealthy')) {
          // Increased wait time for BGE-M3 model loading (3-6 seconds typical)
          const retryWait = 3000 * healthCheckAttempts; // 3s, 6s, 9s, 12s progression
          console.error(`Waiting ${retryWait}ms before next health check...`);
          await new Promise(resolve => setTimeout(resolve, retryWait));
        }
      }
      
      // Check final health status - accept 'idle' as valid during initialization
      if (!health || health.status === 'unhealthy') {
        throw new Error(`Restarted process failed health check after ${maxHealthCheckAttempts} attempts`);
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
      }, 300000); // 5 minutes timeout for model downloads

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

  /**
   * Get model display name from model metadata or fallback to model name
   */
  private getModelDisplayName(modelName: string): string {
    // Import is done here to avoid circular dependencies
    try {
      const { getModelMetadata } = require('../../interfaces/tui-ink/models/modelMetadata.js');
      const metadata = getModelMetadata(modelName);
      return metadata?.displayName || modelName;
    } catch (error) {
      // Fallback to model name if metadata is not available
      return modelName;
    }
  }

  /**
   * Set callback for download progress updates
   */
  setDownloadProgressCallback(callback: (progress: number) => void): void {
    this.downloadProgressCallback = callback;
  }

  /**
   * Extract download progress from HuggingFace stderr output
   * Looks for patterns like: "Fetching 30 files:  57%|█████▋    | 17/30 [00:00<00:00, 38.85it/s]"
   */
  private extractDownloadProgress(message: string): void {
    if (!this.downloadProgressCallback) {
      return;
    }

    // Look for HuggingFace progress patterns
    const progressMatches = [
      // Pattern: "Fetching X files: 57%|progress bar| Y/X [time, speed]"
      /Fetching \d+ files:\s+(\d+)%/,
      // Pattern: "57%|█████▋    | 17/30"  
      /(\d+)%\|[█▋\s]*\|\s*\d+\/\d+/,
      // Pattern: just "57%" at start of line
      /^\s*(\d+)%/
    ];

    for (const pattern of progressMatches) {
      const match = message.match(pattern);
      if (match) {
        const progress = parseInt(match[1]!);
        if (progress >= 0 && progress <= 100) {
          // Only report progress changes to avoid spam
          if (!this.lastReportedProgress || Math.abs(progress - this.lastReportedProgress) >= 1) {
            this.downloadProgressCallback(progress);
            this.lastReportedProgress = progress;
          }
          break; // Found progress, no need to check other patterns
        }
      }
    }
  }

  private lastReportedProgress?: number;

  /**
   * Request the Python process to unload the current model from memory
   * This frees up GPU/CPU memory without shutting down the process
   */
  async requestModelUnload(): Promise<void> {
    if (!this.pythonProcess) {
      console.error('[PYTHON-EMBEDDING] No process to unload model from');
      return;
    }

    try {
      console.error('[PYTHON-EMBEDDING] Requesting model unload');
      
      // Send unload_model command to Python process
      const response = await this.sendJsonRpcRequest('unload_model', {});
      
      console.error('[PYTHON-EMBEDDING] Model unloaded successfully');
      return response;
      
    } catch (error) {
      console.error('[PYTHON-EMBEDDING] Failed to unload model:', error);
      throw new Error(`Failed to unload model: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if KeyBERT is available in the Python environment
   */
  async isKeyBERTAvailable(): Promise<boolean> {
    if (!this.pythonProcess) {
      return false;
    }

    try {
      const response = await this.sendJsonRpcRequest('is_keybert_available', {});
      return response.available === true;
    } catch (error) {
      console.error('[PYTHON-EMBEDDING] Failed to check KeyBERT availability:', error);
      return false;
    }
  }

  /**
   * Extract key phrases using KeyBERT
   */
  async extractKeyPhrasesKeyBERT(
    text: string,
    options?: SemanticExtractionOptions
  ): Promise<string[]> {
    if (!this.pythonProcess) {
      throw new Error('Python process not initialized');
    }

    try {
      const response = await this.sendJsonRpcRequest('extract_keyphrases_keybert', {
        text,
        ngram_range: options?.ngramRange || [1, 3],
        use_mmr: options?.useMmr !== false,
        diversity: options?.diversity || 0.5,
        top_n: options?.maxKeyPhrases || 10
      });

      return response.keyphrases || [];
    } catch (error) {
      console.error('[PYTHON-EMBEDDING] KeyBERT extraction failed:', error);
      throw new Error(`KeyBERT extraction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Wait for Python service to reach a specific state
   */
  async waitForState(targetState: string, timeoutMs: number = 30000): Promise<void> {
    console.log(`[PYTHON-EMBEDDING] waitForState: waiting for '${targetState}' (timeout: ${timeoutMs}ms)`);
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const status = await this.getStatus();
      console.log(`[PYTHON-EMBEDDING] waitForState: current state = '${status.state}', target = '${targetState}'`);
      if (status.state === targetState) {
        console.log(`[PYTHON-EMBEDDING] waitForState: reached target state '${targetState}'`);
        return;
      }
      if (status.state === 'error') {
        console.error(`[PYTHON-EMBEDDING] waitForState: error state detected, status:`, JSON.stringify(status));
        throw new Error('Python service entered error state');
      }
      // Wait 100ms before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Timeout waiting for state ${targetState}`);
  }

  /**
   * Get detailed status of the Python service
   */
  async getStatus(): Promise<any> {
    try {
      if (!this.pythonProcess) {
        return {
          state: 'uninitialized',
          error: 'Python process not started'
        };
      }

      const response = await this.sendJsonRpcRequest('get_status', {});
      console.log(`[PYTHON-EMBEDDING] getStatus response:`, JSON.stringify(response));
      return response;
    } catch (error) {
      console.error(`[PYTHON-EMBEDDING] getStatus error:`, error);
      return {
        state: 'error',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Generate embedding for a single query (implements IEmbeddingService interface)
   */
  async generateQueryEmbedding(query: string): Promise<EmbeddingVector> {
    const chunks: TextChunk[] = [{
      content: query,
      startPosition: 0,
      endPosition: query.length,
      tokenCount: Math.ceil(query.length / 4), // Rough estimate
      chunkIndex: 0,
      metadata: {
        sourceFile: 'query',
        sourceType: 'query',
        totalChunks: 1,
        hasOverlap: false
      }, semanticMetadata: createDefaultSemanticMetadata() }];
    
    const embeddings = await this.generateEmbeddings(chunks, 'query');
    
    return embeddings[0] ?? {
      vector: [],
      dimensions: 0,
      model: this.config.modelName,
      createdAt: new Date().toISOString()
    };
  }
}