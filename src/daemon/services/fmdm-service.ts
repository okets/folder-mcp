/**
 * FMDM Service Implementation
 * 
 * Manages the FMDM (Folder MCP Data Model) as the single source of truth
 * for all connected clients. Handles state management, broadcasting, and
 * client connection tracking.
 */

import { FMDM, FolderConfig, FolderIndexingStatus, DaemonStatus, ConnectionInfo, ClientConnection, CuratedModelInfo, ModelCheckStatus } from '../models/fmdm.js';
import { ILoggingService } from '../../di/interfaces.js';

/**
 * FMDM Service interface for dependency injection
 */
export interface IFMDMService {
  /**
   * Get current FMDM state
   */
  getFMDM(): FMDM;
  
  /**
   * Update folders and broadcast changes
   */
  updateFolders(folders: FolderConfig[]): void;
  
  /**
   * Add a client connection
   */
  addClient(client: ClientConnection): void;
  
  /**
   * Remove a client connection
   */
  removeClient(clientId: string): void;
  
  /**
   * Subscribe to FMDM changes
   */
  subscribe(listener: (fmdm: FMDM) => void): () => void;
  
  /**
   * Update daemon status information
   */
  updateDaemonStatus(status: Partial<DaemonStatus>): void;
  
  /**
   * Set available models list
   */
  setAvailableModels(models: string[]): void;

  /**
   * Set curated model information with status
   */
  setCuratedModelInfo(models: CuratedModelInfo[], status: ModelCheckStatus): void;
  
  /**
   * Update notification for a specific folder
   */
  updateFolderNotification(folderPath: string, notification: { message: string; type: 'error' | 'warning' | 'info' } | null): void;
  
  /**
   * Get connection count
   */
  getConnectionCount(): number;
  
  /**
   * Update status for a specific folder
   */
  updateFolderStatus(folderPath: string, status: FolderIndexingStatus, notification?: { message: string; type: 'error' | 'warning' | 'info' } | null): void;
  
  /**
   * Update progress for a specific folder
   */
  updateFolderProgress(folderPath: string, progressPercentage: number): void;
  
  /**
   * Get all folders using a specific model
   */
  getFoldersUsingModel(modelId: string): string[];
  
  /**
   * Update model download status for all folders using a model
   */
  updateModelDownloadStatus(modelId: string, status: 'downloading' | 'completed' | 'failed', progressPercentage?: number): void;
}

/**
 * Configuration service interface (minimal for FMDM needs)
 */
export interface IFMDMConfigurationService {
  getFolders(): Promise<Array<{ path: string; model: string }>>;
}

/**
 * FMDM Service implementation
 */
export class FMDMService implements IFMDMService {
  private fmdm: FMDM;
  private listeners: Set<(fmdm: FMDM) => void> = new Set();
  
  constructor(
    private configService: IFMDMConfigurationService,
    private logger: ILoggingService
  ) {
    // Initialize with default FMDM
    this.fmdm = this.buildInitialFMDM();
    this.logger.debug('FMDM Service initialized');
  }
  
  /**
   * Build initial FMDM state
   */
  private buildInitialFMDM(): FMDM {
    return {
      version: this.generateVersion(),
      folders: [],
      daemon: {
        pid: process.pid,
        uptime: Math.floor(process.uptime())
      },
      connections: {
        count: 0,
        clients: []
      },
      models: this.getDefaultModels(),
      curatedModels: [] // Will be populated during daemon startup
      // modelCheckStatus omitted initially - will be set when models are checked
    };
  }
  
  /**
   * Generate FMDM version string
   */
  private generateVersion(): string {
    const timestamp = new Date().toISOString();
    return `v${Date.now()}-${timestamp}`;
  }
  
  /**
   * Get default available models
   */
  private getDefaultModels(): string[] {
    return [
      'nomic-embed-text',
      'mxbai-embed-large',
      'all-minilm',
      'bge-large',
      'bge-base'
    ];
  }
  
