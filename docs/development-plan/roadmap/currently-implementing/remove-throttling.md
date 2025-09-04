# Plan: Remove Throttling System

## Executive Summary
Remove the entire throttling system from folder-mcp as it provides no actual benefit for memory management and only adds complexity and performance degradation. Replace with simpler queue-based concurrency control.

## Problem Statement

### Current Issues
1. **False Memory Alerts**: System reports 99% memory utilization when only using 193MB of 8GB
2. **Incorrect Architecture**: Throttling the orchestrator doesn't control model memory usage
3. **Performance Degradation**: Unnecessary delays without memory benefits
4. **Complexity Without Value**: Added code complexity with no measurable benefit

### Root Causes
1. **Heap Utilization Bug**: Using `heapUsed/heapTotal` gives misleading percentages on macOS
2. **Model Architecture**: ONNX runs in worker threads (shared memory), Python in separate process
3. **Wrong Layer**: Throttling happens at orchestrator level, not where memory is actually used

## Architecture Analysis

### Current Flow (With Throttling)
```
MonitoredFoldersOrchestrator
    ├── ResourceManager (THROTTLING HERE)
    │   ├── adaptiveThrottling
    │   ├── throttleFactor calculations
    │   └── artificial delays
    ├── IntelligentMemoryMonitor
    │   ├── false alerts
    │   └── incorrect calculations
    └── Queue → Models (ACTUAL MEMORY USE HERE)
```

### Target Flow (Without Throttling)
```
MonitoredFoldersOrchestrator
    ├── QueueManager (simple concurrency limit)
    │   └── maxConcurrentOperations: 2-3
    ├── BasicMemoryMonitor (optional, informational only)
    └── Queue → Models (unchanged)
```

## Removal Plan

### Phase 1: Identify All Throttling Code

#### Files to Modify
1. **src/application/indexing/resource-manager.ts**
   - Remove: `adaptiveThrottling`, `throttleFactor`, `checkResources()` throttling logic
   - Keep: Queue management, concurrent operation limits
   - Keep: Basic resource stats for monitoring (without throttling)

2. **src/daemon/services/monitored-folders-orchestrator.ts**
   - Remove: Throttling-related resource limits
   - Remove: `systemPerformanceTelemetry` if only used for throttling
   - Keep: `resourceManager` but simplified for queue management only
   - Keep: Basic memory monitoring for informational purposes

3. **src/domain/daemon/intelligent-memory-monitor.ts**
   - Remove entirely if not providing value
   - Remove: Alert emissions that trigger throttling

4. **src/domain/daemon/system-performance-telemetry.ts**
   - Review if needed without throttling
   - Likely remove if only used for throttling decisions

### Phase 2: Simplify ResourceManager

#### Current ResourceManager (Lines to Remove/Modify)
```typescript
// REMOVE these concepts:
- throttleFactor: number = 1.0;
- adaptiveThrottling: boolean
- checkResources(): void  // The throttling logic
- applyThrottling in executeOperation()

// KEEP these concepts:
- maxConcurrentOperations: number (set to 2-3)
- operationQueue: QueuedOperation[]
- submitOperation() // But without throttling
- processQueue() // Simple queue processing
```

#### New Simplified ResourceManager
```typescript
export class ResourceManager {
  private maxConcurrentOperations = 2; // Fixed, optimal value
  private activeOperations = new Map();
  private operationQueue = [];
  
  async submitOperation(id, operation) {
    // Simple queue addition
    // No resource checking for throttling
  }
  
  private async processQueue() {
    // Process if under concurrent limit
    // No throttling delays
  }
  
  getStats() {
    // Return basic stats for monitoring
    // No throttle factor
  }
}
```

### Phase 3: Fix or Remove Memory Monitoring

#### Remove IntelligentMemoryMonitor
- Remove the entire class
- Remove all references in orchestrator
- Simplest solution if monitoring provides no value

