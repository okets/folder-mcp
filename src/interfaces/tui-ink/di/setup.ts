import { DIContainer } from './container.js';
import { ServiceTokens } from './tokens.js';
import { ThemeService, DataService, NavigationService, TerminalService, ContentService } from '../services/index.js';
import { DebugService } from '../services/DebugService.js';
import { ConfigurationService } from '../services/ConfigurationService.js';
import { FormNavigationService } from '../services/FormNavigationService.js';
import { ValidationService } from '../services/ValidationService.js';
import { InputService } from '../services/InputService.js';
import { StatusBarService } from '../services/StatusBarService.js';

export const setupDIContainer = (): DIContainer => {
    const container = new DIContainer();
    
    // Register all services
    container.register(ServiceTokens.ThemeService, new ThemeService());
    container.register(ServiceTokens.DataService, new DataService());
    container.register(ServiceTokens.NavigationService, new NavigationService());
    container.register(ServiceTokens.TerminalService, new TerminalService());
    container.register(ServiceTokens.ContentService, new ContentService());
    container.register(ServiceTokens.DebugService, new DebugService());
    
    // Register configuration services
    container.register(ServiceTokens.ValidationService, new ValidationService());
    container.register(ServiceTokens.FormNavigationService, new FormNavigationService());
    container.register(ServiceTokens.InputService, new InputService());
    container.register(ServiceTokens.StatusBarService, new StatusBarService());
    container.register(ServiceTokens.ConfigurationService, new ConfigurationService(
        container.resolve(ServiceTokens.ValidationService)
    ));
    
    return container;
};