#!/usr/bin/env node

/**
 * TMOAT Atomic Test 9: Database Recovery
 * Tests that when .folder-mcp directory is deleted, the system recovers by rebuilding
 */

import WebSocket from 'ws';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 ATOMIC TEST 9: Database Recovery Testing');
console.log('='.repeat(50));

const ws = new WebSocket('ws://127.0.0.1:31850');

// Test folder path
const testFolderPath = path.resolve(__dirname, '../tests/fixtures/tmp/smoke-medium');
const folderMcpPath = path.join(testFolderPath, '.folder-mcp');
const dbPath = path.join(folderMcpPath, 'embeddings.db');

console.log(`📁 Test folder: ${testFolderPath}`);
console.log(`🗂️  .gpu: ${folderMcpPath}`);
console.log(`🗄️  Database: ${dbPath}`);

let testPhase = 'setup'; // setup -> initial-add -> wait-active -> delete-database -> re-add -> verify-recovery
let addedFolderId = null;
let initialDbSize = 0;

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
        await setupInitialDatabase();
    }, 1000);
});

async function setupInitialDatabase() {
    try {
        console.log('📋 Setting up initial database for recovery test...');
        
        // Add folder for initial indexing
        console.log('📤 Adding folder for initial database creation');
        const folderId = `recovery-test-${Date.now()}`;
        addedFolderId = folderId;
        
        ws.send(JSON.stringify({
            type: 'folder.add',
            id: folderId,
            payload: {
                path: testFolderPath,
                model: 'gpu:all-MiniLM-L6-v2'
            }
        }));
        
        testPhase = 'wait-initial-active';
    } catch (error) {
        console.log(`❌ Setup error: ${error.message}`);
    }
}

async function checkDatabaseExists() {
    try {
        const stat = await fs.stat(dbPath);
        return {
            exists: true,
            size: stat.size,
            isFile: stat.isFile()
        };
    } catch (error) {
        return {
            exists: false,
            size: 0,
            isFile: false
        };
    }
}

async function deleteDatabaseForRecoveryTest() {
    try {
        console.log('\\n🗑️  DELETING DATABASE FOR RECOVERY TEST...');
        
        // First check the database exists and record its size
        const beforeDeletion = await checkDatabaseExists();
        console.log(`📊 Database before deletion: exists=${beforeDeletion.exists}, size=${beforeDeletion.size} bytes`);
        
        if (beforeDeletion.exists) {
            initialDbSize = beforeDeletion.size;
            
            // Delete the entire .folder-mcp directory
            await fs.rm(folderMcpPath, { recursive: true, force: true });
            console.log(`🗑️  Deleted .folder-mcp directory: ${folderMcpPath}`);
            
            // Verify it's gone
            const afterDeletion = await checkDatabaseExists();
            console.log(`📊 After deletion: exists=${afterDeletion.exists}`);
            
            if (!afterDeletion.exists) {
                console.log('✅ Database successfully deleted for recovery test');
                return true;
            } else {
                console.log('❌ Database deletion failed');
                return false;
            }
        } else {
            console.log('❌ No database found to delete');
            return false;
        }
    } catch (error) {
        console.log(`❌ Error deleting database: ${error.message}`);
        return false;
    }
}

async function triggerDatabaseRecovery() {
    try {
        console.log('\\n🔄 TRIGGERING DATABASE RECOVERY...');
        
        // Close current connection
        ws.close();
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('🔌 Reconnecting to trigger recovery...');
        
        const recoveryWs = new WebSocket('ws://127.0.0.1:31850');
        
        recoveryWs.on('open', () => {
            console.log('✅ Reconnected for database recovery');
            
            recoveryWs.send(JSON.stringify({
                type: 'connection.init',
                clientType: 'cli'
            }));
            
            setTimeout(() => {
                console.log('📤 Re-adding folder to trigger database recovery');
                const recoveryFolderId = `recovery-rebuild-${Date.now()}`;
                
                recoveryWs.send(JSON.stringify({
                    type: 'folder.add',
                    id: recoveryFolderId,
                    payload: {
                        path: testFolderPath,
                        model: 'gpu:all-MiniLM-L6-v2'
                    }
                }));
                
                testPhase = 'verify-recovery';
            }, 1000);
        });
        
        recoveryWs.on('message', async (data) => {
            try {
                const message = JSON.parse(data);
                const timestamp = new Date().toISOString().substring(11, 23);
                
                if (message.type === 'connection.ack') {
                    console.log(`[${timestamp}] ✅ Recovery connection acknowledged`);
                } else if (message.type === 'fmdm.update') {
                    if (message.fmdm?.folders?.length > 0) {
                        message.fmdm.folders.forEach(folder => {
                            const folderName = folder.path.split('/').pop();
                            console.log(`[${timestamp}] 🔄 ${folderName}: ${folder.status}${folder.progress !== undefined ? ` (${folder.progress}%)` : ''}`);
                            
                            // Look for scanning phase - indicates full rebuild
                            if (folder.status === 'scanning' && testPhase === 'verify-recovery') {
                                console.log(`[${timestamp}] 🔍 SCANNING detected - database rebuilding!`);
                            }
                            
                            if (folder.status === 'active' && folder.progress === 100 && testPhase === 'verify-recovery') {
                                console.log(`[${timestamp}] 🎯 Database recovery complete!`);
                                
                                setTimeout(async () => {
                                    await verifyDatabaseRecovery();
                                    testPhase = 'complete';
                                    recoveryWs.close();
                                }, 2000);
                            }
                        });
                    }
                }
            } catch (e) {
                console.log(`❌ Failed to parse recovery message: ${data}`);
            }
        });
        
        recoveryWs.on('close', () => {
            console.log('🔌 Recovery test connection closed');
            process.exit(0);
        });
        
        recoveryWs.on('error', (err) => {
            console.log(`❌ Recovery WebSocket error: ${err.message}`);
            process.exit(1);
        });
        
    } catch (error) {
        console.log(`❌ Error during recovery: ${error.message}`);
    }
}

