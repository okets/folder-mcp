import { IListItem } from '../components/core/IListItem.js';
import { LogItem } from '../components/core/LogItem.js';
import { ConfigurationListItem } from '../components/core/ConfigurationListItem.js';
import { SelectionListItem } from '../components/core/SelectionListItem.js';
import { FilePickerListItem } from '../components/core/FilePickerListItem.js';
import { validators } from '../utils/validators.js';
import * as os from 'os';

// Mixed items for StatusPanel (now showing both logs and configs)
export function createStatusPanelItems(): IListItem[] {
    return [
        // Components we're actually building
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
            [validators.number(1, 65535)]
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
            [validators.email]
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
            true  // isPassword
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
            ['*.ts', '*.tsx', '*.js', '*.jsx'] // Filter for code files
        ),
        
        // Test cases with invalid default values
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
            [validators.email]
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
            [validators.ipv4]
        ),
        
        new LogItem(
            '○',
            'ProgressItem (TODO)',
            '○',
            false,
            false
        )
    ];
}

// Mixed items for ConfigurationPanel (now showing configs with inline help/status)
export function createConfigurationPanelItems(): IListItem[] {
    return [
        // File picker as first item
        new FilePickerListItem(
            '📁',
            'Project Folder',
            os.homedir(),
            false,
            'folder',
            (path) => console.log('Folder selected:', path)
        ),
        // File picker to test file mode (second position)
        new FilePickerListItem(
            '📄',
            'Select Config File',
            '/Users/hanan',
            false,
            'file',
            (path) => console.log('Config file selected:', path),
            ['*.json', '*.yaml', '*.yml', '*.toml']
        ),
        
        // Test case: File picker with non-existent file
        new FilePickerListItem(
            '📄',
            'Missing File',
            '/Users/hanan/non-existent-file.txt',
            false,
            'file',
            (path) => console.log('Missing file selected:', path)
        ),
        // Current TextInput features being tested
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
            [validators.email],
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
            [validators.ipv4]
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
            true,  // isPassword
            'Enter password'
        ),
        // SelectionListItem components (Task 2 - Completed)
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
            1,  // Minimum 1 selection
            3   // Maximum 3 selections
        ),
        
        // More test cases with invalid values
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
            true  // isPassword
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
        
        new LogItem(
            '○',
            'ProgressItem (Task 4 - TODO)',
            '○',
            false,
            false,
            ['Extends LogItem', 'Progress bar visualization']
        )
    ];
}