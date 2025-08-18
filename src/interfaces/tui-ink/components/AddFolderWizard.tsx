/**
 * Add Folder Wizard Component
 * 
 * A reusable wizard factory that creates a ContainerListItem for adding folders.
 * Used in both first-run wizard and main screen contexts.
 */

import React from 'react';
import { Text, Key } from 'ink';
import { ContainerListItem } from './core/ContainerListItem';
import { FilePickerListItem } from './core/FilePickerListItem';
import { SelectionListItem } from './core/SelectionListItem';
import { VerticalToggleRowListItem } from './core/VerticalToggleRow';
import { IListItem } from './core/IListItem';
import { ModelInfo } from '../services/ModelListService';
import { SelectionOption } from './core/SelectionListItem';
import { FMDMValidationAdapter } from '../services/FMDMValidationAdapter';
import { ValidationState, ValidationResult, DEFAULT_VALIDATION, createValidationResult } from './core/ValidationState';
import { ValidationState as ValidatedListItemValidationState, createValidationMessage } from '../validation/ValidationState';
import { IDestructiveConfig } from '../models/configuration';
import { theme } from '../utils/theme';

/**
 * Language code to display name mapping for comprehensive language support
 * Pre-sorted by English name with English first, then alphabetically
 * Only English names to avoid Unicode TUI issues
 */
const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
    'en': 'English',
    'af': 'Afrikaans',
    'sq': 'Albanian',
    'am': 'Amharic',
    'ar': 'Arabic',
    'hy': 'Armenian',
    'az': 'Azerbaijani',
    'eu': 'Basque',
    'be': 'Belarusian',
    'bn': 'Bengali',
    'bg': 'Bulgarian',
    'ca': 'Catalan',
    'zh': 'Chinese',
    'zh-tw': 'Chinese Traditional',
    'hr': 'Croatian',
    'cs': 'Czech',
    'da': 'Danish',
    'nl': 'Dutch',
    'et': 'Estonian',
    'fil': 'Filipino',
    'fi': 'Finnish',
    'fr': 'French',
    'gl': 'Galician',
    'ka': 'Georgian',
    'de': 'German',
    'el': 'Greek',
    'gu': 'Gujarati',
    'ha': 'Hausa',
    'he': 'Hebrew',
    'hi': 'Hindi',
    'hu': 'Hungarian',
    'is': 'Icelandic',
    'id': 'Indonesian',
    'ga': 'Irish',
    'it': 'Italian',
    'ja': 'Japanese',
    'kn': 'Kannada',
    'kk': 'Kazakh',
    'km': 'Khmer',
    'ko': 'Korean',
    'ku': 'Kurdish',
    'lo': 'Lao',
    'lv': 'Latvian',
    'lt': 'Lithuanian',
    'mk': 'Macedonian',
    'ms': 'Malay',
    'ml': 'Malayalam',
    'mr': 'Marathi',
    'mn': 'Mongolian',
    'my': 'Myanmar',
    'ne': 'Nepali',
    'no': 'Norwegian',
    'ps': 'Pashto',
    'fa': 'Persian',
    'pl': 'Polish',
    'pt': 'Portuguese',
    'pa': 'Punjabi',
    'ro': 'Romanian',
    'ru': 'Russian',
    'sr': 'Serbian',
    'si': 'Sinhala',
    'sk': 'Slovak',
    'sl': 'Slovenian',
    'so': 'Somali',
    'es': 'Spanish',
    'sw': 'Swahili',
    'sv': 'Swedish',
    'ta': 'Tamil',
    'te': 'Telugu',
    'th': 'Thai',
    'tr': 'Turkish',
    'uk': 'Ukrainian',
    'ur': 'Urdu',
    'uz': 'Uzbek',
    'vi': 'Vietnamese',
    'cy': 'Welsh',
    'xh': 'Xhosa',
    'yo': 'Yoruba',
};

function getLanguageDisplayName(code: string): string {
    return LANGUAGE_DISPLAY_NAMES[code] || code.toUpperCase();
}

export interface AddFolderWizardResult {
    path: string;
    model: string;
    mode: 'assisted' | 'manual';
    languages: string[];
}

export interface AddFolderWizardOptions {
    initialPath?: string;
    initialModel?: string;
    initialMode?: 'assisted' | 'manual';
    initialLanguages?: string[];
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
    
