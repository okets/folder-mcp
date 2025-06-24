#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { AppFullscreen as App } from './AppFullscreen.js';
import { DIProvider, setupDIContainer } from './di/index.js';

// Clear screen and position at top
process.stdout.write('\x1b[2J\x1b[H');

// Setup DI container
const container = setupDIContainer();

// Start the Ink TUI in fullscreen mode
const app = render(
    <DIProvider container={container}>
        <App />
    </DIProvider>,
    {
        exitOnCtrlC: false  // We handle this in useInput
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
    // Clear screen on exit
    process.stdout.write('\x1b[2J\x1b[H');
});