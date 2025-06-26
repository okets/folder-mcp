import React, { useState, useCallback } from 'react';
import { Box, Text, Key } from 'ink';
import { BorderedBox } from './core/BorderedBox.js';
import { ListItem } from './core/ListItem.js';
import { theme } from '../utils/theme.js';
import { useNavigationContext } from '../contexts/NavigationContext.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import { useLayoutConstraints } from '../contexts/LayoutContext.js';
import { useFocusChain } from '../hooks/useFocusChain.js';
import { statusItems } from '../models/sampleData.js';

// Sample detail data for expanded views
const statusDetails: Record<string, string[]> = {
    'System components loaded': [
        'All core components initialized successfully',
        'Memory allocator: Ready',
        'Thread pool: 8 workers active'
    ],
    'Validating embedding models': [
        'Checking model availability...',
        'Model: nomic-embed-text (1.5GB)',
        'Status: Download in progress (45%)'
    ],
    'Memory usage: 1.2GB / 8GB': [
        'Process memory: 1.2GB',
        'Cache memory: 456MB',
        'Available: 6.8GB'
    ],
    'Updates: Available': [
        'Version 1.2.0 available',
        'Fixes: Security patches',
        'Run "npm update" to install'
    ]
};

// Helper function to calculate scrollbar visual representation
const calculateScrollbar = (totalItems: number, visibleItems: number, scrollOffset: number, selectedIndex: number): string[] => {
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
        const lineLength = Math.max(1, Math.ceil(availableSpace * visibleItems / totalItems));
        const maxScrollOffset = totalItems - visibleItems;
        
        let topSpace = 0;
        if (maxScrollOffset > 0) {
            // Calculate position: at scrollOffset=0, topSpace=0 (touch top)
            // at scrollOffset=max, topSpace=maxTopSpace (touch bottom)
            const maxTopSpace = availableSpace - lineLength;
            topSpace = Math.round(maxTopSpace * scrollOffset / maxScrollOffset);
        }
        
        const bottomSpace = availableSpace - lineLength - topSpace;
        
        // Calculate which cell in the scrollbar should be highlighted
        // based on selected item's position within visible items
        const visiblePosition = selectedIndex - scrollOffset; // 0 to visibleItems-1
        const highlightCell = lineLength > 1 ? Math.floor(visiblePosition * lineLength / visibleItems) : 0;
        
        // Add middle rows (top space + line + bottom space)
        for (let i = 0; i < topSpace; i++) {
            scrollbar.push(' ');
        }
        for (let i = 0; i < lineLength; i++) {
            // Use a slightly different character for the highlighted position
            if (i === highlightCell) {
                scrollbar.push('┇'); // Triple dash style for exact position
            } else {
                scrollbar.push('┃');
            }
        }
        for (let i = 0; i < bottomSpace; i++) {
            scrollbar.push(' ');
        }
    }
    
    // Last row always shows bottom triangle
    scrollbar.push('▼');
    
    return scrollbar;
};

