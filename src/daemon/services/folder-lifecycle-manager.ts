/**
 * Folder Lifecycle Manager Service
 * 
 * Manages FolderLifecycleOrchestrator instances for each configured folder
 * in the daemon, coordinating indexing and monitoring activities.
 */

import { FolderLifecycleOrchestratorImpl } from '../../application/indexing/folder-lifecycle-orchestrator-impl.js';
import { FolderLifecycleOrchestrator } from '../../domain/folders/folder-lifecycle-orchestrator.js';
import { IIndexingOrchestrator, IFileSystemService, ILoggingService } from '../../di/interfaces.js';
import { FMDMService } from './fmdm-service.js';
import { SQLiteVecStorage } from '../../infrastructure/embeddings/sqlite-vec/sqlite-vec-storage.js';
import { FolderConfig } from '../models/fmdm.js';

export interface IFolderLifecycleManager {
  /**
   * Start managing a folder
   */
  startFolder(folder: FolderConfig): Promise<void>;
  
  /**
   * Stop managing a folder
   */
  stopFolder(folderPath: string): Promise<void>;
  
  /**
   * Get orchestrator for a folder
   */
  getOrchestrator(folderPath: string): FolderLifecycleOrchestrator | undefined;
  
  /**
   * Stop all orchestrators
   */
  stopAll(): Promise<void>;
}

export class FolderLifecycleManager implements IFolderLifecycleManager {
  private orchestrators = new Map<string, FolderLifecycleOrchestrator>();
  
  constructor(
    private indexingOrchestrator: IIndexingOrchestrator,
    private fmdmService: FMDMService,
    private fileSystemService: IFileSystemService,
    private logger: ILoggingService
  ) {}
  
  async startFolder(folder: FolderConfig): Promise<void> {
    // Check if already managing this folder
    if (this.orchestrators.has(folder.path)) {
      this.logger.warn(`Already managing folder: ${folder.path}`);
      return;
    }
    
    try {
      // Create SQLite storage for this folder
      const storage = new SQLiteVecStorage({
        folderPath: folder.path,
        modelName: folder.model,
        modelDimension: 384, // TODO: Get from model config
        logger: this.logger
      });
      
      // Create orchestrator
      const orchestrator = new FolderLifecycleOrchestratorImpl(
        `folder-${Date.now()}`, // Generate unique ID
        folder.path,
        this.indexingOrchestrator,
        this.fmdmService,
        this.fileSystemService,
        storage
      );
      
      // Subscribe to state changes
      orchestrator.onStateChange((state) => {
        this.logger.debug(`Folder ${folder.path} state changed to: ${state.status}`);
      });
      
      // Subscribe to progress updates
      orchestrator.onProgressUpdate((progress) => {
        this.logger.debug(`Folder ${folder.path} progress: ${progress.percentage}%`);
      });
      
      // Store orchestrator
      this.orchestrators.set(folder.path, orchestrator);
      
      // Start scanning
      await orchestrator.startScanning();
      
      // Start processing tasks
      this.processOrchestrator(orchestrator);
      
      this.logger.info(`Started lifecycle management for folder: ${folder.path}`);
    } catch (error) {
      this.logger.error(`Failed to start folder lifecycle management: ${folder.path}`, error as Error);
      throw error;
    }
  }
  
  async stopFolder(folderPath: string): Promise<void> {
    const orchestrator = this.orchestrators.get(folderPath);
    if (!orchestrator) {
      this.logger.warn(`No orchestrator found for folder: ${folderPath}`);
      return;
    }
    
    orchestrator.dispose();
    this.orchestrators.delete(folderPath);
    
    this.logger.info(`Stopped lifecycle management for folder: ${folderPath}`);
  }
  
  getOrchestrator(folderPath: string): FolderLifecycleOrchestrator | undefined {
    return this.orchestrators.get(folderPath);
  }
  
  async stopAll(): Promise<void> {
    this.logger.info(`Stopping all ${this.orchestrators.size} folder orchestrators`);
    
    for (const [path, orchestrator] of this.orchestrators) {
      try {
        orchestrator.dispose();
      } catch (error) {
        this.logger.error(`Error disposing orchestrator for ${path}`, error as Error);
      }
    }
    
    this.orchestrators.clear();
  }
  
  /**
   * Process tasks for an orchestrator
   */
  private async processOrchestrator(orchestrator: FolderLifecycleOrchestrator): Promise<void> {
    // Process tasks in a loop
    const processLoop = async () => {
      while (orchestrator.isActive()) {
        const taskId = orchestrator.getNextTask();
        if (taskId) {
          orchestrator.startTask(taskId);
        }
        
        // Wait a bit before checking for next task
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    };
    
    // Start processing in background
    processLoop().catch(error => {
      this.logger.error('Error in orchestrator processing loop', error as Error);
    });
  }
}