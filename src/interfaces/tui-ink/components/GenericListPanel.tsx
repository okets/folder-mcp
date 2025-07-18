import React, { useState, useCallback, memo, useContext } from 'react';
import { Box, Text, Key } from 'ink';
import { BorderedBox } from './core/BorderedBox';
import { LogItem } from './core/LogItem';
import { calculateScrollbar } from './core/ScrollbarCalculator';
import { useTheme } from '../contexts/ThemeContext';
import { useTerminalSize } from '../hooks/useTerminalSize';
import { useFocusChain } from '../hooks/useFocusChain';
import { SelfConstrainedWrapper } from './core/SelfConstrainedWrapper';
import { ProgressModeProvider } from '../contexts/ProgressModeContext';
import { textColorProp, buildProps } from '../utils/conditionalProps';
import { IListItem } from './core/IListItem';
import { updateGlobalTerminalSize } from './core/SimpleButtonsRow';

interface GenericListPanelProps {
    title: string;
    subtitle?: string;
    items: IListItem[];
    selectedIndex: number;
    isFocused: boolean;
    onInput?: (input: string, key: Key) => boolean;
    width?: number | undefined;
    height?: number | undefined;
    isMinimized?: boolean;
    isFrameOnly?: boolean;
    elementId: string;
    parentId: string;
    priority?: number;
}

