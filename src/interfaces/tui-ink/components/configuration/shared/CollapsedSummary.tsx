import React from 'react';
import { Text } from 'ink';
import { theme } from '../../../utils/theme';
import { useDI } from '../../../di/DIContext';
import { ServiceTokens } from '../../../di/tokens';

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
    
    // Calculate available space - use conservative width to prevent wrapping but preserve validation
    const conservativeWidth = maxWidth - 1; // Reserve space to prevent text wrapping while preserving validation
    const prefixWidth = 2; // "· " or "▶ "
    const suffixWidth = 1; // "→"
    const bracketsWidth = 2; // "[]"
    const separatorWidth = 2; // ": "
    
    const availableWidth = conservativeWidth - prefixWidth - suffixWidth - bracketsWidth - separatorWidth;
    
    // Always show value, truncate label if needed
    const valueWidth = contentService.measureText(displayValue);
    const labelAvailableWidth = availableWidth - valueWidth;
    
    let truncatedLabel = label;
    if (labelAvailableWidth < contentService.measureText(label)) {
        truncatedLabel = contentService.truncateText(label, Math.max(3, labelAvailableWidth));
    }
    
    // Build single text string to prevent wrapping at component boundaries
    const prefix = isSelected ? '▶' : '·';
    const fullDisplayText = `${prefix} ${truncatedLabel}: [${displayValue}] →`;
    
    return (
        <Text color={isSelected ? theme.colors.accent : undefined}>
            {fullDisplayText}
        </Text>
    );
};