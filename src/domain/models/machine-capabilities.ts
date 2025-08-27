import * as si from 'systeminformation';
import NodeCache from 'node-cache';

export interface GPUCapabilities {
  type: 'nvidia' | 'amd' | 'apple' | 'intel' | 'none';
  name?: string;
  vramGB?: number;
  cudaVersion?: string;
  metalSupport?: boolean;
  rocmSupport?: boolean;
}

export interface CPUCapabilities {
  cores: number;
  architecture: string;
  features: string[];
  clockSpeedGHz?: number;
}

export interface MemoryCapabilities {
  totalRAMGB: number;
  availableRAMGB: number;
  swapGB: number;
}

export interface MachineCapabilities {
  gpu: GPUCapabilities;
  cpu: CPUCapabilities;
  memory: MemoryCapabilities;
  platform: string;
  detectedAt: Date;
}

export class MachineCapabilitiesDetector {
  private cache: NodeCache;
  private readonly CACHE_KEY = 'machine_capabilities';
  private readonly CACHE_TTL = 3600; // 1 hour in seconds

  constructor() {
    this.cache = new NodeCache({ stdTTL: this.CACHE_TTL });
  }

  async detectCapabilities(): Promise<MachineCapabilities> {
    // Check cache first
    const cached = this.cache.get<MachineCapabilities>(this.CACHE_KEY);
    if (cached) {
      return cached;
    }

    // Detect fresh capabilities
    const capabilities: MachineCapabilities = {
      gpu: await this.detectGPU(),
      cpu: await this.detectCPU(),
      memory: await this.detectMemory(),
      platform: process.platform,
      detectedAt: new Date()
    };

    // Cache the results
    this.cache.set(this.CACHE_KEY, capabilities);
    
    return capabilities;
  }

