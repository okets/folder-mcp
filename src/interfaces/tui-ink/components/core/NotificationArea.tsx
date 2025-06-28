import React from 'react';
import { Text } from 'ink';
import { theme } from '../../utils/theme.js';

export interface NotificationAreaProps {
    validationError?: string | null;
    showKeyboardHints?: boolean;
}

/**
 * Shared notification area component that displays either validation errors or keyboard hints
 * Used in the header of expanded ConfigurationListItems
 */
export const NotificationArea: React.FC<NotificationAreaProps> = ({ 
    validationError, 
    showKeyboardHints = true 
}) => {
    // Validation errors take priority over keyboard hints
    if (validationError) {
        return (
            <>
                <Text color="red"> ✗ </Text>
                <Text color="red">{validationError}</Text>
            </>
        );
    }
    
    // Show keyboard hints if enabled and no error
    if (showKeyboardHints) {
        return (
            <>
                <Text color={theme.colors.textMuted}> [enter] </Text>
                <Text color={theme.colors.successGreen}>✓</Text>
                <Text color={theme.colors.textMuted}> [esc] </Text>
                <Text color={theme.colors.warningOrange}>✗</Text>
            </>
        );
    }
    
    return null;
};