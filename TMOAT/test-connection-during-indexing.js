#!/usr/bin/env node

/**
 * TMOAT Connection Test During Indexing
 * 
 * This test verifies that the daemon remains responsive to new connections
 * while performing CPU-intensive ONNX indexing operations on large files.
 * 
 * Test Requirements:
 * 1. folder-mcp daemon must be running
 * 2. Test folder must exist at /Users/hanan/Projects/small-test-folder
 * 3. Test folder should contain 5-6 small documents and 1 medium document
 * 
 * Expected Behavior:
 * - With worker threads: All connection attempts succeed immediately
 * - Without worker threads: Connection attempts timeout during indexing
 * 
 * Usage:
 * node TMOAT/test-connection-during-indexing.js
 */

const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');

// Configuration
const DAEMON_WS_URL = 'ws://localhost:3569';
const DAEMON_HTTP_URL = 'http://localhost:3569';
const TEST_FOLDER = '/Users/hanan/Projects/small-test-folder';
const CONNECTION_TIMEOUT = 5000; // 5 seconds
const TEST_DURATION = 30000; // 30 seconds of testing
const CONNECTION_INTERVAL = 2000; // Try connection every 2 seconds

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

// Helper functions
function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName, passed) {
    const status = passed ? '✓ PASS' : '✗ FAIL';
    const color = passed ? 'green' : 'red';
    log(`  ${status}: ${testName}`, color);
}

// Test WebSocket connection
async function testWebSocketConnection(attemptNumber) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        let connected = false;
        
        const ws = new WebSocket(DAEMON_WS_URL);
        
        const timeout = setTimeout(() => {
            if (!connected) {
                ws.terminate();
                const duration = Date.now() - startTime;
                resolve({
                    success: false,
                    duration,
                    attemptNumber,
                    error: 'Connection timeout'
                });
            }
        }, CONNECTION_TIMEOUT);
        
        ws.on('open', () => {
            connected = true;
            clearTimeout(timeout);
            const duration = Date.now() - startTime;
            
            // Send a test message
            ws.send(JSON.stringify({
                type: 'ping',
                timestamp: Date.now()
            }));
            
            ws.on('message', (data) => {
                ws.close();
                resolve({
                    success: true,
                    duration,
                    attemptNumber,
                    response: data.toString()
                });
            });
            
            // If no message received, still count as success
            setTimeout(() => {
                ws.close();
                resolve({
                    success: true,
                    duration,
                    attemptNumber,
                    response: null
                });
            }, 1000);
        });
        
        ws.on('error', (error) => {
            clearTimeout(timeout);
            const duration = Date.now() - startTime;
            resolve({
                success: false,
                duration,
                attemptNumber,
                error: error.message
            });
        });
    });
}

// Test HTTP endpoint
async function testHttpEndpoint(attemptNumber) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        const options = {
            hostname: 'localhost',
            port: 3569,
            path: '/status',
            method: 'GET',
            timeout: CONNECTION_TIMEOUT
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                const duration = Date.now() - startTime;
                resolve({
                    success: true,
                    duration,
                    attemptNumber,
                    statusCode: res.statusCode,
                    response: data
                });
            });
        });
        
        req.on('error', (error) => {
            const duration = Date.now() - startTime;
            resolve({
                success: false,
                duration,
                attemptNumber,
                error: error.message
            });
        });
        
        req.on('timeout', () => {
            req.destroy();
            const duration = Date.now() - startTime;
            resolve({
                success: false,
                duration,
                attemptNumber,
                error: 'Request timeout'
            });
        });
        
        req.end();
    });
}

// Check if daemon is running
async function checkDaemonStatus() {
    try {
        const result = await testHttpEndpoint(0);
        return result.success;
    } catch {
        return false;
    }
}

// Check if test folder exists
function checkTestFolder() {
    try {
        const stats = fs.statSync(TEST_FOLDER);
        if (stats.isDirectory()) {
            const files = fs.readdirSync(TEST_FOLDER);
            const docFiles = files.filter(f => 
                f.endsWith('.pdf') || 
                f.endsWith('.docx') || 
                f.endsWith('.txt') || 
                f.endsWith('.md')
            );
            return {
                exists: true,
                fileCount: docFiles.length,
                files: docFiles
            };
        }
    } catch {
        return { exists: false };
    }
}

// Trigger indexing via WebSocket
async function triggerIndexing() {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(DAEMON_WS_URL);
        
        ws.on('open', () => {
            log('\nTriggering indexing operation...', 'cyan');
            
            // Send indexing request
            ws.send(JSON.stringify({
                type: 'startIndexing',
                folder: TEST_FOLDER,
                force: true // Force re-indexing even if already indexed
            }));
            
            ws.on('message', (data) => {
                const message = JSON.parse(data.toString());
                if (message.type === 'indexingStarted') {
                    log('Indexing started successfully', 'green');
                    ws.close();
                    resolve(true);
                } else if (message.type === 'error') {
                    log(`Indexing error: ${message.error}`, 'red');
                    ws.close();
                    reject(new Error(message.error));
                }
            });
        });
        
        ws.on('error', (error) => {
            reject(error);
        });
    });
}

