import React, { ReactElement } from 'react';
import { Text, Key, Transform } from 'ink';
import { IListItem } from './IListItem';
import { theme } from '../../utils/theme';
import { textColorProp } from '../../utils/conditionalProps';

export type TextOverflowMode = 'truncate' | 'wrap';

/**
 * Navigation-specific ListItem that uses isSelected for color rendering
 * Renders with blue color when selected, independent of isActive state
 * This avoids conflicts with GenericListPanel's focus-based isActive logic
 */
export class NavigationListItem implements IListItem {
    readonly selfConstrained = true as const;
    readonly isNavigable = true; // Navigation items ARE navigable
    private _isControllingInput: boolean = false;
    private _overflowMode: TextOverflowMode;
    private _isActive: boolean = false; // Not used for rendering, but needed for interface compliance

    constructor(
        public icon: string,
        private text: string,
        private isSelected: boolean, // Visual selection state (independent of isActive)
        private onSelectCallback?: () => void,
        overflowMode: TextOverflowMode = 'truncate'
    ) {
        this._overflowMode = overflowMode;
    }

    get isActive(): boolean {
        return this._isActive; // Not used for rendering, kept for IListItem interface compliance
    }

    set isActive(value: boolean) {
        this._isActive = value; // Accept the value but don't use it for rendering
    }

    get isControllingInput(): boolean {
        return this._isControllingInput;
    }

    get formattedText(): string {
        return this.text; // Expose text for HorizontalListRenderer
    }

    /**
     * Calculate required lines based on text content and overflow mode
     */
    getRequiredLines(maxWidth: number): number {
        if (this._overflowMode === 'truncate') {
            return 1; // Always single line with truncation
        }

        // Wrap mode: calculate actual lines needed
        // ▶ only when selected AND active, ● when selected but not active, original icon otherwise
        const displayIcon = (this.isSelected && this._isActive) ? '▶' : (this.isSelected ? '●' : this.icon);
        const iconWidth = displayIcon.length === 0 ? 1 : displayIcon.length + 1;
        const availableWidth = maxWidth - iconWidth - 1;

        if (availableWidth <= 0) return 1;

        const textLines = this.wrapText(this.text, availableWidth);
        return Math.max(1, textLines.length);
    }

    /**
     * Break text into lines that fit within maxWidth using word boundaries
     */
    private wrapText(text: string, maxWidth: number, indent: string = ''): string[] {
        if (maxWidth <= 0) return [text];

        const lines: string[] = [];
        const words = text.split(' ');
        let currentLine = indent;

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            if (!word) continue;

            const testLine = currentLine + (currentLine.length > indent.length ? ' ' : '') + word;
            const testLineLength = testLine.length;

            if (testLineLength <= maxWidth) {
                currentLine = testLine;
            } else {
                if (currentLine.length > indent.length) {
                    lines.push(currentLine);
                    currentLine = indent;
                }

                const wordWithIndent = indent + word;

                if (wordWithIndent.length > maxWidth) {
                    const availableWidth = maxWidth - indent.length - 1;
                    if (availableWidth > 0) {
                        const truncatedWord = word.substring(0, availableWidth);
                        const truncatedLine = indent + truncatedWord + '…';
                        lines.push(truncatedLine);
                    } else {
                        const ellipsisLine = indent + '…';
                        lines.push(ellipsisLine);
                    }
                } else {
                    currentLine = wordWithIndent;
                }
            }
        }

        if (currentLine.length > indent.length) {
            lines.push(currentLine);
        }

        return lines;
    }

    render(maxWidth: number, maxLines?: number): ReactElement | ReactElement[] {
        const actualRequiredLines = this.getRequiredLines(maxWidth);
        const maxLinesToUse = this._overflowMode === 'wrap' ? actualRequiredLines : (maxLines || actualRequiredLines);

        if (this._overflowMode === 'truncate') {
            // Single line with truncation - USE isSelected for color
            // ▶ only when selected AND active, ● when selected but not active, original icon otherwise
            const displayIcon = (this.isSelected && this._isActive) ? '▶' : (this.isSelected ? '●' : this.icon);
            const iconWidth = displayIcon.length === 0 ? 1 : displayIcon.length + 1;
            const availableWidth = maxWidth - iconWidth - 1;

            let displayText = this.text;

            if (this.text.length > availableWidth) {
                displayText = this.text.substring(0, Math.max(0, availableWidth - 1)) + '…';
            }

            return (
                <Text>
                    <Transform transform={output => output}>
                        <Text {...textColorProp(this.isSelected ? theme.colors.accent : theme.colors.textMuted)}>
                            {displayIcon}
                        </Text>
                        <Text>
                            {" "}
                        </Text>
                        <Text color={this.isSelected ? theme.colors.accent : "gray"}>
                            {displayText}
                        </Text>
                    </Transform>
                </Text>
            );
        }

        // Wrap mode: create multiple lines - USE isSelected for color
        const elements: ReactElement[] = [];
        // ▶ only when selected AND active, ● when selected but not active, original icon otherwise
        const displayIcon = (this.isSelected && this._isActive) ? '▶' : (this.isSelected ? '●' : this.icon);
        const iconWidth = displayIcon.length === 0 ? 1 : displayIcon.length + 1;
        let linesUsed = 0;

        const availableWidth = maxWidth - iconWidth - 1;
        const textLines = this.wrapText(this.text, availableWidth);

        // First line: icon + text
        if (linesUsed < maxLinesToUse && textLines.length > 0) {
            elements.push(
                <Text key="line-0">
                    <Transform transform={output => output}>
                        <Text {...textColorProp(this.isSelected ? theme.colors.accent : theme.colors.textMuted)}>
                            {displayIcon}
                        </Text>
                        <Text color={this.isSelected ? theme.colors.accent : "gray"}>
                            {" "}{textLines[0]}
                        </Text>
                    </Transform>
                </Text>
            );
            linesUsed++;
        }

        // Continuation lines
        for (let i = 1; i < textLines.length && linesUsed < maxLinesToUse; i++) {
            elements.push(
                <Text key={`text-line-${i}`}>
                    <Transform transform={output => output}>
                        <Text color={this.isSelected ? theme.colors.accent : "gray"}>
                            {" "}{textLines[i]}
                        </Text>
                    </Transform>
                </Text>
            );
            linesUsed++;
        }

        return elements.length === 1 ? elements[0]! : elements;
    }

    onEnter(): void {
        if (this.onSelectCallback) {
            this.onSelectCallback();
        }
    }

    onExit(): void {
        // Nothing to do
    }

    handleInput(input: string, key: Key): boolean {
        // Navigation items don't handle input directly
        return false;
    }

    onSelect?(): void {
        // Visual feedback when selected
    }

    onDeselect?(): void {
        // Remove visual feedback when deselected
    }
}
