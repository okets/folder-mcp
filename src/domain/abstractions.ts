/**
 * Domain Abstractions for Infrastructure Concerns
 * 
 * These interfaces define the contracts that the domain layer needs
 * from infrastructure services, without depending on specific implementations.
 */

// File system abstraction for domain layer
export interface FileSystemProvider {
  readFile(filePath: string, encoding?: string): string;
  readFileBuffer(filePath: string): Buffer;
  statFile(filePath: string): {
    size: number;
    mtime: Date;
  };
  getRelativePath(from: string, to: string): string;
  getExtension(filePath: string): string;
}

// Cryptography abstraction for domain layer
export interface CryptographyProvider {
  createHash(algorithm: string): HashProvider;
}

export interface HashProvider {
  update(data: string | Buffer): void;
  digest(encoding: string): string;
}

// Path utilities abstraction for domain layer
export interface PathProvider {
  relative(from: string, to: string): string;
  extname(filePath: string): string;
  join(...paths: string[]): string;
}

// Time provider abstraction for domain layer
export interface TimeProvider {
  now(): Date;
  timestamp(): number;
}

// Logging abstraction for domain layer
export interface DomainLogger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, error?: Error, meta?: any): void;
}
