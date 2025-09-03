/**
 * Monitored Folders Orchestrator
 * 
 * Singleton service that orchestrates all FolderLifecycleManager instances,
 * controlling their state transitions and updating FMDM.
 */

import { EventEmitter } from 'events';
import { FolderLifecycleService } from '../../application/indexing/folder-lifecycle-service.js';
import { IFolderLifecycleManager } from '../../domain/folders/folder-lifecycle-manager.js';
import { IIndexingOrchestrator, IFileSystemService, ILoggingService } from '../../di/interfaces.js';
import { FMDMService } from './fmdm-service.js';
import { SQLiteVecStorage } from '../../infrastructure/embeddings/sqlite-vec/sqlite-vec-storage.js';
import { FileStateService } from '../../infrastructure/files/file-state-service.js';
import { FolderConfig, FolderIndexingStatus } from '../models/fmdm.js';
import { getSupportedExtensions } from '../../domain/files/supported-extensions.js';
import { ResourceManager, ResourceLimits, ResourceStats } from '../../application/indexing/resource-manager.js';
import { WindowsPerformanceService, IWindowsPerformanceService } from './windows-performance-service.js';
import { IntelligentMemoryMonitor, MemoryAlert, MemoryBaseline } from '../../domain/daemon/intelligent-memory-monitor.js';
import { SimpleSystemMonitor } from '../../infrastructure/daemon/simple-system-monitor.js';
import { SystemPerformanceTelemetry, PerformanceSnapshot } from '../../domain/daemon/system-performance-telemetry.js';
import { ModelDownloadManager, IModelDownloadManager } from './model-download-manager.js';
import { FolderIndexingQueue } from './folder-indexing-queue.js';
import { UnifiedModelFactory } from '../factories/unified-model-factory.js';
import { getDefaultModelId } from '../../config/model-registry.js';
import { OnnxConfiguration } from '../../infrastructure/config/onnx-configuration.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

export interface IMonitoredFoldersOrchestrator {
  /**
   * Add a folder to be monitored
   */
  addFolder(path: string, model: string): Promise<void>;
  
  /**
   * Remove a folder from monitoring
   */
  removeFolder(folderPath: string): Promise<void>;
  
  /**
   * Start managing all configured folders
   */
  startAll(): Promise<void>;
  
  /**
   * Stop all folder managers
   */
  stopAll(): Promise<void>;
  
  /**
   * Get manager for a specific folder
   */
  getManager(folderPath: string): IFolderLifecycleManager | undefined;
  
  /**
   * Get the model download manager (for setting cache callbacks)
   */
  getModelDownloadManager(): IModelDownloadManager;
}

