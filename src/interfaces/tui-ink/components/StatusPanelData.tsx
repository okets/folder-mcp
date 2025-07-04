import React from 'react';
import { DataPanel } from './core/DataPanel';
import { theme } from '../utils/theme';
import { useNavigationContext } from '../contexts/NavigationContext';
import { useTerminalSize } from '../hooks/useTerminalSize';
import { statusItems } from '../models/sampleData';

/**
 * Status panel reimplemented using DataPanel
 * Demonstrates migration from custom implementation to generic framework
 */
export const StatusPanelData: React.FC<{ 
    width?: number; 
    height?: number 
}> = ({ width, height }) => {
    const navigation = useNavigationContext();
    const { columns } = useTerminalSize();
    const effectiveHeight = height || 20;
    
    return (
        <DataPanel
            title="System Status"
            subtitle={effectiveHeight > 5 ? "Current state" : ''}
            focused={navigation.isStatusFocused}
            width={width || columns - 2}
            height={effectiveHeight}
            items={statusItems}
            activeIndex={navigation.statusSelectedIndex}
            renderConfig={{
                activeColor: theme.colors.accent,
                activeIcon: '▶',
                inactiveIcon: '○'
            }}
            // Custom normalizer to handle status colors
            normalizeItem={(item, index) => ({
                id: `status-${index}`,
                text: item.text,
                status: item.status,
                icon: '○',
                statusColor: item.status === '✓' ? theme.colors.successGreen :
                           item.status === '⚠' ? theme.colors.warningOrange :
                           item.status === '⋯' ? theme.colors.accent :
                           theme.colors.textPrimary,
                selectable: true
            })}
        />
    );
};