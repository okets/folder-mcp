/**
 * FMDM Validation Adapter
 * 
 * Adapter that provides FolderValidationService-compatible interface
 * using FMDM WebSocket operations. This allows legacy components to
 * work with the new FMDM system without major refactoring.
 */

import { ValidationResult, createValidationResult } from '../components/core/ValidationState';

/**
 * FMDM operations interface for validation
 */
export interface FMDMValidationOperations {
    validateFolder: (path: string) => Promise<ValidationResult>;
    getModels: () => Promise<{ models: string[]; backend: 'python' | 'ollama' }>;
}

/**
 * Adapter class that provides FolderValidationService-compatible interface
 * using FMDM WebSocket operations
 */
export class FMDMValidationAdapter {
    constructor(
        private fmdmOperations: FMDMValidationOperations,
        private getConnectionStatus: () => boolean
    ) {}

    /**
     * Validate a folder path using FMDM WebSocket operations
     * Converts daemon ValidationResult to TUI ValidationResult format
     */
    async validateFolder(folderPath: string): Promise<ValidationResult> {
        try {
            // The FMDM operations now return TUI ValidationResult (converted in FMDMContext)
            const result = await this.fmdmOperations.validateFolder(folderPath);
            return result;
        } catch (error) {
            // Handle "Not connected to daemon" errors gracefully during startup
            if (error instanceof Error && error.message === 'Not connected to daemon') {
                // Return valid state with no messages to avoid showing errors during connection
                return createValidationResult(true);
            }
            
            return createValidationResult(
                false, 
                `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Validate a model name using FMDM WebSocket operations
     */
    async validateModel(model: string): Promise<ValidationResult> {
        if (!this.getConnectionStatus()) {
            return createValidationResult(false, 'Not connected to daemon');
        }

        try {
            const { models } = await this.fmdmOperations.getModels();
            
            if (!model || model.trim() === '') {
                return createValidationResult(false, 'Model selection is required');
            }
            
            if (!models.includes(model)) {
                return createValidationResult(false, `Unsupported model: ${model}. Supported: ${models.join(', ')}`);
            }
            
            return createValidationResult(true);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            // Pass the error message directly without adding a prefix
            return createValidationResult(false, errorMessage);
        }
    }

    /**
     * Validate both folder path and model together
     */
    async validateFolderAndModel(folderPath: string, model: string): Promise<ValidationResult> {
        const folderResult = await this.validateFolder(folderPath);
        const modelResult = await this.validateModel(model);
        
        // If folder validation fails, return that error first
        if (!folderResult.isValid) {
            return folderResult;
        }
        
        // If model validation fails, return that error
        if (!modelResult.isValid) {
            return modelResult;
        }
        
        // If folder has warnings but model is valid, return folder warnings
        if (folderResult.hasWarning) {
            return folderResult;
        }
        
        // Both are valid
        return createValidationResult(true);
    }

    /**
     * Legacy method for compatibility with old FolderValidationService interface
     */
    async validateFolderPath(folderPath: string): Promise<ValidationResult> {
        return this.validateFolder(folderPath);
    }

    /**
     * Create a descriptive validation message for UI display
     * Compatible with FolderValidationService interface
     */
    getValidationDisplayMessage(result: ValidationResult): string {
        if (result.hasError && result.errorMessage) {
            return result.errorMessage;
        }
        
        if (result.hasWarning && result.warningMessage) {
            return result.warningMessage;
        }
        
        if (result.isValid) {
            return 'Folder path is valid';
        }
        
        return 'Validating...';
    }

}