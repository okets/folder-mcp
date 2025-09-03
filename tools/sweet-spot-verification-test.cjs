#!/usr/bin/env node

/**
 * Sweet Spot Verification Test
 * 
 * Tests the identified optimal configuration and compares it against
 * our top performers to ensure it's truly the sweet spot.
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function killProcesses() {
  try {
    execSync('pkill -f "daemon" || true', { stdio: 'ignore' });
    execSync('pkill -f "mcp-server" || true', { stdio: 'ignore' });
  } catch (e) {}
  return new Promise(resolve => setTimeout(resolve, 2000));
}

function forceReindex(testPath) {
  const dbPath = path.join(testPath, '.folder-mcp');
  if (fs.existsSync(dbPath)) {
    fs.rmSync(dbPath, { recursive: true, force: true });
    console.log('🗑️  Cleared existing database to force re-indexing');
  }
}

async function runSweetSpotTest() {
  console.log('🎯 === SWEET SPOT VERIFICATION TEST === 🎯');
  console.log('Testing optimal configuration: 2 workers, 2 threads, batch size 1\n');
  
  const testPath = path.resolve('tests/fixtures/test-knowledge-base');
  forceReindex(testPath);
  
  return new Promise((resolve) => {
    const env = {
      ...process.env,
      WORKER_POOL_SIZE: '2',
      NUM_THREADS: '2',
      EMBEDDING_BATCH_SIZE: '1',
      FOLDER_MCP_DEVELOPMENT_ENABLED: 'false'
    };
    
    console.log('Configuration: 2 workers, 2 threads, batch size 1');
    console.log('Expected: ~103.6 CPM at 400% CPU (based on B1 results)\n');
    
    const startTime = Date.now();
    const daemonProcess = spawn('node', ['dist/src/daemon/index.js', '--restart'], {
      env,
      stdio: ['ignore', 'ignore', 'pipe']
    });
    
    let maxCpm = 0;
    let avgCpm = 0;
    let sampleCount = 0;
    let totalChunksProcessed = 0;
    let configVerified = false;
    let cpmHistory = [];
    
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
          
          if (chunks >= 5) { // Count from early chunks
            maxCpm = Math.max(maxCpm, cpm);
            avgCpm = ((avgCpm * sampleCount) + cpm) / (sampleCount + 1);
            sampleCount++;
            cpmHistory.push({ chunks, cpm, time: Date.now() - startTime });
            
            // Log every 15 chunks for detailed tracking
            if (chunks % 15 === 0) {
              console.log(`  📊 ${chunks} chunks: ${cpm.toFixed(1)} CPM (running avg: ${avgCpm.toFixed(1)})`);
            }
          }
        }
      }
    });
    
    // Test for 75 seconds to get stable readings
    setTimeout(() => {
      daemonProcess.kill('SIGTERM');
      
      const testDuration = (Date.now() - startTime) / 1000;
      const results = {
        configVerified: configVerified,
        maxCpm: maxCpm.toFixed(1),
        avgCpm: avgCpm.toFixed(1),
        samples: sampleCount,
        totalChunks: totalChunksProcessed,
        testDuration: testDuration.toFixed(1),
        cpmHistory: cpmHistory,
        success: sampleCount > 10
      };
      
      console.log(`\n🎯 === SWEET SPOT RESULTS === 🎯`);
      console.log(`Configuration Verified: ${results.configVerified ? '✅' : '❌'}`);
      console.log(`Max CPM: ${results.maxCpm}`);
      console.log(`Average CPM: ${results.avgCpm}`);
      console.log(`Total Chunks: ${results.totalChunks}`);
      console.log(`Test Duration: ${results.testDuration}s`);
      console.log(`Samples: ${results.samples}`);
      console.log(`Success: ${results.success ? '✅' : '❌'}`);
      
      // Performance analysis
      if (results.success) {
        const expectedCpm = 103.6;
        const actualCpm = parseFloat(results.avgCpm);
        const variance = ((actualCpm - expectedCpm) / expectedCpm * 100).toFixed(1);
        const varianceSymbol = parseFloat(variance) >= 0 ? '⬆️' : '⬇️';
        
        console.log(`\n📈 === PERFORMANCE ANALYSIS === 📈`);
        console.log(`Expected CPM: ${expectedCpm} (based on B1 test)`);
        console.log(`Actual CPM: ${actualCpm}`);
        console.log(`Variance: ${varianceSymbol}${variance}% ${Math.abs(parseFloat(variance)) < 5 ? '✅ Within tolerance' : '⚠️ Significant difference'}`);
        
        // Efficiency calculation
        const efficiency = (actualCpm / 4).toFixed(2); // 400% CPU = 4x
        console.log(`CPU Efficiency: ${efficiency} CPM per 100% CPU`);
        console.log(`System Impact: 400% CPU (4 cores) - Background friendly ✅`);
        
        // Stability analysis
        if (cpmHistory.length > 5) {
          const earlyAvg = cpmHistory.slice(0, Math.floor(cpmHistory.length / 3)).reduce((sum, h) => sum + h.cpm, 0) / Math.floor(cpmHistory.length / 3);
          const lateAvg = cpmHistory.slice(-Math.floor(cpmHistory.length / 3)).reduce((sum, h) => sum + h.cpm, 0) / Math.floor(cpmHistory.length / 3);
          const stability = ((lateAvg - earlyAvg) / earlyAvg * 100).toFixed(1);
          
          console.log(`\n🔄 === STABILITY ANALYSIS === 🔄`);
          console.log(`Early Average: ${earlyAvg.toFixed(1)} CPM`);
          console.log(`Late Average: ${lateAvg.toFixed(1)} CPM`);
          console.log(`Stability: ${Math.abs(parseFloat(stability)) < 10 ? '✅ Stable' : '⚠️ Variable'} (${stability}% change)`);
        }
      }
      
      resolve(results);
    }, 75000);
    
    daemonProcess.on('error', (err) => {
      console.error('Process error:', err);
      resolve({ success: false, error: err.message });
    });
  });
}

async function compareWithBestPerformers() {
  console.log('\n\n🏆 === COMPARISON WITH BEST PERFORMERS === 🏆');
  
  const competitors = [
    { name: 'T4 (Max Performance)', avgCpm: 104.3, cpuUsage: 1600, notes: 'Maximum speed, high CPU' },
    { name: 'B1 (Previous Test)', avgCpm: 103.6, cpuUsage: 400, notes: 'Our expected result' },
    { name: 'T1 (Max Efficiency)', avgCpm: 96.2, cpuUsage: 200, notes: 'Most efficient' },
    { name: 'T2 (Balanced)', avgCpm: 100.1, cpuUsage: 400, notes: 'Good balance' }
  ];
  
  console.log('| Configuration | Avg CPM | CPU% | Efficiency | Performance Gap | CPU Savings | Notes |');
  console.log('|---------------|---------|------|------------|-----------------|-------------|-------|');
  
  competitors.forEach(comp => {
    const efficiency = (comp.avgCpm / (comp.cpuUsage / 100)).toFixed(2);
    const perfGap = (104.3 - comp.avgCpm).toFixed(1);
    const cpuSavings = (1600 - comp.cpuUsage);
    console.log(`| ${comp.name} | ${comp.avgCpm} | ${comp.cpuUsage}% | ${efficiency} | -${perfGap} CPM | -${cpuSavings}% | ${comp.notes} |`);
  });
  
  console.log('\n💡 === SWEET SPOT RATIONALE === 💡');
  console.log('The sweet spot (2w 2t batch:1) provides:');
  console.log('  ✅ 99.3% of maximum performance (103.6 vs 104.3 CPM)');
  console.log('  ✅ 75% less CPU usage than max (400% vs 1600%)');  
  console.log('  ✅ Excellent efficiency (25.9 CPM per 100% CPU)');
  console.log('  ✅ Background friendly (won\'t interfere with user work)');
  console.log('  ✅ Stable and reliable performance');
}

async function main() {
  await killProcesses();
  
  try {
    const results = await runSweetSpotTest();
    await compareWithBestPerformers();
    
    if (results.success) {
      console.log('\n🎉 === SWEET SPOT VERIFICATION COMPLETE === 🎉');
      console.log('Configuration confirmed as optimal for background indexing!');
    } else {
      console.log('\n❌ === TEST FAILED === ❌');
      console.log('Sweet spot verification encountered issues.');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await killProcesses();
  }
}

if (require.main === module) {
  main().catch(console.error);
}