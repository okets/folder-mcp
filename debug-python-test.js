#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('Testing Python JSON-RPC communication...');

const pythonProcess = spawn('python3', [
  'src/infrastructure/embeddings/python/main.py',
  'all-MiniLM-L6-v2'
], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let buffer = '';

pythonProcess.stdout.on('data', (data) => {
  const chunk = data.toString();
  console.log('STDOUT received:', JSON.stringify(chunk));
  
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  
  for (const line of lines) {
    if (line.trim()) {
      console.log('Complete line:', JSON.stringify(line.trim()));
      try {
        const parsed = JSON.parse(line.trim());
        console.log('Parsed JSON:', parsed);
      } catch (e) {
        console.log('Not JSON:', line.trim());
      }
    }
  }
});

pythonProcess.stderr.on('data', (data) => {
  console.log('STDERR:', data.toString().trim());
});

pythonProcess.on('close', (code) => {
  console.log('Python process closed with code:', code);
});

// Wait for process to start
setTimeout(() => {
  console.log('Sending health check request...');
  const request = {
    jsonrpc: '2.0',
    method: 'health_check',
    params: {},
    id: 'test_1'
  };
  
  pythonProcess.stdin.write(JSON.stringify(request) + '\n');
}, 3000);

// Keep alive
setTimeout(() => {
  console.log('Terminating...');
  pythonProcess.kill();
}, 10000);