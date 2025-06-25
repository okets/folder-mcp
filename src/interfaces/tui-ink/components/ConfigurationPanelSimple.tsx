import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, Key } from 'ink';
import { BorderedBox } from './BorderedBox.js';
import { theme } from '../utils/theme.js';
import { useNavigationContext } from '../contexts/NavigationContext.js';
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

export const ConfigurationPanelSimple: React.FC<{ 
    width?: number; 
    height?: number;
    onEditModeChange?: (isInEditMode: boolean) => void;
}> = ({ width, height, onEditModeChange }) => {
    // Local state for configuration node in edit mode
    const [editingNodeIndex, setEditingNodeIndex] = useState<number | null>(null);
    const [editValue, setEditValue] = useState('');
    const [cursorPosition, setCursorPosition] = useState(0);
    const [cursorVisible, setCursorVisible] = useState(true);
    
    // Use shared navigation context
    const navigation = useNavigationContext();
    const { columns } = useTerminalSize();
    const constraints = useLayoutConstraints();
    const di = useDI();
    const statusBarService = di.resolve(ServiceTokens.StatusBarService);
    const inputContextService = di.resolve(ServiceTokens.InputContextService);
    
    // Use render slots when a node is in edit mode
    const { totalSlots } = useRenderSlots({
        elementId: 'config-panel-editmode',
        containerId: 'config-panel',
        slots: editingNodeIndex !== null ? 3 : 0, // Node in edit mode needs 3 extra lines (top border + content + bottom border)
        enabled: editingNodeIndex !== null
    });
    
    // Notify parent about edit mode state changes
    useEffect(() => {
        onEditModeChange?.(editingNodeIndex !== null);
    }, [editingNodeIndex, onEditModeChange]);
    
    // Static cursor (no blinking to allow terminal text selection)
    useEffect(() => {
        setCursorVisible(true);
    }, [editingNodeIndex]);
    
    // Calculate visible count based on height
    const boxOverhead = 4;
    const maxItems = Math.max(1, (height || 20) - boxOverhead);
    
    // When a node is in edit mode, reduce visible items to make room
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
    
    // Ensure the node in edit mode is visible
    if (editingNodeIndex !== null) {
        if (editingNodeIndex < scrollOffset) {
            scrollOffset = editingNodeIndex;
        } else if (editingNodeIndex >= scrollOffset + visibleCount) {
            scrollOffset = editingNodeIndex - visibleCount + 1;
        }
    }
    
    const visibleItems = configurationItems.slice(scrollOffset, scrollOffset + visibleCount);
    
    // Calculate total visible lines (accounting for nodes in edit mode)
    let totalVisibleLines = 0;
    visibleItems.forEach((item, index) => {
        const actualIndex = scrollOffset + index;
        if (editingNodeIndex === actualIndex) {
            totalVisibleLines += 4; // Node in edit mode takes 4 lines (label + top border + content + bottom border)
        } else {
            totalVisibleLines += 1; // Collapsed node takes 1 line
        }
    });
    
    const scrollbar = calculateScrollbar(configurationItems.length, totalVisibleLines, scrollOffset);
    
    // Handle configuration panel input
    const handleConfigInput = useCallback((input: string, key: Key): boolean => {
        const actualIndex = navigation.configSelectedIndex;
        
        if (editingNodeIndex === null) {
            // Collapsed state - only handle enter edit mode action
            if (key.rightArrow || key.return) {
                // Enter edit mode
                setEditingNodeIndex(actualIndex);
                const value = configurationItems[actualIndex].value;
                setEditValue(value);
                setCursorPosition(value.length); // Place cursor at end
                return true;
            }
            return false;
        } else {
            // Edit mode - handle all input
            if (key.escape) {
                // Exit edit mode without saving
                setEditingNodeIndex(null);
                setEditValue('');
                setCursorPosition(0);
                return true;
            } else if (key.return) {
                // Save changes and exit edit mode
                configurationItems[editingNodeIndex].value = editValue;
                setEditingNodeIndex(null);
                setEditValue('');
                setCursorPosition(0);
                return true;
            } else if (key.leftArrow) {
                // Move cursor left
                setCursorPosition(prev => Math.max(0, prev - 1));
                return true;
            } else if (key.rightArrow) {
                // Move cursor right
                setCursorPosition(prev => Math.min(editValue.length, prev + 1));
                return true;
            } else if (key.backspace || key.delete) {
                // Delete character before cursor
                if (cursorPosition > 0) {
                    setEditValue(prev => prev.slice(0, cursorPosition - 1) + prev.slice(cursorPosition));
                    setCursorPosition(prev => prev - 1);
                }
                return true;
            } else if (input && !key.ctrl && !key.meta) {
                // Insert character at cursor position
                setEditValue(prev => prev.slice(0, cursorPosition) + input + prev.slice(cursorPosition));
                setCursorPosition(prev => prev + 1);
                return true;
            }
            return true; // Consume all input when in edit mode
        }
    }, [editingNodeIndex, editValue, cursorPosition, navigation.configSelectedIndex]);
    
    // Use focus chain - register for both collapsed and edit mode
    const { isInFocusChain } = useFocusChain({
        elementId: 'config-panel',  // Keep stable element ID
        parentId: 'navigation',  // Child of navigation, not app
        isActive: navigation.isConfigFocused,  // Active when config panel is focused
        onInput: navigation.isConfigFocused ? handleConfigInput : undefined,  // Always handle input when focused
        keyBindings: editingNodeIndex !== null ? [
            { key: '←→', description: 'Move cursor' },
            { key: 'Esc', description: 'Cancel' },
            { key: 'Enter', description: 'Save' }
        ] : [
            { key: '→/Enter', description: 'Edit' }
        ],
        priority: editingNodeIndex !== null ? 1000 : 50 // Very high priority when in edit mode
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
            {(() => {
                // Build a flat array to avoid Fragment key issues
                const elements: React.ReactElement[] = [];
                
                visibleItems.forEach((item, visualIndex) => {
                    const actualIndex = scrollOffset + visualIndex;
                    const isSelected = navigation.isConfigFocused && navigation.configSelectedIndex === actualIndex;
                    const isInEditMode = editingNodeIndex === actualIndex;
                    
                    if (isInEditMode) {
                        // Edit mode view - add multiple elements with unique keys
                        // Use visualIndex in the key to ensure absolute uniqueness
                        const labelKey = `item-${visualIndex}-label`;
                        const valueKey = `item-${visualIndex}-value`;
                        
                        elements.push(
                            <Text key={labelKey} color={theme.colors.accent}>
                                ▼ {item.label}:
                            </Text>
                        );
                        
                        // Calculate border width to match content exactly
                        const borderWidth = Math.max(editValue.length + 2, 18); // Content will be: text + cursor/padding + space = editValue.length + 2
                        
                        elements.push(
                            <Text key={valueKey} color={theme.colors.textInputBorder}>
                                {'  '}╭{'─'.repeat(borderWidth)}╮
                            </Text>
                        );
                        
                        // Render text with cursor using ANSI escape codes
                        let content;
                        
                        if (cursorVisible && cursorPosition < editValue.length) {
                            // Cursor is on existing character - highlight it
                            const before = editValue.slice(0, cursorPosition);
                            const cursorChar = editValue[cursorPosition];
                            const after = editValue.slice(cursorPosition + 1);
                            content = before + '\x1b[47m\x1b[38;5;102m' + cursorChar + '\x1b[0m\x1b[38;5;102m' + after + ' ';
                        } else if (cursorVisible && cursorPosition >= editValue.length) {
                            // Cursor is at end - highlight the padding space
                            content = editValue + '\x1b[47m\x1b[38;5;102m \x1b[0m';
                        } else {
                            // No cursor visible - just text with padding
                            content = editValue + ' ';
                        }
                        
                        elements.push(
                            <Box key={`${valueKey}-content`}>
                                <Text color={theme.colors.textInputBorder}>{'  '}│</Text>
                                <Text color={theme.colors.textMuted}> {content}</Text>
                                <Text color={theme.colors.textInputBorder}>│</Text>
                            </Box>
                        );
                        elements.push(
                            <Text key={`${valueKey}-bottom`} color={theme.colors.textInputBorder}>
                                {'  '}╰{'─'.repeat(borderWidth)}╯
                            </Text>
                        );
                    } else {
                        // Collapsed state - single element
                        // Use visualIndex for stable keys
                        const collapsedKey = `item-${visualIndex}`;
                        elements.push(
                            <Text 
                                key={collapsedKey}
                                color={isSelected ? theme.colors.accent : undefined}
                            >
                                {`${isSelected ? '▶' : '·'} ${item.label}: [\x1b[38;5;117m${item.value}\x1b[39m]`}
                            </Text>
                        );
                    }
                });
                
                return elements;
            })()}
        </BorderedBox>
    );
};