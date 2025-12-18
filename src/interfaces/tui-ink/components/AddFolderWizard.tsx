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
import { SelectionOption } from './core/SelectionListItem';
import { FMDMValidationAdapter } from '../services/FMDMValidationAdapter';
import { ValidationState, ValidationResult, DEFAULT_VALIDATION, createValidationResult } from './core/ValidationState';
import { ValidationState as ValidatedListItemValidationState, createValidationMessage } from '../validation/ValidationState';
import { IDestructiveConfig } from '../models/configuration';
import { getCurrentTheme } from '../utils/theme';
import { DaemonConnector } from '../daemon-connector.js';
import { 
    ModelRecommendMessage, 
    ModelRecommendResponseMessage, 
    ModelCompatibilityScore 
} from '../../../daemon/websocket/message-types';

/**
 * WebSocket client interface for daemon communication
 */
interface WebSocketClient {
    connect(url: string): Promise<void>;
    send(message: any): void;
    onMessage(callback: (data: any) => void): void;
    close(): void;
    isConnected(): boolean;
}

/**
 * Simple WebSocket client implementation for Node.js environment
 */
class SimpleWebSocketClient implements WebSocketClient {
    private ws: any = null; // Using any to avoid WebSocket type issues in Node.js
    private messageCallbacks: Array<(data: any) => void> = [];
    private closeCallbacks: Array<() => void> = [];

    async connect(_url: string): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                // Use DaemonConnector for auto-discovery instead of hardcoded URL (ignores url parameter)
                const daemonConnector = new DaemonConnector({ timeoutMs: 3000, maxRetries: 1 });
                const { ws } = await daemonConnector.connect();
                
                this.ws = ws;
                
                // Set up message handling
                this.ws.on('message', (data: Buffer) => {
                    try {
                        const parsed = JSON.parse(data.toString());
                        this.messageCallbacks.forEach(callback => callback(parsed));
                    } catch (error) {
                        console.error('Failed to parse WebSocket message:', error);
                    }
                });
                
                this.ws.on('close', () => {
                    this.ws = null;
                    // Notify all close listeners
                    this.closeCallbacks.forEach(callback => callback());
                });
                
                // Connection already established by DaemonConnector
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    send(message: any): void {
        if (this.ws && this.ws.readyState === 1) { // 1 = WebSocket.OPEN
            this.ws.send(JSON.stringify(message));
        }
    }

    onMessage(callback: (data: any) => void): void {
        this.messageCallbacks.push(callback);
    }

    onClose(callback: () => void): void {
        this.closeCallbacks.push(callback);
    }

