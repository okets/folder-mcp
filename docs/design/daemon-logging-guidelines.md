# Daemon Logging Guidelines
**folder-mcp Logging Standards & Best Practices**

## Overview

This document establishes comprehensive logging standards for the folder-mcp daemon to ensure consistent, informative, and actionable log output. These guidelines are based on analysis of existing logging issues and operational requirements for production deployments.

## Core Principles

### 1. Signal Over Noise
- **Every log entry must provide actionable information**
- Avoid repetitive messages that don't add new information
- Use appropriate log levels to filter routine operations from exceptional events

### 2. Context is King  
- Include sufficient context to understand what happened and why
- Provide request correlation IDs for tracing complex operations
- Include relevant metadata (client ID, operation parameters, timing)

### 3. Operational Visibility
- Log user-facing operations that administrators need to monitor
- Include performance metrics for capacity planning
- Provide clear error messages with remediation guidance

### 4. Development Debugging
- Use DEBUG level for internal state transitions and protocol details
- Include sufficient detail at DEBUG level for troubleshooting without affecting production performance
- Maintain clear separation between operational logs and debug information

## Log Level Standards

### DEBUG Level
**Purpose**: Development troubleshooting and detailed system behavior analysis

**Use Cases:**
- Internal state transitions
- Protocol handshake details
- Cache hit/miss operations
- Low-level system operations
- Performance timing details

**Examples:**
```typescript
logger.debug('WebSocket connection established', {
  clientId: 'client-abc123',
  clientType: 'cli',
  remoteAddress: '127.0.0.1'
});

logger.debug('Model cache lookup', {
  model: 'gpu:all-MiniLM-L6-v2',
  cacheHit: true,
  lookupTime: 0.003
});
```

### INFO Level  
**Purpose**: Normal operations that administrators and users need visibility into

**Use Cases:**
- Folder lifecycle events (add, remove, indexing complete)
- Client connections and disconnections
- System startup/shutdown events
- Configuration changes
- Successful completion of significant operations

**Examples:**
```typescript
logger.info('Folder indexing completed', {
  requestId: 'req_1234567890',
  path: '/path/to/folder',
  totalFiles: 1247,
  duration: 145000, // milliseconds
  databaseSize: '15.2MB'
});

logger.info('Client connected', {
  clientId: 'client-abc123',
  clientType: 'tui',
  totalConnections: 3
});
```

### WARN Level
**Purpose**: Concerning conditions that don't prevent operation but may need attention

**Use Cases:**
- Performance degradation
- Resource constraints approaching limits
- Recoverable errors that may indicate problems
- Configuration issues with fallback behavior
- Temporary failures with retry capability

**Examples:**
```typescript
logger.warn('Indexing performance degraded', {
  averageFileTime: 2.5, // seconds per file
  expectedTime: 0.5,
  possibleCause: 'high system load',
  recommendation: 'Monitor system resources'
});

logger.warn('Model download required', {
  model: 'gpu:all-MiniLM-L6-v2',
  downloadSize: '400MB',
  estimatedTime: '2-5 minutes'
});
```

### ERROR Level
**Purpose**: Operation failures that require attention but don't crash the system

**Use Cases:**
- Failed folder operations
- Database connection issues
- Authentication failures
- Invalid configuration that prevents features from working
- Unrecoverable operation failures

**Examples:**
```typescript
logger.error('Folder indexing failed', {
  requestId: 'req_1234567890',
  path: '/path/to/folder',
  error: 'Database connection lost',
  filesProcessed: 450,
  totalFiles: 1247,
  retryScheduled: true
}, error);

logger.error('Invalid model configuration', {
  model: 'invalid-model-name',
  supportedModels: ['gpu:all-MiniLM-L6-v2'],
  action: 'falling back to default model'
});
```

### FATAL Level
**Purpose**: System-level failures that require daemon restart

**Use Cases:**
- Unrecoverable memory errors
- Critical resource exhaustion
- Database corruption
- Essential service failures

**Examples:**
```typescript
logger.fatal('Critical memory exhaustion', {
  heapUsed: 1200, // MB
  heapTotal: 1024,
  recommendation: 'Immediate restart required'
}, error);

logger.fatal('Database corruption detected', {
  databasePath: '/path/to/embeddings.db',
  corruptionType: 'index_integrity_failure',
  recoveryRequired: true
}, error);
```

