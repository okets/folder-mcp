import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../../utils/theme.js';
import { SelectionOption, SelectionMode, SelectionLayout } from './SelectionListItem.js';
import { getVisualWidth } from '../../utils/validationDisplay.js';

export interface SelectionBodyProps {
    options: SelectionOption[];
    selectedValues: string[];
    focusedIndex: number;
    mode: SelectionMode;
    layout: SelectionLayout;
    width: number;
    headerColor?: string;
    validationError?: string | null;
    useASCII?: boolean; // For fallback symbols
    maxLines?: number; // Maximum lines available for vertical layout
}

// Symbol constants
const SYMBOLS = {
    radio: {
        unicode: { unselected: '○', selected: '◉' },
        ascii: { unselected: 'o', selected: '*' }
    },
    checkbox: {
        unicode: { unselected: '▢', selected: '▣' },
        ascii: { unselected: '-', selected: 'x' }
    }
};

export const SelectionBody = ({
    options,
    selectedValues,
    focusedIndex,
    mode,
    layout,
    width,
    headerColor,
    validationError,
    useASCII = false,
    maxLines
}: SelectionBodyProps): React.ReactElement[] => {
    const symbols = useASCII 
        ? (mode === 'radio' ? SYMBOLS.radio.ascii : SYMBOLS.checkbox.ascii)
        : (mode === 'radio' ? SYMBOLS.radio.unicode : SYMBOLS.checkbox.unicode);
    
    const elements: React.ReactElement[] = [];
    
    if (layout === 'vertical') {
        // Vertical layout: each option on its own line
        // Check if prompt fits
        const promptPrefix = '│  ';
        const promptText = `Select ${mode === 'radio' ? 'one' : 'options'}:`;
        const promptLength = getVisualWidth(promptPrefix) + getVisualWidth(promptText);
        
        if (promptLength < width) {
            // Full prompt fits
            elements.push(
                <Text key="select-prompt-v">
                    <Text color={headerColor}>{promptPrefix}</Text>
                    <Text color={theme.colors.textMuted}>{promptText}</Text>
                </Text>
            );
        } else {
            // Truncate or simplify prompt
            const availableForText = width - getVisualWidth(promptPrefix) - 1; // -1 for safety
            let displayPrompt = '';
            
            if (availableForText >= 6) { // "Select" is 6 chars
                displayPrompt = 'Select';
            } else if (availableForText >= 3) {
                displayPrompt = '...';
            }
            
            elements.push(
                <Text key="select-prompt-v">
                    <Text color={headerColor}>{promptPrefix}</Text>
                    <Text color={theme.colors.textMuted}>{displayPrompt}</Text>
                </Text>
            );
        }
        
        // Calculate visible range with scrolling
        let visibleOptions = options;
        let startIndex = 0;
        let endIndex = options.length;
        let showScrollUp = false;
        let showScrollDown = false;
        
        if (maxLines && maxLines > 1) { // Reserve 1 line for prompt
            const availableLines = maxLines - 1; // -1 for the prompt line
            
            if (options.length > availableLines) {
                // Need scrolling
                const halfVisible = Math.floor(availableLines / 2);
                
                // Center the focused item in the visible area
                startIndex = Math.max(0, focusedIndex - halfVisible);
                endIndex = Math.min(options.length, startIndex + availableLines);
                
                // Adjust if we're near the end
                if (endIndex === options.length) {
                    startIndex = Math.max(0, endIndex - availableLines);
                }
                
                visibleOptions = options.slice(startIndex, endIndex);
                showScrollUp = startIndex > 0;
                showScrollDown = endIndex < options.length;
            }
        }
        
        visibleOptions.forEach((option, visibleIndex) => {
            const actualIndex = startIndex + visibleIndex;
            const isSelected = selectedValues.includes(option.value);
            const isFocused = actualIndex === focusedIndex;
            const symbol = isSelected ? symbols.selected : symbols.unselected;
            const isFirstVisible = visibleIndex === 0;
            const isLastVisible = visibleIndex === visibleOptions.length - 1;
            
            // Determine line prefix with scroll indicators
            let linePrefix = '│ ';
            if (showScrollUp && isFirstVisible) {
                linePrefix = '│▲';
            } else if (showScrollDown && isLastVisible) {
                linePrefix = '│▼';
            } else if (!showScrollDown && isLastVisible) {
                linePrefix = '└─';
            }
            
            // Calculate available space for option label
            const linePrefixLength = getVisualWidth(linePrefix) + 1; // +1 for space after prefix
            const symbolLength = getVisualWidth(symbol) + 1; // +1 for space after symbol
            const fullSpaceHint = ' [space]';
            const shortSpaceHint = ' [␣]';
            const fullSpaceHintLength = getVisualWidth(fullSpaceHint);
            const shortSpaceHintLength = getVisualWidth(shortSpaceHint);
            
            // Calculate available space for label
            let availableForLabel = width - linePrefixLength - symbolLength - 1; // -1 for safety
            
            // Truncate label if needed FIRST
            let displayLabel = option.label;
            if (getVisualWidth(option.label) > availableForLabel && availableForLabel > 0) {
                displayLabel = option.label.substring(0, availableForLabel - 1) + '…';
            }
            
            // Only show space hint if there's room AFTER displaying the full or truncated label
            const labelLength = getVisualWidth(displayLabel);
            const remainingSpace = width - linePrefixLength - symbolLength - labelLength - 1; // -1 for safety
            
            // Determine which space hint to show (if any)
            let spaceHintToShow = '';
            if (isFocused && mode === 'checkbox') {
                if (remainingSpace >= fullSpaceHintLength) {
                    spaceHintToShow = fullSpaceHint;
                } else if (remainingSpace >= shortSpaceHintLength) {
                    spaceHintToShow = shortSpaceHint;
                }
            }
            
            elements.push(
                <Box key={`option-${actualIndex}`}>
                    <Text color={headerColor}>{linePrefix} </Text>
                    <Text color={isFocused ? theme.colors.accent : undefined}>
                        {symbol} {displayLabel}
                    </Text>
                    {spaceHintToShow && (
                        <Text color={theme.colors.textMuted}>{spaceHintToShow}</Text>
                    )}
                </Box>
            );
        });
    } else {
        // Horizontal layout: options in a single line
        // Check if prompt fits (same as vertical)
        const promptPrefix = '│  ';
        const promptText = `Select ${mode === 'radio' ? 'one' : 'options'}:`;
        const promptLength = getVisualWidth(promptPrefix) + getVisualWidth(promptText);
        
        if (promptLength < width) {
            // Full prompt fits
            elements.push(
                <Text key="select-prompt-h">
                    <Text color={headerColor}>{promptPrefix}</Text>
                    <Text color={theme.colors.textMuted}>{promptText}</Text>
                </Text>
            );
        } else {
            // Truncate or simplify prompt
            const availableForText = width - getVisualWidth(promptPrefix) - 1; // -1 for safety
            let displayPrompt = '';
            
            if (availableForText >= 6) { // "Select" is 6 chars
                displayPrompt = 'Select';
            } else if (availableForText >= 3) {
                displayPrompt = '...';
            }
            
            elements.push(
                <Text key="select-prompt-h">
                    <Text color={headerColor}>{promptPrefix}</Text>
                    <Text color={theme.colors.textMuted}>{displayPrompt}</Text>
                </Text>
            );
        }
        
        // Build horizontal options line
        const optionElements: React.ReactElement[] = [];
        options.forEach((option, index) => {
            const isSelected = selectedValues.includes(option.value);
            const isFocused = index === focusedIndex;
            const symbol = isSelected ? symbols.selected : symbols.unselected;
            
            if (index > 0) {
                optionElements.push(
                    <Text key={`sep-${index}`} color={theme.colors.textMuted}> │ </Text>
                );
            }
            
            optionElements.push(
                <Text key={`opt-${index}`} color={isFocused ? theme.colors.accent : undefined}>
                    {symbol} {option.label}
                </Text>
            );
        });
        
        elements.push(
            <Box key="options">
                <Text color={headerColor}>└─ </Text>
                <Box>{optionElements}</Box>
                {focusedIndex >= 0 && (
                    <Text color={theme.colors.textMuted}>
                        {mode === 'checkbox' ? ' [←→] [space]' : ' [←→]'}
                    </Text>
                )}
            </Box>
        );
    }
    
    return elements;
};