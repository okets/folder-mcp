/**
 * Monitoring Application Module
 * 
 * This module orchestrates monitoring workflows,
 * including file watching, health checking, and system monitoring.
 */

// Application workflow interfaces
export interface MonitoringWorkflow {
  startFileWatching(folderPath: string, options: WatchingOptions): Promise<WatchingResult>;
  stopFileWatching(folderPath: string): Promise<void>;
  getWatchingStatus(folderPath: string): Promise<WatchingStatus>;
  getSystemHealth(): Promise<SystemHealthResult>;
}

export interface HealthMonitoring {
  checkIndexHealth(): Promise<IndexHealthResult>;
  checkPerformanceMetrics(): Promise<PerformanceHealthResult>;
  checkResourceUsage(): Promise<ResourceHealthResult>;
  generateHealthReport(): Promise<HealthReport>;
}

// Application types
export interface WatchingOptions {
  includeFileTypes?: string[];
  excludePatterns?: string[];
  debounceMs?: number;
  enableBatchProcessing?: boolean;
  batchSize?: number;
  batchTimeoutMs?: number;
}

export interface WatchingResult {
  success: boolean;
  watchId: string;
  folderPath: string;
  startedAt: Date;
  options: WatchingOptions;
  error?: string;
}

export interface WatchingStatus {
  isActive: boolean;
  watchId?: string;
  folderPath: string;
  startedAt?: Date;
  eventsProcessed: number;
  lastEventAt?: Date;
  queuedEvents: number;
  errors: WatchingError[];
}

export interface WatchingError {
  timestamp: Date;
  filePath: string;
  error: string;
  eventType: FileWatchEvent['type'];
  recovered: boolean;
}

export interface FileWatchEvent {
  type: 'added' | 'modified' | 'deleted' | 'renamed';
  filePath: string;
  previousPath?: string; // for rename events
  timestamp: Date;
  metadata?: FileWatchMetadata;
}

export interface FileWatchMetadata {
  size: number;
  lastModified: Date;
  isDirectory: boolean;
  permissions?: string;
}

export interface SystemHealthResult {
  overall: HealthStatus;
  components: ComponentHealth[];
  timestamp: Date;
  uptime: number;
  version: string;
}

export interface IndexHealthResult {
  status: HealthStatus;
  totalFiles: number;
  indexedFiles: number;
  outdatedFiles: number;
  corruptedEntries: number;
  lastIndexUpdate: Date;
  indexSize: number; // in bytes
  issues: IndexIssue[];
}

export interface PerformanceHealthResult {
  status: HealthStatus;
  metrics: {
    averageSearchTime: number;
    averageIndexingTime: number;
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
  };
  thresholds: PerformanceThresholds;
  trends: PerformanceTrend[];
}

export interface ResourceHealthResult {
  status: HealthStatus;
  memory: ResourceMetric;
  disk: ResourceMetric;
  cpu: ResourceMetric;
  network?: ResourceMetric;
}

export interface HealthReport {
  generatedAt: Date;
  summary: HealthSummary;
  details: {
    index: IndexHealthResult;
    performance: PerformanceHealthResult;
    resources: ResourceHealthResult;
    watching: WatchingHealthResult;
  };
  recommendations: HealthRecommendation[];
}

export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

export interface ComponentHealth {
  component: string;
  status: HealthStatus;
  message: string;
  lastChecked: Date;
  details?: Record<string, any>;
}

export interface IndexIssue {
  type: 'outdated' | 'corrupted' | 'missing' | 'orphaned';
  filePath: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  autoFixable: boolean;
}

export interface PerformanceThresholds {
  maxSearchTime: number;
  maxMemoryUsage: number;
  maxCpuUsage: number;
  maxDiskUsage: number;
}

export interface PerformanceTrend {
  metric: string;
  direction: 'improving' | 'stable' | 'degrading';
  change: number; // percentage change
  period: string; // e.g., "24h", "7d"
}

export interface ResourceMetric {
  current: number;
  maximum: number;
  percentage: number;
  unit: string;
  trend?: 'up' | 'down' | 'stable';
}

export interface WatchingHealthResult {
  status: HealthStatus;
  activeWatchers: number;
  totalEventsProcessed: number;
  errorRate: number;
  averageProcessingTime: number;
  queueBacklog: number;
}

export interface HealthSummary {
  overallStatus: HealthStatus;
  criticalIssues: number;
  warnings: number;
  healthScore: number; // 0-100
  primaryConcerns: string[];
}

export interface HealthRecommendation {
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'performance' | 'reliability' | 'capacity' | 'security';
  title: string;
  description: string;
  action: string;
  automated: boolean;
}

// Application implementations
export { MonitoringOrchestrator } from './orchestrator.js';
export { HealthMonitoringService } from './health.js';

// Multi-folder monitoring
export * from './multi-folder-monitoring.js';