## Request Correlation Patterns

### Request Lifecycle Tracking

All operations that span multiple components or significant time should use request correlation:

```typescript
class RequestLogger {
  startRequest(operation: string, clientId: string, params?: any): string {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info(`${operation} started`, {
      requestId,
      clientId,
      ...params
    });
    
    return requestId;
  }
  
  updateRequest(requestId: string, update: any): void {
    logger.info('Operation progress', {
      requestId,
      ...update
    });
  }
  
  completeRequest(requestId: string, outcome: any): void {
    logger.info('Operation completed', {
      requestId,
      success: outcome.success ?? true,
      duration: outcome.duration,
      ...outcome
    });
  }
}
```

### Multi-Step Operation Tracking

For complex operations involving multiple services:

```typescript
// Folder addition flow
const requestId = requestLogger.startRequest('folder.add', clientId, {
  path: folderPath,
  model: modelName
});

// Model validation step
logger.info('Model validation started', { requestId, model: modelName });
logger.info('Model validation completed', { 
  requestId, 
  modelAvailable: true,
  cacheStatus: 'cached'
});

// Indexing step
logger.info('Folder scanning started', { requestId, path: folderPath });
logger.info('Folder scanning completed', { 
  requestId, 
  filesFound: 1247,
  scanDuration: 2500
});

requestLogger.completeRequest(requestId, {
  success: true,
  duration: 145000,
  filesIndexed: 1247
});
```

## Memory Monitoring Guidelines

### Intelligent Memory Alerts

Replace simplistic threshold alerts with context-aware monitoring:

```typescript
interface MemoryContext {
  baseline: number;      // Established normal usage
  trend: 'stable' | 'growing' | 'oscillating';
  growthRate: number;    // MB/hour
  systemMemory: number;  // Total available
  activeFolders: number;
  activeConnections: number;
}

class SmartMemoryMonitor {
  logMemoryStatus(context: MemoryContext, current: number): void {
    const deviation = current - context.baseline;
    const utilizationPercent = (current / context.systemMemory) * 100;
    
    if (context.trend === 'growing' && context.growthRate > 10) {
      logger.warn('Memory growth detected', {
        currentUsage: current,
        baseline: context.baseline,
        growthRate: context.growthRate,
        systemUtilization: utilizationPercent,
        activeFolders: context.activeFolders,
        recommendation: 'Monitor for memory leak patterns'
      });
    } else {
      // Normal monitoring - DEBUG level only
      logger.debug('Memory status', {
        usage: current,
        baseline: context.baseline,
        trend: context.trend,
        systemUtilization: utilizationPercent
      });
    }
  }
}
```

### Memory Alert Thresholds

- **Baseline Establishment**: 5 minutes of silent monitoring to establish normal usage
- **Growth Alert**: >10MB/hour sustained growth for >30 minutes
- **System Alert**: >80% of total system memory (not heap utilization)
- **Critical Alert**: >95% of total system memory or evidence of memory leak

## Performance Logging Standards

### Operation Timing

Include timing information for all significant operations:

```typescript
class TimedOperation {
  private startTime: number;
  
  constructor(
    private operationName: string,
    private logger: ILoggingService,
    private context: Record<string, any> = {}
  ) {
    this.startTime = Date.now();
    
    logger.info(`${operationName} started`, {
      ...context,
      startTime: new Date().toISOString()
    });
  }
  
  complete(outcome: Record<string, any> = {}): void {
    const duration = Date.now() - this.startTime;
    const success = outcome.success ?? true;
    
    const logLevel = success ? 'info' : 'error';
    this.logger[logLevel](`${this.operationName} ${success ? 'completed' : 'failed'}`, {
      ...this.context,
      duration,
      ...outcome
    });
  }
}

// Usage:
const indexingOp = new TimedOperation('folder.indexing', logger, {
  requestId,
  path: folderPath,
  estimatedFiles: 1247
});

// ... perform indexing ...

indexingOp.complete({
  success: true,
  filesProcessed: 1247,
  averageFileTime: 0.116,
  databaseSize: '15.2MB'
});
```

### Performance Baselines

Establish and log performance baselines for capacity planning:

