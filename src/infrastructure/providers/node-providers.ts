/**
 * Node.js Infrastructure Providers
 * 
 * Concrete implementations of domain layer infrastructure interfaces
 * using Node.js built-in modules.
 */

import { readFileSync, statSync } from 'fs';
import { createHash, Hash } from 'crypto';
import { relative, extname, join } from 'path';

import { 
  FileSystemProvider, 
  CryptographyProvider, 
  HashProvider, 
  PathProvider 
} from '../../domain/abstractions.js';

/**
 * Node.js File System Provider
 */
export class NodeFileSystemProvider implements FileSystemProvider {
  readFile(filePath: string, encoding: string = 'utf8'): string {
    return readFileSync(filePath, encoding as BufferEncoding);
  }

  readFileBuffer(filePath: string): Buffer {
    return readFileSync(filePath);
  }

  statFile(filePath: string): { size: number; mtime: Date } {
    const stats = statSync(filePath);
    return {
      size: stats.size,
      mtime: stats.mtime
    };
  }

  getRelativePath(from: string, to: string): string {
    return relative(from, to);
  }

  getExtension(filePath: string): string {
    return extname(filePath);
  }
}

/**
 * Node.js Hash Provider Wrapper
 */
export class NodeHashProvider implements HashProvider {
  constructor(private readonly nodeHash: Hash) {}

  update(data: string | Buffer): void {
    this.nodeHash.update(data);
  }

  digest(encoding: string): string {
    return this.nodeHash.digest(encoding as any);
  }
}

/**
 * Node.js Cryptography Provider
 */
export class NodeCryptographyProvider implements CryptographyProvider {
  createHash(algorithm: string): HashProvider {
    const nodeHash = createHash(algorithm);
    return new NodeHashProvider(nodeHash);
  }
}

/**
 * Node.js Path Provider
 */
export class NodePathProvider implements PathProvider {
  relative(from: string, to: string): string {
    return relative(from, to);
  }

  extname(filePath: string): string {
    return extname(filePath);
  }

  join(...paths: string[]): string {
    return join(...paths);
  }
}
