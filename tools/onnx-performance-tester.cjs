#!/usr/bin/env node

/**
 * ONNX Performance Tester - Comprehensive CPM Benchmarking Tool
 * 
 * This tool systematically tests all ONNX configuration combinations to find
 * optimal settings for chunks per minute (CPM) performance.
 * 
 * Tests covered:
 * - Worker pool size variations 
 * - ONNX thread configurations
 * - Batch size optimizations
 * - File concurrency levels
 * 
 * Usage: node tools/onnx-performance-tester.cjs [test-category]
 * Categories: all, threads, batch, concurrency, quick
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test timeout per configuration (in milliseconds)
const TEST_TIMEOUT = 60000; // 60 seconds per test

// Test configurations based on experiment table
const TEST_CONFIGURATIONS = {
  // ONNX Thread Tests (continuing from T2)
  threads: [
    { name: 'T3', workers: 2, threads: 4, description: 'Four threads per worker' },
    { name: 'T4', workers: 2, threads: 8, description: 'Eight threads per worker' },
    { name: 'T5', workers: 2, threads: 'dynamic', description: 'Dynamic threads (50% per worker)' }
  ],
  
  // Batch Size Tests
  batch: [
    { name: 'B1', workers: 2, threads: 2, batchSize: 1, description: 'Single chunk batches' },
    { name: 'B2', workers: 2, threads: 2, batchSize: 5, description: 'Five chunk batches' },
    { name: 'B3', workers: 2, threads: 2, batchSize: 10, description: 'Ten chunk batches (current)' },
    { name: 'B4', workers: 2, threads: 2, batchSize: 20, description: 'Twenty chunk batches' },
    { name: 'B5', workers: 2, threads: 2, batchSize: 50, description: 'Fifty chunk batches' }
  ],
  
  // File Concurrency Tests
  concurrency: [
    { name: 'F1', workers: 2, threads: 2, fileConcurrency: 1, description: 'Sequential file processing' },
    { name: 'F2', workers: 2, threads: 2, fileConcurrency: 2, description: 'Two concurrent files' },
    { name: 'F3', workers: 2, threads: 2, fileConcurrency: 4, description: 'Four concurrent files' }
  ],
  
  // Quick verification of known winners
  quick: [
    { name: 'Baseline', workers: 4, threads: null, description: 'Original configuration' },
    { name: 'T1', workers: 2, threads: 1, description: 'Previous winner' },
    { name: 'T2', workers: 2, threads: 2, description: 'Current winner' }
  ]
};

class ONNXPerformanceTester {
  constructor() {
    this.results = [];
    this.testPath = path.resolve('tests/fixtures/test-knowledge-base');
  }

  async killProcesses() {
    try {
      execSync('pkill -f "daemon" || true', { stdio: 'ignore' });
      execSync('pkill -f "mcp-server" || true', { stdio: 'ignore' });
    } catch (e) {}
    return new Promise(resolve => setTimeout(resolve, 2000));
  }

  forceReindex() {
    const dbPath = path.join(this.testPath, '.folder-mcp');
    if (fs.existsSync(dbPath)) {
      fs.rmSync(dbPath, { recursive: true, force: true });
      console.log('🗑️  Cleared existing database to force re-indexing');
    }
  }

  calculateDynamicThreads(workers) {
    // Dynamic calculation: 50% of available cores per worker
    const cpuCount = require('os').cpus().length;
    return Math.max(1, Math.floor((cpuCount * 0.5) / workers));
  }

  async runConfigurationTest(config) {
    console.log(`\n=== ${config.name} Test: ${config.description} ===`);
    this.forceReindex();
    
    return new Promise((resolve) => {
      const env = {
        ...process.env,
        WORKER_POOL_SIZE: config.workers.toString(),
        FOLDER_MCP_DEVELOPMENT_ENABLED: 'false'
      };
      
      // Set thread configuration
      if (config.threads) {
        if (config.threads === 'dynamic') {
          env.NUM_THREADS = this.calculateDynamicThreads(config.workers).toString();
        } else {
          env.NUM_THREADS = config.threads.toString();
        }
      }
      
      // Set batch size if specified
      if (config.batchSize) {
        env.EMBEDDING_BATCH_SIZE = config.batchSize.toString();
      }
      
      // Set file concurrency if specified  
      if (config.fileConcurrency) {
        env.MAX_CONCURRENT_FILES = config.fileConcurrency.toString();
      }
      
      console.log(`Configuration: ${config.workers}w ${env.NUM_THREADS || 'auto'}t${config.batchSize ? ` batch:${config.batchSize}` : ''}${config.fileConcurrency ? ` files:${config.fileConcurrency}` : ''}`);
      
      const startTime = Date.now();
      const daemonProcess = spawn('node', ['dist/src/daemon/index.js', '--restart'], {
        env,
        stdio: ['ignore', 'ignore', 'pipe']
      });
      
      let cpmData = [];
      let configVerified = false;
      let maxCpm = 0;
      let avgCpm = 0;
      let sampleCount = 0;
      let totalChunksProcessed = 0;
      
      daemonProcess.stderr.on('data', (data) => {
        const text = data.toString();
        
        // Verify configuration
        if (text.includes('Creating pool with') && text.includes('workers')) {
          configVerified = true;
          console.log(`[CONFIG] ${text.trim()}`);
        }
        
        // Parse continuous CPM logs
        if (text.includes('[CONTINUOUS-CPM]')) {
          const match = text.match(/chunks_so_far:(\d+).*CPM:([\d.]+)/);
          if (match) {
            const chunks = parseInt(match[1]);
            const cpm = parseFloat(match[2]);
            totalChunksProcessed = chunks;
            
            if (chunks >= 10) { // Only count meaningful data after 10 chunks
              maxCpm = Math.max(maxCpm, cpm);
              avgCpm = ((avgCpm * sampleCount) + cpm) / (sampleCount + 1);
              sampleCount++;
              
              // Log progress every 25 chunks for detailed tracking
              if (chunks % 25 === 0) {
                console.log(`  ${chunks} chunks: ${cpm.toFixed(1)} CPM (avg: ${avgCpm.toFixed(1)})`);
              }
            }
          }
        }
        
        // Parse milestone logs as backup
        if (text.includes('[CPM-LOG] MILESTONE=')) {
          const match = text.match(/MILESTONE=(\d+).*CPM=([\d.]+)/);
          if (match) {
            const milestone = parseInt(match[1]);
            const cpm = parseFloat(match[2]);
            console.log(`  Milestone ${milestone}: ${cpm.toFixed(1)} CPM`);
          }
        }
      });
      
      // Test timeout
      const timeout = setTimeout(() => {
        daemonProcess.kill('SIGTERM');
        
        const testDuration = (Date.now() - startTime) / 1000;
        const results = {
          name: config.name,
          description: config.description,
          workers: config.workers,
          threads: env.NUM_THREADS || 'auto',
          batchSize: config.batchSize || 10,
          fileConcurrency: config.fileConcurrency || '∞',
          configVerified: configVerified,
          maxCpm: maxCpm.toFixed(1),
          avgCpm: avgCpm.toFixed(1),
          samples: sampleCount,
          totalChunks: totalChunksProcessed,
          testDuration: testDuration.toFixed(1),
          success: sampleCount > 0,
          performanceGain: 0 // Will be calculated later
        };
        
        console.log(`Results: Max ${results.maxCpm} CPM, Avg ${results.avgCpm} CPM (${sampleCount} samples, ${totalChunksProcessed} chunks in ${testDuration.toFixed(1)}s)`);
        resolve(results);
      }, TEST_TIMEOUT);
      
      daemonProcess.on('error', (err) => {
        clearTimeout(timeout);
        console.error('Process error:', err);
        resolve({ 
          name: config.name, 
          success: false, 
          error: err.message,
          description: config.description
        });
      });
      
      daemonProcess.on('exit', (code) => {
        if (code === 0) {
          clearTimeout(timeout);
          // Process completed successfully, resolve with current data
        }
      });
    });
  }

  calculatePerformanceGains(results, baselineCpm = 78.7) {
    return results.map(result => {
      if (result.success && result.avgCpm > 0) {
        const gain = ((parseFloat(result.avgCpm) - baselineCpm) / baselineCpm * 100);
        result.performanceGain = gain.toFixed(1);
      }
      return result;
    });
  }

  displayResults(results, category) {
    console.log(`\n\n🎯 === ${category.toUpperCase()} CPM RESULTS === 🎯`);
    console.log('| Test | Description | Workers | Threads | Batch | Files | Max CPM | Avg CPM | Gain% | Chunks | Status |');
    console.log('|------|-------------|---------|---------|-------|-------|---------|---------|-------|--------|--------|');
    
    for (const r of results) {
      const status = r.success ? '✅' : '❌';
      const gain = r.performanceGain || '0.0';
      const gainSymbol = parseFloat(gain) > 0 ? '⬆️' : parseFloat(gain) < 0 ? '⬇️' : '➡️';
      
      console.log(`| ${r.name} | ${r.description?.substring(0, 20) || 'N/A'} | ${r.workers} | ${r.threads} | ${r.batchSize || 10} | ${r.fileConcurrency || '∞'} | ${r.maxCpm || '0.0'} | ${r.avgCpm || '0.0'} | ${gainSymbol}${gain}% | ${r.totalChunks || 0} | ${status} |`);
    }
    
    const successful = results.filter(r => r.success);
    if (successful.length > 0) {
      const best = successful.reduce((a, b) => parseFloat(a.avgCpm) > parseFloat(b.avgCpm) ? a : b);
      console.log(`\n🏆 CATEGORY WINNER: ${best.name} - ${best.description}`);
      console.log(`   Performance: ${best.avgCpm} Avg CPM (Max: ${best.maxCpm})`);
      console.log(`   Configuration: WORKER_POOL_SIZE=${best.workers} NUM_THREADS=${best.threads}${best.batchSize ? ` BATCH_SIZE=${best.batchSize}` : ''}${best.fileConcurrency !== '∞' ? ` MAX_FILES=${best.fileConcurrency}` : ''}`);
      console.log(`   Improvement: ${best.performanceGain}% vs baseline`);
    }
    
    return successful.length > 0 ? successful.reduce((a, b) => parseFloat(a.avgCpm) > parseFloat(b.avgCpm) ? a : b) : null;
  }

  async runTestSuite(category = 'all') {
    console.log(`🚀 === ONNX Performance Tester === 🚀`);
    console.log(`Testing category: ${category}`);
    console.log(`Test timeout: ${TEST_TIMEOUT / 1000}s per configuration\n`);
    
    await this.killProcesses();
    
    let testCategories = [];
    if (category === 'all') {
      testCategories = ['threads', 'batch', 'concurrency'];
    } else if (TEST_CONFIGURATIONS[category]) {
      testCategories = [category];
    } else {
      console.error(`Unknown test category: ${category}`);
      console.log(`Available categories: ${Object.keys(TEST_CONFIGURATIONS).join(', ')}`);
      return;
    }
    
    let allResults = [];
    let categoryWinners = [];
    
    for (const cat of testCategories) {
      console.log(`\n\n📊 === TESTING ${cat.toUpperCase()} CONFIGURATIONS === 📊`);
      const configs = TEST_CONFIGURATIONS[cat];
      const categoryResults = [];
      
      for (const config of configs) {
        try {
          console.log('\n⏳ Waiting between tests...');
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          await this.killProcesses();
          const result = await this.runConfigurationTest(config);
          categoryResults.push(result);
          
        } catch (error) {
          console.error(`${config.name} failed:`, error.message);
          categoryResults.push({
            name: config.name,
            description: config.description,
            success: false,
            error: error.message
          });
        }
      }
      
      // Calculate performance gains and display results
      this.calculatePerformanceGains(categoryResults);
      const winner = this.displayResults(categoryResults, cat);
      
      if (winner) {
        categoryWinners.push({ category: cat, ...winner });
      }
      
      allResults.push(...categoryResults);
    }
    
    await this.killProcesses();
    
    // Overall summary
    if (categoryWinners.length > 0) {
      console.log(`\n\n🏆 === OVERALL WINNERS BY CATEGORY === 🏆`);
      for (const winner of categoryWinners) {
        console.log(`${winner.category.toUpperCase()}: ${winner.name} (${winner.avgCpm} CPM, +${winner.performanceGain}%)`);
      }
      
      const overallBest = categoryWinners.reduce((a, b) => parseFloat(a.avgCpm) > parseFloat(b.avgCpm) ? a : b);
      console.log(`\n🌟 ULTIMATE WINNER: ${overallBest.name} - ${overallBest.description}`);
      console.log(`   Performance: ${overallBest.avgCpm} Average CPM`);
      console.log(`   Category: ${overallBest.category}`);
      console.log(`   Improvement: ${overallBest.performanceGain}% over baseline`);
    }
    
    this.results = allResults;
    return allResults;
  }

  // Export results to update experiment table
  exportResultsTable() {
    const successful = this.results.filter(r => r.success);
    if (successful.length === 0) return;
    
    console.log('\n\n📋 === EXPERIMENT TABLE UPDATE === 📋');
    console.log('Copy these results to tmp/ONNX-Performance-Experiment.md:');
    console.log('\n```markdown');
    
    for (const result of successful) {
      const cpuEstimate = result.workers * (result.threads === 'auto' ? 4 : parseInt(result.threads));
      console.log(`| ${result.name} | ${result.workers} | ${result.threads} | ${result.batchSize || 10} | ${result.fileConcurrency || '∞'} | auto | **${result.avgCpm}** | ~${cpuEstimate * 100}% | ~100MB | ${result.testDuration}s | ${result.description} - Max: ${result.maxCpm} CPM |`);
    }
    
    console.log('```\n');
  }
}

// CLI execution
async function main() {
  const category = process.argv[2] || 'quick';
  
  const tester = new ONNXPerformanceTester();
  await tester.runTestSuite(category);
  tester.exportResultsTable();
  
  console.log('\n✅ === ONNX Performance Testing Complete === ✅');
}

// Only run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = ONNXPerformanceTester;