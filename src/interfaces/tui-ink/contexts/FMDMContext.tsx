/**
 * FMDM React Context
 * 
 * Provides React context for FMDM state management across TUI components.
 * Handles WebSocket connection, state synchronization, and provides hooks
 * for components to access FMDM data and operations.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react';
import { FMDM, FolderConfig } from '../../../daemon/models/fmdm.js';
import { registerCleanupHandler, unregisterCleanupHandler } from '../utils/cleanup.js';
import { FMDMClient, FMDMConnectionStatus, ModelDownloadEvent, SetDefaultModelResult } from '../services/FMDMClient.js';
import { SerializedActivityEvent } from '../../../daemon/models/activity-event.js';

// Export types for use in other components
export type { ModelDownloadEvent } from '../services/FMDMClient.js';
export type { SerializedActivityEvent } from '../../../daemon/models/activity-event.js';
import { ValidationResult, createValidationResult } from '../components/core/ValidationState.js';
import { ValidationResponseMessage } from '../../../daemon/websocket/message-types.js';

/**
 * Deduplicate activity events by correlationId
 * Keeps only the latest event per correlationId (highest timestamp)
 * Events without correlationId are kept as-is
 */
function deduplicateByCorrelationId(events: SerializedActivityEvent[]): SerializedActivityEvent[] {
  const byCorrelationId = new Map<string, SerializedActivityEvent>();
  const noCorrelationId: SerializedActivityEvent[] = [];

  for (const event of events) {
    if (event.correlationId) {
      const existing = byCorrelationId.get(event.correlationId);
      if (!existing || new Date(event.timestamp) > new Date(existing.timestamp)) {
        byCorrelationId.set(event.correlationId, event);
      }
    } else {
      noCorrelationId.push(event);
    }
  }

  // Combine deduplicated events with non-correlated events
  return [...byCorrelationId.values(), ...noCorrelationId];
}

/**
 * FMDM Context interface
 */
export interface FMDMContextType {
  // FMDM State
  fmdm: FMDM | null;
  connectionStatus: FMDMConnectionStatus;

  // Activity Events (Progress River model)
  activityEvents: SerializedActivityEvent[];

  // Operations
  validateFolder: (path: string) => Promise<ValidationResult>;
  addFolder: (path: string, model: string) => Promise<{ success: boolean; error?: string }>;
  removeFolder: (path: string) => Promise<{ success: boolean; error?: string }>;
  getModels: () => Promise<{ models: string[]; backend: 'python' | 'ollama' }>;
  setDefaultModel: (modelId: string, languages?: string[]) => Promise<SetDefaultModelResult>;

  // Connection management
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  ping: () => Promise<void>;
  retryNow: () => void;

  // Model download events
  subscribeToModelDownloads: (listener: (event: ModelDownloadEvent) => void) => () => void;

  // Activity events subscription (for components that need raw event stream)
  subscribeToActivity: (listener: (event: SerializedActivityEvent) => void) => () => void;

  // Utility
  isConnected: boolean;
  isConnecting: boolean;
}

/**
 * FMDM Context
 */
export const FMDMContext = createContext<FMDMContextType | null>(null);

/**
 * FMDM Provider Props
 */
export interface FMDMProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
}

/**
 * FMDM Provider Component
 */
