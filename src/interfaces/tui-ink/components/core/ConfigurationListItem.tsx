import React, { ReactElement } from 'react';
import { Box, Text, Key } from 'ink';
import { IListItem } from './IListItem.js';
import { TextInputBody } from './TextInputBody.js';
import { theme } from '../../utils/theme.js';

export class ConfigurationListItem implements IListItem {
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
                <Text color={this.isActive ? theme.colors.accent : undefined}>
                    {this.icon} {headerText}
                </Text>
            );
        }
    }
    
    getRequiredLines(maxWidth: number): number {
        return this._isControllingInput ? 4 : 1;
    }
    
    private formatHeader(maxWidth: number): string {
        const iconWidth = 2; // icon + space
        const availableWidth = maxWidth - iconWidth;
        
        // Format: "Label: [value]"
        const fullText = `${this.label}: [\x1b[38;5;117m${this.value}\x1b[39m]`;
        
        // Calculate visible length without ANSI codes
        const visibleLength = this.stripAnsi(`${this.label}: [${this.value}]`).length;
        
        if (visibleLength <= availableWidth) {
            return fullText;
        }
        
        // Need to truncate - preserve label and brackets
        const labelAndBrackets = this.label.length + 4; // ": []"
        const availableForValue = availableWidth - labelAndBrackets - 3; // -3 for "..."
        
        if (availableForValue <= 0) {
            // Even label doesn't fit, truncate it
            const labelWidth = availableWidth - 7; // ": [...]"
            const truncatedLabel = this.truncate(this.label, labelWidth);
            return `${truncatedLabel}: [...]`;
        }
        
        // Truncate the value
        const truncatedValue = this.truncate(this.value, availableForValue);
        return `${this.label}: [\x1b[38;5;117m${truncatedValue}\x1b[39m]`;
    }
    
    private stripAnsi(text: string): string {
        return text.replace(/\x1b\[[0-9;]*m/g, '');
    }
    
    private truncate(text: string, maxWidth: number): string {
        if (text.length <= maxWidth) {
            return text;
        }
        if (maxWidth <= 3) {
            return '...'.slice(0, maxWidth);
        }
        return text.slice(0, maxWidth - 3) + '...';
    }
}