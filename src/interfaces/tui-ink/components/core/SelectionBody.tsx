import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../../utils/theme.js';
import { SelectionOption, SelectionMode, SelectionLayout } from './SelectionListItem.js';
import { getVisualWidth } from '../../utils/validationDisplay.js';
import { calculateColumnLayout, formatColumnHeader, truncateToWidth, padToWidth } from '../../utils/columnLayout.js';

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
    showDetails?: boolean; // Show detailed view with columns
    detailColumns?: string[]; // Column names to display
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
    maxLines,
    showDetails = false,
    detailColumns
}: SelectionBodyProps): React.ReactElement[] => {
    const symbols = useASCII 
        ? (mode === 'radio' ? SYMBOLS.radio.ascii : SYMBOLS.checkbox.ascii)
        : (mode === 'radio' ? SYMBOLS.radio.unicode : SYMBOLS.checkbox.unicode);
    
    const elements: React.ReactElement[] = [];
    
    if (layout === 'vertical') {
        // Vertical layout: each option on its own line
        
        // Calculate column layout if in detailed view
        let columnLayout = null;
        if (showDetails && detailColumns && detailColumns.length > 0) {
            // Check if any option has details
            const hasDetails = options.some(opt => opt.details && Object.keys(opt.details).length > 0);
            if (hasDetails) {
                // Available width for columns is panel width minus prefix
                const availableWidth = width - 4; // "│  " prefix + space
                columnLayout = calculateColumnLayout(options, detailColumns, availableWidth, true);
            }
        }
        
        if (columnLayout && columnLayout.columns.length > 0) {
            // Render header row for detailed view
            const headerPrefix = '│  ';
            let headerText = '';
            
            columnLayout.columns.forEach((col, index) => {
                const headerName = col.name === 'label' ? 'Model Name' : formatColumnHeader(col.name);
                const paddedHeader = padToWidth(truncateToWidth(headerName, col.width), col.width);
                headerText += paddedHeader;
                if (index < columnLayout.columns.length - 1) {
                    headerText += '  '; // Column spacing (2 spaces)
                }
            });
            
            elements.push(
                <Text key="header-row">
                    <Text color={headerColor}>{headerPrefix}</Text>
                    <Text>  </Text>{/* Space for selection symbol (2 spaces) */}
                    <Text color={theme.colors.textMuted} dimColor>{headerText}</Text>
                </Text>
            );
        } else {
            // Regular prompt for non-detailed view
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
            
            if (columnLayout && columnLayout.columns.length > 0) {
                // Render detailed view with columns
                let rowElements = [];
                
                // Add line prefix
                rowElements.push(
                    <Text key="prefix" color={headerColor}>{linePrefix} </Text>
                );
                
                // Add selection symbol with space
                rowElements.push(
                    <Text key="symbol" color={isFocused ? theme.colors.accent : undefined}>
                        {symbol}
                    </Text>
                );
                
                // Add space after symbol
                rowElements.push(
                    <Text key="symbol-space"> </Text>
                );
                
                // Add each column
                columnLayout.columns.forEach((col, colIndex) => {
                    let cellValue = '';
                    
                    if (col.name === 'label') {
                        cellValue = option.label;
                    } else if (option.details && option.details[col.name]) {
                        cellValue = option.details[col.name];
                    }
                    
                    // Truncate if needed
                    if (col.truncated && getVisualWidth(cellValue) > col.width) {
                        cellValue = truncateToWidth(cellValue, col.width);
                    }
                    
                    // Pad to column width
                    cellValue = padToWidth(cellValue, col.width);
                    
                    rowElements.push(
                        <Text key={`col-${colIndex}`} color={isFocused ? theme.colors.accent : undefined}>
                            {cellValue}
                        </Text>
                    );
                    
                    if (colIndex < columnLayout.columns.length - 1) {
                        rowElements.push(
                            <Text key={`space-${colIndex}`}>  </Text> // Column spacing
                        );
                    }
                });
                
                elements.push(
                    <Box key={`option-${actualIndex}`}>
                        {rowElements}
                    </Box>
                );
            } else {
                // Regular rendering for non-detailed view
                const linePrefixLength = getVisualWidth(linePrefix) + 1; // +1 for space after prefix
                const symbolLength = getVisualWidth(symbol) + 1; // +1 for space after symbol
                const fullSpaceHint = ' space';
                const shortSpaceHint = ' spc';
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
            }
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
                        {mode === 'checkbox' ? ' ' : ' '}
                    </Text>
                )}
                {focusedIndex >= 0 && (
                    <Text color={theme.colors.textMuted} bold>
                        {mode === 'checkbox' ? '←→' : '←→'}
                    </Text>
                )}
                {focusedIndex >= 0 && mode === 'checkbox' && (
                    <Text color={theme.colors.textMuted}> </Text>
                )}
                {focusedIndex >= 0 && mode === 'checkbox' && (
                    <Text color={theme.colors.textMuted} bold>space</Text>
                )}
            </Box>
        );
    }
    
    return elements;
};