#!/usr/bin/env node

/**
 * TMOAT Atomic Test 2: Folder Addition
 * Tests adding a folder and watching it progress through lifecycle states
 */

import WebSocket from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 ATOMIC TEST 2: Folder Addition & Lifecycle');
console.log('='.repeat(50));

const ws = new WebSocket('ws://127.0.0.1:31850');

// Test folder path
const testFolderPath = path.resolve(__dirname, '../tests/fixtures/tmp/smoke-small');
console.log(`📁 Test folder: ${testFolderPath}`);

let folderStates = [];
let addedFolderId = null;

ws.on('open', () => {
    console.log('✅ Connected to WebSocket');
    
    // Send connection init first
    console.log('📤 Sending connection.init with clientType: cli');
    ws.send(JSON.stringify({
        type: 'connection.init',
        clientType: 'cli'
    }));
    
    // Wait a bit then add the folder
    setTimeout(() => {
        console.log('📤 Sending folder.add request');
        const folderId = `atomic-test-${Date.now()}`;
        addedFolderId = folderId;
        
        ws.send(JSON.stringify({
            type: 'folder.add',
            id: folderId,
            payload: {
                path: testFolderPath,
                model: 'folder-mcp:all-MiniLM-L6-v2'  // Using correct model name
            }
        }));
    }, 1000);
});

ws.on('message', (data) => {
    try {
        const message = JSON.parse(data);
        const timestamp = new Date().toISOString().substring(11, 23);
        
        if (message.type === 'connection.ack') {
            console.log(`[${timestamp}] ✅ Connection acknowledged by daemon`);
        } else if (message.type === 'fmdm.update') {
            console.log(`[${timestamp}] 📊 FMDM Update - ${message.fmdm?.folders?.length || 0} folders managed`);
            
            if (message.fmdm?.folders?.length > 0) {
                message.fmdm.folders.forEach(folder => {
                    const folderName = folder.path.split('/').pop();
                    const stateInfo = `${folderName}: ${folder.status}`;
                    
                    // Track state transitions
                    const existingState = folderStates.find(s => s.path === folder.path);
                    if (!existingState || existingState.status !== folder.status) {
                        console.log(`[${timestamp}] 🔄 STATE CHANGE: ${stateInfo}`);
                        if (folder.progress !== undefined) {
                            console.log(`[${timestamp}] 📈 Progress: ${folder.progress}%`);
                        }
                        
                        // Update state tracking
                        if (existingState) {
                            existingState.status = folder.status;
                            existingState.progress = folder.progress;
                        } else {
                            folderStates.push({
                                path: folder.path,
                                status: folder.status,
                                progress: folder.progress
                            });
                        }
                    }
                    
                    // Check for completion
                    if (folder.status === 'active' && folder.progress === 100) {
                        console.log(`[${timestamp}] 🎉 FOLDER READY: ${folderName} is now active and fully indexed!`);
                        
                        // Test complete - show summary
                        setTimeout(() => {
                            console.log('\n📊 TEST SUMMARY:');
                            console.log('State transitions observed:');
                            folderStates.forEach(state => {
                                console.log(`  📁 ${state.path.split('/').pop()}: ${state.status} (${state.progress}%)`);
                            });
                            console.log('\n✅ ATOMIC TEST 2: PASSED - Folder added successfully and reached active state');
                            ws.close();
                        }, 2000);
                    }
                });
            }
        } else if (message.type === 'error') {
            console.log(`[${timestamp}] ❌ Error from daemon: ${message.message || 'unknown error'}`);
            console.log(`[${timestamp}] 🔍 Full error: ${JSON.stringify(message, null, 2)}`);
        } else {
            console.log(`[${timestamp}] 📝 Other message: ${message.type || 'unknown'}`);
        }
    } catch (e) {
        console.log(`❌ Failed to parse message: ${data}`);
    }
});

ws.on('error', (err) => {
    console.log(`❌ WebSocket error: ${err.message}`);
    process.exit(1);
});

ws.on('close', () => {
    console.log('🔌 Connection closed');
    process.exit(0);
});

// Auto-close after 30 seconds
setTimeout(() => {
    console.log('⏱️  Test timeout - closing connection');
    if (folderStates.length === 0) {
        console.log('❌ ATOMIC TEST 2: FAILED - No folder states observed');
    } else if (!folderStates.some(s => s.status === 'active')) {
        console.log('❌ ATOMIC TEST 2: FAILED - Folder did not reach active state');
    }
    ws.close();
}, 30000);

console.log('⏳ Connecting to daemon and testing folder addition...');