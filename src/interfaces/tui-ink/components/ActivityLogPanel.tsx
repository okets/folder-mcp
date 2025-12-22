/**
 * Activity Log Panel
 *
 * Displays daemon activity events using the Progress River model:
 * - In-progress items (< 100%) float to top with live progress bars
 * - Completed items (100%) flow downstream with checkmarks
 * - Instant events appear in chronological order (newest first)
 *
 * Uses LogItem for proper scrolling, navigation, and collapsible details.
 *
 * @see Phase-11-Sprint-4-Activity-Log-Screen.md
 */

import React, { useMemo } from 'react';
import { Key } from 'ink';
import { GenericListPanel } from './GenericListPanel';
import { TextListItem } from './core/TextListItem';
import { LogItem } from './core/LogItem';
import { IListItem } from './core/IListItem';
import { useActivityEvents, useFMDMConnection, SerializedActivityEvent } from '../contexts/FMDMContext';
import { useNavigationContext } from '../contexts/NavigationContext';
import { formatActivityTime, getActivityIcon } from '../utils/progress-bar.js';

/**
 * Convert a SerializedActivityEvent to a LogItem
 *
 * Layout: "[HH:MM] ◆ Message text"
 * - Timestamp first (fixed 7 chars: "[HH:MM]")
 * - Icon = Event TYPE (what happened) - always type-based
 * - Message text
 * - Progress bar (for in-progress items)
 *
 * Color Rules (using theme colors):
 * - '⋯' = cyan (accent) - in-progress
 * - '✓' = green (successGreen) - completed indexing ONLY
 * - '⚠' = orange (warningOrange) - errors/warnings
 * - '•' = white (default) - all instant events
 */
