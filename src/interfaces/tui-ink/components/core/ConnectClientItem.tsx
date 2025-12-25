/**
 * ConnectClientItem - A list item for connecting MCP clients
 *
 * Displays an MCP client with expandable details and action buttons.
 * When expanded shows:
 * - Config file path
 * - Connect/Remove button (toggles based on configuration status)
 * - Show Config button (copies JSON to clipboard)
 */

import React, { ReactElement } from 'react';
import { Box, Text, Key, Transform } from 'ink';
import { IListItem } from './IListItem';
import { SimpleButtonsRow, ButtonConfig } from './SimpleButtonsRow';
import { getCurrentTheme } from '../../utils/theme';
import { textColorProp } from '../../utils/conditionalProps';
import {
    McpClientId,
    McpClientInfo,
    getClientInfo,
    getDisplayPath,
    isConfigured,
    addToConfig,
    removeFromConfig,
    generateConfigSnippet,
    getConfigInstruction,
} from '../../utils/mcp-config-generator';
import { copyToClipboard } from '../../utils/clipboard';

export type ConnectClientAction = 'connect' | 'remove' | 'show-config';

export interface ConnectClientItemProps {
    clientId: McpClientId;
    onAction?: (action: ConnectClientAction, clientId: McpClientId, result: { success: boolean; error?: string }) => void;
    onShowPopup?: (clientId: McpClientId, configJson: string, instruction?: string | null) => void;
}

export class ConnectClientItem implements IListItem {
    readonly selfConstrained = true as const;
    readonly isNavigable = true;

    private _isControllingInput: boolean = false;
    private _clientInfo: McpClientInfo;
    private _isConfigured: boolean = false;
    private _configCheckPending: boolean = true;
    private _buttonsRow: SimpleButtonsRow | null = null;
    private _statusMessage: string | null = null;
    private _lastWidth: number = 80;
    private _onAction?: ConnectClientItemProps['onAction'];
    private _onShowPopup?: ConnectClientItemProps['onShowPopup'];

    public icon: string;
    public isActive: boolean = false;

    /**
     * Update the callback handlers.
     * This is needed when ConnectPanel remounts to avoid stale closure bugs -
     * items preserved in external state need fresh callbacks that reference
     * the current component's state.
     */
    public updateCallbacks(
        onAction?: ConnectClientItemProps['onAction'],
        onShowPopup?: ConnectClientItemProps['onShowPopup']
    ): void {
        this._onAction = onAction;
        this._onShowPopup = onShowPopup;
    }

    constructor(props: ConnectClientItemProps) {
        this._clientInfo = getClientInfo(props.clientId);
        this.icon = this._clientInfo.icon;
        this._onAction = props.onAction;
        this._onShowPopup = props.onShowPopup;

        // Initialize buttons (will be updated when expanded)
        this._updateButtons();

        // Check config status immediately so collapsed view shows correct state
        this._checkConfigStatus();
    }

    get isControllingInput(): boolean {
        return this._isControllingInput;
    }

    get clientId(): McpClientId {
        return this._clientInfo.id;
    }

    get clientInfo(): McpClientInfo {
        return this._clientInfo;
    }

    // ========================================================================
    // Button Management
    // ========================================================================

    private _updateButtons(): void {
        const buttons: ButtonConfig[] = [];

        // Primary action button: Connect or Remove (toggle based on configured state)
        if (this._clientInfo.canAutoConnect) {
            if (this._isConfigured) {
                buttons.push({
                    name: 'remove',
                    borderColor: 'red',
                    text: 'Remove',
                    eventValue: 'remove',
                });
            } else {
                buttons.push({
                    name: 'connect',
                    borderColor: 'green',
                    text: 'Connect',
                    eventValue: 'connect',
                });
            }
        }

        // Show Config button (always available)
        buttons.push({
            name: 'show-config',
            borderColor: 'blue',
            text: 'Show Config',
            eventValue: 'show-config',
        });

        // Create new buttons row - preserve active state if item is controlling input
        this._buttonsRow = new SimpleButtonsRow(
            '',
            '',
            buttons,
            this._isControllingInput, // Preserve active state when updating buttons
            (buttonConfig) => this._handleButtonActivate(buttonConfig),
            'left'
        );

        // If we're controlling input, ensure buttons row is fully initialized
        if (this._isControllingInput) {
            this._buttonsRow.onSelect?.();
        }
    }

