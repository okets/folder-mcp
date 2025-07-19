import { IListItem } from '../IListItem';
import { ViewportState } from './ViewportCalculator';
import { ElementPosition } from './ScrollStateManager';

/**
 * ElementVisibilityCalculator - Smart element visibility and positioning calculator
 * 
 * This class handles all element visibility calculations, position tracking,
 * and element clipping logic. It provides a clean separation between element
 * positioning logic and rendering concerns.
 */

export interface VisibleElement {
    /** The original element */
    element: IListItem;
    /** Global index in the full element list */
    globalIndex: number;
    /** Position in viewport coordinates (relative to scroll offset) */
    viewportPosition: ElementPosition;
    /** Actual lines this element should render (may be clipped) */
    renderLines: number;
    /** Whether this element is partially clipped */
    isClipped: boolean;
    /** Which part is clipped */
    clippedAt: 'top' | 'bottom' | 'none';
}

export interface ElementLayoutResult {
    /** Elements that should be rendered in the viewport */
    visibleElements: VisibleElement[];
    /** Total lines consumed by visible elements */
    totalVisibleLines: number;
    /** Whether any elements are clipped */
    hasClippedElements: boolean;
}

export class ElementVisibilityCalculator {
    /**
     * Calculate which elements are visible and how they should be rendered
     */
    calculateVisibleElements(
        elements: IListItem[],
        elementPositions: ElementPosition[],
        viewport: ViewportState,
        scrollOffset: number
    ): ElementLayoutResult {
        const visibleElements: VisibleElement[] = [];
        let totalVisibleLines = 0;
        let hasClippedElements = false;
        
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const position = elementPositions[i];
            
            if (!element || !position) continue;
            
            // Check if element has any visible portion
            const visiblePortion = this.getElementVisiblePortion(position, viewport, scrollOffset);
            if (!visiblePortion) continue;
            
            // Calculate clipping information
            const clippingInfo = this.calculateElementClipping(position, viewport, scrollOffset);
            
            // Calculate how many lines this element should actually render
            const renderLines = this.calculateRenderLines(
                element,
                position,
                viewport,
                scrollOffset,
                clippingInfo
            );
            
            const visibleElement: VisibleElement = {
                element,
                globalIndex: i,
                viewportPosition: visiblePortion,
                renderLines,
                isClipped: clippingInfo.isClipped,
                clippedAt: clippingInfo.clippedAt
            };
            
            visibleElements.push(visibleElement);
            
            // CRITICAL FIX: Count only the VISIBLE portion, not the full renderLines
            const visiblePortionHeight = visiblePortion.end - visiblePortion.start;
            totalVisibleLines += visiblePortionHeight;
            
            if (clippingInfo.isClipped) {
                hasClippedElements = true;
            }
            
            // Stop if we've filled the viewport (using visible portions, not full render lines)
            if (totalVisibleLines >= viewport.contentHeight) {
                break;
            }
        }
        
