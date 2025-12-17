import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from './contexts/ThemeContext';
import { ThemedMainPanel, ThemedSecondaryPanel } from './components/core/ThemedPanel';
import { useResponsiveLayout } from './hooks/useResponsiveLayout';
import { NavigationProvider, useNavigationContext } from './contexts/NavigationContext';
import { AnimationProvider } from './contexts/AnimationContext';
import { configItems } from './models/sampleData';
import { statusItems } from './models/sampleData';

/**
 * Main app content with themed panels
 */
const ThemedAppContent: React.FC = () => {
    const navigation = useNavigationContext();
    const { theme } = useTheme();
    
    // Get responsive layout
    const { layout, panelLayout } = useResponsiveLayout({
        panelCount: 2,
        preferredLayout: 'auto',
        minPanelWidth: 40,
        minPanelHeight: 10,
        statusBarHeight: 4
    });
    
    const configPanelDimensions = panelLayout.panels[0];
    const statusPanelDimensions = panelLayout.panels[1];
    
    // Render panels
    const renderPanels = () => {
        if (!configPanelDimensions || !statusPanelDimensions) {
            return <Text>Loading layout...</Text>;
        }
        
        const panels = (
            <>
                <ThemedMainPanel
                    width={configPanelDimensions.width}
                    height={configPanelDimensions.height}
                />
                <ThemedSecondaryPanel
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
        <Box flexDirection="column" height={panelLayout.container.height + 4}>
            {/* Main content */}
            <Box flexGrow={1}>
                {renderPanels()}
            </Box>
            
            {/* Status bar */}
            <Box 
                height={3} 
                flexDirection="column" 
                borderStyle="single" 
                borderColor={theme.colors.border}
                paddingX={1}
            >
                <Box justifyContent="space-between">
                    <Text color={theme.colors.textMuted}>
                        Tab: Switch panels | ↑↓: Navigate | Esc: Exit
                    </Text>
                </Box>
                <Text color={theme.colors.textMuted}>
                    Layout: {layout} | Active: {navigation.isMainFocused ? 'Main' : 'Status'}
                </Text>
            </Box>
        </Box>
    );
};

/**
 * Themed TUI app demonstrating theme support
 */
export const AppThemed: React.FC = () => {
    // Theme is now provided by parent ConfigurationThemeProvider
    return (
        <AnimationProvider>
            <NavigationProvider 
                isBlocked={false} 
                configItemCount={configItems.length} 
                statusItemCount={statusItems.length}
            >
                <ThemedAppContent />
            </NavigationProvider>
        </AnimationProvider>
    );
};