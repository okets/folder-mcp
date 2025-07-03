import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from '../../primitives/TextInput';
import { CollapsedSummary } from '../shared/CollapsedSummary';
import { BorderedBox } from '../../BorderedBox';
import { theme } from '../../../utils/theme';
import { useDI } from '../../../di/DIContext';
import { ServiceTokens } from '../../../di/tokens';
import type { ITextInputNode } from '../../../models/configuration';
import { textColorProp } from '../../../utils/conditionalProps';

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
    // Get the current value from ConfigurationService
    const currentNode = configService.getNode(node.id);
    const currentValue = currentNode?.value ?? node.value;
    
    const [localValue, setLocalValue] = useState(String(currentValue));
    const [cursorPosition, setCursorPosition] = useState(0);
    const [validationError, setValidationError] = useState<string | null>(null);

    // Initialize input service when expanded
    useEffect(() => {
        if (isExpanded) {
            // Always start with the current stored value when expanding
            const stringValue = String(currentValue);
            setLocalValue(stringValue);
            inputService.setCurrentText(stringValue);
            inputService.setCursorPosition(cursorPosition);
            
            // Update status bar
            statusBarService.setKeyBindings([
                { key: '←→', description: 'Move cursor' },
                { key: 'Backspace', description: 'Delete' },
                { key: 'Esc', description: 'Cancel' },
                { key: 'Enter', description: 'Save' }
            ]);
        } else {
            // Clear validation error when collapsed
            setValidationError(null);
        }
    }, [isExpanded, currentValue]);

    // Handle keyboard input
    useInput((input, key) => {
        if (!isExpanded || !isSelected) return;

        if (key.return) {
            // Validate before saving
            const validationResult = configService.validateNode(node.id, localValue);
            if (!validationResult.isValid) {
                setValidationError(validationResult.errors[0] || 'Validation failed');
                return;
            }
            
            // Save changes
            try {
                configService.updateNodeValue(node.id, localValue);
                formNavService.collapseNode();
                statusBarService.setContext('form');
                setValidationError(null);
            } catch (error) {
                setValidationError(error instanceof Error ? error.message : 'Failed to save');
            }
        } else if (key.escape) {
            // Cancel changes - reset to the current stored value
            setLocalValue(currentValue);
            setValidationError(null);
            formNavService.collapseNode();
            statusBarService.setContext('form');
        }
    });

    // Handle text changes
    const handleChange = (newValue: string) => {
        setLocalValue(newValue);
        inputService.setCurrentText(newValue);
        
        // Optional: Real-time validation (can be disabled for performance)
        if (node.validation && node.validation.length > 0) {
            const validationResult = configService.validateNode(node.id, newValue);
            setValidationError(validationResult.isValid ? null : (validationResult.errors[0] || null));
        }
    };

    const handleCursorMove = (position: number) => {
        setCursorPosition(position);
        inputService.setCursorPosition(position);
    };

    if (!isExpanded) {
        // Check if current saved value is invalid
        const savedValueValidation = node.validation && node.validation.length > 0 
            ? configService.validateNode(node.id) 
            : { isValid: true, errors: [] };
        
        return (
            <Box>
                {!savedValueValidation.isValid && (
                    <Text {...textColorProp('red')}>[!] </Text>
                )}
                <CollapsedSummary
                    label={node.label}
                    value={node.password ? '•'.repeat(String(currentValue).length) : String(currentValue)}
                    maxWidth={width - (!savedValueValidation.isValid ? 4 : 0)}
                    isSelected={isSelected}
                />
            </Box>
        );
    }

    // Expanded view - keep it simple without nested borders
    return (
        <Box flexDirection="column">
            <Box>
                <Text {...textColorProp(theme.colors.accent)}>▼ {node.label}:</Text>
            </Box>
            <Box paddingLeft={2} paddingTop={1}>
                <TextInput
                    value={localValue}
                    onChange={handleChange}
                    cursorPosition={cursorPosition}
                    onCursorMove={handleCursorMove}
                    placeholder={node.placeholder || ''}
                    {...(node.maxLength !== undefined && { maxLength: node.maxLength })}
                    isActive={true}
                    width={width - 4}
                    isPassword={node.password || false}
                />
            </Box>
            {validationError && (
                <Box paddingLeft={2} paddingTop={1}>
                    <Text {...textColorProp('red')}>
                        ✗ {validationError}
                    </Text>
                </Box>
            )}
            {node.description && (
                <Box paddingLeft={2} paddingTop={1}>
                    <Text {...textColorProp(theme.colors.textMuted)} wrap="wrap">
                        {node.description}
                    </Text>
                </Box>
            )}
        </Box>
    );
};