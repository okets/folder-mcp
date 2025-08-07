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
import { FolderConfig } from '../models/fmdm.js';

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
}

// Factory function to create FolderLifecycleService instances
function createFolderLifecycleService(
  id: string,
  path: string,
  indexingOrchestrator: IIndexingOrchestrator,
  fileSystemService: IFileSystemService,
  storage: any,
  logger: ILoggingService
): IFolderLifecycleManager {
  return new FolderLifecycleService(id, path, indexingOrchestrator, fileSystemService, storage, logger);
}

export class MonitoredFoldersOrchestrator extends EventEmitter implements IMonitoredFoldersOrchestrator {
  private folderManagers = new Map<string, IFolderLifecycleManager>();
  private errorFolders = new Map<string, FolderConfig>(); // Track error folders separately
  private monitoringOrchestrator: any; // Will be imported dynamically when needed
  private folderValidationTimer?: NodeJS.Timeout;
  
  constructor(
    private indexingOrchestrator: IIndexingOrchestrator,
    private fmdmService: FMDMService,
    private fileSystemService: IFileSystemService,
    private logger: ILoggingService,
    private configService: any // TODO: Add proper type
  ) {
    super();
    
    // Start periodic folder validation (every 30 seconds)
    this.startFolderValidation();
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
        errorMessage: 'Folder does not exist'
      };
      
      // Store error folder and update FMDM
      this.errorFolders.set(path, errorFolderConfig);
      this.updateFMDM();
      
