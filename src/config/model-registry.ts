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
let dynamicDefaultModelId: string | null = null;

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
 * Get default model ID (dynamically selected or smallest CPU model)
 */
export function getDefaultModelId(): string {
    // Return dynamically set default if available
    if (dynamicDefaultModelId) {
        return dynamicDefaultModelId;
    }
    
    // Fallback: find smallest CPU model
    return findSmallestCpuModel();
}

/**
 * Set the dynamic default model ID
 */
export function setDynamicDefaultModel(modelId: string): void {
    dynamicDefaultModelId = modelId;
}

/**
 * Get the current dynamic default model ID (may be null)
 */
export function getDynamicDefaultModelId(): string | null {
    return dynamicDefaultModelId;
}

/**
 * Find the smallest CPU model by size
 */
export function findSmallestCpuModel(): string {
    const config = loadCuratedModels();
    const cpuModels = config.cpuModels.models;
    
    if (cpuModels.length === 0) {
        throw new Error('No CPU models available in curated-models.json');
    }
    
    // Sort by size and return smallest
    const smallest = cpuModels.sort((a, b) => a.modelSizeMB - b.modelSizeMB)[0];
    return smallest!.id;
}

/**
 * Get default model huggingface ID (dynamically selected or smallest CPU model)
 */
export function getDefaultModelHuggingfaceId(): string {
    const defaultId = getDefaultModelId();
    const model = getModelById(defaultId);
    
    if (!model) {
        throw new Error(`Default model ${defaultId} not found in curated-models.json`);
    }
    
    return model.huggingfaceId;
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