/**
 * Add Folder Wizard Component (Simplified)
 *
 * A streamlined wizard for adding folders to index.
 * Uses the system default model from FMDM with optional experimental override.
 *
 * Steps:
 * 1. Select folder to index
 * 2. (Optional) Override model - labeled as "experimental"
 */

import React from 'react';
import { Text, Key } from 'ink';
import { ContainerListItem } from './core/ContainerListItem';
import { FilePickerListItem } from './core/FilePickerListItem';
import { SelectionListItem } from './core/SelectionListItem';
import { IListItem } from './core/IListItem';
import { SelectionOption } from './core/SelectionListItem';
import { FMDMValidationAdapter } from '../services/FMDMValidationAdapter';
import { ValidationState, ValidationResult, DEFAULT_VALIDATION, createValidationResult } from './core/ValidationState';
import { getCurrentTheme } from '../utils/theme';
import { DaemonConnector } from '../daemon-connector.js';
import {
    ModelRecommendMessage,
    ModelRecommendResponseMessage,
    ModelCompatibilityScore
} from '../../../daemon/websocket/message-types';
import type WebSocket from 'ws';

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
    private ws: WebSocket | null = null;
    private messageCallbacks: Array<(data: any) => void> = [];
    private closeCallbacks: Array<() => void> = [];

    async connect(_url: string): Promise<void> {
        const daemonConnector = new DaemonConnector({ timeoutMs: 3000, maxRetries: 1 });
        const { ws } = await daemonConnector.connect();

        this.ws = ws;

        this.ws.on('message', (data: Buffer) => {
            let parsed: any;
            try {
                parsed = JSON.parse(data.toString());
            } catch (error) {
                // Fail loudly: log parse errors for debugging
                console.error('AddFolderWizard WebSocket parse error:', error, 'Raw data:', data.toString().substring(0, 100));
                return;
            }

            // Isolate callbacks so one failure doesn't stop others
            this.messageCallbacks.forEach(callback => {
                try {
                    callback(parsed);
                } catch (callbackError) {
                    console.error('AddFolderWizard WebSocket callback error:', callbackError);
                }
            });
        });

        this.ws.on('close', () => {
            this.ws = null;
            this.closeCallbacks.forEach(callback => callback());
        });
    }

    send(message: any): void {
        if (this.ws && this.ws.readyState === 1) {
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
        return this.ws !== null && this.ws.readyState === 1;
    }
}

export interface AddFolderWizardResult {
    path: string;
    model: string;
}

