/**
 * Model Metadata Infrastructure
 * 
 * Provides comprehensive metadata for embedding models to enable
 * informed model selection in the UI.
 * 
 * Now uses curated-models.json as single source of truth.
 */

import { 
    getAllModelMetadata, 
    getModelMetadata as getRegistryMetadata,
    type ModelMetadata as RegistryModelMetadata
} from '../../../config/model-registry.js';

export interface ModelMetadata {
    name: string;                    // Model identifier (e.g., 'gpu:bge-m3')
    displayName: string;             // User-friendly name (e.g., 'BGE-M3 (Comprehensive)')
    languages: string[];             // Supported languages (e.g., ['Multi', 'EN'])
    params: string;                  // Model size (e.g., '2.2GB', '420M')
    gpuRequired: boolean;            // Whether GPU is required for reasonable performance
    backend: 'ollama' | 'folder-mcp'; // Backend service (user-friendly names)
    recommended?: boolean;           // Whether this is a recommended model (deprecated - use recommendation algorithm)
    description?: string;            // Optional description
}

/**
 * Generate model metadata from curated-models.json via model registry
 * No hardcoded values - all data derived from single source of truth
 */
function generateModelMetadata(): Record<string, ModelMetadata> {
    const registryModels = getAllModelMetadata();
    const metadata: Record<string, ModelMetadata> = {};
    
    for (const model of registryModels) {
        metadata[model.name] = {
            name: model.name,
            displayName: model.displayName,
            languages: model.languages,
            params: model.params,
            gpuRequired: model.gpuRequired,
            backend: model.backend,
            ...(model.description && { description: model.description })
        };
    }
    
    return metadata;
}

/**
 * Model metadata registry - dynamically generated from curated-models.json
 * Maps model identifiers to their metadata
 */
export const modelMetadata: Record<string, ModelMetadata> = generateModelMetadata();

/**
 * Get metadata for a specific model
 * @param modelName The model identifier
 * @returns ModelMetadata or undefined if not found
 */
export function getModelMetadata(modelName: string): ModelMetadata | undefined {
    return modelMetadata[modelName];
}

/**
 * Get all models with their metadata
 * @returns Array of ModelMetadata objects
 */
export function getAllModelsWithMetadata(): ModelMetadata[] {
    return Object.values(modelMetadata);
}

/**
 * Get model options for selection components
 * @returns Array of {value, label} objects for UI selects
 */
export function getModelOptions(): Array<{ value: string; label: string }> {
    return getAllModelsWithMetadata().map(model => ({
        value: model.name,
        label: model.displayName
    }));
}

/**
 * Format model metadata for terminal display
 * @param model The model metadata to format
 * @param columnWidths Optional column widths for formatting
 * @returns Formatted string for display
 */
export function formatModelForDisplay(
    model: ModelMetadata,
    columnWidths?: { name: number; languages: number; params: number; gpu: number; backend: number }
): string {
    const widths = columnWidths || {
        name: 20,
        languages: 8,
        params: 8,
        gpu: 8,
        backend: 12
    };
    
    const name = model.displayName.padEnd(widths.name);
    const languages = model.languages.join(',').padEnd(widths.languages);
    const params = model.params.padEnd(widths.params);
    const gpu = (model.gpuRequired ? 'Yes' : 'No').padEnd(widths.gpu);
    const backend = model.backend.padEnd(widths.backend);
    
    return `${name} │ ${languages} │ ${params} │ ${gpu} │ ${backend}`;
}

/**
 * Calculate responsive column widths for terminal display
 * @param terminalWidth Available terminal width
 * @returns Column width configuration
 */
export function calculateColumnWidths(terminalWidth: number): {
    name: number;
    languages: number;
    params: number;
    gpu: number;
    backend: number;
} {
    // Reserve space for borders and separators (5 separators × 3 chars = 15)
    const availableWidth = terminalWidth - 15;
    
    // Minimum widths
    const minWidths = { name: 15, languages: 6, params: 6, gpu: 7, backend: 10 };
    const minTotal = Object.values(minWidths).reduce((a, b) => a + b, 0);
    
    if (availableWidth <= minTotal) {
        return minWidths;
    }
    
    // Distribute extra space proportionally
    const extraSpace = availableWidth - minTotal;
    const nameExtra = Math.floor(extraSpace * 0.4);
    const othersExtra = Math.floor((extraSpace - nameExtra) / 4);
    
    return {
        name: minWidths.name + nameExtra,
        languages: minWidths.languages + othersExtra,
        params: minWidths.params + othersExtra,
        gpu: minWidths.gpu + othersExtra,
        backend: minWidths.backend + othersExtra
    };
}