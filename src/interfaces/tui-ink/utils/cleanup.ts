/**
 * Global cleanup registry for TUI exit handling
 * 
 * Provides a way for components to register cleanup handlers
 * that will be called when the TUI exits.
 */

// Global cleanup registry for WebSocket connections
const cleanupHandlers = new Set<() => Promise<void>>();

export const registerCleanupHandler = (handler: () => Promise<void>) => {
    cleanupHandlers.add(handler);
};

export const unregisterCleanupHandler = (handler: () => Promise<void>) => {
    cleanupHandlers.delete(handler);
};

export const runAllCleanup = async () => {
    for (const handler of cleanupHandlers) {
        try {
            await handler();
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }
};