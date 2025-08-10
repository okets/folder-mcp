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
  ValidationResponseMessage,
  WSClientMessage,
  WSServerMessage,
  ModelDownloadStartMessage,
  ModelDownloadProgressMessage,
  ModelDownloadCompleteMessage,
  ModelDownloadErrorMessage
} from '../../../daemon/websocket/message-types.js';
import { DaemonConnector } from '../daemon-connector.js';

export interface FMDMConnectionStatus {
  connected: boolean;
  connecting: boolean;
  error?: string;
  retryAttempt?: number;        // Current attempt number
  nextRetryIn?: number;         // Seconds until next retry
}

export interface ModelDownloadEvent {
  modelName: string;
  status: 'downloading' | 'ready' | 'error';
  progress?: number;
  message?: string;
  estimatedTimeRemaining?: number;
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
  private modelDownloadListeners = new Set<(event: ModelDownloadEvent) => void>();
  private requests = new Map<string, (response: any) => void>();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private countdownTimer: NodeJS.Timeout | null = null;
  private isConnected = false;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = Number.MAX_SAFE_INTEGER; // Infinite retries - never give up
  private daemonConnector: DaemonConnector;
  private isReconnecting = false; // Track if we're in reconnection mode
  private nextRetryIn = 0; // Countdown in seconds
  private retryDelayMs = 0; // Current retry delay in milliseconds
  
  constructor() {
    this.daemonConnector = new DaemonConnector({
      debug: false,
      timeoutMs: 5000,
      maxRetries: 3
    });
  }

  /**
   * Connect to the daemon WebSocket server using auto-discovery
   */
  async connect(): Promise<void> {
    if (this.isConnected || this.isConnecting) {
      return;
    }

    // Only set connecting state on initial connection, not during reconnects
    if (!this.isReconnecting) {
      this.isConnecting = true;
      this.notifyStatusListeners({ connected: false, connecting: true });
    }

    try {
      // Use DaemonConnector for auto-discovery
      const { ws, connectionInfo } = await this.daemonConnector.connect();
      
      this.ws = ws;
      this.isConnected = true;
      this.isConnecting = false;
      this.isReconnecting = false;
      this.reconnectAttempts = 0;
      
      // Clear any existing reconnect timer since we're now connected
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      
      // Initialize connection with daemon
      this.ws.send(JSON.stringify({
        type: 'connection.init',
        clientType: 'tui'
      }));
      
      // Set up event handlers
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
        // Only show connecting state during active reconnection, not daemon down
        this.notifyStatusListeners({ connected: false, connecting: false });
        this.scheduleReconnect();
      });
      
      this.ws.on('error', (error) => {
        this.isConnected = false;
        this.isConnecting = false;
        this.notifyStatusListeners({ 
          connected: false, 
          connecting: false 
        });
      });
      
