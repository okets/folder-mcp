#!/usr/bin/env node

/**
 * Windows GPU Detection Fix
 * 
 * This script patches the machine-capabilities.ts file to fix RTX 3080 detection on Windows.
 * Common Windows issues:
 * 1. VRAM reported in different units (MB instead of bytes)
 * 2. GPU name/vendor reported differently
 * 3. Multiple GPU controllers (integrated + discrete)
 * 
 * Run on Windows: node tmp/fix-windows-gpu-detection.js
 */

const fs = require('fs');
const path = require('path');

function applyWindowsGPUFix() {
  console.log('=== Applying Windows GPU Detection Fix ===\n');
  
  const capabilitiesFile = path.join(process.cwd(), 'src/domain/models/machine-capabilities.ts');
  
  try {
    let content = fs.readFileSync(capabilitiesFile, 'utf-8');
    
    // Enhanced detectGPU method for Windows
    const enhancedDetectGPU = `  private async detectGPU(): Promise<GPUCapabilities> {
    try {
      const graphics = await si.graphics();
      
      if (graphics.controllers && graphics.controllers.length > 0) {
        // Sort controllers to prioritize discrete GPUs over integrated
        const sortedControllers = graphics.controllers.sort((a, b) => {
          const aIsDiscrete = (a.model || '').toLowerCase().includes('nvidia') || 
                             (a.model || '').toLowerCase().includes('amd') ||
                             (a.model || '').toLowerCase().includes('radeon');
          const bIsDiscrete = (b.model || '').toLowerCase().includes('nvidia') || 
                             (b.model || '').toLowerCase().includes('amd') ||
                             (b.model || '').toLowerCase().includes('radeon');
          
          if (aIsDiscrete && !bIsDiscrete) return -1;
          if (!aIsDiscrete && bIsDiscrete) return 1;
          return 0;
        });
        
        const primaryGPU = sortedControllers[0];
        if (!primaryGPU) {
          return { type: 'none' };
        }
        
        const name = primaryGPU.model || 'Unknown GPU';
        const vendor = primaryGPU.vendor || '';
        const vramRaw = primaryGPU.vram || 0;
        
        // Enhanced VRAM detection for Windows
        let vramGB = 0;
        if (vramRaw > 0) {
          // Windows may report VRAM in different units
          if (vramRaw > 1000000000) {
            // Likely bytes
            vramGB = Math.round(vramRaw / (1024 * 1024 * 1024));
          } else if (vramRaw > 1000000) {
            // Likely KB 
            vramGB = Math.round(vramRaw / (1024 * 1024));
          } else if (vramRaw > 1000) {
            // Likely MB
            vramGB = Math.round(vramRaw / 1024);
          } else {
            // Likely already in GB
            vramGB = Math.round(vramRaw);
          }
        }

        // Enhanced NVIDIA detection for Windows RTX cards
        const isNvidia = name.toLowerCase().includes('nvidia') || 
                        vendor.toLowerCase().includes('nvidia') ||
                        name.toLowerCase().includes('rtx') ||
                        name.toLowerCase().includes('gtx') ||
                        name.toLowerCase().includes('geforce');
                        
        if (isNvidia) {
          const result: GPUCapabilities = {
            type: 'nvidia',
            name
          };
          const cudaVersion = await this.detectCudaVersion();
          if (cudaVersion) {
            result.cudaVersion = cudaVersion;
          }
          if (vramGB > 0) {
            result.vramGB = vramGB;
          }
          return result;
        } else if (name.toLowerCase().includes('amd') || vendor.toLowerCase().includes('amd') || 
                   name.toLowerCase().includes('radeon')) {
          const result: GPUCapabilities = {
            type: 'amd',
            name,
            rocmSupport: await this.detectROCmSupport()
          };
          if (vramGB > 0) {
            result.vramGB = vramGB;
          }
          return result;
        } else if (name.toLowerCase().includes('apple') || name.toLowerCase().includes('metal')) {
          const memory = await si.mem();
          return {
            type: 'apple',
            name,
            vramGB: Math.round(memory.total / (1024 * 1024 * 1024)), // Apple uses unified memory
            metalSupport: true
          };
        } else if (name.toLowerCase().includes('intel')) {
          const result: GPUCapabilities = {
            type: 'intel',
            name
          };
          if (vramGB > 0) {
            result.vramGB = vramGB;
          }
          return result;
        }

        return {
          type: 'none',
          name
        };
      }

      return { type: 'none' };
    } catch (error) {
      console.error('Error detecting GPU:', error);
      return { type: 'none' };
    }
  }`;

    // Replace the existing detectGPU method
    const detectGPURegex = /private async detectGPU\(\): Promise<GPUCapabilities> \{[\s\S]*?\n  \}/;
    
    if (detectGPURegex.test(content)) {
      content = content.replace(detectGPURegex, enhancedDetectGPU);
      console.log('✅ Enhanced detectGPU method applied');
    } else {
      console.log('❌ Could not find detectGPU method to replace');
      return false;
    }
    
    // Write the fixed file
    fs.writeFileSync(capabilitiesFile, content, 'utf-8');
    console.log('✅ Windows GPU detection fix applied successfully');
    
    console.log('\nEnhancements applied:');
    console.log('- Prioritize discrete GPUs over integrated GPUs');
    console.log('- Enhanced VRAM unit detection (handles bytes/KB/MB/GB)');
    console.log('- Improved NVIDIA detection (RTX, GTX, GeForce patterns)');
    console.log('- Better vendor string matching');
    
    return true;
    
  } catch (error) {
    console.error('Error applying Windows GPU fix:', error);
    return false;
  }
}

// Apply the fix
const success = applyWindowsGPUFix();

if (success) {
  console.log('\n=== Fix Applied Successfully ===');
  console.log('Next steps:');
  console.log('1. Run: npm run build');
  console.log('2. Test: npm test -- tests/domain/models/model-system.tmoat.test.ts');
  console.log('3. Should now detect RTX 3080 as gpu: "nvidia", vram: 10');
} else {
  console.log('\n=== Fix Failed ===');
  console.log('Manual fix may be required');
}