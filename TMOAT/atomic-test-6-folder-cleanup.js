#!/usr/bin/env node

/**
 * TMOAT Atomic Test 6: Complete Folder Cleanup
 * Tests that when folder is removed, .folder-mcp directory is completely deleted
 */

import WebSocket from 'ws';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 ATOMIC TEST 6: Complete Folder Cleanup');
console.log('='.repeat(50));

const ws = new WebSocket('ws://127.0.0.1:31850');

// Test folder path
const testFolderPath = path.resolve(__dirname, '../tests/fixtures/tmp/smoke-small');
const folderMcpPath = path.join(testFolderPath, '.folder-mcp');

console.log(`📁 Test folder: ${testFolderPath}`);
console.log(`🗂️  .gpu: ${folderMcpPath}`);

let testPhase = 'setup'; // setup -> add-folder -> wait-active -> remove-folder -> verify-cleanup -> complete
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
        console.log('📤 Adding folder for cleanup test');
        const folderId = `cleanup-test-${Date.now()}`;
        addedFolderId = folderId;
        
        ws.send(JSON.stringify({
            type: 'folder.add',
            id: folderId,
            payload: {
                path: testFolderPath,
                model: 'gpu:all-MiniLM-L6-v2'
            }
        }));
        
        testPhase = 'wait-active';
    }, 1000);
});

async function checkFolderMcpExists() {
    try {
        const stat = await fs.stat(folderMcpPath);
        return stat.isDirectory();
    } catch (error) {
        return false;
    }
}

async function verifyCompleteCleanup() {
    try {
        console.log('\n🧹 VERIFYING CLEANUP...');
        
        // Check if .folder-mcp directory still exists
        const exists = await checkFolderMcpExists();
        
        if (!exists) {
            console.log('✅ .folder-mcp directory completely removed');
            return true;
        } else {
            console.log('❌ .folder-mcp directory still exists after removal');
            
            // List what's still there
            try {
                const contents = await fs.readdir(folderMcpPath);
                console.log(`  Contents still present: ${contents.join(', ')}`);
            } catch (error) {
                console.log(`  Could not read directory contents: ${error.message}`);
            }
            return false;
        }
    } catch (error) {
        console.log(`❌ Error verifying cleanup: ${error.message}`);
        return false;
    }
}

ws.on('message', async (data) => {
    try {
        const message = JSON.parse(data);
        const timestamp = new Date().toISOString().substring(11, 23);
        
        if (message.type === 'connection.ack') {
            console.log(`[${timestamp}] ✅ Connection acknowledged by daemon`);
        } else if (message.type === 'fmdm.update') {
            const folderCount = message.fmdm?.folders?.length || 0;
            
            if (message.fmdm?.folders?.length > 0) {
                message.fmdm.folders.forEach(async folder => {
                    const folderName = folder.path.split('/').pop();
                    console.log(`[${timestamp}] 🔄 ${folderName}: ${folder.status}${folder.progress !== undefined ? ` (${folder.progress}%)` : ''}`);
                    
                    // When folder becomes active, remove it
                    if (folder.status === 'active' && folder.progress === 100 && testPhase === 'wait-active') {
                        console.log(`[${timestamp}] 🎯 Folder is active! Now removing it...`);
                        testPhase = 'remove-folder';
                        
                        // First verify .folder-mcp exists before removal
                        const existsBefore = await checkFolderMcpExists();
                        console.log(`[${timestamp}] 📋 .folder-mcp exists before removal: ${existsBefore ? '✅ YES' : '❌ NO'}`);
                        
                        // Remove the folder
                        setTimeout(() => {
                            console.log(`[${timestamp}] 📤 Sending folder remove request`);
                            ws.send(JSON.stringify({
                                type: 'folder.remove',
                                id: `remove-${Date.now()}`,
                                payload: {
                                    path: testFolderPath
                                }
                            }));
                            
                            testPhase = 'verify-cleanup';
                        }, 1000);
                    }
                });
            } else if (folderCount === 0 && testPhase === 'verify-cleanup') {
                console.log(`[${timestamp}] 📉 Folder removed from management - verifying cleanup...`);
                
                // Wait a moment for cleanup operations to complete
                setTimeout(async () => {
                    const cleanupSuccessful = await verifyCompleteCleanup();
                    
                    console.log('\n📊 CLEANUP VERIFICATION SUMMARY:');
                    console.log(`Test folder: ${testFolderPath}`);
                    console.log(`.folder-mcp path: ${folderMcpPath}`);
                    console.log(`Complete cleanup: ${cleanupSuccessful ? '✅ YES' : '❌ NO'}`);
                    
                    if (cleanupSuccessful) {
                        console.log('\n✅ ATOMIC TEST 6: PASSED - Complete folder cleanup successful');
                    } else {
                        console.log('\n❌ ATOMIC TEST 6: FAILED - Folder cleanup incomplete');
                    }
                    
                    testPhase = 'complete';
                    ws.close();
                }, 3000);
            }
        } else if (message.type === 'error') {
            console.log(`[${timestamp}] ❌ Error from daemon: ${message.message || 'unknown error'}`);
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

// Auto-close after 45 seconds
setTimeout(() => {
    console.log('⏱️  Test timeout - closing connection');
    
    if (testPhase !== 'complete') {
        console.log(`❌ ATOMIC TEST 6: INCOMPLETE - Test did not complete (phase: ${testPhase})`);
    }
    
    ws.close();
}, 45000);

console.log('⏳ Connecting to daemon and testing folder cleanup...');