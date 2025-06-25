import React from 'react';
import { Box } from 'ink';
import { BorderedBox } from './BorderedBox.js';
import { ScrollableList, ScrollableListProps } from './ScrollableList.js';
import { calculateScrollbar } from './ScrollbarCalculator.js';

export interface PanelProps<T> {
    /** Panel title */
    title: string;
    /** Optional subtitle */
    subtitle?: string;
    /** Whether panel is focused */
    focused?: boolean;
    /** Panel width */
    width: number;
    /** Panel height */
    height: number;
    /** Items to display in the list */
    items: T[];
    /** Currently active item index */
    activeIndex?: number;
    /** Function to render each item */
    renderItem: (item: T, index: number, isActive: boolean) => React.ReactNode;
    /** Optional scroll offset override */
    scrollOffset?: number;
    /** Whether to show scrollbar */
    showScrollbar?: boolean;
    /** Optional key extractor */
    keyExtractor?: (item: T, index: number) => string;
}

/**
 * Generic panel component combining BorderedBox with ScrollableList
 * Provides a complete scrollable panel with borders and title
 */
export function Panel<T>({
    title,
    subtitle,
    focused = false,
    width,
    height,
    items,
    activeIndex = 0,
    renderItem,
    scrollOffset: externalScrollOffset,
    showScrollbar = true,
    keyExtractor
}: PanelProps<T>) {
    // Calculate content height accounting for borders and subtitle
    const boxOverhead = 2; // top and bottom borders
    const subtitleHeight = subtitle ? 1 : 0;
    const contentHeight = height - boxOverhead - subtitleHeight;
    
    // Calculate scroll offset
    const calculatedScrollOffset = externalScrollOffset !== undefined
        ? externalScrollOffset
        : activeIndex >= contentHeight
            ? activeIndex - contentHeight + 1
            : 0;
    
    // Calculate scrollbar elements
    const scrollbarElements = showScrollbar && items.length > contentHeight
        ? calculateScrollbar({
            totalItems: items.length,
            visibleItems: contentHeight,
            scrollOffset: calculatedScrollOffset
        })
        : [];
    
    // Get visible items
    const visibleItems = items.slice(
        calculatedScrollOffset,
        calculatedScrollOffset + contentHeight
    );
    
    return (
        <BorderedBox
            title={title}
            subtitle={subtitle}
            focused={focused}
            width={width}
            height={height}
            showScrollbar={showScrollbar}
            scrollbarElements={scrollbarElements}
        >
            {visibleItems.map((item, visualIndex) => {
                const actualIndex = calculatedScrollOffset + visualIndex;
                const isActive = actualIndex === activeIndex;
                const key = keyExtractor
                    ? keyExtractor(item, actualIndex)
                    : `panel-item-${actualIndex}`;
                
                return (
                    <Box key={key}>
                        {renderItem(item, actualIndex, isActive)}
                    </Box>
                );
            })}
        </BorderedBox>
    );
}

/**
 * Simple string list panel
 */
export function SimpleListPanel({
    items,
    ...props
}: Omit<PanelProps<string>, 'renderItem' | 'keyExtractor'> & {
    items: string[];
    itemColor?: string;
    activeColor?: string;
}) {
    return (
        <Panel
            {...props}
            items={items}
            renderItem={(item, _, isActive) => (
                <Text color={isActive ? props.activeColor : props.itemColor}>
                    {isActive ? '▶' : '·'} {item}
                </Text>
            )}
        />
    );
}

// Import Text here to avoid circular dependency
import { Text } from 'ink';