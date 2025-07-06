/**
 * CLI command for daemon management
 * 
 * Provides daemon lifecycle management commands with proper DI integration
 * and module boundary respect.
 */

import { Command } from 'commander';
import { BaseCommand } from './base-command.js';
import { SERVICE_TOKENS, ILoggingService } from '../../../di/interfaces.js';
import { DependencyContainer } from '../../../di/container.js';
import { 
  IDaemonService, 
  IProcessManager, 
  IHealthMonitor, 
  IPerformanceMonitor,
  ProcessStatus,
  PerformanceMetrics,
  HealthStatus
} from '../../../domain/daemon/interfaces.js';
import { DaemonConfig } from '../../../config/schema/daemon.js';

export class DaemonCommand extends BaseCommand {
  constructor() {
    super('daemon');
    this
      .description('Manage daemon lifecycle and monitoring')
      .argument('<action>', 'Action to perform: start, stop, restart, status, reload');

    // Add subcommands
    this.addCommand(this.createStartCommand());
    this.addCommand(this.createStopCommand());
    this.addCommand(this.createRestartCommand());
    this.addCommand(this.createStatusCommand());
    this.addCommand(this.createReloadCommand());
    this.addGlobalOptionsAfterInit();
  }

  /**
   * Create start subcommand
   */
  private createStartCommand(): Command {
    const startCommand = new Command('start');
    startCommand
      .description('Start the daemon process')
      .requiredOption('-f, --folder <path>', 'Target folder path')
      .option('--port <number>', 'Override daemon port', parseInt)
      .option('--pid-file <path>', 'Override PID file location')
      .option('--no-health-check', 'Disable health monitoring')
      .option('--no-performance', 'Disable performance monitoring')
      .option('--log-level <level>', 'Log level', 'info')
      .action(async (options: any) => {
        await this.executeStart(options);
      });

    return startCommand;
  }

  /**
   * Create stop subcommand
   */
  private createStopCommand(): Command {
    const stopCommand = new Command('stop');
    stopCommand
      .description('Stop the daemon process')
      .requiredOption('-f, --folder <path>', 'Target folder path')
      .option('--timeout <ms>', 'Shutdown timeout in milliseconds', parseInt)
      .option('--force', 'Force stop without graceful shutdown')
      .option('--log-level <level>', 'Log level', 'info')
      .action(async (options: any) => {
        await this.executeStop(options);
      });

    return stopCommand;
  }

  /**
   * Create restart subcommand
   */
  private createRestartCommand(): Command {
    const restartCommand = new Command('restart');
    restartCommand
      .description('Restart the daemon process')
      .requiredOption('-f, --folder <path>', 'Target folder path')
      .option('--timeout <ms>', 'Shutdown timeout in milliseconds', parseInt)
      .option('--log-level <level>', 'Log level', 'info')
      .action(async (options: any) => {
        await this.executeRestart(options);
      });

    return restartCommand;
  }

  /**
   * Create status subcommand
   */
  private createStatusCommand(): Command {
    const statusCommand = new Command('status');
    statusCommand
      .description('Show daemon status and metrics')
      .requiredOption('-f, --folder <path>', 'Target folder path')
      .option('--format <format>', 'Output format (table, json)', 'table')
      .option('--health', 'Include health check results')
      .option('--performance', 'Include performance metrics')
      .option('--log-level <level>', 'Log level', 'info')
      .action(async (options: any) => {
        await this.executeStatus(options);
      });

    return statusCommand;
  }

  /**
   * Create reload subcommand
   */
  private createReloadCommand(): Command {
    const reloadCommand = new Command('reload');
    reloadCommand
      .description('Reload daemon configuration')
      .requiredOption('-f, --folder <path>', 'Target folder path')
      .option('--log-level <level>', 'Log level', 'info')
      .action(async (options: any) => {
        await this.executeReload(options);
      });

    return reloadCommand;
  }

