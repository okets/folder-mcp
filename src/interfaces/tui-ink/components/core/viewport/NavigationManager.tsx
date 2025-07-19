import { IListItem } from '../IListItem';
import { ViewportState } from './ViewportCalculator';
import { ScrollStateManager, ElementPosition } from './ScrollStateManager';
import { ElementVisibilityCalculator } from './ElementVisibilityCalculator';

/**
 * NavigationManager - Intelligent navigation with bring-into-view logic
 * 
 * This class handles all navigation operations including:
 * - Finding navigable elements
 * - Skipping non-navigable elements
 * - Bringing elements into view with optimal positioning
 * - Managing selection state transitions
 */

export interface NavigationResult {
    /** Whether navigation occurred */
    navigated: boolean;
    /** New selected index (may be same as old if no navigation) */
    newSelectedIndex: number;
    /** Whether scroll position changed */
    scrollChanged: boolean;
    /** Navigation reached a boundary */
    atBoundary: boolean;
    /** Type of boundary reached (if any) */
    boundaryType?: 'top' | 'bottom' | 'none';
}

export interface NavigationState {
    selectedIndex: number;
    isConfirmFocused: boolean;
    elements: IListItem[];
}

export class NavigationManager {
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
     * Navigate to the next navigable element in the specified direction
     */
    navigateInDirection(
        currentState: NavigationState,
        direction: 'up' | 'down',
        elementPositions: ElementPosition[]
    ): NavigationResult {
        const { selectedIndex, isConfirmFocused, elements } = currentState;
        
        if (direction === 'up') {
            return this.navigateUp(selectedIndex, isConfirmFocused, elements, elementPositions);
        } else {
            return this.navigateDown(selectedIndex, isConfirmFocused, elements, elementPositions);
        }
    }
    
    /**
     * Navigate upward with intelligent boundary handling
     */
    private navigateUp(
        selectedIndex: number,
        isConfirmFocused: boolean,
        elements: IListItem[],
        elementPositions: ElementPosition[]
    ): NavigationResult {
        if (isConfirmFocused) {
            // Move from confirmation back to last navigable element
            const lastNavigableIndex = this.findLastNavigableElement(elements);
            if (lastNavigableIndex >= 0) {
                const scrollChanged = this.scrollManager.scrollToElement(
                    lastNavigableIndex, 
                    elementPositions, 
                    'up'
                );
                
                return {
                    navigated: true,
                    newSelectedIndex: lastNavigableIndex,
                    scrollChanged,
                    atBoundary: false
                };
            } else {
                // No navigable elements, stay on confirmation
                return {
                    navigated: false,
                    newSelectedIndex: selectedIndex,
                    scrollChanged: false,
                    atBoundary: true,
                    boundaryType: 'top'
                };
            }
        }
        
        // Find previous navigable element
        const previousIndex = this.findPreviousNavigableElement(selectedIndex, elements);
        
        if (previousIndex >= 0) {
            // Found navigable element, navigate to it
            const scrollChanged = this.scrollManager.scrollToElement(
                previousIndex, 
                elementPositions, 
                'up'
            );
            
            return {
                navigated: true,
                newSelectedIndex: previousIndex,
                scrollChanged,
                atBoundary: false
            };
        } else {
            // No navigable elements above
            // Check if we should auto-close or stay at boundary
            const hasNavigableAbove = this.hasNavigableElementsAbove(selectedIndex, elements);
            
            return {
                navigated: false,
                newSelectedIndex: selectedIndex,
                scrollChanged: false,
                atBoundary: true,
                boundaryType: hasNavigableAbove ? 'none' : 'top'
            };
        }
    }
    
    /**
     * Navigate downward with intelligent boundary handling
     */
    private navigateDown(
        selectedIndex: number,
        isConfirmFocused: boolean,
        elements: IListItem[],
        elementPositions: ElementPosition[]
    ): NavigationResult {
        if (isConfirmFocused) {
            // Already at confirmation, can't go further down
            return {
                navigated: false,
                newSelectedIndex: selectedIndex,
                scrollChanged: false,
                atBoundary: true,
                boundaryType: 'bottom'
            };
        }
        
        // Find next navigable element
        const nextIndex = this.findNextNavigableElement(selectedIndex, elements);
        
        if (nextIndex >= 0) {
            // Found navigable element, navigate to it
            const scrollChanged = this.scrollManager.scrollToElement(
                nextIndex, 
                elementPositions, 
                'down'
            );
            
            return {
                navigated: true,
                newSelectedIndex: nextIndex,
                scrollChanged,
                atBoundary: false
            };
        } else {
            // No navigable elements below, move to confirmation
            // No scroll needed as confirmation is always visible
            return {
                navigated: true, // Moving to confirmation is navigation
                newSelectedIndex: selectedIndex,
                scrollChanged: false,
                atBoundary: false // Confirmation is a valid target
            };
        }
    }
    
