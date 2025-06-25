import React from 'react';
import { Text } from 'ink';
import { Panel } from './core/Panel.js';
import { ListItem } from './core/ListItem.js';
import { theme } from '../utils/theme.js';
import { useNavigationContext } from '../contexts/NavigationContext.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import { useLayoutConstraints } from '../contexts/LayoutContext.js';

// Use the same configuration items as ConfigurationPanelSimple
import { configurationItems } from './ConfigurationPanelSimple.js';

/**
 * Configuration panel implemented using generic Panel component
 * This demonstrates that the generic components work correctly
 */
export const ConfigurationPanelGeneric: React.FC<{ 
    width?: number; 
    height?: number 
}> = ({ width, height }) => {
    const navigation = useNavigationContext();
    const { columns } = useTerminalSize();
    const constraints = useLayoutConstraints();
    
    const panelWidth = width || columns - 2;
    const panelHeight = height || 20;
    
    return (
        <Panel
            title="Configuration"
            subtitle="Setup your folder-mcp server"
            focused={navigation.isConfigFocused}
            width={panelWidth}
            height={panelHeight}
            items={configurationItems}
            activeIndex={navigation.configSelectedIndex}
            showScrollbar={true}
            renderItem={(item, index, isActive) => (
                <ListItem
                    text={item.label}
                    value={item.value}
                    isActive={isActive}
                    color={isActive ? theme.colors.accent : undefined}
                />
            )}
            keyExtractor={(item) => item.id}
        />
    );
};