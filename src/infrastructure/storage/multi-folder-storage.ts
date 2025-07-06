/**
 * Multi-Folder Storage Provider
 * 
 * Extends the current storage system to handle multiple folders
 * with per-folder vector stores and result aggregation.
 */

import { join } from 'path';
import { IVectorSearchService, ILoggingService } from '../../di/interfaces.js';
import { SearchResult } from '../../domain/search/index.js';
import { EmbeddingVector } from '../../types/index.js';
import { IFolderManager, ResolvedFolderConfig } from '../../domain/folders/index.js';

/**
 * Interface for storage provider factory
 */
export interface IStorageFactory {
  /**
   * Create a vector search service for a specific folder
   * @param folder Folder configuration
   * @returns Vector search service instance
   */
  createStorage(folder: ResolvedFolderConfig): IVectorSearchService;
}

/**
 * Interface for multi-folder storage provider
 */
export interface IMultiFolderStorageProvider {
  /**
   * Initialize storage for all configured folders
   */
  initialize(): Promise<void>;

  /**
   * Search across all folders or a specific folder
   * @param query Search query vector
   * @param topK Number of results to return
   * @param folderName Optional folder name to search in
   * @returns Search results with folder attribution
   */
  search(query: EmbeddingVector, topK: number, folderName?: string): Promise<MultiFolderSearchResult[]>;

  /**
   * Search by text across all folders or a specific folder
   * @param queryText Search query text
   * @param topK Number of results to return
   * @param folderName Optional folder name to search in
   * @returns Search results with folder attribution
   */
  searchByText(queryText: string, topK: number, folderName?: string): Promise<MultiFolderSearchResult[]>;

  /**
   * Build index for a specific folder
   * @param folderName Folder name
   * @param embeddings Embedding vectors
   * @param metadata Document metadata
   */
  buildFolderIndex(folderName: string, embeddings: EmbeddingVector[], metadata: any[]): Promise<void>;

  /**
   * Get folder-specific storage service
   * @param folderName Folder name
   * @returns Vector search service for the folder
   */
  getFolderStorage(folderName: string): IVectorSearchService | undefined;

  /**
   * Get all folder storage services
   * @returns Map of folder names to storage services
   */
  getAllFolderStorages(): Map<string, IVectorSearchService>;

  /**
   * Add storage for a new folder
   * @param folder Folder configuration
   */
  addFolderStorage(folder: ResolvedFolderConfig): Promise<void>;

  /**
   * Remove storage for a folder
   * @param folderName Folder name
   */
  removeFolderStorage(folderName: string): Promise<void>;

  /**
   * Get storage statistics for all folders
   * @returns Storage statistics
   */
  getStorageStats(): Promise<MultiFolderStorageStats>;
}

/**
 * Search result with folder attribution
 */
export interface MultiFolderSearchResult extends SearchResult {
  /** Name of the folder this result came from */
  folderName: string;
  /** Resolved path of the folder */
  folderPath: string;
}

/**
 * Storage statistics for multi-folder system
 */
export interface MultiFolderStorageStats {
  /** Total number of folders with storage */
  totalFolders: number;
  /** Total number of documents across all folders */
  totalDocuments: number;
  /** Total number of embeddings across all folders */
  totalEmbeddings: number;
  /** Per-folder statistics */
  folderStats: FolderStorageStats[];
  /** System-wide storage errors */
  errors?: string[];
}

/**
 * Storage statistics for a single folder
 */
export interface FolderStorageStats {
  /** Folder name */
  folderName: string;
  /** Folder path */
  folderPath: string;
  /** Number of documents in this folder */
  documentCount: number;
  /** Number of embeddings in this folder */
  embeddingCount: number;
  /** Storage size estimate in bytes */
  estimatedSize?: number;
  /** Last indexed time */
  lastIndexed?: Date;
  /** Folder-specific errors */
  errors?: string[];
}

/**
 * Storage factory implementation
 */
export class StorageFactory implements IStorageFactory {
  constructor(
    private createVectorSearchService: (cacheDir: string) => IVectorSearchService,
    private loggingService: ILoggingService
  ) {}

  createStorage(folder: ResolvedFolderConfig): IVectorSearchService {
    // Create folder-specific cache directory
    const folderCacheDir = join(folder.resolvedPath, '.folder-mcp', 'storage');
    
    this.loggingService.debug(`Creating storage for folder: ${folder.name} at ${folderCacheDir}`);
    
    // Create the vector search service for this folder
    const storage = this.createVectorSearchService(folderCacheDir);
    
    return storage;
  }
}

/**
 * Multi-folder storage provider implementation
 */
export class MultiFolderStorageProvider implements IMultiFolderStorageProvider {
  private folderStorages: Map<string, IVectorSearchService> = new Map();
  private folderConfigs: Map<string, ResolvedFolderConfig> = new Map();

  constructor(
    private folderManager: IFolderManager,
    private storageFactory: IStorageFactory,
    private loggingService: ILoggingService
  ) {}

