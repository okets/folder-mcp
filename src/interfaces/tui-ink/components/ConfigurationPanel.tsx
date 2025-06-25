import React from 'react';
import { Text } from 'ink';
import { BorderedBox } from './core/BorderedBox.js';
import { theme } from '../utils/theme.js';
import { useNavigation } from '../hooks/useNavigation.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';
import { configItems } from '../models/sampleData.js';
import { useLayoutConstraints } from '../contexts/LayoutContext.js';
import { ConstrainedContent } from './ConstrainedContent.js';
import { calculateScrollbar } from './core/ScrollbarCalculator.js';

export const ConfigurationPanel: React.FC<{ width?: number; height?: number }> = ({ width, height }) => {
    const navigation = useNavigation();
    const { columns } = useTerminalSize();
    const constraints = useLayoutConstraints();
    
    // Calculate visible count based on height
    const boxOverhead = 4;
    const maxItems = Math.max(1, (height || 20) - boxOverhead);
    const visibleCount = configItems.length > maxItems ? Math.max(1, maxItems - 1) : maxItems;
    
    // Calculate content width for items
    // Account for selection indicator (2 chars: "▶ " or "○ ")
    const panelWidth = width || columns - 2;
    const itemMaxWidth = constraints?.maxWidth || panelWidth - 7; // 4 for borders, 3 for indicator and space
    
    // Calculate scroll offset
    let scrollOffset = 0;
    if (navigation.configSelectedIndex >= visibleCount) {
        scrollOffset = navigation.configSelectedIndex - visibleCount + 1;
    }
    
    const scrollbar = calculateScrollbar({
        totalItems: configItems.length,
        visibleItems: visibleCount,
        scrollOffset: scrollOffset
    });
    const visibleItems = configItems.slice(scrollOffset, scrollOffset + visibleCount);
    
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
            {visibleItems.map((item, visualIndex) => {
                const actualIndex = scrollOffset + visualIndex;
                return (
                    <Text 
                        key={`panel-config-item-${actualIndex}`}
                        color={navigation.isConfigFocused && navigation.configSelectedIndex === actualIndex ? theme.colors.accent : undefined}
                    >
                        {navigation.isConfigFocused && navigation.configSelectedIndex === actualIndex ? '▶' : '·'} {item}
                    </Text>
                );
            })}
        </BorderedBox>
    );
};