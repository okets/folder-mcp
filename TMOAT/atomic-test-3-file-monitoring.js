#!/usr/bin/env node

/**
 * TMOAT Atomic Test 3: File Monitoring
 * Tests file monitoring capabilities - creating/modifying files triggers re-scanning
 */

import WebSocket from 'ws';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 ATOMIC TEST 3: File Monitoring & Change Detection');
console.log('='.repeat(50));

const ws = new WebSocket('ws://127.0.0.1:31850');

// Test folder path
const testFolderPath = path.resolve(__dirname, '../tests/fixtures/tmp/smoke-small');
const testFilePath = path.join(testFolderPath, 'test-new-file.txt');
console.log(`📁 Test folder: ${testFolderPath}`);

let folderStates = [];
let addedFolderId = null;
let testPhase = 'setup'; // setup -> add-file -> modify-file -> complete

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
        const folderId = `atomic-test-3-${Date.now()}`;
        addedFolderId = folderId;
        
        ws.send(JSON.stringify({
            type: 'folder.add',
            id: folderId,
            payload: {
                path: testFolderPath,
                model: 'folder-mcp:all-MiniLM-L6-v2'
            }
        }));
    }, 1000);
});

async function createTestFile() {
    try {
        console.log('📝 Creating new test file...');
        await fs.writeFile(testFilePath, 'This is a new test file created during active monitoring.\nIt should trigger folder re-scanning.');
        console.log(`✅ Created: ${testFilePath}`);
        testPhase = 'modify-file';
    } catch (error) {
        console.log(`❌ Failed to create file: ${error.message}`);
    }
}

async function modifyTestFile() {
    try {
        console.log('✏️  Modifying existing test file...');
        await fs.appendFile(testFilePath, '\n\nThis content was added to test file modification detection.\nTimestamp: ' + new Date().toISOString());
        console.log(`✅ Modified: ${testFilePath}`);
        testPhase = 'complete';
        
        // Wait a bit for final state updates
        setTimeout(() => {
            console.log('\n📊 TEST SUMMARY:');
            console.log('File monitoring operations performed:');
            console.log('  ✅ Added folder and waited for active state');
            console.log('  ✅ Created new file while active');
            console.log('  ✅ Modified existing file while active');
            console.log('\nState transitions observed:');
            folderStates.forEach((state, index) => {
                console.log(`  ${index + 1}. ${state.status} (${state.progress}%) [${state.timestamp}]`);
            });
            
            if (folderStates.filter(s => s.status === 'active').length >= 2) {
                console.log('\n✅ ATOMIC TEST 3: PASSED - File monitoring working, multiple active states detected');
            } else {
                console.log('\n⚠️  ATOMIC TEST 3: PARTIAL - File changes may not have triggered re-scanning');
            }
            
            // Clean up test file
            fs.unlink(testFilePath).catch(() => {}); // Ignore errors
            ws.close();
        }, 5000);
        
    } catch (error) {
        console.log(`❌ Failed to modify file: ${error.message}`);
    }
}

ws.on('message', (data) => {
    try {
        const message = JSON.parse(data);
        const timestamp = new Date().toISOString().substring(11, 23);
        
        if (message.type === 'connection.ack') {
            console.log(`[${timestamp}] ✅ Connection acknowledged by daemon`);
        } else if (message.type === 'fmdm.update') {
            if (message.fmdm?.folders?.length > 0) {
                message.fmdm.folders.forEach(folder => {
                    const folderName = folder.path.split('/').pop();
                    
                    // Track ALL state changes, even repeated ones (for monitoring detection)
                    const lastState = folderStates[folderStates.length - 1];
                    if (!lastState || lastState.status !== folder.status || 
                        (folder.progress !== undefined && lastState.progress !== folder.progress)) {
                        
                        console.log(`[${timestamp}] 🔄 STATE: ${folderName}: ${folder.status}${folder.progress !== undefined ? ` (${folder.progress}%)` : ''}`);
                        
                        folderStates.push({
                            status: folder.status,
                            progress: folder.progress,
                            timestamp: timestamp,
                            phase: testPhase
                        });
                        
                        // Start file operations once folder is active
                        if (folder.status === 'active' && folder.progress === 100) {
                            if (testPhase === 'setup') {
                                console.log(`[${timestamp}] 🎯 Folder ready! Starting file monitoring test...`);
                                testPhase = 'add-file';
                                setTimeout(createTestFile, 2000);
                            } else if (testPhase === 'add-file') {
                                console.log(`[${timestamp}] 📄 File creation detected by monitoring!`);
                                setTimeout(modifyTestFile, 2000);
                            } else if (testPhase === 'modify-file') {
                                console.log(`[${timestamp}] ✏️  File modification detected by monitoring!`);
                            }
                        }
                    }
                });
            }
        } else if (message.type === 'error') {
            console.log(`[${timestamp}] ❌ Error from daemon: ${message.message || 'unknown error'}`);
            console.log(`[${timestamp}] 🔍 Full error: ${JSON.stringify(message, null, 2)}`);
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
    if (folderStates.length === 0) {
        console.log('❌ ATOMIC TEST 3: FAILED - No folder states observed');
    } else if (!folderStates.some(s => s.status === 'active')) {
        console.log('❌ ATOMIC TEST 3: FAILED - Folder did not reach active state');
    } else if (folderStates.filter(s => s.status === 'active').length < 2) {
        console.log('⚠️  ATOMIC TEST 3: INCOMPLETE - File monitoring may not be working');
    }
    ws.close();
}, 45000);

console.log('⏳ Connecting to daemon and testing file monitoring...');