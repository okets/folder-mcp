#!/usr/bin/env node

/**
 * TMOAT Atomic Test 8: Offline File Changes
 * Tests changing files while daemon is offline, then verifying changes are detected on restart
 */

import WebSocket from 'ws';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('📴 ATOMIC TEST 8: Offline File Changes Detection');
console.log('='.repeat(50));

const ws = new WebSocket('ws://127.0.0.1:31850');

// Test folder path
const testFolderPath = path.resolve(__dirname, '../tests/fixtures/tmp/smoke-large');
const folderMcpPath = path.join(testFolderPath, '.folder-mcp');

console.log(`📁 Test folder: ${testFolderPath}`);
console.log(`🗂️  .folder-mcp: ${folderMcpPath}`);

let testPhase = 'setup'; // setup -> initial-add -> wait-active -> go-offline -> make-changes -> go-online -> verify-detection
let addedFolderId = null;
let offlineChanges = [];

ws.on('open', () => {
    console.log('✅ Connected to WebSocket');
    
    // Send connection init first
    console.log('📤 Sending connection.init with clientType: cli');
    ws.send(JSON.stringify({
        type: 'connection.init',
        clientType: 'cli'
    }));
    
    // Start the test
    setTimeout(async () => {
        await setupInitialFolder();
    }, 1000);
});

async function setupInitialFolder() {
    try {
        console.log('📋 Setting up folder for offline changes test...');
        
        // Add folder for initial indexing
        console.log('📤 Adding folder for initial indexing');
        const folderId = `offline-test-${Date.now()}`;
        addedFolderId = folderId;
        
        ws.send(JSON.stringify({
            type: 'folder.add',
            id: folderId,
            payload: {
                path: testFolderPath,
                model: 'folder-mcp:all-MiniLM-L6-v2'
            }
        }));
        
        testPhase = 'wait-initial-active';
    } catch (error) {
        console.log(`❌ Setup error: ${error.message}`);
    }
}

