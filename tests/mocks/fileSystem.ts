import path from 'path';
import { IFileSystem, FileStats, DirEntry } from '../../src/domain/files/interfaces.js';

export class MockFileSystem implements IFileSystem {
  private files: Map<string, { content: string; stats: FileStats }> = new Map();
  private dirs: Set<string> = new Set();

  constructor() {
    this.dirs.add('/'); // Root directory always exists
  }

  async readFile(filePath: string): Promise<string> {
    const file = this.files.get(filePath);
    if (!file) {
      throw new Error('ENOENT');
    }
    return file.content;
  }

  async stat(filePath: string): Promise<FileStats> {
    const file = this.files.get(filePath);
    if (!file) {
      throw new Error('ENOENT');
    }
    return file.stats;
  }

  async readDir(dirPath: string): Promise<DirEntry[]> {
    if (!this.dirs.has(dirPath)) {
      throw new Error('ENOENT');
    }
    const entries: DirEntry[] = [];
    for (const [filePath, file] of this.files.entries()) {
      if (path.dirname(filePath) === dirPath) {
        entries.push({
          name: path.basename(filePath),
          isFile: () => true,
          isDirectory: () => false
        });
      }
    }
    for (const dir of this.dirs) {
      if (path.dirname(dir) === dirPath && dir !== dirPath) {
        entries.push({
          name: path.basename(dir),
          isFile: () => false,
          isDirectory: () => true
        });
      }
    }
    return entries;
  }

  join(...paths: string[]): string {
    return path.join(...paths);
  }

  extname(filePath: string): string {
    return path.extname(filePath);
  }

  // Helper methods for test setup
  addFile(filePath: string, content: string, stats: Partial<FileStats> = {}): void {
    const dir = path.dirname(filePath);
    this.dirs.add(dir);
    this.files.set(filePath, {
      content,
      stats: {
        size: content.length,
        mtime: new Date(),
        isDirectory: () => false,
        isFile: () => true,
        isReadOnly: () => false,
        ...stats
      }
    });
  }

  addDir(dirPath: string): void {
    this.dirs.add(dirPath);
  }

  setReadOnly(filePath: string): void {
    const file = this.files.get(filePath);
    if (file) {
      file.stats.isReadOnly = () => true;
    }
  }

  cleanup(): void {
    this.files.clear();
    this.dirs.clear();
    this.dirs.add('/');
  }
} 