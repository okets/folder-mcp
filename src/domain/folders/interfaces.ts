/**
 * Folder Management Domain Interfaces
 * 
 * These interfaces define the contract for multi-folder operations
 * without depending on specific implementations. Following the
 * clean architecture pattern established in the codebase.
 */

import { FolderConfig, ResolvedFolderConfig, FolderStatus, MultiFolderStatus } from '../../config/schema/folders.js';

/**
 * Core folder manager interface
 * Handles folder configuration, validation, and management
 */
export interface IFolderManager {
  /**
   * Get all configured folders
   * @returns Array of resolved folder configurations
   */
  getFolders(): Promise<ResolvedFolderConfig[]>;

  /**
   * Get folder configuration by path
   * @param path Folder path to search for
   * @returns Folder configuration or undefined if not found
   */
  getFolderByPath(path: string): Promise<ResolvedFolderConfig | undefined>;

  /**
   * Get folder configuration by name
   * @param name Folder name to search for
   * @returns Folder configuration or undefined if not found
   */
  getFolderByName(name: string): Promise<ResolvedFolderConfig | undefined>;

  /**
   * Validate a folder configuration
   * @param folder Folder configuration to validate
   * @throws Error if validation fails
   */
  validateFolder(folder: FolderConfig): Promise<void>;

  /**
   * Resolve folder path (expand ~, normalize, make absolute)
   * @param path Path to resolve
   * @returns Resolved absolute path
   */
  resolveFolderPath(path: string): string;

  /**
   * Add a new folder to the configuration
   * @param folder Folder configuration to add
   */
  addFolder(folder: FolderConfig): Promise<void>;

  /**
   * Remove a folder from the configuration
   * @param pathOrName Folder path or name to remove
   */
  removeFolder(pathOrName: string): Promise<void>;

  /**
   * Update folder configuration
   * @param pathOrName Folder path or name to update
   * @param updates Partial folder configuration updates
   */
  updateFolder(pathOrName: string, updates: Partial<FolderConfig>): Promise<void>;

  /**
   * Get folder status (accessibility, indexing state, etc.)
   * @param pathOrName Folder path or name
   * @returns Folder status information
   */
  getFolderStatus(pathOrName: string): Promise<FolderStatus>;

  /**
   * Get status of all folders
   * @returns Multi-folder system status
   */
  getAllFoldersStatus(): Promise<MultiFolderStatus>;

  /**
   * Refresh folder configurations from config system
   */
  refresh(): Promise<void>;
}

/**
 * Folder validation service interface
 * Handles folder-specific validation logic
 */
export interface IFolderValidator {
  /**
   * Validate folder path exists and is accessible
   * @param path Folder path to validate
   * @throws Error if path is invalid or inaccessible
   */
  validatePath(path: string): Promise<void>;

  /**
   * Validate folder name is unique and valid
   * @param name Folder name to validate
   * @param excludePath Optional path to exclude from uniqueness check
   * @throws Error if name is invalid or not unique
   */
  validateName(name: string, excludePath?: string): Promise<void>;

  /**
   * Validate folder configuration against schema
   * @param folder Folder configuration to validate
   * @throws Error if configuration is invalid
   */
  validateConfiguration(folder: FolderConfig): Promise<void>;

  /**
   * Check if folder is safe to index (not a system folder)
   * @param path Folder path to check
   * @throws Error if folder is unsafe to index
   */
  validateSafety(path: string): Promise<void>;

  /**
   * Validate folder permissions for reading/indexing
   * @param path Folder path to check
   * @throws Error if permissions are insufficient
   */
  validatePermissions(path: string): Promise<void>;
}

/**
 * Folder path resolution service interface
 * Handles cross-platform path operations
 */
export interface IFolderPathResolver {
  /**
   * Expand home directory (~) in path
   * @param path Path that may contain ~
   * @returns Path with ~ expanded
   */
  expandHome(path: string): string;

  /**
   * Normalize path for current platform
   * @param path Path to normalize
   * @returns Normalized path
   */
  normalize(path: string): string;

  /**
   * Convert path to absolute
   * @param path Path to make absolute
   * @returns Absolute path
   */
  toAbsolute(path: string): string;

