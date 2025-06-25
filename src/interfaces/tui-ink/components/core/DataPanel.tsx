import React, { useMemo } from 'react';
import { Panel } from './Panel.js';
import { ListItem } from './ListItem.js';
import { itemRenderer, ItemRenderConfig, ListItemData } from '../../services/ItemRenderer.js';

export interface DataPanelProps<T> {
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
}

/**
 * Data-aware panel that automatically normalizes and renders items
 * Uses ItemRenderer service for consistent item handling
 */
export function DataPanel<T>({
    items,
    renderConfig,
    normalizeItem,
    ...panelProps
}: DataPanelProps<T>) {
    // Normalize all items to ListItemData format
    const normalizedItems = useMemo(() => {
        if (normalizeItem) {
            return items.map((item, index) => normalizeItem(item, index));
        }
        return itemRenderer.normalizeItems(items);
    }, [items, normalizeItem]);
    
    return (
        <Panel
            {...panelProps}
            items={normalizedItems}
            showScrollbar={true}
            renderItem={(item: ListItemData, _, isActive) => {
                const props = itemRenderer.getRenderProps(item, isActive, renderConfig);
                return (
                    <ListItem
                        text={props.text}
                        icon={props.icon}
                        value={props.value}
                        status={props.status}
                        isActive={isActive}
                        color={props.color}
                        statusColor={props.statusColor}
                        selectable={item.selectable}
                    />
                );
            }}
            keyExtractor={(item: ListItemData) => item.id}
        />
    );
}