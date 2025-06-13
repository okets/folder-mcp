/**
 * Security Module for Transport Layer
 * 
 * Provides API key generation, storage, validation, and lifecycle management
 * for secure authentication across all transport protocols.
 */

import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { createHash } from 'crypto';

/**
 * API key configuration
 */
export interface ApiKeyConfig {
  keyLength: number;        // Length in bytes (will be base64 encoded)
  encoding: 'base64' | 'hex';
  expirationDays?: number;  // Optional expiration
  rotationInterval?: number; // Auto-rotation interval in days
}

/**
 * API key metadata
 */
export interface ApiKeyMetadata {
  keyId: string;
  folderPath: string;
  folderHash: string;
  createdAt: Date;
  lastUsed?: Date;
  expiresAt?: Date;
  rotatedFrom?: string;     // Previous key ID if rotated
  revoked: boolean;
}

/**
 * API key with metadata
 */
export interface ApiKey {
  key: string;
  metadata: ApiKeyMetadata;
}

/**
 * API key validation result
 */
export interface ApiKeyValidationResult {
  valid: boolean;
  keyId?: string;
  metadata?: ApiKeyMetadata;
  error?: string;
}

/**
 * Default API key configuration
 */
export const DEFAULT_API_KEY_CONFIG: ApiKeyConfig = {
  keyLength: 32,           // 32 bytes = 256 bits
  encoding: 'base64'
  // expirationDays and rotationInterval are optional and omitted
};

/**
 * API Key Manager
 * 
 * Handles generation, storage, validation, and lifecycle of API keys
 */
export class ApiKeyManager {
  private static instance: ApiKeyManager | null = null;
  private config: ApiKeyConfig;
  
  /**
   * Get singleton instance
   */
  public static getInstance(config: ApiKeyConfig = DEFAULT_API_KEY_CONFIG): ApiKeyManager {
    if (!ApiKeyManager.instance) {
      ApiKeyManager.instance = new ApiKeyManager(config);
    }
    return ApiKeyManager.instance;
  }
  
  private constructor(config: ApiKeyConfig) {
    this.config = { ...DEFAULT_API_KEY_CONFIG, ...config };
  }
  
