#!/usr/bin/env node

/**
 * Debug script to investigate Windows RTX 3080 GPU detection issues
 * 
 * This script will:
 * 1. Show raw systeminformation output for GPU detection
 * 2. Test our detection logic step by step
 * 3. Identify why RTX 3080 shows as 'none' instead of 'nvidia'
 * 
 * Run on Windows: node tmp/debug-gpu-detection.js
 */

const si = require('systeminformation');

async function debugGPUDetection() {
  console.log('=== GPU Detection Debug Script ===\n');
  
  try {
    console.log('1. Raw systeminformation.graphics() output:');
    const graphics = await si.graphics();
    console.log(JSON.stringify(graphics, null, 2));
    
    console.log('\n2. Controllers analysis:');
    if (graphics.controllers && graphics.controllers.length > 0) {
      graphics.controllers.forEach((controller, index) => {
        console.log(`\nController ${index}:`);
        console.log(`  model: "${controller.model}"`);
        console.log(`  vendor: "${controller.vendor}"`);
        console.log(`  vram: ${controller.vram} (type: ${typeof controller.vram})`);
        console.log(`  bus: "${controller.bus}"`);
        console.log(`  deviceId: "${controller.deviceId}"`);
        console.log(`  subDeviceId: "${controller.subDeviceId}"`);
        
        // Test our detection logic
        const model = controller.model || 'Unknown GPU';
        const vendor = controller.vendor || '';
        
        console.log(`\n  Detection tests:`);
        console.log(`    model.toLowerCase().includes('nvidia'): ${model.toLowerCase().includes('nvidia')}`);
        console.log(`    vendor.toLowerCase().includes('nvidia'): ${vendor.toLowerCase().includes('nvidia')}`);
        console.log(`    model.toLowerCase().includes('rtx'): ${model.toLowerCase().includes('rtx')}`);
        console.log(`    model.toLowerCase().includes('3080'): ${model.toLowerCase().includes('3080')}`);
        
        // VRAM calculation
        const vramBytes = controller.vram || 0;
        const vramGB = vramBytes > 0 ? Math.round(vramBytes / (1024 * 1024 * 1024)) : 0;
        console.log(`    VRAM calculation: ${vramBytes} bytes -> ${vramGB} GB`);
        
        // Alternative VRAM calculations (in case units are different)
        const vramAltMB = vramBytes > 0 ? Math.round(vramBytes / (1024 * 1024)) : 0;
        const vramAltKB = vramBytes > 0 ? Math.round(vramBytes / 1024) : 0;
        console.log(`    Alt VRAM (MB): ${vramAltMB} MB`);
        console.log(`    Alt VRAM (KB): ${vramAltKB} KB`);
        console.log(`    Direct VRAM: ${vramBytes} (might already be in GB/MB)`);
      });
    } else {
      console.log('  No controllers found!');
    }
    
    console.log('\n3. Testing our current detection logic:');
    const primaryGPU = graphics.controllers?.[0];
    if (primaryGPU) {
      const name = primaryGPU.model || 'Unknown GPU';
      const vendor = primaryGPU.vendor || '';
      
      if (name.toLowerCase().includes('nvidia') || vendor.toLowerCase().includes('nvidia')) {
        console.log('  ✅ Would detect as NVIDIA');
        
        const vramBytes = primaryGPU.vram || 0;
        const vramGB = vramBytes > 0 ? Math.round(vramBytes / (1024 * 1024 * 1024)) : 0;
        
        console.log(`  VRAM: ${vramGB} GB (from ${vramBytes} bytes)`);
        
        if (vramGB === 0 && vramBytes > 0) {
          // Try different unit assumptions
          const vramIfMB = Math.round(vramBytes / 1024);
          const vramIfKB = Math.round(vramBytes / (1024 * 1024));
          console.log(`  VRAM if already MB: ${vramIfMB} GB`);
          console.log(`  VRAM if already KB: ${vramIfKB} GB`);
          console.log(`  VRAM if already GB: ${vramBytes} GB`);
        }
      } else {
        console.log('  ❌ Would NOT detect as NVIDIA');
        console.log(`  Reason: name="${name}" vendor="${vendor}"`);
        console.log('  Neither contains "nvidia"');
      }
    } else {
      console.log('  ❌ No primary GPU found');
    }
    
    console.log('\n4. Additional Windows-specific checks:');
    
    // Try to get more detailed info
    try {
      const osInfo = await si.osInfo();
      console.log(`  OS: ${osInfo.platform} ${osInfo.distro} ${osInfo.release}`);
      
      const versions = await si.versions();
      console.log(`  Node.js: ${versions.node}`);
      console.log(`  systeminformation: ${versions.npm || 'unknown'}`);
    } catch (e) {
      console.log(`  Error getting OS info: ${e.message}`);
    }
    
  } catch (error) {
    console.error('Error during GPU detection debug:', error);
  }
}

// Run the debug
debugGPUDetection().then(() => {
  console.log('\n=== Debug Complete ===');
  console.log('Please share this output to help fix the GPU detection issue.');
}).catch(console.error);