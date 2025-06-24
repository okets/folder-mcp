import React from 'react';
import { Box, useApp, useInput } from 'ink';
import { Header } from './components/Header.js';
import { ScrollableContainer } from './components/ScrollableContainer.js';
import { ListItem } from './components/ListItem.js';
import { StatusBar } from './components/StatusBar.js';
import { useNavigation } from './hooks/useNavigation.js';
import { useTerminalSize } from './hooks/useTerminalSize.js';
import { FullscreenLayout } from './components/FullscreenLayout.js';

// Sample data for TUI
const configItems = [
    {
        id: 'config-1',
        content: 'Create optimized configuration for my machine',
        fullContent: `Will detect:
• Available memory
• Select embedding model manually  
• Configure advanced options
• Set custom cache directory
• Configure network timeouts
• Enable debug logging
• Set memory limits`
    },
    {
        id: 'config-2',
        content: 'Manual configuration wizard',
        fullContent: 'Step-by-step configuration process with guided setup'
    },
    {
        id: 'config-3',
        content: 'Load existing configuration',
        fullContent: 'Load from a previously saved config file'
    },
    {
        id: 'config-4',
        content: 'Select embedding model',
        fullContent: 'Choose from available models: Nomic, MixedBread, OpenAI'
    },
    {
        id: 'config-5',
        content: 'Configure cache directory',
        fullContent: 'Set custom cache location for embeddings and indexes'
    },
    {
        id: 'config-6',
        content: 'Set memory limits',
        fullContent: 'Configure maximum memory usage for processing'
    },
    {
        id: 'config-7',
        content: 'Enable debug logging',
        fullContent: 'Turn on verbose logging for troubleshooting'
    },
    {
        id: 'config-8',
        content: 'Configure network timeouts',
        fullContent: 'Set custom timeout values for network operations'
    },
    {
        id: 'config-9',
        content: 'Export current configuration',
        fullContent: 'Save current settings to a YAML file'
    },
    {
        id: 'config-10',
        content: 'Reset to factory defaults',
        fullContent: 'Restore all settings to their default values'
    },
    {
        id: 'config-11',
        content: 'Run configuration wizard',
        fullContent: 'Interactive step-by-step configuration process'
    },
    {
        id: 'config-12',
        content: 'Validate current configuration',
        fullContent: 'Check if all settings are valid and compatible'
    }
];

const statusItems = [
    {
        id: 'status-1',
        content: 'System components loaded',
        status: 'success' as const
    },
    {
        id: 'status-2',
        content: 'Checking cached configuration',
        status: 'loading' as const
    },
    {
        id: 'status-3',
        content: 'Loading default settings',
        status: undefined
    },
    {
        id: 'status-4',
        content: 'Validating embedding models',
        status: 'warning' as const
    },
    {
        id: 'status-5',
        content: 'Memory usage: 1.2GB / 8GB',
        status: 'success' as const
    },
    {
        id: 'status-6',
        content: 'Cache size: 456MB',
        status: undefined
    },
    {
        id: 'status-7',
        content: 'Indexed files: 1,234',
        status: 'success' as const
    },
    {
        id: 'status-8',
        content: 'Last sync: 2 minutes ago',
        status: undefined
    },
    {
        id: 'status-9',
        content: 'Network: Connected',
        status: 'success' as const
    },
    {
        id: 'status-10',
        content: 'Embedding model: Nomic-1.5',
        status: undefined
    },
    {
        id: 'status-11',
        content: 'Processing queue: Empty',
        status: 'success' as const
    },
    {
        id: 'status-12',
        content: 'Error count: 0',
        status: 'success' as const
    },
    {
        id: 'status-13',
        content: 'CPU usage: 15%',
        status: undefined
    },
    {
        id: 'status-14',
        content: 'Disk I/O: Normal',
        status: 'success' as const
    },
    {
        id: 'status-15',
        content: 'Config version: 1.0.0',
        status: undefined
    }
];

export const App: React.FC = () => {
    const { exit } = useApp();
    const navigation = useNavigation();
    const { isNarrow, rows, columns } = useTerminalSize();
    
    // Debug terminal size
    if (process.env.DEBUG) {
        console.error(`Terminal: ${columns}x${rows}, isNarrow: ${isNarrow}`);
    }
    
    // Global quit handler and navigation
    useInput((input, key) => {
        if (input === 'q' || input === '\x03') { // q or Ctrl-C
            exit();
        }
        
        // Update navigation with correct max items
        if (key.downArrow || input === 'j') {
            const maxItems = navigation.activeContainer === 'config' ? configItems.length : statusItems.length;
            navigation.navigateDown(maxItems);
        }
    });
    
    // Calculate available height for containers
    // Header (4) + StatusBar (3) = 7
    const availableHeight = Math.max(10, rows - 7);
    
    return (
        <Box flexDirection="column" height={rows} width={columns}>
            {/* Header */}
            <Header />
            
            {/* Main content area - fullscreen responsive layout */}
            <Box flexGrow={1}>
                <FullscreenLayout>
                    <ScrollableContainer 
                        title="Configuration"
                        subtitle="Setup your folder-mcp server"
                        focused={navigation.isConfigFocused}
                        selectedIndex={navigation.configSelectedIndex}
                        height={availableHeight}
                    >
                        {configItems.map((item, index) => (
                            <ListItem
                                key={item.id}
                                content={item.content}
                                fullContent={item.fullContent}
                                isSelected={navigation.isConfigFocused && navigation.configSelectedIndex === index}
                                isExpanded={navigation.expandedItems.has(item.id)}
                            />
                        ))}
                    </ScrollableContainer>
                    
                    <ScrollableContainer
                        title="System Status"
                        subtitle="Current system state"
                        focused={navigation.isStatusFocused}
                        selectedIndex={navigation.statusSelectedIndex}
                        height={availableHeight}
                    >
                        {statusItems.map((item, index) => (
                            <ListItem
                                key={item.id}
                                content={item.content}
                                isSelected={navigation.isStatusFocused && navigation.statusSelectedIndex === index}
                                isExpanded={false}
                                status={item.status}
                            />
                        ))}
                    </ScrollableContainer>
                </FullscreenLayout>
            </Box>
            
            {/* Status bar - always at bottom */}
            <Box>
                <StatusBar />
            </Box>
        </Box>
    );
};