  async initialize(): Promise<void> {
    this.loggingService.info('Initializing multi-folder storage provider');
    
    // Get all configured folders
    const folders = await this.folderManager.getFolders();
    
    // Create storage for each folder
    for (const folder of folders) {
      await this.addFolderStorage(folder);
    }
    
    this.loggingService.info(`Initialized storage for ${folders.length} folders`);
  }

  async search(query: EmbeddingVector, topK: number, folderName?: string): Promise<MultiFolderSearchResult[]> {
    if (folderName) {
      // Search in specific folder
      return this.searchInFolder(folderName, query, topK);
    }
    
    // Search across all folders
    return this.searchAllFolders(query, topK);
  }

  async searchByText(queryText: string, topK: number, folderName?: string): Promise<MultiFolderSearchResult[]> {
    // Note: This method would need to be implemented with an embedding service
    // to convert the text query to a vector first, then use the search method
    // For now, we'll return an empty array until embedding service integration
    this.loggingService.warn('searchByText not yet fully implemented - requires embedding service integration');
    return [];
  }

  async buildFolderIndex(folderName: string, embeddings: EmbeddingVector[], metadata: any[]): Promise<void> {
    const storage = this.folderStorages.get(folderName);
    if (!storage) {
      throw new Error(`No storage found for folder: ${folderName}`);
    }
    
    this.loggingService.info(`Building index for folder: ${folderName} with ${embeddings.length} embeddings`);
    
    await storage.buildIndex(embeddings, metadata);
    
    this.loggingService.info(`Index built for folder: ${folderName}`);
  }

  getFolderStorage(folderName: string): IVectorSearchService | undefined {
    return this.folderStorages.get(folderName);
  }

  getAllFolderStorages(): Map<string, IVectorSearchService> {
    return new Map(this.folderStorages);
  }

  async addFolderStorage(folder: ResolvedFolderConfig): Promise<void> {
    this.loggingService.debug(`Adding storage for folder: ${folder.name}`);
    
    // Create storage service for this folder
    const storage = this.storageFactory.createStorage(folder);
    
    // Store the mapping
    this.folderStorages.set(folder.name, storage);
    this.folderConfigs.set(folder.name, folder);
    
    this.loggingService.debug(`Storage added for folder: ${folder.name}`);
  }

  async removeFolderStorage(folderName: string): Promise<void> {
    this.loggingService.debug(`Removing storage for folder: ${folderName}`);
    
    // Remove from mappings
    this.folderStorages.delete(folderName);
    this.folderConfigs.delete(folderName);
    
    this.loggingService.debug(`Storage removed for folder: ${folderName}`);
  }

  async getStorageStats(): Promise<MultiFolderStorageStats> {
    const folderStats: FolderStorageStats[] = [];
    let totalDocuments = 0;
    let totalEmbeddings = 0;
    const errors: string[] = [];

    for (const [folderName, storage] of this.folderStorages) {
      try {
        const folder = this.folderConfigs.get(folderName);
        if (!folder) {
          errors.push(`Missing folder configuration for: ${folderName}`);
          continue;
        }

        // Get stats from storage (would need to extend IVectorSearchService interface)
        // For now, provide basic stats
        const stats: FolderStorageStats = {
          folderName,
          folderPath: folder.resolvedPath,
          documentCount: 0, // Would be populated by actual storage
          embeddingCount: 0 // Would be populated by actual storage
        };

        folderStats.push(stats);
        totalDocuments += stats.documentCount;
        totalEmbeddings += stats.embeddingCount;
      } catch (error) {
        errors.push(`Error getting stats for folder ${folderName}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const stats: MultiFolderStorageStats = {
      totalFolders: this.folderStorages.size,
      totalDocuments,
      totalEmbeddings,
      folderStats
    };
    
    if (errors.length > 0) {
      stats.errors = errors;
    }
    
    return stats;
  }

  private async searchInFolder(folderName: string, query: EmbeddingVector, topK: number): Promise<MultiFolderSearchResult[]> {
    const storage = this.folderStorages.get(folderName);
    const folder = this.folderConfigs.get(folderName);
    
    if (!storage || !folder) {
      throw new Error(`Folder not found: ${folderName}`);
    }

    const results = await storage.search(query, topK);
    
    // Add folder attribution to results
    return results.map((result: any) => ({
      ...result,
      folderName,
      folderPath: folder.resolvedPath
    }));
  }


  private async searchAllFolders(query: EmbeddingVector, topK: number): Promise<MultiFolderSearchResult[]> {
    const allResults: MultiFolderSearchResult[] = [];
    
    // Search each folder
    for (const [folderName, storage] of this.folderStorages) {
      try {
        const folder = this.folderConfigs.get(folderName);
        if (!folder) continue;

        const results = await storage.search(query, topK);
        
        // Add folder attribution and add to all results
        const attributedResults = results.map((result: any) => ({
          ...result,
          folderName,
          folderPath: folder.resolvedPath
        }));
        
        allResults.push(...attributedResults);
      } catch (error) {
        this.loggingService.warn(`Error searching folder ${folderName}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // Sort by similarity and return top K
    return allResults
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

}