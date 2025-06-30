import React, { ReactElement } from 'react';
import { Box, Text, Key } from 'ink';
import { IListItem } from './IListItem.js';
import { theme } from '../../utils/theme.js';
import { SelectionBody } from './SelectionBody.js';
import { NotificationArea } from './NotificationArea.js';

export interface SelectionOption {
    value: string;
    label: string;
}

export type SelectionMode = 'radio' | 'checkbox';
export type SelectionLayout = 'vertical' | 'horizontal';

export class SelectionListItem implements IListItem {
    readonly selfConstrained = true as const;
    private _isControllingInput: boolean = false;
    private _selectedValues: string[] = [];
    private _focusedIndex: number = 0;
    private onValueChange?: (newValues: string[]) => void;
    private _validationError: string | null = null;
    
    // Track working state while editing
    private _workingSelectedValues: string[] = [];
    
    // Track the effective layout after responsive adjustments
    private _effectiveLayout: SelectionLayout;
    
    constructor(
        public icon: string,
        private label: string,
        private options: SelectionOption[],
        public selectedValues: string[],
        public isActive: boolean,
        private mode: SelectionMode = 'radio',
        private layout: SelectionLayout = 'vertical',
        onValueChange?: (newValues: string[]) => void,
        private minSelections?: number,
        private maxSelections?: number,
        private autoSwitchLayout: boolean = false
    ) {
        this._selectedValues = [...selectedValues];
        this._workingSelectedValues = [...selectedValues];
        this.onValueChange = onValueChange;
        this._effectiveLayout = layout; // Initialize with the original layout
    }
    
    get isControllingInput(): boolean {
        return this._isControllingInput;
    }
    
    onEnter(): void {
        // Enter expanded mode
        this._isControllingInput = true;
        this._workingSelectedValues = [...this._selectedValues];
        this._focusedIndex = 0;
        
        // Focus on first selected item if any
        if (this._workingSelectedValues.length > 0) {
            const firstSelectedIndex = this.options.findIndex(
                opt => this._workingSelectedValues.includes(opt.value)
            );
            if (firstSelectedIndex !== -1) {
                this._focusedIndex = firstSelectedIndex;
            }
        }
        
        // Validate initial state
        this.validateSelection();
    }
    
    onExit(): void {
        // Exit expanded mode
        this._isControllingInput = false;
        this._validationError = null;
    }
    
    handleInput(input: string, key: Key): boolean {
        if (!this._isControllingInput) return false;
        
        if (key.escape) {
            // Cancel changes
            this._workingSelectedValues = [...this._selectedValues];
            this._focusedIndex = 0;
            this.onExit();
            return true;
        } else if (key.return) {
            // For radio mode: select the focused option first
            if (this.mode === 'radio') {
                const focusedOption = this.options[this._focusedIndex];
                if (focusedOption) {
                    this._workingSelectedValues = [focusedOption.value];
                }
            }
            
            // Validate before confirming
            this.validateSelection();
            if (this._validationError) {
                // Don't confirm if there's a validation error
                return true;
            }
            
            // Confirm current state and exit
            this._selectedValues = [...this._workingSelectedValues];
            this.selectedValues = [...this._workingSelectedValues];
            this.onValueChange?.(this._selectedValues);
            this.onExit();
            return true;
        } else if (key.upArrow && this._effectiveLayout === 'vertical') {
            // Move focus up
            this._focusedIndex = this._focusedIndex > 0 
                ? this._focusedIndex - 1 
                : this.options.length - 1; // Wrap to bottom
            
            // Auto-select in radio mode
            if (this.mode === 'radio') {
                const option = this.options[this._focusedIndex];
                if (option) {
                    this._workingSelectedValues = [option.value];
                }
            }
            return true;
        } else if (key.downArrow && this._effectiveLayout === 'vertical') {
            // Move focus down
            this._focusedIndex = this._focusedIndex < this.options.length - 1 
                ? this._focusedIndex + 1 
                : 0; // Wrap to top
            
            // Auto-select in radio mode
            if (this.mode === 'radio') {
                const option = this.options[this._focusedIndex];
                if (option) {
                    this._workingSelectedValues = [option.value];
                }
            }
            return true;
        } else if (key.leftArrow && this._effectiveLayout === 'vertical') {
            // In vertical layout, left arrow acts as back/cancel
            this._workingSelectedValues = [...this._selectedValues];
            this._focusedIndex = 0;
            this.onExit();
            return true;
        } else if (key.leftArrow && this._effectiveLayout === 'horizontal') {
            // In horizontal layout, left arrow acts as back only when at first option
            if (this._focusedIndex === 0) {
                // At first option, act as back/cancel
                this._workingSelectedValues = [...this._selectedValues];
                this._focusedIndex = 0;
                this.onExit();
                return true;
            } else {
                // Otherwise, move focus left
                this._focusedIndex = this._focusedIndex - 1;
                
                // Auto-select in radio mode
                if (this.mode === 'radio') {
                    const option = this.options[this._focusedIndex];
                    if (option) {
                        this._workingSelectedValues = [option.value];
                    }
                }
                return true;
            }
        } else if (key.rightArrow && this._effectiveLayout === 'horizontal') {
            // Move focus right
            this._focusedIndex = this._focusedIndex < this.options.length - 1 
                ? this._focusedIndex + 1 
                : 0; // Wrap to start
            
            // Auto-select in radio mode
            if (this.mode === 'radio') {
                const option = this.options[this._focusedIndex];
                if (option) {
                    this._workingSelectedValues = [option.value];
                }
            }
            return true;
        } else if (input === ' ' && this.mode === 'checkbox') {
            // Toggle selection at focused index (checkbox mode only)
            const option = this.options[this._focusedIndex];
            if (option) {
                this.toggleSelection(option.value);
            }
            return true;
        }
        return true; // Consume all input when in expanded mode
    }
    
