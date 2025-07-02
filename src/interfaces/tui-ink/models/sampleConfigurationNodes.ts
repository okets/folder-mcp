import type { ConfigurationNode } from './configuration';
import { ValidationRules } from './validation';

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
            ValidationRules.required<string>('Folder path is required'),
            ValidationRules.path()
        ]
    },
    {
        id: 'embedding-model',
        type: 'text',
        label: 'Embedding Model',
        description: 'Model to use for semantic embeddings',
        value: 'nomic-embed-text',
        defaultValue: 'nomic-embed-text',
        placeholder: 'e.g., nomic-embed-text',
        destructive: {
            level: 'critical',
            title: 'Model Change Impact',
            message: 'Changing the embedding model will trigger a full reindex of all documents.',
            consequences: [
                'All existing embeddings will be deleted',
                'Documents will be reprocessed',
                'Operation may consume API credits'
            ],
            estimatedTime: '15-20 minutes',
            confirmText: 'Change Model',
            cancelText: 'Keep Current'
        }
    },
    {
        id: 'cache-directory',
        type: 'text',
        label: 'Cache Directory',
        description: 'Directory for storing cached embeddings',
        value: '~/.folder-mcp/cache',
        defaultValue: '~/.folder-mcp/cache',
        placeholder: 'Enter cache directory path...',
        destructive: {
            level: 'warning',
            title: 'Clear Cache Warning',
            message: 'Changing the cache directory will clear the existing cache.',
            confirmText: 'Yes',
            cancelText: 'No'
        }
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
            ValidationRules.number({ min: 128, max: 32768, integer: true }, 'Memory limit must be between 128 and 32768 MB')
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
        placeholder: 'e.g., 30',
        validation: [
            ValidationRules.number({ min: 1, max: 300, integer: true })
        ]
    },
    {
        id: 'server-port',
        type: 'text',
        label: 'Server Port',
        description: 'Port number for the MCP server',
        value: '3000',
        defaultValue: '3000',
        placeholder: 'e.g., 3000',
        validation: [
            ValidationRules.number({ min: 1024, max: 65535, integer: true })
        ]
    },
    {
        id: 'admin-email',
        type: 'text',
        label: 'Administrator Email',
        description: 'Email address for system notifications',
        value: '',
        defaultValue: '',
        placeholder: 'admin@example.com',
        validation: [
            ValidationRules.email()
        ]
    },
    {
        id: 'server-ip',
        type: 'text',
        label: 'Server IP Address',
        description: 'IP address to bind the server to',
        value: '127.0.0.1',
        defaultValue: '127.0.0.1',
        placeholder: '0.0.0.0',
        validation: [
            ValidationRules.ipAddress('v4')
        ]
    },
    {
        id: 'api-key',
        type: 'text',
        label: 'API Key',
        description: 'API key for external services (must be 32 alphanumeric characters)',
        value: '',
        defaultValue: '',
        placeholder: 'Enter 32-character API key...',
        validation: [
            ValidationRules.customRegex(/^[a-zA-Z0-9]{32}$/, undefined, 'API key must be exactly 32 alphanumeric characters')
        ]
    },
    {
        id: 'max-file-count',
        type: 'text',
        label: 'Max File Count',
        description: 'Maximum number of files to index',
        value: '1000',
        defaultValue: '1000',
        placeholder: 'e.g., 5000',
        validation: [
            ValidationRules.number({ min: 1, max: 100000, integer: true }, 'Must be between 1 and 100,000')
        ]
    },
    {
        id: 'admin-password',
        type: 'text',
        label: 'Admin Password',
        description: 'Password for admin access (min 8 chars, must include number)',
        value: '',
        defaultValue: '',
        placeholder: 'Enter password...',
        password: true, // This will mask the input when implemented
        validation: [
            ValidationRules.minLength(8, 'Password must be at least 8 characters'),
            ValidationRules.customRegex(/.*\d.*/, undefined, 'Password must contain at least one number')
        ]
    },
    {
        id: 'reset-settings',
        type: 'text',
        label: 'Configuration Preset',
        description: 'Select a configuration preset',
        value: 'custom',
        defaultValue: 'custom',
        placeholder: 'custom',
        destructive: {
            level: 'warning',
            title: 'Reset Configuration',
            message: 'Changing preset will reset all settings to their defaults for the selected preset.',
            consequences: [
                'All custom configurations will be lost',
                'Current indexing will be interrupted',
                'Cache may be cleared'
            ],
            confirmText: 'Reset',
            cancelText: 'Keep',
            confirmSettingInitialValue: false
        }
    },
    {
        id: 'delete-all-data',
        type: 'text',
        label: 'Data Management',
        description: 'Manage indexed data and cache',
        value: 'preserve',
        defaultValue: 'preserve',
        placeholder: 'preserve',
        destructive: {
            level: 'critical',
            title: 'Delete All Data',
            message: 'This will permanently delete all indexed documents and cached embeddings.',
            consequences: [
                'All indexed documents will be removed',
                'All embeddings will be deleted',
                'All cache files will be purged',
                'This action cannot be undone'
            ],
            estimatedTime: 'Immediate',
            confirmText: 'Delete',
            cancelText: 'Cancel'
        }
    }
];