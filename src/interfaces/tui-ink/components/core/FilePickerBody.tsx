import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../../utils/theme.js';

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
}

export const FilePickerBody = ({
    currentPath,
    items,
    focusedIndex,
    width,
    maxLines = 3,
    headerColor,
    error
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
        // Show error message
        elements.push(
            <Text key="error">
                <Text color={headerColor || undefined}>└─ </Text>
                <Text color="red">{error}</Text>
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
    
    // Calculate visible items with scrolling
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
                <Text color={headerColor || undefined}>{linePrefix}</Text>
                <Text> {indicator}</Text>
                <Text color={isFocused ? theme.colors.accent : undefined}>
                    {displayName}
                </Text>
            </Box>
        );
    });
    
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