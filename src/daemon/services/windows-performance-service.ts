/**
 * Windows Performance Detection Service
 * 
 * Detects Windows-specific performance issues with Python ML package loading
 * and provides actionable notifications to users through the FMDM system.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { ILoggingService } from '../../di/interfaces.js';

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
    if (importTimeMs !== undefined) {
      result.importTimeMs = importTimeMs;
      
      // Consider >10 seconds as slow
      if (importTimeMs > 10000) {
        try {
          result.hasDefenderExclusions = await this.checkDefenderExclusions();
        } catch (error) {
          this.logger.debug(`[WINDOWS-PERF] Could not check Defender exclusions: ${error}`);
          result.hasDefenderExclusions = false;
        }

        // Show warning if slow and no exclusions detected
        if (!result.hasDefenderExclusions) {
          result.shouldShowWarning = true;
          result.warningMessage = this.generateWarningMessage(importTimeMs);
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
    // Python models typically include these patterns
    const pythonModelPatterns = [
      'transformers:',
      'MiniLM',
      'mpnet', 
      'all-',
      'bge-',
      'sentence-transformers',
      'huggingface'
    ];

    const lowerModel = modelName.toLowerCase();
    return pythonModelPatterns.some(pattern => lowerModel.includes(pattern.toLowerCase()));
  }

  private generateWarningMessage(importTimeMs: number): string {
    const seconds = (importTimeMs / 1000).toFixed(1);
    return `Python loads slowly (${seconds}s). Run: powershell -File optimize-python.ps1`;
  }
}