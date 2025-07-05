/**
 * PID Manager - Infrastructure Layer
 * 
 * Handles PID file management for daemon processes.
 * Provides atomic operations and proper error handling.
 */

import { promises as fs } from 'fs';
import { dirname } from 'path';
import { IPidManager } from '../../domain/daemon/interfaces.js';

/**
 * Node.js PID manager implementation
 */
export class NodePidManager implements IPidManager {
  constructor(
    private logger: { info: (msg: string) => void; error: (msg: string, error?: Error) => void; warn: (msg: string) => void; debug: (msg: string) => void; }
  ) {}

  /**
   * Write PID to file atomically
   */
  async writePidFile(path: string, pid: number): Promise<void> {
    try {
      // Ensure directory exists
      const dir = dirname(path);
      await fs.mkdir(dir, { recursive: true });

      // Check if PID file already exists
      try {
        const existingPid = await this.readPidFile(path);
        if (this.isProcessRunning(existingPid)) {
          throw new Error(`PID file ${path} already exists with running process ${existingPid}`);
        } else {
          this.logger.warn(`Removing stale PID file ${path} (process ${existingPid} not running)`);
          await this.removePidFile(path);
        }
      } catch (error) {
        // PID file doesn't exist or is invalid, which is fine
        if ((error as any).code !== 'ENOENT') {
          // Some other error occurred
          this.logger.debug(`Error checking existing PID file: ${(error as Error).message}`);
        }
      }

      // Write PID atomically by writing to temp file first
      const tempPath = `${path}.tmp`;
      await fs.writeFile(tempPath, pid.toString(), 'utf8');
      await fs.rename(tempPath, path);

      this.logger.debug(`PID ${pid} written to ${path}`);

    } catch (error) {
      this.logger.error(`Failed to write PID file ${path}:`, error as Error);
      throw error;
    }
  }

  /**
   * Read PID from file
   */
  async readPidFile(path: string): Promise<number> {
    try {
      const content = await fs.readFile(path, 'utf8');
      const pid = parseInt(content.trim(), 10);
      
      if (isNaN(pid) || pid <= 0) {
        throw new Error(`Invalid PID in file ${path}: ${content.trim()}`);
      }

      return pid;

    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        throw new Error(`PID file ${path} does not exist`);
      }
      this.logger.error(`Failed to read PID file ${path}:`, error as Error);
      throw error;
    }
  }

  /**
   * Remove PID file
   */
  async removePidFile(path: string): Promise<void> {
    try {
      await fs.unlink(path);
      this.logger.debug(`PID file ${path} removed`);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        // File doesn't exist, which is fine
        this.logger.debug(`PID file ${path} already removed`);
        return;
      }
      this.logger.error(`Failed to remove PID file ${path}:`, error as Error);
      throw error;
    }
  }

  /**
   * Check if process with PID is running
   */
  isProcessRunning(pid: number): boolean {
    try {
      // Signal 0 doesn't kill the process, just checks if it exists
      process.kill(pid, 0);
      return true;
    } catch (error) {
      // ESRCH means process doesn't exist
      // EPERM means process exists but we don't have permission to signal it (still running)
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'EPERM') {
        return true; // Process exists but we can't signal it
      }
      return false; // Process doesn't exist
    }
  }

  /**
   * Check if PID file exists and process is running
   */
  async isValidPidFile(path: string): Promise<boolean> {
    try {
      const pid = await this.readPidFile(path);
      return this.isProcessRunning(pid);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get PID from file if valid, otherwise return null
   */
  async getValidPid(path: string): Promise<number | null> {
    try {
      const pid = await this.readPidFile(path);
      if (this.isProcessRunning(pid)) {
        return pid;
      } else {
        this.logger.warn(`PID file ${path} contains dead process ${pid}, removing`);
        await this.removePidFile(path);
        return null;
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Clean up stale PID files
   */
  async cleanupStalePidFiles(paths: string[]): Promise<void> {
    for (const path of paths) {
      try {
        const isValid = await this.isValidPidFile(path);
        if (!isValid) {
          await this.removePidFile(path);
          this.logger.info(`Removed stale PID file: ${path}`);
        }
      } catch (error) {
        this.logger.warn(`Error cleaning up PID file ${path}: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Wait for process to exit
   */
  async waitForProcessExit(pid: number, timeout: number = 10000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (!this.isProcessRunning(pid)) {
        return true;
      }
      
      // Wait 100ms before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return false; // Timeout reached
  }

  /**
   * Get process information (if available)
   */
  getProcessInfo(pid: number): { pid: number; exists: boolean; startTime?: Date } {
    const exists = this.isProcessRunning(pid);
    
    // Note: Getting process start time would require platform-specific code
    // This is a simplified version
    return {
      pid,
      exists
    };
  }
}

/**
 * Windows-specific PID manager
 */
export class WindowsPidManager extends NodePidManager {
  constructor(logger: any) {
    super(logger);
  }

  /**
   * Windows-specific process check using tasklist
   */
  isProcessRunning(pid: number): boolean {
    try {
      // Use the parent implementation first
      const basicCheck = super.isProcessRunning(pid);
      if (!basicCheck) {
        return false;
      }

      // Windows-specific additional verification could go here
      // For now, rely on the basic check
      return true;

    } catch (error) {
      return false;
    }
  }
}

/**
 * Unix-specific PID manager
 */
export class UnixPidManager extends NodePidManager {
  constructor(logger: any) {
    super(logger);
  }

  /**
   * Unix-specific process check with /proc filesystem
   */
  isProcessRunning(pid: number): boolean {
    try {
      // Use the parent implementation first
      const basicCheck = super.isProcessRunning(pid);
      if (!basicCheck) {
        return false;
      }

      // Unix-specific verification using /proc
      try {
        require('fs').accessSync(`/proc/${pid}`, require('fs').constants.F_OK);
        return true;
      } catch {
        // /proc not available or process doesn't exist
        return basicCheck;
      }

    } catch (error) {
      return false;
    }
  }

  /**
   * Get process start time from /proc (Unix only)
   */
  getProcessInfo(pid: number): { pid: number; exists: boolean; startTime?: Date } {
    const basicInfo = super.getProcessInfo(pid);
    
    if (!basicInfo.exists) {
      return basicInfo;
    }

    try {
      // Try to get start time from /proc/pid/stat
      const fs = require('fs');
      const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
      const fields = stat.split(' ');
      
      // Field 22 is starttime in clock ticks since boot
      const starttime = parseInt(fields[21], 10);
      
      if (!isNaN(starttime)) {
        // Convert to actual date (this is simplified)
        // Real implementation would need to account for system boot time and clock ticks
        basicInfo.startTime = new Date(Date.now() - starttime * 10); // Approximation
      }
    } catch (error) {
      // /proc not available or other error, use basic info
    }

    return basicInfo;
  }
}

/**
 * Factory function to create platform-appropriate PID manager
 */
export function createPidManager(logger: any): IPidManager {
  if (process.platform === 'win32') {
    return new WindowsPidManager(logger);
  } else {
    return new UnixPidManager(logger);
  }
}