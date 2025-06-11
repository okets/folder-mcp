// System detection utilities for folder-mcp
// Detects hardware capabilities and software availability for smart defaults

import { cpus, totalmem, freemem, platform } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { 
  readFromCache, 
  writeToCache, 
  CACHE_KEYS, 
  CacheOptions,
  isCacheKeyValid,
  getCacheMetadata,
  clearCache
} from './cache.js';
import type { ILoggingService } from '../di/interfaces.js';

const execAsync = promisify(exec);

/**
 * System capabilities detected at runtime
 * Used to optimize processing settings and select appropriate models
 */
export interface SystemCapabilities {
  // Hardware specifications
  cpuCores: number;               // Number of CPU cores
  totalMemoryGB: number;          // Total system memory in GB
  availableMemoryGB: number;      // Available memory in GB
  platform: string;              // Operating system platform
  
  // GPU capabilities
  hasGPU: boolean;                // Whether GPU is available
  gpuMemoryGB?: number;           // GPU memory if available
  
  // Software availability
  ollamaAvailable: boolean;       // Whether Ollama is installed and running
  ollamaVersion?: string;         // Ollama version if available
  ollamaModels: string[];         // Available Ollama models
  
  // Performance tier (derived)
  performanceTier: 'low' | 'medium' | 'high'; // Overall system performance rating
  
  // Detection metadata
  detectedAt: string;             // ISO timestamp when detected
  detectionDuration: number;      // Time taken for detection in ms
}

/**
 * Detect system capabilities with comprehensive hardware and software detection
 * This is the main function used by runtime configuration generation
 */
export async function getSystemCapabilities(loggingService?: ILoggingService): Promise<SystemCapabilities> {
  const startTime = Date.now();
  
  // Basic hardware detection
  const cpuCores = cpus().length;
  const totalMemoryGB = Math.round((totalmem() / (1024 * 1024 * 1024)) * 10) / 10;
  const availableMemoryGB = Math.round((freemem() / (1024 * 1024 * 1024)) * 10) / 10;
  const platformName = platform();
  
  // Parallel detection of software capabilities
  const [gpuInfo, ollamaInfo] = await Promise.all([
    detectGPU(loggingService),
    detectOllama(loggingService),
  ]);
  
  // Calculate performance tier
  const performanceTier = calculatePerformanceTier(cpuCores, totalMemoryGB, gpuInfo.hasGPU);
  
  const detectionDuration = Date.now() - startTime;
  
  return {
    cpuCores,
    totalMemoryGB,
    availableMemoryGB,
    platform: platformName,
    hasGPU: gpuInfo.hasGPU,
    ...(gpuInfo.memoryGB !== undefined && { gpuMemoryGB: gpuInfo.memoryGB }),
    ollamaAvailable: ollamaInfo.available,
    ...(ollamaInfo.version && { ollamaVersion: ollamaInfo.version }),
    ollamaModels: ollamaInfo.models,
    performanceTier,
    detectedAt: new Date().toISOString(),
    detectionDuration,
  };
}

/**
 * Detect GPU availability and capabilities
 * Attempts multiple detection methods for cross-platform compatibility
 */
async function detectGPU(loggingService?: ILoggingService): Promise<{ hasGPU: boolean; memoryGB?: number }> {
  try {
    // Try multiple GPU detection methods
    const detectionMethods = [
      detectGPUWindows,
      detectGPULinux,
      detectGPUMacOS,
      detectGPUGeneric,
    ];
    
    for (const method of detectionMethods) {
      try {
        const result = await method(loggingService);
        if (result.hasGPU) {
          return result;
        }
      } catch (error) {
        loggingService?.error('GPU detection method failed', error instanceof Error ? error : new Error(String(error)));
        continue;
      }
    }
    
    return { hasGPU: false };
  } catch (error) {
    loggingService?.error('GPU detection failed', error instanceof Error ? error : new Error(String(error)));
    return { hasGPU: false };
  }
}