### Phase 4: Update Tests

#### Tests That May Need Updates
1. **tests/unit/application/resource-manager.test.ts**
   - Remove throttling-related tests
   - Update expectations for no throttling
   - Keep queue management tests

2. **tests/unit/daemon/performance-monitor.test.ts**
   - May need removal if performance monitor is removed
   - Or update to not expect throttling behavior

3. **tests/unit/daemon/intelligent-memory-monitor.test.ts**
   - Remove or update based on Phase 3 decision

4. **Integration tests**
   - Remove any expectations of throttling behavior
   - Update timing expectations (things will be faster)

### Phase 5: Configuration Updates

#### Remove Configuration Options
1. **config-defaults.yaml**
   ```yaml
   # REMOVE:
   daemon:
     resourceLimits:
       adaptiveThrottling: true
       maxCpuPercent: 70
   ```

2. **Environment variables**
   - Remove any throttling-related env vars
   - Update documentation

## Implementation Steps

### Step 1: Remove Throttling from ResourceManager
1. Remove `throttleFactor` field
2. Remove `adaptiveThrottling` from ResourceLimits interface
3. Remove throttling delay logic from `executeOperation()`
4. Remove `checkResources()` method or simplify to just emit stats
5. Update constructor to not initialize throttling

### Step 2: Simplify MonitoredFoldersOrchestrator
1. Remove or simplify resource limits configuration
2. Remove throttling event handlers
3. Keep basic queue management with fixed limits
4. Remove performance telemetry if not needed

### Step 3: Handle Memory Monitoring
1. Either remove IntelligentMemoryMonitor entirely
2. Or fix calculations and make informational only
3. Remove alert event handlers that trigger throttling

### Step 4: Update Tests
1. Run `npm test` to identify failing tests
2. Update each failing test to remove throttling expectations
3. Ensure queue management tests still pass

### Step 5: Clean Up
1. Remove unused imports
2. Remove unused interfaces and types
3. Update documentation
4. Remove configuration options

## Testing Plan

### Pre-Removal Testing
```bash
# Baseline test run
npm test > test-results-before.txt 2>&1
```

### Post-Removal Testing
```bash
# After changes
npm test > test-results-after.txt 2>&1

# Compare results
diff test-results-before.txt test-results-after.txt
```

### Expected Test Changes
1. **Timing tests**: May complete faster without throttling delays
2. **Resource tests**: Remove expectations of throttling behavior
3. **Memory tests**: Update based on monitoring decision
4. **Queue tests**: Should remain unchanged

## Rollback Plan

If issues arise:
1. Git stash changes: `git stash`
2. Review specific failing tests
3. Determine if failure is expected (throttling removal) or unexpected
4. Fix unexpected failures only

## Success Criteria

1. **All tests pass** after updates
2. **No more false memory alerts** in daemon logs
3. **Better performance** - faster indexing without delays
4. **Simpler codebase** - less complexity to maintain
5. **Memory usage unchanged** - proves throttling wasn't helping

## Risk Assessment

### Low Risk
- Throttling doesn't actually control memory usage
- Queue limits already prevent overload
- Models self-manage resources

### Mitigations
- Keep queue-based concurrency limits
- Monitor actual memory usage after removal
- Can add back simple rate limiting if needed (doubtful)

## Timeline

1. **Hour 1**: Remove throttling from ResourceManager
2. **Hour 2**: Update MonitoredFoldersOrchestrator and related services
3. **Hour 3**: Fix/remove memory monitoring
4. **Hour 4**: Update and run tests
5. **Hour 5**: Documentation and cleanup

## Conclusion

Removing throttling will:
1. Eliminate false memory alerts
2. Improve performance
3. Simplify the codebase
4. Maintain actual resource safety through queue limits

The throttling system is architectural theater - it appears to manage resources but actually just adds delays without benefit. Real resource management happens at the queue level (concurrent operation limits) and model level (worker pool sizes).