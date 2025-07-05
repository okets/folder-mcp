/**
 * Simple System Monitor - Infrastructure Layer
 * 
 * Minimal system resource monitoring implementation.
 * Uses process.memoryUsage() and simple heuristics.
 */

import { ISystemMonitor } from '../../domain/daemon/interfaces.js';

/**
 * Simple system monitor implementation
 */
export class SimpleSystemMonitor implements ISystemMonitor {
  constructor(
    private logger: { info: (msg: string) => void; error: (msg: string, error?: Error) => void; warn: (msg: string) => void; debug: (msg: string) => void; }
  ) {}

  /**
   * Get CPU usage percentage (simplified)
   */
  async getCpuUsage(): Promise<{ user: number; system: number; total: number }> {
    try {
      // Simple implementation using process.cpuUsage()
      const cpuUsage = process.cpuUsage();
      const user = cpuUsage.user / 1000000; // Convert to seconds
      const system = cpuUsage.system / 1000000; // Convert to seconds
      const total = user + system;
      
      return { user, system, total };
    } catch (error) {
      this.logger.error('Failed to get CPU usage:', error as Error);
      return { user: 0, system: 0, total: 0 };
    }
  }

  /**
   * Get memory usage information
   */
  async getMemoryUsage(): Promise<{ rss: number; heapUsed: number; heapTotal: number; external: number }> {
    try {
      const memUsage = process.memoryUsage();
      return {
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external
      };
    } catch (error) {
      this.logger.error('Failed to get memory usage:', error as Error);
      return { rss: 0, heapUsed: 0, heapTotal: 0, external: 0 };
    }
  }

  /**
   * Get system load averages
   */
  async getLoadAverages(): Promise<{ load1: number; load5: number; load15: number }> {
    try {
      const os = require('os');
      const loadavg = os.loadavg();
      
      return {
        load1: loadavg[0] || 0,
        load5: loadavg[1] || 0,
        load15: loadavg[2] || 0
      };
    } catch (error) {
      this.logger.error('Failed to get load averages:', error as Error);
      return { load1: 0, load5: 0, load15: 0 };
    }
  }

  /**
   * Get disk usage for a path (simplified)
   */
  async getDiskUsage(path: string): Promise<{ used: number; free: number; total: number }> {
    try {
      // Simplified implementation - in a real system this would use fs.stat or similar
      return { used: 0, free: 1000000000, total: 1000000000 };
    } catch (error) {
      this.logger.error(`Failed to get disk usage for ${path}:`, error as Error);
      return { used: 0, free: 0, total: 0 };
    }
  }

  /**
   * Get system uptime
   */
  async getSystemUptime(): Promise<number> {
    try {
      const os = require('os');
      return os.uptime() * 1000; // Convert to milliseconds
    } catch (error) {
      this.logger.error('Failed to get system uptime:', error as Error);
      return 0;
    }
  }
}