/**
 * Windows GPU detection using wmic
 */
async function detectGPUWindows(loggingService?: ILoggingService): Promise<{ hasGPU: boolean; memoryGB?: number }> {
  if (platform() !== 'win32') {
    return { hasGPU: false };
  }
  
  try {
    const { stdout } = await execAsync('wmic path win32_VideoController get name,AdapterRAM /format:csv');
    const lines = stdout.split('\n').filter(line => line.trim() && !line.includes('Node,Name,AdapterRAM'));
    
    let hasDiscreteGPU = false;
    let maxMemoryGB = 0;
    
    for (const line of lines) {
      const parts = line.split(',');
      if (parts.length >= 3) {
        const name = parts[1]?.trim();
        const ramStr = parts[2]?.trim();
        
        if (!ramStr) continue;
        const ram = parseInt(ramStr);
        
        // Check for discrete GPU (NVIDIA, AMD, Intel Arc)
        if (name && (name.includes('NVIDIA') || name.includes('AMD') || name.includes('Intel Arc'))) {
          hasDiscreteGPU = true;
          if (!isNaN(ram) && ram > 0) {
            const memoryGB = Math.round((ram / (1024 * 1024 * 1024)) * 10) / 10;
            maxMemoryGB = Math.max(maxMemoryGB, memoryGB);
          }
        }
      }
    }
    
    return {
      hasGPU: hasDiscreteGPU,
      ...(maxMemoryGB > 0 && { memoryGB: maxMemoryGB }),
    };
  } catch (error) {
    loggingService?.error('Windows GPU detection failed', error instanceof Error ? error : new Error(String(error)));
    return { hasGPU: false };
  }
}

/**
 * Linux GPU detection using lspci and nvidia-smi
 */
async function detectGPULinux(loggingService?: ILoggingService): Promise<{ hasGPU: boolean; memoryGB?: number }> {
  if (platform() !== 'linux') {
    return { hasGPU: false };
  }
  
  try {
    // Check for discrete GPUs using lspci
    const { stdout: lspciOutput } = await execAsync('lspci | grep -i vga');
    const hasDiscreteGPU = lspciOutput.toLowerCase().includes('nvidia') || 
                          lspciOutput.toLowerCase().includes('amd');
    
    if (!hasDiscreteGPU) {
      return { hasGPU: false };
    }
    
    // Try to get NVIDIA GPU memory
    try {
      const { stdout: nvidiaSmiOutput } = await execAsync('nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits');
      const memoryMB = parseInt(nvidiaSmiOutput.trim());
      if (!isNaN(memoryMB)) {
        return {
          hasGPU: true,
          memoryGB: Math.round((memoryMB / 1024) * 10) / 10,
        };
      }
    } catch (error) {
      loggingService?.error('nvidia-smi not available', error instanceof Error ? error : new Error(String(error)));
      // nvidia-smi not available, but we know there's a discrete GPU
    }
    
    return { hasGPU: true };
  } catch (error) {
    loggingService?.error('Linux GPU detection failed', error instanceof Error ? error : new Error(String(error)));
    return { hasGPU: false };
  }
}

/**
 * macOS GPU detection using system_profiler
 */
async function detectGPUMacOS(loggingService?: ILoggingService): Promise<{ hasGPU: boolean; memoryGB?: number }> {
  if (platform() !== 'darwin') {
    return { hasGPU: false };
  }
  
  try {
    const { stdout } = await execAsync('system_profiler SPDisplaysDataType');
    const hasDiscreteGPU = stdout.toLowerCase().includes('nvidia') || 
                          stdout.toLowerCase().includes('amd') ||
                          stdout.toLowerCase().includes('radeon');
    
    return { hasGPU: hasDiscreteGPU };
  } catch (error) {
    loggingService?.error('macOS GPU detection failed', error instanceof Error ? error : new Error(String(error)));
    return { hasGPU: false };
  }
}

/**
 * Generic GPU detection fallback
 */
