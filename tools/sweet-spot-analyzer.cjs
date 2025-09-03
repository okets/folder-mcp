#!/usr/bin/env node

/**
 * Sweet Spot Factor Analysis
 * 
 * Analyzes each optimization factor independently to find sweet spots:
 * - Worker Pool Size (1, 2, 4 workers tested)
 * - ONNX Threads per Worker (1, 2, 3, 4, 8 threads tested) 
 * - Batch Size (1, 5, 10, 20, 50 tested)
 */

const TEST_RESULTS = [
  // Worker pool analysis (keeping threads at 2 for fair comparison)
  { factor: 'workers', value: 2, workers: 2, threads: 1, batchSize: 10, avgCpm: 96.2, cpuUsage: 200, config: 'T1' },
  { factor: 'workers', value: 2, workers: 2, threads: 2, batchSize: 10, avgCpm: 100.1, cpuUsage: 400, config: 'T2' },
  { factor: 'workers', value: 4, workers: 4, threads: 'auto', batchSize: 10, avgCpm: 78.7, cpuUsage: 1200, config: 'Baseline' },
  
  // Thread analysis (keeping workers at 2)
  { factor: 'threads', value: 1, workers: 2, threads: 1, batchSize: 10, avgCpm: 96.2, cpuUsage: 200, config: 'T1' },
  { factor: 'threads', value: 2, workers: 2, threads: 2, batchSize: 10, avgCpm: 100.1, cpuUsage: 400, config: 'T2' },
  { factor: 'threads', value: 3, workers: 2, threads: 3, batchSize: 10, avgCpm: 101.3, cpuUsage: 600, config: 'T5' },
  { factor: 'threads', value: 4, workers: 2, threads: 4, batchSize: 10, avgCpm: 103.0, cpuUsage: 800, config: 'T3' },
  { factor: 'threads', value: 8, workers: 2, threads: 8, batchSize: 10, avgCpm: 104.3, cpuUsage: 1600, config: 'T4' },
  
  // Batch size analysis (keeping workers=2, threads=2)
  { factor: 'batch', value: 1, workers: 2, threads: 2, batchSize: 1, avgCpm: 103.6, cpuUsage: 400, config: 'B1' },
  { factor: 'batch', value: 5, workers: 2, threads: 2, batchSize: 5, avgCpm: 102.7, cpuUsage: 400, config: 'B2' },
  { factor: 'batch', value: 10, workers: 2, threads: 2, batchSize: 10, avgCpm: 100.5, cpuUsage: 400, config: 'B3' },
  { factor: 'batch', value: 20, workers: 2, threads: 2, batchSize: 20, avgCpm: 94.4, cpuUsage: 400, config: 'B4' },
  { factor: 'batch', value: 50, workers: 2, threads: 2, batchSize: 50, avgCpm: 90.0, cpuUsage: 400, config: 'B5' },
];

class SweetSpotAnalyzer {
  constructor() {
    this.results = TEST_RESULTS;
  }

  analyzeWorkerPoolSize() {
    console.log('👥 === WORKER POOL SIZE ANALYSIS === 👥');
    const workerTests = this.results.filter(r => r.factor === 'workers');
    
    console.log('| Workers | Config | Avg CPM | CPU% | Efficiency | Total Threads | Notes |');
    console.log('|---------|--------|---------|------|------------|---------------|-------|');
    
    workerTests.forEach(test => {
      const efficiency = (test.avgCpm / (test.cpuUsage / 100)).toFixed(2);
      const totalThreads = test.threads === 'auto' ? '~16' : test.workers * test.threads;
      const status = test.cpuUsage > 1000 ? '❌ Throttled' : test.avgCpm > 95 ? '✅ Good' : '⚠️ OK';
      console.log(`| ${test.workers} | ${test.config} | ${test.avgCpm} | ${test.cpuUsage}% | ${efficiency} | ${totalThreads} | ${status} |`);
    });
    
    const bestWorkers = workerTests.reduce((best, current) => {
      const bestEff = best.avgCpm / (best.cpuUsage / 100);
      const currentEff = current.avgCpm / (current.cpuUsage / 100);
      return currentEff > bestEff ? current : best;
    });
    
    console.log(`🏆 Sweet Spot: ${bestWorkers.workers} workers (${bestWorkers.config}) - ${bestWorkers.avgCpm} CPM at ${bestWorkers.cpuUsage}% CPU`);
    return bestWorkers.workers;
  }

