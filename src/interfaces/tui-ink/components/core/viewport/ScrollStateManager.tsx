import { ViewportState, OverflowState } from './ViewportCalculator';

/**
 * ScrollStateManager - Centralized scroll state management for ContainerListItem
 * 
 * This class handles all scroll-related state and calculations, completely separate
 * from rendering logic. It provides a clean API for scroll operations and indicator
 * state management.
 */

export interface ScrollIndicators {
    /** Show upward scroll indicator (▲) */
    showUp: boolean;
    /** Show downward scroll indicator (▼) */
    showDown: boolean;
}

export interface ScrollCommands {
    scrollUp(amount?: number): boolean;
    scrollDown(amount?: number): boolean;
    scrollToElement(elementIndex: number, elementPositions: ElementPosition[]): boolean;
    scrollToTop(): boolean;
    scrollToBottom(totalContentHeight: number): boolean;
}

export interface ElementPosition {
    start: number;
    end: number;
}

export class ScrollStateManager implements ScrollCommands {
    private scrollOffset: number = 0;
    private viewportHeight: number = 0;
    private totalContentHeight: number = 0;
    
    /**
     * Update scroll state with new viewport and content dimensions
     */
    updateDimensions(viewport: ViewportState, totalContentHeight: number): void {
        this.viewportHeight = viewport.contentHeight;
        this.totalContentHeight = totalContentHeight;
        
        // Ensure scroll offset is still valid after dimension changes
        this.constrainScrollOffset();
    }
    
    /**
     * Get current scroll offset
     */
    getScrollOffset(): number {
        return this.scrollOffset;
    }
    
    /**
     * Get scroll indicators based purely on overflow state
     */
    getScrollIndicators(): ScrollIndicators {
        const maxScrollOffset = Math.max(0, this.totalContentHeight - this.viewportHeight);
        
        return {
            showUp: this.scrollOffset > 0,
            showDown: this.scrollOffset < maxScrollOffset && this.totalContentHeight > this.viewportHeight
        };
    }
    
    /**
     * Calculate overflow state for current scroll position
     */
    getOverflowState(): OverflowState {
        const maxScrollOffset = Math.max(0, this.totalContentHeight - this.viewportHeight);
        
        return {
            canScrollUp: this.scrollOffset > 0,
            canScrollDown: this.scrollOffset < maxScrollOffset,
            totalContentHeight: this.totalContentHeight,
            maxScrollOffset
        };
    }
    
    /**
     * Scroll up by specified amount (defaults to 1 line)
     */
    scrollUp(amount: number = 1): boolean {
        const oldOffset = this.scrollOffset;
        this.scrollOffset = Math.max(0, this.scrollOffset - amount);
        return this.scrollOffset !== oldOffset;
    }
    
    /**
     * Scroll down by specified amount (defaults to 1 line)
     */
    scrollDown(amount: number = 1): boolean {
        const oldOffset = this.scrollOffset;
        const maxOffset = Math.max(0, this.totalContentHeight - this.viewportHeight);
        this.scrollOffset = Math.min(maxOffset, this.scrollOffset + amount);
        return this.scrollOffset !== oldOffset;
    }
    
    /**
     * Scroll to ensure a specific element is visible
     * Implements intelligent positioning based on navigation direction
     */
    scrollToElement(
        elementIndex: number, 
        elementPositions: ElementPosition[],
        navigationDirection?: 'up' | 'down'
    ): boolean {
        if (elementIndex < 0 || elementIndex >= elementPositions.length) {
            return false;
        }
        
        const elementPos = elementPositions[elementIndex];
        if (!elementPos) {
            return false;
        }
        
        const oldOffset = this.scrollOffset;
        
        // Basic visibility check first
        if (elementPos.end > this.scrollOffset + this.viewportHeight) {
            // Element extends below viewport - scroll down to show it
            this.scrollOffset = elementPos.end - this.viewportHeight;
        } else if (elementPos.start < this.scrollOffset) {
            // Element starts above viewport - scroll up to show it
            this.scrollOffset = elementPos.start;
        }
        
        // Apply intelligent positioning based on navigation direction
        if (navigationDirection === 'down') {
            // When navigating down, position element near top for better context
            const targetOffset = Math.max(0, elementPos.start - Math.floor(this.viewportHeight * 0.2));
            this.scrollOffset = Math.min(this.scrollOffset, targetOffset);
        } else if (navigationDirection === 'up') {
            // When navigating up, position element near bottom for better context
            const targetOffset = elementPos.end - Math.floor(this.viewportHeight * 0.8);
            this.scrollOffset = Math.max(this.scrollOffset, Math.max(0, targetOffset));
        }
        
        this.constrainScrollOffset();
        return this.scrollOffset !== oldOffset;
    }
    
