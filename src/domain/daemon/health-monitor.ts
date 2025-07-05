/**
 * Health Monitor - Domain Layer
 * 
 * Monitors daemon and MCP server health with configurable checks.
 * Provides comprehensive health status and failure handling.
 */

import { EventEmitter } from 'events';
import { 
  IHealthMonitor, 
  HealthStatus, 
  HealthCheckResult,
  IProcessManager 
} from './interfaces.js';
import { HealthCheckConfig } from '../../config/schema/daemon.js';

/**
 * Health monitor events
 */
export interface HealthMonitorEvents {
  'healthCheckPassed': (result: HealthCheckResult) => void;
  'healthCheckFailed': (result: HealthCheckResult) => void;
  'healthStatusChanged': (status: HealthStatus) => void;
  'monitoring Started': () => void;
  'monitoringStopped': () => void;
}

/**
 * Health check type enumeration
 */
export enum HealthCheckType {
  PROCESS_ALIVE = 'process_alive',
  PROCESS_RESPONSIVE = 'process_responsive',
  MCP_ENDPOINT = 'mcp_endpoint',
  MEMORY_USAGE = 'memory_usage',
  CPU_USAGE = 'cpu_usage'
}

/**
 * Health check implementation
 */
export interface IHealthCheck {
  type: HealthCheckType;
  name: string;
  execute(): Promise<HealthCheckResult>;
}

/**
 * Health monitor implementation
 */
export class HealthMonitor extends EventEmitter implements IHealthMonitor {
  private isMonitoringActive = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private healthChecks: Map<HealthCheckType, IHealthCheck> = new Map();
  private recentResults: HealthCheckResult[] = [];
  private consecutiveFailures = 0;
  private lastHealthCheck: Date | null = null;
  private failureHandlers: Array<(result: HealthCheckResult) => void> = [];

  constructor(
    private config: HealthCheckConfig,
    private processManager: IProcessManager,
    private logger: { info: (msg: string) => void; error: (msg: string, error?: Error) => void; warn: (msg: string) => void; debug: (msg: string) => void; }
  ) {
    super();
    this.setupDefaultHealthChecks();
  }

  /**
   * Start health monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoringActive) {
      this.logger.warn('Health monitoring is already active');
      return;
    }

    if (!this.config.enabled) {
      this.logger.info('Health monitoring is disabled in configuration');
      return;
    }

    this.logger.info('Starting health monitoring...');
    this.isMonitoringActive = true;
    
    // Start monitoring interval
    this.monitoringInterval = setInterval(
      () => this.performScheduledHealthCheck(),
      this.config.interval
    );

    // Perform initial health check
    this.performScheduledHealthCheck();

    this.emit('monitoringStarted');
    this.logger.info(`Health monitoring started with ${this.config.interval}ms interval`);
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoringActive) {
      this.logger.warn('Health monitoring is not active');
      return;
    }

    this.logger.info('Stopping health monitoring...');
    this.isMonitoringActive = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.emit('monitoringStopped');
    this.logger.info('Health monitoring stopped');
  }

  /**
   * Get current health status
   */
  getHealthStatus(): HealthStatus {
    return {
      healthy: this.consecutiveFailures === 0,
      lastCheck: this.lastHealthCheck || new Date(0),
      consecutiveFailures: this.consecutiveFailures,
      recentChecks: this.recentResults.slice(-10), // Last 10 results
      config: {
        enabled: this.config.enabled,
        interval: this.config.interval,
        timeout: this.config.timeout,
        retries: this.config.retries
      }
    };
  }

  /**
   * Perform immediate health check
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      this.logger.debug('Performing health check...');

      // Execute all registered health checks
      const checkPromises = Array.from(this.healthChecks.values()).map(
        check => this.executeHealthCheckWithTimeout(check)
      );

      const results = await Promise.allSettled(checkPromises);
      
      // Analyze results
      const failedChecks = results.filter(r => r.status === 'rejected' || !r.value?.healthy);
      const healthy = failedChecks.length === 0;
      
      const result: HealthCheckResult = {
        healthy,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        details: {
          totalChecks: results.length,
          passedChecks: results.length - failedChecks.length,
          failedChecks: failedChecks.length,
          checks: results.map((r, i) => ({
            type: Array.from(this.healthChecks.keys())[i],
            result: r.status === 'fulfilled' ? r.value : { healthy: false, error: String(r.reason) }
          }))
        }
      };

      // Add error details if unhealthy
      if (!healthy) {
        const errors = failedChecks.map(check => 
          check.status === 'rejected' ? String(check.reason) : 'Health check failed'
        );
        result.error = `Failed checks: ${errors.join(', ')}`;
      }

      this.processHealthCheckResult(result);
      return result;

    } catch (error) {
      const result: HealthCheckResult = {
        healthy: false,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };

      this.processHealthCheckResult(result);
      return result;
    }
  }

  /**
   * Check if monitoring is active
   */
  isMonitoring(): boolean {
    return this.isMonitoringActive;
  }

