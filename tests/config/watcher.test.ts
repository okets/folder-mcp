/**
 * Tests for Configuration Watcher
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigurationWatcher } from '../../src/config/watcher.js';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('ConfigurationWatcher', () => {
  let tempDir: string;
  let watcher: ConfigurationWatcher;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `watcher-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    if (watcher?.isRunning()) {
      await watcher.stop();
    }
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('basic functionality', () => {
    it('should create watcher instance', () => {
      watcher = new ConfigurationWatcher({
        paths: [tempDir],
        debounceDelay: 100
      });
      
      expect(watcher).toBeDefined();
      expect(watcher.isRunning()).toBe(false);
    });

    it('should start and stop watching', async () => {
      watcher = new ConfigurationWatcher({
        paths: [tempDir],
        debounceDelay: 100
      });

      await watcher.start();
      // Give it a moment to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(watcher.isRunning()).toBe(true);

      await watcher.stop();
      expect(watcher.isRunning()).toBe(false);
    });

    it('should handle stop when not running', async () => {
      watcher = new ConfigurationWatcher({
        paths: [tempDir]
      });

      // Should not throw
      await expect(watcher.stop()).resolves.toBeUndefined();
    });
  });

  describe('path management', () => {
    it('should throw when adding path without starting', async () => {
      watcher = new ConfigurationWatcher({
        paths: [tempDir]
      });

      await expect(watcher.addPath('/some/path')).rejects.toThrow('Watcher not started');
    });

    it('should throw when removing path without starting', async () => {
      watcher = new ConfigurationWatcher({
        paths: [tempDir]
      });

      await expect(watcher.removePath('/some/path')).rejects.toThrow('Watcher not started');
    });
  });

  describe('configuration options', () => {
    it('should accept various configuration options', () => {
      watcher = new ConfigurationWatcher({
        paths: [tempDir],
        ignored: ['*.tmp', '*.swp'],
        debounceDelay: 500,
        usePolling: true,
        interval: 200
      });

      expect(watcher).toBeDefined();
    });
  });

  describe('event emission', () => {
    it('should be an EventEmitter', () => {
      watcher = new ConfigurationWatcher({
        paths: [tempDir]
      });

      const callback = vi.fn();
      watcher.on('test', callback);
      watcher.emit('test', 'data');
      
      expect(callback).toHaveBeenCalledWith('data');
    });
  });
});