    close(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === 1; // 1 = WebSocket.OPEN
    }
}

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
    onModeChange?: (mode: 'assisted' | 'manual') => void;
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
    
    /**
     * Update child items dynamically for mode switching
     */
    updateChildItems(newChildItems: IListItem[]): void {
        // Clear existing children
        while ((this as any)._childItems.length > 0) {
            this.removeChild((this as any)._childItems[0]);
        }
        
        // Add new children
        newChildItems.forEach(child => this.addChild(child));
        
        // Reset selection to first item
        (this as any)._childSelectedIndex = 0;
        
        // Call onEnter to properly initialize the new children
        this.onEnter();
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
        const theme = getCurrentTheme();
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

    // Initialize WebSocket client for daemon communication using auto-discovery
    const wsClient = new SimpleWebSocketClient();
    
    // Try to connect to daemon using auto-discovery
    try {
        await wsClient.connect(''); // URL parameter is ignored, uses auto-discovery
        // WebSocket connected to daemon successfully via auto-discovery
    } catch (error) {
        // Failed to connect to daemon
    }
    
    // Initialize model state
    let selectedModel = initialModel;
    let currentModels: ModelCompatibilityScore[] = [];
    let modelValidationError: string | null = null;
    
    // Track wizard state
    let selectedPath = initialPath;
    let selectedMode = initialMode;
    let selectedLanguages = [...initialLanguages];
    
    // Separate model state for each mode to handle incompatible selections
    let assistedSelectedModel: string | undefined; 
    let manualSelectedModel: string | undefined;
    
    // Model selection will be initialized after getting recommendations from daemon
    // This is deferred until we get the actual model compatibility data
    
    // Initialize FMDM validation if operations are provided
    // Since we're already past the app-level daemon connection check, we know we're connected
    const validationService = fmdmOperations 
        ? new FMDMValidationAdapter(fmdmOperations, () => true) // Always connected at this point
        : null;
    let currentValidation: ValidationResult = DEFAULT_VALIDATION;
    let containerWizard: AddFolderContainerItem;
    let folderPicker: FilePickerListItem;
    
    // Data model for change detection - only validate when this changes
    interface WizardDataModel {
        path: string;
        mode: 'assisted' | 'manual';
        model: string | undefined;
        languages: string[];
    }
    
    // Track last validated state to detect changes
    let lastValidatedData: string | null = null;
    
    // Helper to get current data model
    const getCurrentDataModel = (): WizardDataModel => ({
        path: selectedPath,
        mode: selectedMode,
        model: selectedMode === 'assisted' ? assistedSelectedModel : manualSelectedModel,
        languages: selectedLanguages
    });
    
    // Check if data model has changed since last validation
    const hasDataChanged = (): boolean => {
        const currentData = JSON.stringify(getCurrentDataModel());
        if (lastValidatedData === null || currentData !== lastValidatedData) {
            return true;
        }
        return false;
    };
    
    // Update data model and validate only if changed
    const updateDataModelAndValidate = async () => {
        if (!hasDataChanged()) {
            return; // No data change, skip validation
        }
        
        const dataModel = getCurrentDataModel();
        if (!dataModel.model) {
            // No model selected yet
            currentValidation = createValidationResult(false, 'Please select an embedding model');
            if (containerWizard) {
                containerWizard.updateValidationResult(currentValidation);
            }
            return;
        }
        
        // Data changed, validate
        await validateAndUpdateContainer(dataModel.path, dataModel.model);
        lastValidatedData = JSON.stringify(dataModel);
    };
    
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
        
        // Use provided model or current mode's selected model
        const modelToValidate = model || (selectedMode === 'assisted' ? assistedSelectedModel : manualSelectedModel);
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
    
    // Create child items - will be replaced by buildChildItemsForMode after all components are defined
    let childItems: IListItem[] = [];
    
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
    
    // Create mode selector with no initial callback - will be set after container exists
    const modeSelector = new VerticalToggleRowListItem(
        '⁃',
        'Choose configuration mode',
        modeToggleOptions,
        selectedMode, // Pre-select the initial mode
        false, // Will be managed by ContainerListItem
        undefined // No callback yet - will be set after container is created
    );
    
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
            const newLanguages = [...values];
            // Only update if languages actually changed
            const oldLanguages = JSON.stringify(selectedLanguages);
            const currentLanguages = JSON.stringify(newLanguages);

            if (oldLanguages !== currentLanguages) {
                selectedLanguages = newLanguages;
                // Update the selectedValues property of the component to maintain state
                languageSelector.selectedValues = newLanguages;

                // Trigger model re-evaluation for current mode
                await updateModelOptions(selectedMode, newLanguages);

                // Validate only if data model changed
                await updateDataModelAndValidate();
            }
        },
        undefined, // onPreviewChange - not used here
        undefined, // onCancel - not used here
        1, // minSelections - at least one language required
        undefined, // maxSelections - no maximum
        false, // autoSwitchLayout
        false // showDetails - Simplified to single column display
    );
    
    // Step 3: Folder selection
    folderPicker = new FilePickerListItem(
        '⁃',
        'Select folder to index',
        initialPath,
        false, // Will be managed by ContainerListItem
        'folder', // folder mode only
        async (newPath) => {
            // Only update if path actually changed
            if (newPath !== selectedPath) {
                selectedPath = newPath;
                // Validate only if data model changed
                await updateDataModelAndValidate();
            }
        },
        undefined, // filterPatterns
        undefined, // No onChange - we only validate on actual path changes
        false, // showHiddenFiles
        undefined // No validation service - handled by data model
    );
    
    // Step 4: Create separate model selectors for assisted and manual modes
    
    // Assisted mode model selector - curated models only with recommendation column
    // Initially empty, will be populated by daemon recommendations
    let assistedModelOptions: SelectionOption[] = [];
    
    const assistedModelSelector = new SelectionListItem(
        '⁃',
        'Choose embedding model',
        assistedModelOptions,
        assistedSelectedModel ? [assistedSelectedModel] : [],
        false, // Will be managed by ContainerListItem
        'radio', // Single selection
        'vertical', // Vertical layout for detailed display
        async (values) => {
            if (values.length > 0 && values[0]) {
                const newModel = values[0];
                // Only update if model actually changed
                if (newModel !== assistedSelectedModel) {
                    assistedSelectedModel = newModel;
                    // Clear model validation error when user selects a valid model
                    modelValidationError = null;
                    assistedModelSelector._validationMessage = null;
                    // Validate only if data model changed
                    await updateDataModelAndValidate();
                }
            }
        },
        undefined, // onPreviewChange - not used here
        undefined, // onCancel - not used here
        undefined, // minSelections
        undefined, // maxSelections
        false, // autoSwitchLayout
        true, // showDetails - Enable column display
        ['Match', 'Recommendation', 'Speed', 'Languages', 'Type', 'Size', 'Local Copy'] // Assisted mode columns
    );
    
    // Manual mode model selector - all models including Ollama with compatibility column
    // Initially empty, will be populated by daemon recommendations
    let manualModelOptions: SelectionOption[] = [];
    
    const manualModelSelector = new SelectionListItem(
        '⁃',
        'Choose embedding model',
        manualModelOptions,
        manualSelectedModel ? [manualSelectedModel] : [],
        false, // Will be managed by ContainerListItem
        'radio', // Single selection
        'vertical', // Vertical layout for detailed display
        async (values) => {
            if (values.length > 0 && values[0]) {
                const newModel = values[0];
                // Only update if model actually changed
                if (newModel !== manualSelectedModel) {
                    manualSelectedModel = newModel;
                    // Clear model validation error when user selects a valid model
                    modelValidationError = null;
                    manualModelSelector._validationMessage = null;
                    // Validate only if data model changed
                    await updateDataModelAndValidate();
                }
            }
        },
        undefined, // onPreviewChange - not used here
        undefined, // onCancel - not used here
        undefined, // minSelections
        undefined, // maxSelections
        false, // autoSwitchLayout
        true, // showDetails - Enable column display
        ['Match', 'Compatibility', 'Speed', 'Languages', 'Type', 'Size', 'Local Copy'] // Manual mode columns
    );
    
    // Model recommendation and dynamic update functionality
    let requestIdCounter = 0;
    const pendingRequests = new Map<string, { resolve: (response: any) => void; reject: (error: Error) => void }>();
    
    // Set up WebSocket message handler for model recommendations (always, not conditionally)
    wsClient.onMessage((message: any) => {
        if (message.type === 'models.recommend.response' && message.id && pendingRequests.has(message.id)) {
            const promiseHandlers = pendingRequests.get(message.id);
            if (promiseHandlers) {
                promiseHandlers.resolve(message);
                pendingRequests.delete(message.id);
            }
        }
    });
    
    // Set up WebSocket close handler to clean up pending requests
    wsClient.onClose(() => {
        // Reject all pending requests when connection closes
        pendingRequests.forEach((promiseHandlers, requestId) => {
            promiseHandlers.reject(new Error('WebSocket connection closed'));
        });
        pendingRequests.clear();
    });
    
    // Function to request model recommendations from daemon
    const requestModelRecommendations = async (languages: string[], mode: 'assisted' | 'manual'): Promise<ModelCompatibilityScore[]> => {
        // Requesting model recommendations
        
        if (!wsClient.isConnected()) {
            // Not connected to daemon - returning empty list
            return [];
        }
        
        const requestId = `model-recommend-${++requestIdCounter}`;
        
        const message: ModelRecommendMessage = {
            type: 'models.recommend',
            id: requestId,
            payload: {
                languages,
                mode
            }
        };
        
        // Send WebSocket message
        
        return new Promise((resolve, reject) => {
            // Check connection again right before sending
            if (!wsClient.isConnected()) {
                // Connection lost before send - returning empty list
                resolve([]);
                return;
            }
            
            // Set up response handler with both resolve and reject
            pendingRequests.set(requestId, {
                resolve: (response: ModelRecommendResponseMessage) => {
                    // Received model recommendation response
                    if (response.data) {
                        // Found models
                        resolve(response.data.models);
                    } else {
                        // No data in response - returning empty list
                        resolve([]);
                    }
                },
                reject: (error: Error) => {
                    // Connection closed or other error
                    resolve([]); // Return empty list on error
                }
            });
            
            // Send request (protected by connection check above)
            wsClient.send(message);
            
            // Set timeout for request
            setTimeout(() => {
                if (pendingRequests.has(requestId)) {
                    // Request timed out after 5 seconds
                    pendingRequests.delete(requestId);
                    resolve([]); // Fallback to empty list on timeout
                }
            }, 5000); // 5 second timeout
        });
    };
    
    // Function to update model options for a specific mode
    const updateModelOptions = async (mode: 'assisted' | 'manual', languages: string[]) => {
        // Updating model options
        try {
            const models = await requestModelRecommendations(languages, mode);
            currentModels = models;
            // Converting models to SelectionOptions
            
            // Sort models by score (highest first)
            const sortedModels = models.sort((a, b) => b.score - a.score);
            
            // Convert ModelCompatibilityScore to SelectionOption
            const options: SelectionOption[] = sortedModels.map(model => ({
                value: model.modelId,
                label: model.displayName,
                details: {
                    ...(mode === 'assisted' ? {
                        'Recommendation': model.details.recommendation || 
                            (model.score >= 80 ? 'Good' : 
                             model.score >= 60 ? 'Alternative' : 
                             'Available')
                    } : {
                        'Compatibility': model.compatibility === 'supported' ? '√ Supported' : 
                                       model.compatibility === 'needs_gpu' ? '⚠ Needs GPU' : 
                                       model.compatibility === 'needs_vram' ? '⚠ Needs VRAM' : 
                                       model.compatibility === 'incompatible' ? '✗ Incompatible' : '? User Managed'
                    }),
                    'Speed': model.details.speed,
                    'Match': `${Math.round(model.score)}%`,
                    'Languages': model.details.languages,
                    'Type': model.details.type,
                    'Size': model.details.size,
                    'Local Copy': model.details.localCopy ? '√' : '✗'
                }
            }));
            
            // Update the appropriate model selector
            if (mode === 'assisted') {
                // Updating assisted model selector
                assistedModelOptions = options;
                assistedModelSelector.updateOptions(options);
                
                // Auto-select recommended model if none selected
                if (!assistedSelectedModel && models.length > 0) {
                    const recommendedModel = models.find(m => m.details.recommendation);
                    const modelToSelect = recommendedModel ? recommendedModel.modelId : models[0]?.modelId;
                    if (modelToSelect) {
                        // Auto-selecting assisted model
                        assistedSelectedModel = modelToSelect;
                        assistedModelSelector.selectValue(modelToSelect);
                    }
                }
            } else {
                // Updating manual model selector
                manualModelOptions = options;
                manualModelSelector.updateOptions(options);
                
                // Auto-select first compatible model if none selected
                if (!manualSelectedModel && models.length > 0) {
                    const compatibleModel = models.find(m => m.compatibility === 'supported');
                    const modelToSelect = compatibleModel ? compatibleModel.modelId : models[0]?.modelId;
                    if (modelToSelect) {
                        // Auto-selecting manual model
                        manualSelectedModel = modelToSelect;
                        manualModelSelector.selectValue(modelToSelect);
                    }
                }
            }
            
        } catch (error) {
            // Failed to update model options
        }
    };
    
    // Set validation error if model doesn't exist using validation message
    if (modelValidationError) {
        // Create a validation message for the appropriate model selector based on mode
        const modelValidationMessage = createValidationMessage(ValidatedListItemValidationState.Error, modelValidationError);
        if (selectedMode === 'assisted') {
            assistedModelSelector._validationMessage = modelValidationMessage;
        } else {
            manualModelSelector._validationMessage = modelValidationMessage;
        }
    }
    
    // Helper function to build child items based on selected mode
    const buildChildItemsForMode = (mode: 'assisted' | 'manual'): IListItem[] => {
        const items: IListItem[] = [];
        
        // Always include mode selector
        items.push(modeSelector);
        
        // Conditional language selector (assisted mode only)
        if (mode === 'assisted') {
            items.push(languageSelector);
        }
        
        // Always include folder picker
        items.push(folderPicker);
        
        // Mode-specific model selector
        if (mode === 'assisted') {
            items.push(assistedModelSelector);
        } else {
            items.push(manualModelSelector);
        }
        
        return items;
    };
    
    // Initialize child items with current mode
    childItems = buildChildItemsForMode(selectedMode);
    
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
            
            // Wizard completed - extract final values based on current mode
            const finalSelectedModel = selectedMode === 'assisted' ? assistedSelectedModel : manualSelectedModel;
            
            if (!finalSelectedModel) {
                return;
            }
            
            // For assisted mode, language selection is required; for manual mode, it's not used
            if (selectedMode === 'assisted' && selectedLanguages.length === 0) {
                return;
            }
            
            const result: AddFolderWizardResult = {
                path: selectedPath,
                model: finalSelectedModel,
                mode: selectedMode,
                languages: selectedMode === 'assisted' ? selectedLanguages : [] // Empty for manual mode
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
    
    // Now that container exists, set up the proper mode selection callback
    modeSelector.updateOnSelectionChange(async (value: string) => {
        const oldMode = selectedMode;
        const newMode = value as 'assisted' | 'manual';
        
        // Only trigger changes if mode actually changed
        if (oldMode !== newMode) {
            selectedMode = newMode;
            
            // Handle mode-specific state changes
            if (selectedMode === 'assisted') {
                selectedLanguages = ['en'];
                languageSelector.selectedValues = ['en'];
            } else {
                selectedLanguages = [];
            }
            
            // Update the container's children immediately
            const newChildItems = buildChildItemsForMode(selectedMode);
            containerWizard.updateChildItems(newChildItems);
            
            // Trigger model re-evaluation for new mode
            await updateModelOptions(selectedMode, selectedLanguages);
            
            // Validate only if data model changed (includes mode + model + languages)
            await updateDataModelAndValidate();
            
            // Call the onModeChange callback to trigger React re-render
            if (options.onModeChange) {
                options.onModeChange(selectedMode);
            }
        }
    });
    
    // Load initial model recommendations for the current mode
    // Loading initial model recommendations
    try {
        await updateModelOptions(selectedMode, selectedLanguages);
    } catch (error) {
        // Failed to load initial model recommendations
    }
    
    // Perform initial validation using data model approach
    try {
        // Check model validation first
        if (modelValidationError) {
            const modelErrorResult = createValidationResult(false, modelValidationError);
            containerWizard.updateValidationResult(modelErrorResult);
            currentValidation = modelErrorResult;
        } else {
            // Use data model validation approach for initial validation
            await updateDataModelAndValidate();
        }
    } catch (error) {
        // If validation fails, set a basic error state
        if (containerWizard) {
            containerWizard.updateValidationResult(createValidationResult(false, 'Validation service unavailable'));
        }
    }
    
    // TODO: Add WebSocket cleanup when wizard completes/cancels
    
    return containerWizard;
}