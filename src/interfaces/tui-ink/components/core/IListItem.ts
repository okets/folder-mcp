import { ReactElement } from 'react';
import { Key } from 'ink';
import { ISelfConstrainedItem } from './ISelfConstrainedItem.js';

/**
 * Interface for all list item types in the TUI
 * Each implementation handles its own layout and truncation logic
 * Items can optionally take control of keyboard input when "entered"
 * 
 * All IListItem implementations are self-constrained, meaning they handle
 * their own width constraints and should not be truncated by parent containers.
 */
export interface IListItem extends ISelfConstrainedItem {
    /**
     * Icon to display for this item
     */
    icon: string;
    
    /**
     * Whether this item is currently active/selected
     */
    isActive: boolean;
    
    /**
     * Render the list item with the given maximum width
     * @param maxWidth - Maximum width available for the item
     * @param maxLines - Maximum lines available for expanded content (optional)
     * @returns React element(s) to render
     */
    render(maxWidth: number, maxLines?: number): ReactElement | ReactElement[];
    
    /**
     * Calculate how many terminal lines this item requires
     * @param maxWidth - Maximum width available for the item
     * @returns Number of lines needed (e.g., 1 for collapsed, 4 for expanded)
     */
    getRequiredLines(maxWidth: number): number;
    
    /**
     * Whether this item is currently controlling keyboard input
     * When true, all input is delegated to this item's handleInput method
     */
    readonly isControllingInput: boolean;
    
    /**
     * Called when user presses Enter on this item
     * Item can choose to take control of input or perform an action
     */
    onEnter?(): void;
    
    /**
     * Called when item should release input control
     * Usually triggered by the item itself (e.g., on Escape or Enter)
     */
    onExit?(): void;
    
    /**
     * Handle keyboard input when this item is controlling input
     * @param input - The character typed
     * @param key - Special key information
     * @returns true if input was handled, false otherwise
     */
    handleInput?(input: string, key: Key): boolean;
    
    /**
     * Called when this item becomes selected (focused)
     * Can be used to prepare state or UI changes
     */
    onSelect?(): void;
    
    /**
     * Called when this item loses selection (focus)
     * Can be used to clean up state or UI changes
     */
    onDeselect?(): void;
}