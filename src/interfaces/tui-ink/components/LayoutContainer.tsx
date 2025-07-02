import React from 'react';
import { Box, Text } from 'ink';
import { LayoutConstraintProvider } from '../contexts/LayoutContext.js';
import { ILayoutConstraints } from '../models/types.js';
import { useDI } from '../di/DIContext.js';
import { ServiceTokens } from '../di/tokens.js';
import { useNavigationContext } from '../contexts/NavigationContext.js';

interface LayoutContainerProps {
    availableHeight: number;
    availableWidth: number;
    children: React.ReactElement[];
    narrowBreakpoint?: number;
}

export const LayoutContainer: React.FC<LayoutContainerProps> = ({
    availableHeight,
    availableWidth,
    children,
    narrowBreakpoint = 100
}) => {
    const di = useDI();
    const debugService = di.resolve(ServiceTokens.DebugService);
    const navigation = useNavigationContext();
    const isNarrow = availableWidth < narrowBreakpoint;
    const isLowVerticalResolution = availableHeight < 20;
    const isExtremelyLowVerticalResolution = availableHeight < 13;
    
    // Log layout decisions in debug mode
    if (debugService.isEnabled()) {
        debugService.logLayout('LayoutContainer', { width: availableWidth, height: availableHeight });
        debugService.log('LayoutContainer', `Mode: ${isNarrow ? 'narrow' : 'wide'}`);
    }
    
    if (isNarrow) {
        // Narrow layout: Stack panels vertically
        // Calculate heights for each panel
        const panelCount = children.length;
        
        // Check if we're in low vertical resolution mode
        let heights: number[];
        if (isExtremelyLowVerticalResolution && panelCount === 2) {
            // Extremely low resolution: show frame only for inactive panel, full content for active
            const FRAME_ONLY_HEIGHT = 2; // Just borders touching (top + bottom)
            const activeHeight = availableHeight - FRAME_ONLY_HEIGHT;
            
            if (navigation.isConfigFocused) {
                heights = [activeHeight, FRAME_ONLY_HEIGHT];
            } else {
                heights = [FRAME_ONLY_HEIGHT, activeHeight];
            }
        } else if (isLowVerticalResolution && panelCount === 2) {
            // In low resolution, minimize inactive panel with message
            const MINIMIZED_HEIGHT = 3; // 1 content line + 2 borders for message
            const activeHeight = availableHeight - MINIMIZED_HEIGHT;
            
            // Determine which panel is active
            if (navigation.isConfigFocused) {
                heights = [activeHeight, MINIMIZED_HEIGHT];
            } else {
                heights = [MINIMIZED_HEIGHT, activeHeight];
            }
        } else {
            // Normal narrow mode: Use 70%/30% split
            heights = panelCount === 2 
                ? (() => {
                    const firstHeight = Math.floor(availableHeight * 0.7);
                    const secondHeight = availableHeight - firstHeight;
                    return [firstHeight, secondHeight];
                  })()
                : children.map(() => Math.floor(availableHeight / panelCount));
        }
        
        return (
            <Box flexDirection="column" height={availableHeight} width={availableWidth}>
                {children.map((child, index) => {
                    
                    const constraints: ILayoutConstraints = {
                        maxWidth: availableWidth,
                        maxHeight: heights[index],
                        overflow: 'truncate'
                    };
                    
                    // Check if this panel is minimized in low resolution mode (but not extremely low)
                    const isMinimized = isLowVerticalResolution && !isExtremelyLowVerticalResolution && panelCount === 2 && (
                        (index === 0 && !navigation.isConfigFocused) ||
                        (index === 1 && navigation.isConfigFocused)
                    );
                    
                    // Check if this panel should show frame only (extremely low resolution, inactive panel)
                    const isFrameOnly = isExtremelyLowVerticalResolution && panelCount === 2 && (
                        (index === 0 && !navigation.isConfigFocused) ||
                        (index === 1 && navigation.isConfigFocused)
                    );
                    
                    const layoutKey = `layout-narrow-${index}`;
                    return (
                        <LayoutConstraintProvider key={layoutKey} constraints={constraints}>
                            <Box height={heights[index]} width={availableWidth}>
                                {React.cloneElement(child, {
                                    height: heights[index],
                                    width: availableWidth,
                                    isMinimized,
                                    isFrameOnly
                                })}
                            </Box>
                        </LayoutConstraintProvider>
                    );
                })}
            </Box>
        );
    } else {
        // Wide layout: Panels side-by-side
        // For wide mode, allocate width proportionally
        // Currently mimics the 70%/30% split for 2 panels
        const widths = children.length === 2
            ? (() => {
                const firstWidth = Math.floor(availableWidth * 0.7);
                const secondWidth = availableWidth - firstWidth; // Ensure no rounding errors
                return [firstWidth, secondWidth];
              })()
            : (() => {
                // Distribute width evenly, accounting for rounding
                const baseWidth = Math.floor(availableWidth / children.length);
                const remainder = availableWidth - (baseWidth * children.length);
                return children.map((_, index) => 
                    index < remainder ? baseWidth + 1 : baseWidth
                );
              })();
        
        return (
            <Box height={availableHeight} width={availableWidth} flexDirection="row" flexWrap="nowrap" alignItems="flex-start">
                {children.map((child, index) => {
                    const constraints: ILayoutConstraints = {
                        maxWidth: widths[index],
                        maxHeight: availableHeight,
                        overflow: 'truncate'
                    };
                    
                    const layoutKey = `layout-wide-${index}`;
                    return (
                        <LayoutConstraintProvider key={layoutKey} constraints={constraints}>
                            <Box width={widths[index]} height={availableHeight} flexShrink={0}>
                                {React.cloneElement(child, {
                                    height: availableHeight,
                                    width: widths[index]
                                })}
                            </Box>
                        </LayoutConstraintProvider>
                    );
                })}
            </Box>
        );
    }
};