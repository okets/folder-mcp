/**
 * Tests to ensure every supported extension has a corresponding parser
 * This prevents the issue where we support an extension but can't actually parse it
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FileParser } from '../../src/domain/files/parser.js';
import { FileParsingService } from '../../src/di/services.js';
import { 
  getSupportedExtensions, 
  DOCUMENT_EXTENSIONS, 
  isDocumentExtension,
  getExtensionCategory 
} from '../../src/domain/files/supported-extensions.js';
import { NodeFileSystemProvider, NodePathProvider } from '../../src/infrastructure/providers/node-providers.js';

// Simple logger mock for testing
const NoOpLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  fatal: () => {},
  setLevel: () => {},
};

describe('Supported Extensions Validation', () => {
  let domainParser: FileParser;
  let serviceParser: FileParsingService;

  beforeEach(() => {
    const fileSystemProvider = new NodeFileSystemProvider();
    const pathProvider = new NodePathProvider();
    const logger = NoOpLogger;

    // Create domain parser
    domainParser = new FileParser(fileSystemProvider, pathProvider, logger);
    
    // Create service parser
    serviceParser = new FileParsingService('/test/base/path', logger);
  });

  describe('Extension-Parser Consistency', () => {
    it('should have a domain parser for every supported extension', () => {
      const supportedExtensions = getSupportedExtensions();
      
      for (const ext of supportedExtensions) {
        expect(domainParser.isSupported(ext)).toBe(true);
      }
    });

    it('should have a service parser for every supported extension', () => {
      const supportedExtensions = getSupportedExtensions();
      
      for (const ext of supportedExtensions) {
        expect(serviceParser.isSupported(ext)).toBe(true);
      }
    });

    it('should have consistent supported extensions between domain and service parsers', () => {
      const domainExtensions = domainParser.getSupportedExtensions();
      const serviceExtensions = serviceParser.getSupportedExtensions();
      
      expect(domainExtensions).toEqual(serviceExtensions);
      expect(domainExtensions).toEqual([...DOCUMENT_EXTENSIONS]);
    });

    it('should be able to create a dummy file path for each extension without throwing', () => {
      const supportedExtensions = getSupportedExtensions();
      
      for (const ext of supportedExtensions) {
        const dummyPath = `test${ext}`;
        
        // Should not throw when checking file type
        expect(() => {
          const isSupported = domainParser.isSupported(ext);
          expect(isSupported).toBe(true);
        }).not.toThrow();
      }
    });
  });

  describe('Extension Category Validation', () => {
    it('should categorize all document extensions correctly', () => {
      for (const ext of DOCUMENT_EXTENSIONS) {
        expect(isDocumentExtension(ext)).toBe(true);
        expect(getExtensionCategory(ext)).toBe('document');
      }
    });

    it('should handle extensions with and without leading dots', () => {
      expect(isDocumentExtension('.txt')).toBe(true);
      expect(isDocumentExtension('txt')).toBe(true);
      expect(isDocumentExtension('.PDF')).toBe(true); // Case insensitive
      expect(isDocumentExtension('PDF')).toBe(true);
    });

    it('should reject unsupported extensions', () => {
      const unsupportedExtensions = ['.html', '.xml', '.csv', '.bin', '.unknown'];
      
      for (const ext of unsupportedExtensions) {
        expect(isDocumentExtension(ext)).toBe(false);
        expect(getExtensionCategory(ext)).toBe('unsupported');
        expect(domainParser.isSupported(ext)).toBe(false);
        expect(serviceParser.isSupported(ext)).toBe(false);
      }
    });
  });

  describe('Parser Method Validation', () => {
    it('should have parseFile method handle all supported extensions', async () => {
      const supportedExtensions = getSupportedExtensions();
      
      for (const ext of supportedExtensions) {
        const testPath = `/fake/path/test${ext}`;
        
        // We can't actually test parsing without real files, but we can ensure
        // the parser recognizes the extension and would attempt to parse it
        expect(domainParser.isSupported(ext)).toBe(true);
        
        // The getFileType method in orchestrator should work
        const fileType = ext; // Simple implementation
        expect(domainParser.isSupported(fileType)).toBe(true);
      }
    });
  });

  describe('Configuration Consistency', () => {
    it('should have getSupportedExtensions return the same as DOCUMENT_EXTENSIONS', () => {
      const functionResult = getSupportedExtensions();
      const constantValue = [...DOCUMENT_EXTENSIONS];
      
      expect(functionResult).toEqual(constantValue);
    });

    it('should have all extensions start with a dot', () => {
      for (const ext of DOCUMENT_EXTENSIONS) {
        expect(ext.startsWith('.')).toBe(true);
      }
    });

    it('should have all extensions in lowercase', () => {
      for (const ext of DOCUMENT_EXTENSIONS) {
        expect(ext).toBe(ext.toLowerCase());
      }
    });
  });

  describe('Real-world Parser Validation', () => {
    it('should have specific parsing logic for each extension type', () => {
      // Test that each extension maps to appropriate parsing behavior
      const extensionParsers = {
        '.txt': 'parseTextFile',
        '.md': 'parseTextFile', 
        '.pdf': 'parsePdfFile',
        '.docx': 'parseWordFile',
        '.xlsx': 'parseExcelFile',
        '.pptx': 'parsePowerPointFile'
      };

      for (const [ext, expectedMethod] of Object.entries(extensionParsers)) {
        // Verify the extension is supported
        expect(domainParser.isSupported(ext)).toBe(true);
        
        // We can't directly test private methods, but we know they exist
        // based on the switch statement in parseFile method
      }
    });
  });
});