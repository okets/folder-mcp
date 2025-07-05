/**
 * Daemon Domain Interfaces
 * 
 * Pure domain interfaces for daemon functionality.
 * These interfaces define the contracts for daemon services
 * without any implementation details or external dependencies.
 */

/**
 * Daemon status enumeration
 */
export enum DaemonStatus {
  STOPPED = 'stopped',
  STARTING = 'starting', 
  RUNNING = 'running',
  STOPPING = 'stopping',
  FAILED = 'failed',
  RESTARTING = 'restarting'
}

/**
 * Process status information
 */
export interface ProcessStatus {
  /** Process ID */
  pid: number | null;
  /** Current status */
  status: DaemonStatus;
  /** Start time */
  startTime: Date | null;
  /** Uptime in milliseconds */
  uptime: number;
  /** Number of restarts */
  restartCount: number;
  /** Last restart time */
  lastRestart: Date | null;
  /** Last error if any */
  lastError: string | null;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  /** Whether the check passed */
  healthy: boolean;
  /** Check timestamp */
  timestamp: Date;
  /** Response time in milliseconds */
  responseTime: number;
  /** Error message if unhealthy */
  error?: string;
  /** Additional health data */
  details?: Record<string, any>;
}

/**
 * Health status aggregation
 */
export interface HealthStatus {
  /** Overall health */
  healthy: boolean;
  /** Last check time */
  lastCheck: Date;
  /** Number of consecutive failures */
  consecutiveFailures: number;
  /** Recent check results */
  recentChecks: HealthCheckResult[];
  /** Health check configuration */
  config: {
    enabled: boolean;
    interval: number;
    timeout: number;
    retries: number;
  };
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  /** Timestamp of metrics collection */
  timestamp: Date;
  /** Memory usage in bytes */
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  /** CPU usage percentage */
  cpu: {
    user: number;
    system: number;
    total: number;
  };
  /** System load averages */
  load: {
    load1: number;
    load5: number;
    load15: number;
  };
  /** Disk usage if enabled */
  disk?: {
    used: number;
    free: number;
    total: number;
  };
  /** Custom metrics */
  custom: Record<string, number>;
}

/**
 * Signal handling information
 */
export interface SignalInfo {
  /** Signal name */
  signal: string;
  /** Handler function name */
  handler: string;
  /** Whether handler is registered */
  registered: boolean;
}

/**
 * Core daemon service interface
 */
export interface IDaemonService {
  /**
   * Start the daemon and MCP server
   */
  start(): Promise<void>;

  /**
   * Stop the daemon and MCP server
   */
  stop(): Promise<void>;

  /**
   * Restart the daemon and MCP server
   */
  restart(): Promise<void>;

  /**
   * Get current daemon and process status
   */
  getStatus(): ProcessStatus;

  /**
   * Reload configuration without restarting
   */
  reload(): Promise<void>;

  /**
   * Check if daemon is running
   */
  isRunning(): boolean;

  /**
   * Get process ID
   */
  getPid(): number | null;
}

/**
 * Process manager interface
 */
export interface IProcessManager {
  /**
   * Start the MCP server process
   */
  startMcpServer(): Promise<void>;

  /**
   * Stop the MCP server process
   */
  stopMcpServer(): Promise<void>;

  /**
   * Restart the MCP server process
   */
  restartMcpServer(): Promise<void>;

  /**
   * Get process status
   */
  getProcessStatus(): ProcessStatus;

  /**
   * Kill process forcefully
   */
  killProcess(): Promise<void>;

  /**
   * Check if process is responsive
   */
  isProcessResponsive(): Promise<boolean>;
}

/**
 * Health monitor interface
 */
export interface IHealthMonitor {
  /**
   * Start health monitoring
   */
  startMonitoring(): void;

  /**
   * Stop health monitoring
   */
  stopMonitoring(): void;

  /**
   * Get current health status
   */
  getHealthStatus(): HealthStatus;

  /**
   * Perform immediate health check
   */
  performHealthCheck(): Promise<HealthCheckResult>;

  /**
   * Check if monitoring is active
   */
  isMonitoring(): boolean;

  /**
   * Register health check failure handler
   */
  onHealthCheckFailure(handler: (result: HealthCheckResult) => void): void;
}

/**
 * Signal handler interface
 */
export interface ISignalHandler {
  /**
   * Register all signal handlers
   */
  registerHandlers(): void;

  /**
   * Handle graceful shutdown signal
   */
  handleShutdown(): Promise<void>;

  /**
   * Handle configuration reload signal
   */
  handleReload(): Promise<void>;

  /**
   * Unregister all signal handlers
   */
  unregisterHandlers(): void;

  /**
   * Get registered signal information
   */
  getRegisteredSignals(): SignalInfo[];
}

/**
 * Performance monitor interface
 */
export interface IPerformanceMonitor {
  /**
   * Start performance monitoring
   */
  startMonitoring(): void;

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void;

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics;

  /**
   * Record custom metric
   */
  recordMetric(name: string, value: number): void;

  /**
   * Get historical metrics
   */
  getHistoricalMetrics(duration: number): PerformanceMetrics[];

  /**
   * Check if monitoring is active
   */
  isMonitoring(): boolean;
}

/**
 * PID file manager interface
 */
export interface IPidManager {
  /**
   * Write PID to file
   */
  writePidFile(path: string, pid: number): Promise<void>;

  /**
   * Read PID from file
   */
  readPidFile(path: string): Promise<number>;

  /**
   * Remove PID file
   */
  removePidFile(path: string): Promise<void>;

  /**
   * Check if process with PID is running
   */
  isProcessRunning(pid: number): boolean;

  /**
   * Check if PID file exists and process is running
   */
  isValidPidFile(path: string): Promise<boolean>;
}

/**
 * System resource monitor interface
 */
export interface ISystemMonitor {
  /**
   * Get CPU usage percentage
   */
  getCpuUsage(): Promise<{ user: number; system: number; total: number }>;

  /**
   * Get memory usage information
   */
  getMemoryUsage(): Promise<{ rss: number; heapUsed: number; heapTotal: number; external: number }>;

  /**
   * Get system load averages
   */
  getLoadAverages(): Promise<{ load1: number; load5: number; load15: number }>;

  /**
   * Get disk usage for a path
   */
  getDiskUsage(path: string): Promise<{ used: number; free: number; total: number }>;

  /**
   * Get system uptime
   */
  getSystemUptime(): Promise<number>;
}

/**
 * Daemon service tokens for dependency injection
 */
export const DAEMON_TOKENS = {
  DAEMON_SERVICE: Symbol('DaemonService'),
  PROCESS_MANAGER: Symbol('ProcessManager'),
  HEALTH_MONITOR: Symbol('HealthMonitor'),
  SIGNAL_HANDLER: Symbol('SignalHandler'),
  PERFORMANCE_MONITOR: Symbol('PerformanceMonitor'),
  PID_MANAGER: Symbol('PidManager'),
  SYSTEM_MONITOR: Symbol('SystemMonitor'),
} as const;