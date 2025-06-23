/**
 * Modern TUI Visual Design System
 * Based on updated tui-visual-design.md - beautiful, modern, intuitive
 */

export const modernTheme = {
    // Color Palette (from design doc)
    colors: {
        // Primary Colors
        primaryBlue: '#3B82F6',     // Action items, primary buttons
        secondaryBlue: '#1E40AF',   // Secondary elements, borders  
        purple: '#780b7c',          // Highlights, selection states
        
        // Status Colors
        successGreen: '#10B981',    // Completed states, confirmations
        warningOrange: '#F59E0B',   // Warnings, embedding recreations
        errorRed: '#EF4444',        // Errors, validation failures
        infoPurple: '#8B5CF6',      // Information, help text
        
        // Neutral Colors (refined)
        textPrimary: '#F8FAFC',     // Primary text - softer white
        textSecondary: '#94A3B8',   // Secondary text - warmer gray
        textMuted: '#64748B',       // Muted text - subtle
        background: '#0F172A',      // Deep dark background
        surface: '#1E293B',         // Card/container surfaces
        surfaceHover: '#334155',    // Hover states
        border: '#475569',          // Default borders
        borderFocus: '#3B82F6',     // Focus borders
        
        // Special Effects
        glow: '#60A5FA',           // Subtle glow effects
        accent: '#E879F9',         // Accent highlights
        selection: '#7C3AED',      // Selection background
    },
    
    // Modern Spacing System (based on 4px grid)
    spacing: {
        xs: 1,    // 4px
        sm: 2,    // 8px  
        md: 4,    // 16px
        lg: 6,    // 24px
        xl: 8,    // 32px
        xxl: 12,  // 48px
    },
    
    // Typography Scale
    typography: {
        title: {
            size: 'large',
            weight: 'bold',
            color: 'textPrimary'
        },
        subtitle: {
            size: 'medium', 
            weight: 'normal',
            color: 'textSecondary'
        },
        body: {
            size: 'normal',
            weight: 'normal', 
            color: 'textPrimary'
        },
        caption: {
            size: 'small',
            weight: 'normal',
            color: 'textMuted'
        },
        code: {
            size: 'normal',
            weight: 'normal',
            color: 'accent',
            family: 'monospace'
        }
    },
    
    // Modern UI Symbols (beautiful Unicode)
    symbols: {
        // Navigation & Selection
        selected: '▶',         // Current selection
        unselected: '○',       // Unselected items  
        expanded: '▼',         // Expanded items
        collapsed: '▶',        // Collapsed items
        
        // Status Indicators
        success: '✓',          // Success/complete
        error: '✗',            // Error/failed
        warning: '⚠',          // Warning
        info: 'ⓘ',             // Information
        loading: '⋯',          // Loading state
        
        // Borders (rounded style)
        border: {
            topLeft: '╭',
            topRight: '╮',
            bottomLeft: '╰', 
            bottomRight: '╯',
            horizontal: '─',
            vertical: '│'
        },
        
        // Special Characters
        bullet: '•',           // List bullets
        separator: '│',        // Vertical separator
        arrow: '→',           // Direction indicator
        star: '★',            // Favorites/important
        diamond: '◆',         // Special markers
    },
    
    // Animation Timing (for future use)
    animation: {
        fast: 100,    // Quick feedback
        normal: 200,  // Standard transitions
        slow: 300,    // Smooth animations
        pulse: 1000,  // Breathing effects
    },
    
    // Component Styles
    components: {
        container: {
            border: {
                type: 'line',
                style: {
                    fg: 'border'
                }
            },
            focus: {
                border: {
                    style: {
                        fg: 'borderFocus'
                    }
                }
            }
        },
        
        button: {
            default: {
                bg: 'surface',
                fg: 'textPrimary',
                border: 'border'
            },
            hover: {
                bg: 'surfaceHover', 
                fg: 'textPrimary',
                border: 'borderFocus'
            },
            active: {
                bg: 'purple',
                fg: 'textPrimary',
                border: 'purple'
            }
        },
        
        text: {
            selection: {
                bg: 'selection',
                fg: 'textPrimary'
            },
            highlight: {
                bg: 'purple',
                fg: 'textPrimary'
            },
            muted: {
                fg: 'textMuted'
            }
        }
    }
};

// Helper functions for applying styles
export function getSelectionStyle(isSelected: boolean, isActive: boolean) {
    if (isActive) {
        return {
            bg: modernTheme.colors.purple,
            fg: modernTheme.colors.textPrimary,
            bold: true
        };
    } else if (isSelected) {
        return {
            bg: modernTheme.colors.selection,
            fg: modernTheme.colors.textPrimary
        };
    } else {
        return {
            fg: modernTheme.colors.textSecondary
        };
    }
}

export function getBorderStyle(isFocused: boolean) {
    return {
        type: 'line' as const,
        fg: isFocused ? modernTheme.colors.borderFocus : modernTheme.colors.border
    };
}

export function formatWithStyle(text: string, style: 'selection' | 'highlight' | 'muted' | 'success' | 'error' | 'warning'): string {
    const styles = {
        selection: `{${modernTheme.colors.selection}-bg}{${modernTheme.colors.textPrimary}-fg}${text}{/}`,
        highlight: `{${modernTheme.colors.purple}-bg}{${modernTheme.colors.textPrimary}-fg}${text}{/}`,
        muted: `{${modernTheme.colors.textMuted}-fg}${text}{/}`,
        success: `{${modernTheme.colors.successGreen}-fg}${text}{/}`,
        error: `{${modernTheme.colors.errorRed}-fg}${text}{/}`,
        warning: `{${modernTheme.colors.warningOrange}-fg}${text}{/}`
    };
    
    return styles[style];
}