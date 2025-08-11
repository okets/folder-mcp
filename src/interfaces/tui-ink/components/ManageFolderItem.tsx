/**
 * Manage Folder Item Component
 * 
 * A reusable component factory that creates a ConfigurationListItem for managing existing folders.
 * Provides read-only display of folder information and a remove button with destructive confirmation.
 */

import React from 'react';
import { Text } from 'ink';
import { existsSync } from 'fs';
import { ContainerListItem } from './core/ContainerListItem';
import { LogItem } from './core/LogItem';
import { IListItem } from './core/IListItem';
import { TextListItem } from './core/TextListItem';
import { getModelMetadata } from '../models/modelMetadata';
import { theme } from '../utils/theme';
import { useModelDownloadEvents, ModelDownloadEvent } from '../contexts/FMDMContext';
import { formatFolderWithStatus } from '../utils/validationDisplay';

export interface ManageFolderItemOptions {
    folderPath: string;
    model: string;
    isValid: boolean;
    folderStatus?: string;
    statusColor?: string;
    onRemove: (folderPath: string) => Promise<void>;
    onError?: (error: string) => void;
    validationState?: any;
}

/**
 * Factory function to create a Manage Folder Item
 * @param options Configuration options for the folder item
 * @returns ContainerListItem configured for folder management
 */
/**
 * Custom ContainerListItem wrapper that handles dynamic label based on expansion state
 */
class ManageFolderContainerItem extends ContainerListItem {
    private folderPath: string;
    private folderStatus: string;
    private statusColor: string;
    
    constructor(
        icon: string,
        folderPath: string,
        folderStatus: string,
        statusColor: string,
        childItems: IListItem[],
        isActive: boolean,
        onComplete?: (results: any) => void,
        onCancel?: () => void,
        validationState?: any,
        useDualButtons?: boolean
    ) {
        // Start with collapsed label (with status)
        const initialLabel = `${folderPath} [${folderStatus}]`;
        super(icon, initialLabel, childItems, isActive, onComplete, onCancel, validationState, useDualButtons);
        this.folderPath = folderPath;
        this.folderStatus = folderStatus;
        this.statusColor = statusColor;
    }
    
    // Override to always enable buttons - we want "Close" and "Remove Folder" to always work
    // regardless of validation errors (users should be able to close or remove errored folders)
    get isConfirmEnabled(): boolean {
        return true;
    }
    
    // Override render to update label based on expansion state
    render(maxWidth: number, maxLines?: number): React.ReactElement | React.ReactElement[] {
        if (this.isControllingInput) {
            // Expanded: just show the path without status
            (this as any).label = this.folderPath;
            return super.render(maxWidth, maxLines);
        } else {
            // Collapsed: use the standardized validation display pattern
            const iconWidth = 2; // icon + space
            const availableWidth = maxWidth - iconWidth;
            
            // Format using the utility function
            const formatted = formatFolderWithStatus(
                this.folderPath,
                this.folderStatus,
                this.validationResult,
                availableWidth,
                this.icon,
                this.isActive
            );
            
            // Render the formatted output
            return (
                <Text>
                    <Text color={this.isActive ? theme.colors.accent : 'gray'}>
                        {this.icon}
                    </Text>
                    <Text {...(this.isActive ? { color: theme.colors.accent } : {})}>
                        {' '}{formatted.truncatedPath}
                    </Text>
                    <Text {...(this.isActive ? { color: theme.colors.accent } : {})}>
                        {' ['}
                    </Text>
                    <Text color={this.folderStatus === 'error' ? theme.colors.dangerRed : this.statusColor}>
                        {formatted.statusDisplay}
                    </Text>
                    <Text {...(this.isActive ? { color: theme.colors.accent } : {})}>
                        {']'}
                    </Text>
                    {formatted.showValidation && formatted.validationColor && (
                        <Text color={formatted.validationColor}>
                            {' '}{formatted.validationDisplay}
                        </Text>
                    )}
                </Text>
            );
        }
    }
}

// Model download manager initialization component
export const ModelDownloadManagerInitializer: React.FC = () => {
    const { subscribeToModelDownloads } = useModelDownloadEvents();
    
    React.useEffect(() => {
        const manager = ModelDownloadManager.getInstance();
        manager.setSubscribeFunction(subscribeToModelDownloads);
        
        return () => {
            manager.cleanup();
        };
    }, [subscribeToModelDownloads]);
    
    return null;
};

// Global model download subscription manager
class ModelDownloadManager {
    private static instance: ModelDownloadManager | null = null;
    private subscribeFunction: ((listener: (event: ModelDownloadEvent) => void) => () => void) | null = null;
    private activeSubscriptions = new Map<string, (() => void)>();
    
