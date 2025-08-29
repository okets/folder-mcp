/**
 * WebSocket Message Protocol Types
 * 
 * Defines the complete message protocol for client-daemon communication
 * in the FMDM architecture. These types ensure type safety and clear
 * communication between TUI/CLI clients and the daemon.
 */

import { FMDM } from '../models/fmdm.js';

// =============================================================================
// Client → Daemon Messages
// =============================================================================

/**
 * Base interface for all client messages
 */
export interface WSClientMessageBase {
  type: string;
  id?: string; // Correlation ID for request-response pattern
}

/**
 * Connection initialization message
 */
export interface ConnectionInitMessage extends WSClientMessageBase {
  type: 'connection.init';
  clientType: 'tui' | 'cli' | 'web';
}

/**
 * Folder validation request
 */
export interface FolderValidateMessage extends WSClientMessageBase {
  type: 'folder.validate';
  id: string; // Required for correlation
  payload: {
    path: string;
  };
}

/**
 * Add folder request
 */
export interface FolderAddMessage extends WSClientMessageBase {
  type: 'folder.add';
  id: string; // Required for correlation
  payload: {
    path: string;
    model: string;
  };
}

/**
 * Remove folder request
 */
export interface FolderRemoveMessage extends WSClientMessageBase {
  type: 'folder.remove';
  id: string; // Required for correlation
  payload: {
    path: string;
  };
}

/**
 * Heartbeat/ping message
 */
export interface PingMessage extends WSClientMessageBase {
  type: 'ping';
  id: string; // Required for correlation
}

/**
 * Model list request message
 */
export interface ModelListMessage extends WSClientMessageBase {
  type: 'models.list';
  id: string; // Required for correlation
}

/**
 * Model recommendation request message
 */
export interface ModelRecommendMessage extends WSClientMessageBase {
  type: 'models.recommend';
  id: string; // Required for correlation
  payload: {
    languages: string[];
    mode: 'assisted' | 'manual';
  };
}

/**
 * Get folders configuration request message
 * For Phase 9 - Sprint 1 Task 1: MCP server to get configured folders from daemon
 */
export interface GetFoldersConfigMessage extends WSClientMessageBase {
  type: 'getFoldersConfig';
  id: string; // Required for correlation
}

/**
 * Get server info request message
 * For Phase 9 - Sprint 1 Task 3: Simple hello world endpoint with basic system info
 */
export interface GetServerInfoMessage extends WSClientMessageBase {
  type: 'get_server_info';
  id: string; // Required for correlation
}

/**
 * Get folder info request message
 * For Phase 9 - Sprint 1 Task 4: Get detailed info for a specific folder
 */
export interface GetFolderInfoMessage extends WSClientMessageBase {
  type: 'get_folder_info';
  id: string; // Required for correlation
  payload: {
    folderPath: string;
  };
}

/**
 * Union type for all client messages
 */
export type WSClientMessage = 
  | ConnectionInitMessage
  | FolderValidateMessage
  | FolderAddMessage
  | FolderRemoveMessage
  | PingMessage
  | ModelListMessage
  | ModelRecommendMessage
  | GetFoldersConfigMessage
  | GetServerInfoMessage
  | GetFolderInfoMessage;

// =============================================================================
// Daemon → Client Messages
// =============================================================================

/**
 * Base interface for all server messages
 */
export interface WSServerMessageBase {
  type?: string;
  id?: string; // Correlation ID for responses
}

/**
 * FMDM update broadcast (sent to all clients)
 */
export interface FMDMUpdateMessage extends WSServerMessageBase {
  type: 'fmdm.update';
  fmdm: FMDM;
}

/**
 * Validation error types
 */
export type ValidationErrorType = 'not_exists' | 'not_directory' | 'duplicate' | 'subfolder' | 'permission_denied';

/**
 * Validation warning types
 */
export type ValidationWarningType = 'ancestor';

/**
 * Validation error object
 */
export interface ValidationError {
  type: ValidationErrorType;
  message: string;
}

