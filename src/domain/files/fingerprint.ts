/**
 * File Fingerprinting Domain Logic
 * 
 * Pure business logic for creating file fingerprints and checksums.
 * Uses dependency injection for all infrastructure concerns.
 */

import { FileFingerprint } from '../../types/index.js';
import { FileSystemProvider, CryptographyProvider, PathProvider } from '../index';

/**
 * Domain interface for file fingerprinting operations
 */
export interface FileFingerprintOperations {
  generateFileHash(filePath: string): string;
  createFileFingerprint(filePath: string, basePath: string): FileFingerprint;
  generateFingerprints(files: string[], basePath: string): Promise<FileFingerprint[]>;
}

/**
 * File Fingerprint Generator - Core domain logic for file hashing and fingerprinting
 */
export class FileFingerprintGenerator implements FileFingerprintOperations {
  constructor(
    private readonly fileSystem: FileSystemProvider,
    private readonly cryptography: CryptographyProvider,
    private readonly pathProvider: PathProvider
  ) {}

  /**
   * Generate SHA256 hash for a file
   */
  generateFileHash(filePath: string): string {
    const fileBuffer = this.fileSystem.readFileBuffer(filePath);
    const hashSum = this.cryptography.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  }

  /**
   * Create a complete fingerprint for a file
   */
  createFileFingerprint(filePath: string, basePath: string): FileFingerprint {
    const stats = this.fileSystem.statFile(filePath);
    const relativePath = this.pathProvider.relative(basePath, filePath);
    const hash = this.generateFileHash(filePath);
    
    return {
      hash,
      path: relativePath,
      size: stats.size,
      modified: stats.mtime.toISOString()
    };
  }

  /**
   * Generate fingerprints for multiple files with progress tracking
   */
  async generateFingerprints(files: string[], basePath: string): Promise<FileFingerprint[]> {
    const fingerprints: FileFingerprint[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue; // Skip undefined files
      
      try {
        const fingerprint = this.createFileFingerprint(file, basePath);
        fingerprints.push(fingerprint);
      } catch (error) {
        // Domain logic shouldn't handle logging - that's infrastructure concern
        // For now, skip problematic files silently
        // Higher layers can decide how to handle and log errors
        continue;
      }
    }
    
    return fingerprints;
  }

  /**
   * Check if file has changed by comparing fingerprints
   */
  hasFileChanged(currentFingerprint: FileFingerprint, previousFingerprint: FileFingerprint): boolean {
    return currentFingerprint.hash !== previousFingerprint.hash ||
           currentFingerprint.size !== previousFingerprint.size ||
           currentFingerprint.modified !== previousFingerprint.modified;
  }

  /**
   * Compare two sets of fingerprints to detect changes
   */
  detectChanges(currentFingerprints: FileFingerprint[], previousFingerprints: FileFingerprint[]): {
    added: FileFingerprint[];
    modified: FileFingerprint[];
    deleted: FileFingerprint[];
    unchanged: FileFingerprint[];
  } {
    const previousMap = new Map(previousFingerprints.map(fp => [fp.path, fp]));
    const currentMap = new Map(currentFingerprints.map(fp => [fp.path, fp]));
    
    const added: FileFingerprint[] = [];
    const modified: FileFingerprint[] = [];
    const unchanged: FileFingerprint[] = [];
    const deleted: FileFingerprint[] = [];
    
    // Check current files for additions and modifications
    for (const current of currentFingerprints) {
      const previous = previousMap.get(current.path);
      if (!previous) {
        added.push(current);
      } else if (this.hasFileChanged(current, previous)) {
        modified.push(current);
      } else {
        unchanged.push(current);
      }
    }
    
    // Check for deletions
    for (const previous of previousFingerprints) {
      if (!currentMap.has(previous.path)) {
        deleted.push(previous);
      }
    }
    
    return { added, modified, deleted, unchanged };
  }
}

/**
 * Factory function for dependency injection
 */
export const createFileFingerprintGenerator = (
  fileSystem: FileSystemProvider,
  cryptography: CryptographyProvider,
  pathProvider: PathProvider
): FileFingerprintGenerator => new FileFingerprintGenerator(fileSystem, cryptography, pathProvider);

/**
 * Utility functions for backward compatibility
 */
export function generateFileHash(filePath: string): string {
  // This should be replaced with DI in consuming code
  throw new Error('generateFileHash utility function requires dependency injection migration');
}

export function createFileFingerprint(filePath: string, basePath: string): FileFingerprint {
  // This should be replaced with DI in consuming code
  throw new Error('createFileFingerprint utility function requires dependency injection migration');
}

export async function generateFingerprints(files: string[], basePath: string): Promise<FileFingerprint[]> {
  // This should be replaced with DI in consuming code
  throw new Error('generateFingerprints utility function requires dependency injection migration');
}
