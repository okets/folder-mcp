import { IListItem } from '../components/core/IListItem.js';
import { LogItem } from '../components/core/LogItem.js';
import { ConfigurationListItem } from '../components/core/ConfigurationListItem.js';

// Mixed items for StatusPanel (now showing both logs and configs)
export function createStatusPanelItems(): IListItem[] {
    return [
        new LogItem(
            '○',
            'System components loaded',
            '✓',
            false,
            false,
            [
                'All core components initialized successfully',
                'Memory allocator: Ready',
                'Thread pool: 8 workers active'
            ]
        ),
        new ConfigurationListItem(
            '·',
            'Debug Mode',
            'Enabled',
            false,
            false,
            undefined,
            undefined,
            undefined,
            (newValue) => console.log('Debug mode changed to:', newValue)
        ),
        new LogItem(
            '○',
            'Validating embedding models',
            '⚠',
            false,
            false,
            [
                'Checking model availability...',
                'Model: nomic-embed-text (1.5GB)',
                'Status: Download in progress (45%)'
            ]
        ),
        new ConfigurationListItem(
            '·',
            'Log Level',
            'INFO',
            false,
            false,
            undefined,
            undefined,
            undefined,
            (newValue) => console.log('Log level changed to:', newValue)
        ),
        new LogItem(
            '○',
            'Loading default settings',
            '○',
            false,
            false
        ),
        new LogItem(
            '○',
            'Checking cached configuration',
            '⋯',
            false,
            false
        ),
        new ConfigurationListItem(
            '·',
            'Auto-reload',
            'Off',
            false,
            false,
            undefined,
            undefined,
            undefined,
            (newValue) => console.log('Auto-reload changed to:', newValue)
        ),
        new LogItem(
            '○',
            'Memory usage: 1.2GB / 8GB',
            '✓',
            false,
            false,
            [
                'Process memory: 1.2GB',
                'Cache memory: 456MB',
                'Available: 6.8GB'
            ]
        )
    ];
}

// Mixed items for ConfigurationPanel (now showing configs with inline help/status)
export function createConfigurationPanelItems(): IListItem[] {
    return [
        new LogItem(
            '○',
            'Path validation',
            '✓',
            false,
            false,
            ['Path exists and is readable', 'Contains 1,234 files']
        ),
        new ConfigurationListItem(
            '·',
            'Folder Path',
            '/Users/example/documents',
            false,
            false,
            undefined,
            undefined,
            undefined,
            (newValue) => console.log('Folder path changed to:', newValue)
        ),
        new ConfigurationListItem(
            '·',
            'Embedding Model',
            'nomic-embed-text',
            false,
            false,
            undefined,
            undefined,
            undefined,
            (newValue) => console.log('Embedding model changed to:', newValue)
        ),
        new LogItem(
            '○',
            'Model status',
            '⚠',
            false,
            false,
            ['Model not fully downloaded', 'Size: 1.5GB', 'Progress: 45%']
        ),
        new ConfigurationListItem(
            '·',
            'Cache Directory',
            '~/.folder-mcp/cache',
            false,
            false,
            undefined,
            undefined,
            undefined,
            (newValue) => console.log('Cache directory changed to:', newValue)
        ),
        new ConfigurationListItem(
            '·',
            'Memory Limit',
            '2048',
            false,
            false,
            undefined,
            undefined,
            undefined,
            (newValue) => console.log('Memory limit changed to:', newValue)
        ),
        new LogItem(
            '○',
            'Performance tip',
            'ℹ',
            false,
            false,
            ['Increase memory limit for better performance', 'Recommended: 4096MB for large folders']
        ),
        new ConfigurationListItem(
            '·',
            'Network Timeout',
            '30',
            false,
            false,
            undefined,
            undefined,
            undefined,
            (newValue) => console.log('Network timeout changed to:', newValue)
        )
    ];
}