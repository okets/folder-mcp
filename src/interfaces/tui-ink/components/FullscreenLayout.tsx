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
        // Use flexbox for better height distribution
        return (
            <Box flexDirection="column" width={columns} height="100%">
                <Box flexGrow={4} width={columns}>{configChild}</Box>
                <Box flexGrow={1} width={columns}>{statusChild}</Box>
            </Box>
        );
    }
    
    // Landscape mode - side by side
    return (
        <Box width={columns} height="100%">
            <Box width={configWidth} height="100%">{configChild}</Box>
            <Box width={statusWidth} height="100%">{statusChild}</Box>
        </Box>
    );
};