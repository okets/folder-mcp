#!/usr/bin/env node

/**
 * TMOAT Atomic Test 5: Database Creation & Verification
 * Tests that .folder-mcp/embeddings.db is created at correct location with proper structure
 */

import WebSocket from 'ws';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 ATOMIC TEST 5: Database Creation & Verification');
console.log('='.repeat(50));

const ws = new WebSocket('ws://127.0.0.1:31850');

// Test folder path
const testFolderPath = path.resolve(__dirname, '../tests/fixtures/tmp/smoke-small');
const expectedDbPath = path.join(testFolderPath, '.folder-mcp', 'embeddings.db');

console.log(`📁 Test folder: ${testFolderPath}`);
console.log(`🗄️  Expected DB: ${expectedDbPath}`);

let folderActive = false;
let testPhase = 'setup'; // setup -> waiting-active -> checking-db -> complete

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
        console.log('📤 Adding folder for database test');
        const folderId = `db-test-${Date.now()}`;
        
        ws.send(JSON.stringify({
            type: 'folder.add',
            id: folderId,
            payload: {
                path: testFolderPath,
                model: 'gpu:all-MiniLM-L6-v2'
            }
        }));
        
        testPhase = 'waiting-active';
    }, 1000);
});

async function checkDatabaseCreation() {
    try {
        console.log('\n🔍 CHECKING DATABASE CREATION...');
        
        // Check if .folder-mcp directory exists
        const folderMcpDir = path.dirname(expectedDbPath);
        try {
            const stat = await fs.stat(folderMcpDir);
            if (stat.isDirectory()) {
                console.log('✅ .folder-mcp directory exists');
            } else {
                console.log('❌ .folder-mcp exists but is not a directory');
                return false;
            }
        } catch (error) {
            console.log('❌ .folder-mcp directory does not exist');
            return false;
        }
        
        // Check if embeddings.db exists
        try {
            const dbStat = await fs.stat(expectedDbPath);
            if (dbStat.isFile() && dbStat.size > 0) {
                console.log(`✅ embeddings.db exists (${dbStat.size} bytes)`);
                
                // Try to read the file to verify it's a valid SQLite database
                const buffer = await fs.readFile(expectedDbPath);
                const header = buffer.slice(0, 16).toString();
                if (header.includes('SQLite')) {
                    console.log('✅ Database file appears to be valid SQLite');
                    return true;
                } else {
                    console.log('❌ Database file does not appear to be SQLite format');
                    return false;
                }
            } else {
                console.log('❌ embeddings.db exists but is empty or not a file');
                return false;
            }
        } catch (error) {
            console.log('❌ embeddings.db does not exist');
            return false;
        }
    } catch (error) {
        console.log(`❌ Error checking database: ${error.message}`);
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
            if (message.fmdm?.folders?.length > 0) {
                message.fmdm.folders.forEach(async folder => {
                    const folderName = folder.path.split('/').pop();
                    console.log(`[${timestamp}] 🔄 ${folderName}: ${folder.status}${folder.progress !== undefined ? ` (${folder.progress}%)` : ''}`);
                    
                    // Check when folder becomes active
                    if (folder.status === 'active' && folder.progress === 100 && testPhase === 'waiting-active') {
                        console.log(`[${timestamp}] 🎯 Folder is active! Starting database verification...`);
                        testPhase = 'checking-db';
                        folderActive = true;
                        
                        // Wait a moment for any final database operations
                        setTimeout(async () => {
                            const dbExists = await checkDatabaseCreation();
                            
                            console.log('\n📊 DATABASE VERIFICATION SUMMARY:');
                            console.log(`Test folder: ${testFolderPath}`);
                            console.log(`Expected DB path: ${expectedDbPath}`);
                            console.log(`Database created: ${dbExists ? '✅ YES' : '❌ NO'}`);
                            
                            if (dbExists) {
                                console.log('\n✅ ATOMIC TEST 5: PASSED - Database created correctly');
                            } else {
                                console.log('\n❌ ATOMIC TEST 5: FAILED - Database not created or invalid');
                            }
                            
                            testPhase = 'complete';
                            ws.close();
                        }, 3000);
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
    process.exit(0);
});

// Auto-close after 30 seconds
setTimeout(() => {
    console.log('⏱️  Test timeout - closing connection');
    
    if (!folderActive) {
        console.log('❌ ATOMIC TEST 5: FAILED - Folder never reached active state');
    } else if (testPhase !== 'complete') {
        console.log('❌ ATOMIC TEST 5: INCOMPLETE - Database verification did not complete');
    }
    
    ws.close();
}, 30000);

console.log('⏳ Connecting to daemon and testing database creation...');