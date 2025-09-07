#!/usr/bin/env node

/**
 * Verify Optimal Defaults Test
 * 
 * Confirms that our optimal ONNX configuration values are now the system defaults:
 * - WORKER_POOL_SIZE: 2 (was 4)
 * - NUM_THREADS: 2 (was undefined) 
 * - BATCH_SIZE: 1 (was 32)
 */

const { spawn } = require('child_process');
const path = require('path');

async function testDefaults() {
  console.log('🔍 === VERIFYING OPTIMAL DEFAULTS === 🔍');
  console.log('Testing that our CPM-optimized values are now system defaults\n');
  
  return new Promise((resolve) => {
    // Start daemon without any environment variables to test pure defaults
    const env = {
      ...process.env
    };
    
    // Remove any existing ONNX configuration environment variables
    delete env.WORKER_POOL_SIZE;
    delete env.NUM_THREADS;
    delete env.BATCH_SIZE;
    delete env.EMBEDDING_BATCH_SIZE;
    
    console.log('🧪 Starting daemon with NO environment variables to test pure defaults...\n');
    
    const daemonProcess = spawn('node', ['dist/src/daemon/index.js', '--restart'], {
      env,
      stdio: ['ignore', 'ignore', 'pipe']
    });
    
    let configVerified = false;
    let workerPoolSize = null;
    let numThreads = null;
    let testComplete = false;
    
    daemonProcess.stderr.on('data', (data) => {
      const text = data.toString();
      
      // Look for ONNX configuration logs
      if (text.includes('Creating pool with') && text.includes('workers')) {
        console.log(`[DETECTED] ${text.trim()}`);
        
        // Parse configuration from log
        const workerMatch = text.match(/Creating pool with (\d+) workers/);
        const threadMatch = text.match(/(\d+) threads each|auto threads each/);
        
        if (workerMatch) {
          workerPoolSize = parseInt(workerMatch[1]);
        }
        
        if (threadMatch) {
          if (text.includes('auto threads')) {
            numThreads = 'auto';
          } else {
            numThreads = parseInt(threadMatch[1]);
          }
        }
        
        configVerified = true;
      }
      
      // Look for singleton manager creation logs  
      if (text.includes('[ONNXSingletonManager] Creating')) {
        console.log(`[DETECTED] ${text.trim()}`);
        
        // Parse batch size and worker pool from singleton log
        const batchMatch = text.match(/batchSize=(\d+)/);
        const workerMatch = text.match(/workerPoolSize=(\d+)/);
        
        if (batchMatch && workerMatch && !testComplete) {
          testComplete = true;
          
          const detectedBatchSize = parseInt(batchMatch[1]);
          const detectedWorkerPool = parseInt(workerMatch[1]);
          
          console.log('\n📊 === DEFAULT VALUES ANALYSIS === 📊');
          console.log(`Worker Pool Size: ${detectedWorkerPool} ${detectedWorkerPool === 2 ? '✅ OPTIMAL' : '❌ NOT OPTIMAL'}`);
          console.log(`ONNX Threads: ${numThreads || 'not detected'} ${numThreads === 2 ? '✅ OPTIMAL' : '❌ NOT OPTIMAL'}`);
          console.log(`Batch Size: ${detectedBatchSize} ${detectedBatchSize === 1 ? '✅ OPTIMAL' : '❌ NOT OPTIMAL'}`);
          
          const allOptimal = detectedWorkerPool === 2 && numThreads === 2 && detectedBatchSize === 1;
          
          console.log('\n🎯 === VERIFICATION RESULT === 🎯');
          if (allOptimal) {
            console.log('✅ SUCCESS: All optimal defaults are correctly applied!');
            console.log('   - Worker Pool Size: 2 ✅');
            console.log('   - ONNX Threads: 2 ✅'); 
            console.log('   - Batch Size: 1 ✅');
            console.log('\nBackground indexing will now run with optimal performance by default.');
          } else {
            console.log('❌ FAILURE: Some defaults are not optimal');
            console.log(`   - Worker Pool Size: ${detectedWorkerPool} ${detectedWorkerPool === 2 ? '✅' : '❌ Expected: 2'}`);
            console.log(`   - ONNX Threads: ${numThreads} ${numThreads === 2 ? '✅' : '❌ Expected: 2'}`);
            console.log(`   - Batch Size: ${detectedBatchSize} ${detectedBatchSize === 1 ? '✅' : '❌ Expected: 1'}`);
          }
          
          daemonProcess.kill('SIGTERM');
          resolve({ success: allOptimal, workerPoolSize: detectedWorkerPool, numThreads, batchSize: detectedBatchSize });
        }
      }
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      if (!testComplete) {
        console.log('\n⏰ Test timeout - could not detect configuration');
        daemonProcess.kill('SIGTERM');
        resolve({ success: false, error: 'timeout' });
      }
    }, 30000);
    
    daemonProcess.on('error', (err) => {
      console.error('Process error:', err);
      resolve({ success: false, error: err.message });
    });
  });
}

async function main() {
  try {
    const result = await testDefaults();
    
    if (result.success) {
      console.log('\n🎉 === OPTIMAL DEFAULTS VERIFICATION COMPLETE === 🎉');
      console.log('System is now configured with CPM-tested optimal values by default!');
      process.exit(0);
    } else {
      console.log('\n❌ === VERIFICATION FAILED === ❌');
      console.log('Defaults may need adjustment or there was a detection error.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}