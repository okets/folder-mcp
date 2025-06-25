import React, { useMemo } from 'react';
import { DataPanel, DataPanelProps } from './DataPanel.js';
import { useTheme } from '../../contexts/ThemeContext.js';
import { ItemRenderConfig } from '../../services/ItemRenderer.js';

/**
 * Theme-aware panel that automatically applies theme colors and icons
 */
export function ThemedPanel<T>(props: DataPanelProps<T>) {
    const { theme } = useTheme();
    
    // Create theme-aware render config
    const themedRenderConfig: ItemRenderConfig = useMemo(() => ({
        activeColor: theme.colors.accent,
        inactiveColor: theme.colors.text,
        activeIcon: theme.icons.active,
        inactiveIcon: theme.icons.inactive,
        ...props.renderConfig
    }), [theme, props.renderConfig]);
    
    return (
        <DataPanel
            {...props}
            renderConfig={themedRenderConfig}
        />
    );
}

/**
 * Themed configuration panel
 */
export const ThemedConfigurationPanel: React.FC<{
    items: any[];
    activeIndex: number;
    focused: boolean;
    width: number;
    height: number;
}> = (props) => {
    const { theme } = useTheme();
    
    return (
        <ThemedPanel
            title="Configuration"
            subtitle="Setup your folder-mcp server"
            focused={props.focused}
            width={props.width}
            height={props.height}
            items={props.items}
            activeIndex={props.activeIndex}
        />
    );
};

/**
 * Themed status panel with automatic status color mapping
 */
export const ThemedStatusPanel: React.FC<{
    items: any[];
    activeIndex: number;
    focused: boolean;
    width: number;
    height: number;
}> = (props) => {
    const { theme } = useTheme();
    
    return (
        <ThemedPanel
            title="System Status"
            subtitle="Current state"
            focused={props.focused}
            width={props.width}
            height={props.height}
            items={props.items}
            activeIndex={props.activeIndex}
            normalizeItem={(item, index) => ({
                id: `status-${index}`,
                text: item.text,
                status: item.status,
                icon: theme.icons.inactive,
                statusColor: 
                    item.status === theme.icons.success ? theme.colors.success :
                    item.status === theme.icons.warning ? theme.colors.warning :
                    item.status === theme.icons.error ? theme.colors.error :
                    item.status === '⋯' ? theme.colors.accent : 
                    undefined,
                selectable: true
            })}
        />
    );
};