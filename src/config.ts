// Global configuration loader for folder-mcp
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as yaml from 'js-yaml';

// Get the project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// Configuration interfaces
export interface EmbeddingModelConfig {
  name: string;
  description: string;
  transformersModel: string;  // Model name for @xenova/transformers
  ollamaModel: string;        // Model name for Ollama
  dimensions: number;
  maxTokens?: number;
  isDefault?: boolean;
}

export interface EmbeddingConfig {
  defaultModel: string;
  ollamaApiUrl: string;
  batchSize: number;
  timeoutMs: number;
  models: Record<string, EmbeddingModelConfig>;
}

export interface CacheConfig {
  defaultCacheDir: string;
  maxCacheSize: string;
  cleanupIntervalHours: number;
}

export interface ProcessingConfig {
  defaultChunkSize: number;
  defaultOverlap: number;
  maxConcurrentOperations: number;
}

export interface ApiConfig {
  defaultPort: number;
  timeoutMs: number;
  rateLimitRpm: number;
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
  file?: string;
}

export interface DevelopmentConfig {
  enableDebugOutput: boolean;
  mockOllamaApi: boolean;
  skipGpuDetection: boolean;
}

export interface AppConfig {
  embeddings: EmbeddingConfig;
  cache: CacheConfig;
  processing: ProcessingConfig;
  api: ApiConfig;
  logging: LoggingConfig;
  development: DevelopmentConfig;
}

// Load configuration from JSON file
let config: AppConfig | null = null;

function loadConfig(): AppConfig {
  if (config) {
    return config;
  }

  try {
    const configPath = join(PROJECT_ROOT, 'config.yaml');
    const configContent = readFileSync(configPath, 'utf8');
    config = yaml.load(configContent) as AppConfig;
    
    if (!config) {
      throw new Error('Failed to parse YAML configuration');
    }
    
    if (!config.embeddings) {
      throw new Error('Configuration missing embeddings section');
    }
    
    return config;
  } catch (error) {
    throw new Error(`Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Export configuration getters
export function getConfig(): AppConfig {
  return loadConfig();
}

export function getEmbeddingConfig(): EmbeddingConfig {
  return loadConfig().embeddings;
}

export function getCacheConfig(): CacheConfig {
  return loadConfig().cache;
}

export function getProcessingConfig(): ProcessingConfig {
  return loadConfig().processing;
}

export function getApiConfig(): ApiConfig {
  return loadConfig().api;
}

export function getLoggingConfig(): LoggingConfig {
  return loadConfig().logging;
}

export function getDevelopmentConfig(): DevelopmentConfig {
  return loadConfig().development;
}

// Embedding-specific helper functions (maintaining backward compatibility)
export function getModelConfig(modelKey: string): EmbeddingModelConfig {
  const embeddingConfig = getEmbeddingConfig();
  const modelConfig = embeddingConfig.models[modelKey];
  
  if (!modelConfig) {
    const availableModels = Object.keys(embeddingConfig.models).join(', ');
    throw new Error(`Unknown embedding model: ${modelKey}. Available models: ${availableModels}`);
  }
  
  return modelConfig;
}

export function getDefaultModelConfig(): EmbeddingModelConfig {
  const embeddingConfig = getEmbeddingConfig();
  const defaultKey = Object.keys(embeddingConfig.models).find(
    key => embeddingConfig.models[key].isDefault
  ) || embeddingConfig.defaultModel;
  
  return getModelConfig(defaultKey);
}

export function listAvailableModels(): Array<{ key: string; config: EmbeddingModelConfig }> {
  const embeddingConfig = getEmbeddingConfig();
  return Object.entries(embeddingConfig.models).map(([key, config]) => ({ key, config }));
}

export function validateModelConfig(modelConfig: EmbeddingModelConfig): void {
  if (!modelConfig.name || !modelConfig.transformersModel || !modelConfig.ollamaModel || !modelConfig.dimensions) {
    throw new Error('Invalid model configuration: missing required fields');
  }
  
  if (modelConfig.dimensions <= 0) {
    throw new Error('Invalid model configuration: dimensions must be positive');
  }
}

// For backward compatibility, export the old interface structure
export const DEFAULT_CONFIG: EmbeddingConfig = {
  get defaultModel() { return getEmbeddingConfig().defaultModel; },
  get ollamaApiUrl() { return getEmbeddingConfig().ollamaApiUrl; },
  get batchSize() { return getEmbeddingConfig().batchSize; },
  get timeoutMs() { return getEmbeddingConfig().timeoutMs; },
  get models() { return getEmbeddingConfig().models; }
};

export const EMBEDDING_MODELS = new Proxy({} as Record<string, EmbeddingModelConfig>, {
  get(target, prop: string) {
    return getEmbeddingConfig().models[prop];
  },
  ownKeys(target) {
    return Object.keys(getEmbeddingConfig().models);
  },
  has(target, prop: string) {
    return prop in getEmbeddingConfig().models;
  }
});
