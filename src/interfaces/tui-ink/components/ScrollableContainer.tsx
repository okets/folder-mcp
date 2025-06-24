import React, { useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { theme } from '../utils/theme.js';

interface ScrollableContainerProps {
    title: string;
    subtitle?: string;
    focused?: boolean;
    children?: React.ReactNode;
    selectedIndex?: number;
    onScroll?: (direction: 'up' | 'down') => void;
    height?: number;
}

export const ScrollableContainer: React.FC<ScrollableContainerProps> = ({ 
    title, 
    subtitle, 
    focused = false,
    children,
    selectedIndex = 0,
    onScroll,
    height
}) => {
    const borderColor = focused ? theme.colors.borderFocus : theme.colors.border;
    
    // Calculate visible items based on container height
    const items = React.Children.toArray(children);
    const itemCount = items.length;
    
    // Fixed height for content area to prevent overlap
    // This is a conservative estimate that works across different terminal sizes
    const ITEM_HEIGHT = 1; // Each item takes 1 line
    const HEADER_HEIGHT = 1; // Title line
    const SUBTITLE_HEIGHT = subtitle ? 1 : 0;
    const BORDER_HEIGHT = 2; // Top and bottom borders
    const SCROLL_INDICATOR_HEIGHT = 1; // "↓ X more" line  
    const MARGIN_HEIGHT = 1; // marginTop
    const PADDING_HEIGHT = 1; // Extra safety padding
    
    const totalChromeHeight = HEADER_HEIGHT + SUBTITLE_HEIGHT + BORDER_HEIGHT + SCROLL_INDICATOR_HEIGHT + MARGIN_HEIGHT + PADDING_HEIGHT;
    
    // Calculate how many items we can show
    const availableHeight = height || 20; // Default to reasonable height
    const maxVisibleItems = Math.max(1, Math.floor((availableHeight - totalChromeHeight) / ITEM_HEIGHT));
    
    // Ensure we don't show more items than we have
    const visibleItems = Math.min(maxVisibleItems, itemCount);
    
    // Calculate scroll position to keep selected item visible
    const scrollOffset = useMemo(() => {
        // If we can show all items, no scroll needed
        if (itemCount <= visibleItems) {
            return 0;
        }
        
        // Simple algorithm: keep selected item in the middle when possible
        const halfVisible = Math.floor(visibleItems / 2);
        let offset = selectedIndex - halfVisible;
        
        // Clamp to valid range
        offset = Math.max(0, offset);
        offset = Math.min(itemCount - visibleItems, offset);
        
        return offset;
    }, [selectedIndex, visibleItems, itemCount]);
    
    // Slice items for viewport
    const visibleChildren = items.slice(scrollOffset, scrollOffset + visibleItems);
    
    // Show scroll indicators
    const hasScrollUp = scrollOffset > 0;
    const hasScrollDown = scrollOffset + visibleItems < itemCount;
    
    return (
        <Box 
            flexDirection="column"
            borderStyle="round"
            borderColor={borderColor}
            paddingX={1}
            width="100%"
        >
            <Box flexDirection="row" justifyContent="space-between">
                {focused ? (
                    <Text color={theme.colors.textPrimary}>{title}</Text>
                ) : (
                    <Box flexDirection="row" justifyContent="space-between" width="100%">
                        <Text color={theme.colors.textPrimary}>{title}</Text>
                        <Text color={theme.colors.textMuted}>⁽ᵗᵃᵇ⁾</Text>
                    </Box>
                )}
                {hasScrollUp && <Text color={theme.colors.textMuted}>↑</Text>}
            </Box>
            {subtitle && (
                <Text color={theme.colors.textMuted}>{subtitle}</Text>
            )}
            <Box 
                marginTop={1} 
                flexDirection="column" 
                width="100%"
                height={visibleItems}
            >
                {visibleChildren}
            </Box>
            {hasScrollDown && (
                <Box justifyContent="flex-end">
                    <Text color={theme.colors.textMuted}>↓ {itemCount - scrollOffset - visibleItems} more</Text>
                </Box>
            )}
        </Box>
    );
};