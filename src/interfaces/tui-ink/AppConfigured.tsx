import React from 'react';
import { AppThemed } from './AppThemed';
import { ConfigurationThemeProvider } from './contexts/ConfigurationThemeProvider';
import { IConfigManager } from '../../domain/config/IConfigManager';

interface AppConfiguredProps {
    configManager: IConfigManager;
    screenName?: string;
}

/**
 * TUI Application with configuration-aware theming
 * 
 * This component wraps the themed TUI app with a configuration-aware
 * theme provider that loads the initial theme from configuration and 
 * persists theme changes back to the configuration.
 */
export const AppConfigured: React.FC<AppConfiguredProps> = ({ 
    configManager, 
    screenName 
}) => {
    return (
        <ConfigurationThemeProvider configManager={configManager}>
            <AppThemed />
        </ConfigurationThemeProvider>
    );
};