    static getInstance(): ModelDownloadManager {
        if (!ModelDownloadManager.instance) {
            ModelDownloadManager.instance = new ModelDownloadManager();
        }
        return ModelDownloadManager.instance;
    }
    
    setSubscribeFunction(fn: (listener: (event: ModelDownloadEvent) => void) => () => void) {
        this.subscribeFunction = fn;
    }
    
    subscribeModel(modelName: string, callback: (event: ModelDownloadEvent) => void): () => void {
        if (!this.subscribeFunction) {
            return () => {}; // No-op if not initialized
        }
        
        const unsubscribe = this.subscribeFunction((event: ModelDownloadEvent) => {
            if (event.modelName === modelName) {
                callback(event);
            }
        });
        
        this.activeSubscriptions.set(modelName, unsubscribe);
        
        return () => {
            const existingUnsub = this.activeSubscriptions.get(modelName);
            if (existingUnsub) {
                existingUnsub();
                this.activeSubscriptions.delete(modelName);
            }
        };
    }
    
    cleanup() {
        this.activeSubscriptions.forEach(unsubscribe => unsubscribe());
        this.activeSubscriptions.clear();
    }
}

export function createManageFolderItem(options: ManageFolderItemOptions): ContainerListItem {
    const {
        folderPath,
        model,
        isValid,
        folderStatus = 'Status placeholder',
        statusColor = 'yellow',
        onRemove,
        onError
    } = options;
    
    // Get model metadata for display
    const modelMetadata = getModelMetadata(model);
    const displayModel = modelMetadata ? modelMetadata.displayName : model;
    
    // Create read-only LogItem for folder path
    const folderIcon = isValid ? '■' : '✗';
    const statusIcon = isValid ? '✓' : '✗';
    const folderLogItem = new LogItem(
        folderIcon,
        folderPath,
        statusIcon,
        false, // Not active
        false, // Not expanded initially
        [], // No details for folder path display
        undefined // No progress
    );
    
    // Create read-only LogItem for model information
    const modelDetails = modelMetadata ? [
        `Languages: ${modelMetadata.languages.join(', ')}`,
        `Parameters: ${modelMetadata.params}`,
        `GPU Required: ${modelMetadata.gpuRequired ? 'Yes' : 'No'}`,
        `Backend: ${modelMetadata.backend}`
    ] : [`Backend: ${model}`];
    
    // Create custom LogItem with formatted model text and download progress
    class ModelLogItemWithProgress extends LogItem {
        private displayModel: string;
        private modelName: string;
        private downloadProgress: number | undefined;
        private downloadStatus: 'idle' | 'downloading' | 'complete' | 'error';
        private unsubscribe: (() => void) | null = null;
        
        constructor(icon: string, displayModel: string, modelName: string, status: string, isActive: boolean, isExpanded: boolean, details?: string[], progress?: number) {
            super(icon, `Model [${displayModel}]`, status, isActive, isExpanded, details, progress);
            this.displayModel = displayModel;
            this.modelName = modelName;
            this.downloadProgress = undefined;
            this.downloadStatus = 'idle';
        }

        // Method to set up download event listening
        setupDownloadTracking() {
            const manager = ModelDownloadManager.getInstance();
            this.unsubscribe = manager.subscribeModel(this.modelName, (event: ModelDownloadEvent) => {
                switch (event.status) {
                    case 'downloading':
                        this.downloadStatus = 'downloading';
                        this.downloadProgress = event.progress;
                        break;
                    case 'ready':
                        this.downloadStatus = 'complete';
                        this.downloadProgress = 100;
                        break;
                    case 'error':
                        this.downloadStatus = 'error';
                        this.downloadProgress = undefined;
                        break;
                }
                // Update the progress property for LogItem progress bar
                if (this.downloadProgress !== undefined) {
                    (this as any).progress = this.downloadProgress;
                } else {
                    (this as any).progress = undefined;
                }
            });
        }

        // Clean up subscription
        cleanup() {
            if (this.unsubscribe) {
                this.unsubscribe();
                this.unsubscribe = null;
            }
        }
        
        // Override render method to handle colored text
        render(maxWidth: number, maxLines?: number): React.ReactElement | React.ReactElement[] {
            if ((this as any)._isExpanded && (this as any).details) {
                // For expanded state, use parent logic but we'll override the header
                const parentResult = super.render(maxWidth, maxLines) as React.ReactElement[];
                
                // Replace the first element (header) with our custom colored version
                // When expanded, always use ■ (cursor will be on bottom detail line)
                const displayIcon = '■';
                const iconColor = this.isActive ? theme.colors.accent : undefined;
                const textColor = this.isActive ? theme.colors.accent : undefined;
                
                // Calculate available space for text (same logic as collapsed)
                const iconWidth = displayIcon.length + 1; // icon + space
                const modelPrefixWidth = 'Model ['.length;
                const bracketCloseWidth = ']'.length;
                const fixedWidth = iconWidth + modelPrefixWidth + bracketCloseWidth;
                const availableForModelText = maxWidth - fixedWidth;
                
                // Apply truncation logic: truncate model text first, then prefix if needed
                let displayModelText = this.displayModel;
                let displayPrefix = 'Model [';
                
                if (this.displayModel.length > availableForModelText) {
                    if (availableForModelText >= 1) {
                        // Truncate model text to fit in brackets
                        displayModelText = this.displayModel.substring(0, Math.max(0, availableForModelText - 1)) + '…';
                    } else {
                        // No space for model text, show [...]
                        displayModelText = '…';
                    }
                }
                
                // Check if everything fits, if not truncate further
                const currentTotalWidth = iconWidth + displayPrefix.length + displayModelText.length + bracketCloseWidth;
                if (currentTotalWidth > maxWidth) {
                    // Need to truncate prefix as well
                    const remainingWidth = maxWidth - iconWidth - displayModelText.length - bracketCloseWidth;
                    if (remainingWidth >= 1) {
                        displayPrefix = displayPrefix.substring(0, Math.max(0, remainingWidth - 1)) + '…';
                    } else {
                        // Extreme truncation
                        displayPrefix = '…';
                        displayModelText = '';
                    }
                }
                
                const customHeader = (
                    <Text key="custom-header">
                        <Text {...(iconColor ? { color: iconColor } : {})}>{displayIcon}</Text>
                        <Text {...(textColor ? { color: textColor } : {})}> {displayPrefix}</Text>
                        <Text color={theme.colors.configValuesColor}>{displayModelText}</Text>
                        <Text {...(textColor ? { color: textColor } : {})}>]</Text>
                    </Text>
                );
                
                return [customHeader, ...parentResult.slice(1)];
            } else {
                // Collapsed state - custom rendering with proper cursor logic and truncation
                const displayIcon = this.isActive ? '▶' : this.icon;
                const iconColor = this.isActive ? theme.colors.accent : undefined;
                const textColor = this.isActive ? theme.colors.accent : undefined;
                
                // Calculate available space for text
                const iconWidth = displayIcon.length + 1; // icon + space
                const modelPrefixWidth = 'Model ['.length;
                const bracketCloseWidth = ']'.length;
                const fixedWidth = iconWidth + modelPrefixWidth + bracketCloseWidth;
                const availableForModelText = maxWidth - fixedWidth;
                
                // Apply truncation logic: truncate model text first, then prefix if needed
                let displayModelText = this.displayModel;
                let displayPrefix = 'Model [';
                
                if (this.displayModel.length > availableForModelText) {
                    if (availableForModelText >= 1) {
                        // Truncate model text to fit in brackets
                        displayModelText = this.displayModel.substring(0, Math.max(0, availableForModelText - 1)) + '…';
                    } else {
                        // No space for model text, show [...]
                        displayModelText = '…';
                    }
                }
                
                // Check if everything fits, if not truncate further
                const currentTotalWidth = iconWidth + displayPrefix.length + displayModelText.length + bracketCloseWidth;
                if (currentTotalWidth > maxWidth) {
                    // Need to truncate prefix as well
                    const remainingWidth = maxWidth - iconWidth - displayModelText.length - bracketCloseWidth;
                    if (remainingWidth >= 1) {
                        displayPrefix = displayPrefix.substring(0, Math.max(0, remainingWidth - 1)) + '…';
                    } else {
                        // Extreme truncation
                        displayPrefix = '…';
                        displayModelText = '';
                    }
                }
                
                return (
                    <Text>
                        <Text {...(iconColor ? { color: iconColor } : {})}>{displayIcon}</Text>
                        <Text {...(textColor ? { color: textColor } : {})}> {displayPrefix}</Text>
                        <Text color={theme.colors.configValuesColor}>{displayModelText}</Text>
                        <Text {...(textColor ? { color: textColor } : {})}>]</Text>
                    </Text>
                );
            }
        }
    }
    
    const modelLogItem = new ModelLogItemWithProgress(
        '◆',
        displayModel,
        model, // Pass the actual model name for tracking
        '',
        false, // Not active
        false, // Not expanded initially
        modelDetails, // Model metadata as details
        undefined // No progress initially
    );
    
    // Set up download tracking for this model
    modelLogItem.setupDownloadTracking();
    
    
    // Create custom status LogItem with configurable color
    class ColoredStatusLogItem extends LogItem {
        private statusText: string;
        private statusColor: string;
        
        constructor(icon: string, text: string, color: string, status: string, isActive: boolean, isExpanded: boolean, details?: string[], progress?: number) {
            super(icon, text, status, isActive, isExpanded, details, progress);
            this.statusText = text;
            this.statusColor = color;
        }
        
        render(maxWidth: number, maxLines?: number): React.ReactElement | React.ReactElement[] {
            return (
                <Text>
                    <Text>{this.icon}</Text>
                    <Text color={this.statusColor}> {this.statusText}</Text>
                </Text>
            );
        }
    }
    
    // Create custom TextListItem without indentation for status
    class NoIndentTextListItem extends TextListItem {
        private statusText: string;
        private statusColor: string;
        
        constructor(icon: string, text: string, color: string, isActive: boolean = false, onSelectCallback?: () => void, overflowMode: 'truncate' | 'wrap' = 'wrap') {
            super(icon, text, isActive, onSelectCallback, overflowMode);
            this.statusText = text;
            this.statusColor = color;
        }
        
        render(maxWidth: number, maxLines?: number): React.ReactElement | React.ReactElement[] {
            // Use cursor arrow when active, otherwise use the normal icon
            const displayIcon = this.isActive ? '▶' : this.icon;
            const iconWidth = displayIcon.length === 0 ? 1 : displayIcon.length + 1;
            const availableWidth = maxWidth - iconWidth; // No extra indentation
            
            // Use stored statusText directly
            let displayText = this.statusText;
            
            if (this.statusText.length > availableWidth) {
                // Truncate with ellipsis
                displayText = this.statusText.substring(0, Math.max(0, availableWidth - 1)) + '…';
            }
            
            return (
                <Text>
                    <Text color={this.isActive ? theme.colors.accent : this.statusColor}>
                        {displayIcon}
                    </Text>
                    <Text color={this.statusColor}>
                        {' '}{displayText}
                    </Text>
                </Text>
            );
        }
    }
    
    const statusLogItem = new NoIndentTextListItem(
        '●',
        folderStatus,
        statusColor, // Use the same color as in collapsed mode
        false, // Not active
        undefined, // No callback
        'truncate' // Use truncate mode
    );
    
    // Create child items array - always include status item in open mode
    const childItems: IListItem[] = [];
    
    // Special case: folder doesn't exist (not handled by validation state)
    if (isValid === false && !existsSync(folderPath)) {
        // Folder doesn't exist - show this as first item
        // Custom error item with red text and single space
        class ErrorTextItem extends TextListItem {
            private errorText: string;
            
            constructor(icon: string, text: string, isActive: boolean = false) {
                super(icon, text, isActive, undefined, 'truncate');
                this.errorText = text;
            }
            
            render(maxWidth: number): React.ReactElement | React.ReactElement[] {
                const displayIcon = this.isActive ? '▶' : this.icon;
                const iconWidth = displayIcon.length + 1; // icon + space
                const availableWidth = maxWidth - iconWidth;
                
                let displayText = this.errorText;
                
                if (this.errorText.length > availableWidth) {
                    displayText = this.errorText.substring(0, Math.max(0, availableWidth - 1)) + '…';
                }
                
                return (
                    <Text>
                        <Text color={this.isActive ? theme.colors.accent : theme.colors.dangerRed}>
                            {displayIcon}
                        </Text>
                        <Text color={theme.colors.dangerRed}>
                            {' '}{displayText}
                        </Text>
                    </Text>
                );
            }
        }
        
        const errorItem = new ErrorTextItem('✗', 'Folder no longer exists', false);
        childItems.push(errorItem);
    }
    // Note: We don't manually add validation errors/warnings here because
    // ContainerListItem automatically renders them from the validationState
    // that we pass to its constructor (see lines 299-320 in ContainerListItem.tsx)
    
    // Add status and model items
    childItems.push(statusLogItem);  // Status should always be visible in expanded mode
    childItems.push(modelLogItem);
    
    // Create the main ContainerListItem
    let manageFolderItem: ContainerListItem;
    
    manageFolderItem = new ManageFolderContainerItem(
        '●', // Folder icon
        folderPath,
        folderStatus,
        statusColor,
        childItems, // Child items for folder management
        false, // Not active initially
        async () => {
            // Close button - just close the container
        },
        async () => {
            // Remove button - call the onRemove callback
            try {
                await onRemove(folderPath);
            } catch (error) {
                if (onError) {
                    onError(`Failed to remove folder: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        },
        options.validationState, // Pass the validation state for collapsed mode display
        true // useDualButtons - enable dual button mode
    );
    
    // Configure buttons - Remove Folder is destructive
    manageFolderItem.configureButtons(
        { text: 'Close', isDestructive: false },
        { text: 'Remove Folder', isDestructive: true }
    );
    
    return manageFolderItem;
}