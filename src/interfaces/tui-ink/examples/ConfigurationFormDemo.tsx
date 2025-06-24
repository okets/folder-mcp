import React, { useEffect } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { TextInputNode } from '../components/configuration/nodes/TextInputNode.js';
import { BorderedBox } from '../components/BorderedBox.js';
import { StatusBar } from '../components/StatusBar.js';
import { theme } from '../utils/theme.js';
import { useDI } from '../di/DIContext.js';
import { ServiceTokens } from '../di/tokens.js';
import type { ITextInputNode } from '../models/configuration.js';
import { ValidationRules } from '../models/validation.js';

// Sample configuration nodes
const createSampleNodes = (): ITextInputNode[] => [
    {
        id: 'folderPath',
        type: 'text',
        label: 'Folder Path',
        description: 'Path to the folder you want to index',
        value: '/Users/example/documents',
        defaultValue: '',
        placeholder: '/path/to/folder',
        validation: [
            ValidationRules.required(),
            ValidationRules.path()
        ]
    },
    {
        id: 'contentDescription',
        type: 'text',
        label: 'Content Description',
        description: 'Describe the contents of your folder',
        value: 'Python web application with ML components',
        defaultValue: '',
        placeholder: 'Tell me about your folder content...',
        maxLength: 200
    },
    {
        id: 'serverPort',
        type: 'text',
        label: 'Server Port',
        description: 'Port number for the MCP server',
        value: '3000',
        defaultValue: '3000',
        placeholder: '3000',
        maxLength: 5,
        validation: [
            ValidationRules.pattern(/^\d+$/, 'Must be a number')
        ]
    }
];

export const ConfigurationFormDemo: React.FC = () => {
    const { exit } = useApp();
    const di = useDI();
    const configService = di.resolve(ServiceTokens.ConfigurationService);
    const formNavService = di.resolve(ServiceTokens.FormNavigationService);
    const statusBarService = di.resolve(ServiceTokens.StatusBarService);
    
    const nodes = createSampleNodes();
    
    // Initialize services
    useEffect(() => {
        configService.initialize(nodes);
        formNavService.setNodeIds(nodes.map(n => n.id));
        statusBarService.setContext('form');
    }, []);

    // Handle navigation
    useInput((input, key) => {
        if (input === 'q') {
            exit();
        }

        const isExpanded = formNavService.isAnyNodeExpanded();
        
        if (!isExpanded) {
            // Form-level navigation
            if (key.upArrow) {
                formNavService.moveToPreviousNode();
            } else if (key.downArrow) {
                formNavService.moveToNextNode();
            } else if (key.rightArrow || key.return) {
                const currentNodeId = formNavService.getCurrentNodeId();
                if (currentNodeId) {
                    formNavService.expandNode(currentNodeId);
                    statusBarService.setContext('editing');
                }
            }
        } else {
            // Node is expanded - input handled by TextInputNode
            if (key.escape) {
                formNavService.collapseNode();
                statusBarService.setContext('form');
            }
        }
    });

    const currentNodeIndex = formNavService.getCurrentNodeIndex();

    return (
        <Box flexDirection="column" height="100%">
            <Box flexDirection="column" flexGrow={1}>
                <Text color={theme.colors.accent} bold>Configuration Form Demo</Text>
                <Text color={theme.colors.textMuted}>Navigate with arrows, expand with →/Enter</Text>
                <Box marginTop={1} />

                <BorderedBox
                    title="Configuration"
                    subtitle="Setup your folder-mcp server"
                    focused={true}
                    width={70}
                    height={15}
                >
                    {nodes.map((node, index) => (
                        <TextInputNode
                            key={node.id}
                            node={node}
                            isSelected={index === currentNodeIndex}
                            width={66}
                        />
                    ))}
                </BorderedBox>

                <Box marginTop={1}>
                    <Text color={theme.colors.textMuted}>
                        Current values:
                    </Text>
                    {nodes.map(node => {
                        const value = configService.getNode(node.id)?.value || '';
                        return (
                            <Text key={node.id} color={theme.colors.textSecondary}>
                                {node.label}: {value}
                            </Text>
                        );
                    })}
                </Box>
            </Box>

            <StatusBar />
        </Box>
    );
};