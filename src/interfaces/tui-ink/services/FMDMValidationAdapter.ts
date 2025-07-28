/**
 * FMDM Validation Adapter
 * 
 * Adapter that provides FolderValidationService-compatible interface
 * using FMDM WebSocket operations. This allows legacy components to
 * work with the new FMDM system without major refactoring.
 */

import { ValidationResult as DaemonValidationResult } from '../../../daemon/websocket/message-types.js';
import { ValidationResult, createValidationResult } from '../components/core/ValidationState';

/**
 * FMDM operations interface for validation
 */
export interface FMDMValidationOperations {
    validateFolder: (path: string) => Promise<DaemonValidationResult>;
}

/**
 * Adapter class that provides FolderValidationService-compatible interface
 * using FMDM WebSocket operations
 */
export class FMDMValidationAdapter {
    constructor(
        private fmdmOperations: FMDMValidationOperations,
        private isDaemonConnected: boolean
    ) {}

    /**
     * Validate a folder path using FMDM WebSocket operations
     * Converts daemon ValidationResult to TUI ValidationResult format
     */
    async validateFolder(folderPath: string): Promise<ValidationResult> {
        if (!this.isDaemonConnected) {
            return createValidationResult(
                false, 
                'Daemon not connected - validation unavailable'
            );
        }

        try {
            const daemonResult = await this.fmdmOperations.validateFolder(folderPath);
            
            // Convert daemon ValidationResult to TUI ValidationResult
            if (!daemonResult.isValid) {
                // Has errors
                const errorMessage = daemonResult.errors.length > 0 
                    ? daemonResult.errors[0]!.message
                    : 'Folder validation failed';
                    
                return createValidationResult(false, errorMessage);
            } else if (daemonResult.warnings.length > 0) {
                // Valid but has warnings
                const warningMessage = daemonResult.warnings[0]!.message;
                return createValidationResult(true, undefined, warningMessage);
            } else {
                // Valid with no warnings
                return createValidationResult(true);
            }
        } catch (error) {
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