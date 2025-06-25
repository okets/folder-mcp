#!/usr/bin/env node

// Test script to debug keyboard input issues in the TUI

console.log("Testing keyboard input. Press keys to see if they're captured. Press Ctrl+C to exit.\n");

// Check if stdin supports raw mode
console.log("process.stdin.isTTY:", process.stdin.isTTY);
console.log("process.stdin.isRaw:", process.stdin.isRaw);
console.log("process.stdout.isTTY:", process.stdout.isTTY);

if (!process.stdin.isTTY) {
    console.error("\nERROR: stdin is not a TTY. This usually happens when:");
    console.error("- The script is run with piped input");
    console.error("- The script is run in a non-interactive environment");
    console.error("- The terminal doesn't support raw mode");
    process.exit(1);
}

// Set up raw mode
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');

console.log("\nListening for keyboard input...\n");

// Listen for keyboard input
process.stdin.on('data', (key) => {
    const keyCode = key.charCodeAt(0);
    const keyHex = key.split('').map(c => '0x' + c.charCodeAt(0).toString(16)).join(' ');
    
    console.log(`Key pressed: "${key}" (code: ${keyCode}, hex: ${keyHex})`);
    
    // Exit on Ctrl+C
    if (key === '\u0003') {
        console.log('\nExiting...');
        process.exit();
    }
    
    // Show special keys
    if (key === '\r') console.log('  -> Enter key');
    if (key === '\u001b') console.log('  -> Escape key');
    if (key === '\t') console.log('  -> Tab key');
    if (key === '\u001b[A') console.log('  -> Up arrow');
    if (key === '\u001b[B') console.log('  -> Down arrow');
    if (key === '\u001b[C') console.log('  -> Right arrow');
    if (key === '\u001b[D') console.log('  -> Left arrow');
});

// Clean up on exit
process.on('exit', () => {
    process.stdin.setRawMode(false);
    process.stdin.pause();
});