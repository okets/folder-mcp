import React from 'react';
import { Box, Text, Transform } from 'ink';
import { theme } from '../../utils/theme';
import { getValidationColor, getValidationIcon, getVisualWidth } from '../../utils/validationDisplay';

interface ColumnLayout {
    columnCount: number;
    columnWidths: number[];
    itemsPerColumn: number;
    columns: Array<Array<{
        name: string;
        isDirectory: boolean;
        path: string;
        originalIndex: number;
    }>>;
}

function calculateColumnLayout(
    items: Array<{ name: string; isDirectory: boolean; path: string }>,
    availableWidth: number,
    minColumnWidth: number = 15,
    columnPadding: number = 2
): ColumnLayout {
    if (items.length === 0) {
        return { columnCount: 1, columnWidths: [], itemsPerColumn: 0, columns: [] };
    }
    
    // Start with maximum possible columns
    let maxColumns = Math.floor(availableWidth / (minColumnWidth + columnPadding));
    maxColumns = Math.min(maxColumns, items.length);
    
    // Try different column counts to find the best fit
    for (let colCount = maxColumns; colCount >= 1; colCount--) {
        const itemsPerCol = Math.ceil(items.length / colCount);
        const columns: typeof ColumnLayout.prototype.columns = [];
        const columnWidths: number[] = [];
        
        // Distribute items into columns (vertical-first distribution)
        for (let col = 0; col < colCount; col++) {
            const startIdx = col * itemsPerCol;
            const endIdx = Math.min(startIdx + itemsPerCol, items.length);
            const columnItems = items.slice(startIdx, endIdx).map((item, idx) => ({
                ...item,
                originalIndex: startIdx + idx
            }));
            
            if (columnItems.length > 0) {
                columns.push(columnItems);
                // Calculate column width based on longest item
                // All columns need space for indicator (2 chars)
                const maxLength = Math.max(...columnItems.map(item => 
                    item.name.length + (item.isDirectory ? 1 : 0) + 2
                ));
                columnWidths.push(maxLength);
            }
        }
        
        // Check if all columns fit
        const totalWidth = columnWidths.reduce((sum, w) => sum + w, 0) + 
                          (columns.length - 1) * columnPadding;
        
        if (totalWidth <= availableWidth) {
            return {
                columnCount: columns.length,
                columnWidths,
                itemsPerColumn: itemsPerCol,
                columns
            };
        }
    }
    
    // Fallback to single column
    const singleColumn = items.map((item, idx) => ({ ...item, originalIndex: idx }));
    return {
        columnCount: 1,
        columnWidths: [availableWidth],
        itemsPerColumn: items.length,
        columns: [singleColumn]
    };
}

export interface FilePickerBodyProps {
    currentPath: string;
    items: Array<{
        name: string;
        isDirectory: boolean;
        path: string;
        isConfirmAction?: boolean;
    }>;
    focusedIndex: number;
    width: number;
    maxLines?: number;
    headerColor?: string;
    error?: string | null;
    enableColumns?: boolean;
    mode?: 'file' | 'folder' | 'both';
    validationMessage?: {
        state: 'error' | 'warning' | 'info';
        message: string;
        icon?: string;
    } | null;
}

