import React from 'react';
import { Box, Text } from 'ink';

export interface ListItemProps {
    /** The main text content of the item */
    text: string;
    /** Selection indicator (e.g., '▶', '○', '·') */
    icon?: string;
    /** Value to display on the right side */
    value?: string;
    /** Status indicator (e.g., '✓', '⚠', '✗') */
    status?: string;
    /** Whether this item is currently selected/active */
    isActive?: boolean;
    /** Color for the main text */
    color?: string;
    /** Color for the value text */
    valueColor?: string;
    /** Color for the status indicator */
    statusColor?: string;
    /** Maximum width for the item */
    maxWidth?: number;
    /** Whether the item is selectable */
    selectable?: boolean;
}

/**
 * Generic list item component for TUI lists
 * Handles consistent layout, spacing, and truncation
 */
export const ListItem: React.FC<ListItemProps> = ({
    text,
    icon = '·',
    value,
    status,
    isActive = false,
    color,
    valueColor,
    statusColor,
    maxWidth,
    selectable = true
}) => {
    // Calculate display icon based on state
    const displayIcon = isActive && selectable ? '▶' : icon;
    
    // Build the item content
    const renderContent = () => {
        // If we have a value, check if it's already formatted with brackets
        if (value !== undefined) {
            const displayValue = value.startsWith('[') && value.endsWith(']') 
                ? value 
                : `[${value}]`;
            
            return (
                <Box flexDirection="row">
                    <Text color={color}>{displayIcon} {text}: </Text>
                    <Text color={valueColor || color}>{displayValue}</Text>
                </Box>
            );
        }
        
        // Otherwise just show the text
        return <Text color={color}>{displayIcon} {text}</Text>;
    };
    
    // If we have a status, render it at the end
    if (status) {
        return (
            <Box flexDirection="row" justifyContent="space-between" width={maxWidth}>
                <Box>{renderContent()}</Box>
                <Text color={statusColor}>{status}</Text>
            </Box>
        );
    }
    
    return renderContent();
};

/**
 * Convert a simple string to ListItem props
 */
export function stringToListItemProps(
    text: string, 
    isActive: boolean = false,
    activeColor?: string
): ListItemProps {
    return {
        text,
        isActive,
        color: isActive ? activeColor : undefined
    };
}

/**
 * Convert configuration item to ListItem props
 */
export function configItemToListItemProps(
    item: { label: string; value: string },
    isActive: boolean = false,
    activeColor?: string
): ListItemProps {
    return {
        text: item.label,
        value: item.value,
        isActive,
        color: isActive ? activeColor : undefined
    };
}

/**
 * Convert status item to ListItem props
 */
export function statusItemToListItemProps(
    item: { text: string; status?: string; color?: string; statusColor?: string },
    isActive: boolean = false,
    activeColor?: string
): ListItemProps {
    return {
        text: item.text,
        status: item.status,
        isActive,
        color: isActive ? activeColor : item.color,
        statusColor: item.statusColor,
        icon: '○'
    };
}