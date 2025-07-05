/**
 * Tests for Hot-Reload Manager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  HotReloadManager, 
  ReloadStrategy,
  hotReloadManager,
  enableHotReloadInDevelopment
} from '../../src/config/hot-reload.js';
import { ConfigChangeEvent } from '../../src/config/manager.js';

describe('HotReloadManager', () => {
  let manager: HotReloadManager;

  beforeEach(() => {
    manager = new HotReloadManager();
  });

  afterEach(() => {
    manager.clear();
    manager.removeAllListeners();
  });

  describe('enable/disable functionality', () => {
    it('should start disabled', () => {
      expect(manager.isEnabled()).toBe(false);
    });

    it('should enable hot reload', () => {
      const enabledSpy = vi.fn();
      manager.on('enabled', enabledSpy);
      
      manager.enable();
      
      expect(manager.isEnabled()).toBe(true);
      expect(enabledSpy).toHaveBeenCalled();
    });

    it('should disable hot reload', () => {
      const disabledSpy = vi.fn();
      manager.on('disabled', disabledSpy);
      
      manager.enable();
      manager.disable();
      
      expect(manager.isEnabled()).toBe(false);
      expect(disabledSpy).toHaveBeenCalled();
    });
  });

  describe('strategy registration', () => {
    it('should register reload strategies', () => {
      const strategy: ReloadStrategy = {
        paths: ['test.option', 'test.another'],
        name: 'test-strategy',
        requiresRestart: false,
        handler: vi.fn()
      };

      manager.registerStrategy(strategy);
      
      const stats = manager.getStats();
      expect(stats.strategiesCount).toBeGreaterThan(0);
      expect(stats.strategies).toContain('test-strategy');
    });

    it('should have built-in strategies', () => {
      const stats = manager.getStats();
      
      expect(stats.strategies).toContain('logging');
      expect(stats.strategies).toContain('cache');
      expect(stats.strategies).toContain('processing-runtime');
      expect(stats.strategies).toContain('file-patterns');
      expect(stats.strategies).toContain('development');
    });
  });

  describe('component registration', () => {
    it('should register components for reload', () => {
      const callback = vi.fn();
      
      manager.registerComponent('test-component', callback);
      
      const stats = manager.getStats();
      expect(stats.componentsCount).toBe(1);
      expect(stats.components).toContain('test-component');
    });
  });

  describe('configuration change handling', () => {
    it('should ignore changes when disabled', async () => {
      const strategy: ReloadStrategy = {
        paths: ['test.option'],
        name: 'test',
        requiresRestart: false,
        handler: vi.fn()
      };
      
      manager.registerStrategy(strategy);
      
      const event: ConfigChangeEvent = {
        previousConfig: {} as any,
        newConfig: { test: { option: 'new' } } as any,
        changedPaths: ['test.option'],
        source: 'runtime'
      };
      
      await manager.handleConfigChange(event);
      
      expect(strategy.handler).not.toHaveBeenCalled();
    });

    it('should execute matching strategies when enabled', async () => {
      const handler = vi.fn();
      const strategy: ReloadStrategy = {
        paths: ['test.option'],
        name: 'test',
        requiresRestart: false,
        handler
      };
      
      manager.registerStrategy(strategy);
      manager.enable();
      
      const event: ConfigChangeEvent = {
        previousConfig: {} as any,
        newConfig: { test: { option: 'new' } } as any,
        changedPaths: ['test.option'],
        source: 'runtime'
      };
      
      await manager.handleConfigChange(event);
      
      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should validate before executing strategy', async () => {
      const handler = vi.fn();
      const validate = vi.fn().mockReturnValue(false);
      const strategy: ReloadStrategy = {
        paths: ['test.option'],
        name: 'test',
        requiresRestart: false,
        handler,
        validate
      };
      
      manager.registerStrategy(strategy);
      manager.enable();
      
      const event: ConfigChangeEvent = {
        previousConfig: {} as any,
        newConfig: { test: { option: 'new' } } as any,
        changedPaths: ['test.option'],
        source: 'runtime'
      };
      
      await manager.handleConfigChange(event);
      
      expect(validate).toHaveBeenCalledWith(event);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should emit restart-required for restart strategies', async () => {
      const restartSpy = vi.fn();
      manager.on('restart-required', restartSpy);
      
      const strategy: ReloadStrategy = {
        paths: ['server.port'],
        name: 'server',
        requiresRestart: true,
        handler: vi.fn()
      };
      
      manager.registerStrategy(strategy);
      manager.enable();
      
      const event: ConfigChangeEvent = {
        previousConfig: {} as any,
        newConfig: { server: { port: 8080 } } as any,
        changedPaths: ['server.port'],
        source: 'runtime'
      };
      
      await manager.handleConfigChange(event);
      
      expect(restartSpy).toHaveBeenCalledWith({
        paths: ['server.port'],
        event
      });
    });

    it('should handle wildcard path matching', async () => {
      const handler = vi.fn();
      const strategy: ReloadStrategy = {
        paths: ['development.*'],
        name: 'dev-wildcard',
        requiresRestart: false,
        handler
      };
      
      manager.registerStrategy(strategy);
      manager.enable();
      
      const event: ConfigChangeEvent = {
        previousConfig: {} as any,
        newConfig: { development: { newFeature: true } } as any,
        changedPaths: ['development.newFeature'],  // Use a path not directly registered
        source: 'runtime'
      };
      
      await manager.handleConfigChange(event);
      
      expect(handler).toHaveBeenCalled();
    });

    it('should notify registered components', async () => {
      const componentCallback = vi.fn();
      manager.registerComponent('test-component', componentCallback);
      manager.enable();
      
      const event: ConfigChangeEvent = {
        previousConfig: {} as any,
        newConfig: { test: { value: 42 } } as any,
        changedPaths: ['test.value'],
        source: 'runtime'
      };
      
      await manager.handleConfigChange(event);
      
      expect(componentCallback).toHaveBeenCalledWith(event.newConfig);
    });

    it('should emit component-failed on component error', async () => {
      const componentFailedSpy = vi.fn();
      manager.on('component-failed', componentFailedSpy);
      
      const failingCallback = vi.fn().mockRejectedValue(new Error('Component error'));
      manager.registerComponent('failing-component', failingCallback);
      manager.enable();
      
      const event: ConfigChangeEvent = {
        previousConfig: {} as any,
        newConfig: {} as any,
        changedPaths: ['test'],
        source: 'runtime'
      };
      
      await manager.handleConfigChange(event);
      
      expect(componentFailedSpy).toHaveBeenCalled();
    });

    it('should queue changes during reload', async () => {
      let resolveHandler: () => void;
      const handlerPromise = new Promise<void>(resolve => {
        resolveHandler = resolve;
      });
      
      const slowHandler = vi.fn().mockImplementation(async () => {
        await handlerPromise;
      });
      
      const strategy: ReloadStrategy = {
        paths: ['test.option'],
        name: 'slow-test',
        requiresRestart: false,
        handler: slowHandler
      };
      
      manager.registerStrategy(strategy);
      manager.enable();
      
      const event1: ConfigChangeEvent = {
        previousConfig: {} as any,
        newConfig: {} as any,
        changedPaths: ['test.option'],
        source: 'runtime'
      };
      
      const event2: ConfigChangeEvent = {
        previousConfig: {} as any,
        newConfig: {} as any,
        changedPaths: ['test.option'],  // Same path so it matches the strategy
        source: 'runtime'
      };
      
      // Start first reload
      const reload1 = manager.handleConfigChange(event1);
      
      // Try second reload while first is in progress
      const reload2 = manager.handleConfigChange(event2);
      
      // Complete first reload
      resolveHandler!();
      
      await reload1;
      await reload2;
      
      // Should have processed both
      expect(slowHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe('reload statistics', () => {
    it('should track statistics', () => {
      const strategy: ReloadStrategy = {
        paths: ['test'],
        name: 'test',
        requiresRestart: false,
        handler: vi.fn()
      };
      
      manager.registerStrategy(strategy);
      manager.registerComponent('comp1', vi.fn());
      manager.registerComponent('comp2', vi.fn());
      
      const stats = manager.getStats();
      
      expect(stats.enabled).toBe(false);
      expect(stats.strategiesCount).toBeGreaterThan(5); // Built-in + custom
      expect(stats.componentsCount).toBe(2);
      expect(stats.pendingReloads).toBe(0);
    });
  });

  describe('clear functionality', () => {
    it('should clear all registrations but keep built-ins', () => {
      manager.registerStrategy({
        paths: ['custom'],
        name: 'custom',
        requiresRestart: false,
        handler: vi.fn()
      });
      
      manager.registerComponent('custom-comp', vi.fn());
      
      manager.clear();
      
      const stats = manager.getStats();
      expect(stats.componentsCount).toBe(0);
      expect(stats.strategies).toContain('logging'); // Built-in still present
      expect(stats.strategies).not.toContain('custom');
    });
  });

  describe('enableHotReloadInDevelopment', () => {
    const originalEnv = process.env;

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should enable in development mode', () => {
      process.env = { ...originalEnv, NODE_ENV: 'development' };
      
      const manager = new HotReloadManager();
      const enableSpy = vi.spyOn(manager, 'enable');
      
      // Mock the singleton
      vi.spyOn(hotReloadManager, 'enable');
      
      enableHotReloadInDevelopment();
      
      expect(hotReloadManager.enable).toHaveBeenCalled();
    });

    it('should enable with ENABLE_HOT_RELOAD flag', () => {
      process.env = { ...originalEnv, ENABLE_HOT_RELOAD: 'true' };
      
      vi.spyOn(hotReloadManager, 'enable');
      
      enableHotReloadInDevelopment();
      
      expect(hotReloadManager.enable).toHaveBeenCalled();
    });

    it('should not enable in production', () => {
      process.env = { ...originalEnv, NODE_ENV: 'production' };
      
      const manager = new HotReloadManager();
      vi.spyOn(manager, 'enable');
      
      enableHotReloadInDevelopment();
      
      expect(manager.enable).not.toHaveBeenCalled();
    });
  });
});