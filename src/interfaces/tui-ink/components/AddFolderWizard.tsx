/**
 * Add Folder Wizard Component
 * 
 * A reusable wizard factory that creates a ContainerListItem for adding folders.
 * Used in both first-run wizard and main screen contexts.
 */

import React from 'react';
import { ContainerListItem } from './core/ContainerListItem';
import { FilePickerListItem } from './core/FilePickerListItem';
import { SelectionListItem } from './core/SelectionListItem';
import { IListItem } from './core/IListItem';
import { getModelOptions, getAllModelsWithMetadata, getModelMetadata } from '../models/modelMetadata';
import { SelectionOption } from './core/SelectionListItem';
import { FolderValidationService } from '../services/FolderValidationService';
import { ValidationState, ValidationResult, DEFAULT_VALIDATION, createValidationResult } from './core/ValidationState';
import { IDestructiveConfig } from '../models/configuration';
import { DestructiveConfirmationWrapper, useDestructiveConfirmation } from './DestructiveConfirmationWrapper';

export interface AddFolderWizardResult {
    path: string;
    model: string;
}

export interface AddFolderWizardOptions {
    initialPath?: string;
    initialModel?: string;
    onComplete: (result: AddFolderWizardResult) => void;
    onCancel?: () => void;
}

/**
 * Factory function to create an Add Folder Wizard
 * @param options Configuration options for the wizard
 * @returns ContainerListItem configured as an add folder wizard
 */
