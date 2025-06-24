import React from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { Header } from './components/Header.js';
import { StatusBar } from './components/StatusBar.js';
import { theme } from './utils/theme.js';
import { useNavigation } from './hooks/useNavigation.js';
import { useTerminalSize } from './hooks/useTerminalSize.js';
import { configItems, statusItems } from './models/sampleData.js';

// Helper function to calculate scrollbar visual representation
const calculateScrollbar = (totalItems: number, visibleItems: number, scrollOffset: number): string[] => {
    // Only show scrollbar if scrolling is needed
    if (totalItems <= visibleItems) {
        return [];
    }

    // Create scrollbar array with exactly visibleItems elements
    const scrollbar: string[] = [];
    
    // First row always shows top triangle
    scrollbar.push('▲');
    
    // Last row always shows bottom triangle (will be added at the end)
    // Available space for indicator = visibleItems - 2 (excluding top and bottom triangles)
    const availableSpace = Math.max(1, visibleItems - 2);
    
    if (availableSpace > 0) {
        const lineLength = Math.ceil(availableSpace * visibleItems / totalItems);
        const topSpace = Math.floor(availableSpace * scrollOffset / totalItems);
        const bottomSpace = availableSpace - lineLength - topSpace;
        
        // Add middle rows (top space + line + bottom space)
        for (let i = 0; i < topSpace; i++) {
            scrollbar.push(' ');
        }
        for (let i = 0; i < lineLength; i++) {
            scrollbar.push('┃');
        }
        for (let i = 0; i < bottomSpace; i++) {
            scrollbar.push(' ');
        }
    }
    
    // Last row always shows bottom triangle
    scrollbar.push('▼');
    
    return scrollbar;
};

