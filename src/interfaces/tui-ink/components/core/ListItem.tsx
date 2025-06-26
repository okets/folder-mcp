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
        <Box flexDirection="column">
            <Text color={isActive ? color : undefined}>
                {icon} {truncatedHeader}
            </Text>
            {isExpanded && body && body}
        </Box>
    );
};

/**
 * Remove ANSI escape codes from text
 * @param text - Text with possible ANSI codes
 * @returns Plain text without ANSI codes
 */
function stripAnsi(text: string): string {
    // Match all ANSI escape sequences
    return text.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Truncate text to fit within the given width
 * Handles ANSI escape codes properly
 * @param text - Text to truncate (may contain ANSI codes)
 * @param maxWidth - Maximum width available
 * @returns Truncated text with ellipsis if needed, preserving ANSI codes
 */
export function truncate(text: string, maxWidth: number): string {
    // Get visible length without ANSI codes
    const visibleLength = stripAnsi(text).length;
    
    if (visibleLength <= maxWidth) {
        return text;
    }
    
    if (maxWidth <= 3) {
        return '...'.slice(0, maxWidth);
    }
    
    // Find ANSI codes and their positions
    const ansiCodes: Array<{code: string, pos: number}> = [];
    let match;
    const ansiRegex = /\x1b\[[0-9;]*m/g;
    while ((match = ansiRegex.exec(text)) !== null) {
        ansiCodes.push({ code: match[0], pos: match.index });
    }
    
    // Calculate where to cut the visible text
    const targetLength = maxWidth - 3;
    let visiblePos = 0;
    let actualPos = 0;
    
    while (visiblePos < targetLength && actualPos < text.length) {
        // Check if we're at an ANSI code
        const ansiCode = ansiCodes.find(a => a.pos === actualPos);
        if (ansiCode) {
            actualPos += ansiCode.code.length;
        } else {
            visiblePos++;
            actualPos++;
        }
    }
    
    return text.slice(0, actualPos) + '...';
}