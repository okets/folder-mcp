/**
 * Domain Folder Manager Service
 * 
 * Core business logic for managing multiple folders.
 * Handles folder configuration, validation, and status tracking
 * without dependencies on infrastructure concerns.
 */

import { EventEmitter } from 'events';
import path from 'path';
import os from 'os';
import {
  IFolderManager,
  IFolderValidator,
  IFolderPathResolver,
  IFolderConfigMerger,
  FolderDomainEvents,
  FolderNotFoundError,
  FolderValidationError,
  FolderConfigurationError
} from './interfaces.js';
import {
  FolderConfig,
  ResolvedFolderConfig,
  FolderStatus,
  MultiFolderStatus,
  FoldersConfig,
  DEFAULT_FOLDERS_CONFIG,
  DEFAULT_MERGE_STRATEGY
} from '../../config/schema/folders.js';
import { IConfigurationManager } from '../../config/interfaces.js';
import { IFileSystem } from '../files/interfaces.js';

/**
 * Core folder manager implementation
 */
export class FolderManager extends EventEmitter implements IFolderManager {
  private folders: Map<string, ResolvedFolderConfig> = new Map();
  private folderStatuses: Map<string, FolderStatus> = new Map();

  constructor(
    private configManager: IConfigurationManager,
    private validator: IFolderValidator,
    private pathResolver: IFolderPathResolver,
    private configMerger: IFolderConfigMerger,
    private fileSystem: IFileSystem
  ) {
    super();
    this.setupConfigWatcher();
  }

  async getFolders(): Promise<ResolvedFolderConfig[]> {
    await this.refreshFromConfig();
    return Array.from(this.folders.values()).filter(folder => folder.enabled);
  }

  async getFolderByPath(path: string): Promise<ResolvedFolderConfig | undefined> {
    const resolvedPath = this.pathResolver.resolve(path);
    await this.refreshFromConfig();
    
    for (const folder of this.folders.values()) {
      if (this.pathResolver.isSamePath(folder.resolvedPath, resolvedPath)) {
        return folder;
      }
    }
    return undefined;
  }

  async getFolderByName(name: string): Promise<ResolvedFolderConfig | undefined> {
    await this.refreshFromConfig();
    
    for (const folder of this.folders.values()) {
      if (folder.name === name) {
        return folder;
      }
    }
    return undefined;
  }

  async validateFolder(folder: FolderConfig): Promise<void> {
    // Validate configuration structure
    await this.validator.validateConfiguration(folder);
    
    // Validate path exists and is accessible
    await this.validator.validatePath(folder.path);
    
    // Validate name is unique
    await this.validator.validateName(folder.name, folder.path);
    
    // Validate safety (not a system folder)
    await this.validator.validateSafety(folder.path);
    
    // Validate permissions
    await this.validator.validatePermissions(folder.path);
  }

  resolveFolderPath(path: string): string {
    return this.pathResolver.resolve(path);
  }

  async addFolder(folder: FolderConfig): Promise<void> {
    // Validate the folder first
    await this.validateFolder(folder);
    
    // Get current folders config
    const foldersConfig = this.configManager.get('folders') as FoldersConfig || DEFAULT_FOLDERS_CONFIG;
    
    // Add to the list
    const updatedConfig: FoldersConfig = {
      ...foldersConfig,
      list: [...(foldersConfig.list || []), folder]
    };
    
    // Update configuration
    await this.configManager.set('folders', updatedConfig);
    
    // Refresh our cache
    await this.refreshFromConfig();
    
    // Get the resolved folder for the event
    const resolvedFolder = await this.getFolderByPath(folder.path);
    if (resolvedFolder) {
      this.emit('folderAdded', resolvedFolder);
    }
  }

  async removeFolder(pathOrName: string): Promise<void> {
    const folder = await this.getFolderByPath(pathOrName) || await this.getFolderByName(pathOrName);
    if (!folder) {
      throw new FolderNotFoundError(pathOrName);
    }
    
    // Get current folders config
    const foldersConfig = this.configManager.get('folders') as FoldersConfig || DEFAULT_FOLDERS_CONFIG;
    
    // Remove from the list
    const updatedConfig: FoldersConfig = {
      ...foldersConfig,
      list: (foldersConfig.list || []).filter((f: FolderConfig) => 
        !this.pathResolver.isSamePath(this.pathResolver.resolve(f.path), folder.resolvedPath) &&
        f.name !== folder.name
      )
    };
    
    // Update configuration
    await this.configManager.set('folders', updatedConfig);
    
    // Remove from our cache
    this.folders.delete(folder.resolvedPath);
    this.folderStatuses.delete(folder.resolvedPath);
    
    this.emit('folderRemoved', folder.resolvedPath);
  }

