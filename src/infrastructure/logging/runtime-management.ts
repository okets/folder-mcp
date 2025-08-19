/**
 * Log Management Features - Story 5.2
 * 
 * Provides runtime log level configuration, log rotation, performance monitoring,
 * and configurable log destinations without requiring daemon restart.
 */

import { LogLevel, ILoggingService, LogConfiguration, TransportConfiguration } from './index.js';
import { LoggingService, ConsoleLogTransport, FileLogTransport, JsonLogFormatter, ConsoleLogFormatter } from './logger.js';
import { existsSync, statSync, renameSync, unlinkSync } from 'fs';
import { join, dirname, basename } from 'path';

/**
 * Runtime configuration interface
 */
export interface RuntimeLogConfig {
  globalLevel: LogLevel;
  componentLevels: Record<string, LogLevel>;
  transports: RuntimeTransportConfig[];
  rotation: LogRotationConfig;
  performance: LogPerformanceConfig;
  enableMetrics: boolean;
}

export interface RuntimeTransportConfig {
  id: string;
  type: 'console' | 'file' | 'rotating-file';
  level: LogLevel;
  enabled: boolean;
  options: {
    filename?: string;
    maxSize?: number; // bytes
    maxFiles?: number;
    format?: 'json' | 'text';
  };
}

export interface LogRotationConfig {
  enabled: boolean;
  maxSize: number; // bytes
  maxFiles: number;
  rotateOnStartup: boolean;
  compressionEnabled: boolean;
}

export interface LogPerformanceConfig {
  enableMonitoring: boolean;
  maxLatencyMs: number;
  alertThreshold: number; // logs per second
  sampleRate: number; // 0.0 to 1.0
}

/**
 * Log performance metrics
 */
export interface LogPerformanceMetrics {
  totalLogs: number;
  logsByLevel: Record<LogLevel, number>;
  averageLatencyMs: number;
  peakLatencyMs: number;
  logsPerSecond: number;
  transportMetrics: Map<string, TransportMetrics>;
  memoryUsageBytes: number;
  queueSize: number;
}

export interface TransportMetrics {
  transportId: string;
  logsWritten: number;
  logsDropped: number;
  averageLatencyMs: number;
  errorCount: number;
  lastError?: string;
}

/**
 * Runtime log manager that provides dynamic configuration capabilities
 */
export class RuntimeLogManager {
  private loggers = new Map<string, ILoggingService>();
  private config: RuntimeLogConfig;
  private metrics: LogPerformanceMetrics;
  private metricsInterval: NodeJS.Timeout | null = null;
  private rotationChecks = new Map<string, NodeJS.Timeout>();
  
  constructor(initialConfig?: Partial<RuntimeLogConfig>) {
    this.config = {
      globalLevel: 'info',
      componentLevels: {},
      transports: [
        {
          id: 'default-console',
          type: 'console',
          level: 'info',
          enabled: true,
          options: { format: 'text' }
        }
      ],
      rotation: {
        enabled: false,
        maxSize: 50 * 1024 * 1024, // 50MB
        maxFiles: 5,
        rotateOnStartup: false,
        compressionEnabled: false
      },
      performance: {
        enableMonitoring: false,
        maxLatencyMs: 100,
        alertThreshold: 1000,
        sampleRate: 0.1
      },
      enableMetrics: false,
      ...initialConfig
    };
    
    this.metrics = this.initializeMetrics();
    
    if (this.config.enableMetrics) {
      this.startMetricsCollection();
    }
  }
  
  /**
   * Create or get a logger for a specific component
   */
  getLogger(component: string): ILoggingService {
    let logger = this.loggers.get(component);
    
    if (!logger) {
      logger = this.createLogger(component);
      this.loggers.set(component, logger);
    }
    
    return logger;
  }
  
  /**
   * Update log level at runtime without restart
   */
  updateLogLevel(level: LogLevel, component?: string): void {
    if (component) {
      // Update specific component level
      this.config.componentLevels[component] = level;
      const logger = this.loggers.get(component);
      if (logger && 'setLevel' in logger) {
        (logger as any).setLevel(level);
      }
    } else {
      // Update global level
      this.config.globalLevel = level;
      
      // Update all existing loggers
      for (const [comp, logger] of this.loggers.entries()) {
        const componentLevel = this.config.componentLevels[comp];
        const effectiveLevel = componentLevel || level;
        
        if ('setLevel' in logger) {
          (logger as any).setLevel(effectiveLevel);
        }
      }
    }
  }
  
