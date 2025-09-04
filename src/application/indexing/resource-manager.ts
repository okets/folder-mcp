/**
 * Resource Manager for Concurrent Indexing
 * 
 * Manages concurrent indexing operations through queue management.
 * Provides simple concurrency control without throttling.
 */

import { EventEmitter } from 'events';
import { ILoggingService } from '../../di/interfaces.js';

export interface ResourceLimits {
    /** Maximum concurrent indexing operations */
    maxConcurrentOperations: number;
    /** Maximum queue size */
    maxQueueSize: number;
}

export interface ResourceStats {
    /** Current memory usage in MB */
    memoryUsedMB: number;
    /** Number of active operations */
    activeOperations: number;
    /** Number of queued operations */
    queuedOperations: number;
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
    private isShuttingDown: boolean = false;

    constructor(
        private logger: ILoggingService | undefined,
        limits: Partial<ResourceLimits> = {}
    ) {
        super();
        
        this.limits = {
            maxConcurrentOperations: limits.maxConcurrentOperations ?? 2, // Optimal from testing
            maxQueueSize: limits.maxQueueSize ?? 100
        };
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
        const memoryUsedMB = memUsage.rss / 1024 / 1024; // Use RSS for actual memory footprint

        return {
            memoryUsedMB,
            activeOperations: this.activeOperations.size,
            queuedOperations: this.operationQueue.length
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
     * Execute a single operation
     */
    private async executeOperation(operation: QueuedOperation): Promise<void> {
        try {
            // Execute the operation directly without throttling
            const result = await operation.execute();
            operation.resolve(result);
            
            this.logger?.info(`Operation completed: ${operation.id}`);
        } catch (error) {
            this.logger?.error(`Operation failed: ${operation.id}`, error instanceof Error ? error : new Error(String(error)));
            operation.reject(error);
            
            // Perform resource cleanup on operation failure
            await this.performOperationCleanup(operation, error);
            
        } finally {
            // Clean up
            this.activeOperations.delete(operation.id);
            
            // Process next in queue
            setImmediate(() => this.processQueue());
        }
    }

    /**
     * Check if we can start a new operation based on concurrency limit
     */
    private canStartOperation(): boolean {
        // Only check concurrent operation limit
        return this.activeOperations.size < this.limits.maxConcurrentOperations;
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
    
    /**
     * Perform cleanup when an operation fails
     */
    private async performOperationCleanup(operation: QueuedOperation, error: any): Promise<void> {
        try {
            this.logger?.info(`Performing resource cleanup for failed operation: ${operation.id}`, {
                folderPath: operation.folderPath,
                estimatedMemoryMB: operation.estimatedMemoryMB,
                error: error instanceof Error ? error.message : String(error)
            });
            
            // Force garbage collection if memory was allocated
            if (operation.estimatedMemoryMB > 50 && global.gc) {
                this.logger?.info(`Triggering garbage collection after failed operation (${operation.estimatedMemoryMB}MB estimated)`);
                global.gc();
                
                // Log memory usage after GC
                const memUsage = process.memoryUsage();
                const memoryUsedMB = memUsage.heapUsed / 1024 / 1024;
                this.logger?.info(`Memory after cleanup GC: ${Math.round(memoryUsedMB)}MB heap used`);
            }
            
            // Log resource statistics after cleanup
            const stats = this.getStats();
            this.logger?.info(`Resource cleanup completed for operation: ${operation.id}`, {
                memoryUsedMB: Math.round(stats.memoryUsedMB),
                activeOperations: stats.activeOperations,
                queuedOperations: stats.queuedOperations
            });
            
        } catch (cleanupError) {
            this.logger?.error(`Error during operation cleanup for ${operation.id}:`, cleanupError instanceof Error ? cleanupError : new Error(String(cleanupError)));
            // Don't throw - cleanup should not fail the parent operation
        }
    }
}