  /**
   * Register health check failure handler
   */
  onHealthCheckFailure(handler: (result: HealthCheckResult) => void): void {
    this.failureHandlers.push(handler);
  }

  /**
   * Add custom health check
   */
  addHealthCheck(type: HealthCheckType, check: IHealthCheck): void {
    this.healthChecks.set(type, check);
    this.logger.debug(`Added health check: ${type}`);
  }

  /**
   * Remove health check
   */
  removeHealthCheck(type: HealthCheckType): void {
    this.healthChecks.delete(type);
    this.logger.debug(`Removed health check: ${type}`);
  }

  /**
   * Get registered health check types
   */
  getRegisteredChecks(): HealthCheckType[] {
    return Array.from(this.healthChecks.keys());
  }

  /**
   * Update health check configuration
   */
  updateConfig(config: Partial<HealthCheckConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart monitoring if active to apply new config
    if (this.isMonitoringActive) {
      this.stopMonitoring();
      this.startMonitoring();
    }
    
    this.logger.info('Health check configuration updated');
  }

  /**
   * Get health check statistics
   */
  getStatistics(): {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    averageResponseTime: number;
    consecutiveFailures: number;
    uptime: number;
  } {
    const totalChecks = this.recentResults.length;
    const passedChecks = this.recentResults.filter(r => r.healthy).length;
    const failedChecks = totalChecks - passedChecks;
    const averageResponseTime = totalChecks > 0 
      ? this.recentResults.reduce((sum, r) => sum + r.responseTime, 0) / totalChecks 
      : 0;

    return {
      totalChecks,
      passedChecks,
      failedChecks,
      averageResponseTime,
      consecutiveFailures: this.consecutiveFailures,
      uptime: this.lastHealthCheck ? Date.now() - this.lastHealthCheck.getTime() : 0
    };
  }

  /**
   * Setup default health checks
   */
  private setupDefaultHealthChecks(): void {
    // Process alive check
    this.addHealthCheck(HealthCheckType.PROCESS_ALIVE, {
      type: HealthCheckType.PROCESS_ALIVE,
      name: 'Process Alive Check',
      execute: async (): Promise<HealthCheckResult> => {
        const processStatus = this.processManager.getProcessStatus();
        const healthy = processStatus.pid !== null;
        
        const result: HealthCheckResult = {
          healthy,
          timestamp: new Date(),
          responseTime: 1, // Very fast check
          details: { pid: processStatus.pid, status: processStatus.status }
        };
        
        if (!healthy) {
          result.error = 'Process is not running';
        }
        
        return result;
      }
    });

    // Process responsive check
    this.addHealthCheck(HealthCheckType.PROCESS_RESPONSIVE, {
      type: HealthCheckType.PROCESS_RESPONSIVE,
      name: 'Process Responsive Check',
      execute: async (): Promise<HealthCheckResult> => {
        const startTime = Date.now();
        const isResponsive = await this.processManager.isProcessResponsive();
        
        const result: HealthCheckResult = {
          healthy: isResponsive,
          timestamp: new Date(),
          responseTime: Date.now() - startTime,
          details: { responsive: isResponsive }
        };
        
        if (!isResponsive) {
          result.error = 'Process is not responsive';
        }
        
        return result;
      }
    });
  }

  /**
   * Execute health check with timeout
   */
  private async executeHealthCheckWithTimeout(check: IHealthCheck): Promise<HealthCheckResult> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Health check ${check.name} timed out after ${this.config.timeout}ms`));
      }, this.config.timeout);

      check.execute()
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Perform scheduled health check with retry logic
   */
  private async performScheduledHealthCheck(): Promise<void> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.retries + 1; attempt++) {
      try {
        await this.performHealthCheck();
        return; // Success, exit retry loop
      } catch (error) {
        lastError = error as Error;
        
        if (attempt <= this.config.retries) {
          this.logger.debug(`Health check attempt ${attempt} failed, retrying...`);
          // Small delay between retries
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    // All retries failed
    if (lastError) {
      this.logger.error(`Health check failed after ${this.config.retries + 1} attempts:`, lastError);
    }
  }

  /**
   * Process health check result and update status
   */
  private processHealthCheckResult(result: HealthCheckResult): void {
    this.lastHealthCheck = result.timestamp;
    
    // Add to recent results (keep last 50)
    this.recentResults.push(result);
    if (this.recentResults.length > 50) {
      this.recentResults.shift();
    }

    // Update consecutive failures
    if (result.healthy) {
      this.consecutiveFailures = 0;
      this.emit('healthCheckPassed', result);
      this.logger.debug(`Health check passed (${result.responseTime}ms)`);
    } else {
      this.consecutiveFailures++;
      this.emit('healthCheckFailed', result);
      this.logger.warn(`Health check failed: ${result.error} (consecutive failures: ${this.consecutiveFailures})`);
      
      // Notify failure handlers
      this.failureHandlers.forEach(handler => {
        try {
          handler(result);
        } catch (error) {
          this.logger.error('Error in health check failure handler:', error as Error);
        }
      });
    }

    // Emit status change
    this.emit('healthStatusChanged', this.getHealthStatus());
  }
}