import React from 'react';
import { Box } from 'ink';
import { ConfigurationPanelData } from './components/ConfigurationPanelData';
import { StatusPanelData } from './components/StatusPanelData';
import { LayoutContainer } from './components/LayoutContainer';
import { useTerminalSize } from './hooks/useTerminalSize';
import { useNavigationContext } from './contexts/NavigationContext';

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