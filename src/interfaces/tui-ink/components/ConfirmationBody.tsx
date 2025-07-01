import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../utils/theme.js';
import { IDestructiveConfig } from '../models/configuration.js';

interface ConfirmationBodyProps {
    destructiveConfig: IDestructiveConfig;
    currentValue: any;
    newValue: any;
    focusedButton: number; // 0 for cancel, 1 for confirm
    maxWidth: number;
}

// Simple truncate function
const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    if (maxLength <= 3) return '…';
    return text.substring(0, maxLength - 1) + '…';
};

// Split text into lines that fit within maxWidth
const splitIntoLines = (text: string, maxWidth: number): string[] => {
    if (text.length <= maxWidth) return [text];
    
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
        if (currentLine.length === 0) {
            currentLine = word;
        } else if ((currentLine + ' ' + word).length <= maxWidth) {
            currentLine += ' ' + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    
    if (currentLine.length > 0) {
        lines.push(currentLine);
    }
    
    return lines;
};

/**
 * Confirmation body component that returns an array of elements
 * Following the same pattern as TextInputBody
 */
export const ConfirmationBody = ({
    destructiveConfig,
    currentValue,
    newValue,
    focusedButton,
    maxWidth
}: ConfirmationBodyProps): React.ReactElement[] => {
    const elements: React.ReactElement[] = [];
    
    // Calculate available width (account for indent)
    const indentWidth = 3; // "│  "
    const contentWidth = maxWidth - indentWidth - 2; // -2 for safety margin
    
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
    
    // Title with warning icon
    elements.push(
        <Text key="title">
            {'│  '}
            <Text color={severityColor} bold={destructiveConfig.level === 'critical'}>
                ⚠️  {truncateText(destructiveConfig.title, contentWidth - 4)}
            </Text>
        </Text>
    );
    
    // Empty line
    elements.push(<Text key="space1">{'│'}</Text>);
    
    // Message - split into lines
    const messageLines = splitIntoLines(destructiveConfig.message, contentWidth);
    messageLines.forEach((line, index) => {
        elements.push(
            <Text key={`msg-${index}`}>
                {'│  '}{line}
            </Text>
        );
    });
    
    // Consequences if any
    if (destructiveConfig.consequences && destructiveConfig.consequences.length > 0) {
        elements.push(<Text key="space2">{'│'}</Text>);
        destructiveConfig.consequences.forEach((consequence, index) => {
            elements.push(
                <Text key={`cons-${index}`} color={theme.colors.textSecondary}>
                    {'│  '}• {truncateText(consequence, contentWidth - 2)}
                </Text>
            );
        });
    }
    
    // Empty line
    elements.push(<Text key="space3">{'│'}</Text>);
    
    // Current vs New value
    elements.push(
        <Text key="current" color={theme.colors.textSecondary}>
            {'│  '}Current: {truncateText(formatValue(currentValue), contentWidth - 10)}
        </Text>
    );
    elements.push(
        <Text key="new" color={theme.colors.textSecondary}>
            {'│  '}New: {truncateText(formatValue(newValue), contentWidth - 6)}
        </Text>
    );
    
    // Estimated time if provided
    if (destructiveConfig.estimatedTime) {
        elements.push(
            <Text key="time" color={severityColor}>
                {'│  '}Estimated time: {destructiveConfig.estimatedTime}
            </Text>
        );
    }
    
    // Empty line before buttons
    elements.push(<Text key="space4">{'│'}</Text>);
    
    // Buttons
    elements.push(
        <Text key="buttons">
            {'│  '}
            <Text 
                inverse={focusedButton === 0}
                color={focusedButton === 0 ? undefined : theme.colors.textSecondary}
            >
                [{cancelText}]
            </Text>
            {'  '}
            <Text 
                inverse={focusedButton === 1}
                color={focusedButton === 1 ? severityColor : theme.colors.textSecondary}
            >
                [{confirmText}]
            </Text>
        </Text>
    );
    
    return elements;
};