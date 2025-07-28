#!/usr/bin/env node

/**
 * WebSocket Test Script
 * 
 * Simple test client to verify the FMDM WebSocket server functionality.
 * This script connects to the daemon and tests the protocol.
 */

import WebSocket from 'ws';

class FMDMTestClient {
  constructor(url = 'ws://127.0.0.1:31849') {
    this.url = url;
    this.ws = null;
    this.connected = false;
    this.responses = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      console.log(`🔌 Connecting to ${this.url}...`);
      
      this.ws = new WebSocket(this.url);
      
      this.ws.on('open', () => {
        this.connected = true;
        console.log('✅ Connected to WebSocket server');
        resolve();
      });
      
      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          console.error('❌ Error parsing message:', error);
        }
      });
      
      this.ws.on('close', () => {
        this.connected = false;
        console.log('🔌 Connection closed');
      });
      
      this.ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        reject(error);
      });
    });
  }

  handleMessage(message) {
    console.log('📨 Received message:', message.type);
    
    switch (message.type) {
      case 'fmdm.update':
        console.log('🔄 FMDM Update received:');
        console.log(`   Version: ${message.fmdm.version}`);
        console.log(`   Folders: ${message.fmdm.folders.length}`);
        console.log(`   Connections: ${message.fmdm.connections.count}`);
        console.log(`   Daemon PID: ${message.fmdm.daemon.pid}`);
        console.log(`   Models: ${message.fmdm.models.join(', ')}`);
        break;
        
      case 'connection.ack':
        console.log(`✅ Connection acknowledged. Client ID: ${message.clientId}`);
        break;
        
      case 'pong':
        console.log(`🏓 Pong received for ID: ${message.id}`);
        break;
        
      case 'error':
        console.log(`❌ Error: ${message.message}`);
        break;
        
      default:
        if (message.id && this.responses.has(message.id)) {
          const resolve = this.responses.get(message.id);
          this.responses.delete(message.id);
          resolve(message);
        } else {
          console.log('📨 Other message:', message);
        }
    }
  }

  send(message) {
    if (!this.connected) {
      throw new Error('Not connected');
    }
    
    console.log('📤 Sending:', message.type);
    this.ws.send(JSON.stringify(message));
  }

  async sendWithResponse(message) {
    return new Promise((resolve, reject) => {
      if (!message.id) {
        message.id = this.generateId();
      }
      
      this.responses.set(message.id, resolve);
      this.send(message);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.responses.has(message.id)) {
          this.responses.delete(message.id);
          reject(new Error('Request timeout'));
        }
      }, 10000);
    });
  }

  generateId() {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function runTests() {
  const client = new FMDMTestClient();
  
  try {
    // Connect to server
    await client.connect();
    
    // Wait a moment for initial FMDM
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n🧪 Starting tests...\n');
    
    // Test 1: Connection initialization
    console.log('Test 1: Connection initialization');
    client.send({
      type: 'connection.init',
      clientType: 'tui'
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Test 2: Ping/Pong
    console.log('\nTest 2: Ping/Pong');
    await client.sendWithResponse({
      type: 'ping',
      id: 'ping-test-1'
    });
    
    // Test 3: Folder validation
    console.log('\nTest 3: Folder validation');
    const validationResult = await client.sendWithResponse({
      type: 'folder.validate',
      payload: {
        path: process.cwd() // Use current directory
      }
    });
    console.log('📊 Validation result:', {
      valid: validationResult.valid,
      errors: validationResult.errors?.length || 0,
      warnings: validationResult.warnings?.length || 0
    });
    
    // Test 4: Try to validate invalid path
    console.log('\nTest 4: Invalid path validation');
    const invalidResult = await client.sendWithResponse({
      type: 'folder.validate',
      payload: {
        path: '/does/not/exist'
      }
    });
    console.log('📊 Invalid path result:', {
      valid: invalidResult.valid,
      errors: invalidResult.errors?.length || 0
    });
    
    // Test 5: Add folder (if validation passed)
    if (validationResult.valid) {
      console.log('\nTest 5: Add folder');
      const addResult = await client.sendWithResponse({
        type: 'folder.add',
        payload: {
          path: process.cwd(),
          model: 'test-model'
        }
      });
      console.log('📊 Add folder result:', {
        success: addResult.success,
        error: addResult.error
      });
      
      // Wait for FMDM update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test 6: Remove folder
      console.log('\nTest 6: Remove folder');
      const removeResult = await client.sendWithResponse({
        type: 'folder.remove',
        payload: {
          path: process.cwd()
        }
      });
      console.log('📊 Remove folder result:', {
        success: removeResult.success,
        error: removeResult.error
      });
      
      // Wait for FMDM update
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n✅ All tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    client.disconnect();
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
WebSocket Test Client for FMDM

Usage: node test-websocket.js [options]

Options:
  --help, -h     Show this help
  --url <url>    WebSocket URL (default: ws://127.0.0.1:31849)

Examples:
  node test-websocket.js
  node test-websocket.js --url ws://localhost:31849
`);
  process.exit(0);
}

const urlIndex = args.indexOf('--url');
const wsUrl = urlIndex !== -1 && args[urlIndex + 1] ? args[urlIndex + 1] : undefined;

if (wsUrl) {
  console.log(`Using custom URL: ${wsUrl}`);
}

// Run the tests
runTests().catch(console.error);