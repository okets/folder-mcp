/**
 * Model Setup Helper for Integration Tests
 * 
 * Auto-discovers the smallest GPU model for testing.
 * The daemon will handle downloading the model if needed.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Get the smallest model ID without downloading it.
 * Useful for tests that just need to know the model ID.
 * The daemon will handle downloading the model if needed when folders are added.
 */
export function getSmallestModelId(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const curatedModelsPath = join(__dirname, '../../../src/config/curated-models.json');
  const curatedModelsContent = readFileSync(curatedModelsPath, 'utf-8');
  const curatedModels = JSON.parse(curatedModelsContent);
  
  const gpuModels = curatedModels.gpuModels?.models ?? [];
  if (gpuModels.length === 0) {
    throw new Error('No GPU models found in curated models list');
  }
  
  const smallestModel = gpuModels
    .sort((a: any, b: any) => a.modelSizeMB - b.modelSizeMB)[0];
  
  return smallestModel.id;
}