import React, { useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { theme } from '../utils/theme';

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
    const SUBTITLE_HEIGHT = subtitle ? 1 : 0;
    const BORDER_HEIGHT = 2; // Top and bottom borders (titles now embedded)
    const PADDING_HEIGHT = 1; // Extra safety padding
    
    const totalChromeHeight = SUBTITLE_HEIGHT + BORDER_HEIGHT + PADDING_HEIGHT;
    
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
    
    const { border } = theme.symbols;
    
    // Create top border with embedded title  
    const createTopBorder = () => {
        const scrollIndicator = hasScrollUp ? ' ↑' : '';
        const titleWithScroll = `${title}${scrollIndicator}`;
        
        if (focused) {
            // Focused: just title and scroll indicator
            const padding = border.horizontal.repeat(Math.max(0, 76 - titleWithScroll.length - 4));
            return `${border.topLeft}${border.horizontal} ${titleWithScroll} ${padding}${border.topRight}`;
        } else {
            // Unfocused: title, scroll indicator, and tab hint
            const tabText = '⁽ᵗᵃᵇ⁾';
            const totalContent = `${titleWithScroll} ${tabText}`;
            const padding = border.horizontal.repeat(Math.max(0, 76 - totalContent.length - 4));
            return `${border.topLeft}${border.horizontal} ${titleWithScroll} ${padding} ${tabText} ${border.topRight}`;
        }
    };
    
    // Create bottom border with scroll indicator
    const createBottomBorder = () => {
        if (hasScrollDown) {
            const scrollText = `↓ ${itemCount - scrollOffset - visibleItems} more`;
            const padding = border.horizontal.repeat(Math.max(0, 76 - scrollText.length - 4));
            return `${border.bottomLeft}${border.horizontal} ${scrollText} ${padding}${border.bottomRight}`;
        }
        return `${border.bottomLeft}${border.horizontal.repeat(76)}${border.bottomRight}`;
    };

    return (
        <Box flexDirection="column" width="100%">
            {/* Top border with embedded title */}
            <Text color={borderColor}>{createTopBorder()}</Text>
            
            {/* Subtitle line if present */}
            {subtitle && (
                <Box>
                    <Text color={borderColor}>{border.vertical} </Text>
                    <Text color={theme.colors.textMuted}>{subtitle}</Text>
                    <Text color={borderColor}> {border.vertical}</Text>
                </Box>
            )}
            
            {/* Content */}
            <Box flexDirection="column">
                {visibleChildren.map((child, index) => (
                    <Box key={index}>
                        <Text color={borderColor}>{border.vertical} </Text>
                        <Box width="100%">{child}</Box>
                        <Text color={borderColor}> {border.vertical}</Text>
                    </Box>
                ))}
            </Box>
            
            {/* Bottom border with scroll indicator */}
            <Text color={borderColor}>{createBottomBorder()}</Text>
        </Box>
    );
};