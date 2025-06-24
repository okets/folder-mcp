import { 
    ThemeColors, 
    ThemeSymbols, 
    BorderStyle,
    NavigationState,
    FocusedPanel,
    StatusItem,
    TerminalSize
} from '../models/types.js';

export interface IThemeService {
    getColors(): ThemeColors;
    getSymbols(): ThemeSymbols;
    getBorderStyle(): BorderStyle;
}

export interface INavigationService {
    getState(): NavigationState;
    switchFocus(): void;
    moveSelection(panel: FocusedPanel, direction: 'up' | 'down'): void;
    getSelectedIndex(panel: FocusedPanel): number;
}

export interface IDataService {
    getConfigItems(): string[];
    getStatusItems(): StatusItem[];
}

export interface ITerminalService {
    getSize(): TerminalSize;
    isNarrow(): boolean;
}

export interface IContentService {
    measureText(text: string): number;
    truncateText(text: string, maxWidth: number, ellipsis?: string): string;
    wrapText(text: string, maxWidth: number): string[];
}