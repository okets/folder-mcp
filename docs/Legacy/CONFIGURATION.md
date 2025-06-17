# Configuration System

This document describes the centralized configuration system for folder-mcp.

## Configuration File Structure

The main configuration is stored in `config.yaml` at the root of the project:

```yaml
# folder-mcp Configuration
# This file contains all configuration settings for the folder-mcp project

# Embedding Model Configuration
embeddings:
  defaultModel: "nomic-v1.5"
  ollamaApiUrl: "http://127.0.0.1:11434"
  batchSize: 32
  timeoutMs: 30000
  
  # Available embedding models
  models:
    nomic-v1.5:
      name: "Nomic Embed v1.5"
      description: "High-quality general-purpose embedding model with 768 dimensions"
      transformersModel: "nomic-ai/nomic-embed-text-v1.5"
      ollamaModel: "nomic-embed-text"
      dimensions: 768
      maxTokens: 2048
      isDefault: true
    
    mxbai-large:
      name: "MixedBread AI Large"
      description: "Large embedding model with excellent performance (1024 dimensions)"
      transformersModel: "mixedbread-ai/mxbai-embed-large-v1"
      ollamaModel: "mxbai-embed-large"
      dimensions: 1024
      maxTokens: 512
    
    # ... more models

# Cache Configuration
cache:
  defaultCacheDir: "~/.cache/folder-mcp"  # User cache directory
  maxCacheSize: "10GB"                    # Maximum cache size (future feature)
  cleanupIntervalHours: 24                # How often to clean old entries

# Text Processing Configuration
processing:
  defaultChunkSize: 1000        # Default size for text chunking
  defaultOverlap: 200           # Default overlap between chunks
  maxConcurrentOperations: 10   # Maximum parallel operations

# API Configuration
api:
  defaultPort: 3000     # Default port for API services
  timeoutMs: 30000      # API request timeout in milliseconds
  rateLimitRpm: 1000    # Rate limiting (requests per minute)

# Logging Configuration
logging:
  level: "info"         # debug, info, warn, error
  format: "json"        # json, text
  file: "logs/app.log"  # Log file path (optional)

# Development Configuration
development:
  enableDebugOutput: false  # Show detailed debug information
  mockOllamaApi: false      # Use mock Ollama API for testing
  skipGpuDetection: false   # Skip GPU detection for testing
```
```

## Configuration Module

The configuration is accessed through `src/config.ts` which provides:

### Main Configuration Access
```typescript
import { 
  getConfig, 
  getEmbeddingConfig, 
  getCacheConfig,
  getLoggingConfig,
  getDevelopmentConfig
} from './config.js';

// Get full configuration
const config = getConfig();

// Get specific sections
const embeddingConfig = getEmbeddingConfig();
const cacheConfig = getCacheConfig();
const loggingConfig = getLoggingConfig();
const devConfig = getDevelopmentConfig();
```

### Embedding Model Configuration
```typescript
import { 
  getModelConfig, 
  getDefaultModelConfig, 
  listAvailableModels 
} from './config.js';

// Get specific model configuration
const model = getModelConfig('mxbai-large');

// Get default model
const defaultModel = getDefaultModelConfig();

// List all available models
const models = listAvailableModels();
```

## Available Embedding Models

| Model Key | Name | Dimensions | Description |
|-----------|------|------------|-------------|
| `nomic-v1.5` | Nomic Embed v1.5 | 768 | High-quality general-purpose (default) |
| `mxbai-large` | MixedBread AI Large | 1024 | Large model with excellent performance |
| `all-minilm` | All-MiniLM-L6-v2 | 384 | Lightweight and fast |
| `bge-small` | BGE Small | 384 | BAAI general embedding, small version |
| `gte-base` | GTE Base | 768 | General Text Embeddings model |

## Configuration Sections

### Embeddings
- **defaultModel**: Which embedding model to use by default
- **ollamaApiUrl**: URL for Ollama API (GPU acceleration)
- **batchSize**: Default batch size for processing multiple texts
- **timeoutMs**: Request timeout in milliseconds
- **models**: Available embedding model configurations

### Cache
- **defaultCacheDir**: Where to store cached models and data
- **maxCacheSize**: Maximum cache size (for future cleanup)
- **cleanupIntervalHours**: How often to clean old cache entries

### Processing
- **defaultChunkSize**: Default size for text chunking
- **defaultOverlap**: Default overlap between chunks
- **maxConcurrentOperations**: Maximum parallel operations

### API
- **defaultPort**: Default port for API services
- **timeoutMs**: API request timeout
- **rateLimitRpm**: Rate limiting (requests per minute)

### Logging
- **level**: Log level (debug, info, warn, error)
- **format**: Log format (json, text)
- **file**: Optional log file path

### Development
- **enableDebugOutput**: Show detailed debug information
- **mockOllamaApi**: Use mock Ollama API for testing
- **skipGpuDetection**: Skip GPU detection for testing

## Extending Configuration

To add new configuration sections:

1. **Add to config.yaml**: Add your new section to the YAML file
2. **Define interface**: Add TypeScript interface in `src/config.ts`
3. **Add getter function**: Create a getter function like `getYourConfig()`
4. **Update AppConfig**: Add your section to the main `AppConfig` interface

Example:
```typescript
// In src/config.ts
export interface YourConfig {
  setting1: string;
  setting2: number;
}

export interface AppConfig {
  embeddings: EmbeddingConfig;
  cache: CacheConfig;
  processing: ProcessingConfig;
  api: ApiConfig;
  logging: LoggingConfig;
  development: DevelopmentConfig;
  your: YourConfig;  // Add this
}

export function getYourConfig(): YourConfig {
  return loadConfig().your;
}
```

## Benefits of YAML Configuration

- **Human-readable**: Easy to read and edit
- **Comments supported**: Add explanatory comments
- **Type safety**: TypeScript interfaces provide compile-time validation
- **Hierarchical**: Natural nested structure
- **Extensible**: Easy to add new sections

## Migration from Old System

The old embedding-specific config file (`src/embeddings/config.ts`) has been removed. All imports should now use:

```typescript
// Old
import { getModelConfig } from './config.js';

// New
import { getModelConfig } from '../config.js';
```

The API remains the same for backward compatibility. The configuration has been moved from:
- **From**: `src/embeddings/config.ts` (TypeScript)
- **To**: `config.yaml` (YAML) + `src/config.ts` (loader)
