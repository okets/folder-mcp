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
        const visibleItems = Math.max(1, height - 4); // account for border and title
        const visibleConfigItems = configItems.slice(0, visibleItems);
        const remaining = configItems.length - visibleItems;
        
        return (
            <Box 
                width={width}
                height={height}
                borderStyle="round" 
                borderColor={navigation.isConfigFocused ? theme.colors.borderFocus : theme.colors.border} 
                paddingX={1}
                flexDirection="column"
            >
                <Text>Configuration {navigation.isConfigFocused ? '⁽ᶠᵒᶜᵘˢᵉᵈ⁾' : 'ᵗᵃᵇ'}</Text>
                <Text color={theme.colors.textMuted}>Setup your folder-mcp server</Text>
                <Box flexDirection="column" marginTop={1}>
                    {visibleConfigItems.map((item, index) => (
                        <Text key={`config-${index}`}>
                            <Text>{navigation.isConfigFocused && navigation.configSelectedIndex === index ? '▶' : '○'} </Text>
                            <Text>{item}</Text>
                        </Text>
                    ))}
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
        const visibleItems = Math.max(1, height - 4); // account for border and title
        const visibleStatusItems = statusItems.slice(0, visibleItems);
        const remaining = statusItems.length - visibleItems;
        
        return (
            <Box 
                width={width}
                height={height}
                borderStyle="round" 
                borderColor={navigation.isStatusFocused ? theme.colors.borderFocus : theme.colors.border} 
                paddingX={1}
                flexDirection="column"
            >
                <Text>System Status {navigation.isStatusFocused ? '⁽ᶠᵒᶜᵘˢᵉᵈ⁾' : 'ᵗᵃᵇ'}</Text>
                <Text color={theme.colors.textMuted}>Current state</Text>
                <Box flexDirection="column" marginTop={1}>
                    {visibleStatusItems.map((item, idx) => {
                        const statusColor = item.status === '✓' ? theme.colors.successGreen :
                                          item.status === '⚠' ? theme.colors.warningOrange :
                                          item.status === '⋯' ? theme.colors.accent : undefined;
                        return (
                            <Text key={`status-${idx}`}>
                                <Text>{navigation.isStatusFocused && navigation.statusSelectedIndex === idx ? '▶' : '○'} </Text>
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