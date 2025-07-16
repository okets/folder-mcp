import React, { ReactElement } from 'react';
import { Box, Text, Key, Transform } from 'ink';
import { IListItem } from './IListItem';
import { theme } from '../../utils/theme';
import { textColorProp } from '../../utils/conditionalProps';

/**
 * ContainerListItem - A ListItem that can display other ListItems inside it when expanded
 * 
 * This implements the core visual architecture for nested ListItems with proper:
 * - Collapsed/expanded states
 * - Internal scrolling logic (mimicking GenericListPanel)
 * - Input delegation chain
 * - Fixed height strategy to prevent infinite recursion
 * - Responsive behavior
 */
export class ContainerListItem implements IListItem {
    readonly selfConstrained = true as const;
    
    private _isControllingInput: boolean = false;
    private _childItems: IListItem[] = [];
    private _childSelectedIndex: number = 0;
    private _childScrollOffset: number = 0;
    private _childLinePositions: Array<{start: number, end: number}> = [];
    private _onComplete: ((results: any) => void) | undefined;
    private _isConfirmFocused: boolean = false;
    
    constructor(
        public icon: string,
        private label: string,
        childItems: IListItem[],
        public isActive: boolean = false,
        onComplete?: ((results: any) => void) | undefined
    ) {
        this._childItems = [...childItems];
        this._onComplete = onComplete;
    }
    
    get isControllingInput(): boolean {
        return this._isControllingInput;
    }
    
    get childItems(): IListItem[] {
        return this._childItems;
    }
    
    get selectedChildIndex(): number {
        return this._childSelectedIndex;
    }
    
    /**
     * Fixed height strategy - prevents infinite recursion
     * Always reports same height regardless of children count
     */
    getRequiredLines(maxWidth: number): number {
        if (!this._isControllingInput) {
            return 1; // Collapsed view
        }
        
        // FIXED HEIGHT - like FilePickerListItem
        // Always request 8 lines, scroll internally if needed
        return 8;
    }
    
    /**
     * Calculate which children are visible in the current viewport
     * This mimics GenericListPanel's scrolling logic
     */
    private calculateChildViewport(availableLines: number, maxWidth: number): {
        visibleChildren: IListItem[],
        scrollOffset: number,
        showScrollUp: boolean,
        showScrollDown: boolean
    } {
        // Step 1: Calculate line positions for all children
        this._childLinePositions = [];
        let currentLine = 0;
        
        for (let i = 0; i < this._childItems.length; i++) {
            const child = this._childItems[i];
            if (!child) continue;
            const childLines = child.getRequiredLines ? child.getRequiredLines(maxWidth - 2) : 1;
            
            this._childLinePositions.push({
                start: currentLine,
                end: currentLine + childLines
            });
            currentLine += childLines;
        }
        
        // Step 2: Calculate scroll offset to keep selected child visible
        // This is copied from GenericListPanel lines 149-156
        if (this._childSelectedIndex < this._childLinePositions.length) {
            const selectedPosition = this._childLinePositions[this._childSelectedIndex];
            if (selectedPosition) {
                // Keep selected child visible
                if (selectedPosition.end > this._childScrollOffset + availableLines) {
                    // Item is cut off at bottom - scroll down
                    this._childScrollOffset = selectedPosition.end - availableLines;
                } else if (selectedPosition.start < this._childScrollOffset) {
                    // Item is cut off at top - scroll up
                    this._childScrollOffset = selectedPosition.start;
                }
            }
        }
        
        // Step 3: Find visible children based on scroll offset
        const visibleChildren: IListItem[] = [];
        for (let i = 0; i < this._childItems.length; i++) {
            const pos = this._childLinePositions[i];
            const child = this._childItems[i];
            if (pos && child && pos.end > this._childScrollOffset && pos.start < this._childScrollOffset + availableLines) {
                visibleChildren.push(child);
            }
        }
        
        return {
            visibleChildren,
            scrollOffset: this._childScrollOffset,
            showScrollUp: this._childScrollOffset > 0,
            showScrollDown: this._childScrollOffset + availableLines < currentLine
        };
    }
    
