/**
 * File System Domain Interfaces
 * 
 * These interfaces define the contract for file system operations
 * without depending on specific implementations.
 */

export interface FileStats {
  size: number;
  mtime: Date;
  isDirectory(): boolean;
  isFile(): boolean;
  isReadOnly(): boolean;
}

export interface DirEntry {
  name: string;
  isFile(): boolean;
  isDirectory(): boolean;
}

export interface IFileSystem {
  readFile(filePath: string): Promise<string>;
  stat(filePath: string): Promise<FileStats>;
  readDir(dirPath: string): Promise<DirEntry[]>;
  join(...paths: string[]): string;
  extname(filePath: string): string;
}

// Domain constants
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.js', '.ts', '.json', '.html', '.css', '.xml', '.yaml', '.yml']; 