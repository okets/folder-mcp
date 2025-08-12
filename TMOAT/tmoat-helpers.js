/**
 * TMOAT Helpers - Utilities for The Mother of All Tests
 * 
 * These utilities help with manual testing by providing reusable
 * WebSocket clients and test utilities for TMOAT scenarios.
 */

import WebSocket from 'ws';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';

/**
 * WebSocket Client for TMOAT testing
 */
export class TMOATWebSocketClient {
    constructor(url = 'ws://127.0.0.1:31850') {
        this.url = url;
        this.ws = null;
        this.connected = false;
        this.messageHandlers = new Map();
        this.folderStates = new Map();
        this.progressTracking = new Map();
    }

    /**
     * Connect to daemon WebSocket
     */
    async connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.url);
            
            this.ws.on('open', () => {
                this.log('🔌 Connected to daemon WebSocket');
                this.connected = true;
                
                // Initialize connection
                this.send({
                    type: 'connection.init',
                    clientType: 'cli'  // Use supported client type per daemon requirements
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

    /**
     * Send message to daemon
     */
    send(message) {
        if (!this.connected) {
            throw new Error('WebSocket not connected');
        }
        this.ws.send(JSON.stringify(message));
    }

    /**
     * Handle incoming messages
     */
    handleMessage(data) {
        try {
            const parsed = JSON.parse(data);
            const timestamp = new Date().toISOString().substring(11, 23);

            // Update folder states for tracking
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

            // Call registered message handlers
            const handlers = this.messageHandlers.get(parsed.type) || [];
            handlers.forEach(handler => handler(parsed));

        } catch (e) {
            this.log(`❌ Error parsing message: ${e.message}`);
        }
    }

    /**
     * Update internal folder state tracking
     */
    updateFolderStates(folders) {
        folders.forEach(folder => {
            this.folderStates.set(folder.path, {
                status: folder.status,
                progress: folder.progress,
                model: folder.model,
                timestamp: Date.now()
            });

            // Track progress changes
            if (folder.progress !== undefined) {
                const oldProgress = this.progressTracking.get(folder.path);
                if (oldProgress !== folder.progress) {
                    this.progressTracking.set(folder.path, folder.progress);
                }
            }
        });
    }

    /**
     * Register message handler for specific type
     */
    onMessage(type, handler) {
        if (!this.messageHandlers.has(type)) {
            this.messageHandlers.set(type, []);
        }
        this.messageHandlers.get(type).push(handler);
    }

    /**
     * Wait for folder to reach specific status
     */
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

            // Check immediately
            checkStatus();

            // Check on each FMDM update
            this.onMessage('fmdm.update', checkStatus);
        });
    }

    /**
     * Add folder via WebSocket
     */
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

    /**
     * Remove folder via WebSocket
     */
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

    /**
     * Get current folder state
     */
    getFolderState(folderPath) {
        return this.folderStates.get(folderPath);
    }

    /**
     * Get all folder states
     */
    getAllFolderStates() {
        return Array.from(this.folderStates.entries()).map(([path, state]) => ({
            path,
            ...state
        }));
    }

    /**
     * Close WebSocket connection
     */
    close() {
        if (this.ws) {
            this.ws.close();
            this.connected = false;
        }
    }

    /**
     * Log with timestamp
     */
    log(message) {
        console.log(message);
    }
}

/**
 * File manipulation utilities for testing
 */
export class TMOATFileHelper {
    /**
     * Create test file with content
     */
    static createTestFile(filePath, content) {
        writeFileSync(filePath, content);
        console.log(`📝 Created test file: ${filePath}`);
    }

    /**
     * Modify existing file by appending content
     */
    static modifyTestFile(filePath, additionalContent) {
        if (!existsSync(filePath)) {
            throw new Error(`File does not exist: ${filePath}`);
        }
        
        const existingContent = readFileSync(filePath, 'utf8');
        writeFileSync(filePath, existingContent + additionalContent);
        console.log(`✏️  Modified test file: ${filePath}`);
    }

    /**
     * Delete test file
     */
    static deleteTestFile(filePath) {
        if (existsSync(filePath)) {
            unlinkSync(filePath);
            console.log(`🗑️  Deleted test file: ${filePath}`);
        }
    }

