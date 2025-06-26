import React, { useState, useEffect, useCallback, Fragment } from 'react';
import { Box, Text, Key } from 'ink';
import { BorderedBox } from './core/BorderedBox.js';
import { ConfigurationListItem } from './core/ConfigurationListItem.js';
import { theme } from '../utils/theme.js';
import { useNavigationContext } from '../contexts/NavigationContext.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import { useLayoutConstraints } from '../contexts/LayoutContext.js';
import { useDI } from '../di/DIContext.js';
import { ServiceTokens } from '../di/tokens.js';
import { useFocusChain } from '../hooks/useFocusChain.js';
import { useRenderSlots } from '../hooks/useRenderSlots.js';
import { calculateScrollbar } from './core/ScrollbarCalculator.js';

// Simple configuration items for testing
export const configurationItems = [
    { id: 'folder-path', label: 'Folder Path', value: '/Users/example/documents' },
    { id: 'embedding-model', label: 'Embedding Model', value: 'nomic-embed-text' },
    { id: 'cache-directory', label: 'Cache Directory', value: '~/.folder-mcp/cache' },
    { id: 'memory-limit', label: 'Memory Limit', value: '2048' },
    { id: 'hot-reload', label: 'Enable Hot Reload', value: 'Yes' },
    { id: 'debug-logging', label: 'Enable Debug Logging', value: 'No' },
    { id: 'network-timeout', label: 'Network Timeout', value: '30' }
];


export const ConfigurationPanel: React.FC<{ 
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
    // BorderedBox uses: height - 2 (borders) - 1 (subtitle) = height - 3
    const boxOverhead = 3; // top border + bottom border + subtitle
    const actualHeight = height || 20;
    const maxLines = Math.max(1, actualHeight - boxOverhead);
    
    // Calculate content width for items
    const panelWidth = width || columns - 2;
    const itemMaxWidth = constraints?.maxWidth || panelWidth - 7; // 4 for borders, 3 for indicator and space
    
    // First, check if all items fit without scrolling
    let totalContentLines = 0;
    for (let i = 0; i < configurationItems.length; i++) {
        totalContentLines += (editingNodeIndex === i) ? 4 : 1;
    }
    
    // Calculate line positions for all items
    const itemLinePositions: Array<{start: number, end: number}> = [];
    let currentLine = 0;
    for (let i = 0; i < configurationItems.length; i++) {
        const itemLines = (editingNodeIndex === i) ? 4 : 1;
        itemLinePositions.push({
            start: currentLine,
            end: currentLine + itemLines
        });
        currentLine += itemLines;
    }
    
    // Calculate scroll offset in lines
    let lineScrollOffset = 0;
    
    // Only calculate scroll if content exceeds viewport
    if (totalContentLines > maxLines) {
        const activeItem = itemLinePositions[navigation.configSelectedIndex];
        
        // Bring active item into view
        if (activeItem.end > lineScrollOffset + maxLines) {
            // Item is cut off at bottom - scroll down to align bottom
            lineScrollOffset = activeItem.end - maxLines;
        } else if (activeItem.start < lineScrollOffset) {
            // Item is cut off at top - scroll up to show it
            lineScrollOffset = activeItem.start;
        }
    }
    
    // Find first visible item based on line scroll offset
    let scrollOffset = 0;
    for (let i = 0; i < configurationItems.length; i++) {
        if (itemLinePositions[i].end > lineScrollOffset) {
            scrollOffset = i;
            break;
        }
    }
    
    // Calculate how many items actually fit in the viewport
    let visibleCount = 0;
    let linesUsed = 0;
    let startLine = itemLinePositions[scrollOffset].start;
    
    for (let i = scrollOffset; i < configurationItems.length; i++) {
        const itemLines = (editingNodeIndex === i) ? 4 : 1;
        // Check if this item fits completely
        if (itemLinePositions[i].end - startLine <= maxLines) {
            visibleCount++;
            linesUsed = itemLinePositions[i].end - startLine;
        } else {
            break;
        }
    }
    
    
    const visibleItems = configurationItems.slice(scrollOffset, scrollOffset + visibleCount);
    
    // Calculate TOTAL lines for ALL items (not just visible)
    let totalLines = 0;
    configurationItems.forEach((item, index) => {
        if (editingNodeIndex === index) {
            totalLines += 4; // Expanded item takes 4 lines
        } else {
            totalLines += 1; // Collapsed item takes 1 line
        }
    });
    
    // Calculate visible lines for the current viewport
    let visibleLines = 0;
    visibleItems.forEach((item, index) => {
        const actualIndex = scrollOffset + index;
        if (editingNodeIndex === actualIndex) {
            visibleLines += 4;
        } else {
            visibleLines += 1;
        }
    });
    
    // Show scrollbar only if total lines exceed available space
    const showScrollbar = totalLines > maxLines;
    
    // Use the line scroll offset we already calculated
    const scrollbarLineOffset = lineScrollOffset;
    
    // Use the line position we already calculated
    const selectedLinePosition = itemLinePositions[navigation.configSelectedIndex].start;
    
    const scrollbar = showScrollbar ? calculateScrollbar({
        totalItems: totalLines,
        visibleItems: Math.min(visibleLines, maxLines),
        scrollOffset: scrollbarLineOffset,
        selectedIndex: selectedLinePosition
    }) : [];
    
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
            width={panelWidth}
            height={actualHeight}
            showScrollbar={showScrollbar}
            scrollbarElements={scrollbar}
        >
            {(() => {
                // Build a flat array to avoid Fragment key issues
                const elements: React.ReactElement[] = [];
                
                visibleItems.forEach((item, visualIndex) => {
                    const actualIndex = scrollOffset + visualIndex;
                    const isSelected = navigation.isConfigFocused && navigation.configSelectedIndex === actualIndex;
                    const isInEditMode = editingNodeIndex === actualIndex;
                    
                    // Create ConfigurationListItem instance
                    const listItem = new ConfigurationListItem(
                        isSelected ? '▶' : '·',
                        item.label,
                        item.value,
                        isSelected,
                        isInEditMode,
                        isInEditMode ? editValue : undefined,
                        isInEditMode ? cursorPosition : undefined,
                        isInEditMode ? cursorVisible : undefined
                    );
                    
                    // Get rendered elements from list item
                    const itemElements = listItem.render(itemMaxWidth + 2); // +2 for icon + space
                    
                    // Handle both single element and array of elements
                    if (Array.isArray(itemElements)) {
                        itemElements.forEach((element, index) => {
                            elements.push(
                                React.cloneElement(element, { key: `item-${visualIndex}-${index}` })
                            );
                        });
                    } else {
                        elements.push(
                            React.cloneElement(itemElements, { key: `item-${visualIndex}` })
                        );
                    }
                });
                
                return elements;
            })()}
        </BorderedBox>
    );
};