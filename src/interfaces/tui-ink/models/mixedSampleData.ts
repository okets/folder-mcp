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

// Combined items for SecondaryPanel - minimal set for testing
export function createStatusPanelItems(): IListItem[] {
    return [
        // Simple config item
        new ConfigurationListItem(
            '·',
            'Server Port',
            '8080',
            false,
            false,
            'Port 1-65535',
            undefined,
            undefined,
            (newValue) => console.log('Port changed to:', newValue),
            ValidationRegistry.getTuiValidators('server.port')
        ),
        
        // Selection item
        new SelectionListItem(
            '■',
            'Log Level',
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
            (newValues) => console.log('Log level changed to:', newValues)
        ),
        
        // Log item  
        new LogItem(
            '○',
            'System Status',
            '✓',
            false,
            false,
            ['All systems operational', 'Memory usage: 45%', 'Disk space: 78% free']
        ),
        
        // File picker
        new FilePickerListItem(
            '📄',
            'Select Config File',
            process.cwd(),
            false,
            'file',
            (path) => console.log('Config file selected:', path),
            ['*.json', '*.yaml', '*.yml']
        ),
        
        // Quick Actions with useful buttons
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