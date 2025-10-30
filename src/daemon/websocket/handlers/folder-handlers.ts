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
      // Check model availability but don't block folder addition
      // The MonitoredFoldersOrchestrator will handle model download if needed
      const isModelSupported = this.modelHandlers.isModelSupported(model);
      
      if (!isModelSupported) {
        // Log warning but proceed with folder addition
        // Model download will be handled during folder lifecycle
        this.logger.warn(`Model "${model}" not currently loaded, will attempt download during indexing`);
      } else {
        this.logger.debug(`Model "${model}" is available for immediate use`);
      }

      // Note: Folder path validation is handled by MonitoredFoldersOrchestrator
      // This allows for centralized folder lifecycle management and proper FMDM error reporting

      // Delegate all folder operations to MonitoredFoldersOrchestrator
      // The orchestrator will handle configuration persistence and FMDM updates
      if (this.monitoredFoldersOrchestrator) {
        // CRITICAL FIX: Add folder to FMDM immediately to prevent race condition
        // The model download manager may try to update status before addFolder completes
        this.monitoredFoldersOrchestrator.addFolderToFMDMImmediate(path, model);

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
      // Delegate folder removal to MonitoredFoldersOrchestrator
      // The orchestrator will handle configuration persistence and FMDM updates
      if (this.monitoredFoldersOrchestrator) {
        await this.monitoredFoldersOrchestrator.removeFolder(path);
      } else {
        throw new Error('No folder lifecycle manager available');
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
        errorCode: 'FOLDER_REMOVE_ERROR',
        errorMessage
      });
      this.logger.error(`[FOLDER] Failed to remove folder ${path}: ${errorMessage}`);
      return createActionResponse(id, false, `Failed to remove folder: ${errorMessage}`);
    }
  }

}