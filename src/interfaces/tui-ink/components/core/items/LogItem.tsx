import React from 'react';
import { Box, Text } from 'ink';
import { ExpandableListItem, useExpandableItem } from '../ExpandableListItem';
import { useTheme } from '../../../contexts/ThemeContext';
import { useInput } from 'ink';

export interface LogEntry {
    /** Unique identifier */
    id: string;
    /** Timestamp of the log */
    timestamp: Date;
    /** Log level */
    level: 'debug' | 'info' | 'warn' | 'error';
    /** Short message (shown in collapsed state) */
    message: string;
    /** Detailed log content */
    details?: string;
    /** Stack trace for errors */
    stackTrace?: string;
    /** Additional metadata */
    metadata?: Record<string, any>;
    /** Source file/module */
    source?: string;
}

export interface LogItemProps {
    /** Log entry data */
    log: LogEntry;
    /** Whether this item is currently selected */
    isActive: boolean;
    /** Width of the item */
    width?: number;
    /** Format for timestamp display */
    timestampFormat?: 'time' | 'datetime' | 'relative';
}

/**
 * Expandable log item that shows summary in collapsed state
 * and full details when expanded
 */
export const LogItem: React.FC<LogItemProps> = ({
    log,
    isActive,
    width,
    timestampFormat = 'time'
}) => {
    const { theme } = useTheme();
    const { isExpanded, toggle } = useExpandableItem();
    
    // Handle keyboard input
    useInput((_, key) => {
        if (isActive && key.return) {
            toggle();
        }
    });
    
    // Format timestamp
    const formatTimestamp = (date: Date): string => {
        switch (timestampFormat) {
            case 'time':
                return date.toLocaleTimeString();
            case 'datetime':
                return date.toLocaleString();
            case 'relative':
                const diff = Date.now() - date.getTime();
                const mins = Math.floor(diff / 60000);
                if (mins < 1) return 'just now';
                if (mins < 60) return `${mins}m ago`;
                const hours = Math.floor(mins / 60);
                if (hours < 24) return `${hours}h ago`;
                return `${Math.floor(hours / 24)}d ago`;
            default:
                return date.toISOString();
        }
    };
    
    // Get level color and icon
    const getLevelStyle = () => {
        switch (log.level) {
            case 'error':
                return { color: theme.colors.error, icon: '✗' };
            case 'warn':
                return { color: theme.colors.warning, icon: '⚠' };
            case 'info':
                return { color: theme.colors.primary, icon: 'ℹ' };
            case 'debug':
            default:
                return { color: theme.colors.textMuted, icon: '○' };
        }
    };
    
    const levelStyle = getLevelStyle();
    
    // Custom collapsed renderer for better log display
    const renderCollapsed = () => {
        const timestamp = formatTimestamp(log.timestamp);
        const icon = isActive ? '▶' : levelStyle.icon;
        
        return (
            <Box width={width}>
                <Text color={isActive ? theme.colors.accent : levelStyle.color}>
                    {icon} [{timestamp}] {log.message}
                    {log.source && (
                        <Text color={theme.colors.textMuted}> ({log.source})</Text>
                    )}
                </Text>
            </Box>
        );
    };
    
    // Expanded content
    const expandedContent = (
        <Box flexDirection="column" width={width ? width - 4 : undefined}>
            {/* Log header */}
            <Box marginBottom={1}>
                <Text color={levelStyle.color} bold>
                    {log.level.toUpperCase()}
                </Text>
                <Text color={theme.colors.textMuted}>
                    {' | '}
                    {formatTimestamp(log.timestamp)}
                    {log.source && ` | ${log.source}`}
                </Text>
            </Box>
            
            {/* Message */}
            <Box marginBottom={1}>
                <Text>{log.message}</Text>
            </Box>
            
            {/* Details */}
            {log.details && (
                <Box marginBottom={1} paddingLeft={2}>
                    <Text color={theme.colors.text} wrap="wrap">
                        {log.details}
                    </Text>
                </Box>
            )}
            
            {/* Stack trace */}
            {log.stackTrace && (
                <Box flexDirection="column" marginBottom={1}>
                    <Text color={theme.colors.textMuted}>Stack Trace:</Text>
                    <Box paddingLeft={2}>
                        <Text color={theme.colors.error} wrap="wrap">
                            {log.stackTrace}
                        </Text>
                    </Box>
                </Box>
            )}
            
            {/* Metadata */}
            {log.metadata && Object.keys(log.metadata).length > 0 && (
                <Box flexDirection="column">
                    <Text color={theme.colors.textMuted}>Metadata:</Text>
                    <Box paddingLeft={2} flexDirection="column">
                        {Object.entries(log.metadata).map(([key, value]) => (
                            <Text key={key} color={theme.colors.textMuted}>
                                {key}: <Text color={theme.colors.text}>
                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </Text>
                            </Text>
                        ))}
                    </Box>
                </Box>
            )}
        </Box>
    );
    
    // ExpandableListItem only needs basic props
    return (
        <ExpandableListItem
            isExpanded={isExpanded}
            onToggle={toggle}
        >
            {isExpanded ? expandedContent : renderCollapsed()}
        </ExpandableListItem>
    );
};

/**
 * Sample log data for testing
 */
export const sampleLogs: LogEntry[] = [
    {
        id: 'log-1',
        timestamp: new Date(Date.now() - 5 * 60000),
        level: 'info',
        message: 'Application started successfully',
        source: 'main.ts'
    },
    {
        id: 'log-2',
        timestamp: new Date(Date.now() - 3 * 60000),
        level: 'warn',
        message: 'Cache size exceeding recommended limit',
        details: 'Current cache size is 512MB, recommended maximum is 256MB. Consider clearing old entries.',
        metadata: {
            cacheSize: '512MB',
            maxSize: '256MB',
            entries: 15234
        },
        source: 'cache/manager.ts'
    },
    {
        id: 'log-3',
        timestamp: new Date(Date.now() - 60000),
        level: 'error',
        message: 'Failed to connect to database',
        details: 'Connection timeout after 30 seconds. Please check database server status and network connectivity.',
        stackTrace: `Error: Connection timeout
    at Database.connect (database.ts:45:12)
    at async Application.initialize (app.ts:23:5)
    at async main (index.ts:10:3)`,
        metadata: {
            host: 'localhost',
            port: 5432,
            timeout: '30s'
        },
        source: 'database.ts'
    },
    {
        id: 'log-4',
        timestamp: new Date(),
        level: 'debug',
        message: 'Processing batch operation',
        details: 'Batch contains 100 items',
        metadata: {
            batchId: 'batch-123',
            itemCount: 100,
            startTime: new Date().toISOString()
        },
        source: 'batch/processor.ts'
    }
];