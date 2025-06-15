#!/usr/bin/env node

/**
 * Main entry point for the MCP server
 * This file is a simple wrapper that calls the main server function
 */

import { main } from './mcp-server.js';

// Start the server
main().catch(console.error);
