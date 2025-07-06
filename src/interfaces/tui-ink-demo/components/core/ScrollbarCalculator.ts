/**
 * Core scrollbar calculation logic extracted from ConfigurationPanel
 * Calculates visual representation of a scrollbar for lists
 */

export interface ScrollbarConfig {
    totalItems: number;
    visibleItems: number;
    scrollOffset: number;
    selectedIndex?: number;
}

/**
 * Calculate scrollbar visual representation
 * @param config - Scrollbar configuration
 * @returns Array of strings representing each character of the scrollbar
 */
export function calculateScrollbar(config: ScrollbarConfig): string[] {
    const { totalItems, visibleItems, scrollOffset, selectedIndex } = config;
    
    // Only show scrollbar if scrolling is needed
    if (totalItems <= visibleItems) {
        return [];
    }

    // Create scrollbar array with exactly visibleItems elements
    const scrollbar: string[] = [];
    
    // First row always shows top triangle
    scrollbar.push('▲');
    
    // Last row always shows bottom triangle (will be added at the end)
    // Available space for indicator = visibleItems - 2 (excluding top and bottom triangles)
    const availableSpace = Math.max(1, visibleItems - 2);
    
    if (availableSpace > 0) {
        const lineLength = Math.max(1, Math.ceil(availableSpace * visibleItems / totalItems));
        const maxScrollOffset = totalItems - visibleItems;
        
        let topSpace = 0;
        if (maxScrollOffset > 0) {
            // Calculate position: at scrollOffset=0, topSpace=0 (touch top)
            // at scrollOffset=max, topSpace=maxTopSpace (touch bottom)
            const maxTopSpace = availableSpace - lineLength;
            topSpace = Math.round(maxTopSpace * scrollOffset / maxScrollOffset);
        }
        
        const bottomSpace = availableSpace - lineLength - topSpace;
        
        // Calculate which cell in the scrollbar should be highlighted
        // based on selected item's position within visible items
        let highlightCell = -1;
        if (selectedIndex !== undefined) {
            const visiblePosition = selectedIndex - scrollOffset; // 0 to visibleItems-1
            if (visiblePosition >= 0 && visiblePosition < visibleItems) {
                highlightCell = lineLength > 1 ? Math.floor(visiblePosition * lineLength / visibleItems) : 0;
            }
        }
        
        // Add middle rows (top space + line + bottom space)
        for (let i = 0; i < topSpace; i++) {
            scrollbar.push(' ');
        }
        for (let i = 0; i < lineLength; i++) {
            // Use a slightly different character for the highlighted position
            if (i === highlightCell) {
                scrollbar.push('┇'); // Triple dash style for exact position
            } else {
                scrollbar.push('┃');
            }
        }
        for (let i = 0; i < bottomSpace; i++) {
            scrollbar.push(' ');
        }
    }
    
    // Last row always shows bottom triangle
    scrollbar.push('▼');
    
    return scrollbar;
}

// Re-export with legacy function name for backward compatibility
export { calculateScrollbar as calculateScrollbarLegacy };