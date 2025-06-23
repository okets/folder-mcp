#!/usr/bin/env node

import { TUIApplication } from './TUIApplication.js';

/**
 * TUI Entry Point - Neo-blessed implementation
 * Launch the folder-mcp TUI application
 */
function main() {
    try {
        // Create and start the TUI application
        const app = new TUIApplication();
        
        // Handle cleanup on exit
        process.on('SIGINT', () => {
            // Restore terminal state
            process.stdout.write('\x1b[?25h'); // Show cursor
            process.exit(0);
        });

        process.on('SIGTERM', () => {
            // Restore terminal state
            process.stdout.write('\x1b[?25h'); // Show cursor
            process.exit(0);
        });

    } catch (error) {
        console.error('Failed to start TUI application:', error);
        process.exit(1);
    }
}

// Launch if this file is run directly
// For now, always launch to test the TUI
main();

export { TUIApplication };