```typescript
interface PerformanceBaseline {
  averageIndexingTime: number;    // seconds per file
  averageQueryTime: number;       // seconds per search
  memoryPerDocument: number;      // MB per indexed document
  concurrentConnectionLimit: number;
}

class PerformanceMonitor {
  logPerformanceSnapshot(): void {
    const baseline = this.calculateBaseline();
    
    logger.info('Performance baseline snapshot', {
      indexingSpeed: baseline.averageIndexingTime,
      queryLatency: baseline.averageQueryTime,
      memoryEfficiency: baseline.memoryPerDocument,
      connectionCapacity: baseline.concurrentConnectionLimit,
      totalDocuments: this.getTotalDocuments(),
      activeConnections: this.getActiveConnections()
    });
  }
}
```

## Error Handling Patterns

### Error Context Enhancement

Always include sufficient context to diagnose and fix errors:

```typescript
class ContextualError extends Error {
  constructor(
    message: string,
    public context: Record<string, any>,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ContextualError';
  }
}

function handleDatabaseError(error: Error, operation: string, context: any): void {
  const contextualError = new ContextualError(
    `Database operation failed: ${operation}`,
    {
      operation,
      databasePath: context.databasePath,
      sqlCommand: context.sqlCommand,
      retryAttempt: context.retryAttempt || 0,
      recommendedAction: 'Check database permissions and disk space'
    },
    error
  );
  
  logger.error(contextualError.message, contextualError, contextualError.context);
}
```

### Recovery Logging

Log recovery attempts and outcomes:

```typescript
class RecoveryLogger {
  logRecoveryAttempt(component: string, error: Error, strategy: string): void {
    logger.warn(`Recovery attempt: ${component}`, {
      errorType: error.name,
      recoveryStrategy: strategy,
      attemptTime: new Date().toISOString()
    });
  }
  
  logRecoveryOutcome(component: string, success: boolean, details: any): void {
    const level = success ? 'info' : 'error';
    
    logger[level](`Recovery ${success ? 'succeeded' : 'failed'}: ${component}`, {
      success,
      recoveryDuration: details.duration,
      ...details
    });
  }
}
```

## WebSocket Protocol Logging

### Connection Lifecycle

```typescript
class WebSocketLogger {
  logConnection(clientId: string, clientType: string, metadata: any): void {
    logger.info('Client connected', {
      clientId,
      clientType,
      remoteAddress: metadata.remoteAddress,
      userAgent: metadata.userAgent,
      totalConnections: this.getConnectionCount()
    });
  }
  
  logDisconnection(clientId: string, reason: string): void {
    logger.info('Client disconnected', {
      clientId,
      reason,
      connectionDuration: this.getConnectionDuration(clientId),
      totalConnections: this.getConnectionCount()
    });
  }
  
  logProtocolError(clientId: string, message: any, error: string): void {
    // Protocol errors are DEBUG level for development, not warnings
    logger.debug('Protocol validation failed', {
      clientId,
      messageType: message.type,
      errorCode: error,
      suggestion: 'Check client implementation against protocol spec'
    });
  }
}
```

### Message Flow Tracking

```typescript
class MessageFlowLogger {
  logIncomingMessage(clientId: string, message: any): void {
    logger.debug('Message received', {
      clientId,
      messageType: message.type,
      messageId: message.id,
      payloadSize: JSON.stringify(message).length
    });
  }
  
  logOutgoingMessage(clientId: string, message: any): void {
    logger.debug('Message sent', {
      clientId,
      messageType: message.type,
      messageId: message.id,
      correlationId: message.correlationId
    });
  }
}
```

## Configuration Logging

### Startup Configuration

```typescript
class ConfigurationLogger {
  logStartupConfig(config: any): void {
    logger.info('Daemon startup configuration', {
      port: config.port,
      logLevel: config.logLevel,
      cacheDirectory: config.cacheDirectory,
      maxMemory: config.maxMemory,
      supportedModels: config.supportedModels.length,
      developmentMode: config.developmentEnabled
    });
  }
  
  logConfigChange(key: string, oldValue: any, newValue: any): void {
    logger.info('Configuration updated', {
      configKey: key,
      previousValue: oldValue,
      newValue: newValue,
      changeTime: new Date().toISOString()
    });
  }
}
```

## File System Operation Logging