const GenericListPanelComponent: React.FC<GenericListPanelProps> = ({
    title,
    subtitle,
    items,
    selectedIndex,
    isFocused,
    onInput,
    width,
    height,
    isMinimized = false,
    isFrameOnly = false,
    elementId,
    parentId,
    priority = 50
}) => {
    const { columns, rows } = useTerminalSize();
    
    // Update global terminal size for button components
    updateGlobalTerminalSize(rows);
    
    // Get dynamic theme colors
    const { theme } = useTheme();
    
    // Selective re-trigger for item state changes that aren't reflected in props
    const [itemUpdateTrigger, setItemUpdateTrigger] = useState(0);
    
    // Calculate content width for items  
    const panelWidth = width || columns - 2;
    const borderOverhead = 6; // Back to reasonable margin - the issue is BorderedBox border rendering, not text
    const itemMaxWidth = panelWidth - borderOverhead;
    
    
    
    // Calculate dynamic height based on content if no height specified
    let actualHeight: number;
    let maxLines: number;
    
    if (height) {
        // Fixed height mode - respect the height given by parent
        actualHeight = height;
        const boxOverhead = 2 + (subtitle ? 1 : 0); // 2 for borders + 1 for subtitle if present
        maxLines = Math.max(1, actualHeight - boxOverhead);
    } else {
        // Dynamic height mode - calculate based on content but respect terminal limits
        // First pass: calculate total content lines needed
        let totalRequiredLines = 0;
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item) continue;
            
            const itemLines = item.getRequiredLines ? item.getRequiredLines(itemMaxWidth) : 1;
            totalRequiredLines += itemLines;
            
        }
        
        // Calculate box overhead correctly based on BorderedBox implementation
        const boxOverhead = 2 + (subtitle ? 1 : 0); // 2 for borders + 1 for subtitle if present
        const idealHeight = totalRequiredLines + boxOverhead;
        
        
        // Respect terminal height - leave space for shell, prompt, etc.
        // For very small terminals, use most of the space; for larger ones, leave more breathing room
        let breathingRoom;
        if (rows <= 15) {
            breathingRoom = Math.max(2, Math.floor(rows * 0.2)); // Use 80% of very small terminals
        } else {
            breathingRoom = Math.min(10, Math.floor(rows * 0.3)); // Leave up to 30% on larger terminals, max 10 rows
        }
        const maxTerminalHeight = Math.max(5, rows - breathingRoom); // Minimum 5 rows for usability
        
        if (idealHeight <= maxTerminalHeight) {
            // Content fits in terminal - show all without scrolling
            maxLines = Math.max(1, totalRequiredLines);
            actualHeight = idealHeight;
        } else {
            // Content too large - use scrolling
            actualHeight = maxTerminalHeight;
            maxLines = Math.max(1, actualHeight - boxOverhead);
        }
        
    }
    
    
    
    // Don't mutate items during render - this causes re-renders
    
    // Calculate total content lines and line positions using list items
    let totalContentLines = 0;
    const itemLinePositions: Array<{start: number, end: number}> = [];
    let currentLine = 0;
    
    try {
        // Only calculate if we have items
        if (items.length > 0) {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (!item) continue;
                
                const itemLines = item.getRequiredLines ? item.getRequiredLines(itemMaxWidth) : 1;
                // Cap item lines to maxLines to prevent overflow
                const cappedItemLines = Math.min(itemLines, maxLines);
                
                totalContentLines += cappedItemLines;
                itemLinePositions.push({
                    start: currentLine,
                    end: currentLine + cappedItemLines
                });
                currentLine += cappedItemLines;
                
            }
        }
    } catch (error) {
        throw error;
    }
    
    // Calculate scroll offset in lines
    let lineScrollOffset = 0;
    
    try {
        // Only calculate scroll if content exceeds viewport
        if (totalContentLines > maxLines && selectedIndex < itemLinePositions.length) {
            const activeItem = itemLinePositions[selectedIndex];
            
            // Bring active item into view
            if (activeItem && activeItem.end > lineScrollOffset + maxLines) {
                // Item is cut off at bottom - scroll down to align bottom
                lineScrollOffset = activeItem.end - maxLines;
            } else if (activeItem && activeItem.start < lineScrollOffset) {
                // Item is cut off at top - scroll up to show it
                lineScrollOffset = activeItem.start;
            }
        }
    } catch (error) {
        throw error;
    }
    
    // Find first visible item based on line scroll offset
    let scrollOffset = 0;
    try {
        for (let i = 0; i < items.length && i < itemLinePositions.length; i++) {
            const pos = itemLinePositions[i];
            if (pos && pos.end > lineScrollOffset) {
                scrollOffset = i;
                break;
            }
        }
    } catch (error) {
        throw error;
    }
    
    // Calculate how many items actually fit in the viewport
    let visibleCount = 0;
    
    try {
        for (let i = scrollOffset; i < items.length && i < itemLinePositions.length; i++) {
            const item = items[i];
            const pos = itemLinePositions[i];
            if (!item || !pos) continue;
            const itemLines = item.getRequiredLines ? item.getRequiredLines(itemMaxWidth) : 1;
            const remainingSpace = maxLines - (pos.start - (itemLinePositions[scrollOffset]?.start ?? 0));
            // Include item if it at least partially fits (minimum 1 line for header)
            if (remainingSpace >= 1) {
                visibleCount++;
            } else {
                break;
            }
        }
    } catch (error) {
        throw error;
    }
    
    const visibleItems = items.slice(scrollOffset, scrollOffset + visibleCount);
    
    // Calculate visible lines for the current viewport
    let visibleLines = 0;
    try {
        visibleItems.forEach((listItem, index) => {
            const itemLines = listItem.getRequiredLines(itemMaxWidth);
            visibleLines += itemLines;
        });
    } catch (error) {
        throw error;
    }
    
    // Show scrollbar only if total lines exceed available space
    const showScrollbar = totalContentLines > maxLines;
    
    // Use the line scroll offset we already calculated
    const scrollbarLineOffset = lineScrollOffset;
    
    // Use the line position we already calculated
    const selectedLinePosition = selectedIndex < itemLinePositions.length && itemLinePositions[selectedIndex] 
        ? itemLinePositions[selectedIndex]?.start 
        : 0;
    
    const scrollbar = showScrollbar ? calculateScrollbar({
        totalItems: totalContentLines,
        visibleItems: Math.min(visibleLines, maxLines),
        scrollOffset: scrollbarLineOffset,
        ...(typeof selectedLinePosition === 'number' ? { selectedIndex: selectedLinePosition } : {}),
    }) : [];
    
    // Handle input
    const handleInput = useCallback((input: string, key: Key): boolean => {
        if (onInput) {
            const handled = onInput(input, key);
            if (handled) {
                return true;
            }
        }
        
        const selectedItem = items[selectedIndex];
        
        // If an item is controlling input, delegate to it
        if (selectedItem?.isControllingInput && selectedItem.handleInput) {
            const handled = selectedItem.handleInput(input, key);
            
            // CRITICAL TUI PATTERN: Only trigger re-render when item reports state change
            // The item's handleInput() should return true ONLY when its internal state changed
            // This prevents unnecessary panel re-renders that cause terminal flickering
            if (handled) {
                setItemUpdateTrigger(prev => prev + 1); // Force re-render to show state change
            }
            return handled;
        }
        
        // Otherwise handle navigation
        if (key.return && selectedItem?.onEnter) {
            selectedItem.onEnter();
            // Trigger re-render for items that change internal state (like expanding)
            setItemUpdateTrigger(prev => prev + 1);
            return true;
        } else if (key.rightArrow && selectedItem) {
            // Right arrow expands (if item supports it)
            if ('onExpand' in selectedItem && typeof selectedItem.onExpand === 'function') {
                selectedItem.onExpand();
                // Trigger re-render for expansion
                setItemUpdateTrigger(prev => prev + 1);
                return true;
            } else if (selectedItem.onEnter) {
                // Fallback to onEnter for items that don't have onExpand
                selectedItem.onEnter();
                // Trigger re-render for items that change internal state
                setItemUpdateTrigger(prev => prev + 1);
                return true;
            }
        } else if (key.leftArrow && selectedItem) {
            // Left arrow collapses (if item supports it)
            if ('onCollapse' in selectedItem && typeof selectedItem.onCollapse === 'function') {
                selectedItem.onCollapse();
                // Trigger re-render for collapse
                setItemUpdateTrigger(prev => prev + 1);
                return true;
            }
        } else if (key.escape && selectedItem) {
            // ESC collapses (if item supports it), but if nothing to collapse, let it bubble up for app exit
            if ('onCollapse' in selectedItem && typeof selectedItem.onCollapse === 'function') {
                selectedItem.onCollapse();
                // Trigger re-render for collapse
                setItemUpdateTrigger(prev => prev + 1);
                return true;
            }
            // If no collapse action available, let escape bubble up for app exit
            return false;
        }
        return false;
    }, [items, selectedIndex, onInput, setItemUpdateTrigger]);
    
    // Determine key bindings based on selected item
    const selectedItem = items[selectedIndex];
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
        // For ConfigurationListItem and other items
        keyBindings = [
            { key: 'Enter', description: 'Edit' }
        ];
    }
    
    // Use focus chain
    useFocusChain({
        elementId: elementId,
        parentId: parentId,
        isActive: isFocused,
        keyBindings: keyBindings,
        priority: priority,
        ...(isFocused ? { onInput: handleInput } : {})
    });
    
    // Handle minimized display
    if (isMinimized || isFrameOnly) {
        // Calculate available width for the message
        const panelWidth = width || columns - 2;
        // BorderedBox subtracts 4 for borders/padding, take safety buffer
        const availableWidth = panelWidth - 4 - 1; // -1 for safety
        const fullMessage = "Compact Mode - tab to toggle panels";
        
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
                title={title}
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
                title={title}
                focused={isFocused}
                width={width || columns - 2}
                height={actualHeight}
                showScrollbar={showScrollbar}
                scrollbarElements={scrollbar}
                {...(actualHeight > 5 && subtitle ? { subtitle: subtitle } : {})}
            >
                {(() => {
                    try {
                        // Build a flat array to avoid Fragment key issues
                        const elements: React.ReactElement[] = [];
                        
                        let remainingLines = maxLines;
                        
                        visibleItems.forEach((listItem, visualIndex) => {
                            // Calculate if this item is selected
                            const actualIndex = scrollOffset + visualIndex;
                            const isSelected = isFocused && selectedIndex === actualIndex;
                            
                            // Update item state without mutation - items check this internally
                            if (listItem && typeof listItem === 'object' && 'isActive' in listItem) {
                                (listItem as any).isActive = isSelected;
                            }
                            
                            // Debug logging for ContainerListItem
                            if (listItem && listItem.constructor.name === 'ContainerListItem') {
                                console.error(`\n=== PANEL RENDERING CONTAINER ===`);
                                console.error(`Container label: ${(listItem as any).label}`);
                                console.error(`Is controlling: ${(listItem as any).isControllingInput}`);
                                console.error(`Panel max lines: ${maxLines}`);
                                console.error(`Remaining lines: ${remainingLines}`);
                                console.error(`Item max lines: ${Math.min(remainingLines, maxLines)}`);
                                console.error(`=== END PANEL DEBUG ===\n`);
                            }
                            
                            // Built-in cursor management for panel-level navigation
                            if (listItem && typeof listItem === 'object' && 'icon' in listItem) {
                                // Store original icon if not already stored
                                if (!(listItem as any)._originalIcon) {
                                    (listItem as any)._originalIcon = (listItem as any).icon;
                                }
                                
                                // Calculate what icon should be without mutating during render
                                let targetIcon = (listItem as any)._originalIcon;
                                if (isSelected && isFocused) {
                                    // Check if item is controlling input
                                    if ((listItem as any).isControllingInput) {
                                        // Item is active/controlling - show ■
                                        targetIcon = '■';
                                    } else {
                                        // Item is selected but panel is active - show ▶
                                        targetIcon = '▶';
                                    }
                                }
                                
                                // Only mutate if different to avoid unnecessary re-renders
                                if ((listItem as any).icon !== targetIcon) {
                                    (listItem as any).icon = targetIcon;
                                }
                            }
                            
                            // Pass the actual remaining lines so item can make responsive decisions
                            // Ensure we never give more lines than the panel has available
                            const itemMaxLines = Math.min(remainingLines, maxLines);
                            
                            
                            // Get rendered elements from list item
                            const itemElements = listItem.render(itemMaxWidth, itemMaxLines);
                            
                            // Handle both single element and array of elements
                            if (Array.isArray(itemElements)) {
                                // Debug array rendering for ContainerListItem
                                if (listItem.constructor.name === 'ContainerListItem') {
                                    console.error(`Container returned ${itemElements.length} elements`);
                                }
                                
                                // For multi-line items, wrap each element separately
                                itemElements.forEach((element, index) => {
                                    elements.push(
                                        <SelfConstrainedWrapper key={`item-${visualIndex}-${index}`}>
                                            {element}
                                        </SelfConstrainedWrapper>
                                    );
                                });
                                // Use the actual required lines, not the number of React elements
                                const requiredLines = listItem.getRequiredLines(itemMaxWidth);
                                // Cap to actual lines rendered to prevent underflow
                                const linesUsed = Math.min(requiredLines, itemMaxLines);
                                remainingLines -= linesUsed;
                                
                                if (listItem.constructor.name === 'ContainerListItem') {
                                    console.error(`Container used ${linesUsed} lines, remaining: ${remainingLines}`);
                                }
                            } else {
                                elements.push(
                                    <SelfConstrainedWrapper key={`item-${visualIndex}`}>
                                        {itemElements}
                                    </SelfConstrainedWrapper>
                                );
                                remainingLines -= 1;
                            }
                        });
                        
                        
                        const result = elements.length > 0 ? elements : <Text {...textColorProp(theme.colors.textMuted)}>{items.length} items</Text>;
                        return result;
                    } catch (error) {
                        return <Text>Error rendering items</Text>;
                    }
                })()}
            </BorderedBox>
        </ProgressModeProvider>
    );
};

// Export with memoization to prevent unnecessary re-renders
// Only re-render when props actually change
export const GenericListPanel = memo(GenericListPanelComponent, (prevProps, nextProps) => {
    // Custom comparison function to debug memo failures
    const propsEqual = (
        prevProps.title === nextProps.title &&
        prevProps.subtitle === nextProps.subtitle &&
        prevProps.selectedIndex === nextProps.selectedIndex &&
        prevProps.isFocused === nextProps.isFocused &&
        prevProps.width === nextProps.width &&
        prevProps.height === nextProps.height &&
        prevProps.isMinimized === nextProps.isMinimized &&
        prevProps.isFrameOnly === nextProps.isFrameOnly &&
        prevProps.elementId === nextProps.elementId &&
        prevProps.parentId === nextProps.parentId &&
        prevProps.priority === nextProps.priority &&
        prevProps.items.length === nextProps.items.length &&
        prevProps.onInput === nextProps.onInput
    );
    
    
    return propsEqual;
});