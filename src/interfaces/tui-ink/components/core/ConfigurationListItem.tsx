import React, { ReactElement } from 'react';
import { Box, Text, Key } from 'ink';
import { ValidatedListItem } from './ValidatedListItem.js';
import { TextInputBody } from './TextInputBody.js';
import { NotificationArea } from './NotificationArea.js';
import { theme } from '../../utils/theme.js';
import { ValidationMessage, ValidationState, createValidationMessage, getDefaultIcon } from '../../validation/ValidationState.js';
import { formatValidationDisplay, formatCollapsedValidation, getValidationColor, getVisualWidth, getValidationIcon } from '../../utils/validationDisplay.js';

export class ConfigurationListItem extends ValidatedListItem {
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
        private isPassword: boolean = false,
        private placeholder?: string
    ) {
        super(); // Call parent constructor
        this._editValue = editValue ?? this.value;
        this._cursorPosition = cursorPosition ?? this._editValue.length;
        this._cursorVisible = cursorVisible ?? true;
        this.onValueChange = onValueChange;
        this.validators = validators ?? [];
        
        // Validate initial value
        if (this.validators.length > 0) {
            this.validateValue();
        }
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
        // Re-validate the stored value to ensure correct validation state
        this.validateValue();
    }
    
    /**
     * Implement abstract performValidation from ValidatedListItem
     */
    protected performValidation(): ValidationMessage | null {
        // For edit mode, validate the edit value
        const valueToValidate = this._isControllingInput ? this._editValue : this.value;
        
        // Collect all validation results
        const results: Array<{isValid: boolean; error?: string; warning?: string; info?: string}> = [];
        for (const validator of this.validators) {
            const result = validator(valueToValidate);
            results.push(result);
        }
        
        // Priority: Error > Warning > Info > Valid
        // Return the first error
        for (const result of results) {
            if (!result.isValid && result.error) {
                return createValidationMessage(
                    ValidationState.Error,
                    result.error
                );
            }
        }
        
        // Return the first warning
        for (const result of results) {
            if (result.warning) {
                return createValidationMessage(
                    ValidationState.Warning,
                    result.warning
                );
            }
        }
        
        // Return the first info (success message)
        for (const result of results) {
            if (result.info) {
                return createValidationMessage(
                    ValidationState.Valid,
                    result.info
                );
            }
        }
        
        // No validation messages
        return null;
    }
    
    private validate(value: string): void {
        // Update to use the new validation system
        this.validateValue();
        // Keep backward compatibility with _validationError
        this._validationError = this._validationMessage?.state === ValidationState.Error 
            ? this._validationMessage.message 
            : null;
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
            this._validationMessage = null; // Clear parent's validation message
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
                this._validationMessage = null; // Clear parent's validation message
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
        } else if (key.upArrow || key.downArrow) {
            // Exit without saving on up/down arrows
            this._editValue = this.value;
            this._cursorPosition = 0;
            this._validationError = null;
            this._validationMessage = null; // Clear parent's validation message
            this.onExit();
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
            const bulletColor = this.isActive ? theme.colors.accent : this.getBulletColor(theme.colors.textMuted);
            
            // Build header text
            const labelPart = `${this.label}: `;
            
            if (this._validationMessage) {
                // Use the validation display utility for consistent formatting
                const icon = this._validationMessage.icon || getDefaultIcon(this._validationMessage.state);
                const validationText = ` ${icon} ${this._validationMessage.message}`;
                const totalLength = 2 + labelPart.length + validationText.length; // 2 for "■ "
                const validationColor = getValidationColor(this._validationMessage.state);
                
                if (totalLength <= maxWidth) {
                    // Everything fits
                    elements.push(
                        <Text key="header">
                            <Text color={bulletColor}>■ </Text>
                            <Text color={this.isActive ? theme.colors.accent : undefined}>{labelPart}</Text>
                            <Text color={validationColor}>{validationText}</Text>
                        </Text>
                    );
                } else {
                    // Need to truncate - use the utility
                    const availableForValidation = maxWidth - 2 - labelPart.length;
                    const truncatedDisplay = formatValidationDisplay(this._validationMessage, availableForValidation);
                    
                    if (truncatedDisplay) {
                        elements.push(
                            <Text key="header">
                                <Text color={bulletColor}>■ </Text>
                                <Text color={this.isActive ? theme.colors.accent : undefined}>{labelPart}</Text>
                                <Text color={validationColor}> {truncatedDisplay}</Text>
                            </Text>
                        );
                    } else {
                        // Not enough space for validation, just show label
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
                    const fullHintsLength = 20; // " [enter] ✓ • [esc] ✗"
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
                            <Text color={this.isActive ? theme.colors.accent : theme.colors.textMuted}>■ </Text>
                            <Text color={this.isActive ? theme.colors.accent : undefined}>{labelPart}</Text>
                            {showFullHints && (
                                <>
                                    <Text color={theme.colors.textMuted}> [enter] </Text>
                                    <Text color={theme.colors.successGreen}>✓</Text>
                                    <Text color={theme.colors.textMuted}> · [esc] </Text>
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
                showPassword: this._showPassword,
                placeholder: this.placeholder
            });
            
            return [...elements, ...bodyElements];
        } else {
            // Collapsed view
            const displayValue = this.isPassword ? '•'.repeat(this.value.length) : this.value;
            
            // Use the utility to format with validation
            // Use conservative width to prevent wrapping like FilePickerListItem  
            const conservativeWidth = maxWidth - 2;
            
            
            const formatted = formatCollapsedValidation(
                this.label,
                displayValue,
                this._validationMessage,
                conservativeWidth,
                this.icon,
                this.isActive
            );
            
            
            // If validation doesn't fit or doesn't exist, use the truncated values from formatCollapsedValidation
            if (!formatted.showValidation) {
                // Use the truncated values from formatCollapsedValidation instead of formatHeaderParts
                const label = formatted.truncatedLabel || this.label;
                const value = formatted.displayValue;
                const truncated = formatted.displayValue !== displayValue;
                
                // Build the full text without nested components to avoid wrapping
                const fullText = truncated 
                    ? `${this.icon} ${label}: [${value}…]`
                    : `${this.icon} ${label}: [${value}]`;
                
                // Debug logging for text length analysis
                if (process.env.TUI_DEBUG === 'true') {
                    console.error(`[ConfigurationListItem] fullText: "${fullText}"`);
                    console.error(`[ConfigurationListItem] fullText length: ${getVisualWidth(fullText)}, maxWidth: ${maxWidth}, truncated: ${truncated}`);
                }
                
                // CRITICAL: Ensure text never equals or exceeds maxWidth to prevent wrapping
                if (getVisualWidth(fullText) >= maxWidth) {
                    // Force truncation to prevent wrapping
                    const safeLength = maxWidth - 4; // Leave room for "…]"
                    const labelAndIconLength = getVisualWidth(this.icon) + 1 + getVisualWidth(label) + 2; // "icon label: "
                    const remainingSpace = safeLength - labelAndIconLength - 2; // -2 for "[]"
                    const truncatedValue = displayValue.slice(0, Math.max(0, remainingSpace));
                    
                    return (
                        <Text>
                            <Text color={this.isActive ? theme.colors.accent : this.getBulletColor(theme.colors.textMuted)}>
                                {this.icon}
                            </Text>
                            <Text color={this.isActive ? theme.colors.accent : undefined}>
                                {' '}{label}: [
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
                        <Text color={this.isActive ? theme.colors.accent : this.getBulletColor(theme.colors.textMuted)}>
                            {this.icon}
                        </Text>
                        <Text color={this.isActive ? theme.colors.accent : undefined}>
                            {' '}{label}: [
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
            
            // Render with validation
            const validationColor = this._validationMessage ? getValidationColor(this._validationMessage.state) : undefined;
            
            // Safety check: ensure total line doesn't exceed maxWidth
            const actualLabel = formatted.truncatedLabel || this.label;
            const totalLength = getVisualWidth(
                `${this.icon} ${actualLabel}: [${formatted.displayValue}]${formatted.validationDisplay}`
            );
            
            
            if (totalLength > maxWidth) {
                // If still too long, truncate validation display further
                const baseLength = getVisualWidth(`${this.icon} ${actualLabel}: [${formatted.displayValue}]`);
                const availableForValidation = maxWidth - baseLength;
                
                if (availableForValidation >= 2) {
                    // Just show the validation icon
                    formatted.validationDisplay = ` ${this._validationMessage?.icon || getValidationIcon(this._validationMessage?.state || ValidationState.Error)}`;
                } else {
                    // No room for validation at all
                    formatted.validationDisplay = '';
                }
            }
            
            
            
            return (
                <Text>
                    <Text color={this.isActive ? theme.colors.accent : this.getBulletColor()}>
                        {this.icon}
                    </Text>
                    <Text color={this.isActive ? theme.colors.accent : undefined}>
                        {' '}{formatted.truncatedLabel || this.label}: [
                    </Text>
                    <Text color={theme.colors.configValuesColor}>
                        {formatted.displayValue}
                    </Text>
                    <Text color={this.isActive ? theme.colors.accent : undefined}>
                        ]
                    </Text>
                    <Text color={validationColor}>
                        {formatted.validationDisplay}
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
        const fullTextLength = getVisualWidth(this.label) + 2 + getVisualWidth(valueToDisplay) + 2; // "Label: [value]"
        if (fullTextLength < availableWidth) {
            return { label: this.label, value: valueToDisplay, truncated: false };
        }
        
        // Minimum viable display is "[…]" = 3 chars
        if (availableWidth < 3) {
            return { label: '', value: '…', truncated: false };
        }
        
        // Calculate components
        const separatorAndBrackets = ": []"; // 4 chars
        const labelAndSeparatorLength = getVisualWidth(this.label) + 2; // "Label: "
        const bracketsLength = 2; // "[]"
        const ellipsisLength = 1; // "…"
        
        // First priority: try to fit label + brackets with truncated value
        // We need space for: "Label: [" + value + "…]"
        const spaceNeededForStructure = labelAndSeparatorLength + bracketsLength + ellipsisLength;
        const spaceForValue = availableWidth - spaceNeededForStructure;
        
        if (spaceForValue > 0) {
            // We can fit the label and brackets with some value
            if (getVisualWidth(valueToDisplay) > spaceForValue) {
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
            const truncatedLabel = getVisualWidth(this.label) > minLabelSpace 
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