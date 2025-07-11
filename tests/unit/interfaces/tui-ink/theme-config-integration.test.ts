/**
 * Tests for TUI Theme Configuration Integration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigurableThemeService } from '../../../../src/interfaces/tui-ink/services/ConfigurableThemeService';
import { ConfigurationComponent } from '../../../../src/config/ConfigurationComponent';
import { IConfigManager } from '../../../../src/domain/config/IConfigManager';

// Mock config manager
class MockConfigManager implements IConfigManager {
    private config: any = { theme: 'dark' };
    
    async load(): Promise<void> {}
    
    get(path: string): any {
        if (path === 'theme') return this.config.theme;
        return undefined;
    }
    
    async set(path: string, value: any): Promise<void> {
        if (path === 'theme') {
            this.config.theme = value;
        }
    }
    
    getAll(): any {
        return this.config;
    }
    
    async validate(): Promise<any> {
        return { valid: true };
    }
    
    async getSchema(): Promise<any> {
        return {};
    }
    
    isLoaded(): boolean {
        return true;
    }
    
    async reload(): Promise<void> {}
}

describe('ConfigurableThemeService', () => {
    let mockConfigManager: MockConfigManager;
    let configurationComponent: ConfigurationComponent;
    let themeService: ConfigurableThemeService;
    
    beforeEach(() => {
        mockConfigManager = new MockConfigManager();
        configurationComponent = new ConfigurationComponent(mockConfigManager);
        themeService = new ConfigurableThemeService(configurationComponent);
    });
    
    it('should load initial theme from configuration', async () => {
        // Give the service a moment to initialize async
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const themeName = themeService.getThemeName();
        expect(themeName).toBe('dark-optimized');
    });
    
    it('should handle auto theme setting', async () => {
        await configurationComponent.set('theme', 'auto');
        themeService = new ConfigurableThemeService(configurationComponent);
        
        // Give the service a moment to initialize async
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const themeName = themeService.getThemeName();
        expect(themeName).toBe('default'); // auto resolves to default
    });
    
    it('should provide theme colors', () => {
        const colors = themeService.getColors();
        expect(colors).toBeDefined();
        expect(colors.textPrimary).toBeDefined();
        expect(colors.accent).toBeDefined();
    });
    
    it('should provide theme symbols', () => {
        const symbols = themeService.getSymbols();
        expect(symbols).toBeDefined();
        expect(symbols.border).toBeDefined();
    });
    
    it('should provide border style', () => {
        const borderStyle = themeService.getBorderStyle();
        expect(borderStyle).toBeDefined();
        expect(borderStyle.topLeft).toBeDefined();
        expect(borderStyle.horizontal).toBeDefined();
    });
    
    it('should save theme changes to configuration', async () => {
        await themeService.setTheme('light-optimized');
        
        expect(themeService.getThemeName()).toBe('light-optimized');
        expect(await configurationComponent.get('theme')).toBe('light-optimized');
    });
    
    it('should reload theme from configuration', async () => {
        // Change config directly (using a valid theme)
        await configurationComponent.set('theme', 'light');
        
        // Reload theme from config
        await themeService.reloadFromConfig();
        
        // Should have the new theme
        expect(themeService.getThemeName()).toBe('light-optimized');
    });
});