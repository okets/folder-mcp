import React, { ReactElement } from 'react';
import { Box, Text, Key } from 'ink';
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
    readonly isNavigable = true; // ContainerListItems are interactive and navigable
    
    private _isControllingInput: boolean = false;
    private _childItems: IListItem[] = [];
    private _childSelectedIndex: number = 0;
    private _childScrollOffset: number = 0;
    private _childLinePositions: Array<{start: number, end: number}> = [];
    private _onComplete: ((results: any) => void) | undefined;
    private _isConfirmFocused: boolean = false;
    private _lastAvailableLines: number = 10; // Track actual available lines from render
    
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
     * Dynamic height strategy - calculate actual content height
     * Parent is responsible for capping based on available space
     */
    getRequiredLines(maxWidth: number): number {
        if (!this._isControllingInput) {
            return 1; // Collapsed view
        }
        
        // Calculate actual height needed based on children
        let totalLines = 1; // Header line
        
        const prefixWidth = 2; // "│ " prefix
        for (let i = 0; i < this._childItems.length; i++) {
            const child = this._childItems[i];
            if (!child) continue;
            const childLines = child.getRequiredLines ? child.getRequiredLines(maxWidth - prefixWidth) : 1;
            totalLines += childLines;
        }
        
        // Add 1 for confirmation line
        totalLines += 1;
        
        // Return actual content height - parent will handle constraints
        return totalLines;
    }
    
    /**
     * Calculate which children are visible in the current viewport
     * This mimics GenericListPanel's scrolling logic
     */
    private calculateChildViewport(availableLines: number, maxWidth: number): {
        visibleChildren: IListItem[],
        childLineCounts: number[],
        scrollOffset: number,
        showScrollUp: boolean,
        showScrollDown: boolean
    } {
        // Store the actual available lines for use in changeChildSelection
        this._lastAvailableLines = availableLines;
        
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
        
        // Step 2: Don't recalculate scroll offset here - it's managed by changeChildSelection
        // This prevents content from jumping during renders
        
        // Step 3: Find visible children based on scroll offset
        const visibleChildren: IListItem[] = [];
        const childLineCounts: number[] = [];
        let accumulatedLines = 0;
        
        for (let i = 0; i < this._childItems.length; i++) {
            const pos = this._childLinePositions[i];
            const child = this._childItems[i];
            
            if (!pos || !child) continue;
            
            // Skip children that are completely above the viewport
            if (pos.end <= this._childScrollOffset) continue;
            
            // Stop if we've used all available space
            if (accumulatedLines >= availableLines) break;
            
            // Calculate how much of this child is visible
            const childStartInViewport = Math.max(0, pos.start - this._childScrollOffset);
            const remainingSpace = availableLines - accumulatedLines;
            const childRequiredLines = pos.end - pos.start;
            
            // Constrain to remaining space
            const visibleLinesOfChild = Math.min(childRequiredLines, remainingSpace);
            
            // Only include if at least 1 line is visible
            if (visibleLinesOfChild > 0) {
                visibleChildren.push(child);
                childLineCounts.push(visibleLinesOfChild);
                accumulatedLines += visibleLinesOfChild;
                console.error(`Viewport calc: Child ${i} gets ${visibleLinesOfChild} lines (accumulated: ${accumulatedLines}/${availableLines})`);
            }
        }
        
        // Check if scrolling down would show more content
        let showScrollDown = false;
        
        if (this._childLinePositions.length > 0 && visibleChildren.length > 0) {
            const lastVisibleChild = visibleChildren[visibleChildren.length - 1];
            if (lastVisibleChild) {
                const lastVisibleIndex = this._childItems.indexOf(lastVisibleChild);
            
            if (lastVisibleIndex >= 0 && lastVisibleIndex < this._childLinePositions.length) {
                const lastVisiblePos = this._childLinePositions[lastVisibleIndex];
                
                // Show scroll down if scrolling would reveal more content
                // This happens when:
                // 1. There are more children that aren't visible at all
                const hasMoreChildren = lastVisibleIndex < this._childItems.length - 1;
                
                // 2. OR the last visible child is cut off AND scrolling would show more of it
                const lastChildExtendsBelow = lastVisiblePos ? 
                    (lastVisiblePos.end - this._childScrollOffset) > availableLines : false;
                
                // Calculate if we're already showing the maximum possible content
                // (i.e., we're scrolled to show the last child and confirmation)
                const lastChildPos = this._childLinePositions[this._childLinePositions.length - 1];
                const totalContentLines = lastChildPos ? lastChildPos.end : 0;
                const maxScrollOffset = Math.max(0, totalContentLines - availableLines);
                const atMaxScroll = this._childScrollOffset >= maxScrollOffset;
                
                showScrollDown = !atMaxScroll && (hasMoreChildren || lastChildExtendsBelow);
                
            }
            }
        }
        
        return {
            visibleChildren,
            childLineCounts,
            scrollOffset: this._childScrollOffset,
            showScrollUp: this._childScrollOffset > 0,
            showScrollDown: showScrollDown
        };
    }
    
    render(maxWidth: number, maxLines?: number): ReactElement | ReactElement[] {
        if (!this._isControllingInput) {
            // Collapsed view - single line with truncation
            const iconWidth = this.icon.length;
            const spaceWidth = 1; // space between icon and label
            const availableForLabel = maxWidth - iconWidth - spaceWidth;
            
            let displayLabel = this.label;
            if (this.label.length > availableForLabel) {
                // Truncate with ellipsis if needed
                displayLabel = this.label.substring(0, Math.max(0, availableForLabel - 1)) + '…';
            }
            
            return (
                <Text>
                    <Text {...textColorProp(this.isActive ? theme.colors.accent : theme.colors.textMuted)}>
                        {this.icon}
                    </Text>
                    <Text {...textColorProp(this.isActive ? theme.colors.accent : undefined)}>
                        {' '}{displayLabel}
                    </Text>
                </Text>
            );
        }
        
        // Expanded view - show children
        const elements: ReactElement[] = [];
        // Use the height allocated by parent (maxLines) or request maximum space
        // We need to use it wisely: 1 for header, 1 for footer, rest for content
        const allocatedHeight = maxLines || this.getRequiredLines(maxWidth);
        const availableLines = Math.max(1, allocatedHeight - 2); // Reserve space for header and confirmation line
        
        // Update line positions with actual width if they haven't been calculated yet
        // or if the width has changed significantly
        if (this._childLinePositions.length === 0 || this._childLinePositions.length !== this._childItems.length) {
            this.calculateAllChildLinePositions(maxWidth);
        }
        
        // Calculate viewport
        const viewport = this.calculateChildViewport(availableLines, maxWidth);
        
        // Debug viewport calculation (removed for cleaner output)
        
        // Track how many lines we've actually rendered
        let totalLinesRendered = 0;
        
        // Header (always render - 1 line) with truncation
        const iconWidth = this.icon.length;
        const spaceWidth = 1; // space between icon and label
        const availableForLabel = maxWidth - iconWidth - spaceWidth;
        
        let displayLabel = this.label;
        if (this.label.length > availableForLabel) {
            // Truncate with ellipsis if needed
            displayLabel = this.label.substring(0, Math.max(0, availableForLabel - 1)) + '…';
        }
        
        elements.push(
            <Box key="header">
                <Text {...textColorProp(theme.colors.accent)}>
                    {this.icon} {displayLabel}
                </Text>
            </Box>
        );
        totalLinesRendered += 1;
        
        
        // Render visible children with integrated scroll indicators
        let renderedLines = 0; // Track lines used by children only
        viewport.visibleChildren.forEach((child, viewportIndex) => {
            // Set active state
            const childGlobalIndex = this._childItems.indexOf(child);
            const isChildSelected = childGlobalIndex === this._childSelectedIndex && !this._isConfirmFocused;
            child.isActive = isChildSelected;
            
            // Use the constrained line count from viewport calculation
            const childMaxLines = viewport.childLineCounts[viewportIndex] || 1;
            
            // For ContainerListItem, we simplify the scroll indicators
            // Since the confirmation line is always visible at the bottom,
            // we don't show scroll indicators
            let linePrefix = '│ ';
            
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
                    // Only take the number of elements that fit within childMaxLines
                    const elementsToRender = childElements.slice(0, childMaxLines);
                    elementsToRender.forEach((element, elemIndex) => {
                        const showPrefix = elemIndex === 0; // Only show prefix on first line of child
                        const prefixText = showPrefix ? linePrefix : '│ ';
                        
                        elements.push(
                            <Box key={`child-${childGlobalIndex}-${elemIndex}`}>
                                <Text {...textColorProp(theme.colors.textMuted)}>
                                    {prefixText}
                                </Text>
                                {element}
                            </Box>
                        );
                    });
                } else {
                    elements.push(
                        <Box key={`child-${childGlobalIndex}`}>
                            <Text {...textColorProp(theme.colors.textMuted)}>
                                {linePrefix}
                            </Text>
                            {childElements}
                        </Box>
                    );
                }
            }
            
            // Update rendered lines counter
            renderedLines += childMaxLines;
        });
        
        // Add confirmation line as the last element (always visible at bottom)
        // This is rendered after all scrollable content
        // Calculate available width for the confirmation text
        const confirmPrefix = "└─";
        const confirmIcon = this._isConfirmFocused ? "▶ " : "  ";
        const confirmCheck = "✓ ";
        const confirmText = "Confirm Selection";
        const confirmPrefixWidth = confirmPrefix.length + confirmIcon.length + confirmCheck.length;
        const availableConfirmWidth = maxWidth - confirmPrefixWidth;
        
        // Truncate confirmation text if needed
        let displayConfirmText = confirmText;
        if (confirmText.length > availableConfirmWidth) {
            displayConfirmText = confirmText.substring(0, Math.max(0, availableConfirmWidth - 1)) + "…";
        }
        
        elements.push(
            <Box key="confirm-action">
                <Text>
                    <Text {...textColorProp(theme.colors.textMuted)}>{confirmPrefix}</Text>
                    {this._isConfirmFocused ? (
                        <Text {...textColorProp(theme.colors.accent)}>▶ </Text>
                    ) : (
                        <Text>  </Text>
                    )}
                    <Text {...textColorProp(theme.colors.successGreen)}>✓</Text>
                    <Text {...textColorProp(this._isConfirmFocused ? theme.colors.accent : undefined)}> {displayConfirmText}</Text>
                </Text>
            </Box>
        );
        
        
        // Ensure we don't return more elements than allocated height
        // This prevents overflow in the panel
        if (elements.length > allocatedHeight) {
            return elements.slice(0, allocatedHeight);
        }
        
        // Return the array of elements
        // The panel will handle the layout
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
                // Move back from confirmation to last navigable child
                this._isConfirmFocused = false;
                
                // Find the last navigable child
                let lastNavigableIndex = -1;
                for (let i = this._childItems.length - 1; i >= 0; i--) {
                    const child = this._childItems[i];
                    if (child && child.isNavigable) {
                        lastNavigableIndex = i;
                        break;
                    }
                }
                
                if (lastNavigableIndex >= 0) {
                    this._childSelectedIndex = lastNavigableIndex;
                    const lastChild = this._childItems[this._childSelectedIndex];
                    if (lastChild) {
                        lastChild.isActive = true;
                        if (lastChild.onSelect) {
                            lastChild.onSelect();
                        }
                    }
                    return true; // Moved back to last navigable child
                } else {
                    // No navigable children, stay on confirmation
                    this._isConfirmFocused = true;
                    return false; // No state change
                }
            }
            
            const oldIndex = this._childSelectedIndex;
            const newIndex = this.findNextNavigableChild(this._childSelectedIndex, 'backward');
            
            if (newIndex >= 0) {
                // Found a navigable child above
                this.changeChildSelection(oldIndex, newIndex);
                return true; // Navigation happened - state changed
            } else {
                // No navigable children above current position
                // Check if we should auto-close when there are only non-navigable items above
                if (!this.hasNavigableChildrenAbove(this._childSelectedIndex)) {
                    // Auto-close: no navigable items above current position
                    this.onExit();
                    return true; // Container closed - state changed
                }
                return false; // Already at boundary - no state change
            }
        }
        
        if (key.downArrow) {
            if (this._isConfirmFocused) {
                // Already on confirmation - can't go further down
                return true; // CRITICAL: Consume input even when we can't navigate
            }
            
            const oldIndex = this._childSelectedIndex;
            const newIndex = this.findNextNavigableChild(this._childSelectedIndex, 'forward');
            
            if (newIndex >= 0) {
                // Found a navigable child below
                this.changeChildSelection(oldIndex, newIndex);
                return true; // Navigation happened - state changed
            } else {
                // No navigable children below, move to confirmation
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
     * Pre-calculate line positions for all children
     * This is needed for scroll calculations during navigation
     */
    private calculateAllChildLinePositions(maxWidth: number): void {
        this._childLinePositions = [];
        let currentLine = 0;
        const prefixWidth = 2; // "│ " prefix
        
        for (let i = 0; i < this._childItems.length; i++) {
            const child = this._childItems[i];
            if (!child) continue;
            const childLines = child.getRequiredLines ? child.getRequiredLines(maxWidth - prefixWidth) : 1;
            
            this._childLinePositions.push({
                start: currentLine,
                end: currentLine + childLines
            });
            currentLine += childLines;
        }
    }
    
    /**
     * Enter expanded mode and initialize child states
     */
    onEnter(): void {
        this._isControllingInput = true;
        
        // Pre-calculate line positions for scroll management
        // Use a reasonable default width - this will be recalculated during render
        this.calculateAllChildLinePositions(80);
        
        // Initialize child selection to first navigable child
        this._childSelectedIndex = this.findFirstNavigableChild();
        
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
     * Find the next navigable child index from a given starting index
     * @param fromIndex - Index to start searching from (exclusive)
     * @param direction - Direction to search ('forward' or 'backward')
     * @returns Index of next navigable child, or -1 if none found
     */
    private findNextNavigableChild(fromIndex: number, direction: 'forward' | 'backward'): number {
        const step = direction === 'forward' ? 1 : -1;
        const startBound = direction === 'forward' ? fromIndex + 1 : fromIndex - 1;
        const endBound = direction === 'forward' ? this._childItems.length : -1;
        
        for (let i = startBound; direction === 'forward' ? i < endBound : i > endBound; i += step) {
            const child = this._childItems[i];
            if (child && child.isNavigable) {
                return i;
            }
        }
        
        return -1; // No navigable child found
    }
    
    /**
     * Find the first navigable child when entering the container
     * @returns Index of first navigable child, or 0 if none found
     */
    private findFirstNavigableChild(): number {
        for (let i = 0; i < this._childItems.length; i++) {
            const child = this._childItems[i];
            if (child && child.isNavigable) {
                return i;
            }
        }
        return 0; // Fallback to first child if none are navigable
    }
    
    /**
     * Check if there are any navigable children above the current index
     * Used for auto-close logic when navigating up from configuration items
     */
    private hasNavigableChildrenAbove(index: number): boolean {
        for (let i = 0; i < index; i++) {
            const child = this._childItems[i];
            if (child && child.isNavigable) {
                return true;
            }
        }
        return false;
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
        
        // Adjust scroll to ensure new selection is visible
        if (newIndex >= 0 && newIndex < this._childLinePositions.length) {
            const selectedPosition = this._childLinePositions[newIndex];
            if (selectedPosition) {
                // Use the actual available lines from last render instead of an estimate
                // This prevents unnecessary scrolling when all content fits in viewport
                const viewportLines = this._lastAvailableLines;
                
                const oldScrollOffset = this._childScrollOffset;
                
                // Adjust scroll if needed to keep selected item visible
                if (selectedPosition.end > this._childScrollOffset + viewportLines) {
                    // Item is cut off at bottom - scroll down to show it
                    this._childScrollOffset = selectedPosition.end - viewportLines;
                } else if (selectedPosition.start < this._childScrollOffset) {
                    // Item is cut off at top - scroll up to show it
                    this._childScrollOffset = selectedPosition.start;
                }
                
                console.error(`\n=== NAVIGATION DEBUG ===`);
                console.error(`Old index: ${oldIndex}, New index: ${newIndex}`);
                console.error(`Selected position: ${selectedPosition.start}-${selectedPosition.end}`);
                console.error(`Viewport lines: ${viewportLines}`);
                console.error(`Old scroll: ${oldScrollOffset}, New scroll: ${this._childScrollOffset}`);
                console.error(`=== END NAV DEBUG ===\n`);
            }
        }
        
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