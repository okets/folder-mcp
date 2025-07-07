/**
 * Configuration-aware Theme Service
 * 
 * Integrates theme configuration with the TUI theme system
 */

import { IThemeService } from './interfaces';
import { ThemeColors, ThemeSymbols, BorderStyle } from '../models/types';
import { IConfigManager } from '../../../domain/config/IConfigManager';
import { theme as defaultTheme } from '../utils/theme';
import { themes, ThemeName } from '../contexts/ThemeContext';

export interface ConfigurableTheme {
    colors: ThemeColors;
    symbols: ThemeSymbols;
}

export class ConfigurableThemeService implements IThemeService {
    private currentTheme: ConfigurableTheme;
    private themeName: ThemeName;
    
    constructor(
        private readonly configManager: IConfigManager
    ) {
        // Load initial theme from configuration
        const configuredTheme = this.getConfiguredTheme();
        this.themeName = this.resolveThemeName(configuredTheme);
        this.currentTheme = this.loadTheme(this.themeName);
    }
    
    /**
     * Get theme name from configuration
     */
    private getConfiguredTheme(): string {
        try {
            return this.configManager.get('theme') || 'auto';
        } catch {
            return 'auto';
        }
    }
    
    /**
     * Resolve theme name, handling 'auto' option
     */
    private resolveThemeName(configTheme: string): ThemeName {
        if (configTheme === 'auto') {
            // In a real implementation, this would detect system theme
            // For now, we'll default to 'default' theme
            return 'default';
        }
        
        // Map configuration theme names to TUI theme names
        switch (configTheme) {
            case 'light':
                return 'light';
            case 'dark':
                return 'dark';
            default:
                return 'default';
        }
    }
    
    /**
     * Load theme based on theme name
     */
    private loadTheme(themeName: ThemeName): ConfigurableTheme {
        // If we have a matching theme in ThemeContext, adapt it
        const contextTheme = themes[themeName];
        if (contextTheme) {
            return this.adaptContextTheme(contextTheme);
        }
        
        // Otherwise, return default theme
        return {
            colors: defaultTheme.colors,
            symbols: defaultTheme.symbols
        };
    }
    
    /**
     * Adapt ThemeContext theme to our theme format
     */
    private adaptContextTheme(contextTheme: typeof themes[ThemeName]): ConfigurableTheme {
        return {
            colors: {
                // Map from ThemeContext colors to our ThemeColors
                accent: contextTheme.colors.accent === 'cyan' ? '#2f70d8' : contextTheme.colors.accent,
                border: contextTheme.colors.border === 'gray' ? '#475569' : contextTheme.colors.border,
                borderFocus: contextTheme.colors.borderFocus === 'cyan' ? '#3B82F6' : contextTheme.colors.borderFocus,
                textInputBorder: '#4d4d4d',
                bracketValueBright: '#6597cd',
                configValuesColor: '#648151',
                textPrimary: contextTheme.colors.text === 'white' ? '#F8FAFC' : contextTheme.colors.text,
                textSecondary: contextTheme.colors.textMuted === 'gray' ? '#94A3B8' : contextTheme.colors.textMuted,
                textMuted: '#64748B',
                successGreen: contextTheme.colors.success === 'green' ? '#10B981' : contextTheme.colors.success,
                warningOrange: contextTheme.colors.warning === 'yellow' ? '#F59E0B' : contextTheme.colors.warning,
                dangerRed: contextTheme.colors.error === 'red' ? '#EF4444' : contextTheme.colors.error,
            },
            symbols: defaultTheme.symbols
        };
    }
    
    /**
     * Get current theme name
     */
    getThemeName(): ThemeName {
        return this.themeName;
    }
    
    /**
     * Set theme and save to configuration
     */
    async setTheme(themeName: ThemeName): Promise<void> {
        this.themeName = themeName;
        this.currentTheme = this.loadTheme(themeName);
        
        // Save to configuration
        try {
            await this.configManager.set('theme', themeName === 'default' ? 'auto' : themeName);
        } catch (error) {
            // Log error but don't throw - theme change should still work
            console.error('Failed to save theme preference:', error);
        }
    }
    
    /**
     * Reload theme from configuration
     */
    async reloadFromConfig(): Promise<void> {
        const configuredTheme = this.getConfiguredTheme();
        this.themeName = this.resolveThemeName(configuredTheme);
        this.currentTheme = this.loadTheme(this.themeName);
    }
    
    // IThemeService implementation
    getColors(): ThemeColors {
        return this.currentTheme.colors;
    }
    
    getSymbols(): ThemeSymbols {
        return this.currentTheme.symbols;
    }
    
    getBorderStyle(): BorderStyle {
        return this.currentTheme.symbols.border;
    }
}