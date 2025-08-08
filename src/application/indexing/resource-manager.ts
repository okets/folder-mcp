/**
 * Resource Manager for Concurrent Indexing
 * 
 * Manages system resources to prevent overload during concurrent indexing operations.
 * Implements queue management, memory limits, and CPU throttling.
 */

import { EventEmitter } from 'events';
import { ILoggingService } from '../../di/interfaces.js';

export interface ResourceLimits {
    /** Maximum concurrent indexing operations */
    maxConcurrentOperations: number;
    /** Maximum memory usage in MB */
    maxMemoryMB: number;
    /** Maximum CPU percentage (0-100) */
    maxCpuPercent: number;
    /** Maximum queue size */
    maxQueueSize: number;
    /** Check interval in ms */
    checkIntervalMs: number;
    /** Enable adaptive throttling */
    adaptiveThrottling: boolean;
}

export interface ResourceStats {
    /** Current memory usage in MB */
    memoryUsedMB: number;
    /** Memory limit in MB */
    memoryLimitMB: number;
    /** Memory usage percentage */
    memoryPercent: number;
    /** Current CPU usage percentage */
    cpuPercent: number;
    /** Number of active operations */
    activeOperations: number;
    /** Number of queued operations */
    queuedOperations: number;
    /** Whether system is throttled */
    isThrottled: boolean;
    /** Current throttle factor (0-1) */
    throttleFactor: number;
}

export interface QueuedOperation {
    id: string;
    folderPath: string;
    priority: number;
    estimatedMemoryMB: number;
    addedAt: Date;
    execute: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
}

export class ResourceManager extends EventEmitter {
    private limits: Required<ResourceLimits>;
    private activeOperations: Map<string, QueuedOperation> = new Map();
    private operationQueue: QueuedOperation[] = [];
    private checkInterval: NodeJS.Timeout | null = null;
    private throttleFactor: number = 1.0;
    private lastCpuUsage: NodeJS.CpuUsage | null = null;
    private isShuttingDown: boolean = false;

    constructor(
        private logger: ILoggingService | undefined,
        limits: Partial<ResourceLimits> = {}
    ) {
        super();
        
        this.limits = {
            maxConcurrentOperations: limits.maxConcurrentOperations ?? 3,
            maxMemoryMB: limits.maxMemoryMB ?? 1024, // 1GB default
            maxCpuPercent: limits.maxCpuPercent ?? 70,
            maxQueueSize: limits.maxQueueSize ?? 100,
            checkIntervalMs: limits.checkIntervalMs ?? 1000,
            adaptiveThrottling: limits.adaptiveThrottling ?? true
        };

        this.startMonitoring();
    }

    /**
     * Submit an operation for execution with resource management
     */
    async submitOperation<T>(
        id: string,
        folderPath: string,
        operation: () => Promise<T>,
        options: {
            priority?: number;
            estimatedMemoryMB?: number;
        } = {}
    ): Promise<T> {
        if (this.isShuttingDown) {
            throw new Error('Resource manager is shutting down');
        }

        // Check queue size limit
        if (this.operationQueue.length >= this.limits.maxQueueSize) {
            throw new Error(`Queue is full (${this.limits.maxQueueSize} operations)`);
        }

        return new Promise<T>((resolve, reject) => {
            const queuedOp: QueuedOperation = {
                id,
                folderPath,
                priority: options.priority ?? 0,
                estimatedMemoryMB: options.estimatedMemoryMB ?? 100,
                addedAt: new Date(),
                execute: operation,
                resolve,
                reject
            };

            // Add to queue
            this.operationQueue.push(queuedOp);
            this.sortQueue();
            
            this.logger?.info(`Operation queued: ${id}`, {
                queueLength: this.operationQueue.length,
                activeOperations: this.activeOperations.size
            });

            // Try to execute immediately if resources available
            this.processQueue();
        });
    }