    private async _handleButtonActivate(buttonConfig: ButtonConfig): Promise<void> {
        const action = buttonConfig.eventValue as ConnectClientAction;

        switch (action) {
            case 'connect':
                await this._handleConnect();
                break;
            case 'remove':
                await this._handleRemove();
                break;
            case 'show-config':
                this._handleShowConfig();
                break;
        }
    }

    private async _handleConnect(): Promise<void> {
        const result = await addToConfig(this._clientInfo.id);

        if (result.success) {
            this._isConfigured = true;
            this._statusMessage = '✓ Connected';
            this._updateButtons();
        } else {
            this._statusMessage = `✗ ${result.error}`;
        }

        this._onAction?.('connect', this._clientInfo.id, result);
    }

    private async _handleRemove(): Promise<void> {
        const result = await removeFromConfig(this._clientInfo.id);

        if (result.success) {
            this._isConfigured = false;
            this._statusMessage = '✓ Removed';
            this._updateButtons();
        } else {
            this._statusMessage = `✗ ${result.error}`;
        }

        this._onAction?.('remove', this._clientInfo.id, result);
    }

    private _handleShowConfig(): void {
        const configJson = generateConfigSnippet(this._clientInfo.id);
        const instruction = getConfigInstruction(this._clientInfo.id);

        // If popup handler is provided, use it
        if (this._onShowPopup) {
            this._onShowPopup(this._clientInfo.id, configJson, instruction);
            return;
        }

        // Otherwise, copy to clipboard (only the JSON, not the instruction)
        copyToClipboard(configJson).then((result) => {
            if (result.success) {
                this._statusMessage = '✓ Copied to clipboard';
            } else {
                this._statusMessage = `✗ ${result.error}`;
            }
            this._onAction?.('show-config', this._clientInfo.id, result);
        });
    }

    // ========================================================================
    // Config Status Check
    // ========================================================================

    private async _checkConfigStatus(): Promise<void> {
        this._configCheckPending = true;
        try {
            this._isConfigured = await isConfigured(this._clientInfo.id);
        } catch {
            this._isConfigured = false;
        }
        this._configCheckPending = false;
        this._updateButtons();
    }

    // ========================================================================
    // IListItem Implementation
    // ========================================================================

    getRequiredLines(maxWidth: number, maxHeight?: number): number {
        if (!this._isControllingInput) {
            return 1; // Collapsed: just the header
        }

        // Expanded: header + path + buttons (3 lines for regular mode, 1 for low-res)
        const buttonLines = this._buttonsRow?.getRequiredLines(maxWidth, maxHeight) || 1;
        return 1 + 1 + buttonLines; // header + path + buttons
    }

    render(maxWidth: number, maxLines?: number): ReactElement | ReactElement[] {
        this._lastWidth = maxWidth;

        if (!this._isControllingInput) {
            return this._renderCollapsed(maxWidth);
        }

        return this._renderExpanded(maxWidth, maxLines);
    }

    private _renderCollapsed(maxWidth: number): ReactElement {
        const theme = getCurrentTheme();
        const statusIndicator = this._isConfigured ? ' ✓ connected' : '';

        // Calculate available width for label
        const iconWidth = 2; // icon + space
        const statusWidth = statusIndicator.length;
        const availableWidth = maxWidth - iconWidth - statusWidth;

        // Truncate label if needed
        let displayLabel = this._clientInfo.name;
        if (displayLabel.length > availableWidth && availableWidth > 3) {
            displayLabel = displayLabel.substring(0, availableWidth - 1) + '…';
        }

        return (
            <Text>
                <Transform transform={(output) => output}>
                    <Text {...textColorProp(this.isActive ? theme.colors.accent : theme.colors.textMuted)}>
                        {this.icon}
                    </Text>
                    <Text {...textColorProp(this.isActive ? theme.colors.accent : theme.colors.textPrimary)}>
                        {' '}
                        {displayLabel}
                    </Text>
                    {this._isConfigured && (
                        <Text {...textColorProp(theme.colors.successGreen)}>{statusIndicator}</Text>
                    )}
                </Transform>
            </Text>
        );
    }

