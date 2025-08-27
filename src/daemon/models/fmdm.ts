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
  models: string[]; // Legacy - will be deprecated
  curatedModels: CuratedModelInfo[]; // Enhanced model tracking
  modelCheckStatus?: ModelCheckStatus; // Status of model checks
}

/**
 * Configuration for a single monitored folder
 */
export interface FolderConfig {
  path: string;
  model: string;
  status: FolderIndexingStatus;
  progress?: number;              // INDEXING progress percentage (0-100) - files being processed
  downloadProgress?: number;      // MODEL DOWNLOAD progress percentage (0-100) - mirrors CuratedModelInfo.downloadProgress
  scanningProgress?: {
    phase: 'folder-to-db' | 'db-to-folder' | 'intelligent-scanning' | 'cleanup';
    processedFiles: number;
    totalFiles: number;
    percentage: number;
  }; // Optional scanning progress during scanning phase
  notification?: {
    message: string;
    type: 'error' | 'warning' | 'info';
  }; // Optional notification for user guidance (errors, warnings, info, etc.)
}

/**
 * Indexing status for a monitored folder
 */
export type FolderIndexingStatus = 
  | 'pending'           // Not yet started indexing
  | 'downloading-model' // Downloading required model
  | 'scanning'          // Scanning for files
  | 'ready'             // Ready to start indexing (has tasks queued)
  | 'indexing'          // Currently indexing files
  | 'indexed'           // Indexing completed successfully
  | 'active'            // Active and watching for changes
  | 'error'             // Error occurred during indexing
  | 'watching';         // Actively watching for file changes

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

/**
 * Information about a curated model's installation status and download state
 */
export interface CuratedModelInfo {
  id: string;           // e.g., 'gpu:bge-m3'
  installed: boolean;   // Whether model is downloaded/cached locally
  type: 'gpu' | 'cpu';  // Model type - GPU (HuggingFace) or CPU (ONNX)
  
  // Download tracking fields
  downloading?: boolean;          // Currently downloading
  downloadProgress?: number;      // 0-100 percentage
  downloadError?: string;         // Error message if download failed
  lastChecked?: string;          // ISO timestamp of last availability check
}

/**
 * Status information about the model checking process
 */
export interface ModelCheckStatus {
  pythonAvailable: boolean;      // Whether Python is available for GPU model checks
  gpuModelsCheckable: boolean;   // Whether GPU models could be checked
  error?: string;                // Error message if checks failed
  checkedAt: string;            // ISO timestamp of when check was performed
}