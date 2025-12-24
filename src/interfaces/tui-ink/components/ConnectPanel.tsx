import React, { useState, useRef, useCallback, useEffect, MutableRefObject } from 'react';
import { Box, Key } from 'ink';
import { GenericListPanel } from './GenericListPanel';
import { TextListItem } from './core/TextListItem';
import { ConnectClientItem, ConnectClientAction } from './core/ConnectClientItem';
import { ConnectionStringPopup } from './ConnectionStringPopup';
import { IListItem } from './core/IListItem';
import { McpClientId, getAllClients } from '../utils/mcp-config-generator';

export interface PopupState {
    visible: boolean;
    clientId: McpClientId | null;
    configJson: string;
}

/**
 * External state interface for ConnectPanel
 * When provided, state survives component remounts (e.g., during resize)
 */
export interface ConnectPanelExternalState {
    selectedIndexRef: MutableRefObject<number>;
    popupStateRef: MutableRefObject<PopupState>;
    itemsRef: MutableRefObject<IListItem[] | null>;
}

export interface ConnectPanelProps {
    width: number;
    height: number;
    isFocused: boolean;
    isLandscape: boolean;
    onSwitchToNavigation: () => void;
    /** External state refs - when provided, state survives remounts */
    externalState?: ConnectPanelExternalState;
}

export const ConnectPanel: React.FC<ConnectPanelProps> = ({
    width,
    height,
    isFocused,
    isLandscape,
    onSwitchToNavigation,
    externalState,
}) => {
    // Use external state refs if provided (survives remounts), otherwise use internal refs
    // Internal refs are fallback for backwards compatibility
    const internalSelectedIndexRef = useRef(1);
    const internalPopupStateRef = useRef<PopupState>({
        visible: false,
        clientId: null,
        configJson: '',
    });
    const internalItemsRef = useRef<IListItem[] | null>(null);

    // Use external state when provided, otherwise fall back to internal
    const selectedIndexRef = externalState?.selectedIndexRef ?? internalSelectedIndexRef;
    const popupStateRef = externalState?.popupStateRef ?? internalPopupStateRef;
    const itemsRef = externalState?.itemsRef ?? internalItemsRef;

    // Force update trigger - only this uses useState
    const [, forceUpdate] = useState(0);

    // Helper to trigger re-render
    const triggerRender = useCallback(() => {
        forceUpdate((prev) => prev + 1);
    }, []);

    // Handler for showing popup
    const handleShowPopup = useCallback((clientId: McpClientId, configJson: string) => {
        popupStateRef.current = {
            visible: true,
            clientId,
            configJson,
        };
        triggerRender();
    }, [triggerRender]);

    // Handler for closing popup
    const handleClosePopup = useCallback(() => {
        popupStateRef.current = {
            visible: false,
            clientId: null,
            configJson: '',
        };
        triggerRender();
    }, [triggerRender]);

    // Handler for client actions (connect/remove/show-config)
    const handleClientAction = useCallback(
        (action: ConnectClientAction, clientId: McpClientId, result: { success: boolean; error?: string }) => {
            // Trigger re-render to update status indicators without recreating items
            triggerRender();
        },
        [triggerRender]
    );

    // Create items once on mount, preserve across re-renders
    if (!itemsRef.current) {
        const clientItems: IListItem[] = [];

        // Section header: Local Connections
        clientItems.push(
            new TextListItem('', 'Local Connections', false) // non-navigable header
        );

        // Get all clients and create items
        const clients = getAllClients();
        clients.forEach((client) => {
            clientItems.push(
                new ConnectClientItem({
                    clientId: client.id,
                    onAction: handleClientAction,
                    onShowPopup: handleShowPopup,
                })
            );
        });

        // Section header: Remote Access (placeholder)
        clientItems.push(
            new TextListItem('', '', false) // spacer
        );
        clientItems.push(
            new TextListItem('', 'Remote Access', false) // non-navigable header
        );
        clientItems.push(
            new TextListItem('○', 'Coming in Phase 12...', false)
        );

        itemsRef.current = clientItems;
    }

    const items = itemsRef.current;

    // Read current values from refs for rendering
    const selectedIndex = selectedIndexRef.current;
    const popupState = popupStateRef.current;

    const customKeyBindings = isLandscape
        ? [
              { key: '↑↓', description: 'Navigate' },
              { key: 'Enter/→', description: 'Expand' },
              { key: 'tab/←', description: 'Switch Panel' },
          ]
        : [
              { key: '↑↓', description: 'Navigate' },
              { key: 'Enter/→', description: 'Expand' },
              { key: 'tab/↑', description: 'Switch Panel' },
          ];

    const handleInput = (input: string, key: Key): boolean => {
        // Check if current item is controlling input (expanded)
        const currentIndex = selectedIndexRef.current;
        const currentItem = items[currentIndex];

        if (currentItem?.isControllingInput) {
            // Let GenericListPanel delegate to the expanded item
            return false;
        }

        // Landscape mode: Left arrow switches back to navigation panel
        if (key.leftArrow && isLandscape) {
            onSwitchToNavigation();
            return true;
        }

        // Handle navigation with circular wrapping
        if (key.downArrow) {
            let nextIndex = currentIndex;
            let found = false;

            // Find next navigable item
            for (let i = currentIndex + 1; i < items.length; i++) {
                const item = items[i];
                if (item && item.isNavigable !== false) {
                    nextIndex = i;
                    found = true;
                    break;
                }
            }

            // If not found, wrap to beginning
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
                selectedIndexRef.current = nextIndex;
                triggerRender();
                return true;
            }
        } else if (key.upArrow) {
            let prevIndex = currentIndex;
            let found = false;

            // Find previous navigable item
            for (let i = currentIndex - 1; i >= 0; i--) {
                const item = items[i];
                if (item && item.isNavigable !== false) {
                    prevIndex = i;
                    found = true;
                    break;
                }
            }

            // Portrait mode: If no previous navigable item, switch to navigation panel
            if (!isLandscape && !found) {
                onSwitchToNavigation();
                return true;
            }

            // Landscape mode: wrap to end
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
                selectedIndexRef.current = prevIndex;
                triggerRender();
                return true;
            }
        }

        return false;
    };

    // If popup is visible, render it as overlay
    if (popupState.visible && popupState.clientId) {
        return (
            <Box flexDirection="column" width={width} height={height}>
                <ConnectionStringPopup
                    clientId={popupState.clientId}
                    configJson={popupState.configJson}
                    width={width}
                    height={height}
                    onClose={handleClosePopup}
                />
            </Box>
        );
    }

    return (
        <GenericListPanel
            title="Connect"
            subtitle="MCP Client Setup"
            items={items}
            selectedIndex={selectedIndex}
            isFocused={isFocused}
            width={width}
            height={height}
            elementId="connect-panel"
            parentId="navigation"
            priority={50}
            customKeyBindings={customKeyBindings}
            onInput={handleInput}
        />
    );
};
