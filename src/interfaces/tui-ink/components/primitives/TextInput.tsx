import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { theme } from '../../utils/theme.js';

interface TextInputProps {
    value: string;
    onChange: (value: string) => void;
    cursorPosition: number;
    onCursorMove: (position: number) => void;
    placeholder?: string;
    maxLength?: number;
    isActive?: boolean;
    width?: number;
}

export const TextInput: React.FC<TextInputProps> = ({
    value,
    onChange,
    cursorPosition,
    onCursorMove,
    placeholder = '',
    maxLength,
    isActive = false,
    width
}) => {
    const [showCursor, setShowCursor] = useState(true);

    // Cursor blink effect
    useEffect(() => {
        if (!isActive) {
            setShowCursor(false);
            return;
        }

        const interval = setInterval(() => {
            setShowCursor(prev => !prev);
        }, 500);

        return () => clearInterval(interval);
    }, [isActive]);

    // Handle keyboard input
    useInput((input, key) => {
        if (!isActive) return;

        if (key.leftArrow) {
            onCursorMove(Math.max(0, cursorPosition - 1));
        } else if (key.rightArrow) {
            onCursorMove(Math.min(value.length, cursorPosition + 1));
        } else if (key.backspace || key.delete) {
            if (cursorPosition > 0) {
                const newValue = value.slice(0, cursorPosition - 1) + value.slice(cursorPosition);
                onChange(newValue);
                onCursorMove(cursorPosition - 1);
            }
        } else if (key.return || key.escape) {
            // These should be handled by parent component
            return;
        } else if (input && !key.ctrl && !key.meta) {
            // Regular character input
            if (!maxLength || value.length < maxLength) {
                const newValue = value.slice(0, cursorPosition) + input + value.slice(cursorPosition);
                onChange(newValue);
                onCursorMove(cursorPosition + input.length);
            }
        }
    });

    // Render text with cursor
    const renderContent = () => {
        const displayValue = value || placeholder;
        const isPlaceholder = !value && placeholder;

        if (!isActive || !showCursor) {
            return (
                <Text color={isPlaceholder ? theme.colors.textMuted : undefined}>
                    {displayValue}
                </Text>
            );
        }

        // Insert cursor at position
        const before = displayValue.slice(0, cursorPosition);
        const after = displayValue.slice(cursorPosition);
        const cursorChar = after[0] || ' ';
        const afterCursor = after.slice(1);

        return (
            <Text>
                <Text color={isPlaceholder ? theme.colors.textMuted : undefined}>
                    {before}
                </Text>
                <Text backgroundColor={theme.colors.accent} color={theme.colors.textPrimary}>
                    {cursorChar}
                </Text>
                <Text color={isPlaceholder ? theme.colors.textMuted : undefined}>
                    {afterCursor}
                </Text>
            </Text>
        );
    };

    if (width) {
        return (
            <Box width={width}>
                {renderContent()}
            </Box>
        );
    }

    return renderContent();
};