import React from 'react';
import { Box } from 'ink';
import { LayoutConstraintProvider } from '../contexts/LayoutContext.js';
import { ILayoutConstraints } from '../models/types.js';

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
    const isNarrow = availableWidth < narrowBreakpoint;
    
    if (isNarrow) {
        // Narrow layout: Stack panels vertically
        // Calculate heights for each panel
        const panelCount = children.length;
        
        // For narrow mode, allocate space proportionally
        // Currently mimics the 65%/35% split for 2 panels
        const heights = panelCount === 2 
            ? [
                Math.floor(availableHeight * 0.65), // First panel gets 65%
                Math.floor(availableHeight * 0.35)  // Second panel gets 35%
              ]
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
                        <LayoutConstraintProvider key={index} constraints={constraints}>
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
            <Box height={availableHeight} width={availableWidth}>
                {children.map((child, index) => {
                    const constraints: ILayoutConstraints = {
                        maxWidth: widths[index],
                        maxHeight: availableHeight,
                        overflow: 'truncate'
                    };
                    
                    return (
                        <LayoutConstraintProvider key={index} constraints={constraints}>
                            <Box width={widths[index]} height={availableHeight}>
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