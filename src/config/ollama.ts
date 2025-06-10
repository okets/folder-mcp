// Ollama API integration and model caching for folder-mcp
// Provides direct API access to Ollama for model management and caching

import { 
  readFromCache, 
  writeToCache, 
  CACHE_KEYS, 
  CacheOptions,
  isCacheKeyValid,
  getCacheMetadata,
  clearCache
} from './cache.js';

/**
 * Ollama model information from API
 */
export interface OllamaModel {
  name: string;               // Model name (e.g., "mxbai-embed-large")
  size: number;               // Model size in bytes
  digest: string;             // Model digest/hash
  modified_at: string;        // Last modified timestamp
  details?: {
    format?: string;          // Model format
    family?: string;          // Model family
    families?: string[];      // Model families
    parameter_size?: string;  // Parameter size (e.g., "7B")
    quantization_level?: string; // Quantization level
  };
}

/**
 * Ollama API response for model list
 */
export interface OllamaModelsResponse {
  models: OllamaModel[];
}

/**
 * Embedding model information with metadata
 */
export interface EmbeddingModelInfo {
  name: string;               // Model name
  size: number;               // Model size in bytes
  sizeFormatted: string;      // Human-readable size (e.g., "1.2GB")
  isEmbedding: boolean;       // Whether this is an embedding model
  confidence: 'high' | 'medium' | 'low'; // Confidence in embedding classification
  lastModified: string;       // Last modified timestamp
  digest: string;             // Model digest
}

/**
 * Cached Ollama model data
 */
export interface CachedOllamaData {
  models: EmbeddingModelInfo[];
  fetchedAt: string;
  ollamaVersion?: string;
  totalModels: number;
  embeddingModels: number;
}

/**
 * Default Ollama API configuration
 */
const DEFAULT_OLLAMA_CONFIG = {
  baseUrl: 'http://127.0.0.1:11434',
  timeout: 10000, // 10 seconds
  retries: 3
};

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Check if a model name suggests it's an embedding model
 */
function isEmbeddingModel(modelName: string): { isEmbedding: boolean; confidence: 'high' | 'medium' | 'low' } {
  const name = modelName.toLowerCase();
  
  // High confidence indicators
  const highConfidencePatterns = [
    'embed', 'embedding', 'embeddings',
    'sentence-transformer', 'sentence_transformer',
    'nomic-embed', 'mxbai-embed', 'bge-', 'gte-',
    'all-minilm', 'all_minilm'
  ];
  
  for (const pattern of highConfidencePatterns) {
    if (name.includes(pattern)) {
      return { isEmbedding: true, confidence: 'high' };
    }
  }
  
  // Medium confidence indicators
  const mediumConfidencePatterns = [
    'vector', 'semantic', 'similarity',
    'multilingual', 'universal'
  ];
  
  for (const pattern of mediumConfidencePatterns) {
    if (name.includes(pattern)) {
      return { isEmbedding: true, confidence: 'medium' };
    }
  }
  
  // Low confidence - these could be embedding models but unsure
  const lowConfidencePatterns = [
    'text', 'language', 'bert', 'roberta'
  ];
  
  for (const pattern of lowConfidencePatterns) {
    if (name.includes(pattern)) {
      return { isEmbedding: true, confidence: 'low' };
    }
  }
  
  return { isEmbedding: false, confidence: 'high' };
}

/**
 * Check if Ollama is running and accessible
 */
