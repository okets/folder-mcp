/**
 * Dynamic Theme Store for TUI Components
 *
 * This module provides a bridge between the ThemeContext (React hooks) and
 * class components that cannot use hooks. It maintains a synchronized store
 * that ThemeContext updates and class components can read from.
 *
 * Usage for class components:
 *   import { getCurrentTheme } from '../utils/theme';
 *   // In render method:
 *   const theme = getCurrentTheme();
 */

import { Theme } from '../models/types';

// Type for ThemeContext theme (used for mapping)
interface ThemeContextTheme {
    colors: {
        accent: string;
        success: string;
        warning: string;
        error: string;
        text: string;
        textMuted: string;
        border: string;
        borderFocus: string;
    };
    symbols: {
        border: {
            topLeft: string;
            topRight: string;
            bottomLeft: string;
            bottomRight: string;
            horizontal: string;
            vertical: string;
        };
    };
}

// Default theme values (fallback when no theme is set)
const defaultThemeColors: Theme = {
    colors: {
        accent: '#2f70d8',
        border: '#475569',
        borderFocus: '#3B82F6',
        textInputBorder: '#4d4d4d',
        bracketValueBright: '#6597cd',
        configValuesColor: '#648151',
        textPrimary: '#F8FAFC',
        textSecondary: '#94A3B8',
        textMuted: '#64748B',
        successGreen: '#10B981',
        warningOrange: '#F59E0B',
        dangerRed: '#EF4444',
    },
    symbols: {
        border: {
            topLeft: '╭',
            topRight: '╮',
            bottomLeft: '╰',
            bottomRight: '╯',
            horizontal: '─',
            vertical: '│'
        },
    }
};

// Current theme store - updated by ThemeContext
let currentTheme: Theme = { ...defaultThemeColors };

/**
 * Get the current theme for use in class components.
 * This returns the theme that was last set by ThemeContext.
 *
 * @returns The current Theme object with all color and symbol definitions
 */
export function getCurrentTheme(): Theme {
    return currentTheme;
}

/**
 * Set the current theme - called by ThemeContext when theme changes.
 * This maps ThemeContext colors to the old Theme interface format.
 *
 * @param contextTheme - The theme from ThemeContext
 */
export function setCurrentTheme(contextTheme: ThemeContextTheme): void {
    currentTheme = {
        colors: {
            // Map ThemeContext colors to old interface
            accent: contextTheme.colors.accent,
            border: contextTheme.colors.border,
            borderFocus: contextTheme.colors.borderFocus,
            textInputBorder: contextTheme.colors.border, // Use border color
            bracketValueBright: contextTheme.colors.accent, // Use accent
            configValuesColor: contextTheme.colors.success, // Use success color for config values
            textPrimary: contextTheme.colors.text,
            textSecondary: contextTheme.colors.textMuted,
            textMuted: contextTheme.colors.textMuted,
            successGreen: contextTheme.colors.success,
            warningOrange: contextTheme.colors.warning,
            dangerRed: contextTheme.colors.error,
        },
        symbols: contextTheme.symbols
    };
}

/**
 * @deprecated Use getCurrentTheme() instead for dynamic theme support.
 * This static export is kept for backward compatibility during migration.
 */
export const theme: Theme = defaultThemeColors;

