/**
 * ValidationRegistry - Single Source of Truth for All Validation Rules
 * 
 * This registry centralizes all validation rules used across TUI, CLI, and config files.
 * It ensures consistency and eliminates duplication of validation logic.
 */

import { validators } from '../interfaces/tui-ink/utils/validators.js';
import { getSupportedGpuModelIds, getSupportedCpuModelIds, isValidModelId } from './model-registry.js';
import { existsSync, statSync } from 'fs';

export interface ValidationResult {
    isValid: boolean;
    error?: string;
    warning?: string;
    info?: string;
}

export interface ValidationRule {
    validate: (value: string) => boolean;
    message: string;
    getTuiResult?: (value: string) => { isValid: boolean; error?: string; warning?: string; info?: string };
}

export class ValidationRegistry {
    private static rules = new Map<string, ValidationRule[]>();
    private static initialized = false;

    /**
     * Initialize the registry with all validation rules
     */
    private static initialize(): void {
        if (this.initialized) return;

        // Theme validation
        this.registerRule('theme', {
            validate: (value: string) => ['auto', 'light', 'dark', 'light-optimized', 'dark-optimized', 'default', 'minimal'].includes(value),
            message: 'Theme must be auto, light, dark, light-optimized, dark-optimized, default, or minimal'
        });

        // Folder path validation
        this.registerRule('folders.list[].path', {
            validate: (value: string) => {
                if (!value || value.trim() === '') return false;
                if (!existsSync(value)) return false;
                
                // Check if it's a directory
                try {
                    const stat = statSync(value);
                    return stat.isDirectory();
                } catch (error) {
                    return false;
                }
            },
            message: 'Folder path must exist and be a directory',
            getTuiResult: (value: string) => {
                if (!value || value.trim() === '') {
                    return { isValid: false, error: 'Folder path must be a string' };
                }
                if (!existsSync(value)) {
                    return { isValid: false, error: 'Folder does not exist' };
                }
                
                try {
                    const stat = statSync(value);
                    if (!stat.isDirectory()) {
                        return { isValid: false, error: 'Path is not a directory' };
                    }
                    return { isValid: true };
                } catch (error) {
                    return { isValid: false, error: 'Unable to access path' };
                }
            }
        });

        // Embedding model validation (default)
        this.registerRule('folders.defaults.embeddings.model', {
            validate: (value: string) => {
                if (!value || value.trim() === '') return false;
                return isValidModelId(value);
            },
            message: 'Must be a supported embedding model'
        });

        // Embedding model validation (per folder)
        this.registerRule('folders.list[].model', {
            validate: (value: string) => {
                if (!value || value.trim() === '') return false;
                return isValidModelId(value);
            },
            message: 'Must be a supported embedding model',
            getTuiResult: (value: string) => {
                if (!value || value.trim() === '') {
                    return { isValid: false, error: 'Model name is required' };
                }
                if (!isValidModelId(value)) {
                    return { isValid: false, error: 'Must be a supported embedding model' };
                }
                return { isValid: true };
            }
        });

        // Batch size validation (reuse TUI validator)
        this.registerRule('folders.defaults.embeddings.batchSize', {
            validate: (value: string) => validators.number(1, 1000)(value).isValid,
            message: 'Batch size must be between 1 and 1000',
            getTuiResult: (value: string) => validators.number(1, 1000)(value)
        });

        // Server port validation (reuse TUI validator)
        this.registerRule('server.port', {
            validate: (value: string) => validators.number(1000, 65535)(value).isValid,
            message: 'Port must be between 1000 and 65535',
            getTuiResult: (value: string) => validators.number(1000, 65535)(value)
        });

        // Server host validation (reuse TUI validator with special handling)
        this.registerRule('server.host', {
            validate: (value: string) => {
                if (value === 'localhost' || value === '127.0.0.1') return true;
                return validators.ipv4(value).isValid;
            },
            message: 'Must be a valid IP address or localhost',
            getTuiResult: (value: string) => {
                if (value === 'localhost' || value === '127.0.0.1') {
                    return { isValid: true };
                }
                return validators.ipv4(value);
            }
        });

        // Email validation (reuse TUI validator)
        this.registerRule('user.email', {
            validate: (value: string) => validators.email(value).isValid,
            message: 'Must be a valid email address',
            getTuiResult: (value: string) => validators.email(value)
        });

        this.initialized = true;
    }