export async function isOllamaAccessible(): Promise<boolean> {
  try {
    const response = await fetch(`${DEFAULT_OLLAMA_CONFIG.baseUrl}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(DEFAULT_OLLAMA_CONFIG.timeout)
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Fetch models directly from Ollama API
 */
export async function fetchOllamaModels(): Promise<OllamaModelsResponse | null> {
  try {
    console.log('🔍 Fetching models from Ollama API...');
    
    const response = await fetch(`${DEFAULT_OLLAMA_CONFIG.baseUrl}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(DEFAULT_OLLAMA_CONFIG.timeout)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json() as OllamaModelsResponse;
    console.log(`✅ Found ${data.models.length} models in Ollama`);
    
    return data;
  } catch (error) {
    console.warn('⚠️ Failed to fetch models from Ollama API:', error);
    return null;
  }
}

/**
 * Get embedding models from Ollama with classification
 */
export async function getEmbeddingModels(): Promise<EmbeddingModelInfo[]> {
  const modelsResponse = await fetchOllamaModels();
  
  if (!modelsResponse) {
    return [];
  }
  
  const embeddingModels: EmbeddingModelInfo[] = [];
  
  for (const model of modelsResponse.models) {
    const classification = isEmbeddingModel(model.name);
    
    if (classification.isEmbedding) {
      embeddingModels.push({
        name: model.name,
        size: model.size,
        sizeFormatted: formatBytes(model.size),
        isEmbedding: true,
        confidence: classification.confidence,
        lastModified: model.modified_at,
        digest: model.digest
      });
    }
  }
  
  // Sort by confidence (high first) then by size (smaller first for better UX)
  embeddingModels.sort((a, b) => {
    const confidenceOrder = { high: 0, medium: 1, low: 2 };
    const confDiff = confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
    if (confDiff !== 0) return confDiff;
    return a.size - b.size;
  });
  
  return embeddingModels;
}

/**
 * Cache Ollama model list with 24-hour expiry
 */
export async function cacheOllamaModels(): Promise<CachedOllamaData | null> {
  try {
    console.log('💾 Caching Ollama model list...');
    
    const modelsResponse = await fetchOllamaModels();
    if (!modelsResponse) {
      return null;
    }
    
    const embeddingModels = await getEmbeddingModels();
    
    const cachedData: CachedOllamaData = {
      models: embeddingModels,
      fetchedAt: new Date().toISOString(),
      totalModels: modelsResponse.models.length,
      embeddingModels: embeddingModels.length
    };
    
    const cacheOptions: CacheOptions = {
      ttlHours: 24, // 24-hour expiry as specified
      validateChecksum: true,
      compress: false
    };
    
    writeToCache(CACHE_KEYS.OLLAMA_MODELS, cachedData, cacheOptions);
    
    console.log(`✅ Cached ${embeddingModels.length} embedding models from ${modelsResponse.models.length} total`);
    return cachedData;
  } catch (error) {
    console.warn('⚠️ Failed to cache Ollama models:', error);
    return null;
  }
}

/**
 * Load cached Ollama model list
 */
export async function loadCachedOllamaModels(): Promise<CachedOllamaData | null> {
  try {
    const cacheOptions: CacheOptions = {
      ttlHours: 24,
      validateChecksum: true
    };
    
    const cachedData = readFromCache<CachedOllamaData>(CACHE_KEYS.OLLAMA_MODELS, cacheOptions);
    
    if (cachedData) {
      console.log('📂 Loaded Ollama models from cache');
      
      // Show cache age
      const metadata = getCacheMetadata(CACHE_KEYS.OLLAMA_MODELS);
      if (metadata) {
        const cacheAge = Date.now() - new Date(metadata.createdAt).getTime();
        const ageHours = Math.floor(cacheAge / (1000 * 60 * 60));
        console.log(`   📅 Model cache age: ${ageHours} hours`);
        console.log(`   🤖 Cached embedding models: ${cachedData.embeddingModels}`);
      }
      
      return cachedData;
    }
    
    console.log('📂 No cached Ollama models found');
    return null;
  } catch (error) {
    console.warn('⚠️ Failed to load cached Ollama models:', error);
    return null;
  }
}

/**
 * Get Ollama embedding models with caching
 */
export async function getOllamaEmbeddingModelsWithCache(forceRefresh: boolean = false): Promise<EmbeddingModelInfo[]> {
  // Check if Ollama is accessible
  if (!await isOllamaAccessible()) {
    console.warn('⚠️ Ollama is not accessible, cannot fetch models');
    return [];
  }
  
  // Try to use cached data if not forcing refresh
  if (!forceRefresh && isCacheKeyValid(CACHE_KEYS.OLLAMA_MODELS)) {
    const cachedData = await loadCachedOllamaModels();
    if (cachedData) {
      return cachedData.models;
    }
  }
  
  // Fetch fresh data
  const cachedData = await cacheOllamaModels();
  return cachedData ? cachedData.models : [];
}

/**
 * Clear Ollama models cache
 */
export function clearOllamaModelsCache(): boolean {
  try {
    const cleared = clearCache(CACHE_KEYS.OLLAMA_MODELS);
    if (cleared) {
      console.log('🗑️ Ollama models cache cleared');
    }
    return cleared;
  } catch (error) {
    console.warn('⚠️ Failed to clear Ollama models cache:', error);
    return false;
  }
}

/**
 * Get best embedding model recommendation from cache
 */
export async function getBestEmbeddingModel(): Promise<EmbeddingModelInfo | null> {
  const models = await getOllamaEmbeddingModelsWithCache();
  
  if (models.length === 0) {
    return null;
  }
    // Return the first model (highest confidence, smallest size due to sorting)
  return models[0] || null;
}

// Default export to make this a proper ES module
export default {
  isOllamaAccessible,
  fetchOllamaModels,
  getEmbeddingModels,
  cacheOllamaModels,
  loadCachedOllamaModels,
  getOllamaEmbeddingModelsWithCache,
  clearOllamaModelsCache,
  getBestEmbeddingModel
};
