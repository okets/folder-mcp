import React from 'react';
import { Box, Text, measureElement } from 'ink';
import { getCurrentTheme } from '../../utils/theme';

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
    const theme = getCurrentTheme();
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
        // Progressive truncation for keyboard hints
        const fullHintsLength = 17; // " enter ✓ · esc ✗"
        const partialHintsLength = 9; // " enter ✓"
        
        let showFullHints = false;
        let showPartialHints = false;
        
        if (!maxWidth || maxWidth >= fullHintsLength) {
            showFullHints = true;
        } else if (maxWidth >= partialHintsLength) {
            showPartialHints = true;
        }
        
        if (!showFullHints && !showPartialHints) {
            return null;
        }
        
        return (
            <Box>
                {showFullHints && (
                    <>
                        <Text color={theme.colors.textMuted}> </Text>
                        <Text color={theme.colors.textMuted} bold>enter </Text>
                        <Text color={theme.colors.successGreen}>✓</Text>
                        <Text color={theme.colors.textMuted}> · </Text>
                        <Text color={theme.colors.textMuted} bold>esc </Text>
                        <Text color={theme.colors.warningOrange}>✗</Text>
                    </>
                )}
                {showPartialHints && !showFullHints && (
                    <>
                        <Text color={theme.colors.textMuted}> </Text>
                        <Text color={theme.colors.textMuted} bold>enter </Text>
                        <Text color={theme.colors.successGreen}>✓</Text>
                    </>
                )}
            </Box>
        );
    }
    
    return null;
};