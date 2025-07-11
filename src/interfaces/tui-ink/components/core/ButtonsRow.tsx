import React, { ReactElement } from 'react';
import { Box, Text, Key, useStdout, Transform } from 'ink';
import { IListItem } from './IListItem';
import { theme } from '../../utils/theme';
import { textColorProp } from '../../utils/conditionalProps';

export interface ButtonConfig {
    name: string;           // Internal identifier
    borderColor: string;    // Color for button border
    text: string;          // Display text (supports ANSI)
    eventValue: any;       // Value returned when button activated
}

export interface ButtonsRowConfig {
    buttons: ButtonConfig[];
    align?: 'left' | 'right' | 'center';  // Row alignment (default: left)
}

export class ButtonsRow implements IListItem {
    readonly selfConstrained = true as const;
    private _isControllingInput: boolean = false;
    private _focusedButtonIndex: number = 0;
    
    constructor(
        public icon: string,
        private label: string,
        private buttons: ButtonConfig[],
        public isActive: boolean,
        private align: 'left' | 'right' | 'center' = 'left',
        private onButtonActivate?: (buttonConfig: ButtonConfig, buttonIndex: number) => void
    ) {}
    
    get isControllingInput(): boolean {
        return this._isControllingInput;
    }
    
    /**
     * Check if we're in low resolution mode (isLowResolution pattern from existing components)
     */
    private isLowResolution(): boolean {
        const { stdout } = useStdout();
        const { rows } = stdout;
        return rows < 25;
    }
    
    render(maxWidth: number, maxLines?: number): ReactElement | ReactElement[] {
        const isLowRes = this.isLowResolution();
        const focusedButton = this.isActive ? this._focusedButtonIndex : -1;
        
        if (isLowRes) {
            return this.renderLowResolution(maxWidth, focusedButton);
        } else {
            return this.renderRegularMode(maxWidth, focusedButton);
        }
    }
    
    /**
     * Render low resolution mode: [▶cancel ] [ Save ]
     */
    private renderLowResolution(maxWidth: number, focusedButtonIndex: number): ReactElement {
        const elements: ReactElement[] = [];
        
        for (let i = 0; i < this.buttons.length; i++) {
            const button = this.buttons[i];
            if (!button) continue;
            
            const isFocused = i === focusedButtonIndex;
            const arrow = isFocused ? '▶' : ' ';
            
            // Apply ANSI text using Transform wrapper to prevent spacing issues
            const buttonText = (
                <Transform transform={output => output}>
                    <Text {...textColorProp(isFocused ? theme.colors.accent : undefined)}>
                        [{arrow}{button.text} ]
                    </Text>
                </Transform>
            );
            
            elements.push(
                <React.Fragment key={button.name}>
                    {buttonText}
                    {i < this.buttons.length - 1 && <Text> </Text>}
                </React.Fragment>
            );
        }
        
        return this.wrapWithAlignment(elements, maxWidth);
    }
    
    /**
     * Render regular mode with bordered boxes:
     * ╔─────────╗  ╭──────────╮
     * │ √Accept │  │ ✗ Decline│
     * ╚─────────╝  ╰──────────╯
     */
    private renderRegularMode(maxWidth: number, focusedButtonIndex: number): ReactElement {
        const buttonElements: ReactElement[] = [];
        
        for (let i = 0; i < this.buttons.length; i++) {
            const button = this.buttons[i];
            const isFocused = i === focusedButtonIndex;
            
            // Calculate button width (text + padding)
            const textWidth = this.getVisualTextWidth(button.text);
            const buttonWidth = textWidth + 2; // 1 space padding on each side
            
            // Create border characters with appropriate colors
            const borderColor = isFocused ? theme.colors.accent : button.borderColor;
            const topBorder = isFocused ? '╔' + '─'.repeat(buttonWidth) + '╗' : '╭' + '─'.repeat(buttonWidth) + '╮';
            const bottomBorder = isFocused ? '╚' + '─'.repeat(buttonWidth) + '╝' : '╰' + '─'.repeat(buttonWidth) + '╯';
            
            const buttonBox = (
                <Box key={button.name} flexDirection="column" marginRight={i < this.buttons.length - 1 ? 2 : 0}>
                    <Text {...textColorProp(borderColor)}>{topBorder}</Text>
                    <Text>
                        <Text {...textColorProp(borderColor)}>│</Text>
                        <Text> </Text>
                        <Transform transform={output => output}>
                            <Text {...textColorProp(isFocused ? theme.colors.accent : undefined)}>
                                {button.text}
                            </Text>
                        </Transform>
                        <Text> </Text>
                        <Text {...textColorProp(borderColor)}>│</Text>
                    </Text>
                    <Text {...textColorProp(borderColor)}>{bottomBorder}</Text>
                </Box>
            );
            
            buttonElements.push(buttonBox);
        }
        
        return this.wrapWithAlignment(buttonElements, maxWidth);
    }
    
    /**
     * Get visual width of text, accounting for ANSI escape sequences
     */
    private getVisualTextWidth(text: string): number {
        // Remove ANSI escape sequences for width calculation
        return text.replace(/\x1b\[[0-9;]*m/g, '').length;
    }
    
    /**
     * Wrap button elements with alignment
     */
    private wrapWithAlignment(elements: ReactElement[], maxWidth: number): ReactElement {
        const flexDirection = 'row';
        let justifyContent: 'flex-start' | 'center' | 'flex-end' = 'flex-start';
        
        switch (this.align) {
            case 'center':
                justifyContent = 'center';
                break;
            case 'right':
                justifyContent = 'flex-end';
                break;
            default:
                justifyContent = 'flex-start';
        }
        
        return (
            <Box flexDirection={flexDirection} justifyContent={justifyContent}>
                {elements}
            </Box>
        );
    }
    
    getRequiredLines(maxWidth: number, maxHeight?: number): number {
        // Low resolution mode: 1 line
        if (this.isLowResolution()) {
            return 1;
        }
        
        // Regular mode: 3 lines (top border, content, bottom border)
        return 3;
    }
    
    /**
     * Enter the button navigation mode
     */
    onEnter(): void {
        if (this.buttons.length > 0) {
            this._isControllingInput = true;
            this._focusedButtonIndex = 0;
        }
    }
    
    /**
     * Exit button navigation mode
     */
    onExit(): void {
        this._isControllingInput = false;
    }
    
    /**
     * Handle keyboard input for button navigation
     */
    handleInput(input: string, key: Key): boolean {
        if (!this._isControllingInput) {
            return false;
        }
        
        // Left/Right arrow keys for button navigation (circular)
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
        
        // Enter or Space to activate button
        if (key.return || input === ' ') {
            const activeButton = this.buttons[this._focusedButtonIndex];
            if (activeButton && this.onButtonActivate) {
                this.onButtonActivate(activeButton, this._focusedButtonIndex);
            }
            return true;
        }
        
        // Up/Down arrows should exit and navigate to next/prev list item
        if (key.upArrow || key.downArrow) {
            this.onExit();
            return false; // Let parent handle list navigation
        }
        
        return false;
    }
    
    onSelect(): void {
        // Focus on first button when item becomes selected
        this._focusedButtonIndex = 0;
    }
    
    onDeselect(): void {
        // Exit input control when deselected
        this._isControllingInput = false;
    }
}