export const FMDMProvider: React.FC<FMDMProviderProps> = ({
  children,
  autoConnect = true
}) => {
  const [client] = useState(() => new FMDMClient());
  const [fmdm, setFMDM] = useState<FMDM | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<FMDMConnectionStatus>({
    connected: false,
    connecting: false
  });
  const [activityEvents, setActivityEvents] = useState<SerializedActivityEvent[]>([]);
  const historyFetched = useRef(false);

  // Initialize client and subscriptions
  useEffect(() => {
    // Subscribe to FMDM updates
    const unsubscribeFMDM = client.subscribe((newFMDM: FMDM) => {
      setFMDM(newFMDM);
    });

    // Subscribe to connection status updates
    const unsubscribeStatus = client.subscribeToStatus((status: FMDMConnectionStatus) => {
      setConnectionStatus(status);
    });

    // Subscribe to activity events - merge new events into state
    const unsubscribeActivity = client.subscribeToActivity((event: SerializedActivityEvent) => {
      setActivityEvents(prev => {
        // For events with correlationId, find and replace any existing event with same correlationId
        // This handles both progress updates AND completion events replacing in-progress events
        if (event.correlationId) {
          const existingIndex = prev.findIndex(e => e.correlationId === event.correlationId);
          if (existingIndex >= 0) {
            // Replace existing event with updated/completed one
            const updated = [...prev];
            updated[existingIndex] = event;
            return updated;
          }
        }

        // Check by ID as fallback
        const existingIndex = prev.findIndex(e => e.id === event.id);
        if (existingIndex >= 0) {
          // Replace existing event with updated one
          const updated = [...prev];
          updated[existingIndex] = event;
          return updated;
        }

        // New event - add to array
        return [...prev, event];
      });
    });

    // Auto-connect if enabled - graceful connection without error throwing
    if (autoConnect) {
      client.connect().catch(() => {
        // Graceful handling - connection errors are handled internally by FMDMClient
        // The client will automatically retry with daemon discovery
      });
    }

    // Register global cleanup handler for proper exit handling
    const cleanupHandler = async () => {
      await client.disconnect();
    };
    registerCleanupHandler(cleanupHandler);

    // Cleanup subscriptions on unmount
    return () => {
      unsubscribeFMDM();
      unsubscribeStatus();
      unsubscribeActivity();
      // Unregister cleanup handler to prevent accumulation
      unregisterCleanupHandler(cleanupHandler);
      // Properly disconnect WebSocket (fire and forget for cleanup)
      client.disconnect().catch((error) => {
        console.error('Error disconnecting FMDM client:', error);
      });
    };
  }, [client, autoConnect]);

  // Fetch activity history when connected
  useEffect(() => {
    if (connectionStatus.connected && !historyFetched.current) {
      historyFetched.current = true;
      client.requestActivityHistory(100)
        .then(events => {
          // Deduplicate history by correlationId - keep only the latest event per correlationId
          // This handles multiple progress updates (10%, 20%, etc.) stored in history
          const deduped = deduplicateByCorrelationId(events);
          setActivityEvents(deduped);
        })
        .catch(error => {
          console.error('Failed to fetch activity history:', error);
        });
    }

    // Reset history fetched flag when disconnected
    if (!connectionStatus.connected) {
      historyFetched.current = false;
    }
  }, [connectionStatus.connected, client]);

  // Connection management functions
  const connect = useCallback(async () => {
    await client.connect();
  }, [client]);

  const disconnect = useCallback(async () => {
    await client.disconnect();
  }, [client]);

  const ping = useCallback(async () => {
    await client.ping();
  }, [client]);

  // Folder operations
  const validateFolder = useCallback(async (path: string): Promise<ValidationResult> => {
    const daemonResult: ValidationResponseMessage = await client.validateFolder(path);
    
    // Convert daemon ValidationResponseMessage to TUI ValidationResult
    if (!daemonResult.valid) {
      // Has errors
      const errorMessage = daemonResult.errors.length > 0 
        ? daemonResult.errors[0]!.message
        : 'Folder validation failed';
      return createValidationResult(false, errorMessage);
    } else if (daemonResult.warnings.length > 0) {
      // Valid but has warnings
      const warningMessage = daemonResult.warnings[0]!.message;
      return createValidationResult(true, undefined, warningMessage);
    } else {
      // Valid with no warnings
      return createValidationResult(true);
    }
  }, [client]);

  const addFolder = useCallback(async (path: string, model: string): Promise<{ success: boolean; error?: string }> => {
    return await client.addFolder(path, model);
  }, [client]);

  const removeFolder = useCallback(async (path: string): Promise<{ success: boolean; error?: string }> => {
    return await client.removeFolder(path);
  }, [client]);

  const getModels = useCallback(async (): Promise<{ models: string[]; backend: 'python' | 'ollama' }> => {
    return await client.getModels();
  }, [client]);

  const setDefaultModel = useCallback(async (modelId: string, languages?: string[]): Promise<{ success: boolean; defaultModel?: { modelId: string; source: string; languages?: string[] }; error?: string }> => {
    return await client.setDefaultModel(modelId, languages);
  }, [client]);

  // Model download subscription
  const subscribeToModelDownloads = useCallback((listener: (event: ModelDownloadEvent) => void) => {
    return client.subscribeToModelDownloads(listener);
  }, [client]);

  // Activity events subscription
  const subscribeToActivity = useCallback((listener: (event: SerializedActivityEvent) => void) => {
    return client.subscribeToActivity(listener);
  }, [client]);

  // Manual retry
  const retryNow = useCallback(() => {
    client.retryNow();
  }, [client]);

  // Computed properties
  const isConnected = connectionStatus.connected;
  const isConnecting = connectionStatus.connecting;

  // Memoize context value to prevent unnecessary re-renders of all consumers
  const contextValue: FMDMContextType = React.useMemo(() => ({
    // State
    fmdm,
    connectionStatus,

    // Activity Events
    activityEvents,

    // Operations
    validateFolder,
    addFolder,
    removeFolder,
    getModels,
    setDefaultModel,

    // Connection management
    connect,
    disconnect,
    ping,
    retryNow,

    // Model download events
    subscribeToModelDownloads,

    // Activity events subscription
    subscribeToActivity,

    // Utility
    isConnected,
    isConnecting
  }), [
    fmdm,
    connectionStatus,
    activityEvents,
    validateFolder,
    addFolder,
    removeFolder,
    getModels,
    setDefaultModel,
    connect,
    disconnect,
    ping,
    retryNow,
    subscribeToModelDownloads,
    subscribeToActivity,
    isConnected,
    isConnecting
  ]);

  return (
    <FMDMContext.Provider value={contextValue}>
      {children}
    </FMDMContext.Provider>
  );
};

