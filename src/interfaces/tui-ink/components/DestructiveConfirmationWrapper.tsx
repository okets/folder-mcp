/**
 * DestructiveConfirmationWrapper - Shows destructive confirmation dialog
 * 
 * Uses the existing ConfirmationBody infrastructure to show ancestor scenario confirmations
 * before proceeding with folder addition that would replace existing monitored folders.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, Key } from 'ink';
import { ConfirmationBody } from './ConfirmationBody';
import { IDestructiveConfig } from '../models/configuration';
import { theme } from '../utils/theme';
import { textColorProp } from '../utils/conditionalProps';

export interface DestructiveConfirmationWrapperProps {
    destructiveConfig: IDestructiveConfig;
    currentValue: string;
    newValue: string;
    onConfirm: () => void;
    onCancel: () => void;
    maxWidth: number;
    maxLines?: number;
}

export const DestructiveConfirmationWrapper: React.FC<DestructiveConfirmationWrapperProps> = ({
    destructiveConfig,
    currentValue,
    newValue,
    onConfirm,
    onCancel,
    maxWidth,
    maxLines = 10
}) => {
    const [focusedButton, setFocusedButton] = useState<number>(0); // 0 for cancel, 1 for confirm - default to cancel (safer)
    const [scrollOffset, setScrollOffset] = useState<number>(0);
    const [cursorLine, setCursorLine] = useState<number>(0);
    const [totalLines, setTotalLines] = useState<number>(0);
    
    // Handle input for navigation and confirmation
    const handleInput = (input: string, key: Key): boolean => {
        // Tab key to switch between buttons
        if (key.tab) {
            setFocusedButton(focusedButton === 0 ? 1 : 0);
            return true;
        }
        
        // Left/right arrows to switch between buttons
        if (key.leftArrow) {
            setFocusedButton(0); // Cancel
            return true;
        }
        
        if (key.rightArrow) {
            setFocusedButton(1); // Confirm
            return true;
        }
        
        // Up/down arrows for scrolling content
        if (key.upArrow) {
            const newCursorLine = Math.max(0, cursorLine - 1);
            setCursorLine(newCursorLine);
            
            // Adjust scroll if needed
            if (newCursorLine < scrollOffset) {
                setScrollOffset(newCursorLine);
            }
            return true;
        }
        
        if (key.downArrow) {
            const maxCursorLine = Math.max(0, totalLines - 1);
            const newCursorLine = Math.min(maxCursorLine, cursorLine + 1);
            setCursorLine(newCursorLine);
            
            // Adjust scroll if needed
            const availableContentLines = maxLines - 2; // Header + button line
            if (newCursorLine >= scrollOffset + availableContentLines) {
                setScrollOffset(Math.max(0, newCursorLine - availableContentLines + 1));
            }
            return true;
        }
        
        // Enter key to confirm selection
        if (key.return) {
            if (focusedButton === 1) {
                onConfirm();
            } else {
                onCancel();
            }
            return true;
        }
        
        // Escape key to cancel
        if (key.escape) {
            onCancel();
            return true;
        }
        
        return false;
    };
    
    // Register input handler (this would need to integrate with the TUI system)
    useEffect(() => {
        // Note: In a real implementation, this would need to integrate with the TUI input system
        // For now, we'll rely on the parent component to handle input delegation
    }, []);
    
    return (
        <Box flexDirection="column" width={maxWidth}>
            {/* Header */}
            <Box marginBottom={1}>
                <Text {...textColorProp(theme.colors.accent)}>
                    🛡️ Destructive Action Confirmation
                </Text>
            </Box>
            
            {/* Confirmation Body */}
            {(() => {
                const confirmationResult = ConfirmationBody({
                    destructiveConfig,
                    currentValue,
                    newValue,
                    focusedButton,
                    maxWidth,
                    maxLines,
                    scrollOffset,
                    cursorLine
                });
                
                // Update total lines for scrolling
                if (confirmationResult.totalLines !== totalLines) {
                    setTotalLines(confirmationResult.totalLines);
                }
                
                return confirmationResult.elements;
            })()}
        </Box>
    );
};

/**
 * Hook for handling destructive confirmation workflow
 */
export const useDestructiveConfirmation = () => {
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [confirmationConfig, setConfirmationConfig] = useState<IDestructiveConfig | null>(null);
    const [currentValue, setCurrentValue] = useState<string>('');
    const [newValue, setNewValue] = useState<string>('');
    const [onConfirmCallback, setOnConfirmCallback] = useState<(() => void) | null>(null);
    const [onCancelCallback, setOnCancelCallback] = useState<(() => void) | null>(null);
    
    const showDestructiveConfirmation = (
        config: IDestructiveConfig,
        current: string,
        newVal: string,
        onConfirm: () => void,
        onCancel?: () => void
    ) => {
        setConfirmationConfig(config);
        setCurrentValue(current);
        setNewValue(newVal);
        setOnConfirmCallback(() => onConfirm);
        setOnCancelCallback(() => onCancel || (() => {}));
        setShowConfirmation(true);
    };
    
    const handleConfirm = () => {
        setShowConfirmation(false);
        if (onConfirmCallback) {
            onConfirmCallback();
        }
        resetState();
    };
    
    const handleCancel = () => {
        setShowConfirmation(false);
        if (onCancelCallback) {
            onCancelCallback();
        }
        resetState();
    };
    
    const resetState = () => {
        setConfirmationConfig(null);
        setCurrentValue('');
        setNewValue('');
        setOnConfirmCallback(null);
        setOnCancelCallback(null);
    };
    
    return {
        showConfirmation,
        confirmationConfig,
        currentValue,
        newValue,
        showDestructiveConfirmation,
        handleConfirm,
        handleCancel
    };
};