  /**
   * Execute start command
   */
  private async executeStart(options: any): Promise<void> {
    const logger = this.resolveService<ILoggingService>(options.folder, SERVICE_TOKENS.LOGGING, options.logLevel);
    
    try {
      logger.info('🚀 Starting daemon...');

      // Get daemon service with manual DI setup for daemon
      const daemonService = await this.getDaemonService(options.folder, options.logLevel);
      
      if (daemonService.isRunning()) {
        logger.warn('⚠️  Daemon is already running');
        const status = daemonService.getStatus();
        console.log(`Daemon running with PID: ${status.pid}`);
        return;
      }

      // Apply daemon-specific configuration overrides
      await this.applyDaemonConfigurationOverrides(options);

      // Start the daemon
      await daemonService.start();
      
      const status = daemonService.getStatus();
      logger.info(`✅ Daemon started successfully with PID: ${status.pid}`);
      
      // Show status summary
      this.displayStartSummary(status, options);

    } catch (error) {
      logger.error('❌ Failed to start daemon:', error as Error);
      process.exit(1);
    }
  }

  /**
   * Execute stop command
   */
  private async executeStop(options: any): Promise<void> {
    const logger = this.resolveService<ILoggingService>(options.folder, SERVICE_TOKENS.LOGGING, options.logLevel);
    
    try {
      logger.info('🛑 Stopping daemon...');

      const daemonService = await this.getDaemonService(options.folder, options.logLevel);
      
      if (!daemonService.isRunning()) {
        logger.warn('⚠️  Daemon is not running');
        return;
      }

      const beforeStatus = daemonService.getStatus();
      logger.info(`Stopping daemon with PID: ${beforeStatus.pid}`);

      if (options.force) {
        // Force stop through process manager
        const processManager = await this.getProcessManager(options.folder, options.logLevel);
        await processManager.killProcess();
        logger.info('💥 Daemon force stopped');
      } else {
        // Graceful stop
        await daemonService.stop();
        logger.info('✅ Daemon stopped gracefully');
      }

    } catch (error) {
      logger.error('❌ Failed to stop daemon:', error as Error);
      process.exit(1);
    }
  }

  /**
   * Execute restart command
   */
  private async executeRestart(options: any): Promise<void> {
    const logger = this.resolveService<ILoggingService>(options.folder, SERVICE_TOKENS.LOGGING, options.logLevel);
    
    try {
      logger.info('🔄 Restarting daemon...');

      const daemonService = await this.getDaemonService(options.folder, options.logLevel);
      
      await daemonService.restart();
      
      const status = daemonService.getStatus();
      logger.info(`✅ Daemon restarted with PID: ${status.pid}, restart count: ${status.restartCount}`);
      
      this.displayStartSummary(status, options);

    } catch (error) {
      logger.error('❌ Failed to restart daemon:', error as Error);
      process.exit(1);
    }
  }

  /**
   * Execute status command
   */
  private async executeStatus(options: any): Promise<void> {
    const logger = this.resolveService<ILoggingService>(options.folder, SERVICE_TOKENS.LOGGING, options.logLevel);
    
    try {
      const daemonService = await this.getDaemonService(options.folder, options.logLevel);
      const processManager = this.resolveService<IProcessManager>(options.folder, SERVICE_TOKENS.PROCESS_MANAGER, options.logLevel);
      
      const status = daemonService.getStatus();
      const processStatus = processManager.getProcessStatus();

      let healthStatus: HealthStatus | null = null;
      let performanceMetrics: PerformanceMetrics | null = null;

      // Get health status if requested
      if (options.health) {
        try {
          const healthMonitor = this.resolveService<IHealthMonitor>(options.folder, SERVICE_TOKENS.HEALTH_MONITOR, options.logLevel);
          healthStatus = healthMonitor.getHealthStatus();
        } catch (error) {
          logger.warn('Could not retrieve health status:', error as Error);
        }
      }

      // Get performance metrics if requested
      if (options.performance) {
        try {
          const performanceMonitor = this.resolveService<IPerformanceMonitor>(options.folder, SERVICE_TOKENS.PERFORMANCE_MONITOR, options.logLevel);
          performanceMetrics = performanceMonitor.getMetrics();
        } catch (error) {
          logger.warn('Could not retrieve performance metrics:', error as Error);
        }
      }

      const fullStatus = {
        daemon: status,
        process: processStatus,
        health: healthStatus,
        performance: performanceMetrics,
        timestamp: new Date().toISOString()
      };

      if (options.format === 'json') {
        console.log(JSON.stringify(fullStatus, null, 2));
      } else {
        this.displayTableStatus(fullStatus, options);
      }

    } catch (error) {
      logger.error('❌ Failed to get daemon status:', error as Error);
      process.exit(1);
    }
  }