      const error = new Error(`Folder does not exist: ${path}`);
      this.logger.error(`Failed to add folder: ${path}`, error);
      throw error;
    }
    
    try {
      // Create SQLite storage for this folder
      const storage = new SQLiteVecStorage({
        folderPath: path,
        modelName: model,
        modelDimension: 384, // TODO: Get from model config
        logger: this.logger
      });
      
      // Use factory function to create folder lifecycle manager
      const folderManager = createFolderLifecycleService(
        `folder-${Date.now()}`, // Generate unique ID
        path,
        this.indexingOrchestrator,
        this.fileSystemService,
        storage,
        this.logger
      );
      
      // Subscribe to manager events
      this.subscribeFolderEvents(path, folderManager);
      
      // Store manager
      this.folderManagers.set(path, folderManager);
      
      // Update FMDM for initial pending state
      this.updateFMDM();
      
      // Start scanning
      await folderManager.startScanning();
      
      // Check if folder is already active and start file watching if needed
      const folderState = folderManager.getState();
      if (folderState.status === 'active') {
        this.logger.info(`[ORCHESTRATOR] Folder ${path} is already active, starting file watching immediately`);
        await this.startFileWatchingForFolder(path);
      }
      
      // Save folder to configuration for persistence across daemon restarts
      try {
        const configFolders = await this.configService.get('folders.list') || [];
        const existingFolder = configFolders.find((f: any) => f.path === path);
        
        if (!existingFolder) {
          configFolders.push({ path, model });
          await this.configService.set('folders.list', configFolders);
          this.logger.info(`[ORCHESTRATOR] Saved folder to configuration: ${path}`);
        }
      } catch (error) {
        this.logger.warn(`[ORCHESTRATOR] Failed to save folder to configuration: ${path}`, error as Error);
        // Don't fail the entire operation if config save fails
      }
      
      this.logger.info(`Added folder to monitoring: ${path}`);
    } catch (error) {
      // If folder was added to managers but failed later, make sure it has error status in FMDM
      if (this.folderManagers.has(path)) {
        const manager = this.folderManagers.get(path);
        if (manager) {
          const state = manager.getState();
          if (state.status !== 'error') {
            // Force error state update in FMDM
            const errorFolderConfig: FolderConfig = {
              path: path,
              model: model,
              status: 'error',
              progress: 0,
              errorMessage: error instanceof Error ? error.message : String(error)
            };
            
            const currentFolders = this.getCurrentFolderConfigs();
            const existingIndex = currentFolders.findIndex(f => f.path === path);
            if (existingIndex >= 0) {
              currentFolders[existingIndex] = errorFolderConfig;
            } else {
              currentFolders.push(errorFolderConfig);
            }
            this.fmdmService.updateFolders(currentFolders);
          }
        }
      }
      
      this.logger.error(`Failed to add folder: ${path}`, error as Error);
      throw error;
    }
  }
  
  async removeFolder(folderPath: string): Promise<void> {
    const manager = this.folderManagers.get(folderPath);
    if (!manager) {
      this.logger.warn(`No manager found for folder: ${folderPath}`);
      return;
    }
    
    await manager.stop();
    
    // Stop file watching if it was started
    if (this.monitoringOrchestrator) {
      try {
        await this.monitoringOrchestrator.stopFileWatching(folderPath);
        this.logger.info(`Stopped file watching for removed folder: ${folderPath}`);
      } catch (error) {
        this.logger.warn(`Failed to stop file watching for ${folderPath}`, error as Error);
      }
    }
    
    // Clean up .folder-mcp directory and its contents
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
    
    // Remove from configuration
    try {
      const configFolders = await this.configService.get('folders.list') || [];
      const updatedFolders = configFolders.filter((f: any) => f.path !== folderPath);
      if (updatedFolders.length !== configFolders.length) {
        await this.configService.set('folders.list', updatedFolders);
        this.logger.info(`[ORCHESTRATOR] Removed folder from configuration: ${folderPath}`);
      }
    } catch (error) {
      this.logger.warn(`[ORCHESTRATOR] Failed to remove folder from configuration: ${folderPath}`, error as Error);
      // Don't fail the entire operation if config removal fails
    }
    
    this.folderManagers.delete(folderPath);
    
    // Also remove from error folders if it was there
    this.errorFolders.delete(folderPath);
    
    // Update FMDM after removal
    this.updateFMDM();
    
    this.logger.info(`Removed folder from monitoring: ${folderPath}`);
  }
  
  getManager(folderPath: string): IFolderLifecycleManager | undefined {
    return this.folderManagers.get(folderPath);
  }
  
  async startAll(): Promise<void> {
    this.logger.info('Starting all configured folders...');
    
    // Get all folders from configuration via configService
    try {
      const existingFolders = await this.configService.get('folders.list') || [];
      this.logger.info(`Found ${existingFolders.length} folders in configuration to restore`);
      
      if (existingFolders.length > 0) {
        // Start lifecycle management for all existing folders
        for (const folder of existingFolders) {
          try {
            this.logger.info(`Restoring folder: ${folder.path} with model: ${folder.model}`);
            await this.addFolder(folder.path, folder.model);
          } catch (error) {
            this.logger.error(`Failed to restore folder ${folder.path}:`, error as Error);
            // Continue with other folders even if one fails
          }
        }
        this.logger.info(`Completed restoring ${existingFolders.length} folders from configuration`);
      } else {
        this.logger.info('No folders found in configuration to restore');
      }
    } catch (error) {
      this.logger.error('Error loading folders from configuration during startAll:', error as Error);
    }
  }
  
  async stopAll(): Promise<void> {
    this.logger.info(`Stopping all ${this.folderManagers.size} folder managers`);
    
    // Stop folder validation timer
    this.stopFolderValidation();
    
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
    this.errorFolders.clear();
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
    }
    
    // Update FMDM when indexing starts or folder becomes active
    this.updateFMDM();
  }
  
  /**
   * Handle index completion - start file watching when folder becomes active
   */
  private async onIndexComplete(folderPath: string, state: any): Promise<void> {
    this.logger.info(`[ORCHESTRATOR] Indexing complete for ${folderPath}, starting file watching`);
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
        includeFileTypes: ['.txt', '.md', '.pdf', '.docx', '.xlsx', '.pptx'],
        excludePatterns: ['**/node_modules/**', '**/.git/**', '**/.folder-mcp/**']
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
    await manager.startScanning();
  }
  
  /**
   * Handle folder error
   */
  private onFolderError(folderPath: string, error: Error): void {
    // Update FMDM with error state
    this.updateFMDM();
    
    // TODO: Implement error recovery strategy
  }
  
  /**
   * Get current folder configs for FMDM
   */
  private getCurrentFolderConfigs(): FolderConfig[] {
    const folders: FolderConfig[] = [];
    
    // Add folders with managers
    for (const [path, manager] of this.folderManagers) {
      const state = manager.getState();
      const folderConfig: FolderConfig = {
        path,
        model: state.model || 'unknown', 
        status: state.status,
        ...(state.errorMessage && { errorMessage: state.errorMessage })
      };
      
      // Add indexing progress (for indexing phase and completed active folders)
      if (state.status === 'indexing') {
        folderConfig.progress = state.progress?.percentage;
      } else if (state.status === 'active') {
        folderConfig.progress = 100; // Active folders are 100% complete
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
    
    // Add error folders (folders that couldn't be created)
    for (const [path, errorConfig] of this.errorFolders) {
      folders.push(errorConfig);
    }
    
    return folders;
  }

  /**
   * Update FMDM with current state of all folders
   */
  private updateFMDM(): void {
    const folders = this.getCurrentFolderConfigs();
    
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
        const configFolders = await this.configService.get('folders.list') || [];
        const existingConfig = configFolders.find((f: any) => f.path === folderPath);
        
        folderConfig = {
          path: folderPath,
          model: existingConfig?.model || 'nomic-embed-text', // Fallback to default model
          status: 'error',
          errorMessage: errorMessage
        };
      } catch (error) {
        // If we can't get the config, create a minimal one
        folderConfig = {
          path: folderPath,
          model: 'nomic-embed-text', // Default model
          status: 'error',
          errorMessage: errorMessage
        };
      }
      
      // Add to error folders tracking
      this.errorFolders.set(folderPath, folderConfig);
      
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
        const configFolders = await this.configService.get('folders.list') || [];
        const updatedFolders = configFolders.filter((f: any) => f.path !== folderPath);
        if (updatedFolders.length !== configFolders.length) {
          await this.configService.set('folders.list', updatedFolders);
          this.logger.info(`[ORCHESTRATOR] Removed folder from configuration: ${folderPath}`);
        }
      } catch (error) {
        this.logger.debug(`[ORCHESTRATOR] Folder not in configuration during cleanup: ${folderPath}`);
      }
      
      // Remove from our tracking
      this.folderManagers.delete(folderPath);
      
      // Also remove from error folders if it was there
      this.errorFolders.delete(folderPath);
      
      // Update FMDM to remove the folder
      this.updateFMDM();
      
      this.logger.info(`[ORCHESTRATOR] Successfully removed folder: ${folderPath}${reason ? ` (${reason})` : ''}`);
      
    } catch (error) {
      this.logger.error(`[ORCHESTRATOR] Error during folder cleanup for ${folderPath}:`, error instanceof Error ? error : new Error(String(error)));
    }
  }
}