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
      this.log('debug', `[WS-SERVER] New WebSocket connection received`);
      this.handleConnection(ws);
    });

    this.wss.on('error', (error) => {
      this.log('error', '[WS-SERVER-ERROR] WebSocket server error:', error);
    });

    // Subscribe to FMDM updates
    this.log('debug', `[WS-SERVER] Subscribing to FMDM updates`);
    this.fmdmUnsubscribe = this.fmdmService.subscribe((fmdm: FMDM) => {
      this.log('debug', `[WS-SERVER-FMDM] Received FMDM update, broadcasting to clients`);
      this.broadcastFMDM(fmdm);
    });

    this.isStarted = true;
    this.log('info', `[WS-SERVER] WebSocket server started on ws://127.0.0.1:${port}`);
  }

  /**
   * Stop the WebSocket server
   */
  async stop(): Promise<void> {
    if (!this.isStarted || !this.wss) {
      this.log('debug', `[WS-SERVER-STOP] Server already stopped or not started`);
      return;
    }

    this.log('info', `[WS-SERVER-STOP] Stopping WebSocket server with ${this.clients.size} connected clients`);

    // Unsubscribe from FMDM updates
    if (this.fmdmUnsubscribe) {
      this.log('debug', `[WS-SERVER-STOP] Unsubscribing from FMDM updates`);
      this.fmdmUnsubscribe();
      this.fmdmUnsubscribe = null;
    }

    // Close all client connections
    this.log('debug', `[WS-SERVER-STOP] Closing ${this.clients.size} client connections`);
    this.clients.forEach(({ ws }, clientId) => {
      this.log('debug', `[WS-SERVER-STOP] Closing connection for client ${clientId}`);
      ws.close();
    });
    this.clients.clear();

    // Close the server
    return new Promise((resolve) => {
      this.log('debug', `[WS-SERVER-STOP] Closing WebSocket server`);
      this.wss!.close(() => {
        this.isStarted = false;
        this.log('info', '[WS-SERVER-STOP] WebSocket server stopped');
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

    this.log('info', `[WS-CONNECT] Client ${clientId} connected`);

    ws.on('message', async (data) => {
      try {
        const rawMessage = data.toString();
        this.log('debug', `[WS-RAW] Client ${clientId} raw message: ${rawMessage}`);
        const message = JSON.parse(rawMessage);
        await this.handleMessage(clientId, message, ws);
      } catch (error) {
        this.log('error', `[WS-PARSE-ERROR] Error parsing message from client ${clientId}:`, error);
        this.sendError(ws, 'Invalid JSON message');
      }
    });

    ws.on('close', () => {
      this.log('info', `[WS-CLOSE] Client ${clientId} connection closed`);
      this.handleClientDisconnection(clientId);
    });

    ws.on('error', (error) => {
      this.log('error', `[WS-CLIENT-ERROR] Client ${clientId} error:`, error);
      this.handleClientDisconnection(clientId);
    });

    // Note: Don't send FMDM immediately - wait for connection.init
    // This ensures client is ready to receive and process the FMDM
    this.log('debug', `[WS-CONNECT-WAIT] Client ${clientId} connected, waiting for connection.init before sending FMDM`);
  }

  /**
   * Handle incoming message from client
   */
  private async handleMessage(clientId: string, message: any, ws: WebSocket): Promise<void> {
    this.log('debug', `[WS-IN] Client ${clientId} -> ${JSON.stringify(message)}`);

    if (!this.protocol) {
      this.log('error', `[WS-ERROR] Protocol handler not available for client ${clientId}`);
      this.sendError(ws, 'Protocol handler not available');
      return;
    }

    try {
      // Special handling for connection.init to update client type
      if (message.type === 'connection.init' && message.clientType) {
        this.log('debug', `[WS-INIT] Client ${clientId} initializing as type: ${message.clientType}`);
        const clientInfo = this.clients.get(clientId);
        if (clientInfo) {
          clientInfo.clientType = message.clientType;
          this.clients.set(clientId, clientInfo);
          this.log('debug', `[WS-INIT] Client ${clientId} type updated to ${message.clientType}`);
          
          // Send initial FMDM to newly initialized client
          if (this.fmdmService) {
            const fmdm = this.fmdmService.getFMDM();
            const fmdmMessage = createFMDMUpdateMessage(fmdm);
            this.log('debug', `[WS-FMDM-INIT] Sending initial FMDM to client ${clientId}: ${JSON.stringify(fmdmMessage)}`);
            this.sendMessage(ws, fmdmMessage);
          }
        }
      }

      // Process message through protocol handler
      this.log('debug', `[WS-PROTOCOL] Processing message from ${clientId} through protocol handler`);
      const response = await this.protocol.processMessage(clientId, message);
      
      if (response) {
        this.log('debug', `[WS-OUT] Client ${clientId} <- ${JSON.stringify(response)}`);
        this.sendMessage(ws, response);
      } else {
        this.log('debug', `[WS-PROTOCOL] No response generated for message from ${clientId}`);
      }
    } catch (error) {
      this.log('error', `[WS-ERROR] Error processing message from ${clientId}:`, error);
      const errorResponse = { type: 'error', message: 'Internal server error' };
      this.log('debug', `[WS-ERROR-OUT] Client ${clientId} <- ${JSON.stringify(errorResponse)}`);
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
      this.log('info', `[WS-DISCONNECT] Client ${clientId} disconnected (type: ${clientInfo.clientType})`);
      
      // Notify protocol handler
      if (this.protocol) {
        this.log('debug', `[WS-DISCONNECT-PROTOCOL] Notifying protocol handler of client ${clientId} disconnection`);
        this.protocol.handleClientDisconnection(clientId);
      }
    } else {
      this.log('debug', `[WS-DISCONNECT-UNKNOWN] Attempted to disconnect unknown client ${clientId}`);
    }
  }

  /**
   * Send message to specific client
   */
  private sendMessage(ws: WebSocket, message: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        const messageStr = JSON.stringify(message);
        this.log('debug', `[WS-SEND] Sending message: ${messageStr}`);
        ws.send(messageStr);
      } catch (error) {
        this.log('error', '[WS-SEND-ERROR] Failed to send message to client:', error);
      }
    } else {
      this.log('debug', `[WS-SEND-SKIP] WebSocket not open (state: ${ws.readyState}), skipping message: ${JSON.stringify(message)}`);
    }
  }

  /**
   * Send error message to client
   */
  private sendError(ws: WebSocket, error: string): void {
    const errorMessage = {
      type: 'error',
      message: error
    };
    this.log('debug', `[WS-ERROR-SEND] Sending error message: ${JSON.stringify(errorMessage)}`);
    this.sendMessage(ws, errorMessage);
  }

  /**
   * Broadcast FMDM to all connected clients
   */
  public broadcastFMDM(fmdm: FMDM): void {
    const message = createFMDMUpdateMessage(fmdm);

    this.log('debug', `[WS-BROADCAST-START] Broadcasting FMDM update to ${this.clients.size} clients: ${JSON.stringify(message)}`);
    
    let successCount = 0;
    let skipCount = 0;
    
    this.clients.forEach(({ ws }, clientId) => {
      if (ws.readyState === WebSocket.OPEN) {
        this.log('debug', `[WS-BROADCAST-CLIENT] Sending FMDM to client ${clientId}`);
        this.sendMessage(ws, message);
        successCount++;
      } else {
        this.log('debug', `[WS-BROADCAST-SKIP] Skipping client ${clientId} (WebSocket state: ${ws.readyState})`);
        skipCount++;
      }
    });

    this.log('debug', `[WS-BROADCAST-COMPLETE] FMDM broadcast complete - sent to ${successCount} clients, skipped ${skipCount} clients`);
  }

  /**
   * Broadcast arbitrary event to all connected clients
   */
  public broadcast(eventType: string, data: any): void {
    const message = {
      type: eventType,
      data,
      timestamp: new Date().toISOString()
    };

    this.log('debug', `[WS-BROADCAST-EVENT] Broadcasting event '${eventType}' to ${this.clients.size} clients`);
    
    let successCount = 0;
    let skipCount = 0;
    
    this.clients.forEach(({ ws }, clientId) => {
      if (ws.readyState === WebSocket.OPEN) {
        this.log('debug', `[WS-BROADCAST-EVENT-CLIENT] Sending event '${eventType}' to client ${clientId}`);
        this.sendMessage(ws, message);
        successCount++;
      } else {
        this.log('debug', `[WS-BROADCAST-EVENT-SKIP] Skipping client ${clientId} (WebSocket state: ${ws.readyState})`);
        skipCount++;
      }
    });

    this.log('debug', `[WS-BROADCAST-EVENT-COMPLETE] Event '${eventType}' broadcast complete - sent to ${successCount} clients, skipped ${skipCount} clients`);
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
      if (meta !== undefined) {
        this.logger[level](message, meta);
      } else {
        this.logger[level](message);
      }
    } else {
      // Fallback to console
      if (meta !== undefined) {
        console[level === 'debug' ? 'log' : level](`[WebSocket] ${message}`, meta);
      } else {
        console[level === 'debug' ? 'log' : level](`[WebSocket] ${message}`);
      }
    }
  }

  /**
   * Check if server is running
   */
  public isRunning(): boolean {
    return this.isStarted;
  }
}