  /**
   * Add a new transport at runtime
   */
  addTransport(config: RuntimeTransportConfig): void {
    // Remove existing transport with same ID
    this.removeTransport(config.id);
    
    // Add to configuration
    this.config.transports.push(config);
    
    // Update all existing loggers
    for (const logger of this.loggers.values()) {
      if (logger instanceof LoggingService) {
        const transport = this.createTransport(config);
        logger.addTransport(transport);
      }
    }
    
    // Set up rotation if it's a file transport
    if (config.type === 'file' && this.config.rotation.enabled && config.options.filename) {
      this.setupLogRotation(config.id, config.options.filename);
    }
  }
  
  /**
   * Remove a transport at runtime
   */
  removeTransport(transportId: string): void {
    // Remove from configuration
    this.config.transports = this.config.transports.filter(t => t.id !== transportId);
    
    // Clean up rotation
    const rotationTimer = this.rotationChecks.get(transportId);
    if (rotationTimer) {
      clearInterval(rotationTimer);
      this.rotationChecks.delete(transportId);
    }
    
    // Note: Removing from existing loggers would require maintaining transport references
    // For now, transport removal takes effect on next logger creation
  }
  
  /**
   * Enable/disable a transport
   */
  toggleTransport(transportId: string, enabled: boolean): void {
    const transport = this.config.transports.find(t => t.id === transportId);
    if (transport) {
      transport.enabled = enabled;
      
      // For full effect, would need to recreate loggers
      // For now, this affects new logger instances
    }
  }
  
  /**
   * Update log rotation settings
   */
  updateRotationConfig(config: Partial<LogRotationConfig>): void {
    this.config.rotation = { ...this.config.rotation, ...config };
    
    if (config.enabled !== undefined) {
      if (config.enabled && !this.config.rotation.enabled) {
        // Enable rotation for file transports
        for (const transport of this.config.transports) {
          if (transport.type === 'file' && transport.options.filename) {
            this.setupLogRotation(transport.id, transport.options.filename);
          }
        }
      } else if (!config.enabled) {
        // Disable all rotation
        for (const timer of this.rotationChecks.values()) {
          clearInterval(timer);
        }
        this.rotationChecks.clear();
      }
    }
  }
  
  /**
   * Get current performance metrics
   */
  getMetrics(): LogPerformanceMetrics {
    return { ...this.metrics };
  }
  
  /**
   * Get current configuration
   */
  getConfiguration(): RuntimeLogConfig {
    return { ...this.config };
  }
  
  /**
   * Update performance monitoring settings
   */
  updatePerformanceConfig(config: Partial<LogPerformanceConfig>): void {
    this.config.performance = { ...this.config.performance, ...config };
    
    if (config.enableMonitoring !== undefined) {
      if (config.enableMonitoring && !this.metricsInterval) {
        this.startMetricsCollection();
      } else if (!config.enableMonitoring && this.metricsInterval) {
        this.stopMetricsCollection();
      }
    }
  }
  
  /**
   * Rotate logs manually
   */
  rotateLogs(transportId?: string): void {
    const transportsToRotate = transportId 
      ? this.config.transports.filter(t => t.id === transportId)
      : this.config.transports.filter(t => t.type === 'file');
    
    for (const transport of transportsToRotate) {
      if (transport.options.filename) {
        this.performLogRotation(transport.options.filename);
      }
    }
  }
  
  /**
   * Export configuration to JSON
   */
  exportConfiguration(): string {
    return JSON.stringify(this.config, null, 2);
  }
  
  /**
   * Import configuration from JSON
   */
  importConfiguration(configJson: string): void {
    try {
      const newConfig = JSON.parse(configJson) as RuntimeLogConfig;
      this.updateConfiguration(newConfig);
    } catch (error) {
      throw new Error(`Invalid configuration JSON: ${error instanceof Error ? error.message : error}`);
    }
  }
  
  /**
   * Update entire configuration
   */
  updateConfiguration(newConfig: Partial<RuntimeLogConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    // Apply changes
    if (newConfig.globalLevel && newConfig.globalLevel !== oldConfig.globalLevel) {
      this.updateLogLevel(newConfig.globalLevel);
    }
    
    if (newConfig.componentLevels) {
      for (const [component, level] of Object.entries(newConfig.componentLevels)) {
        if (level !== oldConfig.componentLevels[component]) {
          this.updateLogLevel(level, component);
        }
      }
    }
    
    if (newConfig.performance) {
      this.updatePerformanceConfig(newConfig.performance);
    }
    
    if (newConfig.rotation) {
      this.updateRotationConfig(newConfig.rotation);
    }
  }
  
  /**
   * Clean up resources
   */
  async shutdown(): Promise<void> {
    // Stop metrics collection
    this.stopMetricsCollection();
    
    // Clear rotation timers
    for (const timer of this.rotationChecks.values()) {
      clearInterval(timer);
    }
    this.rotationChecks.clear();
    
    // Flush all loggers
    for (const logger of this.loggers.values()) {
      if ('flush' in logger && typeof logger.flush === 'function') {
        await logger.flush();
      }
    }
  }
  
