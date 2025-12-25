import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Key, Text } from 'ink';
import { GenericListPanel } from './GenericListPanel';
import { SelectionListItem, SelectionOption } from './core/SelectionListItem';
import { ContainerListItem } from './core/ContainerListItem';
import { IListItem } from './core/IListItem';
import { TextListItem } from './core/TextListItem';
import { VerticalToggleRowListItem } from './core/VerticalToggleRow';
import { useTheme, ThemeName, themes } from '../contexts/ThemeContext';
import { useAnimationContext } from '../contexts/AnimationContext';
import { useFMDM } from '../contexts/FMDMContext';
import { createDefaultModelWizard, DefaultModelWizardResult } from './DefaultModelWizard';

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
    const { animationsPaused, toggleAnimations } = useAnimationContext();
    const { fmdm, setDefaultModel } = useFMDM();
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [logVerbosity, setLogVerbosity] = useState<string>('normal');

    // State for the async Default Model wizard
    const [defaultModelWizard, setDefaultModelWizard] = useState<ContainerListItem | null>(null);
    const [wizardUpdateTrigger, setWizardUpdateTrigger] = useState(0);

    // Track the current default model and languages from FMDM
    const currentDefaultModel = fmdm?.defaultModel?.modelId;
    const currentDefaultLanguages = fmdm?.defaultModel?.languages;

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

    // Handler for when Default Model wizard completes
    const handleDefaultModelComplete = useCallback(async (result: DefaultModelWizardResult) => {
        try {
            // Pass both model and languages to persist both selections
            await setDefaultModel(result.model, result.languages);
            // Force re-render to show updated state
            setWizardUpdateTrigger(prev => prev + 1);
        } catch (error) {
            // Log error for debugging but don't rethrow - continue with UI update
            console.error('[SettingsPanel] Failed to set default model:', error);
            setWizardUpdateTrigger(prev => prev + 1);
        }
    }, [setDefaultModel]);

    // Handler for when Default Model wizard is cancelled
    const handleDefaultModelCancel = useCallback(() => {
        // Wizard cancelled - nothing to do
        setWizardUpdateTrigger(prev => prev + 1);
    }, []);

    // Initialize the Default Model wizard asynchronously
    // Only recreates when the model changes, NOT when languages change
    // (to avoid infinite loop since the wizard itself updates languages)
    useEffect(() => {
        let mounted = true;

        const initWizard = async () => {
            try {
                const wizard = await createDefaultModelWizard({
                    // Use languages from FMDM if available, otherwise default to English
                    // Note: currentDefaultLanguages is captured at wizard creation time
                    initialLanguages: currentDefaultLanguages || ['en'],
                    // Only pass initialModel if defined (conditional spread for exactOptionalPropertyTypes)
                    ...(currentDefaultModel && { initialModel: currentDefaultModel }),
                    onComplete: handleDefaultModelComplete,
                    onCancel: handleDefaultModelCancel
                });

                if (mounted) {
                    setDefaultModelWizard(wizard);
                }
            } catch (error) {
                // Failed to initialize Default Model wizard
            }
        };

        initWizard();

        return () => {
            mounted = false;
        };
    // IMPORTANT: currentDefaultLanguages intentionally excluded to prevent infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [handleDefaultModelComplete, handleDefaultModelCancel, currentDefaultModel]);

    // Create items - combine static items with async wizard
    const items: IListItem[] = useMemo(() => {
        const staticItems: IListItem[] = [
            new SelectionListItem(
                '›',                    // icon
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
            // Animation toggle - placed below Theme selector
            new VerticalToggleRowListItem(
                '›',                    // icon
                'Animations',           // label
                [
                    { value: 'on', label: 'On' },
                    { value: 'off', label: 'Off' }
                ],
                animationsPaused ? 'off' : 'on',  // selectedValue
                false,                  // isActive (managed by GenericListPanel)
                (value: string) => {    // onSelectionChange
                    // Toggle if the new value differs from current state
                    if ((value === 'off') !== animationsPaused) {
                        toggleAnimations();
                    }
                }
            ),
            // Help text for animation shortcut
            new TextListItem(
                ' ',                    // no icon, just indent
                <Text dimColor>Ctrl+A to toggle animations anywhere</Text>,
                false
            ),
            new SelectionListItem(
                '›',                    // icon
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
        ];

        // Add the Default Model wizard if it's loaded
        if (defaultModelWizard) {
            staticItems.push(defaultModelWizard);
        }

        return staticItems;
    // NOTE: themeName, logVerbosity are intentionally NOT in dependencies to avoid recreating items
    // animationsPaused IS included because the toggle display needs to update when state changes
    // wizardUpdateTrigger forces re-render when wizard state changes
    }, [themeOptions, setTheme, verbosityOptions, setLogVerbosity, defaultModelWizard, wizardUpdateTrigger, animationsPaused, toggleAnimations]);

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
        // But first check if current item can handle the left arrow (e.g., toggle not at leftmost)
        if (key.leftArrow && isLandscape) {
            // Check if item has position check method (like toggle items)
            if (currentItem && 'isAtLeftmostPosition' in currentItem &&
                typeof (currentItem as any).isAtLeftmostPosition === 'function') {
                // If not at leftmost, let GenericListPanel delegate to the item
                if (!(currentItem as any).isAtLeftmostPosition()) {
                    return false; // Let item handle left arrow
                }
            }
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