  async updateFolder(pathOrName: string, updates: Partial<FolderConfig>): Promise<void> {
    const existingFolder = await this.getFolderByPath(pathOrName) || await this.getFolderByName(pathOrName);
    if (!existingFolder) {
      throw new FolderNotFoundError(pathOrName);
    }
    
    // Get current folders config
    const foldersConfig = this.configManager.get('folders') as FoldersConfig || DEFAULT_FOLDERS_CONFIG;
    
    // Find and update the folder in the list
    const updatedList = (foldersConfig.list || []).map((folder: FolderConfig) => {
      const folderPath = this.pathResolver.resolve(folder.path);
      if (this.pathResolver.isSamePath(folderPath, existingFolder.resolvedPath) || folder.name === existingFolder.name) {
        const updatedFolder = { ...folder, ...updates };
        
        // Validate the updated folder if path or name changed
        if (updates.path || updates.name) {
          // Note: We'll validate in the next refresh cycle rather than async here
          // to avoid complex async map operations
        }
        
        return updatedFolder;
      }
      return folder;
    });
    
    const updatedConfig: FoldersConfig = {
      ...foldersConfig,
      list: updatedList
    };
    
    // Update configuration
    await this.configManager.set('folders', updatedConfig);
    
    // Refresh our cache
    await this.refreshFromConfig();
    
    // Get the updated resolved folder for the event
    const resolvedFolder = updates.path 
      ? await this.getFolderByPath(updates.path) 
      : await this.getFolderByName(updates.name || existingFolder.name);
    
    if (resolvedFolder) {
      this.emit('folderUpdated', resolvedFolder);
    }
  }

  async getFolderStatus(pathOrName: string): Promise<FolderStatus> {
    const folder = await this.getFolderByPath(pathOrName) || await this.getFolderByName(pathOrName);
    if (!folder) {
      throw new FolderNotFoundError(pathOrName);
    }
    
    // Check if we have cached status
    let status = this.folderStatuses.get(folder.resolvedPath);
    if (!status) {
      // Create initial status
      status = await this.createFolderStatus(folder);
      this.folderStatuses.set(folder.resolvedPath, status);
    }
    
    return status;
  }

