import React from 'react';
import { ConfigurationPanel } from '../ConfigurationPanel';
import { StatusPanel } from '../StatusPanel';
import { useTheme } from '../../contexts/ThemeContext';
import { buildProps } from '../../utils/conditionalProps';

/**
 * Themed wrapper components for panels
 * These components apply theme-aware styling to the base panels
 */

export const ThemedConfigurationPanel: React.FC<{
    width?: number;
    height?: number;
}> = ({ width, height }) => {
    const { theme } = useTheme();
    
    // ConfigurationPanel already uses theme context internally
    return <ConfigurationPanel {...buildProps({ width, height })} />;
};

export const ThemedStatusPanel: React.FC<{
    width?: number;
    height?: number;
}> = ({ width, height }) => {
    const { theme } = useTheme();
    
    // StatusPanel already uses theme context internally
    return <StatusPanel {...buildProps({ width, height })} />;
};