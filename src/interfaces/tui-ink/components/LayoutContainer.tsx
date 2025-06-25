import React from 'react';
import { Box, Text } from 'ink';
import { LayoutConstraintProvider } from '../contexts/LayoutContext.js';
import { ILayoutConstraints } from '../models/types.js';
import { useDI } from '../di/DIContext.js';
import { ServiceTokens } from '../di/tokens.js';

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
    const isNarrow = availableWidth < narrowBreakpoint;
    
    // Log layout decisions in debug mode
    if (debugService.isEnabled()) {
        debugService.logLayout('LayoutContainer', { width: availableWidth, height: availableHeight });
        debugService.log('LayoutContainer', `Mode: ${isNarrow ? 'narrow' : 'wide'}`);
    }
    
    if (isNarrow) {
        // Narrow layout: Stack panels vertically
        // Calculate heights for each panel
        const panelCount = children.length;
        
        // For narrow mode, allocate space proportionally
        // Currently mimics the 65%/35% split for 2 panels
        const heights = panelCount === 2 
            ? (() => {
                const firstHeight = Math.floor(availableHeight * 0.65);
                const secondHeight = availableHeight - firstHeight; // Use remaining space
                return [firstHeight, secondHeight];
              })()
            : children.map(() => Math.floor(availableHeight / panelCount));
        
        return (
            <Box flexDirection="column" height={availableHeight} width={availableWidth}>
                {children.map((child, index) => {
                    const constraints: ILayoutConstraints = {
                        maxWidth: availableWidth,
                        maxHeight: heights[index],
                        overflow: 'truncate'
                    };
                    
                    return (
                        <LayoutConstraintProvider key={`layout-narrow-${index}`} constraints={constraints}>
                            <Box height={heights[index]} width={availableWidth}>
                                {React.cloneElement(child, {
                                    height: heights[index],
                                    width: availableWidth
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
        // Subtract 1 for safety margin to prevent edge case overflow
        const safeWidth = availableWidth - 1;
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
            <Box height={availableHeight} width={availableWidth} flexDirection="row" flexWrap="nowrap" alignItems="flex-start">
                {children.map((child, index) => {
                    const constraints: ILayoutConstraints = {
                        maxWidth: widths[index],
                        maxHeight: availableHeight,
                        overflow: 'truncate'
                    };
                    
                    return (
                        <LayoutConstraintProvider key={`layout-wide-${index}`} constraints={constraints}>
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