  /**
   * Load folders from configuration service
   */
  async loadFoldersFromConfig(): Promise<void> {
    try {
      const configFolders = await this.configService.getFolders();
      
      // Convert config folders to FMDM format with default status
      const fmdmFolders: FolderConfig[] = configFolders.map(folder => ({
        path: folder.path,
        model: folder.model,
        status: 'pending' as const  // Default status for loaded folders
      }));
      
      this.updateFolders(fmdmFolders);
      this.logger.debug(`Loaded ${fmdmFolders.length} folders from configuration`);
    } catch (error) {
      this.logger.error('Failed to load folders from configuration', error instanceof Error ? error : new Error(String(error)));
      // Keep existing folders if config load fails
    }
  }
  
  /**
   * Get current FMDM state
   */
  getFMDM(): FMDM {
    // Update uptime before returning
    this.fmdm.daemon.uptime = Math.floor(process.uptime());
    return { ...this.fmdm }; // Return a copy to prevent external mutations
  }
  
  /**
   * Update folders and broadcast changes
   */
  updateFolders(folders: FolderConfig[]): void {
    // Preserve existing notifications when updating folders
    const existingNotifications = new Map<string, { message: string; type: 'error' | 'warning' | 'info' }>();
    
    // Save existing notifications before replacing folders
    for (const folder of this.fmdm.folders) {
      if (folder.notification) {
        existingNotifications.set(folder.path, folder.notification);
      }
    }
    
    // Update folders array
    this.fmdm.folders = [...folders]; // Create a copy
    
    // Restore notifications for folders that still exist
    for (const folder of this.fmdm.folders) {
      const existingNotification = existingNotifications.get(folder.path);
      if (existingNotification) {
        folder.notification = existingNotification;
      }
    }
    
    this.fmdm.version = this.generateVersion();
    this.logger.debug(`FMDM folders updated: ${folders.length} folders`);
    this.broadcast();
  }
  
  /**
   * Add a client connection
   */
  addClient(client: ClientConnection): void {
    // Remove existing client with same ID if it exists
    this.removeClient(client.id);
    
    // Add new client
    this.fmdm.connections.clients.push({ ...client });
    this.fmdm.connections.count = this.fmdm.connections.clients.length;
    this.fmdm.version = this.generateVersion();
    
    this.logger.info(`Client connected: ${client.type}/${client.id}`);
    this.broadcast();
  }
  
  /**
   * Remove a client connection
   */
  removeClient(clientId: string): void {
    const initialCount = this.fmdm.connections.clients.length;
    this.fmdm.connections.clients = this.fmdm.connections.clients.filter(
      client => client.id !== clientId
    );
    
    if (this.fmdm.connections.clients.length !== initialCount) {
      this.fmdm.connections.count = this.fmdm.connections.clients.length;
      this.fmdm.version = this.generateVersion();
      
      this.logger.info(`Client disconnected: ${clientId}`);
      this.broadcast();
    }
  }
  
