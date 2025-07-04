import React, { useState, useEffect, useCallback, Fragment } from 'react';
import { Box, Text, Key } from 'ink';
import { BorderedBox } from './core/BorderedBox';
import { ConfigurationListItem } from './core/ConfigurationListItem';
import { LogItem } from './core/LogItem';
import { FilePickerListItem } from './core/FilePickerListItem';
import { SelectionListItem } from './core/SelectionListItem';
import { theme } from '../utils/theme';
import { createConfigurationPanelItems } from '../models/mixedSampleData';
import { useNavigationContext } from '../contexts/NavigationContext';
import { useTerminalSize } from '../hooks/useTerminalSize';
import { useLayoutConstraints } from '../contexts/LayoutContext';
import { useDI } from '../di/DIContext';
import { ServiceTokens } from '../di/tokens';
import { useFocusChain } from '../hooks/useFocusChain';
import { useRenderSlots } from '../hooks/useRenderSlots';
import { calculateScrollbar } from './core/ScrollbarCalculator';
import { SelfConstrainedWrapper } from './core/SelfConstrainedWrapper';
import { ProgressModeProvider } from '../contexts/ProgressModeContext';

// Get mixed items for configuration panel
const configItems = createConfigurationPanelItems();


export const ConfigurationPanel: React.FC<{ 
    width?: number; 
    height?: number;
    onEditModeChange?: (isInEditMode: boolean) => void;
    isMinimized?: boolean;
    isFrameOnly?: boolean;
}> = ({ width, height, onEditModeChange, isMinimized = false, isFrameOnly = false }) => {
    // Force update trigger
    const [updateTrigger, setUpdateTrigger] = useState(0);
    
    // Use the mixed items directly
    const configListItems = configItems;
    
    // Use shared navigation context
    const navigation = useNavigationContext();
    const { columns } = useTerminalSize();
    const constraints = useLayoutConstraints();
    const di = useDI();
    const statusBarService = di.resolve(ServiceTokens.StatusBarService);
    const inputContextService = di.resolve(ServiceTokens.InputContextService);
    
    // Update item states based on selection
    configListItems.forEach((item, index) => {
        const isSelected = navigation.isConfigFocused && navigation.configSelectedIndex === index;
        if (isSelected) {
            // Check if it's a LogItem without details
            if (item instanceof LogItem && !(item as any).details) {
                item.icon = '■'; // Rectangle for non-expandable
            } else {
                item.icon = '▶'; // Arrow for expandable
            }
        } else {
            item.icon = '·';
        }
        item.isActive = isSelected;
    });
    
    // Check if any item is in edit mode
    const isAnyItemInEditMode = configListItems.some(item => item.isControllingInput);
    
    // Use render slots when a node is in edit mode
    const { totalSlots } = useRenderSlots({
        elementId: 'config-panel-editmode',
        containerId: 'config-panel',
        slots: isAnyItemInEditMode ? 3 : 0,
        enabled: isAnyItemInEditMode
    });
    
    // Notify parent about edit mode state changes
    useEffect(() => {
        onEditModeChange?.(isAnyItemInEditMode);
    }, [isAnyItemInEditMode, onEditModeChange]);
    
    // Calculate visible count based on height
    // BorderedBox uses: height - 2 (borders) - 1 (subtitle) = height - 3
    const boxOverhead = 3; // top border + bottom border + subtitle
    const actualHeight = height || 20;
    const maxLines = Math.max(1, actualHeight - boxOverhead);
    
    // Calculate content width for items
    const panelWidth = width || columns - 2;
    // BorderedBox overhead: 2 chars for left border + space, 2 chars for space + right border = 4
    // We'll assume scrollbar is needed and subtract 1 more to be safe
    const itemMaxWidth = panelWidth - 4 - 1;
    
    // Calculate line positions for all items
    const itemLinePositions: Array<{start: number, end: number}> = [];
    let totalContentLines = 0;
    let currentLine = 0;
    
    if (configListItems.length > 0) {
        for (let i = 0; i < configListItems.length; i++) {
            const item = configListItems[i];
            if (!item) continue;
            const itemLines = item.getRequiredLines(itemMaxWidth);
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
    if (totalContentLines > maxLines && navigation.configSelectedIndex < itemLinePositions.length) {
        const activeItem = itemLinePositions[navigation.configSelectedIndex];
        
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
    for (let i = 0; i < configListItems.length && i < itemLinePositions.length; i++) {
        const position = itemLinePositions[i];
        if (position && position.end > lineScrollOffset) {
            scrollOffset = i;
            break;
        }
    }
    
    // Calculate how many items actually fit in the viewport
    let visibleCount = 0;
    let linesUsed = 0;
    const scrollPosition = itemLinePositions[scrollOffset];
    let startLine = scrollPosition ? scrollPosition.start : 0;
    
    for (let i = scrollOffset; i < configListItems.length && i < itemLinePositions.length; i++) {
        const position = itemLinePositions[i];
        if (!position) continue;
        
        const item = configListItems[i];
        if (!item) continue;
        const itemLines = item.getRequiredLines(itemMaxWidth);
        const remainingSpace = maxLines - (position.start - startLine);
        
        // Include item if it at least partially fits (minimum 1 line for header)
        if (remainingSpace >= 1) {
            visibleCount++;
            const itemPosition = itemLinePositions[i];
            if (!itemPosition) continue;
            linesUsed = itemPosition.start - startLine + Math.min(itemLines, remainingSpace);
        } else {
            break;
        }
    }
    
    const visibleItems = configListItems.slice(scrollOffset, scrollOffset + visibleCount);
    
    // Total lines already calculated above
    const totalLines = totalContentLines;
    
    // Calculate visible lines for the current viewport
    let visibleLines = 0;
    visibleItems.forEach((item) => {
        visibleLines += item.getRequiredLines(itemMaxWidth);
    });
    
    // Show scrollbar only if total lines exceed available space
    const showScrollbar = totalLines > maxLines;
    
    // Use the line scroll offset we already calculated
    const scrollbarLineOffset = lineScrollOffset;
    
    // Use the line position we already calculated
    const selectedPosition = itemLinePositions[navigation.configSelectedIndex];
    const selectedLinePosition = selectedPosition ? selectedPosition.start : 0;
    
    const scrollbar = showScrollbar ? calculateScrollbar({
        totalItems: totalLines,
        visibleItems: Math.min(visibleLines, maxLines),
        scrollOffset: scrollbarLineOffset,
        selectedIndex: selectedLinePosition
    }) : [];
    
    // Handle configuration panel input
    const handleConfigInput = useCallback((input: string, key: Key): boolean => {
        const selectedIndex = navigation.configSelectedIndex;
        const selectedItem = configListItems[selectedIndex];
        if (!selectedItem) return false;

        // If item is controlling input, delegate to it
        if (selectedItem.isControllingInput && typeof selectedItem.handleInput === 'function') {
            const handled = selectedItem.handleInput(input, key);
            setUpdateTrigger(prev => prev + 1);
            return handled;
        }

        // Otherwise handle entering edit mode or expanding/collapsing
        if (key.return) {
            if (typeof selectedItem.onEnter === 'function') {
                selectedItem.onEnter();
            }
            setUpdateTrigger(prev => prev + 1);
            return true;
        } else if (key.rightArrow) {
            // Right arrow expands LogItems or enters edit mode for ConfigurationListItems
            if (typeof (selectedItem as any).onExpand === 'function') {
                (selectedItem as any).onExpand();
                setUpdateTrigger(prev => prev + 1);
                return true;
            } else if (typeof selectedItem.onEnter === 'function') {
                selectedItem.onEnter();
                setUpdateTrigger(prev => prev + 1);
                return true;
            }
        } else if (key.leftArrow || key.escape) {
            // Left arrow or ESC collapses LogItems
            if (typeof (selectedItem as any).onCollapse === 'function') {
                (selectedItem as any).onCollapse();
                setUpdateTrigger(prev => prev + 1);
                return true;
            }
        }
        return false;
    }, [configListItems, navigation.configSelectedIndex]);
    
    // Determine key bindings based on selected item and edit mode
    const selectedItem = configListItems[navigation.configSelectedIndex];
    const isLogItem = !!selectedItem && 'onExpand' in selectedItem && 'onCollapse' in selectedItem;
    const hasDetails = isLogItem && selectedItem && (selectedItem as any).details;
    const isExpanded = isLogItem && selectedItem && (selectedItem as any)._isExpanded;
    
    let keyBindings: Array<{key: string, description: string}> = [];
    if (isAnyItemInEditMode) {
        // Check if it's a FilePickerListItem in control
        if (selectedItem instanceof FilePickerListItem && selectedItem.isControllingInput) {
            keyBindings = [
                { key: '↑↓←→', description: 'Navigate' },
                { key: 'Enter', description: 'Open/Select' },
                { key: 'Esc', description: 'Cancel' },
                { key: 'H', description: 'Toggle Hidden' }
            ];
        } else if (selectedItem instanceof SelectionListItem && selectedItem.isControllingInput) {
            // SelectionListItem - show space as the primary action
            // Use the effective layout to determine navigation keys
            const navKey = selectedItem.effectiveLayout === 'vertical' ? '↑↓' : '←→';
            if (selectedItem.effectiveLayout === 'horizontal') {
                keyBindings = [
                    { key: 'Space', description: 'Toggle' },
                    { key: navKey, description: 'Navigate' },
                    { key: '↑↓/Esc', description: 'Cancel' },
                    { key: 'Enter', description: 'Save' }
                ];
            } else {
                keyBindings = [
                    { key: 'Space', description: 'Toggle' },
                    { key: navKey, description: 'Navigate' },
                    { key: 'Esc', description: 'Cancel' },
                    { key: 'Enter', description: 'Save' }
                ];
            }
        } else {
            // Generic edit mode for text inputs
            keyBindings = [
                { key: '←→', description: 'Move cursor' },
                { key: 'Esc', description: 'Cancel' },
                { key: 'Enter', description: 'Save' }
            ];
        }
    } else if (isLogItem && hasDetails) {
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
        // For ConfigurationListItem not in edit mode
        keyBindings = [
            { key: '→/Enter', description: 'Edit' }
        ];
    }
    
    // Use focus chain
    const focusChainOptions = {
        elementId: 'config-panel',
        parentId: 'navigation',
        isActive: navigation.isConfigFocused,
        keyBindings: keyBindings,
        priority: isAnyItemInEditMode ? 1000 : 50 // Very high priority when in edit mode
    };
    
    // Only add onInput if it's defined
    if (navigation.isConfigFocused) {
        (focusChainOptions as any).onInput = handleConfigInput;
    }
    
    const { isInFocusChain } = useFocusChain(focusChainOptions as any);
    
    // Handle minimized display
    if (isMinimized || isFrameOnly) {
        // Calculate available width for the message
        const borderWidth = 2; // left and right borders
        const paddingWidth = 2; // left and right padding
        const availableWidth = panelWidth - borderWidth - paddingWidth;
        const fullMessage = "Compact Mode - \x1b[1;37mtab\x1b[0m to toggle panels";
        
        let displayText = "";
        
        // Only show text if not in frame-only mode
        if (!isFrameOnly) {
            if (fullMessage.length <= availableWidth) {
                displayText = fullMessage;
            } else if (availableWidth > 3) {
                // Truncate with ellipsis, ensuring we have room for at least one character + ...
                displayText = fullMessage.slice(0, availableWidth - 3) + "...";
            } else {
                // Very narrow - just show ellipsis
                displayText = "...";
            }
        }
        
        return (
            <BorderedBox
                title="Configuration"
                subtitle=""
                focused={false}
                width={panelWidth}
                height={actualHeight}
                showScrollbar={false}
                scrollbarElements={[]}
            >
                {displayText && <Text color={theme.colors.textSecondary}>{displayText}</Text>}
            </BorderedBox>
        );
    }
    
    return (
        <ProgressModeProvider width={panelWidth}>
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
                
                let remainingLines = maxLines;
                
                visibleItems.forEach((listItem, visualIndex) => {
                    // Pass the actual remaining lines so item can make responsive decisions
                    // The item will decide if it needs to switch layouts based on available space
                    const itemMaxLines = remainingLines;
                    
                    // Get rendered elements from list item
                    const itemElements = listItem.render(itemMaxWidth, itemMaxLines);
                    
                    // Wrap in SelfConstrainedWrapper to prevent double truncation
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
                
                return elements;
            })()}
            </BorderedBox>
        </ProgressModeProvider>
    );
};