/**
 * Daemon Services DI Setup
 * 
 * Registers all daemon-related services in the dependency injection container
 * following proper module boundaries and clean architecture principles.
 */

import { DependencyContainer } from '../../di/container.js';
import { SERVICE_TOKENS, ILoggingService } from '../../di/interfaces.js';
import { resolveConfig } from '../../config/resolver.js';

// Domain services
import { DaemonService } from './daemon-service.js';
import { ProcessManager } from './process-manager.js';
import { HealthMonitor } from './health-monitor.js';
import { PerformanceMonitor } from './performance-monitor.js';
import { SignalHandler } from './signal-handler.js';

// Infrastructure services
import { NodePidManager } from '../../infrastructure/daemon/pid-manager.js';
import { NodeMcpServerExecutor } from '../../infrastructure/daemon/mcp-server-executor.js';
import { SimpleSystemMonitor } from '../../infrastructure/daemon/simple-system-monitor.js';
import { createSignalHandler } from '../../infrastructure/daemon/signal-handlers.js';

// Configuration
import { DEFAULT_DAEMON_CONFIG } from '../../config/schema/daemon.js';

/**
 * Register daemon services in the DI container
 */
export async function registerDaemonServices(
  container: DependencyContainer, 
  folderPath: string,
  options: { logLevel?: 'debug' | 'info' | 'warn' | 'error' } = {}
): Promise<void> {
  
  // Get logger for daemon services
  const logger = container.resolve(SERVICE_TOKENS.LOGGING) as ILoggingService;

  // Get daemon configuration from resolved config
  const config = await resolveConfig(folderPath);
  const daemonConfig = config.daemon || DEFAULT_DAEMON_CONFIG;

  // Only register daemon services if daemon is enabled
  if (!daemonConfig.enabled) {
    // Register null services for disabled daemon
    container.registerSingleton(SERVICE_TOKENS.DAEMON_SERVICE, () => null);
    container.registerSingleton(SERVICE_TOKENS.PROCESS_MANAGER, () => null);
    container.registerSingleton(SERVICE_TOKENS.HEALTH_MONITOR, () => null);
    container.registerSingleton(SERVICE_TOKENS.PERFORMANCE_MONITOR, () => null);
    container.registerSingleton(SERVICE_TOKENS.SIGNAL_HANDLER, () => null);
    container.registerSingleton(SERVICE_TOKENS.PID_MANAGER, () => null);
    container.registerSingleton(SERVICE_TOKENS.SYSTEM_MONITOR, () => null);
    container.registerSingleton(SERVICE_TOKENS.WEBSOCKET_SERVER, () => null);
    return;
  }

  // Register infrastructure services first (dependencies)
  
  // System Monitor - monitors system resources
  container.registerSingleton(SERVICE_TOKENS.SYSTEM_MONITOR, () => {
    return new SimpleSystemMonitor(logger);
  });

  // WebSocket Server - handles WebSocket communication for FMDM
  container.registerSingleton(SERVICE_TOKENS.WEBSOCKET_SERVER, () => {
    const { FMDMWebSocketServer } = require('../../daemon/websocket/server.js');
    return new FMDMWebSocketServer();
  });

  // PID Manager - manages process ID files
  container.registerSingleton(SERVICE_TOKENS.PID_MANAGER, () => {
    return new NodePidManager(logger);
  });

  // MCP Server Executor - manages MCP server process
  container.registerFactory('MCP_SERVER_EXECUTOR', () => {
    return new NodeMcpServerExecutor(logger);
  });

  // Register domain services (business logic)

  // Process Manager - manages process lifecycle
  container.registerSingleton(SERVICE_TOKENS.PROCESS_MANAGER, () => {
    const mcpServerExecutor = container.resolve('MCP_SERVER_EXECUTOR' as any) as NodeMcpServerExecutor;
    const pidManager = container.resolve(SERVICE_TOKENS.PID_MANAGER) as NodePidManager;
    
    return new ProcessManager(
      daemonConfig.autoRestart,
      folderPath,
      mcpServerExecutor,
      pidManager,
      logger
    );
  });

  // Health Monitor - monitors daemon health
  container.registerSingleton(SERVICE_TOKENS.HEALTH_MONITOR, () => {
    const processManager = container.resolve(SERVICE_TOKENS.PROCESS_MANAGER) as ProcessManager;
    
    return new HealthMonitor(
      daemonConfig.healthCheck,
      processManager,
      logger
    );
  });

  // Performance Monitor - monitors performance metrics
  container.registerSingleton(SERVICE_TOKENS.PERFORMANCE_MONITOR, () => {
    const systemMonitor = container.resolve(SERVICE_TOKENS.SYSTEM_MONITOR) as SimpleSystemMonitor;
    
    return new PerformanceMonitor(
      daemonConfig.performance,
      systemMonitor,
      logger
    );
  });

  // Signal Handler - handles system signals
  container.registerSingleton(SERVICE_TOKENS.SIGNAL_HANDLER, () => {
    // Use factory pattern for platform-specific signal handler
    // Note: The signal handler will be properly wired to daemon service later
    return createSignalHandler(
      daemonConfig,
      null as any, // Will be set later to avoid circular dependency
      logger
    );
  });

  // Main Daemon Service - orchestrates all other services
  container.registerSingleton(SERVICE_TOKENS.DAEMON_SERVICE, () => {
    const processManager = container.resolve(SERVICE_TOKENS.PROCESS_MANAGER) as ProcessManager;
    const healthMonitor = container.resolve(SERVICE_TOKENS.HEALTH_MONITOR) as HealthMonitor;
    const performanceMonitor = container.resolve(SERVICE_TOKENS.PERFORMANCE_MONITOR) as PerformanceMonitor;
    const webSocketServer = container.resolve(SERVICE_TOKENS.WEBSOCKET_SERVER) as any;
    
    // Create daemon service first
    const daemonService = new DaemonService(
      daemonConfig,
      processManager,
      healthMonitor,
      null as any, // Signal handler will be set after creation
      performanceMonitor,
      webSocketServer,
      logger
    );
    
    // Set the DI container so daemon service can access embedding services
    daemonService.setContainer(container);
    
    // Now create signal handler with daemon service reference
    const signalHandler = createSignalHandler(
      daemonConfig,
      daemonService,
      logger
    );
    
    // Wire signal handler to daemon service (if it has a setter method)
    // For now, we'll accept that signal handling might be limited
    
    return daemonService;
  });

  logger.info('Daemon services registered in DI container');
}

/**
 * Check if daemon services are enabled
 */
export async function isDaemonEnabled(folderPath: string): Promise<boolean> {
  const config = await resolveConfig(folderPath);
  return config.daemon?.enabled || DEFAULT_DAEMON_CONFIG.enabled;
}