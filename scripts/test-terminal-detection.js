#!/usr/bin/env node

/**
 * Quick Windows Terminal Detection Test
 * Tests the terminal detection logic used in the TUI fix
 */

console.log('🖥️  Windows Terminal Detection Test');
console.log('=====================================\n');

console.log('Platform Detection:');
console.log(`- Platform: ${process.platform}`);
console.log(`- Is Windows: ${process.platform === 'win32'}`);
console.log('');

console.log('TTY Support:');
console.log(`- stdin.isTTY: ${process.stdin.isTTY}`);
console.log(`- stdout.isTTY: ${process.stdout.isTTY}`);
console.log(`- stdout.columns: ${process.stdout.columns}`);
console.log(`- stdout.rows: ${process.stdout.rows}`);
console.log('');

console.log('Terminal Environment Variables:');
console.log(`- WT_SESSION: ${process.env.WT_SESSION || 'not set'}`);
console.log(`- TERM_PROGRAM: ${process.env.TERM_PROGRAM || 'not set'}`);
console.log(`- TERM: ${process.env.TERM || 'not set'}`);
console.log(`- ConEmuANSI: ${process.env.ConEmuANSI || 'not set'}`);
console.log('');

console.log('Terminal Type Detection:');
const isWindowsTerminal = !!(process.env.WT_SESSION);
const isVSCodeTerminal = process.env.TERM_PROGRAM === 'vscode';
const isModernTerminal = isWindowsTerminal || isVSCodeTerminal || process.env.TERM_PROGRAM;

console.log(`- Windows Terminal: ${isWindowsTerminal ? '✅' : '❌'}`);
console.log(`- VSCode Terminal: ${isVSCodeTerminal ? '✅' : '❌'}`);
console.log(`- Modern Terminal: ${isModernTerminal ? '✅' : '❌'}`);
console.log('');

console.log('Recommended Clearing Strategy:');
if (process.platform !== 'win32') {
    console.log('- Strategy: Unix/Linux standard (not Windows)');
} else if (isModernTerminal) {
    console.log('- Strategy: Alternate Screen Buffer (\\x1b[?1049h)');
    console.log('- Reason: Modern terminal with VT support');
} else {
    console.log('- Strategy: Enhanced Standard Clear (\\x1b[2J + \\x1b[3J)');
    console.log('- Reason: Legacy Windows terminal');
}
console.log('');

console.log('ANSI Escape Code Test:');
if (process.platform === 'win32' && process.stdout.isTTY) {
    console.log('Testing basic ANSI support...');
    
    // Test cursor hide/show
    process.stdout.write('Hiding cursor... ');
    process.stdout.write('\x1b[?25l');
    
    setTimeout(() => {
        process.stdout.write('showing cursor... ');
        process.stdout.write('\x1b[?25h');
        console.log('✅ Cursor control works');
        
        // Test screen clear
        console.log('Testing screen clear in 2 seconds...');
        setTimeout(() => {
            process.stdout.write('\x1b[2J\x1b[H');
            console.log('✅ Screen cleared - if you can read this, ANSI clearing works!');
            console.log('');
            console.log('🎯 Terminal Detection Complete');
            console.log('This information helps determine the best clearing strategy for your terminal.');
        }, 2000);
    }, 1000);
} else {
    console.log('❌ ANSI testing skipped (not Windows TTY)');
    console.log('');
    console.log('🎯 Terminal Detection Complete');
}
