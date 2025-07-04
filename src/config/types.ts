/**
 * Extended configuration types for the new configuration manager
 * 
 * These types extend the base types to provide a more structured
 * configuration format that supports the new hierarchical system
 */

import { 
  LocalConfig as BaseLocalConfig, 
  ResolvedConfig as BaseResolvedConfig,
  ProcessingConfig,
  ServerConfig,
  FileConfig,
  UIConfig,
  TransportConfig,
  CacheConfig
} from './schema.js';

/**
 * Extended resolved configuration with nested structure
 */
export interface ExtendedResolvedConfig extends BaseResolvedConfig {
  // Group processing-related settings
  processing: {
    chunkSize: number;
    overlap: number;
    batchSize: number;
    modelName: string;
    maxWorkers?: number;
    timeoutMs?: number;
    maxConcurrentOperations: number;
  };
  
  // Group file-related settings
  files: {
    extensions: string[];
    ignorePatterns: string[];
    maxFileSize?: number;
    encoding?: string;
  };
  
  // Development settings
  development?: {
    enableDebugOutput?: boolean;
    mockOllamaApi?: boolean;
    skipGpuDetection?: boolean;
  };
  
  // Server settings (future)
  server?: Partial<ServerConfig>;
  
  // UI settings (future)
  ui?: Partial<UIConfig>;
  
  // Transport settings (future)
  transport?: Partial<TransportConfig>;
  
  // Cache settings (future)
  cache?: Partial<CacheConfig>;
}