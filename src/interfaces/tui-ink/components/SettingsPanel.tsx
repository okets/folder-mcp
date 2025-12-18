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
    const [logVerbosity, setLogVerbosity] = useState<string>('normal');

    // Theme options - use display name from theme object
    const themeOptions: SelectionOption[] = useMemo(() =>
        (Object.keys(themes) as ThemeName[]).map(name => ({
            value: name,
            label: themes[name].name  // Use the theme's display name (e.g., "High Contrast")
        }))
    , []);

    // Log verbosity options
    const verbosityOptions: SelectionOption[] = useMemo(() => [
        { value: 'quiet', label: 'Quiet' },
        { value: 'normal', label: 'Normal' },
        { value: 'verbose', label: 'Verbose' }
    ], []);

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
        ),
        new SelectionListItem(
            '◇',                    // icon
            'Log Verbosity',        // label
            verbosityOptions,       // options
            [logVerbosity],         // selectedValues - current verbosity from state
            false,                  // isActive (managed by GenericListPanel)
            'radio',                // mode
            'horizontal',           // layout - horizontal as requested
            async (values: string[]) => { // onValueChange - confirm selection
                if (values.length > 0 && values[0]) {
                    setLogVerbosity(values[0]);
                }
            },
            undefined,              // onPreviewChange - not needed for verbosity
            undefined               // onCancel - not needed for verbosity
        )
    // NOTE: themeName and logVerbosity are intentionally NOT in dependencies!
    // SelectionListItem maintains its own internal _selectedValues state.
    // If they were dependencies, changing values would recreate the items array
    // with NEW SelectionListItem instances that have _isControllingInput = false,
    // breaking navigation.
    ], [themeOptions, setTheme, verbosityOptions, setLogVerbosity]);

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
        // Check if current item is controlling input (expanded)
        const currentItem = items[selectedIndex];

        if (currentItem?.isControllingInput) {
            // Let the GenericListPanel delegate to the expanded item
            return false;
        }

        // Landscape mode: Left arrow switches back to navigation panel (spatial navigation)
        // This works from ANY item, not just the first one
        if (key.leftArrow && isLandscape) {
            onSwitchToNavigation();
            return true;
        }

        // Handle navigation with circular wrapping (same pattern as createNavigationInputHandler)
        if (key.downArrow) {
            const currentIndex = selectedIndex;
            // Find next navigable item
            let nextIndex = currentIndex;
            let found = false;

            // Try to find next navigable item
            for (let i = currentIndex + 1; i < items.length; i++) {
                const item = items[i];
                if (item && item.isNavigable !== false) {
                    nextIndex = i;
                    found = true;
                    break;
                }
            }

            // If not found, wrap to beginning and find first navigable (circular navigation)
            if (!found) {
                for (let i = 0; i <= currentIndex; i++) {
                    const item = items[i];
                    if (item && item.isNavigable !== false) {
                        nextIndex = i;
                        break;
                    }
                }
            }

            if (nextIndex !== currentIndex) {
                setSelectedIndex(nextIndex);
                return true;
            }
        } else if (key.upArrow) {
            const currentIndex = selectedIndex;

            // Find previous navigable item
            let prevIndex = currentIndex;
            let found = false;

            // Try to find previous navigable item
            for (let i = currentIndex - 1; i >= 0; i--) {
                const item = items[i];
                if (item && item.isNavigable !== false) {
                    prevIndex = i;
                    found = true;
                    break;
                }
            }

            // Portrait mode: If no previous navigable item found, switch to navigation panel
            if (!isLandscape && !found) {
                onSwitchToNavigation();
                return true;
            }

            // Landscape mode: If not found, wrap to end and find last navigable (circular navigation)
            if (!found) {
                for (let i = items.length - 1; i >= currentIndex; i--) {
                    const item = items[i];
                    if (item && item.isNavigable !== false) {
                        prevIndex = i;
                        break;
                    }
                }
            }

            if (prevIndex !== currentIndex) {
                setSelectedIndex(prevIndex);
                return true;
            }
        }
        return false; // Let other navigation handle it
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
