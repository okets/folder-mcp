// WebSocket server for daemon-client communication
// Handles client connections and message routing for FMDM architecture

import { WebSocketServer, WebSocket } from 'ws';
import { FMDM, ClientConnection } from '../models/fmdm.js';
import { WebSocketProtocol } from './protocol.js';
import { IFMDMService } from '../services/fmdm-service.js';
import { ILoggingService } from '../../di/interfaces.js';
import { createFMDMUpdateMessage, createActivityEventMessage } from './message-types.js';
import { BroadcastThrottler } from './broadcast-throttler.js';
import { ActivityService } from '../services/activity-service.js';
import { serializeActivityEvent } from '../models/activity-event.js';

/**
 * WebSocket server that manages client connections and broadcasts FMDM updates
 */
export class FMDMWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, { ws: WebSocket; clientType: string }>();
  private isStarted = false;
  private protocol: WebSocketProtocol | null = null;
  private fmdmUnsubscribe: (() => void) | null = null;
  private activityUnsubscribe: (() => void) | null = null;
  private broadcastThrottler: BroadcastThrottler;
  private latestFMDM: FMDM | null = null;
  private activityService: ActivityService | undefined = undefined;

  constructor(
    private fmdmService?: IFMDMService,
    private logger?: ILoggingService
  ) {
    // Constructor supports DI injection but also allows manual setting
    
    // Initialize throttler with environment-aware config
    // For testing: faster updates (10/sec, 20ms debounce)
    // For production: conservative updates (2/sec, 100ms debounce)
    const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
    this.broadcastThrottler = new BroadcastThrottler({
      maxUpdatesPerSecond: isTestEnv ? 10 : 2,
      debounceMs: isTestEnv ? 20 : 100
    });
  }

  /**
   * Set dependencies (for cases where DI isn't used in constructor)
   */
  setDependencies(
    fmdmService: IFMDMService,
    protocol: WebSocketProtocol,
    logger: ILoggingService,
    activityService?: ActivityService
  ): void {
    this.fmdmService = fmdmService;
    this.protocol = protocol;
    this.logger = logger;
    this.activityService = activityService;

    // Set up callback to send initial FMDM when client connects
    this.protocol.setClientConnectedCallback((clientId: string) => {
      this.log('debug', `Client ${clientId} connected, sending initial state`);
      // Add small delay to ensure client is ready to receive
      setTimeout(() => {
        this.sendInitialFMDM(clientId);
      }, 10);
    });
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
      this.log('debug', `New WebSocket connection`);
      this.handleConnection(ws);
    });

    this.wss.on('error', (error) => {
      this.log('error', '[WS-SERVER-ERROR] WebSocket server error:', error);
    });

    // Subscribe to FMDM updates
    this.log('debug', `Subscribing to FMDM updates`);
    this.fmdmUnsubscribe = this.fmdmService.subscribe((fmdm: FMDM) => {
      // Progress logging disabled to reduce log noise - progress is sent via WebSocket
      // const progressFolders = fmdm.folders.filter(f => f.progress !== undefined);
      // progressFolders.forEach(f => {
      //   this.log('info', `[INDEXING] Progress: ${f.path} (${f.progress}%)`);
      // });

      // Store latest FMDM state
      this.latestFMDM = fmdm;

      // Request throttled broadcast
      this.broadcastThrottler.requestBroadcast(() => {
        if (this.latestFMDM) {
          this.broadcastFMDM(this.latestFMDM);
        }
      });
    });

    // Subscribe to activity events for real-time broadcasting
    if (this.activityService) {
      this.log('debug', `Subscribing to activity events`);
      this.activityUnsubscribe = this.activityService.subscribe((event) => {
        // Broadcast activity event to all connected clients
        const message = createActivityEventMessage(serializeActivityEvent(event));
        this.broadcastMessage(message);
      });
    }

    this.isStarted = true;
    // Log message already handled by daemon
  }

  /**
   * Stop the WebSocket server
   */
  async stop(): Promise<void> {
    if (!this.isStarted || !this.wss) {
      this.log('debug', `Server already stopped`);
      return;
    }

    this.log('debug', `Stopping WebSocket server (${this.clients.size} clients connected)`);

    // Dispose of throttler
    this.broadcastThrottler.dispose();

    // Unsubscribe from FMDM updates
    if (this.fmdmUnsubscribe) {
      this.log('debug', `Unsubscribing from FMDM updates`);
      this.fmdmUnsubscribe();
      this.fmdmUnsubscribe = null;
    }

    // Unsubscribe from activity events
    if (this.activityUnsubscribe) {
      this.log('debug', `Unsubscribing from activity events`);
      this.activityUnsubscribe();
      this.activityUnsubscribe = null;
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
    const clientInfo = { ws, clientType: 'unknown' };
    this.clients.set(clientId, clientInfo);

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
    // Skip logging ping/pong messages completely
    if (message.type !== 'ping' && message.type !== 'pong') {
      this.log('debug', `Message from ${clientId}: ${message.type}`);
    }

    if (!this.protocol) {
      this.log('error', `Protocol handler not available`);
      this.sendError(ws, 'Protocol handler not available');
      return;
    }

    try {
      // Special handling for connection.init to update client type
      if (message.type === 'connection.init' && message.clientType) {
        const clientInfo = this.clients.get(clientId);
        if (clientInfo) {
          clientInfo.clientType = message.clientType;
          (clientInfo as any).connectedAt = new Date().toISOString();
          this.clients.set(clientId, clientInfo);
          this.log('info', `[WS] ${message.clientType} client connected (${clientId})`);
        }
      }

      // Process message through protocol handler
      const response = await this.protocol.processMessage(clientId, message);
      
      if (response) {
        // Skip logging ping/pong responses
        if (response.type !== 'pong') {
          this.log('debug', `Response to ${clientId}: ${response.type}`);
        }
        this.sendMessage(ws, response);
      }
    } catch (error) {
      this.log('error', `Error processing message from ${clientId}:`, error);
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
        const messageStr = JSON.stringify(message);
        ws.send(messageStr);
      } catch (error) {
        this.log('error', 'Failed to send message to client:', error);
      }
    } else {
      this.log('debug', `WebSocket not open (state: ${ws.readyState}), skipping message`);
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
    this.sendMessage(ws, errorMessage);
  }

  /**
   * Send initial FMDM state to a newly connected client
   */
  public sendInitialFMDM(clientId: string): void {
    const clientInfo = this.clients.get(clientId);
    if (!clientInfo) {
      this.log('warn', `Client ${clientId} not found`);
      return;
    }

    if (!this.fmdmService) {
      this.log('error', 'FMDM service not available');
      return;
    }

    // Get current FMDM state and send immediately (bypass throttling)
    const currentFMDM = this.fmdmService.getFMDM();
    const message = createFMDMUpdateMessage(currentFMDM);
    
    this.log('debug', `Sending initial state to ${clientId} (${currentFMDM.folders.length} folders)`);
    this.sendMessage(clientInfo.ws, message);
  }

  /**
   * Broadcast FMDM to all connected clients
   */
  public broadcastFMDM(fmdm: FMDM): void {
    const message = createFMDMUpdateMessage(fmdm);
    let successCount = 0;

    this.clients.forEach(({ ws }) => {
      if (ws.readyState === WebSocket.OPEN) {
        this.sendMessage(ws, message);
        successCount++;
      }
    });

    if (successCount > 0) {
      this.log('debug', `Broadcast update to ${successCount} client${successCount > 1 ? 's' : ''}`);
    }
  }

  /**
   * Broadcast a typed message to all connected clients
   * Used for activity events and other real-time updates
   */
  public broadcastMessage(message: any): void {
    let successCount = 0;

    this.clients.forEach(({ ws }) => {
      if (ws.readyState === WebSocket.OPEN) {
        this.sendMessage(ws, message);
        successCount++;
      }
    });

    if (successCount > 0 && message.type) {
      this.log('debug', `Broadcast '${message.type}' to ${successCount} client${successCount > 1 ? 's' : ''}`);
    }
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

    let successCount = 0;
    
    this.clients.forEach(({ ws }) => {
      if (ws.readyState === WebSocket.OPEN) {
        this.sendMessage(ws, message);
        successCount++;
      }
    });

    if (successCount > 0) {
      this.log('debug', `Broadcast event '${eventType}' to ${successCount} client${successCount > 1 ? 's' : ''}`);
    }
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