import React, { useState, useCallback } from 'react';
import { Box, Text, Key } from 'ink';
import { BorderedBox } from './core/BorderedBox.js';
import { ListItem } from './core/ListItem.js';
import { calculateScrollbar } from './core/ScrollbarCalculator.js';
import { theme } from '../utils/theme.js';
import { useNavigationContext } from '../contexts/NavigationContext.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import { useLayoutConstraints } from '../contexts/LayoutContext.js';
import { useFocusChain } from '../hooks/useFocusChain.js';
import { useDI } from '../di/DIContext.js';
import { ServiceTokens } from '../di/tokens.js';
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


export const StatusPanel: React.FC<{ width?: number; height?: number }> = ({ width, height }) => {
    const navigation = useNavigationContext();
    const { columns } = useTerminalSize();
    const constraints = useLayoutConstraints();
    const di = useDI();
    const contentService = di.resolve(ServiceTokens.ContentService);
    
    // Local state for expanded items
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
    
    // Calculate visible count based on height
    const boxOverhead = 3; // 2 for borders + 1 for subtitle (title is embedded in top border)
    const actualHeight = height || 20;
    const maxLines = Math.max(1, actualHeight - boxOverhead);
    
    if (process.env.TUI_DEBUG) {
        console.error(`[StatusPanel] height=${height}, actualHeight=${actualHeight}, maxLines=${maxLines}`);
    }
    
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
    let startLine = scrollOffset < itemLinePositions.length ? itemLinePositions[scrollOffset].start : 0;
    
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
    
    if (process.env.TUI_DEBUG) {
        console.error(`[StatusPanel] scrollOffset=${scrollOffset}, visibleCount=${visibleCount}, visibleItems=${visibleItems.length}`);
    }
    
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
                        const statusColor = 
                            item.status === '✓' ? theme.colors.successGreen :
                            item.status === '⚠' ? theme.colors.warningOrange :
                            item.status === '⋯' ? theme.colors.accent : undefined;
                        
                        // Calculate available width for text
                        const indicatorWidth = 2; // '▼' + space
                        const statusWidth = item.status ? contentService.measureText(' ' + item.status) : 0;
                        const textMaxWidth = itemMaxWidth - indicatorWidth - statusWidth;
                        const truncatedText = contentService.truncateText(item.text, textMaxWidth);
                        
                        // Custom rendering for status item header
                        elements.push(
                            <Box key={`item-${visualIndex}-header`}>
                                <Text color={isSelected ? theme.colors.accent : undefined}>
                                    {'▼'} {truncatedText}
                                </Text>
                                {item.status && (
                                    <Text color={statusColor}> {item.status}</Text>
                                )}
                            </Box>
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
                        const statusColor = 
                            item.status === '✓' ? theme.colors.successGreen :
                            item.status === '⚠' ? theme.colors.warningOrange :
                            item.status === '⋯' ? theme.colors.accent : undefined;
                        
                        // Calculate available width for text
                        const indicatorWidth = 2; // indicator + space
                        const statusWidth = item.status ? contentService.measureText(' ' + item.status) : 0;
                        const textMaxWidth = itemMaxWidth - indicatorWidth - statusWidth;
                        const truncatedText = contentService.truncateText(item.text, textMaxWidth);
                        
                        // Custom rendering for status item
                        elements.push(
                            <Box key={`item-${visualIndex}`}>
                                <Text color={isSelected ? theme.colors.accent : undefined}>
                                    {isSelected ? '▶' : '○'} {truncatedText}
                                </Text>
                                {item.status && (
                                    <Text color={statusColor}> {item.status}</Text>
                                )}
                            </Box>
                        );
                    }
                });
                
                return elements.length > 0 ? elements : <Text color={theme.colors.textMuted}>{statusItems.length} items</Text>;
            })()}
        </BorderedBox>
    );
};