    private toggleSelection(value: string): void {
        const isSelected = this._workingSelectedValues.includes(value);
        
        if (this.mode === 'radio') {
            // Radio mode: only one selection allowed
            if (!isSelected) {
                this._workingSelectedValues = [value];
            }
            // Don't allow deselecting in radio mode
        } else {
            // Checkbox mode: toggle the selection
            if (isSelected) {
                // Check minimum selections
                if (this.minSelections && this._workingSelectedValues.length <= this.minSelections) {
                    this._validationError = `Minimum ${this.minSelections} selection${this.minSelections > 1 ? 's' : ''} required`;
                    return; // Can't deselect if at minimum
                }
                this._workingSelectedValues = this._workingSelectedValues.filter(v => v !== value);
            } else {
                // Check maximum selections
                if (this.maxSelections && this._workingSelectedValues.length >= this.maxSelections) {
                    this._validationError = `Maximum ${this.maxSelections} selection${this.maxSelections > 1 ? 's' : ''} allowed`;
                    return; // Can't select more if at maximum
                }
                this._workingSelectedValues.push(value);
            }
            // Clear validation error if operation was successful
            this.validateSelection();
        }
    }
    
    private validateSelection(): void {
        this._validationError = null;
        
        if (this.mode === 'checkbox') {
            const count = this._workingSelectedValues.length;
            
            if (this.minSelections && count < this.minSelections) {
                this._validationError = `Minimum ${this.minSelections} selection${this.minSelections > 1 ? 's' : ''} required`;
            } else if (this.maxSelections && count > this.maxSelections) {
                this._validationError = `Maximum ${this.maxSelections} selection${this.maxSelections > 1 ? 's' : ''} allowed`;
            }
        }
    }
    
    onSelect(): void {
        // Could add visual feedback when selected
    }
    
    onDeselect(): void {
        // Could remove visual feedback when deselected
    }
    
