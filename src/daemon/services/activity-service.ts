/**
 * Activity Service
 *
 * Manages activity events for the Activity Log screen.
 * - Ring buffer storage (500 events max, in-memory only)
 * - Pub/sub for real-time updates
 * - History retrieval for new clients
 *
 * @see Phase-11-Sprint-4-Activity-Log-Screen.md
 */

import { randomUUID } from 'crypto';
import {
  ActivityEvent,
  ActivityEventInput,
  SerializedActivityEvent,
  serializeActivityEvent,
} from '../models/activity-event.js';

/**
 * Callback for activity event subscribers
 */
export type ActivityEventCallback = (event: ActivityEvent) => void;

/**
 * Service for managing activity events
 */
export class ActivityService {
  /** Ring buffer of recent events (newest first) */
  private buffer: ActivityEvent[] = [];

  /** Maximum number of events to keep */
  private readonly maxSize: number;

  /** Subscribers for real-time updates */
  private subscribers: Set<ActivityEventCallback> = new Set();

  constructor(maxSize: number = 500) {
    this.maxSize = maxSize;
  }

  /**
   * Emit a new activity event
   * Auto-generates id and timestamp
   *
   * @param input Event data without id/timestamp
   * @returns The complete event with id and timestamp
   */
  emit(input: ActivityEventInput): ActivityEvent {
    const event: ActivityEvent = {
      ...input,
      id: randomUUID(),
      timestamp: new Date(),
    };

    // Add to front of buffer (newest first)
    this.buffer.unshift(event);

    // Trim buffer if over max size
    if (this.buffer.length > this.maxSize) {
      this.buffer.pop();
    }

    // Notify all subscribers
    this.notifySubscribers(event);

    return event;
  }

  /**
   * Get recent events from the buffer
   *
   * @param limit Maximum number of events to return (default: 100)
   * @returns Array of events, newest first
   */
  getRecent(limit: number = 100): ActivityEvent[] {
    return this.buffer.slice(0, Math.min(limit, this.buffer.length));
  }

  /**
   * Get recent events in serialized form (for WebSocket)
   *
   * @param limit Maximum number of events to return
   * @returns Array of serialized events, newest first
   */
  getRecentSerialized(limit: number = 100): SerializedActivityEvent[] {
    return this.getRecent(limit).map(serializeActivityEvent);
  }

  /**
   * Subscribe to new activity events
   *
   * @param callback Function called when new event is emitted
   * @returns Unsubscribe function
   */
  subscribe(callback: ActivityEventCallback): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Get current buffer size
   */
  get size(): number {
    return this.buffer.length;
  }

  /**
   * Clear all events (mainly for testing)
   */
  clear(): void {
    this.buffer = [];
  }

  /**
   * Notify all subscribers of a new event
   */
  private notifySubscribers(event: ActivityEvent): void {
    this.subscribers.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        // Don't let one subscriber's error affect others
        console.error('[ActivityService] Subscriber error:', error);
      }
    });
  }
}

/**
 * Singleton instance for the daemon
 * Created lazily when first accessed
 */
let _instance: ActivityService | null = null;

/**
 * Get the singleton ActivityService instance
 */
export function getActivityService(): ActivityService {
  if (!_instance) {
    _instance = new ActivityService();
  }
  return _instance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetActivityService(): void {
  _instance = null;
}
