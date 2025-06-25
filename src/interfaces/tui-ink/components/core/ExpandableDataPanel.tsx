import React, { useState, useMemo, useCallback } from 'react';
import { useInput, Key } from 'ink';
import { Panel } from './Panel.js';
import { ListItem } from './ListItem.js';
import { itemRenderer, ItemRenderConfig, ListItemData } from '../../services/ItemRenderer.js';

export interface ExpandableItem {
    /** Whether this item can be expanded */
    expandable: boolean;
    /** Custom render function for the item */
    render?: (item: any, isActive: boolean, isExpanded: boolean) => React.ReactNode;
}

export interface ExpandableDataPanelProps<T> {
    /** Panel title */
    title: string;
    /** Optional subtitle */
    subtitle?: string;
    /** Whether panel is focused */
    focused?: boolean;
    /** Panel width */
    width: number;
    /** Panel height */
    height: number;
    /** Raw items (any format) */
    items: T[];
    /** Currently active item index */
    activeIndex?: number;
    /** Optional scroll offset override */
    scrollOffset?: number;
    /** Item render configuration */
    renderConfig?: ItemRenderConfig;
    /** Optional custom item normalizer */
    normalizeItem?: (item: T, index: number) => ListItemData;
    /** Function to determine if item is expandable */
    isExpandable?: (item: T, index: number) => boolean;
    /** Custom renderer for expandable items */
    renderExpandableItem?: (item: T, index: number, isActive: boolean, isExpanded: boolean) => React.ReactNode;
    /** Callback when expansion state changes */
    onExpansionChange?: (index: number, isExpanded: boolean) => void;
}

/**
 * DataPanel with support for expandable items
 * Manages expansion state and keyboard navigation
 */
export function ExpandableDataPanel<T>({
    items,
    renderConfig,
    normalizeItem,
    isExpandable = () => false,
    renderExpandableItem,
    onExpansionChange,
    focused = false,
    activeIndex = 0,
    ...panelProps
}: ExpandableDataPanelProps<T>) {
    // Track expansion state for all items
    const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
    
    // Handle keyboard input for expansion
    useInput((_, key: Key) => {
        if (!focused) return;
        
        if (key.return && isExpandable(items[activeIndex], activeIndex)) {
            toggleExpansion(activeIndex);
        }
    });
    
    // Toggle expansion state
    const toggleExpansion = useCallback((index: number) => {
        setExpandedItems(prev => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
                onExpansionChange?.(index, false);
            } else {
                next.add(index);
                onExpansionChange?.(index, true);
            }
            return next;
        });
    }, [onExpansionChange]);
    
    // Calculate actual item heights considering expansion
    const itemHeights = useMemo(() => {
        return items.map((item, index) => {
            if (expandedItems.has(index) && isExpandable(item, index)) {
                // Expanded items take more space
                // This is a simple implementation - you might want to calculate actual height
                return 5; // Assume 5 lines for expanded content
            }
            return 1; // Single line for collapsed items
        });
    }, [items, expandedItems, isExpandable]);
    
    // Calculate visible items considering variable heights
    const { visibleIndices, totalHeight } = useMemo(() => {
        const maxHeight = panelProps.height - 4; // Account for borders and subtitle
        let currentHeight = 0;
        const indices: number[] = [];
        
        // Start from scroll offset (simplified - you'd want proper scroll handling)
        let startIndex = panelProps.scrollOffset || 0;
        if (activeIndex < startIndex) {
            startIndex = activeIndex;
        }
        
        for (let i = startIndex; i < items.length && currentHeight < maxHeight; i++) {
            if (currentHeight + itemHeights[i] <= maxHeight) {
                indices.push(i);
                currentHeight += itemHeights[i];
            } else {
                break;
            }
        }
        
        return { visibleIndices: indices, totalHeight: currentHeight };
    }, [items.length, itemHeights, panelProps.height, panelProps.scrollOffset, activeIndex]);
    
    // Normalize items
    const normalizedItems = useMemo(() => {
        if (normalizeItem) {
            return items.map((item, index) => normalizeItem(item, index));
        }
        return itemRenderer.normalizeItems(items);
    }, [items, normalizeItem]);
    
    // Create items to render
    const renderItems = visibleIndices.map(index => {
        const item = items[index];
        const isExpanded = expandedItems.has(index);
        const isActive = index === activeIndex;
        
        // Use custom renderer if provided and item is expandable
        if (isExpandable(item, index) && renderExpandableItem) {
            return {
                key: normalizedItems[index].id,
                element: renderExpandableItem(item, index, isActive, isExpanded)
            };
        }
        
        // Default rendering for non-expandable items
        const props = itemRenderer.getRenderProps(normalizedItems[index], isActive, renderConfig);
        return {
            key: normalizedItems[index].id,
            element: (
                <ListItem
                    text={props.text}
                    icon={props.icon}
                    value={props.value}
                    status={props.status}
                    isActive={isActive}
                    color={props.color}
                    statusColor={props.statusColor}
                    selectable={normalizedItems[index].selectable}
                />
            )
        };
    });
    
    return (
        <Panel
            {...panelProps}
            items={renderItems}
            activeIndex={0} // We handle active state internally
            showScrollbar={true}
            renderItem={(item) => item.element}
            keyExtractor={(item) => item.key}
        />
    );
}