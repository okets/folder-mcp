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
    }>;
    focusedIndex: number;
    width: number;
    maxLines?: number;
    headerColor?: string;
    error?: string | null;
    enableColumns?: boolean;
}

export const FilePickerBody = ({
    currentPath,
    items,
    focusedIndex,
    width,
    maxLines = 3,
    headerColor,
    error,
    enableColumns = true
}: FilePickerBodyProps): React.ReactElement[] => {
    const elements: React.ReactElement[] = [];
    
    // Display current path with left truncation
    const pathLine = formatPath(currentPath, width - 6); // Account for "│  Path: "
    elements.push(
        <Text key="path">
            <Text color={headerColor || undefined}>│  </Text>
            <Text color={theme.colors.textMuted}>Path: {pathLine}</Text>
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
    const columnLayout = enableColumns && width > 40 
        ? calculateColumnLayout(items, availableWidth)
        : null;
    
    if (columnLayout && columnLayout.columnCount > 1) {
        // Multi-column layout
        const { columns, columnWidths, itemsPerColumn } = columnLayout;
        
        // Calculate which column and row the focused item is in
        const focusedCol = Math.floor(focusedIndex / itemsPerColumn);
        const focusedRow = focusedIndex % itemsPerColumn;
        
        // Calculate visible range with scrolling
        let startRow = 0;
        let endRow = itemsPerColumn;
        let showScrollUp = false;
        let showScrollDown = false;
        
        if (itemsPerColumn > maxLines) {
            // Need vertical scrolling
            const halfVisible = Math.floor(maxLines / 2);
            startRow = Math.max(0, focusedRow - halfVisible);
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
            } else if (isLastRow && !showScrollDown && row === itemsPerColumn - 1) {
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
                    const isFocused = item.originalIndex === focusedIndex;
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
                    
                    // Render the cell
                    if (isFocused) {
                        rowElements.push(
                            <Text key={`col-${col}`} color={theme.colors.accent}>
                                {fullCellContent}
                            </Text>
                        );
                    } else {
                        rowElements.push(
                            <Text key={`col-${col}`}>
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
            } else if (isLast && !showScrollDown) {
                linePrefix = '└─';
            }
            
            
            // Format item name
            const indicator = isFocused ? '▶' : ' ';
            const itemName = item.name + (item.isDirectory ? '/' : '');
            
            // Calculate available width for item name
            const prefixWidth = linePrefix.length + 2 + indicator.length; // "│  ▶" (no extra space after indicator)
            const availableWidth = width - prefixWidth;
            
            // Truncate item name if needed
            const displayName = itemName.length > availableWidth 
                ? itemName.slice(0, availableWidth - 1) + '…'
                : itemName;
            
            // Build the line
            elements.push(
                <Box key={`item-${actualIndex}`}>
                    <Text color={headerColor}>{linePrefix}</Text>
                    <Text> {indicator}</Text>
                    {isFocused ? (
                        <Text color={theme.colors.accent}>
                            {displayName}
                        </Text>
                    ) : (
                        <Text>{displayName}</Text>
                    )}
                </Box>
            );
        });
    }
    
    return elements;
};

function formatPath(fullPath: string, maxWidth: number): string {
    if (fullPath.length <= maxWidth) {
        return fullPath;
    }
    
    // Truncate from the left with ellipsis
    const ellipsis = '...';
    const keepLength = maxWidth - ellipsis.length;
    return ellipsis + fullPath.slice(-keepLength);
}