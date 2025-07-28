/**
 * FMDM Client for TUI
 * 
 * WebSocket client that connects to the daemon and provides:
 * - Real-time FMDM synchronization
 * - Folder validation operations
 * - Folder add/remove operations
 * - Auto-reconnection logic
 */

import WebSocket from 'ws';
import { FMDM } from '../../../daemon/models/fmdm.js';
import { 
  ValidationResult,
  WSClientMessage,
  WSServerMessage
} from '../../../daemon/websocket/message-types.js';

export interface FMDMConnectionStatus {
  connected: boolean;
  connecting: boolean;
  error?: string;
}

/**
 * FMDM WebSocket Client for TUI components
 */
export class FMDMClient {
  private ws: WebSocket | null = null;
  private fmdm: FMDM | null = null;
  private listeners = new Set<(fmdm: FMDM) => void>();
  private statusListeners = new Set<(status: FMDMConnectionStatus) => void>();
  private requests = new Map<string, (response: any) => void>();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnected = false;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  
  constructor(private daemonUrl: string = 'ws://127.0.0.1:31849') {}

  /**
   * Connect to the daemon WebSocket server
   */
  async connect(): Promise<void> {
    if (this.isConnected || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    this.notifyStatusListeners({ connected: false, connecting: true });

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.daemonUrl);
        
        this.ws.on('open', () => {
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          
          // Initialize connection with daemon
          this.ws!.send(JSON.stringify({
            type: 'connection.init',
            clientType: 'tui'
          }));
          
          this.notifyStatusListeners({ connected: true, connecting: false });
          resolve();
        });
        
        this.ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString()) as WSServerMessage;
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        });
        
        this.ws.on('close', () => {
          this.isConnected = false;
          this.isConnecting = false;
          this.notifyStatusListeners({ connected: false, connecting: false });
          this.scheduleReconnect();
        });
        
        this.ws.on('error', (error) => {
          this.isConnecting = false;
          this.notifyStatusListeners({ 
            connected: false, 
            connecting: false, 
            error: error.message 
          });
          reject(error);
        });
      } catch (error) {
        this.isConnecting = false;
        this.notifyStatusListeners({ 
          connected: false, 
          connecting: false, 
          error: error instanceof Error ? error.message : String(error)
        });
        reject(error);
      }
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: WSServerMessage): void {
    switch (message.type) {
      case 'fmdm.update':
        if ('fmdm' in message) {
          this.fmdm = message.fmdm;
          this.notifyListeners();
        }
        break;
        
      case 'connection.ack':
        // Connection acknowledged by daemon
        break;
        
      case 'pong':
        // Pong response to ping
        if (message.id && this.requests.has(message.id)) {
          const handler = this.requests.get(message.id)!;
          this.requests.delete(message.id);
          handler(message);
        }
        break;
        
      default:
        // Handle request responses
        if (message.id && this.requests.has(message.id)) {
          const handler = this.requests.get(message.id)!;
          this.requests.delete(message.id);
          handler(message);
        }
    }
  }

  /**
   * Schedule automatic reconnection
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000); // Exponential backoff
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => {
        // If reconnection fails, scheduleReconnect will be called again by the 'close' event
      });
    }, delay);
  }

  /**
   * Validate a folder path
   */
  async validateFolder(path: string): Promise<ValidationResult> {
    const id = this.generateId();
    return this.sendRequest({
      type: 'folder.validate',
      id,
      payload: { path }
    });
  }

  /**
   * Add a folder to monitoring
   */
  async addFolder(path: string, model: string): Promise<{ success: boolean; error?: string }> {
    const id = this.generateId();
    return this.sendRequest({
      type: 'folder.add',
      id,
      payload: { path, model }
    });
  }

  /**
   * Remove a folder from monitoring
   */
  async removeFolder(path: string): Promise<{ success: boolean; error?: string }> {
    const id = this.generateId();
    return this.sendRequest({
      type: 'folder.remove',
      id,
      payload: { path }
    });
  }

  /**
   * Send a ping to the daemon
   */
  async ping(): Promise<void> {
    const id = this.generateId();
    await this.sendRequest({
      type: 'ping',
      id
    });
  }

  /**
   * Send a request and wait for response
   */
  private sendRequest(message: WSClientMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws || !this.isConnected) {
        reject(new Error('Not connected to daemon'));
        return;
      }
      
      this.requests.set(message.id!, resolve);
      this.ws.send(JSON.stringify(message));
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.requests.has(message.id!)) {
          this.requests.delete(message.id!);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Get current FMDM state
   */
  getFMDM(): FMDM | null {
    return this.fmdm;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): FMDMConnectionStatus {
    return {
      connected: this.isConnected,
      connecting: this.isConnecting
    };
  }

  /**
   * Subscribe to FMDM updates
   */
  subscribe(listener: (fmdm: FMDM) => void): () => void {
    this.listeners.add(listener);
    
    // If we already have FMDM data, call the listener immediately
    if (this.fmdm) {
      listener(this.fmdm);
    }
    
    return () => this.listeners.delete(listener);
  }

  /**
   * Subscribe to connection status updates
   */
  subscribeToStatus(listener: (status: FMDMConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    
    // Call listener immediately with current status
    listener(this.getConnectionStatus());
    
    return () => this.statusListeners.delete(listener);
  }

  /**
   * Notify all FMDM listeners
   */
  private notifyListeners(): void {
    if (!this.fmdm) return;
    this.listeners.forEach(listener => {
      try {
        listener(this.fmdm!);
      } catch (error) {
        console.error('Error in FMDM listener:', error);
      }
    });
  }

  /**
   * Notify all status listeners
   */
  private notifyStatusListeners(status: FMDMConnectionStatus): void {
    this.statusListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Error in status listener:', error);
      }
    });
  }

  /**
   * Generate unique request ID
   */
  private generateId(): string {
    return `tui-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Disconnect from daemon
   */
  disconnect(): Promise<void> {
    return new Promise((resolve) => {
      // Clear any reconnect timers
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Wait for WebSocket to close properly
        this.ws.once('close', () => {
          this.ws = null;
          this.isConnected = false;
          this.isConnecting = false;
          resolve();
        });
        
        // Force close after a timeout to prevent hanging
        const closeTimeout = setTimeout(() => {
          if (this.ws) {
            this.ws.terminate();
            this.ws = null;
          }
          this.isConnected = false;
          this.isConnecting = false;
          resolve();
        }, 1000);
        
        this.ws.once('close', () => {
          clearTimeout(closeTimeout);
        });
        
        this.ws.close();
      } else {
        // Already closed or not connected
        this.ws = null;
        this.isConnected = false;
        this.isConnecting = false;
        resolve();
      }
    });
  }

  /**
   * Check if client is connected
   */
  isClientConnected(): boolean {
    return this.isConnected;
  }
}