import React, { ReactElement } from 'react';
import { Box, Text, Key } from 'ink';
import { IListItem } from './IListItem';
import { getCurrentTheme } from '../../utils/theme';

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

export type ButtonAlignment = 'left' | 'center' | 'right';

export class SimpleButtonsRow implements IListItem {
    readonly selfConstrained = true as const;
    readonly isNavigable = true; // SimpleButtonsRow items are interactive and navigable
    private _isControllingInput: boolean = false;
    private _focusedButtonIndex: number = 0;
    private _isActive: boolean = false;
    
    constructor(
        public icon: string,
        private label: string,
        private buttons: ButtonConfig[],
        isActive: boolean,
        private onButtonActivate?: (buttonConfig: ButtonConfig, buttonIndex: number) => void,
        private alignment: ButtonAlignment = 'center'
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
        // REMOVED: Zombie state handler - was causing navigation trap
        // The handler would re-enter control mode when isActive stayed true after exiting control,
        // creating an infinite loop where navigation was impossible
    }
    
    get isControllingInput(): boolean {
        return this._isControllingInput;
    }
    
    /**
     * Truncate text with ANSI codes while preserving escape sequences
     */
    private truncateAnsiText(text: string, maxVisibleLength: number): string {
        let result = '';
        let visibleLength = 0;
        let i = 0;
        
        while (i < text.length && visibleLength < maxVisibleLength) {
            if (text[i] === '\x1b' && text[i + 1] === '[') {
                // Found ANSI escape sequence - copy it entirely
                let escapeEnd = i + 2;
                while (escapeEnd < text.length && !/[a-zA-Z]/.test(text.charAt(escapeEnd))) {
                    escapeEnd++;
                }
                if (escapeEnd < text.length) {
                    escapeEnd++; // Include the final letter
                }
                
                result += text.substring(i, escapeEnd);
                i = escapeEnd;
            } else {
                // Regular character
                result += text[i];
                visibleLength++;
                i++;
            }
        }
        
        // Add reset code if we truncated and there were ANSI codes
        if (visibleLength === maxVisibleLength && result.includes('\x1b[')) {
            result += '\x1b[0m';
        }
        
        return result;
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
        const theme = getCurrentTheme();
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
                <Text key={button.name}>
                    <Text color={button.borderColor}>[</Text>
                    {isFocused ? (
                        hasModernSupport ? (
                            // Modern terminals: strip ANSI, use border color with underline
                            <Text underline color={button.borderColor}>{cleanDisplayText}</Text>
                        ) : (
                            // Older terminals: strip ANSI, use border color with background highlight
                            <Text backgroundColor={theme.colors.accent} color={button.borderColor}>{cleanDisplayText}</Text>
                        )
                    ) : (
                        // Not focused: preserve ANSI colors
                        <Text>{displayText}</Text>
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
        
        // Apply alignment
        let justifyContent: 'flex-start' | 'center' | 'flex-end';
        switch (this.alignment) {
            case 'left':
                justifyContent = 'flex-start';
                break;
            case 'right':
                justifyContent = 'flex-end';
                break;
            case 'center':
            default:
                justifyContent = 'center';
                break;
        }
        
        return (
            <Box justifyContent={justifyContent} width="100%">
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
        const theme = getCurrentTheme();
        // Calculate available width for buttons
        const spacingBetweenButtons = 1;
        const totalSpacing = (this.buttons.length - 1) * spacingBetweenButtons;
        const availableWidth = maxWidth - totalSpacing - 4; // Extra margin for safety
        const maxButtonWidth = Math.floor(availableWidth / this.buttons.length);
        
        // GLOBAL DECISION: Determine padding strategy for ALL buttons
        // First check if ALL buttons can fit with padding
        let globalPadding = 1; // Start optimistic
        let needsPaddingRemoval = false;
        
        for (const button of this.buttons) {
            if (!button) continue;
            const cleanText = button.text.replace(/\x1b\[[0-9;]*m/g, '');
            const minWidthNeeded = cleanText.length + 2 + 2; // text + borders + padding
            if (minWidthNeeded > maxButtonWidth) {
                needsPaddingRemoval = true;
                break;
            }
        }
        
        if (needsPaddingRemoval) {
            globalPadding = 0; // Remove padding from ALL buttons
        }
        
        const topLine: ReactElement[] = [];
        const middleLine: ReactElement[] = [];
        const bottomLine: ReactElement[] = [];
        
        for (let i = 0; i < this.buttons.length; i++) {
            const button = this.buttons[i];
            if (!button) continue;
            
            const isFocused = i === focusedButtonIndex;
            
            const cleanText = button.text.replace(/\x1b\[[0-9;]*m/g, '');
            const availableTextWidth = Math.max(1, maxButtonWidth - 2 - (globalPadding * 2)); // borders + padding, minimum 1 char
            
            // Calculate actual text to display
            let displayText = button.text; // Preserve ANSI for unfocused
            let cleanDisplayText = cleanText;
            
            // If text still doesn't fit even without padding, truncate directly (no ellipsis)
            if (cleanText.length > availableTextWidth) {
                const truncateLength = Math.max(1, availableTextWidth); // Always leave at least 1 character
                cleanDisplayText = cleanText.substring(0, truncateLength);
                
                // For ANSI text, we need to be more careful about truncation
                if (button.text !== cleanText) {
                    // Text has ANSI codes - find the equivalent position in the original
                    displayText = this.truncateAnsiText(button.text, truncateLength);
                } else {
                    // No ANSI codes - simple truncation
                    displayText = cleanDisplayText;
                }
            }
            
            // Calculate final dimensions
            const finalTextWidth = cleanDisplayText.length;
            const contentWidth = finalTextWidth + (globalPadding * 2);
            const borderLineWidth = contentWidth;
            
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
            
            // Middle content line with global padding decision
            middleLine.push(
                <Text key={`mid-${i}`}>
                    <Text color={sideColor}>│</Text>
                    {globalPadding > 0 && <Text> </Text>}
                    {isFocused ? (
                        // Focused: strip ANSI, use clean text with border color
                        <Text color={button.borderColor}>{cleanDisplayText}</Text>
                    ) : (
                        // Unfocused: preserve ANSI colors
                        <Text>{displayText}</Text>
                    )}
                    {globalPadding > 0 && <Text> </Text>}
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
        
        // Apply alignment to all three lines
        let justifyContent: 'flex-start' | 'center' | 'flex-end';
        switch (this.alignment) {
            case 'left':
                justifyContent = 'flex-start';
                break;
            case 'right':
                justifyContent = 'flex-end';
                break;
            case 'center':
            default:
                justifyContent = 'center';
                break;
        }
        
        // Return the 3-line bordered layout as a single consistent structure
        const elements: ReactElement[] = [];
        elements.push(
            <Box key="topline" width="100%" justifyContent={justifyContent}>
                {topLine}
            </Box>
        );
        elements.push(
            <Box key="middleline" width="100%" justifyContent={justifyContent}>
                {middleLine}
            </Box>
        );
        elements.push(
            <Box key="bottomline" width="100%" justifyContent={justifyContent}>
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
            if (this._focusedButtonIndex > 0) {
                // Move to previous button
                this._focusedButtonIndex--;
                return true;
            } else {
                // At first button - exit to let parent collapse
                this._isControllingInput = false;
                return false;
            }
        }

        if (key.rightArrow) {
            if (this._focusedButtonIndex < this.buttons.length - 1) {
                // Move to next button
                this._focusedButtonIndex++;
                return true;
            }
            // At last button - stay in place (consume input but don't change)
            return true;
        }

        if (key.escape) {
            // Exit to let parent handle collapse
            this._isControllingInput = false;
            return false;
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