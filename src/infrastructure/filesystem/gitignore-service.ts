/**
 * GitIgnore Service
 * 
 * Provides .gitignore parsing and file filtering functionality using the 'ignore' library.
 * This ensures we respect user's project structure and don't index unwanted files.
 */

import ignore from 'ignore';
import { promises as fs } from 'fs';
import path from 'path';

export interface IGitIgnoreService {
  /**
   * Load .gitignore file from a directory and create ignore filter
   */
  loadGitIgnore(folderPath: string): Promise<ignore.Ignore>;
  
  /**
   * Check if a file path should be ignored based on .gitignore rules
   */
  shouldIgnore(ig: ignore.Ignore, filePath: string, folderPath: string): boolean;
  
  /**
   * Get chokidar ignore patterns from .gitignore
   */
  getChokidarIgnorePatterns(folderPath: string): Promise<((path: string) => boolean)[]>;
}

export class GitIgnoreService implements IGitIgnoreService {
  
  async loadGitIgnore(folderPath: string): Promise<ignore.Ignore> {
    const ig = ignore();
    
    // Always ignore common patterns that shouldn't be indexed
    ig.add([
      '.git/',
      'node_modules/',
      '.DS_Store',
      'Thumbs.db'
    ]);
    
    try {
      const gitignorePath = path.join(folderPath, '.gitignore');
      const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
      
      // Parse .gitignore content and add to ignore filter
      const lines = gitignoreContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#')); // Remove comments and empty lines
      
      ig.add(lines);
      
      console.error(`[GitIgnore] Loaded .gitignore with ${lines.length} rules`);
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        process.env.FOLDER_MCP_VERBOSE && console.error(`[GitIgnore] No .gitignore found, using default exclusions`);
      } else {
        console.error(`[GitIgnore] Failed to read .gitignore:`, error);
      }
    }
    
    return ig;
  }
  
  shouldIgnore(ig: ignore.Ignore, filePath: string, folderPath: string): boolean {
    const rel = path.relative(path.resolve(folderPath), path.resolve(filePath));
    // Outside folder -> ignore
    if (!rel || rel === '.' || rel.startsWith('..')) return true;
    // Normalize to POSIX separators for 'ignore' lib
    const relPosix = rel.split(path.sep).join('/');
    return ig.ignores(relPosix);
  }
  
  async getChokidarIgnorePatterns(folderPath: string): Promise<((path: string) => boolean)[]> {
    const ig = await this.loadGitIgnore(folderPath);
    
    const toRelPosix = (p: string) => {
      const rel = path.relative(path.resolve(folderPath), path.resolve(p));
      if (!rel || rel === '.' || rel.startsWith('..')) return null;
      return rel.split(path.sep).join('/');
    };

    return [
      // Existing dotfiles pattern
      (filePath: string) => {
        return /(^|[\/\\])\./.test(filePath);
      },
      
      // GitIgnore pattern
      (filePath: string) => {
        try {
          const relPosix = toRelPosix(filePath);
          if (!relPosix) return false;
          return ig.ignores(relPosix);
        } catch (error) {
          // If there's any error in path processing, don't ignore the file
          console.error(`[GitIgnore] Error processing path ${filePath}:`, error);
          return false;
        }
      }
    ];
  }
}

/**
 * Global gitignore service instance
 */
export const gitIgnoreService = new GitIgnoreService();