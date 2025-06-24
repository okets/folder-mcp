import React from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { Header } from './components/Header.js';
import { StatusBar } from './components/StatusBar.js';
import { BorderedBox } from './components/BorderedBox.js';
import { LayoutContainer } from './components/LayoutContainer.js';
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


// Configuration panel component
const ConfigurationPanel: React.FC<{ width?: number; height?: number }> = ({ width, height }) => {
    const navigation = useNavigation();
    const { columns } = useTerminalSize();
    
    // Calculate visible count based on height
    const boxOverhead = 4;
    const maxItems = Math.max(1, (height || 20) - boxOverhead);
    const visibleCount = configItems.length > maxItems ? Math.max(1, maxItems - 1) : maxItems;
    
    // Calculate scroll offset
    let scrollOffset = 0;
    if (navigation.configSelectedIndex >= visibleCount) {
        scrollOffset = navigation.configSelectedIndex - visibleCount + 1;
    }
    
    const scrollbar = calculateScrollbar(configItems.length, visibleCount, scrollOffset);
    const visibleItems = configItems.slice(scrollOffset, scrollOffset + visibleCount);
    
    return (
        <BorderedBox
            title="Configuration"
            subtitle="Setup your folder-mcp server"
            focused={navigation.isConfigFocused}
            width={width || columns - 2}
            height={height || 20}
            showScrollbar={true}
            scrollbarElements={scrollbar}
        >
            {visibleItems.map((item, visualIndex) => {
                const actualIndex = scrollOffset + visualIndex;
                return (
                    <Text 
                        key={`panel-config-item-${actualIndex}`}
                        color={navigation.isConfigFocused && navigation.configSelectedIndex === actualIndex ? theme.colors.accent : undefined} 
                        wrap="truncate"
                    >
                        {navigation.isConfigFocused && navigation.configSelectedIndex === actualIndex ? '▶' : '○'} {item}
                    </Text>
                );
            })}
        </BorderedBox>
    );
};

// Status panel component
const StatusPanel: React.FC<{ width?: number; height?: number }> = ({ width, height }) => {
    const navigation = useNavigation();
    const { columns } = useTerminalSize();
    
    // Calculate visible count based on height
    const boxOverhead = 4;
    const maxItems = Math.max(1, (height || 20) - boxOverhead);
    const visibleCount = statusItems.length > maxItems ? Math.max(1, maxItems - 1) : maxItems;
    
    // Calculate scroll offset
    let scrollOffset = 0;
    if (navigation.statusSelectedIndex >= visibleCount) {
        scrollOffset = navigation.statusSelectedIndex - visibleCount + 1;
    }
    
    const scrollbar = calculateScrollbar(statusItems.length, visibleCount, scrollOffset);
    const visibleItems = statusItems.slice(scrollOffset, scrollOffset + visibleCount);
    const effectiveHeight = height || 20;
    
    return (
        <BorderedBox
            title="System Status"
            subtitle={effectiveHeight > 5 ? "Current state" : undefined}
            focused={navigation.isStatusFocused}
            width={width || columns - 2}
            height={effectiveHeight}
            showScrollbar={true}
            scrollbarElements={scrollbar}
        >
            {visibleCount > 0 ? (
                visibleItems.map((item, visualIndex) => {
                    const actualIndex = scrollOffset + visualIndex;
                    return (
                        <Box key={`panel-status-item-${actualIndex}`} flexDirection="row">
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
                <Text color={theme.colors.textMuted}>{statusItems.length} items</Text>
            )}
        </BorderedBox>
    );
};

export const AppFullscreen: React.FC = () => {
    const { exit } = useApp();
    const { columns, rows } = useTerminalSize();
    
    useInput((input) => {
        if (input === 'q') {
            exit();
        }
    });
    
    // Fixed height calculations (accounting for header margin)
    const HEADER_HEIGHT = 4; // 3 lines + 1 margin
    const STATUS_BAR_HEIGHT = 3; // border + content + border
    const availableHeight = rows - HEADER_HEIGHT - STATUS_BAR_HEIGHT;
    
    return (
        <Box flexDirection="column" height={rows} width={columns}>
            <Header />
            
            <LayoutContainer
                availableHeight={availableHeight}
                availableWidth={columns}
                narrowBreakpoint={100}
            >
                <ConfigurationPanel />
                <StatusPanel />
            </LayoutContainer>
            
            <StatusBar />
        </Box>
    );
};