#!/usr/bin/env node

/**
 * ONNX Efficiency Analyzer
 * 
 * Analyzes all CPM test results to find optimal balance between 
 * performance and system resource usage for background indexing.
 * 
 * Calculates:
 * - Performance per CPU percentage (efficiency score)
 * - Diminishing returns analysis
 * - Sweet spot identification
 */

// All our test results from comprehensive testing
const TEST_RESULTS = [
  // Baseline and early tests
  { name: 'Baseline', workers: 4, threads: 'auto', avgCpm: 78.7, maxCpm: 92.9, cpuUsage: 1200, notes: 'CPU throttling, system unresponsive' },
  { name: 'T1', workers: 2, threads: 1, avgCpm: 96.2, maxCpm: 111.1, cpuUsage: 200, notes: 'Strong performance, low CPU' },
  { name: 'T2', workers: 2, threads: 2, avgCpm: 100.1, maxCpm: 116.3, cpuUsage: 400, notes: 'Good balance' },
  
  // Thread scaling tests
  { name: 'T3', workers: 2, threads: 4, avgCpm: 103.0, maxCpm: 120.9, cpuUsage: 800, notes: 'Four threads per worker' },
  { name: 'T4', workers: 2, threads: 8, avgCpm: 104.3, maxCpm: 124.2, cpuUsage: 1600, notes: 'Maximum performance, high CPU' },
  { name: 'T5', workers: 2, threads: 3, avgCpm: 101.3, maxCpm: 119.2, cpuUsage: 600, notes: 'Dynamic threads' },
  
  // Batch size tests (using T2 base: 2w 2t)
  { name: 'B1', workers: 2, threads: 2, avgCpm: 103.6, maxCpm: 122.5, cpuUsage: 400, notes: 'Single chunk batches', batchSize: 1 },
  { name: 'B2', workers: 2, threads: 2, avgCpm: 102.7, maxCpm: 122.7, cpuUsage: 400, notes: 'Five chunk batches', batchSize: 5 },
  { name: 'B3', workers: 2, threads: 2, avgCpm: 100.5, maxCpm: 118.4, cpuUsage: 400, notes: 'Ten chunk batches (current)', batchSize: 10 },
  { name: 'B4', workers: 2, threads: 2, avgCpm: 94.4, maxCpm: 112.0, cpuUsage: 400, notes: 'Twenty chunk batches', batchSize: 20 },
  { name: 'B5', workers: 2, threads: 2, avgCpm: 90.0, maxCpm: 106.3, cpuUsage: 400, notes: 'Fifty chunk batches', batchSize: 50 },
];

class EfficiencyAnalyzer {
  constructor() {
    this.results = TEST_RESULTS.map(result => ({
      ...result,
      // Calculate efficiency metrics
      efficiencyScore: this.calculateEfficiencyScore(result.avgCpm, result.cpuUsage),
      performanceGain: this.calculatePerformanceGain(result.avgCpm, 78.7), // vs baseline
      cpuMultiplier: result.cpuUsage / 100,
      costBenefitRatio: this.calculateCostBenefitRatio(result.avgCpm, result.cpuUsage)
    }));
  }

  calculateEfficiencyScore(avgCpm, cpuUsage) {
    // CPM per 100% CPU usage - higher is better
    return (avgCpm / (cpuUsage / 100)).toFixed(2);
  }

  calculatePerformanceGain(avgCpm, baseline) {
    return ((avgCpm - baseline) / baseline * 100).toFixed(1);
  }

  calculateCostBenefitRatio(avgCpm, cpuUsage) {
    // Performance gain per CPU cost - higher is better
    const performanceGain = ((avgCpm - 78.7) / 78.7) * 100;
    const cpuCost = cpuUsage - 100; // Additional CPU over baseline 100%
    
    // Handle special case of zero CPU cost
    if (cpuCost === 0) {
      return performanceGain > 0 ? Number.POSITIVE_INFINITY : 0;
    }
    
    // For all other values (including negative cpuCost), compute numeric ratio
    const ratio = performanceGain / cpuCost;
    return Math.round(ratio * 1000) / 1000; // Round to 3 decimals without string conversion
  }