    // Override handleInput to customize left arrow behavior
    handleInput(input: string, key: Key): boolean {
        if (key.leftArrow) {
            // Get current state using type assertions to access protected members
            const focusedButton = (this as any)._focusedButton;
            const isConfirmFocused = (this as any)._isConfirmFocused;
            const childSelectedIndex = (this as any)._childSelectedIndex;
            const activeChild = (this as any)._childItems[childSelectedIndex];
            
            // Check if we're at the button level
            if (focusedButton || isConfirmFocused) {
                // Toggle between buttons
                if (focusedButton === 'cancel') {
                    // Move from Cancel to Add Folder (if enabled)
                    if (this.isConfirmEnabled) {
                        (this as any)._focusedButton = 'confirm';
                    }
                    return true;
                } else if (focusedButton === 'confirm' || isConfirmFocused) {
                    // Move from Add Folder to Cancel
                    (this as any)._focusedButton = 'cancel';
                    (this as any)._isConfirmFocused = false;
                    return true;
                }
            } else if (activeChild && !activeChild.isControllingInput) {
                // REFINED FIX: Only allow VerticalToggleRow to expand on left arrow, others jump to Cancel
                if (activeChild.constructor.name === 'VerticalToggleRowListItem' && activeChild.onExpand) {
                    // Let parent ContainerListItem handle the left arrow to call onExpand
                    return super.handleInput(input, key);
                } else {
                    // We're on a collapsed child item - jump to Cancel button for navigation
                    (this as any)._focusedButton = 'cancel';
                    (this as any)._childSelectedIndex = -1;
                    return true;
                }
            }
        }
        
        // For all other keys, use parent's handling
        return super.handleInput(input, key);
    }
    
