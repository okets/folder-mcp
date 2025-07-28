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

/**
 * FMDM service interface for folder handlers
 */
export interface IFMDMServiceForHandlers {
  updateFolders(folders: Array<{ path: string; model: string }>): void;
}

/**
 * Folder action handlers for WebSocket protocol
 */
export class FolderHandlers {
  constructor(
    private configService: IDaemonConfigurationService,
    private fmdmService: IFMDMServiceForHandlers,
    private validationService: IDaemonFolderValidationService,
    private logger: ILoggingService
  ) {}

  /**
   * Handle folder add request
   */
  async handleAddFolder(message: WSClientMessage): Promise<ActionResponseMessage> {
    if (!isFolderAddMessage(message)) {
      throw new Error('Invalid folder add message');
    }

    const { path, model } = message.payload;
    const { id } = message;

    this.logger.info(`Adding folder: ${path} with model: ${model}`);

    try {
      // Validate folder first
      const validation = await this.validationService.validate(path);
      
      if (!validation.isValid) {
        const errorMessage = validation.errors[0]?.message || 'Folder validation failed';
        this.logger.warn(`Cannot add folder ${path}: ${errorMessage}`);
        return createActionResponse(id, false, errorMessage);
      }

      // Handle ancestor scenario - remove affected folders
      const ancestorWarning = validation.warnings.find(w => w.type === 'ancestor');
      if (ancestorWarning && ancestorWarning.affectedFolders) {
        this.logger.info(`Removing ${ancestorWarning.affectedFolders.length} descendant folders for ancestor ${path}`);
        
        for (const affectedFolder of ancestorWarning.affectedFolders) {
          try {
            await this.configService.removeFolder(affectedFolder);
            this.logger.debug(`Removed descendant folder: ${affectedFolder}`);
          } catch (error) {
            this.logger.warn(`Failed to remove descendant folder ${affectedFolder}`, error instanceof Error ? error : new Error(String(error)));
            // Continue with other folders
          }
        }
      }

      // Add the new folder
      await this.configService.addFolder(path, model);
      
      // Update FMDM with new folder list
      const updatedFolders = await this.configService.getFolders();
      this.fmdmService.updateFolders(updatedFolders);

      this.logger.info(`Successfully added folder: ${path}`);
      return createActionResponse(id, true);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to add folder ${path}`, error instanceof Error ? error : new Error(String(error)));
      return createActionResponse(id, false, `Failed to add folder: ${errorMessage}`);
    }
  }

  /**
   * Handle folder remove request
   */
  async handleRemoveFolder(message: WSClientMessage): Promise<ActionResponseMessage> {
    if (!isFolderRemoveMessage(message)) {
      throw new Error('Invalid folder remove message');
    }

    const { path } = message.payload;
    const { id } = message;

    this.logger.info(`Removing folder: ${path}`);

    try {
      await this.configService.removeFolder(path);
      
      // Update FMDM with new folder list
      const updatedFolders = await this.configService.getFolders();
      this.fmdmService.updateFolders(updatedFolders);

      this.logger.info(`Successfully removed folder: ${path}`);
      return createActionResponse(id, true);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to remove folder ${path}`, error instanceof Error ? error : new Error(String(error)));
      return createActionResponse(id, false, `Failed to remove folder: ${errorMessage}`);
    }
  }
}