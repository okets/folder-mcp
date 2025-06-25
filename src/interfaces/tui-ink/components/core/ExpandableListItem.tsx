import React from 'react';
import { Box, Text } from 'ink';

export interface ExpandableListItemProps {
    /** Label text for the item */
    label: string;
    /** Value to display (in collapsed state) */
    value?: string | React.ReactNode;
    /** Whether the item is currently expanded */
    isExpanded: boolean;
    /** Whether the item is currently selected/focused */
    isActive: boolean;
    /** Content to show when expanded */
    expandedContent: React.ReactNode;
    /** Icon for collapsed state */
    icon?: string;
    /** Icon for expanded state */
    expandedIcon?: string;
    /** Icon for active/selected state */
    activeIcon?: string;
    /** Color for the item text */
    color?: string;
    /** Color for the value text */
    valueColor?: string;
    /** Maximum width for the item */
    maxWidth?: number;
    /** Whether to show an expand indicator */
    showExpandIndicator?: boolean;
    /** Custom renderer for collapsed state */
    renderCollapsed?: () => React.ReactNode;
}

/**
 * Generic expandable list item component
 * Provides consistent expand/collapse behavior for all item types
 */
export const ExpandableListItem: React.FC<ExpandableListItemProps> = ({
    label,
    value,
    isExpanded,
    isActive,
    expandedContent,
    icon = '·',
    expandedIcon = '▼',
    activeIcon = '▶',
    color,
    valueColor,
    maxWidth,
    showExpandIndicator = true,
    renderCollapsed
}) => {
    // Determine which icon to show
    const displayIcon = isExpanded 
        ? expandedIcon 
        : (isActive ? activeIcon : icon);
    
    // Collapsed state
    if (!isExpanded) {
        // Use custom renderer if provided
        if (renderCollapsed) {
            return <>{renderCollapsed()}</>;
        }
        
        // Default collapsed rendering
        return (
            <Box width={maxWidth}>
                <Text color={color}>
                    {displayIcon} {label}
                    {value && (
                        <>
                            {': '}
                            {typeof value === 'string' ? (
                                <Text color={valueColor || color}>[{value}]</Text>
                            ) : (
                                value
                            )}
                        </>
                    )}
                    {showExpandIndicator && isActive && ' →'}
                </Text>
            </Box>
        );
    }
    
    // Expanded state
    return (
        <Box flexDirection="column" width={maxWidth}>
            {/* Header */}
            <Text color={color}>
                {displayIcon} {label}:
            </Text>
            
            {/* Expanded content */}
            <Box paddingLeft={2} paddingTop={0}>
                {expandedContent}
            </Box>
        </Box>
    );
};

/**
 * Hook to manage expandable item state
 */
export function useExpandableItem(defaultExpanded = false) {
    const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
    
    const toggle = React.useCallback(() => {
        setIsExpanded(prev => !prev);
    }, []);
    
    const expand = React.useCallback(() => {
        setIsExpanded(true);
    }, []);
    
    const collapse = React.useCallback(() => {
        setIsExpanded(false);
    }, []);
    
    return {
        isExpanded,
        toggle,
        expand,
        collapse
    };
}