/**
 * Global cleanup registry for TUI exit handling
 * 
 * Provides a way for components to register cleanup handlers
 * that will be called when the TUI exits.
 */

// Global cleanup registry for WebSocket connections
const cleanupHandlers: Array<() => Promise<void>> = [];

export const registerCleanupHandler = (handler: () => Promise<void>) => {
    cleanupHandlers.push(handler);
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