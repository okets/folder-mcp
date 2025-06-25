import React, { useMemo } from 'react';
import { Box } from 'ink';
import { calculateScrollbar } from './ScrollbarCalculator.js';

export interface ScrollableListProps<T> {
    /** Array of items to display */
    items: T[];
    /** Currently selected item index */
    activeIndex?: number;
    /** Maximum number of visible items */
    maxHeight: number;
    /** Function to render each item */
    renderItem: (item: T, index: number, isActive: boolean) => React.ReactNode;
    /** Optional scroll offset override */
    scrollOffset?: number;
    /** Whether to show scrollbar */
    showScrollbar?: boolean;
    /** Optional key extractor for items */
    keyExtractor?: (item: T, index: number) => string;
}

/**
 * Generic scrollable list component
 * Handles scrolling logic, scrollbar calculation, and item rendering
 */
export function ScrollableList<T>({
    items,
    activeIndex = 0,
    maxHeight,
    renderItem,
    scrollOffset: externalScrollOffset,
    showScrollbar = true,
    keyExtractor
}: ScrollableListProps<T>) {
    // Calculate scroll offset based on active index
    const calculatedScrollOffset = useMemo(() => {
        if (externalScrollOffset !== undefined) {
            return externalScrollOffset;
        }
        
        // Auto-scroll to keep active item visible
        if (activeIndex >= maxHeight) {
            return activeIndex - maxHeight + 1;
        }
        return 0;
    }, [activeIndex, maxHeight, externalScrollOffset]);
    
    // Calculate visible items
    const visibleItems = useMemo(() => {
        return items.slice(
            calculatedScrollOffset, 
            calculatedScrollOffset + maxHeight
        );
    }, [items, calculatedScrollOffset, maxHeight]);
    
    // Calculate scrollbar if needed
    const scrollbarElements = useMemo(() => {
        if (!showScrollbar || items.length <= maxHeight) {
            return [];
        }
        
        return calculateScrollbar({
            totalItems: items.length,
            visibleItems: maxHeight,
            scrollOffset: calculatedScrollOffset
        });
    }, [items.length, maxHeight, calculatedScrollOffset, showScrollbar]);
    
    return (
        <Box flexDirection="column">
            {visibleItems.map((item, visualIndex) => {
                const actualIndex = calculatedScrollOffset + visualIndex;
                const isActive = actualIndex === activeIndex;
                const key = keyExtractor 
                    ? keyExtractor(item, actualIndex)
                    : `item-${actualIndex}`;
                
                return (
                    <Box key={key}>
                        {renderItem(item, actualIndex, isActive)}
                    </Box>
                );
            })}
        </Box>
    );
}

/**
 * Hook to manage scrollable list state
 */
export function useScrollableList<T>(items: T[], maxHeight: number) {
    const [activeIndex, setActiveIndex] = React.useState(0);
    const [scrollOffset, setScrollOffset] = React.useState(0);
    
    // Update scroll offset when active index changes
    React.useEffect(() => {
        if (activeIndex >= scrollOffset + maxHeight) {
            setScrollOffset(activeIndex - maxHeight + 1);
        } else if (activeIndex < scrollOffset) {
            setScrollOffset(activeIndex);
        }
    }, [activeIndex, maxHeight, scrollOffset]);
    
    const moveUp = React.useCallback(() => {
        setActiveIndex(prev => Math.max(0, prev - 1));
    }, []);
    
    const moveDown = React.useCallback(() => {
        setActiveIndex(prev => Math.min(items.length - 1, prev + 1));
    }, [items.length]);
    
    const moveToTop = React.useCallback(() => {
        setActiveIndex(0);
    }, []);
    
    const moveToBottom = React.useCallback(() => {
        setActiveIndex(items.length - 1);
    }, [items.length]);
    
    return {
        activeIndex,
        scrollOffset,
        moveUp,
        moveDown,
        moveToTop,
        moveToBottom,
        setActiveIndex
    };
}