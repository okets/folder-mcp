#!/usr/bin/env npx tsx

import React, { useState } from 'react';
import { render, Box, Text, useInput, Key } from 'ink';

// Simple test component to debug input handling
const TestApp = () => {
    const [log, setLog] = useState<string[]>(['App started. Press keys to test input.']);
    const [inputCount, setInputCount] = useState(0);
    
    const addLog = (message: string) => {
        setLog(prev => [...prev.slice(-9), message]);
    };
    
    // Test direct useInput
    useInput((input: string, key: Key) => {
        setInputCount(prev => prev + 1);
        const timestamp = new Date().toISOString().split('T')[1];
        
        if (input === 'q') {
            addLog(`${timestamp} - Received 'q', exiting...`);
            process.exit(0);
        }
        
        const keyInfo = [];
        if (input) keyInfo.push(`input="${input}"`);
        if (key.upArrow) keyInfo.push('upArrow');
        if (key.downArrow) keyInfo.push('downArrow');
        if (key.leftArrow) keyInfo.push('leftArrow');
        if (key.rightArrow) keyInfo.push('rightArrow');
        if (key.return) keyInfo.push('return');
        if (key.escape) keyInfo.push('escape');
        if (key.tab) keyInfo.push('tab');
        if (key.backspace) keyInfo.push('backspace');
        if (key.delete) keyInfo.push('delete');
        if (key.ctrl) keyInfo.push('ctrl');
        if (key.shift) keyInfo.push('shift');
        if (key.meta) keyInfo.push('meta');
        
        addLog(`${timestamp} - Input #${inputCount}: ${keyInfo.join(', ')}`);
    });
    
    return (
        <Box flexDirection="column">
            <Text color="green">Test TUI Input Flow</Text>
            <Text color="yellow">Press keys to test. Press 'q' to quit.</Text>
            <Text> </Text>
            <Text color="cyan">Input count: {inputCount}</Text>
            <Text> </Text>
            <Text color="white">Log:</Text>
            {log.map((line, i) => (
                <Text key={i} color="gray">{line}</Text>
            ))}
        </Box>
    );
};

// Check environment
console.error('Environment check:');
console.error('- process.stdin.isTTY:', process.stdin.isTTY);
console.error('- process.stdout.isTTY:', process.stdout.isTTY);
console.error('- NODE_ENV:', process.env.NODE_ENV);

// Start the app
const app = render(<TestApp />, {
    exitOnCtrlC: false
});

// Log when app exits
app.waitUntilExit().then(() => {
    console.error('\nApp exited normally');
});