import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../contexts/ThemeContext';
import { ILayoutConstraints } from '../../models/types';
import { LayoutConstraintProvider } from '../../contexts/LayoutContext';
import { ConstrainedContent } from '../ConstrainedContent';
import { ContentService } from '../../services/ContentService';
// WINDOWS FIX: Removed DebugService imports to prevent render-time console.error calls

export interface BorderedBoxProps {
    /** Title can be a string or React element (for bold/styled text) */
    title: string | React.ReactNode;
    /** Optional: plain text version for width calculations when title is a React element */
    titlePlainText?: string;
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
    titlePlainText,
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
    const contentService = new ContentService();
    
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
    
    // Create top border with embedded title and proper truncation
    // Title can be a React element (for styled text) - use titlePlainText for measurements
    const createTopBorder = (): React.ReactElement => {
        // Get plain text for measurements
        const titleText = titlePlainText || (typeof title === 'string' ? title : '');
        const isReactTitle = typeof title !== 'string';

        // Fail loudly: warn if React title without plain text for measurement
        if (isReactTitle && !titlePlainText) {
            console.error('BorderedBox: React element title provided without titlePlainText - width calculations will be incorrect');
        }

        // DRY helper: compute displayTitle and titleWidth based on title type
        const getTitleDisplay = (availableWidth: number) => {
            if (isReactTitle) {
                return {
                    displayTitle: title,
                    titleWidth: contentService.measureText(titleText)
                };
            }
            const displayTitle = contentService.truncateText(titleText, availableWidth);
            return {
                displayTitle,
                titleWidth: contentService.measureText(displayTitle)
            };
        };

        if (focused) {
            // Structure: ╭─ TITLE ─[padding]─╮
            // Components: topLeft(1) + "─ "(2) + TITLE + " "(1) + padding + topRight(1)
            const fixedChars = 5; // topLeft + "─ " + " " + topRight
            const availableForTitle = width - fixedChars;

            if (availableForTitle <= 0) {
                // Not enough space for any title, just show border
                return <Text color={borderColor}>{border.topLeft}{border.horizontal.repeat(Math.max(0, width - 2))}{border.topRight}</Text>;
            }

            const { displayTitle, titleWidth } = getTitleDisplay(availableForTitle);
            const paddingWidth = Math.max(0, width - fixedChars - titleWidth);
            const padding = border.horizontal.repeat(paddingWidth);

            return (
                <Text color={borderColor}>
                    {border.topLeft}{border.horizontal} {displayTitle} {padding}{border.topRight}
                </Text>
            );
        } else {
            const tabText = '⁽ᵗᵃᵇ⁾';
            const tabTextWidth = contentService.measureText(tabText);

            // Structure: ╭─ TITLE ─[padding]─ ⁽ᵗᵃᵇ⁾ ╮
            // Components: topLeft(1) + "─ "(2) + TITLE + " "(1) + padding + " "(1) + tabText + " "(1) + topRight(1)
            const fixedCharsWithTab = 7 + tabTextWidth; // topLeft + "─ " + " " + " " + tabText + " " + topRight

            if (width >= fixedCharsWithTab) {
                // Enough space for tab indicator
                const availableForTitle = width - fixedCharsWithTab;

                if (availableForTitle > 0) {
                    const { displayTitle, titleWidth } = getTitleDisplay(availableForTitle);
                    const paddingWidth = Math.max(0, width - fixedCharsWithTab - titleWidth);
                    const padding = border.horizontal.repeat(paddingWidth);

                    return (
                        <Text color={borderColor}>
                            {border.topLeft}{border.horizontal} {displayTitle} {padding} {tabText} {border.topRight}
                        </Text>
                    );
                } else {
                    // No space for title, just show tab
                    // Structure: ╭─[padding]─ ⁽ᵗᵃᵇ⁾ ╮
                    const fixedForTabOnly = 5 + tabTextWidth; // topLeft + "─" + " " + tabText + " " + topRight
                    const paddingWidth = Math.max(0, width - fixedForTabOnly);
                    const padding = border.horizontal.repeat(paddingWidth);

                    return (
                        <Text color={borderColor}>
                            {border.topLeft}{border.horizontal}{padding} {tabText} {border.topRight}
                        </Text>
                    );
                }
            } else {
                // Not enough space for tab indicator, show title only
                // Structure: ╭─ TITLE ─[padding]─╮ (same as focused)
                const fixedChars = 5; // topLeft + "─ " + " " + topRight
                const availableForTitle = width - fixedChars;

                if (availableForTitle > 0) {
                    const { displayTitle, titleWidth } = getTitleDisplay(availableForTitle);
                    const paddingWidth = Math.max(0, width - fixedChars - titleWidth);
                    const padding = border.horizontal.repeat(paddingWidth);

                    return (
                        <Text color={borderColor}>
                            {border.topLeft}{border.horizontal} {displayTitle} {padding}{border.topRight}
                        </Text>
                    );
                } else {
                    // No space for anything, just border
                    return <Text color={borderColor}>{border.topLeft}{border.horizontal.repeat(Math.max(0, width - 2))}{border.topRight}</Text>;
                }
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
                {createTopBorder()}
                
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