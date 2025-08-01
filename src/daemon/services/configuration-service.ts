/**
 * Daemon Configuration Service
 * 
 * Wraps the ConfigurationComponent for use in the daemon.
 * Provides the interface needed by the WebSocket protocol
 * while maintaining access to the existing configuration system.
 */

import { ConfigurationComponent } from '../../config/ConfigurationComponent.js';
import { ILoggingService } from '../../di/interfaces.js';

/**
 * Configuration folder format (without runtime status)
 */
export interface ConfigFolderEntry {
  path: string;
  model: string;
}

/**
 * Configuration service interface for daemon use
 */
export interface IDaemonConfigurationService {
  /**
   * Get all configured folders
   */
  getFolders(): Promise<ConfigFolderEntry[]>;
  
  /**
   * Add a new folder configuration
   */
  addFolder(path: string, model: string): Promise<void>;
  
  /**
   * Remove a folder configuration
   */
  removeFolder(path: string): Promise<void>;
  
  /**
   * Update folder model
   */
  updateFolderModel(path: string, model: string): Promise<void>;
  
  /**
   * Check if folder is configured
   */
  hasFolder(path: string): Promise<boolean>;
  
  /**
   * Get folder configuration by path
   */
  getFolder(path: string): Promise<ConfigFolderEntry | null>;
  
  /**
   * Get available models list
   */
  getAvailableModels(): string[];
}

/**
 * Daemon Configuration Service implementation
 */
export class DaemonConfigurationService implements IDaemonConfigurationService {
  constructor(
    private configComponent: ConfigurationComponent,
    private logger: ILoggingService
  ) {
    this.logger.debug('Daemon Configuration Service initialized');
  }

  /**
   * Get all configured folders
   */
  async getFolders(): Promise<ConfigFolderEntry[]> {
    try {
      this.logger.debug(`\n=== CONFIG SERVICE DEBUG START ===`);
      this.logger.debug('Calling configComponent.getFolders()...');
      const folders = await this.configComponent.getFolders();
      this.logger.debug(`ConfigComponent returned ${folders.length} folders:`);
      folders.forEach((folder, index) => {
        this.logger.debug(`  [${index}] ${folder.path} (model: ${folder.model})`);
      });
      
      const result = folders.map(folder => ({
        path: folder.path,
        model: folder.model
      }));
      this.logger.debug(`Returning ${result.length} folders to validation service`);
      this.logger.debug(`=== CONFIG SERVICE DEBUG END ===\n`);
      return result;
    } catch (error) {
      this.logger.error('Failed to get folders from configuration', error instanceof Error ? error : new Error(String(error)));
      this.logger.debug(`=== CONFIG SERVICE DEBUG END (ERROR) ===\n`);
      return [];
    }
  }

  /**
   * Add a new folder configuration
   */
  async addFolder(path: string, model: string): Promise<void> {
    try {
      await this.configComponent.addFolder(path, model);
      this.logger.info(`Added folder: ${path} with model: ${model}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to add folder ${path}:`, error instanceof Error ? error : new Error(String(error)));
      throw new Error(`Failed to add folder: ${errorMessage}`);
    }
  }

