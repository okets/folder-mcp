/**
 * ONNX Configuration Service
 * 
 * Provides optimal ONNX performance defaults based on comprehensive CPM testing.
 * These values were scientifically determined through systematic performance analysis.
 * 
 * Test Results Summary:
 * - Worker Pool Size: 2 (optimal balance of performance vs CPU usage)
 * - Threads per Worker: 2 (optimal ROI before diminishing returns)  
 * - Batch Size: 1 (consistently outperforms larger batches)
 * - File Concurrency: 4 (14.6% improvement over default 2, sweet spot before performance cliff)
 * 
 * Performance: ~90+ CPM with 4 concurrent files (vs ~84 CPM with 2 files)
 * Note: CPU usage cannot be controlled due to ONNX Runtime thread spinning behavior
 */

import { IOnnxConfiguration } from '../../di/interfaces.js';
import { ConfigurationComponent } from '../../config/ConfigurationComponent.js';
import { cpus } from 'os';

export class OnnxConfiguration implements IOnnxConfiguration {
  private configComponent: ConfigurationComponent | undefined;
  
  // Optimal values determined through comprehensive CPM testing (fallbacks)
  private static readonly OPTIMAL_WORKER_POOL_SIZE = 2;
  private static readonly OPTIMAL_NUM_THREADS_PER_WORKER = 2;  
  private static readonly OPTIMAL_BATCH_SIZE = 1;
  private static readonly OPTIMAL_MAX_CONCURRENT_FILES = 4;

  constructor(configComponent?: ConfigurationComponent) {
    this.configComponent = configComponent;
  }

  /**
   * Get optimal worker pool size
   * Priority: ENV var > config system > optimal default
   */
  async getWorkerPoolSize(): Promise<number> {
    // Environment variable takes highest priority (for testing/debugging)
    if (process.env.WORKER_POOL_SIZE) {
      const value = parseInt(process.env.WORKER_POOL_SIZE, 10);
      console.error(`[ONNX-CONFIG-DEBUG] workerPoolSize=${value} (source: ENV var)`);
      return value;
    }
    
    // Configuration system second priority
    if (this.configComponent) {
      console.error(`[ONNX-CONFIG-DEBUG] Checking config component for onnx.workerPoolSize...`);
      const configValue = await this.configComponent.get('onnx.workerPoolSize');
      console.error(`[ONNX-CONFIG-DEBUG] Config component returned: ${configValue} (type: ${typeof configValue})`);
      if (typeof configValue === 'number') {
        console.error(`[ONNX-CONFIG-DEBUG] workerPoolSize=${configValue} (source: config system)`);
        return configValue;
      }
    } else {
      console.error(`[ONNX-CONFIG-DEBUG] No config component available`);
    }
    
    // Fallback to optimal default
    const defaultValue = OnnxConfiguration.OPTIMAL_WORKER_POOL_SIZE;
    console.error(`[ONNX-CONFIG-DEBUG] workerPoolSize=${defaultValue} (source: code default)`);
    return defaultValue;
  }

  /**
   * Get optimal number of threads per worker
   * Priority: ENV var > config system > optimal default
   */
  async getNumThreadsPerWorker(): Promise<number> {
    // Environment variable takes highest priority
    if (process.env.NUM_THREADS) {
      return parseInt(process.env.NUM_THREADS, 10);
    }
    
    // Configuration system second priority
    if (this.configComponent) {
      const configValue = await this.configComponent.get('onnx.threadsPerWorker');
      if (typeof configValue === 'number') {
        return configValue;
      }
    }
    
    // Fallback to optimal default
    return OnnxConfiguration.OPTIMAL_NUM_THREADS_PER_WORKER;
  }

