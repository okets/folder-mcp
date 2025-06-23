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

export const AppFullscreen: React.FC = () => {
    const { exit } = useApp();
    const navigation = useNavigation();
    const { columns, rows, isNarrow } = useTerminalSize();
    
    useInput((input) => {
        if (input === 'q') {
            exit();
        }
    });
    
    // Fixed height calculations
    const HEADER_HEIGHT = 3;
    const STATUS_BAR_HEIGHT = 3;
    const availableHeight = rows - HEADER_HEIGHT - STATUS_BAR_HEIGHT;
    
    if (isNarrow) {
        // Portrait mode - vertical stack with 80/20 split
        const configHeight = Math.max(6, Math.floor(availableHeight * 0.8));
        const statusHeight = Math.max(4, availableHeight - configHeight);
        
        // Visible items accounting for box chrome (border + title + padding)
        const configVisibleCount = Math.max(1, configHeight - 5);
        const statusVisibleCount = Math.max(0, statusHeight - 5);
        
        return (
            <Box flexDirection="column">
                <Header />
                
                {/* Configuration Box */}
                <Box 
                    height={configHeight}
                    borderStyle="round" 
                    borderColor={navigation.isConfigFocused ? theme.colors.borderFocus : theme.colors.border} 
                    paddingX={1}
                    flexDirection="column"
                >
                    <Box flexDirection="column">
                        <Text>Configuration {navigation.isConfigFocused ? '⁽ᶠᵒᶜᵘˢᵉᵈ⁾' : 'ᵗᵃᵇ'}</Text>
                        <Text color={theme.colors.textMuted}>Setup your folder-mcp server</Text>
                    </Box>
                    <Box flexDirection="column" marginTop={1}>
                        {configItems.slice(0, configVisibleCount).map((item, index) => (
                            <Text key={`cfg-${index}`}>
                                {navigation.isConfigFocused && navigation.configSelectedIndex === index ? '▶' : '○'} {item}
                            </Text>
                        ))}
                        {configItems.length > configVisibleCount && (
                            <Text color={theme.colors.textMuted}>
                                ↓ {configItems.length - configVisibleCount} more
                            </Text>
                        )}
                    </Box>
                </Box>
                
                {/* Status Box */}
                <Box 
                    height={statusHeight}
                    borderStyle="round" 
                    borderColor={navigation.isStatusFocused ? theme.colors.borderFocus : theme.colors.border} 
                    paddingX={1}
                    flexDirection="column"
                >
                    <Box flexDirection="column">
                        <Text>System Status {navigation.isStatusFocused ? '⁽ᶠᵒᶜᵘˢᵉᵈ⁾' : 'ᵗᵃᵇ'}</Text>
                        {statusHeight > 5 && <Text color={theme.colors.textMuted}>Current state</Text>}
                    </Box>
                    <Box flexDirection="column" marginTop={1}>
                        {statusVisibleCount > 0 ? (
                            statusItems.slice(0, statusVisibleCount).map((item, idx) => (
                                <Box key={`sts-${idx}`} flexDirection="row">
                                    <Text>{navigation.isStatusFocused && navigation.statusSelectedIndex === idx ? '▶' : '○'} {item.text}</Text>
                                    {item.status && (
                                        <Text color={
                                            item.status === '✓' ? theme.colors.successGreen :
                                            item.status === '⚠' ? theme.colors.warningOrange :
                                            item.status === '⋯' ? theme.colors.accent : undefined
                                        }> {item.status}</Text>
                                    )}
                                </Box>
                            ))
                        ) : (
                            <Text color={theme.colors.textMuted}>
                                ↓ {statusItems.length} items
                            </Text>
                        )}
                        {statusVisibleCount > 0 && statusItems.length > statusVisibleCount && (
                            <Text color={theme.colors.textMuted}>
                                ↓ {statusItems.length - statusVisibleCount} more
                            </Text>
                        )}
                    </Box>
                </Box>
                
                <StatusBar />
            </Box>
        );
    }
    
    // Landscape mode - side by side
    const configVisibleCount = Math.max(1, availableHeight - 5);
    const statusVisibleCount = Math.max(1, availableHeight - 5);
    
    return (
        <Box flexDirection="column">
            <Header />
            
            <Box height={availableHeight}>
                {/* Configuration Box - 80% width */}
                <Box 
                    width="80%"
                    borderStyle="round" 
                    borderColor={navigation.isConfigFocused ? theme.colors.borderFocus : theme.colors.border} 
                    paddingX={1}
                    flexDirection="column"
                >
                    <Box flexDirection="column">
                        <Text>Configuration {navigation.isConfigFocused ? '⁽ᶠᵒᶜᵘˢᵉᵈ⁾' : 'ᵗᵃᵇ'}</Text>
                        <Text color={theme.colors.textMuted}>Setup your folder-mcp server</Text>
                    </Box>
                    <Box flexDirection="column" marginTop={1}>
                        {configItems.slice(0, configVisibleCount).map((item, index) => (
                            <Text key={`cfg-${index}`}>
                                {navigation.isConfigFocused && navigation.configSelectedIndex === index ? '▶' : '○'} {item}
                            </Text>
                        ))}
                        {configItems.length > configVisibleCount && (
                            <Text color={theme.colors.textMuted}>
                                ↓ {configItems.length - configVisibleCount} more
                            </Text>
                        )}
                    </Box>
                </Box>
                
                {/* Status Box - 20% width */}
                <Box 
                    width="20%"
                    borderStyle="round" 
                    borderColor={navigation.isStatusFocused ? theme.colors.borderFocus : theme.colors.border} 
                    paddingX={1}
                    flexDirection="column"
                >
                    <Box flexDirection="column">
                        <Text>System Status {navigation.isStatusFocused ? '⁽ᶠᵒᶜᵘˢᵉᵈ⁾' : 'ᵗᵃᵇ'}</Text>
                        <Text color={theme.colors.textMuted} wrap="truncate">Current state</Text>
                    </Box>
                    <Box flexDirection="column" marginTop={1}>
                        {statusItems.slice(0, statusVisibleCount).map((item, idx) => (
                            <Box key={`sts-${idx}`} width="100%">
                                <Box flexDirection="row">
                                    <Text wrap="truncate-end">{navigation.isStatusFocused && navigation.statusSelectedIndex === idx ? '▶' : '○'} {item.text.substring(0, 12)}</Text>
                                    {item.status && (
                                        <Text color={
                                            item.status === '✓' ? theme.colors.successGreen :
                                            item.status === '⚠' ? theme.colors.warningOrange :
                                            item.status === '⋯' ? theme.colors.accent : undefined
                                        }> {item.status}</Text>
                                    )}
                                </Box>
                            </Box>
                        ))}
                        {statusItems.length > statusVisibleCount && (
                            <Text color={theme.colors.textMuted}>
                                ↓ {statusItems.length - statusVisibleCount} more
                            </Text>
                        )}
                    </Box>
                </Box>
            </Box>
            
            <StatusBar />
        </Box>
    );
};