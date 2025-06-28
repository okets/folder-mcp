import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../../utils/theme.js';
import { SelectionOption, SelectionMode, SelectionLayout } from './SelectionListItem.js';

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
        elements.push(
            <Text key="select-prompt-v">
                <Text color={headerColor}>│  </Text>
                <Text color={theme.colors.textMuted}>Select {mode === 'radio' ? 'one' : 'options'}:</Text>
            </Text>
        );
        
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
            
            // Show scroll indicators
            let linePrefix = '│ ';
            if (showScrollUp && isFirstVisible) {
                linePrefix = '│▲';
            } else if (showScrollDown && isLastVisible) {
                linePrefix = '│▼';
            } else if (!showScrollDown && isLastVisible) {
                linePrefix = '└─';
            }
            
            // Calculate if there's room for [space] hint
            const optionText = `${symbol} ${option.label}`;
            const spaceHint = ' [space]';
            const linePrefixLength = linePrefix.length + 1; // +1 for space after prefix
            const totalLength = linePrefixLength + optionText.length + (isFocused && mode === 'checkbox' ? spaceHint.length : 0);
            const showSpaceHint = isFocused && mode === 'checkbox' && totalLength < width;
            
            elements.push(
                <Box key={`option-${actualIndex}`}>
                    <Text color={headerColor}>{linePrefix} </Text>
                    <Text color={isFocused ? theme.colors.accent : undefined}>
                        {symbol} {option.label}
                    </Text>
                    {showSpaceHint && (
                        <Text color={theme.colors.textMuted}>{spaceHint}</Text>
                    )}
                </Box>
            );
        });
    } else {
        // Horizontal layout: options in a single line
        elements.push(
            <Text key="select-prompt-h">
                <Text color={headerColor}>│  </Text>
                <Text color={theme.colors.textMuted}>Select {mode === 'radio' ? 'one' : 'options'}:</Text>
            </Text>
        );
        
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