    render(maxWidth: number, maxLines?: number): ReactElement | ReactElement[] {
        if (!this._isControllingInput) {
            // Collapsed view - single line
            return (
                <Text>
                    <Transform transform={output => output}>
                        <Text {...textColorProp(this.isActive ? theme.colors.accent : theme.colors.textMuted)}>
                            {this.icon}
                        </Text>
                        <Text {...textColorProp(this.isActive ? theme.colors.accent : undefined)}>
                            {' '}{this.label}
                        </Text>
                    </Transform>
                </Text>
            );
        }
        
        // Expanded view - show children
        const elements: ReactElement[] = [];
        const availableLines = (maxLines || 8) - 1; // Reserve space for header only (bottom border integrated)
        
        // Calculate viewport
        const viewport = this.calculateChildViewport(availableLines, maxWidth);
        
        // Header
        elements.push(
            <Text key="header">
                <Transform transform={output => output}>
                    <Text {...textColorProp(theme.colors.accent)}>
                        ■ {this.label}
                    </Text>
                </Transform>
            </Text>
        );
        
        // Render visible children with integrated scroll indicators
        viewport.visibleChildren.forEach((child, index) => {
            // Set active state
            const childGlobalIndex = this._childItems.indexOf(child);
            const isChildSelected = childGlobalIndex === this._childSelectedIndex && !this._isConfirmFocused;
            child.isActive = isChildSelected;
            
            
            // Determine line prefix with scroll indicators (like FilePickerBody)
            const isFirstVisible = index === 0;
            const isLastVisible = index === viewport.visibleChildren.length - 1;
            const isActualLastChild = childGlobalIndex === this._childItems.length - 1;
            
            // Calculate available lines for this child
            const childPosition = this._childLinePositions[childGlobalIndex];
            let childMaxLines = childPosition ? childPosition.end - childPosition.start : 1;
            
            // Special case: If this is the last child and we have extra space, give it dynamic height
            if (isActualLastChild && !viewport.showScrollDown) {
                const usedLines = elements.length - 1; // -1 because we haven't added this child yet
                const remainingLines = (maxLines || 8) - 1 - usedLines; // -1 for header
                childMaxLines = Math.max(childMaxLines, remainingLines);
            }
            let linePrefix = '│ ';
            
            if (viewport.showScrollUp && isFirstVisible) {
                linePrefix = '│▲';
            } else if (viewport.showScrollDown && isLastVisible) {
                linePrefix = '│▼';
            } else if (isActualLastChild && !viewport.showScrollDown) {
                // Last child gets continuation border (not bottom border since confirmation will have the bottom border)
                linePrefix = '│ ';
            }
            
            
            // Render child with border prefix using Box to avoid nesting issues
            // Calculate available width based on actual prefix length
            const prefixWidth = linePrefix.length;
            const childElements = child.render(maxWidth - prefixWidth, childMaxLines);
            
            // Special handling for ButtonsRow - it returns a Box that needs to expand vertically
            if (child.constructor.name === 'ButtonsRow') {
                // ButtonsRow returns a Box with flexDirection="row" containing 3-line bordered buttons
                // We need to wrap this in a Box with row layout to add the prefix while preserving height
                elements.push(
                    <Box key={`buttonsrow-${childGlobalIndex}`} flexDirection="row" height={childMaxLines}>
                        <Text {...textColorProp(theme.colors.textMuted)}>
                            {linePrefix}
                        </Text>
                        <Box flexGrow={1}>
                            {childElements}
                        </Box>
                    </Box>
                );
            } else {
                // All other children use normal row layout with prefix
                if (Array.isArray(childElements)) {
                    childElements.forEach((element, elemIndex) => {
                        const showPrefix = elemIndex === 0; // Only show prefix on first line of child
                        const prefixText = showPrefix ? linePrefix : '│ ';
                        
                        elements.push(
                            <Box key={`child-${childGlobalIndex}-${elemIndex}`} flexDirection="row">
                                <Text {...textColorProp(theme.colors.textMuted)}>
                                    {prefixText}
                                </Text>
                                {element}
                            </Box>
                        );
                    });
                } else {
                    elements.push(
                        <Box key={`child-${childGlobalIndex}`} flexDirection="row">
                            <Text {...textColorProp(theme.colors.textMuted)}>
                                {linePrefix}
                            </Text>
                            {childElements}
                        </Box>
                    );
                }
            }
        });
        
        // Add confirmation line (like folder picker)
        elements.push(
            <Text key="confirm-action">
                <Text {...textColorProp(theme.colors.textMuted)}>└─</Text>
                {this._isConfirmFocused ? (
                    <Text {...textColorProp(theme.colors.accent)}>▶ </Text>
                ) : (
                    <Text>  </Text>
                )}
                <Text {...textColorProp(theme.colors.successGreen)}>✓</Text>
                <Text {...textColorProp(this._isConfirmFocused ? theme.colors.accent : undefined)}> Confirm Selection</Text>
            </Text>
        );
        
        return elements;
    }
    
