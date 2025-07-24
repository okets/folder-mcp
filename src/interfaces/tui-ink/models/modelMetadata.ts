/**
 * Model Metadata Infrastructure
 * 
 * Provides comprehensive metadata for embedding models to enable
 * informed model selection in the UI.
 */

export interface ModelMetadata {
    name: string;                    // Model identifier (e.g., 'nomic-embed-text')
    displayName: string;             // User-friendly name (e.g., 'Nomic Embed Text')
    languages: string[];             // Supported languages (e.g., ['Multi', 'EN', 'Code'])
    params: string;                  // Model size (e.g., '137M', '7B')
    gpuRequired: boolean;            // Whether GPU is required for reasonable performance
    backend: 'ollama' | 'folder-mcp'; // Backend service (user-friendly names)
    recommended?: boolean;           // Whether this is a recommended model
    description?: string;            // Optional description for future use
}

/**
 * Comprehensive model metadata registry
 * Maps model identifiers to their metadata
 */
export const modelMetadata: Record<string, ModelMetadata> = {
    'nomic-embed-text': {
        name: 'nomic-embed-text',
        displayName: 'Nomic Embed Text',
        languages: ['Multi'],
        params: '137M',
        gpuRequired: false,
        backend: 'ollama',
        recommended: true,
        description: 'Balanced model for general-purpose text embeddings'
    },
    'mxbai-embed-large': {
        name: 'mxbai-embed-large',
        displayName: 'MXBai Embed Large',
        languages: ['EN'],
        params: '335M',
        gpuRequired: true,
        backend: 'ollama',
        description: 'High-quality embeddings, best with GPU'
    },
    'all-minilm': {
        name: 'all-minilm',
        displayName: 'All-MiniLM',
        languages: ['EN'],
        params: '23M',
        gpuRequired: false,
        backend: 'ollama',
        description: 'Lightweight model for fast processing'
    },
    'sentence-transformers': {
        name: 'sentence-transformers',
        displayName: 'Sentence Transformers',
        languages: ['Multi'],
        params: '110M',
        gpuRequired: false,
        backend: 'ollama',
        description: 'Popular choice for sentence embeddings'
    },
    'ollama:nomic-embed-text': {
        name: 'ollama:nomic-embed-text',
        displayName: 'Nomic Embed Text (Ollama)',
        languages: ['Multi'],
        params: '137M',
        gpuRequired: false,
        backend: 'ollama',
        description: 'Explicit Ollama backend specification'
    },
    'ollama:mxbai-embed-large': {
        name: 'ollama:mxbai-embed-large',
        displayName: 'MXBai Embed Large (Ollama)',
        languages: ['EN'],
        params: '335M',
        gpuRequired: true,
        backend: 'ollama',
        description: 'Explicit Ollama backend specification'
    },
    'ollama:all-minilm': {
        name: 'ollama:all-minilm',
        displayName: 'All-MiniLM (Ollama)',
        languages: ['EN'],
        params: '23M',
        gpuRequired: false,
        backend: 'ollama',
        description: 'Explicit Ollama backend specification'
    },
    'transformers:all-MiniLM-L6-v2': {
        name: 'transformers:all-MiniLM-L6-v2',
        displayName: 'All-MiniLM-L6-v2',
        languages: ['EN'],
        params: '23M',
        gpuRequired: false,
        backend: 'folder-mcp',  // Changed from 'transformers.js' to 'folder-mcp'
        description: 'Offline model, no external dependencies'
    },
    'all-mpnet-base-v2': {
        name: 'all-mpnet-base-v2',
        displayName: 'All-MPNet Base v2',
        languages: ['EN'],
        params: '110M',
        gpuRequired: false,
        backend: 'ollama',
        description: 'General-purpose model with good accuracy'
    },
    'all-MiniLM-L6-v2': {
        name: 'all-MiniLM-L6-v2',
        displayName: 'All-MiniLM-L6-v2',
        languages: ['EN'],
        params: '23M',
        gpuRequired: false,
        backend: 'ollama',
        description: 'Lightweight and fast'
    },
    'codebert-base': {
        name: 'codebert-base',
        displayName: 'CodeBERT Base',
        languages: ['Code'],
        params: '125M',
        gpuRequired: false,
        backend: 'ollama',
        description: 'Optimized for source code understanding'
    }
};

/**
 * Get metadata for a specific model
 * @param modelName The model identifier
 * @returns ModelMetadata or undefined if not found
 */
export function getModelMetadata(modelName: string): ModelMetadata | undefined {
    return modelMetadata[modelName];
}

/**
 * Get all models with their metadata
 * @returns Array of ModelMetadata objects
 */
export function getAllModelsWithMetadata(): ModelMetadata[] {
    return Object.values(modelMetadata);
}

/**
 * Get model display options for SelectionListItem
 * @returns Array suitable for SelectionListItem options
 */
export function getModelOptions(): Array<{ value: string; label: string }> {
    return Object.entries(modelMetadata).map(([key, meta]) => ({
        value: key,
        label: meta.recommended ? `${meta.displayName} (Recommended)` : meta.displayName
    }));
}

/**
 * Format model metadata for column display
 * @param model ModelMetadata object
 * @param columnWidths Optional column widths for formatting
 * @returns Formatted string for display
 */
export function formatModelForDisplay(
    model: ModelMetadata,
    columnWidths?: { name: number; languages: number; params: number; gpu: number; backend: number }
): string {
    const widths = columnWidths || {
        name: 20,
        languages: 8,
        params: 8,
        gpu: 8,
        backend: 12
    };
    
    const name = model.displayName.padEnd(widths.name);
    const languages = model.languages.join(',').padEnd(widths.languages);
    const params = model.params.padEnd(widths.params);
    const gpu = (model.gpuRequired ? 'GPU Req' : 'No GPU').padEnd(widths.gpu);
    const backend = model.backend.padEnd(widths.backend);
    
    return `${name} │ ${languages} │ ${params} │ ${gpu} │ ${backend}`;
}

/**
 * Calculate responsive column widths based on terminal width
 * @param terminalWidth Available terminal width
 * @returns Column widths object
 */
export function calculateColumnWidths(terminalWidth: number): {
    name: number;
    languages: number;
    params: number;
    gpu: number;
    backend: number;
} {
    // Reserve space for borders and separators (5 separators × 3 chars = 15)
    const availableWidth = terminalWidth - 15;
    
    // Minimum widths
    const minWidths = { name: 15, languages: 6, params: 6, gpu: 7, backend: 10 };
    const minTotal = Object.values(minWidths).reduce((a, b) => a + b, 0);
    
    if (availableWidth <= minTotal) {
        return minWidths;
    }
    
    // Distribute extra space proportionally
    const extra = availableWidth - minTotal;
    const nameExtra = Math.floor(extra * 0.4);
    const othersExtra = Math.floor(extra * 0.15);
    
    return {
        name: minWidths.name + nameExtra,
        languages: minWidths.languages + othersExtra,
        params: minWidths.params + othersExtra,
        gpu: minWidths.gpu + othersExtra,
        backend: minWidths.backend + othersExtra
    };
}