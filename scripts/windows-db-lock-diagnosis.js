#!/usr/bin/env node

/**
 * Windows Database Lock Diagnosis Script
 * 
 * This script comprehensively tests SQLite database file locking behavior on Windows
 * to diagnose the cleanup test failure issue affecting both NVIDIA and AMD systems.
 * 
 * Run this script and send the complete output to analyze the Windows file lock patterns.
 */

import Database from 'better-sqlite3';
import { existsSync, rmSync, writeFileSync } from 'fs';
import { mkdir, rm } from 'fs/promises';
import path from 'path';
import { hrtime } from 'process';
import { execSync } from 'child_process';

const SCRIPT_VERSION = '1.0.0';
const TEST_DIR = './tmp/windows-db-diagnosis';
const MAX_WAIT_TIME = 60000; // 60 seconds max wait

console.log('🔍 Windows Database Lock Diagnosis Script');
console.log('========================================');
console.log(`Version: ${SCRIPT_VERSION}`);
console.log(`Platform: ${process.platform}`);
console.log(`Node.js: ${process.version}`);
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log('');

// System Information
function getSystemInfo() {
    console.log('📋 SYSTEM INFORMATION');
    console.log('--------------------');
    
    try {
        if (process.platform === 'win32') {
            const osInfo = execSync('wmic os get Caption,Version /format:list', { encoding: 'utf8' });
            console.log('OS Info:', osInfo.replace(/\r?\n/g, ' ').trim());
            
            const memInfo = execSync('wmic computersystem get TotalPhysicalMemory /format:list', { encoding: 'utf8' });
            console.log('Memory:', memInfo.replace(/\r?\n/g, ' ').trim());
            
            const procInfo = execSync('wmic cpu get Name /format:list', { encoding: 'utf8' });
            console.log('CPU:', procInfo.replace(/\r?\n/g, ' ').trim());
        } else {
            console.log('Platform:', process.platform);
            console.log('Architecture:', process.arch);
        }
    } catch (error) {
        console.log('Error getting system info:', error.message);
    }
    console.log('');
}

