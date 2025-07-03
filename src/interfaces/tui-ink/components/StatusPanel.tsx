import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, Key } from 'ink';
import { BorderedBox } from './core/BorderedBox';
import { LogItem } from './core/LogItem';
import { calculateScrollbar } from './core/ScrollbarCalculator';
import { theme } from '../utils/theme';
import { useNavigationContext } from '../contexts/NavigationContext';
import { useTerminalSize } from '../hooks/useTerminalSize';
import { useLayoutConstraints } from '../contexts/LayoutContext';
import { useFocusChain } from '../hooks/useFocusChain';
import { createStatusPanelItems } from '../models/mixedSampleData';
import { useDI } from '../di/DIContext';
import { ServiceTokens } from '../di/tokens';
import { SelfConstrainedWrapper } from './core/SelfConstrainedWrapper';
import { ProgressModeProvider } from '../contexts/ProgressModeContext';
import { textColorProp, buildProps } from '../utils/conditionalProps';

// Get mixed items for this panel
const mixedItems = createStatusPanelItems();


export const StatusPanel: React.FC<{ width?: number; height?: number; isMinimized?: boolean; isFrameOnly?: boolean }> = ({ width, height, isMinimized = false, isFrameOnly = false }) => {
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
            if (isSelected) {
                // Check if it's a LogItem without details
                if (item instanceof LogItem && !(item as any).details) {
                    (item as any).icon = '■'; // Rectangle for non-expandable
                } else {
                    (item as any).icon = '▶'; // Arrow for expandable
                }
            } else {
                (item as any).icon = item instanceof LogItem ? '○' : '·';
            }
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
        const itemLines = mixedItems[i].getRequiredLines(itemMaxWidth);
        const remainingSpace = maxLines - (itemLinePositions[i].start - startLine);
        
        // Include item if it at least partially fits (minimum 1 line for header)
        if (remainingSpace >= 1) {
            visibleCount++;
            linesUsed = itemLinePositions[i].start - startLine + Math.min(itemLines, remainingSpace);
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
        if (key.return && selectedItem?.onEnter) {
            selectedItem.onEnter();
            // Force re-render for any state changes
            setUpdateTrigger(prev => prev + 1);
            return true;
        } else if (key.rightArrow && selectedItem) {
            // Right arrow expands (if item supports it)
            if ('onExpand' in selectedItem && typeof selectedItem.onExpand === 'function') {
                selectedItem.onExpand();
                setUpdateTrigger(prev => prev + 1);
                return true;
            } else if (selectedItem.onEnter) {
                // Fallback to onEnter for items that don't have onExpand
                selectedItem.onEnter();
                setUpdateTrigger(prev => prev + 1);
                return true;
            }
        } else if ((key.leftArrow || key.escape) && selectedItem) {
            // Left arrow or ESC collapses (if item supports it)
            if ('onCollapse' in selectedItem && typeof selectedItem.onCollapse === 'function') {
                selectedItem.onCollapse();
                setUpdateTrigger(prev => prev + 1);
                return true;
            }
        }
        return false;
    }, [mixedItems, navigation.statusSelectedIndex]);
    
    // Determine key bindings based on selected item
    const selectedItem = mixedItems[navigation.statusSelectedIndex];
    const isLogItem = selectedItem && 'onExpand' in selectedItem && 'onCollapse' in selectedItem;
    const hasDetails = isLogItem && (selectedItem as any).details;
    const isExpanded = isLogItem && (selectedItem as any)._isExpanded;
    
    let keyBindings: Array<{key: string, description: string}> = [];
    if (isLogItem && hasDetails) {
        // LogItem with details - can expand/collapse
        if (isExpanded) {
            keyBindings = [
                { key: '←/Esc', description: 'Collapse' },
                { key: 'Enter', description: 'Toggle' }
            ];
        } else {
            keyBindings = [
                { key: '→/Enter', description: 'Expand' }
            ];
        }
    } else if (isLogItem) {
        // LogItem without details - no actions
        keyBindings = [];
    } else {
        // For ConfigurationListItem in status panel
        keyBindings = [
            { key: 'Enter', description: 'Edit' }
        ];
    }
    
    // Use focus chain
    useFocusChain({
        elementId: 'status-panel',
        parentId: 'navigation',
        isActive: navigation.isStatusFocused,
        keyBindings: keyBindings,
        priority: 50,
        ...(navigation.isStatusFocused ? { onInput: handleStatusInput } : {})
    });
    
    // Handle minimized display
    if (isMinimized || isFrameOnly) {
        // Calculate available width for the message
        const panelWidth = width || columns - 2;
        // BorderedBox subtracts 4 for borders/padding, take safety buffer
        const availableWidth = panelWidth - 4 - 1; // -1 for safety
        const fullMessage = "Compact Mode - tab to toggle panels"; // We'll handle styling differently
        
        let displayText = "";
        
        // Only show text if not in frame-only mode
        if (!isFrameOnly) {
            if (fullMessage.length <= availableWidth) {
                displayText = fullMessage;
            } else if (availableWidth > 3) {
                // Truncate with ellipsis
                const maxChars = availableWidth - 3;
                displayText = fullMessage.substring(0, maxChars) + "…";
            } else {
                // Very narrow - just show ellipsis
                displayText = "…";
            }
        }
        
        return (
            <BorderedBox
                title="System Status"
                focused={false}
                width={panelWidth}
                height={actualHeight}
                showScrollbar={false}
                scrollbarElements={[]}
                {...buildProps({ subtitle: "" })}
            >
                {displayText && (
                    displayText.includes('tab') && displayText === fullMessage ? (
                        <Box>
                            <Text {...textColorProp('#D1D5DB')}>Compact Mode - </Text>
                            <Text {...textColorProp('#D1D5DB')} bold>tab</Text>
                            <Text {...textColorProp('#D1D5DB')}> to toggle panels</Text>
                        </Box>
                    ) : (
                        <Text {...textColorProp('#D1D5DB')}>{displayText}</Text>
                    )
                )}
            </BorderedBox>
        );
    }
    
    return (
        <ProgressModeProvider width={panelWidth}>
            <BorderedBox
                title="System Status"
                focused={navigation.isStatusFocused}
                width={width || columns - 2}
                height={actualHeight}
                showScrollbar={showScrollbar}
                scrollbarElements={scrollbar}
                {...(actualHeight > 5 ? { subtitle: "Current state" } : {})}
            >
                {(() => {
                // Build a flat array to avoid Fragment key issues
                const elements: React.ReactElement[] = [];
                
                let remainingLines = maxLines;
                
                visibleItems.forEach((listItem, visualIndex) => {
                    // Pass the actual remaining lines so item can make responsive decisions
                    // The item will decide if it needs to switch layouts based on available space
                    const itemMaxLines = remainingLines;
                    
                    // Get rendered elements from list item
                    const itemElements = listItem.render(itemMaxWidth, itemMaxLines);
                    
                    // Handle both single element and array of elements
                    if (Array.isArray(itemElements)) {
                        // For multi-line items, wrap each element separately
                        itemElements.forEach((element, index) => {
                            elements.push(
                                <SelfConstrainedWrapper key={`item-${visualIndex}-${index}`}>
                                    {element}
                                </SelfConstrainedWrapper>
                            );
                        });
                        // Use the actual required lines, not the number of React elements
                        remainingLines -= listItem.getRequiredLines(itemMaxWidth);
                    } else {
                        elements.push(
                            <SelfConstrainedWrapper key={`item-${visualIndex}`}>
                                {itemElements}
                            </SelfConstrainedWrapper>
                        );
                        remainingLines -= 1;
                    }
                });
                
                return elements.length > 0 ? elements : <Text {...textColorProp(theme.colors.textMuted)}>{mixedItems.length} items</Text>;
            })()}
            </BorderedBox>
        </ProgressModeProvider>
    );
};