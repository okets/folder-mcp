/**
 * Throttler for WebSocket broadcasts to prevent overwhelming clients
 * Ensures clients receive rate-limited updates while FMDM stays current
 */

export interface ThrottlerConfig {
  maxUpdatesPerSecond: number;
  debounceMs: number;
}

export class BroadcastThrottler {
  private lastBroadcastTime: number = 0;
  private pendingBroadcast: (() => void) | null = null;
  private throttleTimer: NodeJS.Timeout | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  
  // Calculate interval from rate
  private readonly updateInterval: number;

  constructor(private config: ThrottlerConfig) {
    this.updateInterval = 1000 / config.maxUpdatesPerSecond;
  }

  /**
   * Request a broadcast (may be throttled)
   */
  requestBroadcast(broadcastFn: () => void): void {
    const now = Date.now();
    const timeSinceLastBroadcast = now - this.lastBroadcastTime;
    
    // Clear existing debounce timer - we have a new update
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    // Can we broadcast immediately?
    if (timeSinceLastBroadcast >= this.updateInterval) {
      // Clear any pending throttle timer
      if (this.throttleTimer) {
        clearTimeout(this.throttleTimer);
        this.throttleTimer = null;
        this.pendingBroadcast = null;
      }
      
      // Broadcast immediately
      this.performBroadcast(broadcastFn);
    } else {
      // Store the latest broadcast function
      this.pendingBroadcast = broadcastFn;
      
      // Schedule for next allowed time if not already scheduled
      if (!this.throttleTimer) {
        const delay = this.updateInterval - timeSinceLastBroadcast;
        this.throttleTimer = setTimeout(() => {
          this.throttleTimer = null;
          if (this.pendingBroadcast) {
            this.performBroadcast(this.pendingBroadcast);
            this.pendingBroadcast = null;
          }
        }, delay);
      }
    }
    
    // Always set a debounce timer to ensure final state is broadcast
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      
      // Clear throttle timer if still pending
      if (this.throttleTimer) {
        clearTimeout(this.throttleTimer);
        this.throttleTimer = null;
      }
      
      // Broadcast the final state
      if (this.pendingBroadcast) {
        this.performBroadcast(this.pendingBroadcast);
        this.pendingBroadcast = null;
      } else {
        // Even if no pending broadcast, ensure we send current state
        this.performBroadcast(broadcastFn);
      }
    }, this.config.debounceMs);
  }

  /**
   * Force an immediate broadcast (bypasses throttling)
   */
  forceBroadcast(broadcastFn: () => void): void {
    // Cancel any pending timers
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    this.pendingBroadcast = null;
    this.performBroadcast(broadcastFn);
  }

  /**
   * Clean up timers
   */
  dispose(): void {
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = null;
    }
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    this.pendingBroadcast = null;
  }

  private performBroadcast(broadcastFn: () => void): void {
    this.lastBroadcastTime = Date.now();
    broadcastFn();
  }
}