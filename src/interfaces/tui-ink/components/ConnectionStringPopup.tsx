/**
 * ConnectionStringPopup - Full-screen modal displaying MCP configuration JSON
 *
 * Features:
 * - Decorative bordered box design
 * - Full width/height
 * - Shows config file path
 * - Syntax-highlighted JSON
 * - Scrollable content with arrow keys
 * - Visual scrollbar
 * - Keyboard shortcuts (C to copy, Escape to close, ↑↓ to scroll)
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../contexts/ThemeContext';
import { copyToClipboard } from '../utils/clipboard';
import { McpClientId, getClientInfo, getDisplayPath } from '../utils/mcp-config-generator';
import { useDI } from '../di/DIContext';
import { ServiceTokens } from '../di/tokens';

export interface ConnectionStringPopupProps {
    clientId: McpClientId;
    configJson: string;
    width: number;
    height: number;
    onClose: () => void;
}

export const ConnectionStringPopup: React.FC<ConnectionStringPopupProps> = ({
    clientId,
    configJson,
    width,
    height,
    onClose,
}) => {
    const { theme } = useTheme();
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [scrollOffset, setScrollOffset] = useState(0);

    // Get status bar service to update bottom bar shortcuts
    const di = useDI();
    const statusBarService = di.resolve(ServiceTokens.StatusBarService);

    const clientInfo = getClientInfo(clientId);
    const configPath = getDisplayPath(clientId);

    // Parse JSON lines for rendering
    const jsonLines = configJson.split('\n');

    // Calculate viewport for JSON content
    // Compact layout (when scrolling needed): top(1) + path(1) + JSON + bottom(1) = 3 fixed
    // Spacious layout (no scroll): top(1) + path(1) + spacer(1) + JSON + spacer(1) + status(1) + bottom(1) = 6 fixed
    const compactFixedLines = 3;
    const spaciousFixedLines = 6;

    // First check if we'd need scrolling with spacious layout
    const spaciousViewport = Math.max(1, height - spaciousFixedLines);
    const needsScrollWithSpacious = jsonLines.length > spaciousViewport;

    // If scrolling needed, use compact layout to maximize content space
    const fixedLines = needsScrollWithSpacious ? compactFixedLines : spaciousFixedLines;
    const jsonViewportHeight = Math.max(1, height - fixedLines);
    const maxScrollOffset = Math.max(0, jsonLines.length - jsonViewportHeight);
    const needsScrollbar = jsonLines.length > jsonViewportHeight;

    // Update status bar with popup-specific shortcuts
    useEffect(() => {
        const popupBindings = needsScrollbar
            ? [
                  { key: 'C', description: 'Copy' },
                  { key: '↑↓', description: 'Scroll' },
                  { key: 'Esc', description: 'Close' },
              ]
            : [
                  { key: 'C', description: 'Copy' },
                  { key: 'Esc', description: 'Close' },
              ];

        // Set context to 'editing' so getFocusAwareKeyBindings() uses our custom bindings
        statusBarService.setContext('editing');
        statusBarService.setKeyBindings(popupBindings);

        // Also trigger InputContextService to refresh the status bar
        try {
            const inputContextService = di.resolve(ServiceTokens.InputContextService);
            inputContextService.triggerChange();
        } catch {
            // Service not available
        }

        // Restore default bindings when popup closes
        return () => {
            statusBarService.setContext('form');
            try {
                const inputContextService = di.resolve(ServiceTokens.InputContextService);
                inputContextService.triggerChange();
            } catch {
                // Service not available
            }
        };
    }, [needsScrollbar, statusBarService, di]);

    const handleCopy = useCallback(async () => {
        const result = await copyToClipboard(configJson);
        if (result.success) {
            setStatusMessage('✓ Copied to clipboard!');
            // Auto-close after brief delay
            setTimeout(() => {
                onClose();
            }, 800);
        } else {
            setStatusMessage(`✗ ${result.error}`);
        }
    }, [configJson, onClose]);

    // Handle keyboard input
    useInput((input, key) => {
        if (key.escape) {
            onClose();
            return;
        }
        if (input.toLowerCase() === 'c') {
            handleCopy();
            return;
        }
        if (key.return) {
            handleCopy();
            return;
        }
        // Scroll with arrow keys
        if (key.upArrow) {
            setScrollOffset((prev) => Math.max(0, prev - 1));
            return;
        }
        if (key.downArrow) {
            setScrollOffset((prev) => Math.min(maxScrollOffset, prev + 1));
            return;
        }
    });

    // Render JSON with simple syntax highlighting
    const renderJsonLine = (line: string, index: number): React.ReactElement => {
        const parts: React.ReactElement[] = [];
        let remaining = line;
        let partIndex = 0;

        // Match patterns - NOTE: patterns must match at least 1 character to avoid infinite loop
        const patterns = [
            { regex: /^(\s+)/, color: undefined }, // Leading whitespace (1 or more)
            { regex: /^"([^"]+)"(\s*):/, color: theme.colors.accent, isKey: true }, // Keys
            { regex: /^"([^"]*)"/, color: theme.colors.success }, // String values
            { regex: /^[{}\[\]]/, color: theme.colors.textMuted }, // Brackets
            { regex: /^[,:]/, color: theme.colors.textMuted }, // Punctuation
        ];

        while (remaining.length > 0) {
            let matched = false;

            for (const pattern of patterns) {
                const match = remaining.match(pattern.regex);
                if (match && match.index === 0 && match[0].length > 0) {
                    const text = match[0];
                    if (pattern.isKey) {
                        const keyMatch = text.match(/"([^"]+)"(\s*:)/);
                        if (keyMatch) {
                            parts.push(
                                <Text key={`${index}-${partIndex++}`} color={theme.colors.accent}>
                                    &quot;{keyMatch[1]}&quot;
                                </Text>
                            );
                            parts.push(
                                <Text key={`${index}-${partIndex++}`} color={theme.colors.textMuted}>
                                    {keyMatch[2]}
                                </Text>
                            );
                        }
                    } else if (pattern.color) {
                        parts.push(
                            <Text key={`${index}-${partIndex++}`} color={pattern.color}>
                                {text}
                            </Text>
                        );
                    } else {
                        parts.push(<Text key={`${index}-${partIndex++}`}>{text}</Text>);
                    }
                    remaining = remaining.slice(text.length);
                    matched = true;
                    break;
                }
            }

            if (!matched) {
                parts.push(<Text key={`${index}-${partIndex++}`}>{remaining[0]}</Text>);
                remaining = remaining.slice(1);
            }
        }

        return (
            <Text key={index}>
                {parts.length > 0 ? parts : ' '}
            </Text>
        );
    };

    // Helper to pad content to fill width
    const padToWidth = (content: string, targetWidth: number): string => {
        if (content.length >= targetWidth) {
            return content.substring(0, targetWidth);
        }
        return content + ' '.repeat(targetWidth - content.length);
    };

    // Build border lines
    const title = `${clientInfo.name} Config`;
    const titleWithDashes = `── ${title} `;
    const topBorderWidth = width - 2 - titleWithDashes.length; // -2 for corners
    const topBorder = '╭' + titleWithDashes + '─'.repeat(Math.max(0, topBorderWidth)) + '╮';
    const bottomBorder = '╰' + '─'.repeat(Math.max(0, width - 2)) + '╯';
    const emptyLine = '│' + ' '.repeat(Math.max(0, width - 2)) + '│';

    // Content width is width minus the two border characters
    const contentWidth = Math.max(1, width - 2);

    // Use compact layout (no spacers) when scrolling is needed
    const useCompactLayout = needsScrollWithSpacious;

    // Calculate scrollbar for JSON content area
    const getScrollbarChar = (lineIndex: number): string => {
        if (!needsScrollbar) return ' ';

        const totalLines = jsonViewportHeight;

        // First line is always ▲
        if (lineIndex === 0) return '▲';
        // Last line is always ▼
        if (lineIndex === totalLines - 1) return '▼';

        // Calculate thumb position and size for middle area
        const trackHeight = totalLines - 2; // Exclude arrows
        if (trackHeight <= 0) return '│';

        // Thumb size: minimum 1, proportional to viewport/total ratio
        const thumbSize = Math.max(1, Math.round((jsonViewportHeight / jsonLines.length) * trackHeight));

        // Thumb position: map scroll offset to track position
        const thumbPosition = maxScrollOffset > 0
            ? Math.round((scrollOffset / maxScrollOffset) * (trackHeight - thumbSize))
            : 0;

        // lineIndex - 1 because we skip the top arrow
        const trackIndex = lineIndex - 1;

        if (trackIndex >= thumbPosition && trackIndex < thumbPosition + thumbSize) {
            return '┃'; // Thumb
        }
        return '│'; // Track
    };

    // Visible JSON lines based on scroll offset
    const visibleJsonLines = jsonLines.slice(scrollOffset, scrollOffset + jsonViewportHeight);

    // Calculate how many empty lines we need to fill the space after JSON
    const emptyLinesToFill = Math.max(0, jsonViewportHeight - visibleJsonLines.length);

    return (
        <Box flexDirection="column" width={width} height={height}>
            {/* Top border with title */}
            <Text color={theme.colors.border}>{topBorder}</Text>

            {/* Config file path - or status message in compact mode */}
            <Text>
                <Text color={theme.colors.border}>│</Text>
                {useCompactLayout && statusMessage ? (
                    <Text color={statusMessage.startsWith('✓') ? theme.colors.success : theme.colors.error}>
                        {padToWidth(statusMessage, contentWidth)}
                    </Text>
                ) : (
                    <>
                        <Text color={theme.colors.textMuted}>Config file: </Text>
                        <Text color={theme.colors.text}>{padToWidth(configPath, contentWidth - 13)}</Text>
                    </>
                )}
                <Text color={theme.colors.border}>│</Text>
            </Text>

            {/* Empty line before JSON - only in spacious layout */}
            {!useCompactLayout && <Text color={theme.colors.border}>{emptyLine}</Text>}

            {/* JSON content with scrollbar */}
            {visibleJsonLines.map((line, index) => {
                const scrollbarChar = getScrollbarChar(index);
                // Reserve 1 char for scrollbar if needed
                const jsonContentWidth = needsScrollbar ? contentWidth - 1 : contentWidth;

                // Truncate line if too long to prevent wrapping
                const truncatedLine = line.length > jsonContentWidth
                    ? line.substring(0, jsonContentWidth - 1) + '…'
                    : line;
                const paddingNeeded = Math.max(0, jsonContentWidth - truncatedLine.length);

                return (
                    <Text key={`json-${index}`}>
                        <Text color={theme.colors.border}>│</Text>
                        {renderJsonLine(truncatedLine, index)}
                        <Text>{' '.repeat(paddingNeeded)}</Text>
                        {needsScrollbar && (
                            <Text color={theme.colors.textMuted}>{scrollbarChar}</Text>
                        )}
                        <Text color={theme.colors.border}>│</Text>
                    </Text>
                );
            })}

            {/* Fill remaining space (if JSON is shorter than viewport) */}
            {Array.from({ length: emptyLinesToFill }).map((_, i) => {
                const lineIndex = visibleJsonLines.length + i;
                const scrollbarChar = getScrollbarChar(lineIndex);
                return (
                    <Text key={`empty-${i}`}>
                        <Text color={theme.colors.border}>│</Text>
                        <Text>{' '.repeat(needsScrollbar ? contentWidth - 1 : contentWidth)}</Text>
                        {needsScrollbar && (
                            <Text color={theme.colors.textMuted}>{scrollbarChar}</Text>
                        )}
                        <Text color={theme.colors.border}>│</Text>
                    </Text>
                );
            })}

            {/* Empty line before status - only in spacious layout */}
            {!useCompactLayout && <Text color={theme.colors.border}>{emptyLine}</Text>}

            {/* Status message - only in spacious layout (compact shows inline) */}
            {!useCompactLayout && (
                <Text>
                    <Text color={theme.colors.border}>│</Text>
                    {statusMessage ? (
                        <Text color={statusMessage.startsWith('✓') ? theme.colors.success : theme.colors.error}>
                            {padToWidth(statusMessage, contentWidth)}
                        </Text>
                    ) : (
                        <Text>{padToWidth('', contentWidth)}</Text>
                    )}
                    <Text color={theme.colors.border}>│</Text>
                </Text>
            )}

            {/* Bottom border */}
            <Text color={theme.colors.border}>{bottomBorder}</Text>
        </Box>
    );
};
