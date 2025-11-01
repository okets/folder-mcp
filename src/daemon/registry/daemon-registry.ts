/**
 * Daemon Registry Service
 * 
 * Manages daemon auto-discovery through a registry file system.
 * Ensures only one daemon runs at a time and provides discovery for TUI clients.
 */

import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';


export interface DaemonInfo {
  pid: number;
  httpPort: number;
  wsPort: number;
  restPort?: number;  // REST API port for MCP operations
  startTime: string;
  version?: string;
  host?: string;      // Host address (defaults to 127.0.0.1)
}

/**
 * Daemon Registry for auto-discovery and singleton enforcement
 */
export class DaemonRegistry {
  private static readonly REGISTRY_DIR = join(homedir(), '.folder-mcp');
  private static readonly REGISTRY_FILE = join(DaemonRegistry.REGISTRY_DIR, 'daemon.pid');

  /**
   * Register a running daemon instance with strict singleton enforcement
   */
  static async register(daemonInfo: DaemonInfo): Promise<void> {
    try {

      // Ensure registry directory exists
      if (!existsSync(DaemonRegistry.REGISTRY_DIR)) {
        mkdirSync(DaemonRegistry.REGISTRY_DIR, { recursive: true });
      }

      // CRITICAL: Check for other daemon processes by scanning actual running processes
      // This prevents the race condition where both daemons write to the same file
      const runningDaemons = await DaemonRegistry.findRunningDaemonProcesses();
      const otherDaemons = runningDaemons.filter(pid => pid !== process.pid);


      if (otherDaemons.length > 0) {
        // Found other daemon processes - strict singleton violation
        const otherPid = otherDaemons[0];
        throw new Error(
          `Daemon already running (PID: ${otherPid}). ` +
          `Only one daemon instance is allowed. Use 'kill ${otherPid}' to stop the existing daemon.`
        );
      }

      // Also check registry file for additional safety
      const existing = await DaemonRegistry.discover();
      if (existing && existing.pid !== daemonInfo.pid) {
        // Check if existing daemon is still running
        if (await DaemonRegistry.isProcessRunning(existing.pid)) {
          throw new Error(
            `Daemon already running on port ${existing.httpPort} (PID: ${existing.pid}). ` +
            `Only one daemon instance is allowed.`
          );
        } else {
          // Clean up stale registry entry
          await DaemonRegistry.cleanup();
        }
      }

      // Write daemon info to registry file
      const registryData = JSON.stringify(daemonInfo, null, 2);
      writeFileSync(DaemonRegistry.REGISTRY_FILE, registryData, 'utf8');

    } catch (error) {
      throw error;
    }
  }

  /**
   * Find all running daemon processes by scanning process list
   */
  static async findRunningDaemonProcesses(): Promise<number[]> {
    const { spawn } = await import('child_process');
    const isWindows = process.platform === 'win32';

    return new Promise((resolve) => {
      if (isWindows) {
        // Use wmic on Windows to get command line information
        const wmic = spawn('wmic', ['process', 'where', 'name="node.exe"', 'get', 'commandline,processid'], {
          stdio: 'pipe',
          windowsHide: true  // Prevent terminal window from appearing
        });
        let output = '';

        wmic.stdout.on('data', (data) => {
          output += data.toString();
        });

        wmic.on('close', () => {
          const lines = output.split('\n');
          const daemonPids: number[] = [];

          for (const line of lines) {
            if (!line.trim()) continue;

            // Check for both forward and backward slashes to handle different scenarios
            const daemonPathWin = 'dist\\src\\daemon\\index.js';
            const daemonPathUnix = 'dist/src/daemon/index.js';
            if (line.includes(daemonPathWin) || line.includes(daemonPathUnix)) {
              // Extract PID from the line (last number in the line)
              const parts = line.trim().split(/\s+/);
              if (parts.length > 0) {
                const pidStr = parts[parts.length - 1];
                if (pidStr) {
                  const pid = parseInt(pidStr, 10);
                  if (!isNaN(pid)) {
                    daemonPids.push(pid);
                  }
                }
              }
            }
          }

          resolve(daemonPids);
        });

        wmic.on('error', () => {
          // Fallback to empty array if wmic fails
          resolve([]);
        });
      } else {
        // Unix-specific logic using ps
        const ps = spawn('ps', ['aux'], { stdio: 'pipe' });
        let output = '';

        ps.stdout.on('data', (data) => {
          output += data.toString();
        });

        ps.on('close', () => {
          const lines = output.split('\n');
          const daemonPids: number[] = [];

          for (const line of lines) {
            if (!line.trim()) continue;

            if (
              line.includes('dist/src/daemon/index.js') &&
              !line.includes('grep') &&
              !line.includes('/bin/sh') &&
              !line.includes('bash') &&
              !line.includes('/bin/zsh') &&
              !line.includes('eval') &&
              !line.includes('source')
            ) {
              const parts = line.trim().split(/\s+/);
              if (parts.length > 1 && parts[1]) {
                const pid = parseInt(parts[1], 10);
                if (!isNaN(pid)) {
                  daemonPids.push(pid);
                }
              }
            }
          }

          resolve(daemonPids);
        });
      }
    });
  }

  /**
   * Discover a running daemon instance
   */
  static async discover(): Promise<DaemonInfo | null> {
    try {
      if (!existsSync(DaemonRegistry.REGISTRY_FILE)) {
        return null;
      }

      const registryData = readFileSync(DaemonRegistry.REGISTRY_FILE, 'utf8');
      const daemonInfo: DaemonInfo = JSON.parse(registryData);

      // Validate required fields
      if (!daemonInfo.pid || !daemonInfo.httpPort || !daemonInfo.wsPort) {
        await DaemonRegistry.cleanup();
        return null;
      }

      // Check if daemon process is still running
      if (!await DaemonRegistry.isProcessRunning(daemonInfo.pid)) {
        await DaemonRegistry.cleanup();
        return null;
      }

      return daemonInfo;
    } catch (error) {
      // Clean up corrupted registry file
      await DaemonRegistry.cleanup();
      return null;
    }
  }

  /**
   * Clean up registry entry
   */
  static async cleanup(): Promise<void> {
    try {
      if (existsSync(DaemonRegistry.REGISTRY_FILE)) {
        unlinkSync(DaemonRegistry.REGISTRY_FILE);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  /**
   * Check if a process is still running
   */
  static async isProcessRunning(pid: number): Promise<boolean> {
    try {
      // On Unix-like systems, process.kill(pid, 0) checks if process exists without killing it
      // On Windows, this approach also works
      process.kill(pid, 0);
      return true;
    } catch (error) {
      // ESRCH means process doesn't exist
      // EPERM means process exists but no permission (still running)
      if ((error as NodeJS.ErrnoException).code === 'ESRCH') {
        return false;
      }
      // If we get EPERM, the process is running but we don't have permission to signal it
      // This is fine for our purposes - the process exists
      return true;
    }
  }

  /**
   * Get registry file path (for testing)
   */
  static getRegistryPath(): string {
    return DaemonRegistry.REGISTRY_FILE;
  }

  /**
   * Check if registry file exists
   */
  static registryExists(): boolean {
    return existsSync(DaemonRegistry.REGISTRY_FILE);
  }
}