/**
 * Model List Service
 * 
 * Simple utility to get Python embedding models for the AddFolderWizard.
 * Returns curated model list based on system configuration.
 */

import React from 'react';

export interface ModelInfo {
  name: string;
  displayName: string;
  backend: 'python' | 'ollama';
  recommended?: boolean;
}

/**
 * Get Python embedding models from system configuration
 * For Phase 8 Task 10, we use curated Python models only
 */
export function getPythonModels(): ModelInfo[] {
  const { getSupportedGpuModelIds, getModelDisplayName } = require('../../../config/model-registry.js');
  const gpuModelIds = getSupportedGpuModelIds();
  
  if (gpuModelIds.length === 0) {
    throw new Error('No GPU models available in model registry. Cannot provide Python models.');
  }
  
  return gpuModelIds.map((modelId: string) => ({
    name: modelId,
    displayName: getModelDisplayName(modelId),
    backend: 'python' as const,
    recommended: false // Use recommendation algorithm instead of hardcoded flags
  }));
}

/**
 * React hook to get Python models
 * Simple synchronous hook since we're using curated list
 */
export function usePythonModels() {
  const [models] = React.useState<ModelInfo[]>(() => getPythonModels());
  
  return {
    models,
    loading: false,
    error: null
  };
}