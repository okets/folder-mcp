import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../utils/theme.js';

interface BorderedBoxProps {
    title: string;
    subtitle?: string;
    focused?: boolean;
    width: number;
    height: number;
    children: React.ReactNode;
    showScrollbar?: boolean;
    scrollbarElements?: string[];
}

export const BorderedBox: React.FC<BorderedBoxProps> = ({
    title,
    subtitle,
    focused = false,
    width,
    height,
    children,
    showScrollbar = false,
    scrollbarElements = []
}) => {
    const { border } = theme.symbols;
    const borderColor = focused ? theme.colors.borderFocus : theme.colors.border;
    
    // Create top border with embedded title
    const createTopBorder = () => {
        if (focused) {
            // Total content: title + 2 spaces around title + 2 corner chars = title.length + 4
            const padding = Math.max(0, width - title.length - 5);
            return `${border.topLeft}${border.horizontal} ${title} ${border.horizontal.repeat(padding)}${border.topRight}`;
        } else {
            const tabText = '⁽ᵗᵃᵇ⁾';
            // Total content: title + tab + 4 spaces + 2 corner chars = title.length + tab.length + 6
            const totalContentLength = title.length + tabText.length + 6;
            const padding = Math.max(0, width - totalContentLength - 1);
            return `${border.topLeft}${border.horizontal} ${title} ${border.horizontal.repeat(padding)} ${tabText} ${border.topRight}`;
        }
    };
    
    // Create bottom border
    const createBottomBorder = () => {
        // Total content: just horizontal lines + 2 corner chars
        return `${border.bottomLeft}${border.horizontal.repeat(width - 2)}${border.bottomRight}`;
    };
    
    // Create side border with optional scrollbar
    const createSideBorder = (content: React.ReactNode, scrollbarChar: string = ' ', key?: string) => {
        return (
            <Box key={key}>
                <Text color={borderColor}>{border.vertical} </Text>
                <Box width={width - 5}>{content}</Box>
                <Text color={borderColor}> {scrollbarChar}{border.vertical}</Text>
            </Box>
        );
    };
    
    const childrenArray = React.Children.toArray(children);
    
    return (
        <Box flexDirection="column" height={height} width={width}>
            {/* Top border with embedded title */}
            <Text color={borderColor}>{createTopBorder()}</Text>
            
            {/* Subtitle line if present */}
            {subtitle && createSideBorder(
                <Text color={theme.colors.textMuted}>{subtitle}</Text>,
                ' '
            )}
            
            {/* Content with optional scrollbar */}
            {childrenArray.map((child, index) => {
                const scrollbarChar = showScrollbar && scrollbarElements.length > 0 && index < scrollbarElements.length
                    ? scrollbarElements[index]
                    : ' ';
                return createSideBorder(child, scrollbarChar, `content-${index}`);
            })}
            
            {/* Bottom border */}
            <Text color={borderColor}>{createBottomBorder()}</Text>
        </Box>
    );
};