// Main test runner
async function runConnectionTests() {
    log('\n=== TMOAT Connection Test During Indexing ===\n', 'blue');
    
    // Pre-flight checks
    log('Running pre-flight checks...', 'cyan');
    
    // Check daemon
    const daemonRunning = await checkDaemonStatus();
    logTest('Daemon is running', daemonRunning);
    if (!daemonRunning) {
        log('\n❌ Daemon is not running. Please start it with: npm run dev', 'red');
        process.exit(1);
    }
    
    // Check test folder
    const folderInfo = checkTestFolder();
    logTest('Test folder exists', folderInfo.exists);
    if (!folderInfo.exists) {
        log(`\n❌ Test folder not found: ${TEST_FOLDER}`, 'red');
        log('Please create it with test documents', 'yellow');
        process.exit(1);
    }
    log(`  Found ${folderInfo.fileCount} document files`, 'cyan');
    
    // Start indexing
    try {
        await triggerIndexing();
    } catch (error) {
        log(`\n❌ Failed to trigger indexing: ${error.message}`, 'red');
        log('Note: You may need to manually trigger indexing through TUI', 'yellow');
    }
    
    // Run connection tests
    log('\nStarting connection tests (30 seconds)...', 'cyan');
    log('Testing connections every 2 seconds while indexing is in progress\n', 'cyan');
    
    const results = {
        websocket: { success: 0, failed: 0, times: [] },
        http: { success: 0, failed: 0, times: [] }
    };
    
    let attemptNumber = 0;
    const startTime = Date.now();
    
    const testInterval = setInterval(async () => {
        attemptNumber++;
        const elapsed = Date.now() - startTime;
        
        if (elapsed > TEST_DURATION) {
            clearInterval(testInterval);
            showResults(results);
            return;
        }
        
        log(`\nAttempt #${attemptNumber} (${Math.round(elapsed/1000)}s elapsed)`, 'yellow');
        
        // Test WebSocket
        const wsResult = await testWebSocketConnection(attemptNumber);
        if (wsResult.success) {
            results.websocket.success++;
            results.websocket.times.push(wsResult.duration);
            logTest(`WebSocket connected in ${wsResult.duration}ms`, true);
        } else {
            results.websocket.failed++;
            logTest(`WebSocket failed: ${wsResult.error}`, false);
        }
        
        // Test HTTP
        const httpResult = await testHttpEndpoint(attemptNumber);
        if (httpResult.success) {
            results.http.success++;
            results.http.times.push(httpResult.duration);
            logTest(`HTTP responded in ${httpResult.duration}ms`, true);
        } else {
            results.http.failed++;
            logTest(`HTTP failed: ${httpResult.error}`, false);
        }
        
    }, CONNECTION_INTERVAL);
}

// Show test results
function showResults(results) {
    log('\n=== Test Results ===\n', 'blue');
    
    // WebSocket results
    const wsTotal = results.websocket.success + results.websocket.failed;
    const wsSuccessRate = wsTotal > 0 ? (results.websocket.success / wsTotal * 100).toFixed(1) : 0;
    const wsAvgTime = results.websocket.times.length > 0 
        ? Math.round(results.websocket.times.reduce((a, b) => a + b, 0) / results.websocket.times.length)
        : 0;
    
    log('WebSocket Connections:', 'cyan');
    log(`  Success: ${results.websocket.success}/${wsTotal} (${wsSuccessRate}%)`, 
        wsSuccessRate >= 90 ? 'green' : 'red');
    if (results.websocket.times.length > 0) {
        log(`  Average connection time: ${wsAvgTime}ms`, 'cyan');
        log(`  Min time: ${Math.min(...results.websocket.times)}ms`, 'cyan');
        log(`  Max time: ${Math.max(...results.websocket.times)}ms`, 'cyan');
    }
    
    // HTTP results
    const httpTotal = results.http.success + results.http.failed;
    const httpSuccessRate = httpTotal > 0 ? (results.http.success / httpTotal * 100).toFixed(1) : 0;
    const httpAvgTime = results.http.times.length > 0
        ? Math.round(results.http.times.reduce((a, b) => a + b, 0) / results.http.times.length)
        : 0;
    
    log('\nHTTP Endpoints:', 'cyan');
    log(`  Success: ${results.http.success}/${httpTotal} (${httpSuccessRate}%)`,
        httpSuccessRate >= 90 ? 'green' : 'red');
    if (results.http.times.length > 0) {
        log(`  Average response time: ${httpAvgTime}ms`, 'cyan');
        log(`  Min time: ${Math.min(...results.http.times)}ms`, 'cyan');
        log(`  Max time: ${Math.max(...results.http.times)}ms`, 'cyan');
    }
    
    // Overall verdict
    log('\n=== Verdict ===\n', 'blue');
    
    const allSuccess = wsSuccessRate >= 90 && httpSuccessRate >= 90;
    const avgResponseTime = (wsAvgTime + httpAvgTime) / 2;
    
    if (allSuccess && avgResponseTime < 500) {
        log('✅ PASS: Daemon remains fully responsive during indexing!', 'green');
        log('Worker threads are successfully preventing event loop blocking.', 'green');
    } else if (allSuccess) {
        log('⚠️  PARTIAL: Connections work but response times are slow', 'yellow');
        log(`Average response time: ${avgResponseTime}ms (should be < 500ms)`, 'yellow');
    } else {
        log('❌ FAIL: Daemon becomes unresponsive during indexing', 'red');
        log('The event loop is being blocked by ONNX operations.', 'red');
        log('\nThis indicates the worker thread implementation is not working correctly.', 'red');
    }
    
    log('\n=== Test Complete ===\n', 'blue');
    process.exit(allSuccess ? 0 : 1);
}

// Handle errors
process.on('unhandledRejection', (error) => {
    log(`\n❌ Unhandled error: ${error.message}`, 'red');
    process.exit(1);
});

// Run the tests
runConnectionTests().catch((error) => {
    log(`\n❌ Test failed: ${error.message}`, 'red');
    process.exit(1);
});