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
  ValidationResult,
  isValidClientMessage,
  validateClientMessage,
  MessageValidationResult,
  isFolderValidateMessage,
  isConnectionInitMessage,
  isPingMessage,
  isModelListMessage,
  createValidationResponse,
  createPongResponse,
  createConnectionAck,
  createErrorMessage,
  VALIDATION_ERRORS
} from './message-types.js';

import { ILoggingService } from '../../di/interfaces.js';
import { ClientConnection } from '../models/fmdm.js';
import { FolderHandlers } from './handlers/folder-handlers.js';
import { ModelHandlers } from './handlers/model-handlers.js';
import { IDaemonConfigurationService } from '../services/configuration-service.js';
import { IDaemonFolderValidationService } from '../services/folder-validation-service.js';
import { IMonitoredFoldersOrchestrator } from '../services/monitored-folders-orchestrator.js';

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
    private monitoredFoldersOrchestrator?: IMonitoredFoldersOrchestrator
  ) {
    // Create model handlers first
    this.modelHandlers = new ModelHandlers(this.logger);
    
    // Create folder handlers with proper interfaces, including model handlers
    this.folderHandlers = new FolderHandlers(
      this.configService,
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

        default:
          // This should never happen due to validation above, but just in case
          this.logger.warn(`Unknown message type: ${(message as any).type}`);
          return createErrorMessage(
            `Unknown message type: ${(message as any).type}. Supported types: connection.init, folder.validate, folder.add, folder.remove, ping, models.list`,
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