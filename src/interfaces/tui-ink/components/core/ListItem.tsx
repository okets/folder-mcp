import React from 'react';
import { Box, Text } from 'ink';

export interface ListItemProps {
    icon: string;
    header: string;
    body?: React.ReactNode;
    isActive?: boolean;
    isExpanded?: boolean;
    width: number;
    color?: string;
}

/**
 * Generic list item component with icon, header, and optional expandable body
 * This is the base component for all list items in the TUI
 */
export const ListItem: React.FC<ListItemProps> = ({ 
    icon, 
    header, 
    body,
    isActive = false,
    isExpanded = false,
    width,
    color
}) => {
    // Truncate header if it exceeds available width
    // Account for icon (1 char) + space (1 char) = 2 chars
    const maxHeaderWidth = width - 2;
    const truncatedHeader = truncate(header, maxHeaderWidth);
    
    return (
        <>
            <Text color={isActive ? color : undefined}>
                {icon} {truncatedHeader}
            </Text>
            {isExpanded && body && (
                <Box flexDirection="column">
                    {body}
                </Box>
            )}
        </>
    );
};

/**
 * Truncate text to fit within the given width
 * @param text - Text to truncate
 * @param maxWidth - Maximum width available
 * @returns Truncated text with ellipsis if needed
 */
export function truncate(text: string, maxWidth: number): string {
    if (text.length <= maxWidth) {
        return text;
    }
    
    if (maxWidth <= 3) {
        return '...'.slice(0, maxWidth);
    }
    
    return text.slice(0, maxWidth - 3) + '...';
}