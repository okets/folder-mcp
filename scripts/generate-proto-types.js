#!/usr/bin/env node

/**
 * Generate TypeScript types from Protocol Buffer definitions
 */

import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const protoDir = join(rootDir, 'proto');
const outputDir = join(rootDir, 'src', 'generated');

// Ensure output directory exists
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

// Generate TypeScript definitions using protobufjs-cli
const cmd = `npx pbjs -t static-module -w es6 -o ${join(outputDir, 'folder-mcp.js')} ${join(protoDir, 'folder-mcp.proto')} && npx pbts -o ${join(outputDir, 'folder-mcp.d.ts')} ${join(outputDir, 'folder-mcp.js')}`;

console.log('Generating TypeScript types from Protocol Buffers...');
console.log('Command:', cmd);

exec(cmd, (error, stdout, stderr) => {
  if (error) {
    console.error('Error generating proto types:', error);
    process.exit(1);
  }
  
  if (stderr) {
    console.warn('Warnings:', stderr);
  }
  
  if (stdout) {
    console.log(stdout);
  }
  
  console.log('✅ TypeScript types generated successfully in src/generated/');
});
