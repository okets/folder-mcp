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

export interface ModelCapabilities {
    dense?: boolean;
    requiresPrefix?: boolean;
    requiresNormalization?: boolean;
    prefixFormat?: string;
}

interface ModelInfo {
    id: string;
    displayName: string;
    description: string;
    huggingfaceId: string;
    sentenceTransformerId?: string; // New field for Python embedding service
    dimensions: number;
    modelSizeMB: number;
    isDefault?: boolean;
    capabilities?: ModelCapabilities;
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

/**
 * Get supported languages for a model (derived from languagePerformance keys)
 */
export function getModelLanguages(modelId: string): string[] {
    const model = getModelById(modelId);
    if (!model || !(model as any).languagePerformance) {
        return ['EN']; // Default fallback
    }
    
    // Extract language codes from languagePerformance object
    const langCodes = Object.keys((model as any).languagePerformance);
    
    // Convert language codes to display format
    const languages = langCodes.map(code => code.toUpperCase()).slice(0, 3);
    
    // If many languages, show "Multi" instead
    if (languages.length > 5) {
        return ['Multi'];
    }
    
    return languages.length > 0 ? languages : ['EN'];
}

/**
 * Get backend type for a model (derived from model ID prefix)
 */
export function getModelBackend(modelId: string): 'python' | 'onnx' | 'ollama' {
    if (modelId.startsWith('gpu:')) {
        return 'python';  // folder-mcp backend for GPU models
    } else if (modelId.startsWith('cpu:')) {
        return 'onnx';    // folder-mcp backend for CPU models
    } else if (modelId.startsWith('ollama:')) {
        return 'ollama';
    } else {
        // Legacy models without prefix - assume ollama
        return 'ollama';
    }
}

/**
 * Check if model requires GPU (derived from model ID prefix)
 */
export function isGpuRequired(modelId: string): boolean {
    return modelId.startsWith('gpu:');
}

/**
 * Get model parameters/size display string (derived from modelSizeMB)
 */
export function getModelParams(modelId: string): string {
    const model = getModelById(modelId);
    if (!model || !model.modelSizeMB) {
        return 'Unknown';
    }
    
    const sizeMB = model.modelSizeMB;
    
    // Convert to appropriate units
    if (sizeMB >= 1000) {
        return `${(sizeMB / 1000).toFixed(1)}GB`;
    } else {
        return `${sizeMB}M`;
    }
}

/**
 * Get UI-friendly backend name 
 */
export function getModelBackendDisplay(modelId: string): 'folder-mcp' | 'ollama' {
    const backend = getModelBackend(modelId);
    return backend === 'ollama' ? 'ollama' : 'folder-mcp';
}

/**
 * Get model display name (from displayName field in curated models)
 */
export function getModelDisplayName(modelId: string): string {
    const model = getModelById(modelId);
    return model?.displayName || modelId;
}

/**
 * Interface for model metadata used by UI components
 */
export interface ModelMetadata {
    name: string;
    displayName: string;
    languages: string[];
    params: string;
    gpuRequired: boolean;
    backend: 'folder-mcp' | 'ollama';
    description?: string;
}

/**
 * Get complete metadata for a model (for UI components)
 */
export function getModelMetadata(modelId: string): ModelMetadata | null {
    const model = getModelById(modelId);
    if (!model) {
        return null;
    }
    
    return {
        name: modelId,
        displayName: getModelDisplayName(modelId),
        languages: getModelLanguages(modelId),
        params: getModelParams(modelId),
        gpuRequired: isGpuRequired(modelId),
        backend: getModelBackendDisplay(modelId),
        description: model.description
    };
}

/**
 * Get models by backend type
 */
export function getModelsByBackend(backend: 'python' | 'onnx' | 'ollama'): any[] {
    const models = loadCuratedModels();
    const allModels = [...models.gpuModels.models, ...models.cpuModels.models];
    
    if (backend === 'python') {
        return allModels.filter((model: any) => model.id.startsWith('gpu:'));
    } else if (backend === 'onnx') {
        return allModels.filter((model: any) => model.id.startsWith('cpu:'));
    } else if (backend === 'ollama') {
        return allModels.filter((model: any) => model.id.startsWith('ollama:'));
    }
    
    return [];
}

/**
 * Get metadata for all available models
 */
export function getAllModelMetadata(): ModelMetadata[] {
    const config = loadCuratedModels();
    const allModels = [...config.gpuModels.models, ...config.cpuModels.models];
    
    return allModels
        .map(model => getModelMetadata(model.id))
        .filter((metadata): metadata is ModelMetadata => metadata !== null);
}

/**
 * Convert model ID (e.g., 'gpu:bge-m3') to HuggingFace model ID
 */
export function getHuggingfaceIdFromModelId(modelId: string): string {
    const model = getModelById(modelId);
    if (!model) {
        throw new Error(`Model not found in registry: ${modelId}`);
    }
    
    return model.huggingfaceId;
}

/**
 * Convert model ID (e.g., 'gpu:bge-m3') to sentence-transformers model ID
 * This is what gets passed to the Python embedding service
 */
export function getSentenceTransformerIdFromModelId(modelId: string): string {
    const model = getModelById(modelId);
    if (!model) {
        throw new Error(`Model not found in registry: ${modelId}`);
    }
    
    // Use sentenceTransformerId if available, fallback to huggingfaceId
    const sentenceTransformerId = model.sentenceTransformerId || model.huggingfaceId;
    if (!sentenceTransformerId) {
        throw new Error(`No sentence-transformers ID found for model: ${modelId}`);
    }
    
    return sentenceTransformerId;
}

/**
 * Get model capabilities (E5 prefixes, normalization, etc.)
 * Single source of truth for model-specific behavior
 */
export function getModelCapabilities(modelId: string): ModelCapabilities | null {
    const model = getModelById(modelId);
    if (!model) {
        return null;
    }

    // Return capabilities from curated-models.json or default empty object
    return model.capabilities || {};
}

/**
 * Check if model requires E5-style prefixes (configuration-driven)
 */
export function modelRequiresPrefix(modelId: string): boolean {
    const capabilities = getModelCapabilities(modelId);
    return capabilities?.requiresPrefix === true;
}

/**
 * Check if model requires normalization (configuration-driven)
 */
export function modelRequiresNormalization(modelId: string): boolean {
    const capabilities = getModelCapabilities(modelId);
    return capabilities?.requiresNormalization === true;
}

/**
 * Get prefix format for model (configuration-driven)
 */
export function getModelPrefixFormat(modelId: string): string {
    const capabilities = getModelCapabilities(modelId);
    return capabilities?.prefixFormat || '';
}