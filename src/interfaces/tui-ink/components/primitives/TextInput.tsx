import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { theme } from '../../utils/theme';

interface TextInputProps {
    value: string;
    onChange: (value: string) => void;
    cursorPosition: number;
    onCursorMove: (position: number) => void;
    placeholder?: string;
    maxLength?: number;
    isActive?: boolean;
    width?: number;
    isPassword?: boolean;
}

export const TextInput: React.FC<TextInputProps> = ({
    value,
    onChange,
    cursorPosition,
    onCursorMove,
    placeholder = '',
    maxLength,
    isActive = false,
    width,
    isPassword = false
}) => {
    const [showCursor, setShowCursor] = useState(true);

    // Static cursor (no blinking to allow terminal text selection)
    useEffect(() => {
        setShowCursor(isActive);
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
        
        // Mask password values with bullets
        const maskedValue = isPassword && value ? '•'.repeat(value.length) : displayValue;

        if (!isActive || !showCursor) {
            return (
                <Text color={isPlaceholder ? theme.colors.textMuted : undefined}>
                    {maskedValue}
                </Text>
            );
        }

        // Insert cursor at position
        const before = maskedValue.slice(0, cursorPosition);
        const after = maskedValue.slice(cursorPosition);
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