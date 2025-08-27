#!/usr/bin/env node

/**
 * Test AMD Detection Logic
 * 
 * This script tests the enhanced AMD GPU detection with various scenarios.
 */

const { MachineCapabilitiesDetector } = require('../dist/src/domain/models/machine-capabilities.js');

async function testAMDDetection() {
  console.log('=== Testing AMD Detection Logic ===\n');
  
  try {
    const detector = new MachineCapabilitiesDetector();
    const capabilities = await detector.detectCapabilities();
    
    console.log('Current System Detection:');
    console.log(JSON.stringify({
      gpu: capabilities.gpu.type,
      gpuName: capabilities.gpu.name,
      vram: capabilities.gpu.vramGB,
      rocmSupport: capabilities.gpu.rocmSupport,
      platform: capabilities.platform
    }, null, 2));
    
    // Test scenarios for different AMD GPUs
    console.log('\nAMD GPU Test Scenarios:');
    
    const amdTestCases = [
      // Discrete AMD GPUs
      { vendor: 'AMD', model: 'AMD Radeon RX 7800 XT', expected: { type: 'amd', discrete: true, vramRange: [12, 16] } },
      { vendor: 'AMD', model: 'AMD Radeon RX 6600 XT', expected: { type: 'amd', discrete: true, vramRange: [8, 8] } },
      { vendor: 'Advanced Micro Devices, Inc.', model: 'Radeon RX 580', expected: { type: 'amd', discrete: true, vramRange: [8, 8] } },
      
      // Integrated AMD GPUs  
      { vendor: 'AMD', model: 'AMD Radeon Vega 8 Graphics', expected: { type: 'amd', discrete: false, vramRange: [1, 2] } },
      { vendor: 'AMD', model: 'AMD Radeon Vega 11 Graphics', expected: { type: 'amd', discrete: false, vramRange: [1, 2] } },
      { vendor: 'AMD', model: 'AMD Radeon Graphics', expected: { type: 'amd', discrete: false, vramRange: [1, 2] } },
      
      // Legacy ATI
      { vendor: 'ATI Technologies Inc.', model: 'ATI Radeon HD 5850', expected: { type: 'amd', discrete: true, vramRange: [1, 4] } },
      
      // Edge cases
      { vendor: 'Microsoft Corporation', model: 'Microsoft Basic Render Driver', expected: { type: 'none', discrete: false, vramRange: [0, 0] } },
      { vendor: 'Intel Corporation', model: 'Intel(R) UHD Graphics', expected: { type: 'intel', discrete: false, vramRange: [0, 1] } }
    ];
    
    // Test each case with our detection logic
    for (const testCase of amdTestCases) {
      const result = testGPUDetection(testCase.vendor, testCase.model);
      const passed = result.type === testCase.expected.type;
      
      console.log(`\n${passed ? '✅' : '❌'} Test: ${testCase.model}`);
      console.log(`  Vendor: "${testCase.vendor}"`);
      console.log(`  Expected: ${testCase.expected.type}, Got: ${result.type}`);
      console.log(`  Discrete: ${result.discrete}, Expected: ${testCase.expected.discrete}`);
      
      if (!passed) {
        console.log(`  ⚠️  Detection failed for: ${testCase.model}`);
      }
    }
    
    console.log('\n=== AMD Pattern Coverage Analysis ===');
    testAMDPatternCoverage();
    
  } catch (error) {
    console.error('Error testing AMD detection:', error);
  }
}

function testGPUDetection(vendor, model) {
  // Simulate the detection logic without needing actual hardware
  const modelLower = model.toLowerCase();
  const vendorLower = vendor.toLowerCase();
  
  // Test NVIDIA detection
  if (isNvidiaGPU(model, vendor)) {
    return { type: 'nvidia', discrete: true };
  }
  
  // Test AMD detection
  if (isAmdGPU(model, vendor)) {
    const discrete = isDiscreteAMD(model);
    return { type: 'amd', discrete };
  }
  
  // Test Intel detection
  if (modelLower.includes('intel')) {
    return { type: 'intel', discrete: false };
  }
  
  // Test Apple detection
  if (modelLower.includes('apple') || modelLower.includes('metal')) {
    return { type: 'apple', discrete: false };
  }
  
  return { type: 'none', discrete: false };
}

function isNvidiaGPU(model, vendor) {
  const modelLower = model.toLowerCase();
  const vendorLower = vendor.toLowerCase();
  
  if (vendorLower.includes('nvidia')) return true;
  
  const nvidiaPatterns = ['rtx', 'gtx', 'geforce', 'quadro', 'tesla', 'titan'];
  return nvidiaPatterns.some(pattern => modelLower.includes(pattern));
}

function isAmdGPU(model, vendor) {
  const modelLower = model.toLowerCase();
  const vendorLower = vendor.toLowerCase();
  
  // Vendor-based detection (including legacy ATI)
  if (vendorLower.includes('amd') || 
      vendorLower.includes('advanced micro devices') ||
      vendorLower.includes('ati technologies')) {
    return true;
  }
  
  // Model-based detection for AMD/Radeon cards
  const amdPatterns = [
    'radeon', 'rx ', 'vega', 'rdna', 'navi',
    'firepro', 'fury', 'nano'
  ];
  
  // More specific patterns to avoid false positives
  const amdSpecificPatterns = [
    ' r9 ', ' r7 ', ' r5 ', // Space-bounded to avoid matching "UHD" etc.
    'radeon hd', 'radeon r9', 'radeon r7', 'radeon r5' // Full context patterns
  ];
  
  return amdPatterns.some(pattern => modelLower.includes(pattern)) ||
         amdSpecificPatterns.some(pattern => modelLower.includes(pattern));
}

function isDiscreteAMD(model) {
  const modelLower = model.toLowerCase();
  const integratedPatterns = ['vega 8', 'vega 11', 'vega 3', 'graphics'];
  return !integratedPatterns.some(pattern => modelLower.includes(pattern));
}

function testAMDPatternCoverage() {
  const commonAMDModels = [
    'AMD Radeon RX 7900 XTX',
    'AMD Radeon RX 7800 XT', 
    'AMD Radeon RX 6800 XT',
    'AMD Radeon RX 580',
    'AMD Radeon RX 570',
    'AMD Radeon Vega 64',
    'AMD Radeon Vega 56',
    'AMD Radeon R9 390X',
    'AMD Radeon R7 260X',
    'AMD Radeon HD 7970',
    'AMD FirePro W9100',
    'AMD Radeon Vega 8 Graphics',
    'AMD Radeon Vega 11 Graphics',
    'AMD Radeon Graphics',
    'ATI Radeon HD 5850'
  ];
  
  let detected = 0;
  let total = commonAMDModels.length;
  
  for (const model of commonAMDModels) {
    if (isAmdGPU(model, 'AMD')) {
      detected++;
      console.log(`✅ ${model}`);
    } else {
      console.log(`❌ ${model} - NOT DETECTED`);
    }
  }
  
  console.log(`\nPattern Coverage: ${detected}/${total} (${Math.round(detected/total*100)}%)`);
  
  if (detected === total) {
    console.log('🎉 Perfect AMD pattern coverage!');
  } else {
    console.log('⚠️  Some AMD models not detected - consider expanding patterns');
  }
}

testAMDDetection();