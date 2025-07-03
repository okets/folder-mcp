import React, { useState, useCallback } from 'react';
import { Box, Text, useInput, Key } from 'ink';
import { ExpandableListItem, useExpandableItem } from '../ExpandableListItem';
import { useTheme } from '../../../contexts/ThemeContext';
import { textColorProp } from '../../../utils/conditionalProps';

export interface TextInputItemProps {
    /** Label for the input field */
    label: string;
    /** Current value */
    value: string;
    /** Called when value changes */
    onChange: (value: string) => void;
    /** Whether this item is currently selected */
    isActive: boolean;
    /** Placeholder text when empty */
    placeholder?: string;
    /** Maximum length for input */
    maxLength?: number;
    /** Width of the item */
    width?: number;
    /** Validation function */
    validate?: (value: string) => string | null;
}

/**
 * Expandable text input item using the generic ExpandableListItem
 * Provides inline editing with visual feedback
 */
export const TextInputItem: React.FC<TextInputItemProps> = ({
    label,
    value,
    onChange,
    isActive,
    placeholder,
    maxLength,
    width,
    validate
}) => {
    const { theme } = useTheme();
    const { isExpanded, expand, collapse } = useExpandableItem();
    const [editValue, setEditValue] = useState(value);
    const [cursorPosition, setCursorPosition] = useState(0);
    const [cursorVisible, setCursorVisible] = useState(true);
    const [validationError, setValidationError] = useState<string | null>(null);
    
    // Cursor blink effect
    React.useEffect(() => {
        if (isExpanded) {
            const interval = setInterval(() => {
                setCursorVisible(v => !v);
            }, 530);
            return () => clearInterval(interval);
        }
    }, [isExpanded]);
    
    // Handle input when expanded
    const handleInput = useCallback((input: string, key: Key) => {
        if (!isExpanded) return;
        
        if (key.escape) {
            // Cancel edit
            setEditValue(value);
            setCursorPosition(0);
            setValidationError(null);
            collapse();
        } else if (key.return) {
            // Save value
            if (validate) {
                const error = validate(editValue);
                if (error) {
                    setValidationError(error);
                    return;
                }
            }
            onChange(editValue);
            setValidationError(null);
            collapse();
        } else if (key.leftArrow) {
            setCursorPosition(prev => Math.max(0, prev - 1));
        } else if (key.rightArrow) {
            setCursorPosition(prev => Math.min(editValue.length, prev + 1));
        } else if (key.backspace || key.delete) {
            if (cursorPosition > 0) {
                const newValue = editValue.slice(0, cursorPosition - 1) + editValue.slice(cursorPosition);
                setEditValue(newValue);
                setCursorPosition(prev => prev - 1);
                
                // Clear validation error on edit
                if (validationError) {
                    setValidationError(null);
                }
            }
        } else if (input && (!maxLength || editValue.length < maxLength)) {
            // Add character at cursor position
            const newValue = editValue.slice(0, cursorPosition) + input + editValue.slice(cursorPosition);
            setEditValue(newValue);
            setCursorPosition(prev => prev + 1);
            
            // Clear validation error on edit
            if (validationError) {
                setValidationError(null);
            }
        }
    }, [isExpanded, editValue, cursorPosition, collapse, onChange, value, maxLength, validate, validationError]);
    
    // Handle keyboard input
    useInput((input, key) => {
        if (!isActive) return;
        
        if (!isExpanded && (key.return || key.rightArrow)) {
            // Expand on Enter or right arrow
            setEditValue(value);
            setCursorPosition(value.length);
            expand();
        } else if (isExpanded) {
            handleInput(input, key);
        }
    });
    
    // Render text with cursor
    const renderTextWithCursor = () => {
        const displayValue = editValue || placeholder || '';
        
        if (!cursorVisible) {
            return <Text {...textColorProp(theme.colors.textMuted)}>{displayValue || ' '}</Text>;
        }
        
        if (cursorPosition < displayValue.length) {
            // Cursor on character
            const before = displayValue.slice(0, cursorPosition);
            const cursorChar = displayValue[cursorPosition];
            const after = displayValue.slice(cursorPosition + 1);
            
            return (
                <Text {...textColorProp(theme.colors.textMuted)}>
                    {before}
                    <Text backgroundColor="white" {...textColorProp('black')}>{cursorChar}</Text>
                    {after}
                </Text>
            );
        } else {
            // Cursor at end
            return (
                <Text {...textColorProp(theme.colors.textMuted)}>
                    {displayValue}
                    <Text backgroundColor="white" {...textColorProp('black')}> </Text>
                </Text>
            );
        }
    };
    
    // Expanded content
    const expandedContent = (
        <Box flexDirection="column" width={width ? width - 4 : undefined}>
            {/* Input box with border */}
            <Box flexDirection="column">
                <Text {...textColorProp(theme.colors.border)}>╭{'─'.repeat(Math.max(20, editValue.length + 4))}╮</Text>
                <Box>
                    <Text {...textColorProp(theme.colors.border)}>│ </Text>
                    {renderTextWithCursor()}
                    <Text {...textColorProp(theme.colors.border)}> │</Text>
                </Box>
                <Text {...textColorProp(theme.colors.border)}>╰{'─'.repeat(Math.max(20, editValue.length + 4))}╯</Text>
            </Box>
            
            {/* Validation error */}
            {validationError && (
                <Box paddingTop={1}>
                    <Text {...textColorProp(theme.colors.error)}>⚠ {validationError}</Text>
                </Box>
            )}
            
            {/* Help text */}
            <Box paddingTop={1}>
                <Text {...textColorProp(theme.colors.textMuted)}>
                    Enter: Save | Esc: Cancel | ←→: Move cursor
                </Text>
            </Box>
        </Box>
    );
    
    // Render collapsed view
    const collapsedView = (
        <Text {...textColorProp(isActive ? theme.colors.accent : theme.colors.text)}>
            <Text>{label}: </Text>
            <Text {...textColorProp(theme.colors.primary)}>[{value}]</Text>
            <Text> {isExpanded ? '▼' : '▶'}</Text>
        </Text>
    );
    
    return (
        <ExpandableListItem
            isExpanded={isExpanded}
            onToggle={toggle}
        >
            {isExpanded ? expandedContent : collapsedView}
        </ExpandableListItem>
    );
};