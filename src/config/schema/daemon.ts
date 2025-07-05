/**
 * Daemon Configuration Schema
 * 
 * Defines the configuration structure for daemon process management.
 * This schema drives all daemon behavior including process lifecycle,
 * health monitoring, and performance tracking.
 */

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  /** Enable health monitoring */
  enabled: boolean;
  /** Health check interval in milliseconds */
  interval: number;
  /** Health check timeout in milliseconds */
  timeout: number;
  /** Maximum number of retries before considering failure */
  retries: number;
}

/**
 * Auto-restart configuration
 */
export interface AutoRestartConfig {
  /** Enable automatic restart on failure */
  enabled: boolean;
  /** Maximum number of restart attempts */
  maxRetries: number;
  /** Delay between restart attempts in milliseconds */
  delay: number;
  /** Use exponential backoff for delays */
  exponentialBackoff?: boolean;
  /** Maximum delay cap for exponential backoff */
  maxDelay?: number;
}

/**
 * Performance monitoring configuration
 */
export interface PerformanceConfig {
  /** Enable performance monitoring */
  monitoring: boolean;
  /** Metrics collection interval in milliseconds */
  metricsInterval: number;
  /** Log level for daemon operations */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  /** Enable memory usage tracking */
  memoryTracking?: boolean;
  /** Enable CPU usage tracking */
  cpuTracking?: boolean;
  /** Enable disk usage tracking */
  diskTracking?: boolean;
}

/**
 * Main daemon configuration interface
 */
export interface DaemonConfig {
  /** Enable daemon mode */
  enabled: boolean;
  /** Optional port for daemon communication (if needed) */
  port?: number;
  /** Path to PID file for process tracking */
  pidFile?: string;
  /** Health check configuration */
  healthCheck: HealthCheckConfig;
  /** Auto-restart configuration */
  autoRestart: AutoRestartConfig;
  /** Performance monitoring configuration */
  performance: PerformanceConfig;
  /** Graceful shutdown timeout in milliseconds */
  shutdownTimeout?: number;
  /** Signal to use for graceful shutdown (Unix only) */
  shutdownSignal?: 'SIGTERM' | 'SIGINT' | 'SIGQUIT';
  /** Signal to use for configuration reload (Unix only) */
  reloadSignal?: 'SIGHUP' | 'SIGUSR1' | 'SIGUSR2';
}

/**
 * Default daemon configuration with sensible defaults
 */
export const DEFAULT_DAEMON_CONFIG: DaemonConfig = {
  enabled: false, // Disabled by default for safety
  // port and pidFile are optional and undefined by default
  healthCheck: {
    enabled: true,
    interval: 30000, // 30 seconds
    timeout: 5000,   // 5 seconds
    retries: 3
  },
  autoRestart: {
    enabled: true,
    maxRetries: 5,
    delay: 1000,     // 1 second
    exponentialBackoff: true,
    maxDelay: 30000  // 30 seconds max
  },
  performance: {
    monitoring: true,
    metricsInterval: 60000, // 1 minute
    logLevel: 'info',
    memoryTracking: true,
    cpuTracking: true,
    diskTracking: false  // Disabled by default as it can be expensive
  },
  shutdownTimeout: 10000,    // 10 seconds
  shutdownSignal: 'SIGTERM', // Standard graceful shutdown
  reloadSignal: 'SIGHUP'     // Standard configuration reload
};

/**
 * Validation rules for daemon configuration
 */
export interface DaemonConfigValidation {
  /** Port must be in valid range if specified */
  portRange: { min: number; max: number };
  /** Health check interval must be reasonable */
  healthCheckIntervalRange: { min: number; max: number };
  /** Health check timeout must be less than interval */
  healthCheckTimeoutMax: (interval: number) => number;
  /** Auto-restart delay must be reasonable */
  autoRestartDelayRange: { min: number; max: number };
  /** Performance metrics interval must be reasonable */
  metricsIntervalRange: { min: number; max: number };
  /** Shutdown timeout must be reasonable */
  shutdownTimeoutRange: { min: number; max: number };
}

/**
 * Default validation rules
 */
export const DEFAULT_DAEMON_VALIDATION: DaemonConfigValidation = {
  portRange: { min: 1024, max: 65535 }, // Non-privileged ports only
  healthCheckIntervalRange: { min: 5000, max: 300000 }, // 5 seconds to 5 minutes
  healthCheckTimeoutMax: (interval) => Math.floor(interval * 0.8), // 80% of interval
  autoRestartDelayRange: { min: 100, max: 60000 }, // 100ms to 1 minute
  metricsIntervalRange: { min: 1000, max: 600000 }, // 1 second to 10 minutes
  shutdownTimeoutRange: { min: 1000, max: 60000 } // 1 second to 1 minute
};

/**
 * Platform-specific daemon configuration
 */
export interface PlatformDaemonConfig {
  /** Windows-specific settings */
  windows?: {
    /** Service name for Windows service registration */
    serviceName?: string;
    /** Service display name */
    serviceDisplayName?: string;
    /** Service description */
    serviceDescription?: string;
  };
  /** Unix-specific settings */
  unix?: {
    /** User to run daemon as */
    user?: string;
    /** Group to run daemon as */
    group?: string;
    /** Working directory */
    workingDirectory?: string;
    /** Environment variables */
    environment?: Record<string, string>;
  };
}

/**
 * Extended daemon configuration with platform-specific options
 */
export interface ExtendedDaemonConfig extends DaemonConfig {
  /** Platform-specific configuration */
  platform?: PlatformDaemonConfig;
}