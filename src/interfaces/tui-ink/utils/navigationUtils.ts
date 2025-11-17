import { IListItem } from '../components/core/IListItem';

/**
 * Finds the first navigable item in an array of items
 * Returns the index of the first item where isNavigable !== false
 * Returns 0 as fallback if no navigable items found
 *
 * Used by:
 * - NavigationPanel: DOWN/RIGHT arrow switching to content panels
 * - useNavigation: TAB key panel switching
 */
export function findFirstNavigableIndex(items: IListItem[]): number {
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item && item.isNavigable !== false) {
            return i;
        }
    }
    return 0; // Fallback to index 0 if no navigable items
}