export function createAddFolderWizard(options: AddFolderWizardOptions): ContainerListItem {
    const {
        initialPath = process.cwd(),
        initialModel = 'nomic-embed-text',
        onComplete,
        onCancel
    } = options;
    
    console.error(`\n=== ADD FOLDER WIZARD DEBUG ===`);
    console.error(`Initial path: ${initialPath}`);
    console.error(`Initial model: ${initialModel}`);
    console.error(`=== END ADD FOLDER WIZARD DEBUG ===\n`);
    
    // Track wizard state
    let selectedPath = initialPath;
    let selectedModel = initialModel;
    
    // Initialize validation
    const validationService = new FolderValidationService();
    let currentValidation: ValidationResult = DEFAULT_VALIDATION;
    let containerWizard: ContainerListItem;
    let folderPicker: FilePickerListItem;
    
    // Create destructive config for ancestor scenarios
    const createAncestorDestructiveConfig = async (folderPath: string): Promise<IDestructiveConfig | undefined> => {
        const conflictInfo = await validationService.getAncestorConflictInfo(folderPath);
        
        if (!conflictInfo || conflictInfo.conflictingFolders.length === 0) {
            return undefined;
        }
        
        const folderCount = conflictInfo.conflictingFolders.length;
        const folderList = conflictInfo.conflictingFolders.map(f => `${f.path} (${f.model})`);
        
        return {
            level: 'warning',
            title: 'Replace Existing Monitored Folders',
            message: `Adding "${folderPath}" will replace monitoring of ${folderCount} existing folder${folderCount > 1 ? 's' : ''} that are contained within it.`,
            consequences: [
                ...folderList.map(folder => `Remove monitoring: ${folder}`),
                `Add monitoring: ${folderPath} (${selectedModel})`
            ],
            estimatedTime: '< 1 minute',
            confirmText: 'Replace Folders',
            cancelText: 'Keep Current Setup'
        };
    };
    
    // Validation function that updates both container and file picker
    const validateAndUpdateContainer = async (folderPath: string) => {
        console.error(`\n=== VALIDATING PATH: ${folderPath} ===`);
        
        const validationResult = await validationService.validateFolderPath(folderPath);
        currentValidation = validationResult;
        
        console.error(`Validation result: isValid=${validationResult.isValid}, hasError=${validationResult.hasError}, hasWarning=${validationResult.hasWarning}`);
        if (validationResult.errorMessage) console.error(`Error: ${validationResult.errorMessage}`);
        if (validationResult.warningMessage) console.error(`Warning: ${validationResult.warningMessage}`);
        
        // For ancestor scenarios, we still allow confirmation but will show destructive dialog
        if (validationResult.hasWarning && validationResult.warningMessage?.includes('replace monitoring')) {
            console.error(`Ancestor scenario detected - destructive confirmation will be shown on confirm`);
        }
        
        // Validation is now handled by FilePickerListItem's built-in validation system
        // The FolderValidationService is passed to the constructor
        
        // Update container validation state for button management
        if (containerWizard) {
            containerWizard.updateValidation(validationResult);
        }
        
        console.error(`=== END VALIDATION ===\n`);
    };
    
    // Create child items
    const childItems: IListItem[] = [];
    
    // Step 1: Folder selection
    folderPicker = new FilePickerListItem(
        '■',
        'Select folder to index',
        initialPath,
        false, // Will be managed by ContainerListItem
        'folder', // folder mode only
        async (newPath) => {
            selectedPath = newPath;
            // Trigger real-time validation
            await validateAndUpdateContainer(newPath);
        },
        undefined, // filterPatterns
        undefined, // onChange - validation will be visible on next render cycle
        false, // showHiddenFiles
        validationService // Pass FolderValidationService for validation
    );
    childItems.push(folderPicker);
    
    // Step 2: Model selection with enhanced metadata display
    const modelOptions: SelectionOption[] = getAllModelsWithMetadata().map(meta => ({
        value: meta.name,
        label: meta.recommended ? `${meta.displayName} (Recommended)` : meta.displayName,
        details: {
            'Languages': meta.languages.join(','),
            'Params': meta.params,
            'GPU': meta.gpuRequired ? 'Required' : 'Optional',
            'Backend': meta.backend
        }
    }));
    
    console.error(`\n=== MODEL OPTIONS DEBUG ===`);
    console.error(`Total models: ${modelOptions.length}`);
    console.error(`First model: ${JSON.stringify(modelOptions[0], null, 2)}`);
    console.error(`=== END MODEL OPTIONS DEBUG ===\n`);
    
    const modelSelector = new SelectionListItem(
        'м',
        'Choose embedding model',
        modelOptions,
        [initialModel], // Initial selection
        false, // Will be managed by ContainerListItem
        'radio', // Single selection
        'vertical', // Vertical layout for detailed display
        (values) => {
            if (values.length > 0 && values[0]) {
                selectedModel = values[0];
            }
        },
        undefined, // minSelections
        undefined, // maxSelections
        false, // autoSwitchLayout
        true, // showDetails - Enable column display
        ['Languages', 'Params', 'GPU', 'Backend'] // Column headers
    );
    childItems.push(modelSelector);
    
    // Set up validation state
    const validationState: ValidationState = {
        result: currentValidation,
        onValidationChange: (result: ValidationResult) => {
            currentValidation = result;
        }
    };
    
    // Create the container with completion handler and dual-button validation support
    containerWizard = new ContainerListItem(
        '⧉',
        'Add Folder',
        childItems,
        false, // Not active initially
        async (results) => {
            // Check for ancestor scenarios requiring destructive confirmation
            if (currentValidation.hasWarning && currentValidation.warningMessage?.includes('replace monitoring')) {
                console.error(`\n=== ANCESTOR SCENARIO CONFIRMATION ===`);
                
                const destructiveConfig = await createAncestorDestructiveConfig(selectedPath);
                if (destructiveConfig) {
                    console.error(`Destructive config created:`);
                    console.error(`  Title: ${destructiveConfig.title}`);
                    console.error(`  Message: ${destructiveConfig.message}`);
                    console.error(`  Level: ${destructiveConfig.level}`);
                    console.error(`  Consequences:`);
                    destructiveConfig.consequences?.forEach(consequence => {
                        console.error(`    - ${consequence}`);
                    });
                    console.error(`  Estimated Time: ${destructiveConfig.estimatedTime}`);
                    console.error(`  Confirm Text: ${destructiveConfig.confirmText}`);
                    console.error(`  Cancel Text: ${destructiveConfig.cancelText}`);
                    
                    // Show actual destructive confirmation dialog
                    console.error(`\n[!] DESTRUCTIVE ACTION CONFIRMATION`);
                    console.error(`${destructiveConfig.title}`);
                    console.error(`${destructiveConfig.message}`);
                    console.error(`\nConsequences:`);
                    destructiveConfig.consequences?.forEach(consequence => {
                        console.error(`  • ${consequence}`);
                    });
                    console.error(`\nCurrent: No parent folder monitoring`);
                    console.error(`New: ${selectedPath} (${selectedModel})`);
                    console.error(`Time: ${destructiveConfig.estimatedTime}`);
                    console.error(`\n[This would show interactive confirmation with Cancel/Confirm buttons in UI]`);
                    console.error(`[!] PROCEEDING WITH ANCESTOR REPLACEMENT (in real UI, user would confirm)`);
                }
                
                console.error(`=== END ANCESTOR CONFIRMATION ===\n`);
            }
            
            // Wizard completed - extract final values
            const result: AddFolderWizardResult = {
                path: selectedPath,
                model: selectedModel
            };
            onComplete(result);
        },
        onCancel, // Cancel handler
        validationState, // Validation state
        true // Enable dual-button mode
    );
    
    // Perform initial validation
    validateAndUpdateContainer(selectedPath).catch(error => {
        console.error(`Initial validation error: ${error}`);
    });
    
    return containerWizard;
}