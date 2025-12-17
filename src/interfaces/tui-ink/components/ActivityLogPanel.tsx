import React from 'react';
import { Key } from 'ink';
import { GenericListPanel } from './GenericListPanel';
import { TextListItem } from './core/TextListItem';
import { IListItem } from './core/IListItem';

export interface ActivityLogPanelProps {
    width: number;
    height: number;
    isFocused: boolean;
    isLandscape: boolean;
    onSwitchToNavigation: () => void;
}

export const ActivityLogPanel: React.FC<ActivityLogPanelProps> = ({
    width,
    height,
    isFocused,
    isLandscape,
    onSwitchToNavigation
}) => {
    // Placeholder items - will be replaced with LogItems and filter
    const items: IListItem[] = [
        new TextListItem('○', 'Activity log coming soon...', false)
    ];

    const customKeyBindings = isLandscape
        ? [
            { key: '↑↓', description: 'Navigate' },
            { key: 'tab/←', description: 'Switch Panel' }
          ]
        : [
            { key: '↑↓', description: 'Navigate' },
            { key: 'tab/↑', description: 'Switch Panel' }
          ];

    const handleInput = (input: string, key: Key): boolean => {
        if (isLandscape && key.leftArrow) {
            onSwitchToNavigation();
            return true;
        }
        if (!isLandscape && key.upArrow) {
            onSwitchToNavigation();
            return true;
        }
        return false;
    };

    return (
        <GenericListPanel
            title="Activity Log"
            subtitle="Daemon Status"
            items={items}
            selectedIndex={0}
            isFocused={isFocused}
            width={width}
            height={height}
            elementId="activity-log-panel"
            parentId="navigation"
            priority={50}
            customKeyBindings={customKeyBindings}
            onInput={handleInput}
        />
    );
};
