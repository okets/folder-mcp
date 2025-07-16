import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useTerminalSize } from '../hooks/useTerminalSize';
import { useTheme } from '../contexts/ThemeContext';
import { AnimationContainer } from './core/AnimationContainer';
import { EXIT_COUNTDOWN_FRAMES, EXIT_COUNTDOWN_TIMING } from '../utils/animations';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

// Blinking dot animation frames - full circle only
const BLINKING_DOT_FRAMES = ['●', ' '];
const BLINKING_DOT_TIMING = 500; // 500ms per frame for slow blink

interface HeaderProps {
    themeName?: string;
    status?: string; // Allow external status override
    exitAnimationStatus?: string | undefined; // Exit countdown animation status (highest priority)
}

interface DaemonStatus {
    running: boolean;
    pid?: number;
}

// Helper function to render countdown message with proper colors
const renderCountdownMessage = (message: string, statusTextColor: string) => {
    // Parse the countdown message: "Press esc again to exit 3.."
    const countdownMatch = message.match(/^Press (esc) again to exit (\d+\.\.)$/);
    
    if (countdownMatch) {
        const [, escText, countdownText] = countdownMatch;
        return (
            <>
                <AnimationContainer 
                    frames={BLINKING_DOT_FRAMES} 
                    interval={BLINKING_DOT_TIMING}
                    color="#FFA500"
                />
                <Text color={statusTextColor}> Press </Text>
                <Text color="#FFA500" bold>{escText}</Text>
                <Text color={statusTextColor}> again to exit </Text>
                <Text color="#FFA500">{countdownText}</Text>
            </>
        );
    }
    
    // Fallback for other messages - ensure we use the fallback for countdown messages with proper spacing
    if (message.includes('Press esc again to exit')) {
        return (
            <>
                <AnimationContainer 
                    frames={BLINKING_DOT_FRAMES} 
                    interval={BLINKING_DOT_TIMING}
                    color="#FFA500"
                />
                <Text color={statusTextColor}> {message}</Text>
            </>
        );
    }
    
    return <Text color={statusTextColor}>{message}</Text>;
};

