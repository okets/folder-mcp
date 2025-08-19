/**
 * MCP Transport Wrapper
 * 
 * Handles transport-specific concerns for the MCP server.
 * 
 * IMPORTANT: Claude Desktop expects only valid JSON-RPC messages on stdout.
 * All logs MUST go to stderr only.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { ILoggingService } from '../../di/interfaces.js';

export class MCPTransport {
  private transport: StdioServerTransport;

  constructor(
    private readonly logger: ILoggingService
  ) {
    // Write log to stderr only
    process.stderr.write('[INFO] Initializing MCP stdio transport\n');
    this.logger.debug('Initializing MCP stdio transport');
    
    // Create the standard transport
    this.transport = new StdioServerTransport();
  }

  /**
   * Get the underlying transport for server connection
   */
  getTransport(): StdioServerTransport {
    return this.transport;
  }

  /**
   * Connect the transport
   */
  async connect(): Promise<void> {
    try {
      this.logger.debug('Connecting MCP transport');
      // StdioServerTransport doesn't require explicit connection
      this.logger.debug('MCP transport connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect MCP transport', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Disconnect the transport
   */
  async disconnect(): Promise<void> {
    try {
      this.logger.debug('Disconnecting MCP transport');
      // Cleanup if needed
      this.logger.debug('MCP transport disconnected');
    } catch (error) {
      this.logger.error('Error disconnecting MCP transport', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}