    /**
     * Get current resource statistics
     */
    getStats(): ResourceStats {
        const memUsage = process.memoryUsage();
        const memoryUsedMB = memUsage.heapUsed / 1024 / 1024;
        const memoryPercent = (memoryUsedMB / this.limits.maxMemoryMB) * 100;

        return {
            memoryUsedMB,
            memoryLimitMB: this.limits.maxMemoryMB,
            memoryPercent,
            cpuPercent: this.getCurrentCpuPercent(),
            activeOperations: this.activeOperations.size,
            queuedOperations: this.operationQueue.length,
            isThrottled: this.throttleFactor < 1.0,
            throttleFactor: this.throttleFactor
        };
    }

    /**
     * Process the operation queue
     */
    private async processQueue(): Promise<void> {
        // Don't process if shutting down
        if (this.isShuttingDown) {
            return;
        }

        // Check if we can start new operations
        while (
            this.operationQueue.length > 0 &&
            this.canStartOperation()
        ) {
            const operation = this.operationQueue.shift();
            if (!operation) break;

            this.activeOperations.set(operation.id, operation);
            
            this.logger?.info(`Starting operation: ${operation.id}`, {
                activeOperations: this.activeOperations.size,
                memoryUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
            });

            // Execute operation with resource tracking
            this.executeOperation(operation);
        }
    }

    /**
     * Execute a single operation with resource tracking
     */
    private async executeOperation(operation: QueuedOperation): Promise<void> {
        try {
            // Apply throttling if needed
            if (this.throttleFactor < 1.0 && this.limits.adaptiveThrottling) {
                const delay = Math.floor((1 - this.throttleFactor) * 1000);
                if (delay > 0) {
                    await this.sleep(delay);
                }
            }

            // Execute the operation
            const result = await operation.execute();
            operation.resolve(result);
            
            this.logger?.info(`Operation completed: ${operation.id}`);
        } catch (error) {
            this.logger?.error(`Operation failed: ${operation.id}`, error instanceof Error ? error : new Error(String(error)));
            operation.reject(error);
        } finally {
            // Clean up
            this.activeOperations.delete(operation.id);
            
            // Process next in queue
            setImmediate(() => this.processQueue());
        }
    }

    /**
     * Check if we can start a new operation based on resource limits
     */
    private canStartOperation(): boolean {
        // Check concurrent operation limit
        if (this.activeOperations.size >= this.limits.maxConcurrentOperations) {
            return false;
        }

        // Check memory limit
        const memUsage = process.memoryUsage();
        const memoryUsedMB = memUsage.heapUsed / 1024 / 1024;
        if (memoryUsedMB > this.limits.maxMemoryMB * 0.9) { // 90% threshold
            this.logger?.warn('Memory limit reached, waiting for resources', {
                memoryUsedMB,
                limitMB: this.limits.maxMemoryMB
            });
            return false;
        }

        // Check CPU limit (if high CPU, reduce concurrency)
        const cpuPercent = this.getCurrentCpuPercent();
        if (cpuPercent > this.limits.maxCpuPercent) {
            this.logger?.warn('CPU limit reached, waiting for resources', {
                cpuPercent,
                limitPercent: this.limits.maxCpuPercent
            });
            return false;
        }

        return true;
    }

    /**
     * Start resource monitoring
     */
    private startMonitoring(): void {
        if (this.checkInterval) {
            return;
        }

        this.checkInterval = setInterval(() => {
            this.checkResources();
        }, this.limits.checkIntervalMs);

        // Initialize CPU tracking
        this.lastCpuUsage = process.cpuUsage();
    }

