import React from 'react';
import { MainPanel } from '../MainPanel';
import { SecondaryPanel } from '../SecondaryPanel';
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
    return <MainPanel {...buildProps({ width, height })} />;
};

export const ThemedStatusPanel: React.FC<{
    width?: number;
    height?: number;
}> = ({ width, height }) => {
    const { theme } = useTheme();
    
    // StatusPanel already uses theme context internally
    return <SecondaryPanel {...buildProps({ width, height })} />;
};