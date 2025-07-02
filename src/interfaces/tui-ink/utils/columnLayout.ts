import { SelectionOption } from '../components/core/SelectionListItem.js';
import { getVisualWidth } from './validationDisplay.js';

export interface ColumnLayout {
    columns: {
        name: string;
        width: number;
        truncated: boolean;
    }[];
    totalWidth: number;
}

const SELECTION_INDICATOR_WIDTH = 3; // "▣ " or "▢ "
const COLUMN_SPACING = 2; // Space between columns (reduced from 3)
const MIN_COLUMN_WIDTH = 5; // Minimum width for any column (increased for readability)

export function calculateColumnLayout(
    options: SelectionOption[],
    detailColumns: string[],
    availableWidth: number,
    includeLabel: boolean = true
): ColumnLayout {
    // Start with selection indicator width
    let usedWidth = SELECTION_INDICATOR_WIDTH;
    
    // Build column list (label is always first if included)
    const columnNames = includeLabel ? ['label', ...detailColumns] : detailColumns;
    
    // Calculate max content width for each column
    const maxWidths: Record<string, number> = {};
    
    // Initialize with header widths
    columnNames.forEach(col => {
        const headerName = col === 'label' ? 'Model Name' : formatColumnHeader(col);
        maxWidths[col] = getVisualWidth(headerName);
    });
    
    // Check all options for max content width
    options.forEach(option => {
        // Label column
        if (includeLabel) {
            maxWidths.label = Math.max(maxWidths.label || 0, getVisualWidth(option.label));
        }
        
        // Detail columns
        if (option.details) {
            detailColumns.forEach(col => {
                const value = option.details![col] || '';
                maxWidths[col] = Math.max(maxWidths[col] || 0, getVisualWidth(value));
            });
        }
    });
    
    // Calculate available space for columns
    const totalSpacing = (columnNames.length - 1) * COLUMN_SPACING;
    const availableForColumns = availableWidth - usedWidth - totalSpacing;
    
    // If we can't fit minimum columns, try with just label column
    if (availableForColumns < columnNames.length * MIN_COLUMN_WIDTH) {
        // Try with just the label column
        if (includeLabel && availableForColumns >= MIN_COLUMN_WIDTH) {
            return {
                columns: [{
                    name: 'label',
                    width: availableForColumns,
                    truncated: false
                }],
                totalWidth: SELECTION_INDICATOR_WIDTH + availableForColumns
            };
        }
        
        return {
            columns: [],
            totalWidth: 0
        };
    }
    
    // Distribute space among columns
    const columns = distributeColumnWidths(columnNames, maxWidths, availableForColumns);
    
    // Calculate total width
    const totalWidth = SELECTION_INDICATOR_WIDTH + 
        columns.reduce((sum, col) => sum + col.width, 0) +
        totalSpacing;
    
    return {
        columns,
        totalWidth
    };
}

function distributeColumnWidths(
    columnNames: string[],
    maxWidths: Record<string, number>,
    availableWidth: number
): ColumnLayout['columns'] {
    const columns: ColumnLayout['columns'] = [];
    
    // Start with ideal widths
    let totalIdealWidth = columnNames.reduce((sum, col) => sum + (maxWidths[col] || 0), 0);
    
    if (totalIdealWidth <= availableWidth) {
        // Everything fits!
        columnNames.forEach(col => {
            columns.push({
                name: col,
                width: maxWidths[col] || MIN_COLUMN_WIDTH,
                truncated: false
            });
        });
    } else {
        // Need to truncate - prioritize label column
        const labelWidth = includesLabel(columnNames) ? 
            Math.min(maxWidths.label || 0, Math.max(15, Math.floor(availableWidth * 0.35))) : 0;
        
        let remainingWidth = availableWidth - labelWidth;
        const detailColumns = columnNames.filter(col => col !== 'label');
        
        // Add label column if present
        if (includesLabel(columnNames)) {
            columns.push({
                name: 'label',
                width: labelWidth,
                truncated: labelWidth < (maxWidths.label || 0)
            });
        }
        
        // Distribute remaining space equally among detail columns
        const widthPerDetail = Math.floor(remainingWidth / detailColumns.length);
        
        detailColumns.forEach(col => {
            const idealWidth = maxWidths[col] || MIN_COLUMN_WIDTH;
            const assignedWidth = Math.max(MIN_COLUMN_WIDTH, Math.min(idealWidth, widthPerDetail));
            
            columns.push({
                name: col,
                width: assignedWidth,
                truncated: assignedWidth < idealWidth
            });
        });
    }
    
    return columns;
}

function includesLabel(columnNames: string[]): boolean {
    return columnNames.includes('label');
}

export function formatColumnHeader(columnName: string): string {
    // Convert camelCase or snake_case to Title Case
    return columnName
        .replace(/([A-Z])/g, ' $1') // Add space before capitals
        .replace(/_/g, ' ') // Replace underscores with spaces
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
        .trim();
}

export function truncateToWidth(text: string, width: number): string {
    if (getVisualWidth(text) <= width) {
        return text;
    }
    
    if (width < 1) return '';
    if (width === 1) return '…';
    
    // Binary search for the right truncation point
    let low = 0;
    let high = text.length;
    
    while (low < high) {
        const mid = Math.floor((low + high + 1) / 2);
        const truncated = text.substring(0, mid) + '…';
        
        if (getVisualWidth(truncated) <= width) {
            low = mid;
        } else {
            high = mid - 1;
        }
    }
    
    return text.substring(0, low) + '…';
}

export function padToWidth(text: string, width: number, align: 'left' | 'right' = 'left'): string {
    const textWidth = getVisualWidth(text);
    
    if (textWidth >= width) {
        return text;
    }
    
    const padding = ' '.repeat(width - textWidth);
    
    return align === 'left' ? text + padding : padding + text;
}