async function detectGPUGeneric(loggingService?: ILoggingService): Promise<{ hasGPU: boolean; memoryGB?: number }> {
  try {
    const { stdout } = await execAsync('nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits');
    const memoryMB = parseInt(stdout.trim());
    if (!isNaN(memoryMB)) {
      return {
        hasGPU: true,
        memoryGB: Math.round((memoryMB / 1024) * 10) / 10,
      };
    }
    return { hasGPU: true };
  } catch (error) {
    loggingService?.error('Generic GPU detection failed', error instanceof Error ? error : new Error(String(error)));
    return { hasGPU: false };
  }
}

/**
 * Detect Ollama installation and available models
 */
async function detectOllama(loggingService?: ILoggingService): Promise<{
  available: boolean;
  version?: string;
  models: string[];
}> {
  try {
    const { stdout } = await execAsync('ollama list');
    const models = parseOllamaModels(stdout);
    
    try {
      const { stdout: versionOutput } = await execAsync('ollama --version');
      const version = versionOutput.trim();
      return {
        available: true,
        version,
        models,
      };
    } catch (error) {
      loggingService?.error('Failed to get Ollama version', error instanceof Error ? error : new Error(String(error)));
      return {
        available: true,
        models,
      };
    }
  } catch (error) {
    loggingService?.error('Ollama detection failed', error instanceof Error ? error : new Error(String(error)));
    return {
      available: false,
      models: [],
    };
  }
}

/**
 * Parse Ollama models list output
 */
function parseOllamaModels(output: string): string[] {
  const lines = output.split('\n').filter(line => line.trim());
  const models: string[] = [];
  
  for (const line of lines) {
    // Skip header line
    if (line.includes('NAME') && line.includes('ID')) {
      continue;
    }
    
    // Extract model name (first column)
    const parts = line.trim().split(/\s+/);
    if (parts.length > 0 && parts[0] && !parts[0].includes('NAME')) {
      models.push(parts[0]);
    }
  }
  
  return models;
}

/**
 * Calculate overall system performance tier
 * Used to select appropriate default settings
 */
function calculatePerformanceTier(
  cpuCores: number,
  totalMemoryGB: number,
  hasGPU: boolean
): 'low' | 'medium' | 'high' {
  // High performance: 8+ cores, 16+ GB RAM, discrete GPU
  if (cpuCores >= 8 && totalMemoryGB >= 16 && hasGPU) {
    return 'high';
  }
  
  // Medium performance: 4+ cores, 8+ GB RAM
  if (cpuCores >= 4 && totalMemoryGB >= 8) {
    return 'medium';
  }
  
  // Low performance: everything else
  return 'low';
}

/**
 * Get optimal settings based on performance tier
 * This provides recommended defaults for different system classes
 */
export function getOptimalSettings(tier: 'low' | 'medium' | 'high'): {
  batchSize: number;
  maxWorkers: number;
  timeoutMs: number;
  chunkSize: number;
} {
  switch (tier) {
    case 'high':
      return {
        batchSize: 64,
        maxWorkers: 12,
        timeoutMs: 60000,
        chunkSize: 1000,
      };
    
    case 'medium':
      return {
        batchSize: 32,
        maxWorkers: 6,
        timeoutMs: 45000,
        chunkSize: 800,
      };
    
    case 'low':
    default:
      return {
        batchSize: 16,
        maxWorkers: 2,
        timeoutMs: 90000,
        chunkSize: 600,
      };
  }
}

/**
 * Quick system check without full detection
 * Used for fast validation without expensive operations
 */
export async function quickSystemCheck(): Promise<{
  cpuCores: number;
  memoryGB: number;
  ollamaRunning: boolean;
}> {
  const cpuCores = cpus().length;
  const memoryGB = Math.round((totalmem() / (1024 * 1024 * 1024)) * 10) / 10;
  
  // Quick Ollama check
  let ollamaRunning = false;
  try {
    await execAsync('ollama --version', { timeout: 2000 });
    ollamaRunning = true;
  } catch (error) {
    console.warn('Ollama not available:', error instanceof Error ? error.message : String(error));
    ollamaRunning = false;
  }
  
  return { cpuCores, memoryGB, ollamaRunning };
}

