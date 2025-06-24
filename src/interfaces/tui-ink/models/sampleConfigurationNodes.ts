import type { ConfigurationNode } from './configuration.js';

export const sampleConfigurationNodes: ConfigurationNode[] = [
    {
        id: 'folder-path',
        type: 'text',
        label: 'Folder Path',
        description: 'The root folder to index and serve',
        value: '/Users/example/documents',
        defaultValue: '',
        placeholder: 'Enter path to folder...',
        validation: [
            {
                validate: (value) => value.length > 0,
                message: 'Folder path is required'
            }
        ]
    },
    {
        id: 'embedding-model',
        type: 'text',
        label: 'Embedding Model',
        description: 'Model to use for semantic embeddings',
        value: 'nomic-embed-text',
        defaultValue: 'nomic-embed-text',
        placeholder: 'e.g., nomic-embed-text'
    },
    {
        id: 'cache-directory',
        type: 'text',
        label: 'Cache Directory',
        description: 'Directory for storing cached embeddings',
        value: '~/.folder-mcp/cache',
        defaultValue: '~/.folder-mcp/cache',
        placeholder: 'Enter cache directory path...'
    },
    {
        id: 'memory-limit',
        type: 'text',
        label: 'Memory Limit',
        description: 'Maximum memory usage in MB',
        value: '2048',
        defaultValue: '2048',
        placeholder: 'e.g., 2048',
        validation: [
            {
                validate: (value) => !isNaN(Number(value)) && Number(value) > 0,
                message: 'Memory limit must be a positive number'
            }
        ]
    },
    {
        id: 'hot-reload',
        type: 'yesno',
        label: 'Enable Hot Reload',
        description: 'Automatically reload when files change',
        value: true,
        defaultValue: true
    },
    {
        id: 'debug-logging',
        type: 'yesno',
        label: 'Enable Debug Logging',
        description: 'Show detailed debug information',
        value: false,
        defaultValue: false
    },
    {
        id: 'network-timeout',
        type: 'text',
        label: 'Network Timeout',
        description: 'Timeout for network requests in seconds',
        value: '30',
        defaultValue: '30',
        placeholder: 'e.g., 30'
    }
];