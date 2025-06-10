import * as fs from 'fs';
import * as path from 'path';
import { ValidationError, ValidationErrorCode, ValidationResult } from './errors.js';

export class PathValidator {
  validate(config: any): ValidationResult {
    const result = new ValidationResult(true);

    // Validate target folder
    if (!config.targetFolder) {
      result.addError(new ValidationError(
        ValidationErrorCode.FOLDER_NOT_FOUND,
        'Target folder is required',
        'targetFolder',
        undefined,
        'Specify a target folder path'
      ));
      return result;
    }

    try {
      // Check if folder exists
      const stats = fs.statSync(config.targetFolder);
      if (!stats.isDirectory()) {
        result.addError(new ValidationError(
          ValidationErrorCode.FOLDER_NOT_FOUND,
          'Target path is not a directory',
          'targetFolder',
          config.targetFolder,
          'Specify a valid directory path'
        ));
        return result;
      }

      // Check read permissions
      try {
        fs.accessSync(config.targetFolder, fs.constants.R_OK);
      } catch (error) {
        result.addError(new ValidationError(
          ValidationErrorCode.FOLDER_NOT_READABLE,
          'Target folder is not readable',
          'targetFolder',
          config.targetFolder,
          'Check folder permissions or choose a different folder'
        ));
        return result;
      }

      // Validate cache directory
      const cacheDir = path.join(config.targetFolder, '.folder-mcp');
      if (config.cacheDir && config.cacheDir !== cacheDir) {
        try {
          const cacheStats = fs.statSync(config.cacheDir);
          if (!cacheStats.isDirectory()) {
            result.addError(new ValidationError(
              ValidationErrorCode.CACHE_DIR_INVALID,
              'Cache directory path is not a directory',
              'cacheDir',
              config.cacheDir,
              'Specify a valid directory path for cache'
            ));
          } else {
            // Check write permissions for cache
            try {
              fs.accessSync(config.cacheDir, fs.constants.W_OK);
            } catch (error) {
              result.addError(new ValidationError(
                ValidationErrorCode.CACHE_DIR_INVALID,
                'Cache directory is not writable',
                'cacheDir',
                config.cacheDir,
                'Check cache directory permissions or use default location'
              ));
            }
          }
        } catch (error) {
          result.addError(new ValidationError(
            ValidationErrorCode.CACHE_DIR_INVALID,
            'Cache directory does not exist',
            'cacheDir',
            config.cacheDir,
            'Create the cache directory or use default location'
          ));
        }
      }

      // Validate file paths in configuration
      if (config.includePaths) {
        for (const includePath of config.includePaths) {
          const fullPath = path.join(config.targetFolder, includePath);
          try {
            fs.accessSync(fullPath, fs.constants.R_OK);
          } catch (error) {
            result.addError(new ValidationError(
              ValidationErrorCode.PATH_INVALID,
              `Include path is not accessible: ${includePath}`,
              'includePaths',
              includePath,
              'Check path exists and is readable'
            ));
          }
        }
      }

      if (config.excludePaths) {
        for (const excludePath of config.excludePaths) {
          const fullPath = path.join(config.targetFolder, excludePath);
          try {
            fs.accessSync(fullPath, fs.constants.R_OK);
          } catch (error) {
            // This is just a warning since exclude paths don't need to exist
            result.addWarning(new ValidationError(
              ValidationErrorCode.PATH_INVALID,
              `Exclude path is not accessible: ${excludePath}`,
              'excludePaths',
              excludePath,
              'Check path exists and is readable'
            ));
          }
        }
      }

    } catch (error) {
      result.addError(new ValidationError(
        ValidationErrorCode.FOLDER_NOT_FOUND,
        'Target folder does not exist',
        'targetFolder',
        config.targetFolder,
        'Create the folder or specify a different path'
      ));
    }

    return result;
  }

  normalizePaths(config: any): any {
    const result = { ...config };

    // Normalize target folder path
    if (result.targetFolder) {
      result.targetFolder = path.normalize(result.targetFolder);
    }

    // Normalize cache directory path
    if (result.cacheDir) {
      result.cacheDir = path.normalize(result.cacheDir);
    }

    // Normalize include/exclude paths
    if (result.includePaths) {
      result.includePaths = result.includePaths.map((p: string) => path.normalize(p));
    }
    if (result.excludePaths) {
      result.excludePaths = result.excludePaths.map((p: string) => path.normalize(p));
    }

    return result;
  }
} 