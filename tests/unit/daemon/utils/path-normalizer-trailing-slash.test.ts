import { describe, it, expect } from 'vitest';
import { PathNormalizer } from '../../../../src/daemon/utils/path-normalizer';
import * as path from 'path';

describe('PathNormalizer - Trailing Slash Removal', () => {
  describe('Unix paths', () => {
    it('should preserve Unix root /', () => {
      const result = PathNormalizer.normalize('/');
      expect(result).toBe('/');
    });
    
    it('should remove trailing slash from regular directory', () => {
      const result = PathNormalizer.normalize('/Users/hanan/Documents/');
      // On Unix, should remove trailing slash
      expect(result).toBe('/users/hanan/documents'); // Note: also lowercased by default
    });
    
    it('should not change path without trailing slash', () => {
      const result = PathNormalizer.normalize('/Users/hanan/Documents');
      expect(result).toBe('/users/hanan/documents');
    });
  });
  
  describe('Windows paths', () => {
    // These tests simulate Windows behavior
    const simulateWindowsPath = (inputPath: string) => {
      // For testing, we need to handle Windows paths even on Unix
      // The real code will use path.parse which handles this
      return inputPath;
    };
    
    it('should preserve Windows root C:\\', () => {
      // When running on Windows, C:\ should remain C:\
      const testPath = 'C:\\';
      const normalized = PathNormalizer.normalize(testPath);
      
      // Check if it's a root path
      const parsed = path.parse(testPath);
      const isRoot = testPath === parsed.root;
      
      if (isRoot) {
        // Root should be preserved
        expect(normalized).toMatch(/^[a-z]:[\\\/]$/i); // Match C:\ or c:\ or C:/
      }
    });
    
    it('should remove trailing backslash from regular Windows directory', () => {
      const result = PathNormalizer.normalize('C:\\Users\\hanan\\Documents\\');
      // Should remove trailing backslash but preserve drive
      expect(result).toMatch(/^c:[\\\/]users[\\\/]hanan[\\\/]documents$/);
    });
    
    it('should handle Windows path with forward slashes', () => {
      const result = PathNormalizer.normalize('C:/Users/hanan/Documents/');
      expect(result).toMatch(/^c:[\\\/]users[\\\/]hanan[\\\/]documents$/);
    });
    
    it('should not change Windows path without trailing slash', () => {
      const result = PathNormalizer.normalize('C:\\Users\\hanan\\Documents');
      expect(result).toMatch(/^c:[\\\/]users[\\\/]hanan[\\\/]documents$/);
    });
  });
  
  describe('Edge cases', () => {
    it('should handle UNC paths on Windows', () => {
      const result = PathNormalizer.normalize('\\\\server\\share\\folder\\');
      // UNC paths should preserve server/share structure
      expect(result.endsWith('folder')).toBe(true);
    });
    
    it('should handle empty string', () => {
      const result = PathNormalizer.normalize('');
      expect(result).toBe('');
    });
    
    it('should handle single dot', () => {
      const result = PathNormalizer.normalize('.');
      expect(result).toBe('.');
    });
  });
  
  describe('With preserveTrailingSlash option', () => {
    it('should keep trailing slash when option is true', () => {
      const result = PathNormalizer.normalize('/Users/hanan/Documents/', { 
        preserveTrailingSlash: true,
        caseSensitive: true 
      });
      expect(result).toBe('/Users/hanan/Documents/');
    });
    
    it('should remove trailing slash when option is false', () => {
      const result = PathNormalizer.normalize('/Users/hanan/Documents/', { 
        preserveTrailingSlash: false,
        caseSensitive: true 
      });
      expect(result).toBe('/Users/hanan/Documents');
    });
  });
});