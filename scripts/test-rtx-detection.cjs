#!/usr/bin/env node

/**
 * Test RTX 3080 detection fix using the actual Windows data
 */

const { MachineCapabilitiesDetector } = require('../dist/src/domain/models/machine-capabilities.js');

async function testRTXDetection() {
  console.log('=== Testing RTX 3080 Detection Fix ===\n');
  
  try {
    const detector = new MachineCapabilitiesDetector();
    const capabilities = await detector.detectCapabilities();
    
    console.log('Detected capabilities:');
    console.log(JSON.stringify({
      gpu: capabilities.gpu.type,
      gpuName: capabilities.gpu.name,
      vram: capabilities.gpu.vramGB,
      platform: capabilities.platform
    }, null, 2));
    
    // Test specific Windows RTX 3080 scenario
    if (capabilities.gpu.type === 'nvidia' && 
        capabilities.gpu.name?.includes('RTX 3080') &&
        capabilities.gpu.vramGB === 8) {
      console.log('\n✅ SUCCESS: RTX 3080 Laptop GPU detected correctly!');
      console.log('- GPU Type: nvidia ✓');
      console.log('- Model: RTX 3080 ✓'); 
      console.log('- VRAM: 8GB ✓ (converted from 8192 MB)');
    } else if (capabilities.gpu.type === 'nvidia') {
      console.log('\n✅ NVIDIA GPU detected, but different model/VRAM:');
      console.log(`- GPU: ${capabilities.gpu.name}`);
      console.log(`- VRAM: ${capabilities.gpu.vramGB}GB`);
    } else {
      console.log('\n❌ RTX 3080 still not detected properly:');
      console.log(`- Detected: ${capabilities.gpu.type}`);
      console.log(`- Name: ${capabilities.gpu.name}`);
      console.log(`- VRAM: ${capabilities.gpu.vramGB}GB`);
    }
    
  } catch (error) {
    console.error('Error testing RTX detection:', error);
  }
}

testRTXDetection();