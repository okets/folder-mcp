import React from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { Header } from './components/Header.js';
import { StatusBar } from './components/StatusBar.js';
import { theme } from './utils/theme.js';
import { useNavigation } from './hooks/useNavigation.js';
import { useTerminalSize } from './hooks/useTerminalSize.js';

// Sample data
const configItems = [
    'Create optimized configuration for my machine',
    'Manual configuration wizard',
    'Load existing configuration',
    'Select embedding model',
    'Configure cache directory',
    'Set memory limits',
    'Enable debug logging',
    'Configure network timeouts',
    'Export current configuration',
    'Reset to factory defaults',
    'Run configuration wizard',
    'Validate current configuration',
    'Import settings from file',
    'Export settings to file',
    'Reset individual settings',
    'Backup current configuration',
    'Restore from backup',
    'View configuration history',
    'Compare configurations',
    'Merge configuration files'
];

const statusItems = [
    { text: 'System components loaded', status: '✓' },
    { text: 'Checking cached configuration', status: '⋯' },
    { text: 'Loading default settings', status: '' },
    { text: 'Validating embedding models', status: '⚠' },
    { text: 'Memory usage: 1.2GB / 8GB', status: '✓' },
    { text: 'Cache size: 456MB', status: '' },
    { text: 'Indexed files: 1,234', status: '✓' },
    { text: 'Last sync: 2 minutes ago', status: '' },
    { text: 'Network: Connected', status: '✓' },
    { text: 'Embedding model: Nomic-1.5', status: '' },
    { text: 'Processing queue: Empty', status: '✓' },
    { text: 'Error count: 0', status: '✓' },
    { text: 'CPU usage: 15%', status: '' },
    { text: 'Disk I/O: Normal', status: '✓' },
    { text: 'Config version: 1.0.0', status: '' },
    { text: 'Auto-save: Enabled', status: '✓' },
    { text: 'Backup status: Current', status: '✓' },
    { text: 'Updates: Available', status: '⚠' },
    { text: 'License: Valid', status: '✓' },
    { text: 'Plugins: 3 active', status: '' }
];

