/**
 * ActivityLogItem Component
 *
 * Renders a single activity event in the activity log panel.
 * Implements IListItem interface for use with GenericListPanel.
 *
 * Progress River Display Model:
 * - In-progress items (< 100%): Show progress bar, no timestamp
 * - Completed items (100%): Show ✓ and timestamp
 * - Instant events (undefined progress): Show icon and timestamp
 */

import React, { ReactElement } from 'react';
import { Box, Text } from 'ink';
import { IListItem } from './core/IListItem';
import { ProgressBar } from './core/ProgressBar.js';
import { SerializedActivityEvent } from '../../../daemon/models/activity-event.js';
import { getActivityIcon, formatActivityTime } from '../utils/progress-bar.js';
import { getCurrentTheme } from '../utils/theme.js';
import { textColorProp } from '../utils/conditionalProps.js';

export class ActivityLogItem implements IListItem {
  readonly selfConstrained = true as const;
  readonly isNavigable = false; // Activity log is read-only
  private _isControllingInput = false;
  private _icon: string;

  constructor(
    private event: SerializedActivityEvent,
    public isActive: boolean = false
  ) {
    // Initialize icon based on event type (icon is type-based, not status-based)
    this._icon = getActivityIcon(this.event.type);
  }

  get icon(): string {
    return this._icon;
  }

  set icon(value: string) {
    this._icon = value;
  }

  get isControllingInput(): boolean {
    return this._isControllingInput;
  }

  /**
   * Check if this is an in-progress event (floating at top)
   */
  get isInProgress(): boolean {
    return this.event.progress !== undefined && this.event.progress < 100;
  }

  /**
   * Check if this event has completed progress
   */
  get isCompleted(): boolean {
    return this.event.progress !== undefined && this.event.progress >= 100;
  }

  render(maxWidth: number, _maxLines?: number): ReactElement {
    const theme = getCurrentTheme();

    if (this.isInProgress) {
      // In-progress: Show progress bar, no timestamp
      // Format: "▶ Indexing: docs (45%)   ████████░░░░░░░░"
      return this.renderInProgress(maxWidth, theme);
    } else {
      // Completed or instant: Show timestamp and icon
      // Format: "[12:45] ✓ Indexed: docs (102 files, 12s)"
      // Format: "[12:44] 🔍 Search: "activity log" (3 results)"
      return this.renderHistorical(maxWidth, theme);
    }
  }

  private renderInProgress(maxWidth: number, theme: any): ReactElement {
    const progress = this.event.progress ?? 0;

    // ProgressBar in 'long' mode takes ~16 chars: spinner(1) + bar(10) + space(1) + percent(4)
    const progressBarWidth = 16;
    const iconWidth = 2; // icon + space
    const messageMaxWidth = maxWidth - iconWidth - progressBarWidth;

    // Truncate message if needed
    let displayMessage = this.event.message;
    if (displayMessage.length > messageMaxWidth) {
      displayMessage = messageMaxWidth > 3
        ? displayMessage.slice(0, messageMaxWidth - 1) + '…'
        : '…';
    }

    // Pad message to align progress bar
    const messagePadded = displayMessage.padEnd(Math.max(0, messageMaxWidth));

    return (
      <Box>
        <Text {...textColorProp(theme.colors.accent)}>{this.icon} </Text>
        <Text {...textColorProp(theme.colors.textMuted)}>{messagePadded}</Text>
        <ProgressBar value={progress} mode="long" />
      </Box>
    );
  }

  private renderHistorical(maxWidth: number, theme: any): ReactElement {
    const icon = this.icon;
    const timestamp = formatActivityTime(this.event.timestamp);

    // Format: "[12:45] ✓ Message content here"
    const timePrefix = `[${timestamp}] `;
    const iconPart = `${icon} `;

    // Calculate available width for message
    const prefixWidth = timePrefix.length + iconPart.length;
    const availableForMessage = maxWidth - prefixWidth;

    // Build display message with optional details
    let displayMessage = this.event.message;
    if (this.event.details && this.event.details.length > 0) {
      // Append first detail in parentheses
      const detail = this.event.details[0];
      displayMessage = `${displayMessage} (${detail})`;
    }

    // Truncate if needed
    if (displayMessage.length > availableForMessage) {
      displayMessage = availableForMessage > 3
        ? displayMessage.slice(0, availableForMessage - 1) + '…'
        : '…';
    }

    // Choose icon color based on completion status
    const iconColor = this.isCompleted
      ? theme.colors.successGreen
      : this.getEventTypeColor(theme);

    return (
      <Text>
        <Text {...textColorProp(theme.colors.textDim)}>{timePrefix}</Text>
        <Text {...textColorProp(iconColor)}>{iconPart}</Text>
        <Text {...textColorProp(theme.colors.text)}>{displayMessage}</Text>
      </Text>
    );
  }

  private getEventTypeColor(theme: any): string | undefined {
    switch (this.event.type) {
      case 'indexing':
        return theme.colors.accent;
      case 'search':
        return theme.colors.accent;
      case 'connection':
        return theme.colors.successGreen;
      case 'model':
        return theme.colors.accent;
      case 'system':
        return theme.colors.accent;
      case 'error':
        return theme.colors.warningOrange;
      default:
        return undefined;
    }
  }

  getRequiredLines(_maxWidth: number, _maxHeight?: number): number {
    // Activity log items are always single-line
    return 1;
  }

  // Read-only item - minimal input handling
  onEnter(): void {
    // No-op for read-only items
  }

  onExit(): void {
    // No-op for read-only items
  }

  handleInput(_input: string, _key: any): boolean {
    // Read-only items don't handle input
    return false;
  }

  onSelect(): void {
    // Could add visual feedback when scrolled to
  }

  onDeselect(): void {
    // Could remove visual feedback
  }
}

/**
 * Factory function to create ActivityLogItem from SerializedActivityEvent
 */
export function createActivityLogItem(
  event: SerializedActivityEvent,
  isActive: boolean = false
): ActivityLogItem {
  return new ActivityLogItem(event, isActive);
}
