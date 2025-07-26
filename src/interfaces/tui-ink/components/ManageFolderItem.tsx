/**
 * Manage Folder Item Component
 * 
 * A reusable component factory that creates a ConfigurationListItem for managing existing folders.
 * Provides read-only display of folder information and a remove button with destructive confirmation.
 */

import React from 'react';
import { Text } from 'ink';
import { ContainerListItem } from './core/ContainerListItem';
import { LogItem } from './core/LogItem';
import { IListItem } from './core/IListItem';
import { TextListItem } from './core/TextListItem';
import { getModelMetadata } from '../models/modelMetadata';

export interface ManageFolderItemOptions {
    folderPath: string;
    model: string;
    isValid: boolean;
    folderStatus?: string;
    statusColor?: string;
    onRemove: (folderPath: string) => Promise<void>;
    onError?: (error: string) => void;
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
    
    // Override render to update label based on expansion state
    render(maxWidth: number, maxLines?: number): React.ReactElement | React.ReactElement[] {
        if (this.isControllingInput) {
            // Expanded: apply progressive truncation to header path
            const iconWidth = 2;
            const availableWidth = maxWidth - iconWidth;
            const truncatedPath = this.truncatePathWithoutStatus(this.folderPath, availableWidth);
            (this as any).label = truncatedPath;
            return super.render(maxWidth, maxLines);
        } else {
            // Collapsed: render with yellow status
            return this.renderCollapsedWithYellowStatus(maxWidth);
        }
    }
    
    private truncatePathWithoutStatus(path: string, availableWidth: number): string {
        // If path fits, return as is
        if (path.length <= availableWidth) {
            return path;
        }
        
        // Split path into parts
        const parts = path.split('/').filter(p => p); // Remove empty parts
        if (parts.length === 0) return '…';
        
        let lastPart = parts[parts.length - 1];
        let parentParts = parts.slice(0, -1);
        
        // Try progressively shorter representations
        // 1. Try removing parent directories one by one, using ../
        let remainingParts = [...parentParts]; // Copy the array
        let depth = 0;
        
        while (remainingParts.length > 0) {
            depth++;
            remainingParts.shift(); // Remove one parent directory
            
            // Build representation: ../../../remainingPath/lastPart
            const remainingPath = remainingParts.length > 0 ? remainingParts.join('/') + '/' : '';
            const representation = '../'.repeat(depth) + remainingPath + lastPart;
            
            if (representation.length <= availableWidth) {
                return representation;
            }
        }
        
        // If we get here, try just ../../../lastPart (all parents as ../)
        if (parentParts.length > 0) {
            const allParentsAsRelative = '../'.repeat(parentParts.length + 1) + lastPart;
            if (allParentsAsRelative.length <= availableWidth) {
                return allParentsAsRelative;
            }
        }
        
        // 2. Try just the folder name alone (if parent directories were removed)
        if (parentParts.length > 0 && lastPart && lastPart.length <= availableWidth) {
            return lastPart;
        }
        
        // 3. Try with single ellipsis: …/lastPart
        const ellipsisPath = `…/${lastPart}`;
        if (ellipsisPath.length <= availableWidth) {
            return ellipsisPath;
        }
        
        // 4. Truncate the folder name itself
        let currentLastPart = lastPart || '';
        const originalLength = lastPart ? lastPart.length : 0;
        
        while (currentLastPart.length > 0) {
            const pathTruncated = currentLastPart.length < originalLength;
            const pathWithEllipsis = pathTruncated ? `…/${currentLastPart}…` : `…/${currentLastPart}`;
            
            if (pathWithEllipsis.length <= availableWidth) {
                return pathWithEllipsis;
            }
            
            currentLastPart = currentLastPart.slice(0, -1);
        }
        
        // Last resort
        return availableWidth >= 4 ? '…/…' : '…';
    }
    
