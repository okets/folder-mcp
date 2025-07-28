/**
 * FMDM React Context
 * 
 * Provides React context for FMDM state management across TUI components.
 * Handles WebSocket connection, state synchronization, and provides hooks
 * for components to access FMDM data and operations.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { FMDM } from '../../../daemon/models/fmdm.js';
import { FMDMClient, FMDMConnectionStatus } from '../services/FMDMClient.js';
import { ValidationResult } from '../../../daemon/websocket/message-types.js';

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
  
  // Connection management
  connect: () => Promise<void>;
  disconnect: () => void;
  ping: () => Promise<void>;
  
  // Utility
  isConnected: boolean;
  isConnecting: boolean;
}

/**
 * FMDM Context
 */
const FMDMContext = createContext<FMDMContextType | null>(null);

/**
 * FMDM Provider Props
 */
export interface FMDMProviderProps {
  children: ReactNode;
  daemonUrl?: string;
  autoConnect?: boolean;
}

/**
 * FMDM Provider Component
 */
export const FMDMProvider: React.FC<FMDMProviderProps> = ({
  children,
  daemonUrl = 'ws://127.0.0.1:31849',
  autoConnect = true
}) => {
  const [client] = useState(() => new FMDMClient(daemonUrl));
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

    // Auto-connect if enabled
    if (autoConnect) {
      client.connect().catch((error) => {
        console.error('Failed to auto-connect to daemon:', error);
      });
    }

    // Cleanup subscriptions on unmount
    return () => {
      unsubscribeFMDM();
      unsubscribeStatus();
      client.disconnect();
    };
  }, [client, autoConnect]);

  // Connection management functions
  const connect = useCallback(async () => {
    await client.connect();
  }, [client]);

  const disconnect = useCallback(() => {
    client.disconnect();
  }, [client]);

  const ping = useCallback(async () => {
    await client.ping();
  }, [client]);

  // Folder operations
  const validateFolder = useCallback(async (path: string): Promise<ValidationResult> => {
    return await client.validateFolder(path);
  }, [client]);

  const addFolder = useCallback(async (path: string, model: string): Promise<{ success: boolean; error?: string }> => {
    return await client.addFolder(path, model);
  }, [client]);

  const removeFolder = useCallback(async (path: string): Promise<{ success: boolean; error?: string }> => {
    return await client.removeFolder(path);
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
    
    // Connection management
    connect,
    disconnect,
    ping,
    
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
  const { validateFolder, addFolder, removeFolder } = useFMDM();
  return {
    validateFolder,
    addFolder,
    removeFolder
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
 * Hook to get configured folders
 */
export const useConfiguredFolders = (): Array<{ path: string; model: string }> => {
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