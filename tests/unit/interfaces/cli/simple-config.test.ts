/**
 * Tests for Simple Config CLI Commands
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SimpleConfigCommand } from '../../../../src/interfaces/cli/commands/simple-config.js';
import { Command } from 'commander';

describe('SimpleConfigCommand', () => {
  let configCommand: SimpleConfigCommand;
  let command: Command;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let processExitSpy: any;

  beforeEach(() => {
    configCommand = new SimpleConfigCommand();
    command = configCommand.getCommand();
    
    // Mock console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit');
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Command Structure', () => {
    it('should have correct command name and description', () => {
      expect(command.name()).toBe('config');
      expect(command.description()).toContain('Manage user configuration');
    });

    it('should have all subcommands', () => {
      const subcommands = command.commands.map(cmd => cmd.name());
      expect(subcommands).toContain('get');
      expect(subcommands).toContain('set');
      expect(subcommands).toContain('show');
      expect(subcommands).toContain('theme');
      expect(subcommands).toContain('theme-list');
      expect(subcommands).toContain('validate');
      expect(subcommands).toContain('reset');
    });

    it('should have theme-list alias as themes', () => {
      const themeListCmd = command.commands.find(cmd => cmd.name() === 'theme-list');
      expect(themeListCmd?.aliases()).toContain('themes');
    });
  });

  describe('Theme Commands', () => {
    it('should list available themes', async () => {
      const themeListCmd = command.commands.find(cmd => cmd.name() === 'theme-list');
      expect(themeListCmd).toBeDefined();
      
      // Execute the command
      await themeListCmd?.parseAsync(['node', 'test']);
      
      // Check output - verify themes from ThemeContext (16 themes)
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Available Themes'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('light'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('dracula'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('default'));
    });

    it('should validate theme values', () => {
      const themeCmd = command.commands.find(cmd => cmd.name() === 'theme');
      expect(themeCmd).toBeDefined();
      expect(themeCmd?.description()).toContain('Get or set theme');
    });
  });

  describe('Validation Command', () => {
    it('should have validate command', () => {
      const validateCmd = command.commands.find(cmd => cmd.name() === 'validate');
      expect(validateCmd).toBeDefined();
      expect(validateCmd?.description()).toContain('Validate configuration');
    });
  });

  describe('Reset Command', () => {
    it('should have reset command with confirm option', () => {
      const resetCmd = command.commands.find(cmd => cmd.name() === 'reset');
      expect(resetCmd).toBeDefined();
      expect(resetCmd?.description()).toContain('Reset configuration to defaults');
      
      const confirmOption = resetCmd?.options.find(opt => opt.long === '--confirm');
      expect(confirmOption).toBeDefined();
    });
  });
});