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
    'Validate current configuration'
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
    { text: 'Config version: 1.0.0', status: '' }
];

export const AppFixed: React.FC = () => {
    const { exit } = useApp();
    const navigation = useNavigation();
    const { isNarrow, rows, columns } = useTerminalSize();
    
    useInput((input) => {
        if (input === 'q') {
            exit();
        }
    });
    
    // Debug info
    if (process.env.DEBUG) {
        console.error(`Terminal: ${columns}x${rows}, isNarrow: ${isNarrow}`);
    }
    
    // Calculate visible items based on container height
    const availableHeight = Math.max(10, rows - 6); // header(3) + statusbar(3)
    const configVisibleItems = Math.min(configItems.length, Math.max(5, availableHeight - 5));
    const statusVisibleItems = Math.min(statusItems.length, Math.max(5, availableHeight - 5));
    
    // Get visible slices
    const configStart = Math.max(0, Math.min(navigation.configSelectedIndex - 2, configItems.length - configVisibleItems));
    const statusStart = Math.max(0, Math.min(navigation.statusSelectedIndex - 2, statusItems.length - statusVisibleItems));
    
    const visibleConfigItems = configItems.slice(configStart, configStart + configVisibleItems);
    const visibleStatusItems = statusItems.slice(statusStart, statusStart + statusVisibleItems);
    
    const configRemaining = configItems.length - configStart - configVisibleItems;
    const statusRemaining = statusItems.length - statusStart - statusVisibleItems;
    
    // Portrait mode heights
    const portraitConfigHeight = Math.floor((rows - 6) * 0.8);
    const portraitStatusHeight = Math.floor((rows - 6) * 0.2);
    
    if (isNarrow) {
        // Portrait mode - stack vertically
        return (
            <Box flexDirection="column" height={rows}>
                <Header />
                
                <Box flexDirection="column" flexGrow={1} gap={0}>
                    {/* Configuration - 80% height */}
                    <Box 
                        height={portraitConfigHeight}
                        borderStyle="round"
                        borderColor={navigation.isConfigFocused ? theme.colors.borderFocus : theme.colors.border}
                        paddingX={1}
                        flexDirection="column"
                    >
                        <Text>{navigation.isConfigFocused ? 'Configuration' : 'Configuration ⁽ᵗᵃᵇ⁾'}</Text>
                        <Text color={theme.colors.textMuted}>Setup your folder-mcp server</Text>
                        <Box marginTop={1} flexDirection="column" flexGrow={1}>
                            {visibleConfigItems.map((item, index) => {
                                const globalIndex = configStart + index;
                                const isSelected = navigation.isConfigFocused && navigation.configSelectedIndex === globalIndex;
                                return (
                                    <Text key={globalIndex}>
                                        {isSelected ? '▶' : '○'} {item}
                                    </Text>
                                );
                            })}
                            {configRemaining > 0 && (
                                <Text color={theme.colors.textMuted}>↓ {configRemaining} more</Text>
                            )}
                        </Box>
                    </Box>
                    
                    {/* Status - 20% height */}
                    <Box 
                        height={portraitStatusHeight}
                        borderStyle="round"
                        borderColor={navigation.isStatusFocused ? theme.colors.borderFocus : theme.colors.border}
                        paddingX={1}
                        flexDirection="column"
                    >
                        <Text>{navigation.isStatusFocused ? 'System Status' : 'System Status ⁽ᵗᵃᵇ⁾'}</Text>
                        <Text color={theme.colors.textMuted}>Current state</Text>
                        <Box flexDirection="column" marginTop={1}>
                            {statusItems.slice(0, Math.max(1, portraitStatusHeight - 4)).map((item, index) => {
                                const isSelected = navigation.isStatusFocused && navigation.statusSelectedIndex === index;
                                const statusColor = item.status === '✓' ? theme.colors.successGreen :
                                                  item.status === '⚠' ? theme.colors.warningOrange :
                                                  item.status === '⋯' ? theme.colors.accent : undefined;
                                return (
                                    <Text key={index}>
                                        {isSelected ? '▶' : '○'} {item.text}
                                        {item.status && (
                                            <Text color={statusColor}> {item.status}</Text>
                                        )}
                                    </Text>
                                );
                            })}
                            {statusItems.length > portraitStatusHeight - 4 && (
                                <Text color={theme.colors.textMuted}>↓ {statusItems.length - (portraitStatusHeight - 4)} more</Text>
                            )}
                        </Box>
                    </Box>
                </Box>
                
                <StatusBar />
            </Box>
        );
    }
    
    // Landscape mode - side by side
    return (
        <Box flexDirection="column" height={rows}>
            <Header />
            
            <Box flexGrow={1} flexDirection="row">
                {/* Configuration - 80% */}
                <Box 
                    width="80%"
                    borderStyle="round"
                    borderColor={navigation.isConfigFocused ? theme.colors.borderFocus : theme.colors.border}
                    paddingX={1}
                    flexDirection="column"
                >
                    <Text>{navigation.isConfigFocused ? 'Configuration' : 'Configuration ⁽ᵗᵃᵇ⁾'}</Text>
                    <Text color={theme.colors.textMuted}>Setup your folder-mcp server</Text>
                    <Box marginTop={1} flexDirection="column">
                        {visibleConfigItems.map((item, index) => {
                            const globalIndex = configStart + index;
                            const isSelected = navigation.isConfigFocused && navigation.configSelectedIndex === globalIndex;
                            return (
                                <Text key={globalIndex}>
                                    {isSelected ? '▶' : '○'} {item}
                                </Text>
                            );
                        })}
                        {configRemaining > 0 && (
                            <Text color={theme.colors.textMuted}>↓ {configRemaining} more</Text>
                        )}
                    </Box>
                </Box>
                
                {/* Status - 20% */}
                <Box 
                    width="20%"
                    borderStyle="round"
                    borderColor={navigation.isStatusFocused ? theme.colors.borderFocus : theme.colors.border}
                    paddingX={1}
                    flexDirection="column"
                >
                    <Text>{navigation.isStatusFocused ? 'System Status' : 'System Status ⁽ᵗᵃᵇ⁾'}</Text>
                    <Text color={theme.colors.textMuted}>Current state</Text>
                    <Box marginTop={1} flexDirection="column">
                        {visibleStatusItems.map((item, index) => {
                            const globalIndex = statusStart + index;
                            const isSelected = navigation.isStatusFocused && navigation.statusSelectedIndex === globalIndex;
                            const statusColor = item.status === '✓' ? theme.colors.successGreen :
                                              item.status === '⚠' ? theme.colors.warningOrange :
                                              item.status === '⋯' ? theme.colors.accent : undefined;
                            return (
                                <Box key={globalIndex}>
                                    <Text>
                                        {isSelected ? '▶' : '○'} {item.text}
                                    </Text>
                                    {item.status && (
                                        <Text color={statusColor}> {item.status}</Text>
                                    )}
                                </Box>
                            );
                        })}
                        {statusRemaining > 0 && (
                            <Text color={theme.colors.textMuted}>↓ {statusRemaining} more</Text>
                        )}
                    </Box>
                </Box>
            </Box>
            
            <StatusBar />
        </Box>
    );
};