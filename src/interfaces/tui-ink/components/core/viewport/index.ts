/**
 * Viewport Management System for ContainerListItem
 * 
 * This module provides a comprehensive viewport management system with clear
 * separation of concerns. Each class handles a specific aspect of viewport
 * management to eliminate the fragmented logic found in the original implementation.
 */

// Import classes for internal use
import { ViewportCalculator } from './ViewportCalculator';
import { ScrollStateManager } from './ScrollStateManager';
import { ElementVisibilityCalculator } from './ElementVisibilityCalculator';
import { NavigationManager } from './NavigationManager';
import { ExpansionManager } from './ExpansionManager';

// Core viewport calculation
export { ViewportCalculator, type ViewportState, type OverflowState } from './ViewportCalculator';

// Scroll state management
export { 
    ScrollStateManager, 
    type ScrollIndicators, 
    type ScrollCommands, 
    type ElementPosition 
} from './ScrollStateManager';

// Element visibility and positioning
export { 
    ElementVisibilityCalculator, 
    type VisibleElement, 
    type ElementLayoutResult 
} from './ElementVisibilityCalculator';

// Navigation logic
export { 
    NavigationManager, 
    type NavigationResult, 
    type NavigationState 
} from './NavigationManager';

// Expansion management
export { 
    ExpansionManager, 
    type ExpansionState, 
    type ExpansionResult 
} from './ExpansionManager';

/**
 * Convenience factory for creating a complete viewport management system
 */
export class ViewportSystem {
    public readonly viewportCalculator: ViewportCalculator;
    public readonly scrollManager: ScrollStateManager;
    public readonly visibilityCalculator: ElementVisibilityCalculator;
    public readonly navigationManager: NavigationManager;
    public readonly expansionManager: ExpansionManager;
    
    constructor() {
        this.viewportCalculator = new ViewportCalculator();
        this.scrollManager = new ScrollStateManager();
        this.visibilityCalculator = new ElementVisibilityCalculator();
        this.navigationManager = new NavigationManager(
            this.scrollManager,
            this.visibilityCalculator
        );
        this.expansionManager = new ExpansionManager(
            this.scrollManager,
            this.visibilityCalculator
        );
    }
    
    /**
     * Reset all viewport state (typically called when entering/exiting container)
     */
    reset(): void {
        this.scrollManager.reset();
    }
}