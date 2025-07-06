/**
 * Indexing Application Module
 * 
 * This module orchestrates the indexing workflow, coordinating
 * between file parsing, content processing, and embedding generation.
 */

// Application workflow interfaces
export interface IndexingWorkflow {
  indexFolder(path: string, options: IndexingOptions): Promise<IndexingResult>;
  indexFiles(files: string[], options: IndexingOptions): Promise<IndexingResult>;
  getIndexingStatus(path: string): Promise<IndexingStatus>;
  resumeIndexing(path: string): Promise<IndexingResult>;
}

export interface IncrementalIndexing {
  detectChanges(folderPath: string): Promise<ChangeDetectionResult>;
  indexChanges(changes: ChangeDetectionResult, options: IndexingOptions): Promise<IndexingResult>;
}

// Forward declare types from domain layer
interface ChunkingOptions {
  maxChunkSize: number;
  overlapSize: number;
  preserveParagraphs?: boolean;
  preserveSentences?: boolean;
}

// Application types
export interface IndexingOptions {
  chunkingOptions?: ChunkingOptions;
  embeddingModel?: string;
  batchSize?: number;
  parallelWorkers?: number;
  includeFileTypes?: string[];
  excludePatterns?: string[];
  forceReindex?: boolean;
}

export interface IndexingResult {
  success: boolean;
  filesProcessed: number;
  chunksGenerated: number;
  embeddingsCreated: number;
  processingTime: number;
  errors: IndexingError[];
  statistics: IndexingStatistics;
}

export interface IndexingStatus {
  isRunning: boolean;
  currentFile?: string;
  progress: IndexingProgress;
  startedAt?: Date;
  estimatedCompletion?: Date;
}

export interface IndexingProgress {
  totalFiles: number;
  processedFiles: number;
  totalChunks: number;
  processedChunks: number;
  percentage: number;
}

export interface IndexingStatistics {
  totalBytes: number;
  totalWords: number;
  averageChunkSize: number;
  processingRate: number; // files per second
  embeddingRate: number; // embeddings per second
}

export interface IndexingError {
  filePath: string;
  error: string;
  stage: 'parsing' | 'chunking' | 'embedding' | 'storage';
  timestamp: Date;
  recoverable: boolean;
}

export interface ChangeDetectionResult {
  newFiles: string[];
  modifiedFiles: string[];
  deletedFiles: string[];
  unchangedFiles: string[];
  summary: ChangesSummary;
}

export interface ChangesSummary {
  totalChanges: number;
  estimatedProcessingTime: number;
  requiresFullReindex: boolean;
}

// Application implementations
export { IndexingOrchestrator } from './orchestrator.js';
export { IndexingPipeline } from './pipeline.js';
export { IncrementalIndexer, createIncrementalIndexer } from './incremental.js';

// Multi-folder indexing
export * from './multi-folder-indexing.js';
