import { IFileSystem, FileStats, DirEntry } from './files/interfaces.js';

export interface FileMetadata {
  path: string;
  size: number;
  extension: string;
  lastModified: number;
}

export interface FileContent {
  content: string;
  metadata: FileMetadata;
}

export interface FileOperationsConfig {
  maxFileSize: number;
  supportedExtensions: string[];
}

export class FileOperations {
  private config: FileOperationsConfig;

  constructor(
    private readonly fileSystem: IFileSystem,
    config: FileOperationsConfig
  ) {
    this.config = config;
  }

  async readFile(filePath: string): Promise<FileContent> {
    // Get file metadata
    const stats = await this.fileSystem.stat(filePath);
    const extension = this.fileSystem.extname(filePath).toLowerCase();

    // Validate file size
    if (stats.size > this.config.maxFileSize) {
      throw new Error('File size exceeds maximum allowed size');
    }

    // Validate file extension
    if (!this.config.supportedExtensions.includes(extension)) {
      throw new Error('Unsupported file extension');
    }

    // Read file content
    const content = await this.fileSystem.readFile(filePath);

    return {
      content,
      metadata: {
        path: filePath,
        size: stats.size,
        extension,
        lastModified: stats.mtime.getTime()
      }
    };
  }

  async listFiles(dirPath: string, extensions?: string[]): Promise<string[]> {
    // Get all files in directory
    const entries = await this.fileSystem.readDir(dirPath);
    const files = entries
      .filter(entry => entry.isFile())
      .map(entry => this.fileSystem.join(dirPath, entry.name));

    // Filter by extension if specified
    if (extensions) {
      return files.filter(file => 
        extensions.includes(this.fileSystem.extname(file).toLowerCase())
      );
    }

    return files;
  }

  async getFileMetadata(filePath: string): Promise<FileMetadata> {
    // Get file stats
    const stats = await this.fileSystem.stat(filePath);
    const extension = this.fileSystem.extname(filePath).toLowerCase();

    return {
      path: filePath,
      size: stats.size,
      extension,
      lastModified: stats.mtime.getTime()
    };
  }
} 