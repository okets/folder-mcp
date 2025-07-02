import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { ThemeProvider, themes, ThemeName, useTheme } from './contexts/ThemeContext';
import { ThemedConfigurationPanel, ThemedStatusPanel } from './components/core/ThemedPanel';
import { useResponsiveLayout } from './hooks/useResponsiveLayout';
import { useNavigationContext } from './contexts/NavigationContext';
import { configItems } from './models/sampleData';
import { statusItems } from './models/sampleData';

/**
 * Theme switcher component
 */
const ThemeSwitcher: React.FC = () => {
    const { theme, themeName, setTheme } = useTheme();
    const themeNames = Object.keys(themes) as ThemeName[];
    const currentIndex = themeNames.indexOf(themeName);
    
    useInput((input, key) => {
        if (input === 't' || input === 'T') {
            // Cycle through themes
            const nextIndex = (currentIndex + 1) % themeNames.length;
            setTheme(themeNames[nextIndex]);
        }
    });
    
    return (
        <Box>
            <Text color={theme.colors.textMuted}>
                Theme: <Text color={theme.colors.accent}>{theme.name}</Text> (press 't' to switch)
            </Text>
        </Box>
    );
};

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
    
    const [configPanelDimensions, statusPanelDimensions] = panelLayout.panels;
    
    // Render panels
    const renderPanels = () => {
        const panels = (
            <>
                <ThemedConfigurationPanel
                    items={configItems}
                    activeIndex={navigation.configSelectedIndex}
                    focused={navigation.isConfigFocused}
                    width={configPanelDimensions.width}
                    height={configPanelDimensions.height}
                />
                <ThemedStatusPanel
                    items={statusItems}
                    activeIndex={navigation.statusSelectedIndex}
                    focused={navigation.isStatusFocused}
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
                        Tab: Switch panels | ↑↓: Navigate | q: Quit
                    </Text>
                    <ThemeSwitcher />
                </Box>
                <Text color={theme.colors.textMuted}>
                    Layout: {layout} | Active: {navigation.isConfigFocused ? 'Config' : 'Status'}
                </Text>
            </Box>
        </Box>
    );
};

/**
 * Themed TUI app demonstrating theme support
 */
export const AppThemed: React.FC = () => {
    const [currentTheme, setCurrentTheme] = useState<ThemeName>('default');
    
    return (
        <ThemeProvider initialTheme={currentTheme}>
            <ThemedAppContent />
        </ThemeProvider>
    );
};