  findDiminishingReturns() {
    // Find where additional CPU doesn't give proportional performance gains
    const threadTests = this.results.filter(r => r.name.startsWith('T') && r.name !== 'Baseline');
    threadTests.sort((a, b) => a.cpuUsage - b.cpuUsage);
    
    console.log('\n📈 === DIMINISHING RETURNS ANALYSIS === 📈');
    console.log('| Config | CPU% | Avg CPM | Gain vs Prev | CPU Cost vs Prev | Efficiency Drop |');
    console.log('|--------|------|---------|--------------|------------------|-----------------|');
    
    let previousCpm = threadTests[0].avgCpm;
    let previousCpu = threadTests[0].cpuUsage;
    
    for (let i = 0; i < threadTests.length; i++) {
      const current = threadTests[i];
      if (i === 0) {
        console.log(`| ${current.name} | ${current.cpuUsage}% | ${current.avgCpm} | - | - | - |`);
      } else {
        const cpmGain = current.avgCpm - previousCpm;
        const cpuCost = current.cpuUsage - previousCpu;
        const efficiencyDrop = cpuCost > 0 ? (cpmGain / cpuCost).toFixed(3) : 'N/A';
        const gainPercent = ((cpmGain / previousCpm) * 100).toFixed(1);
        
        console.log(`| ${current.name} | ${current.cpuUsage}% | ${current.avgCpm} | +${cpmGain.toFixed(1)} (+${gainPercent}%) | +${cpuCost}% | ${efficiencyDrop} CPM/CPU% |`);
        
        previousCpm = current.avgCpm;
        previousCpu = current.cpuUsage;
      }
    }
  }

  analyzeEfficiency() {
    console.log('🎯 === EFFICIENCY ANALYSIS === 🎯');
    console.log('Finding optimal balance between performance and system resource usage\n');

    // Sort by efficiency score (CPM per CPU%)
    const byEfficiency = [...this.results].sort((a, b) => parseFloat(b.efficiencyScore) - parseFloat(a.efficiencyScore));
    
    console.log('📊 === EFFICIENCY RANKINGS === 📊');
    console.log('| Rank | Config | Avg CPM | CPU% | Efficiency Score | Cost-Benefit | Performance Gain | Notes |');
    console.log('|------|--------|---------|------|------------------|--------------|------------------|-------|');
    
    byEfficiency.forEach((result, index) => {
      const rank = index + 1;
      const emoji = rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `${rank}.`;
      console.log(`| ${emoji} | ${result.name} | ${result.avgCpm} | ${result.cpuUsage}% | **${result.efficiencyScore}** CPM/CPU% | ${result.costBenefitRatio} | +${result.performanceGain}% | ${result.notes.substring(0, 30)}... |`);
    });

    return byEfficiency;
  }

  findSweetSpots() {
    console.log('\n🍯 === SWEET SPOT ANALYSIS === 🍯');
    
    // Define criteria for sweet spots
    const criteria = [
      { name: 'Maximum Efficiency', filter: r => parseFloat(r.efficiencyScore) >= 0.3, description: 'Best CPM per CPU usage' },
      { name: 'Low CPU Impact', filter: r => r.cpuUsage <= 500, description: 'Gentle on system resources' },
      { name: 'Significant Performance', filter: r => parseFloat(r.performanceGain) >= 20, description: 'Meaningful speed improvement' },
      { name: 'Background Friendly', filter: r => r.cpuUsage <= 600 && parseFloat(r.performanceGain) >= 25, description: 'Good for background tasks' }
    ];

    const sweetSpots = [];
    
    criteria.forEach(criterion => {
      const candidates = this.results.filter(criterion.filter).sort((a, b) => parseFloat(b.efficiencyScore) - parseFloat(a.efficiencyScore));
      
      console.log(`\n**${criterion.name}** (${criterion.description}):`);
      if (candidates.length > 0) {
        const winner = candidates[0];
        console.log(`  🏆 Winner: ${winner.name} - ${winner.avgCpm} CPM at ${winner.cpuUsage}% CPU (${winner.efficiencyScore} efficiency)`);
        console.log(`  Configuration: WORKER_POOL_SIZE=${winner.workers} NUM_THREADS=${winner.threads}${winner.batchSize ? ` BATCH_SIZE=${winner.batchSize}` : ''}`);
        sweetSpots.push({ criterion: criterion.name, ...winner });
        
        if (candidates.length > 1) {
          console.log(`  Runner-up: ${candidates[1].name} - ${candidates[1].avgCpm} CPM at ${candidates[1].cpuUsage}% CPU`);
        }
      } else {
        console.log('  No candidates meet this criteria');
      }
    });

    return sweetSpots;
  }

