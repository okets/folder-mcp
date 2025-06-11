/**
 * MCP Transport Abstraction
 * 
 * Provides a clean abstraction over different MCP transport mechanisms
 * (stdio, http, etc.) to support multiple connection types.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { ILoggingService } from '../../di/interfaces.js';

export interface MCPTransport {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
  getTransportType(): string;
}

export interface TransportOptions {
  server: Server;
  loggingService: ILoggingService;
  port?: number;
}

/**
 * Stdio transport implementation
 */
export class StdioTransport implements MCPTransport {
  private transport: StdioServerTransport | null = null;
  private isActive = false;

  constructor(private readonly options: TransportOptions) {}

  async start(): Promise<void> {
    if (this.isActive) {
      throw new Error('Stdio transport is already running');
    }

    try {
      this.options.loggingService.info('Starting MCP server with stdio transport');
      
      this.transport = new StdioServerTransport();
      await this.options.server.connect(this.transport);
      
      this.isActive = true;
      this.options.loggingService.info('MCP server started successfully with stdio transport');
    } catch (error) {
      this.options.loggingService.error('Failed to start stdio transport', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isActive || !this.transport) {
      return;
    }

    try {
      this.options.loggingService.info('Stopping MCP server with stdio transport');
      
      await this.options.server.close();
      this.transport = null;
      this.isActive = false;
      
      this.options.loggingService.info('MCP server stopped successfully');
    } catch (error) {
      this.options.loggingService.error('Failed to stop stdio transport', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  isRunning(): boolean {
    return this.isActive;
  }

  getTransportType(): string {
    return 'stdio';
  }
}

/**
 * HTTP transport implementation (placeholder for future implementation)
 */
export class HttpTransport implements MCPTransport {
  private isActive = false;

  constructor(
    private readonly options: TransportOptions & { port: number }
  ) {}

  async start(): Promise<void> {
    // TODO: Implement HTTP transport when MCP SDK supports it
    throw new Error('HTTP transport not yet implemented');
  }

  async stop(): Promise<void> {
    // TODO: Implement HTTP transport when MCP SDK supports it
    this.isActive = false;
  }

  isRunning(): boolean {
    return this.isActive;
  }

  getTransportType(): string {
    return 'http';
  }
}

/**
 * Transport factory for creating appropriate transport instances
 */
export class TransportFactory {
  static create(
    type: 'stdio' | 'http',
    options: TransportOptions & { port?: number }
  ): MCPTransport {
    switch (type) {
      case 'stdio':
        return new StdioTransport(options);
      case 'http':
        return new HttpTransport({
          ...options,
          port: options.port || 3000
        });
      default:
        throw new Error(`Unsupported transport type: ${type}`);
    }
  }
}
