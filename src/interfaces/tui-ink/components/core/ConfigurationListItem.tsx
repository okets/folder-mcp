import React, { ReactElement } from 'react';
import { Box, Text, Key } from 'ink';
import { IListItem } from './IListItem.js';
import { TextInputBody } from './TextInputBody.js';
import { NotificationArea } from './NotificationArea.js';
import { theme } from '../../utils/theme.js';

export class ConfigurationListItem implements IListItem {
    readonly selfConstrained = true as const;
    private _isControllingInput: boolean = false;
    private _editValue: string = '';
    private _cursorPosition: number = 0;
    private _cursorVisible: boolean = true;
    private onValueChange?: (newValue: string) => void;
    private _validationError: string | null = null;
    private validators: Array<(value: string) => { isValid: boolean; error?: string }> = [];
    private _showPassword: boolean = false;
    
    constructor(
        public icon: string,
        private label: string,
        public value: string,
        public isActive: boolean,
        private isExpanded: boolean,
        editValue?: string,
        cursorPosition?: number,
        cursorVisible?: boolean,
        onValueChange?: (newValue: string) => void,
        validators?: Array<(value: string) => { isValid: boolean; error?: string }>,
        private isPassword: boolean = false
    ) {
        this._editValue = editValue ?? this.value;
        this._cursorPosition = cursorPosition ?? this._editValue.length;
        this._cursorVisible = cursorVisible ?? true;
        this.onValueChange = onValueChange;
        this.validators = validators ?? [];
    }
    
    get isControllingInput(): boolean {
        return this._isControllingInput;
    }
    
    onEnter(): void {
        // Enter edit mode
        this._isControllingInput = true;
        
        // For password fields, start with blank value for security
        // This prevents accidental display of existing passwords
        if (this.isPassword) {
            this._editValue = '';
            this._cursorPosition = 0;
        } else {
            this._editValue = this.value;
            this._cursorPosition = this._editValue.length;
        }
    }
    
    onExit(): void {
        // Exit edit mode
        this._isControllingInput = false;
        this._showPassword = false; // Reset password visibility
    }
    
    private validate(value: string): void {
        this._validationError = null;
        for (const validator of this.validators) {
            const result = validator(value);
            if (!result.isValid) {
                this._validationError = result.error || 'Invalid value';
                break;
            }
        }
    }

    handleInput(input: string, key: Key): boolean {
        if (!this._isControllingInput) return false;
        
        
        // Check for password visibility toggle
        if (this.isPassword && key.tab) {
            // Tab key to toggle password visibility
            this._showPassword = !this._showPassword;
            return true;
        }
        
        if (key.escape) {
            // Cancel editing
            this._editValue = this.value;
            this._cursorPosition = 0;
            this._validationError = null;
            this.onExit();
            return true;
        } else if (key.return) {
            // Validate before saving
            this.validate(this._editValue);
            if (this._validationError) {
                // Don't save if validation fails
                return true;
            }
            // Save changes
            this.value = this._editValue;
            this.onValueChange?.(this._editValue);
            this.onExit();
            return true;
        } else if (key.leftArrow) {
            // If cursor is at position 0, act as back/cancel
            if (this._cursorPosition === 0) {
                // Cancel editing
                this._editValue = this.value;
                this._cursorPosition = 0;
                this._validationError = null;
                this.onExit();
                return true;
            } else {
                // Otherwise, move cursor left
                this._cursorPosition = this._cursorPosition - 1;
                return true;
            }
        } else if (key.rightArrow) {
            // Move cursor right
            this._cursorPosition = Math.min(this._editValue.length, this._cursorPosition + 1);
            return true;
        } else if (key.backspace || key.delete) {
            // Delete character before cursor
            if (this._cursorPosition > 0) {
                this._editValue = this._editValue.slice(0, this._cursorPosition - 1) + this._editValue.slice(this._cursorPosition);
                this._cursorPosition--;
                
                // For password fields, clear error on keystroke but don't validate
                // For other fields, validate on change
                if (this.isPassword && this._validationError) {
                    this._validationError = null;
                } else if (!this.isPassword) {
                    this.validate(this._editValue);
                }
            }
            return true;
        } else if (input && !key.ctrl && !key.meta) {
            // Insert character at cursor position
            this._editValue = this._editValue.slice(0, this._cursorPosition) + input + this._editValue.slice(this._cursorPosition);
            this._cursorPosition++;
            
            // For password fields, clear error on keystroke but don't validate
            // For other fields, validate on change
            if (this.isPassword && this._validationError) {
                this._validationError = null;
            } else if (!this.isPassword) {
                this.validate(this._editValue);
            }
            return true;
        }
        return true; // Consume all input when in edit mode
    }
    
    onSelect(): void {
        // Could add visual feedback when selected
    }
    
    onDeselect(): void {
        // Could remove visual feedback when deselected
    }
    
