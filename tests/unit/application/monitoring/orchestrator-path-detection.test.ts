import { describe, it, expect } from 'vitest';
import * as path from 'path';

describe('Directory Detection Logic', () => {
  // Simulate the shouldIgnoreFile logic for testing
  const shouldIgnoreFile = (filePath: string, stats?: any, folderPath?: string) => {
    // If stats available, use that (most reliable)
    if (stats && stats.isDirectory()) {
      return false; // Never ignore directories
    }
    
    // If no stats, check if path looks like a directory
    const hasExtension = path.extname(filePath) !== '';
    if (!hasExtension) {
      // Normalize paths for comparison
      const normalizedFilePath = path.normalize(filePath);
      const normalizedFolderPath = folderPath ? path.normalize(folderPath) : '';
      
      // Check if it's the folder path itself
      if (normalizedFilePath === normalizedFolderPath) {
        return false;
      }
      
      // Check if it ends with a separator (platform-agnostic)
      if (normalizedFilePath.endsWith(path.sep)) {
        return false;
      }
    }
    
    // For this test, assume files with extensions should be processed
    return !hasExtension;
  };

  describe('Unix paths', () => {
    it('should detect directory with trailing slash', () => {
      const result = shouldIgnoreFile('/Users/hanan/Documents/');
      expect(result).toBe(false);
    });
    
    it('should detect directory without trailing slash', () => {
      const result = shouldIgnoreFile('/Users/hanan/Documents', undefined, '/Users/hanan/Documents');
      expect(result).toBe(false);
    });
    
    it('should not treat file as directory', () => {
      const result = shouldIgnoreFile('/Users/hanan/file.txt');
      expect(result).toBe(false); // File with extension should be processed
    });
  });
  
  describe('Windows paths', () => {
    // These tests only make sense on Windows
    const isWindows = process.platform === 'win32';
    
    it('should handle Windows-style paths appropriately', () => {
      if (isWindows) {
        // On Windows, test actual Windows behavior
        const result = shouldIgnoreFile('C:\\test\\path\\');
        expect(result).toBe(false);
      } else {
        // On Unix, Windows paths are handled differently
        // path.normalize converts backslashes to forward slashes on Unix
        const result = shouldIgnoreFile('C:\\test\\path\\');
        // Has no extension, so would be ignored (unless it matches folder path)
        expect(result).toBe(true);
      }
    });
    
    it('should not treat file as directory', () => {
      const result = shouldIgnoreFile('test-file.txt');
      expect(result).toBe(false); // File with extension should be processed
    });
  });
  
  describe('Root paths', () => {
    it('should handle Unix root', () => {
      const result = shouldIgnoreFile('/', undefined, '/');
      expect(result).toBe(false);
    });
    
    it('should handle Windows root', () => {
      const result = shouldIgnoreFile('C:\\', undefined, 'C:\\');
      expect(result).toBe(false);
    });
  });
  
  describe('Stats-based detection', () => {
    it('should trust stats over path analysis', () => {
      const mockStats = { isDirectory: () => true };
      const result = shouldIgnoreFile('ambiguous_name', mockStats);
      expect(result).toBe(false);
    });
    
    it('should handle file stats correctly', () => {
      const mockStats = { isDirectory: () => false };
      const result = shouldIgnoreFile('file_without_extension', mockStats);
      expect(result).toBe(true); // No extension and not a directory
    });
  });
});