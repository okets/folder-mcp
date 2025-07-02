import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { IListItem } from './IListItem';
import { calculateScrollbar } from './ScrollbarCalculator';
import { theme } from '../../utils/theme';

export interface ScrollableBlockProps {
    items: (IListItem | React.ReactNode)[];
    height: number;
    width: number;
    selectedIndex?: number;
    scrollOffset?: number;
    showScrollbar?: boolean;
}

/**
 * Container that provides a viewport with scrolling and scrollbar visualization
 * - Manages its own scroll offset based on selected index
 * - Renders scrollbar automatically when content exceeds viewport
 * - Handles both IListItem instances and React elements
 */
export const ScrollableBlock: React.FC<ScrollableBlockProps> = ({
    items,
    height,
    width,
    selectedIndex = 0,
    scrollOffset: externalScrollOffset,
    showScrollbar = true
}) => {
    // Calculate line positions for all items
    const { itemLinePositions, totalLines } = useMemo(() => {
        const positions: Array<{start: number, end: number}> = [];
        let currentLine = 0;
        let total = 0;
        
        items.forEach((item, index) => {
            let itemLines = 1;
            
            // If it's an IListItem, ask it how many lines it needs
            if (item && typeof item === 'object' && 'getRequiredLines' in item) {
                itemLines = (item as IListItem).getRequiredLines(width - (showScrollbar ? 2 : 0));
            }
            
            positions.push({
                start: currentLine,
                end: currentLine + itemLines
            });
            currentLine += itemLines;
            total += itemLines;
        });
        
        return { itemLinePositions: positions, totalLines: total };
    }, [items, width, showScrollbar]);
    
    // Calculate scroll offset based on selected index
    const scrollOffset = useMemo(() => {
        if (externalScrollOffset !== undefined) {
            return externalScrollOffset;
        }
        
        // Auto-scroll to keep selected item in view
        if (selectedIndex >= 0 && selectedIndex < itemLinePositions.length) {
            const selectedItem = itemLinePositions[selectedIndex];
            let offset = 0;
            
            // Calculate the optimal scroll position
            // Try to show the full selected item
            if (selectedItem.end > height) {
                // Item extends beyond viewport when at top
                offset = selectedItem.end - height;
            } else {
                // Item fits in viewport when at top
                offset = 0;
            }
            
            // Adjust if item would be cut off at the top
            if (selectedItem.start < offset) {
                offset = selectedItem.start;
            }
            
            // Ensure we don't scroll past the end
            const maxOffset = Math.max(0, totalLines - height);
            return Math.min(offset, maxOffset);
        }
        
        return 0;
    }, [selectedIndex, itemLinePositions, height, totalLines, externalScrollOffset]);
    
    // Determine which items are visible
    const visibleItems = useMemo(() => {
        const visible: Array<{item: IListItem | React.ReactNode, index: number}> = [];
        let currentLineOffset = 0;
        
        items.forEach((item, index) => {
            const position = itemLinePositions[index];
            
            // Check if this item is at least partially visible
            if (position.end > scrollOffset && position.start < scrollOffset + height) {
                visible.push({ item, index });
            }
            
            currentLineOffset = position.end;
        });
        
        return visible;
    }, [items, itemLinePositions, scrollOffset, height]);
    
    // Calculate scrollbar
    const scrollbarElements = useMemo(() => {
        if (!showScrollbar || totalLines <= height) {
            return [];
        }
        
        const selectedLinePosition = selectedIndex >= 0 && selectedIndex < itemLinePositions.length
            ? itemLinePositions[selectedIndex].start
            : undefined;
        
        const scrollbarConfig: ScrollbarConfig = {
            totalItems: totalLines,
            visibleItems: height,
            scrollOffset: scrollOffset
        };
        
        if (selectedLinePosition !== undefined) {
            scrollbarConfig.selectedIndex = selectedLinePosition;
        }
        
        return calculateScrollbar(scrollbarConfig);
    }, [showScrollbar, totalLines, height, scrollOffset, selectedIndex, itemLinePositions]);
    
    // Render content with scrollbar
    const renderContent = () => {
        const contentWidth = width - (showScrollbar && scrollbarElements.length > 0 ? 2 : 0);
        const elements: React.ReactElement[] = [];
        let lineIndex = 0;
        
        visibleItems.forEach(({ item, index }) => {
            const itemPosition = itemLinePositions[index];
            const itemStartLine = itemPosition.start - scrollOffset;
            
            if (item && typeof item === 'object' && 'render' in item) {
                // It's an IListItem
                const rendered = (item as IListItem).render(contentWidth);
                const itemElements = Array.isArray(rendered) ? rendered : [rendered];
                
                itemElements.forEach((element, elementIndex) => {
                    const currentLine = itemStartLine + elementIndex;
                    const scrollbarChar = showScrollbar && currentLine >= 0 && currentLine < scrollbarElements.length
                        ? scrollbarElements[currentLine] 
                        : (showScrollbar ? '┃' : ' '); // Default to vertical bar if within bounds
                    
                    elements.push(
                        <Box key={`${index}-${elementIndex}`}>
                            {element}
                            {showScrollbar && (
                                <Text color={theme.colors.border}> {scrollbarChar}</Text>
                            )}
                        </Box>
                    );
                    lineIndex++;
                });
            } else if (React.isValidElement(item)) {
                // It's a React element
                const currentLine = itemStartLine;
                const scrollbarChar = showScrollbar && currentLine >= 0 && currentLine < scrollbarElements.length
                    ? scrollbarElements[currentLine] 
                    : (showScrollbar ? '┃' : ' ');
                
                elements.push(
                    <Box key={index}>
                        <Box width={contentWidth}>
                            {item}
                        </Box>
                        {showScrollbar && (
                            <Text color={theme.colors.border}> {scrollbarChar}</Text>
                        )}
                    </Box>
                );
                lineIndex++;
            }
        });
        
        // Fill remaining space with empty lines and scrollbar
        while (lineIndex < height && showScrollbar) {
            const scrollbarChar = lineIndex < scrollbarElements.length 
                ? scrollbarElements[lineIndex] 
                : '┃';
            elements.push(
                <Box key={`empty-${lineIndex}`}>
                    <Box width={contentWidth}>
                        <Text> </Text>
                    </Box>
                    <Text color={theme.colors.border}> {scrollbarChar}</Text>
                </Box>
            );
            lineIndex++;
        }
        
        return elements;
    };
    
    return (
        <Box 
            flexDirection="column"
            width={width}
            height={height}
            overflow="hidden"
        >
            {renderContent()}
        </Box>
    );
};