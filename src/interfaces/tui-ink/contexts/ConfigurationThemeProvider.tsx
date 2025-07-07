import React, { useState, useEffect, ReactNode } from 'react';
import { ThemeProvider, ThemeName } from './ThemeContext';
import { IConfigManager } from '../../../domain/config/IConfigManager';

interface ConfigurationThemeProviderProps {
    children: ReactNode;
    configManager: IConfigManager;
}

/**
 * Theme provider that loads initial theme from configuration
 * and saves theme changes back to configuration
 */
export const ConfigurationThemeProvider: React.FC<ConfigurationThemeProviderProps> = ({ 
    children, 
    configManager 
}) => {
    const [initialTheme, setInitialTheme] = useState<ThemeName>('default');
    const [isLoaded, setIsLoaded] = useState(false);
    
    useEffect(() => {
        // Load initial theme from configuration
        const loadTheme = async () => {
            try {
                const configuredTheme = configManager.get('theme') || 'auto';
                const themeName = resolveThemeName(configuredTheme);
                setInitialTheme(themeName);
            } catch (error) {
                console.error('Failed to load theme from configuration:', error);
            } finally {
                setIsLoaded(true);
            }
        };
        
        loadTheme();
    }, [configManager]);
    
    // Don't render until theme is loaded to avoid flashing
    if (!isLoaded) {
        return null;
    }
    
    return (
        <ThemeProviderWithPersistence
            initialTheme={initialTheme}
            configManager={configManager}
        >
            {children}
        </ThemeProviderWithPersistence>
    );
};

/**
 * Enhanced theme provider that persists theme changes to configuration
 */
const ThemeProviderWithPersistence: React.FC<{
    children: ReactNode;
    initialTheme: ThemeName;
    configManager: IConfigManager;
}> = ({ children, initialTheme, configManager }) => {
    // Handle theme persistence
    const handleThemeChange = async (name: ThemeName) => {
        try {
            const configValue = name === 'default' ? 'auto' : name;
            await configManager.set('theme', configValue);
        } catch (error) {
            console.error('Failed to save theme preference:', error);
        }
    };
    
    return (
        <ThemeProvider 
            initialTheme={initialTheme}
            onThemeChange={handleThemeChange}
        >
            {children}
        </ThemeProvider>
    );
};

/**
 * Resolve theme name from configuration value
 */
function resolveThemeName(configTheme: string): ThemeName {
    switch (configTheme) {
        case 'light':
            return 'light';
        case 'dark':
            return 'dark';
        case 'auto':
        case 'default':
            return 'default';
        default:
            return 'default';
    }
}