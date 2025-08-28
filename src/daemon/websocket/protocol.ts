/**
 * WebSocket Protocol Handler
 * 
 * Implements the core message routing and processing logic for the
 * FMDM WebSocket protocol. Handles all client-daemon communication
 * including validation, folder operations, and state synchronization.
 */

import {
  WSClientMessage,
  WSServerMessage,
  ValidationResponseMessage,
  ActionResponseMessage,
  PongMessage,
  ConnectionAckMessage,
  ErrorMessage,
  ModelListResponseMessage,
  ModelRecommendResponseMessage,
  GetFoldersConfigResponseMessage,
  GetServerInfoResponseMessage,
  GetFolderInfoResponseMessage,
  ValidationResult,
  isValidClientMessage,
  validateClientMessage,
  MessageValidationResult,
  isFolderValidateMessage,
  isConnectionInitMessage,
  isPingMessage,
  isModelListMessage,
  isModelRecommendMessage,
  isGetFoldersConfigMessage,
  isGetServerInfoMessage,
  isGetFolderInfoMessage,
  createValidationResponse,
  createPongResponse,
  createConnectionAck,
  createErrorMessage,
  createGetFoldersConfigResponse,
  createGetServerInfoResponse,
  createGetFolderInfoResponse,
  VALIDATION_ERRORS
} from './message-types.js';

import { ILoggingService } from '../../di/interfaces.js';
import { ClientConnection } from '../models/fmdm.js';
import { FolderHandlers } from './handlers/folder-handlers.js';
import { ModelHandlers } from './handlers/model-handlers.js';
import { IDaemonConfigurationService } from '../services/configuration-service.js';
import { IDaemonFolderValidationService } from '../services/folder-validation-service.js';
import { IMonitoredFoldersOrchestrator } from '../services/monitored-folders-orchestrator.js';
import { ModelSelectionService } from '../../application/models/model-selection-service.js';
import { OllamaDetector } from '../../infrastructure/ollama/ollama-detector.js';

/**
 * Folder validation service interface
 */
export interface IFolderValidationService {
  validate(path: string): Promise<ValidationResult>;
}

/**
 * FMDM service interface for protocol operations
 */
export interface IProtocolFMDMService {
  addClient(client: ClientConnection): void;
  removeClient(clientId: string): void;
  updateFolders(folders: Array<{ path: string; model: string; status?: string; progress?: number }>): void;
  getFMDM(): { folders: Array<{ path: string; model: string; status: string; progress?: number }> };
}

/**
 * WebSocket Protocol Handler
 */
export class WebSocketProtocol {
  private folderHandlers: FolderHandlers;
  private modelHandlers: ModelHandlers;
  private onClientConnected?: (clientId: string) => void;

  constructor(
    private validationService: IDaemonFolderValidationService,
    private configService: IDaemonConfigurationService,
    private fmdmService: IProtocolFMDMService,
    private logger: ILoggingService,
    modelHandlers: ModelHandlers,
    private monitoredFoldersOrchestrator?: IMonitoredFoldersOrchestrator
  ) {
    this.modelHandlers = modelHandlers;
    
    // Create folder handlers with proper interfaces, including model handlers
    this.folderHandlers = new FolderHandlers(
      this.fmdmService,
      this.validationService,
      this.modelHandlers,
      this.logger,
      this.monitoredFoldersOrchestrator
    );
  }

  /**
   * Set callback for when a client successfully connects
   */
  setClientConnectedCallback(callback: (clientId: string) => void): void {
    this.onClientConnected = callback;
  }

