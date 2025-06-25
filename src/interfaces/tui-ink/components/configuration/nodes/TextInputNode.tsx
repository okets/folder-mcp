import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from '../../primitives/TextInput.js';
import { CollapsedSummary } from '../shared/CollapsedSummary.js';
import { BorderedBox } from '../../BorderedBox.js';
import { theme } from '../../../utils/theme.js';
import { useDI } from '../../../di/DIContext.js';
import { ServiceTokens } from '../../../di/tokens.js';
import type { ITextInputNode } from '../../../models/configuration.js';

interface TextInputNodeProps {
    node: ITextInputNode;
    isSelected: boolean;
    width: number;
}

export const TextInputNode: React.FC<TextInputNodeProps> = ({
    node,
    isSelected,
    width
}) => {
    const di = useDI();
    const formNavService = di.resolve(ServiceTokens.FormNavigationService);
    const inputService = di.resolve(ServiceTokens.InputService);
    const configService = di.resolve(ServiceTokens.ConfigurationService);
    const statusBarService = di.resolve(ServiceTokens.StatusBarService);
    
    const isExpanded = formNavService.isNodeExpanded(node.id);
    const [localValue, setLocalValue] = useState(node.value);
    const [cursorPosition, setCursorPosition] = useState(0);

    // Initialize input service when expanded
    useEffect(() => {
        if (isExpanded) {
            inputService.setCurrentText(localValue);
            inputService.setCursorPosition(cursorPosition);
            
            // Update status bar
            statusBarService.setKeyBindings([
                { key: '←→', description: 'Move cursor' },
                { key: 'Backspace', description: 'Delete' },
                { key: 'Esc', description: 'Cancel' },
                { key: 'Enter', description: 'Save' }
            ]);
        }
    }, [isExpanded]);

    // Handle keyboard input
    useInput((input, key) => {
        if (!isExpanded || !isSelected) return;

        if (key.return) {
            // Save changes
            configService.updateNodeValue(node.id, localValue);
            formNavService.collapseNode();
            statusBarService.setContext('form');
        } else if (key.escape) {
            // Cancel changes
            setLocalValue(node.value);
            formNavService.collapseNode();
            statusBarService.setContext('form');
        }
    });

    // Handle text changes
    const handleChange = (newValue: string) => {
        setLocalValue(newValue);
        inputService.setCurrentText(newValue);
    };

    const handleCursorMove = (position: number) => {
        setCursorPosition(position);
        inputService.setCursorPosition(position);
    };

    if (!isExpanded) {
        return (
            <CollapsedSummary
                label={node.label}
                value={node.value}
                maxWidth={width}
                isSelected={isSelected}
            />
        );
    }

    // Expanded view - keep it simple without nested borders
    return (
        <Box flexDirection="column">
            <Box>
                <Text color={theme.colors.accent}>▼ {node.label}:</Text>
            </Box>
            <Box paddingLeft={2} paddingTop={1}>
                <TextInput
                    value={localValue}
                    onChange={handleChange}
                    cursorPosition={cursorPosition}
                    onCursorMove={handleCursorMove}
                    placeholder={node.placeholder}
                    maxLength={node.maxLength}
                    isActive={true}
                    width={width - 4}
                />
            </Box>
            {node.description && (
                <Box paddingLeft={2} paddingTop={1}>
                    <Text color={theme.colors.textMuted} wrap="wrap">
                        {node.description}
                    </Text>
                </Box>
            )}
        </Box>
    );
};