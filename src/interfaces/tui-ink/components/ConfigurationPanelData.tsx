import React from 'react';
import { ConfigurationPanel } from './ConfigurationPanel';
import { buildProps } from '../utils/conditionalProps';

/**
 * ConfigurationPanelData - wrapper around ConfigurationPanel for compatibility
 * This component exists to provide the expected import for AppGeneric and AppResponsive
 */
export const ConfigurationPanelData: React.FC<{
    width?: number;
    height?: number;
}> = ({ width, height }) => {
    return <ConfigurationPanel {...buildProps({ width, height })} />;
};