    private _renderExpanded(maxWidth: number, maxLines?: number): ReactElement[] {
        const theme = getCurrentTheme();
        const elements: ReactElement[] = [];

        // Header line (selected state)
        const statusIndicator = this._isConfigured ? ' ✓ connected' : '';
        elements.push(
            <Box key="header">
                <Text {...textColorProp(theme.colors.accent)}>
                    {this.icon} {this._clientInfo.name}
                </Text>
                {this._isConfigured && <Text {...textColorProp(theme.colors.successGreen)}>{statusIndicator}</Text>}
            </Box>
        );

        // Config path line
        const displayPath = getDisplayPath(this._clientInfo.id);
        const pathPrefix = '│ Path: ';
        const availablePathWidth = maxWidth - pathPrefix.length;
        let truncatedPath = displayPath;
        if (displayPath.length > availablePathWidth && availablePathWidth > 3) {
            truncatedPath = '…' + displayPath.substring(displayPath.length - availablePathWidth + 1);
        }

        elements.push(
            <Box key="path">
                <Text>
                    <Text {...textColorProp(theme.colors.textMuted)}>│ Path: </Text>
                    <Text {...textColorProp(theme.colors.textSecondary)}>{truncatedPath}</Text>
                </Text>
            </Box>
        );

        // Status message (if any)
        if (this._statusMessage) {
            elements.push(
                <Box key="status">
                    <Text>
                        <Text {...textColorProp(theme.colors.textMuted)}>│ </Text>
                        <Text
                            {...textColorProp(
                                this._statusMessage.startsWith('✓') ? theme.colors.successGreen : theme.colors.dangerRed
                            )}
                        >
                            {this._statusMessage}
                        </Text>
                    </Text>
                </Box>
            );
        }

        // Buttons row
        if (this._buttonsRow) {
            const buttonWidth = maxWidth - 2; // Account for border prefix
            const buttonMaxLines = maxLines ? Math.max(1, maxLines - 2) : undefined;
            const buttonElements = this._buttonsRow.render(buttonWidth, buttonMaxLines);

            // Wrap buttons with prefix
            if (Array.isArray(buttonElements)) {
                buttonElements.forEach((el, idx) => {
                    elements.push(
                        <Box key={`buttons-${idx}`}>
                            <Text {...textColorProp(theme.colors.textMuted)}>│ </Text>
                            {el}
                        </Box>
                    );
                });
            } else {
                elements.push(
                    <Box key="buttons">
                        <Text {...textColorProp(theme.colors.textMuted)}>│ </Text>
                        {buttonElements}
                    </Box>
                );
            }
        }

        return elements;
    }

    onEnter(): void {
        this._isControllingInput = true;
        this._statusMessage = null;

        // Activate buttons row immediately for responsiveness
        if (this._buttonsRow) {
            this._buttonsRow.isActive = true;
            this._buttonsRow.onSelect?.();
        }

        // Check config status (may recreate buttons), then re-activate
        this._checkConfigStatus().then(() => {
            // Re-activate buttons row AFTER config check (which may have updated buttons)
            if (this._buttonsRow && this._isControllingInput) {
                this._buttonsRow.isActive = true;
                this._buttonsRow.onSelect?.();
            }
        });
    }

    onExit(): void {
        this._isControllingInput = false;

        // Deactivate buttons row
        if (this._buttonsRow) {
            this._buttonsRow.isActive = false;
            this._buttonsRow.onExit?.();
        }
    }

    onExpand(): void {
        this.onEnter();
    }

    onCollapse(): boolean {
        if (this._isControllingInput) {
            this.onExit();
            return true;
        }
        return false;
    }

    handleInput(input: string, key: Key): boolean {
        if (!this._isControllingInput) {
            return false;
        }

        // Delegate to buttons row
        if (this._buttonsRow) {
            const handled = this._buttonsRow.handleInput?.(input, key);
            if (handled) {
                return true;
            }
            // Buttons returned false - they released control, we handle the input
        }

        // Handle escape to collapse (stay on this item but collapsed)
        if (key.escape) {
            this.onExit();
            return true;
        }

        // Handle left arrow to collapse (stay on this item but collapsed)
        if (key.leftArrow) {
            this.onExit();
            return true;
        }

        // Up/Down should collapse AND navigate out
        if (key.upArrow || key.downArrow) {
            this.onExit();  // Collapse before parent navigates
            return false;   // Let parent handle navigation to next item
        }

        return false;
    }

    onSelect(): void {
        // Visual feedback when selected
    }

    onDeselect(): void {
        // Clean up when deselected
        this._statusMessage = null;
    }
}
