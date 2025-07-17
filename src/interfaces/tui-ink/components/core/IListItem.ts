import { ReactElement } from 'react';
import { Key } from 'ink';
import { ISelfConstrainedItem } from './ISelfConstrainedItem';
import { ValidationMessage } from '../../validation/ValidationState';

/**
 * Interface for all list item types in the TUI
 * Each implementation handles its own layout and truncation logic
 * Items can optionally take control of keyboard input when "entered"
 * 
 * All IListItem implementations are self-constrained, meaning they handle
 * their own width constraints and should not be truncated by parent containers.
 * 
 * CRITICAL TUI PATTERN: State Change Signaling
 * ============================================
 * 
 * The handleInput() method is the heart of TUI responsiveness. It MUST follow these rules:
 * 
 * 1. Return `true` ONLY when internal state actually changed
 * 2. Return `false` when no state change occurred (e.g., already at boundary)
 * 
 * WHY THIS MATTERS:
 * - Terminal UIs redraw the entire screen region when components re-render
 * - Returning `true` triggers setItemUpdateTrigger() in GenericListPanel
 * - This causes the entire panel to re-render, creating visible flickering
 * - Web UIs use virtual DOM diffing, but terminals must physically redraw
 * 
 * EXAMPLE ANTI-PATTERN (causes flickering):
 * ```typescript
 * handleInput(input: string, key: Key): boolean {
 *     if (key.downArrow) {
 *         this.index = Math.min(this.max, this.index + 1);
 *         return true; // WRONG! Returns true even when already at max
 *     }
 * }
 * ```
 * 
 * CORRECT PATTERN (prevents flickering):
 * ```typescript
 * handleInput(input: string, key: Key): boolean {
 *     if (key.downArrow) {
 *         const oldIndex = this.index;
 *         const newIndex = Math.min(this.max, this.index + 1);
 *         if (newIndex !== oldIndex) {
 *             this.index = newIndex;
 *             return true; // State actually changed
 *         }
 *         return false; // Already at boundary, no change
 *     }
 * }
 * ```
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
     * Whether this item can be navigated to with arrow keys
     * When false, navigation will skip over this item
     * Useful for descriptive text items that provide context but shouldn't interrupt navigation flow
     */
    isNavigable: boolean;
    
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
     * @param maxHeight - Maximum height available for the item (optional)
     * @returns Number of lines needed (e.g., 1 for collapsed, 4 for expanded)
     */
    getRequiredLines(maxWidth: number, maxHeight?: number): number;
    
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
    
    /**
     * Get the current validation message for this item
     * @returns ValidationMessage if there's a validation state to display, null otherwise
     */
    getValidationMessage?(): ValidationMessage | null;
    
    /**
     * Trigger validation on the current value
     * Should update internal validation state
     */
    validateValue?(): void;
}