#!/usr/bin/env node

/**
 * AMD GPU Detection Debug Script
 * 
 * This script investigates AMD GPU detection on Windows systems.
 * Covers both integrated (APU) and discrete AMD graphics cards.
 * 
 * Run on Windows: node scripts/debug-amd-detection.cjs
 */

const si = require('systeminformation');

async function debugAMDDetection() {
  console.log('=== AMD GPU Detection Debug Script ===\n');
  
  try {
    console.log('1. Raw systeminformation.graphics() output:');
    const graphics = await si.graphics();
    console.log(JSON.stringify(graphics, null, 2));
    
    console.log('\n2. Controllers analysis (AMD-focused):');
    if (graphics.controllers && graphics.controllers.length > 0) {
      graphics.controllers.forEach((controller, index) => {
        console.log(`\nController ${index}:`);
        console.log(`  model: "${controller.model}"`);
        console.log(`  vendor: "${controller.vendor}"`);
        console.log(`  vram: ${controller.vram} (type: ${typeof controller.vram})`);
        console.log(`  bus: "${controller.bus}"`);
        console.log(`  deviceId: "${controller.deviceId}"`);
        console.log(`  subDeviceId: "${controller.subDeviceId}"`);
        
        // Test AMD detection patterns
        const model = controller.model || 'Unknown GPU';
        const vendor = controller.vendor || '';
        
        console.log(`\n  AMD Detection tests:`);
        console.log(`    vendor.includes('amd'): ${vendor.toLowerCase().includes('amd')}`);
        console.log(`    vendor.includes('ati'): ${vendor.toLowerCase().includes('ati technologies')}`);
        console.log(`    model.includes('radeon'): ${model.toLowerCase().includes('radeon')}`);
        console.log(`    model.includes('rx'): ${model.toLowerCase().includes('rx ')}`);
        console.log(`    model.includes('vega'): ${model.toLowerCase().includes('vega')}`);
        console.log(`    model.includes('rdna'): ${model.toLowerCase().includes('rdna')}`);
        
        // VRAM calculation
        const vramBytes = controller.vram || 0;
        const vramGB = vramBytes > 0 ? Math.round(vramBytes / (1024 * 1024 * 1024)) : 0;
        console.log(`    VRAM calculation: ${vramBytes} -> ${vramGB} GB`);
        
        // Alternative VRAM calculations (in case units are different)
        const vramAltMB = vramBytes > 0 ? Math.round(vramBytes / 1024) : 0;
        console.log(`    Alt VRAM (if MB): ${vramAltMB} GB`);
        console.log(`    Direct VRAM: ${vramBytes} (might already be in GB/MB)`);
        
        // Integrated vs Discrete classification
        const integratedPatterns = ['vega 8', 'vega 11', 'vega 3', 'graphics'];
        const isIntegrated = integratedPatterns.some(pattern => model.toLowerCase().includes(pattern)) ||
                            (vramGB === 0 && model.toLowerCase().includes('radeon'));
        console.log(`    Classified as: ${isIntegrated ? 'INTEGRATED' : 'DISCRETE'}`);
      });
    } else {
      console.log('  No controllers found!');
    }
    
    console.log('\n3. Testing enhanced AMD detection logic:');
    
    // Test the new detection methods
    const bestAMD = findBestAMDController(graphics.controllers || []);
    if (bestAMD) {
      console.log(`  ✅ Best AMD GPU found: "${bestAMD.model}"`);
      console.log(`  Vendor: "${bestAMD.vendor}"`);
      console.log(`  VRAM: ${bestAMD.vram}`);
      
      // Estimate VRAM using our logic
      const estimatedVRAM = await estimateAMDVRAM(bestAMD.model || '', bestAMD.vram || 0);
      console.log(`  Estimated VRAM: ${estimatedVRAM}GB`);
      
    } else {
      console.log('  ❌ No AMD GPU detected');
    }
    
    console.log('\n4. System memory info (for integrated graphics):');
    try {
      const memory = await si.mem();
      const totalRAMGB = Math.round(memory.total / (1024 * 1024 * 1024));
      console.log(`  Total RAM: ${totalRAMGB}GB`);
      console.log(`  Available RAM: ${Math.round(memory.available / (1024 * 1024 * 1024))}GB`);
      console.log(`  Suggested integrated VRAM: ${getSuggestedIntegratedVRAM(totalRAMGB)}GB`);
    } catch (e) {
      console.log(`  Error getting memory info: ${e.message}`);
    }
    
  } catch (error) {
    console.error('Error during AMD detection debug:', error);
  }
}

function findBestAMDController(controllers) {
  for (const controller of controllers) {
    if (isAMDGPU(controller.model || '', controller.vendor || '')) {
      return controller;
    }
  }
  return null;
}

function isAMDGPU(model, vendor) {
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
    'r9 ', 'r7 ', 'r5 ', 'hd ', 'firepro',
    'fury', 'nano'
  ];
  
  return amdPatterns.some(pattern => modelLower.includes(pattern));
}

async function estimateAMDVRAM(modelName, reportedVramRaw) {
  const modelLower = modelName.toLowerCase();
  
  // Convert reported VRAM to GB
  let reportedVramGB = 0;
  if (reportedVramRaw > 0) {
    if (reportedVramRaw > 1000000000) {
      reportedVramGB = Math.round(reportedVramRaw / (1024 * 1024 * 1024));
    } else if (reportedVramRaw > 100000) {
      reportedVramGB = Math.round(reportedVramRaw / (1024 * 1024));
    } else if (reportedVramRaw > 100) {
      reportedVramGB = Math.round(reportedVramRaw / 1024);
    } else {
      reportedVramGB = Math.round(reportedVramRaw);
    }
  }
  
  // For integrated AMD graphics, use estimated shared memory allocation
  const integratedPatterns = ['vega 8', 'vega 11', 'vega 3', 'graphics'];
  const isIntegrated = integratedPatterns.some(pattern => modelLower.includes(pattern)) ||
                      (reportedVramGB === 0 && modelLower.includes('radeon'));
  
  if (isIntegrated) {
    try {
      const memory = await si.mem();
      const totalRAMGB = Math.round(memory.total / (1024 * 1024 * 1024));
      return getSuggestedIntegratedVRAM(totalRAMGB);
    } catch {
      return 1; // Fallback for integrated
    }
  }
  
  // For discrete AMD GPUs, use the reported VRAM if available
  if (reportedVramGB > 0) {
    return reportedVramGB;
  }
  
  // Fallback: estimate based on known AMD GPU model names
  if (modelLower.includes('rx 7900')) return 20;
  if (modelLower.includes('rx 7800')) return 16;
  if (modelLower.includes('rx 7700')) return 12;
  if (modelLower.includes('rx 7600')) return 8;
  if (modelLower.includes('rx 6900')) return 16;
  if (modelLower.includes('rx 6800')) return 16;
  if (modelLower.includes('rx 6700')) return 12;
  if (modelLower.includes('rx 6600')) return 8;
  if (modelLower.includes('rx 580')) return 8;
  if (modelLower.includes('rx 570')) return 4;
  
  return 0; // Unknown AMD GPU
}

function getSuggestedIntegratedVRAM(totalRAMGB) {
  if (totalRAMGB >= 32) return 2; // High-end system
  if (totalRAMGB >= 16) return 1; // Mid-range system
  return 1; // Low-end system, still allocate 1GB minimum
}

// Run the debug
debugAMDDetection().then(() => {
  console.log('\n=== AMD Debug Complete ===');
  console.log('Please share this output to help optimize AMD detection.');
}).catch(console.error);