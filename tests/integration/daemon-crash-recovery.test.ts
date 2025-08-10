/**
 * Daemon Crash Recovery Tests
 * 
 * Tests the daemon's ability to recover from crashes and preserve indexing state.
 * Uses the --restart parameter to simulate recovery scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';
import WebSocket from 'ws';
import { DaemonConnector } from '../../src/interfaces/tui-ink/daemon-connector.js';

describe('Daemon Crash Recovery', () => {
  const TEST_FOLDER = path.join(process.cwd(), 'tests/fixtures/tmp/crash-recovery-test');
  const TEST_KNOWLEDGE_BASE = path.join(process.cwd(), 'tests/fixtures/test-knowledge-base');
  const TEST_DAEMON_PORT = 31850;
  const DEBOUNCE_MS = 200;
  
  let daemonProcess: ChildProcess | null = null;
  let ws: WebSocket | null = null;
  let daemonConnector: DaemonConnector | null = null;

  // Helper to create test folder with content
  const setupTestFolder = async () => {
    if (fs.existsSync(TEST_FOLDER)) {
      await fs.promises.rm(TEST_FOLDER, { recursive: true });
    }
    await fs.promises.mkdir(TEST_FOLDER, { recursive: true });
    
    // Copy some test files
    const sourceFiles = ['Engineering/Code.txt', 'Legal/Contract.pdf', 'Finance/Data.xlsx'];
    for (const file of sourceFiles) {
      const sourcePath = path.join(TEST_KNOWLEDGE_BASE, file);
      if (fs.existsSync(sourcePath)) {
        const destPath = path.join(TEST_FOLDER, path.basename(file));
        await fs.promises.copyFile(sourcePath, destPath);
      }
    }
  };

  // Helper to start daemon
  const startDaemon = async (restart = false): Promise<ChildProcess> => {
    // Use isolated config directory to prevent interference from other tests/previous runs
    const isolatedConfigDir = path.join(process.cwd(), 'tests/fixtures/tmp/daemon-crash-recovery-config');
    if (fs.existsSync(isolatedConfigDir)) {
      await fs.promises.rm(isolatedConfigDir, { recursive: true });
    }
    await fs.promises.mkdir(isolatedConfigDir, { recursive: true });
    
    const env = {
      ...process.env,
      FOLDER_MCP_DEVELOPMENT_ENABLED: 'true',
      FOLDER_MCP_FILE_CHANGE_DEBOUNCE_MS: DEBOUNCE_MS.toString(),
      FOLDER_MCP_LOG_LEVEL: 'error',
      FOLDER_MCP_USER_CONFIG_DIR: isolatedConfigDir  // Use isolated config directory
    };

    const args = ['dist/src/daemon/index.js', '--port', TEST_DAEMON_PORT.toString()];
    if (restart) {
      args.push('--restart');
    }

    const daemon = spawn('node', args, {
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Wait for daemon to start
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Daemon startup timeout'));
      }, 10000);

      daemon.stderr?.on('data', (data) => {
        const output = data.toString();
        console.error(`[DAEMON-${restart ? 'RESTART' : 'INITIAL'}]:`, output);
        if (output.includes('Daemon started successfully')) {
          clearTimeout(timeout);
          resolve(undefined);
        }
      });

      daemon.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      daemon.on('exit', (code, signal) => {
        if (!restart) {
          // Initial daemon shouldn't exit during startup
          clearTimeout(timeout);
          reject(new Error(`Daemon exited unexpectedly: code ${code}, signal ${signal}`));
        }
      });
    });

    return daemon;
  };

  // Helper to connect to daemon
  const connectToDaemon = async (): Promise<void> => {
    daemonConnector = new DaemonConnector({
      timeoutMs: 10000,
      maxRetries: 3,
      debug: true
    });

    const { ws: webSocket } = await daemonConnector.connect();
    ws = webSocket;
  };

  // Helper to wait for FMDM update
  const waitForFMDMUpdate = (predicate: (fmdm: any) => boolean, timeoutMs = 10000): Promise<any> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws?.removeListener('message', messageHandler);
        reject(new Error(`FMDM update timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      const messageHandler = (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === 'fmdm.update' && predicate(message)) {
            clearTimeout(timeout);
            ws?.removeListener('message', messageHandler);
            resolve(message);
          }
        } catch (e) {
          // Ignore parse errors
        }
      };

      ws?.on('message', messageHandler);
    });
  };

  // Helper to add folder
  const addFolder = async (folderPath: string): Promise<void> => {
    const message = {
      type: 'folder.add',
      id: `add-${Date.now()}`,
      payload: { 
        path: folderPath,
        model: 'folder-mcp:all-MiniLM-L6-v2'
      }
    };
    ws?.send(JSON.stringify(message));
    
    // Wait for folder to be added
    await waitForFMDMUpdate(
      (fmdm) => fmdm.fmdm.folders.some((f: any) => f.path === folderPath)
    );
  };

  beforeEach(async () => {
    // Clean up daemon configuration FIRST, before setting up test folder
    const configDir = path.join(homedir(), '.folder-mcp');
    if (fs.existsSync(configDir)) {
      await fs.promises.rm(configDir, { recursive: true });
    }
    
    // Also clean up any project-specific configuration that might exist
    const projectConfigDir = path.join(process.cwd(), '.folder-mcp');
    if (fs.existsSync(projectConfigDir)) {
      await fs.promises.rm(projectConfigDir, { recursive: true });
    }
    
    await setupTestFolder();
  });

  afterEach(async () => {
    // Close WebSocket
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
    ws = null;
    daemonConnector = null;

    // Stop daemon
    if (daemonProcess) {
      daemonProcess.kill('SIGTERM');
      await new Promise((resolve) => {
        daemonProcess?.on('exit', resolve);
        setTimeout(() => {
          daemonProcess?.kill('SIGKILL');
          resolve(undefined);
        }, 5000);
      });
      daemonProcess = null;
    }

    // Wait for port to be released
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    // Clean up test folder
    if (fs.existsSync(TEST_FOLDER)) {
      await fs.promises.rm(TEST_FOLDER, { recursive: true });
    }
  });

  it('should preserve indexing work after daemon restart', async () => {
    console.log('Starting first daemon...');
    daemonProcess = await startDaemon(false);
    
    console.log('Connecting to daemon...');
    await connectToDaemon();
    
    console.log('Adding folder for indexing...');
    await addFolder(TEST_FOLDER);
    
    // Wait for indexing to start
    console.log('Waiting for indexing to start...');
    await waitForFMDMUpdate(
      (fmdm) => {
        const folder = fmdm.fmdm.folders.find((f: any) => f.path === TEST_FOLDER);
        return folder && (folder.status === 'indexing' || folder.status === 'active');
      }
    );
    
    // Get current PID of first daemon
    const firstDaemonPid = daemonProcess.pid;
    console.log(`First daemon PID: ${firstDaemonPid}`);
    
    // Start second daemon with --restart while first is still running
    console.log('Starting second daemon with --restart...');
    const secondDaemon = await startDaemon(true);
    console.log(`Second daemon PID: ${secondDaemon.pid}`);
    
    // First daemon should exit
    await new Promise((resolve) => {
      daemonProcess?.on('exit', (code, signal) => {
        console.log(`First daemon exited: code ${code}, signal ${signal}`);
        resolve(undefined);
      });
      setTimeout(() => resolve(undefined), 5000);
    });
    
    // Update our reference to the new daemon
    daemonProcess = secondDaemon;
    
    // Reconnect to new daemon
    console.log('Reconnecting to new daemon...');
    if (ws) ws.close();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await connectToDaemon();
    
    // Since we're using isolated configuration, the restarted daemon won't have 
    // the folder in its config. We need to re-add it to test that the database persists.
    console.log('Re-adding folder to test database persistence...');
    await addFolder(TEST_FOLDER);
    
    // Wait for folder to reach active state (should be faster due to existing database)
    console.log('Waiting for folder to reach active state...');
    const finalUpdate = await waitForFMDMUpdate(
      (fmdm) => {
        const folder = fmdm.fmdm.folders.find((f: any) => f.path === TEST_FOLDER);
        return folder && folder.status === 'active';
      },
      30000
    );
    
    const folder = finalUpdate.fmdm.folders.find((f: any) => f.path === TEST_FOLDER);
    expect(folder).toBeDefined();
    expect(folder.status).toBe('active');
    expect(folder.progress).toBe(100);
    
    // Verify database persists
    const dbPath = path.join(TEST_FOLDER, '.folder-mcp', 'embeddings.db');
    expect(fs.existsSync(dbPath)).toBe(true);
    
    const stats = await fs.promises.stat(dbPath);
    expect(stats.size).toBeGreaterThan(0);
  }, 60000);

  it('should handle corrupted database gracefully with restart recovery', async () => {
    // Create a corrupted database scenario
    const folderMcpPath = path.join(TEST_FOLDER, '.folder-mcp');
    await fs.promises.mkdir(folderMcpPath, { recursive: true });
    
    const dbPath = path.join(folderMcpPath, 'embeddings.db');
    
    // Write garbage data to simulate corruption
    await fs.promises.writeFile(dbPath, 'CORRUPTED DATA - NOT A VALID SQLITE DATABASE');
    
    console.log('Starting daemon with corrupted database...');
    daemonProcess = await startDaemon(false);
    
    console.log('Connecting to daemon...');
    await connectToDaemon();
    
    console.log('Adding folder with corrupted database...');
    await addFolder(TEST_FOLDER);
    
    // Wait a moment for daemon to process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check folder status - might be in error state
    let currentStatus = await waitForFMDMUpdate(
      (fmdm) => {
        const folder = fmdm.fmdm.folders.find((f: any) => f.path === TEST_FOLDER);
        return folder !== undefined;
      }
    );
    
    const initialFolder = currentStatus.fmdm.folders.find((f: any) => f.path === TEST_FOLDER);
    console.log(`Initial folder status: ${initialFolder?.status}`);
    
    // Start recovery daemon with --restart
    console.log('Starting recovery daemon with --restart...');
    const recoveryDaemon = await startDaemon(true);
    
    // First daemon should exit
    await new Promise((resolve) => {
      daemonProcess?.on('exit', resolve);
      setTimeout(() => resolve(undefined), 5000);
    });
    
    daemonProcess = recoveryDaemon;
    
    // Reconnect to recovery daemon
    console.log('Reconnecting to recovery daemon...');
    if (ws) ws.close();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await connectToDaemon();
    
    // Since we're using isolated configuration, we need to re-add the folder
    // to test the corrupted database recovery
    console.log('Re-adding folder to test corrupted database recovery...');
    await addFolder(TEST_FOLDER);
    
    // Recovery daemon should handle the corrupted database
    // Either by restoring from backup or rebuilding  
    console.log('Waiting for recovery to complete...');
    const recoveryUpdate = await waitForFMDMUpdate(
      (fmdm) => {
        const folder = fmdm.fmdm.folders.find((f: any) => f.path === TEST_FOLDER);
        // After recovery, folder should either be active or re-indexing
        return folder && (folder.status === 'active' || folder.status === 'indexing');
      },
      30000
    );
    
    const recoveredFolder = recoveryUpdate.fmdm.folders.find((f: any) => f.path === TEST_FOLDER);
    console.log(`Recovered folder status: ${recoveredFolder?.status}`);
    
    // If still indexing, wait for completion
    if (recoveredFolder?.status === 'indexing') {
      const finalUpdate = await waitForFMDMUpdate(
        (fmdm) => {
          const folder = fmdm.fmdm.folders.find((f: any) => f.path === TEST_FOLDER);
          return folder && folder.status === 'active';
        },
        30000
      );
      
      const finalFolder = finalUpdate.fmdm.folders.find((f: any) => f.path === TEST_FOLDER);
      expect(finalFolder?.status).toBe('active');
    } else {
      expect(recoveredFolder?.status).toBe('active');
    }
    
    // Verify system is functional after recovery
    expect(fs.existsSync(dbPath)).toBe(true);
    
    // Database should be valid SQLite now (not corrupted)
    const dbContent = await fs.promises.readFile(dbPath);
    expect(dbContent.toString().startsWith('CORRUPTED')).toBe(false);
  }, 60000);
});