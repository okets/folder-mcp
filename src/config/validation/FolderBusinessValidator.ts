/**
 * Folder Business Validator
 * 
 * Validates folder paths against business rules:
 * - No duplicate folders
 * - No sub-folder of existing folder
 * - Warning for ancestor folders
 */

import { IValidator } from './IValidationPipeline';
import { ValidationResult } from '../ConfigurationComponent';
import { FolderValidationService } from '../../interfaces/tui-ink/services/FolderValidationService';

export class FolderBusinessValidator implements IValidator {
    name = 'FolderBusinessValidator';
    priority = 200; // Run after schema validation
    
    private validationService: FolderValidationService;
    
    constructor() {
        this.validationService = new FolderValidationService();
    }
    
    canValidate(path: string): boolean {
        // Only validate folder paths
        return path === 'folders.list[].path' || path.startsWith('folders.list[') && path.endsWith('].path');
    }
    
    async validate(path: string, value: any, context?: any): Promise<ValidationResult> {
        // Validate using FolderValidationService
        const folderValidationResult = await this.validationService.validateFolderPath(value);
        
        if (folderValidationResult.isValid && !folderValidationResult.hasWarning) {
            return { valid: true };
        }
        
        const result: ValidationResult = { valid: !folderValidationResult.hasError };
        
        if (folderValidationResult.hasError && folderValidationResult.errorMessage) {
            result.errors = [{
                path,
                message: folderValidationResult.errorMessage
            }];
        }
        
        if (folderValidationResult.hasWarning && folderValidationResult.warningMessage) {
            result.warnings = [{
                path,
                message: folderValidationResult.warningMessage
            }];
        }
        
        return result;
    }
}