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
      const result = CliArgumentParser.parse(['node', 'script.js', '--theme', 'dracula', '/path/to/folder']);

      expect(result.errors).toEqual([]);
      expect(result.showHelp).toBe(false);
      expect(result.args.folderPath).toBe('/path/to/folder');
      expect(result.args.theme).toBe('dracula');
    });

    it('should parse theme override with folder path in different order', () => {
      const result = CliArgumentParser.parse(['node', 'script.js', '/path/to/folder', '--theme', 'light']);

      expect(result.errors).toEqual([]);
      expect(result.showHelp).toBe(false);
      expect(result.args.folderPath).toBe('/path/to/folder');
      expect(result.args.theme).toBe('light');
    });

    it('should handle all valid theme values', () => {
      // Current valid themes from ThemeContext
      const themes = [
        'default', 'light', 'minimal',  // Core
        'high-contrast', 'colorblind',   // Accessibility
        'ocean', 'forest', 'sunset',     // Nature
        'dracula', 'nord', 'monokai', 'solarized', 'gruvbox',  // Classic Editor
        'bbs', 'cga', 'matrix'           // Retro
      ];

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

      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toContain('Invalid theme value: invalid');
      expect(result.errors[0]).toContain('Must be one of:');
      expect(result.args.folderPath).toBe('/path/to/folder');
    });

    it('should error when --theme has no value', () => {
      const result = CliArgumentParser.parse(['node', 'script.js', '--theme']);

      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toContain('--theme requires a value');
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

    it('should pass validation without folder path (daemon mode)', () => {
      // Phase 9: folder path is now optional - daemon mode doesn't require it
      const errors = CliArgumentParser.validate({});
      expect(errors).toEqual([]);
    });
  });

  describe('getHelpText', () => {
    it('should return help text', () => {
      const help = CliArgumentParser.getHelpText();

      // Phase 9: folder path is now optional - shown with brackets
      expect(help).toContain('Usage: folder-mcp [options] [folder-path]');
      expect(help).toContain('--theme <theme>');
      expect(help).toContain('Examples:');
      expect(help).toContain('folder-mcp --theme dracula');  // Updated to current theme
      expect(help).toContain('Connect to daemon for multi-folder support');
    });
  });
});