import React from 'react';
import { Box } from 'ink';
import { ConfigurationPanelData } from './components/ConfigurationPanelData.js';
import { StatusPanelData } from './components/StatusPanelData.js';
import { LayoutContainer } from './components/LayoutContainer.js';
import { useTerminalSize } from './hooks/useTerminalSize.js';
import { useNavigationContext } from './contexts/NavigationContext.js';

/**
 * Main app using generic panels
 * This demonstrates that all panels now use the unified architecture
 */
export const AppGeneric: React.FC = () => {
    const { columns, rows } = useTerminalSize();
    const navigation = useNavigationContext();
    
    // Configuration for each panel
    const configPanelProps = {
        width: Math.floor(columns / 2) - 1,
        height: rows - 4
    };
    
    const statusPanelProps = {
        width: Math.floor(columns / 2) - 1,
        height: rows - 4
    };
    
    return (
        <Box flexDirection="column" height={rows}>
            <LayoutContainer>
                <ConfigurationPanelData {...configPanelProps} />
                <StatusPanelData {...statusPanelProps} />
            </LayoutContainer>
            
            {/* Status bar */}
            <Box height={1} justifyContent="center">
                <Text color="gray">
                    Tab to switch panels | ↑↓ to navigate | q to quit
                </Text>
            </Box>
        </Box>
    );
};

// Import Text
import { Text } from 'ink';