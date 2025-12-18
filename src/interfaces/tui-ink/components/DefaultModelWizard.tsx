/**
 * Default Model Wizard Component
 *
 * A wizard for selecting the system-wide default embedding model.
 * Based on AddFolderWizard mechanism but without folder selection.
 *
 * Steps:
 * 1. Select document languages (checkbox)
 * 2. Choose embedding model (with full columns: Match, Recommendation, Speed, Languages, Type, Size, Local Copy)
 */

import React from 'react';
import { Text } from 'ink';
import { ContainerListItem } from './core/ContainerListItem';
import { SelectionListItem } from './core/SelectionListItem';
import { IListItem } from './core/IListItem';
import { SelectionOption } from './core/SelectionListItem';
import { ValidationState, ValidationResult, DEFAULT_VALIDATION, createValidationResult } from './core/ValidationState';
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
    private ws: any = null;
    private messageCallbacks: Array<(data: any) => void> = [];
    private closeCallbacks: Array<() => void> = [];

    async connect(_url: string): Promise<void> {
        // Direct async/await - no Promise wrapper needed
        const daemonConnector = new DaemonConnector({ timeoutMs: 3000, maxRetries: 1 });
        const { ws } = await daemonConnector.connect();

        this.ws = ws;

        this.ws.on('message', (data: Buffer) => {
            try {
                const parsed = JSON.parse(data.toString());
                this.messageCallbacks.forEach(callback => callback(parsed));
            } catch (error) {
                // Failed to parse WebSocket message
            }
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

/**
 * Language code to display name mapping
 * Pre-sorted by English name with English first
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

export interface DefaultModelWizardResult {
    model: string;
    languages: string[];
}

export interface DefaultModelWizardOptions {
    initialLanguages?: string[];
    initialModel?: string;
    onComplete: (result: DefaultModelWizardResult) => void;
    onCancel?: () => void;
}

/**
 * Custom ContainerListItem for DefaultModelWizard that shows model and validation in collapsed state
 */
class DefaultModelContainerItem extends ContainerListItem {
    private selectedModel: string;
    private currentValidationResult: ValidationResult;

    constructor(
        icon: string,
        label: string,
        selectedModel: string,
        validationResult: ValidationResult,
        childItems: IListItem[],
        isActive: boolean,
        onComplete?: (results: any) => void,
        onCancel?: () => void,
        validationState?: any,
        useDualButtons?: boolean
    ) {
        super(icon, label, childItems, isActive, onComplete, onCancel, validationState, useDualButtons);
        this.selectedModel = selectedModel;
        this.currentValidationResult = validationResult;
    }

    updateSelectedModel(model: string): void {
        this.selectedModel = model;
    }

    updateValidationResult(result: ValidationResult): void {
        this.currentValidationResult = result;
        super.updateValidation(result);
    }

    /**
     * Update child items dynamically
     */
    updateChildItems(newChildItems: IListItem[]): void {
        while ((this as any)._childItems.length > 0) {
            this.removeChild((this as any)._childItems[0]);
        }

        newChildItems.forEach(child => this.addChild(child));
        (this as any)._childSelectedIndex = 0;
        this.onEnter();
    }

    // Override render to show custom collapsed state
    render(maxWidth: number, maxLines?: number): React.ReactElement | React.ReactElement[] {
        if (this.isControllingInput) {
            return super.render(maxWidth, maxLines);
        } else {
            return this.renderCollapsedWithModelAndValidation(maxWidth);
        }
    }

    private renderCollapsedWithModelAndValidation(maxWidth: number): React.ReactElement {
        const theme = getCurrentTheme();
        const icon = this.icon;
        const label = 'Default Model';
        const model = this.selectedModel || 'Not set';

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
                const availableForMessage = maxWidth - baseWidth - validationWidth - model.length;
                if (availableForMessage > 3) {
                    const truncatedMessage = validationMessage.length > availableForMessage - 1
                        ? validationMessage.substring(0, availableForMessage - 2) + '…'
                        : validationMessage;
                    validationDisplay = ` ${validationIcon} ${truncatedMessage}`;
                    validationWidth = validationDisplay.length;
                }
            }
        }

        // Calculate space for model name
        const availableForModel = maxWidth - baseWidth - validationWidth;
        let displayModel = model;

        if (model.length > availableForModel && availableForModel > 0) {
            displayModel = model.substring(0, Math.max(1, availableForModel - 1)) + '…';
        }

        // Build the display
        const iconColor = this.isActive ? theme.colors.accent : theme.colors.textMuted;
        const textColor = this.isActive ? theme.colors.accent : undefined;
        const modelColor = (this.currentValidationResult.hasError || this.currentValidationResult.hasWarning)
            ? (this.currentValidationResult.hasError ? 'red' : 'yellow')
            : theme.colors.configValuesColor;
        const validationColor = this.currentValidationResult.hasError ? 'red' : 'yellow';

        return (
            <Text>
                <Text {...(iconColor ? { color: iconColor } : {})}>{icon}</Text>
                <Text {...(textColor ? { color: textColor } : {})}> {label}: [</Text>
                <Text color={modelColor}>{displayModel}</Text>
                <Text {...(textColor ? { color: textColor } : {})}>]</Text>
                {validationDisplay && (
                    <Text color={validationColor}>{validationDisplay}</Text>
                )}
            </Text>
        );
    }
}

/**
 * Factory function to create a Default Model Wizard
 * @param options Configuration options for the wizard
 * @returns Promise<ContainerListItem> configured as a default model wizard
 */
export async function createDefaultModelWizard(options: DefaultModelWizardOptions): Promise<ContainerListItem> {
    const {
        initialLanguages = ['en'],
        initialModel,
        onComplete,
        onCancel
    } = options;

    // Initialize WebSocket client for daemon communication
    const wsClient = new SimpleWebSocketClient();

    try {
        await wsClient.connect('');
    } catch (error) {
        // Failed to connect to daemon
    }

    // Track wizard state
    let selectedLanguages = [...initialLanguages];
    let selectedModel: string | undefined = initialModel;
    let currentModels: ModelCompatibilityScore[] = [];

    // Validation state
    let currentValidation: ValidationResult = DEFAULT_VALIDATION;
    let containerWizard: DefaultModelContainerItem;

    // Validate model selection
    const validateModelSelection = () => {
        if (!selectedModel) {
            currentValidation = createValidationResult(false, 'Please select an embedding model');
        } else {
            currentValidation = createValidationResult(true);
        }

        if (containerWizard) {
            containerWizard.updateValidationResult(currentValidation);
            containerWizard.updateSelectedModel(selectedModel || '');
        }
    };

    // Step 1: Language selection
    const { ModelCompatibilityEvaluator } = await import('../../../domain/models/model-evaluator');
    const modelEvaluator = new ModelCompatibilityEvaluator();
    const supportedLanguageCodes = modelEvaluator.getSupportedLanguages();

    // Pre-sorted language order
    const languageOrder = [
        'en', 'af', 'sq', 'am', 'ar', 'hy', 'az', 'eu', 'be', 'bn', 'bg', 'ca',
        'zh', 'zh-tw', 'hr', 'cs', 'da', 'nl', 'et', 'fil', 'fi', 'fr', 'gl',
        'ka', 'de', 'el', 'gu', 'ha', 'he', 'hi', 'hu', 'is', 'id', 'ga', 'it',
        'ja', 'kn', 'kk', 'km', 'ko', 'ku', 'lo', 'lv', 'lt', 'mk', 'ms', 'ml',
        'mr', 'mn', 'my', 'ne', 'no', 'ps', 'fa', 'pl', 'pt', 'pa', 'ro', 'ru',
        'sr', 'si', 'sk', 'sl', 'so', 'es', 'sw', 'sv', 'ta', 'te', 'th', 'tr',
        'uk', 'ur', 'uz', 'vi', 'cy', 'xh', 'yo'
    ];

    // Filter supported languages
    const supportedSet = new Set(supportedLanguageCodes);
    const languageOptions: SelectionOption[] = languageOrder
        .filter(code => supportedSet.has(code))
        .map(code => ({
            value: code,
            label: getLanguageDisplayName(code)
        }));

    const languageSelector = new SelectionListItem(
        '⁃',
        'Languages to support',
        languageOptions,
        [...selectedLanguages],
        false,
        'checkbox',
        'vertical',
        async (values) => {
            const newLanguages = [...values];
            const oldLanguages = JSON.stringify(selectedLanguages);
            const currentLanguages = JSON.stringify(newLanguages);

            if (oldLanguages !== currentLanguages) {
                selectedLanguages = newLanguages;
                languageSelector.selectedValues = newLanguages;

                // Trigger model re-evaluation
                await updateModelOptions(newLanguages);
                validateModelSelection();
            }
        },
        undefined,
        undefined,
        1, // minSelections - at least one language required
        undefined,
        false,
        false
    );

    // Step 2: Model selector with full columns
    let modelOptions: SelectionOption[] = [];

    const modelSelector = new SelectionListItem(
        '⁃',
        'Choose embedding model',
        modelOptions,
        selectedModel ? [selectedModel] : [],
        false,
        'radio',
        'vertical',
        async (values) => {
            if (values.length > 0 && values[0]) {
                const newModel = values[0];
                if (newModel !== selectedModel) {
                    selectedModel = newModel;
                    validateModelSelection();
                }
            }
        },
        undefined,
        undefined,
        undefined,
        undefined,
        false,
        true, // showDetails - Enable column display
        ['Match', 'Recommendation', 'Speed', 'Languages', 'Type', 'Size', 'Local Copy'] // Full columns
    );

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
    const requestModelRecommendations = async (languages: string[]): Promise<ModelCompatibilityScore[]> => {
        if (!wsClient.isConnected()) {
            return [];
        }

        const requestId = `default-model-recommend-${++requestIdCounter}`;

        const message: ModelRecommendMessage = {
            type: 'models.recommend',
            id: requestId,
            payload: {
                languages,
                mode: 'assisted' // Always use assisted mode for default model selection
            }
        };

        return new Promise((resolve, reject) => {
            if (!wsClient.isConnected()) {
                resolve([]);
                return;
            }

            // Track timeout so we can clear it when response arrives
            let timeoutId: NodeJS.Timeout | null = null;

            pendingRequests.set(requestId, {
                resolve: (response: ModelRecommendResponseMessage) => {
                    // Clear timeout - response arrived before timeout
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
                reject: (error: Error) => {
                    // Clear timeout on rejection too
                    if (timeoutId) {
                        clearTimeout(timeoutId);
                        timeoutId = null;
                    }
                    resolve([]);
                }
            });

            wsClient.send(message);

            // Set timeout for fallback (will be cleared if response arrives first)
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
    const updateModelOptions = async (languages: string[]) => {
        try {
            const models = await requestModelRecommendations(languages);
            currentModels = models;

            // Sort models by score (highest first) - use spread to avoid mutating original array
            const sortedModels = [...models].sort((a, b) => b.score - a.score);

            // Convert ModelCompatibilityScore to SelectionOption
            const options: SelectionOption[] = sortedModels.map(model => ({
                value: model.modelId,
                label: model.displayName,
                details: {
                    'Match': `${Math.round(model.score)}%`,
                    'Recommendation': model.details.recommendation ||
                        (model.score >= 80 ? 'Good' :
                         model.score >= 60 ? 'Alternative' :
                         'Available'),
                    'Speed': model.details.speed,
                    'Languages': model.details.languages,
                    'Type': model.details.type,
                    'Size': model.details.size,
                    'Local Copy': model.details.localCopy ? '√' : '✗'
                }
            }));

            modelOptions = options;
            modelSelector.updateOptions(options);

            // Select the appropriate model after options load
            if (selectedModel) {
                // If we have an initial model (from FMDM), ensure it's selected in the UI
                modelSelector.selectValue(selectedModel);
            } else if (models.length > 0) {
                // No initial model - auto-select recommended model
                const recommendedModel = models.find(m => m.details.recommendation);
                const modelToSelect = recommendedModel ? recommendedModel.modelId : models[0]?.modelId;
                if (modelToSelect) {
                    selectedModel = modelToSelect;
                    modelSelector.selectValue(modelToSelect);
                }
            }

        } catch (error) {
            // Failed to update model options
        }
    };

    // Build child items
    const childItems: IListItem[] = [languageSelector, modelSelector];

    // Set up validation state
    const validationState: ValidationState = {
        result: currentValidation,
        onValidationChange: (result: ValidationResult) => {
            currentValidation = result;
        }
    };

    // Create the container
    containerWizard = new DefaultModelContainerItem(
        '○',
        'Default Model',
        selectedModel || '',
        currentValidation,
        childItems,
        false,
        async () => {
            // Wizard completed
            if (!selectedModel) {
                return;
            }

            if (selectedLanguages.length === 0) {
                return;
            }

            const result: DefaultModelWizardResult = {
                model: selectedModel,
                languages: selectedLanguages
            };
            onComplete(result);
        },
        onCancel,
        validationState,
        true // Enable dual-button mode
    );

    // Configure buttons
    containerWizard.configureButtons(
        { text: 'Set Default', isDestructive: false },
        { text: 'Cancel', isDestructive: false }
    );

    // Load initial model recommendations
    try {
        await updateModelOptions(selectedLanguages);
        validateModelSelection();
    } catch (error) {
        // Failed to load initial model recommendations
    }

    return containerWizard;
}
