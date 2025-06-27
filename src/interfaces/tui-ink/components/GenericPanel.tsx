import React from 'react';
import { ConfigurationPanel } from './ConfigurationPanel.js';
import { createConfigurationPanelItems, createStatusPanelItems } from '../models/mixedSampleData.js';

export interface GenericPanelProps {
    variant: 'config' | 'status';
    width?: number;
    height?: number;
    onEditModeChange?: (isInEditMode: boolean) => void;
}

export const GenericPanel: React.FC<GenericPanelProps> = ({ 
    variant, 
    width, 
    height,
    onEditModeChange 
}) => {
    // Select items based on variant
    const items = variant === 'config' 
        ? createConfigurationPanelItems() 
        : createStatusPanelItems();
    
    // Select title based on variant
    const title = variant === 'config' 
        ? 'Configuration' 
        : 'System Status';
    
    // Select subtitle based on variant and height
    const actualHeight = height || 20;
    const subtitle = variant === 'config'
        ? 'Setup your folder-mcp server'
        : actualHeight > 5 ? 'Current state' : undefined;
    
    // Navigation keys based on variant
    const selectedIndexKey = variant === 'config' 
        ? 'configSelectedIndex' as const
        : 'statusSelectedIndex' as const;
    
    const focusKey = variant === 'config' 
        ? 'isConfigFocused' as const
        : 'isStatusFocused' as const;
    
    const elementId = variant === 'config' 
        ? 'config-panel' 
        : 'status-panel';
    
    return (
        <ConfigurationPanel
            title={title}
            subtitle={subtitle}
            items={items}
            selectedIndexKey={selectedIndexKey}
            focusKey={focusKey}
            elementId={elementId}
            width={width}
            height={height}
            onEditModeChange={onEditModeChange}
        />
    );
};