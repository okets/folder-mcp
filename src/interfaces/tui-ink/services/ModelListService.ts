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
  // TEMPORARY: Hardcoded fallback when daemon call fails
  // This should rarely be used since wizard now fetches from daemon
  return [
    {
      name: 'folder-mcp:all-MiniLM-L6-v2',
      displayName: 'All-MiniLM-L6-v2 (Recommended)',
      backend: 'python',
      recommended: true
    }
  ];
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