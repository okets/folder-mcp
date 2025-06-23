import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../utils/theme.js';

interface ListItemProps {
    content: string;
    fullContent?: string;
    isSelected: boolean;
    isExpanded: boolean;
    status?: 'success' | 'error' | 'warning' | 'loading';
}

export const ListItem: React.FC<ListItemProps> = ({
    content,
    fullContent,
    isSelected,
    isExpanded,
    status
}) => {
    const symbol = isExpanded ? theme.symbols.expanded : 
                   isSelected ? theme.symbols.selected : 
                   theme.symbols.unselected;
    
    const getStatusIndicator = () => {
        if (!status) return '';
        
        const indicators = {
            success: { symbol: theme.symbols.success, color: theme.colors.successGreen },
            error: { symbol: theme.symbols.error, color: theme.colors.errorRed },
            warning: { symbol: theme.symbols.warning, color: theme.colors.warningOrange },
            loading: { symbol: theme.symbols.loading, color: theme.colors.accent }
        };
        
        const indicator = indicators[status];
        return indicator ? <Text color={indicator.color}> {indicator.symbol}</Text> : '';
    };
    
    if (isExpanded && fullContent) {
        return (
            <Box flexDirection="column">
                <Box>
                    <Text color={isSelected ? theme.colors.accent : theme.colors.textSecondary}>
                        {symbol} {content}
                    </Text>
                    {getStatusIndicator()}
                </Box>
                <Box paddingLeft={2} marginTop={1}>
                    <Text color={theme.colors.textMuted}>{fullContent}</Text>
                </Box>
            </Box>
        );
    }
    
    return (
        <Box>
            <Text 
                color={isSelected ? theme.colors.accent : theme.colors.textSecondary}
                backgroundColor={isSelected ? theme.colors.selection : undefined}
            >
                {symbol} {content}
            </Text>
            {getStatusIndicator()}
        </Box>
    );
};