  private createLogger(component: string): ILoggingService {
    const logger = new LoggingService(component, { enableBatching: false });
    
    // Set appropriate level
    const componentLevel = this.config.componentLevels[component];
    const effectiveLevel = componentLevel || this.config.globalLevel;
    logger.setLevel(effectiveLevel);
    
    // Add configured transports
    for (const transportConfig of this.config.transports) {
      if (transportConfig.enabled) {
        const transport = this.createTransport(transportConfig);
        logger.addTransport(transport);
      }
    }
    
    return this.wrapLoggerForMetrics(logger, component);
  }
  
  private createTransport(config: RuntimeTransportConfig): any {
    switch (config.type) {
      case 'console':
        const consoleFormatter = new ConsoleLogFormatter();
        return new ConsoleLogTransport(consoleFormatter, config.level);
      
      case 'file':
      case 'rotating-file':
        if (!config.options.filename) {
          throw new Error('File transport requires filename');
        }
        
        const fileFormatter = config.options.format === 'json' 
          ? new JsonLogFormatter() 
          : new ConsoleLogFormatter();
        
        return new FileLogTransport(config.options.filename, fileFormatter, config.level);
      
      default:
        throw new Error(`Unknown transport type: ${config.type}`);
    }
  }
  
  private setupLogRotation(transportId: string, filename: string): void {
    // Check for rotation every minute
    const interval = setInterval(() => {
      this.checkLogRotation(filename);
    }, 60000);
    
    this.rotationChecks.set(transportId, interval);
    
    // Perform initial rotation check
    this.checkLogRotation(filename);
  }
  
  private checkLogRotation(filename: string): void {
    if (!existsSync(filename)) {
      return;
    }
    
    try {
      const stats = statSync(filename);
      if (stats.size >= this.config.rotation.maxSize) {
        this.performLogRotation(filename);
      }
    } catch (error) {
      // Log rotation check failed - continue silently
    }
  }
  
  private performLogRotation(filename: string): void {
    try {
      const dir = dirname(filename);
      const base = basename(filename);
      const ext = base.includes('.') ? '.' + base.split('.').pop() : '';
      const name = base.replace(ext, '');
      
      // Shift existing rotated files
      for (let i = this.config.rotation.maxFiles - 1; i >= 1; i--) {
        const oldFile = join(dir, `${name}.${i}${ext}`);
        const newFile = join(dir, `${name}.${i + 1}${ext}`);
        
        if (existsSync(oldFile)) {
          if (i === this.config.rotation.maxFiles - 1) {
            // Delete the oldest file
            unlinkSync(oldFile);
          } else {
            renameSync(oldFile, newFile);
          }
        }
      }
      
      // Move current file to .1
      const rotatedFile = join(dir, `${name}.1${ext}`);
      renameSync(filename, rotatedFile);
      
    } catch (error) {
      // Log rotation failed - continue silently to avoid infinite loops
    }
  }
  
  private wrapLoggerForMetrics(logger: ILoggingService, component: string): ILoggingService {
    if (!this.config.performance.enableMonitoring) {
      return logger;
    }
    
    const startTime = Date.now();
    
    return {
      debug: (message: string, metadata?: any) => {
        this.recordMetric('debug', startTime);
        return logger.debug(message, metadata);
      },
      info: (message: string, metadata?: any) => {
        this.recordMetric('info', startTime);
        return logger.info(message, metadata);
      },
      warn: (message: string, metadata?: any) => {
        this.recordMetric('warn', startTime);
        return logger.warn(message, metadata);
      },
      error: (message: string, error?: Error, metadata?: any) => {
        this.recordMetric('error', startTime);
        return logger.error(message, error, metadata);
      },
      fatal: (message: string, error?: Error, metadata?: any) => {
        this.recordMetric('fatal', startTime);
        return logger.fatal(message, error, metadata);
      },
      ...(logger.setLevel && { setLevel: logger.setLevel.bind(logger) })
    };
  }
  
  private recordMetric(level: LogLevel, startTime: number): void {
    if (!this.config.performance.enableMonitoring) {
      return;
    }
    
    if (Math.random() > this.config.performance.sampleRate) {
      return; // Skip this sample
    }
    
    const latency = Date.now() - startTime;
    
    this.metrics.totalLogs++;
    this.metrics.logsByLevel[level] = (this.metrics.logsByLevel[level] || 0) + 1;
    
    // Update latency metrics
    this.metrics.averageLatencyMs = (this.metrics.averageLatencyMs + latency) / 2;
    this.metrics.peakLatencyMs = Math.max(this.metrics.peakLatencyMs, latency);
    
    // Check for performance alerts
    if (latency > this.config.performance.maxLatencyMs) {
      // Could emit an event or log a warning
    }
  }
  
