import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../utils/theme.js';

interface SimpleContainerProps {
    title: string;
    subtitle?: string;
    focused?: boolean;
    children?: React.ReactNode;
}

export const SimpleContainer: React.FC<SimpleContainerProps> = ({ 
    title, 
    subtitle, 
    focused = false,
    children 
}) => {
    const borderColor = focused ? theme.colors.borderFocus : theme.colors.border;
    const titleText = focused ? `${title} ⁽ᶠᵒᶜᵘˢᵉᵈ⁾` : `${title} ᵗᵃᵇ`;
    
    return (
        <Box 
            flexDirection="column"
            borderStyle="round"
            borderColor={borderColor}
            paddingX={1}
            height="100%"
            overflow="hidden"
        >
            <Text color={theme.colors.textPrimary}>{titleText}</Text>
            {subtitle && (
                <Text color={theme.colors.textMuted}>{subtitle}</Text>
            )}
            <Box 
                marginTop={1} 
                flexDirection="column" 
                flexGrow={1}
                overflow="hidden"
            >
                {children}
            </Box>
        </Box>
    );
};