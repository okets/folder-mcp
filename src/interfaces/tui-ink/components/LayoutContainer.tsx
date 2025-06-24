import React from 'react';
import { Box } from 'ink';

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
                {children.map((child, index) => (
                    <Box key={index} height={heights[index]} width={availableWidth}>
                        {React.cloneElement(child, {
                            height: heights[index],
                            width: availableWidth
                        })}
                    </Box>
                ))}
            </Box>
        );
    } else {
        // Wide layout: Panels side-by-side
        // For wide mode, allocate width proportionally
        // Currently mimics the 70%/30% split for 2 panels
        const widths = children.length === 2
            ? [
                Math.floor(availableWidth * 0.7), // First panel gets 70%
                Math.floor(availableWidth * 0.3)  // Second panel gets 30%
              ]
            : children.map(() => Math.floor(availableWidth / children.length));
        
        return (
            <Box height={availableHeight} width={availableWidth}>
                {children.map((child, index) => (
                    <Box key={index} width={widths[index]} height={availableHeight}>
                        {React.cloneElement(child, {
                            height: availableHeight,
                            width: widths[index]
                        })}
                    </Box>
                ))}
            </Box>
        );
    }
};