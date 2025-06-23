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
    const titleText = focused ? `${title} ⁽ᶠᵒᶜᵘˢᵉᵈ⁾` : `${title} ᵗᵃᵇ`;
    
    // Calculate visible items based on container height
    const items = React.Children.toArray(children);
    const itemCount = items.length;
    
    // Calculate visible items based on container height
    // Account for title (1), subtitle (1), borders (2), scroll indicator (1) = 5
    const contentHeight = height ? height - 5 - (subtitle ? 1 : 0) : 10;
    const visibleItems = Math.max(1, contentHeight);
    
    // Calculate scroll position to keep selected item visible
    const scrollOffset = useMemo(() => {
        if (selectedIndex < visibleItems - 1) {
            return 0;
        }
        return Math.max(0, selectedIndex - visibleItems + 2);
    }, [selectedIndex, visibleItems]);
    
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
            height="100%"
        >
            <Box flexDirection="row" justifyContent="space-between">
                <Text color={theme.colors.textPrimary}>{titleText}</Text>
                {hasScrollUp && <Text color={theme.colors.textMuted}>↑</Text>}
            </Box>
            {subtitle && (
                <Text color={theme.colors.textMuted}>{subtitle}</Text>
            )}
            <Box 
                marginTop={1} 
                flexDirection="column" 
                flexGrow={1}
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