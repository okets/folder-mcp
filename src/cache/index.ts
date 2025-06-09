import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, relative, basename } from 'path';
import { FileFingerprint, CacheIndex, CacheStatus } from '../types/index.js';

export async function setupCacheDirectory(folderPath: string, packageJson: any): Promise<void> {
  try {
    const cacheDir = join(folderPath, '.folder-mcp-cache');
    
    console.log('Setting up cache directory...');
    
    // Create main cache directory
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir);
      console.log(`Created cache directory: ${relative(folderPath, cacheDir)}`);
    } else {
      console.log(`Cache directory already exists: ${relative(folderPath, cacheDir)}`);
    }

    // Create subdirectories
    const subdirs = ['embeddings', 'metadata', 'vectors'];
    for (const subdir of subdirs) {
      const subdirPath = join(cacheDir, subdir);
      if (!existsSync(subdirPath)) {
        mkdirSync(subdirPath);
        console.log(`Created subdirectory: ${relative(folderPath, subdirPath)}`);
      }
    }

    // Create version.json with tool version and timestamp
    const versionFile = join(cacheDir, 'version.json');
    const versionData = {
      toolVersion: packageJson.version,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    writeFileSync(versionFile, JSON.stringify(versionData, null, 2));
    console.log(`Created version file: ${relative(folderPath, versionFile)}`);

  } catch (error: any) {
    if (error.code === 'EACCES' || error.code === 'EPERM') {
      console.error(`Permission error: Cannot create cache directory in "${folderPath}".`);
      console.error('Please ensure you have write permissions to this folder.');
      process.exit(1);
    } else {
      console.error(`Error setting up cache directory: ${error.message}`);
      process.exit(1);
    }
  }
}

export function loadPreviousIndex(cacheDir: string): CacheIndex | null {
  const indexFile = join(cacheDir, 'index.json');
  
  if (!existsSync(indexFile)) {
    return null;
  }
  
  try {
    const indexContent = readFileSync(indexFile, 'utf8');
    return JSON.parse(indexContent) as CacheIndex;
  } catch (error) {
    console.warn(`Warning: Could not load previous index: ${error}`);
    return null;
  }
}

export function detectCacheStatus(currentFingerprints: FileFingerprint[], previousIndex: CacheIndex | null): CacheStatus {
  const status: CacheStatus = {
    newFiles: [],
    modifiedFiles: [],
    deletedFiles: [],
    unchangedFiles: []
  };
  
  if (!previousIndex) {
    // If no previous index, all files are new
    status.newFiles = [...currentFingerprints];
    return status;
  }
  
  // Create lookup maps for efficient comparison
  const previousFiles = new Map<string, FileFingerprint>();
  previousIndex.files.forEach(file => {
    previousFiles.set(file.path, file);
  });
  
  const currentFiles = new Map<string, FileFingerprint>();
  currentFingerprints.forEach(file => {
    currentFiles.set(file.path, file);
  });
  
  // Check current files against previous
  for (const currentFile of currentFingerprints) {
    const previousFile = previousFiles.get(currentFile.path);
    
    if (!previousFile) {
      // File is new
      status.newFiles.push(currentFile);
    } else if (previousFile.hash !== currentFile.hash) {
      // File is modified (hash changed)
      status.modifiedFiles.push(currentFile);
    } else {
      // File is unchanged
      status.unchangedFiles.push(currentFile);
    }
  }
  
  // Check for deleted files (in previous but not in current)
  for (const previousFile of previousIndex.files) {
    if (!currentFiles.has(previousFile.path)) {
      status.deletedFiles.push(previousFile);
    }
  }
  
  return status;
}

export function displayCacheStatus(status: CacheStatus): void {
  const counts = [
    status.newFiles.length > 0 ? `${status.newFiles.length} new` : null,
    status.modifiedFiles.length > 0 ? `${status.modifiedFiles.length} modified` : null,
    status.deletedFiles.length > 0 ? `${status.deletedFiles.length} deleted` : null
  ].filter(Boolean);
  
  if (counts.length === 0) {
    console.log('Cache status: All files up to date');
  } else {
    console.log(`Cache status: ${counts.join(', ')}`);
  }
  
  // Show details if there are changes
  if (status.newFiles.length > 0) {
    console.log(`\nNew files (${status.newFiles.length}):`);
    status.newFiles.forEach(file => console.log(`  + ${file.path}`));
  }
  
  if (status.modifiedFiles.length > 0) {
    console.log(`\nModified files (${status.modifiedFiles.length}):`);
    status.modifiedFiles.forEach(file => console.log(`  * ${file.path}`));
  }
  
  if (status.deletedFiles.length > 0) {
    console.log(`\nDeleted files (${status.deletedFiles.length}):`);
    status.deletedFiles.forEach(file => console.log(`  - ${file.path}`));
  }
}

export async function saveFingerprintsToCache(fingerprints: FileFingerprint[], cacheDir: string): Promise<void> {
  const indexFile = join(cacheDir, 'index.json');
  const indexData = {
    generated: new Date().toISOString(),
    fileCount: fingerprints.length,
    files: fingerprints
  };
  
  writeFileSync(indexFile, JSON.stringify(indexData, null, 2));
  console.log(`Saved fingerprints to: ${basename(indexFile)}`);
}