export const StatusPanel: React.FC<{ width?: number; height?: number }> = ({ width, height }) => {
    const navigation = useNavigationContext();
    const { columns } = useTerminalSize();
    const constraints = useLayoutConstraints();
    
    // Local state for expanded items
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
    
    // Calculate visible count based on height
    const boxOverhead = 3; // 2 for borders + 1 for subtitle (title is embedded in top border)
    const actualHeight = height || 20;
    const maxLines = Math.max(1, actualHeight - boxOverhead);
    
    // Calculate content width for items
    const panelWidth = width || columns - 2;
    const itemMaxWidth = constraints?.maxWidth || panelWidth - 7; // 4 for borders, 3 for indicator and space
    
    // Calculate total content lines
    let totalContentLines = 0;
    for (let i = 0; i < statusItems.length; i++) {
        totalContentLines += (expandedIndex === i) ? 4 : 1;
    }
    
    // Calculate line positions for all items
    const itemLinePositions: Array<{start: number, end: number}> = [];
    let currentLine = 0;
    for (let i = 0; i < statusItems.length; i++) {
        const itemLines = (expandedIndex === i) ? 4 : 1;
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
        const activeItem = itemLinePositions[navigation.statusSelectedIndex];
        
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
    for (let i = 0; i < statusItems.length; i++) {
        if (itemLinePositions[i].end > lineScrollOffset) {
            scrollOffset = i;
            break;
        }
    }
    
    // Calculate how many items actually fit in the viewport
    let visibleCount = 0;
    let linesUsed = 0;
    let startLine = itemLinePositions[scrollOffset].start;
    
    for (let i = scrollOffset; i < statusItems.length; i++) {
        const itemLines = (expandedIndex === i) ? 4 : 1;
        // Check if this item fits completely
        if (itemLinePositions[i].end - startLine <= maxLines) {
            visibleCount++;
            linesUsed = itemLinePositions[i].end - startLine;
        } else {
            break;
        }
    }
    
    const visibleItems = statusItems.slice(scrollOffset, scrollOffset + visibleCount);
    
    // Calculate TOTAL lines for ALL items (not just visible)
    let totalLines = 0;
    statusItems.forEach((item, index) => {
        totalLines += (expandedIndex === index) ? 4 : 1;
    });
    
    // Calculate visible lines for the current viewport
    let visibleLines = 0;
    visibleItems.forEach((item, index) => {
        const actualIndex = scrollOffset + index;
        visibleLines += (expandedIndex === actualIndex) ? 4 : 1;
    });
    
    // Show scrollbar only if total lines exceed available space
    const showScrollbar = totalLines > maxLines;
    
    // Use the line scroll offset we already calculated
    const scrollbarLineOffset = lineScrollOffset;
    
    // Use the line position we already calculated
    const selectedLinePosition = itemLinePositions[navigation.statusSelectedIndex].start;
    
    const scrollbar = showScrollbar ? calculateScrollbar(
        totalLines,
        Math.min(visibleLines, maxLines),
        scrollbarLineOffset,
        selectedLinePosition
    ) : [];
    
    // Handle status panel input
    const handleStatusInput = useCallback((input: string, key: Key): boolean => {
        if (key.return || key.rightArrow) {
            // Toggle expansion
            if (expandedIndex === navigation.statusSelectedIndex) {
                setExpandedIndex(null);
            } else {
                setExpandedIndex(navigation.statusSelectedIndex);
            }
            return true;
        }
        return false;
    }, [expandedIndex, navigation.statusSelectedIndex]);
    
    // Use focus chain
    useFocusChain({
        elementId: 'status-panel',
        parentId: 'navigation',
        isActive: navigation.isStatusFocused,
        onInput: navigation.isStatusFocused ? handleStatusInput : undefined,
        keyBindings: [
            { key: '→/Enter', description: 'Expand/Collapse' }
        ],
        priority: 50
    });
    
    return (
        <BorderedBox
            title="System Status"
            subtitle={actualHeight > 5 ? "Current state" : undefined}
            focused={navigation.isStatusFocused}
            width={width || columns - 2}
            height={actualHeight}
            showScrollbar={showScrollbar}
            scrollbarElements={scrollbar}
        >
            {(() => {
                // Build a flat array to avoid Fragment key issues
                const elements: React.ReactElement[] = [];
                
                visibleItems.forEach((item, visualIndex) => {
                    const actualIndex = scrollOffset + visualIndex;
                    const isSelected = navigation.isStatusFocused && navigation.statusSelectedIndex === actualIndex;
                    const isExpanded = expandedIndex === actualIndex;
                    
                    if (isExpanded) {
                        // Expanded view
                        const statusColorName = 
                            item.status === '✓' ? 'green' :
                            item.status === '⚠' ? 'yellow' :
                            item.status === '⋯' ? 'cyan' : undefined;
                        
                        const header = statusColorName 
                            ? `${item.text} [\x1b[${statusColorName === 'green' ? '32' : statusColorName === 'yellow' ? '33' : '36'}m${item.status}\x1b[39m]`
                            : `${item.text} ${item.status}`;
                        
                        // Add expanded header
                        elements.push(
                            <ListItem
                                key={`item-${visualIndex}-header`}
                                icon='▼'
                                header={header}
                                isActive={isSelected}
                                width={itemMaxWidth + 2}
                                color={theme.colors.accent}
                            />
                        );
                        
                        // Add detail lines
                        const details = statusDetails[item.text] || ['No additional details available'];
                        details.forEach((detail, detailIndex) => {
                            elements.push(
                                <Text key={`item-${visualIndex}-detail-${detailIndex}`} color={theme.colors.textMuted}>
                                    {'  '}{detail}
                                </Text>
                            );
                        });
                    } else {
                        // Collapsed view
                        const statusColorName = 
                            item.status === '✓' ? 'green' :
                            item.status === '⚠' ? 'yellow' :
                            item.status === '⋯' ? 'cyan' : undefined;
                        
                        const header = statusColorName 
                            ? `${item.text} [\x1b[${statusColorName === 'green' ? '32' : statusColorName === 'yellow' ? '33' : '36'}m${item.status}\x1b[39m]`
                            : `${item.text} ${item.status}`;
                        
                        elements.push(
                            <ListItem
                                key={`item-${visualIndex}`}
                                icon={isSelected ? '▶' : '○'}
                                header={header}
                                isActive={isSelected}
                                width={itemMaxWidth + 2}
                                color={theme.colors.accent}
                            />
                        );
                    }
                });
                
                return elements.length > 0 ? elements : <Text color={theme.colors.textMuted}>{statusItems.length} items</Text>;
            })()}
        </BorderedBox>
    );
};