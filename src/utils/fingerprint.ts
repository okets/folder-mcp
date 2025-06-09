import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { FileFingerprint } from '../types';

export function generateFileHash(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

export function createFileFingerprint(filePath: string, basePath: string): FileFingerprint {
  const stats = fs.statSync(filePath);
  const relativePath = path.relative(basePath, filePath);
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
    try {
      const fingerprint = createFileFingerprint(file, basePath);
      fingerprints.push(fingerprint);
      console.log(`  ${i + 1}/${files.length}: ${fingerprint.path}`);
    } catch (error) {
      console.warn(`  Warning: Could not fingerprint ${path.relative(basePath, file)}: ${error}`);
    }
  }
  
  return fingerprints;
}
