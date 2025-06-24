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

// Helper function to create borders with embedded titles
const createBorder = (
    title: string,
    subtitle?: string,
    focused?: boolean,
    width?: number,
    hasScrollUp?: boolean,
    hasScrollDown?: boolean,
    moreCount?: number
) => {
    const { border } = theme.symbols;
    const borderWidth = width || 76;
    
    // Create top border with embedded title
    const createTopBorder = () => {
        const scrollIndicator = hasScrollUp ? ' ↑' : '';
        const titleWithScroll = `${title}${scrollIndicator}`;
        
        if (focused) {
            // Total content: title + scroll + 2 spaces around title + 2 corner chars = title.length + 4
            const padding = Math.max(0, borderWidth - titleWithScroll.length - 4);
            return `${border.topLeft}${border.horizontal} ${titleWithScroll} ${border.horizontal.repeat(padding)}${border.topRight}`;
        } else {
            const tabText = '⁽ᵗᵃᵇ⁾';
            // Total content: title + scroll + tab + 4 spaces + 2 corner chars = title.length + tab.length + 6
            const totalContentLength = titleWithScroll.length + tabText.length + 6;
            const padding = Math.max(0, borderWidth - totalContentLength);
            return `${border.topLeft}${border.horizontal} ${titleWithScroll} ${border.horizontal.repeat(padding)} ${tabText} ${border.topRight}`;
        }
    };
    
    // Create bottom border with scroll indicator
    const createBottomBorder = () => {
        if (hasScrollDown && moreCount) {
            const scrollText = `↓ ${moreCount} more`;
            // Total content: scroll text + 2 spaces + 2 corner chars = scrollText.length + 4
            const padding = Math.max(0, borderWidth - scrollText.length - 4);
            return `${border.bottomLeft}${border.horizontal} ${scrollText} ${border.horizontal.repeat(padding)}${border.bottomRight}`;
        }
        // Total content: just horizontal lines + 2 corner chars
        return `${border.bottomLeft}${border.horizontal.repeat(borderWidth - 2)}${border.bottomRight}`;
    };
    
    // Create side borders
    const createSideBorder = (content?: React.ReactNode) => {
        return (
            <Box>
                <Text color={focused ? theme.colors.borderFocus : theme.colors.border}>{border.vertical} </Text>
                <Box width={borderWidth - 2}>{content}</Box>
                <Text color={focused ? theme.colors.borderFocus : theme.colors.border}>{border.vertical}</Text>
            </Box>
        );
    };
    
    return {
        topBorder: createTopBorder(),
        bottomBorder: createBottomBorder(),
        sideBorder: createSideBorder
    };
};

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
    const STATUS_BAR_HEIGHT = 3; // border + content + border
    const availableHeight = rows - HEADER_HEIGHT - STATUS_BAR_HEIGHT;
    
    if (isNarrow) {
        // Portrait mode - maximize space usage
        // Give status a reasonable minimum, rest to config
        const statusHeight = Math.max(10, Math.floor(availableHeight * 0.35)); // Slightly less for status
        const configHeight = availableHeight - statusHeight; // Use all remaining space
        
        // Calculate exact space for items
        // Box overhead: title(1) + subtitle(1) + marginTop(1) + borders(1) = 4 (optimized)
        const boxOverhead = 4;
        
        // Calculate maximum possible items that fit
        const configMaxItems = Math.max(1, configHeight - boxOverhead);
        const statusMaxItems = Math.max(1, statusHeight - boxOverhead);
        
        // Reserve 1 line for "more" indicator only if we can't show all items
        const configVisibleCount = configItems.length > configMaxItems ? Math.max(1, configMaxItems - 1) : configMaxItems;
        const statusVisibleCount = statusItems.length > statusMaxItems ? Math.max(1, statusMaxItems - 1) : statusMaxItems;
        
        return (
            <Box flexDirection="column" height={rows} width={columns}>
                <Header />
                
                {/* Configuration Box */}
                {(() => {
                    // Calculate scroll offset to keep selected item visible
                    let scrollOffset = 0;
                    if (navigation.configSelectedIndex >= configVisibleCount) {
                        scrollOffset = navigation.configSelectedIndex - configVisibleCount + 1;
                    }
                    const hasScrollUp = scrollOffset > 0;
                    const hasScrollDown = configItems.length > configVisibleCount;
                    const moreCount = hasScrollDown ? configItems.length - scrollOffset - configVisibleCount : 0;
                    
                    const borders = createBorder(
                        'Configuration', 
                        'Setup your folder-mcp server',
                        navigation.isConfigFocused,
                        columns - 2,
                        hasScrollUp,
                        hasScrollDown,
                        moreCount
                    );
                    
                    const visibleItems = configItems.slice(scrollOffset, scrollOffset + configVisibleCount);
                    
                    return (
                        <Box flexDirection="column" height={configHeight} overflow="hidden">
                            {/* Top border with embedded title */}
                            <Text color={navigation.isConfigFocused ? theme.colors.borderFocus : theme.colors.border}>
                                {borders.topBorder}
                            </Text>
                            
                            {/* Subtitle line */}
                            {borders.sideBorder(
                                <Text color={theme.colors.textMuted}>Setup your folder-mcp server</Text>
                            )}
                            
                            {/* Content */}
                            {visibleItems.map((item, visualIndex) => {
                                const actualIndex = scrollOffset + visualIndex;
                                return borders.sideBorder(
                                    <Text key={`cfg-${actualIndex}`} color={navigation.isConfigFocused && navigation.configSelectedIndex === actualIndex ? theme.colors.accent : undefined} wrap="truncate">
                                        {navigation.isConfigFocused && navigation.configSelectedIndex === actualIndex ? '▶' : '○'} {item}
                                    </Text>
                                );
                            })}
                            
                            {/* Bottom border with scroll indicator */}
                            <Text color={navigation.isConfigFocused ? theme.colors.borderFocus : theme.colors.border}>
                                {borders.bottomBorder}
                            </Text>
                        </Box>
                    );
                })()}
                
                {/* Status Box */}
                {(() => {
                    let scrollOffset = 0;
                    if (navigation.statusSelectedIndex >= statusVisibleCount) {
                        scrollOffset = navigation.statusSelectedIndex - statusVisibleCount + 1;
                    }
                    const hasScrollUp = scrollOffset > 0;
                    const hasScrollDown = statusItems.length > statusVisibleCount;
                    const moreCount = hasScrollDown ? statusItems.length - scrollOffset - statusVisibleCount : 0;
                    
                    const borders = createBorder(
                        'System Status',
                        'Current state', 
                        navigation.isStatusFocused,
                        columns - 2,
                        hasScrollUp,
                        hasScrollDown,
                        moreCount
                    );
                    
                    const visibleItems = statusItems.slice(scrollOffset, scrollOffset + statusVisibleCount);
                    
                    return (
                        <Box flexDirection="column" height={statusHeight}>
                            {/* Top border with embedded title */}
                            <Text color={navigation.isStatusFocused ? theme.colors.borderFocus : theme.colors.border}>
                                {borders.topBorder}
                            </Text>
                            
                            {/* Subtitle line */}
                            {statusHeight > 5 && borders.sideBorder(
                                <Text color={theme.colors.textMuted}>Current state</Text>
                            )}
                            
                            {/* Content */}
                            {statusVisibleCount > 0 ? (
                                visibleItems.map((item, visualIndex) => {
                                    const actualIndex = scrollOffset + visualIndex;
                                    return borders.sideBorder(
                                        <Box key={`sts-${actualIndex}`} flexDirection="row">
                                            <Text color={navigation.isStatusFocused && navigation.statusSelectedIndex === actualIndex ? theme.colors.accent : undefined}>
                                                {navigation.isStatusFocused && navigation.statusSelectedIndex === actualIndex ? '▶' : '○'} {item.text}
                                            </Text>
                                            {item.status && (
                                                <Text color={
                                                    item.status === '✓' ? theme.colors.successGreen :
                                                    item.status === '⚠' ? theme.colors.warningOrange :
                                                    item.status === '⋯' ? theme.colors.accent : undefined
                                                }> {item.status}</Text>
                                            )}
                                        </Box>
                                    );
                                })
                            ) : (
                                borders.sideBorder(
                                    <Text color={theme.colors.textMuted}>↓ {statusItems.length} items</Text>
                                )
                            )}
                            
                            {/* Bottom border with scroll indicator */}
                            <Text color={navigation.isStatusFocused ? theme.colors.borderFocus : theme.colors.border}>
                                {borders.bottomBorder}
                            </Text>
                        </Box>
                    );
                })()}
                
                <StatusBar />
            </Box>
        );
    }
    
    // Landscape mode - side by side
    // Optimized calculation: title(1) + subtitle(1) + marginTop(1) + borders(1.5) = 4.5 ≈ 4 overhead  
    // Try reducing just slightly to gain one row
    const boxOverhead = 4;
    const maxVisibleItems = Math.max(1, availableHeight - boxOverhead);
    
    // Optimized calculation for both boxes
    const configMaxItems = Math.max(1, availableHeight - 4); // title(1) + subtitle(1) + margin(1) + more(1) = 4
    const statusMaxItems = Math.max(1, availableHeight - 4); // Same calculation for consistency
    
    // Reserve 1 line for "more" indicator if needed
    const configVisibleCount = configItems.length > configMaxItems ? configMaxItems - 1 : configMaxItems;
    const statusVisibleCount = statusItems.length > statusMaxItems ? statusMaxItems - 1 : statusMaxItems;
    
    return (
        <Box flexDirection="column" height={rows} width={columns}>
            <Header />
            
            <Box height={availableHeight}>
                {/* Configuration Box - 70% width */}
                {(() => {
                    // Calculate scroll offset to keep selected item visible
                    let scrollOffset = 0;
                    if (navigation.configSelectedIndex >= configVisibleCount) {
                        scrollOffset = navigation.configSelectedIndex - configVisibleCount + 1;
                    }
                    const hasScrollUp = scrollOffset > 0;
                    const hasScrollDown = configItems.length > configVisibleCount;
                    const moreCount = hasScrollDown ? configItems.length - scrollOffset - configVisibleCount : 0;
                    
                    const configWidth = Math.floor(columns * 0.7) - 2; // Account for Box padding/margins
                    const borders = createBorder(
                        'Configuration',
                        'Setup your folder-mcp server',
                        navigation.isConfigFocused,
                        configWidth,
                        hasScrollUp,
                        hasScrollDown,
                        moreCount
                    );
                    
                    const visibleItems = configItems.slice(scrollOffset, scrollOffset + configVisibleCount);
                    
                    return (
                        <Box width="70%" flexDirection="column">
                            {/* Top border with embedded title */}
                            <Text color={navigation.isConfigFocused ? theme.colors.borderFocus : theme.colors.border}>
                                {borders.topBorder}
                            </Text>
                            
                            {/* Subtitle line */}
                            {borders.sideBorder(
                                <Text color={theme.colors.textMuted}>Setup your folder-mcp server</Text>
                            )}
                            
                            {/* Content */}
                            {visibleItems.map((item, visualIndex) => {
                                const actualIndex = scrollOffset + visualIndex;
                                return borders.sideBorder(
                                    <Text key={`cfg-${actualIndex}`} color={navigation.isConfigFocused && navigation.configSelectedIndex === actualIndex ? theme.colors.accent : undefined} wrap="truncate">
                                        {navigation.isConfigFocused && navigation.configSelectedIndex === actualIndex ? '▶' : '○'} {item}
                                    </Text>
                                );
                            })}
                            
                            {/* Bottom border with scroll indicator */}
                            <Text color={navigation.isConfigFocused ? theme.colors.borderFocus : theme.colors.border}>
                                {borders.bottomBorder}
                            </Text>
                        </Box>
                    );
                })()}
                
                {/* Status Box - 30% width */}
                {(() => {
                    // Calculate scroll offset to keep selected item visible
                    let scrollOffset = 0;
                    if (navigation.statusSelectedIndex >= statusVisibleCount) {
                        scrollOffset = navigation.statusSelectedIndex - statusVisibleCount + 1;
                    }
                    const hasScrollUp = scrollOffset > 0;
                    const hasScrollDown = statusItems.length > statusVisibleCount;
                    const moreCount = hasScrollDown ? statusItems.length - scrollOffset - statusVisibleCount : 0;
                    
                    const statusWidth = Math.floor(columns * 0.3) - 2; // Account for Box padding/margins
                    const borders = createBorder(
                        'System Status',
                        'Current state',
                        navigation.isStatusFocused,
                        statusWidth,
                        hasScrollUp,
                        hasScrollDown,
                        moreCount
                    );
                    
                    const visibleItems = statusItems.slice(scrollOffset, scrollOffset + statusVisibleCount);
                    
                    return (
                        <Box width="30%" flexDirection="column">
                            {/* Top border with embedded title */}
                            <Text color={navigation.isStatusFocused ? theme.colors.borderFocus : theme.colors.border}>
                                {borders.topBorder}
                            </Text>
                            
                            {/* Subtitle line */}
                            {borders.sideBorder(
                                <Text color={theme.colors.textMuted} wrap="truncate">Current state</Text>
                            )}
                            
                            {/* Content */}
                            {visibleItems.map((item, visualIndex) => {
                                const actualIndex = scrollOffset + visualIndex;
                                return borders.sideBorder(
                                    <Box key={`sts-${actualIndex}`} flexDirection="row">
                                        <Text color={navigation.isStatusFocused && navigation.statusSelectedIndex === actualIndex ? theme.colors.accent : undefined}>
                                            {navigation.isStatusFocused && navigation.statusSelectedIndex === actualIndex ? '▶' : '○'} {item.text}
                                        </Text>
                                        {item.status && (
                                            <Text color={
                                                item.status === '✓' ? theme.colors.successGreen :
                                                item.status === '⚠' ? theme.colors.warningOrange :
                                                item.status === '⋯' ? theme.colors.accent : undefined
                                            }> {item.status}</Text>
                                        )}
                                    </Box>
                                );
                            })}
                            
                            {/* Bottom border with scroll indicator */}
                            <Text color={navigation.isStatusFocused ? theme.colors.borderFocus : theme.colors.border}>
                                {borders.bottomBorder}
                            </Text>
                        </Box>
                    );
                })()}
            </Box>
            
            <StatusBar />
        </Box>
    );
};