import { theme } from '../utils/theme';
import { buildProps } from '../utils/conditionalProps';

/**
 * Unified data structure for list items
 */
export interface ListItemData {
    /** Unique identifier for the item */
    id: string;
    /** Selection indicator icon */
    icon?: string;
    /** Main text content */
    text: string;
    /** Optional value to display */
    value?: string;
    /** Status indicator */
    status?: string;
    /** Text color */
    color?: string;
    /** Status indicator color */
    statusColor?: string;
    /** Whether item is selectable */
    selectable?: boolean;
    /** Additional metadata */
    meta?: Record<string, any>;
}

/**
 * Configuration for item rendering
 */
export interface ItemRenderConfig {
    /** Maximum width available for rendering */
    maxWidth?: number;
    /** Color for active/selected items */
    activeColor?: string;
    /** Color for inactive items */
    inactiveColor?: string;
    /** Icon for active items */
    activeIcon?: string;
    /** Icon for inactive items */
    inactiveIcon?: string;
    /** Whether to show values in brackets */
    showValueBrackets?: boolean;
}

/**
 * Service for consistent item rendering across all panels
 */
export class ItemRenderer {
    private defaultConfig: ItemRenderConfig = {
        activeColor: theme.colors.accent,
        activeIcon: '▶',
        inactiveIcon: '·',
        showValueBrackets: true
    };
    
    /**
     * Convert various item formats to unified ListItemData
     */
    normalizeItem(item: any, index: number): ListItemData {
        // Already normalized
        if (this.isListItemData(item)) {
            return item;
        }
        
        // String item
        if (typeof item === 'string') {
            return {
                id: `item-${index}`,
                text: item,
                selectable: true
            };
        }
        
        // Configuration item format { label, value }
        if (item.label && item.value !== undefined) {
            return {
                id: item.id || `config-${index}`,
                text: item.label,
                value: item.value,
                selectable: true
            };
        }
        
        // Status item format { text, status, color }
        if (item.text && (item.status !== undefined || item.color)) {
            return {
                id: item.id || `status-${index}`,
                text: item.text,
                icon: '○',
                selectable: item.selectable !== false,
                ...buildProps({
                    status: item.status,
                    color: item.color
                })
            };
        }
        
        // Configuration node format { name, value, type }
        if (item.name && item.type) {
            return {
                id: item.id || `node-${index}`,
                text: item.name,
                value: item.value?.toString(),
                selectable: true,
                meta: { type: item.type, node: item }
            };
        }
        
        // Fallback for unknown format
        return {
            id: `unknown-${index}`,
            text: String(item),
            selectable: true
        };
    }
    
    /**
     * Render item properties for display
     */
    getRenderProps(
        item: ListItemData, 
        isActive: boolean, 
        config: ItemRenderConfig = {}
    ): {
        icon: string;
        text: string;
        value?: string;
        status?: string;
        color?: string;
        statusColor?: string;
    } {
        const mergedConfig = { ...this.defaultConfig, ...config };
        
        // Determine icon
        let icon = item.icon;
        if (isActive && item.selectable !== false) {
            icon = mergedConfig.activeIcon || '▶';
        } else if (!icon) {
            icon = mergedConfig.inactiveIcon || '·';
        }
        
        // Determine color
        const color = isActive 
            ? mergedConfig.activeColor 
            : item.color || mergedConfig.inactiveColor;
        
        // Format value if needed
        const value = item.value && mergedConfig.showValueBrackets
            ? `[${item.value}]`
            : item.value;
        
        return {
            icon,
            text: item.text,
            ...buildProps({
                value,
                status: item.status,
                color,
                statusColor: item.statusColor || item.color // Use statusColor if provided, otherwise item.color
            })
        };
    }
    
    /**
     * Type guard for ListItemData
     */
    private isListItemData(item: any): item is ListItemData {
        return item && 
               typeof item === 'object' &&
               typeof item.id === 'string' &&
               typeof item.text === 'string';
    }
    
    /**
     * Batch normalize items
     */
    normalizeItems(items: any[]): ListItemData[] {
        return items.map((item, index) => this.normalizeItem(item, index));
    }
}

// Export singleton instance
export const itemRenderer = new ItemRenderer();