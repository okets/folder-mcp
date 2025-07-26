import React, { ReactElement } from 'react';
import { Box, Text, Key } from 'ink';
import { IListItem } from './IListItem';
import { theme } from '../../utils/theme';
import { SelectionBody } from './SelectionBody';
import { NotificationArea } from './NotificationArea';
import { getVisualWidth } from '../../utils/validationDisplay';
import { textColorProp, buildProps } from '../../utils/conditionalProps';

export interface SelectionOption {
    value: string;
    label: string;
    details?: Record<string, string>;
}

export type SelectionMode = 'radio' | 'checkbox';
export type SelectionLayout = 'vertical' | 'horizontal';

export class SelectionListItem implements IListItem {
    readonly selfConstrained = true as const;
    readonly isNavigable = true; // SelectionListItems are interactive and navigable
    private _isControllingInput: boolean = false;
    private _selectedValues: string[] = [];
    private _focusedIndex: number = 0;
    private onValueChange?: (newValues: string[]) => void;
    private _validationError: string | null = null;
    public _validationMessage: any = null; // For external validation messages
    
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
        private autoSwitchLayout: boolean = false,
        private showDetails: boolean = false,
        private detailColumns?: string[]
    ) {
        this._selectedValues = [...selectedValues];
        this._workingSelectedValues = [...selectedValues];
        if (onValueChange !== undefined) {
            this.onValueChange = onValueChange;
        }
        this._effectiveLayout = layout; // Initialize with the original layout
    }
    
    get isControllingInput(): boolean {
        return this._isControllingInput;
    }
    
    get effectiveLayout(): SelectionLayout {
        return this._effectiveLayout;
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
    
    onExpand(): void {
        // Handle right arrow key to expand - delegate to onEnter
        this.onEnter();
    }
    
    handleInput(input: string, key: Key): boolean {
        if (!this._isControllingInput) return false;
        
        if (key.escape) {
            // Cancel changes
            this._workingSelectedValues = [...this._selectedValues];
            this._focusedIndex = 0;
            this.onExit();
            return true;
        } else if ((key.upArrow || key.downArrow) && this._effectiveLayout === 'horizontal') {
            // In horizontal layout, up/down arrows exit without saving
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
        
        // Allow tab to bubble up for panel navigation
        if (key.tab) {
            return false;
        }
        
        return true; // Consume all input when in expanded mode except tab
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
            
            // Check if horizontal layout would require significant truncation
            if (this.layout === 'horizontal') {
                // Calculate space needed for structure
                const promptLine = 3 + getVisualWidth(`Select ${this.mode === 'radio' ? 'one' : 'options'}:`); // "│  Select X:"
                const prefixAndSuffix = 3 + 5; // "└─ " prefix + " ←→" suffix minimum
                const symbolSpace = 2; // "○ " per option
                const separatorSpace = 3; // " │ " between options
                
                // Find longest option
                const longestOptionLength = Math.max(...this.options.map(opt => getVisualWidth(opt.label)));
                
                // Calculate available width per option in horizontal layout
                const structureWidth = prefixAndSuffix + 
                    (this.options.length * symbolSpace) + 
                    ((this.options.length - 1) * separatorSpace);
                const availableForLabels = maxWidth - structureWidth - 1; // -1 for safety
                const availablePerOption = Math.floor(availableForLabels / this.options.length);
                
                // Check if longest option would be truncated more than 10%
                const truncationNeeded = longestOptionLength - availablePerOption;
                const truncationPercentage = truncationNeeded > 0 ? (truncationNeeded / longestOptionLength) * 100 : 0;
                
                // Force vertical if truncation > 10% OR doesn't fit at all
                if (truncationPercentage > 10 || availablePerOption < 3) {
                    effectiveLayout = 'vertical';
                }
            } else if (this.autoSwitchLayout && this.layout === 'vertical' && maxLines) {
                // Check if vertical layout fits in available height
                const requiredLines = 2 + this.options.length; // header + prompt + options
                
                // Only switch to horizontal if it would use less lines AND not truncate badly
                if (requiredLines > maxLines && maxLines >= 3) {
                    // Re-check if horizontal would work without bad truncation
                    const longestOptionLength = Math.max(...this.options.map(opt => getVisualWidth(opt.label)));
                    const structureWidth = 8 + (this.options.length * 2) + ((this.options.length - 1) * 3);
                    const availableForLabels = maxWidth - structureWidth - 1;
                    const availablePerOption = Math.floor(availableForLabels / this.options.length);
                    const truncationPercentage = longestOptionLength > availablePerOption ? 
                        ((longestOptionLength - availablePerOption) / longestOptionLength) * 100 : 0;
                    
                    if (truncationPercentage <= 10 && availablePerOption >= 3) {
                        effectiveLayout = 'horizontal';
                    }
                }
            }
            
            // Store the effective layout for key handling
            this._effectiveLayout = effectiveLayout;
            
            // Header with inline notification area
            const bulletColor = this.isActive ? theme.colors.accent : (this._validationError ? 'red' : undefined);
            
            // Build header text with truncation support
            const prefix = '■ ';
            const suffix = ': ';
            const baseLength = prefix.length + suffix.length;
            
            // Calculate available space for label
            let labelToUse = this.label;
            const fullHeaderLength = baseLength + this.label.length;
            
            if (fullHeaderLength > maxWidth - 1) { // -1 for safety buffer
                // Need to truncate label
                const availableForLabel = maxWidth - baseLength - 1 - 1; // -1 for ellipsis, -1 for safety
                if (availableForLabel > 0) {
                    labelToUse = this.label.substring(0, availableForLabel) + '…';
                } else {
                    labelToUse = '…'; // Extreme case
                }
            }
            
            const labelPart = `${labelToUse}:`;
            
            if (this._validationError) {
                const errorText = ` ✗ ${this._validationError}`;
                const totalLength = 2 + labelPart.length + errorText.length; // 2 for "■ "
                
                if (totalLength <= maxWidth) {
                    // Everything fits
                    elements.push(
                        <Text key="header">
                            <Text {...textColorProp(bulletColor)}>■ </Text>
                            <Text {...textColorProp(this.isActive ? theme.colors.accent : undefined)}>{labelPart}</Text>
                            <Text {...textColorProp('red')}>{errorText}</Text>
                        </Text>
                    );
                } else {
                    // Need to truncate
                    const availableForError = maxWidth - 2 - labelPart.length - 1; // -1 for ellipsis
                    if (availableForError > 3) { // " ✗ " is 3 chars
                        const truncatedError = this._validationError.slice(0, availableForError - 3 - 1) + '…';
                        elements.push(
                            <Text key="header">
                                <Text {...textColorProp(bulletColor)}>■ </Text>
                                <Text {...textColorProp(this.isActive ? theme.colors.accent : undefined)}>{labelPart}</Text>
                                <Text {...textColorProp('red')}> ✗ {truncatedError}</Text>
                            </Text>
                        );
                    } else {
                        // Not enough space for error, just show label
                        elements.push(
                            <Text key="header">
                                <Text {...textColorProp(bulletColor)}>■ </Text>
                                <Text {...textColorProp(this.isActive ? theme.colors.accent : undefined)}>{labelPart} </Text>
                            </Text>
                        );
                    }
                }
            } else {
                // Show keyboard hints with progressive truncation
                const baseLength = getVisualWidth(prefix) + getVisualWidth(labelPart) + 1; // "■ " + label + space
                const availableForHints = maxWidth - baseLength - 1; // -1 for safety buffer
                const fullHintsLength = 15; // "enter ✓ · esc ✗"
                const partialHintsLength = 8; // "enter ✓"
                
                let showFullHints = false;
                let showPartialHints = false;
                
                if (availableForHints >= fullHintsLength) {
                    showFullHints = true;
                } else if (availableForHints >= partialHintsLength) {
                    showPartialHints = true;
                }
                
                elements.push(
                    <Text key="header">
                        <Text {...textColorProp(this.isActive ? theme.colors.accent : undefined)}>■ </Text>
                        <Text {...textColorProp(this.isActive ? theme.colors.accent : undefined)}>{labelPart} </Text>
                        {showFullHints && (
                            <>
                                <Text {...textColorProp(theme.colors.textMuted)} bold>enter </Text>
                                <Text {...textColorProp(theme.colors.successGreen)}>✓</Text>
                                <Text {...textColorProp(theme.colors.textMuted)}> · </Text>
                                <Text {...textColorProp(theme.colors.textMuted)} bold>esc </Text>
                                <Text {...textColorProp(theme.colors.warningOrange)}>✗</Text>
                            </>
                        )}
                        {showPartialHints && !showFullHints && (
                            <>
                                <Text {...textColorProp(theme.colors.textMuted)} bold>enter </Text>
                                <Text {...textColorProp(theme.colors.successGreen)}>✓</Text>
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
                validationError: this._validationError,
                useASCII: false, // Could detect terminal capabilities
                showDetails: this.showDetails && effectiveLayout === 'vertical', // Only show details in vertical layout
                ...(bodyMaxLines !== undefined ? { maxLines: bodyMaxLines } : {}),
                ...(this.isActive ? { headerColor: theme.colors.accent } : {}),
                ...(this.detailColumns !== undefined ? { detailColumns: this.detailColumns } : {})
            });
            
            return [...elements, ...bodyElements];
        } else {
            // Collapsed view
            const displayValues = this.getDisplayValues();
            const { label, value, truncated } = this.formatCollapsedParts(maxWidth, displayValues);
            
            // Build with separate components to allow value coloring and optional validation
            // Use cursor arrow when active, otherwise use the normal icon
            const displayIcon = this.isActive ? '▶' : this.icon;
            const elements = [
                <Text key="main" {...textColorProp(this.isActive ? theme.colors.accent : undefined)}>
                    {displayIcon} {label} [
                </Text>,
                <Text key="value" {...textColorProp(theme.colors.configValuesColor)}>
                    {value}{truncated ? '…' : ''}
                </Text>,
                <Text key="bracket" {...textColorProp(this.isActive ? theme.colors.accent : undefined)}>
                    ]
                </Text>
            ];

            // Add validation checkmark if present (wizard feature)
            if (this._validationMessage && this._validationMessage.state === 'valid') {
                elements.push(
                    <Text key="validation" {...textColorProp(theme.colors.successGreen)}>
                        {' '}✓
                    </Text>
                );
            }

            return (
                <Text>
                    {elements}
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
        const fullTextLength = getVisualWidth(this.label) + 1 + getVisualWidth(displayValues) + 2; // "Label [value]"
        if (fullTextLength < availableWidth - 1) { // -1 for safety buffer
            return { label: this.label, value: displayValues, truncated: false };
        }
        
        // Minimum viable display is "[…]" = 3 chars
        if (availableWidth < 3) {
            return { label: '', value: '…', truncated: false };
        }
        
        // Calculate components
        const labelAndSeparatorLength = getVisualWidth(this.label) + 1; // "Label "
        const bracketsLength = 2; // "[]"
        const ellipsisLength = 1; // "…"
        
        // First priority: try to fit label + brackets with truncated value
        const spaceNeededForStructure = labelAndSeparatorLength + bracketsLength + ellipsisLength;
        const spaceForValue = availableWidth - spaceNeededForStructure - 1; // -1 for safety
        
        if (spaceForValue > 0) {
            // We can fit the label and brackets with some value
            if (getVisualWidth(displayValues) > spaceForValue) {
                // Truncate the value to fit
                return { 
                    label: this.label, 
                    value: displayValues.slice(0, spaceForValue - 1), // -1 for safety
                    truncated: true 
                };
            } else {
                // Value fits without truncation
                return { label: this.label, value: displayValues, truncated: false };
            }
        }
        
        // Second priority: truncate label to make room for "[…]"
        const minBracketContent = 3; // "[…]"
        const minLabelSpace = availableWidth - minBracketContent - 1 - 1; // -1 for " ", -1 for safety
        if (minLabelSpace > 0) {
            const truncatedLabel = getVisualWidth(this.label) > minLabelSpace 
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
        
        // Calculate effective layout based on available width
        let effectiveLayout = this.layout;
        
        if (this.layout === 'horizontal') {
            // Check if horizontal layout would require significant truncation
            const prefixAndSuffix = 3 + 5; // "└─ " prefix + " ←→" suffix minimum
            const symbolSpace = 2; // "○ " per option
            const separatorSpace = 3; // " │ " between options
            
            // Find longest option
            const longestOptionLength = Math.max(...this.options.map(opt => getVisualWidth(opt.label)));
            
            // Calculate available width per option in horizontal layout
            const structureWidth = prefixAndSuffix + 
                (this.options.length * symbolSpace) + 
                ((this.options.length - 1) * separatorSpace);
            const availableForLabels = maxWidth - structureWidth - 1; // -1 for safety
            const availablePerOption = Math.floor(availableForLabels / this.options.length);
            
            // Check if longest option would be truncated more than 10%
            const truncationNeeded = longestOptionLength - availablePerOption;
            const truncationPercentage = truncationNeeded > 0 ? (truncationNeeded / longestOptionLength) * 100 : 0;
            
            // Force vertical if truncation > 10% OR doesn't fit at all
            if (truncationPercentage > 10 || availablePerOption < 3) {
                effectiveLayout = 'vertical';
            }
        } else if (this.autoSwitchLayout && this.layout === 'vertical' && maxHeight) {
            // Check if vertical layout fits in available height
            const requiredLines = 2 + this.options.length; // header + prompt + options
            
            // Only switch to horizontal if it would use less lines AND not truncate badly
            if (requiredLines > maxHeight && maxHeight >= 3) {
                // Re-check if horizontal would work without bad truncation
                const longestOptionLength = Math.max(...this.options.map(opt => getVisualWidth(opt.label)));
                const structureWidth = 8 + (this.options.length * 2) + ((this.options.length - 1) * 3);
                const availableForLabels = maxWidth - structureWidth - 1;
                const availablePerOption = Math.floor(availableForLabels / this.options.length);
                const truncationPercentage = longestOptionLength > availablePerOption ? 
                    ((longestOptionLength - availablePerOption) / longestOptionLength) * 100 : 0;
                
                if (truncationPercentage <= 10 && availablePerOption >= 3) {
                    effectiveLayout = 'horizontal';
                }
            }
        }
        
        // Return lines based on effective layout
        if (effectiveLayout === 'vertical') {
            // Check if showing detailed view
            if (this.showDetails && this.detailColumns && this.detailColumns.length > 0) {
                // Check if any option has details
                const hasDetails = this.options.some(opt => opt.details && Object.keys(opt.details).length > 0);
                if (hasDetails) {
                    return 2 + this.options.length; // Header + column headers + each option
                }
            }
            return 2 + this.options.length; // Header + "Select one:" line + each option
        } else {
            return 3; // Header + "Select one:" line + horizontal options line
        }
    }
}