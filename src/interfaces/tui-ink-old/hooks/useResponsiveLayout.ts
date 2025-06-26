import { useMemo } from 'react';
import { useTerminalSize } from './useTerminalSize.js';
import { layoutService } from '../services/LayoutService.js';

export interface ResponsiveLayoutOptions {
    /** Number of panels to display */
    panelCount: number;
    /** Preferred layout direction */
    preferredLayout?: 'horizontal' | 'vertical' | 'auto';
    /** Minimum panel dimensions */
    minPanelWidth?: number;
    minPanelHeight?: number;
    /** Space reserved for status bar */
    statusBarHeight?: number;
}

/**
 * Hook for responsive panel layout based on terminal size
 */
export function useResponsiveLayout(options: ResponsiveLayoutOptions) {
    const { columns, rows } = useTerminalSize();
    const {
        panelCount,
        preferredLayout = 'auto',
        minPanelWidth = 30,
        minPanelHeight = 10,
        statusBarHeight = 2
    } = options;
    
    return useMemo(() => {
        // Calculate available space
        const availableHeight = rows - statusBarHeight;
        
        // Determine layout direction
        let layout: 'horizontal' | 'vertical';
        if (preferredLayout === 'auto') {
            // Use horizontal if we have enough width for all panels
            const requiredWidth = panelCount * minPanelWidth + (panelCount - 1) * 2;
            layout = columns >= requiredWidth ? 'horizontal' : 'vertical';
        } else {
            layout = preferredLayout;
        }
        
        // Get responsive configuration
        const config = layoutService.getResponsiveConfig(columns, availableHeight);
        
        // Calculate panel layout
        const panelLayout = layout === 'horizontal'
            ? layoutService.calculateHorizontalLayout(columns, availableHeight, panelCount, {
                minPanelWidth
            })
            : layoutService.calculateVerticalLayout(columns, availableHeight, panelCount, {
                minPanelHeight
            });
        
        // Calculate text layout for each panel
        const textLayouts = panelLayout.panels.map(panel => 
            layoutService.calculateTextLayout(panel.width, {
                hasScrollbar: true,
                hasIndicator: true,
                hasValue: config.breakpoint !== 'small',
                hasStatus: config.breakpoint !== 'small'
            })
        );
        
        return {
            layout,
            panelLayout,
            textLayouts,
            config,
            breakpoint: layoutService.getBreakpoint(columns)
        };
    }, [columns, rows, panelCount, preferredLayout, minPanelWidth, minPanelHeight, statusBarHeight]);
}