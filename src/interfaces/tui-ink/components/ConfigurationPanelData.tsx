import React from 'react';
import { GenericListPanel } from './GenericListPanel';
import { createConfigurationPanelItems } from '../models/mixedSampleData';
import { useNavigationContext } from '../contexts/NavigationContext';
import { buildProps } from '../utils/conditionalProps';

/**
 * ConfigurationPanelData - wrapper around GenericListPanel for compatibility
 * This component exists to provide the expected import for AppGeneric and AppResponsive
 */
export const ConfigurationPanelData: React.FC<{
    width?: number;
    height?: number;
}> = React.memo(({ width, height }) => {
    const navigation = useNavigationContext();
    const configItems = createConfigurationPanelItems();
    
    return (
        <GenericListPanel
            title="Main"
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
});