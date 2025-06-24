import React from 'react';
import { Box, Text } from 'ink';
import { useDI } from '../di/DIContext.js';
import { ServiceTokens } from '../di/tokens.js';
import { useLayoutConstraints } from '../contexts/LayoutContext.js';

interface StatusItemLayoutProps {
    text: string;
    status?: string;
    color?: string;
    statusColor?: string;
    selectionIndicator?: string;
}

export const StatusItemLayout: React.FC<StatusItemLayoutProps> = ({ 
    text, 
    status, 
    color,
    statusColor,
    selectionIndicator = '○'
}) => {
    const di = useDI();
    const contentService = di.resolve(ServiceTokens.ContentService);
    const constraints = useLayoutConstraints();
    
    // Get maximum width available
    const maxWidth = constraints?.maxWidth || 80;
    
    // Reserve space for selection indicator and its trailing space
    const indicatorWidth = contentService.measureText(selectionIndicator + ' ');
    
    // Reserve space for status indicator (including space before it)
    const statusWidth = status ? contentService.measureText(' ' + status) : 0;
    
    // Calculate available width for main text with safety margin
    // Subtract 1 extra character to prevent edge case overflows
    const safetyMargin = 1;
    const textMaxWidth = maxWidth - indicatorWidth - statusWidth - safetyMargin;
    
    if (process.env.DEBUG_TRUNCATE) {
        console.error(`[StatusItemLayout] Processing: "${text}"`);
        console.error(`  Max width: ${maxWidth}, Indicator: "${selectionIndicator}" (${indicatorWidth}), Status: "${status}" (${statusWidth}), Text max: ${textMaxWidth}`);
    }
    
    // Truncate text if needed
    let truncatedText = contentService.truncateText(text, textMaxWidth);
    
    // Boundary validation: ensure total width doesn't exceed maxWidth
    let totalWidth = indicatorWidth + contentService.measureText(truncatedText) + statusWidth;
    
    // If we're still over (shouldn't happen with safety margin, but be defensive)
    if (totalWidth > maxWidth) {
        if (process.env.DEBUG_TRUNCATE) {
            console.error(`  WARNING: Total width ${totalWidth} exceeds max ${maxWidth}, re-truncating`);
        }
        // Force more aggressive truncation
        const overflowAmount = totalWidth - maxWidth;
        truncatedText = contentService.truncateText(text, textMaxWidth - overflowAmount - 1);
        totalWidth = indicatorWidth + contentService.measureText(truncatedText) + statusWidth;
    }
    
    if (process.env.DEBUG_TRUNCATE) {
        console.error(`  Truncated: "${truncatedText}", Total width: ${totalWidth} (max: ${maxWidth})`);
    }
    
    return (
        <Box>
            <Text color={color}>{selectionIndicator} {truncatedText}</Text>
            {status && (
                <Text color={statusColor}> {status}</Text>
            )}
        </Box>
    );
};