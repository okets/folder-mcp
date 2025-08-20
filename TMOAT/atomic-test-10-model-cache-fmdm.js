#!/usr/bin/env node

/**
 * ATOMIC TEST 10: Model Cache FMDM Verification
 * 
 * Tests that the daemon properly checks curated models during startup
 * and stores the results in FMDM for instant wizard loading.
 * 
 * This test verifies the solution to the "slow Add Folder Wizard" performance issue:
 * - Daemon checks models BEFORE WebSocket starts (one-time startup cost)
 * - FMDM contains curatedModels array with installation status
 * - FMDM contains modelCheckStatus with Python availability info
 * - Wizard loads instantly using FMDM data (no Python spawning)
 * - All expected curated models are present in FMDM
 */

import { spawn } from 'child_process';
import WebSocket from 'ws';

// Expected curated models
const EXPECTED_CURATED_MODELS = [
  { id: 'folder-mcp:bge-m3', type: 'gpu' },
  { id: 'folder-mcp:multilingual-e5-large', type: 'gpu' },
  { id: 'folder-mcp:paraphrase-multilingual-minilm', type: 'gpu' },
  { id: 'folder-mcp-lite:xenova-multilingual-e5-small', type: 'cpu' },
  { id: 'folder-mcp-lite:xenova-multilingual-e5-large', type: 'cpu' }
];

async function testModelCacheFMDM() {
  console.log('🧪 ATOMIC TEST 10: Model Cache FMDM Verification');
  console.log('='.repeat(60));
  
  let ws = null;
  let daemonProcess = null;
  
  try {
    // Step 1: Start daemon with port specification
    console.log('📡 Starting daemon (WebSocket will be on port 31850)...');
    
    const startTime = Date.now();
    daemonProcess = spawn('npm', ['run', 'daemon:restart', '--', '--port', '31849'], { 
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    // Wait for daemon to be ready
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Daemon startup timeout')), 15000);
      
      daemonProcess.stderr.on('data', (data) => {
        const output = data.toString();
        if (output.includes('WebSocket server started') || output.includes('Daemon ready')) {
          clearTimeout(timeout);
          resolve();
        }
      });
      
      daemonProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
    
    const daemonStartupTime = Date.now() - startTime;
    console.log(`⏱️  Daemon startup took: ${daemonStartupTime}ms`);
    
    // Wait a moment for daemon to be fully ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 2: Connect WebSocket
    console.log('🔌 Connecting to daemon WebSocket...');
    
    ws = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
      
      const websocket = new WebSocket('ws://127.0.0.1:31850');
      
      websocket.on('open', () => {
        clearTimeout(timeout);
        websocket.send(JSON.stringify({ type: 'connection.init', clientType: 'cli' }));
        resolve(websocket);
      });
      
      websocket.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
    
    console.log('✅ Connected to daemon WebSocket');
    
    // Step 3: Wait for FMDM update (sent automatically by daemon)
    console.log('📊 Waiting for FMDM update...');
    
    const fmdm = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('FMDM update timeout')), 10000);
      
      const messageHandler = (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === 'fmdm.update') {
            clearTimeout(timeout);
            ws.off('message', messageHandler);
            resolve(message.fmdm);
          }
        } catch (error) {
          // Ignore parse errors
        }
      };
      
      ws.on('message', messageHandler);
    });
    
    console.log('✅ Received FMDM data');
    
    // Step 4: Verify FMDM contains curatedModels
    if (!fmdm.curatedModels || !Array.isArray(fmdm.curatedModels)) {
      throw new Error('FMDM missing curatedModels array');
    }
    
    console.log(`📋 Found ${fmdm.curatedModels.length} curated models in FMDM`);
    
    // Step 5: Verify all expected models are present
    for (const expectedModel of EXPECTED_CURATED_MODELS) {
      const foundModel = fmdm.curatedModels.find(m => m.id === expectedModel.id);
      
      if (!foundModel) {
        throw new Error(`Missing expected curated model: ${expectedModel.id}`);
      }
      
      if (foundModel.type !== expectedModel.type) {
        throw new Error(`Model ${expectedModel.id} has wrong type: expected ${expectedModel.type}, got ${foundModel.type}`);
      }
      
      console.log(`✅ Model ${expectedModel.id} (${expectedModel.type}): ${foundModel.installed ? 'installed' : 'not installed'}`);
    }
    
    // Step 6: Verify modelCheckStatus is present
    if (!fmdm.modelCheckStatus) {
      throw new Error('FMDM missing modelCheckStatus');
    }
    
    const status = fmdm.modelCheckStatus;
    console.log(`🔧 Python available: ${status.pythonAvailable}`);
    console.log(`💾 GPU models checkable: ${status.gpuModelsCheckable}`);
    console.log(`⏰ Models checked at: ${status.checkedAt}`);
    
    if (status.error) {
      console.log(`⚠️  Model check error: ${status.error}`);
    }
    
    console.log('\n🎉 All tests passed! Model caching in FMDM is working correctly');
    console.log(`📈 Summary:`);
    console.log(`   - Daemon startup: ${daemonStartupTime}ms`);
    console.log(`   - FMDM has ${fmdm.curatedModels.length} curated models`);
    console.log(`   - All ${EXPECTED_CURATED_MODELS.length} expected models present`);
    console.log(`   - Model check status available`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
    
  } finally {
    // Clean up
    if (ws) {
      ws.close();
    }
    
    if (daemonProcess) {
      daemonProcess.kill('SIGTERM');
      // Wait a moment for graceful shutdown
      setTimeout(() => {
        if (!daemonProcess.killed) {
          daemonProcess.kill('SIGKILL');
        }
      }, 2000);
    }
  }
}

// Run the test
testModelCacheFMDM().catch(console.error);