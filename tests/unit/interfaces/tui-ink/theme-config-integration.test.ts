/**
 * Tests for TUI Theme Configuration Integration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigurableThemeService } from '../../../../src/interfaces/tui-ink/services/ConfigurableThemeService';
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
    let themeService: ConfigurableThemeService;
    
    beforeEach(() => {
        mockConfigManager = new MockConfigManager();
        themeService = new ConfigurableThemeService(mockConfigManager);
    });
    
    it('should load initial theme from configuration', () => {
        const themeName = themeService.getThemeName();
        expect(themeName).toBe('dark');
    });
    
    it('should handle auto theme setting', () => {
        mockConfigManager.set('theme', 'auto');
        themeService = new ConfigurableThemeService(mockConfigManager);
        
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
        await themeService.setTheme('light');
        
        expect(themeService.getThemeName()).toBe('light');
        expect(mockConfigManager.get('theme')).toBe('light');
    });
    
    it('should reload theme from configuration', async () => {
        // Change config directly
        await mockConfigManager.set('theme', 'minimal');
        
        // Reload theme from config
        await themeService.reloadFromConfig();
        
        // For now, minimal maps to default since we only support light/dark/default
        expect(themeService.getThemeName()).toBe('default');
    });
});