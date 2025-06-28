import { IListItem } from '../components/core/IListItem.js';
import { LogItem } from '../components/core/LogItem.js';
import { ConfigurationListItem } from '../components/core/ConfigurationListItem.js';
import { validators } from '../utils/validators.js';

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
            'TextInput (number)',
            '8080',
            false,
            false,
            '1024-65535',
            undefined,
            undefined,
            (newValue) => console.log('Port changed to:', newValue),
            [validators.number(1024, 65535)]
        ),
        new ConfigurationListItem(
            '·',
            'TextInput (email)',
            'user@test.com',
            false,
            false,
            'Valid email',
            undefined,
            undefined,
            (newValue) => console.log('Email changed to:', newValue),
            [validators.email]
        ),
        new ConfigurationListItem(
            '·',
            'TextInput (password)',
            '••••••••',
            false,
            false,
            'Min 8 chars',
            undefined,
            undefined,
            (newValue) => console.log('Password changed to:', newValue),
            [validators.minLength(8)]
        ),
        // Placeholder for future components
        new LogItem(
            '○',
            'SelectionList (TODO)',
            '○',
            false,
            false
        ),
        new LogItem(
            '○',
            'FilePicker (TODO)',
            '○',
            false,
            false
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
            (newValue) => console.log('Text changed to:', newValue)
        ),
        new ConfigurationListItem(
            '·',
            'TextInput (number: 1-100)',
            '50',
            false,
            false,
            'Number validation with range',
            undefined,
            undefined,
            (newValue) => console.log('Number changed to:', newValue),
            [validators.number(1, 100)]
        ),
        new ConfigurationListItem(
            '·',
            'TextInput (email)',
            'admin@example.com',
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
            'TextInput (password)',
            '••••••••',
            false,
            false,
            'Password field (Assignment 1.7)',
            undefined,
            undefined,
            (newValue) => console.log('Password changed to:', newValue),
            [validators.minLength(8)]
        ),
        // Future components as placeholders
        new LogItem(
            '○',
            'SelectionList (Task 2 - TODO)',
            '○',
            false,
            false,
            ['Will support radio/checkbox selections', 'Vertical/horizontal layouts']
        ),
        new LogItem(
            '○',
            'FilePicker (Task 3 - TODO)',
            '○',
            false,
            false,
            ['File/folder selection', 'Compact CLI interface']
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