    /**
     * Register a validation rule for a configuration path
     */
    static registerRule(path: string, rule: ValidationRule): void {
        if (!this.rules.has(path)) {
            this.rules.set(path, []);
        }
        this.rules.get(path)!.push(rule);
    }

    /**
     * Get validation rules for a configuration path
     */
    static getRules(path: string): ValidationRule[] {
        this.initialize();
        
        // Handle array paths (e.g., folders.list[0].path -> folders.list[].path)
        const normalizedPath = path.replace(/\[\d+\]/g, '[]');
        
        return this.rules.get(normalizedPath) || [];
    }

    /**
     * Get validators in TUI format for a configuration path
     */
    static getTuiValidators(path: string): Array<(value: string) => { isValid: boolean; error?: string; warning?: string; info?: string }> {
        const rules = this.getRules(path);
        
        return rules.map(rule => {
            if (rule.getTuiResult) {
                // Use custom TUI result function if available
                return rule.getTuiResult;
            } else {
                // Convert basic rule to TUI format
                return (value: string) => {
                    const isValid = rule.validate(value);
                    return isValid ? { isValid: true } : { isValid: false, error: rule.message };
                };
            }
        });
    }

    /**
     * Validate a configuration value
     */
    /**
     * Check if a rule exists for the given path
     */
    static hasRule(path: string): boolean {
        this.initialize();
        return this.rules.has(path);
    }
    
    static validateValue(path: string, value: string): ValidationResult {
        const rules = this.getRules(path);
        
        if (rules.length === 0) {
            // No validation rules - consider it valid
            return { isValid: true };
        }

        // Run all validation rules
        for (const rule of rules) {
            if (rule.getTuiResult) {
                // Use TUI result for consistent error messages
                const tuiResult = rule.getTuiResult(value);
                if (!tuiResult.isValid) {
                    const result: ValidationResult = {
                        isValid: false,
                        error: tuiResult.error || rule.message
                    };
                    if (tuiResult.warning) result.warning = tuiResult.warning;
                    if (tuiResult.info) result.info = tuiResult.info;
                    return result;
                }
            } else {
                // Use basic validation
                if (!rule.validate(value)) {
                    return {
                        isValid: false,
                        error: rule.message
                    };
                }
            }
        }

        return { isValid: true };
    }

    /**
     * Validate multiple configuration values
     */
    static validateAll(config: any): { isValid: boolean; errors: Array<{ path: string; error: string }> } {
        this.initialize();
        
        const errors: Array<{ path: string; error: string }> = [];
        
        // Validate each registered path
        for (const path of this.rules.keys()) {
            const value = this.getValueByPath(config, path);
            if (value !== undefined) {
                const result = this.validateValue(path, String(value));
                if (!result.isValid && result.error) {
                    errors.push({ path, error: result.error });
                }
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Get a value from a configuration object by path
     */
    private static getValueByPath(obj: any, path: string): any {
        if (!obj || typeof obj !== 'object') return undefined;
        
        // Handle array paths specially
        if (path.includes('[]')) {
            const parts = path.split('[]');
            const basePath = parts[0] || '';
            const remainingPath = parts[1] || '';
            
            const baseValue = this.getValueByPath(obj, basePath);
            if (Array.isArray(baseValue) && remainingPath) {
                // Check all array items
                for (let i = 0; i < baseValue.length; i++) {
                    const itemValue = this.getValueByPath(baseValue[i], remainingPath.substring(1)); // Remove leading dot
                    if (itemValue !== undefined) {
                        return itemValue; // Return first found value for validation
                    }
                }
            }
            return undefined;
        }
        
        // Regular path traversal
        return path.split('.').reduce((current, key) => {
            return current && current[key];
        }, obj);
    }

    /**
     * Get all registered validation paths
     */
    static getRegisteredPaths(): string[] {
        this.initialize();
        return Array.from(this.rules.keys());
    }

    /**
     * Clear all registered rules (for testing)
     */
    static clearRules(): void {
        this.rules.clear();
        this.initialized = false;
    }
}