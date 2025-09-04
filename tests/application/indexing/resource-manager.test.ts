import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResourceManager, ResourceLimits } from '../../../src/application/indexing/resource-manager.js';
import { ILoggingService } from '../../../src/di/interfaces.js';

describe('ResourceManager', () => {
    let resourceManager: ResourceManager;
    let mockLogger: ILoggingService;

    beforeEach(() => {
        mockLogger = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
            fatal: vi.fn(),
            setLevel: vi.fn()
        };
        
        const limits: Partial<ResourceLimits> = {
            maxConcurrentOperations: 2,
            maxQueueSize: 5
        };
        
        resourceManager = new ResourceManager(mockLogger, limits);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('shutdown', () => {
        it('should perform graceful shutdown by default', async () => {
            let resolveOperation: ((value: string) => void) | undefined;
            const mockOperation = vi.fn().mockImplementation(() => 
                new Promise<string>(resolve => {
                    resolveOperation = resolve;
                })
            );
            
            // Add an operation to the manager
            const operationPromise = resourceManager.submitOperation('test-op', '/', mockOperation, {
                priority: 1,
                estimatedMemoryMB: 10
            });
            
            // Allow operation to start but not complete
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Start graceful shutdown (default behavior)
            const shutdownPromise = resourceManager.shutdown();
            
            // Allow a moment for shutdown to register the waiting state
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Complete the operation
            resolveOperation?.('result');
            
            // Wait for operation and shutdown to complete
            await Promise.all([operationPromise, shutdownPromise]);
            
            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('Waiting for 1 active operations to complete')
            );
        });

        it('should perform forced shutdown when force=true', async () => {
            const mockOperation = vi.fn().mockImplementation(() => 
                new Promise(resolve => setTimeout(resolve, 1000)) // Long-running operation
            );
            
            // Add an operation that will take a long time
            const operationPromise = resourceManager.submitOperation('test-op', '/', mockOperation, {
                priority: 1,
                estimatedMemoryMB: 10
            });
            
            // Allow operation to start
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Force shutdown immediately
            await resourceManager.shutdown(true);
            
            // Check that forced shutdown was logged
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Forcing immediate shutdown with 1 active operations')
            );
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Forced shutdown completed - all active operations terminated'
            );
            
            // Operation should be rejected
            await expect(operationPromise).rejects.toThrow('Resource manager forced shutdown');
        });

        it('should clear active operations immediately during forced shutdown', async () => {
            const mockOperation1 = vi.fn().mockImplementation(() => 
                new Promise(resolve => setTimeout(resolve, 1000))
            );
            const mockOperation2 = vi.fn().mockImplementation(() => 
                new Promise(resolve => setTimeout(resolve, 1000))
            );
            
            // Add multiple operations
            const op1Promise = resourceManager.submitOperation('test-op-1', '/', mockOperation1, {
                priority: 1,
                estimatedMemoryMB: 10
            });
            const op2Promise = resourceManager.submitOperation('test-op-2', '/', mockOperation2, {
                priority: 1,
                estimatedMemoryMB: 10
            });
            
            // Allow operations to start
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Verify we have active operations
            const statsBefore = resourceManager.getStats();
            expect(statsBefore.activeOperations).toBe(2);
            
            // Force shutdown
            await resourceManager.shutdown(true);
            
            // Verify active operations are cleared
            const statsAfter = resourceManager.getStats();
            expect(statsAfter.activeOperations).toBe(0);
            
            // Both operations should be rejected
            await expect(op1Promise).rejects.toThrow('Resource manager forced shutdown');
            await expect(op2Promise).rejects.toThrow('Resource manager forced shutdown');
        });

        it('should handle errors during forced shutdown gracefully', async () => {
            const mockOperation = vi.fn().mockImplementation(() => 
                new Promise(resolve => setTimeout(resolve, 1000))
            );
            
            // Add operation
            const operationPromise = resourceManager.submitOperation('test-op', '/', mockOperation, {
                priority: 1,
                estimatedMemoryMB: 10
            });
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Mock the operation reject to throw an error
            const originalReject = operationPromise.catch(() => {});
            
            // Override the activeOperations map with a mock that throws during rejection
            const mockRejection = vi.fn().mockImplementation(() => {
                throw new Error('Rejection error');
            });
            
            // Get access to active operations through reflection
            const activeOps = (resourceManager as any).activeOperations as Map<string, any>;
            const operationEntries = Array.from(activeOps.entries());
            if (operationEntries.length > 0) {
                const operationEntry = operationEntries[0];
                if (operationEntry) {
                    const [id, operation] = operationEntry;
                    operation.reject = mockRejection;
                }
            }
            
            // Force shutdown should handle rejection errors
            await resourceManager.shutdown(true);
            
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Error rejecting operation'),
                expect.any(Error)
            );
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Forced shutdown completed - all active operations terminated'
            );
        });

        it('should skip wait loop during forced shutdown', async () => {
            const startTime = Date.now();
            
            const mockOperation = vi.fn().mockImplementation(() => 
                new Promise(resolve => setTimeout(resolve, 1000))
            );
            
            // Add operation
            const operationPromise = resourceManager.submitOperation('test-op', '/', mockOperation, {
                priority: 1,
                estimatedMemoryMB: 10
            });
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Force shutdown should complete quickly
            await resourceManager.shutdown(true);
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Should complete in much less than the 30-second timeout
            expect(duration).toBeLessThan(1000);
            
            await expect(operationPromise).rejects.toThrow('Resource manager forced shutdown');
        });
    });
});