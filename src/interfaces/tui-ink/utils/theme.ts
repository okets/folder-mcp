/**
 * Ink-adapted theme system from modernTheme.ts
 */

export const theme = {
    colors: {
        // Primary Colors
        primaryBlue: '#3B82F6',
        secondaryBlue: '#1E40AF',
        purple: '#780b7c',
        
        // Status Colors
        successGreen: '#10B981',
        warningOrange: '#F59E0B',
        errorRed: '#EF4444',
        infoPurple: '#8B5CF6',
        
        // Neutral Colors
        textPrimary: '#F8FAFC',
        textSecondary: '#94A3B8',
        textMuted: '#64748B',
        background: '#0F172A',
        surface: '#1E293B',
        surfaceHover: '#334155',
        border: '#475569',
        borderFocus: '#3B82F6',
        
        // Special Effects
        glow: '#60A5FA',
        accent: '#2f70d8',
        selection: '#2f70d8',
    },
    
    symbols: {
        // Navigation & Selection
        selected: '▶',
        unselected: '○',
        expanded: '▼',
        collapsed: '▶',
        
        // Status Indicators
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ⓘ',
        loading: '⋯',
        
        // Borders
        border: {
            topLeft: '╭',
            topRight: '╮',
            bottomLeft: '╰',
            bottomRight: '╯',
            horizontal: '─',
            vertical: '│'
        },
        
        // Special Characters
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