    /**
     * Check system resources and adjust throttling
     */
    private checkResources(): void {
        const stats = this.getStats();

        // Adaptive throttling based on resource usage
        if (this.limits.adaptiveThrottling) {
            const memoryPressure = stats.memoryPercent / 100;
            const cpuPressure = stats.cpuPercent / 100;
            
            // Calculate throttle factor (lower = more throttling)
            const pressure = Math.max(memoryPressure, cpuPressure);
            if (pressure > 0.9) {
                this.throttleFactor = 0.25; // Heavy throttling
            } else if (pressure > 0.7) {
                this.throttleFactor = 0.5; // Moderate throttling
            } else if (pressure > 0.5) {
                this.throttleFactor = 0.75; // Light throttling
            } else {
                this.throttleFactor = 1.0; // No throttling
            }
        }

        // Emit stats for monitoring
        this.emit('stats', stats);

        // Force garbage collection if memory pressure is high
        if (stats.memoryPercent > 80 && global.gc) {
            this.logger?.info('Triggering garbage collection due to memory pressure');
            global.gc();
        }
    }

    /**
     * Get current CPU usage percentage
     */
    private getCurrentCpuPercent(): number {
        if (!this.lastCpuUsage) {
            this.lastCpuUsage = process.cpuUsage();
            return 0;
        }

        const currentUsage = process.cpuUsage(this.lastCpuUsage);
        const totalTime = currentUsage.user + currentUsage.system;
        
        // Calculate percentage based on interval
        const percent = (totalTime / (this.limits.checkIntervalMs * 1000)) * 100;
        
        this.lastCpuUsage = process.cpuUsage();
        return Math.min(percent, 100);
    }

    /**
     * Sort queue by priority (higher priority first)
     */
    private sortQueue(): void {
        this.operationQueue.sort((a, b) => {
            // Sort by priority first
            if (a.priority !== b.priority) {
                return b.priority - a.priority;
            }
            // Then by age (older first)
            return a.addedAt.getTime() - b.addedAt.getTime();
        });
    }

    /**
     * Cancel a queued or active operation
     */
    async cancelOperation(id: string): Promise<boolean> {
        // Check if in queue
        const queueIndex = this.operationQueue.findIndex(op => op.id === id);
        if (queueIndex !== -1) {
            const operation = this.operationQueue.splice(queueIndex, 1)[0];
            if (operation) {
                operation.reject(new Error('Operation cancelled'));
                return true;
            }
        }

        // Check if active (can't cancel active operations, just mark)
        if (this.activeOperations.has(id)) {
            this.logger?.warn(`Cannot cancel active operation: ${id}`);
            return false;
        }

        return false;
    }

    /**
     * Cancel all operations
     */
    async cancelAll(): Promise<void> {
        // Cancel queued operations
        while (this.operationQueue.length > 0) {
            const operation = this.operationQueue.shift();
            if (operation) {
                operation.reject(new Error('All operations cancelled'));
            }
        }

        // Wait for active operations to complete
        if (this.activeOperations.size > 0) {
            this.logger?.info(`Waiting for ${this.activeOperations.size} active operations to complete`);
        }
    }

    /**
     * Shutdown the resource manager
     */
    async shutdown(): Promise<void> {
        this.isShuttingDown = true;

        // Stop monitoring
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }

        // Cancel all operations
        await this.cancelAll();

        // Wait for active operations
        const timeout = 30000; // 30 seconds
        const startTime = Date.now();
        
        while (this.activeOperations.size > 0) {
            if (Date.now() - startTime > timeout) {
                this.logger?.error('Timeout waiting for operations to complete');
                break;
            }
            await this.sleep(100);
        }
    }

    /**
     * Sleep helper
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get queue status
     */
    getQueueStatus(): {
        queued: Array<{ id: string; folderPath: string; priority: number; waitTime: number }>;
        active: Array<{ id: string; folderPath: string }>;
    } {
        const now = Date.now();
        
        return {
            queued: this.operationQueue.map(op => ({
                id: op.id,
                folderPath: op.folderPath,
                priority: op.priority,
                waitTime: now - op.addedAt.getTime()
            })),
            active: Array.from(this.activeOperations.values()).map(op => ({
                id: op.id,
                folderPath: op.folderPath
            }))
        };
    }
}