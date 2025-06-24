import { DIContainer } from './container.js';
import { ServiceTokens } from './tokens.js';
import { ThemeService, DataService, NavigationService, TerminalService } from '../services/index.js';

export const setupDIContainer = (): DIContainer => {
    const container = new DIContainer();
    
    // Register all services
    container.register(ServiceTokens.ThemeService, new ThemeService());
    container.register(ServiceTokens.DataService, new DataService());
    container.register(ServiceTokens.NavigationService, new NavigationService());
    container.register(ServiceTokens.TerminalService, new TerminalService());
    
    return container;
};