### Folder Management

```typescript
class FolderOperationLogger {
  logFolderOperation(operation: 'add' | 'remove', path: string, context: any): void {
    logger.info(`Folder ${operation} requested`, {
      operation,
      path,
      requestId: context.requestId,
      clientId: context.clientId,
      model: context.model
    });
  }
  
  logScanProgress(requestId: string, progress: any): void {
    // Only log progress at significant intervals (every 25% or every minute)
    if (progress.percent % 25 === 0 || progress.timeElapsed > progress.lastLogTime + 60000) {
      logger.info('Folder scanning progress', {
        requestId,
        progress: progress.percent,
        filesProcessed: progress.filesProcessed,
        filesRemaining: progress.filesRemaining,
        estimatedCompletion: progress.estimatedCompletion
      });
    }
  }
}
```

## Anti-Patterns to Avoid

### ❌ Log Spam Anti-Patterns

```typescript
// DON'T: Repetitive messages with no new information
setInterval(() => {
  logger.info('System is running'); // ❌ Useless
}, 10000);

// DON'T: Fixed threshold alerts without context  
if (memoryUsage > threshold) {
  logger.warn('High memory usage'); // ❌ No context
}

// DON'T: Wrong log levels
logger.warn('Processing message'); // ❌ Should be DEBUG
logger.info('Database connection failed'); // ❌ Should be ERROR
```

### ❌ Context-Free Logging

```typescript
// DON'T: Vague messages
logger.info('Operation completed'); // ❌ What operation?

// DON'T: Missing correlation
logger.info('Starting validation');
// ... elsewhere ...
logger.info('Validation failed'); // ❌ Which validation?

// DON'T: No outcome information
logger.info('Handling request'); // ❌ What was the result?
```

## Implementation Checklist

### For New Log Statements

- [ ] **Appropriate Level**: Matches purpose (DEBUG/INFO/WARN/ERROR/FATAL)
- [ ] **Sufficient Context**: Includes relevant metadata and correlation IDs
- [ ] **Actionable Information**: Provides next steps or diagnostic information
- [ ] **Performance Impact**: Consider frequency and payload size
- [ ] **Consistent Format**: Follows established patterns and structure

### For Error Logging

- [ ] **Error Object Included**: Pass actual Error instance to logger
- [ ] **Operation Context**: What was being attempted when error occurred
- [ ] **Recovery Information**: What happens next (retry, fallback, abort)
- [ ] **Diagnostic Data**: Relevant state information for troubleshooting
- [ ] **User Impact**: How this affects system functionality

### For Performance Logging

- [ ] **Timing Information**: Duration for significant operations
- [ ] **Resource Usage**: Memory, CPU, I/O metrics when relevant
- [ ] **Throughput Metrics**: Items processed per unit time
- [ ] **Baseline Comparison**: Current vs expected performance
- [ ] **Capacity Information**: Current load vs maximum capacity

## Log Analysis and Monitoring

### Key Performance Indicators

**System Health Indicators:**
- Memory growth rate (should be <5MB/hour)
- Average operation completion time
- Error rate (should be <1% of total operations)  
- Client connection stability

**Operational Metrics:**
- Folder indexing throughput (files per second)
- Query response time (95th percentile <100ms)
- Database size growth rate
- Cache hit ratio (should be >80%)

### Alerting Thresholds

**Production Alert Thresholds:**
- ERROR level logs: Immediate alert
- Memory growth >20MB/hour: Alert within 15 minutes
- Operation failures >5% over 10 minutes: Immediate alert
- Query latency >500ms for >5 minutes: Alert

**Monitoring Dashboard Metrics:**
- Active connections count
- Memory usage trend (not absolute)
- Operation success rate
- Average response times
- Database sizes and growth rates

---

## Conclusion

These guidelines establish a comprehensive framework for consistent, informative, and actionable logging throughout the folder-mcp daemon. By following these standards:

1. **Logs become a powerful operational tool** rather than noise
2. **Debugging time is reduced** through better context and correlation
3. **System health is clearly visible** through appropriate metrics and alerts  
4. **Performance issues are caught early** through trend analysis rather than threshold alerts

Every log entry should tell part of the story of system operation, making it easy for administrators and developers to understand system behavior and quickly resolve issues when they occur.