// Test 1: Basic WAL Database Lock Test
async function testBasicWALLock() {
    console.log('🗄️  TEST 1: Basic WAL Database Lock Behavior');
    console.log('--------------------------------------------');
    
    const testDir = path.join(TEST_DIR, 'basic-wal');
    const dbPath = path.join(testDir, 'test.db');
    
    try {
        // Setup
        await mkdir(testDir, { recursive: true });
        console.log(`Created test directory: ${testDir}`);
        
        // Create database with WAL mode (same as production)
        console.log('Creating database with WAL mode...');
        const db = new Database(dbPath);
        db.pragma('journal_mode = WAL');
        db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, data TEXT)');
        
        // Insert data to ensure WAL file creation
        for (let i = 0; i < 100; i++) {
            db.exec(`INSERT INTO test (data) VALUES ('test data ${i}')`);
        }
        
        console.log('Database populated with test data');
        
        // Check auxiliary files
        const walPath = `${dbPath}-wal`;
        const shmPath = `${dbPath}-shm`;
        
        console.log(`Main DB exists: ${existsSync(dbPath)}`);
        console.log(`WAL file exists: ${existsSync(walPath)}`);
        console.log(`SHM file exists: ${existsSync(shmPath)}`);
        
        if (existsSync(walPath)) {
            const fs = await import('fs');
            const walStats = fs.statSync(walPath);
            console.log(`WAL file size: ${walStats.size} bytes`);
        }
        
        // Test immediate close and delete
        console.log('\nTesting immediate close and delete...');
        const closeStart = hrtime.bigint();
        db.close();
        const closeTime = Number(hrtime.bigint() - closeStart) / 1000000;
        console.log(`Database closed in ${closeTime.toFixed(2)}ms`);
        
        // Try immediate deletion
        const deleteStart = hrtime.bigint();
        try {
            await rm(testDir, { recursive: true, force: true });
            const deleteTime = Number(hrtime.bigint() - deleteStart) / 1000000;
            console.log(`✅ SUCCESS: Immediate deletion in ${deleteTime.toFixed(2)}ms`);
            return { success: true, immediateDelete: true, deleteTime };
        } catch (error) {
            console.log(`❌ FAILED: Immediate deletion failed - ${error.message}`);
            
            // Test with progressive delays
            const delays = [500, 1000, 2000, 5000, 10000, 15000, 30000];
            
            for (const delay of delays) {
                console.log(`Waiting ${delay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                
                try {
                    await rm(testDir, { recursive: true, force: true });
                    const totalTime = Number(hrtime.bigint() - deleteStart) / 1000000;
                    console.log(`✅ SUCCESS: Deletion worked after ${delay}ms delay (total: ${totalTime.toFixed(2)}ms)`);
                    return { success: true, immediateDelete: false, deleteTime: totalTime, requiredDelay: delay };
                } catch (retryError) {
                    console.log(`❌ Still locked after ${delay}ms delay`);
                }
            }
            
            console.log('❌ COMPLETE FAILURE: Could not delete after maximum delays');
            return { success: false, error: error.message };
        }
    } catch (error) {
        console.log(`💥 Test setup failed: ${error.message}`);
        return { success: false, setupError: error.message };
    }
    
    console.log('');
}

// Test 2: Multiple Database Instances
async function testMultipleDatabases() {
    console.log('🗂️  TEST 2: Multiple Database Lock Behavior');
    console.log('------------------------------------------');
    
    const testDir = path.join(TEST_DIR, 'multiple-db');
    const results = [];
    
    try {
        await mkdir(testDir, { recursive: true });
        
        // Create 3 databases simultaneously
        const databases = [];
        for (let i = 1; i <= 3; i++) {
            const dbPath = path.join(testDir, `test${i}.db`);
            const db = new Database(dbPath);
            db.pragma('journal_mode = WAL');
            db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, data TEXT)');
            db.exec(`INSERT INTO test (data) VALUES ('database ${i} data')`);
            databases.push({ db, path: dbPath, id: i });
            console.log(`Created database ${i}: ${dbPath}`);
        }
        
        // Close all databases
        console.log('\nClosing all databases...');
        const closeStart = hrtime.bigint();
        databases.forEach(({ db, id }) => {
            db.close();
            console.log(`Database ${id} closed`);
        });
        const totalCloseTime = Number(hrtime.bigint() - closeStart) / 1000000;
        console.log(`All databases closed in ${totalCloseTime.toFixed(2)}ms`);
        
        // Try to delete directory
        try {
            await rm(testDir, { recursive: true, force: true });
            console.log('✅ SUCCESS: Multiple databases deleted immediately');
            results.push({ test: 'multiple', success: true, immediate: true });
        } catch (error) {
            console.log(`❌ FAILED: Multiple database deletion failed - ${error.message}`);
            
            // Wait and retry
            await new Promise(resolve => setTimeout(resolve, 5000));
            try {
                await rm(testDir, { recursive: true, force: true });
                console.log('✅ SUCCESS: Multiple databases deleted after 5s delay');
                results.push({ test: 'multiple', success: true, immediate: false, delay: 5000 });
            } catch (retryError) {
                console.log(`❌ FAILED: Multiple databases still locked after delay`);
                results.push({ test: 'multiple', success: false, error: retryError.message });
            }
        }
        
    } catch (error) {
        console.log(`💥 Multiple database test failed: ${error.message}`);
        results.push({ test: 'multiple', success: false, setupError: error.message });
    }
    
    console.log('');
    return results;
}

// Test 3: Transaction and WAL Checkpoint Behavior
async function testTransactionBehavior() {
    console.log('💾 TEST 3: Transaction and WAL Checkpoint Behavior');
    console.log('-------------------------------------------------');
    
    const testDir = path.join(TEST_DIR, 'transaction');
    const dbPath = path.join(testDir, 'test.db');
    
    try {
        await mkdir(testDir, { recursive: true });
        
        const db = new Database(dbPath);
        db.pragma('journal_mode = WAL');
        db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, data TEXT)');
        
        console.log('Starting large transaction...');
        
        // Large transaction to create significant WAL content
        const insert = db.prepare('INSERT INTO test (data) VALUES (?)');
        const transaction = db.transaction((count) => {
            for (let i = 0; i < count; i++) {
                insert.run(`Large transaction data ${i} ${'x'.repeat(100)}`);
            }
        });
        
        transaction(1000); // Insert 1000 records
        console.log('Large transaction completed');
        
        // Check WAL file size
        const walPath = `${dbPath}-wal`;
        if (existsSync(walPath)) {
            const fs = await import('fs');
            const walStats = fs.statSync(walPath);
            console.log(`WAL file size after transaction: ${walStats.size} bytes`);
        }
        
        // Test 1: Close without checkpoint
        console.log('\nTest 1: Close without explicit checkpoint');
        const closeStart1 = hrtime.bigint();
        db.close();
        const closeTime1 = Number(hrtime.bigint() - closeStart1) / 1000000;
        console.log(`Close time: ${closeTime1.toFixed(2)}ms`);
        
        try {
            await rm(testDir, { recursive: true, force: true });
            console.log('✅ SUCCESS: Deleted without checkpoint');
        } catch (error) {
            console.log(`❌ FAILED: Could not delete without checkpoint - ${error.message}`);
            
            // Wait and retry
            await new Promise(resolve => setTimeout(resolve, 3000));
            try {
                await rm(testDir, { recursive: true, force: true });
                console.log('✅ SUCCESS: Deleted after 3s delay');
            } catch (retryError) {
                console.log(`❌ FAILED: Still locked after delay`);
                return { success: false, error: retryError.message };
            }
        }
        
        // Test 2: With explicit checkpoint
        await mkdir(testDir, { recursive: true });
        const db2 = new Database(dbPath);
        db2.pragma('journal_mode = WAL');
        db2.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, data TEXT)');
        
        const insert2 = db2.prepare('INSERT INTO test (data) VALUES (?)');
        const transaction2 = db2.transaction((count) => {
            for (let i = 0; i < count; i++) {
                insert2.run(`Checkpoint test data ${i}`);
            }
        });
        
        transaction2(500);
        console.log('\nTest 2: Close with explicit checkpoint');
        
        // Force WAL checkpoint before close
        console.log('Executing WAL checkpoint...');
        const checkpointStart = hrtime.bigint();
        db2.pragma('wal_checkpoint(TRUNCATE)');
        const checkpointTime = Number(hrtime.bigint() - checkpointStart) / 1000000;
        console.log(`Checkpoint time: ${checkpointTime.toFixed(2)}ms`);
        
        const closeStart2 = hrtime.bigint();
        db2.close();
        const closeTime2 = Number(hrtime.bigint() - closeStart2) / 1000000;
        console.log(`Close time: ${closeTime2.toFixed(2)}ms`);
        
        try {
            await rm(testDir, { recursive: true, force: true });
            console.log('✅ SUCCESS: Deleted immediately with checkpoint');
            return { success: true, checkpoint: true, immediate: true };
        } catch (error) {
            console.log(`❌ FAILED: Could not delete even with checkpoint - ${error.message}`);
            return { success: false, checkpoint: true, error: error.message };
        }
        
    } catch (error) {
        console.log(`💥 Transaction test failed: ${error.message}`);
        return { success: false, setupError: error.message };
    }
    
    console.log('');
}

// Test 4: Real TMOAT Scenario Simulation
async function testTMOATScenario() {
    console.log('🎯 TEST 4: TMOAT Scenario Simulation');
    console.log('------------------------------------');
    
    const testDir = path.join(TEST_DIR, 'tmoat-sim');
    const folderMcpDir = path.join(testDir, '.folder-mcp');
    const dbPath = path.join(folderMcpDir, 'embeddings.db');
    
    try {
        // Simulate exact TMOAT folder structure
        await mkdir(folderMcpDir, { recursive: true });
        console.log('Created .folder-mcp directory structure');
        
        // Create database exactly like production
        console.log('Creating production-like database...');
        const db = new Database(dbPath);
        
        // Production database configuration
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
        db.pragma('cache_size = 10000');
        db.pragma('synchronous = NORMAL');
        db.pragma('temp_store = MEMORY');
        db.pragma('mmap_size = 268435456'); // 256MB
        
        // Create production-like schema
        db.exec(`
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                file_path TEXT NOT NULL,
                content_hash TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                last_modified INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        db.exec(`
            CREATE TABLE IF NOT EXISTS chunks (
                id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL,
                chunk_index INTEGER NOT NULL,
                content TEXT NOT NULL,
                content_hash TEXT NOT NULL,
                token_count INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
            )
        `);
        
        db.exec(`
            CREATE TABLE IF NOT EXISTS embeddings (
                chunk_id TEXT PRIMARY KEY,
                embedding BLOB NOT NULL,
                model_name TEXT NOT NULL,
                model_dimension INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (chunk_id) REFERENCES chunks(id) ON DELETE CASCADE
            )
        `);
        
        console.log('Production schema created');
        
        // Insert production-like data
        console.log('Inserting production-like data...');
        const docInsert = db.prepare('INSERT INTO documents (id, file_path, content_hash, file_size, last_modified) VALUES (?, ?, ?, ?, ?)');
        const chunkInsert = db.prepare('INSERT INTO chunks (id, document_id, chunk_index, content, content_hash, token_count) VALUES (?, ?, ?, ?, ?, ?)');
        const embeddingInsert = db.prepare('INSERT INTO embeddings (chunk_id, embedding, model_name, model_dimension) VALUES (?, ?, ?, ?)');
        
        const insertData = db.transaction(() => {
            for (let docId = 1; docId <= 10; docId++) {
                const documentId = `doc_${docId}`;
                docInsert.run(documentId, `/test/path/doc${docId}.txt`, `hash_${docId}`, 1000 + docId, Date.now());
                
                for (let chunkId = 1; chunkId <= 5; chunkId++) {
                    const chunkKey = `${documentId}_chunk_${chunkId}`;
                    const content = `This is chunk ${chunkId} content for document ${docId} with some lengthy text data to simulate real chunks`;
                    chunkInsert.run(chunkKey, documentId, chunkId, content, `chunk_hash_${chunkKey}`, content.length);
                    
                    // Simulate embedding vector (384 dimensions like all-MiniLM-L6-v2)
                    const embedding = Buffer.from(new Float32Array(384).fill(0.1 * chunkId));
                    embeddingInsert.run(chunkKey, embedding, 'folder-mcp:all-MiniLM-L6-v2', 384);
                }
            }
        });
        
        insertData();
        console.log('Production data inserted (10 docs, 50 chunks, 50 embeddings)');
        
        // Check WAL file after production-like usage
        const walPath = `${dbPath}-wal`;
        const shmPath = `${dbPath}-shm`;
        
        if (existsSync(walPath)) {
            const fs = await import('fs');
            const walStats = fs.statSync(walPath);
            console.log(`WAL file size: ${walStats.size} bytes`);
        }
        
        // Simulate production close sequence
        console.log('\nSimulating production close sequence...');
        const productionCloseStart = hrtime.bigint();
        
        // Close database (like FolderLifecycleService.stop())
        db.close();
        
        const productionCloseTime = Number(hrtime.bigint() - productionCloseStart) / 1000000;
        console.log(`Production close time: ${productionCloseTime.toFixed(2)}ms`);
        
        // Simulate Windows delay like production code
        if (process.platform === 'win32') {
            console.log('Applying production Windows delay (2000ms)...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Attempt cleanup like MonitoredFoldersOrchestrator.removeFolder()
        console.log('Attempting .folder-mcp directory cleanup...');
        const cleanupStart = hrtime.bigint();
        
        try {
            await rm(folderMcpDir, { recursive: true, force: true });
            const cleanupTime = Number(hrtime.bigint() - cleanupStart) / 1000000;
            console.log(`✅ SUCCESS: TMOAT cleanup successful in ${cleanupTime.toFixed(2)}ms`);
            return { success: true, cleanupTime, withDelay: process.platform === 'win32' };
        } catch (error) {
            const failureTime = Number(hrtime.bigint() - cleanupStart) / 1000000;
            console.log(`❌ FAILED: TMOAT cleanup failed after ${failureTime.toFixed(2)}ms`);
            console.log(`Error: ${error.message}`);
            
            // Check what files still exist
            console.log('\nChecking remaining files:');
            try {
                const fs = await import('fs');
                if (existsSync(folderMcpDir)) {
                    const contents = fs.readdirSync(folderMcpDir);
                    console.log(`Contents still in .folder-mcp: ${contents.join(', ')}`);
                    
                    for (const file of contents) {
                        const filePath = path.join(folderMcpDir, file);
                        const stats = fs.statSync(filePath);
                        console.log(`  ${file}: ${stats.size} bytes, modified: ${stats.mtime}`);
                    }
                }
            } catch (listError) {
                console.log(`Error listing files: ${listError.message}`);
            }
            
            return { success: false, error: error.message, failureTime };
        }
        
    } catch (error) {
        console.log(`💥 TMOAT simulation failed: ${error.message}`);
        return { success: false, setupError: error.message };
    }
    
    console.log('');
}

// Test 5: Process and Handle Investigation
function testProcessHandles() {
    console.log('🔍 TEST 5: Process Handle Investigation');
    console.log('-------------------------------------');
    
    if (process.platform !== 'win32') {
        console.log('⚠️  Process handle investigation only available on Windows');
        console.log('');
        return { skipped: true, reason: 'Not Windows' };
    }
    
    try {
        console.log('Current Node.js Process Info:');
        console.log(`PID: ${process.pid}`);
        console.log(`Memory Usage:`, process.memoryUsage());
        
        // Try to get open handles (requires external tools)
        try {
            const handleOutput = execSync(`wmic process where processid=${process.pid} get CommandLine,PageFileUsage,WorkingSetSize /format:list`, { encoding: 'utf8' });
            console.log('Process Details:', handleOutput.replace(/\r?\n/g, ' ').trim());
        } catch (handleError) {
            console.log('Could not get detailed process info:', handleError.message);
        }
        
        // List Node.js processes
        try {
            const nodeProcesses = execSync('wmic process where "name=\'node.exe\'" get ProcessId,CommandLine /format:list', { encoding: 'utf8' });
            console.log('\nAll Node.js processes:');
            console.log(nodeProcesses);
        } catch (nodeError) {
            console.log('Could not list Node.js processes:', nodeError.message);
        }
        
        return { success: true, pid: process.pid };
        
    } catch (error) {
        console.log(`💥 Process investigation failed: ${error.message}`);
        return { success: false, error: error.message };
    }
    
    console.log('');
}

// Test 6: Timing Statistics
async function testTimingStatistics() {
    console.log('📊 TEST 6: Timing Statistics (10 iterations)');
    console.log('---------------------------------------------');
    
    const results = [];
    const testDir = path.join(TEST_DIR, 'timing-stats');
    
    for (let i = 1; i <= 10; i++) {
        console.log(`\nIteration ${i}/10:`);
        
        const iterationDir = path.join(testDir, `iteration-${i}`);
        const dbPath = path.join(iterationDir, 'timing.db');
        
        try {
            await mkdir(iterationDir, { recursive: true });
            
            // Create and populate database
            const setupStart = hrtime.bigint();
            const db = new Database(dbPath);
            db.pragma('journal_mode = WAL');
            db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, data TEXT)');
            
            // Insert variable amount of data
            const recordCount = 50 + (i * 10); // 60, 70, 80... 150 records
            const insert = db.prepare('INSERT INTO test (data) VALUES (?)');
            const transaction = db.transaction((count) => {
                for (let j = 0; j < count; j++) {
                    insert.run(`Test data ${j} iteration ${i} ${'x'.repeat(50)}`);
                }
            });
            transaction(recordCount);
            
            const setupTime = Number(hrtime.bigint() - setupStart) / 1000000;
            
            // Close database
            const closeStart = hrtime.bigint();
            db.close();
            const closeTime = Number(hrtime.bigint() - closeStart) / 1000000;
            
            // Measure deletion time
            let deleteTime = null;
            let attempts = 0;
            const deleteStart = hrtime.bigint();
            
            while (deleteTime === null && attempts < 40) { // Max 20 seconds of attempts
                attempts++;
                try {
                    await rm(iterationDir, { recursive: true, force: true });
                    deleteTime = Number(hrtime.bigint() - deleteStart) / 1000000;
                    break;
                } catch (error) {
                    if (attempts < 40) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }
            }
            
            const result = {
                iteration: i,
                recordCount,
                setupTime,
                closeTime,
                deleteTime,
                attempts,
                success: deleteTime !== null
            };
            
            results.push(result);
            
            console.log(`  Records: ${recordCount}, Setup: ${setupTime.toFixed(1)}ms, Close: ${closeTime.toFixed(1)}ms`);
            if (deleteTime !== null) {
                console.log(`  ✅ Delete: ${deleteTime.toFixed(1)}ms (${attempts} attempts)`);
            } else {
                console.log(`  ❌ Delete: FAILED after ${attempts} attempts`);
            }
            
        } catch (error) {
            console.log(`  💥 Iteration ${i} failed: ${error.message}`);
            results.push({
                iteration: i,
                success: false,
                error: error.message
            });
        }
    }
    
    // Calculate statistics
    const successful = results.filter(r => r.success && r.deleteTime !== null);
    const failed = results.filter(r => !r.success || r.deleteTime === null);
    
    console.log('\n📈 TIMING STATISTICS SUMMARY:');
    console.log(`Successful deletions: ${successful.length}/10`);
    console.log(`Failed deletions: ${failed.length}/10`);
    
    if (successful.length > 0) {
        const deleteTimes = successful.map(r => r.deleteTime);
        const attempts = successful.map(r => r.attempts);
        
        console.log(`Average delete time: ${(deleteTimes.reduce((a, b) => a + b, 0) / deleteTimes.length).toFixed(1)}ms`);
        console.log(`Min delete time: ${Math.min(...deleteTimes).toFixed(1)}ms`);
        console.log(`Max delete time: ${Math.max(...deleteTimes).toFixed(1)}ms`);
        console.log(`Average attempts: ${(attempts.reduce((a, b) => a + b, 0) / attempts.length).toFixed(1)}`);
        console.log(`Max attempts: ${Math.max(...attempts)}`);
    }
    
    if (failed.length > 0) {
        console.log(`Failed iterations: ${failed.map(r => r.iteration).join(', ')}`);
    }
    
    console.log('');
    return results;
}

// Main execution
async function runDiagnosis() {
    const startTime = hrtime.bigint();
    
    try {
        // Clean up any existing test directory
        if (existsSync(TEST_DIR)) {
            await rm(TEST_DIR, { recursive: true, force: true });
        }
        await mkdir(TEST_DIR, { recursive: true });
        
        getSystemInfo();
        
        const results = {
            version: SCRIPT_VERSION,
            platform: process.platform,
            nodeVersion: process.version,
            timestamp: new Date().toISOString(),
            tests: {}
        };
        
        // Run all tests
        results.tests.basicWAL = await testBasicWALLock();
        results.tests.multipleDatabases = await testMultipleDatabases();
        results.tests.transactions = await testTransactionBehavior();
        results.tests.tmoatSimulation = await testTMOATScenario();
        results.tests.processHandles = testProcessHandles();
        results.tests.timingStatistics = await testTimingStatistics();
        
        const totalTime = Number(hrtime.bigint() - startTime) / 1000000000; // Convert to seconds
        
        console.log('🏁 DIAGNOSIS COMPLETE');
        console.log('====================');
        console.log(`Total runtime: ${totalTime.toFixed(1)} seconds`);
        console.log('');
        
        // Summary
        console.log('📋 EXECUTIVE SUMMARY:');
        console.log('---------------------');
        console.log(`Platform: ${process.platform}`);
        console.log(`Basic WAL test: ${results.tests.basicWAL.success ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Multiple DB test: ${results.tests.multipleDatabases.length > 0 && results.tests.multipleDatabases[0].success ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Transaction test: ${results.tests.transactions.success ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`TMOAT simulation: ${results.tests.tmoatSimulation.success ? '✅ PASS' : '❌ FAIL'}`);
        
        if (results.tests.timingStatistics && Array.isArray(results.tests.timingStatistics)) {
            const successCount = results.tests.timingStatistics.filter(r => r.success).length;
            console.log(`Timing statistics: ${successCount}/10 successful`);
        }
        
        console.log('');
        console.log('📤 SAVE THIS OUTPUT:');
        console.log('This complete output contains all diagnostic information.');
        console.log('Please send the entire console output for analysis.');
        
        // Save detailed results to file
        const resultsFile = path.join(TEST_DIR, 'diagnosis-results.json');
        writeFileSync(resultsFile, JSON.stringify(results, null, 2));
        console.log(`Detailed results saved to: ${resultsFile}`);
        
    } catch (error) {
        console.log(`💥 DIAGNOSIS FAILED: ${error.message}`);
        console.log(error.stack);
    } finally {
        // Cleanup
        try {
            if (existsSync(TEST_DIR)) {
                await rm(TEST_DIR, { recursive: true, force: true });
                console.log('Cleanup completed');
            }
        } catch (cleanupError) {
            console.log(`⚠️  Cleanup failed: ${cleanupError.message}`);
        }
    }
}

// Run diagnosis
runDiagnosis().catch(error => {
    console.log(`💥 FATAL ERROR: ${error.message}`);
    console.log(error.stack);
    process.exit(1);
});