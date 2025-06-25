import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { BorderedBox } from './BorderedBox.js';
import { theme } from '../utils/theme.js';
import { useNavigation } from '../hooks/useNavigation.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import { useLayoutConstraints } from '../contexts/LayoutContext.js';
import { useDI } from '../di/DIContext.js';
import { ServiceTokens } from '../di/tokens.js';
import { TextInputNode } from './configuration/nodes/TextInputNode.js';
import { sampleConfigurationNodes } from '../models/sampleConfigurationNodes.js';
import type { ConfigurationNode } from '../models/configuration.js';

// Helper function to calculate scrollbar visual representation
const calculateScrollbar = (totalItems: number, visibleItems: number, scrollOffset: number): string[] => {
    // Only show scrollbar if scrolling is needed
    if (totalItems <= visibleItems) {
        return [];
    }

    // Create scrollbar array with exactly visibleItems elements
    const scrollbar: string[] = [];
    
    // First row always shows top triangle
    scrollbar.push('▲');
    
    // Last row always shows bottom triangle (will be added at the end)
    // Available space for indicator = visibleItems - 2 (excluding top and bottom triangles)
    const availableSpace = Math.max(1, visibleItems - 2);
    
    if (availableSpace > 0) {
        const lineLength = Math.ceil(availableSpace * visibleItems / totalItems);
        const topSpace = Math.floor(availableSpace * scrollOffset / totalItems);
        const bottomSpace = availableSpace - lineLength - topSpace;
        
        // Add middle rows (top space + line + bottom space)
        for (let i = 0; i < topSpace; i++) {
            scrollbar.push(' ');
        }
        for (let i = 0; i < lineLength; i++) {
            scrollbar.push('┃');
        }
        for (let i = 0; i < bottomSpace; i++) {
            scrollbar.push(' ');
        }
    }
    
    // Last row always shows bottom triangle
    scrollbar.push('▼');
    
    return scrollbar;
};

// Component to render a configuration node
const ConfigurationNodeRenderer: React.FC<{
    node: ConfigurationNode;
    isSelected: boolean;
    width: number;
}> = ({ node, isSelected, width }) => {
    if (node.type === 'text') {
        return <TextInputNode node={node} isSelected={isSelected} width={width} />;
    }
    
    // Fallback for unimplemented node types
    return (
        <Text color={isSelected ? theme.colors.accent : undefined}>
            {isSelected ? '▶' : '·'} {node.label}: [{String(node.value)}] →
        </Text>
    );
};

export const ConfigurationPanelNew: React.FC<{ width?: number; height?: number }> = ({ width, height }) => {
    const navigation = useNavigation();
    const { columns } = useTerminalSize();
    const constraints = useLayoutConstraints();
    const di = useDI();
    
    // Get services
    const configService = di.resolve(ServiceTokens.ConfigurationService);
    const formNavService = di.resolve(ServiceTokens.FormNavigationService);
    const statusBarService = di.resolve(ServiceTokens.StatusBarService);
    
    // Force re-render when navigation state changes
    const [, forceUpdate] = useState({});
    const [initialized, setInitialized] = useState(false);
    
    // Initialize services
    useEffect(() => {
        if (!initialized) {
            configService.initialize(sampleConfigurationNodes);
            const nodeIds = sampleConfigurationNodes.map(n => n.id);
            formNavService.setNodeIds(nodeIds);
            
            // Set initial status bar context
            statusBarService.setContext('form');
            statusBarService.setKeyBindings([
                { key: '↑↓', description: 'Navigate' },
                { key: '→/Enter', description: 'Edit' },
                { key: 'Tab', description: 'Switch Panel' },
                { key: 'q', description: 'Quit' }
            ]);
            
            setInitialized(true);
        }
    }, [initialized, configService, formNavService, statusBarService]);
    
    // Get configuration nodes
    const nodes = configService.getNodes();
    
    // Debug: Check if nodes are loaded
    if (process.env.TUI_DEBUG) {
        console.error(`[ConfigurationPanelNew] Nodes count: ${nodes.length}`);
    }
    
    // Calculate visible count based on height
    const boxOverhead = 4;
    const maxItems = Math.max(1, (height || 20) - boxOverhead);
    const visibleCount = nodes.length > maxItems ? Math.max(1, maxItems - 1) : maxItems;
    
    // Calculate content width for items
    const panelWidth = width || columns - 2;
    const itemMaxWidth = constraints?.maxWidth || panelWidth - 7; // 4 for borders, 3 for indicator and space
    
    // Get current node index based on form navigation
    const currentNodeIndex = formNavService.getCurrentNodeIndex();
    
    // Calculate scroll offset
    let scrollOffset = 0;
    if (currentNodeIndex >= visibleCount) {
        scrollOffset = currentNodeIndex - visibleCount + 1;
    }
    
    const scrollbar = calculateScrollbar(nodes.length, visibleCount, scrollOffset);
    const visibleNodes = nodes.slice(scrollOffset, scrollOffset + visibleCount);
    
    // Handle keyboard input
    useInput((input, key) => {
        if (!navigation.isConfigFocused) return;
        
        const isNodeExpanded = formNavService.isAnyNodeExpanded();
        
        if (!isNodeExpanded) {
            // Form-level navigation
            if (key.upArrow) {
                formNavService.moveToPreviousNode();
                forceUpdate({});
            } else if (key.downArrow) {
                formNavService.moveToNextNode();
                forceUpdate({});
            } else if (key.rightArrow || key.return) {
                const currentNodeId = formNavService.getCurrentNodeId();
                if (currentNodeId) {
                    formNavService.expandNode(currentNodeId);
                    forceUpdate({});
                }
            }
        } else {
            // Node is expanded, let the node handle its own input
            // But handle escape at form level
            if (key.escape) {
                formNavService.collapseNode();
                statusBarService.setContext('form');
                statusBarService.setKeyBindings([
                    { key: '↑↓', description: 'Navigate' },
                    { key: '→/Enter', description: 'Edit' },
                    { key: 'Tab', description: 'Switch Panel' },
                    { key: 'q', description: 'Quit' }
                ]);
                forceUpdate({});
            }
        }
    });
    
    return (
        <BorderedBox
            title="Configuration"
            subtitle="Setup your folder-mcp server"
            focused={navigation.isConfigFocused}
            width={width || columns - 2}
            height={height || 20}
            showScrollbar={true}
            scrollbarElements={scrollbar}
        >
            {visibleNodes.map((node, visualIndex) => {
                const actualIndex = scrollOffset + visualIndex;
                const isSelected = navigation.isConfigFocused && currentNodeIndex === actualIndex;
                
                return (
                    <ConfigurationNodeRenderer
                        key={node.id}
                        node={node}
                        isSelected={isSelected}
                        width={itemMaxWidth}
                    />
                );
            })}
        </BorderedBox>
    );
};