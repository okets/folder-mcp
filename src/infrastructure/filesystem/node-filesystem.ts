/**
 * Node.js File System Implementation
 * 
 * This module provides a Node.js implementation of the file system interface
 * defined in the domain layer.
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { IFileSystem, FileStats, DirEntry } from '../../domain/files/interfaces.js';

export class NodeFileSystem implements IFileSystem {
  async readFile(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf-8');
  }

  async stat(filePath: string): Promise<FileStats> {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      mtime: stats.mtime,
      isDirectory: () => stats.isDirectory(),
      isFile: () => stats.isFile()
    };
  }

  async readDir(dirPath: string): Promise<DirEntry[]> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.map(entry => ({
      name: entry.name,
      isDirectory: () => entry.isDirectory(),
      isFile: () => entry.isFile()
    }));
  }

  join(...paths: string[]): string {
    return path.join(...paths);
  }

  extname(filePath: string): string {
    return path.extname(filePath);
  }
} 