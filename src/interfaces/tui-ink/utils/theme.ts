/**
 * Ink-adapted theme system from modernTheme.ts
 */

import { Theme } from '../models/types.js';

export const theme: Theme = {
    colors: {
        accent: '#2f70d8',
        border: '#475569',
        borderFocus: '#3B82F6',
        textPrimary: '#F8FAFC',
        textSecondary: '#94A3B8',
        textMuted: '#64748B',
        successGreen: '#10B981',
        warningOrange: '#F59E0B',
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

// Additional theme values not in the main interface
export const themeExtras = {
    colors: {
        primaryBlue: '#3B82F6',
        secondaryBlue: '#1E40AF',
        purple: '#780b7c',
        errorRed: '#EF4444',
        infoPurple: '#8B5CF6',
        background: '#0F172A',
        surface: '#1E293B',
        surfaceHover: '#334155',
        glow: '#60A5FA',
        selection: '#2f70d8',
    },
    symbols: {
        selected: '▶',
        unselected: '○',
        expanded: '▼',
        collapsed: '▶',
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ⓘ',
        loading: '⋯',
        bullet: '•',
        separator: '│',
        arrow: '→',
    }
};

// Box drawing helper for rounded corners
export const drawBox = (width: number, height: number, title?: string) => {
    const { border } = theme.symbols;
    const lines: string[] = [];
    
    // Top line
    let topLine = border.topLeft + border.horizontal;
    if (title) {
        topLine += ` ${title} `;
        topLine += border.horizontal.repeat(Math.max(0, width - title.length - 6));
    } else {
        topLine += border.horizontal.repeat(width - 4);
    }
    topLine += border.horizontal + border.topRight;
    lines.push(topLine);
    
    // Middle lines
    for (let i = 0; i < height - 2; i++) {
        lines.push(border.vertical + ' '.repeat(width - 2) + border.vertical);
    }
    
    // Bottom line
    const bottomLine = border.bottomLeft + border.horizontal.repeat(width - 2) + border.bottomRight;
    lines.push(bottomLine);
    
    return lines;
};