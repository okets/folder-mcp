import { IThemeService, IDataService, INavigationService, ITerminalService, IContentService } from '../services/interfaces.js';

// Type-safe service tokens using symbols
export const ServiceTokens = {
    ThemeService: Symbol('ThemeService') as symbol & { __type: IThemeService },
    DataService: Symbol('DataService') as symbol & { __type: IDataService },
    NavigationService: Symbol('NavigationService') as symbol & { __type: INavigationService },
    TerminalService: Symbol('TerminalService') as symbol & { __type: ITerminalService },
    ContentService: Symbol('ContentService') as symbol & { __type: IContentService }
};