/**
 * Monitored Folders Orchestrator
 * 
 * Singleton service that orchestrates all FolderLifecycleManager instances,
 * controlling their state transitions and updating FMDM.
 */

import { EventEmitter } from 'events';
import { FolderLifecycleManagerImpl } from '../../application/indexing/folder-lifecycle-manager-impl.js';
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

export class MonitoredFoldersOrchestrator extends EventEmitter implements IMonitoredFoldersOrchestrator {
  private folderManagers = new Map<string, IFolderLifecycleManager>();
  private monitoringOrchestrator: any; // Will be imported dynamically when needed
  
  constructor(
    private indexingOrchestrator: IIndexingOrchestrator,
    private fmdmService: FMDMService,
    private fileSystemService: IFileSystemService,
    private logger: ILoggingService,
    private configService: any // TODO: Add proper type
  ) {
    super();
  }
  
  async addFolder(path: string, model: string): Promise<void> {
    // Check if already managing this folder
    if (this.folderManagers.has(path)) {
      this.logger.warn(`Already managing folder: ${path}`);
      return;
    }
    
    try {
      // Create SQLite storage for this folder
      const storage = new SQLiteVecStorage({
        folderPath: path,
        modelName: model,
        modelDimension: 384, // TODO: Get from model config
        logger: this.logger
      });
      
      // Create folder lifecycle manager
      const folderManager = new FolderLifecycleManagerImpl(
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
      
      // Update FMDM immediately with pending state
      this.updateFMDM();
      
      // Start scanning
      await folderManager.startScanning();
      
      // Check if folder is already active and start file watching if needed
      const folderState = folderManager.getState();
      if (folderState.status === 'active') {
        this.logger.info(`[ORCHESTRATOR] Folder ${path} is already active, starting file watching immediately`);
        await this.startFileWatchingForFolder(path);
      }
      
      this.logger.info(`Added folder to monitoring: ${path}`);
    } catch (error) {
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
    
    this.folderManagers.delete(folderPath);
    
    // Update FMDM after removal
    this.updateFMDM();
    
    this.logger.info(`Removed folder from monitoring: ${folderPath}`);
  }
  
  getManager(folderPath: string): IFolderLifecycleManager | undefined {
    return this.folderManagers.get(folderPath);
  }
  
  async startAll(): Promise<void> {
    // This will be called by daemon on startup to initialize all configured folders
    // For now, just log
    this.logger.info('Starting all configured folders...');
  }
  
  async stopAll(): Promise<void> {
    this.logger.info(`Stopping all ${this.folderManagers.size} folder managers`);
    
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
    
    // Update FMDM
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
   * Update FMDM with current state of all folders
   */
  private updateFMDM(): void {
    const folders: FolderConfig[] = [];
    
    for (const [path, manager] of this.folderManagers) {
      const state = manager.getState();
      folders.push({
        path,
        model: state.model || 'unknown', // TODO: Store model in manager state
        status: state.status,
        progress: state.progress?.percentage,
        errorMessage: state.errorMessage
      } as FolderConfig);
    }
    
    // Update FMDM with all folder states
    this.fmdmService.updateFolders(folders);
  }
}