import React, { useMemo, useState, useCallback } from 'react';
import { Key } from 'ink';
import { GenericListPanel } from './GenericListPanel';
import { TextListItem } from './core/TextListItem';
import { IListItem } from './core/IListItem';
import { HorizontalListRenderer } from './core/HorizontalListRenderer';
import { getVisualWidth } from '../utils/validationDisplay';
import { useNavigationContext } from '../contexts/NavigationContext';

export interface NavigationPanelProps {
    width: number;
    height: number;
    isFocused: boolean;
    orientation: 'landscape' | 'portrait';
    selectedIndex: number;
    onInput?: (input: string, key: Key) => boolean;
}

// Create navigation items using TextListItem
const createNavigationItems = (): IListItem[] => {
    return [
        new TextListItem(
            '○', // Single-char bullet
            'Manage Folders',
            false, // isActive
            undefined, // onSelect callback
            'truncate' // overflow mode
        ),
        new TextListItem(
            '○',
            'Demo Controls',
            false,
            undefined,
            'truncate'
        )
    ];
};

export const NavigationPanel: React.FC<NavigationPanelProps> = ({
    width,
    height,
    isFocused,
    orientation,
    selectedIndex,
    onInput
}) => {
    const items = createNavigationItems();
    const navigation = useNavigationContext();

    // State to track if we need to fallback to vertical due to truncation
    const [forcedVertical, setForcedVertical] = useState(false);

    // Determine effective orientation - trust HorizontalListRenderer's truncation callback
    const effectiveOrientation = useMemo(() => {
        // If forced to vertical due to truncation, use landscape mode
        if (forcedVertical) {
            return 'landscape';
        }
        // Otherwise use the prop orientation
        return orientation;
    }, [orientation, forcedVertical]);

    // Orientation-aware keybindings
    const customKeyBindings = effectiveOrientation === 'landscape'
        ? [{ key: '↑↓', description: 'Navigate' }]      // Vertical: up/down arrows
        : [{ key: '←→', description: 'Navigate' }];     // Horizontal: left/right arrows

    // Callback for HorizontalListRenderer if truncation threshold exceeded
    const handleTruncationThreshold = () => {
        setForcedVertical(true);
    };

    // Wrap parent's onInput to translate keys for portrait mode (direction-aware navigation)
    const wrappedOnInput = useCallback((input: string, key: Key): boolean => {
        if (effectiveOrientation === 'portrait') {
            // In portrait mode, ONLY handle ←→ keys (horizontal navigation)
            if (key.leftArrow) {
                // Left arrow in portrait = navigate up (previous item)
                navigation.navigateUp();
                return true;
            }
            if (key.rightArrow) {
                // Right arrow in portrait = navigate down (next item)
                navigation.navigateDown();
                return true;
            }
            // In portrait mode, CONSUME ↑↓ keys to prevent them from falling through to global handler
            if (key.upArrow || key.downArrow) {
                return true; // Return true to consume the event and prevent fallthrough
            }
        } else {
            // In landscape mode, ONLY handle ↑↓ keys (vertical navigation)
            if (key.upArrow) {
                navigation.navigateUp();
                return true;
            }
            if (key.downArrow) {
                navigation.navigateDown();
                return true;
            }
            // In landscape mode, CONSUME ←→ keys to prevent unwanted behavior
            if (key.leftArrow || key.rightArrow) {
                return true; // Return true to consume the event
            }
        }

        // Pass through other keys to parent if provided
        return onInput ? onInput(input, key) : false;
    }, [effectiveOrientation, onInput, navigation]);

    // Render based on effective orientation
    if (effectiveOrientation === 'portrait') {
        return (
            <HorizontalListRenderer
                title="Navigation"
                items={items}
                selectedIndex={selectedIndex}
                isFocused={isFocused}
                width={width}
                height={height}
                elementId="navigation-panel"
                parentId="app"
                priority={40}
                customKeyBindings={customKeyBindings}
                onTruncationThresholdExceeded={handleTruncationThreshold}
                onInput={wrappedOnInput}
            />
        );
    }

    // Landscape mode: Use vertical list
    return (
        <GenericListPanel
            title="Navigation"
            subtitle=""
            items={items}
            selectedIndex={selectedIndex}
            isFocused={isFocused}
            width={width}
            height={height}
            elementId="navigation-panel"
            parentId="app"
            priority={40}
            customKeyBindings={customKeyBindings}
            onInput={wrappedOnInput}
        />
    );
};