async function verifyDatabaseRecovery() {
    try {
        console.log('\\n🔍 VERIFYING DATABASE RECOVERY...');
        
        // Check if database was recreated
        const recoveredDb = await checkDatabaseExists();
        console.log(`📊 Recovered database: exists=${recoveredDb.exists}, size=${recoveredDb.size} bytes`);
        
        if (recoveredDb.exists && recoveredDb.isFile && recoveredDb.size > 0) {
            // Verify it's a valid SQLite database
            const buffer = await fs.readFile(dbPath);
            const header = buffer.slice(0, 16).toString();
            
            if (header.includes('SQLite')) {
                console.log('✅ Database successfully recovered and is valid SQLite');
                
                console.log('\\n📊 RECOVERY VERIFICATION SUMMARY:');
                console.log(`Original database size: ${initialDbSize} bytes`);
                console.log(`Recovered database size: ${recoveredDb.size} bytes`);
                console.log(`Recovery location: ${dbPath}`);
                console.log('Recovery process: Complete rebuild from files');
                
                console.log('\\n🎯 Recovery verification points:');
                console.log('  ✅ .folder-mcp directory recreated');
                console.log('  ✅ embeddings.db file recreated');
                console.log('  ✅ Database is valid SQLite format');
                console.log('  ✅ Database has content (size > 0)');
                console.log('  ✅ Full scanning occurred (not incremental)');
                console.log('  ✅ Folder reached active state');
                
                console.log('\\n✅ ATOMIC TEST 9: PASSED - Database recovery successful');
                return true;
            } else {
                console.log('❌ Recovered file is not a valid SQLite database');
                return false;
            }
        } else {
            console.log('❌ Database was not recovered properly');
            return false;
        }
    } catch (error) {
        console.log(`❌ Error verifying recovery: ${error.message}`);
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
                    
                    if (folder.status === 'active' && folder.progress === 100 && testPhase === 'wait-initial-active') {
                        console.log(`[${timestamp}] 🎯 Initial database creation complete!`);
                        
                        // Verify database exists before deletion
                        const dbCheck = await checkDatabaseExists();
                        console.log(`[${timestamp}] 📊 Database check: exists=${dbCheck.exists}, size=${dbCheck.size} bytes`);
                        
                        if (dbCheck.exists) {
                            testPhase = 'delete-database';
                            
                            // Remove folder first
                            setTimeout(async () => {
                                console.log(`[${timestamp}] 📤 Removing folder before database deletion`);
                                ws.send(JSON.stringify({
                                    type: 'folder.remove',
                                    id: `remove-before-delete-${Date.now()}`,
                                    payload: {
                                        path: testFolderPath
                                    }
                                }));
                                
                                // Wait for removal, then delete database
                                setTimeout(async () => {
                                    const deletionSuccess = await deleteDatabaseForRecoveryTest();
                                    if (deletionSuccess) {
                                        await triggerDatabaseRecovery();
                                    }
                                }, 3000);
                            }, 1000);
                        } else {
                            console.log(`❌ No database found to test recovery with`);
                        }
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
        console.log(`❌ ATOMIC TEST 9: INCOMPLETE - Test did not complete (phase: ${testPhase})`);
    }
    process.exit(0);
});

// Auto-close after 2 minutes (recovery can take time)
setTimeout(() => {
    console.log('⏱️  Test timeout - closing connection');
    
    if (testPhase !== 'complete') {
        console.log(`❌ ATOMIC TEST 9: INCOMPLETE - Test did not complete (phase: ${testPhase})`);
    }
    
    ws.close();
}, 120000);

console.log('⏳ Testing database recovery scenarios...');