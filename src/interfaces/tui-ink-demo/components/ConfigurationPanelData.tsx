import React from 'react';
import { MainPanel } from './MainPanel';
import { buildProps } from '../utils/conditionalProps';

/**
 * ConfigurationPanelData - wrapper around ConfigurationPanel for compatibility
 * This component exists to provide the expected import for AppGeneric and AppResponsive
 */
export const ConfigurationPanelData: React.FC<{
    width?: number;
    height?: number;
}> = ({ width, height }) => {
    return <MainPanel {...buildProps({ width, height })} />;
};