  analyzeThreadCount() {
    console.log('\n🧵 === ONNX THREADS PER WORKER ANALYSIS === 🧵');
    const threadTests = this.results.filter(r => r.factor === 'threads').sort((a, b) => a.threads - b.threads);
    
    console.log('| Threads | Config | Avg CPM | CPU% | Efficiency | CPM Gain | CPU Cost | ROI |');
    console.log('|---------|--------|---------|------|------------|----------|----------|-----|');
    
    let previousCpm = 0;
    let previousCpu = 0;
    
    threadTests.forEach((test, index) => {
      const efficiency = (test.avgCpm / (test.cpuUsage / 100)).toFixed(2);
      const cpmGain = index > 0 ? (test.avgCpm - previousCpm).toFixed(1) : '-';
      const cpuCost = index > 0 ? test.cpuUsage - previousCpu : 0;
      const roi = index > 0 && cpuCost > 0 ? ((test.avgCpm - previousCpm) / cpuCost).toFixed(3) : '-';
      const status = parseFloat(roi) > 0.01 || roi === '-' ? '✅' : parseFloat(roi) > 0.005 ? '⚠️' : '❌';
      
      console.log(`| ${test.threads} | ${test.config} | ${test.avgCpm} | ${test.cpuUsage}% | ${efficiency} | +${cpmGain} | +${cpuCost}% | ${roi} ${status} |`);
      
      previousCpm = test.avgCpm;
      previousCpu = test.cpuUsage;
    });
    
    // Find sweet spot: best ROI while maintaining good performance
    const sweetSpotThreads = threadTests.find((test, index) => {
      if (index === 0) return false;
      const prevTest = threadTests[index - 1];
      const cpuCost = test.cpuUsage - prevTest.cpuUsage;
      const roi = (test.avgCpm - prevTest.avgCpm) / cpuCost;
      return roi < 0.008 && test.avgCpm > 100; // Diminishing returns threshold
    });
    
    const recommendedThreads = sweetSpotThreads ? threadTests[threadTests.indexOf(sweetSpotThreads) - 1] : threadTests[2]; // Default to middle option
    
    console.log(`🏆 Sweet Spot: ${recommendedThreads.threads} threads (${recommendedThreads.config}) - Best ROI before diminishing returns`);
    console.log(`   Performance: ${recommendedThreads.avgCpm} CPM at ${recommendedThreads.cpuUsage}% CPU`);
    console.log(`   Reasoning: Good balance of performance and resource efficiency`);
    
    return recommendedThreads.threads;
  }

  analyzeBatchSize() {
    console.log('\n📦 === BATCH SIZE ANALYSIS === 📦');
    const batchTests = this.results.filter(r => r.factor === 'batch').sort((a, b) => a.batchSize - b.batchSize);
    
    console.log('| Batch Size | Config | Avg CPM | CPU% | Efficiency | Performance Impact |');
    console.log('|------------|--------|---------|------|------------|--------------------|');
    
    batchTests.forEach(test => {
      const efficiency = (test.avgCpm / (test.cpuUsage / 100)).toFixed(2);
      const impact = test.avgCpm > 103 ? '🔥 Excellent' : test.avgCpm > 100 ? '✅ Good' : test.avgCpm > 95 ? '⚠️ OK' : '❌ Poor';
      console.log(`| ${test.batchSize} | ${test.config} | ${test.avgCpm} | ${test.cpuUsage}% | ${efficiency} | ${impact} |`);
    });
    
    const bestBatch = batchTests.reduce((best, current) => current.avgCpm > best.avgCpm ? current : best);
    
    console.log(`🏆 Sweet Spot: Batch size ${bestBatch.batchSize} (${bestBatch.config}) - ${bestBatch.avgCpm} CPM`);
    console.log(`   Clear winner: Smaller batches consistently outperform larger ones`);
    console.log(`   Reasoning: Reduced memory overhead and better parallelization`);
    
    return bestBatch.batchSize;
  }

