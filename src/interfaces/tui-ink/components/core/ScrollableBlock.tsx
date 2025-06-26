import React from 'react';
import { Box } from 'ink';

export interface ScrollableBlockProps {
    children: React.ReactNode;
    height: number;
    width: number;
    scrollOffset: number;
}

/**
 * Container that provides a viewport with both vertical and horizontal clipping
 * - Vertical: Shows only 'height' number of children starting from scrollOffset
 * - Horizontal: Clips any content that exceeds the width (no horizontal scrolling)
 */
export const ScrollableBlock: React.FC<ScrollableBlockProps> = ({
    children,
    height,
    width,
    scrollOffset
}) => {
    // Convert children to array to handle slicing
    const childArray = React.Children.toArray(children);
    
    // Show only the visible portion based on scroll offset and height
    const visibleChildren = childArray.slice(scrollOffset, scrollOffset + height);
    
    return (
        <Box 
            flexDirection="column"
            width={width}
            overflow="hidden" // This would clip horizontal overflow in a real terminal
        >
            {visibleChildren}
        </Box>
    );
};