/**
 * Hook to access FMDM context
 */
export const useFMDM = (): FMDMContextType => {
  const context = useContext(FMDMContext);
  if (!context) {
    throw new Error('useFMDM must be used within an FMDMProvider');
  }
  return context;
};

/**
 * Hook to access FMDM state only
 */
export const useFMDMState = (): FMDM | null => {
  const { fmdm } = useFMDM();
  return fmdm;
};

/**
 * Hook to access connection status only
 */
export const useFMDMConnection = (): FMDMConnectionStatus => {
  const { connectionStatus } = useFMDM();
  return connectionStatus;
};

/**
 * Hook to access folder operations only
 * Note: setDefaultModel is intentionally excluded as it's not a folder operation
 */
export const useFMDMFolderOperations = () => {
  const { validateFolder, addFolder, removeFolder, getModels } = useFMDM();

  // Memoize operations object to prevent unnecessary re-renders
  return React.useMemo(() => ({
    validateFolder,
    addFolder,
    removeFolder,
    getModels
  }), [validateFolder, addFolder, removeFolder, getModels]);
};

/**
 * Hook to check if daemon is connected
 */
export const useIsDaemonConnected = (): boolean => {
  const { isConnected } = useFMDM();
  return isConnected;
};

/**
 * Hook to get configured folders with complete information
 */
export const useConfiguredFolders = (): FolderConfig[] => {
  const { fmdm } = useFMDM();
  return fmdm?.folders || [];
};

/**
 * Hook to check if a folder is configured
 */
export const useIsFolderConfigured = (path: string): boolean => {
  const folders = useConfiguredFolders();
  return folders.some(folder => folder.path === path);
};

/**
 * Hook to get folder configuration
 */
export const useFolderConfig = (path: string): { path: string; model: string } | null => {
  const folders = useConfiguredFolders();
  return folders.find(folder => folder.path === path) || null;
};

/**
 * Hook to subscribe to model download events
 */
export const useModelDownloadEvents = (): {
  subscribeToModelDownloads: (listener: (event: ModelDownloadEvent) => void) => () => void;
} => {
  const { subscribeToModelDownloads } = useFMDM();
  return { subscribeToModelDownloads };
};

/**
 * Hook to access activity events with Progress River sorting
 *
 * The Progress River model:
 * - Items with progress < 100% float to top (in-progress)
 * - Items with progress === 100% or undefined flow downstream (history)
 * - All items sorted newest-first within their category
 * - Completed items use their END time (completion timestamp)
 */
export const useActivityEvents = (): SerializedActivityEvent[] => {
  const { activityEvents } = useFMDM();

  // Sort using Progress River model
  return React.useMemo(() => {
    return [...activityEvents].sort((a, b) => {
      const aInProgress = a.progress !== undefined && a.progress < 100;
      const bInProgress = b.progress !== undefined && b.progress < 100;

      // In-progress items float to top
      if (aInProgress && !bInProgress) return -1;
      if (!aInProgress && bInProgress) return 1;

      // Within same category, sort by timestamp (newest first)
      // For completed items, daemon emits with completion timestamp
      // For in-progress items, use event timestamp (start time)
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [activityEvents]);
};

/**
 * Hook to subscribe to raw activity events (for components that need the stream)
 */
export const useActivitySubscription = (): {
  subscribeToActivity: (listener: (event: SerializedActivityEvent) => void) => () => void;
} => {
  const { subscribeToActivity } = useFMDM();
  return { subscribeToActivity };
};