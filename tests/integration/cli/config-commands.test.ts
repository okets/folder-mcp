/**
 * Integration tests for Config CLI Commands
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestUtils } from '../../helpers/test-utils.js';
import { SimpleConfigCommand } from '../../../src/interfaces/cli/commands/simple-config.js';
import { join } from 'path';
import { writeFileSync, readFileSync, existsSync } from 'fs';

describe('Config CLI Commands Integration', () => {
  let tempDir: string;
  let originalCwd: string;
  let configCommand: SimpleConfigCommand;
  let outputs: string[] = [];

  const originalLog = console.log;
  const originalError = console.error;
  const originalExit = process.exit;
  
  beforeEach(async () => {
    tempDir = await TestUtils.createTempDir('config-cli-test-');
    originalCwd = process.cwd();
    process.chdir(tempDir);
    
    // Create default config files
    const configDefaults = `theme: auto
performance:
  batchSize: 32
development:
  enabled: false`;
    writeFileSync('config-defaults.yaml', configDefaults);
    
    // Initialize command
    configCommand = new SimpleConfigCommand();
    
    // Capture console output
    outputs = [];
    console.log = (...args: any[]) => {
      outputs.push(args.join(' '));
    };
    console.error = (...args: any[]) => {
      outputs.push('ERROR: ' + args.join(' '));
    };
    
    // Mock process.exit to prevent test termination
    (process.exit as any) = vi.fn((code: number) => {
      throw new Error(`process.exit(${code})`);
    });
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await TestUtils.cleanupTempDir(tempDir);
    
    // Restore console and process.exit
    console.log = originalLog;
    console.error = originalError;
    process.exit = originalExit;
  });

  describe('Theme Commands', () => {
    it('should get current theme', async () => {
      const command = configCommand.getCommand();
      await command.parseAsync(['node', 'test', 'theme']);
      
      const themeOutput = outputs.find(o => o.includes('Current theme:'));
      expect(themeOutput).toBeDefined();
      expect(themeOutput).toContain('auto');
    });

    it('should set theme', async () => {
      const command = configCommand.getCommand();
      await command.parseAsync(['node', 'test', 'theme', 'dark']);
      
      expect(outputs.some(o => o.includes('Theme set to: dark'))).toBe(true);
      
      // Verify it was saved
      const config = readFileSync('config.yaml', 'utf8');
      expect(config).toContain('theme: dark');
    });

    it('should reject invalid theme', async () => {
      const command = configCommand.getCommand();
      
      try {
        await command.parseAsync(['node', 'test', 'theme', 'invalid']);
      } catch (e) {
        // Expected to throw
      }
      
      expect(outputs.some(o => o.includes('Invalid theme: invalid'))).toBe(true);
    });
  });

  describe('General Config Commands', () => {
    it('should show all configuration', async () => {
      // Set a theme first
      writeFileSync('config.yaml', 'theme: light');
      
      const command = configCommand.getCommand();
      await command.parseAsync(['node', 'test', 'show']);
      
      expect(outputs.some(o => o.includes('Current Configuration'))).toBe(true);
      expect(outputs.some(o => o.includes('theme: light'))).toBe(true);
    });

    it('should get specific config value', async () => {
      writeFileSync('config.yaml', 'theme: dark');
      
      const command = configCommand.getCommand();
      await command.parseAsync(['node', 'test', 'get', 'theme']);
      
      expect(outputs).toContain('dark');
    });

    it('should set config value', async () => {
      const command = configCommand.getCommand();
      await command.parseAsync(['node', 'test', 'set', 'theme', 'light']);
      
      expect(outputs.some(o => o.includes('Set theme = light'))).toBe(true);
      
      // Verify saved
      const config = readFileSync('config.yaml', 'utf8');
      expect(config).toContain('theme: light');
    });
  });

  describe('Validation', () => {
    it('should validate valid configuration', async () => {
      writeFileSync('config.yaml', 'theme: dark');
      
      const command = configCommand.getCommand();
      await command.parseAsync(['node', 'test', 'validate']);
      
      expect(outputs.some(o => o.includes('Configuration is valid'))).toBe(true);
    });

    it('should detect invalid configuration', async () => {
      // First set a valid theme, then try to set invalid one through CLI
      writeFileSync('config.yaml', 'theme: dark');
      const command = configCommand.getCommand();
      
      // Clear outputs before the test
      outputs = [];
      
      try {
        await command.parseAsync(['node', 'test', 'theme', 'invalid']);
      } catch (e) {
        // Expected to throw
      }
      
      expect(outputs.some(o => o.includes('Invalid theme: invalid'))).toBe(true);
    });
  });

  describe('Reset Command', () => {
    it('should warn without confirm flag', async () => {
      writeFileSync('config.yaml', 'theme: dark');
      
      const command = configCommand.getCommand();
      await command.parseAsync(['node', 'test', 'reset']);
      
      expect(outputs.some(o => o.includes('This will reset your configuration'))).toBe(true);
      expect(existsSync('config.yaml')).toBe(true); // Should still exist
    });

    it('should reset with confirm flag', async () => {
      writeFileSync('config.yaml', 'theme: dark');
      
      const command = configCommand.getCommand();
      await command.parseAsync(['node', 'test', 'reset', '--confirm']);
      
      expect(outputs.some(o => o.includes('Configuration reset to defaults'))).toBe(true);
      expect(existsSync('config.yaml')).toBe(false); // Should be deleted
    });
  });
});