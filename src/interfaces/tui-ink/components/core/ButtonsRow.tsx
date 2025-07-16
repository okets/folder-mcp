import React, { ReactElement } from 'react';
import { Box, Text, Key, Transform } from 'ink';
import { IListItem } from './IListItem';
import { theme } from '../../utils/theme';
import { textColorProp } from '../../utils/conditionalProps';
import { useTerminalSize } from '../../hooks/useTerminalSize';

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
    private isLowResolution(rows: number): boolean {
        return rows < 25;
    }
    
    render(maxWidth: number, maxLines?: number): ReactElement | ReactElement[] {
        console.error(`\n=== BUTTONSROW RENDER DEBUG ===`);
        console.error(`maxWidth: ${maxWidth}, maxLines: ${maxLines}`);
        
        // Use maxLines to determine if we're in low resolution mode
        // This is more stable than useTerminalSize() which causes render loops
        // If we get 3+ lines, we can do regular mode (3 lines = top border, content, bottom border)
        const isLowRes = maxLines !== undefined && maxLines < 3;
        console.error(`isLowRes calculation: maxLines=${maxLines}, maxLines < 3 = ${isLowRes}`);
        
        // Show focused button when item is active OR when controlling input
        const focusedButton = (this.isActive || this._isControllingInput) ? this._focusedButtonIndex : -1;
        
        if (isLowRes) {
            console.error(`Rendering LOW RESOLUTION mode`);
            console.error(`=== END BUTTONSROW RENDER DEBUG ===\n`);
            return this.renderLowResolution(maxWidth, focusedButton);
        } else {
            console.error(`Rendering REGULAR mode`);
            console.error(`=== END BUTTONSROW RENDER DEBUG ===\n`);
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
                    <Text bold {...textColorProp(isFocused ? theme.colors.accent : undefined)}>
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
        
        
        // Calculate available width accounting for border overhead
        const spacingBetweenButtons = 1; // Space between buttons
        const totalSpacing = (this.buttons.length - 1) * spacingBetweenButtons;
        const borderOverheadPerButton = 2; // Each button has 2 corner characters (│text│)
        const totalBorderOverhead = this.buttons.length * borderOverheadPerButton;
        const availableWidth = maxWidth - totalSpacing - totalBorderOverhead;
        const maxButtonContentWidth = Math.floor(availableWidth / this.buttons.length);
        
        console.error(`\n=== BUTTONSROW WIDTH CALCULATION ===`);
        console.error(`maxWidth: ${maxWidth}`);
        console.error(`buttons: ${this.buttons.length}, spacing: ${totalSpacing}, borderOverhead: ${totalBorderOverhead}`);
        console.error(`availableWidth: ${availableWidth}, maxButtonContentWidth: ${maxButtonContentWidth}`);
        console.error(`=== END WIDTH CALCULATION ===\n`);
        
        for (let i = 0; i < this.buttons.length; i++) {
            const button = this.buttons[i];
            if (!button) continue;
            
            const isFocused = i === focusedButtonIndex;
            
            // Calculate button content width with constraints
            const textWidth = this.getVisualTextWidth(button.text);
            const idealContentWidth = textWidth + 2; // 1 space padding on each side
            const buttonContentWidth = Math.max(6, Math.min(idealContentWidth, maxButtonContentWidth)); // Min 6, respect max
            
                
            // Keep original ANSI text for display, but ensure border fits visual width
            let displayText = button.text;
            const plainText = displayText.replace(/\x1b\[[0-9;]*m/g, '');
            const maxTextWidth = buttonContentWidth - 2; // Account for padding spaces
            
            if (plainText.length > maxTextWidth) {
                // If truncation needed, create plain truncated text (lose ANSI for now)
                const truncated = plainText.substring(0, maxTextWidth - 1) + '…';
                displayText = truncated;
            }
            
            // Calculate the actual visual width for border
            const visualTextWidth = this.getVisualTextWidth(displayText);
            const contentWidth = visualTextWidth + 2; // Add padding spaces
            const borderLineWidth = buttonContentWidth; // Border line should match allocated content width
            
            // Create border elements with mixed colors (corners blue, sides original)
            const cornerColor = isFocused ? theme.colors.accent : button.borderColor;
            const sideColor = button.borderColor;
            
            // The buttonWidth is the INNER content width
            // Total visual width = buttonWidth + 2 (for the two corners)
            // But the horizontal lines should be exactly buttonWidth to fit the content
            
            if (this.buttons[0]?.name === 'accept' && i === 0) {
                console.error(`Creating borders: buttonContentWidth=${buttonContentWidth}, displayText="${displayText}" (${displayText.length} chars), visualTextWidth=${visualTextWidth}, borderLineWidth=${borderLineWidth}`);
            }
            
            const topBorder = (
                <Text>
                    <Text {...textColorProp(cornerColor)}>{isFocused ? '╔' : '╭'}</Text>
                    <Text {...textColorProp(sideColor)}>{'─'.repeat(borderLineWidth)}</Text>
                    <Text {...textColorProp(cornerColor)}>{isFocused ? '╗' : '╮'}</Text>
                </Text>
            );
            
            const middleBorder = (
                <Text>
                    <Text {...textColorProp(sideColor)}>│</Text>
                    <Text> </Text>
                    <Transform transform={output => output}>
                        <Text bold {...textColorProp(isFocused ? theme.colors.accent : undefined)}>
                            {displayText}
                        </Text>
                    </Transform>
                    <Text> </Text>
                    <Text {...textColorProp(sideColor)}>│</Text>
                </Text>
            );
            
            const bottomBorder = (
                <Text>
                    <Text {...textColorProp(cornerColor)}>{isFocused ? '╚' : '╰'}</Text>
                    <Text {...textColorProp(sideColor)}>{'─'.repeat(borderLineWidth)}</Text>
                    <Text {...textColorProp(cornerColor)}>{isFocused ? '╝' : '╯'}</Text>
                </Text>
            );
            
            const buttonBox = (
                <Box key={button.name} flexDirection="column" marginRight={i < this.buttons.length - 1 ? spacingBetweenButtons : 0}>
                    {topBorder}
                    {middleBorder}
                    {bottomBorder}
                </Box>
            );
            
            buttonElements.push(buttonBox);
        }
        
        const result = this.wrapWithAlignment(buttonElements, maxWidth);
        console.error(`\n=== BUTTONSROW FINAL RESULT ===`);
        console.error(`wrapWithAlignment returned: ${result}`);
        console.error(`buttonElements length: ${buttonElements.length}`);
        console.error(`=== END BUTTONSROW FINAL ===\n`);
        return result;
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
        console.error(`\n=== BUTTONSROW getRequiredLines DEBUG ===`);
        console.error(`maxWidth: ${maxWidth}, maxHeight: ${maxHeight}`);
        
        // Use same logic as render method for consistency
        // Note: maxHeight is the available container height, not the lines we'll get
        // We should always request 3 lines unless the container is very constrained
        const shouldUseLowRes = maxHeight !== undefined && maxHeight < 6;
        
        console.error(`shouldUseLowRes: maxHeight=${maxHeight} < 6 = ${shouldUseLowRes}`);
        
        // Low resolution mode: 1 line
        if (shouldUseLowRes) {
            console.error(`Requesting 1 line (low res mode)`);
            console.error(`=== END BUTTONSROW getRequiredLines DEBUG ===\n`);
            return 1;
        }
        
        // Regular mode: 3 lines (top border, content, bottom border)
        console.error(`Requesting 3 lines (regular mode)`);
        console.error(`=== END BUTTONSROW getRequiredLines DEBUG ===\n`);
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
        // Auto-enter button mode when selected
        if (this.buttons.length > 0) {
            this._isControllingInput = true;
        }
    }
    
    onDeselect(): void {
        // Exit input control when deselected
        this._isControllingInput = false;
    }
}