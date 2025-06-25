#!/usr/bin/env node
import React from 'react';
import { render, Box, Text } from 'ink';

// Minimal test to isolate red background bug
// We'll add components incrementally

const TestApp: React.FC = () => {
    return (
        <Box flexDirection="column">
            <Text>🔴 Red Background Test - Step 2: Compiled JS (not tsx)</Text>
            <Text>If background is white, press Ctrl+C and tell me "Step 2: OK"</Text>
            <Text>If background is red, press Ctrl+C and tell me "Step 2: RED"</Text>
        </Box>
    );
};

// Start the test app
const app = render(<TestApp />, {
    exitOnCtrlC: true
});

// Handle graceful exit
const cleanup = () => {
    // Reset all ANSI formatting to prevent terminal background issues
    process.stdout.write('\x1b[0m'); // Reset all formatting
    process.stdout.write('\x1b[49m'); // Reset background color specifically
    app.unmount();
    process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Also cleanup when app exits normally
app.waitUntilExit().then(() => {
    // Let terminal handle cleanup naturally
});