#!/usr/bin/env node

/**
 * TMOAT Smoke Test Runner
 * Comprehensive end-to-end test that validates the entire folder-mcp system
 * 
 * This is the main entry point for TMOAT testing.
 * It runs all atomic tests in sequence and provides a complete system validation.
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎪 THE MOTHER OF ALL TESTS (TMOAT) - SMOKE TEST RUNNER');
console.log('='.repeat(70));
console.log('Comprehensive end-to-end validation of folder-mcp system');
console.log('='.repeat(70));

// Test configuration
const TESTS_DIR = __dirname;
const TMP_DIR = path.resolve(__dirname, '../tests/fixtures/tmp');
const SOURCE_DIR = path.resolve(__dirname, '../tests/fixtures/test-knowledge-base');

// Atomic tests to run in sequence
const ATOMIC_TESTS = [
    {
        name: 'Connection Test',
        file: 'atomic-test-1-connection.js',
        description: 'WebSocket connection to daemon',
        timeout: 15000
    },
    {
        name: 'Folder Addition Test', 
        file: 'atomic-test-2-folder-addition.js',
        description: 'Folder lifecycle (pending → active)',
        timeout: 35000
    },
    {
        name: 'File Monitoring Test',
        file: 'atomic-test-3-file-monitoring.js', 
        description: 'File change detection while active',
        timeout: 50000
    },
    {
        name: 'Folder Cleanup Test',
        file: 'atomic-test-4-folder-cleanup.js',
        description: 'Folder removal and cleanup',
        timeout: 25000
    },
    {
        name: 'Database Verification Test',
        file: 'atomic-test-5-database-verification.js',
        description: 'Database creation and structure verification',
        timeout: 30000
    },
    {
        name: 'Complete Folder Cleanup Test',
        file: 'atomic-test-6-folder-cleanup.js',
        description: 'Complete .folder-mcp directory removal',
        timeout: 45000
    },
    {
        name: 'Daemon Restart Test',
        file: 'atomic-test-7-daemon-restart.js',
        description: 'Incremental changes after daemon restart',
        timeout: 90000
    },
    {
        name: 'Offline Changes Test',
        file: 'atomic-test-8-offline-changes.js',
        description: 'File changes detection after offline period',
        timeout: 120000
    },
    {
        name: 'Database Recovery Test',
        file: 'atomic-test-9-database-recovery.js',
        description: 'Database rebuilding after .folder-mcp deletion',
        timeout: 120000
    }
];

// Test results tracking
let testResults = [];
let overallStartTime = Date.now();

async function setupTestEnvironment() {
    console.log('\n📋 SETUP: Preparing test environment...');
    
    try {
        // Clean up any previous test artifacts
        console.log('🧹 Cleaning up previous test artifacts...');
        try {
            await fs.rm(TMP_DIR, { recursive: true, force: true });
        } catch (error) {
            // Directory might not exist, that's fine
        }
        
        // Create tmp directory
        console.log('📁 Creating tmp directory...');
        await fs.mkdir(TMP_DIR, { recursive: true });
        
        // Copy test files for different test scenarios
        console.log('📄 Setting up test files...');
        await fs.cp(path.join(SOURCE_DIR, 'Engineering'), path.join(TMP_DIR, 'smoke-small'), { recursive: true });
        await fs.cp(path.join(SOURCE_DIR, 'Legal'), path.join(TMP_DIR, 'smoke-medium'), { recursive: true });
        await fs.cp(path.join(SOURCE_DIR, 'Finance'), path.join(TMP_DIR, 'smoke-large'), { recursive: true });
        
        console.log('✅ Test environment setup complete');
        return true;
    } catch (error) {
        console.log(`❌ Failed to setup test environment: ${error.message}`);
        return false;
    }
}

async function runAtomicTest(test) {
    console.log(`\n🧪 RUNNING: ${test.name}`);
    console.log(`📝 ${test.description}`);
    console.log('-'.repeat(50));
    
    const startTime = Date.now();
    
    return new Promise((resolve) => {
        const testProcess = spawn('node', [path.join(TESTS_DIR, test.file)], {
            stdio: 'pipe',
            cwd: path.dirname(TESTS_DIR)
        });
        
        let stdout = '';
        let stderr = '';
        
        testProcess.stdout.on('data', (data) => {
            const output = data.toString();
            stdout += output;
            // Real-time output for immediate feedback
            process.stdout.write(output);
        });
        
        testProcess.stderr.on('data', (data) => {
            const output = data.toString();
            stderr += output;
            process.stderr.write(output);
        });
        
        testProcess.on('close', (code) => {
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            const result = {
                name: test.name,
                description: test.description,
                passed: code === 0 && (stdout.includes('PASSED') || stdout.includes('✅')),
                duration: duration,
                code: code,
                stdout: stdout,
                stderr: stderr
            };
            
            console.log(`\n⏱️  Duration: ${duration}ms`);
            console.log(`🚦 Result: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
            
            testResults.push(result);
            resolve(result);
        });
        
        // Kill test if it times out
        const timeout = setTimeout(() => {
            console.log(`\n⏰ Test timed out after ${test.timeout}ms`);
            testProcess.kill('SIGTERM');
            
            setTimeout(() => {
                if (!testProcess.killed) {
                    testProcess.kill('SIGKILL');
                }
            }, 5000);
        }, test.timeout);
        
        testProcess.on('close', () => {
            clearTimeout(timeout);
        });
    });
}

async function generateTestReport() {
    const overallEndTime = Date.now();
    const totalDuration = overallEndTime - overallStartTime;
    
    console.log('\n📊 TMOAT SMOKE TEST REPORT');
    console.log('='.repeat(70));
    
    // Summary statistics
    const totalTests = testResults.length;
    const passedTests = testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    console.log(`📈 Overall Results:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests} ✅`);
    console.log(`   Failed: ${failedTests} ${failedTests > 0 ? '❌' : ''}`);
    console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log(`   Total Duration: ${(totalDuration / 1000).toFixed(1)}s`);
    
    // Individual test results
    console.log(`\n📋 Individual Test Results:`);
    testResults.forEach((result, index) => {
        const status = result.passed ? '✅ PASS' : '❌ FAIL';
        const duration = `${(result.duration / 1000).toFixed(1)}s`;
        console.log(`   ${index + 1}. ${status} ${result.name} (${duration})`);
        if (!result.passed) {
            console.log(`      🔍 Exit code: ${result.code}`);
            if (result.stderr) {
                console.log(`      ⚠️  Stderr: ${result.stderr.trim()}`);
            }
        }
    });
    
    // Overall verdict
    console.log(`\n🎯 FINAL VERDICT:`);
    if (passedTests === totalTests) {
        console.log(`✅ ALL TESTS PASSED - System is ready to ship! 🚀`);
        console.log(`🎉 folder-mcp daemon and WebSocket interface are working correctly`);
        return true;
    } else {
        console.log(`❌ ${failedTests} TEST(S) FAILED - System needs attention`);
        console.log(`🔧 Review failed tests and fix issues before proceeding`);
        return false;
    }
}

async function cleanupTestEnvironment() {
    console.log('\n🧹 CLEANUP: Removing test artifacts...');
    try {
        await fs.rm(TMP_DIR, { recursive: true, force: true });
        console.log('✅ Cleanup complete');
    } catch (error) {
        console.log(`⚠️  Cleanup warning: ${error.message}`);
    }
}

// Main execution
async function runSmokeTest() {
    console.log(`📅 Started: ${new Date().toISOString()}`);
    
    // Setup
    const setupSuccess = await setupTestEnvironment();
    if (!setupSuccess) {
        console.log('❌ Setup failed, aborting tests');
        process.exit(1);
    }
    
    // Run all atomic tests in sequence
    console.log('\n🚀 EXECUTION: Running atomic tests in sequence...');
    for (const test of ATOMIC_TESTS) {
        const result = await runAtomicTest(test);
        
        // Stop on first failure for quick debugging
        if (!result.passed) {
            console.log(`\n⚠️  Test failed: ${test.name}`);
            console.log(`🛠️  Fix this issue before running remaining tests`);
            break;
        }
    }
    
    // Generate report
    const allPassed = await generateTestReport();
    
    // Cleanup
    await cleanupTestEnvironment();
    
    // Exit with appropriate code
    process.exit(allPassed ? 0 : 1);
}

// Handle unhandled promises and errors
process.on('unhandledRejection', (reason, promise) => {
    console.log('❌ Unhandled Promise Rejection:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.log('❌ Uncaught Exception:', error.message);
    process.exit(1);
});

// Start the smoke test
runSmokeTest().catch((error) => {
    console.log('❌ Smoke test failed:', error.message);
    process.exit(1);
});