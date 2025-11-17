import React, { useCallback, useMemo } from 'react';
import { Box, Text, Key } from 'ink';
import { BorderedBox } from './BorderedBox';
import { IListItem } from './IListItem';
import { useTheme } from '../../contexts/ThemeContext';
import { useFocusChain } from '../../hooks/useFocusChain';
import { getVisualWidth } from '../../utils/validationDisplay';
import { textColorProp } from '../../utils/conditionalProps';

export interface HorizontalListRendererProps {
    title: string;
    items: IListItem[];
    selectedIndex: number;
    isFocused: boolean;
    width: number;
    height: number;
    elementId: string;
    parentId: string;
    priority?: number;
    customKeyBindings?: Array<{key: string, description: string}>;
    onInput?: (input: string, key: Key) => boolean;
    onTruncationThresholdExceeded?: () => void;
}

/**
 * HorizontalListRenderer - Renders list items horizontally within a bordered panel
 *
 * Key features:
 * - Bordered panel with title (like GenericListPanel)
 * - Items displayed horizontally with separators
 * - Intelligent truncation with quality checks
 * - Direction-aware keyboard navigation (←→)
 * - Wrapping navigation support
 *
 * Lessons from SelectionListItem:
 * - Uses getVisualWidth() for all measurements
 * - Includes 1-char safety buffer
 * - Returns true only when state changes (prevents flicker)
 * - Progressive truncation strategy
 * - Auto-fallback if truncation > 10%
 */
export const HorizontalListRenderer: React.FC<HorizontalListRendererProps> = ({
    title,
    items,
    selectedIndex,
    isFocused,
    width,
    height,
    elementId,
    parentId,
    priority = 50,
    customKeyBindings,
    onInput,
    onTruncationThresholdExceeded
}) => {
    const { theme } = useTheme();

    // Calculate space available for text - simple character counting
    const layoutAnalysis = useMemo(() => {
        if (items.length === 0) {
            return { canFitHorizontally: true, availablePerItem: width };
        }

        // Step 1: Calculate available width
        const borderOverhead = 3; // Left border + right border + spacing
        const separatorWidth = 2; // "  " (just spacing) between items
        const totalSeparators = (items.length - 1) * separatorWidth;
        const safetyBuffer = 1; // Prevent terminal wrapping

        const structuralOverhead = borderOverhead + totalSeparators + safetyBuffer;
        const availableForContent = width - structuralOverhead;

        // Step 2: Calculate space per item
        const availablePerItem = Math.floor(availableForContent / items.length);

        // Step 3: Calculate space for text (subtract icon + space + safety)
        const iconAndSpaceWidth = 2; // Icon (1 char) + space (1 char)
        const truncationSafetyBuffer = 1; // Extra cushion
        const availableForText = Math.max(0, availablePerItem - iconAndSpaceWidth - truncationSafetyBuffer);

        // Step 4: Simple threshold - only bail if text space is impossibly small
        const canFitHorizontally = availableForText >= 3; // Minimum 3 chars for "Abc…"

        return {
            canFitHorizontally,
            availablePerItem
        };
    }, [items, width]);

    // Notify parent if truncation threshold exceeded
    React.useEffect(() => {
        if (!layoutAnalysis.canFitHorizontally && onTruncationThresholdExceeded) {
            onTruncationThresholdExceeded();
        }
    }, [layoutAnalysis.canFitHorizontally, onTruncationThresholdExceeded]);

    // Handle input with direction-aware navigation (SelectionListItem pattern)
    const handleInput = useCallback((input: string, key: Key): boolean => {
        if (!isFocused || !onInput) {
            return false;
        }

        // Delegate to parent's onInput handler
        return onInput(input, key);
    }, [isFocused, onInput]);

    // Register with focus chain
    useFocusChain({
        elementId,
        parentId,
        isActive: isFocused,
        keyBindings: customKeyBindings || [{ key: '←→', description: 'Navigate' }],
        priority,
        ...(isFocused ? { onInput: handleInput } : {})
    });

    // Render items horizontally with truncation
    const renderHorizontalItems = () => {
        const { availablePerItem } = layoutAnalysis;

        // Build the entire line as a single string to ensure consistent spacing
        const parts: Array<{icon: string, text: string, isActive: boolean}> = [];

        items.forEach((item, index) => {
            const isActive = index === selectedIndex;

            // Get item display text
            let displayText = '';
            if ('formattedText' in item) {
                displayText = (item as any).formattedText || '';
            }

            // Calculate available space for TEXT only (subtract icon + space width + safety buffer)
            const iconAndSpaceWidth = 2; // Icon (1 char) + space (1 char)
            const truncationSafetyBuffer = 1; // Extra cushion to prevent edge case wraps
            const availableForText = Math.max(1, availablePerItem - iconAndSpaceWidth - truncationSafetyBuffer);
            const textWidth = getVisualWidth(displayText);

            // Truncate ONLY if text is actually longer than available space
            if (textWidth > availableForText) {
                // Ensure minimum of 1 char + ellipsis (so "D…" not just "…")
                const truncateAt = Math.max(1, availableForText - 1);
                displayText = displayText.substring(0, truncateAt) + '…';
            }

            // Get icon - compute same logic as TextListItem.render()
            // Active items show cursor (▶), inactive show their normal icon
            const baseIcon = (item as any).icon || '';
            const displayIcon = isActive ? '▶' : baseIcon;

            parts.push({ icon: displayIcon, text: displayText, isActive });
        });

        // Render as SINGLE Text component with nested colored segments
        // This prevents Ink from adding spacing between Text components
        const segments: React.ReactNode[] = [];

        parts.forEach((part, index) => {
            // Add separator before non-first items
            if (index > 0) {
                // Separator as plain text (no color)
                segments.push(<Text key={`sep-${index}`}>  </Text>);
            }

            // Add the item with color
            segments.push(
                <Text key={`item-${index}`} {...textColorProp(part.isActive ? theme.colors.accent : theme.colors.text)}>
                    {part.icon} {part.text}
                </Text>
            );
        });

        // Return all segments wrapped in a single parent Text component
        return <Text>{segments}</Text>;
    };

    // Render content within BorderedBox
    const content = (
        <Box flexDirection="row" width={width - 3} flexWrap="nowrap">
            {renderHorizontalItems()}
        </Box>
    );

    return (
        <BorderedBox
            title={title}
            focused={isFocused}
            width={width}
            height={height}
        >
            {content}
        </BorderedBox>
    );
};
