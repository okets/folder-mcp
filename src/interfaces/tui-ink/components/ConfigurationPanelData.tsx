import React from 'react';
import { ConfigurationPanel } from './ConfigurationPanel';

/**
 * ConfigurationPanelData - wrapper around ConfigurationPanel for compatibility
 * This component exists to provide the expected import for AppGeneric and AppResponsive
 */
export const ConfigurationPanelData: React.FC<{
    width?: number;
    height?: number;
}> = ({ width, height }) => {
    return <ConfigurationPanel width={width} height={height} />;
};