    /**
     * Input delegation system with priority handling
     */
    handleInput(input: string, key: Key): boolean {
        if (!this._isControllingInput) {
            return false;
        }
        
        const activeChild = this._childItems[this._childSelectedIndex];
        
        // Priority 1: If child is controlling input, delegate to it
        if (activeChild?.isControllingInput && activeChild.handleInput) {
            const childResult = activeChild.handleInput(input, key);
            return childResult;
        }
        
        // Priority 2: Handle navigation between children
        if (key.upArrow) {
            if (this._isConfirmFocused) {
                // Move back from confirmation to last child
                this._isConfirmFocused = false;
                this._childSelectedIndex = this._childItems.length - 1;
                const lastChild = this._childItems[this._childSelectedIndex];
                if (lastChild) {
                    lastChild.isActive = true;
                    if (lastChild.onSelect) {
                        lastChild.onSelect();
                    }
                }
                return true; // Moved back to last child
            }
            
            const oldIndex = this._childSelectedIndex;
            const newIndex = Math.max(0, this._childSelectedIndex - 1);
            
            // CRITICAL: Only return true if navigation actually happened
            // This prevents panel re-renders when user presses up at the first item
            if (newIndex !== oldIndex) {
                this.changeChildSelection(oldIndex, newIndex);
                return true; // Navigation happened - state changed
            } else {
                return false; // Already at boundary - no state change, no re-render needed
            }
        }
        
        if (key.downArrow) {
            if (this._isConfirmFocused) {
                // Already on confirmation - can't go further down
                return true; // CRITICAL: Consume input even when we can't navigate
            }
            
            const oldIndex = this._childSelectedIndex;
            
            // If we're at the last child, move to confirmation
            if (this._childSelectedIndex >= this._childItems.length - 1) {
                // Deselect current child first
                const currentChild = this._childItems[this._childSelectedIndex];
                if (currentChild) {
                    currentChild.isActive = false;
                    if (currentChild.onDeselect) {
                        currentChild.onDeselect();
                    }
                }
                this._isConfirmFocused = true;
                return true; // Moved to confirmation
            }
            
            const newIndex = this._childSelectedIndex + 1;
            this.changeChildSelection(oldIndex, newIndex);
            return true; // Navigation happened - state changed
        }
        
        if (key.return) {
            if (this._isConfirmFocused) {
                // Confirm action - call onComplete callback and exit
                if (this._onComplete) {
                    this._onComplete({}); // Pass results if needed
                }
                this.onExit();
                return true;
            }
            
            if (activeChild) {
                if (activeChild.onEnter) {
                    activeChild.onEnter(); // Child should take control
                    return true;
                }
            }
        }
        
        if (key.rightArrow) {
            if (this._isConfirmFocused) {
                return true; // Consume input when on confirmation, don't let it bubble up
            }
            
            // Right arrow: enter/expand selected subitem (same as Enter)
            if (activeChild) {
                if (activeChild.onEnter) {
                    activeChild.onEnter(); // Child should take control
                    return true;
                }
            }
            return true; // Consume right arrow even if no child action
        }
        
        if (key.leftArrow) {
            // Left arrow: close/exit nested list (same as Escape)
            this.onExit(); // Exit container
            return true;
        }
        
        if (key.escape) {
            this.onExit(); // Exit container
            return true;
        }
        
        if (key.tab) {
            // Allow tab to bubble up for panel navigation
            return false;
        }
        
        // CRITICAL: When container is controlling input, consume ALL input except tab
        // This prevents GenericListPanel from handling navigation when container is expanded
        return true;
    }
    
