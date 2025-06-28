/**
 * Ink-adapted theme system from modernTheme.ts
 */

import { Theme } from '../models/types.js';

export const theme: Theme = {
    colors: {
        accent: '#2f70d8',
        border: '#475569',
        borderFocus: '#3B82F6',
        textInputBorder: '#4d4d4d',
        bracketValueBright: '#6597cd', // RGB(101,151,205)
        configValuesColor: '#648151', // RGB(100,129,81) - olive green for configuration values
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

