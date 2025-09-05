/**
 * Path Normalization Utility for Cross-Platform Support
 * 
 * Handles path normalization to ensure consistent folder matching across
 * Windows, macOS, and Linux platforms. Addresses differences in:
 * - Path separators (\ vs /)
 * - Case sensitivity 
 * - URL encoding/decoding
 * - Trailing slash consistency
 * 
 * Used by REST server for reliable folder path matching against FMDM data.
 */

import * as path from 'path';

export interface PathNormalizationOptions {
  /** Whether to preserve case sensitivity (default: platform-dependent) */
  caseSensitive?: boolean;
  /** Whether to preserve trailing slashes (default: false) */
  preserveTrailingSlash?: boolean;
  /** Whether to decode URL-encoded paths (default: true) */
  decodeUrl?: boolean;
}

/**
 * Cross-platform path normalization utility
 */
export class PathNormalizer {
  private static readonly DEFAULT_OPTIONS: Required<PathNormalizationOptions> = {
    caseSensitive: process.platform !== 'win32', // Windows is case-insensitive
    preserveTrailingSlash: false,
    decodeUrl: true
  };

  /**
   * Normalize a single path for consistent comparison
   */
  static normalize(inputPath: string, options: PathNormalizationOptions = {}): string {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    if (!inputPath || typeof inputPath !== 'string') {
      throw new Error('Path must be a non-empty string');
    }

    let normalizedPath = inputPath;

    // 1. URL decode if requested
    if (opts.decodeUrl) {
      try {
        normalizedPath = decodeURIComponent(normalizedPath);
      } catch (error) {
        // If decoding fails, continue with original path
        // This handles cases where path contains % but isn't URL-encoded
      }
    }

    // 2. Resolve to absolute path and normalize separators
    try {
      normalizedPath = path.resolve(normalizedPath);
    } catch (error) {
      // If path.resolve fails, try basic normalization
      normalizedPath = path.normalize(normalizedPath);
    }

    // 3. Handle case sensitivity
    if (!opts.caseSensitive) {
      normalizedPath = normalizedPath.toLowerCase();
    }

    // 4. Handle trailing slashes
    if (!opts.preserveTrailingSlash) {
      // Remove trailing slash except for root directories
      const parsedPath = path.parse(normalizedPath);
      const isRoot = normalizedPath === parsedPath.root;
      
      // Only remove trailing separator if not a root path
      if (!isRoot && normalizedPath.endsWith(path.sep)) {
        normalizedPath = normalizedPath.slice(0, -1);
      }
    }

    return normalizedPath;
  }

  /**
   * Compare two paths for equality using normalized comparison
   */
  static areEqual(path1: string, path2: string, options: PathNormalizationOptions = {}): boolean {
    try {
      const normalized1 = this.normalize(path1, options);
      const normalized2 = this.normalize(path2, options);
      return normalized1 === normalized2;
    } catch (error) {
      // If normalization fails, fall back to direct comparison
      return path1 === path2;
    }
  }

  /**
   * Find a folder in an array by normalized path matching
   */
  static findByPath<T extends { path: string }>(
    folders: T[], 
    targetPath: string, 
    options: PathNormalizationOptions = {}
  ): T | undefined {
    const normalizedTarget = this.normalize(targetPath, options);
    
    return folders.find(folder => {
      try {
        const normalizedFolderPath = this.normalize(folder.path, options);
        return normalizedFolderPath === normalizedTarget;
      } catch (error) {
        // If normalization fails for this folder, try direct comparison
        return folder.path === targetPath;
      }
    });
  }

  /**
   * Normalize an array of paths for consistent processing
   */
  static normalizeMany(paths: string[], options: PathNormalizationOptions = {}): string[] {
    return paths.map(p => {
      try {
        return this.normalize(p, options);
      } catch (error) {
        // If normalization fails, return original path
        return p;
      }
    });
  }

  /**
   * Check if a path is valid and can be normalized
   */
  static isValidPath(inputPath: string): boolean {
    try {
      if (!inputPath || typeof inputPath !== 'string') {
        return false;
      }
      
      // Try to normalize - if it succeeds, path is valid
      this.normalize(inputPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get platform-specific normalization options
   */
  static getPlatformOptions(): PathNormalizationOptions {
    return {
      caseSensitive: process.platform !== 'win32',
      preserveTrailingSlash: false,
      decodeUrl: true
    };
  }

  /**
   * Generate a URL-safe document ID from a relative path
   * Normalizes the path and converts it to a safe identifier
   */
  static generateDocumentId(relativePath: string): string {
    if (!relativePath || typeof relativePath !== 'string') {
      throw new Error('Relative path must be a non-empty string');
    }

    // 1. URL decode if needed
    let normalizedPath = relativePath;
    try {
      normalizedPath = decodeURIComponent(normalizedPath);
    } catch {
      // If decoding fails, continue with original path
    }

    // 2. Normalize path separators and handle case sensitivity
    normalizedPath = path.normalize(normalizedPath);
    normalizedPath = normalizedPath.toLowerCase();

    // 3. Replace path separators and special characters with hyphens for URL safety
    normalizedPath = normalizedPath
      .replace(/[\/\\]/g, '-')  // Replace path separators with hyphens
      .replace(/[^a-z0-9\-_.]/g, '-')  // Replace other special chars
      .replace(/-+/g, '-')  // Remove duplicate hyphens
      .replace(/^-|-$/g, '');  // Remove leading/trailing hyphens

    if (!normalizedPath) {
      throw new Error('Path normalization resulted in empty string');
    }

    return normalizedPath;
  }

  /**
   * Debug helper: show normalization steps for a path
   */
  static debugNormalization(inputPath: string, options: PathNormalizationOptions = {}): {
    original: string;
    decoded: string;
    resolved: string;
    caseHandled: string;
    final: string;
    platform: string;
    options: Required<PathNormalizationOptions>;
  } {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    let step1_decoded = inputPath;
    if (opts.decodeUrl) {
      try {
        step1_decoded = decodeURIComponent(inputPath);
      } catch {
        // Keep original if decoding fails
      }
    }

    let step2_resolved = step1_decoded;
    try {
      step2_resolved = path.resolve(step1_decoded);
    } catch {
      step2_resolved = path.normalize(step1_decoded);
    }

    let step3_caseHandled = step2_resolved;
    if (!opts.caseSensitive) {
      step3_caseHandled = step2_resolved.toLowerCase();
    }

    let final = step3_caseHandled;
    if (!opts.preserveTrailingSlash && final.length > 1 && final.endsWith(path.sep)) {
      final = final.slice(0, -1);
    }

    return {
      original: inputPath,
      decoded: step1_decoded,
      resolved: step2_resolved,
      caseHandled: step3_caseHandled,
      final: final,
      platform: process.platform,
      options: opts
    };
  }
}