// Helper function to create borders with embedded titles
const createBorder = (
    title: string,
    subtitle?: string,
    focused?: boolean,
    width?: number,
    totalItems?: number,
    visibleItems?: number,
    scrollOffset?: number
) => {
    const { border } = theme.symbols;
    const borderWidth = width || 76;
    
    // Create top border with embedded title (no scroll indicators)
    const createTopBorder = () => {
        if (focused) {
            // Total content: title + 2 spaces around title + 2 corner chars = title.length + 4
            const padding = Math.max(0, borderWidth - title.length - 5);
            return `${border.topLeft}${border.horizontal} ${title} ${border.horizontal.repeat(padding)}${border.topRight}`;
        } else {
            const tabText = '⁽ᵗᵃᵇ⁾';
            // Total content: title + tab + 4 spaces + 2 corner chars = title.length + tab.length + 6
            const totalContentLength = title.length + tabText.length + 6;
            const padding = Math.max(0, borderWidth - totalContentLength - 1);
            return `${border.topLeft}${border.horizontal} ${title} ${border.horizontal.repeat(padding)} ${tabText} ${border.topRight}`;
        }
    };
    
    // Create bottom border (no scroll indicators)
    const createBottomBorder = () => {
        // Total content: just horizontal lines + 2 corner chars
        return `${border.bottomLeft}${border.horizontal.repeat(borderWidth - 2)}${border.bottomRight}`;
    };
    
    // Create side borders with scrollbar support
    const createSideBorder = (content?: React.ReactNode, scrollbarChar: string = ' ', key?: string) => {
        return (
            <Box key={key}>
                <Text color={focused ? theme.colors.borderFocus : theme.colors.border}>{border.vertical} </Text>
                <Box width={borderWidth - 5}>{content}</Box>
                <Text color={focused ? theme.colors.borderFocus : theme.colors.border}> {scrollbarChar}{border.vertical}</Text>
            </Box>
        );
    };
    
    // Calculate scrollbar for this container
    const scrollbar = totalItems && visibleItems && scrollOffset !== undefined 
        ? calculateScrollbar(totalItems, visibleItems, scrollOffset) 
        : [];
    
    return {
        topBorder: createTopBorder(),
        bottomBorder: createBottomBorder(),
        sideBorder: createSideBorder,
        scrollbar
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
                    // Scroll calculations are now handled by the scrollbar
                    
                    const borders = createBorder(
                        'Configuration', 
                        'Setup your folder-mcp server',
                        navigation.isConfigFocused,
                        columns - 2,
                        configItems.length,
                        configVisibleCount,
                        scrollOffset
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
                                <Text color={theme.colors.textMuted}>Setup your folder-mcp server</Text>,
                                ' ',
                                'portrait-cfg-subtitle'
                            )}
                            
                            {/* Content */}
                            {visibleItems.map((item, visualIndex) => {
                                const actualIndex = scrollOffset + visualIndex;
                                const scrollbarChar = borders.scrollbar.length > 0 && visualIndex < borders.scrollbar.length 
                                    ? borders.scrollbar[visualIndex] 
                                    : ' ';
                                return borders.sideBorder(
                                    <Text color={navigation.isConfigFocused && navigation.configSelectedIndex === actualIndex ? theme.colors.accent : undefined} wrap="truncate">
                                        {navigation.isConfigFocused && navigation.configSelectedIndex === actualIndex ? '▶' : '○'} {item}
                                    </Text>,
                                    scrollbarChar,
                                    `portrait-cfg-${actualIndex}`
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
                    // Scroll calculations are now handled by the scrollbar
                    
                    const borders = createBorder(
                        'System Status',
                        'Current state', 
                        navigation.isStatusFocused,
                        columns - 2,
                        statusItems.length,
                        statusVisibleCount,
                        scrollOffset
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
                                <Text color={theme.colors.textMuted}>Current state</Text>,
                                ' ',
                                'portrait-sts-subtitle'
                            )}
                            
                            {/* Content */}
                            {statusVisibleCount > 0 ? (
                                visibleItems.map((item, visualIndex) => {
                                    const actualIndex = scrollOffset + visualIndex;
                                    const scrollbarChar = borders.scrollbar.length > 0 && visualIndex < borders.scrollbar.length 
                                        ? borders.scrollbar[visualIndex] 
                                        : ' ';
                                    return borders.sideBorder(
                                        <Box flexDirection="row">
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
                                        </Box>,
                                        scrollbarChar,
                                        `portrait-sts-${actualIndex}`
                                    );
                                })
                            ) : (
                                borders.sideBorder(
                                    <Text color={theme.colors.textMuted}>{statusItems.length} items</Text>,
                                    ' ',
                                    'portrait-sts-empty'
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
                    // Scroll calculations are now handled by the scrollbar
                    
                    const configWidth = Math.floor(columns * 0.7) - 2; // Account for Box padding/margins
                    const borders = createBorder(
                        'Configuration',
                        'Setup your folder-mcp server',
                        navigation.isConfigFocused,
                        configWidth,
                        configItems.length,
                        configVisibleCount,
                        scrollOffset
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
                                <Text color={theme.colors.textMuted}>Setup your folder-mcp server</Text>,
                                ' ',
                                'landscape-cfg-subtitle'
                            )}
                            
                            {/* Content */}
                            {visibleItems.map((item, visualIndex) => {
                                const actualIndex = scrollOffset + visualIndex;
                                const scrollbarChar = borders.scrollbar.length > 0 && visualIndex < borders.scrollbar.length 
                                    ? borders.scrollbar[visualIndex] 
                                    : ' ';
                                return borders.sideBorder(
                                    <Text color={navigation.isConfigFocused && navigation.configSelectedIndex === actualIndex ? theme.colors.accent : undefined} wrap="truncate">
                                        {navigation.isConfigFocused && navigation.configSelectedIndex === actualIndex ? '▶' : '○'} {item}
                                    </Text>,
                                    scrollbarChar,
                                    `landscape-cfg-${actualIndex}`
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
                    // Scroll calculations are now handled by the scrollbar
                    
                    const statusWidth = Math.floor(columns * 0.3) - 2; // Account for Box padding/margins
                    const borders = createBorder(
                        'System Status',
                        'Current state',
                        navigation.isStatusFocused,
                        statusWidth,
                        statusItems.length,
                        statusVisibleCount,
                        scrollOffset
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
                                <Text color={theme.colors.textMuted} wrap="truncate">Current state</Text>,
                                ' ',
                                'landscape-sts-subtitle'
                            )}
                            
                            {/* Content */}
                            {visibleItems.map((item, visualIndex) => {
                                const actualIndex = scrollOffset + visualIndex;
                                const scrollbarChar = borders.scrollbar.length > 0 && visualIndex < borders.scrollbar.length 
                                    ? borders.scrollbar[visualIndex] 
                                    : ' ';
                                return borders.sideBorder(
                                    <Box flexDirection="row">
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
                                    </Box>,
                                    scrollbarChar,
                                    `landscape-sts-${actualIndex}`
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