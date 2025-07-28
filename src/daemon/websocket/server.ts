// WebSocket server for daemon-client communication
// Handles client connections and message routing for FMDM architecture

import { WebSocketServer, WebSocket } from 'ws';
import { FMDM, ClientConnection } from '../models/fmdm.js';
import { WebSocketProtocol } from './protocol.js';
import { IFMDMService } from '../services/fmdm-service.js';
import { ILoggingService } from '../../di/interfaces.js';
import { createFMDMUpdateMessage } from './message-types.js';

/**
 * WebSocket server that manages client connections and broadcasts FMDM updates
 */
export class FMDMWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, { ws: WebSocket; clientType: string }>();
  private isStarted = false;
  private protocol: WebSocketProtocol | null = null;
  private fmdmUnsubscribe: (() => void) | null = null;

  constructor(
    private fmdmService?: IFMDMService,
    private logger?: ILoggingService
  ) {
    // Constructor supports DI injection but also allows manual setting
  }

  /**
   * Set dependencies (for cases where DI isn't used in constructor)
   */
  setDependencies(fmdmService: IFMDMService, protocol: WebSocketProtocol, logger: ILoggingService): void {
    this.fmdmService = fmdmService;
    this.protocol = protocol;
    this.logger = logger;
  }

  /**
   * Start the WebSocket server on the specified port
   */
  async start(port: number = 31849): Promise<void> {
    if (this.isStarted) {
      throw new Error('WebSocket server is already started');
    }

    if (!this.fmdmService || !this.protocol) {
      throw new Error('Dependencies not set. Call setDependencies() first.');
    }

    this.wss = new WebSocketServer({ 
      port,
      host: '127.0.0.1'
    });

    this.wss.on('connection', (ws: WebSocket) => {
      this.handleConnection(ws);
    });

    this.wss.on('error', (error) => {
      this.log('error', 'WebSocket server error:', error);
    });

    // Subscribe to FMDM updates
    this.fmdmUnsubscribe = this.fmdmService.subscribe((fmdm: FMDM) => {
      this.broadcastFMDM(fmdm);
    });

    this.isStarted = true;
    this.log('info', `WebSocket server started on ws://127.0.0.1:${port}`);
  }

  /**
   * Stop the WebSocket server
   */
  async stop(): Promise<void> {
    if (!this.isStarted || !this.wss) {
      return;
    }

    // Unsubscribe from FMDM updates
    if (this.fmdmUnsubscribe) {
      this.fmdmUnsubscribe();
      this.fmdmUnsubscribe = null;
    }

    // Close all client connections
    this.clients.forEach(({ ws }) => {
      ws.close();
    });
    this.clients.clear();

    // Close the server
    return new Promise((resolve) => {
      this.wss!.close(() => {
        this.isStarted = false;
        this.log('info', 'WebSocket server stopped');
        resolve();
      });
    });
  }

  /**
   * Handle new client connection
   */
  private handleConnection(ws: WebSocket): void {
    const clientId = this.generateClientId();
    this.clients.set(clientId, { ws, clientType: 'unknown' });

    this.log('info', `Client ${clientId} connected`);

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await this.handleMessage(clientId, message, ws);
      } catch (error) {
        this.log('error', `Error parsing message from client ${clientId}:`, error);
        this.sendError(ws, 'Invalid JSON message');
      }
    });

    ws.on('close', () => {
      this.handleClientDisconnection(clientId);
    });

    ws.on('error', (error) => {
      this.log('error', `Client ${clientId} error:`, error);
      this.handleClientDisconnection(clientId);
    });

    // Note: Don't send FMDM immediately - wait for connection.init
    // This ensures client is ready to receive and process the FMDM
  }

  /**
   * Handle incoming message from client
   */
  private async handleMessage(clientId: string, message: any, ws: WebSocket): Promise<void> {
    this.log('debug', `Received message from ${clientId}:`, { type: message.type });

    if (!this.protocol) {
      this.sendError(ws, 'Protocol handler not available');
      return;
    }

    try {
      // Special handling for connection.init to update client type
      if (message.type === 'connection.init' && message.clientType) {
        const clientInfo = this.clients.get(clientId);
        if (clientInfo) {
          clientInfo.clientType = message.clientType;
          this.clients.set(clientId, clientInfo);
          
          // Send initial FMDM to newly initialized client
          if (this.fmdmService) {
            const fmdm = this.fmdmService.getFMDM();
            this.sendMessage(ws, createFMDMUpdateMessage(fmdm));
            this.log('debug', `Sent initial FMDM to client ${clientId}`);
          }
        }
      }

      // Process message through protocol handler
      const response = await this.protocol.processMessage(clientId, message);
      
      if (response) {
        this.sendMessage(ws, response);
      }
    } catch (error) {
      this.log('error', `Error processing message from ${clientId}`, error);
      this.sendError(ws, 'Internal server error');
    }
  }

  /**
   * Handle client disconnection
   */
  private handleClientDisconnection(clientId: string): void {
    const clientInfo = this.clients.get(clientId);
    if (clientInfo) {
      this.clients.delete(clientId);
      this.log('info', `Client ${clientId} disconnected (type: ${clientInfo.clientType})`);
      
      // Notify protocol handler
      if (this.protocol) {
        this.protocol.handleClientDisconnection(clientId);
      }
    }
  }

  /**
   * Send message to specific client
   */
  private sendMessage(ws: WebSocket, message: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        this.log('error', 'Failed to send message to client', error);
      }
    }
  }

  /**
   * Send error message to client
   */
  private sendError(ws: WebSocket, error: string): void {
    this.sendMessage(ws, {
      type: 'error',
      message: error
    });
  }

  /**
   * Broadcast FMDM to all connected clients
   */
  public broadcastFMDM(fmdm: FMDM): void {
    const message = createFMDMUpdateMessage(fmdm);

    this.clients.forEach(({ ws }) => {
      this.sendMessage(ws, message);
    });

    this.log('debug', `Broadcasted FMDM update to ${this.clients.size} clients`);
  }

  /**
   * Get current client connections for FMDM
   */
  public getClientConnections(): ClientConnection[] {
    const connections: ClientConnection[] = [];
    this.clients.forEach(({ clientType }, clientId) => {
      connections.push({
        id: clientId,
        type: clientType as 'tui' | 'cli' | 'web',
        connectedAt: new Date().toISOString() // TODO: Track actual connection time
      });
    });
    return connections;
  }

  /**
   * Get connection count
   */
  public getConnectionCount(): number {
    return this.clients.size;
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Logging helper
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: any): void {
    if (this.logger) {
      this.logger[level](message, meta);
    } else {
      // Fallback to console
      console[level === 'debug' ? 'log' : level](`[WebSocket] ${message}`, meta || '');
    }
  }

  /**
   * Check if server is running
   */
  public isRunning(): boolean {
    return this.isStarted;
  }
}