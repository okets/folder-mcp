import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../contexts/ThemeContext.js';
import { ILayoutConstraints } from '../../models/types.js';
import { LayoutConstraintProvider } from '../../contexts/LayoutContext.js';
import { ConstrainedContent } from '../ConstrainedContent.js';
import { useDI } from '../../di/DIContext.js';
import { ServiceTokens } from '../../di/tokens.js';

interface ThemedBorderedBoxProps {
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

/**
 * Theme-aware bordered box component
 */
export const ThemedBorderedBox: React.FC<ThemedBorderedBoxProps> = ({
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
    const di = useDI();
    const debugService = di.resolve(ServiceTokens.DebugService);
    
    // Use simple borders for minimal theme
    const border = theme.name === 'minimal' ? {
        horizontal: '-',
        vertical: '|',
        topLeft: '+',
        topRight: '+',
        bottomLeft: '+',
        bottomRight: '+'
    } : {
        horizontal: '─',
        vertical: '│',
        topLeft: '╭',
        topRight: '╮',
        bottomLeft: '╰',
        bottomRight: '╯'
    };
    
    const borderColor = focused ? theme.colors.borderFocus : theme.colors.border;
    
    // Log border dimensions in debug mode
    if (debugService.isEnabled()) {
        debugService.logLayout(`ThemedBorderedBox[${title}]`, { width, height });
    }
    
    // Calculate exact content width
    const contentWidth = width - 4 - (showScrollbar ? 1 : 0);
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
            const padding = Math.max(0, width - title.length - 5);
            return `${border.topLeft}${border.horizontal} ${title} ${border.horizontal.repeat(padding)}${border.topRight}`;
        } else {
            const tabText = '⁽ᵗᵃᵇ⁾';
            const totalContentLength = title.length + tabText.length + 6;
            const padding = Math.max(0, width - totalContentLength - 1);
            return `${border.topLeft}${border.horizontal} ${title} ${border.horizontal.repeat(padding)} ${tabText} ${border.topRight}`;
        }
    };
    
    // Create bottom border
    const createBottomBorder = () => {
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