  /**
   * Generate a new API key for a folder
   */
  public async generateApiKey(folderPath: string): Promise<ApiKey> {
    const keyId = this.generateKeyId();
    const key = this.generateSecureKey();
    const folderHash = this.hashFolderPath(folderPath);
    
    const metadata: ApiKeyMetadata = {
      keyId,
      folderPath,
      folderHash,
      createdAt: new Date(),
      revoked: false
    };
    
    if (this.config.expirationDays) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.config.expirationDays);
      metadata.expiresAt = expiresAt;
    }
    
    const apiKey: ApiKey = { key, metadata };
    
    // Store the API key
    await this.storeApiKey(apiKey);
    
    return apiKey;
  }
  
  /**
   * Load existing API key for a folder
   */
  public async loadApiKey(folderPath: string): Promise<ApiKey | null> {
    try {
      const keyPath = this.getApiKeyPath(folderPath);
      const keyData = await fs.readFile(keyPath, 'utf-8');
      const apiKey: ApiKey = JSON.parse(keyData);
      
      // Validate the loaded key
      if (this.isApiKeyExpired(apiKey) || apiKey.metadata.revoked) {
        return null;
      }
      
      return apiKey;
    } catch (error) {
      // Key file doesn't exist or is invalid
      return null;
    }
  }
  
  /**
   * Rotate an existing API key
   */
  public async rotateApiKey(folderPath: string): Promise<ApiKey> {
    const existingKey = await this.loadApiKey(folderPath);
    const newKey = await this.generateApiKey(folderPath);
    
    // Link to previous key if it existed
    if (existingKey) {
      newKey.metadata.rotatedFrom = existingKey.metadata.keyId;
      
      // Mark old key as revoked
      existingKey.metadata.revoked = true;
      await this.storeApiKey(existingKey);
    }
    
    return newKey;
  }
  
  /**
   * Revoke an API key
   */
  public async revokeApiKey(folderPath: string): Promise<boolean> {
    const existingKey = await this.loadApiKey(folderPath);
    if (!existingKey) {
      return false;
    }
    
    existingKey.metadata.revoked = true;
    await this.storeApiKey(existingKey);
    
    return true;
  }
  
  /**
   * Validate an API key
   */
  public async validateApiKey(key: string, folderPath?: string): Promise<ApiKeyValidationResult> {
    if (!key || typeof key !== 'string') {
      return { valid: false, error: 'Invalid key format' };
    }
    
    // If folder path is provided, load and validate specific key
    if (folderPath) {
      const apiKey = await this.loadApiKey(folderPath);
      if (!apiKey) {
        return { valid: false, error: 'No valid key found for folder' };
      }
      
      if (apiKey.key !== key) {
        return { valid: false, error: 'Key mismatch' };
      }
      
      if (this.isApiKeyExpired(apiKey)) {
        return { valid: false, error: 'Key expired' };
      }
      
      if (apiKey.metadata.revoked) {
        return { valid: false, error: 'Key revoked' };
      }
      
      // Update last used timestamp
      apiKey.metadata.lastUsed = new Date();
      await this.storeApiKey(apiKey);
      
      return { 
        valid: true, 
        keyId: apiKey.metadata.keyId,
        metadata: apiKey.metadata 
      };
    }
    
    // If no folder path, search all stored keys (less efficient)
    return this.validateKeyGlobally(key);
  }
  
  /**
   * Get API key display string (masked for security)
   */
  public getKeyDisplayString(key: string): string {
    if (key.length < 8) {
      return '***';
    }
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  }
  
  /**
   * Check if folder has an API key
   */
  public async hasApiKey(folderPath: string): Promise<boolean> {
    const apiKey = await this.loadApiKey(folderPath);
    return apiKey !== null;
  }
  
  /**
   * Get folder-specific storage directory
   */
  public getFolderKeyDirectory(folderPath: string): string {
    const folderHash = this.hashFolderPath(folderPath);
    return join(this.getBaseKeyDirectory(), folderHash);
  }
  
  // Private helper methods
  
  /**
   * Generate a cryptographically secure API key
   */
  private generateSecureKey(): string {
    const buffer = randomBytes(this.config.keyLength);
    return buffer.toString(this.config.encoding);
  }
  
  /**
   * Generate a unique key ID
   */
  private generateKeyId(): string {
    const timestamp = Date.now().toString(36);
    const random = randomBytes(4).toString('hex');
    return `fmcp_${timestamp}_${random}`;
  }
  
  /**
   * Generate consistent hash for folder path
   */
  private hashFolderPath(folderPath: string): string {
    const normalized = folderPath.toLowerCase().replace(/\\/g, '/');
    return createHash('sha256').update(normalized).digest('hex').substring(0, 16);
  }
  
  /**
   * Get base directory for storing API keys
   */
  private getBaseKeyDirectory(): string {
    return join(homedir(), '.folder-mcp');
  }
  
  /**
   * Get API key file path for a folder
   */
  private getApiKeyPath(folderPath: string): string {
    const keyDir = this.getFolderKeyDirectory(folderPath);
    return join(keyDir, 'api-key.json');
  }
  
  /**
   * Store API key to disk
   */
  private async storeApiKey(apiKey: ApiKey): Promise<void> {
    const keyPath = this.getApiKeyPath(apiKey.metadata.folderPath);
    const keyDir = dirname(keyPath);
    
    // Ensure directory exists
    await fs.mkdir(keyDir, { recursive: true });
    
    // Store key data
    const keyData = JSON.stringify(apiKey, null, 2);
    await fs.writeFile(keyPath, keyData, { mode: 0o600 }); // Readable only by owner
  }
  
  /**
   * Check if API key is expired
   */
  private isApiKeyExpired(apiKey: ApiKey): boolean {
    if (!apiKey.metadata.expiresAt) {
      return false; // No expiration set
    }
    
    return new Date() > apiKey.metadata.expiresAt;
  }
  
  /**
   * Validate key against all stored keys (global search)
   */
  private async validateKeyGlobally(key: string): Promise<ApiKeyValidationResult> {
    try {
      const baseDir = this.getBaseKeyDirectory();
      
      // Check if base directory exists
      try {
        await fs.access(baseDir);
      } catch {
        return { valid: false, error: 'No API keys found' };
      }
      
      const folderDirs = await fs.readdir(baseDir);
      
      for (const folderHash of folderDirs) {
        try {
          const keyPath = join(baseDir, folderHash, 'api-key.json');
          const keyData = await fs.readFile(keyPath, 'utf-8');
          const apiKey: ApiKey = JSON.parse(keyData);
          
          if (apiKey.key === key && 
              !this.isApiKeyExpired(apiKey) && 
              !apiKey.metadata.revoked) {
            
            // Update last used timestamp
            apiKey.metadata.lastUsed = new Date();
            await this.storeApiKey(apiKey);
            
            return { 
              valid: true, 
              keyId: apiKey.metadata.keyId,
              metadata: apiKey.metadata 
            };
          }
        } catch {
          // Skip invalid or inaccessible key files
          continue;
        }
      }
      
      return { valid: false, error: 'Key not found' };
    } catch (error) {
      return { valid: false, error: 'Validation failed' };
    }
  }
}