    /**
     * Enter expanded mode and initialize child states
     */
    onEnter(): void {
        this._isControllingInput = true;
        
        // Initialize child selection
        if (this._childSelectedIndex >= this._childItems.length) {
            this._childSelectedIndex = 0;
        }
        
        // Set initial active states and call onSelect for active child
        this._childItems.forEach((child, index) => {
            const wasActive = child.isActive;
            const isNowActive = (index === this._childSelectedIndex);
            child.isActive = isNowActive;
            
            // Call onSelect/onDeselect methods if they exist
            if (isNowActive && !wasActive && child.onSelect) {
                child.onSelect();
            } else if (!isNowActive && wasActive && child.onDeselect) {
                child.onDeselect();
            }
        });
    }
    
    /**
     * Change child selection and properly call onSelect/onDeselect
     */
    private changeChildSelection(oldIndex: number, newIndex: number): void {
        // Deselect old child
        if (oldIndex >= 0 && oldIndex < this._childItems.length) {
            const oldChild = this._childItems[oldIndex];
            if (oldChild) {
                oldChild.isActive = false;
                if (oldChild.onDeselect) {
                    oldChild.onDeselect();
                }
            }
        }
        
        // Update index
        this._childSelectedIndex = newIndex;
        
        // Select new child
        if (newIndex >= 0 && newIndex < this._childItems.length) {
            const newChild = this._childItems[newIndex];
            if (newChild) {
                newChild.isActive = true;
                if (newChild.onSelect) {
                    newChild.onSelect();
                }
            }
        }
    }
    
    /**
     * Exit expanded mode and clean up child states
     */
    onExit(): void {
        this._isControllingInput = false;
        
        // Clean up child states
        this._childItems.forEach(child => {
            child.isActive = false;
            if (child.isControllingInput && child.onExit) {
                child.onExit();
            }
        });
        
        // Reset scroll position
        this._childScrollOffset = 0;
    }
    
    onSelect(): void {
        // Visual feedback when selected
    }
    
    onDeselect(): void {
        // Remove visual feedback when deselected
        // Clean up any active child states
        this._childItems.forEach(child => {
            child.isActive = false;
        });
    }
    
    /**
     * Add a child item to the container
     */
    addChild(child: IListItem): void {
        this._childItems.push(child);
    }
    
    /**
     * Remove a child item from the container
     */
    removeChild(child: IListItem): void {
        const index = this._childItems.indexOf(child);
        if (index !== -1) {
            this._childItems.splice(index, 1);
            // Adjust selected index if needed
            if (this._childSelectedIndex >= this._childItems.length) {
                this._childSelectedIndex = Math.max(0, this._childItems.length - 1);
            }
        }
    }
    
    /**
     * Get results from all child items (for wizard completion)
     */
    getChildResults(): any[] {
        return this._childItems.map(child => {
            // This would depend on the specific child item implementation
            // For now, return a basic representation
            return {
                type: child.constructor.name,
                isActive: child.isActive,
                isControllingInput: child.isControllingInput
            };
        });
    }
}