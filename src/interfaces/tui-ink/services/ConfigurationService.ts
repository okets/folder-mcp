import { IConfigurationService, IValidationService } from './interfaces.js';
import type { ConfigurationNode } from '../models/configuration.js';
import type { IValidationResult } from '../models/validation.js';
import { ServiceTokens } from '../di/tokens.js';

export class ConfigurationService implements IConfigurationService {
    private nodes = new Map<string, ConfigurationNode>();
    private values = new Map<string, any>();
    
    constructor(
        private validationService: IValidationService
    ) {}

    // Initialize with nodes
    initialize(nodes: ConfigurationNode[]): void {
        this.nodes.clear();
        this.values.clear();
        
        for (const node of nodes) {
            this.nodes.set(node.id, node);
            this.values.set(node.id, node.value);
        }
    }

    // Node management
    getNodes(): ConfigurationNode[] {
        return Array.from(this.nodes.values());
    }

    getNode(id: string): ConfigurationNode | undefined {
        return this.nodes.get(id);
    }

    updateNodeValue(id: string, value: any): void {
        const node = this.nodes.get(id);
        if (!node) {
            throw new Error(`Node ${id} not found`);
        }

        // Validate before updating
        const validation = this.validateNode(id, value);
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        this.values.set(id, value);
        // Update the node's value as well
        (node as any).value = value;
    }

    // Validation
    validateNode(id: string, value?: any): IValidationResult {
        const node = this.nodes.get(id);
        if (!node) {
            return { isValid: false, errors: [`Node ${id} not found`] };
        }

        const valueToValidate = value !== undefined ? value : this.values.get(id);
        
        if (!node.validation || node.validation.length === 0) {
            return { isValid: true, errors: [] };
        }

        return this.validationService.validate(valueToValidate, node.validation);
    }

    validateAll(): IValidationResult[] {
        const results: IValidationResult[] = [];
        
        for (const node of this.nodes.values()) {
            results.push(this.validateNode(node.id));
        }
        
        return results;
    }

    // Serialization
    getConfiguration(): Record<string, any> {
        const config: Record<string, any> = {};
        
        for (const [id, value] of this.values) {
            config[id] = value;
        }
        
        return config;
    }

    loadConfiguration(config: Record<string, any>): void {
        for (const [id, value] of Object.entries(config)) {
            if (this.nodes.has(id)) {
                try {
                    this.updateNodeValue(id, value);
                } catch (error) {
                    // Skip invalid values during load
                    console.error(`Failed to load value for ${id}:`, error);
                }
            }
        }
    }
}