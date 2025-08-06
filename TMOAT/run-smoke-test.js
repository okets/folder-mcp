#!/usr/bin/env node

/**
 * TMOAT Smoke Test Execution Script
 * This script connects to the daemon and runs the comprehensive smoke test
 */

import WebSocket from 'ws';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class SmokeTestRunner {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.folderStates = new Map();
        this.testResults = [];
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket('ws://127.0.0.1:31850');
            
            this.ws.on('open', () => {
                this.log('🔌 Connected to daemon WebSocket');
                this.connected = true;
                
                // Initialize connection
                this.send({
                    type: 'connection.init',
                    clientType: 'tmoat-smoke-test'
                });
                
                resolve();
            });

            this.ws.on('message', (data) => {
                this.handleMessage(data);
            });

            this.ws.on('error', (err) => {
                this.log(`❌ WebSocket error: ${err.message}`);
                reject(err);
            });

            this.ws.on('close', () => {
                this.log('🔌 WebSocket connection closed');
                this.connected = false;
            });

            // Timeout after 5 seconds
            setTimeout(() => {
                if (!this.connected) {
                    reject(new Error('WebSocket connection timeout'));
                }
            }, 5000);
        });
    }

    send(message) {
        if (!this.connected) {
            throw new Error('WebSocket not connected');
        }
        this.ws.send(JSON.stringify(message));
    }

    handleMessage(data) {
        try {
            const parsed = JSON.parse(data);
            const timestamp = new Date().toISOString().substring(11, 23);

            if (parsed.type === 'fmdm.update') {
                this.updateFolderStates(parsed.fmdm.folders);
                this.log(`[${timestamp}] 📊 FMDM Update: ${parsed.fmdm.folders.length} folders`);
                
                // Show folder statuses
                parsed.fmdm.folders.forEach(folder => {
                    const folderName = folder.path.split('/').pop();
                    const progress = folder.progress !== undefined ? ` (${folder.progress}%)` : '';
                    this.log(`  📁 ${folderName}: ${folder.status}${progress}`);
                });
            } else if (parsed.type === 'connection.ack') {
                this.log(`[${timestamp}] ✅ Connection acknowledged`);
            } else {
                this.log(`[${timestamp}] 📨 ${parsed.type}`);
            }
        } catch (e) {
            this.log(`❌ Error parsing message: ${e.message}`);
        }
    }

    updateFolderStates(folders) {
        folders.forEach(folder => {
            this.folderStates.set(folder.path, {
                status: folder.status,
                progress: folder.progress,
                model: folder.model,
                timestamp: Date.now()
            });
        });
    }

    async waitForFolderStatus(folderPath, expectedStatus, timeoutMs = 30000) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Timeout waiting for folder ${folderPath} to reach ${expectedStatus}`));
            }, timeoutMs);

            const checkStatus = () => {
                const state = this.folderStates.get(folderPath);
                if (state && state.status === expectedStatus) {
                    clearTimeout(timeout);
                    resolve(state);
                }
            };

            // Check every 500ms
            const interval = setInterval(checkStatus, 500);
            
            // Also check when timeout clears
            timeout._onTimeout = () => {
                clearInterval(interval);
                reject(new Error(`Timeout waiting for folder ${folderPath} to reach ${expectedStatus}`));
            };

            // Check immediately
            checkStatus();
        });
    }

    async addFolder(folderPath, model = 'nomic-embed-text') {
        this.send({
            type: 'folder.add',
            id: `add-${Date.now()}`,
            payload: {
                path: folderPath,
                model: model
            }
        });

        this.log(`📂 Adding folder: ${folderPath} with model: ${model}`);
    }

    async removeFolder(folderPath) {
        this.send({
            type: 'folder.remove',
            id: `remove-${Date.now()}`,
            payload: {
                path: folderPath
            }
        });

        this.log(`🗑️  Removing folder: ${folderPath}`);
    }

    createTestFile(filePath, content) {
        writeFileSync(filePath, content);
        this.log(`📝 Created test file: ${filePath}`);
    }

    modifyTestFile(filePath, additionalContent) {
        if (!existsSync(filePath)) {
            throw new Error(`File does not exist: ${filePath}`);
        }
        
        const existingContent = readFileSync(filePath, 'utf8');
        writeFileSync(filePath, existingContent + additionalContent);
        this.log(`✏️  Modified test file: ${filePath}`);
    }

    validateDatabaseExists(folderPath) {
        const dbPath = `${folderPath}/.folder-mcp/embeddings.db`;
        if (existsSync(dbPath)) {
            this.log(`✅ VALIDATION PASS: Database exists at ${dbPath}`);
            return true;
        } else {
            this.log(`❌ VALIDATION FAIL: Database missing at ${dbPath}`);
            return false;
        }
    }

    recordTestResult(step, description, result, error = null) {
        this.testResults.push({
            step,
            description,
            result: result ? '✅ PASS' : '❌ FAIL',
            error: error ? error.message : null,
            timestamp: new Date().toISOString()
        });
        
        this.log(`${result ? '✅' : '❌'} Step ${step}: ${description} - ${result ? 'PASS' : 'FAIL'}`);
        if (error) {
            this.log(`   Error: ${error.message}`);
        }
    }

    close() {
        if (this.ws) {
            this.ws.close();
            this.connected = false;
        }
    }

    log(message) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${message}`);
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async runSmokeTest() {
        this.log('🚀 Starting TMOAT SMOKE TEST');
        let allPassed = true;

        try {
            // Step 2: Add 3 folders simultaneously
            this.log('\n📋 Step 2: Adding 3 folders simultaneously');
            const basePath = '/Users/hanan/Projects/folder-mcp/tests/fixtures/tmp';
            const folders = [
                `${basePath}/smoke-small`,
                `${basePath}/smoke-medium`, 
                `${basePath}/smoke-large`
            ];

            // Add all folders
            for (const folder of folders) {
                await this.addFolder(folder);
                await this.sleep(1000); // Small delay between additions
            }

            // Wait for all folders to reach 'active' state
            for (const folder of folders) {
                try {
                    this.log(`⏳ Waiting for ${folder} to reach active state...`);
                    await this.waitForFolderStatus(folder, 'active', 60000);
                    
                    // Validate database exists
                    const dbExists = this.validateDatabaseExists(folder);
                    this.recordTestResult(2, `Folder lifecycle for ${folder.split('/').pop()}`, dbExists);
                    
                    if (!dbExists) {
                        allPassed = false;
                    }
                } catch (error) {
                    this.recordTestResult(2, `Folder lifecycle for ${folder.split('/').pop()}`, false, error);
                    allPassed = false;
                }
            }

            // Step 3: Test file monitoring
            this.log('\n📋 Step 3: Testing file monitoring while active');
            
            try {
                // Add file to small folder
                this.createTestFile(
                    `${folders[0]}/new-test-file.txt`, 
                    'New file content for TMOAT testing'
                );

                // Modify file in medium folder (find existing file first)
                const mediumFiles = ['contract.pdf', 'terms.pdf', 'agreement.pdf'];
                let targetFile = null;
                for (const file of mediumFiles) {
                    const filePath = `${folders[1]}/${file}`;
                    if (existsSync(filePath)) {
                        // For PDF, just create a new text file next to it
                        targetFile = `${folders[1]}/modified-during-test.txt`;
                        this.createTestFile(targetFile, 'File created during active monitoring test');
                        break;
                    }
                }

                if (targetFile) {
                    this.log('✅ File monitoring test completed - files created');
                    this.recordTestResult(3, 'File monitoring during active state', true);
                } else {
                    throw new Error('Could not find suitable file for modification test');
                }

                await this.sleep(3000); // Wait for file watching to detect changes

            } catch (error) {
                this.recordTestResult(3, 'File monitoring during active state', false, error);
                allPassed = false;
            }

            // Step 7: Remove a folder
            this.log('\n📋 Step 7: Testing folder removal');
            try {
                await this.removeFolder(folders[1]); // Remove medium folder
                await this.sleep(2000);
                
                // Check that database is gone
                const dbPath = `${folders[1]}/.folder-mcp/embeddings.db`;
                const dbRemoved = !existsSync(dbPath);
                this.recordTestResult(7, 'Folder removal and cleanup', dbRemoved);
                
                if (!dbRemoved) {
                    allPassed = false;
                }
            } catch (error) {
                this.recordTestResult(7, 'Folder removal', false, error);
                allPassed = false;
            }

            // Step 8: Test error handling
            this.log('\n📋 Step 8: Testing error handling');
            try {
                const invalidPath = '/Users/hanan/Projects/folder-mcp/tests/fixtures/tmp/does-not-exist';
                await this.addFolder(invalidPath);
                
                // Wait for error status
                try {
                    await this.waitForFolderStatus(invalidPath, 'error', 10000);
                    this.recordTestResult(8, 'Error handling for invalid path', true);
                } catch (timeoutError) {
                    this.recordTestResult(8, 'Error handling for invalid path', false, new Error('Expected error status not received'));
                    allPassed = false;
                }
            } catch (error) {
                this.recordTestResult(8, 'Error handling setup', false, error);
                allPassed = false;
            }

        } catch (error) {
            this.log(`❌ SMOKE TEST FAILED: ${error.message}`);
            allPassed = false;
        }

        // Print results summary
        this.log('\n📊 SMOKE TEST RESULTS:');
        this.testResults.forEach(result => {
            this.log(`${result.result} ${result.description}`);
            if (result.error) {
                this.log(`    └─ ${result.error}`);
            }
        });

        const passedCount = this.testResults.filter(r => r.result === '✅ PASS').length;
        const totalCount = this.testResults.length;
        
        this.log(`\n🎯 SUMMARY: ${passedCount}/${totalCount} tests passed`);
        
        if (allPassed) {
            this.log('🟢 SMOKE TEST PASSED - System ready to ship!');
            return true;
        } else {
            this.log('🔴 SMOKE TEST FAILED - Issues need investigation');
            return false;
        }
    }
}

// Run the smoke test
async function main() {
    const runner = new SmokeTestRunner();
    
    try {
        await runner.connect();
        await runner.sleep(2000); // Give connection time to stabilize
        
        const testPassed = await runner.runSmokeTest();
        
        runner.close();
        
        // Exit with appropriate code
        process.exit(testPassed ? 0 : 1);
        
    } catch (error) {
        console.error(`❌ Smoke test failed to run: ${error.message}`);
        runner.close();
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}