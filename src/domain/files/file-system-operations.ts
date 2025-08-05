/**
 * File system operations interface
 */

export interface IFileSystemService {
  /**
   * Scan folder for files
   */
  scanFolder(folderPath: string): Promise<{ files: any[], errors: any[] }>;
  
  /**
   * Get file hash
   */
  getFileHash(filePath: string): Promise<string>;
  
  /**
   * Get file metadata
   */
  getFileMetadata(filePath: string): Promise<any>;
  
  /**
   * Read file content
   */
  readFile(filePath: string): Promise<string>;
  
  /**
   * Check if path is directory
   */
  isDirectory(path: string): boolean;
  
  /**
   * Check if file/directory exists
   */
  exists(path: string): boolean;
}