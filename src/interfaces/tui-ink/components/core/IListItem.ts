import { ReactElement } from 'react';

/**
 * Interface for all list item types in the TUI
 * Each implementation handles its own layout and truncation logic
 */
export interface IListItem {
    /**
     * Render the list item with the given maximum width
     * @param maxWidth - Maximum width available for the item
     * @returns React element(s) to render
     */
    render(maxWidth: number): ReactElement | ReactElement[];
    
    /**
     * Calculate how many terminal lines this item requires
     * @param maxWidth - Maximum width available for the item
     * @returns Number of lines needed (e.g., 1 for collapsed, 4 for expanded)
     */
    getRequiredLines(maxWidth: number): number;
}