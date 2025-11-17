import React, { useMemo, useState, useCallback } from 'react';
import { Key } from 'ink';
import { GenericListPanel } from './GenericListPanel';
import { NavigationListItem } from './core/NavigationListItem';
import { IListItem } from './core/IListItem';
import { HorizontalListRenderer } from './core/HorizontalListRenderer';
import { getVisualWidth } from '../utils/validationDisplay';
import { useNavigationContext } from '../contexts/NavigationContext';
import { findFirstNavigableIndex } from '../utils/navigationUtils';

export interface NavigationPanelProps {
    width: number;
    height: number;
    isFocused: boolean;
    orientation: 'landscape' | 'portrait';
    selectedIndex: number;
    onInput?: (input: string, key: Key) => boolean;
    mainPanelItems?: IListItem[];     // Items for main panel (to find first navigable)
    statusPanelItems?: IListItem[];   // Items for status panel (to find first navigable)
}

// Create navigation items using NavigationListItem
const createNavigationItems = (selectedIndex: number): IListItem[] => {
    return [
        new NavigationListItem(
            '○', // Single-char bullet
            'Manage Folders',
            selectedIndex === 0, // isSelected - blue when selected
            undefined, // onSelect callback
            'truncate' // overflow mode
        ),
        new NavigationListItem(
            '○',
            'Demo Controls',
            selectedIndex === 1, // isSelected - blue when selected
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
    onInput,
    mainPanelItems,
    statusPanelItems
}) => {
    const navigation = useNavigationContext();
    const items = createNavigationItems(selectedIndex);

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

    // Orientation-aware keybindings (Step 9.7)
    const customKeyBindings = effectiveOrientation === 'landscape'
        ? [
            { key: '↑↓', description: 'Navigate' },           // Vertical: up/down arrows
            { key: 'tab/→', description: 'Switch Panel' }     // Tab or right arrow switches to content
          ]
        : [
            { key: '←→', description: 'Navigate' },           // Horizontal: left/right arrows
            { key: 'tab/↓', description: 'Switch Panel' }     // Tab or down arrow switches to content
          ];

    // Callback for HorizontalListRenderer if truncation threshold exceeded
    const handleTruncationThreshold = () => {
        setForcedVertical(true);
    };

    /**
     * Helper to set the first navigable item when switching to content panel
     * Eliminates duplication between portrait DOWN arrow and landscape RIGHT arrow
     */
    const setFirstNavigableItem = useCallback(() => {
        if (navigation.navigationSelectedIndex === 0) {
            const firstNavigable = mainPanelItems
                ? findFirstNavigableIndex(mainPanelItems)
                : 0;
            navigation.setMainSelectedIndex(firstNavigable);
        } else {
            const firstNavigable = statusPanelItems
                ? findFirstNavigableIndex(statusPanelItems)
                : 0;
            navigation.setStatusSelectedIndex(firstNavigable);
        }
    }, [navigation, mainPanelItems, statusPanelItems]);

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
            // In portrait mode, down arrow switches to content panel (spatial navigation)
            if (key.downArrow) {
                // Find first navigable item when entering panel (Step 8.2)
                setFirstNavigableItem();
                navigation.switchToContent();
                return true;
            }
            // Up arrow reserved for future use
            if (key.upArrow) {
                return true; // Consume but don't use
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
            // In landscape mode, right arrow switches to content panel (spatial navigation)
            if (key.rightArrow) {
                // Find first navigable item when entering panel (Step 8.2)
                setFirstNavigableItem();
                navigation.switchToContent();
                return true;
            }
            // Left arrow reserved for future use
            if (key.leftArrow) {
                return true; // Consume but don't use
            }
        }

        // Pass through other keys to parent if provided
        return onInput ? onInput(input, key) : false;
    }, [effectiveOrientation, onInput, navigation, mainPanelItems, statusPanelItems, setFirstNavigableItem]);

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