/**
 * Save system profile to cache
 */
export async function saveSystemProfile(capabilities: SystemCapabilities): Promise<void> {
  try {
    const cacheOptions: CacheOptions = {
      ttlHours: 24, // 24 hours - system capabilities don't change frequently
      validateChecksum: true,
      compress: false // System profiles are small
    };
    
    writeToCache(CACHE_KEYS.SYSTEM_PROFILE, capabilities, cacheOptions);
    console.log('💾 System profile saved to cache');
  } catch (error) {
    console.error('Failed to save system profile to cache:', error instanceof Error ? error.message : String(error));
    throw error; // Re-throw to allow caller to handle
  }
}

/**
 * Load system profile from cache
 */
export async function loadSystemProfile(): Promise<SystemCapabilities | null> {
  try {
    const cacheOptions: CacheOptions = {
      ttlHours: 24, // 24 hours
      validateChecksum: true
    };
    
    const cachedProfile = readFromCache<SystemCapabilities>(CACHE_KEYS.SYSTEM_PROFILE, cacheOptions);
    
    if (cachedProfile) {
      console.log('📂 Loaded system profile from cache');
      
      // Show cache age
      const metadata = getCacheMetadata(CACHE_KEYS.SYSTEM_PROFILE);
      if (metadata) {
        const cacheAge = Date.now() - new Date(metadata.createdAt).getTime();
        const ageMinutes = Math.floor(cacheAge / (1000 * 60));
        console.log(`   📅 System profile age: ${ageMinutes} minutes`);
      }
      
      return cachedProfile;
    }
    
    console.log('📂 No cached system profile found');
    return null;
  } catch (error) {
    console.error('Failed to load system profile from cache:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Check if system profile should be refreshed
 */
export function shouldRefreshSystemProfile(): boolean {
  if (!isCacheKeyValid(CACHE_KEYS.SYSTEM_PROFILE)) {
    return true; // No valid cache exists
  }
  
  try {
    const metadata = getCacheMetadata(CACHE_KEYS.SYSTEM_PROFILE);
    if (!metadata) {
      return true;
    }
    
    // Check if cache is older than 6 hours (suggest refresh for better accuracy)
    const cacheAge = Date.now() - new Date(metadata.createdAt).getTime();
    const ageHours = cacheAge / (1000 * 60 * 60);
    
    if (ageHours > 6) {
      console.log('🔄 System profile cache is older than 6 hours, refresh recommended');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking system profile refresh:', error instanceof Error ? error.message : String(error));
    return true; // Refresh on error
  }
}

/**
 * Get system capabilities with caching
 */
export async function getSystemCapabilitiesWithCache(forceRefresh: boolean = false): Promise<SystemCapabilities> {
  try {
    // Check if we should use cached profile
    if (!forceRefresh && !shouldRefreshSystemProfile()) {
      const cachedProfile = await loadSystemProfile();
      if (cachedProfile) {
        return cachedProfile;
      }
    }
    
    // Generate fresh system capabilities
    console.log('🔍 Detecting system capabilities...');
    const capabilities = await getSystemCapabilities();
    
    // Save to cache
    await saveSystemProfile(capabilities);
    
    return capabilities;
  } catch (error) {
    console.error('Failed to get system capabilities:', error instanceof Error ? error.message : String(error));
    throw error; // Re-throw to allow caller to handle
  }
}

/**
 * Clear system profile cache
 */
export function clearSystemProfileCache(): boolean {
  try {
    const cleared = clearCache(CACHE_KEYS.SYSTEM_PROFILE);
    if (cleared) {
      console.log('🗑️ System profile cache cleared');
    }
    return cleared;
  } catch (error) {
    console.error('Failed to clear system profile cache:', error instanceof Error ? error.message : String(error));
    return false;
  }
}
