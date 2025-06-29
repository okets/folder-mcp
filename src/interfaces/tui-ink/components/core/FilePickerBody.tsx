import React from 'react';
import { Box, Text, Transform } from 'ink';
import { theme } from '../../utils/theme.js';

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
    mode
}: FilePickerBodyProps): React.ReactElement[] => {
    const elements: React.ReactElement[] = [];
    
    // Display current path with left truncation inside brackets
    // Calculate space: "│  Path: [" (10) + "]" (1) = 11 chars for decoration
    const availableForPath = Math.max(0, width - 11);
    const pathLine = formatPath(currentPath, availableForPath);
    
    // Build the complete line to ensure it fits
    const pathElements: React.ReactElement[] = [];
    pathElements.push(<Text key="prefix" color={headerColor || undefined}>│  </Text>);
    pathElements.push(<Text key="label" color={theme.colors.textMuted}>Path: </Text>);
    pathElements.push(<Text key="bracket-open" color={theme.colors.textMuted}>[</Text>);
    pathElements.push(
        <Text key="path" color={error ? 'red' : theme.colors.configValuesColor}>
            {pathLine}
        </Text>
    );
    pathElements.push(<Text key="bracket-close" color={theme.colors.textMuted}>]</Text>);
    
    elements.push(
        <Text key="path">
            <Transform transform={output => output}>
                {pathElements}
            </Transform>
        </Text>
    );
    
    if (error) {
        // Show (empty) message since we can't access the folder
        elements.push(
            <Text key="error">
                <Text color={headerColor || undefined}>└─ </Text>
                <Text color={theme.colors.textMuted}>(inaccessible)</Text>
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
    
    if (columnLayout && columnLayout.columnCount > 1) {
        // Multi-column layout
        const { columns, columnWidths, itemsPerColumn } = columnLayout;
        
        // Map focused index to regular items only
        let regularFocusedIndex = -1;
        if (focusedIndex < regularItems.length) {
            // Find the index in regularItems that corresponds to focusedIndex in items
            for (let i = 0, j = 0; i < items.length && j < regularItems.length; i++) {
                if (!items[i].isConfirmAction) {
                    if (i === focusedIndex) {
                        regularFocusedIndex = j;
                        break;
                    }
                    j++;
                }
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
        }
        
        // Calculate visible range with scrolling
        let startRow = 0;
        let endRow = itemsPerColumn;
        let showScrollUp = false;
        let showScrollDown = false;
        
        if (itemsPerColumn > maxLines) {
            // Need vertical scrolling
            const halfVisible = Math.floor(maxLines / 2);
            // Use scrollFocusRow for scroll position calculation
            startRow = Math.max(0, scrollFocusRow >= 0 ? scrollFocusRow - halfVisible : 0);
            endRow = Math.min(itemsPerColumn, startRow + maxLines);
            
            if (endRow === itemsPerColumn) {
                startRow = Math.max(0, endRow - maxLines);
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
            } else if (isLastRow && !showScrollDown && row === itemsPerColumn - 1 && !confirmItem && mode !== 'file') {
                // Only show └─ if there's no confirm item and not in file mode
                linePrefix = '└─';
            }
            
            rowElements.push(
                <Text key="prefix" color={headerColor}>{linePrefix}</Text>
            );
            
            // Render each column in this row
            for (let col = 0; col < columns.length; col++) {
                const columnItems = columns[col];
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
                        const truncName = itemName.length > cellWidth
                            ? itemName.slice(0, cellWidth - 1) + '…'
                            : itemName.padEnd(cellWidth);
                        
                        if (isFocused) {
                            cellContent = '▶ ' + truncName;
                        } else {
                            cellContent = '  ' + truncName;  // 2 spaces to align with focused
                        }
                    } else {
                        // Other columns: always have indicator space
                        const maxName = cellWidth - 2; // -2 for indicator
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
        let visibleItems = items;
        let startIndex = 0;
        let showScrollUp = false;
        let showScrollDown = false;
        
        if (items.length > maxLines) {
            // Need scrolling
            const halfVisible = Math.floor(maxLines / 2);
            
            // Center the focused item in the visible area
            startIndex = Math.max(0, focusedIndex - halfVisible);
            const endIndex = Math.min(items.length, startIndex + maxLines);
            
            // Adjust if we're near the end
            if (endIndex === items.length) {
                startIndex = Math.max(0, endIndex - maxLines);
            }
            
            visibleItems = items.slice(startIndex, endIndex);
            showScrollUp = startIndex > 0;
            showScrollDown = endIndex < items.length;
        }
        
        // Render visible items
        visibleItems.forEach((item, visibleIndex) => {
            const actualIndex = startIndex + visibleIndex;
            const isFocused = actualIndex === focusedIndex;
            const isLast = visibleIndex === visibleItems.length - 1;
            
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
            // Special handling for confirm action
            if (item.isConfirmAction) {
                // Don't render confirm action in the regular list
                // It will be rendered separately at the bottom
                return;
            }
            
            // Format regular item name
            const indicator = isFocused ? '▶' : ' ';
            const itemName = item.name + (item.isDirectory ? '/' : '');
            
            // Calculate available width for item name
            const prefixWidth = linePrefix.length + 2 + indicator.length;
            const availableWidth = width - prefixWidth;
            
            // Truncate item name if needed
            const displayName = itemName.length > availableWidth 
                ? itemName.slice(0, availableWidth - 1) + '…'
                : itemName;
            
            // Build the line with appropriate color
            elements.push(
                <Box key={`item-${actualIndex}`}>
                    <Text color={headerColor}>{linePrefix}</Text>
                    <Text> {indicator}</Text>
                    {isFocused ? (
                        <Text color={theme.colors.accent}>
                            {displayName}
                        </Text>
                    ) : (
                        <Text color={item.isDirectory ? theme.colors.textSecondary : undefined}>
                            {displayName}
                        </Text>
                    )}
                </Box>
            );
        });
    }
    
    // Add confirm selection or empty line
    if (confirmItem) {
        const isConfirmFocused = focusedIndex === items.length - 1;
        elements.push(
            <Text key="confirm-action">
                {isConfirmFocused ? (
                    <>
                        <Text color={headerColor}>└─</Text>
                        <Text color={theme.colors.accent}>▶ </Text>
                        <Text color={theme.colors.successGreen}>✓ </Text>
                        <Text color={theme.colors.accent}>Confirm Selection</Text>
                    </>
                ) : (
                    <>
                        <Text color={headerColor}>└─ </Text>
                        <Text color={theme.colors.successGreen}>✓ </Text>
                        <Text>Confirm Selection</Text>
                    </>
                )}
            </Text>
        );
    } else if (mode === 'file' && items.length > 0) {
        elements.push(
            <Text key="empty-line">
                <Text color={headerColor}>└─</Text>
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