  /**
   * Remove a folder configuration
   */
  async removeFolder(path: string): Promise<void> {
    try {
      this.logger.debug(`\n=== REMOVE FOLDER DEBUG START ===`);
      this.logger.debug(`Removing folder: ${path}`);
      
      // Get folders before removal
      const beforeFolders = await this.configComponent.getFolders();
      this.logger.debug(`Folders before removal (${beforeFolders.length}):`);
      beforeFolders.forEach((folder, index) => {
        this.logger.debug(`  [${index}] ${folder.path}`);
      });
      
      await this.configComponent.removeFolder(path);
      
      // Get folders after removal
      const afterFolders = await this.configComponent.getFolders();
      this.logger.debug(`Folders after removal (${afterFolders.length}):`);
      afterFolders.forEach((folder, index) => {
        this.logger.debug(`  [${index}] ${folder.path}`);
      });
      
      this.logger.info(`Removed folder: ${path}`);
      this.logger.debug(`=== REMOVE FOLDER DEBUG END ===\n`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to remove folder ${path}:`, error instanceof Error ? error : new Error(String(error)));
      this.logger.debug(`=== REMOVE FOLDER DEBUG END (ERROR) ===\n`);
      throw new Error(`Failed to remove folder: ${errorMessage}`);
    }
  }

  /**
   * Update folder model
   */
  async updateFolderModel(path: string, model: string): Promise<void> {
    try {
      // Check if folder exists first
      const existingFolder = await this.configComponent.getFolder(path);
      if (!existingFolder) {
        throw new Error(`Folder ${path} not found in configuration`);
      }

      // Remove and re-add with new model
      await this.configComponent.removeFolder(path);
      await this.configComponent.addFolder(path, model);
      
      this.logger.info(`Updated folder ${path} model to: ${model}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to update folder ${path} model:`, error instanceof Error ? error : new Error(String(error)));
      throw new Error(`Failed to update folder model: ${errorMessage}`);
    }
  }

  /**
   * Check if folder is configured
   */
  async hasFolder(path: string): Promise<boolean> {
    try {
      const folder = await this.configComponent.getFolder(path);
      return folder !== null;
    } catch (error) {
      this.logger.error(`Failed to check folder ${path}:`, error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Get folder configuration by path
   */
  async getFolder(path: string): Promise<ConfigFolderEntry | null> {
    try {
      const folder = await this.configComponent.getFolder(path);
      if (!folder) {
        return null;
      }

      return {
        path: folder.path,
        model: folder.model
      };
    } catch (error) {
      this.logger.error(`Failed to get folder ${path}:`, error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  /**
   * Get available models list
   */
  getAvailableModels(): string[] {
    // Return the standard list of available embedding models
    return [
      'nomic-embed-text',
      'mxbai-embed-large',
      'all-minilm',
      'bge-large',
      'bge-base',
      'sentence-transformers/all-MiniLM-L6-v2',
      'sentence-transformers/all-mpnet-base-v2'
    ];
  }

  /**
   * Initialize service (for any startup tasks)
   */
  async initialize(): Promise<void> {
    try {
      // Load configuration from disk first
      await this.configComponent.load();
      
      const folders = await this.getFolders();
      this.logger.info(`Configuration service initialized with ${folders.length} configured folders`);
      
      // Log folder details in debug mode
      if (folders.length > 0) {
        folders.forEach(folder => {
          this.logger.debug(`Configured folder: ${folder.path} (model: ${folder.model})`);
        });
      }
    } catch (error) {
      this.logger.error('Failed to initialize configuration service', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Validate configuration integrity
   */
  async validateConfiguration(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      const folders = await this.getFolders();
      
      // Check for duplicate paths
      const paths = folders.map(f => f.path);
      const duplicates = paths.filter((path, index) => paths.indexOf(path) !== index);
      if (duplicates.length > 0) {
        errors.push(`Duplicate folder paths found: ${duplicates.join(', ')}`);
      }

      // Check for invalid models
      const availableModels = this.getAvailableModels();
      folders.forEach(folder => {
        if (!availableModels.includes(folder.model)) {
          errors.push(`Invalid model '${folder.model}' for folder '${folder.path}'`);
        }
      });

      this.logger.debug(`Configuration validation completed: ${errors.length === 0 ? 'valid' : `${errors.length} errors`}`);
      
      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`Configuration validation failed: ${errorMessage}`);
      
      return {
        valid: false,
        errors
      };
    }
  }

  /**
   * Get configuration statistics
   */
  async getStats(): Promise<{
    totalFolders: number;
    modelDistribution: Record<string, number>;
    configurationSize: number;
  }> {
    try {
      const folders = await this.getFolders();
      
      // Calculate model distribution
      const modelDistribution: Record<string, number> = {};
      folders.forEach(folder => {
        modelDistribution[folder.model] = (modelDistribution[folder.model] || 0) + 1;
      });

      return {
        totalFolders: folders.length,
        modelDistribution,
        configurationSize: JSON.stringify(folders).length
      };
    } catch (error) {
      this.logger.error('Failed to get configuration stats', error instanceof Error ? error : new Error(String(error)));
      
      return {
        totalFolders: 0,
        modelDistribution: {},
        configurationSize: 0
      };
    }
  }
}

/**
 * Service token for Daemon Configuration Service
 */
export const DAEMON_CONFIGURATION_SERVICE_TOKEN = Symbol('DaemonConfigurationService');