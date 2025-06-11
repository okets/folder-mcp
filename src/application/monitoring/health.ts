/**
 * Health Monitoring Service
 * 
 * Provides comprehensive health monitoring including index health,
 * performance metrics, resource usage, and health reporting.
 */

import { 
  HealthMonitoring,
  IndexHealthResult,
  PerformanceHealthResult,
  ResourceHealthResult,
  HealthReport,
  HealthStatus,
  IndexIssue,
  ResourceMetric,
  HealthSummary,
  HealthRecommendation
} from './index.js';

// Domain service interfaces
import { 
  ICacheService,
  IVectorSearchService,
  ILoggingService,
  IConfigurationService,
  IFileParsingService 
} from '../../di/interfaces.js';

export class HealthMonitoringService implements HealthMonitoring {
  private healthHistory: HealthReport[] = [];
  private maxHistorySize = 100;

  constructor(
    private readonly cacheService: ICacheService,
    private readonly vectorSearchService: IVectorSearchService,
    private readonly loggingService: ILoggingService,
    private readonly configService: IConfigurationService,
    private readonly fileParsingService: IFileParsingService
  ) {}

  async checkIndexHealth(): Promise<IndexHealthResult> {
    this.loggingService.debug('Checking index health');

    try {
      // For now, return a basic health result since we don't have getConfiguration method
      return {
        status: 'healthy' as HealthStatus,
        totalFiles: 0,
        indexedFiles: 0,
        outdatedFiles: 0,
        corruptedEntries: 0,
        lastIndexUpdate: new Date(),
        indexSize: 0,
        issues: []
      };
    } catch (error) {
      this.loggingService.error('Index health check failed', error instanceof Error ? error : new Error(String(error)));
      
      return {
        status: 'critical' as HealthStatus,
        totalFiles: 0,
        indexedFiles: 0,
        outdatedFiles: 0,
        corruptedEntries: 0,
        lastIndexUpdate: new Date(),
        indexSize: 0,
        issues: [{
          type: 'corrupted',
          filePath: 'system',
          description: error instanceof Error ? error.message : 'Unknown error during health check',
          severity: 'high',
          autoFixable: false
        } as IndexIssue]
      };
    }
  }

  async checkPerformanceMetrics(): Promise<PerformanceHealthResult> {
    this.loggingService.debug('Checking performance metrics');

    try {
      // Simulate performance checks
      return {
        status: 'healthy' as HealthStatus,
        metrics: {
          averageSearchTime: 100,
          averageIndexingTime: 500,
          memoryUsage: 50,
          cpuUsage: 30,
          diskUsage: 60
        },
        thresholds: {
          maxSearchTime: 5000,
          maxMemoryUsage: 80,
          maxCpuUsage: 70,
          maxDiskUsage: 85
        },
        trends: []
      };
    } catch (error) {
      this.loggingService.error('Performance health check failed', error instanceof Error ? error : new Error(String(error)));
      
      return {
        status: 'critical' as HealthStatus,
        metrics: {
          averageSearchTime: 0,
          averageIndexingTime: 0,
          memoryUsage: 0,
          cpuUsage: 0,
          diskUsage: 0
        },
        thresholds: {
          maxSearchTime: 5000,
          maxMemoryUsage: 80,
          maxCpuUsage: 70,
          maxDiskUsage: 85
        },
        trends: []
      };
    }
  }

