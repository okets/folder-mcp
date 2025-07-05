import { 
    IThemeService, 
    IDataService, 
    INavigationService, 
    ITerminalService, 
    IContentService, 
    IDebugService,
    IConfigurationService,
    IFormNavigationService,
    IInputService,
    IValidationService,
    IStatusBarService,
    IFocusChainService,
    IInputContextService,
    IRenderSlotService,
    ILayoutService
} from '../services/interfaces';

// Type-safe service tokens using symbols
export const ServiceTokens = {
    ThemeService: Symbol('ThemeService') as symbol & { __type: IThemeService },
    DataService: Symbol('DataService') as symbol & { __type: IDataService },
    NavigationService: Symbol('NavigationService') as symbol & { __type: INavigationService },
    TerminalService: Symbol('TerminalService') as symbol & { __type: ITerminalService },
    ContentService: Symbol('ContentService') as symbol & { __type: IContentService },
    DebugService: Symbol('DebugService') as symbol & { __type: IDebugService },
    ConfigurationService: Symbol('ConfigurationService') as symbol & { __type: IConfigurationService },
    FormNavigationService: Symbol('FormNavigationService') as symbol & { __type: IFormNavigationService },
    InputService: Symbol('InputService') as symbol & { __type: IInputService },
    ValidationService: Symbol('ValidationService') as symbol & { __type: IValidationService },
    StatusBarService: Symbol('StatusBarService') as symbol & { __type: IStatusBarService },
    FocusChainService: Symbol('FocusChainService') as symbol & { __type: IFocusChainService },
    InputContextService: Symbol('InputContextService') as symbol & { __type: IInputContextService },
    RenderSlotService: Symbol('RenderSlotService') as symbol & { __type: IRenderSlotService },
    LayoutService: Symbol('LayoutService') as symbol & { __type: ILayoutService }
};