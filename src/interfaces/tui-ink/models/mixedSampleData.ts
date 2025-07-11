import { IListItem } from '../components/core/IListItem';
import { LogItem } from '../components/core/LogItem';
import { ConfigurationListItem } from '../components/core/ConfigurationListItem';
import { SelectionListItem } from '../components/core/SelectionListItem';
import { FilePickerListItem } from '../components/core/FilePickerListItem';
import { SimpleButtonsRow } from '../components/core/SimpleButtonsRow';
import { validators } from '../utils/validators';
import { ValidationRules } from '../models/validation';
import { ValidationRegistry } from '../../../config/ValidationRegistry';
import * as os from 'os';

// Combined items for SecondaryPanel - all demo/test items
export function createStatusPanelItems(): IListItem[] {
    return [
        // ===== CONFIGURATION ITEMS (from MainPanel) =====
        
        // Test SelectionListItem with detailed view (Task 8)
        new SelectionListItem(
            '■',
            'Choose AI Model',
            [
                { 
                    value: 'gpt4', 
                    label: 'GPT-4',
                    details: {
                        provider: 'OpenAI',
                        speed: 'Slow',
                        cost: '$$$',
                        quality: 'Excellent'
                    }
                },
                { 
                    value: 'gpt4-turbo', 
                    label: 'GPT-4 Turbo',
                    details: {
                        provider: 'OpenAI',
                        speed: 'Medium',
                        cost: '$$',
                        quality: 'Excellent'
                    }
                },
                { 
                    value: 'gpt35', 
                    label: 'GPT-3.5 Turbo',
                    details: {
                        provider: 'OpenAI',
                        speed: 'Fast',
                        cost: '$',
                        quality: 'Good'
                    }
                },
                { 
                    value: 'claude3-opus', 
                    label: 'Claude 3 Opus',
                    details: {
                        provider: 'Anthropic',
                        speed: 'Medium',
                        cost: '$$$',
                        quality: 'Excellent'
                    }
                },
                { 
                    value: 'claude3-sonnet', 
                    label: 'Claude 3 Sonnet',
                    details: {
                        provider: 'Anthropic',
                        speed: 'Fast',
                        cost: '$$',
                        quality: 'Excellent'
                    }
                },
                { 
                    value: 'claude3-haiku', 
                    label: 'Claude 3 Haiku',
                    details: {
                        provider: 'Anthropic',
                        speed: 'Very Fast',
                        cost: '$',
                        quality: 'Good'
                    }
                },
                { 
                    value: 'claude2', 
                    label: 'Claude 2.1',
                    details: {
                        provider: 'Anthropic',
                        speed: 'Medium',
                        cost: '$$',
                        quality: 'Very Good'
                    }
                },
                { 
                    value: 'llama2-70b', 
                    label: 'Llama 2 70B',
                    details: {
                        provider: 'Meta',
                        speed: 'Medium',
                        cost: '$$',
                        quality: 'Very Good'
                    }
                },
                { 
                    value: 'llama2-13b', 
                    label: 'Llama 2 13B',
                    details: {
                        provider: 'Meta',
                        speed: 'Fast',
                        cost: '$',
                        quality: 'Good'
                    }
                },
                { 
                    value: 'llama2-7b', 
                    label: 'Llama 2 7B',
                    details: {
                        provider: 'Meta',
                        speed: 'Very Fast',
                        cost: '$',
                        quality: 'Fair'
                    }
                },
                { 
                    value: 'codellama', 
                    label: 'Code Llama',
                    details: {
                        provider: 'Meta',
                        speed: 'Fast',
                        cost: '$',
                        quality: 'Good*'
                    }
                },
                { 
                    value: 'mixtral-8x7b', 
                    label: 'Mixtral 8x7B',
                    details: {
                        provider: 'Mistral AI',
                        speed: 'Fast',
                        cost: '$',
                        quality: 'Good'
                    }
                },
                { 
                    value: 'mistral-7b', 
                    label: 'Mistral 7B',
                    details: {
                        provider: 'Mistral AI',
                        speed: 'Very Fast',
                        cost: '$',
                        quality: 'Fair'
                    }
                },
                { 
                    value: 'gemini-pro', 
                    label: 'Gemini Pro',
                    details: {
                        provider: 'Google',
                        speed: 'Medium',
                        cost: '$$',
                        quality: 'Very Good'
                    }
                },
                { 
                    value: 'gemini-ultra', 
                    label: 'Gemini Ultra',
                    details: {
                        provider: 'Google',
                        speed: 'Slow',
                        cost: '$$$',
                        quality: 'Excellent'
                    }
                },
                { 
                    value: 'palm2', 
                    label: 'PaLM 2',
                    details: {
                        provider: 'Google',
                        speed: 'Medium',
                        cost: '$$',
                        quality: 'Good'
                    }
                },
                { 
                    value: 'command-r', 
                    label: 'Command R',
                    details: {
                        provider: 'Cohere',
                        speed: 'Fast',
                        cost: '$$',
                        quality: 'Good'
                    }
                },
                { 
                    value: 'command-r-plus', 
                    label: 'Command R+',
                    details: {
                        provider: 'Cohere',
                        speed: 'Medium',
                        cost: '$$$',
                        quality: 'Very Good'
                    }
                },
                { 
                    value: 'falcon-180b', 
                    label: 'Falcon 180B',
                    details: {
                        provider: 'TII',
                        speed: 'Slow',
                        cost: '$$',
                        quality: 'Good'
                    }
                },
                { 
                    value: 'falcon-40b', 
                    label: 'Falcon 40B',
                    details: {
                        provider: 'TII',
                        speed: 'Medium',
                        cost: '$',
                        quality: 'Fair'
                    }
                }
            ],
            ['claude3-sonnet'],
            false,
            'radio',
            'vertical',
            (newValues) => console.log('AI Model selected:', newValues),
            undefined,
            undefined,
            false,
            true,
            ['provider', 'speed', 'cost', 'quality']
        ),
        
        // Destructive confirmation test items
        new ConfigurationListItem(
            '·',
            'Embedding Model',
            'nomic-embed-text',
            false,
            false,
            undefined,
            undefined,
            undefined,
            (newValue) => console.log('Embedding model changed to:', newValue),
            [],
            false,
            'e.g., text-embedding-3-large',
            {
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
        ),
        
        new ConfigurationListItem(
            '·',
            'API Key',
            '',
            false,
            false,
            undefined,
            undefined,
            undefined,
            (newValue) => console.log('API key changed to:', newValue),
            [],
            false,
            'Enter your API key...',
            {
                level: 'warning',
                title: 'API Key Change',
                message: 'Changing the API key will affect all API requests.',
                confirmText: 'Update Key',
                cancelText: 'Cancel'
            }
        ),
        
        new ConfigurationListItem(
            '·',
            'Email (with error)',
            'not-an-email',
            false,
            false,
            undefined,
            undefined,
            undefined,
            (newValue) => console.log('Email changed to:', newValue),
            ValidationRegistry.getTuiValidators('user.email'),
            false,
            'user@example.com',
            {
                level: 'warning',
                title: 'Email Update',
                message: 'Changing the email will update all notifications.',
                confirmText: 'Yes',
                cancelText: 'No'
            }
        ),
        
        new ConfigurationListItem(
            '·',
            'Admin Password',
            'weak',
            false,
            false,
            undefined,
            undefined,
            undefined,
            (newValue) => console.log('Password changed to:', newValue),
            [validators.password],
            true,
            undefined,
            {
                level: 'critical',
                title: 'Password Change',
                message: 'Changing the admin password will log out all users.',
                consequences: [
                    'All active sessions will be terminated',
                    'Users will need to re-authenticate'
                ],
                confirmText: 'Change Password',
                cancelText: 'Keep Current'
            },
            [
                ValidationRules.minLength(8, 'Password must be at least 8 characters'),
                ValidationRules.customRegex(/.*\d.*/, undefined, 'Password must contain at least one number')
            ]
        ),
        
        // File pickers (Project Folder moved to MainPanel)
        
        new FilePickerListItem(
            '📄',
            'Select Config File',
            '/Users/hanan',
            false,
            'file',
            (path) => console.log('Config file selected:', path),
            ['*.json', '*.yaml', '*.yml', '*.toml']
        ),
        
        new FilePickerListItem(
            '📄',
            'Missing File',
            '/Users/hanan/non-existent-file.txt',
            false,
            'file',
            (path) => console.log('Missing file selected:', path)
        ),
        
        // Current TextInput features
        new LogItem(
            '○',
            'LogItem (existing component)',
            'ℹ',
            false,
            false,
            ['LogItem is our existing read-only component', 'Used as reference for new components']
        ),
        
        new ConfigurationListItem(
            '·',
            'TextInput (no validation)',
            'Sample text value',
            false,
            false,
            undefined,
            undefined,
            undefined,
            (newValue) => console.log('Text changed to:', newValue),
            [],
            false,
            'Enter some text...'
        ),
        
        new ConfigurationListItem(
            '·',
            'CPU Threads',
            '8',
            false,
            false,
            'Number of threads (1-32)',
            undefined,
            undefined,
            (newValue) => console.log('Threads changed to:', newValue),
            [validators.number(1, 32)]
        ),
        
        new ConfigurationListItem(
            '·',
            'TextInput (email)',
            '',
            false,
            false,
            'Email validation',
            undefined,
            undefined,
            (newValue) => console.log('Email changed to:', newValue),
            ValidationRegistry.getTuiValidators('user.email'),
            false,
            'user@example.com'
        ),
        
        new ConfigurationListItem(
            '·',
            'TextInput (IPv4)',
            '192.168.1.1',
            false,
            false,
            'IP address validation',
            undefined,
            undefined,
            (newValue) => console.log('IP changed to:', newValue),
            ValidationRegistry.getTuiValidators('server.host')
        ),
        
        new ConfigurationListItem(
            '·',
            'TextInput (regex: [A-Z]{3})',
            'ABC',
            false,
            false,
            'Custom pattern: 3 uppercase letters',
            undefined,
            undefined,
            (newValue) => console.log('Pattern changed to:', newValue),
            [validators.regex(/^[A-Z]{3}$/, 'Must be exactly 3 uppercase letters')]
        ),
        
        new ConfigurationListItem(
            '·',
            'Password',
            '',
            false,
            false,
            'Strong password required',
            undefined,
            undefined,
            (newValue) => console.log('Password changed to:', newValue),
            [validators.password],
            true,
            'Enter password'
        ),
        
        // SelectionListItem components
        new SelectionListItem(
            '■',
            'SelectionList (theme)',
            [
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'auto', label: 'Auto' }
            ],
            ['auto'],
            false,
            'radio',
            'vertical',
            (newValues) => console.log('Theme changed to:', newValues)
        ),
        
        new SelectionListItem(
            '■',
            'SelectionList (features)',
            [
                { value: 'autosave', label: 'Auto-save' },
                { value: 'notifications', label: 'Notifications' },
                { value: 'telemetry', label: 'Telemetry' },
                { value: 'updates', label: 'Auto-updates' }
            ],
            ['autosave', 'notifications'],
            false,
            'checkbox',
            'vertical',
            (newValues) => console.log('Features changed to:', newValues),
            1,
            3
        ),
        
        // Invalid value test cases
        new ConfigurationListItem(
            '·',
            'Weak Password',
            'weak',
            false,
            false,
            undefined,
            undefined,
            undefined,
            (newValue) => console.log('Weak password changed to:', newValue),
            [validators.passwordWithStrength],
            true
        ),
        
        new ConfigurationListItem(
            '·',
            'Invalid Pattern',
            'abc123',
            false,
            false,
            'Pattern: 3 uppercase letters',
            undefined,
            undefined,
            (newValue) => console.log('Pattern changed to:', newValue),
            [validators.regex(/^[A-Z]{3}$/, 'Must be exactly 3 uppercase letters')]
        ),
        
        new ConfigurationListItem(
            '·',
            'Too Short',
            'Hi',
            false,
            false,
            undefined,
            undefined,
            undefined,
            (newValue) => console.log('Short text changed to:', newValue),
            [validators.minLength(5)]
        ),
        
        // ===== STATUS/PROGRESS ITEMS (original SecondaryPanel content) =====
        
        // ProgressBar test items
        new LogItem(
            '⋯',
            'ProgressBar: Basic 0%',
            '⋯',
            false,
            false,
            [
                'Testing basic ProgressBar component',
                'Value: 0%',
                'Should show "⠋ 0%" (spinner + space + 0%)'
            ],
            0
        ),
        new LogItem(
            '⋯',
            'ProgressBar: Basic 50%',
            '⋯',
            false,
            false,
            [
                'Testing basic ProgressBar component',
                'Value: 50%',
                'Should show "⠋50%" (spinner + 50%)'
            ],
            50
        ),
        new LogItem(
            '⋯',
            'ProgressBar: Basic 100%',
            '⋯',
            false,
            false,
            [
                'Testing basic ProgressBar component',
                'Value: 100%',
                'Should show green "✓   " (no spinner)'
            ],
            100
        ),
        new LogItem(
            '⋯',
            'ProgressBar: Indeterminate',
            '⋯',
            false,
            false,
            [
                'Testing basic ProgressBar component',
                'Value: undefined (indeterminate)',
                'Should show "⠋   " (spinner + 3 spaces)'
            ],
            undefined
        ),
        new LogItem(
            '⋯',
            'ProgressBar: Low (5%)',
            '⋯',
            false,
            false,
            [
                'Testing single digit percentage',
                'Value: 5%',
                'Should show "⠋ 5%" (spinner + space + 5%)'
            ],
            5
        ),
        new LogItem(
            '⋯',
            'ProgressBar: High (95%)',
            '⋯',
            false,
            false,
            [
                'Testing high percentage',
                'Value: 95%',
                'Should show "⠋95%" (no padding)'
            ],
            95
        ),
        new LogItem(
            '⋯',
            'ProgressBar: Error state',
            '⋯',
            false,
            false,
            [
                'Testing error state',
                'Value: -1 (error)',
                'Should show red "✗ERR" (error indicator)'
            ],
            -1
        ),
        new LogItem(
            '⋯',
            'Long Progress Test',
            '⋯',
            false,
            false,
            [
                'Testing long mode progress bar',
                'This would show full bar in wide panels',
                'Format: [spinner][bar][percentage]'
            ],
            75
        ),
        
        // Components test status
        new LogItem(
            '○',
            'LogItem (existing)',
            '✓',
            false,
            false,
            [
                'This is an existing LogItem component',
                'It supports expandable details',
                'Read-only display'
            ]
        ),
        
        new ConfigurationListItem(
            '·',
            'Port',
            '8080',
            false,
            false,
            'Port 1-65535',
            undefined,
            undefined,
            (newValue) => console.log('Port changed to:', newValue),
            ValidationRegistry.getTuiValidators('server.port')
        ),
        
        new ConfigurationListItem(
            '·',
            'Email',
            'user@example.com',
            false,
            false,
            'Email validation',
            undefined,
            undefined,
            (newValue) => console.log('Email changed to:', newValue),
            ValidationRegistry.getTuiValidators('user.email')
        ),
        
        new ConfigurationListItem(
            '·',
            'TextInput (password)',
            'MyPass123!',
            false,
            false,
            undefined,
            undefined,
            undefined,
            (newValue) => console.log('Password changed to:', newValue),
            [validators.password],
            true
        ),
        
        // SelectionListItem components
        new SelectionListItem(
            '■',
            'SelectionList (log level)',
            [
                { value: 'debug', label: 'Debug' },
                { value: 'info', label: 'Info' },
                { value: 'warn', label: 'Warning' },
                { value: 'error', label: 'Error' }
            ],
            ['info'],
            false,
            'radio',
            'horizontal',
            (newValues) => console.log('Log level changed to:', newValues),
            1,
            1
        ),
        
        new SelectionListItem(
            '■',
            'SelectionList (decision)',
            [
                { value: 'approve', label: 'Approve' },
                { value: 'decline', label: 'Decline' }
            ],
            ['approve'],
            false,
            'radio',
            'horizontal',
            (newValues) => console.log('Decision changed to:', newValues)
        ),
        
        new FilePickerListItem(
            '📂',
            'Select File',
            process.cwd(),
            false,
            'file',
            (path) => console.log('File selected:', path),
            ['*.ts', '*.tsx', '*.js', '*.jsx']
        ),
        
        // Invalid default value test cases
        new ConfigurationListItem(
            '·',
            'Invalid Email',
            'not-an-email',
            false,
            false,
            undefined,
            undefined,
            undefined,
            (newValue) => console.log('Invalid email changed to:', newValue),
            ValidationRegistry.getTuiValidators('user.email')
        ),
        
        new ConfigurationListItem(
            '·',
            'Port (out of range)',
            '99999',
            false,
            false,
            'Port 1024-65535',
            undefined,
            undefined,
            (newValue) => console.log('Invalid port changed to:', newValue),
            [validators.number(1024, 65535)]
        ),
        
        new ConfigurationListItem(
            '·',
            'Invalid IP',
            '192.168.1.999',
            false,
            false,
            undefined,
            undefined,
            undefined,
            (newValue) => console.log('Invalid IP changed to:', newValue),
            ValidationRegistry.getTuiValidators('server.host')
        ),
        
        // SimpleButtonsRow with our navigation fix
        new SimpleButtonsRow(
            '⚡',
            'Quick Actions',
            [
                {
                    name: 'save',
                    borderColor: '#10b981', // green
                    text: 'Save',
                    eventValue: 'save-config'
                },
                {
                    name: 'reset',
                    borderColor: '#f59e0b', // amber 
                    text: 'Reset',
                    eventValue: 'reset-config'
                },
                {
                    name: 'exit',
                    borderColor: '#ef4444', // red
                    text: 'Exit',
                    eventValue: 'exit-app'
                }
            ],
            false, // isActive will be managed by GenericListPanel
            (button, index) => {
                console.log(`Button "${button.name}" activated with value:`, button.eventValue);
                if (button.eventValue === 'exit-app') {
                    console.log('Exit button pressed - would quit application');
                } else if (button.eventValue === 'save-config') {
                    console.log('Save button pressed - would save configuration');
                } else if (button.eventValue === 'reset-config') {
                    console.log('Reset button pressed - would reset configuration');
                }
            }
        )
    ];
}

// Single file picker for MainPanel
export function createConfigurationPanelItems(): IListItem[] {
    const picker = new FilePickerListItem(
        '📁',
        'Project Folder',
        os.homedir(),
        false,
        'folder',
        (path) => console.log('Folder selected:', path)
    );
    
    // Don't auto-expand - let user navigate to it manually
    
    return [picker];
}