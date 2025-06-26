import React, { ReactElement } from 'react';
import { Box, Text } from 'ink';
import { IListItem } from './IListItem.js';
import { TextInputBody } from './TextInputBody.js';
import { theme } from '../../utils/theme.js';

export class ConfigurationListItem implements IListItem {
    constructor(
        private icon: string,
        private label: string,
        private value: string,
        private isActive: boolean,
        private isExpanded: boolean,
        private editValue?: string,
        private cursorPosition?: number,
        private cursorVisible?: boolean
    ) {}
    
    render(maxWidth: number): ReactElement | ReactElement[] {
        if (this.isExpanded && this.editValue !== undefined) {
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
                value: this.editValue,
                cursorPosition: this.cursorPosition || 0,
                cursorVisible: this.cursorVisible !== false,
                width: maxWidth
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
        return this.isExpanded ? 4 : 1;
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