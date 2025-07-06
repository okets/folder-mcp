/**
 * Folder Domain Layer Exports
 * 
 * Re-exports all folder-related domain interfaces and types
 * for clean imports throughout the application.
 */

export * from './interfaces.js';

// Re-export folder configuration types for convenience
export type {
  FolderConfig,
  FolderDefaultsConfig,
  FoldersConfig,
  ResolvedFolderConfig,
  FolderStatus,
  MultiFolderStatus,
  FolderConfigValidation,
  FolderMergeStrategy
} from '../../config/schema/folders.js';

export {
  DEFAULT_FOLDERS_CONFIG,
  DEFAULT_FOLDER_VALIDATION,
  DEFAULT_MERGE_STRATEGY
} from '../../config/schema/folders.js';