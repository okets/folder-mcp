import { IThemeService } from './interfaces';
import { ThemeColors, ThemeSymbols, BorderStyle } from '../models/types';
import { getCurrentTheme } from '../utils/theme';

export class ThemeService implements IThemeService {
    getColors(): ThemeColors {
        const theme = getCurrentTheme();
        return theme.colors;
    }

    getSymbols(): ThemeSymbols {
        const theme = getCurrentTheme();
        return theme.symbols;
    }

    getBorderStyle(): BorderStyle {
        const theme = getCurrentTheme();
        return theme.symbols.border;
    }
}