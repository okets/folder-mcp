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

export { ScrollableList, useScrollableList } from './ScrollableList.js';
export type { ScrollableListProps } from './ScrollableList.js';

export { Panel, SimpleListPanel } from './Panel.js';
export type { PanelProps } from './Panel.js';

export { DataPanel } from './DataPanel.js';
export type { DataPanelProps } from './DataPanel.js';

export { ThemedPanel, ThemedConfigurationPanel, ThemedStatusPanel } from './ThemedPanel.js';
export { ThemedBorderedBox } from './ThemedBorderedBox.js';

export { ExpandableListItem, useExpandableItem } from './ExpandableListItem.js';
export type { ExpandableListItemProps } from './ExpandableListItem.js';

export { ExpandableDataPanel } from './ExpandableDataPanel.js';
export type { ExpandableDataPanelProps, ExpandableItem } from './ExpandableDataPanel.js';

// Export items
export { TextInputItem } from './items/TextInputItem.js';
export type { TextInputItemProps } from './items/TextInputItem.js';

export { LogItem, sampleLogs } from './items/LogItem.js';
export type { LogItemProps, LogEntry } from './items/LogItem.js';