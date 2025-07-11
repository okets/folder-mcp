import React, { ReactElement } from 'react';
import { Box, Text, Key } from 'ink';
import { IListItem } from './IListItem';

export interface ButtonConfig {
    name: string;           
    borderColor: string;    
    text: string;          
    eventValue: any;       
}

export class SimpleButtonsRow implements IListItem {
    readonly selfConstrained = true as const;
    private _isControllingInput: boolean = false;
    private _focusedButtonIndex: number = 0;
    
    constructor(
        public icon: string,
        private label: string,
        private buttons: ButtonConfig[],
        public isActive: boolean,
        private onButtonActivate?: (buttonConfig: ButtonConfig, buttonIndex: number) => void
    ) {}
    
    get isControllingInput(): boolean {
        return this._isControllingInput;
    }
    
    render(maxWidth: number, maxLines?: number): ReactElement | ReactElement[] {
        const focusedButton = (this.isActive || this._isControllingInput) ? this._focusedButtonIndex : -1;
        
        
        // Return array of elements like LogItem does
        const elements: ReactElement[] = [];
        
        // Add empty line at top
        elements.push(<Text key="empty"> </Text>);
        
        // Create button row
        const buttonBoxes: ReactElement[] = [];
        for (let i = 0; i < this.buttons.length; i++) {
            const button = this.buttons[i];
            if (!button) continue;
            
            const isFocused = i === focusedButton;
            
            // Strip ANSI codes to get clean text
            const cleanText = button.text.replace(/\x1b\[[0-9;]*m/g, '');
            
            // Fixed width of 11 chars total (9 content + 2 borders)
            const maxContentWidth = 9;
            let displayText = cleanText;
            
            // If text is too long, truncate it
            if (displayText.length > maxContentWidth) {
                displayText = displayText.substring(0, maxContentWidth - 1) + '…';
            }
            
            // Calculate padding
            const paddingWidth = Math.max(maxContentWidth - displayText.length, 0);
            const leftPad = Math.floor(paddingWidth / 2);
            const rightPad = Math.ceil(paddingWidth / 2);
            
            // Build button lines
            const cornerColor = isFocused ? '#2f70d8' : button.borderColor;
            const sideColor = button.borderColor;
            const topCorners = isFocused ? ['╔', '╗'] : ['╭', '╮'];
            const bottomCorners = isFocused ? ['╚', '╝'] : ['╰', '╯'];
            
            buttonBoxes.push(
                <Box key={button.name} flexDirection="column" marginRight={1}>
                    <Text>
                        <Text color={cornerColor}>{topCorners[0]}</Text>
                        <Text color={sideColor}>─────────</Text>
                        <Text color={cornerColor}>{topCorners[1]}</Text>
                    </Text>
                    <Text>
                        <Text color={sideColor}>│</Text>
                        {' '.repeat(leftPad) + displayText + ' '.repeat(rightPad)}
                        <Text color={sideColor}>│</Text>
                    </Text>
                    <Text>
                        <Text color={cornerColor}>{bottomCorners[0]}</Text>
                        <Text color={sideColor}>─────────</Text>
                        <Text color={cornerColor}>{bottomCorners[1]}</Text>
                    </Text>
                </Box>
            );
        }
        
        // Render buttons as 3 separate Text lines (like LogItem does)
        // Line 1: Top borders
        const topLine: ReactElement[] = [];
        topLine.push(<Text key="margin"> </Text>); // Left margin
        
        for (let i = 0; i < this.buttons.length; i++) {
            const button = this.buttons[i];
            if (!button) continue;
            const isFocused = i === focusedButton;
            const cornerColor = isFocused ? '#2f70d8' : button.borderColor;
            const sideColor = button.borderColor;
            const topCorners = isFocused ? ['╔', '╗'] : ['╭', '╮'];
            
            topLine.push(
                <Text key={`top-${i}`}>
                    <Text color={cornerColor}>{topCorners[0]}</Text>
                    <Text color={sideColor}>─────────</Text>
                    <Text color={cornerColor}>{topCorners[1]}</Text>
                    {i < this.buttons.length - 1 ? ' ' : ''}
                </Text>
            );
        }
        
        elements.push(<Box key="topline">{topLine}</Box>);
        
        // Line 2: Content
        const middleLine: ReactElement[] = [];
        middleLine.push(<Text key="margin"> </Text>); // Left margin
        
        for (let i = 0; i < this.buttons.length; i++) {
            const button = this.buttons[i];
            if (!button) continue;
            const cleanText = button.text.replace(/\x1b\[[0-9;]*m/g, '');
            const maxContentWidth = 9;
            let displayText = cleanText;
            
            if (displayText.length > maxContentWidth) {
                displayText = displayText.substring(0, maxContentWidth - 1) + '…';
            }
            
            const paddingWidth = Math.max(maxContentWidth - displayText.length, 0);
            const leftPad = Math.floor(paddingWidth / 2);
            const rightPad = Math.ceil(paddingWidth / 2);
            
            middleLine.push(
                <Text key={`mid-${i}`}>
                    <Text color={button.borderColor}>│</Text>
                    {' '.repeat(leftPad) + displayText + ' '.repeat(rightPad)}
                    <Text color={button.borderColor}>│</Text>
                    {i < this.buttons.length - 1 ? ' ' : ''}
                </Text>
            );
        }
        
        elements.push(<Box key="middleline">{middleLine}</Box>);
        
        // Line 3: Bottom borders
        const bottomLine: ReactElement[] = [];
        bottomLine.push(<Text key="margin"> </Text>); // Left margin
        
        for (let i = 0; i < this.buttons.length; i++) {
            const button = this.buttons[i];
            if (!button) continue;
            const isFocused = i === focusedButton;
            const cornerColor = isFocused ? '#2f70d8' : button.borderColor;
            const sideColor = button.borderColor;
            const bottomCorners = isFocused ? ['╚', '╝'] : ['╰', '╯'];
            
            bottomLine.push(
                <Text key={`bot-${i}`}>
                    <Text color={cornerColor}>{bottomCorners[0]}</Text>
                    <Text color={sideColor}>─────────</Text>
                    <Text color={cornerColor}>{bottomCorners[1]}</Text>
                    {i < this.buttons.length - 1 ? ' ' : ''}
                </Text>
            );
        }
        
        elements.push(<Box key="bottomline">{bottomLine}</Box>);
        
        return elements;
    }
    
    getRequiredLines(maxWidth: number, maxHeight?: number): number {
        return 4; // 1 empty line + 3 button lines
    }
    
    onEnter(): void {
        if (this.buttons.length > 0) {
            this._isControllingInput = true;
            this._focusedButtonIndex = 0;
        }
    }
    
    onExit(): void {
        this._isControllingInput = false;
    }
    
    handleInput(input: string, key: Key): boolean {
        if (!this._isControllingInput) return false;
        
        if (key.leftArrow) {
            this._focusedButtonIndex = this._focusedButtonIndex > 0 
                ? this._focusedButtonIndex - 1 
                : this.buttons.length - 1;
            return true;
        }
        
        if (key.rightArrow) {
            this._focusedButtonIndex = this._focusedButtonIndex < this.buttons.length - 1 
                ? this._focusedButtonIndex + 1 
                : 0;
            return true;
        }
        
        if (key.return || input === ' ') {
            const activeButton = this.buttons[this._focusedButtonIndex];
            if (activeButton && this.onButtonActivate) {
                this.onButtonActivate(activeButton, this._focusedButtonIndex);
            }
            return true;
        }
        
        if (key.upArrow || key.downArrow) {
            this.onExit();
            return false;
        }
        
        return false;
    }
    
    onSelect(): void {
        this._focusedButtonIndex = 0;
        if (this.buttons.length > 0) {
            this._isControllingInput = true;
        }
    }
    
    onDeselect(): void {
        this._isControllingInput = false;
    }
}