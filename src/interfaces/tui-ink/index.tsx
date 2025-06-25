#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { AppFullscreen as App } from './AppFullscreen.js';
import { DIProvider, setupDIContainer } from './di/index.js';

// Let Ink handle screen management for better terminal compatibility

// Setup DI container
const container = setupDIContainer();

// Start the Ink TUI in fullscreen mode
const app = render(
    <DIProvider container={container}>
        <App />
    </DIProvider>,
    {
        exitOnCtrlC: true  // Allow standard Ctrl+C behavior for better terminal compatibility
    }
);

// Handle graceful exit
const cleanup = () => {
    app.unmount();
    process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Also cleanup when app exits normally
app.waitUntilExit().then(() => {
    // Let terminal handle cleanup naturally
});