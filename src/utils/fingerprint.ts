import { readFileSync, statSync } from 'fs';
import { relative } from 'path';
import { createHash } from 'crypto';
import { FileFingerprint } from '../types/index.js';

export function generateFileHash(filePath: string): string {
  const fileBuffer = readFileSync(filePath);
  const hashSum = createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

export function createFileFingerprint(filePath: string, basePath: string): FileFingerprint {
  const stats = statSync(filePath);
  const relativePath = relative(basePath, filePath);
  const hash = generateFileHash(filePath);
  
  return {
    hash,
    path: relativePath,
    size: stats.size,
    modified: stats.mtime.toISOString()
  };
}

export async function generateFingerprints(files: string[], basePath: string): Promise<FileFingerprint[]> {
  console.log('Generating file fingerprints...');
  const fingerprints: FileFingerprint[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file) continue; // Skip undefined files
    
    try {
      const fingerprint = createFileFingerprint(file, basePath);
      fingerprints.push(fingerprint);
      console.log(`  ${i + 1}/${files.length}: ${fingerprint.path}`);
    } catch (error) {
      console.warn(`  Warning: Could not fingerprint ${relative(basePath, file)}: ${error}`);
    }
  }
  
  return fingerprints;
}