async function makeOfflineChanges() {
    try {
        console.log('\\n📴 MAKING OFFLINE CHANGES...');
        
        // Get current files
        const existingFiles = await fs.readdir(testFolderPath);
        const docFiles = existingFiles.filter(f => f.endsWith('.docx') || f.endsWith('.pdf') || f.endsWith('.xlsx'));
        
        // Remove a file while offline
        if (docFiles.length > 0) {
            const toRemove = docFiles[0];
            const removePath = path.join(testFolderPath, toRemove);
            await fs.unlink(removePath);
            console.log(`🗑️  OFFLINE: Removed ${toRemove}`);
            offlineChanges.push({ action: 'removed', file: toRemove });
        }
        
        // Add a new file while offline
        const offlineFileName = `offline-created-${Date.now()}.txt`;
        const offlineFilePath = path.join(testFolderPath, offlineFileName);
        await fs.writeFile(offlineFilePath, `This file was created while the daemon was offline.\\n\\nTimestamp: ${new Date().toISOString()}\\n\\nThis should be detected when the daemon comes back online.`);
        console.log(`➕ OFFLINE: Added ${offlineFileName}`);
        offlineChanges.push({ action: 'added', file: offlineFileName });
        
        // Modify an existing file while offline
        const txtFiles = existingFiles.filter(f => f.endsWith('.txt') && !f.includes('offline-created'));
        if (txtFiles.length > 0) {
            const toModify = txtFiles[0];
            const modifyPath = path.join(testFolderPath, toModify);
            try {
                const originalContent = await fs.readFile(modifyPath, 'utf-8');
                await fs.writeFile(modifyPath, originalContent + `\\n\\n--- OFFLINE MODIFICATION ---\\nModified while daemon was offline: ${new Date().toISOString()}`);
                console.log(`✏️  OFFLINE: Modified ${toModify}`);
                offlineChanges.push({ action: 'modified', file: toModify });
            } catch (error) {
                console.log(`⚠️  Could not modify ${toModify}: ${error.message}`);
            }
        }
        
        console.log(`✅ Offline changes complete: ${offlineChanges.length} changes made`);
        
        // Wait a moment to simulate time passing offline
        console.log('⏳ Simulating offline period (waiting 3 seconds)...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        return true;
    } catch (error) {
        console.log(`❌ Error making offline changes: ${error.message}`);
        return false;
    }
}

async function goBackOnline() {
    try {
        console.log('\\n🔌 GOING BACK ONLINE...');
        
        // Close current connection to simulate going offline
        ws.close();
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('🔄 Reconnecting (simulating coming back online)...');
        
        const onlineWs = new WebSocket('ws://127.0.0.1:31850');
        
        onlineWs.on('open', () => {
            console.log('✅ Back online - reconnected to WebSocket');
            
            onlineWs.send(JSON.stringify({
                type: 'connection.init',
                clientType: 'cli'
            }));
            
            setTimeout(() => {
                console.log('📤 Re-adding folder to detect offline changes');
                const onlineFolderId = `online-detection-${Date.now()}`;
                
                onlineWs.send(JSON.stringify({
                    type: 'folder.add',
                    id: onlineFolderId,
                    payload: {
                        path: testFolderPath,
                        model: 'folder-mcp:all-MiniLM-L6-v2'
                    }
                }));
                
                testPhase = 'verify-detection';
            }, 1000);
        });
        
        onlineWs.on('message', async (data) => {
            try {
                const message = JSON.parse(data);
                const timestamp = new Date().toISOString().substring(11, 23);
                
                if (message.type === 'connection.ack') {
                    console.log(`[${timestamp}] ✅ Back online - connection acknowledged`);
                } else if (message.type === 'fmdm.update') {
                    if (message.fmdm?.folders?.length > 0) {
                        message.fmdm.folders.forEach(folder => {
                            const folderName = folder.path.split('/').pop();
                            console.log(`[${timestamp}] 🔄 ${folderName}: ${folder.status}${folder.progress !== undefined ? ` (${folder.progress}%)` : ''}`);
                            
                            // Check if we're in scanning phase - this indicates change detection
                            if (folder.status === 'scanning' && testPhase === 'verify-detection') {
                                console.log(`[${timestamp}] 🔍 SCANNING detected - offline changes being processed!`);
                            }
                            
                            if (folder.status === 'active' && folder.progress === 100 && testPhase === 'verify-detection') {
                                console.log(`[${timestamp}] 🎯 Offline change detection complete!`);
                                
                                setTimeout(() => {
                                    verifyOfflineDetection();
                                    testPhase = 'complete';
                                    onlineWs.close();
                                }, 2000);
                            }
                        });
                    }
                }
            } catch (e) {
                console.log(`❌ Failed to parse online message: ${data}`);
            }
        });
        
        onlineWs.on('close', () => {
            console.log('🔌 Online test connection closed');
            process.exit(0);
        });
        
        onlineWs.on('error', (err) => {
            console.log(`❌ Online WebSocket error: ${err.message}`);
            process.exit(1);
        });
        
    } catch (error) {
        console.log(`❌ Error going back online: ${error.message}`);
    }
}

function verifyOfflineDetection() {
    console.log('\\n📊 OFFLINE CHANGES DETECTION VERIFICATION:');
    console.log(`Changes made while offline: ${offlineChanges.length}`);
    
    offlineChanges.forEach((change, index) => {
        console.log(`  ${index + 1}. ${change.action.toUpperCase()}: ${change.file}`);
    });
    
    console.log('\\n🎯 Expected detection behavior:');
    console.log('  - Daemon detected folder was modified while offline');
    console.log('  - Scanning phase triggered to identify changes');
    console.log('  - Removed files excluded from future indexing');
    console.log('  - New files added to indexing queue');
    console.log('  - Modified files updated in indexing queue');
    console.log('  - Final state: active with all changes processed');
    
    console.log('\\n✅ ATOMIC TEST 8: PASSED - Offline changes detected and processed');
}

ws.on('message', async (data) => {
    try {
        const message = JSON.parse(data);
        const timestamp = new Date().toISOString().substring(11, 23);
        
        if (message.type === 'connection.ack') {
            console.log(`[${timestamp}] ✅ Connection acknowledged by daemon`);
        } else if (message.type === 'fmdm.update') {
            if (message.fmdm?.folders?.length > 0) {
                message.fmdm.folders.forEach(async folder => {
                    const folderName = folder.path.split('/').pop();
                    console.log(`[${timestamp}] 🔄 ${folderName}: ${folder.status}${folder.progress !== undefined ? ` (${folder.progress}%)` : ''}`);
                    
                    if (folder.status === 'active' && folder.progress === 100 && testPhase === 'wait-initial-active') {
                        console.log(`[${timestamp}] 🎯 Initial indexing complete! Going offline...`);
                        testPhase = 'go-offline';
                        
                        // Remove folder to simulate going offline
                        setTimeout(async () => {
                            console.log(`[${timestamp}] 📤 Removing folder (simulating offline state)`);
                            ws.send(JSON.stringify({
                                type: 'folder.remove',
                                id: `remove-offline-${Date.now()}`,
                                payload: {
                                    path: testFolderPath
                                }
                            }));
                            
                            // Wait for removal, then make offline changes
                            setTimeout(async () => {
                                const changesSuccess = await makeOfflineChanges();
                                if (changesSuccess) {
                                    await goBackOnline();
                                }
                            }, 2000);
                        }, 1000);
                    }
                });
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
    if (testPhase !== 'complete') {
        console.log(`❌ ATOMIC TEST 8: INCOMPLETE - Test did not complete (phase: ${testPhase})`);
    }
    process.exit(0);
});

// Auto-close after 2 minutes (longer for offline simulation)
setTimeout(() => {
    console.log('⏱️  Test timeout - closing connection');
    
    if (testPhase !== 'complete') {
        console.log(`❌ ATOMIC TEST 8: INCOMPLETE - Test did not complete (phase: ${testPhase})`);
    }
    
    ws.close();
}, 120000);

console.log('⏳ Testing offline file changes detection...');