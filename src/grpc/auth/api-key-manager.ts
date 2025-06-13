/**
 * API Key Management System for gRPC Remote Transport
 * 
 * Provides secure API key generation, storage, and lifecycle management
 * for remote gRPC transport authentication.
 */

import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { ILoggingService } from '../../di/interfaces.js';

export interface ApiKeyEntry {
  key: string;
  folder: string;
  createdAt: string;
  lastUsed?: string;
  isActive: boolean;
  description?: string;
}

export interface ApiKeyStorage {
  version: string;
  keys: Record<string, ApiKeyEntry>;
  metadata: {
    created: string;
    lastModified: string;
  };
}

export interface ApiKeyManagerOptions {
  storagePath?: string;
  keyLength?: number;
  backupCount?: number;
}

export class ApiKeyManager {
  private readonly storagePath: string;
  private readonly keyLength: number;
  private readonly backupCount: number;
  private cache: Map<string, ApiKeyEntry> = new Map();
  private isLoaded = false;

  constructor(
    private readonly logger: ILoggingService,
    options: ApiKeyManagerOptions = {}
  ) {
    this.storagePath = options.storagePath || join(homedir(), '.folder-mcp', 'api-keys.json');
    this.keyLength = options.keyLength || 32; // 32 bytes = 256 bits
    this.backupCount = options.backupCount || 3;
  }

