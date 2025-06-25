/**
 * Core TUI components - generic, reusable building blocks
 */

export { BorderedBox } from './BorderedBox.js';
export type { BorderedBoxProps } from './BorderedBox.js';

export { calculateScrollbar } from './ScrollbarCalculator.js';
export type { ScrollbarConfig } from './ScrollbarCalculator.js';

export { ListItem } from './ListItem.js';
export type { ListItemProps } from './ListItem.js';
export { 
    stringToListItemProps, 
    configItemToListItemProps, 
    statusItemToListItemProps 
} from './ListItem.js';