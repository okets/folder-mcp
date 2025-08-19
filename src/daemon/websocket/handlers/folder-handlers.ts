/**
 * Folder Action Handlers
 * 
 * Handles folder add/remove operations for the WebSocket protocol.
 * Provides clean separation between protocol routing and business logic.
 */

import { 
  WSClientMessage,
  WSServerMessage,
  ActionResponseMessage,
  isFolderAddMessage,
  isFolderRemoveMessage,
  createActionResponse
} from '../message-types.js';
import { ILoggingService } from '../../../di/interfaces.js';
import { IDaemonConfigurationService } from '../../services/configuration-service.js';
import { IDaemonFolderValidationService } from '../../services/folder-validation-service.js';
import { ModelHandlers } from './model-handlers.js';
import { IMonitoredFoldersOrchestrator } from '../../services/monitored-folders-orchestrator.js';
import { RequestLogger } from '../../../domain/daemon/request-logger.js';

/**
 * FMDM service interface for folder handlers
 */
export interface IFMDMServiceForHandlers {
  updateFolders(folders: Array<{ path: string; model: string; status: string; progress?: number }>): void;
  getFMDM(): { folders: Array<{ path: string; model: string; status: string; progress?: number }> };
}

/**
 * Folder action handlers for WebSocket protocol
 */
export class FolderHandlers {
  private requestLogger: RequestLogger;

  constructor(
    private configService: IDaemonConfigurationService,
    private fmdmService: IFMDMServiceForHandlers,
    private validationService: IDaemonFolderValidationService,
    private modelHandlers: ModelHandlers,
    private logger: ILoggingService,
    private monitoredFoldersOrchestrator?: IMonitoredFoldersOrchestrator
  ) {
    this.requestLogger = new RequestLogger(this.logger);
  }

  /**
   * Handle folder add request
   */
  async handleAddFolder(message: WSClientMessage, clientId?: string): Promise<ActionResponseMessage> {
    if (!isFolderAddMessage(message)) {
      throw new Error('Invalid folder add message');
    }

    const { path, model } = message.payload;
    const { id } = message;

    // Start request tracking
    const requestId = this.requestLogger.startRequest(
      'folder_add',
      { 
        messageId: id,
        folderPath: path,
        model,
        payloadSize: JSON.stringify(message.payload).length 
      },
      {
        triggerType: 'user',
        ...(clientId && { clientId })
      }
    );

    try {
      // Validate model first (before folder validation)
      const supportedModels = this.modelHandlers.getSupportedModels();
      const isModelSupported = this.modelHandlers.isModelSupported(model);
      
      if (!isModelSupported) {
        const errorMessage = `Unsupported model: ${model}. Supported models: ${supportedModels.join(', ')}`;
        this.requestLogger.completeRequest(requestId, 'failure', {
          errorCode: 'UNSUPPORTED_MODEL',
          errorMessage
        });
        this.logger.warn(`Cannot add folder ${path}: ${errorMessage}`);
        return createActionResponse(id, false, errorMessage);
      }

      // Note: Folder path validation is handled by MonitoredFoldersOrchestrator
      // This allows for centralized folder lifecycle management and proper FMDM error reporting

      // Try to add to configuration, but handle validation errors gracefully
      let configSuccess = false;
      try {
        await this.configService.addFolder(path, model);
        configSuccess = true;
      } catch (error) {
        this.logger.debug(`Configuration update failed, will still attempt lifecycle management: ${error instanceof Error ? error.message : String(error)}`);
        // Don't return error here - let MonitoredFoldersOrchestrator handle the folder validation and FMDM updates
      }

      // Always trigger folder lifecycle management - this will handle FMDM updates including error states
      if (this.monitoredFoldersOrchestrator) {
        // Don't await - let indexing run in background
        // The orchestrator will handle FMDM updates including error states
        this.monitoredFoldersOrchestrator.addFolder(path, model).catch((error: unknown) => {
          this.logger.error(`[FOLDER] Failed to start lifecycle for ${path}: ${error instanceof Error ? error.message : String(error)}`);
          // Note: Error state is already handled by orchestrator's FMDM updates
        });
      } else {
        this.logger.warn(`No folder lifecycle manager available - folder ${path} will not be indexed`);
      }

      const response = createActionResponse(id, true);
      this.requestLogger.completeRequest(requestId, 'success', {
        responseSize: JSON.stringify(response).length,
        performanceMetrics: {
          processingTime: Date.now() - (this.requestLogger.getActiveRequest(requestId)?.context.timestamp.getTime() || Date.now())
        }
      });
      return response;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.requestLogger.completeRequest(requestId, 'failure', {
        errorCode: 'FOLDER_ADD_ERROR',
        errorMessage
      });
      this.logger.error(`[FOLDER] Failed to add folder ${path}: ${errorMessage}`);
      return createActionResponse(id, false, `Failed to add folder: ${errorMessage}`);
    }
  }

  /**
   * Handle folder remove request
   */
  async handleRemoveFolder(message: WSClientMessage, clientId?: string): Promise<ActionResponseMessage> {
    if (!isFolderRemoveMessage(message)) {
      throw new Error('Invalid folder remove message');
    }

    const { path } = message.payload;
    const { id } = message;

    // Start request tracking
    const requestId = this.requestLogger.startRequest(
      'folder_remove',
      { 
        messageId: id,
        folderPath: path,
        payloadSize: JSON.stringify(message.payload).length 
      },
      {
        triggerType: 'user',
        ...(clientId && { clientId })
      }
    );

    try {
      await this.configService.removeFolder(path);
      
      // Remove from MonitoredFoldersOrchestrator (stops lifecycle, file watching, and cleans up .folder-mcp)
      if (this.monitoredFoldersOrchestrator) {
        try {
          await this.monitoredFoldersOrchestrator.removeFolder(path);
        } catch (error) {
          this.logger.warn(`Failed to remove folder from orchestrator ${path}: ${error instanceof Error ? error.message : String(error)}`);
          // Continue with removal even if orchestrator cleanup fails
        }
      }
      
      // Update FMDM with new folder list, preserving existing statuses
      const configFolders = await this.configService.getFolders();
      
      // Get current FMDM state to preserve existing folder statuses
      const currentFmdm = this.fmdmService.getFMDM();
      const existingFolderStatuses = new Map(
        currentFmdm.folders.map((folder: any) => [folder.path, { status: folder.status, progress: folder.progress }])
      );
      
      // Convert config folders to FMDM format - preserve existing statuses for remaining folders
      const updatedFolders = configFolders.map((folder: any) => {
        const existingStatus = existingFolderStatuses.get(folder.path);
        return {
          path: folder.path,
          model: folder.model,
          status: (existingStatus?.status || 'pending') as string,
          progress: existingStatus?.progress
        };
      });
      
      this.fmdmService.updateFolders(updatedFolders);

      const response = createActionResponse(id, true);
      this.requestLogger.completeRequest(requestId, 'success', {
        responseSize: JSON.stringify(response).length,
        performanceMetrics: {
          processingTime: Date.now() - (this.requestLogger.getActiveRequest(requestId)?.context.timestamp.getTime() || Date.now())
        }
      });
      return response;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.requestLogger.completeRequest(requestId, 'failure', {
        errorCode: 'FOLDER_REMOVE_ERROR',
        errorMessage
      });
      this.logger.error(`[FOLDER] Failed to remove folder ${path}: ${errorMessage}`);
      return createActionResponse(id, false, `Failed to remove folder: ${errorMessage}`);
    }
  }
}