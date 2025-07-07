/**
 * Node.js File Writer Implementation
 * 
 * Provides file writing capabilities for configuration management.
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { IFileWriter } from '../../domain/config/IFileWriter.js';

export class NodeFileWriter implements IFileWriter {
  async writeFile(filePath: string, content: string): Promise<void> {
    await fs.writeFile(filePath, content, 'utf-8');
  }

  async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error: any) {
      // Ignore if directory already exists
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }
}