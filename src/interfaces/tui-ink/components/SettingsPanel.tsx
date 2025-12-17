import React, { useState, useMemo } from 'react';
import { Key } from 'ink';
import { GenericListPanel } from './GenericListPanel';
import { SelectionListItem, SelectionOption } from './core/SelectionListItem';
import { IListItem } from './core/IListItem';
import { useTheme, ThemeName, themes } from '../contexts/ThemeContext';

export interface SettingsPanelProps {
    width: number;
    height: number;
    isFocused: boolean;
    isLandscape: boolean;
    onSwitchToNavigation: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
    width,
    height,
    isFocused,
    isLandscape,
    onSwitchToNavigation
}) => {
    const { themeName, setTheme } = useTheme();
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Theme options - use display name from theme object
    const themeOptions: SelectionOption[] = useMemo(() =>
        (Object.keys(themes) as ThemeName[]).map(name => ({
            value: name,
            label: themes[name].name  // Use the theme's display name (e.g., "High Contrast")
        }))
    , []);

    // Create items - SelectionListItem constructor:
    // (icon, label, options, selectedValues, isActive, mode, layout, onValueChange, onPreviewChange, onCancel, ...)
    const items: IListItem[] = useMemo(() => [
        new SelectionListItem(
            '○',                    // icon
            'Theme',                // label
            themeOptions,           // options
            [themeName],            // selectedValues - current theme from context
            false,                  // isActive (managed by GenericListPanel)
            'radio',                // mode
            'vertical',             // layout - vertical as requested
            async (values: string[]) => { // onValueChange - confirm on Enter (theme already previewed)
                if (values.length > 0 && values[0]) {
                    await setTheme(values[0] as ThemeName);
                }
            },
            (values: string[]) => { // onPreviewChange - live preview while navigating
                if (values.length > 0 && values[0]) {
                    setTheme(values[0] as ThemeName);
                }
            },
            (originalValues: string[]) => { // onCancel - revert to original theme on Escape
                if (originalValues.length > 0 && originalValues[0]) {
                    setTheme(originalValues[0] as ThemeName);
                }
            }
        )
    // NOTE: themeName is intentionally NOT in dependencies!
    // SelectionListItem maintains its own internal _selectedValues state.
    // If themeName were a dependency, calling setTheme() in onPreviewChange
    // would recreate the items array with a NEW SelectionListItem instance
    // that has _isControllingInput = false, breaking navigation.
    ], [themeOptions, setTheme]);

    const customKeyBindings = isLandscape
        ? [
            { key: '↑↓', description: 'Navigate' },
            { key: 'tab/←', description: 'Switch Panel' }
          ]
        : [
            { key: '↑↓', description: 'Navigate' },
            { key: 'tab/↑', description: 'Switch Panel' }
          ];

    const handleInput = (input: string, key: Key): boolean => {
        // Check if any item is currently controlling input (expanded)
        const currentItem = items[selectedIndex];
        const itemIsControllingInput = currentItem && 'isControllingInput' in currentItem &&
            (currentItem as any).isControllingInput;

        // If item is controlling input, don't intercept - let GenericListPanel delegate to item
        if (itemIsControllingInput) {
            return false;
        }

        // Item is NOT controlling input (collapsed state)
        // Handle panel switching when at first item
        if (selectedIndex === 0) {
            // In landscape: left arrow switches to nav panel
            if (isLandscape && key.leftArrow) {
                onSwitchToNavigation();
                return true;
            }
            // In portrait: up arrow switches to nav panel
            if (!isLandscape && key.upArrow) {
                onSwitchToNavigation();
                return true;
            }
        }

        // Don't intercept other navigation keys - let GenericListPanel handle them
        return false;
    };

    return (
        <GenericListPanel
            title="Settings"
            subtitle="Preferences"
            items={items}
            selectedIndex={selectedIndex}
            isFocused={isFocused}
            width={width}
            height={height}
            elementId="settings-panel"
            parentId="navigation"
            priority={50}
            customKeyBindings={customKeyBindings}
            onInput={handleInput}
        />
    );
};