export interface AddFolderWizardOptions {
    initialPath?: string;
    /** Default model from FMDM - will be used unless user explicitly overrides */
    defaultModel?: string;
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
        super.updateValidation(result);
    }

    // Override handleInput to customize left arrow behavior
    handleInput(input: string, key: Key): boolean {
        if (key.leftArrow) {
            const focusedButton = (this as any)._focusedButton;
            const isConfirmFocused = (this as any)._isConfirmFocused;
            const childSelectedIndex = (this as any)._childSelectedIndex;
            const activeChild = (this as any)._childItems[childSelectedIndex];

            if (focusedButton || isConfirmFocused) {
                if (focusedButton === 'cancel') {
                    if (this.isConfirmEnabled) {
                        (this as any)._focusedButton = 'confirm';
                    }
                    return true;
                } else if (focusedButton === 'confirm' || isConfirmFocused) {
                    (this as any)._focusedButton = 'cancel';
                    (this as any)._isConfirmFocused = false;
                    return true;
                }
            } else if (activeChild && !activeChild.isControllingInput) {
                (this as any)._focusedButton = 'cancel';
                (this as any)._childSelectedIndex = -1;
                return true;
            }
        }

        return super.handleInput(input, key);
    }

    // Override render to show custom collapsed state
    render(maxWidth: number, maxLines?: number): React.ReactElement | React.ReactElement[] {
        if (this.isControllingInput) {
            return super.render(maxWidth, maxLines);
        } else {
            return this.renderCollapsedWithPathAndValidation(maxWidth);
        }
    }

    private renderCollapsedWithPathAndValidation(maxWidth: number): React.ReactElement {
        const theme = getCurrentTheme();
        const icon = this.icon;
        const label = 'Add Folder';
        const path = this.selectedPath;

        // Calculate available space
        const iconWidth = icon.length + 1;
        const labelWidth = label.length;
        const bracketWidth = 4; // ": []"
        const baseWidth = iconWidth + labelWidth + bracketWidth;

        // Reserve space for validation if present
        let validationDisplay = '';
        let validationWidth = 0;

        if (this.currentValidationResult.hasError || this.currentValidationResult.hasWarning) {
            const validationIcon = this.currentValidationResult.hasError ? '✗' : '!';
            const validationMessage = this.currentValidationResult.errorMessage || this.currentValidationResult.warningMessage || '';

            validationDisplay = ` ${validationIcon}`;
            validationWidth = 2;

            if (validationMessage) {
                const availableForMessage = maxWidth - baseWidth - validationWidth - path.length;
                if (availableForMessage > 3) {
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

        if (availableForPath <= 0) {
            // No space for path at all - show ellipsis only
            displayPath = '…';
        } else if (path.length > availableForPath) {
            if (availableForPath >= 2) {
                // Room for at least 1 char + ellipsis
                displayPath = path.substring(0, availableForPath - 1) + '…';
            } else {
                // Only room for ellipsis
                displayPath = '…';
            }
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
 * Factory function to create a simplified Add Folder Wizard
 * @param options Configuration options for the wizard
 * @returns Promise<ContainerListItem> configured as an add folder wizard
 */
export async function createAddFolderWizard(options: AddFolderWizardOptions): Promise<ContainerListItem> {
    const {
        initialPath = process.cwd(),
        defaultModel,
        onComplete,
        onCancel,
        fmdmOperations
    } = options;

    // Initialize WebSocket client for daemon communication
    const wsClient = new SimpleWebSocketClient();

    try {
        await wsClient.connect('');
    } catch (error) {
        // Failed to connect to daemon
    }

    // Track wizard state
    let selectedPath = initialPath;
    let selectedModel: string | undefined = defaultModel;
    let useModelOverride = false; // By default, use system default
    let overrideModel: string | undefined; // The explicitly selected override model
    let currentModels: ModelCompatibilityScore[] = [];

    // Initialize FMDM validation
    // The () => true callback is a feature flag check placeholder - always allow validation
    const validationService = fmdmOperations
        ? new FMDMValidationAdapter(fmdmOperations, () => true)
        : null;
    let currentValidation: ValidationResult = DEFAULT_VALIDATION;
    let containerWizard: AddFolderContainerItem;
    let folderPicker: FilePickerListItem;

    // Validation function
    const validateAndUpdateContainer = async (folderPath: string, model?: string) => {
        if (!validationService) {
            currentValidation = createValidationResult(false, 'Validation service not available');
            return;
        }

        const modelToValidate = model || selectedModel;
        if (!modelToValidate) {
            currentValidation = createValidationResult(false, 'No model selected');
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

        if (containerWizard) {
            containerWizard.updateValidationResult(validationResult);
            containerWizard.updateSelectedPath(folderPath);
        }
    };

    // Create child items
    const childItems: IListItem[] = [];

    // Step 1: Folder selection
    folderPicker = new FilePickerListItem(
        '⁃',
        'Select folder to index',
        initialPath,
        false,
        'folder',
        async (newPath) => {
            if (newPath !== selectedPath) {
                selectedPath = newPath;
                await validateAndUpdateContainer(newPath);
            }
        },
        undefined,
        undefined,
        false,
        undefined
    );
    childItems.push(folderPicker);

    // Step 2: Model override (experimental)
    // Create model selector for override (initially hidden/collapsed by default behavior)
    // Users can expand to select a different model
    let modelOptions: SelectionOption[] = [];

    const modelOverrideSelector = new SelectionListItem(
        '⚠',
        'Default Model Override (beta)',
        modelOptions,
        selectedModel ? [selectedModel] : [],
        false,
        'radio',
        'vertical',
        async (values) => {
            if (values.length > 0 && values[0]) {
                const newModel = values[0];
                if (newModel !== overrideModel) {
                    overrideModel = newModel;
                    useModelOverride = true;
                    selectedModel = newModel;
                    await validateAndUpdateContainer(selectedPath, newModel);
                }
            }
        },
        undefined,
        undefined,
        undefined,
        undefined,
        false,
        true, // showDetails
        ['Default', 'Match', 'Speed', 'Languages', 'Type', 'Size', 'Downloaded']
    );
    childItems.push(modelOverrideSelector);

    // Model recommendation functionality
    let requestIdCounter = 0;
    const pendingRequests = new Map<string, { resolve: (response: any) => void; reject: (error: Error) => void }>();

    wsClient.onMessage((message: any) => {
        if (message.type === 'models.recommend.response' && message.id && pendingRequests.has(message.id)) {
            const promiseHandlers = pendingRequests.get(message.id);
            if (promiseHandlers) {
                promiseHandlers.resolve(message);
                pendingRequests.delete(message.id);
            }
        }
    });

    wsClient.onClose(() => {
        pendingRequests.forEach((promiseHandlers) => {
            promiseHandlers.reject(new Error('WebSocket connection closed'));
        });
        pendingRequests.clear();
    });

    // Function to request model recommendations from daemon
    const requestModelRecommendations = async (): Promise<ModelCompatibilityScore[]> => {
        if (!wsClient.isConnected()) {
            return [];
        }

        const requestId = `add-folder-model-recommend-${++requestIdCounter}`;

        // Request with English as default language for model matching
        const message: ModelRecommendMessage = {
            type: 'models.recommend',
            id: requestId,
            payload: {
                languages: ['en'],
                mode: 'assisted'
            }
        };

        return new Promise((resolve) => {
            if (!wsClient.isConnected()) {
                resolve([]);
                return;
            }

            let timeoutId: NodeJS.Timeout | null = null;

            pendingRequests.set(requestId, {
                resolve: (response: ModelRecommendResponseMessage) => {
                    if (timeoutId) {
                        clearTimeout(timeoutId);
                        timeoutId = null;
                    }
                    if (response.data) {
                        resolve(response.data.models);
                    } else {
                        resolve([]);
                    }
                },
                reject: () => {
                    if (timeoutId) {
                        clearTimeout(timeoutId);
                        timeoutId = null;
                    }
                    resolve([]);
                }
            });

            wsClient.send(message);

            timeoutId = setTimeout(() => {
                if (pendingRequests.has(requestId)) {
                    pendingRequests.delete(requestId);
                    resolve([]);
                }
                timeoutId = null;
            }, 5000);
        });
    };

    // Function to update model options
    const updateModelOptions = async () => {
        try {
            const models = await requestModelRecommendations();
            currentModels = models;

            // Sort models by score - use spread to avoid mutating original
            const sortedModels = [...models].sort((a, b) => b.score - a.score);

            // Convert to SelectionOptions
            const options: SelectionOption[] = sortedModels.map(model => ({
                value: model.modelId,
                label: model.displayName,
                details: {
                    'Default': model.modelId === defaultModel ? '√' : '',
                    'Match': `${Math.round(model.score)}%`,
                    'Speed': model.details.speed,
                    'Languages': model.details.languages,
                    'Type': model.details.type,
                    'Size': model.details.size,
                    'Downloaded': model.details.localCopy ? '√' : '✗'
                }
            }));

            modelOptions = options;
            modelOverrideSelector.updateOptions(options);

            // Pre-select the default model in the override selector
            if (defaultModel) {
                modelOverrideSelector.selectValue(defaultModel);
            } else if (models.length > 0 && models[0]) {
                // Use first model as fallback
                selectedModel = models[0].modelId;
                modelOverrideSelector.selectValue(models[0].modelId);
            }

        } catch (error) {
            // Failed to update model options
        }
    };

    // Set up validation state
    const validationState: ValidationState = {
        result: currentValidation,
        onValidationChange: (result: ValidationResult) => {
            currentValidation = result;
        }
    };

    // Create the container with completion handler
    containerWizard = new AddFolderContainerItem(
        '⧉',
        'Add Folder',
        selectedPath,
        currentValidation,
        childItems,
        false,
        async () => {
            // Wizard completed
            const finalModel = useModelOverride && overrideModel
                ? overrideModel
                : (selectedModel || defaultModel);

            if (!finalModel) {
                // Fail loudly: this indicates a UI bug - model should always be pre-selected
                console.error('AddFolderWizard: finalModel is undefined - this indicates a UI bug');
                try {
                    wsClient.close();
                } catch (e) {
                    // Ignore close errors
                }
                onCancel?.();
                return;
            }

            const result: AddFolderWizardResult = {
                path: selectedPath,
                model: finalModel
            };
            onComplete(result);

            // Cleanup: close WebSocket connection
            try {
                wsClient.close();
            } catch (e) {
                // Ignore close errors - connection may already be closed
            }
        },
        () => {
            // Cleanup: close WebSocket connection on cancel
            try {
                wsClient.close();
            } catch (e) {
                // Ignore close errors - connection may already be closed
            }
            onCancel?.();
        },
        validationState,
        true
    );

    // Configure buttons
    containerWizard.configureButtons(
        { text: 'Add Folder', isDestructive: false },
        { text: 'Cancel', isDestructive: false }
    );

    // Load model options for the override selector
    try {
        await updateModelOptions();
    } catch (error) {
        // Failed to load model options
    }

    // Perform initial validation
    try {
        await validateAndUpdateContainer(selectedPath, selectedModel);
    } catch (error) {
        if (containerWizard) {
            containerWizard.updateValidationResult(createValidationResult(false, 'Validation service unavailable'));
        }
    }

    return containerWizard;
}