  /**
   * Resolve path completely (expand, normalize, absolute)
   * @param path Path to resolve
   * @returns Fully resolved path
   */
  resolve(path: string): string;

  /**
   * Check if two paths refer to the same location
   * @param path1 First path
   * @param path2 Second path
   * @returns True if paths refer to same location
   */
  isSamePath(path1: string, path2: string): boolean;

  /**
   * Get relative path from base to target
   * @param from Base path
   * @param to Target path
   * @returns Relative path
   */
  relative(from: string, to: string): string;
}

/**
 * Folder configuration merge service interface
 * Handles merging folder configs with defaults
 */
export interface IFolderConfigMerger {
  /**
   * Merge folder configuration with defaults
   * @param folder Folder configuration
   * @param defaults Default configuration
   * @returns Merged folder configuration
   */
  mergeWithDefaults(folder: FolderConfig, defaults?: any): ResolvedFolderConfig;

  /**
   * Apply defaults to multiple folders
   * @param folders Array of folder configurations
   * @param defaults Default configuration
   * @returns Array of resolved folder configurations
   */
  mergeAllWithDefaults(folders: FolderConfig[], defaults?: any): ResolvedFolderConfig[];

  /**
   * Merge exclude patterns using configured strategy
   * @param folderExcludes Folder-specific excludes
   * @param defaultExcludes Default excludes
   * @param mode Merge mode ('replace' | 'append' | 'merge')
   * @returns Merged exclude patterns
   */
  mergeExcludes(folderExcludes?: string[], defaultExcludes?: string[], mode?: string): string[];

  /**
   * Merge performance settings
   * @param folderPerf Folder-specific performance settings
   * @param defaultPerf Default performance settings
   * @returns Merged performance settings
   */
  mergePerformance(folderPerf?: any, defaultPerf?: any): any;

  /**
   * Merge embeddings settings
   * @param folderEmb Folder-specific embeddings settings
   * @param defaultEmb Default embeddings settings
   * @returns Merged embeddings settings
   */
  mergeEmbeddings(folderEmb?: any, defaultEmb?: any): any;
}

/**
 * Domain events for folder operations
 */
export interface FolderDomainEvents {
  folderAdded: (folder: ResolvedFolderConfig) => void;
  folderRemoved: (path: string) => void;
  folderUpdated: (folder: ResolvedFolderConfig) => void;
  folderValidationFailed: (path: string, error: Error) => void;
  folderAccessibilityChanged: (path: string, accessible: boolean) => void;
}

/**
 * Folder domain service tokens for dependency injection
 */
export const FOLDER_TOKENS = {
  FOLDER_MANAGER: Symbol('FolderManager'),
  FOLDER_VALIDATOR: Symbol('FolderValidator'),
  FOLDER_PATH_RESOLVER: Symbol('FolderPathResolver'),
  FOLDER_CONFIG_MERGER: Symbol('FolderConfigMerger'),
} as const;

/**
 * Folder domain error types
 */
export class FolderDomainError extends Error {
  constructor(message: string, public readonly code: string, public readonly path?: string) {
    super(message);
    this.name = 'FolderDomainError';
  }
}

export class FolderNotFoundError extends FolderDomainError {
  constructor(path: string) {
    super(`Folder not found: ${path}`, 'FOLDER_NOT_FOUND', path);
    this.name = 'FolderNotFoundError';
  }
}

export class FolderAccessError extends FolderDomainError {
  constructor(path: string, reason: string) {
    super(`Cannot access folder ${path}: ${reason}`, 'FOLDER_ACCESS_ERROR', path);
    this.name = 'FolderAccessError';
  }
}

export class FolderValidationError extends FolderDomainError {
  constructor(message: string, path?: string) {
    super(message, 'FOLDER_VALIDATION_ERROR', path);
    this.name = 'FolderValidationError';
  }
}

export class FolderConfigurationError extends FolderDomainError {
  constructor(message: string, path?: string) {
    super(message, 'FOLDER_CONFIGURATION_ERROR', path);
    this.name = 'FolderConfigurationError';
  }
}