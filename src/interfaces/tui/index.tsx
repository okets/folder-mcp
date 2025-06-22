#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { TUIApplication } from './TUIApplication.js';

// Launch the TUI application with explicit stdout
const { clear } = render(<TUIApplication />, {
  stdout: process.stdout,
  stdin: process.stdin
});

// Handle cleanup
process.on('SIGINT', () => {
  clear();
  // Restore terminal state
  process.stdout.write('\x1b[?25h'); // Show cursor
  process.exit(0);
});

process.on('SIGTERM', () => {
  clear();
  // Restore terminal state
  process.stdout.write('\x1b[?25h'); // Show cursor
  process.exit(0);
});