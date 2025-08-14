import fs from 'fs/promises';
import path from 'path';
import https from 'https';
import http from 'http';
import { createWriteStream, createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { ModelCompatibilityEvaluator, CuratedModel } from '../../../domain/models/model-evaluator.js';

export interface DownloadProgress {
  modelId: string;
  progress: number; // 0-100
  downloadedBytes: number;
  totalBytes: number;
  status: 'downloading' | 'completed' | 'failed' | 'verifying';
  error?: string;
}

export type ProgressCallback = (progress: DownloadProgress) => void;

export interface DownloadOptions {
  cacheDirectory?: string;
  onProgress?: ProgressCallback;
  timeout?: number;
  retryAttempts?: number;
  verifySize?: boolean;
}

export class ONNXDownloader {
  private evaluator: ModelCompatibilityEvaluator;
  private cacheDir: string;
  private activeDownloads: Map<string, Promise<string>> = new Map();

  constructor(options?: { cacheDirectory?: string }) {
    this.evaluator = new ModelCompatibilityEvaluator();
    this.cacheDir = options?.cacheDirectory || 
      path.join(process.env.HOME || '~', '.cache', 'folder-mcp', 'onnx-models');
  }

  async downloadModel(
    modelId: string, 
    options: DownloadOptions = {}
  ): Promise<string> {
    // Prevent duplicate downloads of the same model
    if (this.activeDownloads.has(modelId)) {
      console.log(`⏳ Download already in progress for ${modelId}, waiting...`);
      return await this.activeDownloads.get(modelId)!;
    }

    const downloadPromise = this.performDownload(modelId, options);
    this.activeDownloads.set(modelId, downloadPromise);

    try {
      const result = await downloadPromise;
      return result;
    } finally {
      this.activeDownloads.delete(modelId);
    }
  }

  private async performDownload(
    modelId: string,
    options: DownloadOptions
  ): Promise<string> {
    const model = this.evaluator.getModelById(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found in catalog`);
    }

    if (!model.downloadInfo?.url) {
      throw new Error(`Model ${modelId} does not have download URL in catalog`);
    }

    // Ensure cache directory exists
    await fs.mkdir(this.cacheDir, { recursive: true });

    const modelDir = path.join(this.cacheDir, model.huggingfaceId!.replace('/', '_'));
    const modelFile = path.join(modelDir, 'model_quantized.onnx');

    // Check if model already exists and verify size if requested
    if (await this.fileExists(modelFile)) {
      if (options.verifySize && model.modelSizeMB) {
        const fileSize = await this.getFileSize(modelFile);
        const expectedSize = model.modelSizeMB * 1024 * 1024; // Convert MB to bytes
        const sizeThreshold = 0.95; // Allow 5% variance

        if (fileSize >= expectedSize * sizeThreshold) {
          console.log(`✅ Model ${model.displayName} already exists and verified (${Math.round(fileSize / 1024 / 1024)}MB)`);
          return modelFile;
        } else {
          console.log(`⚠️ Model file size mismatch, re-downloading ${model.displayName}`);
          await fs.unlink(modelFile).catch(() => {});
        }
      } else {
        console.log(`✅ Model ${model.displayName} already cached`);
        return modelFile;
      }
    }

    // Ensure model directory exists
    await fs.mkdir(modelDir, { recursive: true });

    // Download the model
    console.log(`📥 Downloading ${model.displayName} from ${model.downloadInfo.url}`);
    
    const downloadOptions = {
      ...options,
      timeout: options.timeout || 300000, // 5 minutes default
      retryAttempts: options.retryAttempts || 3
    };

    await this.downloadFile(
      model.downloadInfo.url,
      modelFile,
      model,
      downloadOptions
    );

    // Verify the download
    if (options.onProgress) {
      options.onProgress({
        modelId,
        progress: 100,
        downloadedBytes: model.modelSizeMB * 1024 * 1024,
        totalBytes: model.modelSizeMB * 1024 * 1024,
        status: 'verifying'
      });
    }

    if (!(await this.verifyDownload(modelFile, model))) {
      await fs.unlink(modelFile).catch(() => {});
      throw new Error(`Downloaded model ${model.displayName} failed verification`);
    }

    console.log(`✅ Successfully downloaded ${model.displayName} (${model.modelSizeMB}MB)`);
    
    if (options.onProgress) {
      options.onProgress({
        modelId,
        progress: 100,
        downloadedBytes: model.modelSizeMB * 1024 * 1024,
        totalBytes: model.modelSizeMB * 1024 * 1024,
        status: 'completed'
      });
    }

    return modelFile;
  }

  private async downloadFile(
    url: string,
    destinationPath: string,
    model: CuratedModel,
    options: DownloadOptions
  ): Promise<void> {
    const tempPath = `${destinationPath}.tmp`;
    
    for (let attempt = 1; attempt <= (options.retryAttempts || 3); attempt++) {
      try {
        await this.attemptDownload(url, tempPath, model, options, attempt);
        
        // Move temp file to final location
        await fs.rename(tempPath, destinationPath);
        return;
        
      } catch (error) {
        console.error(`Download attempt ${attempt} failed:`, error);
        
        // Clean up temp file
        await fs.unlink(tempPath).catch(() => {});
        
        if (attempt === (options.retryAttempts || 3)) {
          throw new Error(`Failed to download after ${attempt} attempts: ${error}`);
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  private async attemptDownload(
    url: string,
    tempPath: string,
    model: CuratedModel,
    options: DownloadOptions,
    attempt: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = options.timeout || 300000;
      let timeoutId: NodeJS.Timeout;

      // Use appropriate module based on URL protocol
      const isHttps = url.startsWith('https:');
      const httpModule = isHttps ? https : http;

      const request = httpModule.get(url, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            console.log(`📍 Following redirect to: ${redirectUrl}`);
            // Recursively follow redirect
            this.attemptDownload(redirectUrl, tempPath, model, options, attempt)
              .then(resolve)
              .catch(reject);
            return;
          } else {
            reject(new Error(`HTTP ${response.statusCode}: No redirect URL provided`));
            return;
          }
        }

        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        const totalBytes = parseInt(response.headers['content-length'] || '0');
        let downloadedBytes = 0;

        const writeStream = createWriteStream(tempPath);
        
        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          
          if (options.onProgress && totalBytes > 0) {
            const progress = Math.round((downloadedBytes / totalBytes) * 100);
            options.onProgress({
              modelId: model.id,
              progress,
              downloadedBytes,
              totalBytes,
              status: 'downloading'
            });
          }
        });

        response.pipe(writeStream);

        writeStream.on('finish', () => {
          clearTimeout(timeoutId);
          resolve();
        });

        writeStream.on('error', (error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
      });

      request.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });

      // Set timeout
      timeoutId = setTimeout(() => {
        request.destroy();
        reject(new Error(`Download timeout after ${timeout}ms (attempt ${attempt})`));
      }, timeout);

      request.end();
    });
  }

  private async verifyDownload(filePath: string, model: CuratedModel): Promise<boolean> {
    try {
      const fileSize = await this.getFileSize(filePath);
      
      // Basic size check (allow some variance for compression differences)
      if (model.modelSizeMB) {
        const expectedSize = model.modelSizeMB * 1024 * 1024;
        const minSize = expectedSize * 0.8; // Allow 20% smaller
        const maxSize = expectedSize * 1.2; // Allow 20% larger
        
        if (fileSize < minSize || fileSize > maxSize) {
          console.error(`Size verification failed: expected ~${model.modelSizeMB}MB, got ${Math.round(fileSize / 1024 / 1024)}MB`);
          return false;
        }
      }

      // Could add additional verification like file magic numbers, etc.
      return true;
      
    } catch (error) {
      console.error('Verification failed:', error);
      return false;
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async getFileSize(filePath: string): Promise<number> {
    const stats = await fs.stat(filePath);
    return stats.size;
  }

  // Check if model is available locally
  async isModelAvailable(modelId: string): Promise<boolean> {
    const model = this.evaluator.getModelById(modelId);
    if (!model) {
      return false;
    }

    const modelDir = path.join(this.cacheDir, model.huggingfaceId!.replace('/', '_'));
    const modelFile = path.join(modelDir, 'model_quantized.onnx');
    
    return await this.fileExists(modelFile);
  }

  // Get download status for a model
  getDownloadStatus(modelId: string): 'not_downloaded' | 'downloading' | 'available' {
    if (this.activeDownloads.has(modelId)) {
      return 'downloading';
    }
    
    // This is a quick synchronous check - could be enhanced to verify file exists
    return 'not_downloaded'; // Would need async check for 'available'
  }

  // Clean up cache directory
  async clearCache(): Promise<void> {
    try {
      await fs.rm(this.cacheDir, { recursive: true, force: true });
      console.log(`🧹 Cleared ONNX model cache: ${this.cacheDir}`);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  // Get cache directory info
  async getCacheInfo(): Promise<{
    directory: string;
    totalSize: number;
    modelCount: number;
    models: string[];
  }> {
    try {
      const models: string[] = [];
      let totalSize = 0;

      if (await this.fileExists(this.cacheDir)) {
        const entries = await fs.readdir(this.cacheDir);
        
        for (const entry of entries) {
          const entryPath = path.join(this.cacheDir, entry);
          const stats = await fs.stat(entryPath);
          
          if (stats.isDirectory()) {
            const modelFile = path.join(entryPath, 'model_quantized.onnx');
            if (await this.fileExists(modelFile)) {
              const fileSize = await this.getFileSize(modelFile);
              totalSize += fileSize;
              models.push(entry.replace('_', '/'));
            }
          }
        }
      }

      return {
        directory: this.cacheDir,
        totalSize,
        modelCount: models.length,
        models
      };
      
    } catch (error) {
      return {
        directory: this.cacheDir,
        totalSize: 0,
        modelCount: 0,
        models: []
      };
    }
  }
}