export const FilePickerBody = ({
    currentPath,
    items,
    focusedIndex,
    width,
    maxLines = 3,
    headerColor,
    error,
    enableColumns = true,
    mode,
    validationMessage
}: FilePickerBodyProps): React.ReactElement[] => {
    const elements: React.ReactElement[] = [];
    
    // Display current path with progressive truncation
    // Check if we have space for "Path: " label
    const fullDecoration = 11; // "│  Path: [" + "]"
    const minimalDecoration = 5; // "│  [" + "]"
    
    // Reserve space for validation icon if we have a validation message
    const validationReserve = validationMessage ? 2 : 0; // space + icon
    
    let showPathLabel = width >= 30; // Only show "Path: " if we have enough space
    let availableForPath;
    
    if (showPathLabel) {
        availableForPath = Math.max(0, width - fullDecoration - validationReserve);
    } else {
        availableForPath = Math.max(0, width - minimalDecoration - validationReserve);
    }
    
    const pathLine = formatPath(currentPath, availableForPath);
    
    // Build the complete line to ensure it fits
    const pathElements: React.ReactElement[] = [];
    pathElements.push(<Text key="prefix" color={headerColor || undefined}>│  </Text>);
    if (showPathLabel) {
        pathElements.push(<Text key="label">Path: </Text>);
    }
    pathElements.push(<Text key="bracket-open">[</Text>);
    pathElements.push(
        <Text key="path" color={theme.colors.configValuesColor}>
            {pathLine}
        </Text>
    );
    pathElements.push(<Text key="bracket-close">]</Text>);
    
    // Add validation message after the path
    if (validationMessage) {
        const validationIcon = validationMessage.icon || getValidationIcon(validationMessage.state);
        const validationColor = getValidationColor(validationMessage.state);
        
        // Calculate available space for validation message
        const pathLineLength = getVisualWidth(`│  ${showPathLabel ? 'Path: ' : ''}[${pathLine}]`);
        const availableForValidation = width - pathLineLength - 2; // -2 for space and icon
        
        if (availableForValidation > 0) {
            pathElements.push(<Text key="validation-space"> </Text>);
            pathElements.push(
                <Text key="validation-icon" color={validationColor}>
                    {validationIcon}
                </Text>
            );
            
            // Truncate validation message if needed
            if (validationMessage.message && availableForValidation > 2) {
                const truncatedMessage = validationMessage.message.length > availableForValidation - 1
                    ? validationMessage.message.substring(0, availableForValidation - 2) + '…'
                    : validationMessage.message;
                pathElements.push(<Text key="validation-space2"> </Text>);
                pathElements.push(
                    <Text key="validation-message" color={validationColor}>
                        {truncatedMessage}
                    </Text>
                );
            }
        } else {
            // Always show at least the validation icon
            pathElements.push(<Text key="validation-space"> </Text>);
            pathElements.push(
                <Text key="validation-icon" color={validationColor}>
                    {validationIcon}
                </Text>
            );
        }
    }
    
    elements.push(
        <Text key="path">
            <Transform transform={output => output}>
                {pathElements}
            </Transform>
        </Text>
    );
    
    if (error) {
        // Parse error to show appropriate message
        let errorMessage = '(access denied)';
        if (error.includes('ENOENT') || error.includes('no such file or directory')) {
            errorMessage = '(not found)';
        } else if (error.includes('ENOTDIR')) {
            errorMessage = '(not a directory)';
        } else if (error.includes('EMFILE')) {
            errorMessage = '(too many open files)';
        }
        
        elements.push(
            <Text key="error">
                <Text color={headerColor}>└─ </Text>
                <Text color={theme.colors.textMuted}>{errorMessage}</Text>
            </Text>
        );
        return elements;
    }
    
    if (items.length === 0) {
        // Empty directory
        elements.push(
            <Text key="empty">
                <Text color={headerColor || undefined}>└─ </Text>
                <Text color={theme.colors.textMuted}>(empty)</Text>
            </Text>
        );
        return elements;
    }
    
    // Calculate layout
    const availableWidth = width - 4; // Account for borders
    
    // Separate regular items from confirm action
    const regularItems = items.filter(item => !item.isConfirmAction);
    const confirmItem = items.find(item => item.isConfirmAction);
    
    const columnLayout = enableColumns && width > 40 && regularItems.length > 0
        ? calculateColumnLayout(regularItems, availableWidth)
        : null;
    
    // Variables for scrolling state
    let showScrollDown = false;
    let endRow = 0; // Initialize to 0, will be set appropriately later
    let itemsPerColumn = regularItems.length; // Default to all items for single column
    
    if (columnLayout && columnLayout.columnCount > 1) {
        // Multi-column layout
        const { columns, columnWidths } = columnLayout;
        itemsPerColumn = columnLayout.itemsPerColumn;
        
        // Map focused index to regular items only
        let regularFocusedIndex = -1;
        // Find the index in regularItems that corresponds to focusedIndex in items
        for (let i = 0, j = 0; i < items.length && j < regularItems.length; i++) {
            const item = items[i];
            if (item && !item.isConfirmAction) {
                if (i === focusedIndex) {
                    regularFocusedIndex = j;
                    break;
                }
                j++;
            }
        }
        
        // Calculate which column and row the focused item is in
        const focusedCol = regularFocusedIndex >= 0 ? Math.floor(regularFocusedIndex / itemsPerColumn) : -1;
        const focusedRow = regularFocusedIndex >= 0 ? regularFocusedIndex % itemsPerColumn : -1;
        
        // If confirm item is focused, use the last regular item's position for scrolling
        let scrollFocusRow = focusedRow;
        if (focusedIndex === items.length - 1 && confirmItem) {
            // Use the last regular item's row position
            const lastRegularIndex = regularItems.length - 1;
            const lastCol = Math.floor(lastRegularIndex / itemsPerColumn);
            const lastRow = lastRegularIndex % itemsPerColumn;
            // If we're in the last column, use that row
            scrollFocusRow = lastRow;
        } else if (focusedRow === -1 && regularItems.length > 0) {
            // If we can't find the focused item, try to keep current scroll position
            // or show the middle of the list
            scrollFocusRow = Math.floor(itemsPerColumn / 2);
        }
        
        // Calculate visible range with scrolling
        let startRow = 0;
        endRow = itemsPerColumn;
        let showScrollUp = false;
        
        if (itemsPerColumn > maxLines) {
            // Need vertical scrolling
            const halfVisible = Math.floor(maxLines / 2);
            
            // Ensure focused row is visible
            if (scrollFocusRow >= 0) {
                // Center the focused item if possible
                startRow = Math.max(0, scrollFocusRow - halfVisible);
                endRow = Math.min(itemsPerColumn, startRow + maxLines);
                
                // Adjust if we hit the bottom
                if (endRow === itemsPerColumn) {
                    startRow = Math.max(0, endRow - maxLines);
                }
                
                // Make sure the focused row is still visible after adjustments
                if (scrollFocusRow < startRow) {
                    startRow = scrollFocusRow;
                    endRow = Math.min(itemsPerColumn, startRow + maxLines);
                } else if (scrollFocusRow >= endRow) {
                    endRow = scrollFocusRow + 1;
                    startRow = Math.max(0, endRow - maxLines);
                }
            } else {
                // No focused item, show from top
                startRow = 0;
                endRow = Math.min(itemsPerColumn, maxLines);
            }
            
            showScrollUp = startRow > 0;
            showScrollDown = endRow < itemsPerColumn;
        }
        
        // Render rows
        for (let row = startRow; row < endRow; row++) {
            const rowElements: React.ReactElement[] = [];
            let isLastRow = row === endRow - 1;
            
            // Determine line prefix
            let linePrefix = '│ ';
            if (showScrollUp && row === startRow) {
                linePrefix = '│▲';
            } else if (showScrollDown && isLastRow) {
                linePrefix = '│▼';
            } else if (isLastRow && !showScrollDown && row === itemsPerColumn - 1 && mode !== 'file') {
                // Check if we're truly at the last row of items
                const lastItemRow = Math.ceil(regularItems.length / columns.length) - 1;
                if (row === lastItemRow && !confirmItem) {
                    linePrefix = '└─';
                }
            }
            
            rowElements.push(
                <Text key="prefix" color={headerColor || undefined}>{linePrefix}</Text>
            );
            
            // Render each column in this row
            for (let col = 0; col < columns.length; col++) {
                const columnItems = columns[col];
                if (!columnItems) continue;
                
                const item = row < columnItems.length ? columnItems[row] : null;
                
                if (item) {
                    const isFocused = item.originalIndex === regularFocusedIndex;
                    const itemName = item.name + (item.isDirectory ? '/' : '');
                    
                    // For column 0, we don't add leading spaces
                    // For other columns, we always reserve space for indicator
                    let cellWidth = columnWidths[col];
                    let cellContent = '';
                    
                    if (col === 0) {
                        // First column: needs consistent spacing
                        const truncName = itemName.length > cellWidth - 1 // -1 for safety buffer
                            ? itemName.slice(0, cellWidth - 2) + '…' // -2 for ellipsis and safety
                            : itemName.padEnd(cellWidth);
                        
                        if (isFocused) {
                            cellContent = '▶ ' + truncName;
                        } else {
                            cellContent = '  ' + truncName;  // 2 spaces to align with focused
                        }
                    } else {
                        // Other columns: always have indicator space
                        const maxName = cellWidth - 2 - 1; // -2 for indicator, -1 for safety buffer
                        const truncName = itemName.length > maxName
                            ? itemName.slice(0, maxName - 1) + '…'
                            : itemName.padEnd(maxName);
                        cellContent = (isFocused ? '▶ ' : '  ') + truncName;
                    }
                    
                    // Add separator to cell content if not last column
                    const fullCellContent = col < columns.length - 1 ? cellContent + '  ' : cellContent;
                    
                    // Render the cell with appropriate color
                    if (isFocused) {
                        rowElements.push(
                            <Text key={`col-${col}`} color={theme.colors.accent}>
                                {fullCellContent}
                            </Text>
                        );
                    } else {
                        // Use different color for directories
                        const itemColor = item.isDirectory ? theme.colors.textSecondary : undefined;
                        rowElements.push(
                            <Text key={`col-${col}`} color={itemColor}>
                                {fullCellContent}
                            </Text>
                        );
                    }
                } else {
                    // Empty cell with separator
                    const emptyCell = ' '.repeat(columnWidths[col] || 0);
                    const fullCell = col < columns.length - 1 ? emptyCell + '  ' : emptyCell;
                    rowElements.push(
                        <Text key={`col-${col}`}>
                            {fullCell}
                        </Text>
                    );
                }
            }
            
            // Use Transform to avoid spacing issues between Text elements
            elements.push(
                <Text key={`row-${row}`}>
                    <Transform transform={output => output}>
                        {rowElements}
                    </Transform>
                </Text>
            );
        }
    } else {
        // Single column layout (original code)
        // First, separate regular items from confirm item
        const regularItems = items.filter(item => !item.isConfirmAction);
        const confirmItem = items.find(item => item.isConfirmAction);
        
        let visibleItems = regularItems;
        let startIndex = 0;
        let showScrollUp = false;
        let showScrollDown = false;
        
        if (regularItems.length > maxLines) {
            // Need scrolling - only consider regular items
            const halfVisible = Math.floor(maxLines / 2);
            
            // Find focused index in regular items
            const focusedRegularIndex = focusedIndex < regularItems.length ? focusedIndex : -1;
            
            if (focusedRegularIndex >= 0) {
                // Center the focused item in the visible area
                startIndex = Math.max(0, focusedRegularIndex - halfVisible);
                
                // Make sure we always show maxLines items if possible
                const endIndex = startIndex + maxLines;
                
                // Adjust if we're past the end
                if (endIndex > regularItems.length) {
                    startIndex = Math.max(0, regularItems.length - maxLines);
                }
            }
            
            visibleItems = regularItems.slice(startIndex, startIndex + maxLines);
            showScrollUp = startIndex > 0;
            showScrollDown = startIndex + maxLines < regularItems.length;
        }
        
        // Use visibleItems directly (already filtered)
        const regularVisibleItems = visibleItems;
        
        // Render visible items
        regularVisibleItems.forEach((item, visibleIndex) => {
            const actualIndex = items.indexOf(item);
            const isFocused = actualIndex === focusedIndex;
            const isLast = visibleIndex === regularVisibleItems.length - 1;
            
            // Determine line prefix with scroll indicators
            let linePrefix = '│ ';
            if (showScrollUp && visibleIndex === 0) {
                linePrefix = '│▲';
            } else if (showScrollDown && isLast) {
                linePrefix = '│▼';
            } else if (isLast && !showScrollDown && !items.some(i => i.isConfirmAction) && mode !== 'file') {
                // Only show └─ if there's no confirm item and not in file mode
                linePrefix = '└─';
            }
            
            // Format regular item name
            const itemName = item.name + (item.isDirectory ? '/' : '');
            
            // Calculate available width for item name
            // Reserve space for: linePrefix + indicator + space + conservative margin
            const prefixWidth = linePrefix.length + 2 + 1; // linePrefix + "▶ " or "  " + margin
            const availableWidth = width - prefixWidth - 1; // -1 for safety buffer
            
            // Truncate item name if needed
            const displayName = itemName.length > availableWidth 
                ? itemName.slice(0, availableWidth - 1) + '…'
                : itemName;
            
            // Build the line with appropriate color
            elements.push(
                <Text key={`item-${actualIndex}`}>
                    <Text color={headerColor}>{linePrefix}</Text>
                    {isFocused ? (
                        <Text color={theme.colors.accent}>▶ {displayName}</Text>
                    ) : (
                        <Text color={item.isDirectory ? theme.colors.textSecondary : undefined}>
                            {'  '}{displayName}
                        </Text>
                    )}
                </Text>
            );
        });
    }
    
    // Add confirm selection or empty line
    if (confirmItem) {
        const isConfirmFocused = focusedIndex === items.length - 1;
        
        // Only show confirm selection if we're showing the bottom of the list
        const isShowingBottom = !showScrollDown || (endRow === itemsPerColumn);
        
        if (isShowingBottom || isConfirmFocused) {
            // Calculate available width for confirm text
            // "└─▶ ✓ " = 7 chars when focused, "└─  ✓ " = 7 chars when not focused
            const prefixWidth = 7;
            const availableForText = width - prefixWidth;
            
            // Progressive truncation for confirm text
            let confirmText = 'Confirm Selection';
            if (confirmText.length > availableForText) {
                if (availableForText >= 7) { // "Confirm" needs 7 chars
                    confirmText = 'Confirm';
                } else if (availableForText >= 2) { // "OK" needs 2 chars
                    confirmText = 'OK';
                } else {
                    confirmText = ''; // No space for any text
                }
            }
            
            elements.push(
            <Text key="confirm-action">
                <Text color={headerColor || theme.colors.textMuted}>└─</Text>
                {isConfirmFocused ? (
                    <Text color={theme.colors.accent}>▶ </Text>
                ) : (
                    <Text>  </Text>
                )}
                <Text color={theme.colors.successGreen}>✓ </Text>
                {confirmText && (
                    isConfirmFocused ? (
                        <Text color={theme.colors.accent}>{confirmText}</Text>
                    ) : (
                        <Text>{confirmText}</Text>
                    )
                )}
            </Text>
            );
        }
    } else if (mode === 'file' && items.length > 0) {
        elements.push(
            <Text key="empty-line">
                <Text color={headerColor || theme.colors.textMuted}>└─</Text>
            </Text>
        );
    }
    
    return elements;
};

function formatPath(fullPath: string, maxWidth: number): string {
    if (maxWidth <= 0) {
        return '';
    }
    
    if (fullPath.length <= maxWidth) {
        return fullPath;
    }
    
    // Truncate from the left with ellipsis
    const ellipsis = '…';
    
    // If we don't have room for ellipsis, just show the end of the path
    if (maxWidth <= ellipsis.length) {
        return fullPath.slice(-maxWidth);
    }
    
    const keepLength = maxWidth - ellipsis.length;
    return ellipsis + fullPath.slice(-keepLength);
}