import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import WebSocket from 'ws';
import path from 'path';
import { promises as fs } from 'fs';

describe('Phase 9 - Sprint 1 - Task 1: Daemon Folder Configuration API', { timeout: 30000 }, () => {
  let daemonProcess: ChildProcess | null = null;
  let daemonWs: WebSocket | null = null;
  const DAEMON_PORT = 31849;  // Default daemon port
  const WS_PORT = DAEMON_PORT + 1;  // WebSocket server runs on daemon port + 1
  const REST_PORT = 3002;  // REST API port for MCP operations
  const DAEMON_URL = `http://localhost:${REST_PORT}`;  // MCP server now uses REST API

  beforeAll(async () => {
    // Start the daemon
    const daemonPath = path.join(process.cwd(), 'dist', 'src', 'daemon', 'index.js');
    
    // Check if daemon exists
    try {
      await fs.access(daemonPath);
    } catch {
      throw new Error(`Daemon not built at ${daemonPath}. Run npm run build first.`);
    }
    
    console.log('Starting daemon...');
    daemonProcess = spawn('node', [daemonPath], {
      env: { ...process.env, DAEMON_PORT: DAEMON_PORT.toString() },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Wait for daemon to be ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Daemon startup timeout')), 10000);
      
      let resolved = false;
      
      const checkOutput = (data: Buffer) => {
        const output = data.toString();
        // Check for WebSocket server started message (still needed for TUI)
        // Also check for REST API server started message
        if (!resolved && (
            output.includes('WebSocket server started on ws://') || 
            output.includes('Daemon WebSocket server listening') || 
            output.includes('REST API server started on') ||
            output.includes('[REST] API server started') ||
            output.includes('ready on port'))) {
          resolved = true;
          clearTimeout(timeout);
          // Add a small delay to ensure the server is fully ready
          setTimeout(resolve, 500);
        }
      };
      
      daemonProcess!.stdout?.on('data', (data) => {
        console.log('Daemon stdout:', data.toString());
        checkOutput(data);
      });

      daemonProcess!.stderr?.on('data', (data) => {
        console.error('Daemon stderr:', data.toString());
        checkOutput(data);
      });
    });

    // Connect WebSocket
    console.log('Connecting WebSocket to daemon...');
    daemonWs = new WebSocket(`ws://localhost:${WS_PORT}`);
    
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
      
      daemonWs!.on('open', () => {
        clearTimeout(timeout);
        console.log('WebSocket connected to daemon');
        resolve();
      });
      
      daemonWs!.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  });

  afterAll(async () => {
    // Clean up
    if (daemonWs) {
      daemonWs.close();
    }
    
    if (daemonProcess) {
      daemonProcess.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (!daemonProcess.killed) {
        daemonProcess.kill('SIGKILL');
      }
    }
  });

  it('should provide getFoldersConfig endpoint that returns configured folders', async () => {
    // Test the new daemon API endpoint for getting folder configuration
    const request = {
      id: 'test-1',
      type: 'getFoldersConfig'
    };

    // Send request
    daemonWs!.send(JSON.stringify(request));

    // Wait for response
    const response = await new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Response timeout')), 5000);
      
      const handler = (data: WebSocket.Data) => {
        const message = JSON.parse(data.toString());
        if (message.id === request.id) {
          clearTimeout(timeout);
          daemonWs!.off('message', handler);
          resolve(message);
        }
      };
      
      daemonWs!.on('message', handler);
    });

    // Verify response structure
    expect(response).toHaveProperty('type', 'getFoldersConfigResponse');
    expect(response).toHaveProperty('folders');
    expect(Array.isArray(response.folders)).toBe(true);
    
    // Each folder should have required properties
    if (response.folders.length > 0) {
      response.folders.forEach((folder: any) => {
        expect(folder).toHaveProperty('name');
        expect(folder).toHaveProperty('path');
        expect(folder).toHaveProperty('model');
        expect(folder).toHaveProperty('status');
      });
    }
    
    console.log('Received folders config:', response.folders);
  });

  it('should allow MCP server to start without folder argument', async () => {
    // Test that MCP server can start without requiring a folder path
    const mcpServerPath = path.join(process.cwd(), 'dist', 'src', 'mcp-server.js');
    
    // Check if MCP server exists
    try {
      await fs.access(mcpServerPath);
    } catch {
      throw new Error(`MCP server not built at ${mcpServerPath}. Run npm run build first.`);
    }
    
    // Start MCP server without folder argument (previously required)
    const mcpProcess = spawn('node', [mcpServerPath], {
      env: { ...process.env, DAEMON_URL: DAEMON_URL },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let started = false;
    let error: string | null = null;

    // Wait for startup
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => resolve(), 3000);
      
      mcpProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        console.log('MCP stdout:', output);
        // Check for successful initialization messages
        if (output.includes('capabilities') || 
            output.includes('initialize') ||
            output.includes('"jsonrpc"')) {
          started = true;
          clearTimeout(timeout);
          resolve();
        }
      });

      mcpProcess.stderr?.on('data', (data) => {
        const err = data.toString();
        console.log('MCP stderr:', err);
        // Check for connection to daemon (REST or WebSocket)
        if (err.includes('Connected to daemon') || 
            err.includes('WebSocket connected') ||
            err.includes('Successfully connected to daemon REST API') ||
            err.includes('Daemon REST connection verified')) {
          started = true;
        }
        // Check for errors that would indicate folder argument is still required
        if (err.includes('folder path required') || 
            err.includes('Missing required argument')) {
          error = err;
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    // Clean up
    mcpProcess.kill('SIGTERM');
    await new Promise(resolve => setTimeout(resolve, 500));
    if (!mcpProcess.killed) {
      mcpProcess.kill('SIGKILL');
    }

    // Assertions
    expect(error).toBeNull();
    expect(started).toBe(true);
  });
});