export const AppSimple: React.FC = () => {
    const { exit } = useApp();
    const navigation = useNavigation();
    const { columns, rows, isNarrow } = useTerminalSize();
    
    useInput((input) => {
        if (input === 'q') {
            exit();
        }
    });
    
    // Calculate layout dimensions
    const headerHeight = 3;
    const statusBarHeight = 3;
    const contentHeight = rows - headerHeight - statusBarHeight;
    
    // Helper to render config box
    const renderConfigBox = (width: string | number, height: number) => {
        // Box overhead: title(1) + subtitle(1) + marginTop(1) + borders(1) = 4 (optimized)
        const boxOverhead = 4;
        const maxItems = Math.max(1, height - boxOverhead);
        const visibleItems = configItems.length > maxItems ? maxItems - 1 : maxItems; // Reserve line for "more" if needed
        // Calculate scroll offset to keep selected item visible
        let scrollOffset = 0;
        if (navigation.configSelectedIndex >= visibleItems) {
            scrollOffset = navigation.configSelectedIndex - visibleItems + 1;
        }
        const visibleConfigItems = configItems.slice(scrollOffset, scrollOffset + visibleItems);
        const remaining = configItems.length - scrollOffset - visibleItems;
        
        return (
            <Box 
                width={width}
                height={height}
                borderStyle="round" 
                borderColor={navigation.isConfigFocused ? theme.colors.borderFocus : theme.colors.border} 
                paddingX={1}
                flexDirection="column"
            >
                {navigation.isConfigFocused ? (
                            <Text>Configuration</Text>
                        ) : (
                            <Box flexDirection="row" justifyContent="space-between">
                                <Text>Configuration</Text>
                                <Text color={theme.colors.textMuted}>⁽ᵗᵃᵇ⁾</Text>
                            </Box>
                        )}
                <Text color={theme.colors.textMuted}>Setup your folder-mcp server</Text>
                <Box flexDirection="column" marginTop={1}>
                    {visibleConfigItems.map((item, visualIndex) => {
                        const actualIndex = scrollOffset + visualIndex;
                        return (
                            <Text key={`config-${actualIndex}`}>
                                <Text color={navigation.isConfigFocused && navigation.configSelectedIndex === actualIndex ? theme.colors.accent : undefined}>
                                    {navigation.isConfigFocused && navigation.configSelectedIndex === actualIndex ? '▶' : '○'} </Text>
                                <Text>{item}</Text>
                            </Text>
                        );
                    })}
                    {remaining > 0 && (
                        <Text color={theme.colors.textMuted}>
                            <Text>↓ </Text>
                            <Text>{remaining} more</Text>
                        </Text>
                    )}
                </Box>
            </Box>
        );
    };
    
    // Helper to render status box
    const renderStatusBox = (width: string | number, height: number) => {
        // Box overhead: title(1) + subtitle(1) + marginTop(1) + borders(1) = 4 (optimized)
        const boxOverhead = 4;
        const maxItems = Math.max(1, height - boxOverhead);
        const visibleItems = statusItems.length > maxItems ? maxItems - 1 : maxItems; // Reserve line for "more" if needed
        // Calculate scroll offset to keep selected item visible
        let scrollOffset = 0;
        if (navigation.statusSelectedIndex >= visibleItems) {
            scrollOffset = navigation.statusSelectedIndex - visibleItems + 1;
        }
        const visibleStatusItems = statusItems.slice(scrollOffset, scrollOffset + visibleItems);
        const remaining = statusItems.length - scrollOffset - visibleItems;
        
        return (
            <Box 
                width={width}
                height={height}
                borderStyle="round" 
                borderColor={navigation.isStatusFocused ? theme.colors.borderFocus : theme.colors.border} 
                paddingX={1}
                flexDirection="column"
            >
                {navigation.isStatusFocused ? (
                            <Text>System Status</Text>
                        ) : (
                            <Box flexDirection="row" justifyContent="space-between">
                                <Text>System Status</Text>
                                <Text color={theme.colors.textMuted}>⁽ᵗᵃᵇ⁾</Text>
                            </Box>
                        )}
                <Text color={theme.colors.textMuted}>Current state</Text>
                <Box flexDirection="column" marginTop={1}>
                    {visibleStatusItems.map((item, visualIndex) => {
                        const actualIndex = scrollOffset + visualIndex;
                        const statusColor = item.status === '✓' ? theme.colors.successGreen :
                                          item.status === '⚠' ? theme.colors.warningOrange :
                                          item.status === '⋯' ? theme.colors.accent : undefined;
                        return (
                            <Text key={`status-${actualIndex}`}>
                                <Text color={navigation.isStatusFocused && navigation.statusSelectedIndex === actualIndex ? theme.colors.accent : undefined}>
                                    {navigation.isStatusFocused && navigation.statusSelectedIndex === actualIndex ? '▶' : '○'} </Text>
                                <Text>{item.text}</Text>
                                {item.status && (
                                    <>
                                        <Text> </Text>
                                        <Text color={statusColor}>{item.status}</Text>
                                    </>
                                )}
                            </Text>
                        );
                    })}
                    {remaining > 0 && (
                        <Text color={theme.colors.textMuted}>
                            <Text>↓ </Text>
                            <Text>{remaining} more</Text>
                        </Text>
                    )}
                </Box>
            </Box>
        );
    };
    
    if (isNarrow) {
        // Portrait mode - vertical stack
        const configHeight = Math.floor(contentHeight * 0.8);
        const statusHeight = contentHeight - configHeight;
        
        return (
            <Box flexDirection="column">
                <Header />
                <Box flexDirection="column" height={contentHeight}>
                    {renderConfigBox('100%', configHeight)}
                    {renderStatusBox('100%', statusHeight)}
                </Box>
                <StatusBar />
            </Box>
        );
    }
    
    // Landscape mode - side by side
    return (
        <Box flexDirection="column">
            <Header />
            <Box flexDirection="row" height={contentHeight}>
                {renderConfigBox('80%', contentHeight)}
                {renderStatusBox('20%', contentHeight)}
            </Box>
            <StatusBar />
        </Box>
    );
};