    // Override render to show custom collapsed state
    render(maxWidth: number, maxLines?: number): React.ReactElement | React.ReactElement[] {
        if (this.isControllingInput) {
            // Expanded mode - use parent's render
            return super.render(maxWidth, maxLines);
        } else {
            // Collapsed mode - show path and validation like ConfigurationListItem
            // Don't override currentValidationResult - it has the most up-to-date validation
            // The parent's validationResult might be stale or default
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
        
        // Validation display logic follows
        
        if (this.currentValidationResult.hasError || this.currentValidationResult.hasWarning) {
            const validationIcon = this.currentValidationResult.hasError ? '✗' : '!';
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
        } else {
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
 * @returns Promise<ContainerListItem> configured as an add folder wizard
 */
export async function createAddFolderWizard(options: AddFolderWizardOptions): Promise<ContainerListItem> {
    const {
        initialPath = process.cwd(),
        initialModel, // Will be set dynamically from daemon
        initialMode = 'assisted', // Default to assisted mode
        initialLanguages = ['en'], // Default to English
        onComplete,
        onCancel,
        fmdmOperations
    } = options;

    // Get models from daemon to determine the correct default
    let selectedModel = initialModel;
    let pythonModels: ModelInfo[] = [];
    
    if (fmdmOperations && fmdmOperations.getModels) {
        try {
            const { models } = await fmdmOperations.getModels();
            // Convert daemon models to ModelInfo format
            pythonModels = models.map((modelName: string) => ({
                name: modelName,
                displayName: modelName.replace('folder-mcp:', '') + ' (Recommended)',
                backend: 'python' as const,
                recommended: true
            }));
            
            // Use first model from daemon as default if no initial model provided
            if (!initialModel && pythonModels.length > 0) {
                if (!initialModel && pythonModels.length > 0) {
                selectedModel = pythonModels[0]?.name;
            }
            }
        } catch (error) {
            console.error('Failed to get models from daemon, using fallback list:', error);
            // Fallback to hardcoded list if daemon call fails
            pythonModels = [{
                name: 'folder-mcp:all-MiniLM-L6-v2',
                displayName: 'All-MiniLM-L6-v2 (Recommended)',
                backend: 'python',
                recommended: true
            }];
            if (!initialModel && pythonModels.length > 0) {
                selectedModel = pythonModels[0]?.name;
            }
        }
    } else {
        // Fallback if no FMDM operations available
        pythonModels = [{
            name: 'folder-mcp:all-MiniLM-L6-v2',
            displayName: 'All-MiniLM-L6-v2 (Recommended)',
            backend: 'python',
            recommended: true
        }];
        selectedModel = pythonModels[0]?.name;
    }
    
    // Validate that initialModel exists in the list
    let modelValidationError: string | null = null;
    
    
    if (selectedModel && pythonModels.length > 0) {
        const modelExists = pythonModels.some(m => m.name === selectedModel);
        if (!modelExists) {
            modelValidationError = `Model "${selectedModel}" is not available. Please select from the list.`;
            // Don't change selectedModel - keep it to show the error
        }
    } else if (!selectedModel && pythonModels.length > 0) {
        // If no model selected, use first available
        selectedModel = pythonModels[0]?.name;
    }
    
    // Track wizard state
    let selectedPath = initialPath;
    let selectedMode = initialMode;
    let selectedLanguages = [...initialLanguages];
    // selectedModel is already declared above with dynamic daemon fetching
    
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
    
    // Validation function that validates both folder and model
    const validateAndUpdateContainer = async (folderPath: string, model?: string) => {
        if (!validationService) {
            currentValidation = createValidationResult(false, 'Validation service not available');
            return;
        }
        
        const modelToValidate = model || selectedModel;
        if (!modelToValidate) {
            currentValidation = createValidationResult(false, 'Please select an embedding model');
            if (containerWizard) {
                containerWizard.updateValidationResult(currentValidation);
            }
            return;
        }
        
        let validationResult: ValidationResult;
        
        if (validationService.validateFolderAndModel) {
            validationResult = await validationService.validateFolderAndModel(folderPath, modelToValidate);
        } else {
            validationResult = await validationService.validateFolderPath(folderPath);
        }
        
        currentValidation = validationResult;
        
        // Update container validation state and display
        if (containerWizard) {
            containerWizard.updateValidationResult(validationResult);
            containerWizard.updateSelectedPath(folderPath);
        }
    };
    
    // Create child items
    const childItems: IListItem[] = [];
    
    // Step 1: Mode selection - Using VerticalToggleRow for cleaner UI
    const modeToggleOptions = [
        {
            value: 'assisted',
            label: 'Assisted (Recommended)'
        },
        {
            value: 'manual',
            label: 'Manual (Advanced)'
        }
    ];
    
    const modeSelector = new VerticalToggleRowListItem(
        '⁃',
        'Choose configuration mode',
        modeToggleOptions,
        selectedMode, // Pre-select the initial mode
        false, // Will be managed by ContainerListItem
        (value: string) => {
            selectedMode = value as 'assisted' | 'manual';
        }
    );
    childItems.push(modeSelector);
    
    // Step 2: Language selection - Load from curated models catalog (single source of truth)
    const { ModelCompatibilityEvaluator } = await import('../../../domain/models/model-evaluator');
    const modelEvaluator = new ModelCompatibilityEvaluator();
    const supportedLanguageCodes = modelEvaluator.getSupportedLanguages();
    
    // Pre-sorted language order: English first, then alphabetically by English name
    const languageOrder = [
        'en', 'af', 'sq', 'am', 'ar', 'hy', 'az', 'eu', 'be', 'bn', 'bg', 'ca',
        'zh', 'zh-tw', 'hr', 'cs', 'da', 'nl', 'et', 'fil', 'fi', 'fr', 'gl',
        'ka', 'de', 'el', 'gu', 'ha', 'he', 'hi', 'hu', 'is', 'id', 'ga', 'it',
        'ja', 'kn', 'kk', 'km', 'ko', 'ku', 'lo', 'lv', 'lt', 'mk', 'ms', 'ml',
        'mr', 'mn', 'my', 'ne', 'no', 'ps', 'fa', 'pl', 'pt', 'pa', 'ro', 'ru',
        'sr', 'si', 'sk', 'sl', 'so', 'es', 'sw', 'sv', 'ta', 'te', 'th', 'tr',
        'uk', 'ur', 'uz', 'vi', 'cy', 'xh', 'yo'
    ];
    
    // Filter pre-sorted languages by what's available in curated models (no runtime sorting needed)
    const supportedSet = new Set(supportedLanguageCodes);
    const languageOptions: SelectionOption[] = languageOrder
        .filter(code => supportedSet.has(code))
        .map(code => {
            const languageName = getLanguageDisplayName(code);
            
            return {
                value: code,
                label: languageName
            };
        });
    
    const languageSelector = new SelectionListItem(
        '⁃',
        'Select document languages',
        languageOptions,
        [...selectedLanguages], // Pre-select the initial languages (copy array)
        false, // Will be managed by ContainerListItem
        'checkbox', // Multi-selection
        'vertical', // Vertical layout
        async (values) => {
            selectedLanguages = [...values];
            // Update the selectedValues property of the component to maintain state
            languageSelector.selectedValues = [...values];
        },
        1, // minSelections - at least one language required
        undefined, // maxSelections - no maximum
        false, // autoSwitchLayout
        false // showDetails - Simplified to single column display
    );
    childItems.push(languageSelector);
    
    // Step 3: Folder selection
    folderPicker = new FilePickerListItem(
        '⁃',
        'Select folder to index',
        initialPath,
        false, // Will be managed by ContainerListItem
        'folder', // folder mode only
        async (newPath) => {
            selectedPath = newPath;
            // Trigger real-time validation of both folder and model
            await validateAndUpdateContainer(newPath, selectedModel);
        },
        undefined, // filterPatterns
        async () => {
            // onChange callback - sync validation to container with both folder and model
            if (validationService && containerWizard) {
                // Check if we have a model validation error first
                if (modelValidationError) {
                    // Keep the model validation error
                    containerWizard.updateValidationResult(createValidationResult(false, modelValidationError));
                } else if (selectedModel) {
                    let validationResult: ValidationResult;
                    if (validationService.validateFolderAndModel) {
                        validationResult = await validationService.validateFolderAndModel(selectedPath, selectedModel);
                    } else {
                        validationResult = await validationService.validateFolderPath(selectedPath);
                    }
                    containerWizard.updateValidationResult(validationResult);
                } else {
                    // No model selected
                    containerWizard.updateValidationResult(createValidationResult(false, 'Please select an embedding model'));
                }
            }
        }, // onChange - keep container validation in sync
        false, // showHiddenFiles
        validationService as any // Pass validation service (FolderValidationService or FMDMValidationAdapter)
    );
    
    childItems.push(folderPicker);
    
    // Step 4: Model selection with dynamically fetched Python models
    const modelOptions: SelectionOption[] = pythonModels.map(model => ({
        value: model.name,
        label: model.recommended ? `${model.displayName}` : model.displayName,
        details: {
            'Backend': model.backend,
            'Type': 'Sentence Transformer',
            'Status': 'Available'
        }
    }));
    
    
    // For display purposes, we'll show the invalid model in the selection even if it's not in options
    // This helps users understand what model was attempted
    const initialModelSelection = selectedModel ? [selectedModel] : [];
    
    const modelSelector = new SelectionListItem(
        '⁃',
        'Choose embedding model',
        modelOptions,
        initialModelSelection, // Show the model even if invalid
        false, // Will be managed by ContainerListItem
        'radio', // Single selection
        'vertical', // Vertical layout for detailed display
        async (values) => {
            if (values.length > 0 && values[0]) {
                selectedModel = values[0];
                // Clear model validation error when user selects a valid model
                modelValidationError = null;
                modelSelector._validationMessage = null;
                // Trigger validation when model changes
                await validateAndUpdateContainer(selectedPath, selectedModel);
            }
        },
        undefined, // minSelections
        undefined, // maxSelections
        false, // autoSwitchLayout
        true, // showDetails - Enable column display
        ['Backend', 'Type', 'Status'] // Column headers
    );
    childItems.push(modelSelector);
    
    // Set validation error if model doesn't exist using validation message
    if (modelValidationError) {
        // Create a validation message for the model selector
        const modelValidationMessage = createValidationMessage(ValidatedListItemValidationState.Error, modelValidationError);
        modelSelector._validationMessage = modelValidationMessage;
    }
    
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
        async () => {
            // Check for ancestor scenarios requiring destructive confirmation
            if (currentValidation.hasWarning && currentValidation.warningMessage?.includes('replace monitoring')) {
                const destructiveConfig = await createAncestorDestructiveConfig(selectedPath);
                if (destructiveConfig) {
                    // TODO: Show actual destructive confirmation dialog
                    // For now, proceed with the action
                }
            }
            
            // Wizard completed - extract final values
            if (!selectedModel) {
                console.error('No model selected for wizard completion');
                return;
            }
            
            if (selectedLanguages.length === 0) {
                console.error('No languages selected for wizard completion');
                return;
            }
            
            const result: AddFolderWizardResult = {
                path: selectedPath,
                model: selectedModel,
                mode: selectedMode,
                languages: selectedLanguages
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
    // This ensures the validation state is properly initialized with both folder and model
    try {
        // Check model validation first
        if (modelValidationError) {
            const modelErrorResult = createValidationResult(false, modelValidationError);
            containerWizard.updateValidationResult(modelErrorResult);
            // Also update the current validation state
            currentValidation = modelErrorResult;
        } else {
            await validateAndUpdateContainer(selectedPath, selectedModel);
            // Initial validation completed
            
            // Also set the validation on the folder picker so it shows immediately
            if (currentValidation.hasWarning || currentValidation.hasError) {
                const state = currentValidation.hasError ? ValidatedListItemValidationState.Error : ValidatedListItemValidationState.Warning;
                const message = currentValidation.errorMessage || currentValidation.warningMessage || '';
                const validationMessage = createValidationMessage(state, message);
                folderPicker.setValidationMessage(validationMessage);
            }
        }
    } catch (error) {
        // If validation fails, set a basic error state
        if (containerWizard) {
            containerWizard.updateValidationResult(createValidationResult(false, 'Validation service unavailable'));
        }
    }
    
    return containerWizard;
}