      this.notifyStatusListeners({ connected: true, connecting: false });
      
    } catch (error) {
      this.isConnected = false;
      this.isConnecting = false;
      
      // Don't flash connecting state during failed reconnection attempts
      if (!this.isReconnecting) {
        this.notifyStatusListeners({ 
          connected: false, 
          connecting: false 
        });
      }
      
      // Start reconnection attempts immediately for graceful daemon waiting
      this.scheduleReconnect();
      
      // Don't throw the error - this allows the TUI to start gracefully without daemon
    }
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
        
      case 'model_download_start':
        {
          const startMessage = message as ModelDownloadStartMessage;
          this.notifyModelDownloadListeners({
            modelName: startMessage.data.modelName,
            status: 'downloading',
            message: `Starting download of ${startMessage.data.modelName}...`
          });
        }
        break;
        
      case 'model_download_progress':
        {
          const progressMessage = message as ModelDownloadProgressMessage;
          const event: ModelDownloadEvent = {
            modelName: progressMessage.data.modelName,
            status: 'downloading',
            progress: progressMessage.data.progress
          };
          
          if (progressMessage.data.message) {
            event.message = progressMessage.data.message;
          }
          
          if (progressMessage.data.estimatedTimeRemaining) {
            event.estimatedTimeRemaining = progressMessage.data.estimatedTimeRemaining;
          }
          
          this.notifyModelDownloadListeners(event);
        }
        break;
        
      case 'model_download_complete':
        {
          const completeMessage = message as ModelDownloadCompleteMessage;
          this.notifyModelDownloadListeners({
            modelName: completeMessage.data.modelName,
            status: 'ready',
            progress: 100,
            message: `${completeMessage.data.modelName} download complete`
          });
        }
        break;
        
      case 'model_download_error':
        {
          const errorMessage = message as ModelDownloadErrorMessage;
          this.notifyModelDownloadListeners({
            modelName: errorMessage.data.modelName,
            status: 'error',
            error: errorMessage.data.error,
            message: `Failed to download ${errorMessage.data.modelName}: ${errorMessage.data.error}`
          });
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
   * Schedule automatic reconnection with daemon discovery
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }
    
    // Mark as reconnecting to avoid UI state flashing
    this.isReconnecting = true;
    
    this.reconnectAttempts++;
    // Smart backoff: 1s, 2s, 4s, 8s, then cap at 30s for reasonable waiting
    const delay = Math.min(1000 * Math.pow(2, Math.min(this.reconnectAttempts - 1, 4)), 30000);
    this.retryDelayMs = delay;
    this.nextRetryIn = Math.ceil(delay / 1000);
    
    // Start countdown timer
    this.startCountdown();
    
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      this.stopCountdown();
      
      // Try to connect without throwing errors
      try {
        await this.connect();
      } catch (error) {
        // Connection failed, scheduleReconnect is already called by connect() method
      }
    }, delay);
  }

  /**
   * Start countdown timer that updates retry status every second
   */
  private startCountdown(): void {
    this.stopCountdown(); // Clear any existing timer
    
    this.countdownTimer = setInterval(() => {
      this.nextRetryIn--;
      
      // Notify status listeners with updated countdown
      this.notifyStatusListeners({
        connected: false,
        connecting: false,
        retryAttempt: this.reconnectAttempts,
        nextRetryIn: Math.max(0, this.nextRetryIn)
      });
      
      // Stop countdown when it reaches 0
      if (this.nextRetryIn <= 0) {
        this.stopCountdown();
      }
    }, 1000);
    
    // Immediately notify with initial countdown
    this.notifyStatusListeners({
      connected: false,
      connecting: false,
      retryAttempt: this.reconnectAttempts,
      nextRetryIn: this.nextRetryIn
    });
  }

  /**
   * Stop countdown timer
   */
  private stopCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  /**
   * Force immediate retry (for Enter key functionality)
   */
  public retryNow(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.stopCountdown();
    
    // Attempt connection immediately
    this.connect().catch(() => {
      // Connection will schedule next retry automatically
    });
  }

  /**
   * Validate a folder path
   * Returns the raw ValidationResponseMessage from daemon
   */
  async validateFolder(path: string): Promise<ValidationResponseMessage> {
    const id = this.generateId();
    const message = {
      type: 'folder.validate' as const,
      id,
      payload: { path }
    };
    
    return await this.sendRequest(message);
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
   * Get supported models from daemon
   */
  async getModels(): Promise<{ models: string[]; backend: 'python' | 'ollama' }> {
    const id = this.generateId();
    const response = await this.sendRequest({
      type: 'models.list',
      id
    });
    return response.data;
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
   * Subscribe to model download events
   */
  subscribeToModelDownloads(listener: (event: ModelDownloadEvent) => void): () => void {
    this.modelDownloadListeners.add(listener);
    
    return () => this.modelDownloadListeners.delete(listener);
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
   * Notify all model download listeners
   */
  private notifyModelDownloadListeners(event: ModelDownloadEvent): void {
    this.modelDownloadListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in model download listener:', error);
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
      
      // Reset reconnection state
      this.isReconnecting = false;
      this.reconnectAttempts = 0;
      
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
        }, 250);
        
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