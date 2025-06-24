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
    
    // Fixed height calculations (accounting for header margin)
    const HEADER_HEIGHT = 4; // 3 lines + 1 margin
    const STATUS_BAR_HEIGHT = 3;
    const availableHeight = rows - HEADER_HEIGHT - STATUS_BAR_HEIGHT;
    
    if (isNarrow) {
        // Portrait mode - vertical stack with better proportions  
        const statusHeight = Math.max(8, Math.floor(availableHeight * 0.4));
        const configHeight = Math.max(6, availableHeight - statusHeight);
        
        // Calculate exact space for items
        // Box overhead: top border(1) + title(1) + subtitle(1) + marginTop(1) + bottom border(1) = 5
        const boxOverhead = 5;
        
        // Calculate available lines for content (items + optional "more" indicator)
        const configContentLines = Math.max(0, configHeight - boxOverhead);
        const statusContentLines = Math.max(0, statusHeight - boxOverhead);
        
        // We need to show at least 1 item, and reserve 1 line for "more" if needed
        let configVisibleCount = configContentLines;
        let statusVisibleCount = statusContentLines;
        
        // If we can't show all items, reserve space for "more" indicator
        if (configItems.length > configContentLines && configContentLines > 1) {
            configVisibleCount = configContentLines - 1; // Reserve 1 line for "more"
        }
        if (statusItems.length > statusContentLines && statusContentLines > 1) {
            statusVisibleCount = statusContentLines - 1; // Reserve 1 line for "more"
        }
        
        // Ensure we show at least 1 item
        configVisibleCount = Math.max(1, configVisibleCount);
        statusVisibleCount = Math.max(0, statusVisibleCount);
        
        return (
            <Box flexDirection="column" height={rows} width={columns}>
                <Header />
                
                {/* Configuration Box */}
                <Box 
                    height={configHeight}
                    borderStyle="round" 
                    borderColor={navigation.isConfigFocused ? theme.colors.borderFocus : theme.colors.border} 
                    paddingX={1}
                    flexDirection="column"
                    overflow="hidden"
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
                    <Box flexDirection="column" marginTop={1} height={configVisibleCount} overflow="hidden">
                        {(() => {
                            // Calculate scroll offset to keep selected item visible
                            let scrollOffset = 0;
                            if (navigation.configSelectedIndex >= configVisibleCount) {
                                scrollOffset = navigation.configSelectedIndex - configVisibleCount + 1;
                            }
                            const visibleItems = configItems.slice(scrollOffset, scrollOffset + configVisibleCount);
                            
                            return visibleItems.map((item, visualIndex) => {
                                const actualIndex = scrollOffset + visualIndex;
                                return (
                                    <Box key={`cfg-${actualIndex}`} width="100%" height={1}>
                                        <Text color={navigation.isConfigFocused && navigation.configSelectedIndex === actualIndex ? theme.colors.accent : undefined} wrap="truncate">
                                            {navigation.isConfigFocused && navigation.configSelectedIndex === actualIndex ? '▶' : '○'} {item}
                                        </Text>
                                    </Box>
                                );
                            });
                        })()}
                        {configItems.length > configVisibleCount && (
                            <Text color={theme.colors.textMuted}>
                                ↓ {(() => {
                                    let scrollOffset = 0;
                                    if (navigation.configSelectedIndex >= configVisibleCount) {
                                        scrollOffset = navigation.configSelectedIndex - configVisibleCount + 1;
                                    }
                                    return configItems.length - scrollOffset - configVisibleCount;
                                })()} more
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
                        {navigation.isStatusFocused ? (
                            <Text>System Status</Text>
                        ) : (
                            <Box flexDirection="row" justifyContent="space-between">
                                <Text>System Status</Text>
                                <Text color={theme.colors.textMuted}>⁽ᵗᵃᵇ⁾</Text>
                            </Box>
                        )}
                        {statusHeight > 5 && <Text color={theme.colors.textMuted}>Current state</Text>}
                    </Box>
                    <Box flexDirection="column" marginTop={1}>
                        {statusVisibleCount > 0 ? (
                            <>
                                {(() => {
                                    let scrollOffset = 0;
                                    if (navigation.statusSelectedIndex >= statusVisibleCount) {
                                        scrollOffset = navigation.statusSelectedIndex - statusVisibleCount + 1;
                                    }
                                    const visibleItems = statusItems.slice(scrollOffset, scrollOffset + statusVisibleCount);
                                    
                                    return visibleItems.map((item, visualIndex) => {
                                        const actualIndex = scrollOffset + visualIndex;
                                        return (
                                            <Box key={`sts-${actualIndex}`} flexDirection="row">
                                                <Text color={navigation.isStatusFocused && navigation.statusSelectedIndex === actualIndex ? theme.colors.accent : undefined}>{navigation.isStatusFocused && navigation.statusSelectedIndex === actualIndex ? '▶' : '○'} {item.text}</Text>
                                                {item.status && (
                                                    <Text color={
                                                        item.status === '✓' ? theme.colors.successGreen :
                                                        item.status === '⚠' ? theme.colors.warningOrange :
                                                        item.status === '⋯' ? theme.colors.accent : undefined
                                                    }> {item.status}</Text>
                                                )}
                                            </Box>
                                        );
                                    });
                                })()}
                                {statusItems.length > statusVisibleCount && (
                                    <Text color={theme.colors.textMuted}>
                                        ↓ {(() => {
                                            let scrollOffset = 0;
                                            if (navigation.statusSelectedIndex >= statusVisibleCount) {
                                                scrollOffset = navigation.statusSelectedIndex - statusVisibleCount + 1;
                                            }
                                            return statusItems.length - scrollOffset - statusVisibleCount;
                                        })()} more
                                    </Text>
                                )}
                            </>
                        ) : (
                            <Text color={theme.colors.textMuted}>
                                ↓ {statusItems.length} items
                            </Text>
                        )}
                    </Box>
                </Box>
                
                <StatusBar />
            </Box>
        );
    }
    
    // Landscape mode - side by side
    // More conservative calculation to prevent overlap
    const configVisibleCount = Math.max(1, availableHeight - 7);
    const statusVisibleCount = Math.max(1, availableHeight - 7);
    
    return (
        <Box flexDirection="column" height={rows} width={columns}>
            <Header />
            
            <Box height={availableHeight}>
                {/* Configuration Box - 70% width */}
                <Box 
                    width="70%"
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
                    <Box flexDirection="column" marginTop={1} height={configVisibleCount} overflow="hidden">
                        {(() => {
                            // Calculate scroll offset to keep selected item visible
                            let scrollOffset = 0;
                            if (navigation.configSelectedIndex >= configVisibleCount) {
                                scrollOffset = navigation.configSelectedIndex - configVisibleCount + 1;
                            }
                            const visibleItems = configItems.slice(scrollOffset, scrollOffset + configVisibleCount);
                            
                            return visibleItems.map((item, visualIndex) => {
                                const actualIndex = scrollOffset + visualIndex;
                                return (
                                    <Box key={`cfg-${actualIndex}`} width="100%" height={1}>
                                        <Text color={navigation.isConfigFocused && navigation.configSelectedIndex === actualIndex ? theme.colors.accent : undefined} wrap="truncate">
                                            {navigation.isConfigFocused && navigation.configSelectedIndex === actualIndex ? '▶' : '○'} {item}
                                        </Text>
                                    </Box>
                                );
                            });
                        })()}
                        {configItems.length > configVisibleCount && (
                            <Text color={theme.colors.textMuted}>
                                ↓ {(() => {
                                    let scrollOffset = 0;
                                    if (navigation.configSelectedIndex >= configVisibleCount) {
                                        scrollOffset = navigation.configSelectedIndex - configVisibleCount + 1;
                                    }
                                    return configItems.length - scrollOffset - configVisibleCount;
                                })()} more
                            </Text>
                        )}
                    </Box>
                </Box>
                
                {/* Status Box - 30% width */}
                <Box 
                    width="30%"
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
                        {statusItems.slice(0, statusVisibleCount).map((item, idx) => (
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