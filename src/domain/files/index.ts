/**
 * Files Domain Module
 * 
 * This module contains pure business logic for file operations,
 * including parsing, watching, and fingerprinting.
 */

import { IFileSystem, MAX_FILE_SIZE, SUPPORTED_EXTENSIONS } from './interfaces.js';
import { FileError, handleError } from '../../shared/errors/index.js';
import { FileContent, FileMetadata } from './types.js';

// Core domain services
export interface IFileOperations {
  parseFile(path: string): Promise<FileContent>;
  scanFolder(path: string): Promise<FileMetadata[]>;
  watchFolder(path: string, callback: (event: string, filename: string) => void): Promise<void>;
}

export interface FileFingerprintOperations {
  createFingerprint(filePath: string): Promise<FileFingerprint>;
  compareFingerprints(current: FileFingerprint, cached: FileFingerprint): boolean;
}

// Domain types
export interface ParsedContent {
  content: string;
  metadata: FileMetadata;
  filePath: string;
}

export interface FileFingerprint {
  hash: string;
  path: string;
  size: number;
  modified: string;
}

export type FileChangeCallback = (event: FileChangeEvent) => void;

export interface FileChangeEvent {
  type: 'added' | 'modified' | 'deleted';
  filePath: string;
  fingerprint?: FileFingerprint;
}

// Default implementation
export class DefaultFileOperations implements IFileOperations {
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

// Domain implementations (to be migrated from existing code)
// export { FileParser } from './parser.js';
// export { FileWatcher } from './watcher.js'; 
// export { createFileFingerprint } from './fingerprint.js';
