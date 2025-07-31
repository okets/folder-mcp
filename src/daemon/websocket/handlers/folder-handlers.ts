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
    private modelHandlers: ModelHandlers,
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
      // Debug: Log model validation step
      this.logger.debug(`\n=== FOLDER ADD DEBUG START ===`);
      this.logger.debug(`Requested model: "${model}"`);
      const supportedModels = this.modelHandlers.getSupportedModels();
      this.logger.debug(`Supported models: ${JSON.stringify(supportedModels)}`);
      
      // Validate model first (before folder validation)
      const isModelSupported = this.modelHandlers.isModelSupported(model);
      this.logger.debug(`Model supported check: ${isModelSupported}`);
      
      if (!isModelSupported) {
        const errorMessage = `Unsupported model: ${model}. Supported models: ${supportedModels.join(', ')}`;
        this.logger.warn(`Cannot add folder ${path}: ${errorMessage}`);
        this.logger.debug(`=== FOLDER ADD DEBUG END (MODEL ERROR) ===\n`);
        return createActionResponse(id, false, errorMessage);
      }
      
      this.logger.debug(`Model validation passed, proceeding to folder validation...`);

      // Validate folder path
      this.logger.debug(`Starting folder path validation for: ${path}`);
      const validation = await this.validationService.validate(path);
      this.logger.debug(`Folder validation result: valid=${validation.isValid}, errors=${validation.errors.length}, warnings=${validation.warnings.length}`);
      
      if (!validation.isValid) {
        const errorMessage = validation.errors[0]?.message || 'Folder validation failed';
        this.logger.warn(`Cannot add folder ${path}: ${errorMessage}`);
        this.logger.debug(`=== FOLDER ADD DEBUG END (FOLDER VALIDATION ERROR) ===\n`);
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
      this.logger.debug(`Calling configService.addFolder(${path}, ${model})...`);
      await this.configService.addFolder(path, model);
      this.logger.debug(`configService.addFolder completed successfully`);
      
      // Update FMDM with new folder list
      this.logger.debug(`Fetching updated folder list from configService...`);
      const updatedFolders = await this.configService.getFolders();
      this.logger.debug(`Retrieved ${updatedFolders.length} folders from configService`);
      
      this.logger.debug(`Updating FMDM with folder list...`);
      this.fmdmService.updateFolders(updatedFolders);
      this.logger.debug(`FMDM updated successfully`);

      this.logger.info(`Successfully added folder: ${path}`);
      this.logger.debug(`=== FOLDER ADD DEBUG END (SUCCESS) ===\n`);
      return createActionResponse(id, true);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to add folder ${path}`, error instanceof Error ? error : new Error(String(error)));
      this.logger.debug(`Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
      this.logger.debug(`=== FOLDER ADD DEBUG END (EXCEPTION) ===\n`);
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