/**
 * Add Folder Wizard Component
 * 
 * A reusable wizard factory that creates a ContainerListItem for adding folders.
 * Used in both first-run wizard and main screen contexts.
 */

import React from 'react';
import { Text } from 'ink';
import { ContainerListItem } from './core/ContainerListItem';
import { FilePickerListItem } from './core/FilePickerListItem';
import { SelectionListItem } from './core/SelectionListItem';
import { IListItem } from './core/IListItem';
import { getModelOptions, getAllModelsWithMetadata, getModelMetadata } from '../models/modelMetadata';
import { SelectionOption } from './core/SelectionListItem';
import { FMDMValidationAdapter } from '../services/FMDMValidationAdapter';
import { ValidationState, ValidationResult, DEFAULT_VALIDATION, createValidationResult } from './core/ValidationState';
import { IDestructiveConfig } from '../models/configuration';
import { DestructiveConfirmationWrapper, useDestructiveConfirmation } from './DestructiveConfirmationWrapper';
import { theme } from '../utils/theme';

export interface AddFolderWizardResult {
    path: string;
    model: string;
}

export interface AddFolderWizardOptions {
    initialPath?: string;
    initialModel?: string;
    onComplete: (result: AddFolderWizardResult) => void;
    onCancel?: () => void;
    fmdmOperations?: any;
}

/**
 * Custom ContainerListItem for AddFolderWizard that shows path and validation in collapsed state
 */
class AddFolderContainerItem extends ContainerListItem {
    private selectedPath: string;
    private currentValidationResult: ValidationResult;
    
    constructor(
        icon: string,
        label: string,
        selectedPath: string,
        validationResult: ValidationResult,
        childItems: IListItem[],
        isActive: boolean,
        onComplete?: (results: any) => void,
        onCancel?: () => void,
        validationState?: any,
        useDualButtons?: boolean
    ) {
        super(icon, label, childItems, isActive, onComplete, onCancel, validationState, useDualButtons);
        this.selectedPath = selectedPath;
        this.currentValidationResult = validationResult;
    }
    
    updateSelectedPath(path: string): void {
        this.selectedPath = path;
    }
    
    updateValidationResult(result: ValidationResult): void {
        this.currentValidationResult = result;
        // Also update parent's validation
        super.updateValidation(result);
    }
    
    // Override render to show custom collapsed state
    render(maxWidth: number, maxLines?: number): React.ReactElement | React.ReactElement[] {
        if (this.isControllingInput) {
            // Expanded mode - use parent's render
            return super.render(maxWidth, maxLines);
        } else {
            // Collapsed mode - show path and validation like ConfigurationListItem
            // Ensure validation state is current before rendering
            if (this.currentValidationResult.isValid && this.currentValidationResult !== this.validationResult) {
                // Sync validation state to prevent display inconsistencies
                this.currentValidationResult = this.validationResult;
            }
            return this.renderCollapsedWithPathAndValidation(maxWidth);
        }
    }
    
