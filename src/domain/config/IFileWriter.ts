/**
 * File Writer Interface
 * 
 * Interface for file writing operations needed by configuration management.
 */

export interface IFileWriter {
  /**
   * Write content to a file
   * @param filePath - Path to write to
   * @param content - Content to write
   */
  writeFile(filePath: string, content: string): Promise<void>;
  
  /**
   * Ensure directory exists, create if it doesn't
   * @param dirPath - Directory path to ensure
   */
  ensureDir(dirPath: string): Promise<void>;
  
  /**
   * Check if file or directory exists
   * @param path - Path to check
   */
  exists(path: string): Promise<boolean>;
}