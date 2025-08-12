/**
 * Test script to verify Windows Performance Service functionality
 */

import { WindowsPerformanceService } from '../dist/src/daemon/services/windows-performance-service.js';

// Simple logger for testing
const logger = {
  debug: (msg, data) => console.log(`[DEBUG] ${msg}`, data || ''),
  info: (msg, data) => console.log(`[INFO] ${msg}`, data || ''),
  warn: (msg, data) => console.log(`[WARN] ${msg}`, data || ''),
  error: (msg, data) => console.log(`[ERROR] ${msg}`, data || '')
};

async function testWindowsPerformance() {
  console.log('Testing Windows Performance Service...\n');

  const service = new WindowsPerformanceService(logger);

  // Test 1: Check with a Python model but no import time (should measure)
  console.log('=== Test 1: Python model with auto-measurement ===');
  const result1 = await service.detectPerformanceIssues('transformers:sentence-transformers/all-MiniLM-L6-v2');
  console.log('Result:', JSON.stringify(result1, null, 2));

  // Test 2: Check with a Python model and slow import time
  console.log('\n=== Test 2: Python model with provided slow import time ===');
  const result2 = await service.detectPerformanceIssues('transformers:sentence-transformers/all-MiniLM-L6-v2', 8000);
  console.log('Result:', JSON.stringify(result2, null, 2));

  // Test 3: Check with a non-Python model
  console.log('\n=== Test 3: Non-Python model ===');
  const result3 = await service.detectPerformanceIssues('nomic-embed-text');
  console.log('Result:', JSON.stringify(result3, null, 2));

  // Test 4: Check Defender exclusions directly
  console.log('\n=== Test 4: Check Defender exclusions ===');
  const hasExclusions = await service.checkDefenderExclusions();
  console.log('Has Defender exclusions:', hasExclusions);
}

testWindowsPerformance().catch(console.error);
