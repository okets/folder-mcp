/**
 * Files Domain Module
 * 
 * This module contains pure business logic for file operations,
 * including parsing, watching, and fingerprinting.
 */

// Import types from shared location
import type { ParsedContent, FileFingerprint } from '../../types/index.js';

// Export parser implementations
export { 
  FileParser, 
  type FileParsingOperations,
  createFileParser 
} from './parser.js';

// Export fingerprinting implementations
export { 
  FileFingerprintGenerator,
  createFileFingerprintGenerator,
  generateFileHash,
  createFileFingerprint,
  generateFingerprints
} from './fingerprint.js';

// Export file state management
export {
  FileStateManager,
  FileProcessingState,
  type FileState,
  type ProcessingDecision,
  type IFileStateStorage
} from './file-state-manager.js';

// Export watching implementations
export {
  FileWatchingDomainService,
  FileEventAggregator,
  type FileChangeType,
  type FileChangeEvent,
  type FileEventBatch,
  type FileChangeStats,
  type FileWatchingOperations,
  createFileWatchingDomainService,
  createFileEventAggregator
} from './watcher.js';

// Re-export types for convenience
export type { ParsedContent, FileFingerprint };

// Core domain interfaces for backward compatibility
export interface FileOperations {
  scanFolder(path: string): Promise<string[]>;
  parseFile(path: string): Promise<ParsedContent>;
  watchFolder(path: string, callback: FileChangeCallback): Promise<void>;
}

export type FileChangeCallback = (event: import('./watcher.js').FileChangeEvent) => void;

// Backward compatibility with existing code during migration
import { IFileSystem, MAX_FILE_SIZE, SUPPORTED_EXTENSIONS } from './interfaces.js';
import { FileError } from '../../shared/errors/index.js';
import { FileContent, FileMetadata } from './types.js';

export interface LegacyFileOperations {
  parseFile(path: string): Promise<FileContent>;
  scanFolder(path: string): Promise<FileMetadata[]>;
  watchFolder(path: string, callback: (event: string, filename: string) => void): Promise<void>;
}

export interface LegacyFingerprintOperations {
  createFingerprint(filePath: string): Promise<FileFingerprint>;
  compareFingerprints(current: FileFingerprint, cached: FileFingerprint): boolean;
}

export class DefaultFileOperations implements LegacyFileOperations {
  private readonly MAX_FILE_SIZE = 1024 * 1024; // 1MB (matches test)
  private readonly SUPPORTED_EXTENSIONS = ['.txt', '.md', '.json', '.yaml', '.yml'];

  constructor(
    private readonly fileSystem: IFileSystem
  ) {}

  async parseFile(path: string): Promise<FileContent> {
    try {
      // Check file size
      const stats = await this.fileSystem.stat(path);
      if (stats.size > this.MAX_FILE_SIZE) {
        throw new FileError('File size exceeds maximum allowed size', { path, size: stats.size });
      }

      // Check file extension
      const ext = this.fileSystem.extname(path).toLowerCase();
      if (!this.SUPPORTED_EXTENSIONS.includes(ext)) {
        throw new FileError('Unsupported file extension', { path, extension: ext });
      }

      const content = await this.fileSystem.readFile(path);
      return {
        path,
        content,
        metadata: {
          originalPath: path,
          type: ext,
          size: stats.size,
          modified: stats.mtime
        }
      };
    } catch (error: any) {
      if (error instanceof FileError) {
        throw error;
      }
      if (error && error.message === 'ENOENT') {
        throw new FileError('ENOENT', { path });
      }
      if (error instanceof Error) {
        throw new FileError(error.message, { path });
      }
      throw new FileError('Failed to parse file', { path });
    }
  }

  async scanFolder(path: string): Promise<FileMetadata[]> {
    try {
      const entries = await this.fileSystem.readDir(path);
      const files: FileMetadata[] = [];

      for (const entry of entries) {
        if (entry.isFile()) {
          const filePath = this.fileSystem.join(path, entry.name);
          const ext = this.fileSystem.extname(filePath).toLowerCase();
          if (this.SUPPORTED_EXTENSIONS.includes(ext)) {
            const stats = await this.fileSystem.stat(filePath);
            files.push({
              originalPath: filePath,
              type: ext,
              size: stats.size,
              modified: stats.mtime
            });
          }
        }
        if (entry.isDirectory()) {
          const subDirPath = this.fileSystem.join(path, entry.name);
          files.push(...(await this.scanFolder(subDirPath)));
        }
      }

      return files;
    } catch (error: any) {
      if (error instanceof FileError) {
        throw error;
      }
      if (error && error.message === 'ENOENT') {
        throw new FileError(`Directory not found: ${path}`, { path });
      }
      if (error instanceof Error) {
        throw new FileError(error.message, { path });
      }
      throw new FileError('Failed to scan folder', { path });
    }
  }

  async watchFolder(path: string, callback: (event: string, filename: string) => void): Promise<void> {
    try {
      // TODO: Implement file watching
      throw new Error('Not implemented');
    } catch (error) {
      if (error instanceof FileError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new FileError(error.message, { path });
      }
      throw new FileError('Failed to watch folder', { path });
    }
  }
}

// Legacy exports for backward compatibility
export { DefaultFileOperations as IFileOperations };