// Helper function to get model dimensions from curated models
function getModelDimensions(modelId: string): number {
  try {
    // Load curated models JSON dynamically - ES module compatible
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const curatedModelsPath = path.join(__dirname, '../../config/curated-models.json');
    const curatedModelsContent = fs.readFileSync(curatedModelsPath, 'utf-8');
    const curatedModels = JSON.parse(curatedModelsContent);
    
    // Check GPU models
    const gpuModel = curatedModels.gpuModels.models.find((m: any) => m.id === modelId);
    if (gpuModel) {
      if (!gpuModel.dimensions) {
        throw new Error(`Model ${modelId} found in curated models but missing dimensions property`);
      }
      return gpuModel.dimensions;
    }
    
    // Check CPU models
    const cpuModel = curatedModels.cpuModels.models.find((m: any) => m.id === modelId);
    if (cpuModel) {
      if (!cpuModel.dimensions) {
        throw new Error(`Model ${modelId} found in curated models but missing dimensions property`);
      }
      return cpuModel.dimensions;
    }
    
    // Model not found in curated list - this is an error
    throw new Error(`Model ${modelId} not found in curated models. Cannot determine dimensions.`);
  } catch (error) {
    // Re-throw with context about model dimension lookup
    throw new Error(`Failed to get dimensions for model ${modelId}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Factory function to create FolderLifecycleService instances
function createFolderLifecycleService(
  id: string,
  path: string,
  indexingOrchestrator: IIndexingOrchestrator,
  fileSystemService: IFileSystemService,
  storage: any,
  fileStateService: any,
  logger: ILoggingService,
  model?: string,
  maxConcurrentFiles?: number
): IFolderLifecycleManager {
  return new FolderLifecycleService(id, path, indexingOrchestrator, fileSystemService, storage, fileStateService, logger, model, maxConcurrentFiles);
}

export class MonitoredFoldersOrchestrator extends EventEmitter implements IMonitoredFoldersOrchestrator {
  private folderManagers = new Map<string, IFolderLifecycleManager>();
  // Removed errorFolders - redundant, error state is tracked in folderManagers
  private monitoringOrchestrator: any; // Will be imported dynamically when needed
  private folderValidationTimer?: NodeJS.Timeout;
  private resourceManager: ResourceManager;
  private intelligentMemoryMonitor?: IntelligentMemoryMonitor;
  private onnxConfiguration: OnnxConfiguration;
  private systemPerformanceTelemetry?: SystemPerformanceTelemetry;
  private windowsPerformanceService: IWindowsPerformanceService;
  private modelDownloadManager: IModelDownloadManager;
  private folderIndexingQueue: FolderIndexingQueue;
  private modelFactory: UnifiedModelFactory;
  
  constructor(
    private indexingOrchestrator: IIndexingOrchestrator,
    private fmdmService: FMDMService,
    private fileSystemService: IFileSystemService,
    private logger: ILoggingService,
    private configService: any, // TODO: Add proper type
    windowsPerformanceService?: IWindowsPerformanceService,
    modelDownloadManager?: IModelDownloadManager
  ) {
    super();
    
    // Initialize ONNX configuration service with config component
    this.onnxConfiguration = new OnnxConfiguration(this.configService);
    
    // Initialize Windows performance service (default if not provided)
    this.windowsPerformanceService = windowsPerformanceService || new WindowsPerformanceService(this.logger);
    
    // Initialize Model Download Manager (default if not provided)
    this.modelDownloadManager = modelDownloadManager || new ModelDownloadManager(this.logger, this.fmdmService);
    
    // Initialize the sequential folder indexing queue
    this.folderIndexingQueue = new FolderIndexingQueue(this.logger);
    
    // Initialize the unified model factory
    this.modelFactory = new UnifiedModelFactory(this.logger);
    
    // Set the model factory in the queue
    this.folderIndexingQueue.setModelFactory(this.modelFactory);
    
    // Subscribe to queue events for FMDM updates
    this.setupQueueEventHandlers();
    
    // Wire Python embedding service to model download manager
    this.initializePythonEmbeddingService();
    
    // Wire ONNX downloader to model download manager
    this.initializeONNXDownloader();
    
    // Initialize resource manager with daemon-appropriate limits
    const resourceLimits: Partial<ResourceLimits> = {
      maxConcurrentOperations: 2, // Conservative limit for daemon
      maxMemoryMB: 512,           // 512MB limit for daemon operations
      maxCpuPercent: 60,          // 60% CPU limit to leave room for other processes
      maxQueueSize: 20,           // Reasonable queue size for folders
      checkIntervalMs: 2000,      // Check every 2 seconds
      adaptiveThrottling: true    // Enable adaptive throttling
    };
    
    this.resourceManager = new ResourceManager(this.logger, resourceLimits);
    
    // Monitor resource usage
    this.resourceManager.on('stats', (stats: ResourceStats) => {
      if (stats.isThrottled) {
        this.logger.warn('[ORCHESTRATOR] Resource throttling active', {
          memoryUsedMB: Math.round(stats.memoryUsedMB),
          cpuPercent: Math.round(stats.cpuPercent),
          throttleFactor: stats.throttleFactor,
          activeOperations: stats.activeOperations,
          queuedOperations: stats.queuedOperations
        });
      } else if (stats.activeOperations > 0) {
        this.logger.debug('[ORCHESTRATOR] Resource usage', {
          memoryUsedMB: Math.round(stats.memoryUsedMB),
          cpuPercent: Math.round(stats.cpuPercent),
          activeOperations: stats.activeOperations,
          queuedOperations: stats.queuedOperations
        });
      }
    });

    // Initialize intelligent memory monitor (only if enabled in configuration)
    const memoryMonitorEnabled = this.configService?.get?.('daemon.memoryMonitor.enabled') ?? 
                                 this.configService?.get?.('memoryMonitor.enabled') ?? 
                                 false;
    
    if (memoryMonitorEnabled) {
      const systemMonitor = new SimpleSystemMonitor(this.logger);
      this.intelligentMemoryMonitor = new IntelligentMemoryMonitor(systemMonitor, this.logger);
      this.logger.info('[ORCHESTRATOR] Intelligent memory monitoring enabled via configuration');
      
      // Initialize system performance telemetry
      this.systemPerformanceTelemetry = new SystemPerformanceTelemetry(
        this.logger,
        systemMonitor,
        this.indexingOrchestrator
      );
      this.logger.info('[ORCHESTRATOR] System performance telemetry initialized');
      
      // Set up intelligent memory monitoring event handlers
      this.intelligentMemoryMonitor.on('baselineEstablished', (baseline: MemoryBaseline) => {
      this.logger.info('[ORCHESTRATOR] Memory baseline established - monitoring for genuine issues', {
        baselineHeapMB: Math.round(baseline.heapUsedMB),
        baselineUtilization: Math.round(baseline.heapUtilizationPercent),
        sampleCount: baseline.sampleCount,
        isStable: baseline.isStable
      });
    });

    this.intelligentMemoryMonitor.on('memoryAlert', (alert: MemoryAlert) => {
      // Memory alerts are now handled with full context and recommendations
      const logData = {
        level: alert.level,
        currentMemoryMB: Math.round(alert.heapUsedMB),
        baselineDeviationMB: Math.round(alert.baselineDeviation),
        growthRateMBPerHour: Math.round(alert.growthRateMBPerHour * 100) / 100,
        trend: alert.trend,
        recommendations: alert.recommendations,
        systemMemoryMB: alert.systemContext.totalSystemMemoryMB,
        activeFolders: this.folderManagers.size
      };

      if (alert.level === 'critical') {
        this.logger.error('[ORCHESTRATOR] CRITICAL memory situation detected', undefined, logData);
        
        // Force garbage collection for critical alerts
        if (global.gc) {
          this.logger.info('[ORCHESTRATOR] Triggering garbage collection due to critical memory alert');
          global.gc();
        }
      } else if (alert.level === 'elevated') {
        this.logger.warn('[ORCHESTRATOR] Elevated memory usage detected', logData);
      }
      });
      
      // Set up system performance telemetry event handlers
      if (this.systemPerformanceTelemetry) {
        this.systemPerformanceTelemetry.on('snapshot', (snapshot: PerformanceSnapshot) => {
          // Snapshots are automatically logged by the telemetry service
          // We can add additional processing here if needed
        });
        
        this.systemPerformanceTelemetry.on('healthAlert', (issue: string, severity: 'warning' | 'critical') => {
          if (severity === 'critical') {
            this.logger.error(`[ORCHESTRATOR] Critical system health alert: ${issue}`);
          } else {
            this.logger.warn(`[ORCHESTRATOR] System health warning: ${issue}`);
          }
        });
        
        this.systemPerformanceTelemetry.on('performanceDegradation', (metric: string, currentValue: number, baselineValue: number) => {
          const degradationPercent = Math.round(((currentValue - baselineValue) / baselineValue) * 100);
          this.logger.warn(`[ORCHESTRATOR] Performance degradation detected`, {
            metric,
            currentValue: Math.round(currentValue),
            baselineValue: Math.round(baselineValue),
            degradationPercent: `${degradationPercent}%`
          });
        });
      }
    } else {
      this.logger.debug('[ORCHESTRATOR] Intelligent memory monitoring disabled via configuration');
    }
    
    // Start periodic folder validation (every 30 seconds)
    this.startFolderValidation();
    
    // Start intelligent memory monitoring (only if enabled)
    if (this.intelligentMemoryMonitor) {
      this.intelligentMemoryMonitor.startMonitoring();
    }
    
    // Start system performance telemetry (only if monitoring is enabled)
    if (this.systemPerformanceTelemetry) {
      this.systemPerformanceTelemetry.startTelemetry();
    }
  }
  
  async addFolder(path: string, model: string): Promise<void> {
    // Check if already managing this folder
    if (this.folderManagers.has(path)) {
      this.logger.warn(`Already managing folder: ${path}`);
      return;
    }
    
    // Check if folder exists first
    const fs = await import('fs');
    if (!fs.existsSync(path)) {
      this.logger.error(`[ORCHESTRATOR] Cannot add non-existent folder: ${path}`);
      
      // Create a dummy error folder config for FMDM
      const errorFolderConfig: FolderConfig = {
        path: path,
        model: model,
        status: 'error',
        progress: 0,
        notification: this.createErrorNotification('Folder does not exist')
      };
      
      // Update FMDM directly with the error folder state
      // Since the folder doesn't exist in FMDM yet, we need to add it directly
      const currentFolders = this.getCurrentFolderConfigs();
      currentFolders.push(errorFolderConfig);
      this.fmdmService.updateFolders(currentFolders);
      
      const error = new Error(`Folder does not exist: ${path}`);
      this.logger.error(`Failed to add folder: ${path}`, error);
      throw error;
    }
    
    // Submit folder addition operation through resource manager
    const operationId = `add-folder-${path}`;
    const estimatedMemoryMB = 100; // Estimated memory for folder addition
    
    try {
      await this.resourceManager.submitOperation(
        operationId,
        path,
        () => this.executeAddFolder(path, model),
        {
          priority: 1, // High priority for folder additions
          estimatedMemoryMB
        }
      );
    } catch (error) {
      this.logger.error(`[ORCHESTRATOR] Resource manager rejected add folder operation: ${path}`, error instanceof Error ? error : new Error(String(error)));
      
      // Extract error message
      let errorMessage = error instanceof Error ? error.message : String(error);
      
      // Create error folder config for FMDM
      const errorFolderConfig: FolderConfig = {
        path: path,
        model: model,
        status: 'error',
        progress: 0,
        notification: this.createErrorNotification(errorMessage)
      };
      
      // Update FMDM directly with the error folder state
      // Get current folders from FMDM (not just from managers)
      const currentFMDM = this.fmdmService.getFMDM();
      const currentFolders = [...currentFMDM.folders];
      
      // Check if folder already exists in current folders
      const existingIndex = currentFolders.findIndex(f => f.path === path);
      if (existingIndex >= 0) {
        // Update existing folder
        currentFolders[existingIndex] = errorFolderConfig;
      } else {
        // Add new folder with error status
        currentFolders.push(errorFolderConfig);
      }
      
      this.fmdmService.updateFolders(currentFolders);
      
      // Perform resource cleanup on operation failure
      await this.performResourceCleanup(path, 'add_folder_failed');
      
      throw error;
    }
  }
  
  /**
   * Start lifecycle management for a folder already in FMDM (during daemon startup)
   */
  private async startFolderLifecycle(path: string, model: string): Promise<void> {
    try {
      this.logger.debug(`[ORCHESTRATOR] Starting lifecycle for FMDM folder ${path} with model ${model}`);
      
      // Check if model is available through FMDM
      const fmdm = this.fmdmService.getFMDM();
      const modelInfo = fmdm.curatedModels.find(m => m.id === model);
      
      if (!modelInfo) {
        throw new Error(`Model ${model} not found in curated models`);
      }
      
      // If model is not installed, set folder to downloading state and trigger download
      if (!modelInfo.installed) {
        this.logger.info(`[ORCHESTRATOR] Model ${model} not installed, initiating download`);
        
        // Update folder status to downloading-model
        this.fmdmService.updateFolderStatus(path, 'downloading-model', {
          message: `Downloading model ${model}`,
          type: 'info'
        });
        
        // Request model download (non-blocking)
        this.modelDownloadManager.requestModelDownload(model)
          .then(() => {
            this.logger.info(`[ORCHESTRATOR] Model ${model} download completed, starting folder scanning`);
            // After download completes, transition folder to scanning
            this.startFolderScanning(path, model, false); // Don't save to config during startup
          })
          .catch((error) => {
            this.logger.error(`[ORCHESTRATOR] Model ${model} download failed`, error instanceof Error ? error : new Error(String(error)));
            this.fmdmService.updateFolderStatus(path, 'error', {
              message: `Failed to download model: ${error instanceof Error ? error.message : String(error)}`,
              type: 'error'
            });
          });
        
        // Return early - folder will start scanning after model downloads
        return;
      }
      
      // Model is already installed, proceed with folder setup
      await this.startFolderScanning(path, model, false); // Don't save to config during startup
      
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`[ORCHESTRATOR] Failed to start lifecycle for folder ${path}`, errorObj);
      
      // Update FMDM with error status
      this.fmdmService.updateFolderStatus(path, 'error', {
        message: errorObj.message,
        type: 'error'
      });
      
      throw errorObj;
    }
  }

  /**
   * Execute the actual folder addition operation
   */
  private async executeAddFolder(path: string, model: string): Promise<void> {
    try {
      this.logger.debug(`[ORCHESTRATOR] Creating folder lifecycle for ${path} with model ${model}`);
      
      // Check if model is available through FMDM
      const fmdm = this.fmdmService.getFMDM();
      const modelInfo = fmdm.curatedModels.find(m => m.id === model);
      
      if (!modelInfo) {
        throw new Error(`Model ${model} not found in curated models`);
      }
      
      // If model is not installed, set folder to downloading state and trigger download
      if (!modelInfo.installed) {
        this.logger.info(`[ORCHESTRATOR] Model ${model} not installed, initiating download`);
        this.logger.debug(`[ORCHESTRATOR] Model info: installed=${modelInfo.installed}, type=${modelInfo.type}`);
        
        // CRITICAL: Add folder to FMDM FIRST before any status updates
        this.logger.debug(`[ORCHESTRATOR] Adding folder to FMDM: ${path}`);
        this.addFolderToFMDM(path, model, 'pending');
        
        // Now update folder status to downloading-model (folder exists in FMDM)
        this.logger.debug(`[ORCHESTRATOR] Updating folder status to downloading-model`);
        this.fmdmService.updateFolderStatus(path, 'downloading-model', {
          message: `Downloading model ${model}`,
          type: 'info'
        });
        
        // Request model download (non-blocking)
        this.logger.debug(`[ORCHESTRATOR] Requesting model download for ${model}`);
        this.modelDownloadManager.requestModelDownload(model)
          .then(() => {
            this.logger.info(`[ORCHESTRATOR] Model ${model} download completed successfully`);
            this.logger.debug(`[ORCHESTRATOR] Starting folder scanning after successful download`);
            // After download completes, transition folder to scanning
            this.startFolderScanning(path, model);
          })
          .catch((error) => {
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.logger.error(`[ORCHESTRATOR] Model ${model} download failed: ${errorMsg}`);
            this.logger.debug(`[ORCHESTRATOR] Updating folder status to error due to download failure`);
            this.fmdmService.updateFolderStatus(path, 'error', {
              message: `Failed to download model: ${errorMsg}`,
              type: 'error'
            });
          });
        
        // Return early - folder will start scanning after model downloads
        return;
      }
      
      // Model is already installed, add folder to FMDM and proceed with folder setup
      this.addFolderToFMDM(path, model, 'pending');
      await this.startFolderScanning(path, model);
      
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`[ORCHESTRATOR] Failed to add folder ${path}`, errorObj);
      
      // Ensure folder is in FMDM before updating status
      this.addFolderToFMDM(path, model, 'error');
      
      // Update FMDM with error status and message
      this.fmdmService.updateFolderStatus(path, 'error', {
        message: errorObj.message,
        type: 'error'
      });
      
      throw errorObj;
    }
  }
  
  /**
   * Start folder scanning after model is available
   */
  private async startFolderScanning(path: string, model: string, saveToConfig: boolean = true): Promise<void> {
    try {
      // Get the actual model dimensions from curated models
      const modelDimension = getModelDimensions(model);
      this.logger.debug(`[ORCHESTRATOR] Model ${model} has dimension ${modelDimension}`);
      
      // Create SQLite storage for this folder
      const storage = new SQLiteVecStorage({
        folderPath: path,
        modelName: model,
        modelDimension: modelDimension,
        logger: this.logger
      });
      
      // Ensure .folder-mcp directory exists before creating FileStateService
      const fs = await import('fs');
      const folderMcpDir = `${path}/.folder-mcp`;
      if (!fs.existsSync(folderMcpDir)) {
        fs.mkdirSync(folderMcpDir, { recursive: true });
        this.logger.debug(`[ORCHESTRATOR] Created .folder-mcp directory: ${folderMcpDir}`);
      }
      
      // Create per-folder FileStateService using the same database as embeddings
      const folderDbPath = `${path}/.folder-mcp/embeddings.db`;
      const folderFileStateService = new FileStateService(folderDbPath, this.logger);
      
      // Get max concurrent files from ONNX configuration
      const maxConcurrentFiles = await this.onnxConfiguration.getMaxConcurrentFiles();
      this.logger.debug(`[ORCHESTRATOR] Using maxConcurrentFiles=${maxConcurrentFiles} from ONNX configuration`);
      
      // Use factory function to create folder lifecycle manager
      const folderManager = createFolderLifecycleService(
        `folder-${Date.now()}`, // Generate unique ID
        path,
        this.indexingOrchestrator,
        this.fileSystemService,
        storage,
        folderFileStateService, // Use per-folder service instead of global
        this.logger,
        model, // Pass the model parameter
        maxConcurrentFiles // Pass the configured max concurrent files
      );
      
      // Subscribe to manager events
      this.subscribeFolderEvents(path, folderManager);
      
      // Store manager
      this.folderManagers.set(path, folderManager);
      
      // Update FMDM for initial pending state
      this.updateFMDM();
      
      // Add folder to the sequential indexing queue instead of starting directly
      // The queue will handle model loading/unloading and sequential processing
      await this.folderIndexingQueue.addFolder(path, model, folderManager);
      
      // Note: File watching will be started when the folder completes indexing
      // This is handled in the subscribeFolderEvents method
      
      // Save folder to configuration for persistence across daemon restarts (if requested)
      if (saveToConfig) {
        try {
          // Use ConfigurationComponent's addFolder method instead of direct get/set
          await this.configService.addFolder(path, model);
          this.logger.info(`[ORCHESTRATOR] Saved folder to configuration: ${path}`);
        } catch (error) {
          // Check if it's a duplicate folder error (already exists)
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('already exists')) {
            this.logger.debug(`[ORCHESTRATOR] Folder already in configuration: ${path}`);
          } else {
            this.logger.warn(`[ORCHESTRATOR] Failed to save folder to configuration: ${path}`, error as Error);
          }
          // Don't fail the entire operation if config save fails
        }
      } else {
        this.logger.debug(`[ORCHESTRATOR] Skipping config save for startup folder: ${path}`);
      }
      
      this.logger.info(`[ORCHESTRATOR] Added folder to monitoring: ${path}`);
    } catch (error) {
      this.logger.error(`[ORCHESTRATOR] Failed to start folder scanning: ${path}`, error as Error);
      
      // Check if this is a Python prerequisite error and format appropriately for FMDM
      let errorMessage = error instanceof Error ? error.message : String(error);
      
      // Handle Python prerequisite errors specifically
      if (errorMessage.includes('Python 3.8+ required for')) {
        // Error message is already formatted correctly from PythonEmbeddingService
        this.logger.warn(`[ORCHESTRATOR] Python prerequisite error for ${path}: ${errorMessage}`);
      } else if (errorMessage.includes('Python embedding dependencies not available')) {
        // Error message is already formatted correctly from PythonEmbeddingService
        this.logger.warn(`[ORCHESTRATOR] Python dependency error for ${path}: ${errorMessage}`);
      } else if (errorMessage.includes('Python process failed to start') || errorMessage.includes('Failed to start Python process')) {
        // Generic Python process failure - enhance with model information
        try {
          const { getModelMetadata } = require('../../interfaces/tui-ink/models/modelMetadata.js');
          const metadata = getModelMetadata(model);
          const modelDisplayName = metadata?.displayName || model;
          errorMessage = `Python 3.8+ required for ${modelDisplayName}`;
        } catch {
          // Fallback if metadata is not available
          errorMessage = `Python 3.8+ required for ${model}`;
        }
        this.logger.warn(`[ORCHESTRATOR] Enhanced Python error message for ${path}: ${errorMessage}`);
      }
      
      // Create error folder config for tracking
      const errorFolderConfig: FolderConfig = {
        path: path,
        model: model,
        status: 'error',
        progress: 0,
        notification: this.createErrorNotification(errorMessage)
      };
      
      // Update FMDM directly with the error folder state
      // We need to add it directly since it may not exist in FMDM yet
      // Get current folders from FMDM (not just from managers)
      const currentFMDM = this.fmdmService.getFMDM();
      const currentFolders = [...currentFMDM.folders];
      
      // Check if folder already exists in current folders
      const existingIndex = currentFolders.findIndex(f => f.path === path);
      if (existingIndex >= 0) {
        // Update existing folder
        currentFolders[existingIndex] = errorFolderConfig;
      } else {
        // Add new folder with error status
        currentFolders.push(errorFolderConfig);
      }
      
      this.fmdmService.updateFolders(currentFolders);
      
      // Perform resource cleanup on execution failure
      await this.performResourceCleanup(path, 'add_folder_execution_failed');
      
      throw error;
    }
  }

  /**
   * Add folder to FMDM with initial status
   * This ensures the folder appears in FMDM before any status updates
   */
  private addFolderToFMDM(path: string, model: string, status: FolderIndexingStatus): void {
    try {
      // Get current FMDM folders
      const currentFMDM = this.fmdmService.getFMDM();
      const currentFolders = [...currentFMDM.folders];
      
      // Check if folder already exists
      const existingIndex = currentFolders.findIndex(f => f.path === path);
      
      const folderConfig = {
        path,
        model,
        status,
        progress: 0
      };
      
      if (existingIndex >= 0) {
        // Update existing folder
        currentFolders[existingIndex] = folderConfig;
        this.logger.debug(`[ORCHESTRATOR] Updated existing folder in FMDM: ${path}`);
      } else {
        // Add new folder
        currentFolders.push(folderConfig);
        this.logger.debug(`[ORCHESTRATOR] Added new folder to FMDM: ${path}`);
      }
      
      // Update FMDM with the new folder list
      this.fmdmService.updateFolders(currentFolders);
      
    } catch (error) {
      this.logger.error(`[ORCHESTRATOR] Failed to add folder to FMDM: ${path}`, error as Error);
    }
  }
  
  async removeFolder(folderPath: string): Promise<void> {
    // First, try to remove from the queue if it's pending
    const removedFromQueue = this.folderIndexingQueue.removeFolder(folderPath);
    if (removedFromQueue) {
      this.logger.info(`[ORCHESTRATOR] Removed folder from indexing queue: ${folderPath}`);
    }
    
    const manager = this.folderManagers.get(folderPath);
    if (!manager) {
      this.logger.warn(`No manager found for folder: ${folderPath}`);
      // Even without a manager, we need to:
      // 1. Remove from configuration
      // 2. Update FMDM to reflect removal
      // This handles error state folders or folders that failed to start
    } else {
      await manager.stop();
    }
    
    // Only do Windows delay and file watching cleanup if there was a manager
    if (manager) {
      // On Windows, add a small delay to ensure database connections are fully released
      // This prevents "EBUSY: resource busy or locked" errors when deleting the .folder-mcp directory
      const isWindows = process.platform === 'win32';
      if (isWindows) {
        this.logger.debug(`[ORCHESTRATOR] Windows detected - waiting for database locks to be released...`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2000ms delay for Windows file lock release
      }
      
      // Stop file watching if it was started
      if (this.monitoringOrchestrator) {
        try {
          await this.monitoringOrchestrator.stopFileWatching(folderPath);
          this.logger.info(`Stopped file watching for removed folder: ${folderPath}`);
        } catch (error) {
          this.logger.warn(`Failed to stop file watching for ${folderPath}`, error as Error);
        }
      }
    }
    
    // Clean up .folder-mcp directory and its contents (even without manager)
    try {
      const folderMcpPath = `${folderPath}/.folder-mcp`;
      const fs = await import('fs');
      
      // Check if .folder-mcp directory exists
      if (fs.existsSync(folderMcpPath)) {
        this.logger.info(`Cleaning up .folder-mcp directory: ${folderMcpPath}`);
        
        // Remove the entire .folder-mcp directory and its contents
        await fs.promises.rm(folderMcpPath, { recursive: true, force: true });
        this.logger.info(`Successfully removed .folder-mcp directory: ${folderMcpPath}`);
      } else {
        this.logger.debug(`No .folder-mcp directory found at: ${folderMcpPath}`);
      }
    } catch (error) {
      this.logger.error(`Failed to clean up .folder-mcp directory for ${folderPath}:`, error as Error);
      // Don't fail the entire removal process if cleanup fails
    }
    
    // Remove from configuration (even without manager)
    try {
      // Use ConfigurationComponent's removeFolder method
      await this.configService.removeFolder(folderPath);
      this.logger.info(`[ORCHESTRATOR] Removed folder from configuration: ${folderPath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('not found')) {
        this.logger.debug(`[ORCHESTRATOR] Folder not in configuration: ${folderPath}`);
      } else {
        this.logger.warn(`[ORCHESTRATOR] Failed to remove folder from configuration: ${folderPath}`, error as Error);
      }
      // Don't fail the entire operation if config removal fails
    }
    
    // Only delete from managers if it existed
    if (manager) {
      this.folderManagers.delete(folderPath);
      this.logger.debug(`[ORCHESTRATOR-REMOVE] Deleted manager for ${folderPath}, remaining managers: ${this.folderManagers.size}`);
    } else {
      // For error state folders without managers, we need to explicitly remove from FMDM
      this.logger.debug(`[ORCHESTRATOR-REMOVE] No manager to delete, removing error folder from FMDM directly`);
      const currentFMDM = this.fmdmService.getFMDM();
      const filteredFolders = currentFMDM.folders.filter(f => f.path !== folderPath);
      this.fmdmService.updateFolders(filteredFolders);
    }
    
    // Update FMDM after removal - ALWAYS do this
    this.logger.debug(`[ORCHESTRATOR-REMOVE] Calling updateFMDM after folder removal`);
    this.updateFMDM();
    
    this.logger.info(`Removed folder from monitoring: ${folderPath}`);
  }
  
  getManager(folderPath: string): IFolderLifecycleManager | undefined {
    return this.folderManagers.get(folderPath);
  }
  
  /**
   * Get the model download manager (for setting cache callbacks)
   */
  getModelDownloadManager(): IModelDownloadManager {
    return this.modelDownloadManager;
  }

  /**
   * Record connection event for telemetry
   */
  recordConnection(duration?: number, isError = false): void {
    if (this.systemPerformanceTelemetry) {
      this.systemPerformanceTelemetry.recordConnection(duration, isError);
    }
  }

  /**
   * Record query performance for telemetry
   */
  recordQuery(durationMs: number, cacheHit = false): void {
    if (this.systemPerformanceTelemetry) {
      this.systemPerformanceTelemetry.recordQuery(durationMs, cacheHit);
    }
  }

  /**
   * Get performance telemetry statistics
   */
  getTelemetryStatistics(): any {
    if (this.systemPerformanceTelemetry) {
      return this.systemPerformanceTelemetry.getStatistics();
    }
    return null;
  }
  
  async startAll(): Promise<void> {
    const startupStartTime = Date.now();
    this.logger.info('Starting all configured folders...');
    
    // Get current FMDM state to see which folders are already loaded
    const currentFMDM = this.fmdmService.getFMDM();
    const fmdmFolders = currentFMDM.folders.map(f => f.path);
    this.logger.debug(`FMDM already contains ${fmdmFolders.length} folders: ${fmdmFolders.join(', ')}`);
    
    // Start lifecycle management for folders already in FMDM
    if (fmdmFolders.length > 0) {
      this.logger.info(`Starting lifecycle management for ${fmdmFolders.length} folders already in FMDM`);
      
      for (const folderConfig of currentFMDM.folders) {
        try {
          // Skip folders that already have managers (shouldn't happen but safety check)
          if (this.folderManagers.has(folderConfig.path)) {
            this.logger.debug(`Manager already exists for ${folderConfig.path}, skipping`);
            continue;
          }
          
          this.logger.info(`Starting lifecycle for FMDM folder: ${folderConfig.path} with model: ${folderConfig.model}`);
          
          // Start folder lifecycle without adding to config (it's already there)
          await this.startFolderLifecycle(folderConfig.path, folderConfig.model);
          
        } catch (error) {
          this.logger.error(`Failed to start lifecycle for FMDM folder ${folderConfig.path}:`, error as Error);
          // Continue with other folders even if one fails
        }
      }
      this.logger.info(`Completed starting lifecycle for ${fmdmFolders.length} FMDM folders`);
    } else {
      this.logger.info('No folders found in FMDM to start lifecycle management');
    }
    
    // Log startup performance telemetry
    const startupDuration = Date.now() - startupStartTime;
    this.logger.info('Orchestrator startup completed', {
      startupDurationMs: startupDuration,
      foldersManaged: this.folderManagers.size,
      telemetryEnabled: !!this.systemPerformanceTelemetry,
      memoryMonitorEnabled: !!this.intelligentMemoryMonitor
    });
  }
  
  async stopAll(): Promise<void> {
    const shutdownStartTime = Date.now();
    this.logger.info(`Stopping all ${this.folderManagers.size} folder managers`);
    
    // Stop folder validation timer
    this.stopFolderValidation();
    
    // Stop the folder indexing queue first
    // This will stop current processing and clear the queue
    try {
      this.logger.info('[ORCHESTRATOR] Stopping folder indexing queue');
      await this.folderIndexingQueue.stop();
      this.logger.info('[ORCHESTRATOR] Folder indexing queue stopped');
    } catch (error) {
      this.logger.error('[ORCHESTRATOR] Error stopping folder indexing queue:', error instanceof Error ? error : new Error(String(error)));
    }
    
    // Stop intelligent memory monitoring (only if enabled)
    if (this.intelligentMemoryMonitor) {
      this.intelligentMemoryMonitor.stopMonitoring();
    }
    
    // Stop system performance telemetry (only if enabled)
    if (this.systemPerformanceTelemetry) {
      this.systemPerformanceTelemetry.stopTelemetry();
    }
    
    // Shutdown resource manager first to stop accepting new operations
    try {
      this.logger.info('[ORCHESTRATOR] Shutting down resource manager');
      await this.resourceManager.shutdown();
      this.logger.info('[ORCHESTRATOR] Resource manager shutdown complete');
    } catch (error) {
      this.logger.error('[ORCHESTRATOR] Error shutting down resource manager:', error instanceof Error ? error : new Error(String(error)));
    }
    
    for (const [path, manager] of this.folderManagers) {
      try {
        await manager.stop();
        
        // Stop file watching if it was started
        if (this.monitoringOrchestrator) {
          try {
            await this.monitoringOrchestrator.stopFileWatching(path);
          } catch (error) {
            this.logger.warn(`Failed to stop file watching for ${path}`, error as Error);
          }
        }
      } catch (error) {
        this.logger.error(`Error stopping manager for ${path}`, error as Error);
      }
    }
    
    this.folderManagers.clear();
    
    // Clear the model factory cache to ensure clean shutdown
    try {
      this.logger.info('[ORCHESTRATOR] Clearing model factory cache');
      this.modelFactory.clearCache();
      this.logger.info('[ORCHESTRATOR] Model factory cache cleared');
    } catch (error) {
      this.logger.error('[ORCHESTRATOR] Error clearing model factory cache:', error instanceof Error ? error : new Error(String(error)));
    }
    
    // Log shutdown performance telemetry
    const shutdownDuration = Date.now() - shutdownStartTime;
    this.logger.info('Orchestrator shutdown completed', {
      shutdownDurationMs: shutdownDuration,
      previouslyManagedFolders: 0, // folderManagers was cleared
      telemetryWasEnabled: !!this.systemPerformanceTelemetry,
      memoryMonitorWasEnabled: !!this.intelligentMemoryMonitor
    });
  }
  
  /**
   * Subscribe to events from a folder manager
   */
  private subscribeFolderEvents(folderPath: string, manager: IFolderLifecycleManager): void {
    // Listen for state changes
    manager.on('stateChange', (state) => {
      this.logger.debug(`[ORCHESTRATOR] Folder ${folderPath} state changed to: ${state.status}`);
      this.onFolderStateChange(folderPath, state);
    });
    
    // Listen for scan completion
    manager.on('scanComplete', (state) => {
      this.logger.debug(`[ORCHESTRATOR] Folder ${folderPath} scan complete with ${state.fileEmbeddingTasks?.length || 0} tasks`);
      this.onScanComplete(folderPath, manager, state);
    });
    
    // Listen for index completion
    manager.on('indexComplete', (state) => {
      this.logger.debug(`[ORCHESTRATOR] Folder ${folderPath} indexing complete`);
      this.onIndexComplete(folderPath, state);
    });
    
    // Listen for changes detected
    manager.on('changesDetected', () => {
      this.logger.debug(`[ORCHESTRATOR] Folder ${folderPath} detected changes`);
      this.onChangesDetected(folderPath, manager);
    });
    
    // Listen for progress updates
    manager.on('progressUpdate', (progress) => {
      this.logger.debug(`[ORCHESTRATOR] Folder ${folderPath} progress: ${progress.percentage}%`);
      this.fmdmService.updateFolderProgress(folderPath, progress.percentage);
    });
    
    // Listen for errors
    manager.on('error', (error) => {
      this.logger.error(`[ORCHESTRATOR] Folder ${folderPath} error:`, error);
      this.onFolderError(folderPath, error);
    });
  }
  
  /**
   * Handle folder state change
   */
  private onFolderStateChange(folderPath: string, state: any): void {
    // Update FMDM whenever state changes
    this.updateFMDM();
  }
  
  /**
   * Handle scan completion - decide whether to start indexing
   */
  private async onScanComplete(folderPath: string, manager: IFolderLifecycleManager, state: any): Promise<void> {
    if (state.fileEmbeddingTasks && state.fileEmbeddingTasks.length > 0) {
      // Has tasks, start indexing
      this.logger.info(`[ORCHESTRATOR] Starting indexing for ${folderPath} with ${state.fileEmbeddingTasks.length} tasks`);
      await manager.startIndexing();
    } else {
      // No tasks, already in active state
      this.logger.info(`[ORCHESTRATOR] No tasks for ${folderPath}, already active`);
      
      // Check for Windows performance issues when folder becomes active
      await this.checkWindowsPerformanceForFolder(folderPath, state.model);
    }
    
    // Update FMDM when indexing starts or folder becomes active
    this.updateFMDM();
  }
  
  /**
   * Helper to create error notification from error message
   */
  private createErrorNotification(message: string): { message: string; type: 'error' } {
    return { message, type: 'error' };
  }
  
  /**
   * Check Windows performance issues for a folder that uses Python models
   */
  private async checkWindowsPerformanceForFolder(folderPath: string, model?: string): Promise<void> {
    if (!model) {
      return; // No model information available
    }
    
    try {
      const performanceResult = await this.windowsPerformanceService.detectPerformanceIssues(model);
      
      if (performanceResult.shouldShowWarning && performanceResult.warningMessage) {
        this.logger.info(`[ORCHESTRATOR] Windows performance warning for ${folderPath}: ${performanceResult.warningMessage}`);
        
        // Set notification in FMDM for this folder
        this.fmdmService.updateFolderNotification(folderPath, {
          message: performanceResult.warningMessage,
          type: 'warning'
        });
      }
    } catch (error) {
      // Don't fail the folder activation if performance check fails
      this.logger.debug(`[ORCHESTRATOR] Windows performance check failed for ${folderPath}`, { error: error instanceof Error ? error.message : String(error) });
    }
  }
  
  /**
   * Handle index completion - start file watching when folder becomes active
   */
  private async onIndexComplete(folderPath: string, state: any): Promise<void> {
    this.logger.info(`[ORCHESTRATOR] Indexing complete for ${folderPath}, starting file watching`);
    
    // Create and emit FMDM informational message for active state
    if (state.indexingStats) {
      const { fileCount, indexingTimeSeconds } = state.indexingStats;
      const infoMessage = `▶ ${folderPath} [active] i ${fileCount} files indexed • indexing time ${indexingTimeSeconds}s`;
      
      this.logger.info(`[ORCHESTRATOR] ${infoMessage}`);
      
      // Update folder status to 'active' with permanent completion notification
      this.fmdmService.updateFolderStatus(folderPath, 'active', {
        message: `${fileCount} files indexed • indexing time ${indexingTimeSeconds}s`,
        type: 'info'
      });
    } else {
      this.logger.debug(`[ORCHESTRATOR] No indexing statistics available for ${folderPath}`);
    }
    
    // Check for Windows performance issues when folder becomes active after indexing
    await this.checkWindowsPerformanceForFolder(folderPath, state.model);
    
    await this.startFileWatchingForFolder(folderPath);
    
    // Update FMDM
    this.updateFMDM();
  }
  
  /**
   * Start file watching for a specific folder
   */
  private async startFileWatchingForFolder(folderPath: string): Promise<void> {
    try {
      // Create MonitoringOrchestrator if we don't have one
      if (!this.monitoringOrchestrator) {
        this.logger.debug(`[ORCHESTRATOR] Creating MonitoringOrchestrator for file watching`);
        const { MonitoringOrchestrator } = await import('../../application/monitoring/orchestrator.js');
        
        // Create dummy services for MonitoringOrchestrator - we only need file watching
        const dummyFileParsingService = {
          parseFile: async () => ({ success: true, chunks: [] }),
          getSupportedFormats: () => ['txt', 'md', 'pdf']
        };
        const dummyCacheService = {
          getCacheStatus: async () => ({ status: 'ready' }),
          clearCache: async () => true
        };
        const dummyConfigService = this.configService;
        const dummyIncrementalIndexer = {
          indexChanges: async () => ({ 
            success: true, 
            filesProcessed: 0, 
            chunksGenerated: 0, 
            embeddingsCreated: 0, 
            errors: [] 
          })
        };
        
        this.monitoringOrchestrator = new MonitoringOrchestrator(
          dummyFileParsingService as any,
          dummyCacheService as any,
          this.logger,
          dummyConfigService as any,
          dummyIncrementalIndexer as any
        );
        
        // Set up change detection callback
        this.monitoringOrchestrator.setChangeDetectionCallback((folderPath: string, changeCount: number) => {
          this.logger.info(`[ORCHESTRATOR] File changes detected in ${folderPath} (${changeCount} changes)`);
          const manager = this.folderManagers.get(folderPath);
          if (manager) {
            // Directly trigger the change detection handling
            this.onChangesDetected(folderPath, manager);
          } else {
            this.logger.warn(`[ORCHESTRATOR] No manager found for changed folder: ${folderPath}`);
          }
        });
      }
      
      // Start file watching for this folder
      const watchingOptions = {
        debounceMs: 2000, // 2 second debounce
        enableBatchProcessing: true,
        batchSize: 10,
        includeFileTypes: getSupportedExtensions(),
        excludePatterns: [
          '**/node_modules/**', 
          '**/.git/**', 
          '**/.folder-mcp/**'
        ]
      };
      
      const watchResult = await this.monitoringOrchestrator.startFileWatching(folderPath, watchingOptions);
      
      if (watchResult.success) {
        this.logger.info(`[ORCHESTRATOR] File watching started successfully for ${folderPath}`, {
          watchId: watchResult.watchId,
          startedAt: watchResult.startedAt
        });
      } else {
        this.logger.error(`[ORCHESTRATOR] Failed to start file watching for ${folderPath}: ${watchResult.error}`);
      }
    } catch (error) {
      this.logger.error(`[ORCHESTRATOR] Error starting file watching for ${folderPath}:`, error instanceof Error ? error : new Error(String(error)));
    }
  }
  
  /**
   * Handle changes detected - restart scanning
   */
  private async onChangesDetected(folderPath: string, manager: IFolderLifecycleManager): Promise<void> {
    this.logger.info(`[ORCHESTRATOR] Restarting scan for ${folderPath} due to changes`);
    
    // Submit scanning operation through resource manager
    const operationId = `scan-changes-${folderPath}`;
    const estimatedMemoryMB = 50; // Estimated memory for scanning operation
    
    try {
      await this.resourceManager.submitOperation(
        operationId,
        folderPath,
        () => manager.startScanning(),
        {
          priority: 2, // Lower priority than folder additions but higher than regular operations
          estimatedMemoryMB
        }
      );
    } catch (error) {
      this.logger.error(`[ORCHESTRATOR] Resource manager rejected scan operation for ${folderPath}:`, error instanceof Error ? error : new Error(String(error)));
      // Don't throw here - just log the error as this is a background operation
    }
  }
  
  /**
   * Handle folder error
   */
  private onFolderError(folderPath: string, error: Error): void {
    this.logger.error(`[ORCHESTRATOR] Folder error for ${folderPath}:`, error);
    
    // Check if this is a Python prerequisite error and format appropriately for FMDM
    let errorMessage = error.message;
    
    // Handle Python prerequisite errors specifically
    if (errorMessage.includes('Python 3.8+ required for')) {
      // Error message is already formatted correctly from PythonEmbeddingService
      this.logger.warn(`[ORCHESTRATOR] Python prerequisite error for ${folderPath}: ${errorMessage}`);
    } else if (errorMessage.includes('Python embedding dependencies not available')) {
      // Error message is already formatted correctly from PythonEmbeddingService
      this.logger.warn(`[ORCHESTRATOR] Python dependency error for ${folderPath}: ${errorMessage}`);
    } else if (errorMessage.includes('Python process failed to start') || errorMessage.includes('Failed to start Python process')) {
      // Generic Python process failure - enhance with model information
      const manager = this.folderManagers.get(folderPath);
      if (manager) {
        const state = manager.getState();
        const model = state.model || 'unknown';
        
        try {
          const { getModelMetadata } = require('../../interfaces/tui-ink/models/modelMetadata.js');
          const metadata = getModelMetadata(model);
          const modelDisplayName = metadata?.displayName || model;
          errorMessage = `Python 3.8+ required for ${modelDisplayName}`;
        } catch {
          // Fallback if metadata is not available
          errorMessage = `Python 3.8+ required for ${model}`;
        }
        this.logger.warn(`[ORCHESTRATOR] Enhanced Python error message for ${folderPath}: ${errorMessage}`);
      }
    }
    
    // Use FMDM service to update folder status with specific error message
    const manager = this.folderManagers.get(folderPath);
    if (manager) {
      const state = manager.getState();
      const model = state.model || 'unknown';
      
      // Create error folder config with enhanced error message
      const errorFolderConfig: FolderConfig = {
        path: folderPath,
        model: model,
        status: 'error',
        progress: 0,
        notification: this.createErrorNotification(errorMessage)
      };
      
      // Error state is tracked in the folder manager itself
    }
    
    // Update FMDM with error state
    this.updateFMDM();
  }
  
  /**
   * Get current folder configs for FMDM
   */
  private getCurrentFolderConfigs(): FolderConfig[] {
    const folders: FolderConfig[] = [];
    
    // Get current FMDM state to preserve existing notifications
    const currentFMDM = this.fmdmService.getFMDM();
    
    // Add folders with managers
    for (const [path, manager] of this.folderManagers) {
      const state = manager.getState();
      const folderConfig: FolderConfig = {
        path,
        model: state.model || 'unknown', 
        status: state.status,
        ...(state.errorMessage && { notification: this.createErrorNotification(state.errorMessage) })
      };
      
      // Add indexing progress (for indexing phase and completed active folders)
      if (state.status === 'indexing') {
        folderConfig.progress = state.progress?.percentage;
        // Add progress message as notification for better UX
        if (state.progressMessage) {
          folderConfig.notification = {
            message: state.progressMessage,
            type: 'info'
          };
        }
      } else if (state.status === 'active') {
        folderConfig.progress = 100; // Active folders are 100% complete
        
        // Preserve completion notifications for active folders from current FMDM
        const existingFolder = currentFMDM.folders.find(f => f.path === path);
        if (existingFolder?.notification) {
          // Only preserve completion notifications (contain "files indexed")
          // Clear progress notifications (contain "processing" or "in progress")
          if (existingFolder.notification.message.includes('files indexed')) {
            folderConfig.notification = existingFolder.notification;
          }
        }
      } else {
        // Clear progress notification for other states
        if (folderConfig.notification?.type === 'info' && !state.errorMessage) {
          delete folderConfig.notification;
        }
      }
      
      // Add scanning progress (only for scanning phase)
      if (state.status === 'scanning' && state.scanningProgress) {
        folderConfig.scanningProgress = {
          phase: state.scanningProgress.phase,
          processedFiles: state.scanningProgress.processedFiles,
          totalFiles: state.scanningProgress.totalFiles,
          percentage: state.scanningProgress.percentage,
        };
      }
      
      folders.push(folderConfig);
    }
    
    // No need to add errorFolders separately - error state is tracked in folderManagers
    
    return folders;
  }

  /**
   * Update FMDM with current state of all folders
   */
  private updateFMDM(): void {
    const folders = this.getCurrentFolderConfigs();
    
    this.logger.debug(`[ORCHESTRATOR-FMDM] Updating FMDM with ${folders.length} folders`);
    
    // Update FMDM with all folder states
    this.fmdmService.updateFolders(folders);
  }
  
  /**
   * Start periodic folder validation to detect deleted folders
   */
  private startFolderValidation(): void {
    this.logger.debug('[ORCHESTRATOR] Starting periodic folder validation');
    
    this.folderValidationTimer = setInterval(async () => {
      await this.validateAllFolders();
    }, 30000); // Check every 30 seconds
  }
  
  /**
   * Stop folder validation timer
   */
  private stopFolderValidation(): void {
    if (this.folderValidationTimer) {
      clearInterval(this.folderValidationTimer);
      delete this.folderValidationTimer;
      this.logger.debug('[ORCHESTRATOR] Stopped folder validation timer');
    }
  }
  
  /**
   * Validate all monitored folders still exist
   */
  private async validateAllFolders(): Promise<void> {
    const foldersToMarkError: string[] = [];
    
    for (const [folderPath, manager] of this.folderManagers) {
      try {
        const fs = await import('fs');
        
        // Check if folder still exists
        if (!fs.existsSync(folderPath)) {
          this.logger.warn(`[ORCHESTRATOR] Monitored folder no longer exists: ${folderPath}`);
          foldersToMarkError.push(folderPath);
        }
      } catch (error) {
        this.logger.error(`[ORCHESTRATOR] Error validating folder ${folderPath}:`, error instanceof Error ? error : new Error(String(error)));
        // If we can't validate, assume folder is problematic and mark with error
        foldersToMarkError.push(folderPath);
      }
    }
    
    // Mark non-existent folders with error status instead of removing them
    for (const folderPath of foldersToMarkError) {
      this.logger.info(`[ORCHESTRATOR] Marking deleted folder with error status: ${folderPath}`);
      await this.markFolderAsError(folderPath, 'Folder no longer exists');
    }
  }
  
  /**
   * Mark folder as error and stop its lifecycle manager but keep it in tracking
   */
  private async markFolderAsError(folderPath: string, errorMessage: string): Promise<void> {
    const manager = this.folderManagers.get(folderPath);
    if (!manager) {
      this.logger.debug(`[ORCHESTRATOR] No manager found for folder error marking: ${folderPath}`);
      return;
    }
    
    try {
      // Stop the manager to halt any ongoing processes
      await manager.stop();
      this.logger.info(`[ORCHESTRATOR] Stopped lifecycle manager for error folder: ${folderPath}`);
      
      // Stop file watching if it was started
      if (this.monitoringOrchestrator) {
        try {
          await this.monitoringOrchestrator.stopFileWatching(folderPath);
          this.logger.info(`[ORCHESTRATOR] Stopped file watching for error folder: ${folderPath}`);
        } catch (error) {
          this.logger.warn(`[ORCHESTRATOR] Failed to stop file watching for ${folderPath}`, error as Error);
        }
      }
      
      // Remove from active managers but keep in error tracking
      this.folderManagers.delete(folderPath);
      
      // Get folder config from configuration to preserve model info
      let folderConfig: FolderConfig;
      try {
        const existingConfig = await this.configService.getFolder(folderPath);
        
        folderConfig = {
          path: folderPath,
          model: existingConfig?.model || getDefaultModelId(), // Fallback to dynamic default model
          status: 'error',
          notification: this.createErrorNotification(errorMessage)
        };
      } catch (error) {
        // If we can't get the config, create a minimal one
        folderConfig = {
          path: folderPath,
          model: getDefaultModelId(), // Dynamic default model
          status: 'error',
          notification: this.createErrorNotification(errorMessage)
        };
      }
      
      // Update FMDM to show the folder with error status
      this.updateFMDM();
      
      this.logger.info(`[ORCHESTRATOR] Marked folder as error: ${folderPath} (${errorMessage})`);
      
    } catch (error) {
      this.logger.error(`[ORCHESTRATOR] Error marking folder as error ${folderPath}:`, error instanceof Error ? error : new Error(String(error)));
    }
  }
  
  /**
   * Internal folder removal with optional error message
   */
  private async removeFolderInternal(folderPath: string, reason?: string): Promise<void> {
    const manager = this.folderManagers.get(folderPath);
    if (!manager) {
      this.logger.debug(`[ORCHESTRATOR] No manager found for folder removal: ${folderPath}`);
      return;
    }
    
    try {
      // Stop the manager
      await manager.stop();
      
      // On Windows, add a small delay to ensure database connections are fully released
      // This prevents "EBUSY: resource busy or locked" errors when deleting the .folder-mcp directory
      const isWindows = process.platform === 'win32';
      if (isWindows) {
        this.logger.debug(`[ORCHESTRATOR] Windows detected - waiting for database locks to be released...`);
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
      }
      
      // Stop file watching if it was started
      if (this.monitoringOrchestrator) {
        try {
          await this.monitoringOrchestrator.stopFileWatching(folderPath);
          this.logger.info(`[ORCHESTRATOR] Stopped file watching for removed folder: ${folderPath}`);
        } catch (error) {
          this.logger.warn(`[ORCHESTRATOR] Failed to stop file watching for ${folderPath}`, error as Error);
        }
      }
      
      // Remove from configuration (but don't fail if it's not there)
      try {
        await this.configService.removeFolder(folderPath);
        this.logger.info(`[ORCHESTRATOR] Removed folder from configuration: ${folderPath}`);
      } catch (error) {
        this.logger.debug(`[ORCHESTRATOR] Folder not in configuration during cleanup: ${folderPath}`);
      }
      
      // Remove from our tracking
      this.folderManagers.delete(folderPath);
      
      // Update FMDM to remove the folder
      this.updateFMDM();
      
      this.logger.info(`[ORCHESTRATOR] Successfully removed folder: ${folderPath}${reason ? ` (${reason})` : ''}`);
      
    } catch (error) {
      this.logger.error(`[ORCHESTRATOR] Error during folder cleanup for ${folderPath}:`, error instanceof Error ? error : new Error(String(error)));
    }
  }
  
  /**
   * Get intelligent memory monitoring statistics
   */
  getIntelligentMemoryStatistics(): {
    baselineEstablished: boolean;
    samplesCollected: number;
    currentHeapUsedMB: number;
    currentHeapUtilization: number;
    baselineDeviation?: number;
    monitoringDuration: number;
  } {
    if (!this.intelligentMemoryMonitor) {
      return {
        baselineEstablished: false,
        samplesCollected: 0,
        currentHeapUsedMB: 0,
        currentHeapUtilization: 0,
        monitoringDuration: 0
      };
    }
    return this.intelligentMemoryMonitor.getStatistics();
  }
  
  /**
   * Get current memory statistics for external monitoring
   */
  getMemoryStatistics(): {
    process: NodeJS.MemoryUsage;
    heapUtilizationPercent: number;
    resourceManager: ResourceStats;
    folders: {
      managed: number;
      error: number;
    };
  } {
    const memUsage = process.memoryUsage();
    const heapUtilization = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    const resourceStats = this.resourceManager.getStats();
    
    return {
      process: memUsage,
      heapUtilizationPercent: heapUtilization,
      resourceManager: resourceStats,
      folders: {
        managed: this.folderManagers.size,
        error: 0
      }
    };
  }
  
  /**
   * Perform resource cleanup when operations fail
   * This ensures that partially completed operations don't leave the system in an inconsistent state
   */
  private async performResourceCleanup(folderPath: string, reason: string): Promise<void> {
    this.logger.info(`[ORCHESTRATOR] Performing resource cleanup for ${folderPath} (reason: ${reason})`);
    
    try {
      // 1. Force resource manager to cancel any pending operations for this folder
      if (this.resourceManager) {
        try {
          const operationId = `add-folder-${folderPath}`;
          const cancelled = await this.resourceManager.cancelOperation(operationId);
          if (cancelled) {
            this.logger.info(`[ORCHESTRATOR] Cancelled pending resource manager operation: ${operationId}`);
          }
          
          // Also try to cancel scan operations
          const scanOperationId = `scan-changes-${folderPath}`;
          const scanCancelled = await this.resourceManager.cancelOperation(scanOperationId);
          if (scanCancelled) {
            this.logger.info(`[ORCHESTRATOR] Cancelled pending scan operation: ${scanOperationId}`);
          }
        } catch (error) {
          this.logger.warn(`[ORCHESTRATOR] Error cancelling resource manager operations for ${folderPath}:`, error instanceof Error ? error : new Error(String(error)));
        }
      }
      
      // 2. Stop and clean up any partially created folder manager
      if (this.folderManagers.has(folderPath)) {
        try {
          const manager = this.folderManagers.get(folderPath);
          if (manager) {
            this.logger.info(`[ORCHESTRATOR] Stopping partially created folder manager for ${folderPath}`);
            await manager.stop();
            this.logger.info(`[ORCHESTRATOR] Folder manager stopped successfully`);
            
            // On Windows, add a small delay to ensure database connections are fully released
            const isWindows = process.platform === 'win32';
            if (isWindows) {
              this.logger.debug(`[ORCHESTRATOR] Windows detected - waiting for database locks to be released during cleanup...`);
              await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
            }
          }
          this.folderManagers.delete(folderPath);
        } catch (error) {
          this.logger.warn(`[ORCHESTRATOR] Error stopping folder manager during cleanup for ${folderPath}:`, error instanceof Error ? error : new Error(String(error)));
        }
      }
      
      // 3. Clean up file watching if it was started
      if (this.monitoringOrchestrator) {
        try {
          await this.monitoringOrchestrator.stopFileWatching(folderPath);
          this.logger.info(`[ORCHESTRATOR] File watching stopped for ${folderPath} during cleanup`);
        } catch (error) {
          // This is expected if file watching wasn't started yet
          this.logger.debug(`[ORCHESTRATOR] File watching cleanup for ${folderPath}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      // 4. Clean up .folder-mcp directory if it was created
      try {
        const folderMcpPath = `${folderPath}/.folder-mcp`;
        const fs = await import('fs');
        
        if (fs.existsSync(folderMcpPath)) {
          this.logger.info(`[ORCHESTRATOR] Cleaning up .folder-mcp directory during cleanup: ${folderMcpPath}`);
          await fs.promises.rm(folderMcpPath, { recursive: true, force: true });
          this.logger.info(`[ORCHESTRATOR] Successfully cleaned up .folder-mcp directory`);
        }
      } catch (error) {
        this.logger.warn(`[ORCHESTRATOR] Error cleaning up .folder-mcp directory for ${folderPath}:`, error instanceof Error ? error : new Error(String(error)));
      }
      
      // 5. Remove from configuration if it was added
      try {
        await this.configService.removeFolder(folderPath);
        this.logger.info(`[ORCHESTRATOR] Removed ${folderPath} from configuration during cleanup`);
      } catch (error) {
        // This is expected if folder wasn't added to config yet
        this.logger.debug(`[ORCHESTRATOR] Configuration cleanup for ${folderPath}: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // 6. Folder removal from managers handled above
      
      // 7. Force garbage collection if available to free up memory
      if (global.gc) {
        this.logger.debug(`[ORCHESTRATOR] Triggering garbage collection after resource cleanup for ${folderPath}`);
        global.gc();
      }
      
      // 8. Update FMDM to remove any partially created folder entries
      // BUT: Don't remove error folders that were intentionally added to FMDM
      // Check if the folder is already in FMDM with error status
      const currentFMDM = this.fmdmService.getFMDM();
      const folderInFMDM = currentFMDM.folders.find(f => f.path === folderPath);
      
      if (!folderInFMDM || folderInFMDM.status !== 'error') {
        // Only update FMDM if folder is not in error state
        // (error state folders should remain visible to the user)
        this.updateFMDM();
      } else {
        this.logger.debug(`[ORCHESTRATOR] Keeping error folder ${folderPath} in FMDM during cleanup`);
      }
      
      // 9. Log final resource statistics after cleanup
      if (this.resourceManager) {
        const stats = this.resourceManager.getStats();
        this.logger.info(`[ORCHESTRATOR] Resource cleanup completed for ${folderPath}`, {
          reason,
          activeOperations: stats.activeOperations,
          queuedOperations: stats.queuedOperations,
          memoryUsedMB: Math.round(stats.memoryUsedMB),
          isThrottled: stats.isThrottled
        });
      }
      
    } catch (error) {
      this.logger.error(`[ORCHESTRATOR] Error during resource cleanup for ${folderPath}:`, error instanceof Error ? error : new Error(String(error)));
      // Don't throw - cleanup should not fail the parent operation
    }
  }
  
  /**
   * Setup event handlers for the folder indexing queue
   */
  private setupQueueEventHandlers(): void {
    // Handle queue events for FMDM updates
    this.folderIndexingQueue.on('queue:added', (folder) => {
      this.logger.debug(`[ORCHESTRATOR] Folder added to queue: ${folder.folderPath}`);
      this.updateFMDM();
    });

    this.folderIndexingQueue.on('queue:started', (folder) => {
      this.logger.info(`[ORCHESTRATOR] Started processing folder: ${folder.folderPath}`);
      this.updateFMDM();
    });

    this.folderIndexingQueue.on('queue:model-loading', (folder, progress) => {
      this.logger.debug(`[ORCHESTRATOR] Model loading for ${folder.folderPath}: ${progress.stage}`);
      
      // Update FMDM with model loading progress
      if (progress.stage === 'downloading' && progress.progress !== undefined) {
        this.fmdmService.updateFolderStatus(folder.folderPath, 'downloading-model', {
          message: `Downloading model: ${progress.progress}%`,
          type: 'info'
        });
      }
    });

    this.folderIndexingQueue.on('queue:model-loaded', (folder, modelId) => {
      this.logger.info(`[ORCHESTRATOR] Model loaded for ${folder.folderPath}: ${modelId}`);
      this.updateFMDM();
    });

    this.folderIndexingQueue.on('queue:progress', (folder, progress) => {
      this.logger.debug(`[ORCHESTRATOR] Indexing progress for ${folder.folderPath}: ${progress.percentage}%`);
      // Update FMDM with current progress
      this.fmdmService.updateFolderProgress(folder.folderPath, progress.percentage);
      this.updateFMDM();
    });

    this.folderIndexingQueue.on('queue:completed', (folder) => {
      this.logger.info(`[ORCHESTRATOR] Completed processing folder: ${folder.folderPath}`);
      this.updateFMDM();
    });

    this.folderIndexingQueue.on('queue:failed', (folder, error) => {
      this.logger.error(`[ORCHESTRATOR] Failed to process folder ${folder.folderPath}:`, error);
      
      // Update FMDM with error status
      this.fmdmService.updateFolderStatus(folder.folderPath, 'error', {
        message: error.message,
        type: 'error'
      });
    });

    this.folderIndexingQueue.on('queue:empty', () => {
      this.logger.debug('[ORCHESTRATOR] Indexing queue is empty');
    });
  }

  /**
   * Initialize Python embedding service for model downloads
   * Uses the same factory pattern as the daemon's model cache checker
   */
  private async initializePythonEmbeddingService(): Promise<void> {
    try {
      this.logger.debug('[ORCHESTRATOR] Initializing Python embedding service for model downloads...');
      
      // Import factory function (same as daemon uses)
      const { createPythonEmbeddingService } = await import('../factories/model-factories.js');
      
      // Create Python embedding service with any valid config (not used for embedding)
      // This is just for model download capabilities, not for actual embedding
      const pythonService = createPythonEmbeddingService({
        modelName: 'sentence-transformers/all-MiniLM-L6-v2', // Any valid HF model ID for service init
        batchSize: 32,
        maxSequenceLength: 512
      });
      
      // Wire the service to the model download manager
      this.modelDownloadManager.setPythonEmbeddingService(pythonService);
      
      this.logger.info('[ORCHESTRATOR] Python embedding service wired to model download manager');
      
    } catch (error) {
      this.logger.error('[ORCHESTRATOR] Failed to initialize Python embedding service for downloads:', error instanceof Error ? error : new Error(String(error)));
      // Don't throw - this is not a fatal error, just means model downloads won't work
    }
  }

  /**
   * Initialize ONNX downloader for CPU model downloads
   */
  private async initializeONNXDownloader(): Promise<void> {
    try {
      this.logger.debug('[ORCHESTRATOR] Initializing ONNX downloader for CPU model downloads...');
      
      // Import the ONNX downloader
      const { ONNXDownloader } = await import('../../infrastructure/embeddings/onnx/onnx-downloader.js');
      
      // Create ONNX downloader with default cache directory
      const onnxDownloader = new ONNXDownloader({
        cacheDirectory: path.join(os.homedir(), '.cache', 'folder-mcp', 'onnx-models')
      });
      
      // Wire the downloader to the model download manager
      this.modelDownloadManager.setONNXDownloader(onnxDownloader);
      
      this.logger.info('[ORCHESTRATOR] ONNX downloader wired to model download manager');
      
    } catch (error) {
      this.logger.error('[ORCHESTRATOR] Failed to initialize ONNX downloader:', error instanceof Error ? error : new Error(String(error)));
      // Don't throw - this is not a fatal error, just means CPU model downloads won't work
    }
  }
}