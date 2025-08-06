#!/usr/bin/env node

/**
 * TMOAT Atomic Test 4: Folder Cleanup
 * Tests removing folders and cleaning up database/cache
 */

import WebSocket from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 ATOMIC TEST 4: Folder Cleanup & Removal');
console.log('='.repeat(50));

const ws = new WebSocket('ws://127.0.0.1:31850');

// Test folder path
const testFolderPath = path.resolve(__dirname, '../tests/fixtures/tmp/smoke-small');
console.log(`📁 Test folder: ${testFolderPath}`);

let initialFolderCount = 0;
let finalFolderCount = -1;

ws.on('open', () => {
    console.log('✅ Connected to WebSocket');
    
    // Send connection init first
    console.log('📤 Sending connection.init with clientType: cli');
    ws.send(JSON.stringify({
        type: 'connection.init',
        clientType: 'cli'
    }));
    
    // Wait a bit then remove the folder
    setTimeout(() => {
        console.log(`📤 Sending folder.remove request for: ${testFolderPath}`);
        
        ws.send(JSON.stringify({
            type: 'folder.remove',
            id: `remove-test-${Date.now()}`,
            payload: {
                path: testFolderPath
            }
        }));
    }, 2000);
});

ws.on('message', (data) => {
    try {
        const message = JSON.parse(data);
        const timestamp = new Date().toISOString().substring(11, 23);
        
        if (message.type === 'connection.ack') {
            console.log(`[${timestamp}] ✅ Connection acknowledged by daemon`);
        } else if (message.type === 'fmdm.update') {
            const folderCount = message.fmdm?.folders?.length || 0;
            console.log(`[${timestamp}] 📊 FMDM Update - ${folderCount} folders managed`);
            
            // Track folder count changes
            if (initialFolderCount === 0 && folderCount > 0) {
                initialFolderCount = folderCount;
                console.log(`[${timestamp}] 📈 Initial folder count: ${initialFolderCount}`);
            } else if (initialFolderCount > 0 && folderCount < initialFolderCount && finalFolderCount === -1) {
                finalFolderCount = folderCount;
                console.log(`[${timestamp}] 📉 Folder removed! Count: ${initialFolderCount} → ${finalFolderCount}`);
                
                // Test complete
                setTimeout(() => {
                    console.log('\n📊 TEST SUMMARY:');
                    console.log(`Initial folders: ${initialFolderCount}`);
                    console.log(`Final folders: ${finalFolderCount}`);
                    console.log('Operations performed:');
                    console.log('  ✅ Connected to daemon');
                    console.log('  ✅ Observed existing folders');
                    console.log('  ✅ Sent folder removal request');
                    console.log(`  ✅ Confirmed folder count decreased (${initialFolderCount} → ${finalFolderCount})`);
                    
                    if (finalFolderCount < initialFolderCount) {
                        console.log('\n✅ ATOMIC TEST 4: PASSED - Folder removal working correctly');
                    } else {
                        console.log('\n❌ ATOMIC TEST 4: FAILED - Folder was not removed');
                    }
                    
                    ws.close();
                }, 3000);
            }
            
            // Show current folder details
            if (folderCount > 0) {
                message.fmdm.folders.forEach(folder => {
                    const folderName = folder.path.split('/').pop();
                    console.log(`[${timestamp}] 📁 ${folderName}: ${folder.status}${folder.progress !== undefined ? ` (${folder.progress}%)` : ''}`);
                });
            }
        } else if (message.type === 'error') {
            console.log(`[${timestamp}] ❌ Error from daemon: ${message.message || 'unknown error'}`);
            console.log(`[${timestamp}] 🔍 Full error: ${JSON.stringify(message, null, 2)}`);
        } else if (message.type === 'folder.removed') {
            console.log(`[${timestamp}] ✅ Folder removal acknowledged: ${JSON.stringify(message, null, 2)}`);
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

// Auto-close after 20 seconds
setTimeout(() => {
    console.log('⏱️  Test timeout - closing connection');
    
    if (initialFolderCount === 0) {
        console.log('⚠️  ATOMIC TEST 4: INCONCLUSIVE - No folders found to remove');
    } else if (finalFolderCount === -1) {
        console.log('❌ ATOMIC TEST 4: FAILED - Folder removal did not complete');
    }
    
    ws.close();
}, 20000);

console.log('⏳ Connecting to daemon and testing folder removal...');