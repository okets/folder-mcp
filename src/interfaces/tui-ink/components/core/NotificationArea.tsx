import React from 'react';
import { Box, Text, measureElement } from 'ink';
import { theme } from '../../utils/theme.js';

export interface NotificationAreaProps {
    validationError?: string | null;
    showKeyboardHints?: boolean;
    maxWidth?: number;
}

/**
 * Shared notification area component that displays either validation errors or keyboard hints
 * Used in the header of expanded ConfigurationListItems
 */
export const NotificationArea: React.FC<NotificationAreaProps> = ({ 
    validationError, 
    showKeyboardHints = true,
    maxWidth
}) => {
    // Validation errors take priority over keyboard hints
    if (validationError) {
        const errorPrefix = ' ✗ ';
        let errorText = validationError;
        
        // Truncate error message if needed
        if (maxWidth && (errorPrefix.length + errorText.length > maxWidth)) {
            const availableForText = Math.max(0, maxWidth - errorPrefix.length - 1); // -1 for ellipsis
            if (availableForText > 0) {
                errorText = errorText.slice(0, availableForText) + '…';
            } else {
                errorText = '';
            }
        }
        
        return (
            <Box>
                <Text color="red">{errorPrefix}</Text>
                <Text color="red">{errorText}</Text>
            </Box>
        );
    }
    
    // Show keyboard hints if enabled and no error
    if (showKeyboardHints) {
        // Keyboard hints are fixed length: " [enter] ✓ [esc] ✗"
        const hintsLength = 19;
        
        // Only show hints if there's enough space
        if (maxWidth && maxWidth < hintsLength) {
            return null;
        }
        
        return (
            <Box>
                <Text color={theme.colors.textMuted}> [enter] </Text>
                <Text color={theme.colors.successGreen}>✓</Text>
                <Text color={theme.colors.textMuted}> [esc] </Text>
                <Text color={theme.colors.warningOrange}>✗</Text>
            </Box>
        );
    }
    
    return null;
};