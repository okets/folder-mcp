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
    private _navigationStep: number = 0; // Track navigation steps for debugging
    
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
        
        // Step 1: Always recalculate line positions with current width
        // Width changes as terminal resizes, so positions must be recalculated each render
        this.calculateAllChildLinePositions(maxWidth);
        
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
            
            // Skip children that are completely above the viewport
            if (pos.end <= this._childScrollOffset) continue;
            
            // Include any child that has at least some portion visible
            const childStartInViewport = Math.max(0, pos.start - this._childScrollOffset);
            const childEndInViewport = pos.end - this._childScrollOffset;
            
            // If any part of the child is within the scroll window, include it
            if (childEndInViewport > 0 && childStartInViewport < availableLines) {
                visibleChildren.push(child);
                // CRITICAL: Give child its FULL requested lines for proper text wrapping
                const fullChildLines = pos.end - pos.start;
                childLineCounts.push(fullChildLines);
                
                // Track how much viewport space this takes (for scroll calculation only)
                const visiblePortionStart = Math.max(0, childStartInViewport);
                const visiblePortionEnd = Math.min(availableLines, childEndInViewport);
                const visiblePortion = Math.max(0, visiblePortionEnd - visiblePortionStart);
                accumulatedLines += visiblePortion;
                
                console.error(`Viewport calc: Child ${i} gets ${fullChildLines} lines (${visiblePortion} visible in viewport, accumulated: ${accumulatedLines}/${availableLines})`);
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
        // We need to use it wisely: 1 for header, 1 for confirmation line, rest for content
        const allocatedHeight = maxLines || this.getRequiredLines(maxWidth);
        const availableLines = Math.max(1, allocatedHeight - 2); // Reserve space for header and confirmation line
        
        // Line positions will be calculated by calculateChildViewport
        
        // Calculate viewport
        const viewport = this.calculateChildViewport(availableLines, maxWidth);
        
        // Debug scroll indicators
        console.error(`\n=== SCROLL INDICATORS DEBUG ===`);
        console.error(`showScrollUp: ${viewport.showScrollUp}`);
        console.error(`showScrollDown: ${viewport.showScrollDown}`);
        console.error(`visibleChildren.length: ${viewport.visibleChildren.length}`);
        console.error(`childScrollOffset: ${this._childScrollOffset}`);
        console.error(`=== END SCROLL INDICATORS DEBUG ===\n`);
        
        // Debug scroll issue and line calculations
        console.error(`\n=== SCROLL DEBUG ===`);
        console.error(`Total children: ${this._childItems.length}`);
        console.error(`Available lines: ${availableLines}`);
        console.error(`MaxWidth for calculations: ${maxWidth}`);
        console.error(`PREFIX WIDTH: 2 (for "│ ")`);
        console.error(`Child width for getRequiredLines: ${maxWidth - 2}`);
        
        // Show each child's line calculation
        this._childItems.forEach((child, i) => {
            if (child && child.getRequiredLines) {
                const childLines = child.getRequiredLines(maxWidth - 2);
                const pos = this._childLinePositions[i];
                console.error(`  Child ${i}: ${childLines} lines, position ${pos?.start}-${pos?.end}`);
            }
        });
        
        const lastPosition = this._childLinePositions.length > 0 ? this._childLinePositions[this._childLinePositions.length - 1] : null;
        console.error(`Total content lines needed: ${lastPosition?.end || 0}`);
        console.error(`Should scroll: ${lastPosition ? lastPosition.end > availableLines : false}`);
        console.error(`=== END SCROLL DEBUG ===\n`);
        
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
        
        
        // Simple scroll indicators in border prefix  
        let renderedLines = 0; // Track lines used by children only
        
        // Calculate total lines for scroll positioning
        let totalVisibleLines = 0;
        viewport.visibleChildren.forEach((_, viewportIndex) => {
            const childMaxLines = viewport.childLineCounts[viewportIndex] || 1;
            totalVisibleLines += childMaxLines;
        });
        
        viewport.visibleChildren.forEach((child, viewportIndex) => {
            // Set active state
            const childGlobalIndex = this._childItems.indexOf(child);
            const isChildSelected = childGlobalIndex === this._childSelectedIndex && !this._isConfirmFocused;
            child.isActive = isChildSelected;
            
            // Use the constrained line count from viewport calculation
            const childMaxLines = viewport.childLineCounts[viewportIndex] || 1;
            
            // Determine if this is the last visible child for ▼ indicator placement
            const isLastVisibleChild = viewportIndex === viewport.visibleChildren.length - 1;
            
            // Default border prefix
            const linePrefix = '│ ';
            
            // Render child with border prefix using Box to avoid nesting issues
            // Calculate available width based on actual prefix length
            const prefixWidth = linePrefix.length;
            const childElements = child.render(maxWidth - prefixWidth, childMaxLines);
            
            // Special handling for ButtonsRow - it returns a Box that needs to expand vertically
            if (child.constructor.name === 'ButtonsRow') {
                // For ButtonsRow, apply scroll indicators to the prefix
                let buttonsPrefixText = linePrefix;
                if (renderedLines === 0 && viewport.showScrollUp) {
                    buttonsPrefixText = '│▲'; // First line of all content
                }
                // Give ▼ priority over ▲ if both conditions are met
                if (isLastVisibleChild && viewport.showScrollDown) {
                    buttonsPrefixText = '│▼'; // Last content line when scrolling down available
                }
                
                console.error(`ButtonsRow: isLastVisibleChild=${isLastVisibleChild}, showScrollDown=${viewport.showScrollDown}, prefix=${buttonsPrefixText}`);
                
                // ButtonsRow returns a Box with flexDirection="row" containing 3-line bordered buttons
                // We need to wrap this in a Box with row layout to add the prefix while preserving height
                elements.push(
                    <Box key={`buttonsrow-${childGlobalIndex}`} flexDirection="row" height={childMaxLines}>
                        <Text {...textColorProp(theme.colors.textMuted)}>
                            {buttonsPrefixText}
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
                        const currentGlobalLine = renderedLines + elemIndex;
                        const isLastElementOfLastChild = isLastVisibleChild && elemIndex === elementsToRender.length - 1;
                        
                        // Determine prefix with scroll indicators (like FilePicker)
                        let prefixText = showPrefix ? linePrefix : '│ ';
                        if (currentGlobalLine === 0 && viewport.showScrollUp) {
                            prefixText = '│▲'; // First line of all content
                        }
                        // Give ▼ priority over ▲ if both conditions are met
                        if (isLastElementOfLastChild && viewport.showScrollDown) {
                            prefixText = '│▼'; // Last content line when scrolling down available
                        }
                        
                        console.error(`Array child ${childGlobalIndex}-${elemIndex}: isLastElementOfLastChild=${isLastElementOfLastChild}, showScrollDown=${viewport.showScrollDown}, prefix=${prefixText}`);
                        
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
                    // Single element case
                    let prefixText = linePrefix;
                    if (renderedLines === 0 && viewport.showScrollUp) {
                        prefixText = '│▲'; // First line of all content
                    }
                    // Give ▼ priority over ▲ if both conditions are met
                    if (isLastVisibleChild && viewport.showScrollDown) {
                        prefixText = '│▼'; // Last content line when scrolling down available
                    }
                    
                    console.error(`Single child ${childGlobalIndex}: isLastVisibleChild=${isLastVisibleChild}, showScrollDown=${viewport.showScrollDown}, prefix=${prefixText}`);
                    
                    elements.push(
                        <Box key={`child-${childGlobalIndex}`}>
                            <Text {...textColorProp(theme.colors.textMuted)}>
                                {prefixText}
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
        
        
        // Ensure confirmation line is always visible:
        // If we have too many elements, trim content but keep confirmation
        if (elements.length > allocatedHeight) {
            // Remove the confirmation line temporarily
            const confirmationElement = elements.pop(); // This should be the confirmation line
            
            // Trim content elements to fit, leaving space for confirmation
            const contentElements = elements.slice(0, allocatedHeight - 1);
            
            // Add confirmation back at the end
            if (confirmationElement) {
                contentElements.push(confirmationElement);
            }
            
            return contentElements;
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
            console.error(`\n=== DOWN ARROW INPUT ===`);
            console.error(`Current index: ${this._childSelectedIndex}`);
            console.error(`Is confirm focused: ${this._isConfirmFocused}`);
            console.error(`Total children: ${this._childItems.length}`);
            
            if (this._isConfirmFocused) {
                // Already on confirmation - can't go further down
                console.error(`Already on confirmation, consuming input`);
                return true; // CRITICAL: Consume input even when we can't navigate
            }
            
            const oldIndex = this._childSelectedIndex;
            const newIndex = this.findNextNavigableChild(this._childSelectedIndex, 'forward');
            console.error(`Looking for next child: ${oldIndex} -> ${newIndex}`);
            
            if (newIndex >= 0) {
                // Found a navigable child below
                console.error(`Found navigable child, calling changeChildSelection`);
                this.changeChildSelection(oldIndex, newIndex);
                return true; // Navigation happened - state changed
            } else {
                // No navigable children below, move to confirmation
                console.error(`No more children, moving to confirmation`);
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
        const childWidth = maxWidth - prefixWidth;
        
        console.error(`=== LINE POSITION WIDTH DEBUG ===`);
        console.error(`maxWidth: ${maxWidth}, prefixWidth: ${prefixWidth}, childWidth: ${childWidth}`);
        
        for (let i = 0; i < this._childItems.length; i++) {
            const child = this._childItems[i];
            if (!child) continue;
            const childLines = child.getRequiredLines ? child.getRequiredLines(childWidth) : 1;
            console.error(`  Child ${i}: getRequiredLines(${childWidth}) = ${childLines}`);
            
            this._childLinePositions.push({
                start: currentLine,
                end: currentLine + childLines
            });
            currentLine += childLines;
        }
        
        console.error(`=== LINE POSITION CALCULATION ===`);
        console.error(`Total children: ${this._childItems.length}`);
        this._childLinePositions.forEach((pos, i) => {
            console.error(`  Child ${i}: position ${pos.start}-${pos.end} (${pos.end - pos.start} lines)`);
        });
        console.error(`Total content lines: ${currentLine}`);
        console.error(`=== END LINE POSITION CALCULATION ===`);
    }
    
    /**
     * Enter expanded mode and initialize child states
     */
    onEnter(): void {
        console.error(`\n=== CONTAINER EXPANSION ===`);
        console.error(`Expanding container: ${this.label}`);
        console.error(`Total children: ${this._childItems.length}`);
        
        this._isControllingInput = true;
        
        // Line positions will be calculated during first render with actual width
        this._childLinePositions = [];
        
        // Initialize child selection to first navigable child
        this._childSelectedIndex = this.findFirstNavigableChild();
        console.error(`Initial selected index: ${this._childSelectedIndex}`);
        console.error(`Initial scroll offset: ${this._childScrollOffset}`);
        
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
        
        console.error(`=== EXPANSION COMPLETE ===\n`);
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
            console.error(`\n=== SCROLL ADJUSTMENT DEBUG ===`);
            console.error(`Navigating to child ${newIndex}`);
            console.error(`Selected position: ${selectedPosition ? `${selectedPosition.start}-${selectedPosition.end}` : 'undefined'}`);
            console.error(`Total line positions calculated: ${this._childLinePositions.length}`);
            console.error(`Child line positions array:`);
            this._childLinePositions.forEach((pos, i) => {
                console.error(`  Child ${i}: ${pos ? `${pos.start}-${pos.end}` : 'undefined'}`);
            });
            
            if (selectedPosition) {
                // Use the actual available lines from last render instead of an estimate
                // This prevents unnecessary scrolling when all content fits in viewport
                const viewportLines = this._lastAvailableLines;
                
                const oldScrollOffset = this._childScrollOffset;
                
                // Adjust scroll to keep selected item optimally positioned
                // For downward navigation: ensure item is visible at bottom with some padding
                if (selectedPosition.end > this._childScrollOffset + viewportLines) {
                    // Item is cut off at bottom - scroll down to show it
                    this._childScrollOffset = selectedPosition.end - viewportLines;
                } 
                // For upward navigation: ensure item is visible at top with some padding
                else if (selectedPosition.start < this._childScrollOffset) {
                    // Item is cut off at top - scroll up to show it
                    this._childScrollOffset = selectedPosition.start;
                }
                
                // ALWAYS check edge cases after basic visibility - not as else-if
                // Handle edge cases: item is technically visible but poorly positioned
                if (selectedPosition.end >= this._childScrollOffset + viewportLines - 1) {
                    // Item is at the very bottom edge (within 1 line) - scroll down for better visibility
                    console.error(`EDGE CASE: Item at bottom edge, executing scroll adjustment`);
                    const totalContentLines = this._childLinePositions.length > 0 
                        ? this._childLinePositions[this._childLinePositions.length - 1]?.end || 0 
                        : 0;
                    const maxScroll = Math.max(0, totalContentLines - viewportLines);
                    const targetScroll = Math.min(maxScroll, selectedPosition.end - Math.floor(viewportLines * 0.75));
                    console.error(`Total content: ${totalContentLines}, Max scroll: ${maxScroll}, Target: ${targetScroll}`);
                    console.error(`Current scroll: ${this._childScrollOffset}, New scroll: ${Math.max(this._childScrollOffset, targetScroll)}`);
                    this._childScrollOffset = Math.max(this._childScrollOffset, targetScroll);
                }
                else if (selectedPosition.start <= this._childScrollOffset + 1) {
                    // Item is at the very top edge (within 1 line) - scroll up for better visibility
                    const targetScroll = Math.max(0, selectedPosition.start - Math.floor(viewportLines * 0.25));
                    this._childScrollOffset = Math.min(this._childScrollOffset, targetScroll);
                }
                // Additional logic: if item is barely visible, center it better
                else if (oldIndex > newIndex) {
                    // Moving up - ensure we scroll up if the item is in the bottom half of viewport
                    const itemMiddle = (selectedPosition.start + selectedPosition.end) / 2;
                    const viewportMiddle = this._childScrollOffset + (viewportLines / 2);
                    if (itemMiddle > viewportMiddle) {
                        // Item is in bottom half, scroll up to center it better
                        const targetScroll = Math.max(0, selectedPosition.start - Math.floor(viewportLines / 4));
                        this._childScrollOffset = targetScroll;
                    }
                } else if (oldIndex < newIndex) {
                    // Moving down - ensure we scroll down if the item is in the top half of viewport
                    const itemMiddle = (selectedPosition.start + selectedPosition.end) / 2;
                    const viewportMiddle = this._childScrollOffset + (viewportLines / 2);
                    if (itemMiddle < viewportMiddle) {
                        // Item is in top half, scroll down to center it better
                        const totalContentLines = this._childLinePositions.length > 0 
                            ? this._childLinePositions[this._childLinePositions.length - 1]?.end || 0 
                            : 0;
                        const targetScroll = Math.min(
                            totalContentLines - viewportLines,
                            selectedPosition.end - Math.floor(viewportLines * 3 / 4)
                        );
                        this._childScrollOffset = Math.max(0, targetScroll);
                    }
                }
                
                this._navigationStep++;
                console.error(`\n=== NAVIGATION DEBUG ===`);
                console.error(`STEP ${this._navigationStep}: ${oldIndex} -> ${newIndex}`);
                console.error(`Selected position: ${selectedPosition.start}-${selectedPosition.end}`);
                console.error(`Viewport lines: ${viewportLines}`);
                console.error(`OLD scroll: ${oldScrollOffset}`);
                console.error(`CURRENT scroll: ${this._childScrollOffset}`);
                console.error(`Viewport range: ${this._childScrollOffset} to ${this._childScrollOffset + viewportLines}`);
                
                // Debug scroll conditions
                const endCutOff = selectedPosition.end > this._childScrollOffset + viewportLines;
                const startCutOff = selectedPosition.start < this._childScrollOffset;
                const atBottomEdge = selectedPosition.end >= this._childScrollOffset + viewportLines - 1;
                const atTopEdge = selectedPosition.start <= this._childScrollOffset + 1;
                console.error(`CONDITIONS:`);
                console.error(`  End cut off (${selectedPosition.end} > ${this._childScrollOffset + viewportLines}): ${endCutOff}`);
                console.error(`  Start cut off (${selectedPosition.start} < ${this._childScrollOffset}): ${startCutOff}`);
                console.error(`  At bottom edge (${selectedPosition.end} >= ${this._childScrollOffset + viewportLines - 1}): ${atBottomEdge}`);
                console.error(`  At top edge (${selectedPosition.start} <= ${this._childScrollOffset + 1}): ${atTopEdge}`);
                
                if (!endCutOff && !startCutOff) {
                    // Item is visible, check smart centering logic
                    const isMovingUp = oldIndex > newIndex;
                    const isMovingDown = oldIndex < newIndex;
                    console.error(`Moving up: ${isMovingUp}, Moving down: ${isMovingDown}`);
                    
                    if (isMovingUp) {
                        const itemMiddle = (selectedPosition.start + selectedPosition.end) / 2;
                        const viewportMiddle = this._childScrollOffset + (viewportLines / 2);
                        console.error(`Item middle: ${itemMiddle}, Viewport middle: ${viewportMiddle}`);
                        console.error(`Item in bottom half (${itemMiddle} > ${viewportMiddle}): ${itemMiddle > viewportMiddle}`);
                        if (itemMiddle > viewportMiddle) {
                            const targetScroll = Math.max(0, selectedPosition.start - Math.floor(viewportLines / 4));
                            console.error(`Would scroll up to: ${targetScroll}`);
                        }
                    } else if (isMovingDown) {
                        const itemMiddle = (selectedPosition.start + selectedPosition.end) / 2;
                        const viewportMiddle = this._childScrollOffset + (viewportLines / 2);
                        console.error(`Item middle: ${itemMiddle}, Viewport middle: ${viewportMiddle}`);
                        console.error(`Item in top half (${itemMiddle} < ${viewportMiddle}): ${itemMiddle < viewportMiddle}`);
                        if (itemMiddle < viewportMiddle) {
                            const totalContentLines = this._childLinePositions.length > 0 
                                ? this._childLinePositions[this._childLinePositions.length - 1]?.end || 0 
                                : 0;
                            const targetScroll = Math.min(
                                totalContentLines - viewportLines,
                                selectedPosition.end - Math.floor(viewportLines * 3 / 4)
                            );
                            console.error(`Would scroll down to: ${Math.max(0, targetScroll)}`);
                        }
                    }
                }
                
                console.error(`RESULT:`);
                console.error(`  Old scroll: ${oldScrollOffset}`);
                console.error(`  New scroll: ${this._childScrollOffset}`);
                console.error(`  Scroll changed: ${oldScrollOffset !== this._childScrollOffset}`);
                console.error(`  Item visible in viewport: ${selectedPosition.start >= this._childScrollOffset && selectedPosition.end <= this._childScrollOffset + viewportLines}`);
                console.error(`=== END NAV DEBUG ===\n`);
            } else {
                console.error(`ERROR: No position found for child ${newIndex}`);
                console.error(`This should not happen - all children should have positions`);
            }
            console.error(`=== END SCROLL ADJUSTMENT DEBUG ===\n`);
        } else {
            console.error(`ERROR: Invalid newIndex ${newIndex} or positions array length ${this._childLinePositions.length}`);
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