function createLogItemFromEvent(
    event: SerializedActivityEvent,
    isActive: boolean,
    isExpanded: boolean
): LogItem {
    const isInProgress = event.progress !== undefined && event.progress < 100;
    const isCompleted = event.progress !== undefined && event.progress >= 100;
    const timestamp = formatActivityTime(event.timestamp);  // "HH:MM" format

    // Icon is ALWAYS type-based (what happened)
    const icon = getActivityIcon(event.type);

    // Status determines COLOR (how it went)
    // Green is ONLY for completed progress events, not for level='success'
    let status: string;
    if (isInProgress) {
        status = '⋯';  // cyan (theme.colors.accent) - in progress
    } else if (isCompleted) {
        status = '✓';  // green (theme.colors.successGreen) - completed indexing ONLY
    } else if (event.level === 'error' || event.level === 'warning') {
        status = '⚠';  // orange (theme.colors.warningOrange) - warning/error
    } else {
        status = '•';  // white (default) - all other instant events
    }

    // Layout: "[HH:MM] ◆ Message text"
    // Timestamp is passed separately and rendered first
    return new LogItem(
        icon,
        event.message,  // Just the message, no timestamp
        status,
        isActive,
        isExpanded,
        event.details,
        isInProgress ? event.progress : (isCompleted ? 100 : undefined),
        timestamp  // Timestamp displayed before icon
    );
}

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
    // Use navigation context for state that survives resize overlay
    // This is lifted here because the resize check in AppContentInner unmounts this component,
    // losing any local useState. NavigationContext survives because NavigationProvider
    // is above the resize check in the component tree.
    const navigation = useNavigationContext();
    const selectedIndex = navigation.activitySelectedIndex;
    const setSelectedIndex = navigation.setActivitySelectedIndex;
    const expandedState = navigation.activityExpandedState;
    const setExpandedState = navigation.setActivityExpandedState;

    // Get activity events with Progress River sorting from context
    const activityEvents = useActivityEvents();
    const connectionStatus = useFMDMConnection();

    // Create list items from activity events
    const items: IListItem[] = useMemo(() => {
        // Show connection status message if not connected
        if (!connectionStatus.connected) {
            if (connectionStatus.connecting) {
                return [new TextListItem('⋯', 'Connecting to daemon...', false)];
            }
            return [new TextListItem('○', 'Waiting for daemon connection...', false)];
        }

        // Show placeholder if no events yet
        if (activityEvents.length === 0) {
            return [new TextListItem('○', 'No activity yet...', false)];
        }

        // Convert events to LogItems
        // Events are already sorted by useActivityEvents hook (Progress River model)
        // isActive is set based on selectedIndex for proper highlighting
        // isExpanded is retrieved from state using correlationId (survives progress updates)
        return activityEvents.map((event, index) => {
            // Use correlationId for state tracking when available (survives progress updates)
            // Fall back to event.id for events without correlationId (instant events)
            const stateKey = event.correlationId || event.id;
            const isExpanded = expandedState[stateKey] ?? false;
            const item = createLogItemFromEvent(event, index === selectedIndex, isExpanded);

            // Wrap onExpand/onCollapse to persist state using React state
            const originalOnExpand = item.onExpand.bind(item);
            const originalOnCollapse = item.onCollapse.bind(item);

            item.onExpand = () => {
                originalOnExpand();
                // Use functional update to avoid stale closure
                setExpandedState(prev => ({ ...prev, [stateKey]: true }));
            };

            item.onCollapse = () => {
                const result = originalOnCollapse();
                if (result) {
                    // Use functional update to avoid stale closure
                    setExpandedState(prev => ({ ...prev, [stateKey]: false }));
                }
                return result;
            };

            return item;
        });
    }, [activityEvents, connectionStatus, selectedIndex, expandedState]);

    const customKeyBindings = isLandscape
        ? [
            { key: '↑↓', description: 'Scroll' },
            { key: 'tab/←', description: 'Switch Panel' }
          ]
        : [
            { key: '↑↓', description: 'Scroll' },
            { key: 'tab/↑', description: 'Switch Panel' }
          ];

    const handleInput = (input: string, key: Key): boolean => {
        const currentItem = items[selectedIndex];

        // Check if current item is controlling input
        if (currentItem?.isControllingInput) {
            // Let the GenericListPanel delegate to the expanded item
            return false;
        }

        // Left arrow: First try to collapse expanded item, then switch panels
        if (key.leftArrow) {
            // Guard: If showing placeholders (not connected or no events), skip collapse logic
            // Placeholder items can't be expanded, so just switch panels
            if (!connectionStatus.connected || activityEvents.length === 0) {
                if (isLandscape) {
                    onSwitchToNavigation();
                    return true;
                }
                return false;
            }

            // Check if current item is a LogItem and is expanded
            if (currentItem && 'onCollapse' in currentItem && typeof currentItem.onCollapse === 'function') {
                const logItem = currentItem as LogItem;
                // Check if expanded using state (survives progress updates)
                // Use correlationId when available
                const event = activityEvents[selectedIndex];
                const stateKey = event?.correlationId || event?.id;
                const isExpanded = stateKey ? expandedState[stateKey] : false;

                if (isExpanded) {
                    // Collapse the item first
                    logItem.onCollapse();
                    return true;
                }
            }

            // Only switch to navigation if item is collapsed (landscape mode)
            if (isLandscape) {
                onSwitchToNavigation();
                return true;
            }
        }

        // Handle navigation with circular wrapping
        if (key.downArrow) {
            const currentIndex = selectedIndex;
            // Find next navigable item
            let nextIndex = currentIndex;
            let found = false;

            // Try to find next navigable item
            for (let i = currentIndex + 1; i < items.length; i++) {
                const item = items[i];
                if (item && item.isNavigable !== false) {
                    nextIndex = i;
                    found = true;
                    break;
                }
            }

            // If not found, wrap to beginning (circular navigation)
            if (!found) {
                for (let i = 0; i <= currentIndex; i++) {
                    const item = items[i];
                    if (item && item.isNavigable !== false) {
                        nextIndex = i;
                        break;
                    }
                }
            }

            if (nextIndex !== currentIndex) {
                setSelectedIndex(nextIndex);
                return true;
            }
        } else if (key.upArrow) {
            const currentIndex = selectedIndex;
            // Find previous navigable item
            let prevIndex = currentIndex;
            let found = false;

            // Try to find previous navigable item
            for (let i = currentIndex - 1; i >= 0; i--) {
                const item = items[i];
                if (item && item.isNavigable !== false) {
                    prevIndex = i;
                    found = true;
                    break;
                }
            }

            // Portrait mode: If no previous navigable item found, switch to navigation panel
            if (!isLandscape && !found) {
                onSwitchToNavigation();
                return true;
            }

            // Landscape mode: If not found, wrap to end (circular navigation)
            if (!found) {
                for (let i = items.length - 1; i >= currentIndex; i--) {
                    const item = items[i];
                    if (item && item.isNavigable !== false) {
                        prevIndex = i;
                        break;
                    }
                }
            }

            if (prevIndex !== currentIndex) {
                setSelectedIndex(prevIndex);
                return true;
            }
        }
        return false;
    };

    // Determine subtitle based on activity state
    // Only show meaningful info: errors/warnings, in-progress count, or nothing
    const getSubtitle = (): string | undefined => {
        if (!connectionStatus.connected) {
            return 'Disconnected';
        }

        // Count errors and warnings
        const errorCount = activityEvents.filter(e => e.level === 'error').length;
        const warningCount = activityEvents.filter(e => e.level === 'warning').length;

        if (errorCount > 0 && warningCount > 0) {
            return `${errorCount} errors, ${warningCount} warnings`;
        } else if (errorCount > 0) {
            return `${errorCount} error${errorCount > 1 ? 's' : ''}`;
        } else if (warningCount > 0) {
            return `${warningCount} warning${warningCount > 1 ? 's' : ''}`;
        }

        // Count in-progress items
        const inProgressCount = activityEvents.filter(e =>
            e.progress !== undefined && e.progress < 100
        ).length;
        if (inProgressCount > 0) {
            return `${inProgressCount} in progress`;
        }

        // Nothing useful to show - return undefined to hide subtitle
        return undefined;
    };

    const subtitle = getSubtitle();

    return (
        <GenericListPanel
            title="Activity Log"
            {...(subtitle ? { subtitle } : {})}
            items={items}
            selectedIndex={selectedIndex}
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
