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
    
    constructor(
        public icon: string,
        private label: string,
        public value: string,
        public isActive: boolean,
        private isExpanded: boolean,
        editValue?: string,
        cursorPosition?: number,
        cursorVisible?: boolean,
        onValueChange?: (newValue: string) => void
    ) {
        this._editValue = editValue ?? this.value;
        this._cursorPosition = cursorPosition ?? this._editValue.length;
        this._cursorVisible = cursorVisible ?? true;
        this.onValueChange = onValueChange;
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
    
    handleInput(input: string, key: Key): boolean {
        if (!this._isControllingInput) return false;
        
        if (key.escape) {
            // Cancel editing
            this._editValue = this.value;
            this._cursorPosition = 0;
            this.onExit();
            return true;
        } else if (key.return) {
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
            }
            return true;
        } else if (input && !key.ctrl && !key.meta) {
            // Insert character at cursor position
            this._editValue = this._editValue.slice(0, this._cursorPosition) + input + this._editValue.slice(this._cursorPosition);
            this._cursorPosition++;
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
    
    render(maxWidth: number): ReactElement | ReactElement[] {
        if (this._isControllingInput) {
            // Expanded edit mode
            const elements: ReactElement[] = [];
            
            // Header
            elements.push(
                <Text key="header" color={this.isActive ? theme.colors.accent : undefined}>
                    {'▼'} {this.label}:
                </Text>
            );
            
            // Edit body - TextInputBody returns an array of elements
            const bodyElements = TextInputBody({
                value: this._editValue,
                cursorPosition: this._cursorPosition,
                cursorVisible: this._cursorVisible,
                width: maxWidth,
                maxInputWidth: 40 // Reasonable max width for input fields
            });
            
            return [...elements, ...bodyElements];
        } else {
            // Collapsed view
            const headerText = this.formatHeader(maxWidth);
            
            return (
                <Text color={this.isActive ? theme.colors.accent : undefined} wrap="truncate">
                    {this.icon} {headerText}
                </Text>
            );
        }
    }
    
    getRequiredLines(maxWidth: number): number {
        return this._isControllingInput ? 4 : 1;
    }
    
    private formatHeader(maxWidth: number): string {
        // The render() method will prepend "{icon} " (2 chars)
        // So we need to account for that in our width calculation
        const iconWidth = 2; // icon + space
        const availableWidth = maxWidth - iconWidth;
        const minBracketContent = "[…]"; // 3 chars
        const colorStart = '\x1b[38;5;117m';
        const colorEnd = '\x1b[39m';
        
        // Check if everything fits
        const fullText = `${this.label}: [${this.value}]`;
        if (fullText.length <= availableWidth) {
            return `${this.label}: [${colorStart}${this.value}${colorEnd}]`;
        }
        
        // Minimum viable display is "[…]" = 3 chars
        if (availableWidth < minBracketContent.length) {
            return minBracketContent;
        }
        
        // Calculate components
        const separatorAndBrackets = ": []"; // 4 chars
        const labelAndSeparatorLength = this.label.length + 2; // "Label: "
        const bracketsLength = 2; // "[]"
        const ellipsisLength = 1; // "…"
        
        // First priority: try to fit label + brackets with truncated value
        const spaceForValue = availableWidth - labelAndSeparatorLength - bracketsLength;
        
        if (spaceForValue > 0) {
            // We can fit the label and brackets with at least one char inside
            let truncatedValue: string;
            if (spaceForValue === 1) {
                truncatedValue = '…';
            } else if (this.value.length > spaceForValue) {
                truncatedValue = this.value.slice(0, spaceForValue - ellipsisLength) + '…';
            } else {
                truncatedValue = this.value;
            }
            return `${this.label}: [${colorStart}${truncatedValue}${colorEnd}]`;
        }
        
        // Second priority: truncate label to make room for "[…]"
        const minLabelSpace = availableWidth - minBracketContent.length - 2; // -2 for ": "
        if (minLabelSpace > 0) {
            const truncatedLabel = this.label.length > minLabelSpace 
                ? this.label.slice(0, minLabelSpace - ellipsisLength) + '…'
                : this.label;
            return `${truncatedLabel}: ${minBracketContent}`;
        }
        
        // Last resort: just show brackets with ellipsis
        return minBracketContent;
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