    private renderCollapsedWithPathAndValidation(maxWidth: number): React.ReactElement {
        const icon = this.icon;
        const label = 'Add Folder';
        const path = this.selectedPath;
        
        // Calculate available space
        const iconWidth = icon.length + 1; // icon + space
        const labelWidth = label.length;
        const bracketWidth = 4; // ": []"
        const baseWidth = iconWidth + labelWidth + bracketWidth;
        
        // Reserve space for validation if present
        let validationDisplay = '';
        let validationWidth = 0;
        
        if (this.currentValidationResult.hasError || this.currentValidationResult.hasWarning) {
            const validationIcon = this.currentValidationResult.hasError ? '✗' : '!';
            const validationColor = this.currentValidationResult.hasError ? 'red' : 'yellow';
            const validationMessage = this.currentValidationResult.errorMessage || this.currentValidationResult.warningMessage || '';
            
            // Always show at least the icon
            validationDisplay = ` ${validationIcon}`;
            validationWidth = 2; // space + icon
            
            // Try to fit the message too
            if (validationMessage) {
                const availableForMessage = maxWidth - baseWidth - validationWidth - path.length;
                if (availableForMessage > 3) { // Need at least 3 chars for meaningful message
                    const truncatedMessage = validationMessage.length > availableForMessage - 1
                        ? validationMessage.substring(0, availableForMessage - 2) + '…'
                        : validationMessage;
                    validationDisplay = ` ${validationIcon} ${truncatedMessage}`;
                    validationWidth = validationDisplay.length;
                }
            }
        }
        
        // Calculate space for path
        const availableForPath = maxWidth - baseWidth - validationWidth;
        let displayPath = path;
        
        if (path.length > availableForPath && availableForPath > 0) {
            // Truncate path if needed
            displayPath = path.substring(0, Math.max(1, availableForPath - 1)) + '…';
        }
        
        // Build the display
        const iconColor = this.isActive ? theme.colors.accent : theme.colors.textMuted;
        const textColor = this.isActive ? theme.colors.accent : undefined;
        const pathColor = (this.currentValidationResult.hasError || this.currentValidationResult.hasWarning) 
            ? (this.currentValidationResult.hasError ? 'red' : 'yellow')
            : theme.colors.configValuesColor;
        const validationColor = this.currentValidationResult.hasError ? 'red' : 'yellow';
        
        return (
            <Text>
                <Text {...(iconColor ? { color: iconColor } : {})}>{icon}</Text>
                <Text {...(textColor ? { color: textColor } : {})}> {label}: [</Text>
                <Text color={pathColor}>{displayPath}</Text>
                <Text {...(textColor ? { color: textColor } : {})}>]</Text>
                {validationDisplay && (
                    <Text color={validationColor}>{validationDisplay}</Text>
                )}
            </Text>
        );
    }
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
        onCancel,
        fmdmOperations
    } = options;
    
    
    // Track wizard state
    let selectedPath = initialPath;
    let selectedModel = initialModel;
    
    // Initialize FMDM validation if operations are provided
    // Since we're already past the app-level daemon connection check, we know we're connected
    const validationService = fmdmOperations 
        ? new FMDMValidationAdapter(fmdmOperations, () => true) // Always connected at this point
        : null;
    let currentValidation: ValidationResult = DEFAULT_VALIDATION;
    let containerWizard: AddFolderContainerItem;
    let folderPicker: FilePickerListItem;
    
    // Create destructive config for ancestor scenarios using FMDM validation
    const createAncestorDestructiveConfig = async (folderPath: string): Promise<IDestructiveConfig | undefined> => {
        if (!validationService) return undefined;
        const validationResult = await validationService.validateFolderPath(folderPath);
        
        // Check if validation has ancestor warnings
        if (!validationResult.hasWarning || !validationResult.warningMessage) {
            return undefined;
        }
        
        // For now, we'll extract folder info from the daemon validation warnings
        // This assumes the daemon validation includes affectedFolders info
        const folderCount = 1; // We can't get exact count without the detailed info
        
        return {
            level: 'warning',
            title: 'Replace Existing Monitored Folders',
            message: `Adding "${folderPath}" will replace monitoring of existing folders that are contained within it.`,
            consequences: [
                validationResult.warningMessage,
                `Add monitoring: ${folderPath} (${selectedModel})`
            ],
            estimatedTime: '< 1 minute',
            confirmText: 'Replace Folders',
            cancelText: 'Keep Current Setup'
        };
    };
    
    // Validation function that updates both container and file picker
    const validateAndUpdateContainer = async (folderPath: string) => {
        if (!validationService) {
            currentValidation = createValidationResult(false, 'Validation service not available');
            return;
        }
        const validationResult = await validationService.validateFolderPath(folderPath);
        currentValidation = validationResult;
        
        // Validation is now handled by FilePickerListItem's built-in validation system
        // The FolderValidationService is passed to the constructor
        
        // Update container validation state and display
        if (containerWizard) {
            containerWizard.updateValidationResult(validationResult);
            containerWizard.updateSelectedPath(folderPath);
        }
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
            // Trigger real-time validation (which will update the container display)
            await validateAndUpdateContainer(newPath);
        },
        undefined, // filterPatterns
        async () => {
            // onChange callback - sync FilePickerListItem validation to container
            // This ensures validation state stays consistent between components
            if (validationService && containerWizard) {
                const validationResult = await validationService.validateFolderPath(selectedPath);
                containerWizard.updateValidationResult(validationResult);
            }
        }, // onChange - keep container validation in sync
        false, // showHiddenFiles
        validationService as any // Pass validation service (FolderValidationService or FMDMValidationAdapter)
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
    containerWizard = new AddFolderContainerItem(
        '⧉',
        'Add Folder',
        selectedPath,
        currentValidation,
        childItems,
        false, // Not active initially
        async (results) => {
            // Check for ancestor scenarios requiring destructive confirmation
            if (currentValidation.hasWarning && currentValidation.warningMessage?.includes('replace monitoring')) {
                const destructiveConfig = await createAncestorDestructiveConfig(selectedPath);
                if (destructiveConfig) {
                    // TODO: Show actual destructive confirmation dialog
                    // For now, proceed with the action
                }
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
        true // Enable dual-button mode with Add Folder and Cancel buttons
    );
    
    // Configure buttons - neither is destructive
    containerWizard.configureButtons(
        { text: 'Add Folder', isDestructive: false },
        { text: 'Cancel', isDestructive: false }
    );
    
    // Perform initial validation now that containerWizard is created
    // This ensures the validation state is properly initialized
    validateAndUpdateContainer(selectedPath).catch(error => {
        console.error(`Initial validation error: ${error}`);
        // If validation fails, set a basic error state
        if (containerWizard) {
            containerWizard.updateValidationResult(createValidationResult(false, 'Validation service unavailable'));
        }
    });
    
    return containerWizard;
}