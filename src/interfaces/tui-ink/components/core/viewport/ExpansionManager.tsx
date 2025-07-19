import { IListItem } from '../IListItem';
import { ViewportState } from './ViewportCalculator';
import { ScrollStateManager, ElementPosition } from './ScrollStateManager';
import { ElementVisibilityCalculator } from './ElementVisibilityCalculator';

/**
 * ExpansionManager - Handles subitem expansion and collapse with viewport awareness
 * 
 * This class manages the complex scenarios that occur when elements expand or collapse,
 * ensuring that the viewport adjusts appropriately to maintain good user experience.
 * It handles cases where expanded content might exceed viewport boundaries.
 */

export interface ExpansionState {
    /** Element that is expanding/collapsing */
    elementIndex: number;
    /** Whether the element is expanding (true) or collapsing (false) */
    isExpanding: boolean;
    /** Height before expansion/collapse */
    heightBefore: number;
    /** Height after expansion/collapse */
    heightAfter: number;
    /** Current scroll position */
    currentScrollOffset: number;
}

export interface ExpansionResult {
    /** Whether scroll adjustment was needed */
    scrollAdjusted: boolean;
    /** New scroll offset after adjustment */
    newScrollOffset: number;
    /** Whether the expanded content fits in viewport */
    fitsInViewport: boolean;
    /** Adjustment strategy used */
    strategy: 'none' | 'scroll-up' | 'scroll-down' | 'constrain' | 'center';
}

export class ExpansionManager {
    private scrollManager: ScrollStateManager;
    private visibilityCalculator: ElementVisibilityCalculator;
    
    constructor(
        scrollManager: ScrollStateManager,
        visibilityCalculator: ElementVisibilityCalculator
    ) {
        this.scrollManager = scrollManager;
        this.visibilityCalculator = visibilityCalculator;
    }
    
    /**
     * Handle element expansion with intelligent viewport adjustment
     */
    handleElementExpansion(
        expansionState: ExpansionState,
        elementPositions: ElementPosition[],
        viewport: ViewportState
    ): ExpansionResult {
        const { elementIndex, isExpanding, heightBefore, heightAfter } = expansionState;
        
        if (isExpanding) {
            return this.handleExpansion(
                elementIndex,
                heightBefore,
                heightAfter,
                elementPositions,
                viewport
            );
        } else {
            return this.handleCollapse(
                elementIndex,
                heightBefore,
                heightAfter,
                elementPositions,
                viewport
            );
        }
    }
    
    /**
     * Handle element expansion scenarios
     */
    private handleExpansion(
        elementIndex: number,
        heightBefore: number,
        heightAfter: number,
        elementPositions: ElementPosition[],
        viewport: ViewportState
    ): ExpansionResult {
        const elementPosition = elementPositions[elementIndex];
        if (!elementPosition) {
            return this.createNoActionResult();
        }
        
        const heightIncrease = heightAfter - heightBefore;
        const currentScrollOffset = this.scrollManager.getScrollOffset();
        
        // Check if expanded content will fit in viewport
        const willFitInViewport = heightAfter <= viewport.contentHeight;
        
        if (willFitInViewport) {
            // Content fits, check if we need to adjust scroll to keep it visible
            return this.handleFittingExpansion(
                elementPosition,
                heightIncrease,
                viewport,
                currentScrollOffset
            );
        } else {
            // Content doesn't fit, need to constrain or scroll
            return this.handleOversizedExpansion(
                elementPosition,
                heightAfter,
                viewport,
                currentScrollOffset
            );
        }
    }
    