  /**
   * Subscribe to FMDM changes
   */
  subscribe(listener: (fmdm: FMDM) => void): () => void {
    this.listeners.add(listener);
    this.logger.debug('New FMDM listener subscribed');
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
      this.logger.debug('FMDM listener unsubscribed');
    };
  }
  
  /**
   * Update daemon status information
   */
  updateDaemonStatus(status: Partial<DaemonStatus>): void {
    this.fmdm.daemon = {
      ...this.fmdm.daemon,
      ...status,
      uptime: Math.floor(process.uptime()) // Always update uptime
    };
    this.fmdm.version = this.generateVersion();
    
    this.logger.debug('FMDM daemon status updated');
    this.broadcast();
  }
  
  /**
   * Set available models list
   */
  setAvailableModels(models: string[]): void {
    this.fmdm.models = [...models];
    this.fmdm.version = this.generateVersion();
    
    this.logger.debug(`FMDM models updated: ${models.length} models available`);
    this.broadcast();
  }

  setCuratedModelInfo(models: CuratedModelInfo[], status: ModelCheckStatus): void {
    this.fmdm.curatedModels = [...models];
    this.fmdm.modelCheckStatus = status;
    this.fmdm.version = this.generateVersion();
    
    const installedCount = models.filter(m => m.installed).length;
    this.logger.debug(`FMDM curated models updated: ${installedCount}/${models.length} models installed`);
    this.broadcast();
  }
  
  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.fmdm.connections.count;
  }
  
  /**
   * Update status for a specific folder
   */
  updateFolderStatus(folderPath: string, status: FolderIndexingStatus, notification?: { message: string; type: 'error' | 'warning' | 'info' } | null): void {
    const folderIndex = this.fmdm.folders.findIndex(folder => folder.path === folderPath);
    
    if (folderIndex === -1) {
      this.logger.warn(`Attempted to update status for unknown folder: ${folderPath}`);
      return;
    }
    
    // Update the folder status
    const folder = this.fmdm.folders[folderIndex];
    if (!folder) {
      this.logger.error(`Folder at index ${folderIndex} is unexpectedly undefined`);
      return;
    }
    
    const updatedFolder: FolderConfig = {
      path: folder.path,
      model: folder.model,
      status: status
    };
    
    // Add notification if provided, or preserve existing notification
    if (notification) {
      updatedFolder.notification = notification;
    } else if (folder.notification) {
      // Preserve existing notification when none is explicitly provided
      updatedFolder.notification = folder.notification;
    }
    
    // Preserve other fields like progress
    if (folder.progress !== undefined) {
      updatedFolder.progress = folder.progress;
    }
    if (folder.scanningProgress !== undefined) {
      updatedFolder.scanningProgress = folder.scanningProgress;
    }
    
    this.fmdm.folders[folderIndex] = updatedFolder;
    
    // Update version and broadcast changes
    this.fmdm.version = this.generateVersion();
    this.logger.debug(`Updated folder status: ${folderPath} -> ${status}${notification ? ` (${notification.message})` : ''}`);
    this.broadcast();
  }
  
  /**
   * Update progress for a specific folder
   */
  updateFolderProgress(folderPath: string, progressPercentage: number): void {
    const folderIndex = this.fmdm.folders.findIndex(folder => folder.path === folderPath);
    
    if (folderIndex === -1) {
      this.logger.warn(`Attempted to update progress for unknown folder: ${folderPath}`);
      return;
    }
    
    // Update the folder progress
    const folder = this.fmdm.folders[folderIndex];
    if (!folder) {
      this.logger.error(`Folder at index ${folderIndex} is unexpectedly undefined`);
      return;
    }
    
    // Store progress in folder metadata (could be extended later)
    this.fmdm.folders[folderIndex] = {
      ...folder,
      progress: progressPercentage
    };
    
    // Update version and broadcast changes
    this.fmdm.version = this.generateVersion();
    this.logger.debug(`Updated folder progress: ${folderPath} -> ${progressPercentage}%`);
    this.broadcast();
  }
  
  /**
   * Broadcast FMDM updates to all listeners
   */
  private broadcast(): void {
    if (this.listeners.size === 0) {
      return;
    }
    
    const fmdmCopy = this.getFMDM(); // Get fresh copy with updated uptime
    
    this.logger.debug(`Broadcasting FMDM update to ${this.listeners.size} listeners`);
    
    this.listeners.forEach(listener => {
      try {
        listener(fmdmCopy);
      } catch (error) {
        this.logger.error('Error in FMDM listener', error instanceof Error ? error : new Error(String(error)));
        // Don't remove the listener here - let the listener handle its own errors
      }
    });
  }
  
  /**
   * Force refresh FMDM from configuration
   */
  async refresh(): Promise<void> {
    this.logger.debug('Refreshing FMDM from configuration');
    await this.loadFoldersFromConfig();
  }
  
  /**
   * Update notification for a specific folder
   */
  updateFolderNotification(folderPath: string, notification: { message: string; type: 'error' | 'warning' | 'info' } | null): void {
    const folderIndex = this.fmdm.folders.findIndex(folder => folder.path === folderPath);
    
    if (folderIndex === -1) {
      this.logger.warn(`Attempted to update notification for unknown folder: ${folderPath}`);
      return;
    }
    
    // Update the folder notification
    const folder = this.fmdm.folders[folderIndex];
    if (!folder) {
      this.logger.error(`Folder at index ${folderIndex} is unexpectedly undefined`);
      return;
    }
    
    // Update folder with notification (remove notification field if null)
    const updatedFolder = { ...folder };
    if (notification) {
      updatedFolder.notification = notification;
    } else {
      // Remove notification field if setting to null
      delete updatedFolder.notification;
    }
    this.fmdm.folders[folderIndex] = updatedFolder;
    
    // Update version and broadcast changes
    this.fmdm.version = this.generateVersion();
    this.logger.debug(`Updated folder notification: ${folderPath}`, { notification });
    this.broadcast();
  }
  
  /**
   * Get all folders using a specific model
   */
  getFoldersUsingModel(modelId: string): string[] {
    return this.fmdm.folders
      .filter(folder => folder.model === modelId)
      .map(folder => folder.path);
  }
  
  /**
   * Update model download status for all folders using a model
   */
  updateModelDownloadStatus(modelId: string, status: 'downloading' | 'completed' | 'failed', progressPercentage?: number): void {
    const affectedFolders = this.getFoldersUsingModel(modelId);
    
    if (affectedFolders.length === 0) {
      this.logger.debug(`No folders using model ${modelId} for status update`);
      return;
    }
    
    let folderStatus: FolderIndexingStatus;
    let notification: { message: string; type: 'error' | 'warning' | 'info' } | null = null;
    
    switch (status) {
      case 'downloading':
        folderStatus = 'downloading-model';
        notification = {
          message: `Downloading model ${modelId}${progressPercentage ? ` (${progressPercentage}%)` : ''}`,
          type: 'info'
        };
        break;
      case 'completed':
        folderStatus = 'pending'; // Ready to start indexing
        notification = {
          message: `Model ${modelId} downloaded successfully`,
          type: 'info'
        };
        break;
      case 'failed':
        folderStatus = 'error';
        notification = {
          message: `Failed to download model ${modelId}`,
          type: 'error'
        };
        break;
    }
    
    // Update all affected folders
    let updated = false;
    for (const folderPath of affectedFolders) {
      const folderIndex = this.fmdm.folders.findIndex(folder => folder.path === folderPath);
      if (folderIndex !== -1) {
        const folder = this.fmdm.folders[folderIndex];
        if (folder) {
          const updatedFolder: any = {
            ...folder,
            status: folderStatus,
            notification
          };
          
          // Set download progress for model downloads
          if (status === 'downloading' && progressPercentage !== undefined) {
            updatedFolder.downloadProgress = progressPercentage;
          } else if (status === 'completed' || status === 'failed') {
            // Clear download progress when done
            delete updatedFolder.downloadProgress;
          }
          
          // Preserve existing progress if it exists
          if (folder.progress !== undefined) {
            updatedFolder.progress = folder.progress;
          }
          
          this.fmdm.folders[folderIndex] = updatedFolder;
          updated = true;
        }
      }
    }
    
    if (updated) {
      this.fmdm.version = this.generateVersion();
      this.logger.debug(`Updated model download status for ${affectedFolders.length} folders using ${modelId}: ${status}`);
      this.broadcast();
    }
  }
  
  /**
   * Get summary statistics
   */
  getStats(): {
    version: string;
    folderCount: number;
    connectionCount: number;
    listenerCount: number;
    uptime: number;
  } {
    return {
      version: this.fmdm.version,
      folderCount: this.fmdm.folders.length,
      connectionCount: this.fmdm.connections.count,
      listenerCount: this.listeners.size,
      uptime: this.fmdm.daemon.uptime
    };
  }
}

/**
 * Service token for FMDM Service
 */
export const FMDM_SERVICE_TOKEN = Symbol('FMDMService');