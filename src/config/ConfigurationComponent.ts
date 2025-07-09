/**
 * Simple Configuration Component
 * 
 * Provides a unified interface for configuration management with validation.
 * Reuses existing TUI validation infrastructure to ensure consistency.
 */

import { IConfigManager } from '../domain/config/IConfigManager';
import { validators } from '../interfaces/tui-ink/utils/validators';
import { ValidationService } from '../interfaces/tui-ink/services/ValidationService';
import { IValidationRule } from '../interfaces/tui-ink/models/configuration';
import { existsSync } from 'fs';
import { join } from 'path';

export interface ValidationResult {
    isValid: boolean;
    error?: string;
    warning?: string;
    info?: string;
}

export class ConfigurationComponent {
    private validationService: ValidationService;
    private validationRules: Map<string, IValidationRule<any>[]> = new Map();
    
    constructor(private configManager: IConfigManager) {
        this.validationService = new ValidationService();
        this.setupValidationRules();
    }
    
    private setupValidationRules(): void {
        // Folder path validation
        const folderPathRules: IValidationRule<string>[] = [
            {
                validate: (value: string) => {
                    if (!value || value.trim() === '') {
                        return false;
                    }
                    return existsSync(value);
                },
                message: 'Folder path must exist'
            }
        ];
        
        // Embedding model validation
        const embeddingModelRules: IValidationRule<string>[] = [
            {
                validate: (value: string) => {
                    if (!value || value.trim() === '') {
                        return false;
                    }
                    // List of supported models
                    const supportedModels = [
                        'nomic-embed-text',
                        'mxbai-embed-large',
                        'all-minilm',
                        'sentence-transformers'
                    ];
                    return supportedModels.includes(value);
                },
                message: 'Must be a supported embedding model'
            }
        ];
        
        // Batch size validation (reuse TUI number validator)
        const batchSizeRules: IValidationRule<string>[] = [
            {
                validate: (value: string) => {
                    const result = validators.number(1, 1000)(value);
                    return result.isValid;
                },
                message: 'Batch size must be between 1 and 1000'
            }
        ];
        
        // Port validation (reuse TUI number validator)
        const portRules: IValidationRule<string>[] = [
            {
                validate: (value: string) => {
                    const result = validators.number(1000, 65535)(value);
                    return result.isValid;
                },
                message: 'Port must be between 1000 and 65535'
            }
        ];
        
        // Host validation (reuse TUI ipv4 validator)
        const hostRules: IValidationRule<string>[] = [
            {
                validate: (value: string) => {
                    // Allow localhost or IP addresses
                    if (value === 'localhost' || value === '127.0.0.1') {
                        return true;
                    }
                    const result = validators.ipv4(value);
                    return result.isValid;
                },
                message: 'Must be a valid IP address or localhost'
            }
        ];
        
        // Theme validation
        const themeRules: IValidationRule<string>[] = [
            {
                validate: (value: string) => {
                    const validThemes = ['auto', 'light', 'dark'];
                    return validThemes.includes(value);
                },
                message: 'Theme must be auto, light, or dark'
            }
        ];
        
        // Register validation rules
        this.validationRules.set('folders.list[].path', folderPathRules);
        this.validationRules.set('folders.defaults.embeddings.model', embeddingModelRules);
        this.validationRules.set('folders.defaults.embeddings.batchSize', batchSizeRules);
        this.validationRules.set('server.port', portRules);
        this.validationRules.set('server.host', hostRules);
        this.validationRules.set('theme', themeRules);
    }
    
    /**
     * Validate a configuration value using the same rules as TUI
     */
    async validate(path: string, value: any): Promise<ValidationResult> {
        // Handle array paths (e.g., folders.list[0].path)
        const normalizedPath = this.normalizeArrayPath(path);
        const rules = this.validationRules.get(normalizedPath);
        
        if (!rules) {
            // No validation rules for this path - it's valid
            return { isValid: true };
        }
        
        // Convert value to string for validation (same as TUI)
        const stringValue = String(value);
        
        // For TUI validators, get the error message directly from the validator
        if (normalizedPath === 'folders.defaults.embeddings.batchSize') {
            const tuiResult = validators.number(1, 1000)(stringValue);
            return tuiResult.isValid ? { isValid: true } : { isValid: false, error: tuiResult.error || 'Invalid batch size' };
        }
        
        if (normalizedPath === 'server.port') {
            const tuiResult = validators.number(1000, 65535)(stringValue);
            return tuiResult.isValid ? { isValid: true } : { isValid: false, error: tuiResult.error || 'Invalid port' };
        }
        
        if (normalizedPath === 'server.host') {
            // Special handling for host validation
            if (stringValue === 'localhost' || stringValue === '127.0.0.1') {
                return { isValid: true };
            }
            const tuiResult = validators.ipv4(stringValue);
            return tuiResult.isValid ? { isValid: true } : { isValid: false, error: tuiResult.error || 'Invalid host' };
        }
        
        // Use the same validation service as TUI for other rules
        const result = this.validationService.validate(stringValue, rules);
        
        if (result.isValid) {
            return { isValid: true };
        } else {
            return { 
                isValid: false, 
                error: result.errors[0] || 'Validation failed' // Return first error, same as TUI
            };
        }
    }
    
    /**
     * Set configuration value with validation
     */
    async set(path: string, value: any): Promise<void> {
        // Validate first
        const validationResult = await this.validate(path, value);
        if (!validationResult.isValid) {
            throw new Error(`Invalid value for ${path}: ${validationResult.error}`);
        }
        
        // Set the value
        await this.configManager.set(path, value);
    }
    
    /**
     * Get configuration value
     */
    async get(path: string): Promise<any> {
        return await this.configManager.get(path);
    }
    
    /**
     * Validate entire configuration
     */
    async validateAll(): Promise<{ isValid: boolean; errors: Array<{ path: string; error: string }> }> {
        const errors: Array<{ path: string; error: string }> = [];
        
        // Get all configuration
        const config = await this.configManager.get('');
        
        // Validate each configured path
        for (const [rulePath] of this.validationRules) {
            const value = await this.configManager.get(rulePath);
            if (value !== undefined) {
                const result = await this.validate(rulePath, value);
                if (!result.isValid && result.error) {
                    errors.push({ path: rulePath, error: result.error });
                }
            }
        }
        
        // Special case: validate folder paths in arrays
        try {
            const folders = await this.configManager.get('folders.list');
            if (Array.isArray(folders)) {
                for (let i = 0; i < folders.length; i++) {
                    const folder = folders[i];
                    if (folder && folder.path) {
                        const result = await this.validate(`folders.list[${i}].path`, folder.path);
                        if (!result.isValid && result.error) {
                            errors.push({ path: `folders.list[${i}].path`, error: result.error });
                        }
                    }
                }
            }
        } catch (error) {
            // Ignore if folders.list doesn't exist
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Normalize array paths for rule matching
     * e.g., folders.list[0].path -> folders.list[].path
     */
    private normalizeArrayPath(path: string): string {
        return path.replace(/\[\d+\]/g, '[]');
    }
}