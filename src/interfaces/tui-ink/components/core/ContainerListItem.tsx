import React, { ReactElement } from 'react';
import { Box, Text, Key } from 'ink';
import { IListItem } from './IListItem';
import { theme } from '../../utils/theme';
import { textColorProp } from '../../utils/conditionalProps';
import { ViewportSystem } from './viewport';

/**
 * ContainerListItem - Redesigned with unified viewport management
 * 
 * This is a complete rewrite using the new ViewportSystem architecture.
 * It replaces the fragmented viewport logic with a clean, maintainable system.
 */
export class ContainerListItem implements IListItem {
    readonly selfConstrained = true as const;
    readonly isNavigable = true;
    
    private _isControllingInput: boolean = false;
    private _childItems: IListItem[] = [];
    private _childSelectedIndex: number = 0;
    private _isConfirmFocused: boolean = false;
    private _onComplete: ((results: any) => void) | undefined;
    
    // New viewport system
    private viewportSystem: ViewportSystem;
    
    constructor(
        public icon: string,
        private label: string,
        childItems: IListItem[],
        public isActive: boolean = false,
        onComplete?: ((results: any) => void) | undefined
    ) {
        this._childItems = [...childItems];
        this._onComplete = onComplete;
        this.viewportSystem = new ViewportSystem();
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
     * Calculate required lines using ViewportCalculator
     */
    getRequiredLines(maxWidth: number): number {
        if (!this._isControllingInput) {
            return 1; // Collapsed view
        }
        
        // Calculate actual content height needed
        const viewport = this.viewportSystem.viewportCalculator.calculateViewport(maxWidth);
        const elementPositions = this.viewportSystem.visibilityCalculator.calculateElementPositions(
            this._childItems,
            viewport.contentWidth
        );
        
        const totalContentHeight = this.viewportSystem.visibilityCalculator.calculateTotalContentHeight(
            elementPositions
        );
        
        // Return header + content + confirmation
        return 1 + totalContentHeight + 1;
    }
    
    /**
     * Render using the new viewport system
     */
    render(maxWidth: number, maxLines?: number): ReactElement | ReactElement[] {
        if (!this._isControllingInput) {
            return this.renderCollapsed(maxWidth);
        }
        
        return this.renderExpanded(maxWidth, maxLines);
    }
    
    /**
     * Render collapsed state with text truncation
     */
    private renderCollapsed(maxWidth: number): ReactElement {
        const viewport = this.viewportSystem.viewportCalculator.calculateViewport(maxWidth);
        const headerLayout = this.viewportSystem.viewportCalculator.calculateHeaderLayout(
            this.icon,
            this.label,
            viewport
        );
        
        return (
            <Text>
                <Text {...textColorProp(this.isActive ? theme.colors.accent : theme.colors.textMuted)}>
                    {headerLayout.displayIcon}
                </Text>
                <Text {...textColorProp(this.isActive ? theme.colors.accent : undefined)}>
                    {' '}{headerLayout.displayLabel}
                </Text>
            </Text>
        );
    }
    
    /**
     * Render expanded state using viewport system
     */
    private renderExpanded(maxWidth: number, maxLines?: number): ReactElement[] {
        const elements: ReactElement[] = [];
        
        // Step 1: Calculate viewport
        const viewport = this.viewportSystem.viewportCalculator.calculateViewport(
            maxWidth, 
            maxLines,
            this.getRequiredLines(maxWidth)
        );
        
        // Step 2: Calculate element positions
        const elementPositions = this.viewportSystem.visibilityCalculator.calculateElementPositions(
            this._childItems,
            viewport.contentWidth
        );
        
        // Step 3: Update scroll manager with current dimensions
        const totalContentHeight = this.viewportSystem.visibilityCalculator.calculateTotalContentHeight(
            elementPositions
        );
        this.viewportSystem.scrollManager.updateDimensions(viewport, totalContentHeight);
        
        // Step 4: Calculate visible elements
        const visibleElements = this.viewportSystem.visibilityCalculator.calculateVisibleElements(
            this._childItems,
            elementPositions,
            viewport,
            this.viewportSystem.scrollManager.getScrollOffset()
        );
        
        // Step 5: Get scroll indicators
        const scrollIndicators = this.viewportSystem.scrollManager.getScrollIndicators();
        
        // Step 6: Render header
        const headerLayout = this.viewportSystem.viewportCalculator.calculateHeaderLayout(
            this.icon,
            this.label,
            viewport
        );
        
        elements.push(
            <Box key="header">
                <Text {...textColorProp(theme.colors.accent)}>
                    {headerLayout.displayIcon} {headerLayout.displayLabel}
                </Text>
            </Box>
        );
        
        // Step 7: Render visible children with scroll indicators
        this.renderVisibleChildren(elements, visibleElements.visibleElements, viewport, scrollIndicators);
        
        // Step 8: Render confirmation line
        const confirmLayout = this.viewportSystem.viewportCalculator.calculateConfirmationLayout(
            this._isConfirmFocused,
            viewport
        );
        
        elements.push(
            <Box key="confirm-action">
                <Text>
                    <Text {...textColorProp(theme.colors.textMuted)}>{confirmLayout.prefix}</Text>
                    <Text {...textColorProp(this._isConfirmFocused ? theme.colors.accent : undefined)}>
                        {confirmLayout.icon}
                    </Text>
                    <Text {...textColorProp(theme.colors.successGreen)}>{confirmLayout.check}</Text>
                    <Text {...textColorProp(this._isConfirmFocused ? theme.colors.accent : undefined)}>
                        {confirmLayout.displayText}
                    </Text>
                </Text>
            </Box>
        );
        
        return elements;
    }
    
    /**
     * Render visible children with scroll indicators
     */
    private renderVisibleChildren(
        elements: ReactElement[],
        visibleElements: any[],
        viewport: any,
        scrollIndicators: any
    ): void {
        visibleElements.forEach((visibleElement, index) => {
            const { element, globalIndex, renderLines } = visibleElement;
            
            // Set active state
            const isChildSelected = globalIndex === this._childSelectedIndex && !this._isConfirmFocused;
            element.isActive = isChildSelected;
            
            // Determine scroll indicator position
            const isFirstVisible = index === 0;
            const isLastVisible = index === visibleElements.length - 1;
            
            // Calculate prefix with scroll indicators
            let prefix = '│ ';
            if (isFirstVisible && scrollIndicators.showUp) {
                prefix = '│▲';
            } else if (isLastVisible && scrollIndicators.showDown) {
                prefix = '│▼';
            }
            
            // Render child element
            const childElements = element.render(
                viewport.contentWidth, 
                renderLines
            );
            
            // Handle both single elements and arrays
            if (Array.isArray(childElements)) {
                childElements.forEach((childElement, elemIndex) => {
                    const showPrefix = elemIndex === 0; // Only show prefix on first line
                    elements.push(
                        <Box key={`child-${globalIndex}-${elemIndex}`}>
                            <Text {...textColorProp(theme.colors.textMuted)}>
                                {showPrefix ? prefix : '│ '}
                            </Text>
                            {childElement}
                        </Box>
                    );
                });
            } else {
                elements.push(
                    <Box key={`child-${globalIndex}`}>
                        <Text {...textColorProp(theme.colors.textMuted)}>
                            {prefix}
                        </Text>
                        {childElements}
                    </Box>
                );
            }
        });
    }
    
    /**
     * Handle input using NavigationManager
     */
    handleInput(input: string, key: Key): boolean {
        if (!this._isControllingInput) {
            return false;
        }
        
        const activeChild = this._childItems[this._childSelectedIndex];
        
        // Priority 1: Delegate to controlling child
        if (activeChild?.isControllingInput && activeChild.handleInput) {
            return activeChild.handleInput(input, key);
        }
        
        // Priority 2: Handle navigation
        const navigationState = {
            selectedIndex: this._childSelectedIndex,
            isConfirmFocused: this._isConfirmFocused,
            elements: this._childItems
        };
        
        // Calculate element positions for navigation
        const viewport = this.viewportSystem.viewportCalculator.calculateViewport(50); // Default width
        const elementPositions = this.viewportSystem.visibilityCalculator.calculateElementPositions(
            this._childItems,
            viewport.contentWidth
        );
        
        if (key.upArrow) {
            if (this._isConfirmFocused) {
                // From confirmation, go to last navigable item
                const lastNavigableIndex = this.viewportSystem.navigationManager.findLastNavigableElement(
                    this._childItems
                );
                if (lastNavigableIndex >= 0) {
                    this._isConfirmFocused = false;
                    this.updateSelectionToIndex(lastNavigableIndex, elementPositions);
                    return true;
                }
                return false; // No navigable items
            } else {
                // From an item, try to go to previous item
                const prevIndex = this.viewportSystem.navigationManager.findPreviousNavigableElement(
                    this._childSelectedIndex,
                    this._childItems
                );
                
                if (prevIndex >= 0) {
                    // Found previous navigable item
                    this.updateSelectionToIndex(prevIndex, elementPositions);
                    return true;
                } else {
                    // No previous item, go to confirmation (circular navigation)
                    this.moveToConfirmation();
                    return true;
                }
            }
        }
        
        if (key.downArrow) {
            if (this._isConfirmFocused) {
                // From confirmation, go to first navigable item
                const firstNavigableIndex = this.viewportSystem.navigationManager.findFirstNavigableElement(
                    this._childItems
                );
                if (firstNavigableIndex >= 0) {
                    this._isConfirmFocused = false;
                    this.updateSelectionToIndex(firstNavigableIndex, elementPositions);
                    return true;
                }
                return false; // No navigable items
            } else {
                // From an item, try to go to next item
                const nextIndex = this.viewportSystem.navigationManager.findNextNavigableElement(
                    this._childSelectedIndex,
                    this._childItems
                );
                
                if (nextIndex >= 0) {
                    // Found next navigable item
                    this.updateSelectionToIndex(nextIndex, elementPositions);
                    return true;
                } else {
                    // No next item, go to confirmation (circular navigation)
                    this.moveToConfirmation();
                    return true;
                }
            }
        }
        
        // Handle other keys
        if (key.return) {
            if (this._isConfirmFocused) {
                this.confirmAndExit();
                return true;
            } else if (activeChild?.onEnter) {
                activeChild.onEnter();
                return true;
            }
        }
        
        if (key.leftArrow || key.escape) {
            // Left arrow or escape: close the container
            this.onExit();
            return true;
        }
        
        if (key.rightArrow && !this._isConfirmFocused && activeChild?.onEnter) {
            // Right arrow: open/expand the selected child item
            activeChild.onEnter();
            return true;
        }
        
        if (key.tab) {
            return false; // Allow tab to bubble up
        }
        
        return true; // Consume all other input when controlling
    }
    
    /**
     * Update selection state from navigation result
     */
    private updateSelectionFromNavigation(navResult: any): void {
        // Deselect old child
        const oldChild = this._childItems[this._childSelectedIndex];
        if (oldChild) {
            oldChild.isActive = false;
            if (oldChild.onDeselect) {
                oldChild.onDeselect();
            }
        }
        
        // Update selection
        this._childSelectedIndex = navResult.newSelectedIndex;
        this._isConfirmFocused = false;
        
        // Select new child
        const newChild = this._childItems[this._childSelectedIndex];
        if (newChild) {
            newChild.isActive = true;
            if (newChild.onSelect) {
                newChild.onSelect();
            }
        }
    }
    
    /**
     * Update selection to a specific index with scroll adjustment
     */
    private updateSelectionToIndex(newIndex: number, elementPositions: any[]): void {
        // Deselect old child
        const oldChild = this._childItems[this._childSelectedIndex];
        if (oldChild) {
            oldChild.isActive = false;
            if (oldChild.onDeselect) {
                oldChild.onDeselect();
            }
        }
        
        // Update selection
        this._childSelectedIndex = newIndex;
        
        // Adjust scroll to ensure new selection is visible
        this.viewportSystem.scrollManager.scrollToElement(
            newIndex,
            elementPositions,
            'down' // Default direction
        );
        
        // Select new child
        const newChild = this._childItems[this._childSelectedIndex];
        if (newChild) {
            newChild.isActive = true;
            if (newChild.onSelect) {
                newChild.onSelect();
            }
        }
    }
    
    /**
     * Move focus to confirmation line
     */
    private moveToConfirmation(): void {
        const currentChild = this._childItems[this._childSelectedIndex];
        if (currentChild) {
            currentChild.isActive = false;
            if (currentChild.onDeselect) {
                currentChild.onDeselect();
            }
        }
        this._isConfirmFocused = true;
    }
    
    /**
     * Confirm selection and exit
     */
    private confirmAndExit(): void {
        if (this._onComplete) {
            this._onComplete(this.getChildResults());
        }
        this.onExit();
    }
    
    /**
     * Enter expanded mode
     */
    onEnter(): void {
        this._isControllingInput = true;
        this.viewportSystem.reset();
        
        // Initialize to first navigable child
        this._childSelectedIndex = this.viewportSystem.navigationManager.findFirstNavigableElement(
            this._childItems
        );
        this._isConfirmFocused = false;
        
        // Set initial active states
        this._childItems.forEach((child, index) => {
            const isActive = (index === this._childSelectedIndex);
            child.isActive = isActive;
            
            if (isActive && child.onSelect) {
                child.onSelect();
            }
        });
    }
    
    /**
     * Exit expanded mode
     */
    onExit(): void {
        this._isControllingInput = false;
        this.viewportSystem.reset();
        
        // Clean up child states
        this._childItems.forEach(child => {
            child.isActive = false;
            if (child.isControllingInput && child.onExit) {
                child.onExit();
            }
        });
        
        this._isConfirmFocused = false;
    }
    
    onSelect(): void {
        // Visual feedback when selected
    }
    
    onDeselect(): void {
        // Clean up when deselected
        this._childItems.forEach(child => {
            child.isActive = false;
        });
    }
    
    /**
     * Add a child item
     */
    addChild(child: IListItem): void {
        this._childItems.push(child);
    }
    
    /**
     * Remove a child item
     */
    removeChild(child: IListItem): void {
        const index = this._childItems.indexOf(child);
        if (index !== -1) {
            this._childItems.splice(index, 1);
            if (this._childSelectedIndex >= this._childItems.length) {
                this._childSelectedIndex = Math.max(0, this._childItems.length - 1);
            }
        }
    }
    
    /**
     * Get results from all child items
     */
    getChildResults(): any[] {
        return this._childItems.map(child => ({
            type: child.constructor.name,
            isActive: child.isActive,
            isControllingInput: child.isControllingInput
        }));
    }
}