import React from 'react';
import { Box } from 'ink';
import { useTerminalSize } from '../hooks/useTerminalSize.js';

interface FullscreenLayoutProps {
    children: [React.ReactNode, React.ReactNode]; // [config, status]
}

export const FullscreenLayout: React.FC<FullscreenLayoutProps> = ({ children }) => {
    const { columns, rows, isNarrow } = useTerminalSize();
    
    const [configChild, statusChild] = children;
    
    // Calculate dimensions
    const configWidth = Math.floor(columns * 0.8);
    const statusWidth = columns - configWidth;
    
    if (isNarrow) {
        // Portrait mode - stack vertically
        const availableHeight = rows - 6; // header + status bar
        const configHeight = Math.floor(availableHeight * 0.8);
        const statusHeight = availableHeight - configHeight;
        
        return (
            <Box flexDirection="column" width={columns}>
                <Box height={configHeight}>{configChild}</Box>
                <Box height={statusHeight}>{statusChild}</Box>
            </Box>
        );
    }
    
    // Landscape mode - side by side
    return (
        <Box width={columns}>
            <Box width={configWidth}>{configChild}</Box>
            <Box width={statusWidth}>{statusChild}</Box>
        </Box>
    );
};