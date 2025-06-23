/**
 * Visual Design System - Color palette and theme configuration
 * Based on docs/design/tui-visual-design.md
 */

export const theme = {
    colors: {
        // Primary Colors
        primaryBlue: '#3B82F6',      // Action items, primary buttons
        secondaryBlue: '#1E40AF',    // Secondary elements, borders
        accentCyan: '#06B6D4',       // Highlights, success states (VIBRANT CURRENT POSITION)
        
        // Status Colors  
        successGreen: '#10B981',     // Completed states, confirmations
        warningOrange: '#F59E0B',    // Warnings, embedding recreations
        errorRed: '#EF4444',         // Errors, validation failures
        infoPurple: '#8B5CF6',       // Information, help text
        
        // Focus Colors
        royalBlue: '#4169E1',        // Royal blue for focused borders
        focusRing: '#60A5FA',        // Lighter blue for focus rings
        
        // Neutral Colors
        textPrimary: '#F9FAFB',      // Primary text, labels
        textSecondary: '#9CA3AF',    // Secondary text, descriptions
        textDisabled: '#6B7280',     // Disabled elements, placeholders
        background: '#111827',       // Main background
        surface: '#1F2937',          // Card backgrounds, inputs
        border: '#374151',           // Borders, separators
        
        // Container Colors (from target UI)
        containerBorder: '#A65EF6',  // Purple border for containers
        containerFocus: '#4169E1',   // Royal blue when focused
    },
    
    // Character Library from design system
    symbols: {
        // Border Characters (Claude Code Style)
        roundedCorners: {
            topLeft: '╭',
            topRight: '╮', 
            bottomLeft: '╰',
            bottomRight: '╯',
            horizontal: '─',
            vertical: '│'
        },
        
        // Status Indicators (Modern Unicode)
        radio: {
            unselected: '◯',
            selected: '◉',
            focused: '⦿'
        },
        
        checkbox: {
            unchecked: '☐',
            checked: '☑',
            indeterminate: '☒'
        },
        
        bullets: {
            light: '◦',
            medium: '•', 
            heavy: '●',
            arrow: '→',
            current: '⏵'  // Current selection indicator
        },
        
        // Progress Elements
        progress: {
            fill: ['█', '▓', '▒', '░'],
            orbital: ['⚬', '⚭', '⚮', '⚯'],
            spinner: ['⟲', '⟳', '⌖', '⌗']
        },
        
        // Special Symbols
        success: '√',
        failure: '✗',
        warning: '⚠',
        info: '◎'
    },
    
    // Animation Timing
    animation: {
        duration: {
            instant: 0,
            fast: 150,
            medium: 300,
            slow: 500,
            loading: 1000
        },
        
        easing: {
            easeOut: 'ease-out',
            easeIn: 'ease-in', 
            ease: 'ease',
            linear: 'linear'
        }
    },
    
    // Layout Spacing (in character units)
    spacing: {
        small: 2,
        medium: 4,
        large: 8,
        component: {
            padding: 2,
            margin: 4
        },
        screen: {
            margin: 4
        }
    }
};

/**
 * Helper function to create rounded border box style
 */
export function createRoundedBorder(title?: string, focused: boolean = false): any {
    return {
        type: 'round',  // This creates rounded borders
        fg: focused ? 'blue' : 'magenta'
    };
}

/**
 * Helper function to get current position style (vibrant cyan)
 */
export function getCurrentPositionStyle(): any {
    return {
        bg: theme.colors.accentCyan,
        fg: theme.colors.textPrimary,
        bold: true
    };
}

/**
 * Helper function to get normal item style
 */
export function getNormalItemStyle(): any {
    return {
        fg: theme.colors.textSecondary
    };
}