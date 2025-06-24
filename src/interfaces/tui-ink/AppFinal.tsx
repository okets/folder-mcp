import React from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import { Header } from './components/Header.js';
import { StatusBar } from './components/StatusBar.js';
import { theme } from './utils/theme.js';
import { useNavigation } from './hooks/useNavigation.js';

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

export const AppFinal: React.FC = () => {
    const { exit } = useApp();
    const navigation = useNavigation();
    const { stdout } = useStdout();
    
    const columns = stdout.columns || 80;
    const rows = stdout.rows || 24;
    const isNarrow = columns < 100;
    
    useInput((input) => {
        if (input === 'q') {
            exit();
        }
    });
    
    // Calculate heights for fullscreen
    const headerHeight = 3;
    const statusBarHeight = 3;
    const mainHeight = Math.max(4, rows - headerHeight - statusBarHeight);
    
    if (isNarrow) {
        // Portrait mode - vertical stack
        const configHeight = Math.floor(mainHeight * 0.8);
        const statusHeight = mainHeight - configHeight;
        
        // Calculate visible items
        const configVisibleItems = Math.max(1, configHeight - 4);
        const statusVisibleItems = Math.max(1, statusHeight - 4);
        
        return (
            <Box flexDirection="column" height={rows}>
                <Header />
                
                {/* Config section - 80% height */}
                <Box 
                    height={configHeight} 
                    borderStyle="round" 
                    borderColor={navigation.isConfigFocused ? theme.colors.borderFocus : theme.colors.border} 
                    paddingX={1}
                    flexDirection="column"
                >
                    <Box flexDirection="column">
                        {navigation.isConfigFocused ? (
                            <Text>Configuration</Text>
                        ) : (
                            <Box flexDirection="row" justifyContent="space-between">
                                <Text>Configuration</Text>
                                <Text color={theme.colors.textMuted}>⁽ᵗᵃᵇ⁾</Text>
                            </Box>
                        )}
                        <Text color={theme.colors.textMuted}>Setup your folder-mcp server</Text>
                    </Box>
                    <Box flexDirection="column" marginTop={1}>
                        {configItems.slice(0, configVisibleItems).map((item, index) => (
                            <Text key={index}>
                                {navigation.isConfigFocused && navigation.configSelectedIndex === index ? '▶' : '○'} {item}
                            </Text>
                        ))}
                        {configItems.length > configVisibleItems && (
                            <Text color={theme.colors.textMuted}>↓ {configItems.length - configVisibleItems} more</Text>
                        )}
                    </Box>
                </Box>
                
                {/* Status section - 20% height */}
                <Box 
                    height={statusHeight} 
                    borderStyle="round" 
                    borderColor={navigation.isStatusFocused ? theme.colors.borderFocus : theme.colors.border} 
                    paddingX={1}
                    flexDirection="column"
                >
                    <Box flexDirection="column">
                        {navigation.isStatusFocused ? (
                            <Text>System Status</Text>
                        ) : (
                            <Box flexDirection="row" justifyContent="space-between">
                                <Text>System Status</Text>
                                <Text color={theme.colors.textMuted}>⁽ᵗᵃᵇ⁾</Text>
                            </Box>
                        )}
                        <Text color={theme.colors.textMuted}>Current state</Text>
                    </Box>
                    <Box flexDirection="column" marginTop={1}>
                        {statusItems.slice(0, statusVisibleItems).map((item, idx) => {
                            const statusColor = item.status === '✓' ? theme.colors.successGreen :
                                              item.status === '⚠' ? theme.colors.warningOrange :
                                              item.status === '⋯' ? theme.colors.accent : undefined;
                            return (
                                <Text key={idx}>
                                    {navigation.isStatusFocused && navigation.statusSelectedIndex === idx ? '▶' : '○'} {item.text}
                                    {item.status && <Text color={statusColor}> {item.status}</Text>}
                                </Text>
                            );
                        })}
                        {statusItems.length > statusVisibleItems && (
                            <Text color={theme.colors.textMuted}>↓ {statusItems.length - statusVisibleItems} more</Text>
                        )}
                    </Box>
                </Box>
                
                <StatusBar />
            </Box>
        );
    }
    
    // Landscape mode - side by side
    const configVisibleItems = Math.max(1, mainHeight - 4);
    const statusVisibleItems = Math.max(1, mainHeight - 4);
    
    return (
        <Box flexDirection="column" height={rows}>
            <Header />
            
            <Box flexGrow={1} height={mainHeight}>
                {/* Config section - 80% width */}
                <Box 
                    width="80%" 
                    borderStyle="round" 
                    borderColor={navigation.isConfigFocused ? theme.colors.borderFocus : theme.colors.border} 
                    paddingX={1}
                    flexDirection="column"
                >
                    <Box flexDirection="column">
                        {navigation.isConfigFocused ? (
                            <Text>Configuration</Text>
                        ) : (
                            <Box flexDirection="row" justifyContent="space-between">
                                <Text>Configuration</Text>
                                <Text color={theme.colors.textMuted}>⁽ᵗᵃᵇ⁾</Text>
                            </Box>
                        )}
                        <Text color={theme.colors.textMuted}>Setup your folder-mcp server</Text>
                    </Box>
                    <Box flexDirection="column" marginTop={1}>
                        {configItems.slice(0, configVisibleItems).map((item, index) => (
                            <Text key={index}>
                                {navigation.isConfigFocused && navigation.configSelectedIndex === index ? '▶' : '○'} {item}
                            </Text>
                        ))}
                        {configItems.length > configVisibleItems && (
                            <Text color={theme.colors.textMuted}>↓ {configItems.length - configVisibleItems} more</Text>
                        )}
                    </Box>
                </Box>
                
                {/* Status section - 20% width */}
                <Box 
                    width="20%" 
                    borderStyle="round" 
                    borderColor={navigation.isStatusFocused ? theme.colors.borderFocus : theme.colors.border} 
                    paddingX={1}
                    flexDirection="column"
                >
                    <Box flexDirection="column">
                        {navigation.isStatusFocused ? (
                            <Text>System Status</Text>
                        ) : (
                            <Box flexDirection="row" justifyContent="space-between">
                                <Text>System Status</Text>
                                <Text color={theme.colors.textMuted}>⁽ᵗᵃᵇ⁾</Text>
                            </Box>
                        )}
                        <Text color={theme.colors.textMuted} wrap="truncate">Current state</Text>
                    </Box>
                    <Box flexDirection="column" marginTop={1}>
                        {statusItems.slice(0, statusVisibleItems).map((item, idx) => {
                            const statusColor = item.status === '✓' ? theme.colors.successGreen :
                                              item.status === '⚠' ? theme.colors.warningOrange :
                                              item.status === '⋯' ? theme.colors.accent : undefined;
                            return (
                                <Text key={idx} wrap="truncate">
                                    {navigation.isStatusFocused && navigation.statusSelectedIndex === idx ? '▶' : '○'} {item.text}
                                    {item.status && <Text color={statusColor}> {item.status}</Text>}
                                </Text>
                            );
                        })}
                        {statusItems.length > statusVisibleItems && (
                            <Text color={theme.colors.textMuted}>↓ {statusItems.length - statusVisibleItems} more</Text>
                        )}
                    </Box>
                </Box>
            </Box>
            
            <StatusBar />
        </Box>
    );
};