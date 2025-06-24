import React from 'react';
import { Box, useApp, useInput } from 'ink';
import { Header } from './components/Header.js';
import { StatusBar } from './components/StatusBar.js';
import { LayoutContainer } from './components/LayoutContainer.js';
import { ConfigurationPanel } from './components/ConfigurationPanel.js';
import { StatusPanel } from './components/StatusPanel.js';
import { useTerminalSize } from './hooks/useTerminalSize.js';

export const AppFullscreen: React.FC = () => {
    const { exit } = useApp();
    const { columns, rows } = useTerminalSize();
    
    useInput((input) => {
        if (input === 'q') {
            exit();
        }
    });
    
    // Fixed height calculations (accounting for header margin)
    const HEADER_HEIGHT = 4; // 3 lines + 1 margin
    const STATUS_BAR_HEIGHT = 3; // border + content + border
    const availableHeight = rows - HEADER_HEIGHT - STATUS_BAR_HEIGHT;
    
    return (
        <Box flexDirection="column" height={rows} width={columns}>
            <Header />
            
            <LayoutContainer
                availableHeight={availableHeight}
                availableWidth={columns}
                narrowBreakpoint={100}
            >
                <ConfigurationPanel />
                <StatusPanel />
            </LayoutContainer>
            
            <StatusBar />
        </Box>
    );
};