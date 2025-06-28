import React, { ReactElement } from 'react';
import { Box, Text, Key } from 'ink';
import { IListItem } from './IListItem.js';
import { TextInputBody } from './TextInputBody.js';
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
        validators?: Array<(value: string) => { isValid: boolean; error?: string }>
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
        this._editValue = this.value;
        this._cursorPosition = this._editValue.length;
    }
    
    onExit(): void {
        // Exit edit mode
        this._isControllingInput = false;
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
            // Move cursor left
            this._cursorPosition = Math.max(0, this._cursorPosition - 1);
            return true;
        } else if (key.rightArrow) {
            // Move cursor right
            this._cursorPosition = Math.min(this._editValue.length, this._cursorPosition + 1);
            return true;
        } else if (key.backspace || key.delete) {
            // Delete character before cursor
            if (this._cursorPosition > 0) {
                this._editValue = this._editValue.slice(0, this._cursorPosition - 1) + this._editValue.slice(this._cursorPosition);
                this._cursorPosition--;
                // Validate on change
                this.validate(this._editValue);
            }
            return true;
        } else if (input && !key.ctrl && !key.meta) {
            // Insert character at cursor position
            this._editValue = this._editValue.slice(0, this._cursorPosition) + input + this._editValue.slice(this._cursorPosition);
            this._cursorPosition++;
            // Validate on change
            this.validate(this._editValue);
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
            
            // Header - use ■ when expanded
            elements.push(
                <Text key="header">
                    <Text color={undefined}>■ </Text>
                    <Text color={this.isActive ? theme.colors.accent : undefined}>{this.label}:</Text>
                </Text>
            );
            
            // Edit body - TextInputBody returns an array of elements
            const bodyElements = TextInputBody({
                value: this._editValue,
                cursorPosition: this._cursorPosition,
                cursorVisible: this._cursorVisible,
                width: maxWidth,
                maxInputWidth: 40, // Reasonable max width for input fields
                headerColor: this.isActive ? theme.colors.accent : undefined,
                validationError: this._validationError
            });
            
            return [...elements, ...bodyElements];
        } else {
            // Collapsed view
            const { label, value, truncated } = this.formatHeaderParts(maxWidth);
            
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
                const truncatedValue = value.slice(0, Math.max(0, remainingSpace));
                
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
    
    private formatHeaderParts(maxWidth: number): { label: string; value: string; truncated: boolean } {
        // The render() method will prepend "{icon} " (2 chars)
        // So we need to account for that in our width calculation
        const iconWidth = 2; // icon + space
        const availableWidth = maxWidth - iconWidth;
        
        // Check if everything fits without truncation
        // Need to leave 1 char buffer to prevent wrapping when text exactly matches width
        const fullTextLength = this.label.length + 2 + this.value.length + 2; // "Label: [value]"
        if (fullTextLength < availableWidth) {
            return { label: this.label, value: this.value, truncated: false };
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
            if (this.value.length > spaceForValue) {
                // Truncate the value to fit
                return { 
                    label: this.label, 
                    value: this.value.slice(0, spaceForValue),
                    truncated: true 
                };
            } else {
                // Value fits without truncation
                return { label: this.label, value: this.value, truncated: false };
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