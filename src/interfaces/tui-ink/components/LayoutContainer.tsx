import React from 'react';
import { Box, Text } from 'ink';
import { LayoutConstraintProvider } from '../contexts/LayoutContext';
import { ILayoutConstraints } from '../models/types';
import { MINIMUM_TERMINAL_WIDTH, MINIMUM_TERMINAL_HEIGHT } from '../utils/terminalConstraints';
// WINDOWS FIX: Removed DebugService imports to prevent render-time console.error calls
// Removed useNavigationContext import to prevent re-renders

interface LayoutContainerProps {
    availableHeight: number;
    availableWidth: number;
    children: React.ReactElement[];
    narrowBreakpoint?: number;
    isMainFocused?: boolean; // Pass as prop instead of using context
}

export const LayoutContainer: React.FC<LayoutContainerProps> = React.memo(({
    availableHeight,
    availableWidth,
    children,
    narrowBreakpoint = 100,
    isMainFocused = true
}) => {
    // Protect against invalid dimensions that cause Yoga layout engine issues
    // Yoga layout engine can freeze with extremely small dimensions
    const safeWidth = Math.max(availableWidth, MINIMUM_TERMINAL_WIDTH);
    const safeHeight = Math.max(availableHeight, MINIMUM_TERMINAL_HEIGHT);

    // Remove navigation context usage to prevent re-renders
    const isNarrow = safeWidth < narrowBreakpoint;
    const isLowVerticalResolution = safeHeight < 20;
    const isExtremelyLowVerticalResolution = safeHeight < 13;

    // WINDOWS FIX: Removed render-time debug logging to prevent ANSI packet fragmentation
    // Debug logging during render cycle causes Windows terminal flickering
    
    if (isNarrow) {
        // Narrow layout: Stack panels vertically
        // Calculate heights for each panel
        const panelCount = children.length;
        
        // Check if we're in low vertical resolution mode
        let heights: number[];
        if (isExtremelyLowVerticalResolution && panelCount === 2) {
            // Extremely low resolution: show frame only for inactive panel, full content for active
            const FRAME_ONLY_HEIGHT = 2; // Just borders touching (top + bottom)
            const activeHeight = safeHeight - FRAME_ONLY_HEIGHT;

            if (isMainFocused) {
                heights = [activeHeight, FRAME_ONLY_HEIGHT];
            } else {
                heights = [FRAME_ONLY_HEIGHT, activeHeight];
            }
        } else if (isLowVerticalResolution && panelCount === 2) {
            // In low resolution, minimize inactive panel with message
            const MINIMIZED_HEIGHT = 3; // 1 content line + 2 borders for message
            const activeHeight = safeHeight - MINIMIZED_HEIGHT;

            // Determine which panel is active
            if (isMainFocused) {
                heights = [activeHeight, MINIMIZED_HEIGHT];
            } else {
                heights = [MINIMIZED_HEIGHT, activeHeight];
            }
        } else {
            // Normal narrow mode: Use 70%/30% split
            heights = panelCount === 2
                ? (() => {
                    const firstHeight = Math.floor(safeHeight * 0.7);
                    const secondHeight = safeHeight - firstHeight;
                    return [firstHeight, secondHeight];
                  })()
                : children.map(() => Math.floor(safeHeight / panelCount));
        }

        return (
            <Box flexDirection="column" height={safeHeight} width={safeWidth}>
                {children.map((child, index) => {

                    const constraints: ILayoutConstraints = {
                        maxWidth: safeWidth,
                        maxHeight: heights[index] ?? safeHeight,
                        overflow: 'truncate'
                    };
                    
                    // Check if this panel is minimized in low resolution mode (but not extremely low)
                    const isMinimized = isLowVerticalResolution && !isExtremelyLowVerticalResolution && panelCount === 2 && (
                        (index === 0 && !isMainFocused) ||
                        (index === 1 && isMainFocused)
                    );
                    
                    // Check if this panel should show frame only (extremely low resolution, inactive panel)
                    const isFrameOnly = isExtremelyLowVerticalResolution && panelCount === 2 && (
                        (index === 0 && !isMainFocused) ||
                        (index === 1 && isMainFocused)
                    );
                    
                    const layoutKey = `layout-narrow-${index}`;
                    return (
                        <LayoutConstraintProvider key={layoutKey} constraints={constraints}>
                            <Box height={heights[index]} width={safeWidth}>
                                {React.cloneElement(child as React.ReactElement<any>, {
                                    height: heights[index],
                                    width: safeWidth,
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
                const firstWidth = Math.floor(safeWidth * 0.7);
                const secondWidth = safeWidth - firstWidth; // Ensure no rounding errors
                return [firstWidth, secondWidth];
              })()
            : (() => {
                // Distribute width evenly, accounting for rounding
                const baseWidth = Math.floor(safeWidth / children.length);
                const remainder = safeWidth - (baseWidth * children.length);
                return children.map((_, index) =>
                    index < remainder ? baseWidth + 1 : baseWidth
                );
              })();

        return (
            <Box height={safeHeight} width={safeWidth} flexDirection="row" flexWrap="nowrap" alignItems="flex-start">
                {children.map((child, index) => {
                    const constraints: ILayoutConstraints = {
                        maxWidth: widths[index] ?? safeWidth,
                        maxHeight: safeHeight,
                        overflow: 'truncate'
                    };

                    const layoutKey = `layout-wide-${index}`;
                    return (
                        <LayoutConstraintProvider key={layoutKey} constraints={constraints}>
                            <Box width={widths[index]} height={safeHeight} flexShrink={0}>
                                {React.cloneElement(child as React.ReactElement<any>, {
                                    height: safeHeight,
                                    width: widths[index]
                                })}
                            </Box>
                        </LayoutConstraintProvider>
                    );
                })}
            </Box>
        );
    }
});