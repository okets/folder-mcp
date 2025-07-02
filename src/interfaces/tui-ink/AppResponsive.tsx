import React from 'react';
import { Box, Text } from 'ink';
import { ConfigurationPanelData } from './components/ConfigurationPanelData';
import { StatusPanelData } from './components/StatusPanelData';
import { useResponsiveLayout } from './hooks/useResponsiveLayout';
import { useNavigationContext } from './contexts/NavigationContext';

/**
 * Responsive TUI app that adapts to terminal size
 * Demonstrates the new layout service capabilities
 */
export const AppResponsive: React.FC = () => {
    const navigation = useNavigationContext();
    
    // Get responsive layout configuration
    const { layout, panelLayout, config } = useResponsiveLayout({
        panelCount: 2,
        preferredLayout: 'auto',
        minPanelWidth: 40,
        minPanelHeight: 10,
        statusBarHeight: 3
    });
    
    // Get panel dimensions
    const [configPanelDimensions, statusPanelDimensions] = panelLayout.panels;
    
    // Render panels based on layout
    const renderPanels = () => {
        const panels = (
            <>
                <ConfigurationPanelData 
                    width={configPanelDimensions.width}
                    height={configPanelDimensions.height}
                />
                <StatusPanelData 
                    width={statusPanelDimensions.width}
                    height={statusPanelDimensions.height}
                />
            </>
        );
        
        if (layout === 'horizontal') {
            return (
                <Box flexDirection="row" gap={panelLayout.gap}>
                    {panels}
                </Box>
            );
        } else {
            return (
                <Box flexDirection="column" gap={panelLayout.gap}>
                    {panels}
                </Box>
            );
        }
    };
    
    return (
        <Box flexDirection="column" height={panelLayout.container.height + 3}>
            {/* Main content */}
            <Box flexGrow={1}>
                {renderPanels()}
            </Box>
            
            {/* Status bar */}
            <Box height={2} flexDirection="column" borderStyle="single" borderColor="gray">
                <Box justifyContent="space-between" paddingX={1}>
                    <Text color="gray">
                        Tab: Switch panels | ↑↓: Navigate | q: Quit
                    </Text>
                    <Text color="gray">
                        Layout: {layout} | {config.showSubtitles ? 'Full' : 'Compact'} mode
                    </Text>
                </Box>
            </Box>
        </Box>
    );
};