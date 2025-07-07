import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Theme {
    name: string;
    colors: {
        primary: string;
        accent: string;
        success: string;
        warning: string;
        error: string;
        text: string;
        textMuted: string;
        border: string;
        borderFocus: string;
        background?: string;
    };
    icons: {
        active: string;
        inactive: string;
        expanded: string;
        collapsed: string;
        success: string;
        warning: string;
        error: string;
        info: string;
    };
}

// Default theme (matches existing theme.ts)
export const defaultTheme: Theme = {
    name: 'default',
    colors: {
        primary: 'blue',
        accent: 'cyan',
        success: 'green',
        warning: 'yellow',
        error: 'red',
        text: 'white',
        textMuted: 'gray',
        border: 'gray',
        borderFocus: 'cyan'
    },
    icons: {
        active: '▶',
        inactive: '·',
        expanded: '▼',
        collapsed: '▶',
        success: '✓',
        warning: '⚠',
        error: '✗',
        info: 'ℹ'
    }
};

// Dark theme
export const darkTheme: Theme = {
    name: 'dark',
    colors: {
        primary: 'blueBright',
        accent: 'cyanBright',
        success: 'greenBright',
        warning: 'yellowBright',
        error: 'redBright',
        text: 'white',
        textMuted: 'gray',
        border: 'gray',
        borderFocus: 'cyanBright'
    },
    icons: defaultTheme.icons
};

// Light theme
export const lightTheme: Theme = {
    name: 'light',
    colors: {
        primary: 'blue',
        accent: 'blue',
        success: 'green',
        warning: 'yellow',
        error: 'red',
        text: 'black',
        textMuted: 'gray',
        border: 'gray',
        borderFocus: 'blue'
    },
    icons: defaultTheme.icons
};

// Minimal theme
export const minimalTheme: Theme = {
    name: 'minimal',
    colors: {
        primary: 'white',
        accent: 'white',
        success: 'white',
        warning: 'white',
        error: 'white',
        text: 'white',
        textMuted: 'gray',
        border: 'gray',
        borderFocus: 'white'
    },
    icons: {
        active: '>',
        inactive: ' ',
        expanded: '-',
        collapsed: '+',
        success: '[OK]',
        warning: '[!]',
        error: '[X]',
        info: '[i]'
    }
};

// Available themes
export const themes = {
    default: defaultTheme,
    dark: darkTheme,
    light: lightTheme,
    minimal: minimalTheme
} as const;

export type ThemeName = keyof typeof themes;

interface ThemeContextValue {
    theme: Theme;
    themeName: ThemeName;
    setTheme: (name: ThemeName) => void | Promise<void>;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ 
    children: ReactNode;
    initialTheme?: ThemeName;
    onThemeChange?: (name: ThemeName) => void | Promise<void>;
}> = ({ children, initialTheme = 'default', onThemeChange }) => {
    const [themeName, setThemeName] = useState<ThemeName>(initialTheme);
    const theme = themes[themeName];
    
    const setTheme = (name: ThemeName) => {
        if (themes[name]) {
            setThemeName(name);
            // Call the optional callback for persistence
            if (onThemeChange) {
                onThemeChange(name);
            }
        }
    };
    
    return (
        <ThemeContext.Provider value={{ theme, themeName, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};