  generateOptimalConfiguration() {
    console.log('\n\n🎯 === SWEET SPOT COMBINATION ANALYSIS === 🎯');
    
    const optimalWorkers = this.analyzeWorkerPoolSize();
    const optimalThreads = this.analyzeThreadCount(); 
    const optimalBatch = this.analyzeBatchSize();
    
    console.log('\n🌟 === COMBINED SWEET SPOT CONFIGURATION === 🌟');
    console.log(`**OPTIMAL SETTINGS:**`);
    console.log(`  Workers: ${optimalWorkers} (sweet spot for efficiency)`);
    console.log(`  Threads: ${optimalThreads} (best ROI before diminishing returns)`);  
    console.log(`  Batch Size: ${optimalBatch} (proven best performer)`);
    console.log(`\n**ENVIRONMENT VARIABLES:**`);
    console.log(`  WORKER_POOL_SIZE=${optimalWorkers}`);
    console.log(`  NUM_THREADS=${optimalThreads}`);
    console.log(`  EMBEDDING_BATCH_SIZE=${optimalBatch}`);
    
    // Estimate performance based on similar configurations
    const similarConfig = this.results.find(r => 
      r.workers === optimalWorkers && 
      r.threads === optimalThreads && 
      r.batchSize === optimalBatch
    );
    
    if (similarConfig) {
      console.log(`\n**EXPECTED PERFORMANCE (based on ${similarConfig.config}):**`);
      console.log(`  Estimated CPM: ${similarConfig.avgCpm}`);
      console.log(`  Estimated CPU: ${similarConfig.cpuUsage}%`);
      console.log(`  Efficiency: ${(similarConfig.avgCpm / (similarConfig.cpuUsage / 100)).toFixed(2)} CPM/CPU%`);
    } else {
      // Estimate based on factors
      const basePerformance = 100.1; // T2 baseline
      const workerBonus = optimalWorkers === 2 ? 1.0 : 0.9;
      const threadBonus = optimalThreads === 2 ? 1.0 : optimalThreads === 3 ? 1.01 : 1.02;
      const batchBonus = optimalBatch === 1 ? 1.035 : 1.0; // B1 vs B3 improvement
      
      const estimatedCpm = (basePerformance * workerBonus * threadBonus * batchBonus).toFixed(1);
      const estimatedCpu = optimalWorkers * optimalThreads * 100;
      
      console.log(`\n**ESTIMATED PERFORMANCE:**`);
      console.log(`  Estimated CPM: ${estimatedCpm} (calculated from factor analysis)`);
      console.log(`  Estimated CPU: ${estimatedCpu}%`);
      console.log(`  Efficiency: ${(estimatedCpm / (estimatedCpu / 100)).toFixed(2)} CPM/CPU%`);
    }
    
    return {
      workers: optimalWorkers,
      threads: optimalThreads,
      batchSize: optimalBatch,
      estimatedCpm: similarConfig ? similarConfig.avgCpm : null
    };
  }
}

// Run the analysis
const analyzer = new SweetSpotAnalyzer();
const optimalConfig = analyzer.generateOptimalConfiguration();

console.log('\n✅ === SWEET SPOT ANALYSIS COMPLETE === ✅');
console.log('Ready for CPM testing of the combined optimal configuration!');

module.exports = { SweetSpotAnalyzer, optimalConfig };