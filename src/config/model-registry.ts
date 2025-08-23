/**
 * Model Registry Service
 * 
 * Single source of truth for model information from curated-models.json
 * NO hardcoded model names allowed - everything comes from the registry
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ModelInfo {
    id: string;
    displayName: string;
    description: string;
    huggingfaceId: string;
    dimensions: number;
    modelSizeMB: number;
    isDefault?: boolean;
}

interface CuratedModelsConfig {
    gpuModels: {
        models: ModelInfo[];
    };
    cpuModels: {
        models: ModelInfo[];
    };
}

let cachedConfig: CuratedModelsConfig | null = null;

/**
 * Load curated models configuration
 */
function loadCuratedModels(): CuratedModelsConfig {
    if (cachedConfig) {
        return cachedConfig;
    }
    
    const configPath = join(__dirname, 'curated-models.json');
    const configContent = readFileSync(configPath, 'utf-8');
    cachedConfig = JSON.parse(configContent);
    return cachedConfig!;
}

/**
 * Get all supported GPU model IDs (for Python embeddings)
 */
export function getSupportedGpuModelIds(): string[] {
    const config = loadCuratedModels();
    return config.gpuModels.models.map(model => model.id);
}

/**
 * Get all supported GPU model huggingface IDs (for Python embeddings)
 */
export function getSupportedGpuModelHuggingfaceIds(): string[] {
    const config = loadCuratedModels();
    return config.gpuModels.models.map(model => model.huggingfaceId);
}

/**
 * Get all supported CPU model IDs (for ONNX embeddings)
 */
export function getSupportedCpuModelIds(): string[] {
    const config = loadCuratedModels();
    return config.cpuModels.models.map(model => model.id);
}

/**
 * Get default model ID (marked with isDefault: true)
 */
export function getDefaultModelId(): string {
    const config = loadCuratedModels();
    const allModels = [...config.gpuModels.models, ...config.cpuModels.models];
    
    // Look for model marked as default
    const defaultModel = allModels.find(model => model.isDefault);
    if (defaultModel) {
        return defaultModel.id;
    }
    
    // Fallback to first GPU model if no default marked
    const gpuModels = config.gpuModels.models;
    if (gpuModels.length === 0) {
        throw new Error('No GPU models available in curated-models.json');
    }
    return gpuModels[0]!.id;
}

/**
 * Get default model huggingface ID (marked with isDefault: true)
 */
export function getDefaultModelHuggingfaceId(): string {
    const config = loadCuratedModels();
    const allModels = [...config.gpuModels.models, ...config.cpuModels.models];
    
    // Look for model marked as default
    const defaultModel = allModels.find(model => model.isDefault);
    if (defaultModel) {
        return defaultModel.huggingfaceId;
    }
    
    // Fallback to first GPU model if no default marked
    const gpuModels = config.gpuModels.models;
    if (gpuModels.length === 0) {
        throw new Error('No GPU models available in curated-models.json');
    }
    return gpuModels[0]!.huggingfaceId;
}

/**
 * Get model info by ID
 */
export function getModelById(id: string): ModelInfo | null {
    const config = loadCuratedModels();
    const allModels = [...config.gpuModels.models, ...config.cpuModels.models];
    return allModels.find(model => model.id === id) || null;
}

/**
 * Get model info by huggingface ID
 */
export function getModelByHuggingfaceId(huggingfaceId: string): ModelInfo | null {
    const config = loadCuratedModels();
    const allModels = [...config.gpuModels.models, ...config.cpuModels.models];
    return allModels.find(model => model.huggingfaceId === huggingfaceId) || null;
}

/**
 * Validate if model ID is supported
 */
export function isValidModelId(modelId: string): boolean {
    const allSupported = [...getSupportedGpuModelIds(), ...getSupportedCpuModelIds()];
    return allSupported.includes(modelId);
}

/**
 * Validate if huggingface model ID is supported
 */
export function isValidHuggingfaceModelId(huggingfaceId: string): boolean {
    const allSupported = getSupportedGpuModelHuggingfaceIds();
    return allSupported.includes(huggingfaceId);
}