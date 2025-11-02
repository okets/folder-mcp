/**
 * Unified Configuration Component
 * 
 * Single source of truth for both validation AND configuration access.
 * Uses ValidationRegistry for validation and ConfigManager for storage.
 * All configuration access should go through this component.
 */

import { IConfigManager, ValidationResult } from '../domain/config/IConfigManager';
import { ValidationRegistry } from './ValidationRegistry.js';
import { ValidationPipelineService } from './validation/ValidationPipelineService.js';
import { getDefaultModelId, getSupportedGpuModelIds, getSupportedCpuModelIds, findSmallestCpuModel, setDynamicDefaultModel } from './model-registry.js';
import { DefaultModelSelection } from '../daemon/services/default-model-selector.js';
import { existsSync } from 'fs';
import { unlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Re-export ValidationResult for backwards compatibility
export type { ValidationResult };

/**
 * Configuration change observer interface
 */
export interface ConfigurationObserver {
    onConfigurationChanged(path: string, value: any): void;
}

/**
 * Configuration change event interface (for backward compatibility)
 */
export interface ConfigurationChangeEvent {
    key: string;
    value: any;
    previousValue: any;
}

/**
 * Bulk configuration operations interface
 */
export interface BulkConfigurationResult {
    success: boolean;
    errors: Array<{ path: string; error: string }>;
}

export class ConfigurationComponent {
    private observers: ConfigurationObserver[] = [];
    private eventListeners: Map<string, Function[]> = new Map();
    private defaults: Map<string, any> = new Map();
    
    constructor(private configManager: IConfigManager) {
        this.initializeDefaults();
    }
    
    /**
     * Initialize default configuration values
     */
    private initializeDefaults(): void {
        // Core application defaults
        this.defaults.set('theme', 'auto');
        this.defaults.set('folders.defaults.embeddings.model', getDefaultModelId());
        this.defaults.set('folders.defaults.performance.batchSize', 1);
        this.defaults.set('server.port', 3000);
        this.defaults.set('server.host', 'localhost');
        this.defaults.set('user.email', '');
        
        // Cache settings
        this.defaults.set('cache.directory', join(homedir(), '.cache', 'folder-mcp'));
        this.defaults.set('cache.maxSizeGB', 10);
        this.defaults.set('cache.cleanupIntervalHours', 24);
        
        // Processing settings
        this.defaults.set('processing.chunkSize', 1000);
        this.defaults.set('processing.chunkOverlap', 200);
        
        // Development settings
        this.defaults.set('development.enabled', false);
        this.defaults.set('development.logLevel', 'info');
        
        // ONNX Optimization Settings (based on systematic CPM testing)
        this.defaults.set('onnx.workerPoolSize', 2);        // Optimal balance of performance vs resources
        this.defaults.set('onnx.threadsPerWorker', 2);      // Optimal ROI before diminishing returns
        this.defaults.set('onnx.batchSize', 1);             // Single chunk batches outperform larger batches
        this.defaults.set('onnx.maxConcurrentFiles', 4);    // Sweet spot before performance cliff (14.6% improvement vs 2)
    }
    
    /**
     * Process configuration template values (replaces {{DEFAULT_MODEL}} etc.)
     */
    private processConfigTemplates(value: any): any {
        if (typeof value === 'string' && value === '{{DEFAULT_MODEL}}') {
            return getDefaultModelId();
        }
        if (typeof value === 'object' && value !== null) {
            if (Array.isArray(value)) {
                return value.map(item => this.processConfigTemplates(item));
            }
            const processed: any = {};
            for (const [key, val] of Object.entries(value)) {
                processed[key] = this.processConfigTemplates(val);
            }
            return processed;
        }
        return value;
    }
    
    /**
     * Get default value for a configuration path
     */
    getDefault(path: string): any {
        return this.defaults.get(path);
    }
    
    /**
     * Set default value for a configuration path
     */
    setDefault(path: string, value: any): void {
        this.defaults.set(path, value);
    }
    
    /**
     * Validate a configuration value using ValidationRegistry
     */
    async validate(path: string, value: any): Promise<ValidationResult> {
        // Use ValidationPipeline for comprehensive validation
        const pipeline = ValidationPipelineService.getInstance();
        
        // Get current configuration as context for business validation
        const context = {
            currentConfig: await this.get('') // Get full config
        };
        
        // Run validation through pipeline
        return pipeline.validate(path, value, context);
    }
    
    /**
     * Set configuration value with validation
     */
    async set(path: string, value: any): Promise<void> {
        // Get previous value for event
        const previousValue = await this.get(path);
        
        // Validate first
        const validationResult = await this.validate(path, value);
        if (!validationResult.valid) {
            const errorMsg = validationResult.errors?.[0]?.message || 'Validation failed';
            throw new Error(`Invalid value for ${path}: ${errorMsg}`);
        }
        
        // Set the value
        await this.configManager.set(path, value);
        
        // Notify observers
        this.notifyObservers(path, value);
        
        // Emit change event for backward compatibility
        this.emit('configChanged', { key: path, value, previousValue });
    }
    
    /**
     * Get configuration value with fallback to defaults
     */
    async get(path: string): Promise<any> {
        const value = await this.configManager.get(path);
        
        // Return value if it exists, otherwise return default
        if (value !== undefined) {
            return this.processConfigTemplates(value);
        }
        
        return this.getDefault(path);
    }
    
    /**
     * Get configuration value without fallback to defaults
     */
    async getRaw(path: string): Promise<any> {
        return await this.configManager.get(path);
    }
    
    /**
     * Check if configuration path exists
     */
    async exists(path: string): Promise<boolean> {
        const value = await this.configManager.get(path);
        return value !== undefined;
    }
    
    /**
     * Get all configuration
     */
    async getAll(): Promise<any> {
        return await this.configManager.get('');
    }
    
    /**
     * Set multiple configuration values at once
     */
    async setBulk(values: Record<string, any>): Promise<BulkConfigurationResult> {
        const errors: Array<{ path: string; error: string }> = [];
        
        // Validate all values first
        for (const [path, value] of Object.entries(values)) {
            const validationResult = await this.validate(path, value);
            if (!validationResult.valid) {
                const errorMsg = validationResult.errors?.[0]?.message || 'Invalid value';
                errors.push({ path, error: errorMsg });
            }
        }
        
        // If any validation failed, return errors without setting anything
        if (errors.length > 0) {
            return { success: false, errors };
        }
        
        // Set all values
        for (const [path, value] of Object.entries(values)) {
            await this.configManager.set(path, value);
            this.notifyObservers(path, value);
        }
        
        return { success: true, errors: [] };
    }
    
    /**
     * Get multiple configuration values at once
     */
    async getBulk(paths: string[]): Promise<Record<string, any>> {
        const result: Record<string, any> = {};
        
        for (const path of paths) {
            result[path] = await this.get(path);
        }
        
        return result;
    }
    
    /**
     * Load configuration from file
     */
    async load(): Promise<void> {
        await this.configManager.load();
    }
    
    /**
     * Reload configuration from files
     */
    async reload(): Promise<void> {
        await this.configManager.reload();
    }
    
    /**
     * Validate entire configuration
     */
    async validateAll(): Promise<{ isValid: boolean; errors: Array<{ path: string; error: string }> }> {
        // Get all configuration
        const config = await this.getAll();
        
        // Use ValidationRegistry to validate all registered paths
        return ValidationRegistry.validateAll(config);
    }
    
    /**
     * Reset configuration to defaults
     */
    async reset(): Promise<void> {
        // Delete the configuration file
        const configPath = join(homedir(), '.folder-mcp', 'config.yaml');
        if (existsSync(configPath)) {
            unlinkSync(configPath);
        }
        
        // Reload to get clean state
        await this.load();
        
        // Notify observers of reset
        for (const path of this.defaults.keys()) {
            this.notifyObservers(path, this.getDefault(path));
        }
    }
    
    /**
     * Check if configuration file exists
     */
    hasConfigFile(): boolean {
        const configPath = join(homedir(), '.folder-mcp', 'config.yaml');
        return existsSync(configPath);
    }
    
    /**
     * Get configuration file path
     */
    getConfigFilePath(): string {
        return join(homedir(), '.folder-mcp', 'config.yaml');
    }
    
    /**
     * Add configuration change observer
     */
    addObserver(observer: ConfigurationObserver): void {
        this.observers.push(observer);
    }
    
    /**
     * Remove configuration change observer
     */
    removeObserver(observer: ConfigurationObserver): void {
        const index = this.observers.indexOf(observer);
        if (index !== -1) {
            this.observers.splice(index, 1);
        }
    }
    
    /**
     * Notify observers of configuration changes
     */
    private notifyObservers(path: string, value: any): void {
        for (const observer of this.observers) {
            try {
                observer.onConfigurationChanged(path, value);
            } catch (error) {
                console.error('Error notifying configuration observer:', error);
            }
        }
    }
    
    /**
     * Get TUI validators for a configuration path
     */
    getTuiValidators(path: string): Array<(value: string) => { isValid: boolean; error?: string; warning?: string; info?: string }> {
        return ValidationRegistry.getTuiValidators(path);
    }
    
    /**
     * Get all registered validation paths
     */
    getValidationPaths(): string[] {
        return ValidationRegistry.getRegisteredPaths();
    }
    
    /**
     * Add event listener (for backward compatibility with IConfigurationManager)
     */
    on(event: string, callback: Function): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event)!.push(callback);
    }
    
    /**
     * Remove event listener
     */
    off(event: string, callback: Function): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    /**
     * Emit event to all listeners
     */
    private emit(event: string, data: any): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            for (const listener of listeners) {
                try {
                    listener(data);
                } catch (error) {
                    console.error('Error in configuration event listener:', error);
                }
            }
        }
    }
    
    /**
     * Get configuration (for backward compatibility with IConfigurationManager)
     */
    getConfig(): any {
        return this.configManager.getAll();
    }
    
    /**
     * Get configuration sources (for backward compatibility with IConfigurationManager)
     */
    getSources(): any {
        // Return a basic sources object
        return {
            file: this.getConfigFilePath(),
            defaults: 'built-in'
        };
    }
    
    /**
     * Folder array management methods
     */

    /**
     * Platform-aware path comparison helper
     * Returns true if paths refer to the same folder (case-insensitive on Windows)
     * Also normalizes path separators on Windows (\ vs /)
     */
    private pathsEqual(path1: string, path2: string): boolean {
        const isWindows = process.platform === 'win32';
        if (isWindows) {
            // Normalize both case and path separator on Windows
            const normalized1 = path1.toLowerCase().replace(/\\/g, '/');
            const normalized2 = path2.toLowerCase().replace(/\\/g, '/');
            return normalized1 === normalized2;
        }
        return path1 === path2;
    }

    /**
     * Get all configured folders
     */
    async getFolders(): Promise<Array<{ path: string; model: string }>> {
        const folders = await this.get('folders.list');
        if (!folders || !Array.isArray(folders)) return [];
        
        // Handle both old (embeddings.model) and new (direct model) structure
        return folders.map(folder => ({
            path: folder.path,
            model: folder.model || folder.embeddings?.model || getDefaultModelId()
        }));
    }
    
    /**
     * Add a new folder configuration or update existing one
     */
    async addFolder(path: string, model: string): Promise<void> {
        // Validate path and model
        const pathValidation = await this.validate('folders.list[].path', path);
        const modelValidation = await this.validate('folders.list[].model', model);
        
        if (!pathValidation.valid) {
            throw new Error(`Invalid folder path: ${pathValidation.errors?.[0]?.message}`);
        }
        
        if (!modelValidation.valid) {
            throw new Error(`Invalid model: ${modelValidation.errors?.[0]?.message}`);
        }
        
        // Get current folders in raw format
        const existingFolders = await this.get('folders.list') || [];
        const existingIndex = existingFolders.findIndex((f: any) => this.pathsEqual(f.path, path));
        
        if (existingIndex !== -1) {
            // Update existing folder - use simplified structure
            const updatedFolders = [...existingFolders];
            updatedFolders[existingIndex] = {
                path,
                model
            };
            await this.set('folders.list', updatedFolders);
        } else {
            // Create new folder config - use simplified structure
            const newFolder = {
                path,
                model
            };
            
            // Add to the list
            const updatedFolders = [...existingFolders, newFolder];
            await this.set('folders.list', updatedFolders);
        }
    }
    
    /**
     * Remove a folder configuration
     */
    async removeFolder(path: string): Promise<void> {
        const existingFolders = await this.get('folders.list') || [];
        const updatedFolders = existingFolders.filter((f: any) => !this.pathsEqual(f.path, path));
        
        if (updatedFolders.length === existingFolders.length) {
            throw new Error(`Folder ${path} not found in configuration`);
        }
        
        await this.set('folders.list', updatedFolders);
    }
    
    /**
     * Update a folder's model
     */
    async updateFolderModel(path: string, model: string): Promise<void> {
        // Validate model
        const modelValidation = await this.validate('folders.list[].model', model);
        if (!modelValidation.valid) {
            throw new Error(`Invalid model: ${modelValidation.errors?.[0]?.message}`);
        }
        
        const existingFolders = await this.get('folders.list') || [];
        const folderIndex = existingFolders.findIndex((f: any) => this.pathsEqual(f.path, path));

        if (folderIndex === -1) {
            throw new Error(`Folder ${path} not found in configuration`);
        }
        
        // Update the model directly in the simplified structure
        const updatedFolders = [...existingFolders];
        updatedFolders[folderIndex].model = model;
        
        await this.set('folders.list', updatedFolders);
    }
    
    /**
     * Get a folder's configuration
     */
    async getFolder(path: string): Promise<{ path: string; model: string } | null> {
        const folders = await this.getFolders();
        return folders.find(f => this.pathsEqual(f.path, path)) || null;
    }
    
    /**
     * Check if a folder is configured
     */
    async hasFolderConfigured(path: string): Promise<boolean> {
        const folder = await this.getFolder(path);
        return folder !== null;
    }
    
    /**
     * Get the default model for new folders
     */
    async getDefaultModel(): Promise<string> {
        // First check if we have a dynamic default model set
        const dynamicDefault = await this.get('system.defaultModel.modelId');
        if (dynamicDefault) {
            return dynamicDefault;
        }
        
        // Then check configured default
        const configuredDefault = await this.get('folders.defaults.embeddings.model');
        if (configuredDefault) {
            return configuredDefault;
        }
        
        // Finally fallback to smallest CPU model
        return findSmallestCpuModel();
    }
    
    /**
     * Set the dynamic default model selection
     */
    async setDefaultModelSelection(selection: DefaultModelSelection): Promise<void> {
        await this.set('system.defaultModel', selection);
        // Also update the in-memory model registry
        setDynamicDefaultModel(selection.modelId);
    }
    
    /**
     * Get the current default model selection metadata
     */
    async getDefaultModelSelection(): Promise<DefaultModelSelection | null> {
        return await this.get('system.defaultModel');
    }
    
    /**
     * Get supported models list
     */
    getSupportedModels(): string[] {
        return [...getSupportedGpuModelIds(), ...getSupportedCpuModelIds()];
    }
}