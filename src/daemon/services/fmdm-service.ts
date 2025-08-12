/**
 * FMDM Service Implementation
 * 
 * Manages the FMDM (Folder MCP Data Model) as the single source of truth
 * for all connected clients. Handles state management, broadcasting, and
 * client connection tracking.
 */

import { FMDM, FolderConfig, FolderIndexingStatus, DaemonStatus, ConnectionInfo, ClientConnection } from '../models/fmdm.js';
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
      models: this.getDefaultModels()
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
    this.fmdm.folders = [...folders]; // Create a copy
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
    
    // Add notification if provided
    if (notification) {
      updatedFolder.notification = notification;
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