  /**
   * Get optimal batch size for embedding processing
   * Priority: ENV var > config system > optimal default
   */
  async getBatchSize(): Promise<number> {
    // Environment variables take highest priority (multiple names for compatibility)
    if (process.env.EMBEDDING_BATCH_SIZE) {
      return parseInt(process.env.EMBEDDING_BATCH_SIZE, 10);
    }
    if (process.env.BATCH_SIZE) {
      return parseInt(process.env.BATCH_SIZE, 10);
    }
    
    // Configuration system second priority
    if (this.configComponent) {
      const configValue = await this.configComponent.get('onnx.batchSize');
      if (typeof configValue === 'number') {
        return configValue;
      }
    }
    
    // Fallback to optimal default
    return OnnxConfiguration.OPTIMAL_BATCH_SIZE;
  }

  /**
   * Get optimal maximum concurrent files for processing
   * Priority: ENV var > config system > optimal default
   */
  async getMaxConcurrentFiles(): Promise<number> {
    // Environment variable takes highest priority
    if (process.env.MAX_CONCURRENT_FILES) {
      return parseInt(process.env.MAX_CONCURRENT_FILES, 10);
    }
    
    // Configuration system second priority
    if (this.configComponent) {
      const configValue = await this.configComponent.get('onnx.maxConcurrentFiles');
      if (typeof configValue === 'number') {
        return configValue;
      }
    }
    
    // Fallback to optimal default
    return OnnxConfiguration.OPTIMAL_MAX_CONCURRENT_FILES;
  }

  /**
   * Get complete ONNX configuration object with all optimal defaults
   */
  async getConfig(): Promise<{ workerPoolSize: number; numThreads: number; batchSize: number; maxConcurrentFiles: number }> {
    const config = {
      workerPoolSize: await this.getWorkerPoolSize(),
      numThreads: await this.getNumThreadsPerWorker(),
      batchSize: await this.getBatchSize(),
      maxConcurrentFiles: await this.getMaxConcurrentFiles()
    };
    
    // Debug logging to verify configuration system works
    console.error(`[ONNX-CONFIG-DEBUG] Configuration values loaded: workerPoolSize=${config.workerPoolSize}, threadsPerWorker=${config.numThreads}, batchSize=${config.batchSize}, maxConcurrentFiles=${config.maxConcurrentFiles}`);
    
    return config;
  }

  /**
   * Get configuration summary for logging
   */
  async getConfigSummary(): Promise<string> {
    const config = await this.getConfig();
    return `ONNX Config: ${config.workerPoolSize}w ${config.numThreads}t batch:${config.batchSize} files:${config.maxConcurrentFiles} (CPM-optimized)`;
  }

  /**
   * Validate configuration values are within reasonable bounds
   */
  async validateConfig(): Promise<{ valid: boolean; warnings: string[] }> {
    const config = await this.getConfig();
    const warnings: string[] = [];

    if (config.workerPoolSize < 1 || config.workerPoolSize > 8) {
      warnings.push(`Worker pool size ${config.workerPoolSize} is outside recommended range 1-8`);
    }

    if (config.numThreads < 1 || config.numThreads > 16) {
      warnings.push(`Threads per worker ${config.numThreads} is outside recommended range 1-16`);
    }

    if (config.batchSize < 1 || config.batchSize > 100) {
      warnings.push(`Batch size ${config.batchSize} is outside recommended range 1-100`);
    }

    if (config.maxConcurrentFiles < 1 || config.maxConcurrentFiles > 16) {
      warnings.push(`Max concurrent files ${config.maxConcurrentFiles} is outside recommended range 1-16 (performance cliff beyond 5-6)`);
    }

    // Calculate total threads
    const totalThreads = config.workerPoolSize * config.numThreads;
    const availableCpus = cpus().length;
    
    if (totalThreads > availableCpus * 2) {
      warnings.push(`Total threads (${totalThreads}) significantly exceeds CPU cores (${availableCpus}) - may cause CPU throttling`);
    }

    return {
      valid: warnings.length === 0,
      warnings
    };
  }
}