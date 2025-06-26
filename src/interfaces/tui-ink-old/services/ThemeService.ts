import { IThemeService } from './interfaces.js';
import { ThemeColors, ThemeSymbols, BorderStyle } from '../models/types.js';
import { theme } from '../utils/theme.js';

export class ThemeService implements IThemeService {
    getColors(): ThemeColors {
        return theme.colors;
    }

    getSymbols(): ThemeSymbols {
        return theme.symbols;
    }

    getBorderStyle(): BorderStyle {
        return theme.symbols.border;
    }
}