    /**
     * Handle expansion that fits within viewport
     */
    private handleFittingExpansion(
        elementPosition: ElementPosition,
        heightIncrease: number,
        viewport: ViewportState,
        currentScrollOffset: number
    ): ExpansionResult {
        const elementStart = elementPosition.start - currentScrollOffset;
        const elementEndAfterExpansion = elementPosition.end + heightIncrease - currentScrollOffset;
        
        // Check if expansion will push content below viewport
        if (elementEndAfterExpansion > viewport.contentHeight) {
            // Need to scroll up to keep expanded content visible
            const scrollUpAmount = elementEndAfterExpansion - viewport.contentHeight;
            const scrollChanged = this.scrollManager.scrollUp(scrollUpAmount);
            
            return {
                scrollAdjusted: scrollChanged,
                newScrollOffset: this.scrollManager.getScrollOffset(),
                fitsInViewport: true,
                strategy: 'scroll-up'
            };
        }
        
        // Expansion fits without scroll adjustment
        return {
            scrollAdjusted: false,
            newScrollOffset: currentScrollOffset,
            fitsInViewport: true,
            strategy: 'none'
        };
    }
    
    /**
     * Handle expansion that exceeds viewport size
     */
    private handleOversizedExpansion(
        elementPosition: ElementPosition,
        heightAfter: number,
        viewport: ViewportState,
        currentScrollOffset: number
    ): ExpansionResult {
        // For oversized content, position the element at the top of viewport
        // This gives maximum visibility for the expanded content
        const targetScrollOffset = elementPosition.start;
        
        if (targetScrollOffset !== currentScrollOffset) {
            // Scroll to position element at top
            const scrollChanged = this.scrollManager.scrollToElement(
                // We don't have element index here, so calculate it differently
                0, // This would need to be passed in or calculated
                [elementPosition],
                'down'
            );
            
            return {
                scrollAdjusted: scrollChanged,
                newScrollOffset: this.scrollManager.getScrollOffset(),
                fitsInViewport: false,
                strategy: 'constrain'
            };
        }
        
        return {
            scrollAdjusted: false,
            newScrollOffset: currentScrollOffset,
            fitsInViewport: false,
            strategy: 'constrain'
        };
    }
    
    /**
     * Handle element collapse scenarios
     */
    private handleCollapse(
        elementIndex: number,
        heightBefore: number,
        heightAfter: number,
        elementPositions: ElementPosition[],
        viewport: ViewportState
    ): ExpansionResult {
        const elementPosition = elementPositions[elementIndex];
        if (!elementPosition) {
            return this.createNoActionResult();
        }
        
        const heightDecrease = heightBefore - heightAfter;
        const currentScrollOffset = this.scrollManager.getScrollOffset();
        
        // Check if collapse creates empty space at bottom of viewport
        const totalContentHeight = this.visibilityCalculator.calculateTotalContentHeight(elementPositions);
        const newTotalHeight = totalContentHeight - heightDecrease;
        
        // If we're scrolled past the new content height, adjust scroll
        if (currentScrollOffset + viewport.contentHeight > newTotalHeight) {
            const maxValidScroll = Math.max(0, newTotalHeight - viewport.contentHeight);
            
            if (currentScrollOffset > maxValidScroll) {
                // Scroll up to eliminate empty space
                this.scrollManager.scrollToTop();
                const newOffset = Math.min(currentScrollOffset, maxValidScroll);
                
                return {
                    scrollAdjusted: true,
                    newScrollOffset: newOffset,
                    fitsInViewport: true,
                    strategy: 'scroll-up'
                };
            }
        }
        
        // No scroll adjustment needed for collapse
        return {
            scrollAdjusted: false,
            newScrollOffset: currentScrollOffset,
            fitsInViewport: true,
            strategy: 'none'
        };
    }
    
    /**
     * Calculate the optimal scroll position after expansion
     */
    calculateOptimalScrollAfterExpansion(
        elementIndex: number,
        newElementHeight: number,
        elementPositions: ElementPosition[],
        viewport: ViewportState
    ): number {
        const elementPosition = elementPositions[elementIndex];
        if (!elementPosition) {
            return this.scrollManager.getScrollOffset();
        }
        
        // If element fits in viewport, position it optimally
        if (newElementHeight <= viewport.contentHeight) {
            // Try to center the element in viewport
            const elementMiddle = elementPosition.start + (newElementHeight / 2);
            const targetScroll = elementMiddle - (viewport.contentHeight / 2);
            return Math.max(0, targetScroll);
        } else {
            // For oversized elements, show from the top
            return elementPosition.start;
        }
    }
    