  /**
   * Execute reload command
   */
  private async executeReload(options: any): Promise<void> {
    const logger = this.resolveService<ILoggingService>(options.folder, SERVICE_TOKENS.LOGGING, options.logLevel);
    
    try {
      logger.info('🔄 Reloading daemon configuration...');

      const daemonService = await this.getDaemonService(options.folder, options.logLevel);
      
      if (!daemonService.isRunning()) {
        logger.warn('⚠️  Daemon is not running');
        return;
      }

      await daemonService.reload();
      
      logger.info('✅ Configuration reloaded successfully');

    } catch (error) {
      logger.error('❌ Failed to reload configuration:', error as Error);
      process.exit(1);
    }
  }

  /**
   * Apply daemon-specific configuration overrides from CLI options
   */
  private async applyDaemonConfigurationOverrides(options: any): Promise<void> {
    // This would integrate with the configuration system to apply CLI overrides
    // For now, we'll document the intended behavior
    
    const overrides: Partial<DaemonConfig> = {};
    
    if (options.port) {
      overrides.port = options.port;
    }
    
    if (options.pidFile) {
      overrides.pidFile = options.pidFile;
    }
    
    if (options.healthCheck === false) {
      overrides.healthCheck = { 
        enabled: false,
        interval: 30000,
        timeout: 5000,
        retries: 3
      };
    }
    
    if (options.performance === false) {
      overrides.performance = { 
        monitoring: false,
        metricsInterval: 60000,
        logLevel: 'info' as const,
        memoryTracking: true,
        cpuTracking: true,
        diskTracking: false
      };
    }

    // TODO: Apply overrides through configuration system
    // This would require extending the configuration system to support runtime overrides
    if (Object.keys(overrides).length > 0) {
      console.log('Configuration overrides (not yet implemented):', overrides);
    }
  }

  /**
   * Display start summary
   */
  private displayStartSummary(status: ProcessStatus, options: any): void {
    console.log('\n📊 Daemon Start Summary:');
    console.log('─'.repeat(40));
    console.log(`PID: ${status.pid}`);
    console.log(`Status: ${status.status}`);
    console.log(`Uptime: ${Math.round(status.uptime / 1000)}s`);
    if (status.restartCount > 0) {
      console.log(`Restart Count: ${status.restartCount}`);
    }
    console.log(`Folder: ${options.folder}`);
    
    if (options.port) {
      console.log(`Port: ${options.port}`);
    }
  }

