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