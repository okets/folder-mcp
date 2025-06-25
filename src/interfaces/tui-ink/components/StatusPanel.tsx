import React from 'react';
import { Box, Text } from 'ink';
import { BorderedBox } from './BorderedBox.js';
import { theme } from '../utils/theme.js';
import { useNavigationContext } from '../contexts/NavigationContext.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import { statusItems } from '../models/sampleData.js';
import { StatusItemLayout } from './StatusItemLayout.js';

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
    
    // Calculate visible count based on height
    const boxOverhead = 3; // 2 for borders + 1 for subtitle (title is embedded in top border)
    const maxItems = Math.max(1, (height || 20) - boxOverhead);
    const visibleCount = Math.min(statusItems.length, maxItems);
    
    // Calculate scroll offset
    let scrollOffset = 0;
    if (navigation.statusSelectedIndex >= visibleCount) {
        scrollOffset = navigation.statusSelectedIndex - visibleCount + 1;
    }
    
    const scrollbar = calculateScrollbar(statusItems.length, visibleCount, scrollOffset, navigation.statusSelectedIndex);
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
                    const key = `panel-status-item-${actualIndex}`;
                    
                    return (
                        <StatusItemLayout
                            key={key}
                            text={item.text}
                            status={item.status}
                            selectionIndicator={navigation.isStatusFocused && navigation.statusSelectedIndex === actualIndex ? '▶' : '○'}
                            color={navigation.isStatusFocused && navigation.statusSelectedIndex === actualIndex ? theme.colors.accent : undefined}
                            statusColor={
                                item.status === '✓' ? theme.colors.successGreen :
                                item.status === '⚠' ? theme.colors.warningOrange :
                                item.status === '⋯' ? theme.colors.accent : undefined
                            }
                        />
                    );
                })
            ) : (
                <Text color={theme.colors.textMuted}>{statusItems.length} items</Text>
            )}
        </BorderedBox>
    );
};