    /**
     * Scroll to top of content
     */
    scrollToTop(): boolean {
        const oldOffset = this.scrollOffset;
        this.scrollOffset = 0;
        return this.scrollOffset !== oldOffset;
    }
    
    /**
     * Scroll to bottom of content
     */
    scrollToBottom(totalContentHeight?: number): boolean {
        const contentHeight = totalContentHeight || this.totalContentHeight;
        const oldOffset = this.scrollOffset;
        this.scrollOffset = Math.max(0, contentHeight - this.viewportHeight);
        return this.scrollOffset !== oldOffset;
    }
    
    /**
     * Check if an element is currently visible in the viewport
     */
    isElementVisible(elementPosition: ElementPosition): boolean {
        return (
            elementPosition.end > this.scrollOffset &&
            elementPosition.start < this.scrollOffset + this.viewportHeight
        );
    }
    
    /**
     * Check if an element is fully visible in the viewport
     */
    isElementFullyVisible(elementPosition: ElementPosition): boolean {
        return (
            elementPosition.start >= this.scrollOffset &&
            elementPosition.end <= this.scrollOffset + this.viewportHeight
        );
    }
    
    /**
     * Get the visible portion of an element (in viewport coordinates)
     */
    getElementVisiblePortion(elementPosition: ElementPosition): { start: number; end: number } | null {
        if (!this.isElementVisible(elementPosition)) {
            return null;
        }
        
        const visibleStart = Math.max(0, elementPosition.start - this.scrollOffset);
        const visibleEnd = Math.min(this.viewportHeight, elementPosition.end - this.scrollOffset);
        
        return { start: visibleStart, end: visibleEnd };
    }
    
    /**
     * Reset scroll state (typically called when entering/exiting container)
     */
    reset(): void {
        this.scrollOffset = 0;
        this.viewportHeight = 0;
        this.totalContentHeight = 0;
    }
    
    /**
     * Ensure scroll offset stays within valid bounds
     */
    private constrainScrollOffset(): void {
        const maxOffset = Math.max(0, this.totalContentHeight - this.viewportHeight);
        this.scrollOffset = Math.max(0, Math.min(maxOffset, this.scrollOffset));
    }
    
    /**
     * Calculate optimal scroll offset for element positioning
     * Used for advanced positioning strategies
     */
    calculateOptimalScrollOffset(
        elementPosition: ElementPosition,
        strategy: 'top' | 'center' | 'bottom' = 'center'
    ): number {
        switch (strategy) {
            case 'top':
                return Math.max(0, elementPosition.start);
            
            case 'bottom':
                return Math.max(0, elementPosition.end - this.viewportHeight);
            
            case 'center':
            default:
                const elementHeight = elementPosition.end - elementPosition.start;
                const elementCenter = elementPosition.start + (elementHeight / 2);
                const targetScrollOffset = elementCenter - (this.viewportHeight / 2);
                return Math.max(0, targetScrollOffset);
        }
    }
    
    /**
     * Handle keyboard-driven navigation with scroll adjustment
     * Returns whether the scroll position changed
     */
    handleNavigationScroll(
        selectedIndex: number,
        elementPositions: ElementPosition[],
        direction: 'up' | 'down'
    ): boolean {
        return this.scrollToElement(selectedIndex, elementPositions, direction);
    }
}