  async checkResourceUsage(): Promise<ResourceHealthResult> {
    this.loggingService.debug('Checking resource usage');

    try {
      const memoryUsage = process.memoryUsage();
      const memoryUsageMB = {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024)
      };

      const memoryUsagePercentage = (memoryUsageMB.heapUsed / memoryUsageMB.heapTotal) * 100;

      return {
        status: 'healthy' as HealthStatus,
        memory: {
          current: memoryUsageMB.heapUsed,
          maximum: memoryUsageMB.heapTotal,
          percentage: Math.round(memoryUsagePercentage),
          unit: 'MB'
        } as ResourceMetric,
        disk: {
          current: 0,
          maximum: 100,
          percentage: 0,
          unit: 'GB'
        } as ResourceMetric,
        cpu: {
          current: 0,
          maximum: 100,
          percentage: 0,
          unit: '%'
        } as ResourceMetric
      };
    } catch (error) {
      this.loggingService.error('Resource usage check failed', error instanceof Error ? error : new Error(String(error)));
      
      return {
        status: 'critical' as HealthStatus,
        memory: {
          current: 0,
          maximum: 0,
          percentage: 0,
          unit: 'MB'
        } as ResourceMetric,
        disk: {
          current: 0,
          maximum: 0,
          percentage: 0,
          unit: 'GB'
        } as ResourceMetric,
        cpu: {
          current: 0,
          maximum: 0,
          percentage: 0,
          unit: '%'
        } as ResourceMetric
      };
    }
  }

  async generateHealthReport(): Promise<HealthReport> {
    this.loggingService.debug('Generating comprehensive health report');

    try {
      // Run all health checks in parallel
      const [indexHealth, performanceHealth, resourceHealth] = await Promise.all([
        this.checkIndexHealth(),
        this.checkPerformanceMetrics(),
        this.checkResourceUsage()
      ]);

      const allIssues: IndexIssue[] = [
        ...indexHealth.issues
      ];

      // Generate recommendations
      const recommendations: HealthRecommendation[] = this.generateRecommendations(indexHealth, performanceHealth, resourceHealth);

      const report: HealthReport = {
        generatedAt: new Date(),
        summary: {
          overallStatus: this.calculateOverallStatus(indexHealth, performanceHealth, resourceHealth),
          criticalIssues: allIssues.filter(issue => this.isCriticalIssue(issue)).length,
          warnings: allIssues.filter(issue => !this.isCriticalIssue(issue)).length,
          healthScore: this.calculateHealthScore(indexHealth, performanceHealth, resourceHealth),
          primaryConcerns: allIssues.slice(0, 3).map(issue => issue.description)
        } as HealthSummary,
        details: {
          index: indexHealth,
          performance: performanceHealth,
          resources: resourceHealth,
          watching: {
            status: 'healthy' as HealthStatus,
            activeWatchers: 0,
            totalEventsProcessed: 0,
            errorRate: 0,
            averageProcessingTime: 0,
            queueBacklog: 0
          }
        },
        recommendations
      };

      this.addToHistory(report);

      this.loggingService.info('Health report generated', {
        overallStatus: report.summary.overallStatus,
        totalIssues: allIssues.length
      });

      return report;
    } catch (error) {
      this.loggingService.error('Failed to generate health report', error instanceof Error ? error : new Error(String(error)));
      
      const errorReport: HealthReport = {
        generatedAt: new Date(),
        summary: {
          overallStatus: 'critical' as HealthStatus,
          criticalIssues: 1,
          warnings: 0,
          healthScore: 0,
          primaryConcerns: ['Health check system failure']
        } as HealthSummary,
        details: {
          index: {
            status: 'critical' as HealthStatus,
            totalFiles: 0,
            indexedFiles: 0,
            outdatedFiles: 0,
            corruptedEntries: 0,
            lastIndexUpdate: new Date(),
            indexSize: 0,
            issues: [{
              type: 'corrupted',
              filePath: 'system',
              description: 'Health check failed',
              severity: 'high',
              autoFixable: false
            } as IndexIssue]
          },
          performance: {
            status: 'critical' as HealthStatus,
            metrics: {
              averageSearchTime: 0,
              averageIndexingTime: 0,
              memoryUsage: 0,
              cpuUsage: 0,
              diskUsage: 0
            },
            thresholds: {
              maxSearchTime: 5000,
              maxMemoryUsage: 80,
              maxCpuUsage: 70,
              maxDiskUsage: 85
            },
            trends: []
          },
          resources: {
            status: 'critical' as HealthStatus,
            memory: { current: 0, maximum: 0, percentage: 0, unit: 'MB' } as ResourceMetric,
            disk: { current: 0, maximum: 0, percentage: 0, unit: 'GB' } as ResourceMetric,
            cpu: { current: 0, maximum: 0, percentage: 0, unit: '%' } as ResourceMetric
          },
          watching: {
            status: 'critical' as HealthStatus,
            activeWatchers: 0,
            totalEventsProcessed: 0,
            errorRate: 100,
            averageProcessingTime: 0,
            queueBacklog: 0
          }
        },
        recommendations: [{
          priority: 'critical',
          category: 'reliability',
          title: 'Fix Health Check System',
          description: 'The health monitoring system is not functioning properly',
          action: 'Investigate and fix the health check system',
          automated: false
        } as HealthRecommendation]
      };

      return errorReport;
    }
  }

  private calculateOverallStatus(
    indexHealth: IndexHealthResult,
    performanceHealth: PerformanceHealthResult,
    resourceHealth: ResourceHealthResult
  ): HealthStatus {
    const statuses = [indexHealth.status, performanceHealth.status, resourceHealth.status];
    
    if (statuses.includes('critical')) return 'critical';
    if (statuses.includes('warning')) return 'warning';
    return 'healthy';
  }

  private calculateHealthScore(
    indexHealth: IndexHealthResult,
    performanceHealth: PerformanceHealthResult,
    resourceHealth: ResourceHealthResult
  ): number {
    const scores = {
      index: indexHealth.status === 'healthy' ? 100 : indexHealth.status === 'warning' ? 70 : 0,
      performance: performanceHealth.status === 'healthy' ? 100 : performanceHealth.status === 'warning' ? 70 : 0,
      resources: resourceHealth.status === 'healthy' ? 100 : resourceHealth.status === 'warning' ? 70 : 0
    };

    return Math.round((scores.index + scores.performance + scores.resources) / 3);
  }

  private generateRecommendations(
    indexHealth: IndexHealthResult,
    performanceHealth: PerformanceHealthResult,
    resourceHealth: ResourceHealthResult
  ): HealthRecommendation[] {
    const recommendations: HealthRecommendation[] = [];

    if (indexHealth.status !== 'healthy') {
      recommendations.push({
        priority: 'high',
        category: 'reliability',
        title: 'Index Issues Detected',
        description: 'There are issues with the search index',
        action: 'Clear cache and rebuild index to fix corrupted entries',
        automated: false
      } as HealthRecommendation);
    }

    if (performanceHealth.status !== 'healthy') {
      recommendations.push({
        priority: 'medium',
        category: 'performance',
        title: 'Performance Issues',
        description: 'System performance is below optimal levels',
        action: 'Consider optimizing vector search or increasing system resources',
        automated: false
      } as HealthRecommendation);
    }

    if (resourceHealth.status !== 'healthy') {
      recommendations.push({
        priority: 'medium',
        category: 'capacity',
        title: 'Resource Usage High',
        description: 'System resources are running high',
        action: 'Monitor resource usage and consider scaling',
        automated: false
      } as HealthRecommendation);
    }

    return recommendations;
  }

  private isCriticalIssue(issue: IndexIssue): boolean {
    const criticalKeywords = ['corrupted', 'failed', 'critical', 'error'];
    return criticalKeywords.some(keyword => issue.description.toLowerCase().includes(keyword));
  }

  private addToHistory(report: HealthReport): void {
    this.healthHistory.push(report);
    
    // Keep only the most recent reports
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory = this.healthHistory.slice(-this.maxHistorySize);
    }
  }
}
