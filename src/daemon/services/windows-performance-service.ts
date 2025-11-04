/**
 * Windows Performance Detection Service
 * 
 * Detects Windows-specific performance issues with Python ML package loading
 * and provides actionable notifications to users through the FMDM system.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { ILoggingService } from '../../di/interfaces.js';
import { isGpuRequired } from '../../config/model-registry.js';

const execAsync = promisify(exec);

export interface WindowsPerformanceResult {
  isWindows: boolean;
  isPythonModel: boolean;
  importTimeMs?: number;
  hasDefenderExclusions?: boolean;
  shouldShowWarning: boolean;
  warningMessage?: string;
}

export interface IWindowsPerformanceService {
  /**
   * Detect Windows performance issues for a given model
   */
  detectPerformanceIssues(modelName: string, importTimeMs?: number): Promise<WindowsPerformanceResult>;
  
  /**
   * Check if Windows Defender has Python exclusions
   */
  checkDefenderExclusions(): Promise<boolean>;
}

export class WindowsPerformanceService implements IWindowsPerformanceService {
  private readonly logger: ILoggingService;
  private readonly isWindows: boolean;

  constructor(logger: ILoggingService) {
    this.logger = logger;
    this.isWindows = process.platform === 'win32';
  }

  async detectPerformanceIssues(modelName: string, importTimeMs?: number): Promise<WindowsPerformanceResult> {
    const result: WindowsPerformanceResult = {
      isWindows: this.isWindows,
      isPythonModel: this.isPythonModel(modelName),
      shouldShowWarning: false
    };
    
    if (importTimeMs !== undefined) {
      result.importTimeMs = importTimeMs;
    }

    // Only check for Windows + Python models
    if (!this.isWindows || !result.isPythonModel) {
      return result;
    }

    // If we have import time, check if it's slow
    // If not provided, do a quick test import to measure timing
    let actualImportTime = importTimeMs;
    
    if (actualImportTime === undefined) {
      this.logger.debug(`[WINDOWS-PERF] No import time provided, measuring Python import speed for ${modelName}`);
      actualImportTime = await this.measurePythonImportTime();
    }
    
    if (actualImportTime !== undefined) {
      result.importTimeMs = actualImportTime;

      // Consider >15s as slow
      if (actualImportTime > 15000) {
        try {
          result.hasDefenderExclusions = await this.checkDefenderExclusions();
        } catch (error) {
          this.logger.debug(`[WINDOWS-PERF] Could not check Defender exclusions: ${error}`);
          result.hasDefenderExclusions = false;
        }

        // Show warning if slow and no exclusions detected
        if (!result.hasDefenderExclusions) {
          result.shouldShowWarning = true;
          result.warningMessage = this.generateWarningMessage(actualImportTime);
        }
      }
    }

    return result;
  }

  async checkDefenderExclusions(): Promise<boolean> {
    if (!this.isWindows) {
      return false;
    }

    try {
      const { stdout } = await execAsync(
        'powershell -Command "(Get-MpPreference).ExclusionPath"',
        { timeout: 5000 }
      );

      const exclusions = stdout.toLowerCase();
      
      // Check for common Python paths
      const pythonIndicators = [
        'python',
        'site-packages', 
        'torch',
        'localappdata\\programs\\python',
        'appdata\\python'
      ];

      return pythonIndicators.some(indicator => exclusions.includes(indicator));
    } catch (error) {
      this.logger.debug(`[WINDOWS-PERF] Defender exclusion check failed: ${error}`);
      return false;
    }
  }

  private isPythonModel(modelName: string): boolean {
    // First check if it's a known GPU model from registry (GPU models use Python)
    try {
      // Try direct lookup
      if (isGpuRequired(modelName)) {
        return true;
      }

      // Try with gpu: prefix if not already present
      if (!modelName.startsWith('gpu:') && !modelName.startsWith('cpu:')) {
        if (isGpuRequired(`gpu:${modelName}`)) {
          return true;
        }
      }
    } catch {
      // Model not in registry, fall back to pattern matching
    }

    // Fallback: Check for generic Python/ML patterns for unknown models
    const pythonIndicators = [
      'transformers:',
      'sentence-transformers',
      'huggingface'
    ];

    const lowerModel = modelName.toLowerCase();
    return pythonIndicators.some(indicator =>
      lowerModel.includes(indicator.toLowerCase())
    );
  }

  private generateWarningMessage(importTimeMs: number): string {
    const seconds = (importTimeMs / 1000).toFixed(1);
    return `Python loads slowly (${seconds}s). Run as admin: powershell -ExecutionPolicy Bypass -File "${process.cwd()}\\scripts\\optimize-python.ps1"`;
  }

  /**
   * Measure Python import time by doing a quick test import
   */
  private async measurePythonImportTime(): Promise<number | undefined> {
    if (!this.isWindows) {
      return undefined;
    }

    try {
      this.logger.debug(`[WINDOWS-PERF] Starting Python import timing test`);
      const startTime = Date.now();
      
      // Quick test: just import torch/transformers to see if it's slow
      const testCommand = 'python3 -c "import torch; import transformers; print(\'OK\')"';
      
      await execAsync(testCommand, { timeout: 30000 }); // 30 second timeout
      
      const endTime = Date.now();
      const importTime = endTime - startTime;
      
      this.logger.debug(`[WINDOWS-PERF] Python import test completed in ${importTime}ms`);
      return importTime;
      
    } catch (error) {
      this.logger.debug(`[WINDOWS-PERF] Python import timing test failed: ${error}`);
      // If the test fails, assume Python is working but we can't measure timing
      // Return a reasonable default that won't trigger warnings unnecessarily
      return 500; // 0.5 seconds - reasonable default
    }
  }
}