    render(maxWidth: number, maxLines?: number): ReactElement | ReactElement[] {
        if (this._isControllingInput) {
            // Expanded edit mode
            const elements: ReactElement[] = [];
            
            // Header with inline notification area
            const bulletColor = this._validationError ? 'red' : undefined;
            
            // Build header text
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
                {
                    const baseLength = 2 + labelPart.length; // "■ " + label
                    const availableForHints = maxWidth - baseLength;
                    const fullHintsLength = 18; // " [enter] ✓ [esc] ✗"
                    const partialHintsLength = 11; // " [enter] ✓"
                    
                    let showFullHints = false;
                    let showPartialHints = false;
                    
                    if (availableForHints >= fullHintsLength) {
                        showFullHints = true;
                    } else if (availableForHints >= partialHintsLength) {
                        showPartialHints = true;
                    }
                    
                    elements.push(
                        <Text key="header">
                            <Text color={undefined}>■ </Text>
                            <Text color={this.isActive ? theme.colors.accent : undefined}>{labelPart}</Text>
                            {showFullHints && (
                                <>
                                    <Text color={theme.colors.textMuted}> [enter] </Text>
                                    <Text color={theme.colors.successGreen}>✓</Text>
                                    <Text color={theme.colors.textMuted}> [esc] </Text>
                                    <Text color={theme.colors.warningOrange}>✗</Text>
                                </>
                            )}
                            {showPartialHints && !showFullHints && (
                                <>
                                    <Text color={theme.colors.textMuted}> [enter] </Text>
                                    <Text color={theme.colors.successGreen}>✓</Text>
                                </>
                            )}
                        </Text>
                    );
                }
            }
            
            // Edit body - TextInputBody returns an array of elements
            const bodyElements = TextInputBody({
                value: this._editValue,
                cursorPosition: this._cursorPosition,
                cursorVisible: this._cursorVisible,
                width: maxWidth,
                maxInputWidth: 40, // Reasonable max width for input fields
                headerColor: this.isActive ? theme.colors.accent : undefined,
                isPassword: this.isPassword,
                showPassword: this._showPassword
            });
            
            return [...elements, ...bodyElements];
        } else {
            // Collapsed view
            const displayValue = this.isPassword ? '•'.repeat(this.value.length) : this.value;
            const { label, value, truncated } = this.formatHeaderParts(maxWidth, displayValue);
            
            // Build the full text without nested components to avoid wrapping
            const fullText = truncated 
                ? `${this.icon} ${label}: [${value}…]`
                : `${this.icon} ${label}: [${value}]`;
            
            // CRITICAL: Ensure text never equals or exceeds maxWidth to prevent wrapping
            if (fullText.length >= maxWidth) {
                // Force truncation to prevent wrapping
                const safeLength = maxWidth - 4; // Leave room for "…]"
                const labelAndIconLength = this.icon.length + 1 + label.length + 2; // "icon label: "
                const remainingSpace = safeLength - labelAndIconLength - 2; // -2 for "[]"
                const truncatedValue = displayValue.slice(0, Math.max(0, remainingSpace));
                
                return (
                    <Text>
                        <Text color={this.isActive ? theme.colors.accent : undefined}>
                            {this.icon} {label}: [
                        </Text>
                        <Text color={theme.colors.configValuesColor}>
                            {truncatedValue}…
                        </Text>
                        <Text color={this.isActive ? theme.colors.accent : undefined}>
                            ]
                        </Text>
                    </Text>
                );
            }
                
            // Render with colored value (brackets stay in default color)
            return (
                <Text>
                    <Text color={this.isActive ? theme.colors.accent : undefined}>
                        {this.icon} {label}: [
                    </Text>
                    <Text color={theme.colors.configValuesColor}>
                        {value}{truncated ? '…' : ''}
                    </Text>
                    <Text color={this.isActive ? theme.colors.accent : undefined}>
                        ]
                    </Text>
                </Text>
            );
        }
    }
    
    getRequiredLines(maxWidth: number): number {
        return this._isControllingInput ? 4 : 1;
    }
    
    private formatHeaderParts(maxWidth: number, displayValue?: string): { label: string; value: string; truncated: boolean } {
        // The render() method will prepend "{icon} " (2 chars)
        // So we need to account for that in our width calculation
        const iconWidth = 2; // icon + space
        const availableWidth = maxWidth - iconWidth;
        
        const valueToDisplay = displayValue ?? this.value;
        
        // Check if everything fits without truncation
        // Need to leave 1 char buffer to prevent wrapping when text exactly matches width
        const fullTextLength = this.label.length + 2 + valueToDisplay.length + 2; // "Label: [value]"
        if (fullTextLength < availableWidth) {
            return { label: this.label, value: valueToDisplay, truncated: false };
        }
        
        // Minimum viable display is "[…]" = 3 chars
        if (availableWidth < 3) {
            return { label: '', value: '…', truncated: false };
        }
        
        // Calculate components
        const separatorAndBrackets = ": []"; // 4 chars
        const labelAndSeparatorLength = this.label.length + 2; // "Label: "
        const bracketsLength = 2; // "[]"
        const ellipsisLength = 1; // "…"
        
        // First priority: try to fit label + brackets with truncated value
        // We need space for: "Label: [" + value + "…]"
        const spaceNeededForStructure = labelAndSeparatorLength + bracketsLength + ellipsisLength;
        const spaceForValue = availableWidth - spaceNeededForStructure;
        
        if (spaceForValue > 0) {
            // We can fit the label and brackets with some value
            if (valueToDisplay.length > spaceForValue) {
                // Truncate the value to fit
                return { 
                    label: this.label, 
                    value: valueToDisplay.slice(0, spaceForValue),
                    truncated: true 
                };
            } else {
                // Value fits without truncation
                return { label: this.label, value: valueToDisplay, truncated: false };
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
    
    private stripAnsi(text: string): string {
        return text.replace(/\x1b\[[0-9;]*m/g, '');
    }
    
    private truncate(text: string, maxWidth: number): string {
        if (text.length <= maxWidth) {
            return text;
        }
        if (maxWidth <= 1) {
            return '…'.slice(0, maxWidth);
        }
        return text.slice(0, maxWidth - 1) + '…';
    }
}