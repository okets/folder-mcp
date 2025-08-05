/**
 * Tests for DaemonRegistry service
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, unlinkSync } from 'fs';
import { DaemonRegistry, DaemonInfo } from '../../../src/daemon/registry/daemon-registry.js';

describe('DaemonRegistry', () => {
  const testDaemonInfo: DaemonInfo = {
    pid: process.pid,
    httpPort: 8765,
    wsPort: 8766,
    startTime: new Date().toISOString(),
    version: '1.0.0'
  };

  beforeEach(async () => {
    // Clean up any existing registry before each test
    await DaemonRegistry.cleanup();
  });

  afterEach(async () => {
    // Clean up registry after each test
    await DaemonRegistry.cleanup();
  });

  describe('register', () => {
    it('should register daemon info successfully', async () => {
      await DaemonRegistry.register(testDaemonInfo);
      
      expect(DaemonRegistry.registryExists()).toBe(true);
      
      const discovered = await DaemonRegistry.discover();
      expect(discovered).toEqual(testDaemonInfo);
    });

    it('should allow re-registration with same PID but different ports', async () => {
      // Register first daemon with current PID
      await DaemonRegistry.register(testDaemonInfo);
      
      // Try to register different daemon with same PID but different port
      const conflictingDaemon: DaemonInfo = {
        ...testDaemonInfo,
        httpPort: 9001,  // Different port, same PID
        wsPort: 9002
      };

      // This should succeed since it's the same PID (re-registration allowed)
      await expect(DaemonRegistry.register(conflictingDaemon)).resolves.not.toThrow();
      
      // Verify the ports were updated
      const discovered = await DaemonRegistry.discover();
      expect(discovered?.httpPort).toBe(9001);
    });

    it('should clean up stale registry when registering new daemon', async () => {
      // Create a stale registry entry with fake PID
      const staleInfo: DaemonInfo = {
        pid: 99999, // Very unlikely to be running
        httpPort: 8765,
        wsPort: 8766,
        startTime: new Date().toISOString()
      };

      // Manually write stale registry (bypass the registration validation)
      const registryPath = DaemonRegistry.getRegistryPath();
      require('fs').writeFileSync(registryPath, JSON.stringify(staleInfo, null, 2));
      
      // Try to register new daemon - should clean up stale entry and succeed
      await expect(DaemonRegistry.register(testDaemonInfo)).resolves.not.toThrow();
      
      // Verify the new daemon is registered
      const discovered = await DaemonRegistry.discover();
      expect(discovered?.pid).toBe(testDaemonInfo.pid);
    });

    it('should allow re-registration of same daemon PID', async () => {
      await DaemonRegistry.register(testDaemonInfo);
      
      const updatedInfo: DaemonInfo = {
        ...testDaemonInfo,
        httpPort: 9002, // Different port, same PID
        wsPort: 9003
      };

      await expect(DaemonRegistry.register(updatedInfo)).resolves.not.toThrow();
      
      const discovered = await DaemonRegistry.discover();
      expect(discovered?.httpPort).toBe(9002);
    });
  });

  describe('discover', () => {
    it('should return null when no registry exists', async () => {
      const discovered = await DaemonRegistry.discover();
      expect(discovered).toBeNull();
    });

    it('should return daemon info when registry exists and process running', async () => {
      await DaemonRegistry.register(testDaemonInfo);
      
      const discovered = await DaemonRegistry.discover();
      expect(discovered).toEqual(testDaemonInfo);
    });

    it('should clean up stale registry when process not running', async () => {
      const staleInfo: DaemonInfo = {
        pid: 99999, // Very unlikely to be a running process
        httpPort: 8765,
        wsPort: 8766,
        startTime: new Date().toISOString()
      };

      await DaemonRegistry.register(staleInfo);
      expect(DaemonRegistry.registryExists()).toBe(true);

      // Discovery should clean up stale entry
      const discovered = await DaemonRegistry.discover();
      expect(discovered).toBeNull();
      expect(DaemonRegistry.registryExists()).toBe(false);
    });

    it('should handle corrupted registry file', async () => {
      // Create corrupted registry file
      const registryPath = DaemonRegistry.getRegistryPath();
      require('fs').writeFileSync(registryPath, 'invalid json content');

      const discovered = await DaemonRegistry.discover();
      expect(discovered).toBeNull();
      expect(DaemonRegistry.registryExists()).toBe(false);
    });

    it('should handle incomplete daemon info', async () => {
      const registryPath = DaemonRegistry.getRegistryPath();
      require('fs').writeFileSync(registryPath, JSON.stringify({ pid: 123 })); // Missing required fields

      const discovered = await DaemonRegistry.discover();
      expect(discovered).toBeNull();
      expect(DaemonRegistry.registryExists()).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should remove registry file if it exists', async () => {
      await DaemonRegistry.register(testDaemonInfo);
      expect(DaemonRegistry.registryExists()).toBe(true);

      await DaemonRegistry.cleanup();
      expect(DaemonRegistry.registryExists()).toBe(false);
    });

    it('should not throw error if registry file does not exist', async () => {
      expect(DaemonRegistry.registryExists()).toBe(false);
      await expect(DaemonRegistry.cleanup()).resolves.not.toThrow();
    });
  });

  describe('isProcessRunning', () => {
    it('should return true for current process', async () => {
      const isRunning = await DaemonRegistry.isProcessRunning(process.pid);
      expect(isRunning).toBe(true);
    });

    it('should return false for non-existent process', async () => {
      const isRunning = await DaemonRegistry.isProcessRunning(99999);
      expect(isRunning).toBe(false);
    });
  });

  describe('utility methods', () => {
    it('should return correct registry path', () => {
      const path = DaemonRegistry.getRegistryPath();
      expect(path).toContain('.folder-mcp');
      expect(path).toContain('daemon.pid');
    });

    it('should correctly check registry existence', async () => {
      expect(DaemonRegistry.registryExists()).toBe(false);
      
      await DaemonRegistry.register(testDaemonInfo);
      expect(DaemonRegistry.registryExists()).toBe(true);
      
      await DaemonRegistry.cleanup();
      expect(DaemonRegistry.registryExists()).toBe(false);
    });
  });
});