#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { AppFullscreen as App } from './AppFullscreen.js';

// Enter alternate screen buffer for fullscreen apps
process.stdout.write('\x1b[?1049h');
console.clear();

// Start the Ink TUI in fullscreen mode
const app = render(<App />, {
    exitOnCtrlC: false  // We handle this in useInput
});

// Handle graceful exit
const cleanup = () => {
    app.unmount();
    // Exit alternate screen buffer
    process.stdout.write('\x1b[?1049l');
    process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Also cleanup when app exits normally
app.waitUntilExit().then(() => {
    process.stdout.write('\x1b[?1049l');
});