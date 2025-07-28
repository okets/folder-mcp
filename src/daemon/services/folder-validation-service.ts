/**
 * Daemon Folder Validation Service
 * 
 * Implements folder validation logic for the daemon layer.
 * Migrated from TUI layer to support WebSocket protocol validation.
 * 
 * Implements three validation scenarios:
 * 1. Duplicate: Exact path already monitored (error → disable Confirm)
 * 2. Sub-folder: New path is child of existing folder (error → disable Confirm)  
 * 3. Ancestor: New path is parent of existing folders (warning → enable Confirm)
 */

import * as path from 'path';
import * as fs from 'fs';
import { ILoggingService } from '../../di/interfaces.js';
import { IDaemonConfigurationService } from './configuration-service.js';
import {
  ValidationResult,
  VALIDATION_ERRORS,
  VALIDATION_WARNINGS,
  ValidationError,
  ValidationWarning
} from '../websocket/message-types.js';

/**
 * Folder validation service interface for daemon layer
 */
export interface IDaemonFolderValidationService {
  /**
   * Validate a folder path against existing monitored folders
   */
  validate(folderPath: string): Promise<ValidationResult>;

  /**
   * Initialize the validation service
   */
  initialize(): Promise<void>;
}

/**
 * Daemon-side folder validation service
 */
export class DaemonFolderValidationService implements IDaemonFolderValidationService {
  constructor(
    private configService: IDaemonConfigurationService,
    private logger: ILoggingService
  ) {}

  /**
   * Initialize the validation service
   */
  async initialize(): Promise<void> {
    this.logger.debug('Daemon Folder Validation Service initialized');
  }

  /**
   * Validate a folder path against existing monitored folders
   */
  async validateFolderPath(folderPath: string): Promise<ValidationResult> {
    return this.validate(folderPath);
  }

  /**
   * Validate a folder path (WebSocket protocol interface)
   */
  async validate(folderPath: string): Promise<ValidationResult> {
    try {
      // Basic path validation
      if (!folderPath || folderPath.trim() === '') {
        return {
          isValid: false,
          errors: [VALIDATION_ERRORS.NOT_EXISTS('')],
          warnings: []
        };
      }

      // Normalize the path to ensure consistent comparison
      const normalizedPath = path.resolve(folderPath);

      // Check if path exists and is accessible
      try {
        const stat = fs.statSync(normalizedPath);
        if (!stat.isDirectory()) {
          return {
            isValid: false,
            errors: [VALIDATION_ERRORS.NOT_DIRECTORY(folderPath)],
            warnings: []
          };
        }
      } catch (error) {
        return {
          isValid: false,
          errors: [VALIDATION_ERRORS.NOT_EXISTS(folderPath)],
          warnings: []
        };
      }

      // Get existing monitored folders
      const existingFolders = await this.configService.getFolders();

      if (!existingFolders || existingFolders.length === 0) {
        // No existing folders, path is valid
        return {
          isValid: true,
          errors: [],
          warnings: []
        };
      }

      // Check for folder conflicts
      return this.checkFolderConflicts(normalizedPath, existingFolders);

    } catch (error) {
      this.logger.error('Validation error during folder validation', error instanceof Error ? error : new Error(String(error)));
      return {
        isValid: false,
        errors: [VALIDATION_ERRORS.NOT_EXISTS(folderPath)],
        warnings: []
      };
    }
  }

  /**
   * Check for folder conflicts: duplicate, sub-folder, or ancestor scenarios
   */
  private checkFolderConflicts(
    targetPath: string,
    existingFolders: Array<{ path: string; model: string }>
  ): ValidationResult {
    const normalizedExisting = existingFolders.map(folder => ({
      ...folder,
      normalizedPath: path.resolve(folder.path)
    }));

    // Scenario 1: Duplicate - exact path already exists
    const duplicateFolder = normalizedExisting.find(folder =>
      folder.normalizedPath === targetPath
    );

    if (duplicateFolder) {
      return {
        isValid: false,
        errors: [VALIDATION_ERRORS.DUPLICATE(targetPath)],
        warnings: []
      };
    }

    // Scenario 2: Sub-folder - target is child of existing monitored folder
    const parentFolder = normalizedExisting.find(folder =>
      this.isSubPath(targetPath, folder.normalizedPath)
    );

    if (parentFolder) {
      return {
        isValid: false,
        errors: [VALIDATION_ERRORS.SUBFOLDER(targetPath, parentFolder.path)],
        warnings: []
      };
    }

    // Scenario 3: Ancestor - target is parent of existing folders
    const childFolders = normalizedExisting.filter(folder =>
      this.isSubPath(folder.normalizedPath, targetPath)
    );

    if (childFolders.length > 0) {
      const affectedFolders = childFolders.map(f => f.path);
      
      return {
        isValid: true, // Valid but with warning
        errors: [],
        warnings: [VALIDATION_WARNINGS.ANCESTOR(targetPath, affectedFolders)]
      };
    }

    // No conflicts - path is valid
    return {
      isValid: true,
      errors: [],
      warnings: []
    };
  }

  /**
   * Check if childPath is a sub-path of parentPath
   */
  private isSubPath(childPath: string, parentPath: string): boolean {
    const relativePath = path.relative(parentPath, childPath);
    return relativePath !== '' &&
           !relativePath.startsWith('..') &&
           !path.isAbsolute(relativePath);
  }
}