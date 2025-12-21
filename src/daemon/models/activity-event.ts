/**
 * Activity Event Data Model
 *
 * Represents events shown in the Activity Log screen.
 * These are user-facing events, not internal debug logs.
 *
 * @see Phase-11-Sprint-4-Activity-Log-Screen.md
 */

/**
 * Activity type determines the icon displayed
 */
export type ActivityType =
  | 'indexing'    // Folder/file operations
  | 'search'      // MCP/LLM interactions
  | 'connection'  // Client connect/disconnect
  | 'model'       // Embedding model operations
  | 'system'      // Daemon lifecycle
  | 'error';      // Error states

/**
 * Activity level determines the status indicator color
 */
export type ActivityLevel =
  | 'info'     // Neutral (blue)
  | 'success'  // Completed (green)
  | 'warning'  // Attention (orange)
  | 'error';   // Failed (red)

/**
 * Log level for future filtering (not implemented yet)
 * We start by showing everything (Full mode)
 */
export type LogLevel = 'full' | 'important';

/**
 * Activity event shown in the Activity Log
 */
export interface ActivityEvent {
  /** UUID for React keys and deduplication */
  id: string;

  /** When the event occurred */
  timestamp: Date;

  /** Determines the icon displayed */
  type: ActivityType;

  /** Determines status indicator color */
  level: ActivityLevel;

  /** Main text shown in collapsed view */
  message: string;

  /** 0-100 for progress bar, undefined for instant events */
  progress?: number;

  /**
   * true = user-initiated action (LLM query, folder add, etc.)
   * false = routine daemon activity (periodic re-index, health check, etc.)
   * Used for future "Important" filter mode
   */
  userInitiated: boolean;

  /**
   * Additional detail lines shown when expanded
   * Each string is one line (e.g., "Duration: 2m 15s")
   */
  details?: string[];
}

/**
 * Event input for ActivityService.emit()
 * id and timestamp are auto-generated
 */
export type ActivityEventInput = Omit<ActivityEvent, 'id' | 'timestamp'>;

/**
 * Serialized form for WebSocket transmission
 * timestamp is ISO string instead of Date
 */
export interface SerializedActivityEvent {
  id: string;
  timestamp: string;  // ISO 8601 format
  type: ActivityType;
  level: ActivityLevel;
  message: string;
  progress?: number;
  userInitiated: boolean;
  details?: string[];
}

/**
 * Convert ActivityEvent to serialized form for WebSocket
 */
export function serializeActivityEvent(event: ActivityEvent): SerializedActivityEvent {
  return {
    ...event,
    timestamp: event.timestamp.toISOString(),
  };
}

/**
 * Convert serialized form back to ActivityEvent
 */
export function deserializeActivityEvent(serialized: SerializedActivityEvent): ActivityEvent {
  return {
    ...serialized,
    timestamp: new Date(serialized.timestamp),
  };
}