  /**
   * Process incoming client message and generate appropriate response
   */
  async processMessage(
    clientId: string,
    rawMessage: any
  ): Promise<WSServerMessage | null> {
    try {
      // Enhanced validation with detailed error reporting
      const validationResult = validateClientMessage(rawMessage);
      if (!validationResult.valid) {
        this.logger.warn(`[PROTOCOL] Invalid message from client ${clientId}`, { 
          message: rawMessage,
          errorCode: validationResult.errorCode,
          errorMessage: validationResult.errorMessage
        });
        
        // Create detailed error message
        let errorMessage = validationResult.errorMessage || 'Invalid message format';
        if (validationResult.supportedTypes?.length) {
          errorMessage += `. Supported message types: ${validationResult.supportedTypes.join(', ')}`;
        }
        
        return createErrorMessage(errorMessage, validationResult.errorCode);
      }

      const message = rawMessage as WSClientMessage;
      // Skip logging for ping messages
      if (message.type !== 'ping') {
        this.logger.debug(`Processing message from ${clientId}: ${message.type}`);
      }

      // Route message based on type
      switch (message.type) {
        case 'connection.init':
          return this.handleConnectionInit(clientId, message);

        case 'folder.validate':
          return await this.handleFolderValidate(message);

        case 'folder.add':
          return await this.folderHandlers.handleAddFolder(message);

        case 'folder.remove':
          return await this.folderHandlers.handleRemoveFolder(message);

        case 'ping':
          return this.handlePing(message);

        case 'models.list':
          return await this.modelHandlers.handleModelList(message);

        case 'models.recommend':
          return await this.modelHandlers.handleModelRecommend(message, clientId);

        case 'getFoldersConfig':
          return this.handleGetFoldersConfig(message);

        case 'get_server_info':
          return await this.handleGetServerInfo(message);

        case 'get_folder_info':
          return this.handleGetFolderInfo(message);

        default:
          // This should never happen due to validation above, but just in case
          this.logger.warn(`Unknown message type: ${(message as any).type}`);
          return createErrorMessage(
            `Unknown message type: ${(message as any).type}. Supported types: connection.init, folder.validate, folder.add, folder.remove, ping, models.list, models.recommend, getFoldersConfig, get_server_info, get_folder_info`,
            'UNKNOWN_MESSAGE_TYPE'
          );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error processing message from ${clientId}`, error instanceof Error ? error : new Error(String(error)));
      return createErrorMessage(`Internal server error: ${errorMessage}`, 'INTERNAL_ERROR');
    }
  }

  /**
   * Handle connection initialization
   */
  private handleConnectionInit(
    clientId: string,
    message: WSClientMessage
  ): ConnectionAckMessage {
    if (!isConnectionInitMessage(message)) {
      throw new Error('Invalid connection init message');
    }

    const client: ClientConnection = {
      id: clientId,
      type: message.clientType,
      connectedAt: new Date().toISOString()
    };

    // Add client to FMDM service
    this.fmdmService.addClient(client);

    this.logger.info(`Client ${clientId} initialized as ${message.clientType}`);
    
    // Notify that client is connected (so server can send initial FMDM)
    if (this.onClientConnected) {
      this.logger.debug(`Calling onClientConnected callback for client ${clientId}`);
      this.onClientConnected(clientId);
    }
    
    return createConnectionAck(clientId);
  }

  /**
   * Handle folder validation request
   */
  private async handleFolderValidate(
    message: WSClientMessage
  ): Promise<ValidationResponseMessage> {
    if (!isFolderValidateMessage(message)) {
      throw new Error('Invalid folder validate message');
    }

    const { path } = message.payload;
    const { id } = message;

    this.logger.debug(`Validating folder: ${path}`);

    try {
      const result = await this.validationService.validate(path);

      return createValidationResponse(
        id,
        result.isValid,
        result.errors,
        result.warnings
      );
    } catch (error) {
      this.logger.error(`Validation failed for ${path}`, error instanceof Error ? error : new Error(String(error)));
      
      // Return a generic validation error
      return createValidationResponse(
        id,
        false,
        [VALIDATION_ERRORS.NOT_EXISTS(path)],
        []
      );
    }
  }


  /**
   * Handle ping request
   */
  private handlePing(message: WSClientMessage): PongMessage {
    if (!isPingMessage(message)) {
      throw new Error('Invalid ping message');
    }

    const { id } = message;
    // Don't log ping/pong - they're just heartbeats
    
    return createPongResponse(id);
  }

  /**
   * Handle get folders configuration request
   * Phase 9 - Sprint 1 Task 1: Provide configured folders to MCP server
   */
  private handleGetFoldersConfig(message: WSClientMessage): GetFoldersConfigResponseMessage {
    if (!isGetFoldersConfigMessage(message)) {
      throw new Error('Invalid getFoldersConfig message');
    }

    const { id } = message;
    this.logger.debug(`Getting folders configuration for MCP server`);

    // Get current FMDM state with all configured folders
    const fmdm = this.fmdmService.getFMDM();
    
    // Process folders with validation and limits
    const folders = this.processFoldersForResponse(fmdm);

    this.logger.info(`Returning ${folders.length} folders configuration to MCP server`);
    
    return createGetFoldersConfigResponse(id, folders);
  }
  
  /**
   * Process FMDM folders for response with validation and limits
   */
  private processFoldersForResponse(fmdm: any): Array<{
    name: string;
    path: string;
    model: string;
    status: string;
  }> {
    // Early return if no folders available
    if (!fmdm?.folders || !Array.isArray(fmdm.folders)) {
      this.logger.warn('FMDM or folders array is missing/invalid, returning empty folders list');
      return [];
    }
    
    // Get max folders limit (with fallback to 100)
    const MAX_FOLDERS = (this.configService as any).getMaxFolders?.() ?? 100;
    
    const validFolders: Array<{
      name: string;
      path: string;
      model: string;
      status: string;
    }> = [];
    
    let skippedCount = 0;
    let processedCount = 0;
    
    // Process folders with a for-loop to avoid extra passes
    for (const folder of fmdm.folders) {
      // Stop if we've reached the limit
      if (validFolders.length >= MAX_FOLDERS) {
        break;
      }
      
      processedCount++;
      
      // Validate folder
      if (!this.isValidFolder(folder)) {
        skippedCount++;
        continue;
      }
      
      // Transform valid folder for response
      const path = folder.path.trim();
      const name = this.extractFolderName(path);
      const model = folder.model && typeof folder.model === 'string' 
        ? folder.model 
        : 'unknown';
      const status = folder.status && typeof folder.status === 'string'
        ? folder.status
        : 'pending';
        
      validFolders.push({
        name,
        path,
        model,
        status
      });
    }
    
    // Log skipped and truncated counts
    if (skippedCount > 0) {
      this.logger.warn(`Skipped ${skippedCount} invalid folder entries`);
    }
    
    const totalFolders = fmdm.folders.length;
    if (totalFolders > MAX_FOLDERS) {
      const truncatedCount = totalFolders - processedCount;
      this.logger.warn(`Truncated folders list: processed ${processedCount} of ${totalFolders} entries (limit: ${MAX_FOLDERS}, truncated: ${truncatedCount})`);
    }
    
    return validFolders;
  }
  
  /**
   * Validate if a folder object has required properties
   */
  private isValidFolder(folder: any): boolean {
    // Check if folder is a valid object
    if (!folder || typeof folder !== 'object') {
      this.logger.warn('Skipped invalid folder entry (not an object)');
      return false;
    }
    
    // Validate required path property
    if (!folder.path || typeof folder.path !== 'string' || folder.path.trim().length === 0) {
      this.logger.warn('Skipped folder with invalid or missing path', { folder });
      return false;
    }
    
    return true;
  }

  /**
   * Handle get server info request
   * Phase 9 - Sprint 1 Task 3: Simple hello world endpoint with system info
   */
  private async handleGetServerInfo(message: WSClientMessage): Promise<GetServerInfoResponseMessage> {
    if (!isGetServerInfoMessage(message)) {
      throw new Error('Invalid get_server_info message');
    }
    
    const { id } = message;
    this.logger.debug('Getting server info');
    
    // Get machine capabilities through model handlers
    const capabilities = await this.modelHandlers.getMachineCapabilities();
    
    // Get package version (hardcoded for simplicity)
    const version = '1.0.0'; // Could read from package.json if needed
    
    return createGetServerInfoResponse(id, {
      version,
      platform: process.platform,
      nodeVersion: process.version,
      daemonPid: process.pid,
      daemonUptime: Math.floor(process.uptime()),
      hardware: {
        gpu: capabilities.gpu.name || capabilities.gpu.type,
        cpuCores: capabilities.cpu.cores,
        ramGB: capabilities.memory.totalRAMGB
      }
    });
  }

  /**
   * Handle get folder info request
   * Phase 9 - Sprint 1 Task 4: Get detailed info for a specific folder
   */
  private handleGetFolderInfo(message: WSClientMessage): GetFolderInfoResponseMessage {
    if (!isGetFolderInfoMessage(message)) {
      throw new Error('Invalid get_folder_info message');
    }
    
    const { id, payload } = message;
    const { folderPath } = payload;
    
    this.logger.debug(`Getting folder info for: ${folderPath}`);
    
    // Get current FMDM state
    const fmdm = this.fmdmService.getFMDM();
    
    // Validate that fmdm and folders array exist before using array methods
    if (!fmdm || !Array.isArray(fmdm.folders)) {
      this.logger.debug(`FMDM or folders array is missing/invalid. Cannot find folder: ${folderPath}`);
      return createGetFolderInfoResponse(id, undefined, `Folder not found: ${folderPath}`);
    }
    
    // Find the requested folder
    const folder = fmdm.folders.find(f => f.path === folderPath);
    
    if (!folder) {
      this.logger.debug(`Folder not found: ${folderPath}`);
      return createGetFolderInfoResponse(id, undefined, `Folder not found: ${folderPath}`);
    }
    
    // Return folder info
    return createGetFolderInfoResponse(id, {
      path: folder.path,
      model: folder.model || 'unknown',
      status: folder.status || 'pending'
    });
  }

  /**
   * Extract a readable folder name from a path
   */
  private extractFolderName(path: string): string {
    // Get the last component of the path
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1] || path;
  }

  /**
   * Handle client disconnection
   */
  handleClientDisconnection(clientId: string): void {
    // Remove client from FMDM service (logging handled by server)
    this.fmdmService.removeClient(clientId);
  }

  /**
   * Generate correlation ID for requests
   */
  generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate message payload structure
   */
  private validateMessagePayload(message: any, requiredFields: string[]): boolean {
    if (!message.payload || typeof message.payload !== 'object') {
      return false;
    }

    for (const field of requiredFields) {
      if (!(field in message.payload) || typeof message.payload[field] !== 'string') {
        return false;
      }
    }

    return true;
  }
}

/**
 * Protocol configuration for dependency injection
 */
export interface ProtocolConfig {
  enableDebugLogging?: boolean;
  requestTimeout?: number;
  maxMessageSize?: number;
}

/**
 * Default protocol configuration
 */
export const DEFAULT_PROTOCOL_CONFIG: Required<ProtocolConfig> = {
  enableDebugLogging: false,
  requestTimeout: 30000, // 30 seconds
  maxMessageSize: 1024 * 1024 // 1MB
};