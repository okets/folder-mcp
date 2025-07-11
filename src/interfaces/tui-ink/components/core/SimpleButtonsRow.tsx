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
    private _isActive: boolean = false;
    
    constructor(
        public icon: string,
        private label: string,
        private buttons: ButtonConfig[],
        isActive: boolean,
        private onButtonActivate?: (buttonConfig: ButtonConfig, buttonIndex: number) => void
    ) {
        this._isActive = isActive;
        console.error(`[SimpleButtonsRow] CONSTRUCTOR - isActive: ${this._isActive}`);
        // If the row is created as active, immediately enter control mode
        // This ensures buttons are immediately interactive
        if (this._isActive) {
            console.error(`[SimpleButtonsRow] CONSTRUCTOR - setting _isControllingInput = true`);
            this._isControllingInput = true;
            this._focusedButtonIndex = 0;
        }
    }
    
    get isActive(): boolean {
        return this._isActive;
    }
    
    set isActive(value: boolean) {
        console.error(`[SimpleButtonsRow] isActive setter - OLD: ${this._isActive}, NEW: ${value}`);
        const wasActive = this._isActive;
        this._isActive = value;
        
        // If becoming active for the first time, auto-enter control mode
        if (!wasActive && value) {
            console.error(`[SimpleButtonsRow] isActive setter - becoming active, setting _isControllingInput = true`);
            this._isControllingInput = true;
            this._focusedButtonIndex = 0;
        }
    }
    
    get isControllingInput(): boolean {
        const result = this._isControllingInput;
        if (result) {
            console.error(`[SimpleButtonsRow] isControllingInput getter called - returning: ${result}, _focusedButtonIndex=${this._focusedButtonIndex}`);
        }
        return result;
    }
    
    render(maxWidth: number, maxLines?: number): ReactElement | ReactElement[] {
        // Show focus when controlling input OR when row is active AND we want immediate button focus
        const focusedButton = this._isControllingInput ? this._focusedButtonIndex : -1;
        
        
        // Return array of elements like LogItem does
        const elements: ReactElement[] = [];
        
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
        
        for (let i = 0; i < this.buttons.length; i++) {
            const button = this.buttons[i];
            if (!button) continue;
            const isFocused = i === focusedButton;
            // Always use blue corners when focused, whether controlling or just active
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
        
        // Just push the topLine array directly
        elements.push(
            <Box key="topline" justifyContent="center" width="100%">
                {topLine}
            </Box>
        );
        
        // Line 2: Content
        const middleLine: ReactElement[] = [];
        
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
                    <Text>{' '.repeat(leftPad)}</Text>
                    <Text>{button.text}</Text>
                    <Text>{' '.repeat(rightPad)}</Text>
                    <Text color={button.borderColor}>│</Text>
                    {i < this.buttons.length - 1 ? ' ' : ''}
                </Text>
            );
        }
        
        elements.push(
            <Box key="middleline" justifyContent="center" width="100%">
                {middleLine}
            </Box>
        );
        
        // Line 3: Bottom borders
        const bottomLine: ReactElement[] = [];
        
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
        
        elements.push(
            <Box key="bottomline" justifyContent="center" width="100%">
                {bottomLine}
            </Box>
        );
        
        return elements;
    }
    
    getRequiredLines(maxWidth: number, maxHeight?: number): number {
        return 3; // Just the 3 button lines
    }
    
    onEnter(): void {
        console.error(`[SimpleButtonsRow] onEnter called - BEFORE: _isControllingInput=${this._isControllingInput}`);
        // Enter control mode immediately - this is what the list expects
        this._isControllingInput = true;
        this._focusedButtonIndex = 0;
        console.error(`[SimpleButtonsRow] onEnter called - AFTER: _isControllingInput=${this._isControllingInput}`);
    }
    
    onExit(): void {
        console.error(`[SimpleButtonsRow] onExit called`);
        this._isControllingInput = false;
    }
    
    handleInput(input: string, key: Key): boolean {
        // Allow input handling when row is active, not just when controlling
        // This allows immediate keyboard navigation when arriving at the row
        if (!this.isActive && !this._isControllingInput) {
            return false;
        }
        
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
            console.error(`[SimpleButtonsRow] ${key.upArrow ? 'UP' : 'DOWN'} arrow pressed - exiting control mode`);
            console.error(`[SimpleButtonsRow] BEFORE exit - _isControllingInput: ${this._isControllingInput}, _focusedButtonIndex: ${this._focusedButtonIndex}`);
            this._isControllingInput = false;
            this._focusedButtonIndex = 0; // Reset to first button for next time
            console.error(`[SimpleButtonsRow] AFTER exit - _isControllingInput: ${this._isControllingInput}, _focusedButtonIndex: ${this._focusedButtonIndex}`);
            console.error(`[SimpleButtonsRow] Returning false to let parent handle navigation`);
            return false; // Let parent handle list navigation
        }
        
        return false;
    }
    
    onSelect(): void {
        console.error(`[SimpleButtonsRow] onSelect called - BEFORE: _focusedButtonIndex=${this._focusedButtonIndex}, _isControllingInput=${this._isControllingInput}`);
        // Reset focus to first button and automatically enter control mode
        // This ensures immediate button focus when navigating to the row
        this._focusedButtonIndex = 0;
        this._isControllingInput = true;
        console.error(`[SimpleButtonsRow] onSelect called - AFTER: _focusedButtonIndex=${this._focusedButtonIndex}, _isControllingInput=${this._isControllingInput}`);
    }
    
    onDeselect(): void {
        console.error(`[SimpleButtonsRow] onDeselect called`);
        this._isControllingInput = false;
    }
}