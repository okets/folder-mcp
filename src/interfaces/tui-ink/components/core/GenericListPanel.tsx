import React, { useState, useCallback } from 'react';
import { Box, Text, Key } from 'ink';
import { BorderedBox } from '../BorderedBox.js';
import { IListItem } from './IListItem.js';
import { calculateScrollbar } from './ScrollbarCalculator.js';
import { theme } from '../../utils/theme.js';
import { SelfConstrainedWrapper } from './SelfConstrainedWrapper.js';

export interface GenericListPanelProps {
    title: string;
    subtitle?: string;
    items: IListItem[];
    width?: number;
    height?: number;
    focused?: boolean;
    selectedIndex?: number;
    onSelectionChange?: (index: number) => void;
    onInput?: (input: string, key: Key) => boolean;
}

export const GenericListPanel: React.FC<GenericListPanelProps> = ({
    title,
    subtitle,
    items,
    width,
    height,
    focused = false,
    selectedIndex = 0,
    onSelectionChange,
    onInput
}) => {
    const [scrollOffset, setScrollOffset] = useState(0);
    
    // Calculate dimensions
    const boxOverhead = subtitle ? 3 : 2; // borders + optional subtitle
    const actualHeight = height || 20;
    const maxLines = Math.max(1, actualHeight - boxOverhead);
    const panelWidth = width || 80;
    const itemMaxWidth = panelWidth - 5; // borders + scrollbar space
    
    // Calculate line positions for all items
    const itemLinePositions: Array<{start: number, end: number}> = [];
    let totalContentLines = 0;
    let currentLine = 0;
    
    items.forEach(item => {
        const itemLines = item.getRequiredLines(itemMaxWidth);
        totalContentLines += itemLines;
        itemLinePositions.push({
            start: currentLine,
            end: currentLine + itemLines
        });
        currentLine += itemLines;
    });
    
    // Calculate scroll position
    let lineScrollOffset = 0;
    if (totalContentLines > maxLines && selectedIndex < itemLinePositions.length) {
        const activeItem = itemLinePositions[selectedIndex];
        if (activeItem) {
            if (activeItem.end > lineScrollOffset + maxLines) {
                lineScrollOffset = activeItem.end - maxLines;
            } else if (activeItem.start < lineScrollOffset) {
                lineScrollOffset = activeItem.start;
            }
        }
    }
    
    // Find first visible item
    let visibleStartIndex = 0;
    for (let i = 0; i < items.length && i < itemLinePositions.length; i++) {
        if (itemLinePositions[i].end > lineScrollOffset) {
            visibleStartIndex = i;
            break;
        }
    }
    
    // Calculate visible items
    let visibleCount = 0;
    const startLine = itemLinePositions[visibleStartIndex]?.start || 0;
    
    for (let i = visibleStartIndex; i < items.length && i < itemLinePositions.length; i++) {
        if (itemLinePositions[i] && itemLinePositions[i].end - startLine <= maxLines) {
            visibleCount++;
        } else {
            break;
        }
    }
    
    const visibleItems = items.slice(visibleStartIndex, visibleStartIndex + visibleCount);
    
    // Calculate scrollbar
    const showScrollbar = totalContentLines > maxLines;
    const scrollbar = showScrollbar ? calculateScrollbar({
        totalItems: totalContentLines,
        visibleItems: Math.min(totalContentLines, maxLines),
        scrollOffset: lineScrollOffset,
        selectedIndex: selectedIndex < itemLinePositions.length ? itemLinePositions[selectedIndex].start : 0
    }) : [];
    
    // Handle input
    const handleInput = useCallback((input: string, key: Key): boolean => {
        const selectedItem = items[selectedIndex];
        
        // If an item is controlling input, delegate to it
        if (selectedItem?.isControllingInput && selectedItem.handleInput) {
            return selectedItem.handleInput(input, key);
        }
        
        // Otherwise handle navigation and item activation
        if (key.upArrow && selectedIndex > 0) {
            onSelectionChange?.(selectedIndex - 1);
            return true;
        } else if (key.downArrow && selectedIndex < items.length - 1) {
            onSelectionChange?.(selectedIndex + 1);
            return true;
        } else if ((key.return || key.rightArrow) && selectedItem?.onEnter) {
            selectedItem.onEnter();
            return true;
        }
        
        // Pass to custom handler if provided
        return onInput?.(input, key) || false;
    }, [items, selectedIndex, onSelectionChange, onInput]);
    
    // Update item selection states
    items.forEach((item, index) => {
        if (item.onSelect && index === selectedIndex && focused) {
            item.onSelect();
        } else if (item.onDeselect && index !== selectedIndex) {
            item.onDeselect();
        }
    });
    
    return (
        <BorderedBox
            title={title}
            subtitle={subtitle}
            focused={focused}
            width={panelWidth}
            height={actualHeight}
            showScrollbar={showScrollbar}
            scrollbarElements={scrollbar}
        >
            {visibleItems.length > 0 ? (
                visibleItems.map((item, visualIndex) => {
                    const actualIndex = visibleStartIndex + visualIndex;
                    const itemElements = item.render(itemMaxWidth);
                    
                    // Wrap in SelfConstrainedWrapper to prevent double truncation
                    const wrappedContent = (
                        <SelfConstrainedWrapper>
                            {Array.isArray(itemElements) ? (
                                <Box flexDirection="column">
                                    {itemElements}
                                </Box>
                            ) : (
                                itemElements
                            )}
                        </SelfConstrainedWrapper>
                    );
                    
                    return React.cloneElement(wrappedContent, { key: `item-${actualIndex}` });
                })
            ) : (
                <Text color={theme.colors.textMuted}>No items</Text>
            )}
        </BorderedBox>
    );
};