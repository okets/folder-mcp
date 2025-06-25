#!/usr/bin/env node

// Search for the duplicate key pattern in the error
import { execSync } from 'child_process';

console.log("Running TUI to capture full error...\n");

try {
    // Run the TUI and capture stderr
    execSync('npm run tui', {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 2000
    });
} catch (error) {
    // Extract the error output
    const errorOutput = error.stderr ? error.stderr.toString() : error.stdout ? error.stdout.toString() : '';
    
    // Look for the duplicate key error
    const keyMatch = errorOutput.match(/Encountered two children with the same key[,\s]+[`"']([^`"']+)[`"']/);
    
    if (keyMatch) {
        console.log("DUPLICATE KEY FOUND:", keyMatch[1]);
    } else {
        console.log("Could not extract the specific duplicate key from error.");
        console.log("\nFull error output:");
        console.log(errorOutput.substring(0, 500));
    }
}