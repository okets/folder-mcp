#!/usr/bin/env node

/**
 * Windows TUI Screen Stacking Fix - Testing Script
 * 
 * This script tests the Windows terminal screen clearing functionality
 * and verifies that the TUI renders without screen stacking/flickering.
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🖥️  Windows TUI Screen Stacking Fix - Test Script');
console.log('================================================\n');

// Check if we're on Windows
if (process.platform !== 'win32') {
    console.log('❌ This test script is specifically for Windows.');
    console.log('   Current platform:', process.platform);
    process.exit(1);
}

// Terminal detection
console.log('🔍 Terminal Environment Detection:');
console.log(`   Platform: ${process.platform}`);
console.log(`   Terminal Columns: ${process.stdout.columns || 'unknown'}`);
console.log(`   Terminal Rows: ${process.stdout.rows || 'unknown'}`);
console.log(`   TTY Support: ${process.stdout.isTTY ? '✅' : '❌'}`);
console.log(`   Windows Terminal: ${process.env.WT_SESSION ? '✅' : '❌'}`);
console.log(`   VSCode Terminal: ${process.env.TERM_PROGRAM === 'vscode' ? '✅' : '❌'}`);
console.log(`   TERM Program: ${process.env.TERM_PROGRAM || 'none'}`);
console.log('');

// Test ANSI escape codes
console.log('🎨 Testing ANSI Escape Code Support:');

// Test 1: Basic screen clearing
console.log('   Test 1: Basic screen clear (\\x1b[2J\\x1b[H)');
try {
    process.stdout.write('\x1b[2J\x1b[H');
    console.log('   ✅ Basic clear executed');
} catch (error) {
    console.log('   ❌ Basic clear failed:', error.message);
}

// Test 2: Cursor manipulation  
console.log('   Test 2: Cursor hide/show (\\x1b[?25l/\\x1b[?25h)');
try {
    process.stdout.write('\x1b[?25l'); // Hide cursor
    setTimeout(() => {
        process.stdout.write('\x1b[?25h'); // Show cursor
        console.log('   ✅ Cursor manipulation executed');
    }, 100);
} catch (error) {
    console.log('   ❌ Cursor manipulation failed:', error.message);
}

// Test 3: Alternate screen buffer
setTimeout(() => {
    console.log('   Test 3: Alternate screen buffer (\\x1b[?1049h/\\x1b[?1049l)');
    try {
        process.stdout.write('\x1b[?1049h'); // Switch to alternate screen
        process.stdout.write('\x1b[2J\x1b[H'); // Clear alternate screen
        
        setTimeout(() => {
            process.stdout.write('\x1b[?1049l'); // Switch back to main screen
            console.log('   ✅ Alternate screen buffer executed');
            
            // Run the actual TUI test
            runTUITest();
        }, 500);
    } catch (error) {
        console.log('   ❌ Alternate screen buffer failed:', error.message);
        runTUITest();
    }
}, 200);

function runTUITest() {
    console.log('\n🚀 Starting TUI Application Test:');
    console.log('   This will launch the folder-mcp TUI interface.');
    console.log('   Watch for:');
    console.log('   - ✅ Clean screen clearing (no stacking/accumulation)');
    console.log('   - ✅ Smooth navigation without visual artifacts');
    console.log('   - ✅ Proper text rendering without overlapping');
    console.log('   - ✅ Tab navigation works correctly');
    console.log('');
    console.log('   Press ESC to exit the TUI when done testing.');
    console.log('   Press any key to continue...');

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', () => {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        
        console.log('\n🎯 Launching TUI...\n');
        
        // Launch the TUI
        const tuiPath = path.join(__dirname, '..', '..', '..', 'dist', 'interfaces', 'tui-ink', 'index.js');
        const tui = spawn('node', [tuiPath], {
            stdio: 'inherit',
            cwd: process.cwd()
        });
        
        tui.on('close', (code) => {
            console.log('\n📊 TUI Test Complete');
            console.log(`   Exit code: ${code}`);
            
            if (code === 0) {
                console.log('   ✅ TUI exited normally');
            } else {
                console.log('   ⚠️  TUI exited with error code');
            }
            
            console.log('\n🔍 Post-Test Analysis:');
            console.log('   Did you observe any of the following issues?');
            console.log('   - Screen stacking/flickering? (❌ if yes, ✅ if no)');
            console.log('   - Text accumulation/overlapping? (❌ if yes, ✅ if no)');
            console.log('   - Navigation artifacts? (❌ if yes, ✅ if no)');
            console.log('   - Unreadable output? (❌ if yes, ✅ if no)');
            console.log('');
            console.log('💡 If you encountered any issues, please report them with:');
            console.log('   - Terminal type (Command Prompt, PowerShell, Windows Terminal)');
            console.log('   - Windows version');
            console.log('   - Specific visual behavior observed');
        });
        
        tui.on('error', (error) => {
            console.log('\n❌ Failed to launch TUI:', error.message);
            console.log('   Make sure the project is built: npm run build');
        });
    });
}