export const Header: React.FC<HeaderProps> = React.memo(({ themeName, status, exitAnimationStatus }) => {
    const { theme } = useTheme();
    const { columns, rows } = useTerminalSize();
    
    const [daemonStatus, setDaemonStatus] = useState<DaemonStatus>({ running: false });
    
    // Check daemon status every 2 seconds
    useEffect(() => {
        const checkDaemon = () => {
            const configDir = join(homedir(), '.folder-mcp');
            const pidFile = join(configDir, 'daemon.pid');
            
            if (!existsSync(pidFile)) {
                setDaemonStatus({ running: false });
                return;
            }
            
            try {
                const pidStr = readFileSync(pidFile, 'utf8').trim();
                const pid = parseInt(pidStr, 10);
                
                if (isNaN(pid)) {
                    setDaemonStatus({ running: false });
                    return;
                }
                
                // Check if process is actually running
                try {
                    process.kill(pid, 0); // Doesn't actually kill, just checks if process exists
                    setDaemonStatus({ running: true, pid });
                } catch {
                    setDaemonStatus({ running: false });
                }
            } catch (error) {
                setDaemonStatus({ running: false });
            }
        };
        
        // Check immediately
        checkDaemon();
        
        // Then check every 2 seconds
        const interval = setInterval(checkDaemon, 2000);
        
        return () => clearInterval(interval);
    }, []);
    
    const resolution = `${columns}w${rows}h`;
    const appName = '📁 folder-mcp';
    
    // Determine status text (priority: exitAnimationStatus > status > daemon status)
    let statusText = '';
    let showExitAnimation = false;
    
    if (exitAnimationStatus !== undefined) {
        statusText = exitAnimationStatus;
        showExitAnimation = false; // Simple text countdown, no animation
    } else if (status) {
        statusText = status;
    } else if (daemonStatus.running) {
        statusText = `Connected to daemon (PID: ${daemonStatus.pid})`;
    } else {
        statusText = 'Daemon not running';
    }
    
    // Full display: "📁 folder-mcp    Connected to daemon (PID: 12345)"
    const fullStatusText = `    ${statusText}`;
    
    // Use theme colors instead of hardcoded colors
    const frameColor = theme.colors.headerBorder;
    const logoTextColor = theme.colors.titleText;
    const statusTextColor = theme.colors.text; // Use main text color for status (whitish)
    
    
    // Check for low vertical resolution
    const isLowResolution = rows < 25;
    
    // Low resolution mode: single line with separator
    if (isLowResolution) {
        const separator = ' ○ ';
        
        // Handle narrow terminals in low resolution mode
        const availableWidth = columns - 1; // -1 for safety margin
        const fixedPrefix = '📁 folder-mcp    '; // 16 characters
        const availableForStatus = Math.max(0, availableWidth - fixedPrefix.length);
        
        // Truncate status text if needed for low res mode
        let displayStatusText = statusText;
        if (exitAnimationStatus) {
            // For countdown messages, we need extra space for animation dot + safety buffer
            const maxCountdownLength = availableForStatus - 2; // -2 for animation dot space only
            if (exitAnimationStatus.length > maxCountdownLength) {
                displayStatusText = exitAnimationStatus.substring(0, Math.max(0, maxCountdownLength - 1)) + '…';
            } else {
                displayStatusText = exitAnimationStatus;
            }
        } else {
            // For regular status, truncate if too long with minimal buffer
            const maxStatusLength = availableForStatus - 1; // -1 for minimal buffer
            if (statusText.length > maxStatusLength) {
                displayStatusText = statusText.substring(0, Math.max(0, maxStatusLength - 1)) + '…';
            }
        }
        
        const totalLength = fixedPrefix.length + (exitAnimationStatus ? displayStatusText.length + 2 : displayStatusText.length);
        
        // Build display text based on available width
        if (availableWidth >= totalLength) {
            // Full display with status and optional animation
            return (
                <Box marginTop={1}>
                    <Text color={frameColor}>📁 </Text>
                    <Text color={logoTextColor} bold>folder-mcp</Text>
                    {exitAnimationStatus ? (
                        <>
                            <Text color={statusTextColor}>    </Text>
                            {renderCountdownMessage(displayStatusText, statusTextColor)}
                        </>
                    ) : (
                        <Text color={statusTextColor}>    {displayStatusText}</Text>
                    )}
                </Box>
            );
        } else if (availableWidth >= (appName.length + separator.length + resolution.length + 2)) {
            // Fall back to resolution display
            return (
                <Box marginTop={1}>
                    <Text color={frameColor}>📁 </Text>
                    <Text color={logoTextColor} bold>folder-mcp</Text>
                    <Text color={frameColor}>{separator}</Text>
                    <Text color={frameColor}>{resolution}</Text>
                </Box>
            );
        } else if (availableWidth >= appName.length) {
            // Just app name with spinner, no resolution
            return (
                <Box marginTop={1}>
                    <Text color={frameColor}>📁 </Text>
                    <Text color={logoTextColor} bold>folder-mcp</Text>
                </Box>
            );
        } else {
            // Very narrow - truncate app name
            const truncatedName = appName.substring(0, availableWidth - 1) + '…';
            return (
                <Box marginTop={1}>
                    <Text color={frameColor}>{truncatedName}</Text>
                </Box>
            );
        }
    }
    
    // Calculate what layout to use based on available width
    const minBorderedWidth = 18; // "╭────────────────╮" length
    
    // Calculate minimum width needed for different layouts
    const minResolutionWidth = Math.max(
        18, // Minimum to fit "│ 📁 folder-mcp  │" 
        2 + 1 + resolution.length + 1 + 2 // Minimum for "╭─ 24w24h ╮" 
    );
    
    if (columns >= minResolutionWidth) {
        // Full bordered layout with resolution in border - maximize dash area
        const innerWidth = columns - 2; // -2 for corner characters
        const resolutionSpace = ` ${resolution} `;
        const themeSpace = themeName ? ` [${themeName}] ` : '';
        
        // Calculate how much space we can fill with dashes
        // Total: ╭ + dashes + theme + space + resolution + space + ╮
        const maxDashArea = innerWidth - resolutionSpace.length - themeSpace.length;
        
        const topBorder = `${theme.symbols.border.topLeft}${theme.symbols.border.horizontal.repeat(Math.max(0, maxDashArea))}${themeSpace}${resolutionSpace}${theme.symbols.border.topRight}`;
        const bottomBorder = `${theme.symbols.border.bottomLeft}${theme.symbols.border.horizontal.repeat(innerWidth)}${theme.symbols.border.bottomRight}`;
        
        // Calculate available space for content (accounting for borders and spacing)
        const fixedContentPrefix = `📁 folder-mcp    `; // 16 characters
        const availableForStatus = Math.max(0, innerWidth - fixedContentPrefix.length - 2); // -2 for left space and minimal right padding
        
        // Truncate status text if needed
        let displayStatusText = statusText;
        if (exitAnimationStatus) {
            // For countdown messages, we need extra space for animation dot + safety buffer
            const maxCountdownLength = availableForStatus - 2; // -2 for animation dot space only
            if (exitAnimationStatus.length > maxCountdownLength) {
                displayStatusText = exitAnimationStatus.substring(0, Math.max(0, maxCountdownLength - 1)) + '…';
            } else {
                displayStatusText = exitAnimationStatus;
            }
        } else {
            // For regular status, truncate if too long with minimal buffer
            const maxStatusLength = availableForStatus - 1; // -1 for minimal buffer
            if (statusText.length > maxStatusLength) {
                displayStatusText = statusText.substring(0, Math.max(0, maxStatusLength - 1)) + '…';
            }
        }
        
        // Calculate remaining space more precisely
        // innerWidth = total content space between borders
        // Content: "│ 📁 folder-mcp    " + status + padding + "│"
        // For countdown: "│ 📁 folder-mcp    ● Press esc again t… + padding + "│"
        // The animation component already includes the dot and space, so don't double-count
        const usedSpace = 1 + fixedContentPrefix.length + displayStatusText.length; // left space + prefix + text (animation handled separately)
        const remainingSpace = Math.max(0, innerWidth - usedSpace);
        
        
        return (
            <Box flexDirection="column" marginTop={1}>
                <Text color={frameColor}>{topBorder}</Text>
                <Box>
                    <Text color={frameColor}>{theme.symbols.border.vertical} 📁 </Text>
                    <Text color={logoTextColor} bold>folder-mcp</Text>
                    {exitAnimationStatus ? (
                        <>
                            <Text color={statusTextColor}>    </Text>
                            {renderCountdownMessage(displayStatusText, statusTextColor)}
                        </>
                    ) : (
                        <Text color={statusTextColor}>    {displayStatusText}</Text>
                    )}
                    <Text color={frameColor}>{' '.repeat(Math.max(0, remainingSpace))}{theme.symbols.border.vertical}</Text>
                </Box>
                <Text color={frameColor}>{bottomBorder}</Text>
            </Box>
        );
    } else if (columns >= minBorderedWidth) {
        // Bordered layout without resolution - expand to fill terminal width
        const innerWidth = columns - 2; // -2 for corner characters
        
        const topBorder = `${theme.symbols.border.topLeft}${theme.symbols.border.horizontal.repeat(innerWidth)}${theme.symbols.border.topRight}`;
        const bottomBorder = `${theme.symbols.border.bottomLeft}${theme.symbols.border.horizontal.repeat(innerWidth)}${theme.symbols.border.bottomRight}`;
        
        // Calculate available space for content (accounting for borders and spacing)
        const fixedContentPrefix = `📁 folder-mcp    `; // 16 characters
        const availableForStatus = Math.max(0, innerWidth - fixedContentPrefix.length - 2); // -2 for left space and minimal right padding
        
        // Truncate status text if needed
        let displayStatusText = statusText;
        if (exitAnimationStatus) {
            // For countdown messages, we need extra space for animation dot + safety buffer
            const maxCountdownLength = availableForStatus - 2; // -2 for animation dot space only
            if (exitAnimationStatus.length > maxCountdownLength) {
                displayStatusText = exitAnimationStatus.substring(0, Math.max(0, maxCountdownLength - 1)) + '…';
            } else {
                displayStatusText = exitAnimationStatus;
            }
        } else {
            // For regular status, truncate if too long with minimal buffer
            const maxStatusLength = availableForStatus - 1; // -1 for minimal buffer
            if (statusText.length > maxStatusLength) {
                displayStatusText = statusText.substring(0, Math.max(0, maxStatusLength - 1)) + '…';
            }
        }
        
        // Calculate remaining space more precisely
        // innerWidth = total content space between borders
        // Content: "│ 📁 folder-mcp    " + status + padding + "│"
        // For countdown: "│ 📁 folder-mcp    ● Press esc again t… + padding + "│"
        // The animation component already includes the dot and space, so don't double-count
        const usedSpace = 1 + fixedContentPrefix.length + displayStatusText.length; // left space + prefix + text (animation handled separately)
        const remainingSpace = Math.max(0, innerWidth - usedSpace);
        
        
        return (
            <Box flexDirection="column" marginTop={1}>
                <Text color={frameColor}>{topBorder}</Text>
                <Box>
                    <Text color={frameColor}>{theme.symbols.border.vertical} 📁 </Text>
                    <Text color={logoTextColor} bold>folder-mcp</Text>
                    {exitAnimationStatus ? (
                        <>
                            <Text color={statusTextColor}>    </Text>
                            {renderCountdownMessage(displayStatusText, statusTextColor)}
                        </>
                    ) : (
                        <Text color={statusTextColor}>    {displayStatusText}</Text>
                    )}
                    <Text color={frameColor}>{' '.repeat(Math.max(0, remainingSpace))}{theme.symbols.border.vertical}</Text>
                </Box>
                <Text color={frameColor}>{bottomBorder}</Text>
            </Box>
        );
    } else {
        // No border, just truncated text
        const availableForText = columns - 1; // -1 for safety margin
        
        if (appName.length + 2 <= availableForText) {
            // Can fit full app name with spinner
            return (
                <Box marginTop={1}>
                    <Text color={frameColor}>📁 </Text>
                    <Text color={logoTextColor} bold>folder-mcp</Text>
                </Box>
            );
        } else if (appName.length <= availableForText) {
            // Can fit full app name without spinner
            return (
                <Box marginTop={1}>
                    <Text color={frameColor}>
                        📁 <Text color={logoTextColor} bold>folder-mcp</Text>
                    </Text>
                </Box>
            );
        } else {
            // Need to truncate
            let displayText = appName;
            if (availableForText > 3) {
                displayText = displayText.substring(0, availableForText - 1) + '…';
            } else {
                displayText = '📁…';
            }
            
            return (
                <Box marginTop={1}>
                    <Text color={frameColor}>{displayText}</Text>
                </Box>
            );
        }
    }
});