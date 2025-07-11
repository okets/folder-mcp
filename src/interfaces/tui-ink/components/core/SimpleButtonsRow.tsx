import React, { ReactElement } from 'react';
import { Box, Text, Key } from 'ink';
import { IListItem } from './IListItem';
import { theme } from '../../utils/theme';

// Global terminal size state - updated by parent components
let globalTerminalRows = 30; // Default safe value for normal resolution

// Function to update global terminal size from parent components
export function updateGlobalTerminalSize(rows: number): void {
    globalTerminalRows = rows;
}

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
        // If the row is created as active, immediately enter control mode
        // This ensures buttons are immediately interactive
        if (this._isActive) {
            this._isControllingInput = true;
            this._focusedButtonIndex = 0;
        }
    }
    
    get isActive(): boolean {
        return this._isActive;
    }
    
    set isActive(value: boolean) {
        const wasActive = this._isActive;
        this._isActive = value;
        
        // If becoming active for the first time, auto-enter control mode
        if (!wasActive && value) {
            this._isControllingInput = true;
            this._focusedButtonIndex = 0;
        }
        // If staying active but not controlling input (zombie state), re-enter control mode
        else if (wasActive && value && !this._isControllingInput) {
            this._isControllingInput = true;
            this._focusedButtonIndex = 0;
        }
    }
    
    get isControllingInput(): boolean {
        return this._isControllingInput;
    }
    
    /**
     * Detect if terminal supports modern features like underline
     */
    private hasModernTerminalSupport(): boolean {
        const termProgram = process.env.TERM_PROGRAM;
        const colorTerm = process.env.COLORTERM;
        const term = process.env.TERM;
        
        // Modern terminal programs that support underline well
        const modernTerminals = [
            'iTerm.app',
            'vscode',
            'hyper',
            'wezterm',
            'alacritty',
            'kitty'
        ];
        
        // Modern color term indicators
        const modernColorTerms = ['truecolor', '24bit'];
        
        // Modern TERM values
        const modernTermValues = [
            'xterm-256color',
            'screen-256color',
            'tmux-256color'
        ];
        
        return (
            (termProgram && modernTerminals.includes(termProgram)) ||
            (colorTerm && modernColorTerms.includes(colorTerm)) ||
            (term && modernTermValues.includes(term)) ||
            process.env.TERM_PROGRAM === 'Apple_Terminal' // macOS Terminal.app
        );
    }
    
    /**
     * Render low resolution mode: [ Cancel ] [ Save ]
     * Focused button is underlined
     */
    private renderLowResolution(maxWidth: number, focusedButtonIndex: number): ReactElement {
        const elements: ReactElement[] = [];
        
        // Calculate available space for buttons
        const spaceBetweenButtons = this.buttons.length > 1 ? (this.buttons.length - 1) : 0;
        const bracketsPerButton = 2; // [ and ]
        const totalBrackets = this.buttons.length * bracketsPerButton;
        const totalSpacing = spaceBetweenButtons;
        const availableForText = maxWidth - totalBrackets - totalSpacing;
        const maxTextPerButton = Math.floor(availableForText / this.buttons.length);
        
        for (let i = 0; i < this.buttons.length; i++) {
            const button = this.buttons[i];
            if (!button) continue;
            
            const isFocused = i === focusedButtonIndex;
            
            // Calculate truncation based on visual length (without ANSI codes)
            const cleanTextForMeasurement = button.text.replace(/\x1b\[[0-9;]*m/g, '');
            let displayText = button.text;
            let cleanDisplayText = cleanTextForMeasurement;
            
            if (cleanTextForMeasurement.length > maxTextPerButton) {
                // Truncate both versions
                const truncatedClean = cleanTextForMeasurement.substring(0, maxTextPerButton);
                displayText = truncatedClean; // For unfocused (lose ANSI)
                cleanDisplayText = truncatedClean; // For focused
            }
            
            // Create the button text with adaptive focus styling
            const hasModernSupport = this.hasModernTerminalSupport();
            const buttonText = (
                <Text key={button.name} bold>
                    <Text color={button.borderColor}>[</Text>
                    {isFocused ? (
                        hasModernSupport ? (
                            // Modern terminals: strip ANSI, use border color with underline
                            <Text underline color={button.borderColor} bold>{cleanDisplayText}</Text>
                        ) : (
                            // Older terminals: strip ANSI, use border color with background highlight
                            <Text backgroundColor={theme.colors.accent} color={button.borderColor} bold>{cleanDisplayText}</Text>
                        )
                    ) : (
                        // Not focused: preserve ANSI colors
                        <Text bold>{displayText}</Text>
                    )}
                    <Text color={button.borderColor}>]</Text>
                </Text>
            );
            
            elements.push(buttonText);
            
            // Add space between buttons
            if (i < this.buttons.length - 1) {
                elements.push(<Text key={`space-${i}`}> </Text>);
            }
        }
        
        return (
            <Box justifyContent="center" width="100%">
                {elements}
            </Box>
        );
    }
    
    render(maxWidth: number, maxLines?: number): ReactElement | ReactElement[] {
        // Use global terminal size for responsive decision, like StatusBar does
        const globalLowResolution = globalTerminalRows < 25;
        
        // Only minimize when we literally cannot fit the 3-line bordered mode
        const cannotFitBorderedMode = maxLines !== undefined && maxLines < 3;
        
        
        const focusedButton = this._isControllingInput ? this._focusedButtonIndex : -1;
        
        if (globalLowResolution || cannotFitBorderedMode) {
            return this.renderLowResolution(maxWidth, focusedButton);
        }
        
        return this.renderRegularMode(maxWidth, focusedButton);
    }
    
    /**
     * Render regular mode with bordered boxes:
     * ╔─────────╗  ╭──────────╮
     * │ √Accept │  │ ✗ Decline│
     * ╚─────────╝  ╰──────────╯
     */
    private renderRegularMode(maxWidth: number, focusedButtonIndex: number): ReactElement[] {
        // Calculate available width for buttons
        const spacingBetweenButtons = 1;
        const totalSpacing = (this.buttons.length - 1) * spacingBetweenButtons;
        const availableWidth = maxWidth - totalSpacing - 4; // Extra margin for safety
        const maxButtonWidth = Math.floor(availableWidth / this.buttons.length);
        
        const topLine: ReactElement[] = [];
        const middleLine: ReactElement[] = [];
        const bottomLine: ReactElement[] = [];
        
        for (let i = 0; i < this.buttons.length; i++) {
            const button = this.buttons[i];
            if (!button) continue;
            
            const isFocused = i === focusedButtonIndex;
            
            // Calculate text width and truncation
            const cleanText = button.text.replace(/\x1b\[[0-9;]*m/g, '');
            const textWidth = cleanText.length;
            const idealButtonWidth = textWidth + 2; // 1 space padding on each side
            const buttonWidth = Math.max(6, Math.min(idealButtonWidth, maxButtonWidth));
            const maxTextWidth = buttonWidth - 2; // Account for padding spaces
            
            let displayText = button.text; // Preserve ANSI for unfocused
            let cleanDisplayText = cleanText;
            
            if (cleanText.length > maxTextWidth) {
                const truncated = cleanText.substring(0, maxTextWidth - 1) + '…';
                displayText = truncated; // For unfocused (lose ANSI)
                cleanDisplayText = truncated; // For focused
            }
            
            // Use fixed 1-space padding like the original ButtonsRow
            const visualTextWidth = cleanDisplayText.length;
            const contentWidth = visualTextWidth + 2; // Add padding spaces
            const borderLineWidth = contentWidth; // Border line should match content
            
            // Create border elements
            const cornerColor = isFocused ? theme.colors.accent : button.borderColor;
            const sideColor = button.borderColor;
            const topCorners = isFocused ? ['╔', '╗'] : ['╭', '╮'];
            const bottomCorners = isFocused ? ['╚', '╝'] : ['╰', '╯'];
            
            // Top border line
            topLine.push(
                <Text key={`top-${i}`}>
                    <Text color={cornerColor}>{topCorners[0]}</Text>
                    <Text color={sideColor}>{'─'.repeat(borderLineWidth)}</Text>
                    <Text color={cornerColor}>{topCorners[1]}</Text>
                    {i < this.buttons.length - 1 ? ' ' : ''}
                </Text>
            );
            
            // Middle content line with fixed 1-space padding
            middleLine.push(
                <Text key={`mid-${i}`}>
                    <Text color={sideColor}>│</Text>
                    <Text> </Text>
                    {isFocused ? (
                        // Focused: strip ANSI, use border color
                        <Text color={button.borderColor} bold>{cleanDisplayText}</Text>
                    ) : (
                        // Unfocused: preserve ANSI colors
                        <Text bold>{displayText}</Text>
                    )}
                    <Text> </Text>
                    <Text color={sideColor}>│</Text>
                    {i < this.buttons.length - 1 ? ' ' : ''}
                </Text>
            );
            
            // Bottom border line
            bottomLine.push(
                <Text key={`bot-${i}`}>
                    <Text color={cornerColor}>{bottomCorners[0]}</Text>
                    <Text color={sideColor}>{'─'.repeat(borderLineWidth)}</Text>
                    <Text color={cornerColor}>{bottomCorners[1]}</Text>
                    {i < this.buttons.length - 1 ? ' ' : ''}
                </Text>
            );
        }
        
        // Return the 3-line bordered layout as a single consistent structure
        const elements: ReactElement[] = [];
        elements.push(
            <Box key="topline" width="100%">
                {topLine}
            </Box>
        );
        elements.push(
            <Box key="middleline" width="100%">
                {middleLine}
            </Box>
        );
        elements.push(
            <Box key="bottomline" width="100%">
                {bottomLine}
            </Box>
        );
        
        return elements;
    }
    
    getRequiredLines(maxWidth: number, maxHeight?: number): number {
        // Use the same logic as render() to determine which mode we'll use
        const globalLowResolution = globalTerminalRows < 25;
        const cannotFitBorderedMode = maxHeight !== undefined && maxHeight < 3;
        
        if (globalLowResolution || cannotFitBorderedMode) {
            return 1; // Minimized mode: single line
        }
        
        return 3; // Bordered mode: 3 lines
    }
    
    onEnter(): void {
        // Enter control mode immediately - this is what the list expects
        this._isControllingInput = true;
        this._focusedButtonIndex = 0;
    }
    
    onExit(): void {
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
            this._isControllingInput = false;
            this._focusedButtonIndex = 0; // Reset to first button for next time
            return false; // Let parent handle list navigation
        }
        
        return false;
    }
    
    onSelect(): void {
        // Reset focus to first button and automatically enter control mode
        // This ensures immediate button focus when navigating to the row
        // This also handles the case where navigation was blocked and we need to re-enter control mode
        this._focusedButtonIndex = 0;
        this._isControllingInput = true;
    }
    
    onDeselect(): void {
        this._isControllingInput = false;
    }
}