import { useDI } from '../di/DIContext';
import { ServiceTokens } from '../di/tokens';
import { ILayoutService } from './interfaces';

/**
 * Layout calculation utilities for responsive TUI design
 */
export interface LayoutDimensions {
    width: number;
    height: number;
}

export interface PanelLayout {
    /** Total available dimensions */
    container: LayoutDimensions;
    /** Individual panel dimensions */
    panels: LayoutDimensions[];
    /** Gap between panels */
    gap: number;
}

export interface TextLayout {
    /** Maximum width for text */
    maxWidth: number;
    /** Width reserved for indicators/icons */
    indicatorWidth: number;
    /** Width reserved for values */
    valueWidth?: number;
    /** Width reserved for status */
    statusWidth?: number;
}

/**
 * Service for managing TUI layout calculations
 */
export class LayoutService implements ILayoutService {
    /**
     * Calculate panel dimensions for horizontal layout
     */
    calculateHorizontalLayout(
        containerWidth: number,
        containerHeight: number,
        panelCount: number,
        options: {
            gap?: number;
            minPanelWidth?: number;
            equalWidth?: boolean;
        } = {}
    ): PanelLayout {
        const { gap = 2, minPanelWidth = 20, equalWidth = true } = options;
        
        // Calculate available width after gaps
        const totalGapWidth = gap * (panelCount - 1);
        const availableWidth = containerWidth - totalGapWidth;
        
        // Calculate panel dimensions
        const panels: LayoutDimensions[] = [];
        
        if (equalWidth) {
            const panelWidth = Math.floor(availableWidth / panelCount);
            for (let i = 0; i < panelCount; i++) {
                panels.push({
                    width: Math.max(minPanelWidth, panelWidth),
                    height: containerHeight
                });
            }
        } else {
            // TODO: Support custom width ratios
            throw new Error('Non-equal width layout not yet implemented');
        }
        
        return {
            container: { width: containerWidth, height: containerHeight },
            panels,
            gap
        };
    }
    
    /**
     * Calculate panel dimensions for vertical layout
     */
    calculateVerticalLayout(
        containerWidth: number,
        containerHeight: number,
        panelCount: number,
        options: {
            gap?: number;
            minPanelHeight?: number;
            equalHeight?: boolean;
        } = {}
    ): PanelLayout {
        const { gap = 1, minPanelHeight = 5, equalHeight = true } = options;
        
        // Calculate available height after gaps
        const totalGapHeight = gap * (panelCount - 1);
        const availableHeight = containerHeight - totalGapHeight;
        
        // Calculate panel dimensions
        const panels: LayoutDimensions[] = [];
        
        if (equalHeight) {
            const panelHeight = Math.floor(availableHeight / panelCount);
            for (let i = 0; i < panelCount; i++) {
                panels.push({
                    width: containerWidth,
                    height: Math.max(minPanelHeight, panelHeight)
                });
            }
        } else {
            // TODO: Support custom height ratios
            throw new Error('Non-equal height layout not yet implemented');
        }
        
        return {
            container: { width: containerWidth, height: containerHeight },
            panels,
            gap
        };
    }
    
    /**
     * Calculate text layout dimensions within a panel
     */
    calculateTextLayout(
        panelWidth: number,
        options: {
            hasBorder?: boolean;
            hasScrollbar?: boolean;
            hasIndicator?: boolean;
            hasValue?: boolean;
            hasStatus?: boolean;
            indicatorWidth?: number;
            padding?: number;
        } = {}
    ): TextLayout {
        const {
            hasBorder = true,
            hasScrollbar = false,
            hasIndicator = true,
            hasValue = false,
            hasStatus = false,
            indicatorWidth = 2,
            padding = 1
        } = options;
        
        let availableWidth = panelWidth;
        
        // Account for borders
        if (hasBorder) {
            availableWidth -= 4; // 2 chars for borders + 2 for padding
        }
        
        // Account for scrollbar
        if (hasScrollbar) {
            availableWidth -= 1;
        }
        
        // Account for padding
        availableWidth -= padding * 2;
        
        // Calculate reserved widths
        const actualIndicatorWidth = hasIndicator ? indicatorWidth : 0;
        const valueWidth = hasValue ? Math.floor(availableWidth * 0.3) : 0;
        const statusWidth = hasStatus ? 3 : 0; // Status indicators are typically short
        
        // Calculate remaining width for main text
        const maxWidth = availableWidth - actualIndicatorWidth - valueWidth - statusWidth;
        
        return {
            maxWidth: Math.max(10, maxWidth), // Minimum 10 chars for text
            indicatorWidth: actualIndicatorWidth,
            valueWidth,
            statusWidth
        };
    }
    
    /**
     * Calculate responsive breakpoints
     */
    getBreakpoint(width: number): 'small' | 'medium' | 'large' {
        if (width < 80) return 'small';
        if (width < 120) return 'medium';
        return 'large';
    }
    
    /**
     * Get responsive panel configuration
     */
    getResponsiveConfig(width: number, height: number): {
        layout: 'horizontal' | 'vertical';
        showSubtitles: boolean;
        showScrollbars: boolean;
        abbreviateText: boolean;
    } {
        const breakpoint = this.getBreakpoint(width);
        
        return {
            layout: width >= 100 ? 'horizontal' : 'vertical',
            showSubtitles: height >= 15,
            showScrollbars: true, // Always show for clarity
            abbreviateText: breakpoint === 'small'
        };
    }
}

// LayoutService should be instantiated through DI container
// Use: const layoutService = useDI().resolve(ServiceTokens.LAYOUT_SERVICE);