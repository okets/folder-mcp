import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../contexts/ThemeContext';
import { ILayoutConstraints } from '../../models/types';
import { LayoutConstraintProvider } from '../../contexts/LayoutContext';
import { ConstrainedContent } from '../ConstrainedContent';
// WINDOWS FIX: Removed DebugService imports to prevent render-time console.error calls

export interface BorderedBoxProps {
    title: string;
    subtitle?: string;
    focused?: boolean;
    width: number;
    height: number;
    children: React.ReactNode;
    showScrollbar?: boolean;
    scrollbarElements?: string[];
    constraints?: ILayoutConstraints;
}

export const BorderedBox: React.FC<BorderedBoxProps> = ({
    title,
    subtitle,
    focused = false,
    width,
    height,
    children,
    showScrollbar = false,
    scrollbarElements = [],
    constraints
}) => {
    const { theme } = useTheme();
    const { border } = theme.symbols;
    const borderColor = focused ? theme.colors.borderFocus : theme.colors.border;
    
    // WINDOWS FIX: Removed render-time debug logging to prevent ANSI packet fragmentation
    // Debug logging during render cycle causes Windows terminal flickering
    
    // Calculate exact content width
    // Border chars (|) on each side + 1 space before right border = 3 chars total
    // If scrollbar is shown, we need 1 more char for the scrollbar itself
    const contentWidth = width - 3 - (showScrollbar ? 1 : 0);
    
    // Calculate content height
    // Top border (1) + bottom border (1) = 2
    // Subtitle line if present (1)
    const contentHeight = height - 2 - (subtitle ? 1 : 0);
    
    // Create constraints for children
    const childConstraints: ILayoutConstraints = constraints || {
        maxWidth: contentWidth,
        maxHeight: contentHeight,
        overflow: 'truncate'
    };
    
    // Create top border with embedded title
    const createTopBorder = () => {
        if (focused) {
            // Total content: title + 2 spaces around title + 2 corner chars = title.length + 4
            const padding = Math.max(0, width - title.length - 5);
            return `${border.topLeft}${border.horizontal} ${title} ${border.horizontal.repeat(padding)}${border.topRight}`;
        } else {
            const tabText = '⁽ᵗᵃᵇ⁾';
            // Check if we have enough space for title + tab indicator
            const totalContentLength = title.length + tabText.length + 6;
            
            if (width >= totalContentLength + 1) {
                // Enough space for both title and tab indicator
                const padding = Math.max(0, width - totalContentLength - 1);
                return `${border.topLeft}${border.horizontal} ${title} ${border.horizontal.repeat(padding)} ${tabText} ${border.topRight}`;
            } else {
                // Not enough space for tab indicator, just show title
                const padding = Math.max(0, width - title.length - 5);
                return `${border.topLeft}${border.horizontal} ${title} ${border.horizontal.repeat(padding)}${border.topRight}`;
            }
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
            <Box key={key} width={width} flexWrap="nowrap" flexDirection="row">
                <Text color={borderColor}>{border.vertical}</Text>
                <Box width={contentWidth} flexGrow={0} flexShrink={0}>
                    <ConstrainedContent width={contentWidth}>
                        {content}
                    </ConstrainedContent>
                </Box>
                <Box flexShrink={0}>
                    <Text color={borderColor}>{showScrollbar ? ` ${scrollbarChar}` : ' '}{border.vertical}</Text>
                </Box>
            </Box>
        );
    };
    
    const childrenArray = React.Children.toArray(children);
    
    // Debug logging removed for cleaner output
    
    return (
        <LayoutConstraintProvider constraints={childConstraints}>
            <Box flexDirection="column" height={height} width={width} flexWrap="nowrap" overflow="hidden">
                {/* Top border with embedded title */}
                <Text color={borderColor}>{createTopBorder()}</Text>
                
                {/* Subtitle line if present */}
                {subtitle && createSideBorder(
                    <Text color={theme.colors.textMuted}>{subtitle}</Text>,
                    ' ',
                    'subtitle-row'
                )}
                
                {/* Content with optional scrollbar */}
                {childrenArray.map((child, index) => {
                    const scrollbarChar = showScrollbar && scrollbarElements.length > 0 && index < scrollbarElements.length
                        ? scrollbarElements[index]
                        : ' ';
                    const contentKey = `content-${index}`;
                    return createSideBorder(child, scrollbarChar, contentKey);
                })}
                
                {/* Fill remaining space with empty rows */}
                {Array.from({ length: Math.max(0, contentHeight - childrenArray.length) }).map((_, index) => {
                    const emptyRowIndex = childrenArray.length + index;
                    const scrollbarChar = showScrollbar && scrollbarElements.length > 0 && emptyRowIndex < scrollbarElements.length
                        ? scrollbarElements[emptyRowIndex]
                        : ' ';
                    const emptyKey = `empty-${index}`;
                    return createSideBorder(<Text> </Text>, scrollbarChar, emptyKey);
                })}
                
                {/* Bottom border */}
                <Text color={borderColor}>{createBottomBorder()}</Text>
            </Box>
        </LayoutConstraintProvider>
    );
};