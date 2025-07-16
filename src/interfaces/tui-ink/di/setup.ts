import { DIContainer } from './container';
import { ServiceTokens } from './tokens';
import { ThemeService, DataService, NavigationService, TerminalService, ContentService, LayoutService } from '../services/index';
import { DebugService } from '../services/DebugService';
import { ConfigurationService } from '../services/ConfigurationService';
import { FormNavigationService } from '../services/FormNavigationService';
import { ValidationService } from '../services/ValidationService';
import { InputService } from '../services/InputService';
import { StatusBarService } from '../services/StatusBarService';
import { FocusChainService } from '../services/FocusChainService';
import { InputContextService } from '../services/InputContextService';
import { RenderSlotService } from '../services/RenderSlotService';

// Global reference to the TUI DI container for class components
let globalTuiContainer: DIContainer | null = null;

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
    
    // Register focus chain services
    container.register(ServiceTokens.FocusChainService, new FocusChainService());
    container.register(ServiceTokens.InputContextService, new InputContextService(
        container.resolve(ServiceTokens.FocusChainService)
    ));
    container.register(ServiceTokens.RenderSlotService, new RenderSlotService());
    container.register(ServiceTokens.LayoutService, new LayoutService());
    
    // Store global reference for class components
    globalTuiContainer = container;
    
    return container;
};

/**
 * Get the global TUI DI container for class components that can't use hooks
 */
export const getTuiContainer = (): DIContainer => {
    if (!globalTuiContainer) {
        throw new Error('TUI DI container not initialized. Make sure setupDIContainer() was called.');
    }
    return globalTuiContainer;
};