/**
 * Validation warning object
 */
export interface ValidationWarning {
  type: ValidationWarningType;
  message: string;
  affectedFolders?: string[];
}

/**
 * Validation response message
 */
export interface ValidationResponseMessage extends WSServerMessageBase {
  id: string; // Matches request ID
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Simple action response (for add/remove operations)
 */
export interface ActionResponseMessage extends WSServerMessageBase {
  id: string; // Matches request ID
  success: boolean;
  error?: string; // Only present if success is false
}

/**
 * Heartbeat response message
 */
export interface PongMessage extends WSServerMessageBase {
  type: 'pong';
  id: string; // Matches ping ID
}

/**
 * Connection acknowledgment message
 */
export interface ConnectionAckMessage extends WSServerMessageBase {
  type: 'connection.ack';
  clientId: string;
}

/**
 * Error message
 */
export interface ErrorMessage extends WSServerMessageBase {
  type: 'error';
  message: string;
  code?: string;
}

/**
 * Model download event messages
 */
export interface ModelDownloadStartMessage extends WSServerMessageBase {
  type: 'model_download_start';
  data: {
    modelName: string;
    status: 'downloading';
  };
}

export interface ModelDownloadProgressMessage extends WSServerMessageBase {
  type: 'model_download_progress';
  data: {
    modelName: string;
    progress: number;
    message?: string;
    estimatedTimeRemaining?: number;
  };
}

export interface ModelDownloadCompleteMessage extends WSServerMessageBase {
  type: 'model_download_complete';
  data: {
    modelName: string;
    status: 'ready';
  };
}

export interface ModelDownloadErrorMessage extends WSServerMessageBase {
  type: 'model_download_error';
  data: {
    modelName: string;
    error: string;
  };
}

/**
 * Model list response message
 */
export interface ModelListResponseMessage extends WSServerMessageBase {
  type: 'models.list.response';
  id: string; // Matches request ID
  data: {
    models: string[];
    backend: 'python' | 'ollama';
    cached?: {[modelName: string]: boolean};
  };
}

/**
 * Model compatibility score for recommendations
 */
export interface ModelCompatibilityScore {
  modelId: string;
  displayName: string;
  score: number;
  compatibility: 'supported' | 'needs_gpu' | 'needs_vram' | 'incompatible' | 'user_managed';
  compatibilityReason?: string | undefined;
  details: {
    speed: string;
    accuracy: string;
    languages: string;
    type: string;
    size: string;
    localCopy: boolean; // true if model is downloaded locally, false if needs download
    recommendation?: string; // For assisted mode
  };
}

/**
 * Model recommendation response message
 */
export interface ModelRecommendResponseMessage extends WSServerMessageBase {
  type: 'models.recommend.response';
  id: string; // Matches request ID
  data: {
    mode: 'assisted' | 'manual';
    models: ModelCompatibilityScore[];
    recommendation?: string; // Recommended model ID for assisted mode
    machineCapabilities: {
      hasGPU: boolean;
      gpuMemoryGB?: number;
      cpuCores: number;
      ramGB: number;
    };
  };
}

/**
 * Get folders configuration response message
 * For Phase 9 - Sprint 1 Task 1: Returns configured folders with metadata
 */
export interface GetFoldersConfigResponseMessage extends WSServerMessageBase {
  type: 'getFoldersConfigResponse';
  id: string; // Matches request ID
  folders: Array<{
    name: string;
    path: string;
    model: string;
    status: string;
  }>;
}

/**
 * Get server info response message
 * For Phase 9 - Sprint 1 Task 3: Returns basic system and daemon info
 */
export interface GetServerInfoResponseMessage extends WSServerMessageBase {
  type: 'get_server_info_response';
  id: string; // Matches request ID
  serverInfo: {
    version: string;          // folder-mcp version
    platform: string;         // darwin, win32, linux
    nodeVersion: string;      // Node.js version
    daemonPid: number;        // Process ID
    daemonUptime: number;     // Uptime in seconds
    hardware: {
      gpu: string;            // GPU name/type or "none"
      cpuCores: number;       // Number of CPU cores
      ramGB: number;          // Total RAM in GB
    };
  };
}

/**
 * Get folder info response message
 * For Phase 9 - Sprint 1 Task 4: Returns detailed info for a specific folder
 */
export interface GetFolderInfoResponseMessage extends WSServerMessageBase {
  type: 'get_folder_info_response';
  id: string; // Matches request ID
  folderInfo?: {
    path: string;
    model: string;
    status: string;  // Simple status from FMDM
  };
  error?: string;  // If folder not found
}

/**
 * Union type for all server messages
 */
export type WSServerMessage = 
  | FMDMUpdateMessage
  | ValidationResponseMessage
  | ActionResponseMessage
  | PongMessage
  | ConnectionAckMessage
  | ErrorMessage
  | ModelDownloadStartMessage
  | ModelDownloadProgressMessage
  | ModelDownloadCompleteMessage
  | ModelDownloadErrorMessage
  | ModelListResponseMessage
  | ModelRecommendResponseMessage
  | GetFoldersConfigResponseMessage
  | GetServerInfoResponseMessage
  | GetFolderInfoResponseMessage;

// =============================================================================
// Message Validation and Type Guards
// =============================================================================

/**
 * Message validation result
 */
export interface MessageValidationResult {
  valid: boolean;
  errorCode?: string;
  errorMessage?: string;
  supportedTypes?: string[];
}

/**
 * Enhanced validation function that returns detailed error information
 */
export function validateClientMessage(message: any): MessageValidationResult {
  // Check basic structure
  if (!message || typeof message !== 'object') {
    return {
      valid: false,
      errorCode: 'INVALID_STRUCTURE',
      errorMessage: 'Message must be a JSON object'
    };
  }

  if (typeof message.type !== 'string') {
    return {
      valid: false,
      errorCode: 'MISSING_TYPE',
      errorMessage: 'Message must have a "type" field of type string',
      supportedTypes: ['connection.init', 'folder.validate', 'folder.add', 'folder.remove', 'ping', 'models.list', 'models.recommend', 'getFoldersConfig', 'get_server_info', 'get_folder_info']
    };
  }

  const supportedTypes = ['connection.init', 'folder.validate', 'folder.add', 'folder.remove', 'ping', 'models.list', 'models.recommend', 'getFoldersConfig', 'get_server_info', 'get_folder_info'];
  
  switch (message.type) {
    case 'connection.init':
      if (!['tui', 'cli', 'web'].includes(message.clientType)) {
        return {
          valid: false,
          errorCode: 'INVALID_CLIENT_TYPE',
          errorMessage: `Invalid clientType "${message.clientType}". Supported types: tui, cli, web`
        };
      }
      return { valid: true };
    
    case 'folder.validate':
    case 'folder.add':
    case 'folder.remove':
    case 'ping':
    case 'models.list':
    case 'models.recommend':
    case 'getFoldersConfig':
    case 'get_server_info':
    case 'get_folder_info':
      if (typeof message.id !== 'string' || message.id.length === 0) {
        return {
          valid: false,
          errorCode: 'MISSING_ID',
          errorMessage: `Message type "${message.type}" requires a non-empty "id" field for correlation`
        };
      }
      // Additional validation for models.recommend
      if (message.type === 'models.recommend') {
        if (!message.payload || 
            !Array.isArray(message.payload.languages) ||
            !['assisted', 'manual'].includes(message.payload.mode)) {
          return {
            valid: false,
            errorCode: 'INVALID_PAYLOAD',
            errorMessage: 'models.recommend requires payload with languages array and mode (assisted|manual)'
          };
        }
      }
      // Additional validation for get_folder_info
      if (message.type === 'get_folder_info') {
        if (!message.payload || typeof message.payload.folderPath !== 'string') {
          return {
            valid: false,
            errorCode: 'INVALID_PAYLOAD',
            errorMessage: 'get_folder_info requires payload with folderPath string'
          };
        }
      }
      return { valid: true };
    
    default:
      return {
        valid: false,
        errorCode: 'UNKNOWN_MESSAGE_TYPE',
        errorMessage: `Unknown message type "${message.type}"`,
        supportedTypes
      };
  }
}

/**
 * Type guard for client messages (backward compatibility)
 */
export function isValidClientMessage(message: any): message is WSClientMessage {
  return validateClientMessage(message).valid;
}

/**
 * Type guard for validation requests
 */
export function isFolderValidateMessage(message: WSClientMessage): message is FolderValidateMessage {
  return message.type === 'folder.validate' && 
         message.payload && 
         typeof message.payload.path === 'string';
}

/**
 * Type guard for add folder requests
 */
export function isFolderAddMessage(message: WSClientMessage): message is FolderAddMessage {
  return message.type === 'folder.add' && 
         message.payload && 
         typeof message.payload.path === 'string' &&
         typeof message.payload.model === 'string';
}

/**
 * Type guard for remove folder requests
 */
export function isFolderRemoveMessage(message: WSClientMessage): message is FolderRemoveMessage {
  return message.type === 'folder.remove' && 
         message.payload && 
         typeof message.payload.path === 'string';
}

/**
 * Type guard for connection init messages
 */
export function isConnectionInitMessage(message: WSClientMessage): message is ConnectionInitMessage {
  return message.type === 'connection.init' &&
         ['tui', 'cli', 'web'].includes(message.clientType);
}

/**
 * Type guard for ping messages
 */
export function isPingMessage(message: WSClientMessage): message is PingMessage {
  return message.type === 'ping' && typeof message.id === 'string';
}

/**
 * Type guard for model list messages
 */
export function isModelListMessage(message: WSClientMessage): message is ModelListMessage {
  return message.type === 'models.list' && typeof message.id === 'string';
}

/**
 * Type guard for model recommendation messages
 */
export function isModelRecommendMessage(message: WSClientMessage): message is ModelRecommendMessage {
  return message.type === 'models.recommend' && 
         typeof message.id === 'string' &&
         message.payload &&
         Array.isArray(message.payload.languages) &&
         ['assisted', 'manual'].includes(message.payload.mode);
}

/**
 * Type guard for getFoldersConfig messages
 */
export function isGetFoldersConfigMessage(message: WSClientMessage): message is GetFoldersConfigMessage {
  return message.type === 'getFoldersConfig' && typeof message.id === 'string';
}

/**
 * Type guard for get_server_info messages
 */
export function isGetServerInfoMessage(message: WSClientMessage): message is GetServerInfoMessage {
  return message.type === 'get_server_info' && typeof message.id === 'string';
}

/**
 * Type guard for get_folder_info messages
 */
export function isGetFolderInfoMessage(message: WSClientMessage): message is GetFolderInfoMessage {
  return message.type === 'get_folder_info' && 
         typeof message.id === 'string' &&
         message.payload &&
         typeof message.payload.folderPath === 'string';
}

// =============================================================================
// Message Creation Helpers
// =============================================================================

/**
 * Create an FMDM update message
 */
export function createFMDMUpdateMessage(fmdm: FMDM): FMDMUpdateMessage {
  return {
    type: 'fmdm.update',
    fmdm
  };
}

/**
 * Create a validation response message
 */
export function createValidationResponse(
  id: string,
  valid: boolean,
  errors: ValidationError[] = [],
  warnings: ValidationWarning[] = []
): ValidationResponseMessage {
  return {
    id,
    valid,
    errors,
    warnings
  };
}

/**
 * Create an action response message
 */
export function createActionResponse(
  id: string,
  success: boolean,
  error?: string
): ActionResponseMessage {
  return {
    type: 'action.response',
    id,
    success,
    ...(error && { error })
  };
}

/**
 * Create a pong response message
 */
export function createPongResponse(id: string): PongMessage {
  return {
    type: 'pong',
    id
  };
}

/**
 * Create a connection acknowledgment message
 */
export function createConnectionAck(clientId: string): ConnectionAckMessage {
  return {
    type: 'connection.ack',
    clientId
  };
}

/**
 * Create an error message
 */
export function createErrorMessage(message: string, code?: string): ErrorMessage {
  return {
    type: 'error',
    message,
    ...(code && { code })
  };
}

/**
 * Create a model list response message
 */
export function createModelListResponse(
  id: string,
  models: string[],
  backend: 'python' | 'ollama',
  cached?: {[modelName: string]: boolean}
): ModelListResponseMessage {
  return {
    type: 'models.list.response',
    id,
    data: {
      models,
      backend,
      ...(cached && { cached })
    }
  };
}

/**
 * Create a model recommendation response message
 */
export function createModelRecommendResponse(
  id: string,
  mode: 'assisted' | 'manual',
  models: ModelCompatibilityScore[],
  machineCapabilities: {
    hasGPU: boolean;
    gpuMemoryGB?: number;
    cpuCores: number;
    ramGB: number;
  },
  recommendation?: string
): ModelRecommendResponseMessage {
  return {
    type: 'models.recommend.response',
    id,
    data: {
      mode,
      models,
      machineCapabilities,
      ...(recommendation && { recommendation })
    }
  };
}

/**
 * Create a getFoldersConfig response message
 */
export function createGetFoldersConfigResponse(
  id: string,
  folders: Array<{
    name: string;
    path: string;
    model: string;
    status: string;
  }>
): GetFoldersConfigResponseMessage {
  return {
    type: 'getFoldersConfigResponse',
    id,
    folders
  };
}

/**
 * Create a get_server_info response message
 */
export function createGetServerInfoResponse(
  id: string,
  serverInfo: {
    version: string;
    platform: string;
    nodeVersion: string;
    daemonPid: number;
    daemonUptime: number;
    hardware: {
      gpu: string;
      cpuCores: number;
      ramGB: number;
    };
  }
): GetServerInfoResponseMessage {
  return {
    type: 'get_server_info_response',
    id,
    serverInfo
  };
}

/**
 * Create a get_folder_info response message
 */
export function createGetFolderInfoResponse(
  id: string,
  folderInfo?: {
    path: string;
    model: string;
    status: string;
  },
  error?: string
): GetFolderInfoResponseMessage {
  return {
    type: 'get_folder_info_response',
    id,
    ...(folderInfo && { folderInfo }),
    ...(error && { error })
  };
}

// =============================================================================
// Validation Result Types (for folder validation)
// =============================================================================

/**
 * Complete validation result structure
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Create a validation error
 */
export function createValidationError(
  type: ValidationErrorType,
  message: string
): ValidationError {
  return { type, message };
}

/**
 * Create a validation warning
 */
export function createValidationWarning(
  type: ValidationWarningType,
  message: string,
  affectedFolders?: string[]
): ValidationWarning {
  return {
    type,
    message,
    ...(affectedFolders && { affectedFolders })
  };
}

// =============================================================================
// Common Error Messages
// =============================================================================

export const VALIDATION_ERRORS = {
  NOT_EXISTS: (path: string) => createValidationError('not_exists', `Folder does not exist: ${path}`),
  NOT_DIRECTORY: (path: string) => createValidationError('not_directory', `Path is not a directory: ${path}`),
  DUPLICATE: (path: string) => createValidationError('duplicate', `Folder is already configured: ${path}`),
  SUBFOLDER: (path: string, parent: string) => createValidationError('subfolder', `Folder ${path} is a subfolder of existing folder ${parent}`),
  PERMISSION_DENIED: (path: string) => createValidationError('permission_denied', `Permission denied accessing folder: ${path}`)
} as const;

export const VALIDATION_WARNINGS = {
  ANCESTOR: (_path: string, affectedFolders: string[]) => createValidationWarning(
    'ancestor',
    `This folder is an ancestor of ${affectedFolders.length} existing folder${affectedFolders.length > 1 ? 's' : ''}`,
    affectedFolders
  )
} as const;