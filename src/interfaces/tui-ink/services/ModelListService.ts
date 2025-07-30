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
  // These models match the curated list in system-configuration.json
  // from Sub-Task 10.5: Add Curated Model List to System Configuration
  return [
    {
      name: 'all-MiniLM-L6-v2',
      displayName: 'All-MiniLM-L6-v2 (Recommended)',
      backend: 'python',
      recommended: true
    },
    {
      name: 'all-mpnet-base-v2',
      displayName: 'All-MPNet Base v2',
      backend: 'python'
    },
    {
      name: 'all-MiniLM-L12-v2',
      displayName: 'All-MiniLM-L12-v2',
      backend: 'python'
    },
    {
      name: 'all-distilroberta-v1',
      displayName: 'All-DistilRoBERTa v1',
      backend: 'python'
    },
    {
      name: 'paraphrase-MiniLM-L6-v2',
      displayName: 'Paraphrase-MiniLM-L6-v2',
      backend: 'python'
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