  private initializeMetrics(): LogPerformanceMetrics {
    return {
      totalLogs: 0,
      logsByLevel: {
        debug: 0,
        info: 0,
        warn: 0,
        error: 0,
        fatal: 0
      },
      averageLatencyMs: 0,
      peakLatencyMs: 0,
      logsPerSecond: 0,
      transportMetrics: new Map(),
      memoryUsageBytes: 0,
      queueSize: 0
    };
  }
  
  private startMetricsCollection(): void {
    if (this.metricsInterval) {
      return;
    }
    
    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
    }, 10000); // Update every 10 seconds
  }
  
  private stopMetricsCollection(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }
  
  private updateMetrics(): void {
    // Update logs per second
    const now = Date.now();
    if (!this.lastMetricsUpdate) {
      this.lastMetricsUpdate = now;
      return;
    }
    
    const timeDiff = (now - this.lastMetricsUpdate) / 1000;
    this.metrics.logsPerSecond = this.metrics.totalLogs / timeDiff;
    
    // Update memory usage (approximate)
    this.metrics.memoryUsageBytes = process.memoryUsage().heapUsed;
    
    // Check for alerts
    if (this.metrics.logsPerSecond > this.config.performance.alertThreshold) {
      // Could emit performance alert
    }
    
    this.lastMetricsUpdate = now;
  }
  
  private lastMetricsUpdate?: number;
}

/**
 * Global runtime log manager instance
 */
export const runtimeLogManager = new RuntimeLogManager();

/**
 * CLI interface for log management
 */
export class LogManagementCLI {
  constructor(private manager: RuntimeLogManager) {}
  
  /**
   * Handle CLI commands for log management
   */
  handleCommand(command: string, args: string[]): string {
    switch (command) {
      case 'level':
        return this.handleLevelCommand(args);
      case 'transport':
        return this.handleTransportCommand(args);
      case 'rotate':
        return this.handleRotateCommand(args);
      case 'metrics':
        return this.handleMetricsCommand(args);
      case 'config':
        return this.handleConfigCommand(args);
      default:
        return this.getHelpText();
    }
  }
  
  private handleLevelCommand(args: string[]): string {
    const [action, level, component] = args;
    
    if (action === 'set' && level) {
      const logLevel = level as LogLevel;
      this.manager.updateLogLevel(logLevel, component);
      return `Log level ${component ? `for ${component} ` : ''}set to ${level}`;
    }
    
    if (action === 'get') {
      const config = this.manager.getConfiguration();
      if (component && config.componentLevels[component]) {
        return `${component}: ${config.componentLevels[component]}`;
      }
      return `Global: ${config.globalLevel}`;
    }
    
    return 'Usage: level set <level> [component] | level get [component]';
  }
  
  private handleTransportCommand(args: string[]): string {
    const [action, ...params] = args;
    
    switch (action) {
      case 'list':
        const config = this.manager.getConfiguration();
        return JSON.stringify(config.transports, null, 2);
      
      case 'add':
        // Implementation would parse transport config from params
        return 'Transport add not implemented in CLI demo';
      
      case 'remove':
        const [id] = params;
        if (id) {
          this.manager.removeTransport(id);
          return `Transport ${id} removed`;
        }
        return 'Usage: transport remove <id>';
      
      default:
        return 'Usage: transport list | transport add <config> | transport remove <id>';
    }
  }
  
  private handleRotateCommand(args: string[]): string {
    const [transportId] = args;
    this.manager.rotateLogs(transportId);
    return transportId ? `Rotated logs for ${transportId}` : 'Rotated all logs';
  }
  
  private handleMetricsCommand(args: string[]): string {
    const metrics = this.manager.getMetrics();
    return JSON.stringify(metrics, null, 2);
  }
  
  private handleConfigCommand(args: string[]): string {
    const [action] = args;
    
    if (action === 'export') {
      return this.manager.exportConfiguration();
    }
    
    if (action === 'show') {
      const config = this.manager.getConfiguration();
      return JSON.stringify(config, null, 2);
    }
    
    return 'Usage: config show | config export';
  }
  
  private getHelpText(): string {
    return `
Log Management Commands:
  level set <level> [component]  - Set log level
  level get [component]          - Get current log level
  transport list                 - List all transports
  transport add <config>         - Add new transport
  transport remove <id>          - Remove transport
  rotate [transportId]           - Rotate logs
  metrics                        - Show performance metrics
  config show                    - Show current configuration
  config export                  - Export configuration JSON
`;
  }
}

/**
 * Factory functions
 */
export function createRuntimeLogManager(config?: Partial<RuntimeLogConfig>): RuntimeLogManager {
  return new RuntimeLogManager(config);
}

export function createLogManagementCLI(manager?: RuntimeLogManager): LogManagementCLI {
  return new LogManagementCLI(manager || runtimeLogManager);
}