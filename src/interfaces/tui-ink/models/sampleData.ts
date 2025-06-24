import { StatusItem } from './StatusItem.js';

export const configItems: string[] = [
    'Create optimized configuration for my machine',
    'Manual configuration wizard with extremely long text that should definitely overflow the container boundaries and break things if not handled properly',
    'Load existing configuration',
    'Select embedding model',
    'Configure cache directory',
    'Set memory limits',
    'Enable debug logging',
    'Configure network timeouts',
    'Export current configuration',
    'Reset to factory defaults',
    'Run configuration wizard',
    'Validate current configuration',
    'Import settings from file',
    'Export settings to file',
    'Reset individual settings',
    'Backup current configuration',
    'Restore from backup',
    'View configuration history',
    'Compare configurations',
    'Merge configuration files'
];

export const statusItems: StatusItem[] = [
    { text: 'System components loaded', status: '✓' },
    { text: 'Checking cached configuration with an extremely long description that would overflow', status: '⋯' },
    { text: 'Loading default settings', status: '' },
    { text: 'Validating embedding models', status: '⚠' },
    { text: 'Memory usage: 1.2GB / 8GB', status: '✓' },
    { text: 'Cache size: 456MB', status: '' },
    { text: 'Indexed files: 1,234', status: '✓' },
    { text: 'Last sync: 2 minutes ago', status: '' },
    { text: 'Network: Connected', status: '✓' },
    { text: 'Embedding model: Nomic-1.5', status: '' },
    { text: 'Processing queue: Empty', status: '✓' },
    { text: 'Error count: 0', status: '✓' },
    { text: 'CPU usage: 15%', status: '' },
    { text: 'Disk I/O: Normal', status: '✓' },
    { text: 'Config version: 1.0.0', status: '' },
    { text: 'Auto-save: Enabled', status: '✓' },
    { text: 'Backup status: Current', status: '✓' },
    { text: 'Updates: Available', status: '⚠' },
    { text: 'License: Valid', status: '✓' },
    { text: 'Plugins: 3 active', status: '' }
];