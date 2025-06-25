import React from 'react';
import { DataPanel } from './core/DataPanel.js';
import { theme } from '../utils/theme.js';
import { useNavigation } from '../hooks/useNavigation.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import { configItems } from '../models/sampleData.js';

/**
 * Configuration panel using DataPanel with automatic item normalization
 * This shows the simplest way to create a panel with the new architecture
 */
export const ConfigurationPanelData: React.FC<{ 
    width?: number; 
    height?: number 
}> = ({ width, height }) => {
    const navigation = useNavigation();
    const { columns } = useTerminalSize();
    
    return (
        <DataPanel
            title="Configuration"
            subtitle="Setup your folder-mcp server"
            focused={navigation.isConfigFocused}
            width={width || columns - 2}
            height={height || 20}
            items={configItems}
            activeIndex={navigation.configSelectedIndex}
            renderConfig={{
                activeColor: theme.colors.accent,
                showValueBrackets: false // Items are already formatted
            }}
        />
    );
};