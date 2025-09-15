#!/usr/bin/env node

/**
 * TMOAT Test: Monitor Queue Processing
 *
 * This script monitors how the indexing queue processes folders
 * to understand if it's truly sequential or parallel
 */

import { spawn } from 'child_process';

console.log('=== QUEUE PROCESSING MONITOR ===');
console.log('Starting daemon and monitoring queue behavior...\n');

// Start daemon
const daemon = spawn('npm', ['run', 'daemon:restart'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let modelLoadAttempts = new Map();
let currentModel = null;
let processingOrder = [];

daemon.stderr.on('data', (data) => {
  const lines = data.toString().split('\n');

  for (const line of lines) {
    // Track model load attempts
    if (line.includes('[PYTHON-REGISTRY] Loading model:')) {
      const match = line.match(/Loading model: ([^\s]+) \(current: ([^)]+)\)/);
      if (match) {
        const [_, model, current] = match;
        const timestamp = new Date().toISOString();

        if (!modelLoadAttempts.has(model)) {
          modelLoadAttempts.set(model, []);
        }
        modelLoadAttempts.get(model).push({ timestamp, current });

        console.log(`[${timestamp}] LOAD ATTEMPT: ${model} (current: ${current})`);
      }
    }

    // Track successful loads
    if (line.includes('Successfully loaded model')) {
      const match = line.match(/Successfully loaded model ([^\s]+)/);
      if (match) {
        currentModel = match[1];
        console.log(`[${new Date().toISOString()}] SUCCESS: Model loaded - ${currentModel}`);
      }
    }

    // Track folder processing
    if (line.includes('[QUEUE] Starting processing:')) {
      const match = line.match(/Starting processing: ([^\s]+) with model ([^\s]+)/);
      if (match) {
        const [_, folder, model] = match;
        processingOrder.push({ folder, model, timestamp: new Date().toISOString() });
        console.log(`[${new Date().toISOString()}] PROCESSING: ${folder} -> ${model}`);
      }
    }

    // Track failures
    if (line.includes('[QUEUE] Failed to process folder')) {
      const match = line.match(/Failed to process folder ([^:]+):/);
      if (match) {
        console.log(`[${new Date().toISOString()}] FAILED: ${match[1]}`);
      }
    }
  }
});

// After 30 seconds, analyze the results
setTimeout(() => {
  console.log('\n=== ANALYSIS ===');

  console.log('\nModel Load Attempts:');
  for (const [model, attempts] of modelLoadAttempts) {
    console.log(`  ${model}: ${attempts.length} attempts`);
  }

  console.log('\nProcessing Order:');
  processingOrder.forEach((item, i) => {
    console.log(`  ${i + 1}. ${item.folder} with ${item.model}`);
  });

  // Check if multiple models were loaded simultaneously
  const simultaneousLoads = [];
  const loadTimes = [];

  for (const [model, attempts] of modelLoadAttempts) {
    attempts.forEach(a => {
      loadTimes.push({ model, time: new Date(a.timestamp).getTime() });
    });
  }

  loadTimes.sort((a, b) => a.time - b.time);

  for (let i = 1; i < loadTimes.length; i++) {
    const timeDiff = loadTimes[i].time - loadTimes[i-1].time;
    if (timeDiff < 1000) { // Within 1 second
      simultaneousLoads.push({
        model1: loadTimes[i-1].model,
        model2: loadTimes[i].model,
        timeDiff
      });
    }
  }

  if (simultaneousLoads.length > 0) {
    console.log('\n⚠️  PROBLEM DETECTED: Multiple models loaded simultaneously!');
    simultaneousLoads.forEach(s => {
      console.log(`  - ${s.model1} and ${s.model2} within ${s.timeDiff}ms`);
    });
  } else {
    console.log('\n✅ Models loaded sequentially');
  }

  daemon.kill();
  process.exit(0);
}, 30000);