  generateRecommendation() {
    console.log('\n\n🎯 === RESOURCE-CONSCIOUS RECOMMENDATION === 🎯');
    
    // Find the configuration that gives best balance
    const efficiencyRanked = this.analyzeEfficiency();
    const sweetSpots = this.findSweetSpots();
    this.findDiminishingReturns();
    
    // Identify the optimal configuration
    const backgroundFriendly = this.results.filter(r => 
      r.cpuUsage <= 600 && 
      parseFloat(r.performanceGain) >= 25 && 
      parseFloat(r.efficiencyScore) >= 0.3
    ).sort((a, b) => parseFloat(b.efficiencyScore) - parseFloat(a.efficiencyScore));

    console.log('\n\n🌟 === FINAL RECOMMENDATION === 🌟');
    
    if (backgroundFriendly.length > 0) {
      const optimal = backgroundFriendly[0];
      console.log(`**OPTIMAL CONFIGURATION FOR BACKGROUND INDEXING:**`);
      console.log(`  Configuration: ${optimal.name}`);
      console.log(`  Settings: WORKER_POOL_SIZE=${optimal.workers} NUM_THREADS=${optimal.threads}${optimal.batchSize ? ` BATCH_SIZE=${optimal.batchSize}` : ''}`);
      console.log(`  Performance: ${optimal.avgCpm} Avg CPM (${optimal.performanceGain}% improvement)`);
      console.log(`  Resource Usage: ${optimal.cpuUsage}% CPU (~${optimal.cpuMultiplier}x baseline)`);
      console.log(`  Efficiency: ${optimal.efficiencyScore} CPM per 100% CPU`);
      console.log(`  System Impact: ${optimal.cpuUsage <= 400 ? 'Low' : optimal.cpuUsage <= 800 ? 'Medium' : 'High'}`);
      
      console.log(`\n**WHY THIS IS OPTIMAL:**`);
      console.log(`  ✅ Excellent efficiency: ${optimal.efficiencyScore} CPM/CPU% (vs ${efficiencyRanked[efficiencyRanked.length-1].efficiencyScore} for worst)`);
      console.log(`  ✅ Background friendly: ${optimal.cpuUsage}% CPU won't strain system`);
      console.log(`  ✅ Significant gains: ${optimal.performanceGain}% faster than baseline`);
      console.log(`  ✅ Stable performance: Max ${optimal.maxCpm} CPM peak`);

      // Show what we're giving up by not going max
      const maxPerformance = this.results.reduce((max, current) => current.avgCpm > max.avgCpm ? current : max);
      const performanceLoss = ((maxPerformance.avgCpm - optimal.avgCpm) / maxPerformance.avgCpm * 100).toFixed(1);
      const cpuSavings = maxPerformance.cpuUsage - optimal.cpuUsage;
      
      console.log(`\n**TRADE-OFF ANALYSIS:**`);
      console.log(`  📊 Performance sacrifice: ${performanceLoss}% slower than max (${optimal.avgCpm} vs ${maxPerformance.avgCpm} CPM)`);
      console.log(`  💻 CPU savings: ${cpuSavings}% less CPU usage than max config`);
      console.log(`  ⚖️  Trade-off value: Excellent - minor performance loss for major resource savings`);
      
      return optimal;
    }

    console.log('No configuration meets all criteria for background-friendly operation.');
    return null;
  }
}

// Run the analysis
const analyzer = new EfficiencyAnalyzer();
const recommendation = analyzer.generateRecommendation();

console.log('\n✅ === EFFICIENCY ANALYSIS COMPLETE === ✅');