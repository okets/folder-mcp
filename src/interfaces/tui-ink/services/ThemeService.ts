import { IThemeService } from './interfaces';
import { ThemeColors, ThemeSymbols, BorderStyle } from '../models/types';
import { theme } from '../utils/theme';

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