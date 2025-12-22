import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { setCurrentTheme } from '../utils/theme.js';

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

// =============================================================================
// SHARED ICONS AND SYMBOLS
// =============================================================================

const defaultIcons = {
    active: '▶',
    inactive: '·',
    expanded: '▼',
    collapsed: '▶',
    success: '✓',
    warning: '⚠',
    error: '✗',
    info: 'ℹ'
};

const defaultSymbols = {
    border: {
        topLeft: '╭',
        topRight: '╮',
        bottomLeft: '╰',
        bottomRight: '╯',
        horizontal: '─',
        vertical: '│'
    }
};

const asciiSymbols = {
    border: {
        topLeft: '+',
        topRight: '+',
        bottomLeft: '+',
        bottomRight: '+',
        horizontal: '-',
        vertical: '|'
    }
};

// Double-line box drawing for BBS/DOS aesthetic
const doubleSymbols = {
    border: {
        topLeft: '╔',
        topRight: '╗',
        bottomLeft: '╚',
        bottomRight: '╝',
        horizontal: '═',
        vertical: '║'
    }
};

// =============================================================================
// CORE THEMES (3)
// =============================================================================

// Default theme - works well on dark terminals
export const defaultTheme: Theme = {
    name: 'Default',
    colors: {
        primary: 'blue',
        accent: 'cyan',
        success: 'green',
        warning: '#F59E0B',
        error: 'red',
        text: 'white',
        textMuted: 'gray',
        border: 'gray',
        borderFocus: '#578ce0',
        headerBorder: '#7f0fbf',
        titleText: '#af87ff'
    },
    icons: defaultIcons,
    symbols: defaultSymbols
};

// Light theme - for light terminal backgrounds (renamed from light-optimized)
export const lightTheme: Theme = {
    name: 'Light',
    colors: {
        primary: 'blueBright',
        accent: 'blueBright',
        success: 'greenBright',
        warning: '#F59E0B',
        error: 'redBright',
        text: 'black',
        textMuted: 'blackBright',
        border: 'blackBright',
        borderFocus: 'blueBright',
        headerBorder: 'rgb(169, 137, 248)',
        titleText: '#af87ff'
    },
    icons: defaultIcons,
    symbols: defaultSymbols
};

