import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, Key } from 'ink';
import { BorderedBox } from './core/BorderedBox.js';
import { LogItem } from './core/LogItem.js';
import { calculateScrollbar } from './core/ScrollbarCalculator.js';
import { theme } from '../utils/theme.js';
import { useNavigationContext } from '../contexts/NavigationContext.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import { useLayoutConstraints } from '../contexts/LayoutContext.js';
import { useFocusChain } from '../hooks/useFocusChain.js';
import { createStatusPanelItems } from '../models/mixedSampleData.js';
import { useDI } from '../di/DIContext.js';
import { ServiceTokens } from '../di/tokens.js';

// Get mixed items for this panel
const mixedItems = createStatusPanelItems();


export const StatusPanel: React.FC<{ width?: number; height?: number }> = ({ width, height }) => {
    const navigation = useNavigationContext();
    const { columns } = useTerminalSize();
    const constraints = useLayoutConstraints();
    const di = useDI();
    const statusBarService = di.resolve(ServiceTokens.StatusBarService);
    
    // Local state for expanded items and force updates
    const [expandedIndices, setExpandedIndices] = useState<Set<number>>(new Set());
    const [updateTrigger, setUpdateTrigger] = useState(0);
    
    // Calculate visible count based on height
    const boxOverhead = 3; // 2 for borders + 1 for subtitle (title is embedded in top border)
    const actualHeight = height || 20;
    const maxLines = Math.max(1, actualHeight - boxOverhead);
    
    // Calculate content width for items
    const panelWidth = width || columns - 2;
    // BorderedBox subtracts 4 for borders/padding, plus 1 for scrollbar space
    const borderOverhead = 5;
    const itemMaxWidth = panelWidth - borderOverhead;
    
    // Update item states based on selection
    mixedItems.forEach((item, index) => {
        const isSelected = navigation.isStatusFocused && navigation.statusSelectedIndex === index;
        if ('icon' in item && 'isActive' in item) {
            (item as any).icon = isSelected ? '▶' : (item instanceof LogItem ? '○' : '·');
            (item as any).isActive = isSelected;
        }
    });
    
    // Calculate total content lines and line positions using list items
    let totalContentLines = 0;
    const itemLinePositions: Array<{start: number, end: number}> = [];
    let currentLine = 0;
    
    // Only calculate if we have items
    if (mixedItems.length > 0) {
        for (let i = 0; i < mixedItems.length; i++) {
            const itemLines = mixedItems[i].getRequiredLines(itemMaxWidth);
            totalContentLines += itemLines;
            
            itemLinePositions.push({
                start: currentLine,
                end: currentLine + itemLines
            });
            currentLine += itemLines;
        }
    }
    
    // Calculate scroll offset in lines
    let lineScrollOffset = 0;
    
    // Only calculate scroll if content exceeds viewport
    if (totalContentLines > maxLines && navigation.statusSelectedIndex < itemLinePositions.length) {
        const activeItem = itemLinePositions[navigation.statusSelectedIndex];
        
        // Bring active item into view
        if (activeItem && activeItem.end > lineScrollOffset + maxLines) {
            // Item is cut off at bottom - scroll down to align bottom
            lineScrollOffset = activeItem.end - maxLines;
        } else if (activeItem && activeItem.start < lineScrollOffset) {
            // Item is cut off at top - scroll up to show it
            lineScrollOffset = activeItem.start;
        }
    }
    
    // Find first visible item based on line scroll offset
    let scrollOffset = 0;
    for (let i = 0; i < mixedItems.length && i < itemLinePositions.length; i++) {
        if (itemLinePositions[i].end > lineScrollOffset) {
            scrollOffset = i;
            break;
        }
    }
    
    // Calculate how many items actually fit in the viewport
    let visibleCount = 0;
    let linesUsed = 0;
    let startLine = scrollOffset < itemLinePositions.length && itemLinePositions[scrollOffset] ? itemLinePositions[scrollOffset].start : 0;
    
    for (let i = scrollOffset; i < mixedItems.length && i < itemLinePositions.length; i++) {
        // Check if this item fits completely
        if (itemLinePositions[i] && itemLinePositions[i].end - startLine <= maxLines) {
            visibleCount++;
            linesUsed = itemLinePositions[i].end - startLine;
        } else {
            break;
        }
    }
    
    const visibleItems = mixedItems.slice(scrollOffset, scrollOffset + visibleCount);
    
    // Total lines already calculated above
    const totalLines = totalContentLines;
    
    // Calculate visible lines for the current viewport
    let visibleLines = 0;
    visibleItems.forEach((listItem) => {
        visibleLines += listItem.getRequiredLines(itemMaxWidth);
    });
    
    // Show scrollbar only if total lines exceed available space
    const showScrollbar = totalLines > maxLines;
    
    // Use the line scroll offset we already calculated
    const scrollbarLineOffset = lineScrollOffset;
    
    // Use the line position we already calculated
    const selectedLinePosition = navigation.statusSelectedIndex < itemLinePositions.length && itemLinePositions[navigation.statusSelectedIndex] 
        ? itemLinePositions[navigation.statusSelectedIndex].start 
        : 0;
    
    const scrollbar = showScrollbar ? calculateScrollbar({
        totalItems: totalLines,
        visibleItems: Math.min(visibleLines, maxLines),
        scrollOffset: scrollbarLineOffset,
        selectedIndex: selectedLinePosition
    }) : [];
    
    // Handle status panel input
    const handleStatusInput = useCallback((input: string, key: Key): boolean => {
        const selectedItem = mixedItems[navigation.statusSelectedIndex];
        
        // If an item is controlling input, delegate to it
        if (selectedItem?.isControllingInput && selectedItem.handleInput) {
            const handled = selectedItem.handleInput(input, key);
            // Force re-render for ConfigurationListItem updates
            setUpdateTrigger(prev => prev + 1);
            return handled;
        }
        
        // Otherwise handle navigation
        if ((key.return || key.rightArrow) && selectedItem?.onEnter) {
            selectedItem.onEnter();
            // Force re-render for any state changes
            setUpdateTrigger(prev => prev + 1);
            return true;
        }
        return false;
    }, [mixedItems, navigation.statusSelectedIndex]);
    
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
                
                let remainingLines = maxLines;
                
                visibleItems.forEach((listItem, visualIndex) => {
                    // Calculate max lines available for this item
                    const itemMaxLines = Math.min(
                        remainingLines,
                        listItem.getRequiredLines(itemMaxWidth)
                    );
                    
                    // Get rendered elements from list item
                    const itemElements = listItem.render(itemMaxWidth, itemMaxLines);
                    
                    // Handle both single element and array of elements
                    if (Array.isArray(itemElements)) {
                        itemElements.forEach((element, index) => {
                            elements.push(
                                React.cloneElement(element, { key: `item-${visualIndex}-${index}` })
                            );
                        });
                        remainingLines -= itemElements.length;
                    } else {
                        elements.push(
                            React.cloneElement(itemElements, { key: `item-${visualIndex}` })
                        );
                        remainingLines -= 1;
                    }
                });
                
                return elements.length > 0 ? elements : <Text color={theme.colors.textMuted}>{mixedItems.length} items</Text>;
            })()}
        </BorderedBox>
    );
};