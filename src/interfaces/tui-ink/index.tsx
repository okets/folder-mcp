#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { AppFullscreen as App } from './AppFullscreen.js';
import { DIProvider, setupDIContainer } from './di/index.js';

// Check if we're in a proper TTY environment
if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error('Error: This application must be run in an interactive terminal.');
    console.error('Please run directly in your terminal, not through pipes or scripts.');
    process.exit(1);
}

// Let Ink handle screen management for better terminal compatibility

// Setup DI container
const container = setupDIContainer();

// Check if raw mode is supported
const isRawModeSupported = process.stdin.setRawMode !== undefined;

if (!isRawModeSupported) {
    console.error('Error: Raw mode is not supported in this environment.');
    console.error('The TUI requires an interactive terminal that supports raw mode.');
    console.error('');
    console.error('Try running this command directly in your terminal:');
    console.error('  npm run tui');
    process.exit(1);
}

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