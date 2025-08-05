/**
 * FMDM React Context
 * 
 * Provides React context for FMDM state management across TUI components.
 * Handles WebSocket connection, state synchronization, and provides hooks
 * for components to access FMDM data and operations.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { FMDM, FolderConfig } from '../../../daemon/models/fmdm.js';
import { registerCleanupHandler, unregisterCleanupHandler } from '../utils/cleanup.js';
import { FMDMClient, FMDMConnectionStatus, ModelDownloadEvent } from '../services/FMDMClient.js';

// Export types for use in other components
export type { ModelDownloadEvent } from '../services/FMDMClient.js';
import { ValidationResult, createValidationResult } from '../components/core/ValidationState.js';
import { ValidationResponseMessage } from '../../../daemon/websocket/message-types.js';

/**
 * FMDM Context interface
 */
export interface FMDMContextType {
  // FMDM State
  fmdm: FMDM | null;
  connectionStatus: FMDMConnectionStatus;
  
  // Operations
  validateFolder: (path: string) => Promise<ValidationResult>;
  addFolder: (path: string, model: string) => Promise<{ success: boolean; error?: string }>;
  removeFolder: (path: string) => Promise<{ success: boolean; error?: string }>;
  getModels: () => Promise<{ models: string[]; backend: 'python' | 'ollama' }>;
  
  // Connection management
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  ping: () => Promise<void>;
  
  // Model download events
  subscribeToModelDownloads: (listener: (event: ModelDownloadEvent) => void) => () => void;
  
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
      // Unregister cleanup handler to prevent accumulation
      unregisterCleanupHandler(cleanupHandler);
      // Properly disconnect WebSocket (fire and forget for cleanup)
      client.disconnect().catch((error) => {
        console.error('Error disconnecting FMDM client:', error);
      });
    };
  }, [client, autoConnect]);

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

  // Model download subscription
  const subscribeToModelDownloads = useCallback((listener: (event: ModelDownloadEvent) => void) => {
    return client.subscribeToModelDownloads(listener);
  }, [client]);

  // Computed properties
  const isConnected = connectionStatus.connected;
  const isConnecting = connectionStatus.connecting;

  const contextValue: FMDMContextType = {
    // State
    fmdm,
    connectionStatus,
    
    // Operations
    validateFolder,
    addFolder,
    removeFolder,
    getModels,
    
    // Connection management
    connect,
    disconnect,
    ping,
    
    // Model download events
    subscribeToModelDownloads,
    
    // Utility
    isConnected,
    isConnecting
  };

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
 */
export const useFMDMOperations = () => {
  const { validateFolder, addFolder, removeFolder, getModels } = useFMDM();
  return {
    validateFolder,
    addFolder,
    removeFolder,
    getModels
  };
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