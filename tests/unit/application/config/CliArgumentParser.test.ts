/**
 * Tests for CLI Argument Parser
 */

import { describe, it, expect } from 'vitest';
import { CliArgumentParser } from '../../../../src/application/config/CliArgumentParser.js';

describe('CliArgumentParser', () => {
  describe('parse', () => {
    it('should parse basic folder path', () => {
      const result = CliArgumentParser.parse(['node', 'script.js', '/path/to/folder']);
      
      expect(result.errors).toEqual([]);
      expect(result.showHelp).toBe(false);
      expect(result.args.folderPath).toBe('/path/to/folder');
      expect(result.args.theme).toBeUndefined();
    });

    it('should parse theme override with folder path', () => {
      const result = CliArgumentParser.parse(['node', 'script.js', '--theme', 'dark', '/path/to/folder']);
      
      expect(result.errors).toEqual([]);
      expect(result.showHelp).toBe(false);
      expect(result.args.folderPath).toBe('/path/to/folder');
      expect(result.args.theme).toBe('dark');
    });

    it('should parse theme override with folder path in different order', () => {
      const result = CliArgumentParser.parse(['node', 'script.js', '/path/to/folder', '--theme', 'light']);
      
      expect(result.errors).toEqual([]);
      expect(result.showHelp).toBe(false);
      expect(result.args.folderPath).toBe('/path/to/folder');
      expect(result.args.theme).toBe('light');
    });

    it('should handle all valid theme values', () => {
      const themes = ['auto', 'light', 'dark', 'light-optimized', 'dark-optimized', 'default', 'minimal'];
      
      themes.forEach(theme => {
        const result = CliArgumentParser.parse(['node', 'script.js', '--theme', theme, '/path/to/folder']);
        
        expect(result.errors).toEqual([]);
        expect(result.args.theme).toBe(theme);
      });
    });

    it('should show help when --help is provided', () => {
      const result = CliArgumentParser.parse(['node', 'script.js', '--help']);
      
      expect(result.showHelp).toBe(true);
      expect(result.args.help).toBe(true);
    });

    it('should show help when -h is provided', () => {
      const result = CliArgumentParser.parse(['node', 'script.js', '-h']);
      
      expect(result.showHelp).toBe(true);
      expect(result.args.help).toBe(true);
    });

    it('should error on invalid theme value', () => {
      const result = CliArgumentParser.parse(['node', 'script.js', '--theme', 'invalid', '/path/to/folder']);
      
      expect(result.errors).toContain('Invalid theme value: invalid. Must be one of: auto, light, dark, light-optimized, dark-optimized, default, minimal');
      expect(result.args.folderPath).toBe('/path/to/folder');
    });

    it('should error when --theme has no value', () => {
      const result = CliArgumentParser.parse(['node', 'script.js', '--theme']);
      
      expect(result.errors).toContain('--theme requires a value (auto, light, dark, light-optimized, dark-optimized, default, or minimal)');
    });

    it('should error on unknown option', () => {
      const result = CliArgumentParser.parse(['node', 'script.js', '--unknown', '/path/to/folder']);
      
      expect(result.errors).toContain('Unknown option: --unknown');
      expect(result.args.folderPath).toBe('/path/to/folder');
    });

    it('should error on multiple folder paths', () => {
      const result = CliArgumentParser.parse(['node', 'script.js', '/path/1', '/path/2']);
      
      expect(result.errors).toContain('Multiple folder paths specified: /path/1 and /path/2');
    });
  });

  describe('validate', () => {
    it('should pass validation with folder path', () => {
      const errors = CliArgumentParser.validate({ folderPath: '/path/to/folder' });
      expect(errors).toEqual([]);
    });

    it('should pass validation when help is requested', () => {
      const errors = CliArgumentParser.validate({ help: true });
      expect(errors).toEqual([]);
    });

    it('should fail validation without folder path and no help', () => {
      const errors = CliArgumentParser.validate({});
      expect(errors).toContain('Folder path is required');
    });
  });

  describe('getHelpText', () => {
    it('should return help text', () => {
      const help = CliArgumentParser.getHelpText();
      
      expect(help).toContain('Usage: folder-mcp [options] <folder-path>');
      expect(help).toContain('--theme <theme>');
      expect(help).toContain('Examples:');
      expect(help).toContain('folder-mcp --theme dark');
    });
  });
});