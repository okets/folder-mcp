// Panel types for navigation
export type FocusedPanel = 'config' | 'status';

// Navigation state for the TUI
export interface NavigationState {
    focusedPanel: FocusedPanel;
    selectedIndices: Record<FocusedPanel, number>;
}

// Scroll state for containers
export interface ScrollState {
    offset: number;
    visibleCount: number;
    totalCount: number;
}

// Box height calculations
export interface BoxHeights {
    configHeight: number;
    statusHeight: number;
}

// Border style configuration
export interface BorderStyle {
    horizontal: string;
    vertical: string;
    topLeft: string;
    topRight: string;
    bottomLeft: string;
    bottomRight: string;
}

// Theme colors
export interface ThemeColors {
    accent: string;
    border: string;
    borderFocus: string;
    textInputBorder: string;
    bracketValueBright: string;
    configValuesColor: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    successGreen: string;
    warningOrange: string;
    dangerRed: string;
}

// Theme symbols
export interface ThemeSymbols {
    border: BorderStyle;
}

// Complete theme
export interface Theme {
    colors: ThemeColors;
    symbols: ThemeSymbols;
}

// Terminal size info
export interface TerminalSize {
    columns: number;
    rows: number;
    isNarrow: boolean;
}

// Layout constraints for content overflow management
export interface ILayoutConstraints {
    maxWidth: number;
    maxHeight: number;
    overflow: 'truncate' | 'wrap' | 'hidden';
}

// Status item for status panel
export interface StatusItem {
    text: string;
    status: string;
}