    render(maxWidth: number, maxLines?: number): ReactElement | ReactElement[] {
        if (this._isControllingInput) {
            // Expanded mode with keyboard hints in header
            const elements: ReactElement[] = [];
            
            // Determine effective layout based on available space
            let effectiveLayout = this.layout;
            
            // Only auto-switch if enabled
            if (this.autoSwitchLayout) {
                if (this.layout === 'horizontal') {
                    // Check if horizontal layout fits in available width
                    // Calculate total width needed for horizontal display
                    let totalWidth = 3; // "│  " prefix
                    totalWidth += 'Select one:'.length + 1; // prompt text
                    this.options.forEach((opt, idx) => {
                        if (idx > 0) totalWidth += 3; // " │ " separator
                        totalWidth += 2 + opt.label.length; // "○ " + label
                    });
                    
                    // Switch to vertical if doesn't fit
                    if (totalWidth > maxWidth) {
                        effectiveLayout = 'vertical';
                    }
                } else if (this.layout === 'vertical' && maxLines) {
                    // Check if vertical layout fits in available height
                    const requiredLines = 2 + this.options.length; // header + prompt + options
                    
                    // Switch to horizontal if doesn't fit and horizontal would use less lines
                    if (requiredLines > maxLines && maxLines >= 3) {
                        effectiveLayout = 'horizontal';
                    }
                }
            }
            
            // Store the effective layout for key handling
            this._effectiveLayout = effectiveLayout;
            
            // Header with inline notification area
            const bulletColor = this.isActive ? theme.colors.accent : (this._validationError ? 'red' : undefined);
            
            // Build header text
            let headerText = '';
            const labelPart = `${this.label}: `;
            
            if (this._validationError) {
                const errorText = ` ✗ ${this._validationError}`;
                const totalLength = 2 + labelPart.length + errorText.length; // 2 for "■ "
                
                if (totalLength <= maxWidth) {
                    // Everything fits
                    elements.push(
                        <Text key="header">
                            <Text color={bulletColor}>■ </Text>
                            <Text color={this.isActive ? theme.colors.accent : undefined}>{labelPart}</Text>
                            <Text color="red">{errorText}</Text>
                        </Text>
                    );
                } else {
                    // Need to truncate
                    const availableForError = maxWidth - 2 - labelPart.length - 1; // -1 for ellipsis
                    if (availableForError > 3) { // " ✗ " is 3 chars
                        const truncatedError = this._validationError.slice(0, availableForError - 3 - 1) + '…';
                        elements.push(
                            <Text key="header">
                                <Text color={bulletColor}>■ </Text>
                                <Text color={this.isActive ? theme.colors.accent : undefined}>{labelPart}</Text>
                                <Text color="red"> ✗ {truncatedError}</Text>
                            </Text>
                        );
                    } else {
                        // Not enough space for error, just show label
                        elements.push(
                            <Text key="header">
                                <Text color={bulletColor}>■ </Text>
                                <Text color={this.isActive ? theme.colors.accent : undefined}>{labelPart}</Text>
                            </Text>
                        );
                    }
                }
            } else {
                // Show keyboard hints with progressive truncation
                const baseLength = 2 + labelPart.length; // "■ " + label
                const availableForHints = maxWidth - baseLength;
                const fullHintsLength = 19; // "[enter] ✓ • [esc] ✗"
                const partialHintsLength = 10; // "[enter] ✓"
                
                let showFullHints = false;
                let showPartialHints = false;
                
                if (availableForHints >= fullHintsLength) {
                    showFullHints = true;
                } else if (availableForHints >= partialHintsLength) {
                    showPartialHints = true;
                }
                
                elements.push(
                    <Text key="header">
                        <Text color={this.isActive ? theme.colors.accent : undefined}>■ </Text>
                        <Text color={this.isActive ? theme.colors.accent : undefined}>{labelPart}</Text>
                        {showFullHints && (
                            <>
                                <Text color={theme.colors.textMuted}>[enter] </Text>
                                <Text color={theme.colors.successGreen}>✓</Text>
                                <Text color={theme.colors.textMuted}> · [esc] </Text>
                                <Text color={theme.colors.warningOrange}>✗</Text>
                            </>
                        )}
                        {showPartialHints && !showFullHints && (
                            <>
                                <Text color={theme.colors.textMuted}>[enter] </Text>
                                <Text color={theme.colors.successGreen}>✓</Text>
                            </>
                        )}
                    </Text>
                );
            }
            
            // Calculate available lines for body (excluding header)
            const bodyMaxLines = maxLines ? maxLines - 1 : undefined; // -1 for header
            
            // Selection body
            const bodyElements = SelectionBody({
                options: this.options,
                selectedValues: this._workingSelectedValues,
                focusedIndex: this._focusedIndex,
                mode: this.mode,
                layout: effectiveLayout,
                width: maxWidth,
                headerColor: this.isActive ? theme.colors.accent : undefined,
                validationError: this._validationError,
                useASCII: false, // Could detect terminal capabilities
                maxLines: bodyMaxLines
            });
            
            return [...elements, ...bodyElements];
        } else {
            // Collapsed view
            const displayValues = this.getDisplayValues();
            const { label, value, truncated } = this.formatCollapsedParts(maxWidth, displayValues);
            
            // Build the full text without nested components to avoid wrapping
            const fullText = truncated 
                ? `${this.icon} ${label}: [${value}…]`
                : `${this.icon} ${label}: [${value}]`;
            
            // CRITICAL: Ensure text never equals or exceeds maxWidth to prevent wrapping
            // Use conservative width calculation to prevent wrapping
            const conservativeWidth = maxWidth - 2;
            if (fullText.length >= conservativeWidth) {
                // Force truncation to prevent wrapping
                const safeLength = maxWidth - 4; // Leave room for "…]"
                const labelAndIconLength = this.icon.length + 1 + label.length + 2; // "icon label: "
                const remainingSpace = safeLength - labelAndIconLength - 2; // -2 for "[]"
                const truncatedValue = displayValues.slice(0, Math.max(0, remainingSpace));
                
                // Build single text string to prevent wrapping at component boundaries
                const forcedTruncatedText = `${this.icon} ${label}: [${truncatedValue}…]`;
                
                return (
                    <Text color={this.isActive ? theme.colors.accent : theme.colors.text}>
                        {forcedTruncatedText}
                    </Text>
                );
            }
                
            // Build single text string to prevent wrapping at component boundaries
            const normalText = `${this.icon} ${label}: [${value}${truncated ? '…' : ''}]`;
            
            return (
                <Text color={this.isActive ? theme.colors.accent : theme.colors.text}>
                    {normalText}
                </Text>
            );
        }
    }
    