  /**
   * Display table status
   */
  private displayTableStatus(status: any, options: any): void {
    console.log('\n📊 Daemon Status Report:');
    console.log('═'.repeat(50));
    
    // Basic daemon status
    console.log('\n🔧 Daemon Information:');
    console.log('─'.repeat(30));
    console.log(`Status: ${status.daemon.status}`);
    console.log(`PID: ${status.daemon.pid || 'N/A'}`);
    console.log(`Uptime: ${status.daemon.uptime ? Math.round(status.daemon.uptime / 1000) + 's' : 'N/A'}`);
    console.log(`Restart Count: ${status.daemon.restartCount || 0}`);
    
    if (status.daemon.lastError) {
      console.log(`Last Error: ${status.daemon.lastError}`);
    }

    // Process information
    console.log('\n⚙️  Process Information:');
    console.log('─'.repeat(30));
    console.log(`Process PID: ${status.process.pid || 'N/A'}`);
    console.log(`Process Status: ${status.process.status}`);
    console.log(`Start Time: ${status.process.startTime ? new Date(status.process.startTime).toLocaleString() : 'N/A'}`);
    
    // Health status
    if (status.health) {
      console.log('\n🏥 Health Status:');
      console.log('─'.repeat(30));
      console.log(`Overall Health: ${status.health.healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
      console.log(`Last Check: ${new Date(status.health.lastCheck).toLocaleString()}`);
      console.log(`Consecutive Failures: ${status.health.consecutiveFailures}`);
      console.log(`Recent Checks: ${status.health.recentChecks.length}`);
    }

    // Performance metrics
    if (status.performance) {
      console.log('\n📈 Performance Metrics:');
      console.log('─'.repeat(30));
      console.log(`CPU Usage: ${status.performance.cpu.toFixed(1)}%`);
      console.log(`Memory RSS: ${Math.round(status.performance.memory.rss / 1024 / 1024)}MB`);
      console.log(`Memory Heap: ${Math.round(status.performance.memory.heapUsed / 1024 / 1024)}MB`);
      console.log(`Uptime: ${Math.round(status.performance.uptime / 1000)}s`);
      
      if (Object.keys(status.performance.customMetrics).length > 0) {
        console.log('\n📊 Custom Metrics:');
        for (const [name, value] of Object.entries(status.performance.customMetrics)) {
          console.log(`  ${name}: ${value}`);
        }
      }
    }

    console.log(`\n🕒 Report generated: ${new Date(status.timestamp).toLocaleString()}`);
  }

  /**
   * Cached daemon container to avoid re-registration
   */
  private _daemonContainer?: DependencyContainer;

  /**
   * Get or create daemon container with proper DI setup (respecting module boundaries)
   */
  private async getDaemonContainer(folderPath: string, logLevel: string = 'info'): Promise<DependencyContainer> {
    if (!this._daemonContainer) {
      // Create base container through interface layer (proper boundary)
      this._daemonContainer = this.getContainer(folderPath, logLevel as any);
      
      // Register daemon services ONCE through domain boundary
      const { registerDaemonServices } = await import('../../../domain/daemon/di-setup.js');
      registerDaemonServices(this._daemonContainer, folderPath, { logLevel: logLevel as any });
    }
    
    return this._daemonContainer;
  }

  /**
   * Get daemon service with proper DI setup
   */
  private async getDaemonService(folderPath: string, logLevel: string = 'info'): Promise<IDaemonService> {
    const container = await this.getDaemonContainer(folderPath, logLevel);
    const daemonService = container.resolve(SERVICE_TOKENS.DAEMON_SERVICE) as IDaemonService;
    
    if (!daemonService) {
      throw new Error('Failed to create daemon service');
    }
    
    return daemonService;
  }

  /**
   * Get process manager service
   */
  private async getProcessManager(folderPath: string, logLevel: string = 'info'): Promise<IProcessManager> {
    const container = await this.getDaemonContainer(folderPath, logLevel);
    const processManager = container.resolve(SERVICE_TOKENS.PROCESS_MANAGER) as IProcessManager;
    
    if (!processManager) {
      throw new Error('Failed to create process manager service');
    }
    
    return processManager;
  }

  /**
   * Get health monitor service
   */
  private async getHealthMonitor(folderPath: string, logLevel: string = 'info'): Promise<IHealthMonitor> {
    const container = await this.getDaemonContainer(folderPath, logLevel);
    const healthMonitor = container.resolve(SERVICE_TOKENS.HEALTH_MONITOR) as IHealthMonitor;
    
    if (!healthMonitor) {
      throw new Error('Failed to create health monitor service');
    }
    
    return healthMonitor;
  }

  /**
   * Get performance monitor service
   */
  private async getPerformanceMonitor(folderPath: string, logLevel: string = 'info'): Promise<IPerformanceMonitor> {
    const container = await this.getDaemonContainer(folderPath, logLevel);
    const performanceMonitor = container.resolve(SERVICE_TOKENS.PERFORMANCE_MONITOR) as IPerformanceMonitor;
    
    if (!performanceMonitor) {
      throw new Error('Failed to create performance monitor service');
    }
    
    return performanceMonitor;
  }
}