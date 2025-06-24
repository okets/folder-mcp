import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../utils/theme.js';
import { ILayoutConstraints } from '../models/types.js';
import { LayoutConstraintProvider } from '../contexts/LayoutContext.js';
import { ConstrainedContent } from './ConstrainedContent.js';
import { useDI } from '../di/DIContext.js';
import { ServiceTokens } from '../di/tokens.js';

interface BorderedBoxProps {
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
    const di = useDI();
    const debugService = di.resolve(ServiceTokens.DebugService);
    const { border } = theme.symbols;
    const borderColor = focused ? theme.colors.borderFocus : theme.colors.border;
    
    // Log border dimensions in debug mode
    if (debugService.isEnabled()) {
        debugService.logLayout(`BorderedBox[${title}]`, { width, height });
    }
    
    // Calculate exact content width
    // Border chars (|) and spaces on each side = 4 chars total
    // If scrollbar is shown, we need 1 more char
    const contentWidth = width - 4 - (showScrollbar ? 1 : 0);
    
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
                <Box width={contentWidth}>
                    <ConstrainedContent width={contentWidth}>
                        {content}
                    </ConstrainedContent>
                </Box>
                <Text color={borderColor}> {scrollbarChar}{border.vertical}</Text>
            </Box>
        );
    };
    
    const childrenArray = React.Children.toArray(children);
    
    return (
        <LayoutConstraintProvider constraints={childConstraints}>
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
                
                {/* Fill remaining space with empty rows */}
                {Array.from({ length: Math.max(0, contentHeight - childrenArray.length) }).map((_, index) => {
                    const emptyRowIndex = childrenArray.length + index;
                    const scrollbarChar = showScrollbar && scrollbarElements.length > 0 && emptyRowIndex < scrollbarElements.length
                        ? scrollbarElements[emptyRowIndex]
                        : ' ';
                    return createSideBorder(<Text> </Text>, scrollbarChar, `empty-${index}`);
                })}
                
                {/* Bottom border */}
                <Text color={borderColor}>{createBottomBorder()}</Text>
            </Box>
        </LayoutConstraintProvider>
    );
};