/**
 * Authentication utilities for transport layer
 */
export class TransportAuth {
  private keyManager: ApiKeyManager;
  
  constructor(config: ApiKeyConfig = DEFAULT_API_KEY_CONFIG) {
    this.keyManager = ApiKeyManager.getInstance(config);
  }
  
  /**
   * Extract API key from transport metadata
   */
  public extractApiKey(metadata: Record<string, string>): string | null {
    // Check Authorization header (Bearer token)
    const authHeader = metadata['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    // Check x-api-key header
    const apiKeyHeader = metadata['x-api-key'];
    if (apiKeyHeader) {
      return apiKeyHeader;
    }
    
    return null;
  }
  
  /**
   * Validate authentication for a request
   */
  public async validateAuth(
    metadata: Record<string, string>, 
    folderPath?: string
  ): Promise<ApiKeyValidationResult> {
    const apiKey = this.extractApiKey(metadata);
    if (!apiKey) {
      return { valid: false, error: 'No API key provided' };
    }
    
    return this.keyManager.validateApiKey(apiKey, folderPath);
  }
  
  /**
   * Create authentication metadata for outgoing requests
   */
  public createAuthMetadata(apiKey: string): Record<string, string> {
    return {
      'authorization': `Bearer ${apiKey}`
    };
  }
  
  /**
   * Check if authentication is required for a transport type
   */
  public isAuthRequired(transportType: string, host?: string): boolean {
    switch (transportType) {
      case 'local':
        return false; // Local transport uses filesystem permissions
        
      case 'remote':
        return true;  // Remote transport always requires auth
        
      case 'http':
        // HTTP requires auth for non-localhost connections
        return host !== 'localhost' && host !== '127.0.0.1' && host !== '::1';
        
      default:
        return true;  // Default to requiring auth
    }
  }
}

/**
 * Security utilities
 */
export class SecurityUtils {
  /**
   * Generate a secure random string
   */
  public static generateSecureRandom(length: number, encoding: 'base64' | 'hex' = 'base64'): string {
    const buffer = randomBytes(length);
    return buffer.toString(encoding);
  }
  
  /**
   * Hash a string using SHA-256
   */
  public static hash(input: string): string {
    return createHash('sha256').update(input).digest('hex');
  }
  
  /**
   * Validate API key format
   */
  public static isValidApiKeyFormat(key: string): boolean {
    // Basic format validation
    if (!key || typeof key !== 'string') {
      return false;
    }
    
    // Check length (base64 encoded 32 bytes = 44 characters)
    if (key.length < 20) {
      return false;
    }
    
    // Check for valid base64 characters
    const base64Regex = /^[A-Za-z0-9+/]+=*$/;
    return base64Regex.test(key);
  }
  
  /**
   * Sanitize folder path for storage
   */
  public static sanitizeFolderPath(folderPath: string): string {
    return folderPath.toLowerCase().replace(/\\/g, '/').replace(/\/+$/, '');
  }
}
