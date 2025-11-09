import React from 'react';
import { GenericListPanel } from '../GenericListPanel';
import { createConfigurationPanelItems, createStatusPanelItems } from '../../models/mixedSampleData';
import { useNavigationContext } from '../../contexts/NavigationContext';
import { useTheme } from '../../contexts/ThemeContext';
import { buildProps } from '../../utils/conditionalProps';

/**
 * Themed wrapper components for panels
 * These components apply theme-aware styling to the base panels
 */

export const ThemedMainPanel: React.FC<{
    width?: number;
    height?: number;
}> = ({ width, height }) => {
    const { theme } = useTheme();
    const navigation = useNavigationContext();
    const configItems = createConfigurationPanelItems();
    
    return (
        <GenericListPanel
            title="Manage Folders"
            subtitle="Configuration"
            items={configItems}
            selectedIndex={navigation.mainSelectedIndex}
            isFocused={navigation.isMainFocused}
            width={width}
            height={height}
            elementId="main-panel"
            parentId="navigation"
            priority={50}
        />
    );
};

export const ThemedSecondaryPanel: React.FC<{
    width?: number;
    height?: number;
}> = ({ width, height }) => {
    const { theme } = useTheme();
    const navigation = useNavigationContext();
    const statusItems = createStatusPanelItems();
    
    return (
        <GenericListPanel
            title="Demo Controls"
            subtitle="Current state"
            items={statusItems}
            selectedIndex={navigation.statusSelectedIndex}
            isFocused={navigation.isStatusFocused}
            width={width}
            height={height}
            elementId="status-panel"
            parentId="navigation"
            priority={50}
        />
    );
};