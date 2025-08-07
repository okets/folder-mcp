// FMDM (Folder MCP Data Model) TypeScript Interfaces
// This file defines the structure of the FMDM object that serves as the
// single source of truth for all connected clients

/**
 * The complete FMDM object that represents the current state of the folder-mcp system
 */
export interface FMDM {
  version: string;
  folders: FolderConfig[];
  daemon: DaemonStatus;
  connections: ConnectionInfo;
  models: string[];
}

/**
 * Configuration for a single monitored folder
 */
export interface FolderConfig {
  path: string;
  model: string;
  status: FolderIndexingStatus;
  progress?: number; // Optional indexing progress percentage (0-100)
  scanningProgress?: {
    phase: 'folder-to-db' | 'db-to-folder';
    processedFiles: number;
    totalFiles: number;
    percentage: number;
  }; // Optional scanning progress during scanning phase
  errorMessage?: string; // Optional error message when status is 'error'
}

/**
 * Indexing status for a monitored folder
 */
export type FolderIndexingStatus = 
  | 'pending'      // Not yet started indexing
  | 'scanning'     // Scanning for files
  | 'ready'        // Ready to start indexing (has tasks queued)
  | 'indexing'     // Currently indexing files
  | 'indexed'      // Indexing completed successfully
  | 'active'       // Active and watching for changes
  | 'error'        // Error occurred during indexing
  | 'watching';    // Actively watching for file changes

/**
 * Current daemon process status information
 */
export interface DaemonStatus {
  pid: number;
  uptime: number;
}

/**
 * Information about active client connections
 */
export interface ConnectionInfo {
  count: number;
  clients: ClientConnection[];
}

/**
 * Details about a single connected client
 */
export interface ClientConnection {
  id: string;
  type: 'tui' | 'cli' | 'web';
  connectedAt: string;
}