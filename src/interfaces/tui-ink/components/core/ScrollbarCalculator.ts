/**
 * Core scrollbar calculation logic extracted from ConfigurationPanel
 * Calculates visual representation of a scrollbar for lists
 */

export interface ScrollbarConfig {
    totalItems: number;
    visibleItems: number;
    scrollOffset: number;
}

/**
 * Calculate scrollbar visual representation
 * @param config - Scrollbar configuration
 * @returns Array of strings representing each character of the scrollbar
 */
export function calculateScrollbar(config: ScrollbarConfig): string[] {
    const { totalItems, visibleItems, scrollOffset } = config;
    
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
        const lineLength = Math.ceil(availableSpace * visibleItems / totalItems);
        const topSpace = Math.floor(availableSpace * scrollOffset / totalItems);
        const bottomSpace = availableSpace - lineLength - topSpace;
        
        // Add middle rows (top space + line + bottom space)
        for (let i = 0; i < topSpace; i++) {
            scrollbar.push(' ');
        }
        for (let i = 0; i < lineLength; i++) {
            scrollbar.push('┃');
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