        return {
            visibleElements,
            totalVisibleLines,
            hasClippedElements
        };
    }
    
    /**
     * Calculate element positions for all elements based on their required lines
     */
    calculateElementPositions(
        elements: IListItem[],
        contentWidth: number,
        maxElementHeight?: number
    ): ElementPosition[] {
        const positions: ElementPosition[] = [];
        let currentLine = 0;
        
        for (const element of elements) {
            if (!element) {
                positions.push({ start: currentLine, end: currentLine });
                continue;
            }
            
            let requiredLines = element.getRequiredLines ? 
                element.getRequiredLines(contentWidth) : 1;
            
            // Apply height constraint: element height cannot exceed viewport height
            if (maxElementHeight && requiredLines > maxElementHeight) {
                requiredLines = maxElementHeight;
            }
            
            positions.push({
                start: currentLine,
                end: currentLine + requiredLines
            });
            
            currentLine += requiredLines;
        }
        
        return positions;
    }
    
    /**
     * Get the visible portion of an element in viewport coordinates
     */
    private getElementVisiblePortion(
        elementPosition: ElementPosition,
        viewport: ViewportState,
        scrollOffset: number
    ): ElementPosition | null {
        // Check if element is visible at all
        if (elementPosition.end <= scrollOffset || 
            elementPosition.start >= scrollOffset + viewport.contentHeight) {
            return null;
        }
        
        // Calculate visible portion in viewport coordinates
        const visibleStart = Math.max(0, elementPosition.start - scrollOffset);
        const visibleEnd = Math.min(
            viewport.contentHeight, 
            elementPosition.end - scrollOffset
        );
        
        return { start: visibleStart, end: visibleEnd };
    }
    
    /**
     * Calculate clipping information for an element
     */
    private calculateElementClipping(
        elementPosition: ElementPosition,
        viewport: ViewportState,
        scrollOffset: number
    ): { isClipped: boolean; clippedAt: 'top' | 'bottom' | 'none' } {
        const elementStart = elementPosition.start - scrollOffset;
        const elementEnd = elementPosition.end - scrollOffset;
        
        const clippedAtTop = elementStart < 0;
        const clippedAtBottom = elementEnd > viewport.contentHeight;
        
        if (clippedAtTop && clippedAtBottom) {
            // Element is larger than viewport, arbitrarily choose 'top'
            return { isClipped: true, clippedAt: 'top' };
        } else if (clippedAtTop) {
            return { isClipped: true, clippedAt: 'top' };
        } else if (clippedAtBottom) {
            return { isClipped: true, clippedAt: 'bottom' };
        } else {
            return { isClipped: false, clippedAt: 'none' };
        }
    }
    
    /**
     * Calculate how many lines an element should render given clipping constraints
     */
    private calculateRenderLines(
        element: IListItem,
        elementPosition: ElementPosition,
        viewport: ViewportState,
        scrollOffset: number,
        clippingInfo: { isClipped: boolean; clippedAt: 'top' | 'bottom' | 'none' }
    ): number {
        const elementHeight = elementPosition.end - elementPosition.start;
        const elementStartInViewport = elementPosition.start - scrollOffset;
        const elementEndInViewport = elementPosition.end - scrollOffset;
        
        if (!clippingInfo.isClipped) {
            // Element is fully visible, render all lines
            return elementHeight;
        }
        
        // Element is clipped, calculate visible portion
        const visibleStart = Math.max(0, elementStartInViewport);
        const visibleEnd = Math.min(viewport.contentHeight, elementEndInViewport);
        const visibleHeight = Math.max(0, visibleEnd - visibleStart);
        
        // For clipped elements, we still want to give them their full requested lines
        // but the viewport will only show the visible portion
        // This allows proper text wrapping while still respecting viewport boundaries
        return elementHeight; // Give full lines, let rendering handle clipping
    }
    
    /**
     * Find the element at a specific viewport position
     */
    findElementAtPosition(
        viewportLine: number,
        visibleElements: VisibleElement[]
    ): VisibleElement | null {
        for (const visibleElement of visibleElements) {
            if (viewportLine >= visibleElement.viewportPosition.start &&
                viewportLine < visibleElement.viewportPosition.end) {
                return visibleElement;
            }
        }
        return null;
    }
    
    /**
     * Calculate optimal element positioning for navigation
     */
    calculateOptimalElementPosition(
        elementIndex: number,
        elementPositions: ElementPosition[],
        viewport: ViewportState,
        navigationDirection: 'up' | 'down' = 'down'
    ): number {
        if (elementIndex < 0 || elementIndex >= elementPositions.length) {
            return 0;
        }
        
        const elementPosition = elementPositions[elementIndex];
        if (!elementPosition) {
            return 0;
        }
        
        // Calculate optimal scroll offset to position element well in viewport
        switch (navigationDirection) {
            case 'up':
                // When navigating up, position element near bottom of viewport
                return Math.max(0, elementPosition.end - Math.floor(viewport.contentHeight * 0.8));
            
            case 'down':
            default:
                // When navigating down, position element near top of viewport
                return Math.max(0, elementPosition.start - Math.floor(viewport.contentHeight * 0.2));
        }
    }
    
    /**
     * Check if an element requires scrolling to be fully visible
     */
    requiresScrolling(
        elementPosition: ElementPosition,
        viewport: ViewportState,
        currentScrollOffset: number
    ): { required: boolean; direction: 'up' | 'down' | null } {
        const elementStartInViewport = elementPosition.start - currentScrollOffset;
        const elementEndInViewport = elementPosition.end - currentScrollOffset;
        
        if (elementStartInViewport < 0) {
            return { required: true, direction: 'up' };
        } else if (elementEndInViewport > viewport.contentHeight) {
            return { required: true, direction: 'down' };
        } else {
            return { required: false, direction: null };
        }
    }
    
    /**
     * Calculate the total content height for all elements
     */
    calculateTotalContentHeight(elementPositions: ElementPosition[]): number {
        if (elementPositions.length === 0) {
            return 0;
        }
        
        const lastPosition = elementPositions[elementPositions.length - 1];
        return lastPosition ? lastPosition.end : 0;
    }
    
    /**
     * Validate element positions for consistency
     */
    validateElementPositions(elementPositions: ElementPosition[]): boolean {
        for (let i = 0; i < elementPositions.length; i++) {
            const position = elementPositions[i];
            
            // Check basic validity
            if (!position || position.start < 0 || position.end < position.start) {
                return false;
            }
            
            // Check sequential ordering
            if (i > 0) {
                const prevPosition = elementPositions[i - 1];
                if (prevPosition && position.start < prevPosition.end) {
                    return false; // Overlapping positions
                }
            }
        }
        
        return true;
    }
}