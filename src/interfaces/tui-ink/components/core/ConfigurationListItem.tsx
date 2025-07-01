import React, { ReactElement } from 'react';
import { Box, Text, Key } from 'ink';
import { ValidatedListItem } from './ValidatedListItem.js';
import { TextInputBody } from './TextInputBody.js';
import { NotificationArea } from './NotificationArea.js';
import { ConfirmationBody } from '../ConfirmationBody.js';
import { SimpleMessageScroll } from '../SimpleMessageScroll.js';
import { theme } from '../../utils/theme.js';
import { ValidationMessage, ValidationState, createValidationMessage, getDefaultIcon } from '../../validation/ValidationState.js';
import { formatValidationDisplay, formatCollapsedValidation, getValidationColor, getVisualWidth, getValidationIcon } from '../../utils/validationDisplay.js';
import { IDestructiveConfig } from '../../models/configuration.js';

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
    
    // Confirmation state
    private _showingConfirmation: boolean = false;
    private _pendingValue: string = '';
    private _confirmationFocusIndex: number = 0; // 0 for cancel, 1 for confirm - default to cancel
    private _originalValue: string;
    private _hadInitialValidationError: boolean = false;
    private _confirmationScrollOffset: number = 0;
    private _confirmationCursorLine: number = 0; // Current cursor position in content (-1 for button line)
    private _confirmationTotalLines: number = 0; // Total content lines in confirmation dialog
    
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
        private placeholder?: string,
        private destructive?: IDestructiveConfig
    ) {
        super(); // Call parent constructor
        this._editValue = editValue ?? this.value;
        this._cursorPosition = cursorPosition ?? this._editValue.length;
        this._cursorVisible = cursorVisible ?? true;
        this.onValueChange = onValueChange;
        this.validators = validators ?? [];
        
        // Store original value for confirmation checks
        this._originalValue = this.value;
        
        // Validate initial value and check for errors
        if (this.validators.length > 0) {
            this.validateValue();
            // Check if initial value has validation error (not warning)
            const validationResult = this.performValidation();
            if (validationResult && validationResult.state === ValidationState.Error) {
                this._hadInitialValidationError = true;
            }
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
        // Clear confirmation state
        this._showingConfirmation = false;
        this._pendingValue = '';
        this._confirmationFocusIndex = 0;
        this._confirmationScrollOffset = 0;
        this._confirmationCursorLine = 0;
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
        
        
        // Check for tab key
        if (key.tab) {
            // In confirmation mode, tab cycles through buttons
            if (this._showingConfirmation) {
                this._confirmationFocusIndex = this._confirmationFocusIndex === 0 ? 1 : 0;
                return true;
            }
            
            // In password mode, tab toggles visibility
            if (this.isPassword) {
                this._showPassword = !this._showPassword;
                return true;
            }
        }
        
        if (key.escape) {
            // Handle confirmation mode
            if (this._showingConfirmation) {
                // Cancel confirmation and exit completely
                this._showingConfirmation = false;
                this._pendingValue = '';
                this._confirmationFocusIndex = 0;
                this._confirmationScrollOffset = 0;
                this._confirmationCursorLine = 0;
                // Revert to original value
                this._editValue = this.value;
                this._cursorPosition = 0;
                this._validationError = null;
                this._validationMessage = null;
                this.onExit();
                return true;
            }
            
            // Cancel editing - revert to original value
            this._editValue = this.value;
            this._cursorPosition = 0;
            this._validationError = null;
            this._validationMessage = null; // Clear parent's validation message
            this.onExit();
            return true;
        } else if (key.return) {
            // Handle confirmation mode
            if (this._showingConfirmation) {
                if (this._confirmationFocusIndex === 1) {
                    // Confirm button selected - apply the change
                    this.value = this._pendingValue;
                    this.onValueChange?.(this._pendingValue);
                    this._showingConfirmation = false;
                    this._pendingValue = '';
                    this._confirmationFocusIndex = 0;
                    this._confirmationCursorLine = 0;
                    this.onExit();
                } else {
                    // Cancel button selected - discard changes and exit
                    this._showingConfirmation = false;
                    this._pendingValue = '';
                    this._confirmationFocusIndex = 0;
                    this._confirmationCursorLine = 0;
                    // Revert to original value and exit
                    this._editValue = this.value;
                    this._cursorPosition = 0;
                    this._validationError = null;
                    this._validationMessage = null;
                    this.onExit();
                }
                return true;
            }
            
            // Validate before saving
            this.validate(this._editValue);
            if (this._validationError) {
                // Don't save if validation fails
                return true;
            }
            
            // Check if confirmation is needed
            if (this.shouldShowConfirmation(this._editValue)) {
                this._pendingValue = this._editValue;
                this._showingConfirmation = true;
                this._confirmationFocusIndex = 0; // Default to cancel
                this._confirmationScrollOffset = 0; // Reset scroll
                this._confirmationCursorLine = 0; // Start at first line (will be adjusted to first non-empty)
                return true;
            }
            
            // Save changes without confirmation
            this.value = this._editValue;
            this.onValueChange?.(this._editValue);
            this.onExit();
            return true;
        } else if (key.leftArrow) {
            // Handle confirmation mode navigation
            if (this._showingConfirmation) {
                // Only allow left/right on button line
                if (this._confirmationCursorLine === -1) {
                    this._confirmationFocusIndex = 0; // Move to cancel
                }
                return true;
            }
            
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
            // Handle confirmation mode navigation
            if (this._showingConfirmation) {
                // Only allow left/right on button line
                if (this._confirmationCursorLine === -1) {
                    this._confirmationFocusIndex = 1; // Move to confirm
                }
                return true;
            }
            
            // Move cursor right
            this._cursorPosition = Math.min(this._editValue.length, this._cursorPosition + 1);
            return true;
        } else if (key.upArrow || key.downArrow) {
            // Handle confirmation mode navigation with cursor
            if (this._showingConfirmation && this.destructive) {
                const totalLines = this._confirmationTotalLines;
                const maxLines = 8; // Available content lines (maxLines - header - button)
                
                // Debug navigation
                if (process.env.TUI_DEBUG === 'true') {
                    console.error(`\n=== Navigation Debug ===`);
                    console.error(`Key: ${key.upArrow ? 'UP' : 'DOWN'}`);
                    console.error(`Before: cursor=${this._confirmationCursorLine}, scroll=${this._confirmationScrollOffset}`);
                    console.error(`TotalLines=${totalLines}, maxLines=${maxLines}`);
                }
                
                if (key.upArrow) {
                    // Move cursor up
                    if (this._confirmationCursorLine > 0) {
                        this._confirmationCursorLine--;
                        // Scroll up if cursor moves above visible area
                        if (this._confirmationCursorLine < this._confirmationScrollOffset) {
                            this._confirmationScrollOffset = this._confirmationCursorLine;
                        }
                    }
                } else {
                    // Move cursor down
                    if (this._confirmationCursorLine < totalLines - 1) {
                        this._confirmationCursorLine++;
                        // Scroll down if cursor moves below visible area
                        const visibleLines = 5; // Fixed 5 content lines
                        if (this._confirmationCursorLine >= this._confirmationScrollOffset + visibleLines) {
                            this._confirmationScrollOffset = this._confirmationCursorLine - visibleLines + 1;
                        }
                    }
                }
                
                if (process.env.TUI_DEBUG === 'true') {
                    console.error(`After: cursor=${this._confirmationCursorLine}, scroll=${this._confirmationScrollOffset}`);
                    console.error(`=== End Navigation ===\n`);
                }
                return true;
            }
            
            // Exit without saving on up/down arrows
            this._editValue = this.value;
            this._cursorPosition = 0;
            this._validationError = null;
            this._validationMessage = null; // Clear parent's validation message
            this.onExit();
            return true;
        } else if (key.backspace || key.delete) {
            // Block input during confirmation
            if (this._showingConfirmation) return true;
            
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
            // Block input during confirmation
            if (this._showingConfirmation) return true;
            
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
    
    /**
     * Check if confirmation is needed for the new value
     */
    private shouldShowConfirmation(newValue: string): boolean {
        // No destructive config = no confirmation
        if (!this.destructive) return false;
        
        // Value hasn't changed = no confirmation
        if (newValue === this.value) return false;
        
        // Check confirmSettingInitialValue flag (default false)
        const confirmInitial = this.destructive.confirmSettingInitialValue ?? false;
        
        if (!confirmInitial) {
            // Skip confirmation if no original value exists
            if (!this._originalValue || this._originalValue === '') {
                return false;
            }
            
            // Skip confirmation if original value had validation error
            if (this._hadInitialValidationError) {
                return false;
            }
        }
        
        // Show confirmation for all other cases
        return true;
    }
    
    render(maxWidth: number, maxLines?: number): ReactElement | ReactElement[] {
        if (this._isControllingInput) {
            // Expanded edit mode
            const elements: ReactElement[] = [];
            
            // Header with inline notification area
            const bulletColor = this.isActive ? theme.colors.accent : this.getBulletColor(theme.colors.textMuted);
            
            // Build header text with truncation support
            const prefix = '■ ';
            const suffix = ': ';
            const baseLength = getVisualWidth(prefix) + getVisualWidth(suffix);
            
            // If we have validation, reserve space for at least the icon
            const validationReserve = this._validationMessage ? 2 : 0; // space + icon
            
            // Calculate available space for label
            let labelToUse = this.label;
            const fullHeaderLength = baseLength + getVisualWidth(this.label);
            
            if (fullHeaderLength + validationReserve > maxWidth && maxWidth > baseLength + validationReserve + 1) {
                // Need to truncate label to fit validation icon
                const availableForLabel = maxWidth - baseLength - validationReserve - 1; // -1 for ellipsis
                if (availableForLabel > 0) {
                    labelToUse = this.label.substring(0, availableForLabel) + '…';
                } else {
                    labelToUse = '…'; // Extreme case
                }
            }
            
            const labelPart = `${labelToUse}:`;
            
            // Header with validation after the colon
            if (this._validationMessage) {
                const headerBase = `■ ${labelPart}`;
                const headerBaseLength = getVisualWidth(headerBase);
                const icon = this._validationMessage.icon || getValidationIcon(this._validationMessage.state);
                const validationColor = getValidationColor(this._validationMessage.state);
                
                // Calculate available space for validation
                const minValidation = ` ${icon}`; // minimum: space + icon
                const fullValidation = ` ${icon} ${this._validationMessage.message}`;
                
                // Always show validation icon when validation is present (we already reserved space for it)
                const availableForValidation = maxWidth - headerBaseLength;
                let validationText = '';
                
                if (getVisualWidth(fullValidation) <= availableForValidation) {
                    // Full validation fits
                    validationText = fullValidation;
                } else if (availableForValidation > getVisualWidth(minValidation) + 2) {
                    // Truncate message (need space for icon + space + at least 1 char)
                    const availableForMessage = availableForValidation - getVisualWidth(minValidation) - 1; // -1 for space after icon
                    const truncatedMessage = this._validationMessage.message.substring(0, availableForMessage - 1) + '…';
                    validationText = ` ${icon} ${truncatedMessage}`;
                } else {
                    // Just icon (always show it since we reserved space)
                    validationText = minValidation;
                }
                
                elements.push(
                    <Text key="header">
                        <Text color={bulletColor}>■ </Text>
                        <Text color={this.isActive ? theme.colors.accent : undefined}>{labelPart}</Text>
                        <Text color={validationColor}>{validationText}</Text>
                    </Text>
                );
            } else {
                // No validation, simple header
                if (this._showingConfirmation) {
                    // In confirmation mode, add padding but no scroll indicator
                    const headerText = `■ ${labelPart}`;
                    const headerLength = getVisualWidth(headerText);
                    const padding = ' '.repeat(Math.max(0, maxWidth - headerLength));
                    
                    elements.push(
                        <Text key="header">
                            <Text color={bulletColor}>■ </Text>
                            <Text color={this.isActive ? theme.colors.accent : undefined}>{labelPart}</Text>
                            {padding}
                        </Text>
                    );
                } else {
                    // Normal mode with space after colon
                    elements.push(
                        <Text key="header">
                            <Text color={bulletColor}>■ </Text>
                            <Text color={this.isActive ? theme.colors.accent : undefined}>{labelPart} </Text>
                        </Text>
                    );
                }
            }
            
            
            // Show confirmation body or edit body
            if (this._showingConfirmation && this.destructive) {
                // Test with simple message scroll
                // Maximum 5 content lines (excluding header and button)
                const maxContentLines = 5;
                
                // Build full message with title and bullet points
                let fullMessage = '';
                
                // Add title if present
                if (this.destructive.title) {
                    fullMessage = this.destructive.title + '\n';
                }
                
                // Add main message
                fullMessage += this.destructive.message;
                
                // Add bullet points
                if (this.destructive.consequences && this.destructive.consequences.length > 0) {
                    // Add newlines before bullet points to ensure they start on new lines
                    fullMessage += '\n' + this.destructive.consequences.map(c => `• ${c}`).join('\n');
                }
                
                // Add a really long number for testing truncation
                fullMessage += '\nEstimated vectors: 123456789012345678901234567890';
                
                const messageResult = SimpleMessageScroll({
                    message: fullMessage,
                    maxWidth: maxWidth - 4, // Account for prefixes
                    maxLines: maxContentLines,
                    scrollOffset: this._confirmationScrollOffset,
                    cursorLine: this._confirmationCursorLine,
                    hasTitle: !!this.destructive.title
                });
                
                // Store total lines for navigation
                this._confirmationTotalLines = messageResult.totalLines;
                
                // Add button line with proper truncation
                // Calculate available space for buttons
                const buttonPrefix = '└─  ';
                const buttonSeparator = '  ';
                const checkMark = '✓ ';
                const crossMark = '✗ ';
                
                // Calculate fixed width components
                const fixedWidth = buttonPrefix.length + checkMark.length + crossMark.length + buttonSeparator.length;
                const availableForLabels = Math.max(0, maxWidth - fixedWidth);
                const maxLabelWidth = Math.floor(availableForLabels / 2);
                
                // Button labels
                let cancelLabel = 'Keep Current';
                let confirmLabel = 'Change Model';
                
                // Truncate both labels equally if needed
                if (cancelLabel.length > maxLabelWidth) {
                    cancelLabel = cancelLabel.substring(0, maxLabelWidth - 1) + '…';
                }
                if (confirmLabel.length > maxLabelWidth) {
                    confirmLabel = confirmLabel.substring(0, maxLabelWidth - 1) + '…';
                }
                
                const buttonLine = (
                    <Text key="buttons">
                        {buttonPrefix}{checkMark}{cancelLabel}{buttonSeparator}{crossMark}{confirmLabel}
                    </Text>
                );
                
                return [...elements, ...messageResult.elements, buttonLine];
            } else {
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
            }
        } else {
            // Collapsed view
            const displayValue = this.isPassword ? '•'.repeat(this.value.length) : this.value;
            
            // Use the utility to format with validation
            // Use conservative width to prevent wrapping but preserve validation icons
            const conservativeWidth = maxWidth - 1; // Reduce by 1 to prevent wrapping but keep validation icons
            
            
            const formatted = formatCollapsedValidation(
                this.label,
                displayValue,
                this._validationMessage,
                conservativeWidth,
                this.icon,
                this.isActive
            );
            
            
            // If validation doesn't fit or doesn't exist, use the truncated values from formatCollapsedValidation
            if (!formatted.showValidation && this._validationMessage) {
                // We have validation but formatCollapsedValidation couldn't fit it
                // Force showing at least the validation icon
                const label = formatted.truncatedLabel || this.label;
                const value = formatted.displayValue;
                const validationIcon = this._validationMessage.icon || getValidationIcon(this._validationMessage.state);
                const validationColor = getValidationColor(this._validationMessage.state);
                
                // Reserve space for validation icon
                const iconSpace = 2; // " ✗"
                const availableForContent = maxWidth - iconSpace;
                
                // Re-truncate if needed to ensure validation icon fits
                let finalLabel = label;
                let finalValue = value;
                
                // Calculate the actual space needed for the complete line with validation
                const currentText = `${this.icon} ${label}: [${value}] ${validationIcon}`;
                
                if (getVisualWidth(currentText) > maxWidth) {
                    // We need to truncate to fit the validation icon
                    // Priority: Keep icon prefix, truncate label and value as needed
                    const iconPrefixWidth = getVisualWidth(`${this.icon} `);
                    const validationSuffixWidth = getVisualWidth(` ${validationIcon}`);
                    const bracketsWidth = getVisualWidth(`: []`);
                    const availableForLabelAndValue = maxWidth - iconPrefixWidth - bracketsWidth - validationSuffixWidth;
                    
                    if (availableForLabelAndValue >= 4) {
                        // We have some space, distribute between label and value
                        // Give label at least 3 chars, rest to value
                        const labelSpace = Math.min(3, Math.floor(availableForLabelAndValue / 2));
                        const valueSpace = availableForLabelAndValue - labelSpace;
                        
                        finalLabel = label.length > labelSpace ? label.substring(0, labelSpace - 1) + '…' : label;
                        finalValue = value.length > valueSpace ? value.substring(0, Math.max(1, valueSpace - 1)) + '…' : value;
                    } else {
                        // Very tight space, show minimal content
                        finalLabel = '…';
                        finalValue = '…';
                    }
                }
                
                return (
                    <Text>
                        <Text color={this.isActive ? theme.colors.accent : this.getBulletColor(theme.colors.textMuted)}>
                            {this.icon}
                        </Text>
                        <Text color={this.isActive ? theme.colors.accent : undefined}>
                            {' '}{finalLabel}: [
                        </Text>
                        <Text color={theme.colors.configValuesColor}>
                            {finalValue}
                        </Text>
                        <Text color={this.isActive ? theme.colors.accent : undefined}>
                            ]
                        </Text>
                        <Text color={validationColor}>
                            {' '}{validationIcon}
                        </Text>
                    </Text>
                );
            }
            
            // If validation doesn't fit or doesn't exist, use the truncated values from formatCollapsedValidation
            if (!formatted.showValidation) {
                // No validation message at all
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
        if (!this._isControllingInput) return 1;
        
        // In confirmation mode, use fixed height
        if (this._showingConfirmation && this.destructive) {
            // 1 header + 5 content lines + 1 button = 7 total
            return 7;
        }
        
        // Normal edit mode
        return 4;
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