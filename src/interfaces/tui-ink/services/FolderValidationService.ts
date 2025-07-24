/**
 * Folder Validation Service for Add Folder Wizard
 * 
 * Implements three validation scenarios:
 * 1. Duplicate: Exact path already monitored (error → disable Confirm)
 * 2. Sub-folder: New path is child of existing folder (error → disable Confirm)  
 * 3. Ancestor: New path is parent of existing folders (warning → enable Confirm)
 */

import { ValidationResult, createValidationResult } from '../components/core/ValidationState';
import { ConfigurationComponent } from '../../../config/ConfigurationComponent';
import { getContainer } from '../../../di/container';
import { CONFIG_SERVICE_TOKENS } from '../../../config/di-setup';
import * as path from 'path';
import * as fs from 'fs';

export interface FolderValidationContext {
    path: string;
    existingFolders: Array<{ path: string; model: string }>;
}

export interface AncestorConflictInfo {
    conflictingFolders: Array<{ path: string; model: string }>;
    wouldReplace: boolean;
}

export class FolderValidationService {
    private configComponent: ConfigurationComponent;
    
    constructor() {
        const container = getContainer();
        this.configComponent = container.resolve<ConfigurationComponent>(CONFIG_SERVICE_TOKENS.CONFIGURATION_COMPONENT);
    }
    
    /**
     * Validate a folder path against existing monitored folders
     */
    async validateFolderPath(folderPath: string): Promise<ValidationResult> {
        try {
            // First check if the path exists and is accessible
            if (!folderPath || folderPath.trim() === '') {
                return createValidationResult(false, 'Please select a folder path');
            }
            
            // Normalize the path to ensure consistent comparison
            const normalizedPath = path.resolve(folderPath);
            
            // Check if path exists and is a directory
            try {
                const stat = fs.statSync(normalizedPath);
                if (!stat.isDirectory()) {
                    return createValidationResult(false, 'Selected path is not a directory');
                }
            } catch (error) {
                return createValidationResult(false, 'Selected path does not exist or is not accessible');
            }
            
            // Get existing monitored folders
            const existingFolders = await this.configComponent.getFolders();
            
            if (!existingFolders || existingFolders.length === 0) {
                // No existing folders, path is valid
                return createValidationResult(true);
            }
            
            // Check for the three validation scenarios
            return this.checkFolderConflicts(normalizedPath, existingFolders);
            
        } catch (error) {
            return createValidationResult(false, `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    
    /**
     * Check for folder conflicts: duplicate, sub-folder, or ancestor scenarios
     */
    private checkFolderConflicts(
        targetPath: string, 
        existingFolders: Array<{ path: string; model: string }>
    ): ValidationResult {
        const normalizedExisting = existingFolders.map(folder => ({
            ...folder,
            normalizedPath: path.resolve(folder.path)
        }));
        
        // Scenario 1: Duplicate - exact path already exists
        const duplicateFolder = normalizedExisting.find(folder => 
            folder.normalizedPath === targetPath
        );
        
        if (duplicateFolder) {
            return createValidationResult(
                false, 
                `This folder is already being monitored with model "${duplicateFolder.model}"`
            );
        }
        
        // Scenario 2: Sub-folder - target is child of existing monitored folder
        const parentFolder = normalizedExisting.find(folder => 
            this.isSubPath(targetPath, folder.normalizedPath)
        );
        
        if (parentFolder) {
            const relativePath = path.relative(parentFolder.normalizedPath, targetPath);
            return createValidationResult(
                false, 
                `This folder is already covered by monitored parent folder "${parentFolder.path}" (${relativePath})`
            );
        }
        
        // Scenario 3: Ancestor - target is parent of existing folders
        const childFolders = normalizedExisting.filter(folder => 
            this.isSubPath(folder.normalizedPath, targetPath)
        );
        
        if (childFolders.length > 0) {
            const conflictList = childFolders.map(folder => 
                `"${folder.path}" (${folder.model})`
            ).join(', ');
            
            return createValidationResult(
                true, // Valid but with warning
                undefined,
                `Adding this folder will replace monitoring of ${childFolders.length} existing folder${childFolders.length > 1 ? 's' : ''}: ${conflictList}`
            );
        }
        
        // No conflicts - path is valid
        return createValidationResult(true);
    }
    
    /**
     * Check if childPath is a sub-path of parentPath
     */
    private isSubPath(childPath: string, parentPath: string): boolean {
        const relativePath = path.relative(parentPath, childPath);
        return relativePath !== '' && 
               !relativePath.startsWith('..') && 
               !path.isAbsolute(relativePath);
    }
    
    /**
     * Get detailed information about ancestor conflicts for destructive confirmation
     */
    async getAncestorConflictInfo(folderPath: string): Promise<AncestorConflictInfo | null> {
        try {
            const normalizedPath = path.resolve(folderPath);
            const existingFolders = await this.configComponent.getFolders();
            
            if (!existingFolders || existingFolders.length === 0) {
                return null;
            }
            
            const conflictingFolders = existingFolders.filter(folder => 
                this.isSubPath(path.resolve(folder.path), normalizedPath)
            );
            
            if (conflictingFolders.length === 0) {
                return null;
            }
            
            return {
                conflictingFolders,
                wouldReplace: true
            };
            
        } catch (error) {
            return null;
        }
    }
    
    /**
     * Create a descriptive validation message for UI display
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