    /**
     * Find the next navigable element after the given index
     */
    findNextNavigableElement(fromIndex: number, elements: IListItem[]): number {
        for (let i = fromIndex + 1; i < elements.length; i++) {
            const element = elements[i];
            if (element && element.isNavigable) {
                return i;
            }
        }
        return -1;
    }
    
    /**
     * Find the previous navigable element before the given index
     */
    findPreviousNavigableElement(fromIndex: number, elements: IListItem[]): number {
        for (let i = fromIndex - 1; i >= 0; i--) {
            const element = elements[i];
            if (element && element.isNavigable) {
                return i;
            }
        }
        return -1;
    }
    
    /**
     * Find the first navigable element in the list
     */
    findFirstNavigableElement(elements: IListItem[]): number {
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            if (element && element.isNavigable) {
                return i;
            }
        }
        return 0; // Fallback to first element if none are navigable
    }
    
    /**
     * Find the last navigable element in the list
     */
    findLastNavigableElement(elements: IListItem[]): number {
        for (let i = elements.length - 1; i >= 0; i--) {
            const element = elements[i];
            if (element && element.isNavigable) {
                return i;
            }
        }
        return elements.length - 1; // Fallback to last element if none are navigable
    }
    
    /**
     * Check if there are navigable elements above the given index
     */
    private hasNavigableElementsAbove(index: number, elements: IListItem[]): boolean {
        for (let i = 0; i < index; i++) {
            const element = elements[i];
            if (element && element.isNavigable) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Check if there are navigable elements below the given index
     */
    hasNavigableElementsBelow(index: number, elements: IListItem[]): boolean {
        for (let i = index + 1; i < elements.length; i++) {
            const element = elements[i];
            if (element && element.isNavigable) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Get optimal positioning for an element when bringing it into view
     */
    getOptimalElementPositioning(
        elementIndex: number,
        elementPositions: ElementPosition[],
        viewport: ViewportState,
        direction: 'up' | 'down'
    ): number {
        return this.visibilityCalculator.calculateOptimalElementPosition(
            elementIndex,
            elementPositions,
            viewport,
            direction
        );
    }
    
    /**
     * Ensure an element is optimally positioned in the viewport
     */
    ensureElementOptimallyPositioned(
        elementIndex: number,
        elementPositions: ElementPosition[],
        viewport: ViewportState,
        direction: 'up' | 'down'
    ): boolean {
        const optimalOffset = this.getOptimalElementPositioning(
            elementIndex,
            elementPositions,
            viewport,
            direction
        );
        
        const currentOffset = this.scrollManager.getScrollOffset();
        if (Math.abs(currentOffset - optimalOffset) > 1) {
            // Only adjust if the difference is significant
            this.scrollManager.scrollToElement(elementIndex, elementPositions, direction);
            return true;
        }
        
        return false;
    }
    
    /**
     * Handle edge cases for navigation at boundaries
     */
    handleBoundaryNavigation(
        direction: 'up' | 'down',
        currentState: NavigationState
    ): 'auto-close' | 'stay' | 'move-to-confirmation' {
        const { selectedIndex, elements } = currentState;
        
        if (direction === 'up') {
            // At top boundary - check if we should auto-close
            const hasNavigableAbove = this.hasNavigableElementsAbove(selectedIndex, elements);
            return hasNavigableAbove ? 'stay' : 'auto-close';
        } else {
            // At bottom boundary - move to confirmation
            return 'move-to-confirmation';
        }
    }
    
    /**
     * Calculate navigation statistics for debugging/optimization
     */
    getNavigationStats(elements: IListItem[]): {
        totalElements: number;
        navigableElements: number;
        nonNavigableElements: number;
        navigableRatio: number;
    } {
        const totalElements = elements.length;
        const navigableElements = elements.filter(el => el && el.isNavigable).length;
        const nonNavigableElements = totalElements - navigableElements;
        const navigableRatio = totalElements > 0 ? navigableElements / totalElements : 0;
        
        return {
            totalElements,
            navigableElements,
            nonNavigableElements,
            navigableRatio
        };
    }
}