import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../utils/theme.js';

interface ContainerProps {
    title: string;
    subtitle?: string;
    width: number;
    height: number;
    focused?: boolean;
    children?: React.ReactNode;
}

export const Container: React.FC<ContainerProps> = ({ 
    title, 
    subtitle, 
    width, 
    height, 
    focused = false,
    children 
}) => {
    const borderColor = focused ? theme.colors.borderFocus : theme.colors.border;
    const { border } = theme.symbols;
    
    // Create top border with title
    let topBorder: string;
    if (focused) {
        const titlePadding = Math.max(0, width - title.length - 6);
        topBorder = `${border.topLeft}${border.horizontal} ${title} ${border.horizontal.repeat(titlePadding)}${border.topRight}`;
    } else {
        const tabText = '⁽ᵗᵃᵇ⁾';
        const totalContentLength = title.length + tabText.length + 2; // +2 for spaces
        const remainingPadding = Math.max(0, width - totalContentLength - 4); // -4 for corners and spaces
        topBorder = `${border.topLeft}${border.horizontal} ${title}${' '.repeat(remainingPadding)} ${tabText} ${border.topRight}`;
    }
    
    // Create empty lines for padding
    const emptyLine = `${border.vertical}${' '.repeat(width - 2)}${border.vertical}`;
    
    return (
        <Box flexDirection="column">
            {/* Top border */}
            <Text color={borderColor}>{topBorder}</Text>
            
            {/* Subtitle line if present */}
            {subtitle && (
                <Box>
                    <Text color={borderColor}>{border.vertical} </Text>
                    <Text color={theme.colors.textMuted}>{subtitle.padEnd(width - 4)}</Text>
                    <Text color={borderColor}> {border.vertical}</Text>
                </Box>
            )}
            
            {/* Content */}
            {React.Children.map(children, (child, index) => (
                <Box key={index}>
                    <Text color={borderColor}>{border.vertical} </Text>
                    <Box width={width - 4}>{child}</Box>
                    <Text color={borderColor}> {border.vertical}</Text>
                </Box>
            ))}
            
            {/* Fill remaining height with empty lines */}
            {Array.from({ length: Math.max(0, height - React.Children.count(children) - (subtitle ? 4 : 3)) }, (_, i) => (
                <Text key={`empty-${i}`} color={borderColor}>{emptyLine}</Text>
            ))}
            
            {/* Bottom border */}
            <Text color={borderColor}>
                {border.bottomLeft}{border.horizontal.repeat(width - 2)}{border.bottomRight}
            </Text>
        </Box>
    );
};