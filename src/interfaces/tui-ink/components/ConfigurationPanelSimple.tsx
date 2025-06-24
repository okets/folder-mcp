import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, Key } from 'ink';
import { BorderedBox } from './BorderedBox.js';
import { theme } from '../utils/theme.js';
import { useNavigation } from '../hooks/useNavigation.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import { useLayoutConstraints } from '../contexts/LayoutContext.js';
import { useDI } from '../di/DIContext.js';
import { ServiceTokens } from '../di/tokens.js';
import { useFocusChain } from '../hooks/useFocusChain.js';
import { useRenderSlots } from '../hooks/useRenderSlots.js';

// Simple configuration items for testing
const configurationItems = [
    { id: 'folder-path', label: 'Folder Path', value: '/Users/example/documents' },
    { id: 'embedding-model', label: 'Embedding Model', value: 'nomic-embed-text' },
    { id: 'cache-directory', label: 'Cache Directory', value: '~/.folder-mcp/cache' },
    { id: 'memory-limit', label: 'Memory Limit', value: '2048' },
    { id: 'hot-reload', label: 'Enable Hot Reload', value: 'Yes' },
    { id: 'debug-logging', label: 'Enable Debug Logging', value: 'No' },
    { id: 'network-timeout', label: 'Network Timeout', value: '30' }
];

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

export const ConfigurationPanelSimple: React.FC<{ width?: number; height?: number }> = ({ width, height }) => {
    const navigation = useNavigation();
    const { columns } = useTerminalSize();
    const constraints = useLayoutConstraints();
    const di = useDI();
    const statusBarService = di.resolve(ServiceTokens.StatusBarService);
    
    // Local state for expanded item
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
    const [editValue, setEditValue] = useState('');
    const [cursorVisible, setCursorVisible] = useState(true);
    
    // Use render slots when an item is expanded
    const { totalSlots } = useRenderSlots({
        elementId: 'config-panel-expanded',
        containerId: 'config-panel',
        slots: expandedIndex !== null ? 3 : 0, // Expanded item needs 3 extra lines
        enabled: expandedIndex !== null
    });
    
    // Update status bar based on editing state
    useEffect(() => {
        if (expandedIndex !== null) {
            statusBarService.setContext('editing');
        } else {
            statusBarService.setContext('form');
        }
    }, [expandedIndex, statusBarService]);
    
    // Blinking cursor effect
    useEffect(() => {
        if (expandedIndex !== null) {
            const timer = setInterval(() => {
                setCursorVisible(prev => !prev);
            }, 500);
            return () => clearInterval(timer);
        } else {
            setCursorVisible(true);
        }
    }, [expandedIndex]);
    
    // Calculate visible count based on height
    const boxOverhead = 4;
    const maxItems = Math.max(1, (height || 20) - boxOverhead);
    
    // When an item is expanded, reduce visible items to make room
    let visibleCount = configurationItems.length > maxItems ? Math.max(1, maxItems - 1) : maxItems;
    
    // Adjust visible count based on total render slots claimed
    visibleCount = Math.max(1, visibleCount - totalSlots);
    
    // Calculate content width for items
    const panelWidth = width || columns - 2;
    const itemMaxWidth = constraints?.maxWidth || panelWidth - 7; // 4 for borders, 3 for indicator and space
    
    // Calculate scroll offset
    let scrollOffset = 0;
    if (navigation.configSelectedIndex >= visibleCount) {
        scrollOffset = navigation.configSelectedIndex - visibleCount + 1;
    }
    
    // Ensure the expanded item is visible
    if (expandedIndex !== null) {
        if (expandedIndex < scrollOffset) {
            scrollOffset = expandedIndex;
        } else if (expandedIndex >= scrollOffset + visibleCount) {
            scrollOffset = expandedIndex - visibleCount + 1;
        }
    }
    
    const visibleItems = configurationItems.slice(scrollOffset, scrollOffset + visibleCount);
    
    // Calculate total visible lines (accounting for expanded items)
    let totalVisibleLines = 0;
    visibleItems.forEach((item, index) => {
        const actualIndex = scrollOffset + index;
        if (expandedIndex === actualIndex) {
            totalVisibleLines += 3; // Expanded item takes 3 lines
        } else {
            totalVisibleLines += 1; // Collapsed item takes 1 line
        }
    });
    
    const scrollbar = calculateScrollbar(configurationItems.length, totalVisibleLines, scrollOffset);
    
    // Handle configuration panel input
    const handleConfigInput = useCallback((input: string, key: Key): boolean => {
        const actualIndex = navigation.configSelectedIndex;
        
        if (expandedIndex === null) {
            // Not editing - only handle expand action
            if (key.rightArrow || key.return) {
                // Expand for editing
                setExpandedIndex(actualIndex);
                setEditValue(configurationItems[actualIndex].value);
                return true;
            }
            return false;
        } else {
            // Editing mode - handle all input
            if (key.escape) {
                // Cancel editing
                setExpandedIndex(null);
                setEditValue('');
                return true;
            } else if (key.return) {
                // Save changes
                configurationItems[expandedIndex].value = editValue;
                setExpandedIndex(null);
                setEditValue('');
                return true;
            } else if (key.backspace || key.delete) {
                // Delete character
                setEditValue(prev => prev.slice(0, -1));
                return true;
            } else if (input && !key.ctrl && !key.meta) {
                // Add character
                setEditValue(prev => prev + input);
                return true;
            }
            return true; // Consume all input when editing
        }
    }, [expandedIndex, editValue, navigation.configSelectedIndex]);
    
    // Use focus chain - active when config panel is focused and especially when editing
    const { isInFocusChain } = useFocusChain({
        elementId: 'config-panel',
        parentId: 'app',
        isActive: navigation.isConfigFocused,
        onInput: navigation.isConfigFocused ? handleConfigInput : undefined,
        keyBindings: expandedIndex !== null ? [
            { key: 'Esc', description: 'Cancel' },
            { key: 'Enter', description: 'Save' }
        ] : [
            { key: '→/Enter', description: 'Edit' },
            { key: '↑↓', description: 'Navigate' }
        ],
        priority: expandedIndex !== null ? 100 : 50 // Higher priority when editing
    });
    
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
            {visibleItems.flatMap((item, visualIndex) => {
                const actualIndex = scrollOffset + visualIndex;
                const isSelected = navigation.isConfigFocused && navigation.configSelectedIndex === actualIndex;
                const isExpanded = expandedIndex === actualIndex;
                
                if (isExpanded) {
                    // Expanded view for editing - return array of elements
                    return [
                        <Text key={`${item.id}-label`} color={theme.colors.accent}>
                            ▶ {item.label}:
                        </Text>,
                        <Text key={`${item.id}-value`} color={theme.colors.textPrimary}>
                            {'  '}{editValue}
                            {cursorVisible ? (
                                <Text backgroundColor={theme.colors.accent} color={theme.colors.background}>█</Text>
                            ) : (
                                <Text> </Text>
                            )}
                        </Text>,
                        <Text key={`${item.id}-help`} color={theme.colors.textMuted} dimColor>
                            {'  '}[Esc] Cancel  [Enter] Save
                        </Text>
                    ];
                }
                
                // Collapsed view - return array with single element
                return [
                    <Text 
                        key={item.id}
                        color={isSelected ? theme.colors.accent : undefined}
                    >
                        {isSelected ? '▶' : '│'} {item.label}: [{item.value}] →
                    </Text>
                ];
            })}
        </BorderedBox>
    );
};