  async getAllFoldersStatus(): Promise<MultiFolderStatus> {
    const folders = await this.getFolders();
    const folderStatuses: FolderStatus[] = [];
    let totalDocuments = 0;
    let anyIndexing = false;
    let monitoring = false;
    const systemErrors: string[] = [];
    
    for (const folder of folders) {
      try {
        const status = await this.getFolderStatus(folder.name);
        folderStatuses.push(status);
        
        if (status.documentCount) {
          totalDocuments += status.documentCount;
        }
        
        if (status.indexing) {
          anyIndexing = true;
        }
        
        if (status.monitoring) {
          monitoring = true;
        }
        
        if (status.errors && status.errors.length > 0) {
          systemErrors.push(...status.errors);
        }
      } catch (error) {
        systemErrors.push(`Error getting status for folder ${folder.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    const status: MultiFolderStatus = {
      folders: folderStatuses,
      totalDocuments,
      anyIndexing,
      monitoring
    };
    
    if (systemErrors.length > 0) {
      status.systemErrors = systemErrors;
    }
    
    return status;
  }

  async refresh(): Promise<void> {
    await this.refreshFromConfig();
  }

  private async refreshFromConfig(): Promise<void> {
    const foldersConfig = this.configManager.get('folders') as FoldersConfig || DEFAULT_FOLDERS_CONFIG;
    const foldersList = foldersConfig.list || [];
    
    // Clear existing folders
    this.folders.clear();
    
    // Process each folder
    for (const folderConfig of foldersList) {
      try {
        // Resolve the folder with defaults
        const resolvedFolder = this.configMerger.mergeWithDefaults(folderConfig, foldersConfig.defaults);
        
        // Store by resolved path
        this.folders.set(resolvedFolder.resolvedPath, resolvedFolder);
        
        // Validate folder accessibility and update status
        try {
          await this.validateFolder(folderConfig);
          await this.updateFolderStatus(resolvedFolder, true);
        } catch (error) {
          await this.updateFolderStatus(resolvedFolder, false, error instanceof Error ? error.message : String(error));
          this.emit('folderValidationFailed', resolvedFolder.resolvedPath, error instanceof Error ? error : new Error(String(error)));
        }
      } catch (error) {
        // Log configuration error but continue with other folders
        console.error(`Error processing folder configuration for ${folderConfig.path}:`, error);
      }
    }
  }

  private async createFolderStatus(folder: ResolvedFolderConfig): Promise<FolderStatus> {
    let accessible = false;
    const errors: string[] = [];
    
    try {
      await this.validator.validatePath(folder.path);
      await this.validator.validatePermissions(folder.path);
      accessible = true;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
    
    const status: FolderStatus = {
      config: folder,
      accessible,
      indexing: false, // Will be updated by indexing workflow
      monitoring: false // Will be updated by monitoring workflow
    };
    
    if (errors.length > 0) {
      status.errors = errors;
    }
    
    return status;
  }

  private async updateFolderStatus(folder: ResolvedFolderConfig, accessible: boolean, error?: string): Promise<void> {
    const currentStatus = this.folderStatuses.get(folder.resolvedPath);
    
    const updatedStatus: FolderStatus = {
      config: folder,
      accessible,
      indexing: currentStatus?.indexing || false,
      monitoring: currentStatus?.monitoring || false
    };
    
    if (currentStatus?.documentCount !== undefined) {
      updatedStatus.documentCount = currentStatus.documentCount;
    }
    
    if (error) {
      updatedStatus.errors = [error];
    }
    
    this.folderStatuses.set(folder.resolvedPath, updatedStatus);
    
    if (currentStatus?.accessible !== accessible) {
      this.emit('folderAccessibilityChanged', folder.resolvedPath, accessible);
    }
  }

  private setupConfigWatcher(): void {
    // Listen for configuration changes that affect folders
    this.configManager.on('configChanged', async (event: any) => {
      if (event.changedPaths.some((path: string) => path.startsWith('folders'))) {
        await this.refreshFromConfig();
      }
    });
  }
}

/**
 * Folder validator implementation
 */
export class FolderValidator implements IFolderValidator {
  constructor(
    private fileSystem: IFileSystem,
    private pathResolver: IFolderPathResolver,
    private configManager: IConfigurationManager
  ) {}

  async validatePath(folderPath: string): Promise<void> {
    const resolvedPath = this.pathResolver.resolve(folderPath);
    
    try {
      const stats = await this.fileSystem.stat(resolvedPath);
      if (!stats.isDirectory()) {
        throw new FolderValidationError(`Path is not a directory: ${resolvedPath}`, resolvedPath);
      }
    } catch (error) {
      if (error instanceof FolderValidationError) {
        throw error;
      }
      throw new FolderValidationError(`Path does not exist or is not accessible: ${resolvedPath}`, resolvedPath);
    }
  }

  async validateName(name: string, excludePath?: string): Promise<void> {
    // Check name format
    const namePattern = /^[a-zA-Z0-9\s\-_\.]+$/;
    if (!namePattern.test(name)) {
      throw new FolderValidationError(`Folder name contains invalid characters. Use only letters, numbers, spaces, hyphens, underscores, and dots: ${name}`);
    }
    
    if (name.length > 50) {
      throw new FolderValidationError(`Folder name too long (max 50 characters): ${name}`);
    }
    
    // Check uniqueness
    const foldersConfig = this.configManager.get('folders') as FoldersConfig || DEFAULT_FOLDERS_CONFIG;
    const existingFolders = foldersConfig.list || [];
    
    for (const folder of existingFolders) {
      if (folder.name === name) {
        // If excludePath is provided, skip validation for that path
        if (excludePath && this.pathResolver.isSamePath(
          this.pathResolver.resolve(folder.path), 
          this.pathResolver.resolve(excludePath)
        )) {
          continue;
        }
        throw new FolderValidationError(`Folder name already exists: ${name}`);
      }
    }
  }

  async validateConfiguration(folder: FolderConfig): Promise<void> {
    // Required fields
    if (!folder.path) {
      throw new FolderValidationError('Folder path is required');
    }
    
    if (!folder.name) {
      throw new FolderValidationError('Folder name is required');
    }
    
    // Validate embedding backend if specified
    if (folder.embeddings?.backend && !['ollama', 'direct', 'auto'].includes(folder.embeddings.backend)) {
      throw new FolderValidationError(`Invalid embedding backend: ${folder.embeddings.backend}`);
    }
    
    // Validate performance settings
    if (folder.performance?.batchSize && (folder.performance.batchSize < 1 || folder.performance.batchSize > 128)) {
      throw new FolderValidationError('Batch size must be between 1 and 128');
    }
    
    if (folder.performance?.maxConcurrency && (folder.performance.maxConcurrency < 1 || folder.performance.maxConcurrency > 16)) {
      throw new FolderValidationError('Max concurrency must be between 1 and 16');
    }
  }

  async validateSafety(folderPath: string): Promise<void> {
    const resolvedPath = this.pathResolver.resolve(folderPath);
    const normalizedPath = this.pathResolver.normalize(resolvedPath);
    
    // List of forbidden paths
    const forbiddenPaths = [
      '/',
      '/etc',
      '/usr',
      '/var',
      '/sys',
      '/proc',
      '/dev',
      'C:\\',
      'C:\\Windows',
      'C:\\Program Files',
      'C:\\Program Files (x86)'
    ];
    
    for (const forbidden of forbiddenPaths) {
      const normalizedForbidden = this.pathResolver.normalize(forbidden);
      if (normalizedPath === normalizedForbidden || normalizedPath.startsWith(normalizedForbidden + path.sep)) {
        throw new FolderValidationError(`Cannot index system directory: ${resolvedPath}`, resolvedPath);
      }
    }
  }

  async validatePermissions(folderPath: string): Promise<void> {
    const resolvedPath = this.pathResolver.resolve(folderPath);
    
    try {
      // Try to read the directory to check permissions
      await this.fileSystem.readDir(resolvedPath);
    } catch (error) {
      throw new FolderValidationError(`Insufficient permissions to read directory: ${resolvedPath}`, resolvedPath);
    }
  }
}

/**
 * Folder path resolver implementation
 */
export class FolderPathResolver implements IFolderPathResolver {
  expandHome(folderPath: string): string {
    if (folderPath.startsWith('~')) {
      return folderPath.replace('~', os.homedir());
    }
    return folderPath;
  }

  normalize(folderPath: string): string {
    return path.normalize(folderPath);
  }

  toAbsolute(folderPath: string): string {
    return path.resolve(folderPath);
  }

  resolve(folderPath: string): string {
    // Full resolution: expand home, normalize, make absolute
    const expanded = this.expandHome(folderPath);
    const normalized = this.normalize(expanded);
    return this.toAbsolute(normalized);
  }

  isSamePath(path1: string, path2: string): boolean {
    const resolved1 = this.resolve(path1);
    const resolved2 = this.resolve(path2);
    
    // Normalize case for Windows
    if (process.platform === 'win32') {
      return resolved1.toLowerCase() === resolved2.toLowerCase();
    }
    
    return resolved1 === resolved2;
  }

  relative(from: string, to: string): string {
    const resolvedFrom = this.resolve(from);
    const resolvedTo = this.resolve(to);
    return path.relative(resolvedFrom, resolvedTo);
  }
}

/**
 * Folder configuration merger implementation
 */
export class FolderConfigMerger implements IFolderConfigMerger {
  constructor(private pathResolver: IFolderPathResolver) {}

  mergeWithDefaults(folder: FolderConfig, defaults?: any): ResolvedFolderConfig {
    const mergedDefaults = defaults || DEFAULT_FOLDERS_CONFIG.defaults || {};
    
    // Resolve the path
    const resolvedPath = this.pathResolver.resolve(folder.path);
    
    // Merge exclude patterns
    const excludes = this.mergeExcludes(
      folder.exclude,
      mergedDefaults.exclude,
      DEFAULT_MERGE_STRATEGY.excludeMode
    );
    
    // Merge embeddings settings
    const embeddings = this.mergeEmbeddings(folder.embeddings, mergedDefaults.embeddings);
    
    // Merge performance settings
    const performance = this.mergePerformance(folder.performance, mergedDefaults.performance);
    
    return {
      path: folder.path,
      name: folder.name,
      enabled: folder.enabled !== undefined ? folder.enabled : true,
      embeddings,
      exclude: excludes,
      performance,
      resolvedPath,
      sources: {
        path: 'config',
        name: 'config',
        enabled: folder.enabled !== undefined ? 'config' : 'default',
        embeddings: folder.embeddings ? (mergedDefaults.embeddings ? 'merged' : 'config') : 'default',
        exclude: folder.exclude ? (mergedDefaults.exclude ? 'merged' : 'config') : 'default',
        performance: folder.performance ? (mergedDefaults.performance ? 'merged' : 'config') : 'default'
      }
    };
  }

  mergeAllWithDefaults(folders: FolderConfig[], defaults?: any): ResolvedFolderConfig[] {
    return folders.map(folder => this.mergeWithDefaults(folder, defaults));
  }

  mergeExcludes(folderExcludes?: string[], defaultExcludes?: string[], mode = 'append'): string[] {
    const defaults = defaultExcludes || [];
    const folderSpecific = folderExcludes || [];
    
    switch (mode) {
      case 'replace':
        return folderSpecific.length > 0 ? folderSpecific : defaults;
      case 'append':
        return [...defaults, ...folderSpecific];
      case 'merge':
        // Remove duplicates
        const combined = [...defaults, ...folderSpecific];
        return Array.from(new Set(combined));
      default:
        return [...defaults, ...folderSpecific];
    }
  }

  mergePerformance(folderPerf?: any, defaultPerf?: any): any {
    return {
      batchSize: folderPerf?.batchSize || defaultPerf?.batchSize || 32,
      maxConcurrency: folderPerf?.maxConcurrency || defaultPerf?.maxConcurrency || 4
    };
  }

  mergeEmbeddings(folderEmb?: any, defaultEmb?: any): any {
    return {
      backend: folderEmb?.backend || defaultEmb?.backend || 'auto',
      model: folderEmb?.model || defaultEmb?.model
    };
  }
}