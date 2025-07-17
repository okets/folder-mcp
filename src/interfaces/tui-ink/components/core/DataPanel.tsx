import React from 'react';
import { GenericListPanel, GenericListPanelProps } from './GenericListPanel';
import { IListItem } from './IListItem';
import { buildProps } from '../../utils/conditionalProps';

/**
 * DataPanel - a simplified wrapper around GenericListPanel
 * Provides a data-oriented API for displaying lists
 */
export interface DataPanelProps<T = any> {
    title: string;
    subtitle?: string;
    focused?: boolean;
    width?: number;
    height?: number;
    items: T[];
    activeIndex?: number;
    renderConfig?: {
        activeColor?: string;
        activeIcon?: string;
        inactiveIcon?: string;
    };
    normalizeItem?: (item: T, index: number) => {
        id: string;
        text: string;
        icon?: string;
        status?: string;
        statusColor?: string;
        selectable?: boolean;
    };
}

// Simple list item implementation for DataPanel
class DataPanelItem implements IListItem {
    readonly selfConstrained = true as const;
    readonly isNavigable = true; // DataPanelItems are interactive and navigable
    readonly isControllingInput = false;
    
    constructor(
        private data: {
            id: string;
            text: string;
            icon?: string;
            status?: string;
            statusColor?: string;
            selectable?: boolean;
        },
        public isActive: boolean,
        private renderConfig?: DataPanelProps['renderConfig']
    ) {}

    get icon(): string {
        if (this.isActive && this.renderConfig?.activeIcon) {
            return this.renderConfig.activeIcon;
        }
        return this.data.icon || this.renderConfig?.inactiveIcon || '○';
    }

    get label(): string {
        return this.data.text;
    }

    get isSelectable(): boolean {
        return this.data.selectable !== false;
    }

    render(maxWidth: number): React.ReactElement {
        const color = this.isActive ? this.renderConfig?.activeColor : undefined;
        const statusText = this.data.status ? ` ${this.data.status}` : '';
        
        return (
            <React.Fragment>
                <span style={{ color }}>{this.icon} {this.label}</span>
                {statusText && <span style={{ color: this.data.statusColor }}>{statusText}</span>}
            </React.Fragment>
        );
    }

    getRequiredLines(): number {
        return 1;
    }
}

export const DataPanel: React.FC<DataPanelProps> = ({
    title,
    subtitle,
    focused,
    width,
    height,
    items,
    activeIndex = 0,
    renderConfig,
    normalizeItem
}) => {
    // Convert data items to IListItem instances
    const listItems: IListItem[] = items.map((item, index) => {
        const normalized = normalizeItem ? normalizeItem(item, index) : {
            id: `item-${index}`,
            text: String(item),
            selectable: true
        };
        
        return new DataPanelItem(
            normalized,
            index === activeIndex,
            renderConfig
        );
    });

    return (
        <GenericListPanel
            title={title}
            items={listItems}
            selectedIndex={activeIndex}
            {...buildProps({
                subtitle,
                width,
                height,
                focused
            })}
        />
    );
};