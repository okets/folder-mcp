import React from 'react';
import { Text } from 'ink';
import { theme } from '../../../utils/theme.js';
import { useDI } from '../../../di/DIContext.js';
import { ServiceTokens } from '../../../di/tokens.js';

interface ICollapsedSummaryProps {
    label: string;
    value: string | string[];
    maxWidth: number;
    isSelected: boolean;
}

export const CollapsedSummary: React.FC<ICollapsedSummaryProps> = ({ 
    label, 
    value, 
    maxWidth,
    isSelected 
}) => {
    const di = useDI();
    const contentService = di.resolve(ServiceTokens.ContentService);
    
    const displayValue = Array.isArray(value) ? value.join(', ') : value;
    
    // Calculate available space
    const prefixWidth = 2; // "│ " or "▶ "
    const suffixWidth = 1; // "→"
    const bracketsWidth = 2; // "[]"
    const separatorWidth = 2; // ": "
    
    const availableWidth = maxWidth - prefixWidth - suffixWidth - bracketsWidth - separatorWidth;
    
    // Always show value, truncate label if needed
    const valueWidth = contentService.measureText(displayValue);
    const labelAvailableWidth = availableWidth - valueWidth;
    
    let truncatedLabel = label;
    if (labelAvailableWidth < contentService.measureText(label)) {
        truncatedLabel = contentService.truncateText(label, Math.max(3, labelAvailableWidth));
    }
    
    return (
        <Text>
            <Text color={isSelected ? theme.colors.accent : undefined}>
                {isSelected ? '▶' : '│'} {truncatedLabel}: 
            </Text>
            <Text color={theme.colors.textSecondary}>
                [{displayValue}]
            </Text>
            <Text color={isSelected ? theme.colors.accent : undefined}> →</Text>
        </Text>
    );
};