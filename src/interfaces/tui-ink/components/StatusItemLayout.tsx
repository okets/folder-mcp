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
}

export const StatusItemLayout: React.FC<StatusItemLayoutProps> = ({ 
    text, 
    status, 
    color,
    statusColor 
}) => {
    const di = useDI();
    const contentService = di.resolve(ServiceTokens.ContentService);
    const constraints = useLayoutConstraints();
    
    // Get maximum width available
    const maxWidth = constraints?.maxWidth || 80;
    
    // Reserve space for status indicator (including space before it)
    const statusWidth = status ? contentService.measureText(' ' + status) : 0;
    
    // Calculate available width for main text
    const textMaxWidth = maxWidth - statusWidth;
    
    // Truncate text if needed
    const truncatedText = contentService.truncateText(text, textMaxWidth);
    
    return (
        <Box>
            <Text color={color}>{truncatedText}</Text>
            {status && (
                <Text color={statusColor}> {status}</Text>
            )}
        </Box>
    );
};