    private getDisplayValues(): string {
        if (this._selectedValues.length === 0) {
            return 'none';
        }
        
        // Map values to labels
        const selectedLabels = this._selectedValues
            .map(value => {
                const option = this.options.find(opt => opt.value === value);
                return option ? option.label : value;
            })
            .filter(label => label !== undefined);
        
        if (this.mode === 'radio') {
            // Radio mode: show single value
            return selectedLabels[0] || 'none';
        } else {
            // Checkbox mode: show comma-separated values
            return selectedLabels.join(', ');
        }
    }
    
    private formatCollapsedParts(maxWidth: number, displayValues: string): { label: string; value: string; truncated: boolean } {
        // The render() method will prepend "{icon} " (2 chars)
        // So we need to account for that in our width calculation
        const iconWidth = 2; // icon + space
        const availableWidth = maxWidth - iconWidth;
        
        // Check if everything fits without truncation
        // Need to leave 1 char buffer to prevent wrapping when text exactly matches width
        const fullTextLength = this.label.length + 2 + displayValues.length + 2; // "Label: [value]"
        if (fullTextLength < availableWidth) {
            return { label: this.label, value: displayValues, truncated: false };
        }
        
        // Minimum viable display is "[…]" = 3 chars
        if (availableWidth < 3) {
            return { label: '', value: '…', truncated: false };
        }
        
        // Calculate components
        const labelAndSeparatorLength = this.label.length + 2; // "Label: "
        const bracketsLength = 2; // "[]"
        const ellipsisLength = 1; // "…"
        
        // First priority: try to fit label + brackets with truncated value
        const spaceNeededForStructure = labelAndSeparatorLength + bracketsLength + ellipsisLength;
        const spaceForValue = availableWidth - spaceNeededForStructure;
        
        if (spaceForValue > 0) {
            // We can fit the label and brackets with some value
            if (displayValues.length > spaceForValue) {
                // Truncate the value to fit
                return { 
                    label: this.label, 
                    value: displayValues.slice(0, spaceForValue),
                    truncated: true 
                };
            } else {
                // Value fits without truncation
                return { label: this.label, value: displayValues, truncated: false };
            }
        }
        
        // Second priority: truncate label to make room for "[…]"
        const minBracketContent = 3; // "[…]"
        const minLabelSpace = availableWidth - minBracketContent - 2; // -2 for ": "
        if (minLabelSpace > 0) {
            const truncatedLabel = this.label.length > minLabelSpace 
                ? this.label.slice(0, minLabelSpace - ellipsisLength) + '…'
                : this.label;
            return { label: truncatedLabel, value: '…', truncated: false };
        }
        
        // Last resort: just show ellipsis
        return { label: '', value: '…', truncated: false };
    }
    
    getRequiredLines(maxWidth: number, maxHeight?: number): number {
        if (!this._isControllingInput) {
            return 1; // Collapsed view is always 1 line
        }
        
        if (this.autoSwitchLayout) {
            // When auto-switching is enabled, return the minimum lines (horizontal layout)
            // This ensures the panel will include the item even when space is tight
            return 3; // Header + "Select one:" line + horizontal options line
        } else {
            // When auto-switching is disabled, return lines based on current layout
            if (this.layout === 'vertical') {
                return 2 + this.options.length; // Header + "Select one:" line + each option
            } else {
                return 3; // Header + "Select one:" line + horizontal options line
            }
        }
    }
}