import React from 'react';
import { Box } from 'ink';

export interface ScrollableBlockProps {
    children: React.ReactNode;
    height: number;
    scrollOffset: number;
}

/**
 * Simple container that shows a viewport of content based on scroll offset
 * Just clips the visible portion - no scrollbar rendering here
 */
export const ScrollableBlock: React.FC<ScrollableBlockProps> = ({
    children,
    height,
    scrollOffset
}) => {
    // Convert children to array to handle slicing
    const childArray = React.Children.toArray(children);
    
    // Show only the visible portion based on scroll offset and height
    const visibleChildren = childArray.slice(scrollOffset, scrollOffset + height);
    
    return (
        <Box flexDirection="column">
            {visibleChildren}
        </Box>
    );
};