  /**
   * Initialize the API key manager and load existing keys
   */
  async initialize(): Promise<void> {
    try {
      await this.ensureStorageDirectory();
      await this.loadKeys();
      this.isLoaded = true;
      this.logger.info('API key manager initialized', {
        storagePath: this.storagePath,
        keyCount: this.cache.size
      });
    } catch (error) {
      this.logger.error('Failed to initialize API key manager', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Generate a new API key for a folder
   */
  async generateKey(folder: string, description?: string): Promise<string> {
    await this.ensureLoaded();

    // Generate cryptographically secure random key
    const keyBytes = randomBytes(this.keyLength);
    const apiKey = keyBytes.toString('base64');

    const keyEntry: ApiKeyEntry = {
      key: apiKey,
      folder,
      createdAt: new Date().toISOString(),
      isActive: true,
      ...(description && { description })
    };

    // Store in cache and persist
    const keyId = this.generateKeyId(folder);
    this.cache.set(keyId, keyEntry);
    await this.saveKeys();

    this.logger.info('Generated new API key', {
      folder,
      keyId,
      description,
      keyLength: this.keyLength
    });

    return apiKey;
  }

  /**
   * Validate an API key for a specific folder
   */
  async validateKey(folder: string, providedKey: string): Promise<boolean> {
    await this.ensureLoaded();

    const keyId = this.generateKeyId(folder);
    const keyEntry = this.cache.get(keyId);

    if (!keyEntry || !keyEntry.isActive) {
      return false;
    }

    // Timing-safe comparison to prevent timing attacks
    const isValid = this.timingSafeEquals(keyEntry.key, providedKey);

    if (isValid) {
      // Update last used timestamp
      keyEntry.lastUsed = new Date().toISOString();
      await this.saveKeys();
    }

    return isValid;
  }

  /**
   * Get API key for a folder (for CLI display)
   */
  async getKey(folder: string): Promise<string | null> {
    await this.ensureLoaded();

    const keyId = this.generateKeyId(folder);
    const keyEntry = this.cache.get(keyId);

    return keyEntry?.isActive ? keyEntry.key : null;
  }

  /**
   * Rotate API key for a folder
   */
  async rotateKey(folder: string, description?: string): Promise<string> {
    await this.ensureLoaded();

    const keyId = this.generateKeyId(folder);
    const existingKey = this.cache.get(keyId);

    if (existingKey) {
      this.logger.info('Rotating API key', { folder, keyId });
    }

    return await this.generateKey(folder, description);
  }

  /**
   * Revoke API key for a folder
   */
  async revokeKey(folder: string): Promise<boolean> {
    await this.ensureLoaded();

    const keyId = this.generateKeyId(folder);
    const keyEntry = this.cache.get(keyId);

    if (!keyEntry) {
      return false;
    }

    keyEntry.isActive = false;
    await this.saveKeys();

    this.logger.info('Revoked API key', { folder, keyId });
    return true;
  }

  /**
   * List all API keys
   */
  async listKeys(): Promise<ApiKeyEntry[]> {
    await this.ensureLoaded();
    return Array.from(this.cache.values());
  }

  /**
   * Check if a folder has an active API key
   */
  async hasKey(folder: string): Promise<boolean> {
    await this.ensureLoaded();

    const keyId = this.generateKeyId(folder);
    const keyEntry = this.cache.get(keyId);

    return keyEntry?.isActive || false;
  }

  /**
   * Clean up expired or inactive keys
   */
  async cleanup(maxAge?: number): Promise<number> {
    await this.ensureLoaded();

    const cutoffDate = maxAge ? new Date(Date.now() - maxAge) : null;
    let cleanedCount = 0;

    for (const [keyId, keyEntry] of this.cache.entries()) {
      if (!keyEntry.isActive) {
        const createdAt = new Date(keyEntry.createdAt);
        if (!cutoffDate || createdAt < cutoffDate) {
          this.cache.delete(keyId);
          cleanedCount++;
        }
      }
    }

    if (cleanedCount > 0) {
      await this.saveKeys();
      this.logger.info('Cleaned up API keys', { cleanedCount });
    }

    return cleanedCount;
  }

  private async ensureLoaded(): Promise<void> {
    if (!this.isLoaded) {
      await this.initialize();
    }
  }

  private async ensureStorageDirectory(): Promise<void> {
    const dir = dirname(this.storagePath);
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
      this.logger.debug('Created API key storage directory', { dir });
    }
  }

  private async loadKeys(): Promise<void> {
    try {
      const data = await fs.readFile(this.storagePath, 'utf-8');
      const storage: ApiKeyStorage = JSON.parse(data);

      this.cache.clear();
      for (const [keyId, keyEntry] of Object.entries(storage.keys)) {
        this.cache.set(keyId, keyEntry);
      }

      this.logger.debug('Loaded API keys from storage', {
        keyCount: this.cache.size,
        version: storage.version
      });
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, start with empty cache
        this.cache.clear();
        this.logger.debug('API key storage file does not exist, starting fresh');
      } else {
        this.logger.error('Failed to load API keys', error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
    }
  }

  private async saveKeys(): Promise<void> {
    try {
      // Create backup before saving
      await this.createBackup();

      const storage: ApiKeyStorage = {
        version: '1.0.0',
        keys: Object.fromEntries(this.cache.entries()),
        metadata: {
          created: new Date().toISOString(),
          lastModified: new Date().toISOString()
        }
      };

      const data = JSON.stringify(storage, null, 2);
      await fs.writeFile(this.storagePath, data, 'utf-8');

      this.logger.debug('Saved API keys to storage', {
        keyCount: this.cache.size
      });
    } catch (error) {
      this.logger.error('Failed to save API keys', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private async createBackup(): Promise<void> {
    try {
      await fs.access(this.storagePath);
      const backupPath = `${this.storagePath}.backup.${Date.now()}`;
      await fs.copyFile(this.storagePath, backupPath);

      // Clean up old backups
      await this.cleanupBackups();
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        this.logger.warn('Failed to create API key backup', { error });
      }
    }
  }

  private async cleanupBackups(): Promise<void> {
    try {
      const dir = dirname(this.storagePath);
      const files = await fs.readdir(dir);
      const backupFiles = files
        .filter(file => file.startsWith('api-keys.json.backup.'))
        .map(file => ({
          name: file,
          path: join(dir, file),
          timestamp: parseInt(file.split('.').pop() || '0')
        }))
        .sort((a, b) => b.timestamp - a.timestamp);

      // Keep only the latest backups
      if (backupFiles.length > this.backupCount) {
        const filesToDelete = backupFiles.slice(this.backupCount);
        for (const file of filesToDelete) {
          await fs.unlink(file.path);
        }
      }
    } catch (error) {
      this.logger.warn('Failed to cleanup API key backups', { error });
    }
  }

  private generateKeyId(folder: string): string {
    // Create a stable key ID based on the folder path
    return Buffer.from(folder).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * Timing-safe string comparison to prevent timing attacks
   */
  private timingSafeEquals(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }
}