// Minimal theme - ASCII only for maximum compatibility
// Creates contrast by dimming base text (gray) so selections (whiteBright) stand out
export const minimalTheme: Theme = {
    name: 'Minimal',
    colors: {
        primary: 'whiteBright',
        accent: 'whiteBright',
        success: 'whiteBright',
        warning: 'whiteBright',
        error: 'whiteBright',
        text: 'gray',
        textMuted: 'blackBright',
        border: 'blackBright',
        borderFocus: 'white',
        headerBorder: 'blackBright',
        titleText: 'white'
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
    symbols: asciiSymbols
};

// =============================================================================
// ACCESSIBILITY THEMES (2)
// =============================================================================

// High Contrast - maximum visibility for visually impaired users
export const highContrastTheme: Theme = {
    name: 'High Contrast',
    colors: {
        primary: 'yellow',
        accent: 'yellowBright',      // Selection
        success: 'greenBright',      // Completed
        warning: 'yellow',           // Standard warning color for accessibility
        error: 'redBright',
        text: 'whiteBright',
        textMuted: 'white',
        border: 'whiteBright',
        borderFocus: 'yellowBright',
        headerBorder: 'yellowBright',
        titleText: 'yellowBright'
    },
    icons: defaultIcons,
    symbols: defaultSymbols
};

// Colorblind - deuteranopia-safe (no red/green differentiation)
export const colorblindTheme: Theme = {
    name: 'Colorblind',
    colors: {
        primary: 'blue',
        accent: 'cyan',
        success: 'blueBright',      // Blue instead of green
        warning: 'yellow',
        error: '#FF8C00',           // Orange instead of red
        text: 'white',
        textMuted: 'gray',
        border: 'gray',
        borderFocus: 'cyan',
        headerBorder: 'blue',
        titleText: 'cyanBright'
    },
    icons: defaultIcons,
    symbols: defaultSymbols
};

// =============================================================================
// NATURE THEMES (3)
// =============================================================================

// Ocean - blue/cyan oceanic palette
export const oceanTheme: Theme = {
    name: 'Ocean',
    colors: {
        primary: '#0077B6',
        accent: '#00B4D8',
        success: '#48CAE4',
        warning: '#F59E0B',
        error: '#FF6B6B',
        text: 'white',
        textMuted: '#90E0EF',
        border: '#023E8A',
        borderFocus: '#00B4D8',
        headerBorder: '#0077B6',
        titleText: '#48CAE4'
    },
    icons: defaultIcons,
    symbols: defaultSymbols
};

// Forest - green nature palette
export const forestTheme: Theme = {
    name: 'Forest',
    colors: {
        primary: '#2D6A4F',
        accent: '#40916C',
        success: '#52B788',
        warning: '#F59E0B',
        error: '#E63946',
        text: 'white',
        textMuted: '#95D5B2',
        border: '#1B4332',
        borderFocus: '#40916C',
        headerBorder: '#2D6A4F',
        titleText: '#52B788'
    },
    icons: defaultIcons,
    symbols: defaultSymbols
};

// Sunset - warm orange/red palette
export const sunsetTheme: Theme = {
    name: 'Sunset',
    colors: {
        primary: '#E85D04',
        accent: '#F48C06',           // Orange - selection color
        success: '#90BE6D',          // Olive green - completed
        warning: '#FFD60A',          // Bright yellow - distinct from orange accent
        error: '#D00000',
        text: 'white',
        textMuted: '#FFC09F',        // Pale peach - muted but readable
        border: '#9D0208',
        borderFocus: '#F48C06',
        headerBorder: '#E85D04',
        titleText: '#FFBA08'
    },
    icons: defaultIcons,
    symbols: defaultSymbols
};

// =============================================================================
// CLASSIC EDITOR THEMES (5)
// =============================================================================

// Dracula - purple/pink vampire theme
export const draculaTheme: Theme = {
    name: 'Dracula',
    colors: {
        primary: '#BD93F9',
        accent: '#FF79C6',
        success: '#50FA7B',
        warning: '#F1FA8C',
        error: '#FF5555',
        text: '#F8F8F2',
        textMuted: '#6272A4',
        border: '#44475A',
        borderFocus: '#BD93F9',
        headerBorder: '#FF79C6',
        titleText: '#BD93F9'
    },
    icons: defaultIcons,
    symbols: defaultSymbols
};

// Nord - cool arctic blues
export const nordTheme: Theme = {
    name: 'Nord',
    colors: {
        primary: '#5E81AC',
        accent: '#88C0D0',
        success: '#A3BE8C',
        warning: '#EBCB8B',
        error: '#BF616A',
        text: '#ECEFF4',
        textMuted: '#4C566A',
        border: '#3B4252',
        borderFocus: '#88C0D0',
        headerBorder: '#5E81AC',
        titleText: '#88C0D0'
    },
    icons: defaultIcons,
    symbols: defaultSymbols
};

// Monokai - classic editor theme
export const monokaiTheme: Theme = {
    name: 'Monokai',
    colors: {
        primary: '#F92672',
        accent: '#66D9EF',
        success: '#A6E22E',
        warning: '#E6DB74',
        error: '#F92672',
        text: '#F8F8F2',
        textMuted: '#75715E',
        border: '#49483E',
        borderFocus: '#66D9EF',
        headerBorder: '#F92672',
        titleText: '#A6E22E'
    },
    icons: defaultIcons,
    symbols: defaultSymbols
};

// Solarized Dark - Ethan Schoonover's classic
export const solarizedTheme: Theme = {
    name: 'Solarized',
    colors: {
        primary: '#268BD2',
        accent: '#2AA198',
        success: '#859900',
        warning: '#B58900',
        error: '#DC322F',
        text: '#839496',
        textMuted: '#586E75',
        border: '#073642',
        borderFocus: '#2AA198',
        headerBorder: '#268BD2',
        titleText: '#2AA198'
    },
    icons: defaultIcons,
    symbols: defaultSymbols
};

// Gruvbox - retro warm theme
export const gruvboxTheme: Theme = {
    name: 'Gruvbox',
    colors: {
        primary: '#D79921',
        accent: '#689D6A',
        success: '#98971A',
        warning: '#D79921',
        error: '#CC241D',
        text: '#EBDBB2',
        textMuted: '#928374',
        border: '#3C3836',
        borderFocus: '#D79921',
        headerBorder: '#689D6A',
        titleText: '#D79921'
    },
    icons: defaultIcons,
    symbols: defaultSymbols
};

// =============================================================================
// RETRO THEMES (3)
// =============================================================================

// 90's BBS - ANSI art bulletin board system aesthetic
// Pure RGB primary colors for that classic DOS look
export const bbsTheme: Theme = {
    name: "90's BBS",
    colors: {
        primary: '#FF0000',          // Pure Red - selections
        accent: '#FF0000',           // Pure Red - accents
        success: '#00FF00',          // Pure Green
        warning: '#FFFF00',          // Pure Yellow
        error: '#FF0000',            // Pure Red
        text: '#0000FF',             // Pure Blue - base text
        textMuted: '#00AAAA',        // EGA Cyan (3) - secondary
        border: '#00AAAA',           // EGA Cyan (3) - borders
        borderFocus: '#55FFFF',      // EGA Light Cyan (11)
        headerBorder: '#0000FF',     // Pure Blue - headers
        titleText: '#0000FF'         // Pure Blue - titles
    },
    icons: defaultIcons,
    symbols: doubleSymbols           // Double-line borders ╔═╗║╚╝
};

// CGA - Classic IBM PC 4-color palette (Mode 1: Cyan, Magenta, White)
export const cgaTheme: Theme = {
    name: 'CGA',
    colors: {
        primary: '#FF55FF',          // CGA bright magenta (hot pink)
        accent: '#55FFFF',           // CGA bright cyan
        success: '#55FFFF',          // Cyan for positive
        warning: '#FF55FF',          // Magenta for attention
        error: '#FF55FF',            // Magenta (no red in CGA mode 1)
        text: 'white',
        textMuted: '#55FFFF',        // Cyan for secondary text
        border: '#FF55FF',           // Hot pink borders
        borderFocus: '#55FFFF',      // Cyan focus
        headerBorder: '#FF55FF',     // Pink header
        titleText: '#55FFFF'         // Cyan titles
    },
    icons: defaultIcons,
    symbols: defaultSymbols
};

// Matrix - green-on-black hacker aesthetic
export const matrixTheme: Theme = {
    name: 'Matrix',
    colors: {
        primary: '#00FF00',
        accent: '#00FF00',
        success: '#00FF00',
        warning: '#ADFF2F',
        error: '#FF0000',
        text: '#00FF00',
        textMuted: '#008F00',
        border: '#003300',
        borderFocus: '#00FF00',
        headerBorder: '#00FF00',
        titleText: '#00FF00'
    },
    icons: defaultIcons,
    symbols: defaultSymbols
};

// =============================================================================
// THEME REGISTRY
// =============================================================================

export const themes = {
    // Core
    default: defaultTheme,
    light: lightTheme,
    minimal: minimalTheme,
    // Accessibility
    'high-contrast': highContrastTheme,
    colorblind: colorblindTheme,
    // Nature
    ocean: oceanTheme,
    forest: forestTheme,
    sunset: sunsetTheme,
    // Classic Editor
    dracula: draculaTheme,
    nord: nordTheme,
    monokai: monokaiTheme,
    solarized: solarizedTheme,
    gruvbox: gruvboxTheme,
    // Retro
    bbs: bbsTheme,
    cga: cgaTheme,
    matrix: matrixTheme
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

    // Sync theme store for class components whenever theme changes
    useEffect(() => {
        setCurrentTheme(theme);
    }, [theme]);

    const setTheme = useCallback(async (name: ThemeName) => {
        if (themes[name]) {
            // Update store FIRST so class components get new theme immediately
            // This prevents the "lag" where selection shows old theme color
            setCurrentTheme(themes[name]);
            // Then update React state
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