    /**
     * Create a series of test files for folder testing
     */
    static createTestFolder(folderPath, fileCount = 3) {
        const files = [];
        for (let i = 1; i <= fileCount; i++) {
            const filePath = `${folderPath}/test-file-${i}.txt`;
            const content = `This is test file ${i} created for TMOAT testing.\n\nContent includes:\n- File number: ${i}\n- Timestamp: ${new Date().toISOString()}\n- Purpose: TMOAT folder lifecycle testing\n`;
            TMOATFileHelper.createTestFile(filePath, content);
            files.push(filePath);
        }
        return files;
    }
}

/**
 * Test validation utilities
 */
export class TMOATValidator {
    /**
     * Validate folder reached expected status within timeout
     */
    static async validateFolderStatus(client, folderPath, expectedStatus, timeoutMs = 30000) {
        try {
            const state = await client.waitForFolderStatus(folderPath, expectedStatus, timeoutMs);
            console.log(`✅ VALIDATION PASS: ${folderPath} reached ${expectedStatus}`);
            return true;
        } catch (error) {
            console.log(`❌ VALIDATION FAIL: ${error.message}`);
            return false;
        }
    }

    /**
     * Validate progress increased monotonically
     */
    static validateProgressMonotonic(client, folderPath) {
        const progressHistory = client.progressTracking.get(folderPath);
        if (!progressHistory || progressHistory.length < 2) {
            console.log(`⚠️  VALIDATION SKIP: Not enough progress data for ${folderPath}`);
            return true;
        }

        for (let i = 1; i < progressHistory.length; i++) {
            if (progressHistory[i] < progressHistory[i-1]) {
                console.log(`❌ VALIDATION FAIL: Progress decreased from ${progressHistory[i-1]}% to ${progressHistory[i]}%`);
                return false;
            }
        }

        console.log(`✅ VALIDATION PASS: Progress increased monotonically for ${folderPath}`);
        return true;
    }

    /**
     * Validate database file exists
     */
    static validateDatabaseExists(folderPath) {
        const dbPath = `${folderPath}/.folder-mcp/embeddings.db`;
        if (existsSync(dbPath)) {
            console.log(`✅ VALIDATION PASS: Database exists at ${dbPath}`);
            return true;
        } else {
            console.log(`❌ VALIDATION FAIL: Database missing at ${dbPath}`);
            return false;
        }
    }
}

/**
 * Common TMOAT test patterns
 */
export class TMOATPatterns {
    /**
     * Standard smoke test setup
     */
    static async setupSmokeTest() {
        const client = new TMOATWebSocketClient();
        await client.connect();
        
        // Wait for connection acknowledgment
        await new Promise(resolve => {
            client.onMessage('connection.ack', resolve);
        });

        return client;
    }

    /**
     * Test folder lifecycle from pending to active
     */
    static async testFolderLifecycle(client, folderPath, model = 'nomic-embed-text') {
        console.log(`🧪 Testing folder lifecycle: ${folderPath}`);
        
        // Add folder
        await client.addFolder(folderPath, model);
        
        // Wait for each stage
        const stages = ['scanning', 'ready', 'indexing', 'active'];
        for (const stage of stages) {
            const success = await TMOATValidator.validateFolderStatus(client, folderPath, stage);
            if (!success) {
                throw new Error(`Failed to reach ${stage} stage`);
            }
        }
        
        // Validate database was created
        TMOATValidator.validateDatabaseExists(folderPath);
        
        console.log(`✅ Folder lifecycle test completed for ${folderPath}`);
    }

    /**
     * Test error scenario with invalid path
     */
    static async testErrorScenario(client, invalidPath) {
        console.log(`🧪 Testing error scenario with invalid path: ${invalidPath}`);
        
        await client.addFolder(invalidPath);
        
        // Wait for error status
        const success = await TMOATValidator.validateFolderStatus(client, invalidPath, 'error', 10000);
        if (success) {
            console.log(`✅ Error handling test passed`);
        } else {
            throw new Error('Expected error status not received');
        }
    }
}

// Example usage:
/*
import { TMOATWebSocketClient, TMOATFileHelper, TMOATValidator, TMOATPatterns } from './tmoat-helpers.js';

async function runSmokeTest() {
    const client = await TMOATPatterns.setupSmokeTest();
    
    // Test basic lifecycle
    await TMOATPatterns.testFolderLifecycle(client, '/path/to/test/folder');
    
    // Test error handling
    await TMOATPatterns.testErrorScenario(client, '/nonexistent/path');
    
    client.close();
}
*/