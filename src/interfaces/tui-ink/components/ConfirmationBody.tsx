import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../utils/theme.js';
import { IDestructiveConfig } from '../models/configuration.js';
import { truncateText } from '../utils/textUtils.js';

interface ConfirmationBodyProps {
    destructiveConfig: IDestructiveConfig;
    currentValue: any;
    newValue: any;
    focusedButton: number; // 0 for cancel, 1 for confirm
    maxWidth: number;
}

export const ConfirmationBody: React.FC<ConfirmationBodyProps> = ({
    destructiveConfig,
    currentValue,
    newValue,
    focusedButton,
    maxWidth
}) => {
    // Get appropriate color based on severity level
    const severityColor = destructiveConfig.level === 'critical' 
        ? theme.colors.dangerRed 
        : theme.colors.warningOrange;
    
    // Get button texts with defaults
    const cancelText = destructiveConfig.cancelText || 'Cancel';
    const confirmText = destructiveConfig.confirmText || 'Confirm';
    
    // Format value for display
    const formatValue = (value: any): string => {
        if (value === undefined || value === null) return '<empty>';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (Array.isArray(value)) return value.join(', ') || '<none>';
        return String(value);
    };
    
    // Calculate available content width
    const contentWidth = maxWidth - 4; // Account for padding
    
    // Truncate message if needed for narrow terminals
    const displayMessage = contentWidth < 50 
        ? truncateText(destructiveConfig.message, contentWidth)
        : destructiveConfig.message;
    
    return (
        <Box flexDirection="column" width={contentWidth} paddingLeft={2}>
            {/* Title with warning icon */}
            <Box marginBottom={1}>
                <Text color={severityColor} bold={destructiveConfig.level === 'critical'}>
                    ⚠️  {truncateText(destructiveConfig.title, contentWidth - 4)}
                </Text>
            </Box>
            
            {/* Message */}
            <Box marginBottom={1}>
                <Text wrap="wrap">{displayMessage}</Text>
            </Box>
            
            {/* Consequences list if provided */}
            {destructiveConfig.consequences && destructiveConfig.consequences.length > 0 && (
                <Box flexDirection="column" marginBottom={1}>
                    {destructiveConfig.consequences.map((consequence, index) => (
                        <Text key={index} color={theme.colors.textSecondary}>
                            • {truncateText(consequence, contentWidth - 2)}
                        </Text>
                    ))}
                </Box>
            )}
            
            {/* Current vs New value */}
            <Box flexDirection="column" marginBottom={1}>
                <Text color={theme.colors.textSecondary}>
                    Current: {truncateText(formatValue(currentValue), contentWidth - 9)}
                </Text>
                <Text color={theme.colors.textSecondary}>
                    New: {truncateText(formatValue(newValue), contentWidth - 5)}
                </Text>
            </Box>
            
            {/* Estimated time if provided */}
            {destructiveConfig.estimatedTime && (
                <Box marginBottom={1}>
                    <Text color={severityColor}>
                        Estimated time: {destructiveConfig.estimatedTime}
                    </Text>
                </Box>
            )}
            
            {/* Buttons */}
            <Box gap={2}>
                <Box>
                    <Text 
                        inverse={focusedButton === 0}
                        color={focusedButton === 0 ? undefined : theme.colors.textSecondary}
                    >
                        [{cancelText}]
                    </Text>
                </Box>
                <Box>
                    <Text 
                        inverse={focusedButton === 1}
                        color={focusedButton === 1 ? severityColor : theme.colors.textSecondary}
                    >
                        [{confirmText}]
                    </Text>
                </Box>
            </Box>
        </Box>
    );
};