    /**
     * Predict if expansion will require scroll adjustment
     */
    predictExpansionScrollNeed(
        elementIndex: number,
        currentHeight: number,
        expandedHeight: number,
        elementPositions: ElementPosition[],
        viewport: ViewportState
    ): { needsScroll: boolean; direction: 'up' | 'down' | null; amount: number } {
        const elementPosition = elementPositions[elementIndex];
        if (!elementPosition) {
            return { needsScroll: false, direction: null, amount: 0 };
        }
        
        const currentScrollOffset = this.scrollManager.getScrollOffset();
        const elementStartInViewport = elementPosition.start - currentScrollOffset;
        const currentElementEndInViewport = elementPosition.end - currentScrollOffset;
        const expandedElementEndInViewport = elementPosition.start + expandedHeight - currentScrollOffset;
        
        // Check if expansion pushes content below viewport
        if (expandedElementEndInViewport > viewport.contentHeight) {
            const overhang = expandedElementEndInViewport - viewport.contentHeight;
            return { needsScroll: true, direction: 'up', amount: overhang };
        }
        
        return { needsScroll: false, direction: null, amount: 0 };
    }
    
    /**
     * Handle expansion of nested elements (recursive expansion)
     */
    handleNestedExpansion(
        parentElementIndex: number,
        childElementIndex: number,
        childExpansionHeight: number,
        elementPositions: ElementPosition[],
        viewport: ViewportState
    ): ExpansionResult {
        // For nested expansions, we need to consider both the parent and child positioning
        const parentPosition = elementPositions[parentElementIndex];
        if (!parentPosition) {
            return this.createNoActionResult();
        }
        
        // Calculate the position of the child within the parent
        // This is a simplified approach - in practice, you'd need more detailed position tracking
        const childAbsoluteStart = parentPosition.start + childElementIndex;
        const childAbsoluteEnd = childAbsoluteStart + childExpansionHeight;
        
        const childPosition: ElementPosition = {
            start: childAbsoluteStart,
            end: childAbsoluteEnd
        };
        
        // Handle as a regular expansion
        return this.handleFittingExpansion(
            childPosition,
            childExpansionHeight,
            viewport,
            this.scrollManager.getScrollOffset()
        );
    }
    
    /**
     * Ensure element remains visible after expansion state change
     */
    ensureElementVisibleAfterExpansion(
        elementIndex: number,
        elementPositions: ElementPosition[]
    ): boolean {
        return this.scrollManager.scrollToElement(elementIndex, elementPositions);
    }
    
    /**
     * Create a no-action result for error cases
     */
    private createNoActionResult(): ExpansionResult {
        return {
            scrollAdjusted: false,
            newScrollOffset: this.scrollManager.getScrollOffset(),
            fitsInViewport: true,
            strategy: 'none'
        };
    }
    
    /**
     * Get statistics about expansion behavior for debugging
     */
    getExpansionStats(
        elements: IListItem[],
        elementPositions: ElementPosition[],
        viewport: ViewportState
    ): {
        totalElements: number;
        expandableElements: number;
        oversizedWhenExpanded: number;
        averageElementHeight: number;
    } {
        const totalElements = elements.length;
        let expandableElements = 0;
        let oversizedWhenExpanded = 0;
        let totalHeight = 0;
        
        elements.forEach((element, index) => {
            if (element && typeof element.getRequiredLines === 'function') {
                expandableElements++;
                const height = element.getRequiredLines(viewport.contentWidth);
                totalHeight += height;
                
                if (height > viewport.contentHeight) {
                    oversizedWhenExpanded++;
                }
            }
        });
        
        const averageElementHeight = expandableElements > 0 ? totalHeight / expandableElements : 0;
        
        return {
            totalElements,
            expandableElements,
            oversizedWhenExpanded,
            averageElementHeight
        };
    }
}