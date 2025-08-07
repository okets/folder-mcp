import React, { ReactElement } from 'react';
import { Box, Text, Key, Transform } from 'ink';
import { IListItem } from './IListItem';
import { theme } from '../../utils/theme';
import { textColorProp } from '../../utils/conditionalProps';
import { ViewportSystem } from './viewport';
import { ValidationState, ValidationResult, DEFAULT_VALIDATION } from './ValidationState';

/**
 * Button configuration for dual-button mode
 */
export interface ButtonConfig {
    text: string;
    isDestructive?: boolean;
}

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
    private _onCancel: (() => void) | undefined;
    private _lastRenderWidth: number = 80; // Track last render width for navigation
    private _lastMaxLines: number | undefined; // Track last maxLines constraint for consistent viewport calculation
    private _lastNavigationDirection: 'up' | 'down' = 'down'; // Track navigation direction for bring-into-view
    
    // Validation and dual-button state
    private _validationResult: ValidationResult = DEFAULT_VALIDATION;
    private _focusedButton: 'confirm' | 'cancel' | null = null;
    private _useDualButtons: boolean = false;
    private _customConfirmText: string | undefined = undefined;
    private _customCancelText: string | undefined = undefined;
    private _cancelConfirmationMode: boolean = false;
    private _originalCancelText: string | undefined = undefined;
    private _confirmedRemoval: boolean = false;
    
    // Button configurations
    private _confirmButtonConfig: ButtonConfig = { text: 'Confirm', isDestructive: false };
    private _cancelButtonConfig: ButtonConfig = { text: 'Cancel', isDestructive: false };
    
    // New viewport system
    private viewportSystem: ViewportSystem;
    
    constructor(
        public icon: string,
        private label: string,
        childItems: IListItem[],
        public isActive: boolean = false,
        onComplete?: ((results: any) => void) | undefined,
        onCancel?: (() => void) | undefined,
        validationState?: ValidationState,
        useDualButtons: boolean = false
    ) {
        this._childItems = [...childItems];
        this._onComplete = onComplete;
        this._onCancel = onCancel;
        this._useDualButtons = useDualButtons;
        
        if (validationState) {
            this._validationResult = validationState.result;
            // Set up validation change listener if provided
            if (validationState.onValidationChange) {
                validationState.onValidationChange(this._validationResult);
            }
        }
        
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
     * Update validation state
     */
    updateValidation(validationResult: ValidationResult): void {
        this._validationResult = validationResult;
        
        // If validation has errors and we're in dual-button mode, ensure confirm is disabled
        if (this._useDualButtons && validationResult.hasError) {
            // If confirm was focused but now disabled, move focus to cancel
            if (this._focusedButton === 'confirm') {
                this._focusedButton = 'cancel';
            }
        }
    }
    
    /**
     * Configure buttons with text and destructive flags
     */
    configureButtons(confirmButton?: ButtonConfig, cancelButton?: ButtonConfig): void {
        if (confirmButton) {
            this._confirmButtonConfig = confirmButton;
            this._customConfirmText = confirmButton.text;
        }
        if (cancelButton) {
            this._cancelButtonConfig = cancelButton;
            this._customCancelText = cancelButton.text;
            // Store original cancel text for confirmation mode
            if (cancelButton.text && !this._originalCancelText) {
                this._originalCancelText = cancelButton.text;
            }
        }
    }
    
    /**
     * Legacy method for backward compatibility
     * @deprecated Use configureButtons instead
     */
    updateButtonText(confirmText?: string, cancelText?: string): void {
        this.configureButtons(
            confirmText ? { text: confirmText, isDestructive: false } : undefined,
            cancelText ? { text: cancelText, isDestructive: false } : undefined
        );
    }
    
    /**
     * Get current validation result
     */
    get validationResult(): ValidationResult {
        return this._validationResult;
    }
    
    /**
     * Check if confirm button should be enabled
     */
    get isConfirmEnabled(): boolean {
        return !this._validationResult.hasError;
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
            viewport.contentWidth,
            viewport.contentHeight // Apply height constraint: max element height = viewport height
        );
        
        const totalContentHeight = this.viewportSystem.visibilityCalculator.calculateTotalContentHeight(
            elementPositions
        );
        
        // Calculate additional lines for validation message in expanded mode
        const validationLines = (this._validationResult.hasError && this._validationResult.errorMessage) || 
                               (this._validationResult.hasWarning && this._validationResult.warningMessage) ? 1 : 0;
        
        // Return header + validation + content + confirmation
        return 1 + validationLines + totalContentHeight + 1;
    }
    
    /**
     * Render using the new viewport system
     */
    render(maxWidth: number, maxLines?: number): ReactElement | ReactElement[] {
        // Store width and maxLines for navigation calculations
        this._lastRenderWidth = maxWidth;
        this._lastMaxLines = maxLines;
        
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
        
        // Check if we have validation error or warning to show
        const hasValidationError = this._validationResult.hasError;
        const hasValidationWarning = this._validationResult.hasWarning;
        
        // Calculate available space for label considering validation icon
        const validationIconSpace = (hasValidationError || hasValidationWarning) ? 3 : 0; // " ✗" or " !"
        const availableForLabel = viewport.contentWidth - validationIconSpace;
        
        // Truncate label if needed to make room for validation icon
        let displayLabel = headerLayout.displayLabel;
        if (validationIconSpace > 0 && headerLayout.displayLabel.length > availableForLabel) {
            displayLabel = headerLayout.displayLabel.substring(0, availableForLabel - 1) + '…';
        }
        
        return (
            <Text>
                <Transform transform={output => output}>
                    <Text {...textColorProp(this.isActive ? theme.colors.accent : theme.colors.textMuted)}>
                        {headerLayout.displayIcon}
                    </Text>
                    <Text {...textColorProp(this.isActive ? theme.colors.accent : undefined)}>
                        {' '}{displayLabel}
                    </Text>
                    {hasValidationError && (
                        <Text color="red"> ✗</Text>
                    )}
                    {!hasValidationError && hasValidationWarning && (
                        <Text color="yellow"> !</Text>
                    )}
                </Transform>
            </Text>
        );
    }
    
    /**
     * Render expanded state using viewport system
     */
    private renderExpanded(maxWidth: number, maxLines?: number): ReactElement[] {
        const elements: ReactElement[] = [];
        
        // Step 1: Calculate viewport (don't use getRequiredLines to avoid circular dependency)
        const viewport = this.viewportSystem.viewportCalculator.calculateViewport(
            maxWidth, 
            maxLines
        );
        
        
        // Step 2: Calculate element positions with height constraints
        const elementPositions = this.viewportSystem.visibilityCalculator.calculateElementPositions(
            this._childItems,
            viewport.contentWidth,
            viewport.contentHeight // Apply height constraint: max element height = viewport height
        );
        
        // Step 3: Update scroll manager with current dimensions
        const totalContentHeight = this.viewportSystem.visibilityCalculator.calculateTotalContentHeight(
            elementPositions
        );
        
        this.viewportSystem.scrollManager.updateDimensions(viewport, totalContentHeight);
        
        // Step 3.5: RENDER-CYCLE SCROLL ADJUSTMENT - Ensure selected element is visible
        this.ensureSelectedElementVisible(elementPositions, viewport);
        
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
        
        // Check if we have validation error or warning to show in header
        const hasValidationError = this._validationResult.hasError;
        const hasValidationWarning = this._validationResult.hasWarning;
        
        elements.push(
            <Box key="header">
                <Text {...textColorProp(theme.colors.accent)}>
                    {headerLayout.displayIcon} {headerLayout.displayLabel}
                </Text>
            </Box>
        );
        
        // Step 6.5: Render validation message using TextListItem approach
        if (hasValidationError && this._validationResult.errorMessage) {
            // Create a temporary TextListItem for validation display (non-navigable)
            const validationDisplay = (
                <Box key="validation-error">
                    <Text>
                        <Text {...textColorProp(theme.colors.textMuted)}>│ </Text>
                        <Text {...textColorProp(theme.colors.dangerRed)}>✗ {this._validationResult.errorMessage}</Text>
                    </Text>
                </Box>
            );
            elements.push(validationDisplay);
        } else if (hasValidationWarning && this._validationResult.warningMessage) {
            const validationDisplay = (
                <Box key="validation-warning">
                    <Text>
                        <Text {...textColorProp(theme.colors.textMuted)}>│ </Text>
                        <Text {...textColorProp(theme.colors.warningOrange)}>! {this._validationResult.warningMessage}</Text>
                    </Text>
                </Box>
            );
            elements.push(validationDisplay);
        }
        
        // Step 7: Render visible children with scroll indicators
        this.renderVisibleChildren(elements, visibleElements.visibleElements, viewport, scrollIndicators);
        
        // Step 8: Render confirmation line(s)
        if (this._useDualButtons) {
            // Render dual-button confirmation
            const dualButtonLayout = this.viewportSystem.viewportCalculator.calculateDualButtonConfirmationLayout(
                this._focusedButton,
                viewport,
                this.isConfirmEnabled,
                this._customConfirmText,
                this._customCancelText
            );
            
            elements.push(
                <Box key="dual-confirm-action">
                    <Text>
                        <Text {...textColorProp(theme.colors.textMuted)}>{dualButtonLayout.prefix}</Text>
                        <Text {...textColorProp(this._focusedButton ? theme.colors.accent : undefined)}>
                            {dualButtonLayout.icon}
                        </Text>
                        
                        {/* Confirm Button */}
                        <Text {...textColorProp(
                            dualButtonLayout.confirmButton.isEnabled 
                                ? (dualButtonLayout.confirmButton.isFocused ? theme.colors.accent : theme.colors.successGreen)
                                : theme.colors.textMuted
                        )}>
                            {dualButtonLayout.confirmButton.check}
                        </Text>
                        <Text {...textColorProp(
                            dualButtonLayout.confirmButton.isEnabled 
                                ? (dualButtonLayout.confirmButton.isFocused ? theme.colors.accent : undefined)
                                : theme.colors.textMuted
                        )}>
                            {dualButtonLayout.confirmButton.text}
                        </Text>
                        
                        {/* Separator */}
                        <Text>{dualButtonLayout.separator}</Text>
                        
                        {/* Cancel Button */}
                        <Text {...textColorProp(
                            dualButtonLayout.cancelButton.isFocused ? theme.colors.accent : theme.colors.dangerRed
                        )}>
                            {dualButtonLayout.cancelButton.cross}
                        </Text>
                        {dualButtonLayout.cancelButton.needsBoldY ? (
                            // Special rendering for "Press Y to confirm" with bold Y - use truncated text
                            (() => {
                                const text = dualButtonLayout.cancelButton.text;
                                if (text === 'Press Y to confirm') {
                                    // Full text fits
                                    return (
                                        <Text {...textColorProp(
                                            dualButtonLayout.cancelButton.isFocused ? theme.colors.accent : undefined
                                        )}>
                                            Press <Text bold>Y</Text> to confirm
                                        </Text>
                                    );
                                } else if (text.includes('Y')) {
                                    // Text was truncated but Y is still visible
                                    const parts = text.split('Y');
                                    return (
                                        <Text {...textColorProp(
                                            dualButtonLayout.cancelButton.isFocused ? theme.colors.accent : undefined
                                        )}>
                                            {parts[0]}<Text bold>Y</Text>{parts[1]}
                                        </Text>
                                    );
                                } else {
                                    // Y was truncated out, just show truncated text
                                    return (
                                        <Text {...textColorProp(
                                            dualButtonLayout.cancelButton.isFocused ? theme.colors.accent : undefined
                                        )}>
                                            {text}
                                        </Text>
                                    );
                                }
                            })()
                        ) : (
                            // Normal text rendering
                            <Text {...textColorProp(
                                dualButtonLayout.cancelButton.isFocused ? theme.colors.accent : undefined
                            )}>
                                {dualButtonLayout.cancelButton.text}
                            </Text>
                        )}
                    </Text>
                </Box>
            );
        } else {
            // Render traditional single confirmation
            const confirmLayout = this.viewportSystem.viewportCalculator.calculateConfirmationLayout(
                this._isConfirmFocused,
                viewport,
                this._customConfirmText
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
        }
        
        return elements;
    }
    
    /**
     * Render visible children with line-based scroll indicators
     */
    private renderVisibleChildren(
        elements: ReactElement[],
        visibleElements: any[],
        viewport: any,
        scrollIndicators: any
    ): void {
        // Track current line position within viewport for accurate indicator placement
        let currentViewportLine = 0;
        
        // Calculate total viewport lines available for content indicators
        const maxViewportLines = viewport.contentHeight;
        
        visibleElements.forEach((visibleElement) => {
            const { element, globalIndex, renderLines } = visibleElement;
            
            // Set active state
            const isChildSelected = globalIndex === this._childSelectedIndex && !this._isConfirmFocused && !this._focusedButton;
            element.isActive = isChildSelected;
            
            // Render child element
            const childElements = element.render(
                viewport.contentWidth, 
                renderLines
            );
            
            // Handle both single elements and arrays with line-by-line tracking
            if (Array.isArray(childElements)) {
                childElements.forEach((childElement, elemIndex) => {
                    // Skip rendering if we've exceeded viewport bounds
                    if (currentViewportLine >= maxViewportLines) {
                        return;
                    }
                    
                    // Calculate prefix with scroll indicators based on viewport line position
                    let prefix = '│ ';
                    if (currentViewportLine === 0 && scrollIndicators.showUp) {
                        prefix = '│▲'; // First line of viewport
                    } else if (currentViewportLine === maxViewportLines - 1 && scrollIndicators.showDown) {
                        prefix = '│▼'; // Last line of viewport
                    }
                    
                    elements.push(
                        <Box key={`child-${globalIndex}-${elemIndex}`}>
                            <Text {...textColorProp(theme.colors.textMuted)}>
                                {prefix}
                            </Text>
                            {childElement}
                        </Box>
                    );
                    
                    // Increment line position for next iteration
                    currentViewportLine++;
                });
            } else {
                // Single element case - skip if beyond viewport bounds
                if (currentViewportLine < maxViewportLines) {
                    let prefix = '│ ';
                    if (currentViewportLine === 0 && scrollIndicators.showUp) {
                        prefix = '│▲'; // First line of viewport
                    } else if (currentViewportLine === maxViewportLines - 1 && scrollIndicators.showDown) {
                        prefix = '│▼'; // Last line of viewport
                    }
                    
                    elements.push(
                        <Box key={`child-${globalIndex}`}>
                            <Text {...textColorProp(theme.colors.textMuted)}>
                                {prefix}
                            </Text>
                            {childElements}
                        </Box>
                    );
                    
                    // Increment line position for next iteration
                    currentViewportLine++;
                }
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
        
        // Priority 2: Handle navigation using actual render width and constraints
        // CRITICAL: Use the same viewport calculation as rendering to ensure consistency
        const viewport = this.viewportSystem.viewportCalculator.calculateViewport(
            this._lastRenderWidth,
            this._lastMaxLines // Use the same maxLines constraint as in rendering
        );
        
        const elementPositions = this.viewportSystem.visibilityCalculator.calculateElementPositions(
            this._childItems,
            viewport.contentWidth,
            viewport.contentHeight // Apply height constraint: max element height = viewport height
        );
        
        if (key.upArrow) {
            // Revert confirmation mode if navigating away
            if (this._cancelConfirmationMode) {
                this._cancelConfirmationMode = false;
                this._customCancelText = this._originalCancelText;
            }
            
            this._lastNavigationDirection = 'up'; // Track navigation direction
            
            if (this._isConfirmFocused || this._focusedButton) {
                // From confirmation/buttons, go to last navigable item
                const lastNavigableIndex = this.viewportSystem.navigationManager.findLastNavigableElement(
                    this._childItems
                );
                if (lastNavigableIndex >= 0) {
                    this._isConfirmFocused = false;
                    this._focusedButton = null;
                    this.updateSelectionToIndex(lastNavigableIndex, elementPositions, 'up');
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
                    this.updateSelectionToIndex(prevIndex, elementPositions, 'up');
                    return true;
                } else {
                    // No previous item, go to confirmation (circular navigation)
                    this.moveToConfirmation();
                    return true;
                }
            }
        }
        
        if (key.downArrow) {
            // Revert confirmation mode if navigating away
            if (this._cancelConfirmationMode) {
                this._cancelConfirmationMode = false;
                this._customCancelText = this._originalCancelText;
            }
            
            this._lastNavigationDirection = 'down'; // Track navigation direction
            
            if (this._isConfirmFocused || this._focusedButton) {
                // From confirmation/buttons, go to first navigable item
                const firstNavigableIndex = this.viewportSystem.navigationManager.findFirstNavigableElement(
                    this._childItems
                );
                if (firstNavigableIndex >= 0) {
                    this._isConfirmFocused = false;
                    this._focusedButton = null;
                    this.updateSelectionToIndex(firstNavigableIndex, elementPositions, 'down');
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
                    this.updateSelectionToIndex(nextIndex, elementPositions, 'down');
                    return true;
                } else {
                    // No next item, go to confirmation (circular navigation)
                    this.moveToConfirmation();
                    return true;
                }
            }
        }
        
        // Handle left/right arrows for dual-button navigation
        if (key.leftArrow) {
            if (this._useDualButtons && (this._isConfirmFocused || this._focusedButton)) {
                // In dual-button mode: left arrow moves from cancel to confirm (visual left)
                if (this._focusedButton === 'cancel') {
                    // Revert confirmation mode when navigating away from cancel button
                    if (this._cancelConfirmationMode) {
                        this._cancelConfirmationMode = false;
                        this._customCancelText = this._originalCancelText;
                    }
                    
                    // Only move to confirm if it's enabled
                    if (this.isConfirmEnabled) {
                        this._focusedButton = 'confirm';
                        return true;
                    }
                    return false; // Stay on cancel if confirm is disabled
                } else if (this._focusedButton === 'confirm' || this._isConfirmFocused) {
                    // From confirm button or legacy confirm focus: exit container
                    this.cancelAndExit();
                    return true;
                }
            } else if (!this._isConfirmFocused && !this._focusedButton && activeChild?.onCollapse) {
                // New behavior: only try to collapse child if it's expanded
                const wasCollapsed = activeChild.onCollapse();
                if (wasCollapsed) {
                    return true; // Item was expanded and got collapsed, consume the input
                }
                // Item was already collapsed, fall through to exit container
                this.cancelAndExit();
                return true;
            } else {
                // Traditional behavior: close the container
                this.cancelAndExit();
                return true;
            }
        }
        
        if (key.rightArrow) {
            if (this._useDualButtons && (this._isConfirmFocused || this._focusedButton)) {
                // In dual-button mode: right arrow moves from confirm to cancel (visual right)
                if (this._focusedButton === 'confirm') {
                    this._focusedButton = 'cancel';
                    return true;
                } else if (this._isConfirmFocused) {
                    // Legacy confirm focus: move to cancel (always enabled)
                    this._focusedButton = 'cancel';
                    this._isConfirmFocused = false;
                    return true;
                }
            } else if (!this._isConfirmFocused && !this._focusedButton && activeChild?.onExpand) {
                // Traditional behavior: expand child item
                activeChild.onExpand();
                return true;
            } else if (!this._isConfirmFocused && !this._focusedButton && this._useDualButtons) {
                // In dual-button mode: if no expandable item, move to buttons
                this.moveToConfirmation();
                return true;
            }
        }
        
        // Handle other keys
        if (key.return) {
            if (this._useDualButtons) {
                // Dual-button mode
                if (this._focusedButton === 'confirm' && this.isConfirmEnabled) {
                    this.confirmAndExit();
                    return true;
                } else if (this._focusedButton === 'cancel') {
                    // Only require confirmation if button is marked as destructive
                    if (this._cancelButtonConfig.isDestructive) {
                        if (this._cancelConfirmationMode) {
                            // Already in confirmation mode, execute cancel
                            this.cancelAndExit();
                            return true;
                        } else {
                            // Enter confirmation mode
                            this._cancelConfirmationMode = true;
                            this._customCancelText = 'Press Y to confirm';
                            return true;
                        }
                    } else {
                        // Non-destructive button - execute immediately
                        this.cancelAndExit();
                        return true;
                    }
                } else if (this._isConfirmFocused && this.isConfirmEnabled) {
                    // Legacy confirm focus
                    this.confirmAndExit();
                    return true;
                } else if (!this._focusedButton && activeChild?.onEnter) {
                    // Not on a button, delegate to active child
                    activeChild.onEnter();
                    return true;
                }
                return false; // Disabled confirm button or no action
            } else {
                // Traditional single-button mode
                if (this._isConfirmFocused) {
                    this.confirmAndExit();
                    return true;
                } else if (activeChild?.onEnter) {
                    activeChild.onEnter();
                    return true;
                }
            }
        }
        
        if (key.escape) {
            if (this._cancelConfirmationMode) {
                // Exit confirmation mode, restore original text
                this._cancelConfirmationMode = false;
                this._customCancelText = this._originalCancelText;
                return true;
            } else {
                // Escape: always close the container
                this.cancelAndExit();
                return true;
            }
        }
        
        // Handle 'Y' key for confirmation
        if (input.toLowerCase() === 'y' && this._cancelConfirmationMode && this._focusedButton === 'cancel') {
            // Confirm the cancel action - set flag to indicate this is a confirmed removal
            this._confirmedRemoval = true;
            this.cancelAndExit();
            return true;
        }
        
        // Handle any other key while in confirmation mode - revert to original state
        if (this._cancelConfirmationMode && this._focusedButton === 'cancel' && input) {
            // Any key other than Y/y or escape (already handled above) reverts confirmation
            this._cancelConfirmationMode = false;
            this._customCancelText = this._originalCancelText;
            return true;
        }
        
        if (key.tab) {
            // Revert confirmation mode if using tab to navigate away
            if (this._cancelConfirmationMode) {
                this._cancelConfirmationMode = false;
                this._customCancelText = this._originalCancelText;
            }
            return false; // Allow tab to bubble up
        }
        
        return true; // Consume all other input when controlling
    }
    
    
    /**
     * Update selection to a specific index - scroll handled in render cycle
     */
    private updateSelectionToIndex(
        newIndex: number, 
        elementPositions: any[], 
        direction?: 'up' | 'down'
    ): void {
        // Deselect old child
        const oldChild = this._childItems[this._childSelectedIndex];
        if (oldChild) {
            oldChild.isActive = false;
            if (oldChild.onDeselect) {
                oldChild.onDeselect();
            }
        }
        
        // Update selection and store navigation direction for render cycle
        this._childSelectedIndex = newIndex;
        this._lastNavigationDirection = direction || this._lastNavigationDirection;
        
        // NOTE: Scroll adjustment now happens in render cycle to ensure atomicity
        
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
     * RENDER-CYCLE SCROLL ADJUSTMENT: Ensure selected element is always visible
     */
    private ensureSelectedElementVisible(elementPositions: any[], viewport: any): void {
        // Skip if focus is on confirmation
        if (this._isConfirmFocused) {
            return;
        }
        
        const selectedElementPos = elementPositions[this._childSelectedIndex];
        if (!selectedElementPos) {
            return;
        }
        
        const currentScrollOffset = this.viewportSystem.scrollManager.getScrollOffset();
        const viewportStart = currentScrollOffset;
        const viewportEnd = currentScrollOffset + viewport.contentHeight;
        
        // Check if selected element is visible
        const elementVisible = selectedElementPos.start >= viewportStart && 
                              selectedElementPos.end <= viewportEnd;
        
        if (!elementVisible) {
            // Element not visible - adjust scroll using direction-aware logic
            this.viewportSystem.scrollManager.scrollToElement(
                this._childSelectedIndex,
                elementPositions,
                this._lastNavigationDirection
            );
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
        
        if (this._useDualButtons) {
            // In dual-button mode, focus the appropriate button
            if (this.isConfirmEnabled) {
                this._focusedButton = 'confirm';
            } else {
                this._focusedButton = 'cancel';
            }
            this._isConfirmFocused = false;
        } else {
            // Traditional single-button mode
            this._isConfirmFocused = true;
            this._focusedButton = null;
        }
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
     * Cancel selection and exit
     */
    private cancelAndExit(): void {
        // For destructive buttons, only call handler if confirmed
        // For non-destructive buttons, always call handler
        if (this._onCancel) {
            const isDestructive = this._cancelButtonConfig.isDestructive;
            if (!isDestructive || this._confirmedRemoval) {
                this._onCancel();
            }
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
        
        // Clean up button focus states
        this._isConfirmFocused = false;
        this._focusedButton = null;
        
        // Reset confirmation mode
        this._cancelConfirmationMode = false;
        this._customCancelText = this._originalCancelText;
        this._confirmedRemoval = false;
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