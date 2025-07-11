import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useTerminalSize } from '../hooks/useTerminalSize';
import { useTheme } from '../contexts/ThemeContext';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

interface HeaderProps {
    themeName?: string;
    status?: string; // Allow external status override
}

interface DaemonStatus {
    running: boolean;
    pid?: number;
}

export const Header: React.FC<HeaderProps> = ({ themeName, status }) => {
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
    
    // Determine status text
    let statusText = '';
    if (status) {
        statusText = status;
    } else if (daemonStatus.running) {
        statusText = `Connected to daemon (PID: ${daemonStatus.pid})`;
    } else {
        statusText = 'Daemon not running';
    }
    
    // Full display: "📁 folder-mcp    status: Connected to daemon (PID: 12345)"
    const fullStatusText = `    status: ${statusText}`;
    
    // Use theme colors instead of hardcoded colors
    const frameColor = theme.colors.headerBorder;
    const logoTextColor = theme.colors.titleText;
    
    
    // Check for low vertical resolution
    const isLowResolution = rows < 25;
    
    // Low resolution mode: single line with separator
    if (isLowResolution) {
        const separator = ' ○ ';
        
        // Handle narrow terminals in low resolution mode
        const availableWidth = columns - 1; // -1 for safety margin
        
        // Try to fit: "📁 folder-mcp    status: Connected to daemon (PID: 12345)"
        const fullDisplayText = `📁 folder-mcp${fullStatusText}`;
        
        // Build display text based on available width
        if (availableWidth >= fullDisplayText.length) {
            // Full display with status
            return (
                <Box marginTop={1}>
                    <Text color={frameColor}>📁 </Text>
                    <Text color={logoTextColor} bold>folder-mcp</Text>
                    <Text color={frameColor}>{fullStatusText}</Text>
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
        
        // Calculate padding for the content with status
        // Content: "│ 📁 folder-mcp    status: Connected to daemon (PID: 12345)                │"
        const contentText = `📁 folder-mcp${fullStatusText}`;
        const contentLength = 2 + contentText.length; // "│ " + content
        const remainingSpace = Math.max(0, innerWidth - contentLength + 1); // +1 adjustment for proper alignment
        
        return (
            <Box flexDirection="column" marginTop={1}>
                <Text color={frameColor}>{topBorder}</Text>
                <Box>
                    <Text color={frameColor}>{theme.symbols.border.vertical} 📁 </Text>
                    <Text color={logoTextColor} bold>folder-mcp</Text>
                    <Text color={frameColor}>{fullStatusText}</Text>
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
        
        // Calculate padding for the content with status
        const contentText = `📁 folder-mcp${fullStatusText}`;
        const contentLength = 2 + contentText.length; // "│ " + content
        const remainingSpace = Math.max(0, innerWidth - contentLength + 1); // +1 adjustment for proper alignment
        
        return (
            <Box flexDirection="column" marginTop={1}>
                <Text color={frameColor}>{topBorder}</Text>
                <Box>
                    <Text color={frameColor}>{theme.symbols.border.vertical} 📁 </Text>
                    <Text color={logoTextColor} bold>folder-mcp</Text>
                    <Text color={frameColor}>{fullStatusText}</Text>
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
};