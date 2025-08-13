import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';

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
        headerBorder: string;
        titleText: string;
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

// Default theme - works well on dark terminals
export const defaultTheme: Theme = {
    name: 'default',
    colors: {
        primary: 'blue',
        accent: 'cyan',
        success: 'green',
        warning: '#F59E0B',
        error: 'red',
        text: 'white',
        textMuted: 'gray', // Match dark theme style
        border: 'gray',
        borderFocus: '#578ce0',
        headerBorder: '#7f0fbf',
        titleText: '#af87ff'
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
    },
    symbols: {
        border: {
            topLeft: '╭',
            topRight: '╮',
            bottomLeft: '╰',
            bottomRight: '╯',
            horizontal: '─',
            vertical: '│'
        }
    }
};

// Dark-optimized theme - optimized for dark terminals
export const darkOptimizedTheme: Theme = {
    name: 'dark-optimized',
    colors: {
        primary: 'blueBright',
        accent: 'cyanBright',
        success: 'greenBright',
        warning: '#F59E0B',
        error: 'redBright',
        text: 'white',
        textMuted: 'whiteBright', // Bright white for visibility
        border: 'gray',
        borderFocus: 'cyanBright',
        headerBorder: 'rgb(169, 137, 248)',
        titleText: '#af87ff'
    },
    icons: defaultTheme.icons,
    symbols: defaultTheme.symbols
};

// Light-optimized theme - optimized for light terminals
export const lightOptimizedTheme: Theme = {
    name: 'light-optimized',
    colors: {
        primary: 'blueBright',
        accent: 'blueBright',
        success: 'greenBright', 
        warning: '#F59E0B',
        error: 'redBright',
        text: 'black',
        textMuted: 'blackBright', // Dark but visible on light backgrounds
        border: 'blackBright',
        borderFocus: 'blueBright',
        headerBorder: 'rgb(169, 137, 248)',
        titleText: '#af87ff'
    },
    icons: defaultTheme.icons,
    symbols: defaultTheme.symbols
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
        borderFocus: 'white',
        headerBorder: 'gray',
        titleText: '#af87ff'
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
    },
    symbols: {
        border: {
            topLeft: '+',
            topRight: '+',
            bottomLeft: '+',
            bottomRight: '+',
            horizontal: '-',
            vertical: '|'
        }
    }
};

// Light theme - basic light colors
export const lightTheme: Theme = {
    name: 'light',
    colors: {
        primary: 'blue',
        accent: 'blue',
        success: 'green',
        warning: '#F59E0B',
        error: 'red',
        text: 'black',
        textMuted: 'gray',
        border: 'gray',
        borderFocus: 'blue',
        headerBorder: 'rgb(169, 137, 248)',
        titleText: '#af87ff'
    },
    icons: defaultTheme.icons,
    symbols: defaultTheme.symbols
};

// Dark theme - basic dark colors
export const darkTheme: Theme = {
    name: 'dark',
    colors: {
        primary: 'blue',
        accent: 'cyan',
        success: 'green',
        warning: '#F59E0B',
        error: 'red',
        text: 'white',
        textMuted: 'gray',
        border: 'gray',
        borderFocus: 'cyan',
        headerBorder: 'rgb(169, 137, 248)',
        titleText: '#af87ff'
    },
    icons: defaultTheme.icons,
    symbols: defaultTheme.symbols
};

// Auto theme - will be resolved to light or dark based on system preference
export const autoTheme: Theme = {
    name: 'auto',
    colors: {
        primary: 'blue',
        accent: 'cyan',
        success: 'green',
        warning: '#F59E0B',
        error: 'red',
        text: 'white',
        textMuted: 'whiteBright',
        border: 'gray',
        borderFocus: 'rgb(240, 240, 239)',
        headerBorder: 'rgb(169, 137, 248)',
        titleText: '#af87ff'
    },
    icons: defaultTheme.icons,
    symbols: defaultTheme.symbols
};

// Available themes
export const themes = {
    auto: autoTheme,
    light: lightTheme,
    dark: darkTheme,
    'light-optimized': lightOptimizedTheme,
    'dark-optimized': darkOptimizedTheme,
    default: defaultTheme,
    minimal: minimalTheme
} as const;

export type ThemeName = keyof typeof themes;

interface ThemeContextValue {
    theme: Theme;
    themeName: ThemeName;
    setTheme: (name: ThemeName) => Promise<void>;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ 
    children: ReactNode;
    initialTheme?: ThemeName;
    onThemeChange?: (name: ThemeName) => void | Promise<void>;
}> = ({ children, initialTheme = 'default', onThemeChange }) => {
    const [themeName, setThemeName] = useState<ThemeName>(initialTheme);
    const theme = themes[themeName];
    
    const setTheme = useCallback(async (name: ThemeName) => {
        if (themes[name]) {
            setThemeName(name);
            // Call the optional callback for persistence
            if (onThemeChange) {
                await onThemeChange(name);
            }
        }
    }, [onThemeChange]);
    
    // Memoize context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({
        theme,
        themeName,
        setTheme
    }), [themeName, setTheme]); // Use themeName instead of theme to avoid object recreation

    return (
        <ThemeContext.Provider value={contextValue}>
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