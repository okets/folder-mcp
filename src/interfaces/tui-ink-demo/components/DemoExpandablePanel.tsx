import React from 'react';
import { Box } from 'ink';
import { ExpandableDataPanel } from './core/ExpandableDataPanel';
import { TextInputItem } from './core/items/TextInputItem';
import { LogItem, sampleLogs } from './core/items/LogItem';
import { useNavigation } from '../hooks/useNavigation';
import { useTerminalSize } from '../hooks/useTerminalSize';
import { ThemeProvider } from '../../tui-ink/contexts/ThemeContext';

// Mixed item types for demo
type DemoItem = 
    | { type: 'config'; label: string; value: string }
    | { type: 'log'; log: typeof sampleLogs[0] }
    | { type: 'simple'; text: string };

const demoItems: DemoItem[] = [
    { type: 'simple', text: 'Welcome to Expandable Items Demo' },
    { type: 'config', label: 'API Endpoint', value: 'https://api.example.com' },
    { type: 'config', label: 'Port Number', value: '8080' },
    { type: 'simple', text: '--- Recent Logs ---' },
    ...sampleLogs.map(log => ({ type: 'log' as const, log })),
    { type: 'config', label: 'Debug Mode', value: 'enabled' },
    { type: 'config', label: 'Cache Directory', value: '/var/cache/app' },
];

/**
 * Demo panel showing mixed expandable and non-expandable items
 */
export const DemoExpandablePanel: React.FC = () => {
    const navigation = useNavigation();
    const { columns, rows } = useTerminalSize();
    const [configValues, setConfigValues] = React.useState<Record<string, string>>({
        'API Endpoint': 'https://api.example.com',
        'Port Number': '8080',
        'Debug Mode': 'enabled',
        'Cache Directory': '/var/cache/app'
    });
    
    // Determine which items are expandable
    const isExpandable = (item: DemoItem): boolean => {
        return item.type === 'config' || item.type === 'log';
    };
    
    // Render expandable items
    const renderExpandableItem = (item: DemoItem, index: number, isActive: boolean, isExpanded: boolean) => {
        switch (item.type) {
            case 'config':
                return (
                    <TextInputItem
                        label={item.label}
                        value={configValues[item.label] || item.value}
                        onChange={(newValue) => {
                            setConfigValues(prev => ({
                                ...prev,
                                [item.label]: newValue
                            }));
                        }}
                        isActive={isActive}
                        width={columns - 6}
                    />
                );
            
            case 'log':
                return (
                    <LogItem
                        log={item.log}
                        isActive={isActive}
                        width={columns - 6}
                        timestampFormat="relative"
                    />
                );
            
            default:
                return null;
        }
    };
    
    return (
        <ThemeProvider>
            <Box flexDirection="column" height={rows}>
                <ExpandableDataPanel
                    title="Expandable Items Demo"
                    subtitle="Press Enter to expand/collapse items"
                    focused={true}
                    width={columns - 2}
                    height={rows - 2}
                    items={demoItems as any}
                    selectedIndex={navigation.configSelectedIndex}
                    // Only supported props passed
                />
            </Box>
        </ThemeProvider>
    );
};