    private async detectGPU(): Promise<GPUCapabilities> {
    try {
      const graphics = await si.graphics();
      
      if (graphics.controllers && graphics.controllers.length > 0) {
        // Sort controllers to prioritize discrete GPUs over integrated
        const sortedControllers = graphics.controllers.sort((a, b) => {
          const aIsDiscrete = this.isDiscreteGPU(a.model || '', a.vendor || '');
          const bIsDiscrete = this.isDiscreteGPU(b.model || '', b.vendor || '');
          
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

        // Enhanced GPU vendor detection
        if (this.isNvidiaGPU(name, vendor)) {
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
        } else if (this.isAmdGPU(name, vendor)) {
          const result: GPUCapabilities = {
            type: 'amd',
            name,
            rocmSupport: await this.detectROCmSupport()
          };
          
          // Enhanced VRAM detection for AMD (integrated vs discrete)
          const amdVramGB = await this.detectAmdVRAM(name, vramGB);
          if (amdVramGB > 0) {
            result.vramGB = amdVramGB;
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
  }

  private async detectCPU(): Promise<CPUCapabilities> {
    try {
      const cpu = await si.cpu();
      const cpuFlags = await si.cpuFlags();
      
      const result: CPUCapabilities = {
        cores: cpu.physicalCores || cpu.cores || 1,
        architecture: cpu.manufacturer || process.arch,
        features: cpuFlags.split(' ').filter(flag => 
          ['avx', 'avx2', 'fma', 'sse4_1', 'sse4_2'].some(feature => 
            flag.toLowerCase().includes(feature)
          )
        )
      };
      
      if (cpu.speed) {
        result.clockSpeedGHz = cpu.speed / 1000;
      }
      
      return result;
    } catch (error) {
      console.error('Error detecting CPU:', error);
      return {
        cores: 1,
        architecture: process.arch,
        features: []
      };
    }
  }

  private async detectMemory(): Promise<MemoryCapabilities> {
    try {
      const mem = await si.mem();
      
      return {
        totalRAMGB: Math.round(mem.total / (1024 * 1024 * 1024)),
        availableRAMGB: Math.round(mem.available / (1024 * 1024 * 1024)),
        swapGB: Math.round(mem.swaptotal / (1024 * 1024 * 1024))
      };
    } catch (error) {
      console.error('Error detecting memory:', error);
      return {
        totalRAMGB: 8, // Conservative fallback
        availableRAMGB: 4,
        swapGB: 0
      };
    }
  }

  private async detectCudaVersion(): Promise<string | undefined> {
    try {
      // This would require additional detection logic or nvidia-ml-py equivalent
      // For now, return undefined - can be enhanced later
      return undefined;
    } catch {
      return undefined;
    }
  }


  // Enhanced GPU detection helper methods
  private isDiscreteGPU(model: string, vendor: string): boolean {
    const modelLower = model.toLowerCase();
    const vendorLower = vendor.toLowerCase();
    
    // NVIDIA discrete GPU patterns
    if (this.isNvidiaGPU(model, vendor)) return true;
    
    // AMD discrete GPU patterns
    if (this.isAmdGPU(model, vendor)) {
      // Additional check: exclude integrated AMD graphics
      const integratedPatterns = ['vega 8', 'vega 11', 'vega 3', 'graphics'];
      return !integratedPatterns.some(pattern => modelLower.includes(pattern));
    }
    
    return false;
  }

  private isNvidiaGPU(model: string, vendor: string): boolean {
    const modelLower = model.toLowerCase();
    const vendorLower = vendor.toLowerCase();
    
    // Vendor-based detection
    if (vendorLower.includes('nvidia')) return true;
    
    // Model-based detection for NVIDIA cards
    const nvidiaPatterns = [
      'rtx', 'gtx', 'geforce', 'quadro', 'tesla', 'titan'
    ];
    
    return nvidiaPatterns.some(pattern => modelLower.includes(pattern));
  }

  private isAmdGPU(model: string, vendor: string): boolean {
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

  private async detectAmdVRAM(modelName: string, reportedVramGB: number): Promise<number> {
    const modelLower = modelName.toLowerCase();
    
    // For integrated AMD graphics, use estimated shared memory allocation
    const integratedPatterns = ['vega 8', 'vega 11', 'vega 3', 'graphics'];
    const isIntegrated = integratedPatterns.some(pattern => modelLower.includes(pattern)) ||
                        (reportedVramGB === 0 && modelLower.includes('radeon'));
    
    if (isIntegrated) {
      try {
        // Estimate shared memory allocation for integrated AMD graphics
        const memory = await si.mem();
        const totalRAMGB = Math.round(memory.total / (1024 * 1024 * 1024));
        
        // Conservative estimate: 1-2GB for integrated graphics based on system RAM
        if (totalRAMGB >= 32) return 2; // High-end system
        if (totalRAMGB >= 16) return 1; // Mid-range system
        return 1; // Low-end system, still allocate 1GB minimum
      } catch {
        return 1; // Fallback for integrated
      }
    }
    
    // For discrete AMD GPUs, use the reported VRAM if available
    if (reportedVramGB > 0) {
      return reportedVramGB;
    }
    
    // Fallback: estimate based on known AMD GPU model names
    if (modelLower.includes('rx 7900')) return 20; // RX 7900 XTX/XT
    if (modelLower.includes('rx 7800')) return 16; // RX 7800 XT
    if (modelLower.includes('rx 7700')) return 12; // RX 7700 XT
    if (modelLower.includes('rx 7600')) return 8;  // RX 7600
    if (modelLower.includes('rx 6900')) return 16; // RX 6900 XT
    if (modelLower.includes('rx 6800')) return 16; // RX 6800 XT
    if (modelLower.includes('rx 6700')) return 12; // RX 6700 XT
    if (modelLower.includes('rx 6600')) return 8;  // RX 6600 XT/6600
    if (modelLower.includes('rx 580')) return 8;   // RX 580
    if (modelLower.includes('rx 570')) return 4;   // RX 570
    
    return 0; // Unknown AMD GPU
  }

  private async detectROCmSupport(): Promise<boolean> {
    try {
      // Basic ROCm detection for Windows (simplified)
      // In a full implementation, this would check for ROCm installation
      // For now, return false as ROCm is primarily Linux-focused
      return false;
    } catch {
      return false;
    }
  }

  // Test method to clear cache (useful for testing)
  clearCache(): void {
    this.cache.flushAll();
  }
}