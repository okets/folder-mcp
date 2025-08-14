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
        const primaryGPU = graphics.controllers[0];
        if (!primaryGPU) {
          return { type: 'none' };
        }
        
        const name = primaryGPU.model || 'Unknown GPU';
        const vramBytes = primaryGPU.vram || 0;
        const vramGB = vramBytes > 0 ? Math.round(vramBytes / (1024 * 1024 * 1024)) : 0;

        // Detect GPU type based on vendor and model
        if (name.toLowerCase().includes('nvidia') || primaryGPU.vendor?.toLowerCase().includes('nvidia')) {
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
        } else if (name.toLowerCase().includes('amd') || primaryGPU.vendor?.toLowerCase().includes('amd')) {
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

  private async detectROCmSupport(): Promise<boolean> {
    try {
      // This would require additional detection logic for ROCm
      // For now, return false - can be enhanced later
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