    private truncatePathFromLeft(path: string, availableWidth: number): { path: string; status: string; } {
        const fullStatus = this.folderStatus;
        const statusWithBrackets = ` [${fullStatus}]`;
        
        // If everything fits, return as is
        if (path.length + statusWithBrackets.length <= availableWidth) {
            return { path, status: fullStatus };
        }
        
        // Split path into parts
        const parts = path.split('/').filter(p => p); // Remove empty parts
        if (parts.length === 0) return { path: '…', status: '…' };
        
        let lastPart = parts[parts.length - 1];
        let parentParts = parts.slice(0, -1);
        
        // Try progressively shorter representations
        // 1. Try removing parent directories one by one, using ../
        let remainingParts = [...parentParts]; // Copy the array
        let depth = 0;
        
        while (remainingParts.length > 0) {
            depth++;
            remainingParts.shift(); // Remove one parent directory
            
            // Build representation: ../../../remainingPath/lastPart
            const remainingPath = remainingParts.length > 0 ? remainingParts.join('/') + '/' : '';
            const representation = '../'.repeat(depth) + remainingPath + lastPart;
            
            if (representation.length + statusWithBrackets.length <= availableWidth) {
                return { path: representation, status: fullStatus };
            }
        }
        
        // If we get here, try just ../../../lastPart (all parents as ../)
        if (parentParts.length > 0) {
            const allParentsAsRelative = '../'.repeat(parentParts.length + 1) + lastPart;
            if (allParentsAsRelative.length + statusWithBrackets.length <= availableWidth) {
                return { path: allParentsAsRelative, status: fullStatus };
            }
        }
        
        // 2. Try with single ellipsis: …/lastPart
        const ellipsisPath = `…/${lastPart}`;
        if (ellipsisPath.length + statusWithBrackets.length <= availableWidth) {
            return { path: ellipsisPath, status: fullStatus };
        }
        
        // 3. Smart truncation - truncate the longer text first, then alternate
        let currentLastPart = lastPart || '';
        let currentStatus = fullStatus;
        const minRequiredChars = 7; // …/… […] minimum
        let alternateNext = false; // Flag to track when to start alternating
        const originalLastPartLength = lastPart ? lastPart.length : 0;
        const originalStatusLength = fullStatus.length;
        
        while (true) {
            // Only add ellipses if the text has been actually truncated
            const pathTruncated = currentLastPart.length < originalLastPartLength;
            const statusTruncated = currentStatus.length < originalStatusLength;
            
            const pathWithEllipsis = currentLastPart.length > 0 
                ? (pathTruncated ? `…/${currentLastPart}…` : `…/${currentLastPart}`)
                : '…/…';
            const statusWithEllipsis = currentStatus.length > 0 
                ? (statusTruncated ? `${currentStatus}…` : currentStatus)
                : '…';
            const fullText = `${pathWithEllipsis} [${statusWithEllipsis}]`;
            
            if (fullText.length <= availableWidth) {
                return { path: pathWithEllipsis, status: statusWithEllipsis };
            }
            
            // Stop if we can't truncate further
            if (currentLastPart.length === 0 && currentStatus.length === 0) {
                break;
            }
            
            // Check if they're now equal length (start alternating)
            if (currentLastPart.length === currentStatus.length && !alternateNext) {
                alternateNext = true;
            }
            
            if (alternateNext) {
                // Alternate between truncating each (keep them balanced)
                // Use a simple toggle - alternate each iteration
                const shouldTruncatePath = (currentLastPart.length + currentStatus.length) % 2 === 0;
                
                if (shouldTruncatePath && currentLastPart.length > 0) {
                    currentLastPart = currentLastPart.slice(0, -1);
                } else if (currentStatus.length > 0) {
                    currentStatus = currentStatus.slice(0, -1);
                } else if (currentLastPart.length > 0) {
                    // Only one left to truncate
                    currentLastPart = currentLastPart.slice(0, -1);
                }
            } else {
                // Truncate the longer one until they're equal
                if (currentLastPart.length > currentStatus.length && currentLastPart.length > 0) {
                    currentLastPart = currentLastPart.slice(0, -1);
                } else if (currentStatus.length > currentLastPart.length && currentStatus.length > 0) {
                    currentStatus = currentStatus.slice(0, -1);
                } else {
                    // They're equal length now - start alternating
                    alternateNext = true;
                    // Don't truncate this iteration, let the alternating logic handle it next time
                    continue;
                }
            }
        }
        
        // 5. Last resort - just show what we can
        if (availableWidth >= minRequiredChars) {
            return { path: '…/…', status: '…' };
        } else {
            return { path: '…', status: '…' };
        }
    }

    private renderCollapsedWithYellowStatus(maxWidth: number): React.ReactElement {
        // Calculate available width (icon + space = 2, plus potential cursor space)
        const iconWidth = 2;
        const cursorWidth = this.isActive ? 0 : 0; // Cursor is handled separately in GenericListPanel
        const availableWidth = maxWidth - iconWidth - cursorWidth;
        
        const { path: truncatedPath, status: truncatedStatus } = this.truncatePathFromLeft(this.folderPath, availableWidth);
        
        return (
            <Text>
                <Text color={this.isActive ? 'cyan' : 'gray'}>
                    {this.icon}
                </Text>
                <Text {...(this.isActive ? { color: 'cyan' } : {})}>
                    {' '}{truncatedPath}
                </Text>
                {truncatedStatus && (
                    <>
                        <Text {...(this.isActive ? { color: 'cyan' } : {})}>
                            {' ['}
                        </Text>
                        <Text color={this.statusColor}>
                            {truncatedStatus}
                        </Text>
                        <Text {...(this.isActive ? { color: 'cyan' } : {})}>
                            {']'}
                        </Text>
                    </>
                )}
            </Text>
        );
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
    const folderIcon = isValid ? '■' : 'X';
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
    
    const modelLogItem = new LogItem(
        '◆',
        `Model: ${displayModel}`,
        '',
        false, // Not active
        false, // Not expanded initially
        modelDetails, // Model metadata as details
        undefined // No progress
    );
    
    
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
        
        constructor(icon: string, text: string, isActive: boolean = false, onSelectCallback?: () => void, overflowMode: 'truncate' | 'wrap' = 'wrap') {
            super(icon, text, isActive, onSelectCallback, overflowMode);
            this.statusText = text;
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
                    <Text color={this.isActive ? 'cyan' : 'gray'}>
                        {displayIcon}
                    </Text>
                    <Text color="yellow">
                        {' '}{displayText}
                    </Text>
                </Text>
            );
        }
    }
    
    const statusLogItem = new NoIndentTextListItem(
        '●',
        folderStatus,
        false, // Not active
        undefined, // No callback
        'truncate' // Use truncate mode
    );
    
    // Create child items array
    const childItems: IListItem[] = [
        statusLogItem,
        modelLogItem
    ];
    
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
            // For now, just close the container
            // TODO: Implement removal logic with a different UI approach
        },
        undefined, // No cancel handler
        undefined, // No validation state
        false // useDualButtons - single button mode
    );
    
    // Set button text
    manageFolderItem.updateButtonText('Close');
    
    return manageFolderItem;
}